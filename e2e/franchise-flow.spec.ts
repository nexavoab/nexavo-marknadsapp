import { test as base, expect } from '@playwright/test'
import { test } from './fixtures/auth'

base.describe('Franchise Portal Navigation', () => {
  base.test('Portal redirectar till login när ej autentiserad', async ({ page }) => {
    await page.goto('/portal')
    await expect(page).toHaveURL(/login/)
  })

  base.test('Franchise campaign URL redirectar till login', async ({ page }) => {
    await page.goto('/portal/campaign/123')
    await expect(page).toHaveURL(/login/)
  })
})

test.describe('Franchise Portal Authenticated', () => {
  test('Portal laddas efter inloggning', async ({ franchisePage: page }) => {
    await page.goto('/portal')
    await expect(page).toHaveURL(/portal/)
  })

  test('Portal visar header', async ({ franchisePage: page }) => {
    await page.goto('/portal')
    await expect(page.locator('header')).toBeVisible()
  })

  test('Portal visar logout-knapp', async ({ franchisePage: page }) => {
    await page.goto('/portal')
    await expect(page.getByRole('button', { name: /logga ut/i })).toBeVisible()
  })

  test('Portal visar innehåll efter inloggning', async ({ franchisePage: page }) => {
    await page.goto('/portal')
    await page.waitForTimeout(3000)
    // Portalen ska ha laddats — main-elementet ska finnas
    await expect(page.locator('main, [role="main"], .min-h-screen').first()).toBeVisible()
  })

  test('Franchisee kan inte nå HQ-vyn', async ({ franchisePage: page }) => {
    await page.goto('/hq')
    await expect(page).toHaveURL(/portal|login/)
  })
})
