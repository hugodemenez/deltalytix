'use server'

import { createClient } from '@/server/auth'
import { cookies } from 'next/headers'
import Stripe from 'stripe'
import { PrismaClient } from '@prisma/client'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-06-20',
})

const prisma = new PrismaClient()

export type SubscriptionWithPrice = {
  id: string
  status: string
  current_period_end: number
  current_period_start: number
  created: number
  cancel_at_period_end: boolean
  cancel_at: number | null
  canceled_at: number | null
  trial_end: number | null
  trial_start: number | null
  plan: {
    id: string
    name: string
    amount: number
    interval: 'month' | 'quarter' | 'year' | 'lifetime'
  }
  promotion?: {
    code: string
    amount_off: number
    percent_off: number | null
    duration: {
      duration_in_months: number | null
      duration: 'forever' | 'once' | 'repeating' | null
    }
  }
  invoices?: Array<{
    id: string
    amount_paid: number
    status: string
    created: number
    invoice_pdf: string | null
    hosted_invoice_url: string | null
  }>
}

export async function getSubscriptionData() {
  const supabase = await createClient()
  
  try {
    // Get the current user
    const { data: { user } } = await supabase.auth.getUser()
    if (!user?.email) throw new Error('User not found')

    // FIRST: Check local database for active lifetime subscription (highest priority)
    const localSubscription = await prisma.subscription.findUnique({
      where: { email: user.email },
    })
    
    if (localSubscription && localSubscription.status === 'ACTIVE' && localSubscription.interval === 'lifetime') {
      console.log('Found active lifetime subscription')
      
      // Get customer and invoices for lifetime subscription
      const customers = await stripe.customers.list({
        email: user.email,
        limit: 1,
      })
      
      let invoices: { data: any[] } = { data: [] }
      if (customers.data[0]) {
        // First, get all invoices (for any subscription-based payments)
        const allInvoices = await stripe.invoices.list({
          customer: customers.data[0].id,
          limit: 10,
        })
        
        console.log('All invoices for lifetime customer:', allInvoices.data.map(inv => ({
          id: inv.id,
          status: inv.status,
          amount_paid: inv.amount_paid,
          amount_due: inv.amount_due,
          created: inv.created
        })))
        
        // Get payment intents (for one-time payments like lifetime purchases)
        const paymentIntents = await stripe.paymentIntents.list({
          customer: customers.data[0].id,
          limit: 10,
        })
        
        console.log('Payment intents for lifetime customer:', paymentIntents.data.map(pi => ({
          id: pi.id,
          status: pi.status,
          amount: pi.amount,
          created: pi.created,
          description: pi.description
        })))
        
        // Get charges (alternative method for one-time payments)
        const charges = await stripe.charges.list({
          customer: customers.data[0].id,
          limit: 10,
        })
        
        console.log('Charges for lifetime customer:', charges.data.map(charge => ({
          id: charge.id,
          status: charge.status,
          amount: charge.amount,
          created: charge.created,
          description: charge.description,
          receipt_url: charge.receipt_url
        })))
        
        // Combine invoices and one-time payments
        const validInvoices = allInvoices.data.filter(invoice => 
          invoice.status === 'paid' || 
          (invoice.status === 'open' && invoice.amount_paid > 0)
        )
        
        // Convert successful payment intents to invoice format
        const successfulPaymentIntents = paymentIntents.data
          .filter(pi => pi.status === 'succeeded')
          .map(pi => {
            // Find the corresponding charge for this payment intent to get receipt URL
            const correspondingCharge = charges.data.find(charge => 
              charge.payment_intent === pi.id
            )
            const receiptUrl = correspondingCharge?.receipt_url || null
            
            return {
              id: pi.id,
              amount_paid: pi.amount,
              status: 'paid',
              created: pi.created,
              invoice_pdf: null,
              hosted_invoice_url: receiptUrl, // Use receipt URL as the viewable link
              description: pi.description || 'One-time Payment',
              receipt_url: receiptUrl
            }
          })
        
        // Convert successful charges to invoice format (fallback)
        const successfulCharges = charges.data
          .filter(charge => charge.status === 'succeeded' && charge.paid)
          .map(charge => ({
            id: charge.id,
            amount_paid: charge.amount,
            status: 'paid',
            created: charge.created,
            invoice_pdf: null,
            hosted_invoice_url: charge.receipt_url, // Use receipt URL as the viewable link
            description: charge.description || 'One-time Payment',
            receipt_url: charge.receipt_url
          }))
        
        // Filter out subscription-related payment intents to avoid duplicates with invoices
        const nonSubscriptionPaymentIntents = successfulPaymentIntents.filter(pi => {
          // Check if this payment intent has a corresponding invoice
          const hasCorrespondingInvoice = validInvoices.some(invoice => 
            Math.abs(invoice.amount_paid - pi.amount_paid) < 100 && // Within $1 difference
            Math.abs(invoice.created - pi.created) < 86400 // Within 24 hours
          )
          return !hasCorrespondingInvoice
        })
        
        // Combine all payment records (avoid duplicates)
        const allPayments = [
          ...validInvoices,
          ...nonSubscriptionPaymentIntents,
          // Only include charges that don't have corresponding payment intents or invoices
          ...successfulCharges.filter(charge => {
            const hasCorrespondingPI = nonSubscriptionPaymentIntents.some(pi => 
              Math.abs(pi.amount_paid - charge.amount_paid) < 100 && // Within $1 difference
              Math.abs(pi.created - charge.created) < 300 // Within 5 minutes
            )
            const hasCorrespondingInvoice = validInvoices.some(invoice => 
              Math.abs(invoice.amount_paid - charge.amount_paid) < 100 && // Within $1 difference
              Math.abs(invoice.created - charge.created) < 86400 // Within 24 hours
            )
            return !hasCorrespondingPI && !hasCorrespondingInvoice
          })
        ]
        
        invoices = { data: allPayments }
        
        console.log('Combined payment records for lifetime customer:', allPayments.length)
      }
      
      console.log('localSubscription', createLifetimeSubscriptionData(localSubscription, invoices.data))
      return createLifetimeSubscriptionData(localSubscription, invoices.data)
    }

    // SECOND: Check for active Stripe subscription (recurring plans)
    const customers = await stripe.customers.list({
      email: user.email,
      limit: 1,
    })

    const customer = customers.data[0]
    if (!customer) {
      // Create a new customer if they don't exist
      const newCustomer = await stripe.customers.create({
        email: user.email,
        metadata: {
          user_id: user.id,
        },
      })
      return null // New customer won't have a subscription yet
    }

    // Get ONLY ACTIVE subscriptions (not canceled/expired ones)
    const subscriptions = await stripe.subscriptions.list({
      customer: customer.id,
      status: 'active', // Only active subscriptions
      expand: ['data.plan', 'data.items.data.price', 'data.discount'],
      limit: 1,
    })

    // Also check for trialing subscriptions
    const trialingSubscriptions = await stripe.subscriptions.list({
      customer: customer.id,
      status: 'trialing',
      expand: ['data.plan', 'data.items.data.price', 'data.discount'],
      limit: 1,
    })

    // Get the most recent active or trialing subscription
    const allActiveSubscriptions = [...subscriptions.data, ...trialingSubscriptions.data]
    const subscription = allActiveSubscriptions.sort((a, b) => b.created - a.created)[0]
    
    // Fetch invoices for payment history
    const allInvoices = await stripe.invoices.list({
      customer: customer.id,
      limit: 10, // Get last 10 invoices
    })
    
    console.log('All invoices for recurring customer:', allInvoices.data.map(inv => ({
      id: inv.id,
      status: inv.status,
      amount_paid: inv.amount_paid,
      created: inv.created
    })))
    
    const invoices = {
      data: allInvoices.data.filter(invoice => 
        invoice.status === 'paid' || 
        (invoice.status === 'open' && invoice.amount_paid > 0)
      )
    }
    
    if (subscription) {
      // Handle active recurring subscription
      const priceId = subscription.items.data[0].price.id
      
      // Retrieve the price with product expanded to get the actual product name
      const price = await stripe.prices.retrieve(priceId, {
        expand: ['product'],
      })
      
      const productName = (price.product as Stripe.Product).name
      const subscriptionPlan = productName || 'Unknown Plan'
      
      console.log('Found active Stripe subscription', subscription.status)
      console.log('SUBSCRIPTION PRICE', price)
      
      return {
        id: subscription.id,
        status: subscription.status,
        current_period_end: subscription.current_period_end,
        current_period_start: subscription.current_period_start,
        created: subscription.created,
        cancel_at_period_end: subscription.cancel_at_period_end,
        cancel_at: subscription.cancel_at,
        canceled_at: subscription.canceled_at,
        trial_end: subscription.trial_end,
        trial_start: subscription.trial_start,
        plan: {
          id: price.id,
          name: subscriptionPlan,
          amount: price.unit_amount || 0,
          interval: price.recurring?.interval_count === 3 ? 'quarter' : price.recurring?.interval || 'month',
        },
        promotion: subscription.discount ? {
          code: subscription.discount.coupon.id,
          amount_off: subscription.discount.coupon.amount_off || 0,
          percent_off: subscription.discount.coupon.percent_off,
          duration: {
            duration_in_months: subscription.discount.coupon.duration_in_months,
            duration: subscription.discount.coupon.duration
          }
        } : undefined,
        invoices: invoices.data.map(invoice => ({
          id: invoice.id,
          amount_paid: invoice.amount_paid,
          status: invoice.status,
          created: invoice.created,
          invoice_pdf: invoice.invoice_pdf,
          hosted_invoice_url: invoice.hosted_invoice_url
        }))
      } as SubscriptionWithPrice
    }

    // No active subscription found (canceled/expired subscriptions are ignored)
    console.log('No active subscription found - user can subscribe again')
    return null
  } catch (error) {
    console.error('Error fetching subscription:', error)
    return null
  }
}

