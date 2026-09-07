import { createRoute } from '@hono/zod-openapi'
import { APIError } from 'better-auth/api'

import { json, jsonBody, sessionSecurity } from '@/http/openapi'
import { createRouter } from '@/http/router'
import { env } from '@/infra/env'
import { membershipsResponse, registerBody, sessionResponse, switchOrgBody } from '@/models/auth'
import { errorResponses as e } from '@/models/error'
import { ConflictError } from '@/models/errors'
import { asId, type OrganizationId, type UserId } from '@/models/ids'
import type { RouteDeps } from '@/routes/deps'
import { normalizeEmail } from '@/utils/text'

const TAGS = ['Auth']

const REGISTER_LIMIT = {
  scope: 'register',
  by: 'ip',
  max: env.RATE_LIMIT_AUTH_MAX,
  windowSeconds: env.RATE_LIMIT_AUTH_WINDOW_SEC,
} as const

export const authRoutes = ({ container, requireAuth, rateLimit }: RouteDeps) => {
  const { auth, authService } = container
  return createRouter()
    .openapi(
      createRoute({
        method: 'post',
        path: '/register',
        tags: TAGS,
        summary: 'Create an account and its workspace',
        middleware: [rateLimit(REGISTER_LIMIT)] as const,
        request: { body: jsonBody(registerBody) },
        responses: {
          201: json(sessionResponse, 'The new user, signed in to their workspace'),
          ...e.conflict,
          ...e.validation,
          ...e.rateLimited,
          ...e.server,
        },
      }),
      async (c) => {
        const body = c.req.valid('json')
        const email = normalizeEmail(body.email)
        let signedUp: { headers: Headers; response: { user: { id: string } } }
        try {
          signedUp = await auth.api.signUpEmail({
            body: { email, password: body.password, name: body.name.trim() },
            headers: c.req.raw.headers,
            returnHeaders: true,
          })
        } catch (error) {
          if (error instanceof APIError && error.body?.code?.startsWith('USER_ALREADY_EXISTS')) {
            throw new ConflictError('Email is already registered.')
          }
          throw error
        }

        for (const cookie of signedUp.headers.getSetCookie()) {
          c.header('set-cookie', cookie, { append: true })
        }

        const session = await authService.completeRegistration(
          asId<UserId>(signedUp.response.user.id),
          body.organizationName,
        )
        return c.json(session, 201)
      },
    )
    .openapi(
      createRoute({
        method: 'get',
        path: '/me',
        tags: TAGS,
        summary: 'The signed-in user and active organization',
        middleware: [requireAuth()] as const,
        security: sessionSecurity,
        responses: { 200: json(sessionResponse, 'The current session'), ...e.base },
      }),
      async (c) => c.json(await authService.me(c.var.account), 200),
    )
    .openapi(
      createRoute({
        method: 'get',
        path: '/memberships',
        tags: TAGS,
        summary: 'Every organization the user belongs to',
        middleware: [requireAuth()] as const,
        security: sessionSecurity,
        responses: { 200: json(membershipsResponse, 'Memberships, oldest first'), ...e.base },
      }),
      async (c) => c.json(await authService.listMemberships(c.var.account.userId), 200),
    )
    .openapi(
      createRoute({
        method: 'post',
        path: '/switch-org',
        tags: TAGS,
        summary: 'Change the active organization for this session',
        middleware: [requireAuth()] as const,
        security: sessionSecurity,
        request: { body: jsonBody(switchOrgBody) },
        responses: {
          200: json(sessionResponse, 'The session with its new active organization'),
          ...e.base,
          ...e.forbidden,
          ...e.validation,
        },
      }),
      async (c) => {
        const { account } = c.var
        const { organizationId } = c.req.valid('json')
        const session = await authService.switchOrganization(
          account.userId,
          asId<OrganizationId>(organizationId),
          account.sessionId,
        )
        return c.json(session, 200)
      },
    )
}
