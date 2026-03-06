import { test, expect } from '@playwright/test'

test.describe('HQ Brand Setup', () => {
  test.skip('HQ kan navigera till brand setup', async ({ page }) => {
    // Kräver autentisering
    await page.goto('/hq/brand/setup')
    await expect(page).toHaveURL(/login|brand\/setup/)
  })

  test('brand setup url är korrekt format', async ({ page }) => {
    await page.goto('/hq/brand/setup')
    // Omdirigeras till login om ej inloggad
    await expect(page).toHaveURL(/login/)
  })
})
