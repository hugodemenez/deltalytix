import { afterEach, describe, expect, it } from 'vitest'
import {
  JOURNAL_FIELD_ENC_PREFIX,
  decryptJournalConversation,
  decryptJournalField,
  encryptJournalConversation,
  encryptJournalField,
  hasJournalEncryptionKey,
  isEncryptedJournalField,
  withDecryptedMoodFields,
  withDecryptedTradeComment,
} from './journal-field-crypto'

const ORIGINAL_JOURNAL_KEY = process.env.JOURNAL_ENCRYPTION_KEY
const ORIGINAL_ENCRYPTION_KEY = process.env.ENCRYPTION_KEY

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
})

describe('journal-field-crypto', () => {
  it('encrypts and decrypts with a hex JOURNAL_ENCRYPTION_KEY', () => {
    process.env.JOURNAL_ENCRYPTION_KEY = 'a'.repeat(64)
    delete process.env.ENCRYPTION_KEY
    const plaintext = '<p>Held through the open. Felt rushed.</p>'

    const encrypted = encryptJournalField(plaintext)
    expect(encrypted).toBeTruthy()
    expect(isEncryptedJournalField(encrypted)).toBe(true)
    expect(encrypted!.startsWith(JOURNAL_FIELD_ENC_PREFIX)).toBe(true)
    expect(encrypted).not.toContain('Felt rushed')
    expect(decryptJournalField(encrypted)).toBe(plaintext)
  })

  it('accepts a 32-byte base64 JOURNAL_ENCRYPTION_KEY', () => {
    process.env.JOURNAL_ENCRYPTION_KEY = Buffer.alloc(32, 7).toString('base64')
    delete process.env.ENCRYPTION_KEY
    const encrypted = encryptJournalField('base64-key-note')
    expect(isEncryptedJournalField(encrypted)).toBe(true)
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

  it('is idempotent for already-encrypted values', () => {
    process.env.JOURNAL_ENCRYPTION_KEY = 'd'.repeat(64)
    const once = encryptJournalField('token')!
    expect(encryptJournalField(once)).toBe(once)
  })

  it('prefers JOURNAL_ENCRYPTION_KEY over ENCRYPTION_KEY', () => {
    process.env.JOURNAL_ENCRYPTION_KEY = 'e'.repeat(64)
    process.env.ENCRYPTION_KEY = 'f'.repeat(64)
    const encrypted = encryptJournalField('prefer-journal-key')
    process.env.ENCRYPTION_KEY = '0'.repeat(64)
    expect(decryptJournalField(encrypted)).toBe('prefer-journal-key')
  })

  it('falls back to ENCRYPTION_KEY when JOURNAL_ENCRYPTION_KEY is unset', () => {
    delete process.env.JOURNAL_ENCRYPTION_KEY
    process.env.ENCRYPTION_KEY = 'f'.repeat(64)
    expect(hasJournalEncryptionKey()).toBe(true)
    const encrypted = encryptJournalField('fallback-key')
    expect(decryptJournalField(encrypted)).toBe('fallback-key')
  })

  it('ignores .env.example placeholders', () => {
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

  it('throws when decrypting ciphertext with the wrong key', () => {
    process.env.JOURNAL_ENCRYPTION_KEY = '1'.repeat(64)
    const encrypted = encryptJournalField('classified')
    process.env.JOURNAL_ENCRYPTION_KEY = '2'.repeat(64)
    expect(() => decryptJournalField(encrypted)).toThrow()
  })

  it('encrypts conversation objects as a JSON string blob', () => {
    process.env.JOURNAL_ENCRYPTION_KEY = '3'.repeat(64)
    const messages = [{ role: 'user', content: 'I chased the close' }]
    const encrypted = encryptJournalConversation(messages)
    expect(typeof encrypted).toBe('string')
    expect(isEncryptedJournalField(encrypted as string)).toBe(true)
    expect(encrypted).not.toContain('chased')
    expect(decryptJournalConversation(encrypted)).toBe(JSON.stringify(messages))
  })

  it('dual-reads a legacy plaintext conversation string', () => {
    process.env.JOURNAL_ENCRYPTION_KEY = '4'.repeat(64)
    const legacy = JSON.stringify([{ role: 'assistant', content: 'breathe' }])
    expect(decryptJournalConversation(legacy)).toBe(legacy)
  })

  it('decrypts mood and trade row helpers', () => {
    process.env.JOURNAL_ENCRYPTION_KEY = '5'.repeat(64)
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
    })

    const trade = withDecryptedTradeComment({
      id: 't1',
      comment: encryptJournalField('scale out'),
    })
    expect(trade).toEqual({ id: 't1', comment: 'scale out' })
  })
})
