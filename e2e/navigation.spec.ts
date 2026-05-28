import { test, expect } from '@playwright/test'

test.describe('Navigation (unauthenticated)', () => {
  test('startsidan redirectar till login', async ({ page }) => {
    await page.goto('/')
    await expect(page).toHaveURL(/login/)
  })

  test('login-sidan laddas korrekt', async ({ page }) => {
    await page.goto('/login')
    await expect(page.getByText('Nexavo')).toBeVisible()
    await expect(page.getByText('Marknadsapp')).toBeVisible()
    await expect(page.locator('form')).toBeVisible()
  })

  test('okand route redirectar till login', async ({ page }) => {
    await page.goto('/nagonting-som-inte-finns')
    await expect(page).toHaveURL(/login/)
  })
})
