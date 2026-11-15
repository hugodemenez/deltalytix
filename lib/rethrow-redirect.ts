import { isRedirectError } from 'next/dist/client/components/redirect-error'

/** Re-throw Next.js redirect errors so callers do not swallow them. */
export function rethrowIfRedirectError(error: unknown): void {
  if (isRedirectError(error)) throw error
}
