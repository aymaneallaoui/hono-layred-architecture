import { faker } from '@faker-js/faker'
import { type BrowserContext, test as base } from '@playwright/test'
import {
  createUser,
  inviteToken,
  isEmailVerified,
  membershipRole,
  type SeededUser,
  signInCookie,
  verificationToken,
} from 'api/testing/e2e-seed'

import { seedConfig, WEB_URL } from './config'

export interface Seed {
  user(input?: Partial<Parameters<typeof createUser>[1]>): Promise<SeededUser>
  authenticate(context: BrowserContext, user: SeededUser): Promise<void>
  inviteToken(inviter: SeededUser, email: string, role?: 'admin' | 'member'): Promise<string>
  verificationToken(email: string): Promise<string>
  isEmailVerified(email: string): Promise<boolean>
  membershipRole(userId: string, organizationName: string): Promise<string | null>
  email(): string
}

export const test = base.extend<{ seed: Seed }>({
  // eslint-disable-next-line no-empty-pattern
  seed: async ({}, use) => {
    const config = seedConfig()
    const email = () => `e2e-${faker.string.uuid()}@example.com`
    await use({
      email,
      user: (input = {}) =>
        createUser(config, {
          email: input.email ?? email(),
          password: input.password ?? 'Correct-horse-battery-1',
          name: input.name ?? faker.person.fullName(),
          organizationName: input.organizationName,
          verified: input.verified,
        }),
      authenticate: async (context, user) => {
        const cookie = await signInCookie(config, user)
        await context.addCookies([{ ...cookie, url: WEB_URL, httpOnly: true, sameSite: 'Lax' }])
      },
      inviteToken: (inviter, to, role = 'member') =>
        inviteToken(config, inviter, { email: to, role }),
      verificationToken: (address) => verificationToken(config, address),
      isEmailVerified: (address) => isEmailVerified(config, address),
      membershipRole: (userId, organizationName) =>
        membershipRole(config, userId, organizationName),
    })
  },
})

export { expect } from '@playwright/test'
