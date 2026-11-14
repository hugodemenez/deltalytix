import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto'

/**
 * Versioned ciphertext for journal / note fields.
 * Format: jrn:v1:<iv_b64url>:<ciphertext_and_tag_b64url>
 *
 * Dual-read is always on: valid v1 ciphertext is decrypted, everything else
 * is treated as legacy plaintext. Encrypt-on-write is gated by
 * JOURNAL_ENCRYPTION_WRITE=1 so beta can ship before production.
 */
export const JOURNAL_FIELD_ENC_PREFIX = 'jrn:v1:'

const IV_LENGTH = 12
const AUTH_TAG_LENGTH = 16
const KEY_LENGTH = 32

const PLACEHOLDER_KEYS = new Set([
  'your_encryption_key_here',
  'your_journal_encryption_key_here',
])

/** Committed local/docker placeholders — refused in production and by the backfill. */
export const KNOWN_INSECURE_JOURNAL_KEYS = new Set([
  ...PLACEHOLDER_KEYS,
  '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
  '0123456789abcdef0123456789abcdef',
])

export const JOURNAL_DECRYPT_FAILED = Object.freeze({
  kind: 'journal-decrypt-failed' as const,
})

export type JournalDecryptFailed = typeof JOURNAL_DECRYPT_FAILED

export type JournalFieldDecryptResult =
  | { ok: true; value: string | null; key: 'current' | 'previous' | 'plaintext' }
  | { ok: false; undecryptable: true }

export function isJournalDecryptFailed(value: unknown): value is JournalDecryptFailed {
  return (
    Boolean(value) &&
    typeof value === 'object' &&
    (value as { kind?: unknown }).kind === JOURNAL_DECRYPT_FAILED.kind
  )
}

export function isStrictJournalKeyEnv(): boolean {
  return (
    process.env.NODE_ENV === 'production' ||
    process.env.VERCEL_ENV === 'production' ||
    process.env.VERCEL_ENV === 'preview'
  )
}