// Helper function to create subscription data for lifetime plans
function createLifetimeSubscriptionData(localSubscription: any, invoices: any[]): SubscriptionWithPrice {
  const createdTimestamp = Math.floor(localSubscription.createdAt?.getTime() / 1000) || Math.floor(Date.now() / 1000)
  const endTimestamp = Math.floor(localSubscription.endDate?.getTime() / 1000) || Math.floor(Date.now() / 1000)
  
  return {
    id: `lifetime_${localSubscription.id}`, // Unique ID for lifetime subscription
    status: 'active',
    current_period_end: endTimestamp,
    current_period_start: createdTimestamp,
    created: createdTimestamp,
    cancel_at_period_end: false,
    cancel_at: null,
    canceled_at: null,
    trial_end: null,
    trial_start: null,
    plan: {
      id: 'lifetime_plan',
      name: localSubscription.plan || 'Lifetime Plan',
      amount: 0, // One-time payment, no recurring amount
      interval: 'lifetime' as const,
    },
    promotion: undefined,
    invoices: invoices.map(invoice => ({
      id: invoice.id,
      amount_paid: invoice.amount_paid,
      status: invoice.status,
      created: invoice.created,
      invoice_pdf: invoice.invoice_pdf,
      hosted_invoice_url: invoice.hosted_invoice_url
    }))
  } as SubscriptionWithPrice
}

