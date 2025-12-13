'use server'

import { createClient } from '@/server/auth'
import { cookies } from 'next/headers'
import { PrismaClient } from '@prisma/client'
import { stripe } from '@/actions/stripe'
import Stripe from 'stripe'

const prisma = new PrismaClient()

// Helper function to get current period end from subscription items
function getCurrentPeriodEnd(subscription: Stripe.Subscription): number {
  // In Stripe v19, current_period_end is available on subscription items
  // We'll get it from the first subscription item
  if (subscription.items && subscription.items.data && subscription.items.data.length > 0) {
    return subscription.items.data[0].current_period_end;
  }

  // Fallback to billing_cycle_anchor if no items available
  return subscription.billing_cycle_anchor;
}

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
  console.debug('getSubscriptionData')
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user?.email) {
    return null
  }

  // Short-circuit: treat every user as an active Pro subscriber unless billing is explicitly enabled
  const billingEnabled = process.env.ENABLE_STRIPE_BILLING === 'true'
  if (!billingEnabled) {
    const now = Math.floor(Date.now() / 1000)

    return {
      id: 'pro-local',
      status: 'active',
      current_period_end: now + 10 * 365 * 24 * 60 * 60, // 10-year horizon for UI
      current_period_start: now,
      created: now,
      cancel_at_period_end: false,
      cancel_at: null,
      canceled_at: null,
      trial_end: null,
      trial_start: null,
      plan: {
        id: 'pro-local-plan',
        name: 'Plus',
        amount: 0,
        interval: 'lifetime',
      },
      promotion: undefined,
      invoices: [],
    }
  }

  if (!stripe) {
    throw new Error('Stripe is not configured (set STRIPE_SECRET_KEY or disable billing).')
  }

  try {

    // FIRST: Check local database for active lifetime subscription (highest priority)
    const localSubscription = await prisma.subscription.findUnique({
      where: { email: user.email },
    })

    if (localSubscription && localSubscription.status === 'ACTIVE' && localSubscription.interval === 'lifetime') {

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


        // Get payment intents (for one-time payments like lifetime purchases)
        const paymentIntents = await stripe.paymentIntents.list({
          customer: customers.data[0].id,
          limit: 10,
        })


        // Get charges (alternative method for one-time payments)
        const charges = await stripe.charges.list({
          customer: customers.data[0].id,
          limit: 10,
        })


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

      }

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
      expand: ['data.plan', 'data.items.data.price', 'data.discounts.coupon'],
      limit: 1,
    })

    // Also check for trialing subscriptions
    const trialingSubscriptions = await stripe.subscriptions.list({
      customer: customer.id,
      status: 'trialing',
      expand: ['data.plan', 'data.items.data.price', 'data.discounts.coupon'],
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

        const currentPeriodEnd = getCurrentPeriodEnd(subscription);

        return {
        id: subscription.id,
        status: subscription.status,
        current_period_end: currentPeriodEnd,
        current_period_start: subscription.items.data[0]?.current_period_start || subscription.billing_cycle_anchor,
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
        promotion: subscription.discounts && subscription.discounts.length > 0 ? await (async () => {
          const discount = subscription.discounts[0] as Stripe.Discount;

          // Check if discount is expanded (object) or just an ID (string)
          if (typeof discount === 'string') {
            // Discount is just an ID, we can't get details without expanding
            return {
              code: discount,
              amount_off: 0,
              percent_off: null,
              duration: {
                duration_in_months: null,
                duration: null
              }
            };
          }

          const coupon = discount.source?.coupon;

          // If no coupon or source, return undefined
          if (!coupon) {
            return undefined;
          }

          if (typeof coupon === 'string') {
            // Coupon is just an ID, fetch the full coupon data
            try {
              const fullCoupon = await stripe.coupons.retrieve(coupon);
              return {
                code: fullCoupon.id,
                amount_off: fullCoupon.amount_off || 0,
                percent_off: fullCoupon.percent_off,
                duration: {
                  duration_in_months: fullCoupon.duration_in_months,
                  duration: fullCoupon.duration
                }
              };
            } catch (error) {
              console.error('Error fetching coupon:', error);
              return {
                code: coupon,
                amount_off: 0,
                percent_off: null,
                duration: {
                  duration_in_months: null,
                  duration: null
                }
              };
            }
          }

          return {
            code: coupon.id || '',
            amount_off: coupon.amount_off || 0,
            percent_off: coupon.percent_off,
            duration: {
              duration_in_months: coupon.duration_in_months,
              duration: coupon.duration
            }
          };
        })() : undefined,
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
      discounts: [], // Remove any existing coupon/discount when switching plans
      proration_behavior: 'create_prorations', // This handles prorating charges
    })

    // Update local database
    const productName = (newPrice.product as Stripe.Product).name
    const subscriptionPlan = productName.toUpperCase() || 'FREE'
    const interval = newPrice.recurring?.interval_count === 3 ? 'quarter' : newPrice.recurring?.interval || 'month'

    const currentPeriodEnd = getCurrentPeriodEnd(updatedSubscription);

    await prisma.subscription.update({
      where: {
        email: user.email,
      },
      data: {
        plan: subscriptionPlan,
        interval: interval,
        endDate: new Date(currentPeriodEnd * 1000),
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