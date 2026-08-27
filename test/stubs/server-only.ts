/**
 * `server-only`'s real entry point throws on import so a client bundle fails
 * loudly. Vitest is neither bundle, and its `exports` map hides the no-op
 * `empty.js` that Next uses on the server, so tests alias the package here
 * (see `vitest.config.ts`).
 */
export {}
