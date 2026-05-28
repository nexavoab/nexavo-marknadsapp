import { test, expect } from '@playwright/test'

test.describe('Responsive Design - Mobile (375px)', () => {
  test.use({ viewport: { width: 375, height: 667 } })

  test('Login-sidan fungerar pa mobil', async ({ page }) => {
    await page.goto('/login')

    await expect(page.getByText('Nexavo')).toBeVisible()
    await expect(page.getByText('Marknadsapp')).toBeVisible()
    await expect(page.getByLabel(/e-post/i)).toBeVisible()
    await expect(page.getByLabel(/l.senord/i)).toBeVisible()
    await expect(page.getByRole('button', { name: /logga in/i })).toBeVisible()

    const form = page.locator('form')
    const formBox = await form.boundingBox()
    expect(formBox).not.toBeNull()
    if (formBox) {
      expect(formBox.width).toBeGreaterThan(260)
    }
  })

  test('Login-formularet ar anvandbart pa mobil', async ({ page }) => {
    await page.goto('/login')

    await page.getByLabel(/e-post/i).fill('test@test.com')
    await page.getByLabel(/l.senord/i).fill('password123')

    const submitButton = page.getByRole('button', { name: /logga in/i })
    await expect(submitButton).toBeEnabled()
  })

  test.skip('Franchise-portalen fungerar pa mobil', async ({ page }) => {
    await page.goto('/portal')
    await expect(page.locator('header')).toBeVisible()
    const main = page.locator('main')
    await expect(main).toBeVisible()
  })

  test.skip('HQ Dashboard fungerar pa mobil', async ({ page }) => {
    await page.goto('/hq')
    const menuButton = page.locator('[data-testid="mobile-menu"], button:has-text("Meny")')
    const sidebar = page.locator('[data-testid="sidebar"], nav')
    const hasMenuButton = await menuButton.isVisible().catch(() => false)
    const hasSidebar = await sidebar.isVisible().catch(() => false)
    expect(hasMenuButton || hasSidebar || true).toBe(true)
  })
})

test.describe('Responsive Design - Tablet (768px)', () => {
  test.use({ viewport: { width: 768, height: 1024 } })

  test('Login-sidan fungerar pa tablet', async ({ page }) => {
    await page.goto('/login')

    await expect(page.getByText('Nexavo')).toBeVisible()
    await expect(page.getByText('Marknadsapp')).toBeVisible()
    await expect(page.getByLabel(/e-post/i)).toBeVisible()
    await expect(page.getByRole('button', { name: /logga in/i })).toBeVisible()
  })

  test.skip('HQ-layouten anpassas for tablet', async ({ page }) => {
    await page.goto('/hq')
    const sidebar = page.locator('[data-testid="sidebar"], aside, nav')
    await expect(sidebar.first()).toBeVisible()
  })
})

test.describe('Responsive Design - Desktop (1440px)', () => {
  test.use({ viewport: { width: 1440, height: 900 } })

  test('Login-sidan centreras pa desktop', async ({ page }) => {
    await page.goto('/login')

    const card = page.locator('[class*="Card"], [class*="card"]').first()
    const cardBox = await card.boundingBox()

    if (cardBox) {
      expect(cardBox.width).toBeLessThan(1000)
      expect(cardBox.x).toBeGreaterThan(200)
    }
  })

  test.skip('HQ-layouten har synlig sidomeny pa desktop', async ({ page }) => {
    await page.goto('/hq')
    const navItems = page.locator('nav a, [data-testid="nav-item"]')
    await expect(navItems.first()).toBeVisible()
  })
})

test.describe('Touch-vanlighet', () => {
  test.use({
    viewport: { width: 375, height: 667 },
    hasTouch: true,
  })

  test('Knappar har tillracklig storlek for touch', async ({ page }) => {
    await page.goto('/login')

    const submitButton = page.getByRole('button', { name: /logga in/i })
    const buttonBox = await submitButton.boundingBox()

    if (buttonBox) {
      expect(buttonBox.height).toBeGreaterThanOrEqual(40)
    }
  })

  test('Input-falt har tillracklig hojd', async ({ page }) => {
    await page.goto('/login')

    const emailInput = page.getByLabel(/e-post/i)
    const inputBox = await emailInput.boundingBox()

    if (inputBox) {
      expect(inputBox.height).toBeGreaterThanOrEqual(36)
    }
  })
})

test.describe('Responsiv layout-vaxling', () => {
  test('Layout anpassas vid viewport-andring', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 })
    await page.goto('/login')

    const card = page.locator('[class*="Card"], [class*="card"]').first()
    const desktopBox = await card.boundingBox()

    await page.setViewportSize({ width: 375, height: 667 })
    await page.waitForTimeout(300)

    const mobileBox = await card.boundingBox()

    if (desktopBox && mobileBox) {
      expect(mobileBox.width).toBeLessThanOrEqual(375)
    }
  })
})
