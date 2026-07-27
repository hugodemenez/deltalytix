/**
 * Credential extraction for the IBKR Flex connection form.
 *
 * The Flex Web Service needs two values that live on different screens of
 * Client Portal: a long numeric token and a short numeric query ID. Rather than
 * make the user label them correctly across two inputs, the connect form takes
 * one paste and we work out which is which — they are trivially separable by
 * length, and labelled text is honoured when present.
 */

export interface IbkrFlexCredentials {
  token: string
  queryId: string
}

/** Flex tokens are long numeric strings; query IDs are short ones. */
const MIN_TOKEN_LENGTH = 10
const MIN_QUERY_ID_LENGTH = 4
const MAX_QUERY_ID_LENGTH = 9

function findLabelled(input: string, labels: string[]): string | null {
  for (const label of labels) {
    // e.g. "Query ID: 1234567", "token=987...", "Token   987..."
    const pattern = new RegExp(`${label}\\s*[:=]?\\s*(\\d{${MIN_QUERY_ID_LENGTH},})`, 'i')
    const match = input.match(pattern)
    if (match) return match[1]
  }
  return null
}

export function isValidFlexToken(value: string): boolean {
  return /^\d+$/.test(value) && value.length >= MIN_TOKEN_LENGTH
}

export function isValidFlexQueryId(value: string): boolean {
  return (
    /^\d+$/.test(value) &&
    value.length >= MIN_QUERY_ID_LENGTH &&
    value.length <= MAX_QUERY_ID_LENGTH
  )
}

/**
 * Pulls a token and query ID out of free-form pasted text.
 *
 * Accepts the two values on separate lines, space-separated, or with the labels
 * Client Portal shows next to them. Returns null for whichever value cannot be
 * identified so the caller can ask for just that one.
 */
export function parseIbkrCredentialsInput(raw: string): {
  token: string | null
  queryId: string | null
} {
  const input = (raw ?? '').trim()
  if (!input) return { token: null, queryId: null }

  const labelledToken = findLabelled(input, ['token'])
  const labelledQueryId = findLabelled(input, ['query\\s*id', 'queryid', 'query'])

  let token = labelledToken && isValidFlexToken(labelledToken) ? labelledToken : null
  let queryId = labelledQueryId && isValidFlexQueryId(labelledQueryId) ? labelledQueryId : null

  if (token && queryId) return { token, queryId }

  // Fall back to shape: the longest numeric run is the token, the longest of
  // the rest that fits a query ID is the query ID.
  const numbers = (input.match(/\d+/g) ?? []).slice().sort((a, b) => b.length - a.length)

  if (!token) {
    token = numbers.find((n) => isValidFlexToken(n) && n !== queryId) ?? null
  }
  if (!queryId) {
    queryId = numbers.find((n) => isValidFlexQueryId(n) && n !== token) ?? null
  }

  return { token, queryId }
}
