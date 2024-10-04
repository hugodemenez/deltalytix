'use server'

import type { Stripe } from "stripe";
import { NextResponse } from "next/server";
import { getWebsiteURL } from "@/server/auth";
import { stripe } from "@/server/stripe";

export async function POST(req: Request) {
    console.log('create-portal-session')
    const body = await req.json();
    if (!body.session_id) {
        return NextResponse.json({ message: "Session ID is required" }, { status: 400 });
    }
    // For demonstration purposes, we're using the Checkout session to retrieve the customer ID.
  // Typically this is stored alongside the authenticated user in your database.
  const { session_id } = body.session_id;
  const checkoutSession = await stripe.checkout.sessions.retrieve(session_id);

  // This is the url to which the customer will be redirected when they are done
  // managing their billing with the portal.
  const returnUrl = await getWebsiteURL();

  const portalSession = await stripe.billingPortal.sessions.create({
    customer: checkoutSession.customer as string,
    return_url: returnUrl,
  });

    return NextResponse.json({ sessionUrl: portalSession.url }, { status: 303 });
}