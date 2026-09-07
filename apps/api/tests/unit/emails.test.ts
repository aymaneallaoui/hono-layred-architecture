import { render } from '@react-email/render'
import { describe, expect, it } from 'bun:test'
import { createElement } from 'react'

import { OrganizationInviteEmail } from '@/emails/organization-invite'
import { VerifyEmail } from '@/emails/verify-email'

describe('email templates', () => {
  it('renders the verification email with the link in html and plain text', async () => {
    const element = createElement(VerifyEmail, {
      name: 'Ada',
      verifyUrl: 'https://app.test/verify-email?token=abc',
      expiresInHours: 24,
    })
    const html = await render(element)
    const text = await render(element, { plainText: true })
    expect(html).toContain('href="https://app.test/verify-email?token=abc"')
    expect(text).toContain('Hi Ada, thanks for signing up')
    expect(text).toContain('https://app.test/verify-email?token=abc')
  })

  it('falls back to the team name when the inviter is unknown', async () => {
    const text = await render(
      createElement(OrganizationInviteEmail, {
        organizationName: 'Acme',
        inviterName: null,
        roleName: 'member',
        acceptUrl: 'https://app.test/accept-invite?token=xyz',
        expiresInDays: 7,
      }),
      { plainText: true },
    )
    expect(text).toContain('The Acme team invited you')
    expect(text).toContain('expires in 7 days')
  })
})
