import { Prisma } from '@/prisma/generated/prisma/client'
import {
  decryptJournalConversationResult,
  decryptJournalFieldResult,
  isPrismaJsonNullInput,
  rowHasUnreadConversation,
  rowHasUnreadJournalContent,
  rowHasUnreadTradeComment,
} from '@/lib/journal-field-crypto'

export class JournalFieldUndecryptableError extends Error {
  constructor(public readonly field: string) {
    super(
      `Refusing to overwrite unread ${field}. The stored value could not be decrypted; it was not empty.`,
    )
    this.name = 'JournalFieldUndecryptableError'
  }
}

/**
 * Emotion/news save: omit journalContent unless the user edited a readable
 * value. Never write "" (or anything else) over an undecryptable row.
 */
export function mindsetJournalContentWrite(params: {
  existingUndecryptable: boolean
  journalEdited: boolean
  incoming: string | undefined
}): { omit: true } | { value: string } {
  if (!params.journalEdited || params.incoming === undefined) {
    return { omit: true }
  }
  if (params.existingUndecryptable) {
    throw new JournalFieldUndecryptableError('mood.journalContent')
  }
  return { value: params.incoming }
}

export function conversationWrite<T>(params: {
  existingUndecryptable: boolean
  incoming: T
}): T {
  if (params.existingUndecryptable) {
    throw new JournalFieldUndecryptableError('mood.conversation')
  }
  return params.incoming
}

export function tradeCommentWrite(params: {
  existingUndecryptable: boolean
  incoming: string | null
}): string | null {
  if (params.existingUndecryptable) {
    throw new JournalFieldUndecryptableError('trade.comment')
  }
  return params.incoming
}

/** Protocol rebuild copies stored comment bytes. Never encrypt(null). */
export function copyStoredTradeComment(
  stored: string | null | undefined,
): string | null {
  return stored ?? null
}

export function existingMoodJournalIsUnread(row: {
  journalContentUndecryptable?: boolean
  journalContent?: unknown
}): boolean {
  return rowHasUnreadJournalContent(row)
}

export function existingMoodConversationIsUnread(row: {
  conversationUndecryptable?: boolean
  conversation?: unknown
}): boolean {
  return rowHasUnreadConversation(row)
}

export function existingTradeCommentIsUnread(row: {
  commentUndecryptable?: boolean
  comment?: unknown
}): boolean {
  return rowHasUnreadTradeComment(row)
}

/** Raw stored Trade.comment (unextended Prisma). Ciphertext that cannot be read is unread. */
export function storedCommentIsUnread(comment: string | null | undefined): boolean {
  try {
    return !decryptJournalFieldResult(comment).ok
  } catch {
    return typeof comment === 'string' && comment.length > 0
  }
}

/** Raw stored Mood.journalContent (unextended Prisma). */
export function storedJournalIsUnread(
  journalContent: string | null | undefined,
): boolean {
  try {
    return !decryptJournalFieldResult(journalContent).ok
  } catch {
    return typeof journalContent === 'string' && journalContent.length > 0
  }
}

/** Raw stored Mood.conversation (unextended Prisma). */
export function storedConversationIsUnread(conversation: unknown): boolean {
  try {
    return !decryptJournalConversationResult(conversation).ok
  } catch {
    return conversation != null && conversation !== ''
  }
}

export function storedJsonEquals(value: unknown): Prisma.JsonFilter {
  if (value == null || isPrismaJsonNullInput(value)) {
    return { equals: Prisma.AnyNull }
  }
  return { equals: value as Prisma.InputJsonValue }
}
