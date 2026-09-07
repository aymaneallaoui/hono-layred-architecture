import { faker } from '@faker-js/faker'

import { expect, test } from '../fixtures'

test('creates, searches, archives, and deletes a project', async ({ page, seed }) => {
  const user = await seed.user()
  await seed.authenticate(page.context(), user)
  const name = `Launch ${faker.string.alphanumeric(8)}`

  await page.goto('/dashboard')
  const form = page.getByRole('form', { name: 'New project' })
  await form.getByLabel('Project name').fill(name)
  await form.getByLabel('Description').fill('Ship the thing')
  await form.getByRole('button', { name: 'Create project' }).click()

  const list = page.getByRole('list', { name: 'Projects' })
  const row = list.getByRole('listitem').filter({ hasText: name })
  await expect(row).toBeVisible()
  await expect(row).toContainText('Ship the thing')

  await page.getByLabel('Search projects').fill(name.slice(-8))
  await expect(list.getByRole('listitem')).toHaveCount(1)

  await row.getByRole('button', { name: 'Archive' }).click()
  await expect(row).toHaveCount(0)

  await page.getByRole('button', { name: 'Archived' }).click()
  await expect(row).toContainText('Archived')

  await row.getByRole('button', { name: 'Delete' }).click()
  await expect(row).toHaveCount(0)
})
