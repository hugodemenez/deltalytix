'use server'

import type { Stripe } from "stripe";
import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/server/stripe";
import { PrismaClient } from "@prisma/client";
import { sendSubscriptionErrorEmail } from "@/server/send-support-email";

export async function GET(request: NextRequest) {
    return NextResponse.json({ message: 'Hello, world!' })
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
    "customer.subscription.deleted",
    "customer.subscription.updated"
  ];

  if (permittedEvents.includes(event.type)) {
    let data;
    const prisma = new PrismaClient()

    try {
      switch (event.type) {
        case "checkout.session.completed":
          data = event.data.object as Stripe.Checkout.Session;
          
          // Retrieve the subscription details from the session
          const subscription = await stripe.subscriptions.retrieve(
            data.subscription as string
          );
          
          const user = await prisma.user.findUnique({
            where: { email: data.customer_details?.email as string },
          });

          await prisma.subscription.upsert({
            where: {
              email: data.customer_details?.email as string,
            },
            update: {
              plan: data.metadata?.plan as string,
              endDate: new Date(subscription.current_period_end * 1000),
              status: subscription.status === 'trialing' ? 'TRIAL' : 'ACTIVE'
            },
            create: {
              email: data.customer_details?.email as string,
              plan: data.metadata?.plan as string,
              user: { connect: { id: user?.id } },
              endDate: new Date(subscription.current_period_end * 1000),
              status: subscription.status === 'trialing' ? 'TRIAL' : 'ACTIVE'
            }
          });

          console.log('subscription', subscription)
          // In case of error creating the subscription send email to support
          if (!subscription) {
            await sendSubscriptionErrorEmail({
              contactInfo: {
                email: data.customer_details?.email as string,
                additionalInfo: `Error creating subscription`,
              }
            })
          }
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
          const customerData = await stripe.customers.retrieve(
            data.customer as string
          ) as Stripe.Customer;
          
          if (customerData.email) {
            await prisma.subscription.update({
              where: { email: customerData.email },
              data: { 
                status: "CANCELLED",
                endDate: new Date(data.ended_at! * 1000)
              }
            });
          }
          console.log(`Subscription deleted and updated in DB: ${data.id}`);
          break;
        case "customer.subscription.updated":
          data = event.data.object as Stripe.Subscription;
          const updatedCustomerData = await stripe.customers.retrieve(
            data.customer as string
          ) as Stripe.Customer;
          
          if (updatedCustomerData.email && data.cancel_at_period_end) {
            await prisma.subscription.update({
              where: { email: updatedCustomerData.email },
              data: {
                status: "SCHEDULED_CANCELLATION",
                endDate: new Date(data.current_period_end * 1000)
              }
            });
            console.log(`Subscription scheduled for cancellation: ${data.id}`);
          }
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