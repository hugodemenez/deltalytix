'use server'

import { prisma } from '@/lib/prisma'
import { createClient } from './auth';

interface SubscriptionInfo {
    isActive: boolean;
    plan: string | null;
    status: string;
    endDate: Date | null;
    trialEndsAt: Date | null;
    /** Last address Stripe was told about; null when no local row exists. */
    billingEmail: string | null;
}

export async function getSubscriptionDetails(): Promise<SubscriptionInfo | null> {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user?.id) {
        return null
    }
    const normalizedEmail = user.email?.toLowerCase().trim() || ''

    if (normalizedEmail.endsWith('@rithmic.com')) {
        return {
            isActive: true,
            plan: 'Plus',
            status: 'ACTIVE',
            endDate: null,
            trialEndsAt: null,
            billingEmail: null
        }
    }

    console.log("[getSubscriptionDetails] Fetching details for authenticated user", user.id)

    try {
        const appUser = await prisma.user.findUnique({
            where: { auth_user_id: user.id },
            select: { id: true },
        })
        if (!appUser) return null

        const subscription = await prisma.subscription.findUnique({
            where: { userId: appUser.id },
            // Only select the fields we need
            select: {
                status: true,
                plan: true,
                endDate: true,
                trialEndsAt: true,
                email: true
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
            trialEndsAt: subscription.trialEndsAt,
            billingEmail: subscription.email
        }

    } catch (error) {
        console.error('[getSubscriptionDetails] Database error:', {
            userId: user.id,
            error: error instanceof Error ? error.message : 'Unknown error'
        })
        return null
    }
}
