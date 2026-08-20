import { DxFeedErrorCode, isDxFeedErrorCode } from '@/lib/dxfeed-errors'

/** Loose translator; useI18n `t` is cast internally for next-international strict keys. */
type TranslateFn = (key: string, params?: Record<string, string | number>) => string

function asTranslateFn(t: unknown): TranslateFn {
  return t as TranslateFn
}

const SUPPORT_HINT_CODES: Set<string> = new Set([
  DxFeedErrorCode.CONFIG_NOT_SET,
  DxFeedErrorCode.HISTORICAL_HOST_UNRESOLVED,
])

const RECONNECT_HINT_CODES: Set<string> = new Set([
  DxFeedErrorCode.NO_TOKEN_RECONNECT,
  DxFeedErrorCode.TOKEN_EXPIRED,
  DxFeedErrorCode.INVALID_STORED_CREDENTIALS,
  DxFeedErrorCode.SYNC_ACCOUNTS_UNAVAILABLE,
  DxFeedErrorCode.SYNC_FETCH_FAILED,
])

/**
 * Maps server error codes to localized user messages.
 */
export function formatDxFeedError(
  t: unknown,
  error?: string | null,
  errorParams?: Record<string, string | number>,
): string {
  const translate = asTranslateFn(t)

  if (!error) {
    return translate('dxfeedSync.errors.UNKNOWN')
  }

  if (isDxFeedErrorCode(error)) {
    return translate(`dxfeedSync.errors.${error}`, errorParams)
  }

  return translate('dxfeedSync.errors.UNKNOWN')
}

export function getDxFeedErrorToastContent(
  t: unknown,
  error?: string | null,
  errorParams?: Record<string, string | number>,
): { title: string; description?: string } {
  const translate = asTranslateFn(t)
  const code = error && isDxFeedErrorCode(error) ? error : null
  const title = formatDxFeedError(t, error, errorParams)

  if (code && SUPPORT_HINT_CODES.has(code)) {
    return { title, description: translate('dxfeedSync.errors.hintContactSupport') }
  }

  if (code && RECONNECT_HINT_CODES.has(code)) {
    return { title, description: translate('dxfeedSync.errors.hintReconnect') }
  }

  if (code === DxFeedErrorCode.AUTH_REJECTED || code === DxFeedErrorCode.AUTH_HTTP_ERROR) {
    return { title, description: translate('dxfeedSync.errors.hintCheckCredentials') }
  }

  return { title }
}
