import { describe, expect, it } from 'vitest'
import { encryptJournalField } from './journal-field-crypto'
import { decryptResultTree, encryptWritePayload } from './prisma-journal-encryption'

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
    const included = {
      trades: [
        { id: 'ok', comment: encryptJournalField('good') },
        { id: 'bad', comment: foreign },
      ],
    }
    decryptResultTree(included)
    expect(included.trades[0].comment).toBe('good')
    expect(included.trades[1].comment).toBeNull()
  })
})
