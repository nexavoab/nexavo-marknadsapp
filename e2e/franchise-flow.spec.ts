import { test, expect } from '@playwright/test'

test.describe('Franchise Portal Navigation', () => {
  test('Portal redirectar till login när ej autentiserad', async ({ page }) => {
    await page.goto('/portal')
    await expect(page).toHaveURL(/login/)
  })

  test('Franchise campaign URL redirectar till login', async ({ page }) => {
    await page.goto('/portal/campaign/123')
    await expect(page).toHaveURL(/login/)
  })
})

test.describe('Franchise Portal Authenticated', () => {
  // OBS: Kräver auth-mock eller riktiga credentials
  // Markerade med .skip tills miljö är konfigurerad
  
  test.skip('Portal visar "Aktiva kampanjer"', async ({ page }) => {
    await page.goto('/portal')
    await expect(page.getByText(/aktiva kampanjer/i)).toBeVisible()
  })

  test.skip('Portal har "Materialportal" i header', async ({ page }) => {
    await page.goto('/portal')
    await expect(page.getByText(/materialportal/i)).toBeVisible()
  })

  test.skip('Portal visar användarnamn i header', async ({ page }) => {
    await page.goto('/portal')
    // Header ska visa inloggad användares namn
    await expect(page.locator('header')).toBeVisible()
  })

  test.skip('Portal har logout-knapp', async ({ page }) => {
    await page.goto('/portal')
    await expect(page.getByRole('button', { name: /logga ut/i })).toBeVisible()
  })

  test.skip('Kampanjkort är klickbara', async ({ page }) => {
    await page.goto('/portal')
    // Vänta på att kampanjer laddas
    await page.waitForSelector('[data-testid="campaign-card"]', { timeout: 5000 }).catch(() => null)
    
    const firstCard = page.locator('[data-testid="campaign-card"]').first()
    if (await firstCard.isVisible()) {
      await firstCard.click()
      await expect(page).toHaveURL(/\/portal\/campaign\//)
    }
  })

  test.skip('Kampanjsida visar assets', async ({ page }) => {
    // Förutsätter att det finns en kampanj med id "test-campaign"
    await page.goto('/portal/campaign/test-campaign')
    await expect(page.getByText(/material|assets|ladda ner/i)).toBeVisible()
  })

  test.skip('Download-knappar finns för assets', async ({ page }) => {
    await page.goto('/portal/campaign/test-campaign')
    const downloadButtons = page.locator('button:has-text("Ladda ner"), [data-testid="download-btn"]')
    await expect(downloadButtons.first()).toBeVisible()
  })

  test.skip('Empty state visas när inga kampanjer', async ({ page }) => {
    await page.goto('/portal')
    // Om inga kampanjer finns ska empty state visas
    const emptyState = page.getByText(/inga aktiva kampanjer/i)
    const campaignCards = page.locator('[data-testid="campaign-card"]')
    
    // Antingen finns kampanjer eller empty state
    const hasCards = await campaignCards.count() > 0
    const hasEmptyState = await emptyState.isVisible()
    expect(hasCards || hasEmptyState).toBe(true)
  })
})

test.describe('Franchise Portal Access Control', () => {
  test.skip('Franchisee kan inte nå HQ-vyn', async ({ page }) => {
    // Logga in som franchisee först
    await page.goto('/hq')
    // Ska redirectas till portal eller login
    await expect(page).toHaveURL(/portal|login/)
  })

  test.skip('Franchisee ser rätt header', async ({ page }) => {
    await page.goto('/portal')
    await expect(page.locator('header').getByText(/materialportal/i)).toBeVisible()
    // HQ-menyalternativ ska inte finnas
    await expect(page.getByText(/dashboard/i)).not.toBeVisible()
  })
})
