import 'server-only'

import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto'

/**
 * Versioned ciphertext for journal / note fields.
 * Format: jrn:v1:<iv_b64url>:<ciphertext_and_tag_b64url>
 *
 * Dual-read: values that are not valid v1 ciphertext are treated as plaintext.
 */
export const JOURNAL_FIELD_ENC_PREFIX = 'jrn:v1:'

const IV_LENGTH = 12
const AUTH_TAG_LENGTH = 16
const KEY_LENGTH = 32

const PLACEHOLDER_KEYS = new Set([
  'your_encryption_key_here',
  'your_journal_encryption_key_here',
])

/** Committed local/docker placeholders — refused in production. */
export const KNOWN_INSECURE_JOURNAL_KEYS = new Set([
  ...PLACEHOLDER_KEYS,
  '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
  '0123456789abcdef0123456789abcdef',
])

export function isStrictJournalKeyEnv(): boolean {
  return (
    process.env.NODE_ENV === 'production' ||
    process.env.VERCEL_ENV === 'production' ||
    process.env.VERCEL_ENV === 'preview'
  )
}

function decodeExact32ByteKey(raw: string): Buffer | null {
  if (/^[0-9a-fA-F]{64}$/.test(raw)) {
    return Buffer.from(raw, 'hex')
  }
  try {
    const base64 = Buffer.from(raw, 'base64')
    if (base64.length === KEY_LENGTH) {
      return base64
    }
  } catch {
    // not base64
  }
  return null
}

function configuredSecret(name: string): string | null {
  const raw = process.env[name]?.trim()
  if (!raw || PLACEHOLDER_KEYS.has(raw)) {
    return null
  }
  if (isStrictJournalKeyEnv() && KNOWN_INSECURE_JOURNAL_KEYS.has(raw)) {
    return null
  }
  return raw
}

function keyFromSecret(raw: string, allowPassphrase: boolean): Buffer | null {
  const exact = decodeExact32ByteKey(raw)
  if (exact) return exact
  if (!allowPassphrase) return null
  return createHash('sha256').update(raw, 'utf8').digest()
}

function resolveEncryptKeyBytes(): Buffer | null {
  const strict = isStrictJournalKeyEnv()
  const primary = configuredSecret('JOURNAL_ENCRYPTION_KEY')
  if (primary) {
    return keyFromSecret(primary, !strict)
  }
  if (strict) return null

  const fallback = configuredSecret('ENCRYPTION_KEY')
  if (!fallback) return null
  return keyFromSecret(fallback, true)
}

function resolveDecryptKeyBytes(): Buffer[] {
  const keys: Buffer[] = []
  const current = resolveEncryptKeyBytes()
  if (current) keys.push(current)

  const previous = configuredSecret('JOURNAL_ENCRYPTION_PREVIOUS_KEY')
  if (previous) {
    const decoded = keyFromSecret(previous, !isStrictJournalKeyEnv())
    if (decoded && !keys.some((key) => key.equals(decoded))) {
      keys.push(decoded)
    }
  }
  return keys
}

export function hasJournalEncryptionKey(): boolean {
  return resolveEncryptKeyBytes() !== null
}

/** Prefix-only check. Prefer `isValidJournalCiphertext` before skipping encrypt. */
export function isEncryptedJournalField(value: string | null | undefined): boolean {
  return typeof value === 'string' && value.startsWith(JOURNAL_FIELD_ENC_PREFIX)
}

export function isValidJournalCiphertext(value: string | null | undefined): boolean {
  if (!isEncryptedJournalField(value) || value == null) return false
  const payload = value.slice(JOURNAL_FIELD_ENC_PREFIX.length)
  const separator = payload.indexOf(':')
  if (separator <= 0) return false
  try {
    const iv = Buffer.from(payload.slice(0, separator), 'base64url')
    const data = Buffer.from(payload.slice(separator + 1), 'base64url')
    return iv.length === IV_LENGTH && data.length > AUTH_TAG_LENGTH
  } catch {
    return false
  }
}

function requireEncryptKey(): Buffer {
  const key = resolveEncryptKeyBytes()
  if (!key) {
    throw new Error(
      'JOURNAL_ENCRYPTION_KEY is required to encrypt journal fields. ' +
        'Set a 32-byte secret as 64 hex chars (openssl rand -hex 32) or base64. ' +
        'Production/preview refuse placeholders, passphrases, and ENCRYPTION_KEY fallback.',
    )
  }
  return key
}

export function isPrismaJsonNullInput(value: unknown): boolean {
  if (value == null) return true
  if (typeof value !== 'object') return false
  const name = (value as { constructor?: { name?: string } }).constructor?.name
  return name === 'DbNull' || name === 'JsonNull' || name === 'AnyNull'
}

