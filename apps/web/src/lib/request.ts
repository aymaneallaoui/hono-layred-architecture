import type { ClientResponse } from 'hono/client'
import type { SuccessStatusCode } from 'hono/utils/http-status'

import { ApiError } from '@/lib/errors'

export type SuccessBody<R> =
  R extends ClientResponse<infer Body, infer Status, infer Format>
    ? Status extends SuccessStatusCode
      ? Format extends 'json'
        ? Body
        : void
      : never
    : never

export async function request<R extends ClientResponse<unknown>>(
  call: () => Promise<R>,
): Promise<SuccessBody<R>> {
  const response = await call()
  if (!response.ok) throw await toApiError(response)
  if (response.status === 204) return undefined as SuccessBody<R>
  return (await response.json()) as SuccessBody<R>
}

export async function toApiError(response: Response): Promise<ApiError> {
  const value = await parseBody(response)
  const retryAfter = Number(response.headers.get('retry-after'))
  return new ApiError(response.status, value, retryAfter > 0 ? Math.ceil(retryAfter) : null)
}

async function parseBody(response: Response): Promise<unknown> {
  const text = await response.text().catch(() => '')
  if (!text) return null
  try {
    return JSON.parse(text) as unknown
  } catch {
    return text
  }
}
