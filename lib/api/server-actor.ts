import "server-only"

/**
 * Several broker sync helpers live in `'use server'` modules, so every exported
 * function is also a server action a browser can call directly. They accept an
 * acting user so the OAuth-authenticated `/api/v1` routes and the sync cron can
 * work on behalf of a token's owner instead of a cookie session — but a plain
 * `{ userId }` option is exactly what a tampered client can post, which would
 * let anyone write broker connections and tokens onto another account.
 *
 * The acting user therefore travels under a module-private symbol. The React
 * server-action payload is JSON-like and carries no symbol keys, so an actor
 * that arrived over the wire can never satisfy `trustedUserId`; only in-process
 * code that imported this module can mint one. Keeping `userId` off the public
 * shape also makes `{ userId }` an excess-property error at the call site,
 * rather than a value that is silently ignored.
 */
const TRUSTED_ACTOR = Symbol("deltalytix.trusted-actor")

export type TrustedActor = {
  [TRUSTED_ACTOR]?: { userId: string }
}

/** Mint a trusted actor for `userId`. Server-side callers only. */
export function serverActor(userId: string): TrustedActor {
  return { [TRUSTED_ACTOR]: { userId } }
}

/**
 * The acting user id, but only when it came from `serverActor`. Anything else —
 * including a client-forged option object — resolves to `null`, so the action
 * falls back to the session it can actually verify.
 */
export function trustedUserId(options: TrustedActor | undefined): string | null {
  return options?.[TRUSTED_ACTOR]?.userId ?? null
}
