import { timingSafeEqual } from "node:crypto"

/**
 * Authorization for handlers that only a scheduler may invoke.
 *
 * Comparing the header against `` `Bearer ${process.env.CRON_SECRET}` `` reads as
 * a check but fails open: with the variable unset the expected value is the
 * literal "Bearer undefined", which any caller can send. A missing secret means
 * the endpoint cannot be authorized at all, so it is refused instead.
 */
export function isAuthorizedCronRequest(
  authorizationHeader: string | null | undefined,
): boolean {
  const secret = process.env.CRON_SECRET

  if (!secret || !authorizationHeader) {
    return false
  }

  return secretsMatch(authorizationHeader, `Bearer ${secret}`)
}

function secretsMatch(received: string, expected: string): boolean {
  const receivedBytes = Buffer.from(received)
  const expectedBytes = Buffer.from(expected)

  // timingSafeEqual throws on a length mismatch, which would leak the answer
  // through the exception rather than the comparison.
  if (receivedBytes.length !== expectedBytes.length) {
    return false
  }

  return timingSafeEqual(receivedBytes, expectedBytes)
}
