import { test as base, expect } from '@playwright/test'
import { test } from './fixtures/auth'

base.describe('HQ Brand Setup (ej autentiserad)', () => {
  base.test('brand setup url redirectar till login', async ({ page }) => {
    await page.goto('/hq/brand/setup')
    await expect(page).toHaveURL(/login/)
  })
})

test.describe('HQ Brand Setup (autentiserad)', () => {
  test('HQ kan nå brand setup', async ({ hqPage: page }) => {
    await page.goto('/hq/brand/setup')
    await expect(page).toHaveURL(/brand/)
    await expect(page.getByRole('heading').first()).toBeVisible()
  })
})
