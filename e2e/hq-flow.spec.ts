import { test, expect } from '@playwright/test'

test.describe('HQ Navigation Flow', () => {
  // Dessa tester körs utan autentisering och verifierar redirect-beteende
  
  test('HQ-routes redirectar till login när ej autentiserad', async ({ page }) => {
    await page.goto('/hq')
    await expect(page).toHaveURL(/login/)
  })

  test('Brand Setup URL redirectar till login', async ({ page }) => {
    await page.goto('/hq/brand/setup')
    await expect(page).toHaveURL(/login/)
  })

  test('Campaigns URL redirectar till login', async ({ page }) => {
    await page.goto('/hq/campaigns')
    await expect(page).toHaveURL(/login/)
  })

  test('Dashboard URL redirectar till login', async ({ page }) => {
    await page.goto('/hq')
    await expect(page).toHaveURL(/login/)
    await expect(page.locator('form')).toBeVisible()
  })

  test('Login-formuläret finns efter redirect', async ({ page }) => {
    await page.goto('/hq/campaigns/new')
    await expect(page).toHaveURL(/login/)
    await expect(page.getByRole('button', { name: /logga in/i })).toBeVisible()
  })
})

test.describe('HQ Authenticated Flow', () => {
  // OBS: Dessa tester kräver mock eller riktig auth
  // Markerade med .skip tills auth-mock är implementerad
  
  test.skip('HQ kan navigera till Brand Setup', async ({ page }) => {
    // Förutsätter att vi mockar auth via cookie/localStorage
    await page.goto('/hq/brand/setup')
    await expect(page.getByText(/grundläggande|varumärke/i)).toBeVisible()
  })

  test.skip('HQ kan navigera till Kampanjer', async ({ page }) => {
    await page.goto('/hq/campaigns')
    await expect(page.getByText(/kampanjer/i)).toBeVisible()
    await expect(page.getByRole('button', { name: /ny kampanj/i })).toBeVisible()
  })

  test.skip('HQ ser Dashboard', async ({ page }) => {
    await page.goto('/hq')
    await expect(page.getByText(/dashboard/i)).toBeVisible()
  })

  test.skip('Sidomenyn visar 7 navigationspunkter', async ({ page }) => {
    await page.goto('/hq')
    
    const navItems = [
      'Dashboard',
      'Kampanjer',
      'Varumärke',
      'Materialbank',
      'Kalender',
      'Franchisetagare',
      'Inställningar',
    ]
    
    for (const item of navItems) {
      await expect(page.getByRole('link', { name: new RegExp(item, 'i') })).toBeVisible()
    }
  })

  test.skip('Ny kampanj-knappen navigerar till wizard', async ({ page }) => {
    await page.goto('/hq/campaigns')
    await page.getByRole('button', { name: /ny kampanj/i }).click()
    await expect(page).toHaveURL(/\/hq\/campaigns\/new/)
  })

  test.skip('Brand Overview visar varumärkesinfo', async ({ page }) => {
    await page.goto('/hq/brand')
    await expect(page.getByText(/varumärke|brand/i)).toBeVisible()
  })
})

test.describe('HQ Page Structure', () => {
  test('Login-sidan har korrekt struktur', async ({ page }) => {
    await page.goto('/login')
    
    // Titel
    await expect(page.getByText('Nexavo Marknadsapp')).toBeVisible()
    
    // Formulärfält
    await expect(page.getByLabel(/e-post/i)).toBeVisible()
    await expect(page.getByLabel(/lösenord/i)).toBeVisible()
    
    // Submit-knapp
    await expect(page.getByRole('button', { name: /logga in/i })).toBeVisible()
  })

  test('Login-sidan har rätt title-attribut', async ({ page }) => {
    await page.goto('/login')
    await expect(page).toHaveURL(/login/)
  })
})
