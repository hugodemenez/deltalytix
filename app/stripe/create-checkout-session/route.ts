'use server'

import { NextResponse } from "next/server";
import { createClient, getWebsiteURL } from "@/server/auth";
import { stripe } from "@/server/stripe";

export async function POST(req: Request, res: Response) {
    const body = await req.formData();
    const websiteURL = await getWebsiteURL();
    const supabase = await createClient();
    const {data:{user}} = await supabase.auth.getUser();
    if (!user) {
        return NextResponse.redirect(`${websiteURL}authentication?subscription=true`, 303);
    }
    if (!body.get('lookup_key')) {
        return NextResponse.json({ message: "Lookup key is required" }, { status: 400 });
    }
    const prices = await stripe.prices.list({
        lookup_keys: [body.get('lookup_key') as string],
        expand: ['data.product'],
    });
    console.log('prices', prices)
    const session = await stripe.checkout.sessions.create({
        billing_address_collection: 'auto',
        customer_email: user.email,
        metadata: {
            plan: body.get('lookup_key') as string,
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