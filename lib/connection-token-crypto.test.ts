import { afterEach, describe, expect, it } from 'vitest'
import {
  CONNECTION_TOKEN_ENC_PREFIX,
  decryptConnectionToken,
  encryptConnectionToken,
  hasConnectionTokenEncryptionKey,
  isEncryptedConnectionToken,
  withDecryptedConnectionToken,
} from './connection-token-crypto'

const ORIGINAL_KEY = process.env.ENCRYPTION_KEY

afterEach(() => {
  if (ORIGINAL_KEY === undefined) {
    delete process.env.ENCRYPTION_KEY
  } else {
    process.env.ENCRYPTION_KEY = ORIGINAL_KEY
  }
})

describe('connection-token-crypto', () => {
  it('encrypts and decrypts with a hex ENCRYPTION_KEY', () => {
    process.env.ENCRYPTION_KEY = 'a'.repeat(64)
    const plaintext = JSON.stringify({ username: 'u', password: 'p' })

    const encrypted = encryptConnectionToken(plaintext)
    expect(encrypted).toBeTruthy()
    expect(isEncryptedConnectionToken(encrypted)).toBe(true)
    expect(encrypted!.startsWith(CONNECTION_TOKEN_ENC_PREFIX)).toBe(true)
    expect(encrypted).not.toContain('password')
    expect(decryptConnectionToken(encrypted)).toBe(plaintext)
  })

  it('uses a different ciphertext each encrypt (random IV)', () => {
    process.env.ENCRYPTION_KEY = 'b'.repeat(64)
    const a = encryptConnectionToken('same-secret')
    const b = encryptConnectionToken('same-secret')
    expect(a).not.toBe(b)
    expect(decryptConnectionToken(a)).toBe('same-secret')
    expect(decryptConnectionToken(b)).toBe('same-secret')
  })

  it('passes through legacy plaintext on decrypt', () => {
    process.env.ENCRYPTION_KEY = 'c'.repeat(64)
    expect(decryptConnectionToken('plain-oauth-token')).toBe('plain-oauth-token')
  })

  it('is idempotent for already-encrypted values', () => {
    process.env.ENCRYPTION_KEY = 'd'.repeat(64)
    const once = encryptConnectionToken('token')!
    expect(encryptConnectionToken(once)).toBe(once)
  })

  it('accepts a non-hex passphrase via SHA-256', () => {
    process.env.ENCRYPTION_KEY = 'local-dev-passphrase'
    expect(hasConnectionTokenEncryptionKey()).toBe(true)
    const encrypted = encryptConnectionToken('hello')
    expect(decryptConnectionToken(encrypted)).toBe('hello')
  })

  it('throws when encrypting without ENCRYPTION_KEY', () => {
    delete process.env.ENCRYPTION_KEY
    expect(() => encryptConnectionToken('secret')).toThrow(/ENCRYPTION_KEY/)
  })

  it('decrypts token fields on connection-like rows', () => {
    process.env.ENCRYPTION_KEY = 'e'.repeat(64)
    const encrypted = encryptConnectionToken('abc')
    const row = withDecryptedConnectionToken({ id: '1', token: encrypted })
    expect(row).toEqual({ id: '1', token: 'abc' })
  })
})
