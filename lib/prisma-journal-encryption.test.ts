import { describe, expect, it } from 'vitest'
import {
  decryptJournalConversationResult,
  decryptJournalFieldResult,
  encryptJournalConversation,
  encryptJournalField,
  withDecryptedMoodFields,
  withDecryptedTradeComment,
} from './journal-field-crypto'
import {
  conversationWrite,
  existingMoodConversationIsUnread,
  existingMoodJournalIsUnread,
  existingTradeCommentIsUnread,
  JournalFieldUndecryptableError,
  mindsetJournalContentWrite,
  tradeCommentWrite,
} from './journal-field-write-guard'
import {
  decryptResultTree,
  encryptWriteArgs,
  encryptWritePayload,
  withJournalFieldEncryption,
} from './prisma-journal-encryption'

/** Prisma used to run result computes, then the query-hook tree walk. */
function simulateResultComputeThenQueryHook(raw: {
  id: string
  journalContent?: string | null
  conversation?: unknown
  comment?: string | null
  journalContentUndecryptable?: boolean
  conversationUndecryptable?: boolean
  commentUndecryptable?: boolean
}) {
  const afterResult = { ...raw }
  if (typeof afterResult.journalContent === 'string') {
    try {
      const decrypted = decryptJournalFieldResult(afterResult.journalContent)
      afterResult.journalContentUndecryptable = !decrypted.ok
      afterResult.journalContent = decrypted.ok ? decrypted.value : null
    } catch {
      afterResult.journalContentUndecryptable = true
      afterResult.journalContent = null
    }
  }
  if (afterResult.conversation !== undefined) {
    try {
      const decrypted = decryptJournalConversationResult(afterResult.conversation)
      afterResult.conversationUndecryptable = !decrypted.ok
      afterResult.conversation = decrypted.ok ? decrypted.value : null
    } catch {
      afterResult.conversationUndecryptable = true
      afterResult.conversation = null
    }
  }
  if (typeof afterResult.comment === 'string') {
    try {
      const decrypted = decryptJournalFieldResult(afterResult.comment)
      afterResult.commentUndecryptable = !decrypted.ok
      afterResult.comment = decrypted.ok ? decrypted.value : null
    } catch {
      afterResult.commentUndecryptable = true
      afterResult.comment = null
    }
  }
  decryptResultTree(afterResult)
  return afterResult
}

describe('prisma-journal-encryption nested writes', () => {
  it('encrypts { set } updates', () => {
    process.env.JOURNAL_ENCRYPTION_KEY = 'a'.repeat(64)
    const data = { comment: { set: 'held too long' } }
    encryptWritePayload(data)
    expect(data.comment.set).not.toBe('held too long')
    expect(data.comment.set.startsWith('jrn:v1:')).toBe(true)
  })

  it('encrypts nested create / createMany / upsert under relation keys', () => {
    process.env.JOURNAL_ENCRYPTION_KEY = 'b'.repeat(64)
    const data = {
      moods: {
        create: { journalContent: 'daily recap', conversation: [{ role: 'user', content: 'hi' }] },
        createMany: {
          data: [{ journalContent: 'second day' }],
        },
      },
      trades: {
        upsert: {
          where: { id: 't1' },
          create: { comment: 'scale out' },
          update: { comment: { set: 'scale out later' } },
        },
      },
    }

    encryptWritePayload(data)

    expect(String(data.moods.create.journalContent)).not.toContain('daily recap')
    expect(String(data.moods.createMany.data[0].journalContent)).not.toContain('second day')
    expect(String(data.trades.upsert.create.comment)).not.toContain('scale out')
    expect(String(data.trades.upsert.update.comment.set)).not.toContain('scale out later')
    expect(data.trades.upsert.where.id).toBe('t1')
  })

  it('encrypts comments on a Trade.createMany payload', () => {
    process.env.JOURNAL_ENCRYPTION_KEY = 'c'.repeat(64)
    const args = {
      data: [
        { id: 't1', comment: 'note-one', pnl: 10 },
        { id: 't2', comment: 'note-two', pnl: -4 },
      ],
      skipDuplicates: true,
    }
    encryptWriteArgs(args)
    expect(args.data[0].comment.startsWith('jrn:v1:')).toBe(true)
    expect(args.data[1].comment.startsWith('jrn:v1:')).toBe(true)
    expect(args.data[0].comment).not.toContain('note-one')
    expect(args.data[1].comment).not.toContain('note-two')
    expect(args.skipDuplicates).toBe(true)
  })

  it('does not encrypt where filters', () => {
    process.env.JOURNAL_ENCRYPTION_KEY = 'c'.repeat(64)
    const data = {
      trades: {
        updateMany: {
          where: { comment: 'keep-filter' },
          data: { comment: 'new-note' },
        },
      },
    }
    encryptWritePayload(data)
    expect(data.trades.updateMany.where.comment).toBe('keep-filter')
    expect(data.trades.updateMany.data.comment).not.toBe('new-note')
  })
})