export async function updateSubscription(action: 'pause' | 'resume' | 'cancel', subscriptionId: string) {
  try {
    if (action === 'pause' || action === 'cancel') {
      // Cancel at period end for all subscriptions
      await stripe.subscriptions.update(subscriptionId, {
        cancel_at_period_end: true
      })
    } else if (action === 'resume') {
      await stripe.subscriptions.update(subscriptionId, {
        cancel_at_period_end: false
      })
    }
    
    return { success: true }
  } catch (error) {
    console.error('Error updating subscription:', error)
    return { success: false, error: 'Failed to update subscription' }
  }
}

export async function collectSubscriptionFeedback(
  event: string,
  cancellationReason?: string,
  feedback?: string
) {
  try {
    console.log('collectSubscriptionFeedback', event, cancellationReason, feedback)
    const supabase = await createClient()
    
    // Get the current user
    const { data: { user } } = await supabase.auth.getUser()
    if (!user?.email) throw new Error('User not found')

    // Create feedback record
    await prisma.subscriptionFeedback.create({
      data: {
        email: user.email,
        event,
        cancellationReason,
        feedback,
      },
    })

    return { success: true }
  } catch (error) {
    console.error('Error collecting subscription feedback:', error)
    return { success: false, error: 'Failed to collect feedback' }
  }
}

