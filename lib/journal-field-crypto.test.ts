import { afterEach, describe, expect, it } from 'vitest'
import { Prisma } from '@/prisma/generated/prisma/client'
import {
  JOURNAL_FIELD_ENC_PREFIX,
  assertBackfillCanDecryptSamples,
  decryptJournalConversation,
  decryptJournalField,
  decryptJournalFieldResult,
  decryptJournalFieldSafe,
  encryptJournalConversation,
  encryptJournalField,
  hasExact32ByteJournalKey,
  hasJournalEncryptionKey,
  isEncryptedJournalField,
  isJournalEncryptionWriteEnabled,
  isValidJournalCiphertext,
  journalEncryptionKeyFingerprint,
  requireExact32ByteJournalKey,
  shouldRekeyStoredField,
  withDecryptedMoodFields,
  withDecryptedTradeComment,
} from './journal-field-crypto'

const ORIGINAL_JOURNAL_KEY = process.env.JOURNAL_ENCRYPTION_KEY
const ORIGINAL_ENCRYPTION_KEY = process.env.ENCRYPTION_KEY
const ORIGINAL_PREVIOUS_KEY = process.env.JOURNAL_ENCRYPTION_PREVIOUS_KEY
const ORIGINAL_VERCEL_ENV = process.env.VERCEL_ENV
const ORIGINAL_WRITE = process.env.JOURNAL_ENCRYPTION_WRITE

afterEach(() => {
  if (ORIGINAL_JOURNAL_KEY === undefined) {
    delete process.env.JOURNAL_ENCRYPTION_KEY
  } else {
    process.env.JOURNAL_ENCRYPTION_KEY = ORIGINAL_JOURNAL_KEY
  }
  if (ORIGINAL_ENCRYPTION_KEY === undefined) {
    delete process.env.ENCRYPTION_KEY
  } else {
    process.env.ENCRYPTION_KEY = ORIGINAL_ENCRYPTION_KEY
  }
  if (ORIGINAL_PREVIOUS_KEY === undefined) {
    delete process.env.JOURNAL_ENCRYPTION_PREVIOUS_KEY
  } else {
    process.env.JOURNAL_ENCRYPTION_PREVIOUS_KEY = ORIGINAL_PREVIOUS_KEY
  }
  if (ORIGINAL_VERCEL_ENV === undefined) {
    delete process.env.VERCEL_ENV
  } else {
    process.env.VERCEL_ENV = ORIGINAL_VERCEL_ENV
  }
  if (ORIGINAL_WRITE === undefined) {
    delete process.env.JOURNAL_ENCRYPTION_WRITE
  } else {
    process.env.JOURNAL_ENCRYPTION_WRITE = ORIGINAL_WRITE
  }
})