export function isJournalEncryptionWriteEnabled(): boolean {
  const raw = process.env.JOURNAL_ENCRYPTION_WRITE?.trim().toLowerCase()
  return raw === '1' || raw === 'true' || raw === 'yes'
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

function invalidPreviousKeyMessage(reason: string): string {
  return (
    `JOURNAL_ENCRYPTION_PREVIOUS_KEY is set but ${reason}. ` +
    'Use a 32-byte hex (openssl rand -hex 32) or 32-byte base64 key.'
  )
}

function resolvePreviousKeyBytes(): Buffer | null {
  const raw = process.env.JOURNAL_ENCRYPTION_PREVIOUS_KEY?.trim()
  if (!raw) return null

  const strict = isStrictJournalKeyEnv()
  if (PLACEHOLDER_KEYS.has(raw) || (strict && KNOWN_INSECURE_JOURNAL_KEYS.has(raw))) {
    const message = invalidPreviousKeyMessage('is a placeholder or insecure value')
    if (strict) throw new Error(message)
    console.error('[journal-crypto]', message)
    return null
  }

  const decoded = keyFromSecret(raw, !strict)
  if (!decoded) {
    const message = invalidPreviousKeyMessage('is not a 32-byte hex/base64 key')
    if (strict) throw new Error(message)
    console.error('[journal-crypto]', message)
    return null
  }
  return decoded
}

function resolveDecryptKeyBytes(): { current: Buffer | null; previous: Buffer | null } {
  return {
    current: resolveEncryptKeyBytes(),
    previous: resolvePreviousKeyBytes(),
  }
}

export function hasJournalEncryptionKey(): boolean {
  return resolveEncryptKeyBytes() !== null
}

export function requireExact32ByteJournalKey(): Buffer {
  const raw = process.env.JOURNAL_ENCRYPTION_KEY?.trim()
  if (!raw || PLACEHOLDER_KEYS.has(raw) || KNOWN_INSECURE_JOURNAL_KEYS.has(raw)) {
    throw new Error(
      'JOURNAL_ENCRYPTION_KEY is required for the journal backfill: ' +
        'an exact 32-byte hex or base64 key. ENCRYPTION_KEY fallback and ' +
        'placeholders are not allowed.',
    )
  }
  const decoded = decodeExact32ByteKey(raw)
  if (!decoded) {
    throw new Error(
      'JOURNAL_ENCRYPTION_KEY must be 64 hex chars (openssl rand -hex 32) or 32-byte base64.',
    )
  }
  return decoded
}

export function hasExact32ByteJournalKey(): boolean {
  try {
    requireExact32ByteJournalKey()
    return true
  } catch {
    return false
  }
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

export type EncryptJournalFieldOptions = {
  /** Bypass JOURNAL_ENCRYPTION_WRITE (backfill / --rekey). */
  force?: boolean
}

/**
 * Encrypt a journal / note string for DB storage.
 * No-ops unless JOURNAL_ENCRYPTION_WRITE is on (or `force` is set).
 * Skips valid v1 ciphertext. Null passes through. Empty string in strict
 * mode still requires a key so a missing key cannot silently succeed.
 */
export function encryptJournalField(
  plaintext: string | null | undefined,
  options?: EncryptJournalFieldOptions,
): string | null {
  if (plaintext == null) return null
  if (isValidJournalCiphertext(plaintext)) return plaintext

  const write = options?.force === true || isJournalEncryptionWriteEnabled()
  if (!write) return plaintext

  if (plaintext === '' && !isStrictJournalKeyEnv()) {
    return ''
  }

  const key = requireEncryptKey()
  if (plaintext === '') return ''

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

export function decryptJournalFieldResult(
  stored: string | null | undefined,
): JournalFieldDecryptResult {
  if (stored == null) return { ok: true, value: null, key: 'plaintext' }
  if (stored === '') return { ok: true, value: '', key: 'plaintext' }
  if (!isValidJournalCiphertext(stored)) {
    return { ok: true, value: stored, key: 'plaintext' }
  }

  const keys = resolveDecryptKeyBytes()
  if (keys.current) {
    try {
      return { ok: true, value: decryptWithKey(stored, keys.current), key: 'current' }
    } catch {
      // try previous
    }
  }
  if (keys.previous) {
    try {
      return { ok: true, value: decryptWithKey(stored, keys.previous), key: 'previous' }
    } catch {
      // fall through
    }
  }
  if (!keys.current && !keys.previous) {
    throw new Error(
      'JOURNAL_ENCRYPTION_KEY is required to decrypt journal fields. ' +
        'Set a 32-byte secret as 64 hex chars (openssl rand -hex 32) or base64.',
    )
  }
  return { ok: false, undecryptable: true }
}

/**
 * Decrypt a stored journal / note string.
 * Legacy plaintext and prefix-but-invalid blobs pass through.
 */
export function decryptJournalField(stored: string | null | undefined): string | null {
  const result = decryptJournalFieldResult(stored)
  if (!result.ok) {
    throw new Error('Journal field decrypt failed')
  }
  return result.value
}

export function decryptJournalFieldSafe(
  stored: string | null | undefined,
  rowId?: unknown,
  field = 'journal field',
): string | null {
  try {
    const result = decryptJournalFieldResult(stored)
    if (result.ok) return result.value
    console.error('[journal-crypto] Failed to decrypt', {
      field,
      id: typeof rowId === 'string' || typeof rowId === 'number' ? rowId : undefined,
    })
    return null
  } catch {
    console.error('[journal-crypto] Failed to decrypt', {
      field,
      id: typeof rowId === 'string' || typeof rowId === 'number' ? rowId : undefined,
    })
    return null
  }
}

export type JournalConversationDecryptResult =
  | { ok: true; value: unknown; key: 'current' | 'previous' | 'plaintext' }
  | { ok: false; undecryptable: true }

export function decryptJournalConversationResult(
  value: unknown,
): JournalConversationDecryptResult {
  if (isPrismaJsonNullInput(value)) return { ok: true, value, key: 'plaintext' }
  if (typeof value === 'string') return decryptJournalFieldResult(value)
  return { ok: true, value, key: 'plaintext' }
}

/**
 * Encrypt Mood.conversation. Null sentinels and empty JSON placeholders pass through.
 */
export function encryptJournalConversation(value: string, options?: EncryptJournalFieldOptions): string
export function encryptJournalConversation(value: unknown, options?: EncryptJournalFieldOptions): unknown
export function encryptJournalConversation(
  value: unknown,
  options?: EncryptJournalFieldOptions,
): unknown {
  if (isPrismaJsonNullInput(value)) return value
  const write = options?.force === true || isJournalEncryptionWriteEnabled()
  if (!write) return value
  if (typeof value === 'string') {
    if (value === '' || value === 'null' || value === '{}') {
      if (value === '' && isStrictJournalKeyEnv()) requireEncryptKey()
      return value
    }
    return encryptJournalField(value, options)
  }
  if (typeof value === 'object' && !Array.isArray(value) && Object.keys(value as object).length === 0) {
    return value
  }
  return encryptJournalField(JSON.stringify(value), options)
}

export function decryptJournalConversation(value: unknown): unknown {
  if (isPrismaJsonNullInput(value)) return value
  if (typeof value === 'string') return decryptJournalField(value)
  return value
}

export function decryptJournalConversationSafe(value: unknown, rowId?: unknown): unknown {
  try {
    const result = decryptJournalConversationResult(value)
    if (result.ok) return result.value
    console.error('[journal-crypto] Failed to decrypt', {
      field: 'mood.conversation',
      id: typeof rowId === 'string' || typeof rowId === 'number' ? rowId : undefined,
    })
    return null
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
>(row: T): T & {
  journalContentUndecryptable: boolean
  conversationUndecryptable: boolean
} {
  const journal = (() => {
    try {
      return decryptJournalFieldResult(row.journalContent ?? null)
    } catch {
      return { ok: false as const, undecryptable: true as const }
    }
  })()
  const conversation = (() => {
    try {
      return decryptJournalConversationResult(row.conversation)
    } catch {
      return { ok: false as const, undecryptable: true as const }
    }
  })()
  return {
    ...row,
    journalContent: journal.ok ? journal.value : null,
    conversation: conversation.ok ? conversation.value : null,
    journalContentUndecryptable: !journal.ok,
    conversationUndecryptable: !conversation.ok,
  }
}

export function withDecryptedTradeComment<T extends { id?: unknown; comment?: string | null }>(
  row: T,
): T & { commentUndecryptable: boolean } {
  if (row.comment == null) {
    return { ...row, commentUndecryptable: false }
  }
  const result = (() => {
    try {
      return decryptJournalFieldResult(row.comment)
    } catch {
      return { ok: false as const, undecryptable: true as const }
    }
  })()
  if (result.ok) {
    return { ...row, comment: result.value, commentUndecryptable: false }
  }
  return { ...row, comment: null, commentUndecryptable: true }
}

export function rowHasUnreadJournalContent(row: {
  journalContentUndecryptable?: boolean
  journalContent?: unknown
}): boolean {
  return row.journalContentUndecryptable === true || isJournalDecryptFailed(row.journalContent)
}

export function rowHasUnreadConversation(row: {
  conversationUndecryptable?: boolean
  conversation?: unknown
}): boolean {
  return row.conversationUndecryptable === true || isJournalDecryptFailed(row.conversation)
}

export function rowHasUnreadTradeComment(row: {
  commentUndecryptable?: boolean
  comment?: unknown
}): boolean {
  return row.commentUndecryptable === true || isJournalDecryptFailed(row.comment)
}

export function assertBackfillCanDecryptSamples(
  samples: Array<string | null | undefined>,
): void {
  const ciphertext = samples.find(
    (value): value is string => typeof value === 'string' && isValidJournalCiphertext(value),
  )
  if (!ciphertext) return
  let result: JournalFieldDecryptResult
  try {
    result = decryptJournalFieldResult(ciphertext)
  } catch (error) {
    throw new Error(
      `Refusing to backfill: cannot decrypt an existing jrn:v1 row (${
        error instanceof Error ? error.message : 'unknown error'
      }).`,
    )
  }
  if (!result.ok) {
    throw new Error(
      'Refusing to backfill: cannot decrypt an existing jrn:v1 row with ' +
        'JOURNAL_ENCRYPTION_KEY / JOURNAL_ENCRYPTION_PREVIOUS_KEY.',
    )
  }
}

export function shouldRekeyStoredField(stored: string | null | undefined): boolean {
  if (typeof stored !== 'string' || !isValidJournalCiphertext(stored)) return false
  const result = decryptJournalFieldResult(stored)
  return result.ok && result.key === 'previous'
}
