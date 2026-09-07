import { betterAuth } from 'better-auth'
import type { Pool } from 'pg'
import { uuidv7 } from 'uuidv7'

import { env, isProd } from '@/infra/env'
import type { Mailer } from '@/infra/mail'

export interface AuthDeps {
  pool: Pool
  mailer: Mailer
  trustedOrigins: string[]
}

export function createAuth({ pool, mailer, trustedOrigins }: AuthDeps) {
  return betterAuth({
    appName: env.APP_NAME,
    baseURL: env.API_URL,
    basePath: '/api/auth',
    secret: env.BETTER_AUTH_SECRET,
    trustedOrigins,
    database: pool,
    advanced: {
      database: { generateId: () => uuidv7() },
      useSecureCookies: isProd,
      ipAddress: {
        ipAddressHeaders: ['x-forwarded-for'],
        trustedProxies: ['10.0.0.0/8', '172.16.0.0/12', '192.168.0.0/16', '127.0.0.0/8'],
      },
    },
    emailAndPassword: {
      enabled: true,
      requireEmailVerification: false,
      minPasswordLength: 8,
      maxPasswordLength: 128,
      autoSignIn: true,
      revokeSessionsOnPasswordReset: true,
      resetPasswordTokenExpiresIn: env.PASSWORD_RESET_TTL_MINUTES * 60,
      sendResetPassword: async ({ user, token }) => {
        await mailer.sendPasswordReset(user.email, {
          name: user.name,
          resetUrl: `${env.WEB_URL}/reset-password?token=${token}`,
          expiresInMinutes: env.PASSWORD_RESET_TTL_MINUTES,
        })
      },
    },
    emailVerification: {
      sendOnSignUp: true,
      autoSignInAfterVerification: false,
      expiresIn: env.EMAIL_VERIFICATION_TTL_HOURS * 3600,
      sendVerificationEmail: async ({ user, token }) => {
        await mailer.sendEmailVerification(user.email, {
          name: user.name,
          verifyUrl: `${env.WEB_URL}/verify-email?token=${token}`,
          expiresInHours: env.EMAIL_VERIFICATION_TTL_HOURS,
        })
      },
    },
    user: {
      modelName: 'app_user',
      fields: {
        emailVerified: 'email_verified',
        createdAt: 'created_at',
        updatedAt: 'updated_at',
      },
    },
    session: {
      expiresIn: 60 * 60 * 24 * 30,
      updateAge: 60 * 60 * 24,
      fields: {
        userId: 'user_id',
        expiresAt: 'expires_at',
        ipAddress: 'ip_address',
        userAgent: 'user_agent',
        createdAt: 'created_at',
        updatedAt: 'updated_at',
      },
      additionalFields: {
        activeOrganizationId: {
          type: 'string',
          required: false,
          input: false,
          fieldName: 'active_organization_id',
        },
      },
    },
    account: {
      fields: {
        userId: 'user_id',
        accountId: 'account_id',
        providerId: 'provider_id',
        accessToken: 'access_token',
        refreshToken: 'refresh_token',
        idToken: 'id_token',
        accessTokenExpiresAt: 'access_token_expires_at',
        refreshTokenExpiresAt: 'refresh_token_expires_at',
        createdAt: 'created_at',
        updatedAt: 'updated_at',
      },
    },
    verification: {
      fields: {
        expiresAt: 'expires_at',
        createdAt: 'created_at',
        updatedAt: 'updated_at',
      },
    },
    rateLimit: {
      enabled: isProd,
      window: env.RATE_LIMIT_AUTH_WINDOW_SEC,
      max: env.RATE_LIMIT_AUTH_MAX,
    },
  })
}

export type Auth = ReturnType<typeof createAuth>
export type AuthSession = Auth['$Infer']['Session']
