/**
 * Post-authentication redirect targets.
 *
 * Newly created accounts land on a URL carrying `?signup=success`. Nothing in
 * the app reads it — it exists so Google Ads can match a completed signup on a
 * URL it could not otherwise distinguish from an ordinary sign-in.
 *
 * The marker is applied to any *internal* destination rather than to
 * `/dashboard` alone: `next` legitimately points at checkout and team surfaces,
 * locale-prefixed paths (`/fr/dashboard`) are equally valid landings, and a
 * signup is a signup wherever the user ends up. External destinations are never
 * tagged, so the marker cannot leak off-origin.
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
 * Client-side counterpart: takes a relative path and returns it with the signup
 * marker applied, preserving any query string and hash already on it. External
 * or unparseable targets are returned untouched.
 */
export function signupRedirectPath(
  target: string | null | undefined,
  isNewUser: boolean,
): string {
  const destination = target || DEFAULT_DESTINATION;

  let url: URL;
  try {
    url = new URL(destination, RELATIVE_BASE);
  } catch {
    return destination;
  }

  if (url.origin !== RELATIVE_BASE) return destination;

  applySignupSuccess(url, isNewUser);
  return `${url.pathname}${url.search}${url.hash}`;
}
