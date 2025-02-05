'use server'

import { NextResponse } from "next/server";
import { createClient, getWebsiteURL } from "@/server/auth";
import { stripe } from "@/server/stripe";
import { getSubscriptionDetails } from "@/server/subscription";

async function handleCheckoutSession(lookup_key: string, user: any, websiteURL: string, referral?: string | null) {
    const subscriptionDetails = await getSubscriptionDetails(user.email);

    if (subscriptionDetails?.isActive) {
        return NextResponse.redirect(
            `${websiteURL}dashboard?error=already_subscribed`,
            303
        );
    }

    const prices = await stripe.prices.list({
        lookup_keys: [lookup_key],
        expand: ['data.product'],
    });

    if (!prices.data.length) {
        return NextResponse.json({ message: "Price not found" }, { status: 404 });
    }

    // Calculate remaining trial days if there was a previous trial
    let trialDays = 7;
    
    if (subscriptionDetails?.trialEndsAt) {
        const now = new Date();
        const trialEnd = new Date(subscriptionDetails.trialEndsAt);
        
        if (trialEnd > now) {
            // If trial end is in future, calculate remaining days
            const remainingDays = Math.ceil((trialEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
            trialDays = Math.min(remainingDays, trialDays);
        } else {
            // If trial has ended, no new trial
            trialDays = 0;
        }
    }

    const session = await stripe.checkout.sessions.create({
        billing_address_collection: 'auto',
        customer_email: user.email,
        metadata: {
            plan: lookup_key,
        },
        line_items: [
            {
                price: prices.data[0].id,
                quantity: 1,
            },
        ],
        mode: 'subscription',
        subscription_data: trialDays > 0 ? {
            trial_period_days: trialDays,
        } : undefined,
        // payment_method_collection: trialDays > 0 ? 'if_required' : 'always',
        allow_promotion_codes: true,
        success_url: `${websiteURL}dashboard?success=true&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${websiteURL}pricing?canceled=true`,
    });

    return NextResponse.redirect(session.url as string, 303);
}

export async function POST(req: Request) {
    const body = await req.formData();
    const websiteURL = await getWebsiteURL();

    if (!body.get('lookup_key')) {
        return NextResponse.json({ message: "Lookup key is required" }, { status: 400 });
    }

    const lookup_key = body.get('lookup_key') as string;
    const referral = body.get('referral') as string | null;

    const supabase = await createClient();
    const {data:{user}} = await supabase.auth.getUser();
    console.log(user);
    
    if (!user) {
        return NextResponse.redirect(
            `${websiteURL}authentication?subscription=true&lookup_key=${lookup_key}`,
            303
        );
    }

    return handleCheckoutSession(lookup_key, user, websiteURL, referral);
}

export async function GET(req: Request) {
    const websiteURL = await getWebsiteURL();
    const { searchParams } = new URL(req.url);
    const lookup_key = searchParams.get('lookup_key');

    if (!lookup_key) {
        return NextResponse.json({ message: "Lookup key is required" }, { status: 400 });
    }

    const supabase = await createClient();
    const {data:{user}} = await supabase.auth.getUser();
    
    if (!user) {
        return NextResponse.redirect(
            `${websiteURL}authentication?subscription=true&lookup_key=${lookup_key}`,
            303
        );
    }

    return handleCheckoutSession(lookup_key, user, websiteURL);
}