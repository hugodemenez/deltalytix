/** Shared between the feedback button and the route that receives it. */

export const FEEDBACK_TYPES = ['bug', 'feature', 'other'] as const
export type FeedbackType = (typeof FEEDBACK_TYPES)[number]

export const MAX_FEEDBACK_LENGTH = 2000

export const FEEDBACK_LOCALES = ['en', 'fr'] as const
export type FeedbackLocale = (typeof FEEDBACK_LOCALES)[number]

export function isFeedbackType(value: unknown): value is FeedbackType {
  return FEEDBACK_TYPES.includes(value as FeedbackType)
}

export function toFeedbackLocale(value: unknown): FeedbackLocale {
  return FEEDBACK_LOCALES.includes(value as FeedbackLocale)
    ? (value as FeedbackLocale)
    : 'en'
}
