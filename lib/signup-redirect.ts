/**
 * Post-authentication redirect targets.
 *
 * Newly created accounts land on a URL carrying `?signup=success`. Google Ads
 * URL-contains matching can use that marker; the app also fires an event-snippet
 * conversion via `GoogleAdsConversions` when
 * `NEXT_PUBLIC_GOOGLE_ADS_SIGNUP_SEND_TO` is configured.
 *
 * The marker is applied to any *internal* destination rather than to
 * `/dashboard` alone: `next` legitimately points at checkout and team surfaces,
 * locale-prefixed paths (`/fr/dashboard`) are equally valid landings, and a
 * signup is a signup wherever the user ends up.
 *
 * Paid campaign landers should be marketing `/en` or `/fr` (not `/dashboard`).
 * Attribution (`utm_*` / `gclid`) is persisted first-party before OAuth so it
 * still reaches `user_signed_up` after Google login.
 *
 * `next` is attacker-controlled — it arrives on the query string — so both the
 * server redirect and the client navigation resolve it against the app's own
 * origin and fall back to the dashboard when it points anywhere else.
 */

export const SIGNUP_SUCCESS_PARAM = "signup";
export const SIGNUP_SUCCESS_VALUE = "success";

const DEFAULT_DESTINATION = "/dashboard";

// Sentinel origin used only to resolve relative paths on the client, where
// there is no request origin to resolve against.
const RELATIVE_BASE = "http://signup-redirect.invalid";

/** Tags a destination as a completed signup. No-op for returning users. */
export function applySignupSuccess(url: URL, isNewUser: boolean): URL {
  if (isNewUser) {
    url.searchParams.set(SIGNUP_SUCCESS_PARAM, SIGNUP_SUCCESS_VALUE);
  }
  return url;
}

/**
 * Whether a request carries the signup marker.
 *
 * Used to hand the marker across a hop that renders no page of ours — the
 * checkout endpoint redirects straight to Stripe, so it has to forward the
 * marker to the URLs Stripe sends the user back to.
 */
export function hasSignupSuccess(params: URLSearchParams): boolean {
  return params.get(SIGNUP_SUCCESS_PARAM) === SIGNUP_SUCCESS_VALUE;
}

/**
 * Resolves an untrusted `next` value to a URL on this origin.
 *
 * Anything that resolves off-origin — an absolute URL, a protocol-relative
 * `//host/path`, or a malformed value — falls back to the dashboard, so the
 * callback cannot be used as an open redirect.
 */
export function resolveInternalDestination(
  target: string | null | undefined,
  origin: string,
): URL {
  const fallback = new URL(DEFAULT_DESTINATION, origin);
  if (!target) return fallback;

  try {
    const url = new URL(target, origin);
    return url.origin === fallback.origin ? url : fallback;
  } catch {
    return fallback;
  }
}

/**
 * Client-side counterpart: takes a `next` value and returns the path to
 * navigate to, with the signup marker applied and any query string or hash
 * preserved.
 *
 * Applies the same containment rule as the server. This matters more on the
 * client than it looks: the result is handed to `router.push`, and a scheme
 * like `javascript:` parses as a valid URL, so passing an unrecognised target
 * through would hand attacker-controlled input to the router.
 */
export function signupRedirectPath(
  target: string | null | undefined,
  isNewUser: boolean,
): string {
  const url = resolveInternalDestination(target, RELATIVE_BASE);
  applySignupSuccess(url, isNewUser);
  return `${url.pathname}${url.search}${url.hash}`;
}
