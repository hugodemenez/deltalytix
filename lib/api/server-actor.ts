import "server-only"

/**
 * Several broker sync helpers live in `'use server'` modules, so every exported
 * function is also a server action a browser can call directly. They accept an
 * `options.userId` so the OAuth-authenticated `/api/v1` routes can act for the
 * token's owner instead of a cookie session — but a plain `{ userId }` object is
 * exactly what a tampered client can post, which would let anyone write broker
 * connections and tokens onto another account.
 *
 * Marking the object with a module-private symbol closes that hole: the React
 * server-action payload is JSON-like and carries no symbol keys, so an actor
 * that arrived over the wire can never satisfy `trustedUserId`. Only in-process
 * server code that imported this module can mint one.
 */
const TRUSTED_ACTOR = Symbol("deltalytix.trusted-actor")

export type TrustedActor = {
  userId?: string
  [TRUSTED_ACTOR]?: true
}

/** Mint a trusted actor for `userId`. Server-side callers only. */
export function serverActor(userId: string): TrustedActor {
  return { userId, [TRUSTED_ACTOR]: true }
}

/**
 * The caller-supplied user id, but only when it came from `serverActor`.
 * Anything else — including a client-forged `{ userId }` — resolves to `null`,
 * so the action falls back to the session it can actually verify.
 */
export function trustedUserId(options: TrustedActor | undefined): string | null {
  if (!options || options[TRUSTED_ACTOR] !== true) return null
  return options.userId ?? null
}
