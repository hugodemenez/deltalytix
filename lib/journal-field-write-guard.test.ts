import { describe, expect, it } from 'vitest'
import {
  copyStoredTradeComment,
  conversationWrite,
  JournalFieldUndecryptableError,
  mindsetJournalContentWrite,
  storedCommentIsUnread,
  tradeCommentWrite,
} from './journal-field-write-guard'
import { encryptJournalField } from './journal-field-crypto'

describe('journal field write guards', () => {
  it('omits journalContent on an emotion-only mindset save', () => {
    expect(
      mindsetJournalContentWrite({
        existingUndecryptable: false,
        journalEdited: false,
        incoming: '',
      }),
    ).toEqual({ omit: true })
  })

  it('refuses to write "" over an unread journal', () => {
    expect(() =>
      mindsetJournalContentWrite({
        existingUndecryptable: true,
        journalEdited: true,
        incoming: '',
      }),
    ).toThrow(JournalFieldUndecryptableError)
  })

  it('writes journalContent only when the user edited a readable value', () => {
    expect(
      mindsetJournalContentWrite({
        existingUndecryptable: false,
        journalEdited: true,
        incoming: '<p>new notes</p>',
      }),
    ).toEqual({ value: '<p>new notes</p>' })
  })

  it('refuses to overwrite an unread chat transcript', () => {
    expect(() =>
      conversationWrite({
        existingUndecryptable: true,
        incoming: [{ role: 'user', content: 'hi' }],
      }),
    ).toThrow(/mood.conversation/)
  })

  it('refuses to overwrite an unread trade comment with empty/null', () => {
    expect(() =>
      tradeCommentWrite({ existingUndecryptable: true, incoming: null }),
    ).toThrow(/trade.comment/)
    expect(() =>
      tradeCommentWrite({ existingUndecryptable: true, incoming: '' }),
    ).toThrow(JournalFieldUndecryptableError)
  })

  it('copies stored Protocol comments without turning unread into null encrypt', () => {
    process.env.JOURNAL_ENCRYPTION_WRITE = '1'
    process.env.JOURNAL_ENCRYPTION_KEY = 'c'.repeat(64)
    const cipher = encryptJournalField('keep')
    expect(copyStoredTradeComment(cipher)).toBe(cipher)
    expect(copyStoredTradeComment(null)).toBeNull()
    expect(copyStoredTradeComment('legacy')).toBe('legacy')
  })

  it('treats undecryptable stored ciphertext as unread', () => {
    process.env.JOURNAL_ENCRYPTION_WRITE = '1'
    process.env.JOURNAL_ENCRYPTION_KEY = '1'.repeat(64)
    const cipher = encryptJournalField('keep')
    process.env.JOURNAL_ENCRYPTION_KEY = '2'.repeat(64)
    expect(storedCommentIsUnread(cipher)).toBe(true)
    expect(storedCommentIsUnread('legacy note')).toBe(false)
    expect(storedCommentIsUnread(null)).toBe(false)
  })
})
