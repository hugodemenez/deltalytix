import { createHmac, timingSafeEqual } from "node:crypto"

const TOKEN_PURPOSES = {
  unsubscribe: "newsletter-unsubscribe",
  preferences: "newsletter-preferences",
} as const

type TokenPurpose = (typeof TOKEN_PURPOSES)[keyof typeof TOKEN_PURPOSES]

const PREFERENCES_TOKEN_TTL_MS = 24 * 60 * 60 * 1000

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
      "NEWSLETTER_UNSUBSCRIBE_SECRET or CRON_SECRET is required to sign newsletter email links",
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

function createNewsletterToken(
  email: string,
  purpose: TokenPurpose,
  expiresAt?: number,
): string {
  const payload = base64UrlEncode(
    JSON.stringify({
      email: normalizeNewsletterEmail(email),
      purpose,
      version: 1,
      ...(expiresAt ? { exp: expiresAt } : {}),
    }),
  )
  return `${payload}.${signValue(payload)}`
}

function verifyNewsletterToken(
  token: string,
  purpose: TokenPurpose,
): string | null {
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
    const parsed = JSON.parse(
      Buffer.from(payload, "base64url").toString("utf8"),
    ) as {
      email?: unknown
      purpose?: unknown
      version?: unknown
      exp?: unknown
    }

    if (
      parsed.purpose !== purpose ||
      parsed.version !== 1 ||
      typeof parsed.email !== "string"
    ) {
      return null
    }

    if (typeof parsed.exp === "number" && Date.now() > parsed.exp) {
      return null
    }

    const normalizedEmail = normalizeNewsletterEmail(parsed.email)
    return normalizedEmail || null
  } catch {
    return null
  }
}

export function createNewsletterUnsubscribeToken(email: string): string {
  return createNewsletterToken(email, TOKEN_PURPOSES.unsubscribe)
}

export function verifyNewsletterUnsubscribeToken(token: string): string | null {
  return verifyNewsletterToken(token, TOKEN_PURPOSES.unsubscribe)
}

export function createNewsletterPreferencesToken(email: string): string {
  return createNewsletterToken(
    email,
    TOKEN_PURPOSES.preferences,
    Date.now() + PREFERENCES_TOKEN_TTL_MS,
  )
}

export function verifyNewsletterPreferencesToken(token: string): string | null {
  return verifyNewsletterToken(token, TOKEN_PURPOSES.preferences)
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

export function createNewsletterPreferencesUrl(email: string): string {
  const token = createNewsletterPreferencesToken(email)
  return `${getNewsletterBaseUrl()}/newsletter?email=${encodeURIComponent(email)}&token=${encodeURIComponent(token)}`
}

export type NewsletterPreferenceFields = {
  isActive: boolean
  weeklySummaryEnabled: boolean
  monthlyStatsEnabled: boolean
  renewalNoticeEnabled: boolean
}

export const newsletterPreferenceBooleanFields = [
  "isActive",
  "weeklySummaryEnabled",
  "monthlyStatsEnabled",
  "renewalNoticeEnabled",
] as const satisfies ReadonlyArray<keyof NewsletterPreferenceFields>

export const defaultNewsletterPreferences: NewsletterPreferenceFields = {
  isActive: true,
  weeklySummaryEnabled: true,
  monthlyStatsEnabled: true,
  renewalNoticeEnabled: true,
}
