'use server'

import type { Stripe } from "stripe";
import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/actions/stripe";
import { PrismaClient } from "@prisma/client";
import { sendSubscriptionErrorEmail } from "@/app/[locale]/(landing)/actions/send-support-email";

// Helper function to get current period end from subscription items
function getCurrentPeriodEnd(subscription: Stripe.Subscription): number {
  // In Stripe v19, current_period_end is available on subscription items
  // We'll get it from the first subscription item
  if (subscription.items && subscription.items.data && subscription.items.data.length > 0) {
    return subscription.items.data[0].current_period_end;
  }

  // Fallback to billing_cycle_anchor if no items available
  return subscription.billing_cycle_anchor;
}

// Helper function to get current period end from webhook event data
function getCurrentPeriodEndFromEventData(data: Stripe.Subscription): number {
  // For webhook events, we need to check if current_period_end exists directly on the subscription
  // or if we need to get it from subscription items
  if ('current_period_end' in data && typeof data.current_period_end === 'number') {
    return data.current_period_end;
  }

  // Fallback to billing_cycle_anchor
  return data.billing_cycle_anchor;
}

export async function GET(request: NextRequest) {
  return NextResponse.json({ message: 'Hello, world!' })
}

export async function POST(req: Request) {
  if (!stripe) {
    return NextResponse.json({ message: 'Stripe is not configured' }, { status: 503 })
  }
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
    "customer.subscription.created",
    "invoice.payment_failed",
    "customer.subscription.trial_will_end"
  ];

  if (permittedEvents.includes(event.type)) {
    let data;
    const prisma = new PrismaClient()

    try {
      switch (event.type) {
        case "checkout.session.completed":
          console.log('checkout.session.completed')
          data = event.data.object as Stripe.Checkout.Session;

          // Handle different modes: subscription vs payment (one-time)
          if (data.mode === 'subscription' && data.subscription) {
            // Handle recurring subscription
            const subscription = await stripe.subscriptions.retrieve(
              data.subscription as string
            );

            // Get the price information to determine the plan
            const subscriptionItems = await stripe.subscriptionItems.list({
              subscription: data.subscription as string,
            });

            const priceId = subscriptionItems.data[0]?.price.id;
            const price = await stripe.prices.retrieve(priceId, {
              expand: ['product'],
            });
            console.log('SUBSCRIPTION PRICE', price)
            const productName = (price.product as Stripe.Product).name;
            const subscriptionPlan = productName.toUpperCase() || 'FREE';
            // If interval_count is 3 then it is quarterly
            const interval = price.recurring?.interval_count === 3 ? 'quarter' : price.recurring?.interval || 'month';

            const user = await prisma.user.findUnique({
              where: { email: data.customer_details?.email as string },
            });

            const currentPeriodEnd = getCurrentPeriodEnd(subscription);

            // We should register subscription as a business subscription if it is a business subscription
            // Otherwise it will interfer with the user subscription (! user can have both a business subscription and a user subscription)
            // And multiple business subscriptions for the same user will be registered as different subscriptions in the database
            await prisma.subscription.upsert({
              where: {
                email: data.customer_details?.email as string,
              },
              update: {
                plan: subscriptionPlan,
                endDate: new Date(currentPeriodEnd * 1000),
                status: 'ACTIVE',
                trialEndsAt: null,
                interval: interval,
              },
              create: {
                email: data.customer_details?.email as string,
                plan: subscriptionPlan,
                user: { connect: { id: user?.id } },
                endDate: new Date(currentPeriodEnd * 1000),
                status: 'ACTIVE',
                trialEndsAt: null,
                interval: interval,
              }
            });

            console.log('subscription created/updated', subscription)
            
            // Apply referral code if present in metadata
            if (data.metadata?.referral_code && user?.id) {
              try {
                const { getReferralBySlug, addReferredUser } = await import('@/server/referral')
                const referral = await getReferralBySlug(data.metadata.referral_code)
                if (referral && referral.userId !== user.id) {
                  // Check if user is already in the referral list
                  if (!referral.referredUserIds.includes(user.id)) {
                    await addReferredUser(referral.id, user.id)
                    console.log('Referral code applied successfully for user:', user.id)
                  }
                }
              } catch (error) {
                console.error('Error applying referral code in webhook:', error)
                // Non-fatal - don't block subscription creation
              }
            }
          } else if (data.mode === 'payment') {
            // Handle one-time payment (lifetime plan)
            console.log('One-time payment completed')

            // Get line items to find the price
            const lineItems = data.line_items?.data || [];
            if (lineItems.length === 0) {
              // Retrieve line items if not expanded
              const session = await stripe.checkout.sessions.retrieve(
                data.id,
                { expand: ['line_items'] }
              );
              lineItems.push(...(session.line_items?.data || []));
            }

            if (lineItems.length > 0) {
              const priceId = lineItems[0].price?.id;
              if (priceId) {
                const price = await stripe.prices.retrieve(priceId, {
                  expand: ['product'],
                });
                console.log('LIFETIME PRICE', price)
                const productName = (price.product as Stripe.Product).name;
                const subscriptionPlan = productName.toUpperCase() || 'LIFETIME';

                const user = await prisma.user.findUnique({
                  where: { email: data.customer_details?.email as string },
                });

                // For lifetime plans, set end date far in the future (100 years)
                const lifetimeEndDate = new Date();
                lifetimeEndDate.setFullYear(lifetimeEndDate.getFullYear() + 100);

                await prisma.subscription.upsert({
                  where: {
                    email: data.customer_details?.email as string,
                  },
                  update: {
                    plan: subscriptionPlan,
                    endDate: lifetimeEndDate,
                    status: 'ACTIVE',
                    trialEndsAt: null,
                    interval: 'lifetime',
                  },
                  create: {
                    email: data.customer_details?.email as string,
                    plan: subscriptionPlan,
                    user: { connect: { id: user?.id } },
                    endDate: lifetimeEndDate,
                    status: 'ACTIVE',
                    trialEndsAt: null,
                    interval: 'lifetime',
                  }
                });

                console.log('lifetime subscription created/updated')
                
                // Apply referral code if present in metadata (for lifetime plans too)
                if (data.metadata?.referral_code && user?.id) {
                  try {
                    const { getReferralBySlug, addReferredUser } = await import('@/server/referral')
                    const referral = await getReferralBySlug(data.metadata.referral_code)
                    if (referral && referral.userId !== user.id) {
                      // Check if user is already in the referral list
                      if (!referral.referredUserIds.includes(user.id)) {
                        await addReferredUser(referral.id, user.id)
                        console.log('Referral code applied successfully for lifetime user:', user.id)
                      }
                    }
                  } catch (error) {
                    console.error('Error applying referral code in webhook (lifetime):', error)
                    // Non-fatal - don't block subscription creation
                  }
                }
              }
            }
          }
          break;
        case "payment_intent.succeeded":
          console.log('payment_intent.succeeded')
          data = event.data.object as Stripe.PaymentIntent;
          console.log(`💰 PaymentIntent status: ${data.status}`);
          break;
        case "customer.subscription.deleted":
          console.log('customer.subscription.deleted')
          data = event.data.object as Stripe.Subscription;
          const customerData = await stripe.customers.retrieve(
            data.customer as string
          ) as Stripe.Customer;

          if (customerData.email) {
            await prisma.subscription.update({
              where: { email: customerData.email },
              data: {
                plan: 'FREE',
                status: "CANCELLED",
                endDate: new Date(data.ended_at! * 1000)
              }
            });
          }
          console.log(`Subscription deleted and updated in DB: ${data.id}`);
          // TODO: Schedule an email to ask feedback on the cancellation
          break;
        case "customer.subscription.updated":
          console.log('customer.subscription.updated')
          data = event.data.object as Stripe.Subscription;
          const updatedCustomerData = await stripe.customers.retrieve(
            data.customer as string
          ) as Stripe.Customer;

          if (updatedCustomerData.email) {
            // Get the current price information
            const currentItems = await stripe.subscriptionItems.list({
              subscription: data.id,
            });
            const currentPriceId = currentItems.data[0]?.price.id;
            const currentPrice = await stripe.prices.retrieve(currentPriceId);
            const updatedPlan = currentPrice.nickname || data.metadata?.plan || 'free';

            // Handle different subscription statuses
            let subscriptionStatus: string;
            switch (data.status) {
              case 'incomplete_expired':
                subscriptionStatus = 'EXPIRED';
                break;
              case 'incomplete':
                subscriptionStatus = 'PAYMENT_PENDING';
                break;
              case 'past_due':
                subscriptionStatus = 'PAST_DUE';
                break;
              case 'canceled':
                subscriptionStatus = 'CANCELLED';
                break;
              case 'unpaid':
                subscriptionStatus = 'UNPAID';
                break;
              case 'trialing':
                subscriptionStatus = 'TRIAL';
                break;
              case 'active':
                subscriptionStatus = 'ACTIVE';
                break;
              default:
                subscriptionStatus = 'INACTIVE';
            }

            if (data.cancel_at_period_end) {
              // Update subscription status first
              const currentPeriodEnd = getCurrentPeriodEndFromEventData(data);

              await prisma.subscription.update({
                where: { email: updatedCustomerData.email },
                data: {
                  status: "SCHEDULED_CANCELLATION",
                  endDate: new Date(currentPeriodEnd * 1000)
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
              const currentPeriodEnd = getCurrentPeriodEndFromEventData(data);

              await prisma.subscription.update({
                where: { email: updatedCustomerData.email },
                data: {
                  status: subscriptionStatus,
                  plan: data.ended_at ? 'free' : updatedPlan,
                  endDate: data.ended_at
                    ? new Date(data.ended_at * 1000)
                    : new Date(currentPeriodEnd * 1000),
                  trialEndsAt: data.trial_end ? new Date(data.trial_end * 1000) : null
                }
              });
              console.log(`Subscription updated with status ${subscriptionStatus}: ${data.id}`);
            }
          }
          break;
        case "customer.subscription.created":
          console.log('customer.subscription.created')
          data = event.data.object as Stripe.Subscription;
          const newCustomerData = await stripe.customers.retrieve(
            data.customer as string
          ) as Stripe.Customer;

          if (newCustomerData.email) {
            const user = await prisma.user.findUnique({
              where: { email: newCustomerData.email },
            });

            if (user) {
              // Get the price information to determine the plan (same logic as checkout.session.completed)
              const subscriptionItems = await stripe.subscriptionItems.list({
                subscription: data.id,
              });

              const priceId = subscriptionItems.data[0]?.price.id;
              let subscriptionPlan = 'FREE'; // Default fallback

              if (priceId) {
                const price = await stripe.prices.retrieve(priceId, {
                  expand: ['product'],
                });
                console.log('SUBSCRIPTION CREATED PRICE', price)
                const productName = (price.product as Stripe.Product).name;
                subscriptionPlan = productName.toUpperCase() || 'FREE';
              }
              const currentPeriodEnd = getCurrentPeriodEndFromEventData(data);

              await prisma.subscription.upsert({
                where: { email: newCustomerData.email },
                update: {
                  status: data.status === 'trialing' ? 'TRIAL' : 'ACTIVE',
                  plan: subscriptionPlan,
                  endDate: new Date(currentPeriodEnd * 1000),
                  trialEndsAt: data.trial_end ? new Date(data.trial_end * 1000) : null
                },
                create: {
                  email: newCustomerData.email,
                  plan: subscriptionPlan,
                  user: { connect: { id: user.id } },
                  status: data.status === 'trialing' ? 'TRIAL' : 'ACTIVE',
                  endDate: new Date(currentPeriodEnd * 1000),
                  trialEndsAt: data.trial_end ? new Date(data.trial_end * 1000) : null
                }
              });
              console.log(`New subscription created and saved: ${data.id}`);
            }
          }
          break;
        case "invoice.payment_failed":
          console.log('invoice.payment_failed')
          data = event.data.object as Stripe.Invoice;
          const customerEmail = (await stripe.customers.retrieve(data.customer as string) as Stripe.Customer).email;

          if (customerEmail) {
            await prisma.subscription.update({
              where: { email: customerEmail },
              data: {
                status: "PAYMENT_FAILED",
              }
            });
          }
          console.log(`Payment failed for invoice: ${data.id}`);
          break;
        case "payment_intent.payment_failed":
          console.log('payment_intent.payment_failed')
          data = event.data.object as Stripe.PaymentIntent;
          console.log(`❌ Payment failed: ${data.last_payment_error?.message}`);
          // TODO: Deactivate the subscription and send email to user to ask for payment details, giving a payment link
          // Since this event is triggered on first payment failure, we need to deactivate the subscription
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