import { test, expect } from '@playwright/test'

test.describe('Navigation (unauthenticated)', () => {
  test('startsidan redirectar till login', async ({ page }) => {
    await page.goto('/')
    await expect(page).toHaveURL(/login/)
  })

  test('login-sidan laddas korrekt', async ({ page }) => {
    await page.goto('/login')
    // CardTitle renderas som h3, verifiera texten istället
    await expect(page.getByText('Nexavo Marknadsapp')).toBeVisible()
    await expect(page.locator('form')).toBeVisible()
  })

  test('okänd route redirectar till login', async ({ page }) => {
    await page.goto('/nagonting-som-inte-finns')
    await expect(page).toHaveURL(/login/)
  })
})
