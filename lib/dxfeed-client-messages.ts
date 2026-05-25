import { DxFeedErrorCode, isDxFeedErrorCode } from '@/lib/dxfeed-errors'

/** Loose translator; useI18n `t` is cast internally for next-international strict keys. */
type TranslateFn = (key: string, params?: Record<string, string | number>) => string

function asTranslateFn(t: unknown): TranslateFn {
  return t as TranslateFn
}

const SUPPORT_HINT_CODES: Set<string> = new Set([
  DxFeedErrorCode.CONFIG_NOT_SET,
  DxFeedErrorCode.PROP_FIRM_UNSUPPORTED,
  DxFeedErrorCode.PROP_FIRMS_UNAVAILABLE,
  DxFeedErrorCode.HISTORICAL_HOST_UNRESOLVED,
])

const RECONNECT_HINT_CODES: Set<string> = new Set([
  DxFeedErrorCode.MISSING_PROP_FIRM_RECONNECT,
  DxFeedErrorCode.NO_TOKEN_RECONNECT,
  DxFeedErrorCode.INVALID_STORED_CREDENTIALS,
  DxFeedErrorCode.SYNC_ACCOUNTS_UNAVAILABLE,
  DxFeedErrorCode.SYNC_FETCH_FAILED,
])

/**
 * Maps server error codes (and legacy English strings) to localized user messages.
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

  // Legacy English messages from older server responses (pre–error-code)
  const legacyMap: Record<string, string> = {
    'DxFeed configuration not set': DxFeedErrorCode.CONFIG_NOT_SET,
    'Please select a supported prop firm': DxFeedErrorCode.PROP_FIRM_UNSUPPORTED,
    'User not authenticated': DxFeedErrorCode.USER_NOT_AUTHENTICATED,
    'Failed to authenticate with DxFeed': DxFeedErrorCode.AUTH_UNEXPECTED,
    'Invalid stored DxFeed credentials': DxFeedErrorCode.INVALID_STORED_CREDENTIALS,
    'Missing prop firm. Please reconnect your DxFeed account.':
      DxFeedErrorCode.MISSING_PROP_FIRM_RECONNECT,
    'No DxFeed token found': DxFeedErrorCode.NO_TOKEN_RECONNECT,
    'Failed to get trades': DxFeedErrorCode.SYNC_FAILED,
    DUPLICATE_TRADES: DxFeedErrorCode.DUPLICATE_TRADES,
  }

  const code = legacyMap[error]
  if (code) {
    return translate(`dxfeedSync.errors.${code}`, errorParams)
  }

  if (error.startsWith('Authentication failed (')) {
    return translate('dxfeedSync.errors.AUTH_HTTP_ERROR', {
      detail: error.replace('Authentication failed ', ''),
    })
  }

  if (error.startsWith('These credentials are for ')) {
    return error
  }

  if (error.startsWith('Could not resolve trade history server for ')) {
    const propfirm = error.replace('Could not resolve trade history server for ', '')
    return translate('dxfeedSync.errors.HISTORICAL_HOST_UNRESOLVED', { propfirm })
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

  if (code === DxFeedErrorCode.AUTH_PROP_FIRM_MISMATCH) {
    return { title, description: translate('dxfeedSync.errors.hintPropFirmMismatch') }
  }

  if (code === DxFeedErrorCode.AUTH_REJECTED || code === DxFeedErrorCode.AUTH_HTTP_ERROR) {
    return { title, description: translate('dxfeedSync.errors.hintCheckCredentials') }
  }

  return { title }
}
