import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto'

/** Stored ciphertext format: enc:v1:<iv_b64url>:<ciphertext_and_tag_b64url> */
export const CONNECTION_TOKEN_ENC_PREFIX = 'enc:v1:'

const IV_LENGTH = 12
const AUTH_TAG_LENGTH = 16
const KEY_LENGTH = 32

function resolveEncryptionKeyBytes(): Buffer | null {
  const raw = process.env.ENCRYPTION_KEY?.trim()
  if (!raw || raw === 'your_encryption_key_here') {
    return null
  }

  // Prefer openssl rand -hex 32 (64 hex chars → 32 bytes)
  if (/^[0-9a-fA-F]{64}$/.test(raw)) {
    return Buffer.from(raw, 'hex')
  }

  // Fall back to SHA-256 of any passphrase so self-host setups stay simple
  return createHash('sha256').update(raw, 'utf8').digest()
}

export function hasConnectionTokenEncryptionKey(): boolean {
  return resolveEncryptionKeyBytes() !== null
}

export function isEncryptedConnectionToken(value: string | null | undefined): boolean {
  return typeof value === 'string' && value.startsWith(CONNECTION_TOKEN_ENC_PREFIX)
}

function requireKey(operation: 'encrypt' | 'decrypt'): Buffer {
  const key = resolveEncryptionKeyBytes()
  if (!key || key.length !== KEY_LENGTH) {
    throw new Error(
      `ENCRYPTION_KEY is required to ${operation} connection tokens. Set a 64-char hex secret (openssl rand -hex 32).`,
    )
  }
  return key
}

/**
 * Encrypt a connection credential / OAuth token for DB storage.
 * Idempotent for already-encrypted values.
 */
export function encryptConnectionToken(plaintext: string | null | undefined): string | null {
  if (plaintext == null) return null
  if (plaintext === '') return ''
  if (isEncryptedConnectionToken(plaintext)) return plaintext

  const key = requireKey('encrypt')
  const iv = randomBytes(IV_LENGTH)
  const cipher = createCipheriv('aes-256-gcm', key, iv)
  const ciphertext = Buffer.concat([
    cipher.update(plaintext, 'utf8'),
    cipher.final(),
    cipher.getAuthTag(),
  ])

  return (
    CONNECTION_TOKEN_ENC_PREFIX +
    `${iv.toString('base64url')}:${ciphertext.toString('base64url')}`
  )
}

/**
 * Decrypt a stored connection token.
 * Plaintext legacy values pass through unchanged (migration-friendly).
 */
export function decryptConnectionToken(stored: string | null | undefined): string | null {
  if (stored == null) return null
  if (stored === '') return ''
  if (!isEncryptedConnectionToken(stored)) return stored

  const payload = stored.slice(CONNECTION_TOKEN_ENC_PREFIX.length)
  const separator = payload.indexOf(':')
  if (separator <= 0) {
    throw new Error('Invalid encrypted connection token format')
  }

  const iv = Buffer.from(payload.slice(0, separator), 'base64url')
  const data = Buffer.from(payload.slice(separator + 1), 'base64url')
  if (iv.length !== IV_LENGTH || data.length <= AUTH_TAG_LENGTH) {
    throw new Error('Invalid encrypted connection token payload')
  }

  const key = requireKey('decrypt')
  const ciphertext = data.subarray(0, data.length - AUTH_TAG_LENGTH)
  const authTag = data.subarray(data.length - AUTH_TAG_LENGTH)
  const decipher = createDecipheriv('aes-256-gcm', key, iv)
  decipher.setAuthTag(authTag)

  return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString('utf8')
}

/** Decrypt token on a connection-like row; leaves other fields untouched. */
export function withDecryptedConnectionToken<T extends { token?: string | null }>(
  row: T,
): T {
  if (row.token == null) return row
  return {
    ...row,
    token: decryptConnectionToken(row.token),
  }
}
