import { test, expect } from './fixtures/auth'

test.describe('Franchise Portal', () => {
  test('franchisee kan se portalen efter inloggning', async ({ franchisePage: page }) => {
    await page.goto('/portal')
    await expect(page).toHaveURL(/portal/)
    await expect(page.locator('header')).toBeVisible()
  })

  test('franchisee kan inte nå HQ-vyn', async ({ franchisePage: page }) => {
    await page.goto('/hq')
    await expect(page).toHaveURL(/portal|login/)
  })

  test('portal visar innehåll efter inloggning', async ({ franchisePage: page }) => {
    await page.goto('/portal')
    await page.waitForTimeout(3000)
    await expect(page.locator('body')).not.toBeEmpty()
    await expect(page).toHaveURL(/portal/)
  })
})
