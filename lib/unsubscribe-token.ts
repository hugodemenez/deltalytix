import { createHmac, timingSafeEqual } from "node:crypto"
import { getSiteOrigin } from "./site-url"

function getUnsubscribeSecret(): string | null {
  const secret =
    process.env.UNSUBSCRIBE_SECRET?.trim() ||
    process.env.ENCRYPTION_KEY?.trim() ||
    null
  if (!secret || secret === "your_encryption_key_here") {
    return null
  }
  return secret
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase()
}

function signEmail(email: string, secret: string): string {
  return createHmac("sha256", secret).update(normalizeEmail(email)).digest("base64url")
}

/** Build a signed unsubscribe URL query (`email` + `token`). */
export function createUnsubscribeToken(email: string): string {
  const secret = getUnsubscribeSecret()
  if (!secret) {
    throw new Error(
      "UNSUBSCRIBE_SECRET or ENCRYPTION_KEY is required to sign unsubscribe links",
    )
  }
  return signEmail(email, secret)
}

export function verifyUnsubscribeToken(
  email: string,
  token: string | null | undefined,
): boolean {
  if (!email || !token) return false
  const secret = getUnsubscribeSecret()
  if (!secret) return false

  const expected = signEmail(email, secret)
  const receivedBytes = Buffer.from(token)
  const expectedBytes = Buffer.from(expected)
  if (receivedBytes.length !== expectedBytes.length) {
    return false
  }
  return timingSafeEqual(receivedBytes, expectedBytes)
}

export function buildUnsubscribeUrl(origin: string, email: string): string {
  const base = origin.replace(/\/$/, "")
  const token = createUnsubscribeToken(email)
  const params = new URLSearchParams({
    email,
    token,
  })
  return `${base}/api/email/unsubscribe?${params.toString()}`
}

/** Signed unsubscribe URL for the configured public site origin. */
export function buildAppUnsubscribeUrl(email: string): string {
  return buildUnsubscribeUrl(getSiteOrigin(), email)
}
