import { describe, expect, it } from 'bun:test'

import { ApiError, describeError } from './errors'
import { toApiError } from './request'

describe('toApiError', () => {
  it('reads the status, envelope, and retry-after from a failed response', async () => {
    const response = new Response(
      JSON.stringify({ error: { code: 'TOO_MANY_REQUESTS', message: 'Slow down.' } }),
      { status: 429, headers: { 'retry-after': '30', 'content-type': 'application/json' } },
    )
    const error = await toApiError(response)
    expect(error).toBeInstanceOf(ApiError)
    expect(error.status).toBe(429)
    expect(error.code).toBe('TOO_MANY_REQUESTS')
    expect(error.message).toBe('Slow down.')
    expect(error.retryAfterSeconds).toBe(30)
  })

  it('falls back to a generic message when the body is not the house envelope', async () => {
    const error = await toApiError(new Response('Bad Gateway', { status: 502 }))
    expect(error.message).toBe('Request failed (502)')
    expect(error.code).toBeNull()
  })
})

describe('describeError', () => {
  it('appends the retry hint for rate limits and passes other messages through', () => {
    expect(describeError(new ApiError(429, { error: { message: 'Too many.' } }, 12))).toBe(
      'Too many. Try again in 12s.',
    )
    expect(describeError(new Error('boom'))).toBe('boom')
    expect(describeError('?')).toBe('Something went wrong.')
  })
})
