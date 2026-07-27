import { IbkrErrorCode, isIbkrErrorCode } from '@/lib/ibkr-flex-errors'

/** Loose translator; useI18n `t` is cast internally for next-international strict keys. */
type TranslateFn = (key: string, params?: Record<string, string | number>) => string

function asTranslateFn(t: unknown): TranslateFn {
  return t as TranslateFn
}

/** Errors the user fixes by editing the Flex Query in Client Portal. */
const QUERY_HINT_CODES: Set<string> = new Set([
  IbkrErrorCode.FLEX_QUERY_INVALID,
  IbkrErrorCode.FLEX_LEGACY_QUERY,
  IbkrErrorCode.QUERY_HAS_NO_TRADES_SECTION,
  IbkrErrorCode.QUERY_MISSING_FIELDS,
  IbkrErrorCode.NO_TRADES_IN_RANGE,
])

/** Errors the user fixes by generating a fresh Flex token. */
const TOKEN_HINT_CODES: Set<string> = new Set([
  IbkrErrorCode.FLEX_TOKEN_EXPIRED,
  IbkrErrorCode.FLEX_TOKEN_INVALID,
  IbkrErrorCode.FLEX_SERVICE_INACTIVE,
  IbkrErrorCode.NO_CREDENTIALS_RECONNECT,
  IbkrErrorCode.INVALID_STORED_CREDENTIALS,
])

/** Transient errors where waiting and retrying is the right move. */
const RETRY_HINT_CODES: Set<string> = new Set([
  IbkrErrorCode.FLEX_RATE_LIMITED,
  IbkrErrorCode.FLEX_STATEMENT_TIMEOUT,
  IbkrErrorCode.FLEX_UNREACHABLE,
  IbkrErrorCode.FLEX_STATEMENT_FAILED,
])

export function formatIbkrError(
  t: unknown,
  error?: string | null,
  errorParams?: Record<string, string | number>,
): string {
  const translate = asTranslateFn(t)

  if (!error) return translate('ibkrSync.errors.UNKNOWN')

  if (isIbkrErrorCode(error)) {
    return translate(`ibkrSync.errors.${error}`, errorParams)
  }

  return translate('ibkrSync.errors.UNKNOWN')
}

/**
 * Pairs the message with the one action that actually resolves it. Flex failures
 * are almost always a config mistake in Client Portal, so a bare error string
 * would leave the user with nowhere to go.
 */
export function getIbkrErrorToastContent(
  t: unknown,
  error?: string | null,
  errorParams?: Record<string, string | number>,
): { title: string; description?: string } {
  const translate = asTranslateFn(t)
  const code = error && isIbkrErrorCode(error) ? error : null
  const title = formatIbkrError(t, error, errorParams)

  if (code && QUERY_HINT_CODES.has(code)) {
    return { title, description: translate('ibkrSync.errors.hintEditQuery') }
  }

  if (code && TOKEN_HINT_CODES.has(code)) {
    return { title, description: translate('ibkrSync.errors.hintRegenerateToken') }
  }

  if (code && RETRY_HINT_CODES.has(code)) {
    return { title, description: translate('ibkrSync.errors.hintRetryShortly') }
  }

  if (code === IbkrErrorCode.QUERY_UNPARSEABLE_DATES) {
    return { title, description: translate('ibkrSync.errors.hintDateFormat') }
  }

  if (code === IbkrErrorCode.FLEX_IP_RESTRICTED) {
    return { title, description: translate('ibkrSync.errors.hintIpRestriction') }
  }

  return { title }
}
