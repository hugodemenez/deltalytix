'use server'

import { prisma } from '@/lib/prisma'
import { headers } from 'next/headers';
import { createClient } from './auth';

interface SubscriptionInfo {
    isActive: boolean;
    plan: string | null;
    status: string;
    endDate: Date | null;
    trialEndsAt: Date | null;
}

// Validate email to prevent SQL injection and invalid queries
function isValidEmail(email: string): boolean {
    if (!email || typeof email !== 'string') return false
    // Basic email validation regex
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

export async function getSubscriptionDetails(): Promise<SubscriptionInfo | null> {
    // Get user email using headers from our middleware
    const headersList = await headers()
    let email = headersList.get("x-user-email")
    if (!email) {
        // USE supabase to get user email
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
            return null
        }
        email = user.email || null
    }
    // Input validation
    if (!email || !isValidEmail(email)) {
        console.error('[getSubscriptionDetails] Invalid email format:', email)
        return null
    }
    const normalizedEmail = email.toLowerCase().trim()

    if (normalizedEmail.endsWith('@rithmic.com')) {
        return {
            isActive: true,
            plan: 'Plus',
            status: 'ACTIVE',
            endDate: null,
            trialEndsAt: null
        }
    }

    console.log("[getSubscriptionDetails] Fetching details for", normalizedEmail)

    try {
        const subscription = await prisma.subscription.findUnique({
            where: { email: normalizedEmail },
            // Only select the fields we need
            select: {
                status: true,
                plan: true,
                endDate: true,
                trialEndsAt: true
            }
        })

        if (!subscription) return null

        const now = new Date()

        // Ensure isActive is always boolean
        // Only consider ACTIVE, TRIAL, and lifetime subscriptions as active
        const isActive = Boolean(
            subscription.status === 'ACTIVE' ||
            (subscription.status === 'TRIAL' && subscription.trialEndsAt && subscription.trialEndsAt > now)
            // Removed the endDate check for non-lifetime subscriptions to allow resubscription after cancellation
        )

        return {
            isActive,
            plan: subscription.plan,
            status: subscription.status,
            endDate: subscription.endDate,
            trialEndsAt: subscription.trialEndsAt
        }

    } catch (error) {
        console.error('[getSubscriptionDetails] Database error:', {
            email: normalizedEmail,
            error: error instanceof Error ? error.message : 'Unknown error'
        })
        return null
    }
}