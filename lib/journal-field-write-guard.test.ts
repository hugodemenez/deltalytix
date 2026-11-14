import { describe, expect, it } from 'vitest'
import { Prisma } from '@/prisma/generated/prisma/client'
import {
  copyStoredTradeComment,
  conversationWrite,
  existingMoodConversationIsUnread,
  existingMoodJournalIsUnread,
  existingTradeCommentIsUnread,
  JournalFieldUndecryptableError,
  mindsetJournalContentWrite,
  storedCommentIsUnread,
  storedConversationIsUnread,
  storedJournalIsUnread,
  storedJsonEquals,
  tradeCommentWrite,
} from './journal-field-write-guard'
import {
  encryptJournalConversation,
  encryptJournalField,
  withDecryptedMoodFields,
  withDecryptedTradeComment,
} from './journal-field-crypto'
import { decryptResultTree } from './prisma-journal-encryption'

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
    const conversation = encryptJournalConversation(
      JSON.stringify([{ role: 'user', content: 'keep chat' }]),
    )
    process.env.JOURNAL_ENCRYPTION_KEY = '2'.repeat(64)
    expect(storedCommentIsUnread(cipher)).toBe(true)
    expect(storedJournalIsUnread(cipher)).toBe(true)
    expect(storedConversationIsUnread(conversation)).toBe(true)
    expect(storedCommentIsUnread('legacy note')).toBe(false)
    expect(storedCommentIsUnread(null)).toBe(false)
    expect(storedJournalIsUnread(null)).toBe(false)
    expect(storedConversationIsUnread(null)).toBe(false)
  })

  it('refuses overwrite using decryptResultTree then withDecryptedMoodFields', () => {
    process.env.JOURNAL_ENCRYPTION_WRITE = '1'
    process.env.JOURNAL_ENCRYPTION_KEY = '1'.repeat(64)
    const journalContent = encryptJournalField('keep journal')
    const conversation = encryptJournalConversation(
      JSON.stringify([{ role: 'user', content: 'keep chat' }]),
    )
    const comment = encryptJournalField('keep comment')
    process.env.JOURNAL_ENCRYPTION_KEY = '2'.repeat(64)

    const moodRow: {
      id: string
      journalContent: string | null
      conversation: unknown
      journalContentUndecryptable?: boolean
      conversationUndecryptable?: boolean
    } = { id: 'm1', journalContent, conversation }
    decryptResultTree(moodRow)
    const mood = withDecryptedMoodFields(moodRow)
    expect(mood.journalContentUndecryptable).toBe(true)
    expect(mood.conversationUndecryptable).toBe(true)
    expect(() =>
      mindsetJournalContentWrite({
        existingUndecryptable: existingMoodJournalIsUnread(mood),
        journalEdited: true,
        incoming: '',
      }),
    ).toThrow(JournalFieldUndecryptableError)
    expect(() =>
      conversationWrite({
        existingUndecryptable: existingMoodConversationIsUnread(mood),
        incoming: [],
      }),
    ).toThrow(/mood.conversation/)

    const tradeRow: {
      id: string
      comment: string | null
      commentUndecryptable?: boolean
    } = { id: 't1', comment }
    decryptResultTree(tradeRow)
    const trade = withDecryptedTradeComment(tradeRow)
    expect(trade.commentUndecryptable).toBe(true)
    expect(() =>
      tradeCommentWrite({
        existingUndecryptable: existingTradeCommentIsUnread(trade),
        incoming: '',
      }),
    ).toThrow(/trade.comment/)
  })

  it('matches JSON null transcripts with AnyNull so JsonNull and DbNull both hit', () => {
    expect(storedJsonEquals(null)).toEqual({ equals: Prisma.AnyNull })
    expect(storedJsonEquals(undefined)).toEqual({ equals: Prisma.AnyNull })
    expect(storedJsonEquals(Prisma.JsonNull)).toEqual({ equals: Prisma.AnyNull })
    expect(storedJsonEquals(Prisma.DbNull)).toEqual({ equals: Prisma.AnyNull })
    expect(storedJsonEquals(Prisma.AnyNull)).toEqual({ equals: Prisma.AnyNull })
    expect(storedJsonEquals([{ role: 'user', content: 'hi' }])).toEqual({
      equals: [{ role: 'user', content: 'hi' }],
    })
  })
})
