'use server'

import type { Stripe } from "stripe";
import { NextResponse } from "next/server";
import { stripe } from "@/server/stripe";
import { PrismaClient } from "@prisma/client";

export async function GET(req: Request) {
  return NextResponse.json({ message: "Hello World" }, { status: 200 });
}

export async function POST(req: Request) {
  let event: Stripe.Event | undefined;
  try {
     event = stripe.webhooks.constructEvent(
      await (await req.blob()).text(),
      req.headers.get("stripe-signature") as string,
      process.env.STRIPE_WEBHOOK_SECRET as string,
    );
  } 
  catch (err) {
    // On error, log and return the error message.
    console.log('err', err)
    return NextResponse.json(
      { message: `Webhook Error: ${err}` },
      { status: 400 },
    );
  }

  // Successfully constructed event.
  console.log("✅ Success:", event.id);

  const permittedEvents: string[] = [
    "checkout.session.completed",
    "payment_intent.succeeded",
    "payment_intent.payment_failed",
  ];

  if (permittedEvents.includes(event.type)) {
    let data;
    const prisma = new PrismaClient()

    try {
      switch (event.type) {
        case "checkout.session.completed":
          data = event.data.object as Stripe.Checkout.Session;
          const subscription = await prisma.subscription.upsert({
            where: {
              email: data.customer_details?.email as string,
            },
            update: {
              plan: data.metadata?.plan as string,
            },
            create: {
              email: data.customer_details?.email as string,
              plan: data.metadata?.plan as string,
            }
          })
          break;
        case "payment_intent.payment_failed":
          data = event.data.object as Stripe.PaymentIntent;
          console.log(`❌ Payment failed: ${data.last_payment_error?.message}`);
          break;
        case "payment_intent.succeeded":
          data = event.data.object as Stripe.PaymentIntent;
          console.log(`💰 PaymentIntent status: ${data.status}`);
          break;
        case "customer.subscription.deleted":
          data = event.data.object as Stripe.Subscription;
          console.log(`💰 Subscription deleted: ${data.id}`);
          break;
        default:
          throw new Error(`Unhandled event: ${event.type}`);
      }
    } catch (error) {
      console.log(error);
      return NextResponse.json(
        { message: "Webhook handler failed" },
        { status: 500 },
      );
    }
  }
  // Return a response to acknowledge receipt of the event.
  return NextResponse.json({ message: "Received" }, { status: 200 });
}