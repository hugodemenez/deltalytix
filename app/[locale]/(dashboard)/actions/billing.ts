'use server'

import { createClient } from '@/server/auth'
import { cookies } from 'next/headers'
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-06-20',
})

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
    interval: 'month' | 'year'
  }
}

export async function getSubscriptionData() {
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
      // Create a new customer if they don't exist
      const newCustomer = await stripe.customers.create({
        email: user.email,
        metadata: {
          user_id: user.id,
        },
      })
      return null // New customer won't have a subscription yet
    }

    // Get all subscriptions for the customer
    const subscriptions = await stripe.subscriptions.list({
      customer: customer.id,
      status: 'all',
      expand: ['data.plan', 'data.items.data.price'],
      limit: 1,
    })

    // Get the most recent subscription
    const subscription = subscriptions.data[0]
    
    if (!subscription) {
      return null
    }

    const price = subscription.items.data[0].price

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
        name: price.nickname || 'Unknown Plan',
        amount: price.unit_amount || 0,
        interval: price.recurring?.interval || 'month',
      },
    } as SubscriptionWithPrice
  } catch (error) {
    console.error('Error fetching subscription:', error)
    return null
  }
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