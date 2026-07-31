'use server'

import { NextResponse } from "next/server";
import { createClient, getWebsiteURL } from "@/server/auth";
import { stripe } from "@/server/stripe";
import { getSubscriptionDetails } from "@/server/subscription";
import { getReferralBySlug } from "@/server/referral";
import { capturePostHogEvent, hasAnalyticsConsent } from "@/lib/posthog-server";
import { applySignupSuccess, hasSignupSuccess } from "@/lib/signup-redirect";
import { resolveStripeCustomerForUser } from "@/server/stripe-customer";

// This endpoint renders no page of ours — it redirects straight to Stripe — so
// a signup marker arriving here would never reach the Google tag. Forward it to
// every URL that brings the user back instead. The account already exists at
// this point, so the signal is owed regardless of how checkout ends.
function buildReturnUrl(
    websiteURL: string,
    path: string,
    params: Record<string, string>,
    signupSuccess: boolean,
) {
    const url = new URL(path, websiteURL);
    for (const [key, value] of Object.entries(params)) {
        url.searchParams.set(key, value);
    }
    applySignupSuccess(url, signupSuccess);
    return url.toString();
}

async function handleCheckoutSession(lookup_key: string, user: any, websiteURL: string, referral?: string | null, promo_code?: string | null, signupSuccess = false) {
    const subscriptionDetails = await getSubscriptionDetails();
    
    // If referral code is provided, validate it (but don't block checkout if invalid)
    if (referral) {
        try {
            const referralData = await getReferralBySlug(referral);
            if (!referralData) {
                // Invalid referral code, but don't block checkout - just remove it
                referral = null;
            } else if (user?.id && referralData.userId === user.id) {
                // User trying to use their own code, remove it
                referral = null;
            }
        } catch (error) {
            console.error('Error validating referral code:', error);
            // Don't block checkout if validation fails
            referral = null;
        }
    }

    if (subscriptionDetails?.isActive) {
        return NextResponse.redirect(
            buildReturnUrl(websiteURL, 'dashboard', { error: 'already_subscribed' }, signupSuccess),
            303
        );
    }

    const customer = await resolveStripeCustomerForUser({
        userId: user.id,
        email: user.email,
        createIfMissing: true,
        synchronizeEmail: true,
    });
    if (!customer) {
        throw new Error('Unable to resolve Stripe customer');
    }

    const customerId = customer.id;

    const prices = await stripe.prices.list({
        lookup_keys: [lookup_key],
        expand: ['data.product'],
    });

    if (!prices.data.length) {
        return NextResponse.json({ message: "Price not found" }, { status: 404 });
    }

    const price = prices.data[0];
    const isLifetimePlan = price.type === 'one_time' || lookup_key.includes('lifetime');

    // Calculate remaining trial days if there was a previous trial (only for recurring plans)
    let trialDays = 0;
    
    if (!isLifetimePlan && subscriptionDetails?.trialEndsAt) {
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

    // Create session with appropriate mode based on price type
    const analyticsConsent = await hasAnalyticsConsent();
    const sessionConfig: any = {
        customer: customerId,
        metadata: {
            plan: lookup_key,
            user_id: user.id,
            ...(referral && { referral_code: referral }),
            ...(promo_code && { promo_code: promo_code }),
            ...(analyticsConsent && {
                analytics_consent: 'granted',
                posthog_distinct_id: user.id,
            }),
        },
        line_items: [
            {
                price: price.id,
                quantity: 1,
            },
        ],
        success_url: buildReturnUrl(
            websiteURL,
            'dashboard',
            { success: 'true', referral_applied: referral ? 'true' : 'false' },
            signupSuccess,
        ),
        // Abandoning checkout does not undo the registration, so the marker
        // rides the cancel path too.
        cancel_url: buildReturnUrl(websiteURL, 'pricing', { canceled: 'true' }, signupSuccess),
        allow_promotion_codes: true,
    };

    if (isLifetimePlan) {
        // One-time payment mode for lifetime plans
        sessionConfig.mode = 'payment';
    } else {
        // Subscription mode for recurring plans
        sessionConfig.mode = 'subscription';
        sessionConfig.payment_method_collection = 'if_required';
        
        // Add subscription-specific configuration
        if (trialDays > 0) {
            sessionConfig.subscription_data = {
                trial_period_days: trialDays,
                metadata: { user_id: user.id },
            };
        } else {
            sessionConfig.subscription_data = {
                metadata: { user_id: user.id },
            };
        }
    }

    const session = await stripe.checkout.sessions.create(sessionConfig);

    await capturePostHogEvent({
        distinctId: user.id,
        event: 'checkout_started',
        properties: {
            lookup_key,
            is_lifetime: isLifetimePlan,
            has_referral: Boolean(referral),
            has_promo_code: Boolean(promo_code),
            stripe_checkout_session_id: session.id,
        },
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
    const promo_code = body.get('promo_code') as string | null;

    const supabase = await createClient();
    const {data:{user}} = await supabase.auth.getUser();
    
    if (!user) {
        const referralParam = referral ? `&referral=${encodeURIComponent(referral)}` : '';
        const promoParam = promo_code ? `&promo_code=${encodeURIComponent(promo_code)}` : '';
        return NextResponse.redirect(
            `${websiteURL}authentication?subscription=true&lookup_key=${lookup_key}${referralParam}${promoParam}`,
            303
        );
    }

    return handleCheckoutSession(lookup_key, user, websiteURL, referral, promo_code, false);
}

export async function GET(req: Request) {
    const websiteURL = await getWebsiteURL();
    const { searchParams } = new URL(req.url);
    const lookup_key = searchParams.get('lookup_key');
    const referral = searchParams.get('referral');
    const promo_code = searchParams.get('promo_code');

    if (!lookup_key) {
        return NextResponse.json({ message: "Lookup key is required" }, { status: 400 });
    }

    const supabase = await createClient();
    const {data:{user}} = await supabase.auth.getUser();
    
    if (!user) {
        const referralParam = referral ? `&referral=${encodeURIComponent(referral)}` : '';
        const promoParam = promo_code ? `&promo_code=${encodeURIComponent(promo_code)}` : '';
        return NextResponse.redirect(
            `${websiteURL}authentication?subscription=true&lookup_key=${lookup_key}${referralParam}${promoParam}`,
            303
        );
    }

    return handleCheckoutSession(
        lookup_key,
        user,
        websiteURL,
        referral,
        promo_code,
        hasSignupSuccess(searchParams),
    );
}
