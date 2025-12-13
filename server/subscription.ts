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
    // Short-circuit: grant active Pro subscription to every user and avoid Stripe/DB lookups
    return {
        isActive: true,
        plan: 'Plus',
        status: 'ACTIVE',
        endDate: null,
        trialEndsAt: null,
    }
}