function parseCipherPayload(stored: string): { iv: Buffer; ciphertext: Buffer; authTag: Buffer } {
  const payload = stored.slice(JOURNAL_FIELD_ENC_PREFIX.length)
  const separator = payload.indexOf(':')
  if (separator <= 0) {
    throw new Error('Invalid encrypted journal field format')
  }
  const iv = Buffer.from(payload.slice(0, separator), 'base64url')
  const data = Buffer.from(payload.slice(separator + 1), 'base64url')
  if (iv.length !== IV_LENGTH || data.length <= AUTH_TAG_LENGTH) {
    throw new Error('Invalid encrypted journal field payload')
  }
  return {
    iv,
    ciphertext: data.subarray(0, data.length - AUTH_TAG_LENGTH),
    authTag: data.subarray(data.length - AUTH_TAG_LENGTH),
  }
}

function decryptWithKey(stored: string, key: Buffer): string {
  const { iv, ciphertext, authTag } = parseCipherPayload(stored)
  const decipher = createDecipheriv('aes-256-gcm', key, iv)
  decipher.setAuthTag(authTag)
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString('utf8')
}

/**
 * Encrypt a journal / note string for DB storage.
 * Skips only values that parse as valid v1 ciphertext. Empty / null pass through.
 */
export function encryptJournalField(plaintext: string | null | undefined): string | null {
  if (plaintext == null) return null
  if (plaintext === '') return ''
  if (isValidJournalCiphertext(plaintext)) return plaintext

  const key = requireEncryptKey()
  const iv = randomBytes(IV_LENGTH)
  const cipher = createCipheriv('aes-256-gcm', key, iv)
  const ciphertext = Buffer.concat([
    cipher.update(plaintext, 'utf8'),
    cipher.final(),
    cipher.getAuthTag(),
  ])

  return (
    JOURNAL_FIELD_ENC_PREFIX +
    `${iv.toString('base64url')}:${ciphertext.toString('base64url')}`
  )
}

/**
 * Decrypt a stored journal / note string.
 * Legacy plaintext and prefix-but-invalid blobs pass through.
 */
export function decryptJournalField(stored: string | null | undefined): string | null {
  if (stored == null) return null
  if (stored === '') return ''
  if (!isValidJournalCiphertext(stored)) return stored

  const keys = resolveDecryptKeyBytes()
  if (keys.length === 0) {
    throw new Error(
      'JOURNAL_ENCRYPTION_KEY is required to decrypt journal fields. ' +
        'Set a 32-byte secret as 64 hex chars (openssl rand -hex 32) or base64.',
    )
  }

  let lastError: unknown
  for (const key of keys) {
    try {
      return decryptWithKey(stored, key)
    } catch (error) {
      lastError = error
    }
  }
  throw lastError instanceof Error ? lastError : new Error('Journal field decrypt failed')
}

export function decryptJournalFieldSafe(
  stored: string | null | undefined,
  rowId?: unknown,
  field = 'journal field',
): string | null {
  try {
    return decryptJournalField(stored)
  } catch {
    console.error('[journal-crypto] Failed to decrypt', {
      field,
      id: typeof rowId === 'string' || typeof rowId === 'number' ? rowId : undefined,
    })
    return null
  }
}

/**
 * Encrypt Mood.conversation. Null sentinels and empty JSON placeholders pass through.
 */
export function encryptJournalConversation(value: string): string
export function encryptJournalConversation(value: unknown): unknown
export function encryptJournalConversation(value: unknown): unknown {
  if (isPrismaJsonNullInput(value)) return value
  if (typeof value === 'string') {
    if (value === '' || value === 'null' || value === '{}') return value
    return encryptJournalField(value)
  }
  if (typeof value === 'object' && !Array.isArray(value) && Object.keys(value as object).length === 0) {
    return value
  }
  return encryptJournalField(JSON.stringify(value))
}

export function decryptJournalConversation(value: unknown): unknown {
  if (isPrismaJsonNullInput(value)) return value
  if (typeof value === 'string') return decryptJournalField(value)
  return value
}

export function decryptJournalConversationSafe(value: unknown, rowId?: unknown): unknown {
  try {
    return decryptJournalConversation(value)
  } catch {
    console.error('[journal-crypto] Failed to decrypt', {
      field: 'mood.conversation',
      id: typeof rowId === 'string' || typeof rowId === 'number' ? rowId : undefined,
    })
    return null
  }
}

export function withDecryptedMoodFields<
  T extends { id?: unknown; journalContent?: string | null; conversation?: unknown },
>(row: T): T {
  return {
    ...row,
    journalContent: decryptJournalFieldSafe(row.journalContent ?? null, row.id, 'mood.journalContent'),
    conversation: decryptJournalConversationSafe(row.conversation, row.id),
  }
}

export function withDecryptedTradeComment<T extends { id?: unknown; comment?: string | null }>(
  row: T,
): T {
  if (row.comment == null) return row
  return {
    ...row,
    comment: decryptJournalFieldSafe(row.comment, row.id, 'trade.comment'),
  }
}