describe('journal-field-crypto', () => {
  it('encrypts and decrypts with a hex JOURNAL_ENCRYPTION_KEY', () => {
    process.env.JOURNAL_ENCRYPTION_KEY = 'a'.repeat(64)
    delete process.env.ENCRYPTION_KEY
    const plaintext = '<p>Held through the open. Felt rushed.</p>'

    const encrypted = encryptJournalField(plaintext)
    expect(encrypted).toBeTruthy()
    expect(isEncryptedJournalField(encrypted)).toBe(true)
    expect(isValidJournalCiphertext(encrypted)).toBe(true)
    expect(encrypted!.startsWith(JOURNAL_FIELD_ENC_PREFIX)).toBe(true)
    expect(encrypted).not.toContain('Felt rushed')
    expect(decryptJournalField(encrypted)).toBe(plaintext)
  })

  it('accepts a 32-byte base64 JOURNAL_ENCRYPTION_KEY', () => {
    process.env.JOURNAL_ENCRYPTION_KEY = Buffer.alloc(32, 7).toString('base64')
    delete process.env.ENCRYPTION_KEY
    const encrypted = encryptJournalField('base64-key-note')
    expect(isValidJournalCiphertext(encrypted)).toBe(true)
    expect(decryptJournalField(encrypted)).toBe('base64-key-note')
  })

  it('uses a different ciphertext each encrypt (random IV)', () => {
    process.env.JOURNAL_ENCRYPTION_KEY = 'b'.repeat(64)
    const a = encryptJournalField('same-note')
    const b = encryptJournalField('same-note')
    expect(a).not.toBe(b)
    expect(decryptJournalField(a)).toBe('same-note')
    expect(decryptJournalField(b)).toBe('same-note')
  })

  it('passes through legacy plaintext on decrypt', () => {
    process.env.JOURNAL_ENCRYPTION_KEY = 'c'.repeat(64)
    expect(decryptJournalField('yesterday I overtraded')).toBe(
      'yesterday I overtraded',
    )
    expect(decryptJournalField(null)).toBeNull()
    expect(decryptJournalField('')).toBe('')
  })

  it('is idempotent only for valid ciphertext, not prefix lookalikes', () => {
    process.env.JOURNAL_ENCRYPTION_KEY = 'd'.repeat(64)
    const once = encryptJournalField('token')!
    expect(encryptJournalField(once)).toBe(once)

    const lookalike = 'jrn:v1:not-actually-ciphertext'
    const encryptedLookalike = encryptJournalField(lookalike)
    expect(encryptedLookalike).not.toBe(lookalike)
    expect(decryptJournalField(encryptedLookalike)).toBe(lookalike)
  })

  it('falls back to ENCRYPTION_KEY outside production', () => {
    delete process.env.VERCEL_ENV
    delete process.env.JOURNAL_ENCRYPTION_KEY
    process.env.ENCRYPTION_KEY = 'f'.repeat(64)
    expect(hasJournalEncryptionKey()).toBe(true)
    const encrypted = encryptJournalField('fallback-key')
    expect(decryptJournalField(encrypted)).toBe('fallback-key')
  })

  it('ignores .env.example placeholders', () => {
    delete process.env.VERCEL_ENV
    process.env.JOURNAL_ENCRYPTION_KEY = 'your_journal_encryption_key_here'
    process.env.ENCRYPTION_KEY = 'your_encryption_key_here'
    expect(hasJournalEncryptionKey()).toBe(false)
    expect(() => encryptJournalField('secret')).toThrow(/JOURNAL_ENCRYPTION_KEY/)
  })

  it('throws when encrypting without a key', () => {
    delete process.env.JOURNAL_ENCRYPTION_KEY
    delete process.env.ENCRYPTION_KEY
    expect(() => encryptJournalField('secret')).toThrow(/JOURNAL_ENCRYPTION_KEY/)
  })

  it('does not require a key for import-time helpers or empty values', () => {
    delete process.env.JOURNAL_ENCRYPTION_KEY
    delete process.env.ENCRYPTION_KEY
    delete process.env.JOURNAL_ENCRYPTION_PREVIOUS_KEY
    expect(hasJournalEncryptionKey()).toBe(false)
    expect(isEncryptedJournalField('plain')).toBe(false)
    expect(isValidJournalCiphertext('jrn:v1:not-ciphertext')).toBe(false)
    expect(encryptJournalField(null)).toBeNull()
    expect(encryptJournalField('')).toBe('')
    expect(encryptJournalConversation(null)).toBeNull()
    expect(decryptJournalFieldSafe('jrn:v1:AAAAAAAAAAAAAAAA:BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB')).toBeNull()
  })

  it('treats an invalid JOURNAL_ENCRYPTION_KEY as missing until encrypt is called', () => {
    process.env.VERCEL_ENV = 'production'
    process.env.JOURNAL_ENCRYPTION_KEY = 'too-short'
    delete process.env.ENCRYPTION_KEY
    expect(hasJournalEncryptionKey()).toBe(false)
    expect(encryptJournalField(null)).toBeNull()
    expect(() => encryptJournalField('secret')).toThrow(/JOURNAL_ENCRYPTION_KEY/)
  })

  it('throws when decrypting ciphertext with the wrong key', () => {
    process.env.JOURNAL_ENCRYPTION_KEY = '1'.repeat(64)
    const encrypted = encryptJournalField('classified')
    process.env.JOURNAL_ENCRYPTION_KEY = '2'.repeat(64)
    expect(() => decryptJournalField(encrypted)).toThrow()
  })

  it('returns null on a per-row decrypt failure instead of throwing', () => {
    process.env.JOURNAL_ENCRYPTION_KEY = '1'.repeat(64)
    const encrypted = encryptJournalField('classified')
    process.env.JOURNAL_ENCRYPTION_KEY = '2'.repeat(64)
    expect(decryptJournalFieldSafe(encrypted, 'row-9', 'trade.comment')).toBeNull()
    expect(
      withDecryptedMoodFields({
        id: 'mood-9',
        journalContent: encrypted,
        conversation: encrypted,
      }),
    ).toEqual({
      id: 'mood-9',
      journalContent: null,
      conversation: null,
      journalContentUndecryptable: true,
      conversationUndecryptable: true,
    })
  })

  it('decrypts with JOURNAL_ENCRYPTION_PREVIOUS_KEY after rotation', () => {
    process.env.JOURNAL_ENCRYPTION_KEY = '3'.repeat(64)
    const encrypted = encryptJournalField('old-key-note')
    process.env.JOURNAL_ENCRYPTION_PREVIOUS_KEY = '3'.repeat(64)
    process.env.JOURNAL_ENCRYPTION_KEY = '4'.repeat(64)
    expect(decryptJournalField(encrypted)).toBe('old-key-note')
    const rotated = encryptJournalField('new-key-note')
    expect(decryptJournalField(rotated)).toBe('new-key-note')
  })

  it('requires an exact 32-byte JOURNAL_ENCRYPTION_KEY in production', () => {
    process.env.VERCEL_ENV = 'production'
    process.env.JOURNAL_ENCRYPTION_KEY = 'local-dev-passphrase'
    delete process.env.ENCRYPTION_KEY
    expect(hasJournalEncryptionKey()).toBe(false)
    expect(() => encryptJournalField('secret')).toThrow(/JOURNAL_ENCRYPTION_KEY/)

    process.env.JOURNAL_ENCRYPTION_KEY =
      '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef'
    expect(hasJournalEncryptionKey()).toBe(false)

    delete process.env.JOURNAL_ENCRYPTION_KEY
    process.env.ENCRYPTION_KEY = 'f'.repeat(64)
    expect(hasJournalEncryptionKey()).toBe(false)
  })

  it('encrypts conversation objects as a JSON string blob', () => {
    process.env.JOURNAL_ENCRYPTION_KEY = '5'.repeat(64)
    const messages = [{ role: 'user', content: 'I chased the close' }]
    const encrypted = encryptJournalConversation(messages)
    expect(typeof encrypted).toBe('string')
    expect(isValidJournalCiphertext(encrypted as string)).toBe(true)
    expect(encrypted).not.toContain('chased')
    expect(decryptJournalConversation(encrypted)).toBe(JSON.stringify(messages))
  })

  it('passes through conversation null sentinels and empty JSON placeholders', () => {
    process.env.JOURNAL_ENCRYPTION_KEY = '6'.repeat(64)
    expect(encryptJournalConversation(null)).toBeNull()
    expect(encryptJournalConversation(Prisma.JsonNull)).toBe(Prisma.JsonNull)
    expect(encryptJournalConversation(Prisma.DbNull)).toBe(Prisma.DbNull)
    expect(encryptJournalConversation('null')).toBe('null')
    expect(encryptJournalConversation('{}')).toBe('{}')
    expect(encryptJournalConversation({})).toEqual({})
  })

  it('dual-reads a legacy plaintext conversation string', () => {
    process.env.JOURNAL_ENCRYPTION_KEY = '7'.repeat(64)
    const legacy = JSON.stringify([{ role: 'assistant', content: 'breathe' }])
    expect(decryptJournalConversation(legacy)).toBe(legacy)
  })

  it('decrypts mood and trade row helpers', () => {
    process.env.JOURNAL_ENCRYPTION_KEY = '8'.repeat(64)
    const journalContent = encryptJournalField('daily recap')
    const conversation = encryptJournalConversation([{ role: 'user', content: 'hi' }])
    const mood = withDecryptedMoodFields({
      id: 'mood-1',
      journalContent,
      conversation,
    })
    expect(mood).toEqual({
      id: 'mood-1',
      journalContent: 'daily recap',
      conversation: JSON.stringify([{ role: 'user', content: 'hi' }]),
      journalContentUndecryptable: false,
      conversationUndecryptable: false,
    })

    const trade = withDecryptedTradeComment({
      id: 't1',
      comment: encryptJournalField('scale out'),
    })
    expect(trade).toEqual({
      id: 't1',
      comment: 'scale out',
      commentUndecryptable: false,
    })
  })

  it('leaves plaintext on write when JOURNAL_ENCRYPTION_WRITE is off', () => {
    process.env.JOURNAL_ENCRYPTION_KEY = 'a'.repeat(64)
    delete process.env.JOURNAL_ENCRYPTION_WRITE
    expect(isJournalEncryptionWriteEnabled()).toBe(false)
    expect(encryptJournalField('plain note')).toBe('plain note')
    expect(encryptJournalConversation([{ role: 'user', content: 'hi' }])).toEqual([
      { role: 'user', content: 'hi' },
    ])
  })

  it('dual-reads mixed plaintext and ciphertext', () => {
    process.env.JOURNAL_ENCRYPTION_WRITE = '1'
    process.env.JOURNAL_ENCRYPTION_KEY = 'a'.repeat(64)
    const cipher = encryptJournalField('secret note')
    expect(decryptJournalField(cipher)).toBe('secret note')
    expect(decryptJournalField('legacy plaintext')).toBe('legacy plaintext')
    expect(decryptJournalFieldResult('legacy plaintext')).toEqual({
      ok: true,
      value: 'legacy plaintext',
      key: 'plaintext',
    })
  })

  it('throws in strict mode when encrypting an empty string without a key', () => {
    process.env.VERCEL_ENV = 'production'
    process.env.JOURNAL_ENCRYPTION_WRITE = '1'
    delete process.env.JOURNAL_ENCRYPTION_KEY
    delete process.env.ENCRYPTION_KEY
    expect(() => encryptJournalField('')).toThrow(/JOURNAL_ENCRYPTION_KEY/)
  })

  it('throws in strict mode when JOURNAL_ENCRYPTION_PREVIOUS_KEY is invalid', () => {
    process.env.VERCEL_ENV = 'production'
    process.env.JOURNAL_ENCRYPTION_WRITE = '1'
    process.env.JOURNAL_ENCRYPTION_KEY = 'a'.repeat(64)
    process.env.JOURNAL_ENCRYPTION_PREVIOUS_KEY = 'too-short'
    const cipher = encryptJournalField('note')
    expect(() => decryptJournalField(cipher)).toThrow(/JOURNAL_ENCRYPTION_PREVIOUS_KEY/)
  })

  it('requires an exact 32-byte key for the backfill even outside Vercel', () => {
    delete process.env.VERCEL_ENV
    delete process.env.JOURNAL_ENCRYPTION_KEY
    process.env.ENCRYPTION_KEY = 'f'.repeat(64)
    expect(hasExact32ByteJournalKey()).toBe(false)
    expect(() => requireExact32ByteJournalKey()).toThrow(/backfill/)

    process.env.JOURNAL_ENCRYPTION_KEY =
      '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef'
    expect(() => requireExact32ByteJournalKey()).toThrow(/backfill/)

    process.env.JOURNAL_ENCRYPTION_KEY = 'a'.repeat(64)
    expect(requireExact32ByteJournalKey()).toHaveLength(32)
  })

  it('refuses to backfill when an existing ciphertext cannot be decrypted', () => {
    process.env.JOURNAL_ENCRYPTION_KEY = 'a'.repeat(64)
    const cipher = encryptJournalField('keep me')
    process.env.JOURNAL_ENCRYPTION_KEY = 'b'.repeat(64)
    expect(() => assertBackfillCanDecryptSamples([cipher])).toThrow(/existing jrn:v1/)
    expect(() =>
      assertBackfillCanDecryptSamples(['legacy plaintext', null]),
    ).toThrow(/no valid jrn:v1 sample/)
    expect(
      assertBackfillCanDecryptSamples(['legacy plaintext', null], {
        allowNoCiphertextSample: true,
      }),
    ).toEqual({ ciphertextSamples: 0 })
  })

  it('keeps an incoming unread flag when the value was already nulled', () => {
    const mood = withDecryptedMoodFields({
      id: 'mood-unread',
      journalContent: null,
      conversation: null,
      journalContentUndecryptable: true,
      conversationUndecryptable: true,
    })
    expect(mood.journalContentUndecryptable).toBe(true)
    expect(mood.conversationUndecryptable).toBe(true)
    expect(mood.journalContent).toBeNull()
    expect(mood.conversation).toBeNull()

    const trade = withDecryptedTradeComment({
      id: 't-unread',
      comment: null,
      commentUndecryptable: true,
    })
    expect(trade.commentUndecryptable).toBe(true)
    expect(trade.comment).toBeNull()
  })

  it('prints a key fingerprint that is not the raw key', () => {
    process.env.JOURNAL_ENCRYPTION_KEY = 'a'.repeat(64)
    const fingerprint = journalEncryptionKeyFingerprint()
    expect(fingerprint).toMatch(/^[0-9a-f]{12}$/)
    expect(fingerprint).not.toBe('a'.repeat(12))
  })

  it('rekeys only ciphertext that still decrypts with the previous key', () => {
    process.env.JOURNAL_ENCRYPTION_WRITE = '1'
    process.env.JOURNAL_ENCRYPTION_KEY = '3'.repeat(64)
    const oldCipher = encryptJournalField('rotate me')
    process.env.JOURNAL_ENCRYPTION_PREVIOUS_KEY = '3'.repeat(64)
    process.env.JOURNAL_ENCRYPTION_KEY = '4'.repeat(64)
    const newCipher = encryptJournalField('already new')
    expect(shouldRekeyStoredField(oldCipher)).toBe(true)
    expect(shouldRekeyStoredField(newCipher)).toBe(false)
    expect(shouldRekeyStoredField('legacy')).toBe(false)
  })
})
