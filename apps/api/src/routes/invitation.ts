import { createRoute } from '@hono/zod-openapi'

import { json, sessionSecurity } from '@/http/openapi'
import { createRouter } from '@/http/router'
import { membershipContextSchema } from '@/models/auth'
import { errorResponses as e } from '@/models/error'
import { invitationPreviewSchema, invitationTokenParams } from '@/models/invitation'
import type { RouteDeps } from '@/routes/deps'

const TAGS = ['Organization']

export const invitationRoutes = ({ container, requireAuth }: RouteDeps) =>
  createRouter()
    .openapi(
      createRoute({
        method: 'get',
        path: '/{token}',
        tags: TAGS,
        summary: 'Preview an invitation before signing in',
        request: { params: invitationTokenParams },
        responses: {
          200: json(invitationPreviewSchema, 'Who invited whom, and to which role'),
          ...e.notFound,
          ...e.gone,
          ...e.validation,
        },
      }),
      async (c) => {
        const { token } = c.req.valid('param')
        return c.json(await container.invitationService.preview(token), 200)
      },
    )
    .openapi(
      createRoute({
        method: 'post',
        path: '/{token}/accept',
        tags: TAGS,
        summary: 'Join the organization behind an invitation',
        middleware: [requireAuth()] as const,
        security: sessionSecurity,
        request: { params: invitationTokenParams },
        responses: {
          200: json(membershipContextSchema, 'The new membership'),
          ...e.base,
          ...e.forbidden,
          ...e.notFound,
          ...e.conflict,
          ...e.gone,
          ...e.validation,
        },
      }),
      async (c) => {
        const { token } = c.req.valid('param')
        return c.json(await container.invitationService.accept(token, c.var.account), 200)
      },
    )
