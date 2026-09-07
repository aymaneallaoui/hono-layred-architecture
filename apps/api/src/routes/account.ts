import { createRoute } from '@hono/zod-openapi'

import { json, jsonBody, sessionSecurity } from '@/http/openapi'
import { createRouter } from '@/http/router'
import { userSchema } from '@/models/auth'
import { errorResponses as e } from '@/models/error'
import { updateProfileBody } from '@/models/user'
import type { RouteDeps } from '@/routes/deps'

export const accountRoutes = ({ container, requireAuth }: RouteDeps) =>
  createRouter().openapi(
    createRoute({
      method: 'patch',
      path: '/profile',
      tags: ['Account'],
      summary: 'Update the signed-in user profile',
      middleware: [requireAuth()] as const,
      security: sessionSecurity,
      request: { body: jsonBody(updateProfileBody) },
      responses: { 200: json(userSchema, 'The updated profile'), ...e.base, ...e.validation },
    }),
    async (c) => {
      const user = await container.accountService.updateProfile(
        c.var.account.userId,
        c.req.valid('json'),
      )
      return c.json(user, 200)
    },
  )
