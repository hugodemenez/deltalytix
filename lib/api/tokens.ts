import { createHash, randomBytes } from "node:crypto"

export const ACCESS_TOKEN_TTL_SECONDS = 3600
export const REFRESH_TOKEN_TTL_DAYS = 30
export const AUTHORIZATION_CODE_TTL_MINUTES = 10

export function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex")
}

function randomHex(bytes: number): string {
  return randomBytes(bytes).toString("hex")
}

export function generateAccessToken(): string {
  return `dltx_at_${randomHex(24)}`
}

export function generateRefreshToken(): string {
  return `dltx_rt_${randomHex(24)}`
}

export function generatePersonalAccessToken(): string {
  return `dltx_pat_${randomHex(24)}`
}

export function generateClientId(): string {
  return `dltx_app_${randomHex(12)}`
}

export function generateClientSecret(): string {
  return `dltx_secret_${randomHex(24)}`
}

export function generateAuthorizationCode(): string {
  return `dltx_ac_${randomHex(24)}`
}

export function accessTokenExpiresAt(from = new Date()): Date {
  return new Date(from.getTime() + ACCESS_TOKEN_TTL_SECONDS * 1000)
}

export function refreshTokenExpiresAt(from = new Date()): Date {
  return new Date(from.getTime() + REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000)
}

export function authorizationCodeExpiresAt(from = new Date()): Date {
  return new Date(from.getTime() + AUTHORIZATION_CODE_TTL_MINUTES * 60 * 1000)
}

export function pkceS256Challenge(verifier: string): string {
  return createHash("sha256").update(verifier).digest("base64url")
}