export async function switchSubscriptionPlan(newLookupKey: string) {
  const supabase = await createClient()
  
  try {
    // Get the current user
    const { data: { user } } = await supabase.auth.getUser()
    if (!user?.email) throw new Error('User not found')

    // Get customer by email
    const customers = await stripe.customers.list({
      email: user.email,
      limit: 1,
    })

    const customer = customers.data[0]
    if (!customer) {
      throw new Error('Customer not found')
    }

    // Get the new price using lookup key
    const prices = await stripe.prices.list({
      lookup_keys: [newLookupKey],
      expand: ['data.product'],
    })

    if (!prices.data.length) {
      throw new Error('Price not found for lookup key')
    }

    const newPrice = prices.data[0]

    // Check if this is a lifetime (one-time) plan
    if (newPrice.type === 'one_time') {
      // Cancel the current subscription immediately for lifetime upgrade
      const subscriptions = await stripe.subscriptions.list({
        customer: customer.id,
        status: 'active',
        limit: 1,
      })

      const currentSubscription = subscriptions.data[0]
      if (currentSubscription) {
        // Cancel immediately (not at period end) since user is upgrading to lifetime
        await stripe.subscriptions.update(currentSubscription.id, {
          cancel_at_period_end: false,
        })
        await stripe.subscriptions.cancel(currentSubscription.id)
        
        // Update local database
        await prisma.subscription.update({
          where: {
            email: user.email,
          },
          data: {
            plan: 'FREE',
            status: 'CANCELLED',
            endDate: new Date(),
          }
        })
      }

      return { 
        success: false, 
        error: 'Lifetime plans require checkout session',
        requiresCheckout: true,
        lookupKey: newLookupKey
      }
    }

    // Get current active subscription
    const subscriptions = await stripe.subscriptions.list({
      customer: customer.id,
      status: 'active',
      limit: 1,
    })

    const currentSubscription = subscriptions.data[0]
    if (!currentSubscription) {
      throw new Error('No active subscription found')
    }

    const currentSubscriptionItem = currentSubscription.items.data[0]

    // Check if it's the same plan
    if (currentSubscriptionItem.price.id === newPrice.id) {
      return { success: false, error: 'Already subscribed to this plan' }
    }

    // Check if new price is recurring
    if (!newPrice.recurring) {
      throw new Error('Can only switch to recurring plans')
    }

    // Update the subscription with the new price
    const updatedSubscription = await stripe.subscriptions.update(currentSubscription.id, {
      items: [{
        id: currentSubscriptionItem.id,
        price: newPrice.id,
      }],
      proration_behavior: 'create_prorations', // This handles prorating charges
    })

    // Update local database
    const productName = (newPrice.product as Stripe.Product).name
    const subscriptionPlan = productName.toUpperCase() || 'FREE'
    const interval = newPrice.recurring?.interval_count === 3 ? 'quarter' : newPrice.recurring?.interval || 'month'

    await prisma.subscription.update({
      where: {
        email: user.email,
      },
      data: {
        plan: subscriptionPlan,
        interval: interval,
        endDate: new Date(updatedSubscription.current_period_end * 1000),
      }
    })

    return { 
      success: true, 
      subscription: updatedSubscription,
      message: 'Plan switched successfully'
    }
  } catch (error) {
    console.error('Error switching subscription plan:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to switch plan' 
    }
  }
} 