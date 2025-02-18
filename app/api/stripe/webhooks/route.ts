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
    "customer.subscription.updated",
    "customer.subscription.created"
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

          const checkoutPlan = data.metadata?.plan || 'free'; // Provide a default value
          await prisma.subscription.upsert({
            where: {
              email: data.customer_details?.email as string,
            },
            update: {
              plan: checkoutPlan,
              endDate: new Date(subscription.current_period_end * 1000),
              status: subscription.status === 'trialing' ? 'TRIAL' : 'ACTIVE',
              trialEndsAt: subscription.trial_end ? new Date(subscription.trial_end * 1000) : null
            },
            create: {
              email: data.customer_details?.email as string,
              plan: checkoutPlan,
              user: { connect: { id: user?.id } },
              endDate: new Date(subscription.current_period_end * 1000),
              status: subscription.status === 'trialing' ? 'TRIAL' : 'ACTIVE',
              trialEndsAt: subscription.trial_end ? new Date(subscription.trial_end * 1000) : null
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
          
          if (updatedCustomerData.email) {
            if (data.cancel_at_period_end) {
              // Update subscription status first
              await prisma.subscription.update({
                where: { email: updatedCustomerData.email },
                data: {
                  status: "SCHEDULED_CANCELLATION",
                  endDate: new Date(data.current_period_end * 1000)
                }
              });

              // Then try to save feedback if it exists and has meaningful content
              const cancellationDetails = data.cancellation_details as Stripe.Subscription.CancellationDetails | null;
              
              if ((cancellationDetails?.reason && cancellationDetails.reason !== 'cancellation_requested') || 
                  cancellationDetails?.feedback || 
                  cancellationDetails?.comment) {
                await prisma.subscriptionFeedback.create({
                  data: {
                    email: updatedCustomerData.email,
                    event: "SCHEDULED_CANCELLATION",
                    cancellationReason: cancellationDetails.feedback || null,
                    feedback: cancellationDetails.comment || null
                  }
                });
              }

              console.log(`Subscription scheduled for cancellation: ${data.id}`);
            } else {
              const updatedPlan = data.metadata?.plan || 'free'; // Provide a default value
              await prisma.subscription.update({
                where: { email: updatedCustomerData.email },
                data: {
                  status: data.status === 'trialing' ? 'TRIAL' : 'ACTIVE',
                  plan: updatedPlan,
                  endDate: new Date(data.current_period_end * 1000),
                  trialEndsAt: data.trial_end ? new Date(data.trial_end * 1000) : null
                }
              });
              console.log(`Subscription updated: ${data.id}`);
            }
          }
          break;
        case "customer.subscription.created":
          data = event.data.object as Stripe.Subscription;
          const newCustomerData = await stripe.customers.retrieve(
            data.customer as string
          ) as Stripe.Customer;
          
          if (newCustomerData.email) {
            const user = await prisma.user.findUnique({
              where: { email: newCustomerData.email },
            });

            if (user) {
              const subscriptionPlan = data.metadata?.plan || 'free'; // Provide a default value
              await prisma.subscription.upsert({
                where: { email: newCustomerData.email },
                update: {
                  status: data.status === 'trialing' ? 'TRIAL' : 'ACTIVE',
                  plan: subscriptionPlan,
                  endDate: new Date(data.current_period_end * 1000),
                  trialEndsAt: data.trial_end ? new Date(data.trial_end * 1000) : null
                },
                create: {
                  email: newCustomerData.email,
                  plan: subscriptionPlan,
                  user: { connect: { id: user.id } },
                  status: data.status === 'trialing' ? 'TRIAL' : 'ACTIVE',
                  endDate: new Date(data.current_period_end * 1000),
                  trialEndsAt: data.trial_end ? new Date(data.trial_end * 1000) : null
                }
              });
              console.log(`New subscription created and saved: ${data.id}`);
            }
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