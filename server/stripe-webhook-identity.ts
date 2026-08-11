import "server-only";

import type { Stripe } from "stripe";

import type { PrismaClient } from "@/prisma/generated/prisma/client";
import { STRIPE_USER_ID_METADATA_KEY } from "@/lib/stripe-customer-identity";

export type LocalUser = { id: string; email: string };

/**
 * First `user_id` found across the metadata bags of an event, in the order they
 * are passed: most specific object first.
 */
export function readUserIdMetadata(
  ...sources: (Stripe.Metadata | null | undefined)[]
): string | null {
  for (const metadata of sources) {
    const userId = metadata?.[STRIPE_USER_ID_METADATA_KEY];
    if (userId) return userId;
  }

  return null;
}

/**
 * Resolve the local user a Stripe event belongs to.
 *
 * Checkout stamps `user_id` metadata onto the session and the subscription, and
 * resolveStripeCustomerForUser stamps it onto the customer, so metadata is the
 * stable key. The customer email is only for events that predate that metadata:
 * once a user changes their address, the Stripe email and User.email diverge and
 * an email lookup silently misses.
 *
 * Metadata that is present but unresolvable returns null rather than falling
 * through to email. A stale id means the account it named is gone, and the email
 * on that old customer may since have been reused by somebody else — writing to
 * them would hand one account's billing event to another.
 */
export async function resolveLocalUser(
  prisma: PrismaClient,
  { metadataUserId, email }: { metadataUserId?: string | null; email?: string | null },
): Promise<LocalUser | null> {
  const select = { id: true, email: true };

  if (metadataUserId) {
    // The metadata carries the Supabase auth id. It matches User.id for accounts
    // created since the two ids were unified, and auth_user_id for the rest.
    const byAuthId = await prisma.user.findUnique({
      where: { auth_user_id: metadataUserId },
      select,
    });
    if (byAuthId) return byAuthId;

    const byId = await prisma.user.findUnique({
      where: { id: metadataUserId },
      select,
    });
    if (byId) return byId;

    console.warn("[stripe-webhook] user_id metadata does not match any user", {
      metadataUserId,
    });
    return null;
  }

  if (email) {
    const byEmail = await prisma.user.findUnique({ where: { email }, select });
    if (byEmail) return byEmail;
  }

  return null;
}
