/**
 * First-party account-creation analytics.
 *
 * `user_signed_up` is captured server-side when `ensureUserInDatabase`
 * creates the public `User` row — every first-account path (password,
 * magic link, OAuth) goes through that helper.
 *
 * This is a server conversion: it never depends on the browser consent
 * cookie. `user_signed_up` is the signup event — do not add a second
 * `signup` capture. Same first-party exception as `checkout_started`
 * and `subscription_purchased`.
 */

export const USER_SIGNED_UP_EVENT = "user_signed_up";

type SignupPropertyValue =
  | boolean
  | number
  | string
  | null
  | undefined
  | Record<string, boolean | number | string | null | undefined>;

export type UserSignedUpProperties = Record<string, SignupPropertyValue>;

export function userSignedUpInsertId(distinctId: string): string {
  return `${USER_SIGNED_UP_EVENT}:${distinctId}`;
}

/**
 * Arguments for `capturePostHogEvent`. `$insert_id` is always derived
 * from the auth user id so a retry of the create path cannot double-count
 * in PostHog. Callers must still only invoke this after a successful
 * `prisma.user.create` — existing rows must not emit the event.
 */
export function buildUserSignedUpCapture({
  distinctId,
  properties = {},
}: {
  distinctId: string;
  properties?: UserSignedUpProperties;
}): {
  consentGranted: true;
  distinctId: string;
  event: typeof USER_SIGNED_UP_EVENT;
  properties: UserSignedUpProperties;
} {
  return {
    consentGranted: true,
    distinctId,
    event: USER_SIGNED_UP_EVENT,
    properties: {
      ...properties,
      $insert_id: userSignedUpInsertId(distinctId),
    },
  };
}