describe('prisma-journal-encryption include decrypt', () => {
  it('decrypts nested trades and moods on include-shaped results', () => {
    process.env.JOURNAL_ENCRYPTION_KEY = 'd'.repeat(64)
    const included = {
      id: 'user-1',
      trades: [{ id: 't1', comment: encryptJournalField('note-one') }],
      moods: [
        {
          id: 'm1',
          journalContent: encryptJournalField('journal-one'),
          conversation: encryptJournalField(JSON.stringify([{ role: 'user', content: 'hi' }])),
        },
      ],
    }

    decryptResultTree(included)

    expect(included.trades[0].comment).toBe('note-one')
    expect(included.moods[0].journalContent).toBe('journal-one')
    expect(included.moods[0].conversation).toBe(
      JSON.stringify([{ role: 'user', content: 'hi' }]),
    )
  })

  it('nulls a bad ciphertext row without failing the rest of the tree', () => {
    process.env.JOURNAL_ENCRYPTION_KEY = '0'.repeat(64)
    const foreign = encryptJournalField('other-key')
    process.env.JOURNAL_ENCRYPTION_KEY = 'e'.repeat(64)
    const included: {
      trades: Array<{
        id: string
        comment: string | null
        commentUndecryptable?: boolean
      }>
    } = {
      trades: [
        { id: 'ok', comment: encryptJournalField('good') },
        { id: 'bad', comment: foreign },
      ],
    }
    decryptResultTree(included)
    expect(included.trades[0].comment).toBe('good')
    expect(included.trades[0].commentUndecryptable).toBe(false)
    expect(included.trades[1].comment).toBeNull()
    expect(included.trades[1].commentUndecryptable).toBe(true)
  })
})

