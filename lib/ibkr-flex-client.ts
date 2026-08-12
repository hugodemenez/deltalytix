/**
 * IBKR Flex Web Service v3 client.
 *
 * Two-step protocol: SendRequest returns a reference code identifying a report
 * instance IBKR generates asynchronously; GetStatement fetches it once ready.
 *
 * Docs: https://www.interactivebrokers.com/campus/ibkr-api-page/flex-web-service/
 * Error codes: https://www.ibkrguides.com/clientportal/flex3.htm
 */

import {
  IbkrErrorCode,
  isFlexRetryableError,
  mapFlexNumericError,
  type IbkrErrorCodeValue,
  type IbkrErrorParams,
} from './ibkr-flex-errors'
import { extractText } from './ibkr-flex-xml'

const FLEX_BASE_URL =
  process.env.IBKR_FLEX_BASE_URL ??
  'https://ndcdyn.interactivebrokers.com/AccountManagement/FlexWebService'

/** IBKR rejects requests without a User-Agent. */
const USER_AGENT = process.env.IBKR_FLEX_USER_AGENT ?? 'Deltalytix/1.0'

/**
 * Flex allows 1 request/second and 10/minute per token (error 1018). The report
 * also needs a moment to generate, so we poll GetStatement on a delay.
 */
const STATEMENT_POLL_DELAY_MS = Math.max(
  1000,
  Number(process.env.IBKR_FLEX_POLL_DELAY_MS ?? '3000'),
)
const STATEMENT_MAX_ATTEMPTS = Math.max(
  1,
  Number(process.env.IBKR_FLEX_MAX_ATTEMPTS ?? '5'),
)
const REQUEST_TIMEOUT_MS = Math.max(
  5000,
  Number(process.env.IBKR_FLEX_TIMEOUT_MS ?? '30000'),
)

const logger = {
  info: (message: string) => console.log(`[IBKR-FLEX] ${message}`),
  warn: (message: string) => console.warn(`[IBKR-FLEX] ${message}`),
  error: (message: string, error?: unknown) =>
    console.error(`[IBKR-FLEX] ${message}`, error instanceof Error ? error.message : ''),
}

export interface FlexFailure {
  error: IbkrErrorCodeValue
  errorParams?: IbkrErrorParams
}

export type FlexResult<T> = ({ ok: true } & T) | ({ ok: false } & FlexFailure)

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Reads the `<Status>Fail</Status>` envelope both endpoints share. Returns null
 * when the payload is not an error.
 */
function readFlexError(xml: string): FlexFailure | null {
  const status = extractText(xml, 'Status')
  if (status && status.toLowerCase() !== 'fail') return null

  const errorCode = extractText(xml, 'ErrorCode')
  const errorMessage = extractText(xml, 'ErrorMessage')

  // A success payload has no Status element at all (GetStatement returns the
  // report directly), so only treat this as an error if IBKR said so.
  if (!status && !errorCode) return null

  return {
    error: mapFlexNumericError(errorCode),
    errorParams: {
      code: errorCode ?? 'unknown',
      detail: errorMessage ?? 'No detail provided',
    },
  }
}

async function flexFetch(url: string): Promise<FlexResult<{ body: string }>> {
  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        // Mandatory: IBKR blocks requests without it.
        'User-Agent': USER_AGENT,
        Accept: 'text/xml, application/xml, */*',
      },
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      cache: 'no-store',
    })

    if (!response.ok) {
      return {
        ok: false,
        error: IbkrErrorCode.FLEX_HTTP_ERROR,
        errorParams: { status: response.status },
      }
    }

    return { ok: true, body: await response.text() }
  } catch (error) {
    logger.error('Flex request failed', error)
    return { ok: false, error: IbkrErrorCode.FLEX_UNREACHABLE }
  }
}

/** Step 1: ask IBKR to generate a report instance for this query. */
export async function sendFlexRequest(
  token: string,
  queryId: string,
): Promise<FlexResult<{ referenceCode: string }>> {
  const url = `${FLEX_BASE_URL}/SendRequest?t=${encodeURIComponent(token)}&q=${encodeURIComponent(queryId)}&v=3`
  const response = await flexFetch(url)
  if (!response.ok) return response

  const failure = readFlexError(response.body)
  if (failure) {
    logger.warn(`SendRequest rejected: ${failure.error} (${failure.errorParams?.code})`)
    return { ok: false, ...failure }
  }

  const referenceCode = extractText(response.body, 'ReferenceCode')
  if (!referenceCode) {
    logger.warn('SendRequest returned no reference code')
    return { ok: false, error: IbkrErrorCode.FLEX_MALFORMED_RESPONSE }
  }

  return { ok: true, referenceCode }
}

/**
 * Step 2: fetch the generated report, polling while IBKR reports it is still
 * being built (error 1019).
 */
export async function getFlexStatement(
  token: string,
  referenceCode: string,
): Promise<FlexResult<{ xml: string }>> {
  const url = `${FLEX_BASE_URL}/GetStatement?t=${encodeURIComponent(token)}&q=${encodeURIComponent(referenceCode)}&v=3`

  let lastFailure: FlexFailure = { error: IbkrErrorCode.FLEX_STATEMENT_TIMEOUT }

  for (let attempt = 0; attempt < STATEMENT_MAX_ATTEMPTS; attempt++) {
    // IBKR needs time to build the report; requesting immediately reliably
    // returns 1019, so wait before every attempt including the first.
    await sleep(STATEMENT_POLL_DELAY_MS)

    const response = await flexFetch(url)
    if (!response.ok) {
      lastFailure = response
      // A transport failure will not resolve itself by polling.
      break
    }

    const failure = readFlexError(response.body)
    if (!failure) {
      return { ok: true, xml: response.body }
    }

    lastFailure = failure
    if (!isFlexRetryableError(String(failure.errorParams?.code ?? ''))) {
      logger.warn(`GetStatement rejected: ${failure.error} (${failure.errorParams?.code})`)
      break
    }

    logger.info(
      `Statement still generating, retrying (${attempt + 1}/${STATEMENT_MAX_ATTEMPTS})`,
    )
  }

  return { ok: false, ...lastFailure }
}

/** Runs the full two-step Flex exchange and returns the report XML. */
export async function fetchFlexStatement(
  token: string,
  queryId: string,
): Promise<FlexResult<{ xml: string }>> {
  const request = await sendFlexRequest(token, queryId)
  if (!request.ok) return request

  return getFlexStatement(token, request.referenceCode)
}
