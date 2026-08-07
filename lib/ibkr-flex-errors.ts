/**
 * Stable error codes returned by IBKR Flex server actions / API routes.
 * The client maps these to localized messages via formatIbkrError().
 */

export const IbkrErrorCode = {
  USER_NOT_AUTHENTICATED: 'USER_NOT_AUTHENTICATED',

  // Credential input
  CREDENTIALS_REQUIRED: 'CREDENTIALS_REQUIRED',
  TOKEN_MALFORMED: 'TOKEN_MALFORMED',
  QUERY_ID_MALFORMED: 'QUERY_ID_MALFORMED',
  INVALID_STORED_CREDENTIALS: 'INVALID_STORED_CREDENTIALS',
  NO_CREDENTIALS_RECONNECT: 'NO_CREDENTIALS_RECONNECT',
  DUPLICATE_CONNECTION: 'DUPLICATE_CONNECTION',

  // Flex Web Service transport
  FLEX_HTTP_ERROR: 'FLEX_HTTP_ERROR',
  FLEX_UNREACHABLE: 'FLEX_UNREACHABLE',
  FLEX_MALFORMED_RESPONSE: 'FLEX_MALFORMED_RESPONSE',
  FLEX_STATEMENT_TIMEOUT: 'FLEX_STATEMENT_TIMEOUT',

  // Flex Web Service documented failures (mapped from numeric ErrorCode)
  FLEX_TOKEN_EXPIRED: 'FLEX_TOKEN_EXPIRED',
  FLEX_TOKEN_INVALID: 'FLEX_TOKEN_INVALID',
  FLEX_IP_RESTRICTED: 'FLEX_IP_RESTRICTED',
  FLEX_QUERY_INVALID: 'FLEX_QUERY_INVALID',
  FLEX_REFERENCE_INVALID: 'FLEX_REFERENCE_INVALID',
  FLEX_ACCOUNT_INVALID: 'FLEX_ACCOUNT_INVALID',
  FLEX_SERVICE_INACTIVE: 'FLEX_SERVICE_INACTIVE',
  FLEX_RATE_LIMITED: 'FLEX_RATE_LIMITED',
  FLEX_LEGACY_QUERY: 'FLEX_LEGACY_QUERY',
  FLEX_STATEMENT_FAILED: 'FLEX_STATEMENT_FAILED',
  FLEX_UNKNOWN_ERROR: 'FLEX_UNKNOWN_ERROR',

  // Query shape problems the user must fix in Client Portal
  QUERY_HAS_NO_TRADES_SECTION: 'QUERY_HAS_NO_TRADES_SECTION',
  QUERY_MISSING_FIELDS: 'QUERY_MISSING_FIELDS',
  QUERY_UNPARSEABLE_DATES: 'QUERY_UNPARSEABLE_DATES',

  // Sync outcomes
  NO_TRADES_IN_RANGE: 'NO_TRADES_IN_RANGE',
  OPEN_POSITIONS_ONLY: 'OPEN_POSITIONS_ONLY',
  DUPLICATE_TRADES: 'DUPLICATE_TRADES',
  SAVE_TRADES_FAILED: 'SAVE_TRADES_FAILED',
  SYNC_FAILED: 'SYNC_FAILED',

  // Plumbing
  ACCOUNT_ID_REQUIRED: 'ACCOUNT_ID_REQUIRED',
  LOAD_SYNCHRONIZATIONS_FAILED: 'LOAD_SYNCHRONIZATIONS_FAILED',
  DELETE_SYNC_FAILED: 'DELETE_SYNC_FAILED',
  UPDATE_SYNC_TIME_FAILED: 'UPDATE_SYNC_TIME_FAILED',
  UNKNOWN: 'UNKNOWN',
} as const

export type IbkrErrorCodeValue = (typeof IbkrErrorCode)[keyof typeof IbkrErrorCode]

export type IbkrErrorParams = Record<string, string | number>

export function isIbkrErrorCode(value: string): value is IbkrErrorCodeValue {
  return Object.values(IbkrErrorCode).includes(value as IbkrErrorCodeValue)
}

/**
 * Flex Web Service v3 numeric error codes.
 * Source: https://www.ibkrguides.com/clientportal/flex3.htm
 *
 * Anything not listed here surfaces as FLEX_UNKNOWN_ERROR carrying IBKR's own
 * message, so an undocumented code is still actionable for the user.
 */
const FLEX_NUMERIC_ERRORS: Record<string, IbkrErrorCodeValue> = {
  '1001': IbkrErrorCode.FLEX_STATEMENT_FAILED,
  '1003': IbkrErrorCode.FLEX_STATEMENT_FAILED,
  '1004': IbkrErrorCode.FLEX_STATEMENT_FAILED,
  '1005': IbkrErrorCode.FLEX_STATEMENT_FAILED,
  '1006': IbkrErrorCode.FLEX_STATEMENT_FAILED,
  '1007': IbkrErrorCode.FLEX_STATEMENT_FAILED,
  '1008': IbkrErrorCode.FLEX_STATEMENT_FAILED,
  '1009': IbkrErrorCode.FLEX_STATEMENT_FAILED,
  '1010': IbkrErrorCode.FLEX_LEGACY_QUERY,
  '1011': IbkrErrorCode.FLEX_SERVICE_INACTIVE,
  '1012': IbkrErrorCode.FLEX_TOKEN_EXPIRED,
  '1013': IbkrErrorCode.FLEX_IP_RESTRICTED,
  '1014': IbkrErrorCode.FLEX_QUERY_INVALID,
  '1015': IbkrErrorCode.FLEX_TOKEN_INVALID,
  '1016': IbkrErrorCode.FLEX_ACCOUNT_INVALID,
  '1017': IbkrErrorCode.FLEX_REFERENCE_INVALID,
  '1018': IbkrErrorCode.FLEX_RATE_LIMITED,
  '1019': IbkrErrorCode.FLEX_STATEMENT_TIMEOUT,
  '1020': IbkrErrorCode.FLEX_STATEMENT_FAILED,
  '1021': IbkrErrorCode.FLEX_STATEMENT_FAILED,
}

export function mapFlexNumericError(code: string | null | undefined): IbkrErrorCodeValue {
  if (!code) return IbkrErrorCode.FLEX_UNKNOWN_ERROR
  return FLEX_NUMERIC_ERRORS[code.trim()] ?? IbkrErrorCode.FLEX_UNKNOWN_ERROR
}

/**
 * Code 1019 ("statement generation in progress") is the only one where retrying
 * the same reference code is the correct response.
 */
export function isFlexRetryableError(code: string | null | undefined): boolean {
  return code?.trim() === '1019'
}