describe('prisma-journal-encryption without a key', () => {
  it('does not throw wrapping a client or walking unrelated payloads', () => {
    delete process.env.JOURNAL_ENCRYPTION_KEY
    delete process.env.ENCRYPTION_KEY
    delete process.env.JOURNAL_ENCRYPTION_PREVIOUS_KEY

    const stub = {
      $extends() {
        return this
      },
    }
    expect(() =>
      withJournalFieldEncryption(stub as never),
    ).not.toThrow()

    const accountWrite = {
      data: {
        number: 'DEMO-001',
        startingBalance: 50_000,
        nested: { tags: ['plan-followed'] },
      },
    }
    expect(() => encryptWriteArgs(accountWrite)).not.toThrow()
    expect(accountWrite.data.number).toBe('DEMO-001')

    const createManyTrades = {
      data: [
        { id: 't1', pnl: 10, commission: 1.25, comment: null },
        { id: 't2', pnl: -4, commission: 0 },
      ],
    }
    expect(() => encryptWritePayload(createManyTrades)).not.toThrow()

    const result = {
      trades: [{ id: 't1', pnl: 10, commission: 1.25 }],
      count: 1,
    }
    expect(() => decryptResultTree(result)).not.toThrow()
    expect(result.trades[0].pnl).toBe(10)
  })

  it('still throws when a journal field is actually encrypted without a key', () => {
    process.env.JOURNAL_ENCRYPTION_WRITE = '1'
    delete process.env.JOURNAL_ENCRYPTION_KEY
    delete process.env.ENCRYPTION_KEY
    expect(() => encryptWritePayload({ comment: 'held too long' })).toThrow(
      /JOURNAL_ENCRYPTION_KEY/,
    )
  })

  it('does not encrypt writes when JOURNAL_ENCRYPTION_WRITE is off', () => {
    const previous = process.env.JOURNAL_ENCRYPTION_WRITE
    delete process.env.JOURNAL_ENCRYPTION_WRITE
    process.env.JOURNAL_ENCRYPTION_KEY = 'a'.repeat(64)
    const data = { comment: 'held too long' }
    encryptWritePayload(data)
    expect(data.comment).toBe('held too long')
    if (previous === undefined) delete process.env.JOURNAL_ENCRYPTION_WRITE
    else process.env.JOURNAL_ENCRYPTION_WRITE = previous
  })

  it('nulls ciphertext on read when the key is missing instead of throwing', () => {
    process.env.JOURNAL_ENCRYPTION_WRITE = '1'
    process.env.JOURNAL_ENCRYPTION_KEY = 'a'.repeat(64)
    const cipher = encryptJournalField('daily recap')
    delete process.env.JOURNAL_ENCRYPTION_KEY
    delete process.env.ENCRYPTION_KEY
    const included: {
      trades: Array<{
        id: string
        comment: string | null
        commentUndecryptable?: boolean
      }>
    } = { trades: [{ id: 't1', comment: cipher }] }
    expect(() => decryptResultTree(included)).not.toThrow()
    expect(included.trades[0].comment).toBeNull()
    expect(included.trades[0].commentUndecryptable).toBe(true)
  })

  it('keeps unread flags through result-compute then query-hook then withDecrypted*', () => {
    process.env.JOURNAL_ENCRYPTION_WRITE = '1'
    process.env.JOURNAL_ENCRYPTION_KEY = '1'.repeat(64)
    const journalContent = encryptJournalField('keep journal')
    const conversation = encryptJournalConversation(
      JSON.stringify([{ role: 'user', content: 'keep chat' }]),
    )
    const comment = encryptJournalField('keep comment')
    process.env.JOURNAL_ENCRYPTION_KEY = '2'.repeat(64)

    const mood = withDecryptedMoodFields(
      simulateResultComputeThenQueryHook({
        id: 'm1',
        journalContent,
        conversation,
      }),
    )
    expect(mood.journalContentUndecryptable).toBe(true)
    expect(mood.conversationUndecryptable).toBe(true)
    expect(() =>
      mindsetJournalContentWrite({
        existingUndecryptable: existingMoodJournalIsUnread(mood),
        journalEdited: true,
        incoming: 'overwrite',
      }),
    ).toThrow(JournalFieldUndecryptableError)
    expect(() =>
      conversationWrite({
        existingUndecryptable: existingMoodConversationIsUnread(mood),
        incoming: [],
      }),
    ).toThrow(/mood.conversation/)

    const trade = withDecryptedTradeComment(
      simulateResultComputeThenQueryHook({ id: 't1', comment }),
    )
    expect(trade.commentUndecryptable).toBe(true)
    expect(() =>
      tradeCommentWrite({
        existingUndecryptable: existingTradeCommentIsUnread(trade),
        incoming: '',
      }),
    ).toThrow(/trade.comment/)
  })

  it('keeps unread flags through the real query-hook client', async () => {
    process.env.JOURNAL_ENCRYPTION_WRITE = '1'
    process.env.JOURNAL_ENCRYPTION_KEY = '1'.repeat(64)
    const journalContent = encryptJournalField('keep journal')
    const conversation = encryptJournalConversation(
      JSON.stringify([{ role: 'user', content: 'keep chat' }]),
    )
    process.env.JOURNAL_ENCRYPTION_KEY = '2'.repeat(64)

    const stored = {
      id: 'm1',
      journalContent,
      conversation,
    }
    const stub = {
      $extends(extension: {
        query?: {
          $allModels?: {
            $allOperations?: (args: {
              operation: string
              args: unknown
              query: (args: unknown) => Promise<unknown>
            }) => Promise<unknown>
          }
        }
      }) {
        const hook = extension.query?.$allModels?.$allOperations
        return {
          mood: {
            findFirst: async () =>
              hook!({
                operation: 'findFirst',
                args: {},
                query: async () => ({ ...stored }),
              }),
          },
        }
      },
    }
    const client = withJournalFieldEncryption(stub as never) as {
      mood: { findFirst: () => Promise<typeof stored & {
        journalContentUndecryptable?: boolean
        conversationUndecryptable?: boolean
      }> }
    }
    const row = await client.mood.findFirst()
    const mood = withDecryptedMoodFields(row)
    expect(mood.journalContentUndecryptable).toBe(true)
    expect(mood.conversationUndecryptable).toBe(true)
    expect(() =>
      mindsetJournalContentWrite({
        existingUndecryptable: existingMoodJournalIsUnread(mood),
        journalEdited: true,
        incoming: '',
      }),
    ).toThrow(JournalFieldUndecryptableError)
  })
})
