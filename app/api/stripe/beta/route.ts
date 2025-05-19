'use server'

import { NextResponse } from "next/server";
import { createClient, getWebsiteURL } from "@/server/auth";
import { stripe } from "@/app/[locale]/(landing)/actions/stripe";
import { getSubscriptionDetails } from "@/server/subscription";
import { PrismaClient } from "@prisma/client";

const BETA_TRIAL_DAYS = 30; // 30 days trial for beta users

async function handleBetaCheckoutSession(lookup_key: string, user: any, websiteURL: string, referralCode: string) {
    const subscriptionDetails = await getSubscriptionDetails(user.email);

    if (subscriptionDetails?.isActive) {
        return NextResponse.redirect(
            `${websiteURL}dashboard?error=already_subscribed`,
            303
        );
    }

    // First, try to find existing customer
    const existingCustomers = await stripe.customers.list({
        email: user.email,
        limit: 1,
    });

    let customerId: string;

    if (existingCustomers.data.length > 0) {
        // Use existing customer
        customerId = existingCustomers.data[0].id;
    } else {
        // Create new customer if none exists
        const newCustomer = await stripe.customers.create({
            email: user.email,
            metadata: {
                referral_code: referralCode, // Store referral code in metadata
                is_beta: 'true'
            }
        });
        customerId = newCustomer.id;
    }

    const prices = await stripe.prices.list({
        lookup_keys: [lookup_key],
        expand: ['data.product'],
    });

    if (!prices.data.length) {
        return NextResponse.json({ message: "Price not found" }, { status: 404 });
    }

    const session = await stripe.checkout.sessions.create({
        customer: customerId,
        metadata: {
            plan: lookup_key,
            referral_code: referralCode,
            is_beta: 'true'
        },
        line_items: [
            {
                price: prices.data[0].id,
                quantity: 1,
            },
        ],
        mode: 'subscription',
        subscription_data: {
            trial_period_days: BETA_TRIAL_DAYS,
            metadata: {
                referral_code: referralCode,
                is_beta: 'true'
            }
        },
        payment_method_collection: 'if_required',
        allow_promotion_codes: true,
        success_url: `${websiteURL}dashboard?success=true&beta=true`,
        cancel_url: `${websiteURL}pricing?canceled=true`,
    });

    return NextResponse.redirect(session.url as string, 303);
}

export async function GET(req: Request) {
    const websiteURL = await getWebsiteURL();
    const { searchParams } = new URL(req.url);
    const lookup_key = searchParams.get('lookup_key');
    const referral_code = searchParams.get('referral_code');

    if (!lookup_key) {
        return NextResponse.json({ message: "Lookup key is required" }, { status: 400 });
    }

    if (!referral_code) {
        return NextResponse.json({ message: "Referral code is required for beta access" }, { status: 400 });
    }

    const supabase = await createClient();
    const {data:{user}} = await supabase.auth.getUser();
    
    if (!user) {
        return NextResponse.json({ message: "User not found" }, { status: 400 });
    }

    // Check if user has beta access
    const prisma = new PrismaClient();
    const dbUser = await prisma.user.findUnique({
        where: {
            auth_user_id: user.id
        }
    });

    if (!dbUser?.isBeta) {
        return NextResponse.json({ message: "Beta access is required" }, { status: 403 });
    }

    return handleBetaCheckoutSession(lookup_key, user, websiteURL, referral_code);
} 