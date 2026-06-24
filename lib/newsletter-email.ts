import { createHmac, timingSafeEqual } from "node:crypto"

const unsubscribePurpose = "newsletter-unsubscribe"

export function normalizeNewsletterEmail(email: string): string {
  return email.trim().toLowerCase()
}

function getNewsletterSigningSecret(): string {
  const secret =
    process.env.NEWSLETTER_UNSUBSCRIBE_SECRET ?? process.env.CRON_SECRET

  if (!secret) {
    if (process.env.NODE_ENV !== "production") {
      return "development-newsletter-unsubscribe-secret"
    }

    throw new Error(
      "NEWSLETTER_UNSUBSCRIBE_SECRET or CRON_SECRET is required to sign newsletter unsubscribe links",
    )
  }

  return secret
}

function base64UrlEncode(input: string): string {
  return Buffer.from(input, "utf8").toString("base64url")
}

function signValue(value: string): string {
  return createHmac("sha256", getNewsletterSigningSecret())
    .update(value)
    .digest("base64url")
}

export function createNewsletterUnsubscribeToken(email: string): string {
  const payload = base64UrlEncode(
    JSON.stringify({
      email: normalizeNewsletterEmail(email),
      purpose: unsubscribePurpose,
      version: 1,
    }),
  )
  return `${payload}.${signValue(payload)}`
}

export function verifyNewsletterUnsubscribeToken(token: string): string | null {
  const [payload, signature, ...extraParts] = token.split(".")
  if (!payload || !signature || extraParts.length > 0) {
    return null
  }

  const expectedSignature = signValue(payload)
  const signatureBuffer = Buffer.from(signature, "base64url")
  const expectedSignatureBuffer = Buffer.from(expectedSignature, "base64url")

  if (
    signatureBuffer.length !== expectedSignatureBuffer.length ||
    !timingSafeEqual(signatureBuffer, expectedSignatureBuffer)
  ) {
    return null
  }

  try {
    const parsed = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as {
      email?: unknown
      purpose?: unknown
      version?: unknown
    }

    if (
      parsed.purpose !== unsubscribePurpose ||
      parsed.version !== 1 ||
      typeof parsed.email !== "string"
    ) {
      return null
    }

    const email = normalizeNewsletterEmail(parsed.email)
    return email || null
  } catch {
    return null
  }
}

export function getNewsletterBaseUrl(): string {
  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL ??
    process.env.NEXT_PUBLIC_SITE_URL ??
    process.env.NEXT_PUBLIC_VERCEL_URL ??
    "http://localhost:3000"

  const urlWithProtocol = baseUrl.startsWith("http")
    ? baseUrl
    : `https://${baseUrl}`

  return urlWithProtocol.replace(/\/+$/, "")
}

export function createNewsletterUnsubscribeUrl(email: string): string {
  const token = createNewsletterUnsubscribeToken(email)
  return `${getNewsletterBaseUrl()}/api/email/unsubscribe?token=${encodeURIComponent(token)}`
}
