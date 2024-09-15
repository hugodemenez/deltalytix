'use server'

import { NextResponse } from "next/server";
import { createClient, getWebsiteURL } from "@/server/auth";
import { stripe } from "@/server/stripe";

export async function POST(req: Request, res: Response) {
    const body = await req.formData();
    const websiteURL = await getWebsiteURL();
    if (!body.get('lookup_key')) {
        return NextResponse.json({ message: "Lookup key is required" }, { status: 400 });
    }
    const lookup_key = body.get('lookup_key') as string;
    const supabase = await createClient();
    const {data:{user}} = await supabase.auth.getUser();
    if (!user) {
        return NextResponse.redirect(`${websiteURL}authentication?subscription=true&lookup_key=${lookup_key}`, 303);
    }
    const prices = await stripe.prices.list({
        lookup_keys: [lookup_key],
        expand: ['data.product'],
    });
    console.log('prices', prices)
    const session = await stripe.checkout.sessions.create({
        billing_address_collection: 'auto',
        customer_email: user.email,
        metadata: {
            plan: lookup_key,
        },
        line_items: [
            {
                price: prices.data[0].id,
                // For metered billing, do not pass quantity
                quantity: 1,
            },
        ],
        mode: 'subscription',
        success_url: `${websiteURL}dashboard?success=true&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${websiteURL}pricing?canceled=true`,
    });
    console.log('session', session)

  console.log('session.url', session.url)
  return NextResponse.redirect(session.url as string, 303 );
}

export async function GET(req: Request, res: Response) {
    const websiteURL = await getWebsiteURL();
    const { searchParams } = new URL(req.url);
    const lookup_key = searchParams.get('lookup_key');
    if (!lookup_key) {
        return NextResponse.json({ message: "Lookup key is required" }, { status: 400 });
    }
    const supabase = await createClient();
    const {data:{user}} = await supabase.auth.getUser();
    if (!user) {
        return NextResponse.redirect(`${websiteURL}authentication?subscription=true&lookup_key=${lookup_key}`, 303);
    }
    const prices = await stripe.prices.list({
        lookup_keys: [lookup_key],
        expand: ['data.product'],
    });
    console.log('prices', prices)
    const session = await stripe.checkout.sessions.create({
        billing_address_collection: 'auto',
        customer_email: user.email,
        metadata: {
            plan: lookup_key,
        },
        line_items: [
            {
                price: prices.data[0].id,
                // For metered billing, do not pass quantity
                quantity: 1,
            },
        ],
        mode: 'subscription',
        success_url: `${websiteURL}dashboard?success=true&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${websiteURL}pricing?canceled=true`,
    });
    console.log('session', session)

  console.log('session.url', session.url)
  return NextResponse.redirect(session.url as string, 303 );
}