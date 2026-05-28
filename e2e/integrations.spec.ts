import { test as base, expect } from '@playwright/test'
import { test } from './fixtures/auth'

base.describe('Integrations (ej autentiserad)', () => {
  base.test('hq integrations redirectar till login', async ({ page }) => {
    await page.goto('/hq/integrations')
    await expect(page).toHaveURL(/login/)
  })
})

test.describe('Integrations (HQ)', () => {
  test('hq ser integrationssidan med providerkort och roadmap', async ({ hqPage: page }) => {
    await page.goto('/hq/integrations')

    await expect(page.getByRole('heading', { name: /integrationer/i })).toBeVisible()
    await expect(page.getByText('Meta Ads', { exact: true })).toBeVisible()
    await expect(page.getByText('Google Ads', { exact: true })).toBeVisible()
    await expect(page.getByText('E-post', { exact: true })).toBeVisible()
    await expect(page.getByText('SMS', { exact: true })).toBeVisible()
    await expect(page.getByText(/roadmap/i)).toBeVisible()
  })
})
