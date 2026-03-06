import { test, expect } from '@playwright/test'

// OBS: Dessa tester kräver en riktig Supabase-instans med testdata
// Markerade som skip tills miljö är konfigurerad
test.describe('Franchise Portal', () => {
  test.skip('franchisee kan se kampanjlistan', async ({ page }) => {
    // Logga in som franchisee
    await page.goto('/login')
    await page.getByLabel(/e-post/i).fill(process.env.TEST_FRANCHISEE_EMAIL!)
    await page.getByLabel(/lösenord/i).fill(process.env.TEST_FRANCHISEE_PASSWORD!)
    await page.getByRole('button', { name: /logga in/i }).click()

    await expect(page).toHaveURL(/portal/)
    await expect(page.getByText(/aktiva kampanjer/i)).toBeVisible()
  })

  test.skip('franchisee kan inte nå HQ-vyn', async ({ page }) => {
    await page.goto('/hq')
    await expect(page).toHaveURL(/portal|login/)
  })

  test.skip('franchisee kan ladda ner material', async ({ page }) => {
    await page.goto('/portal')
    const downloadPromise = page.waitForEvent('download')
    await page.locator('[data-testid="download-btn"]').first().click()
    const download = await downloadPromise
    expect(download.suggestedFilename()).toMatch(/\.png$/)
  })
})
