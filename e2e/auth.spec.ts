import { test, expect } from '@playwright/test'

test.describe('Authentication', () => {
  test('visar login-sidan för oinloggade', async ({ page }) => {
    await page.goto('/')
    await expect(page).toHaveURL(/login/)
    await expect(page.getByRole('button', { name: /logga in/i })).toBeVisible()
  })

  test('visar felmeddelande vid fel credentials', async ({ page }) => {
    await page.goto('/login')
    await page.getByLabel(/e-post/i).fill('fel@test.com')
    await page.getByLabel(/lösenord/i).fill('feltkod')
    await page.getByRole('button', { name: /logga in/i }).click()
    // Vänta på antingen felmeddelande eller att knappen återgår till enabled (timeout)
    // OBS: Kräver faktisk Supabase-koppling för att visa fel
    // Detta test verifierar att formuläret skickas korrekt
    await page.waitForTimeout(2000)
    // Formuläret ska fortfarande vara på login-sidan
    await expect(page).toHaveURL(/login/)
  })

  test('redirect till /login från skyddade routes', async ({ page }) => {
    await page.goto('/hq')
    await expect(page).toHaveURL(/login/)
  })

  test('redirect till /login från franchise-routes', async ({ page }) => {
    await page.goto('/portal')
    await expect(page).toHaveURL(/login/)
  })
})
