import { expect, test } from '../fixtures'

test('invites a teammate from the team page and can revoke it', async ({ page, seed }) => {
  const owner = await seed.user({ organizationName: 'Orbital Works' })
  const inviteeEmail = seed.email()

  await seed.authenticate(page.context(), owner)
  await page.goto('/team')
  const form = page.getByRole('form', { name: 'Invite a teammate' })
  await form.getByLabel('Email address', { exact: true }).fill(inviteeEmail)
  await form.getByLabel('Role').selectOption('admin')
  await form.getByRole('button', { name: 'Send invitation' }).click()

  const pending = page
    .getByRole('list', { name: 'Pending invitations' })
    .getByRole('listitem')
    .filter({ hasText: inviteeEmail })
  await expect(pending).toContainText('admin')
  await pending.getByRole('button', { name: 'Revoke' }).click()
  await expect(pending).toHaveCount(0)
})

test('an invited user accepts and joins with the invited role', async ({ page, seed }) => {
  const owner = await seed.user({ organizationName: 'Orbital Works' })
  const invitee = await seed.user()
  const token = await seed.inviteToken(owner, invitee.email, 'admin')

  await page.goto(`/accept-invite?token=${token}`)
  await expect(page.getByRole('heading', { name: 'Join Orbital Works' })).toBeVisible()
  await page.getByRole('link', { name: 'I already have one' }).click()
  await expect(page).toHaveURL(/\/sign-in\?redirect=/)

  await page.getByLabel('Email address', { exact: true }).fill(invitee.email)
  await page.getByLabel('Password', { exact: true }).fill(invitee.password)
  await page.getByRole('button', { name: 'Sign in' }).click()
  await expect(page.getByRole('heading', { name: 'Join Orbital Works' })).toBeVisible()

  await page.getByRole('button', { name: 'Accept invitation' }).click()
  await expect(page).toHaveURL(/\/dashboard$/)
  await expect(page.getByRole('banner')).toContainText('Orbital Works')
  await expect.poll(() => seed.membershipRole(invitee.userId, 'Orbital Works')).toBe('admin')

  await page.goto('/team')
  const members = page.getByRole('list', { name: 'Members' }).getByRole('listitem')
  await expect(members.filter({ hasText: owner.email })).toContainText('owner')
  await expect(members.filter({ hasText: invitee.email })).toContainText('admin')
})
