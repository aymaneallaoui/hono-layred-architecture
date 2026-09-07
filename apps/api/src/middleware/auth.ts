import { createMiddleware } from 'hono/factory'

import type { Container } from '@/container'
import type { Account, Role } from '@/models/auth'
import { EmailNotVerifiedError, ForbiddenError, UnauthorizedError } from '@/models/errors'

export type AuthOptions = boolean | { roles?: readonly Role[]; verified?: boolean }

export type AuthEnv = { Variables: { account: Account } }

export function createAuthMiddleware({
  auth,
  authService,
}: Pick<Container, 'auth' | 'authService'>) {
  return (options: AuthOptions = true) => {
    const policy = typeof options === 'boolean' ? {} : options
    return createMiddleware<AuthEnv>(async (c, next) => {
      const resolved = await auth.api.getSession({ headers: c.req.raw.headers })
      if (!resolved) throw new UnauthorizedError('Invalid or expired session.')

      const account = await authService.resolveAccount({
        sessionId: resolved.session.id,
        activeOrganizationId: resolved.session.activeOrganizationId ?? null,
        user: resolved.user,
      })

      if (policy.roles && !policy.roles.includes(account.role)) {
        throw new ForbiddenError('You do not have permission to perform this action.')
      }
      if (policy.verified && !account.emailVerified) throw new EmailNotVerifiedError()

      c.set('account', account)
      await next()
    })
  }
}

export type AuthMiddleware = ReturnType<typeof createAuthMiddleware>
