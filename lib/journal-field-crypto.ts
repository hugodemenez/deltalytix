import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto'

/**
 * Versioned ciphertext for journal / note fields.
 * Format: jrn:v1:<iv_b64url>:<ciphertext_and_tag_b64url>
 *
 * Dual-read: values without this prefix are treated as legacy plaintext.
 */
export const JOURNAL_FIELD_ENC_PREFIX = 'jrn:v1:'

const IV_LENGTH = 12
const AUTH_TAG_LENGTH = 16
const KEY_LENGTH = 32

const PLACEHOLDER_KEYS = new Set([
  'your_encryption_key_here',
  'your_journal_encryption_key_here',
])

function firstConfiguredSecret(): string | null {
  for (const name of ['JOURNAL_ENCRYPTION_KEY', 'ENCRYPTION_KEY'] as const) {
    const raw = process.env[name]?.trim()
    if (raw && !PLACEHOLDER_KEYS.has(raw)) {
      return raw
    }
  }
  return null
}

function decodeKeyMaterial(raw: string): Buffer {
  if (/^[0-9a-fA-F]{64}$/.test(raw)) {
    return Buffer.from(raw, 'hex')
  }

  try {
    const base64 = Buffer.from(raw, 'base64')
    if (base64.length === KEY_LENGTH) {
      return base64
    }
  } catch {
    // Fall through to passphrase hash.
  }

  return createHash('sha256').update(raw, 'utf8').digest()
}

function resolveJournalKeyBytes(): Buffer | null {
  const raw = firstConfiguredSecret()
  if (!raw) return null
  const key = decodeKeyMaterial(raw)
  return key.length === KEY_LENGTH ? key : null
}

export function hasJournalEncryptionKey(): boolean {
  return resolveJournalKeyBytes() !== null
}

export function isEncryptedJournalField(value: string | null | undefined): boolean {
  return typeof value === 'string' && value.startsWith(JOURNAL_FIELD_ENC_PREFIX)
}

function requireKey(operation: 'encrypt' | 'decrypt'): Buffer {
  const key = resolveJournalKeyBytes()
  if (!key) {
    throw new Error(
      `JOURNAL_ENCRYPTION_KEY is required to ${operation} journal fields. ` +
        'Set a 32-byte secret as 64 hex chars (openssl rand -hex 32) or base64. ' +
        'ENCRYPTION_KEY is accepted as a local fallback.',
    )
  }
  return key
}

/**
 * Encrypt a journal / note string for DB storage.
 * Idempotent for already-encrypted values. Empty / null pass through.
 */
export function encryptJournalField(plaintext: string | null | undefined): string | null {
  if (plaintext == null) return null
  if (plaintext === '') return ''
  if (isEncryptedJournalField(plaintext)) return plaintext

  const key = requireKey('encrypt')
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
 * Legacy plaintext (no version prefix) is returned unchanged.
 */
export function decryptJournalField(stored: string | null | undefined): string | null {
  if (stored == null) return null
  if (stored === '') return ''
  if (!isEncryptedJournalField(stored)) return stored

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

  const key = requireKey('decrypt')
  const ciphertext = data.subarray(0, data.length - AUTH_TAG_LENGTH)
  const authTag = data.subarray(data.length - AUTH_TAG_LENGTH)
  const decipher = createDecipheriv('aes-256-gcm', key, iv)
  decipher.setAuthTag(authTag)

  return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString('utf8')
}

/**
 * Encrypt Mood.conversation. Writers historically JSON.stringify into a Json
 * column, so strings are encrypted as-is; objects/arrays are stringified first.
 */
export function encryptJournalConversation(value: unknown): string {
  const serialized = typeof value === 'string' ? value : JSON.stringify(value)
  return encryptJournalField(serialized) ?? ''
}

/**
 * Decrypt Mood.conversation back to the representation writers stored
 * (typically a JSON string). Objects without a prefix are legacy plaintext.
 */
export function decryptJournalConversation(value: unknown): unknown {
  if (value == null) return value
  if (typeof value === 'string') return decryptJournalField(value)
  return value
}

export function withDecryptedMoodFields<
  T extends { journalContent?: string | null; conversation?: unknown },
>(row: T): T {
  return {
    ...row,
    journalContent: decryptJournalField(row.journalContent ?? null),
    conversation: decryptJournalConversation(row.conversation),
  }
}

export function withDecryptedTradeComment<T extends { comment?: string | null }>(
  row: T,
): T {
  if (row.comment == null) return row
  return {
    ...row,
    comment: decryptJournalField(row.comment),
  }
}
