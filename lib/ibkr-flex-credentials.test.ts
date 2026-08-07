import { describe, expect, it } from 'vitest'
import {
  isValidFlexQueryId,
  isValidFlexToken,
  parseIbkrCredentialsInput,
} from './ibkr-flex-credentials'

describe('parseIbkrCredentialsInput', () => {
  it('splits a token and query ID pasted on separate lines', () => {
    expect(parseIbkrCredentialsInput('123456789012345\n987654')).toEqual({
      token: '123456789012345',
      queryId: '987654',
    })
  })

  it('splits values pasted on one line in either order', () => {
    expect(parseIbkrCredentialsInput('123456789012345 987654')).toEqual({
      token: '123456789012345',
      queryId: '987654',
    })
    expect(parseIbkrCredentialsInput('987654 123456789012345')).toEqual({
      token: '123456789012345',
      queryId: '987654',
    })
  })

  it('honours labels from Client Portal', () => {
    const input = 'Token: 111122223333444\nQuery ID: 555666'
    expect(parseIbkrCredentialsInput(input)).toEqual({
      token: '111122223333444',
      queryId: '555666',
    })
  })

  it('honours labels even when the shape heuristic would disagree', () => {
    // Both values are long enough to look like tokens; the labels decide.
    const input = 'queryid=12345678 token=987654321098765'
    expect(parseIbkrCredentialsInput(input)).toEqual({
      token: '987654321098765',
      queryId: '12345678',
    })
  })

  it('reports the missing half when only one value is pasted', () => {
    expect(parseIbkrCredentialsInput('123456789012345')).toEqual({
      token: '123456789012345',
      queryId: null,
    })
    expect(parseIbkrCredentialsInput('987654')).toEqual({
      token: null,
      queryId: '987654',
    })
  })

  it('ignores surrounding prose', () => {
    const input = 'Here is my token 123456789012345 and the query is 987654, thanks'
    expect(parseIbkrCredentialsInput(input)).toEqual({
      token: '123456789012345',
      queryId: '987654',
    })
  })

  it('returns nulls for empty input', () => {
    expect(parseIbkrCredentialsInput('')).toEqual({ token: null, queryId: null })
    expect(parseIbkrCredentialsInput('   ')).toEqual({ token: null, queryId: null })
  })
})

describe('flex credential validators', () => {
  it('accepts realistic values', () => {
    expect(isValidFlexToken('123456789012345')).toBe(true)
    expect(isValidFlexQueryId('987654')).toBe(true)
  })

  it('rejects short tokens and non-numeric input', () => {
    expect(isValidFlexToken('12345')).toBe(false)
    expect(isValidFlexToken('abcdefghijkl')).toBe(false)
    expect(isValidFlexQueryId('12')).toBe(false)
    expect(isValidFlexQueryId('1234567890')).toBe(false)
  })
})
