'use server'

import { prisma } from '@/lib/prisma'
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

export async function getSubscriptionDetails(email: string): Promise<SubscriptionInfo | null> {
    // Input validation
    if (!isValidEmail(email)) {
        console.error('[getSubscriptionDetails] Invalid email format:', email)
        return null
    }

    // Normalize email to lowercase to ensure consistent lookups
    const normalizedEmail = email.toLowerCase().trim()

    if (normalizedEmail.endsWith('@rithmic.com')) {
        return {
            isActive: true,
            plan: 'ENTERPRISE',
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
        const isActive = Boolean(
            subscription.status === 'ACTIVE' || 
            (subscription.status === 'TRIAL' && subscription.trialEndsAt && subscription.trialEndsAt > now) ||
            (subscription.endDate && subscription.endDate > now)
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

export async function getUserWithSubscription() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
  
    if (!user) {
      throw new Error('User not found');
    }
  
    const subscription = await prisma.subscription.findUnique({
      where: { email: user.email?.toLowerCase().trim() },
      select: {
        status: true,
        plan: true,
        endDate: true,
        trialEndsAt: true,
      },
    });
  
    const now = new Date();
    const isActive = Boolean(
      subscription?.status === 'ACTIVE' ||
      (subscription?.status === 'TRIAL' && subscription.trialEndsAt && subscription.trialEndsAt > now) ||
      (subscription?.endDate && subscription.endDate > now)
    );
  
    return {
      user,
      subscription: {
        isActive,
        plan: subscription?.plan,
        status: subscription?.status,
        endDate: subscription?.endDate,
        trialEndsAt: subscription?.trialEndsAt,
      },
    };
  }