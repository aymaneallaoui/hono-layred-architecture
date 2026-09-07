import { expect, test } from '../fixtures'

test('signs up, lands on the dashboard, and can verify the emailed token', async ({
  page,
  seed,
}) => {
  const email = seed.email()

  await page.goto('/sign-up')
  await page.getByLabel('Name', { exact: true }).fill('Ada Lovelace')
  await page.getByLabel('Email address', { exact: true }).fill(email)
  await page.getByLabel('Password', { exact: true }).fill('Correct-horse-battery-1')
  await page.getByLabel('Workspace name').fill('Analytical Engines')
  await page.getByRole('button', { name: 'Create account' }).click()

  await expect(page).toHaveURL(/\/dashboard$/)
  await expect(page.getByRole('heading', { name: 'Projects' })).toBeVisible()
  await expect(page.getByRole('banner')).toContainText('Analytical Engines')

  const token = await seed.verificationToken(email)
  await page.goto(`/verify-email?token=${token}`)
  await expect(page.getByRole('heading', { name: 'Email verified' })).toBeVisible()
  await expect.poll(() => seed.isEmailVerified(email)).toBe(true)
})

test('signs in a verified user and rejects a wrong password', async ({ page, seed }) => {
  const user = await seed.user()

  await page.goto('/sign-in')
  await page.getByLabel('Email address', { exact: true }).fill(user.email)
  await page.getByLabel('Password', { exact: true }).fill('not-the-password')
  const rejected = page.waitForResponse(
    (res) => res.url().endsWith('/api/auth/sign-in/email') && res.request().method() === 'POST',
  )
  await page.getByRole('button', { name: 'Sign in' }).click()
  expect((await rejected).status()).toBe(401)
  await expect(page.getByRole('alert')).toBeVisible()
  await expect(page).toHaveURL(/\/sign-in$/)

  await page.getByLabel('Password', { exact: true }).fill(user.password)
  await page.getByRole('button', { name: 'Sign in' }).click()
  await expect(page).toHaveURL(/\/dashboard$/)
})

test('redirects anonymous visitors and signs out cleanly', async ({ page, seed }) => {
  await page.goto('/team')
  await expect(page).toHaveURL(/\/sign-in\?redirect=/)

  const user = await seed.user()
  await seed.authenticate(page.context(), user)
  await page.goto('/team')
  await expect(page.getByRole('heading', { name: 'Team' })).toBeVisible()

  await page.getByRole('button', { name: 'Account menu' }).click()
  await page.getByRole('menuitem', { name: 'Sign out' }).click()
  await expect(page).toHaveURL(/\/sign-in$/)

  await page.goto('/dashboard')
  await expect(page).toHaveURL(/\/sign-in/)
})
