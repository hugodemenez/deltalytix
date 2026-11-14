import { describe, expect, it } from 'vitest'

import { rethrowIfRedirectError } from './rethrow-redirect'

function makeRedirectError(destination: string): Error {
  const error = new Error('NEXT_REDIRECT')
  // digest shape from next/dist/client/components/redirect-error
  ;(error as Error & { digest: string }).digest =
    `NEXT_REDIRECT;replace;${destination};303;`
  return error
}

describe('rethrowIfRedirectError', () => {
  it('re-throws Next.js redirect errors', () => {
    const redirectError = makeRedirectError('/fr?account_deleted=partial')
    expect(() => rethrowIfRedirectError(redirectError)).toThrow(redirectError)
  })

  it('ignores ordinary errors', () => {
    expect(() => rethrowIfRedirectError(new Error('boom'))).not.toThrow()
  })
})
