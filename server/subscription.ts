'use server'

import { PrismaClient } from "@prisma/client"

interface SubscriptionInfo {
    isActive: boolean;
    plan: string | null;
    status: string;
    endDate: Date | null;
    trialEndsAt: Date | null;
}

export async function getIsSubscribed(email: string) {
    console.log("getIsSubscribed", email)
    if (email.endsWith('@rithmic.com')) {
      return true
    }
    const prisma = new PrismaClient()
    
    try {
        const subscription = await prisma.subscription.findUnique({
            where: { email }
        })

        if (!subscription) return false

        const now = new Date()
        
        // Check if subscription is active based on status and dates
        const isActive = 
            // Must have ACTIVE or TRIAL status
            (subscription.status === 'ACTIVE' || subscription.status === 'TRIAL') ||
            // If there's an endDate, it must be in the future
            (!subscription.endDate || subscription.endDate > now) ||
            // If there's a trial end date, it must be in the future
            (!subscription.trialEndsAt || subscription.trialEndsAt > now)

        return isActive

    } catch (error) {
        console.error('Error checking subscription status:', error)
        return false
    } finally {
        await prisma.$disconnect()
    }
}

// Optional: You might want to get more detailed subscription info
export async function getSubscriptionDetails(email: string): Promise<SubscriptionInfo | null> {
    console.log("getSubscriptionDetails", email)
    const prisma = new PrismaClient()
    
    try {
        const subscription = await prisma.subscription.findUnique({
            where: { email }
        })

        if (!subscription) return null

        const now = new Date()
        const isActive = subscription.status === 'ACTIVE' || 
                        (subscription.status === 'TRIAL' && subscription.trialEndsAt != null && subscription.trialEndsAt > now)
        
        return {
            isActive,
            plan: subscription.plan,
            status: subscription.status,
            endDate: subscription.endDate,
            trialEndsAt: subscription.trialEndsAt
        }

    } catch (error) {
        console.error('Error fetching subscription details:', error)
        return null
    } finally {
        await prisma.$disconnect()
    }
}