import { test as base, expect } from '@playwright/test'
import { test } from './fixtures/auth'

base.describe('HQ Navigation Flow', () => {
  base.test('HQ-routes redirectar till login nar ej autentiserad', async ({ page }) => {
    await page.goto('/hq')
    await expect(page).toHaveURL(/login/)
  })

  base.test('Brand Setup URL redirectar till login', async ({ page }) => {
    await page.goto('/hq/brand/setup')
    await expect(page).toHaveURL(/login/)
  })

  base.test('Campaigns URL redirectar till login', async ({ page }) => {
    await page.goto('/hq/campaigns')
    await expect(page).toHaveURL(/login/)
  })

  base.test('Dashboard URL redirectar till login', async ({ page }) => {
    await page.goto('/hq')
    await expect(page).toHaveURL(/login/)
    await expect(page.locator('form')).toBeVisible()
  })

  base.test('Login-formularet finns efter redirect', async ({ page }) => {
    await page.goto('/hq/campaigns/new')
    await expect(page).toHaveURL(/login/)
    await expect(page.getByRole('button', { name: /logga in/i })).toBeVisible()
  })
})

test.describe('HQ Authenticated Flow', () => {
  test('HQ kan navigera till Brand Setup', async ({ hqPage: page }) => {
    await page.goto('/hq/brand/setup')
    await expect(page).toHaveURL(/brand/)
    await expect(page.getByRole('heading').first()).toBeVisible()
  })

  test('HQ kan navigera till Kampanjer', async ({ hqPage: page }) => {
    await page.goto('/hq/campaigns')
    await expect(page.getByRole('heading', { name: /kampanjer/i })).toBeVisible()
  })

  test('HQ ser Dashboard', async ({ hqPage: page }) => {
    await page.goto('/hq')
    await expect(page.getByRole('heading').first()).toBeVisible()
    await expect(page.getByText(/versikt|marknadsplattform/i)).toBeVisible()
  })

  test('Sidomenyn visar navigationspunkter', async ({ hqPage: page }) => {
    await page.goto('/hq')
    const sidebar = page.locator('aside nav')
    const navItems = [
      { href: '/hq', name: /dashboard/i },
      { href: '/hq/campaigns', name: /kampanjer/i },
      { href: '/hq/brand', name: /varum/i },
      { href: '/hq/calendar', name: /kalender/i },
      { href: '/hq/franchisees', name: /franchisetagare/i },
      { href: '/hq/settings', name: /inst/i },
    ]

    for (const item of navItems) {
      const link = sidebar.getByRole('link', { name: item.name })
      await expect(link).toBeVisible()
      await expect(link).toHaveAttribute('href', item.href)
    }
  })

  test('Ny kampanj-knappen navigerar till wizard', async ({ hqPage: page }) => {
    await page.goto('/hq/campaigns')
    const newBtn = page.getByRole('button', { name: /ny kampanj/i })
    await expect(newBtn).toBeVisible()
    await newBtn.click()
    await expect(page).toHaveURL(/\/hq\/campaigns\/new/)
  })

  test('Brand Overview visar varumarkesinfo', async ({ hqPage: page }) => {
    await page.goto('/hq/brand')
    await expect(page.getByRole('heading').first()).toBeVisible()
  })
})

base.describe('HQ Page Structure', () => {
  base.test('Login-sidan har korrekt struktur', async ({ page }) => {
    await page.goto('/login')
    await expect(page.getByText('Nexavo')).toBeVisible()
    await expect(page.getByText('Marknadsapp')).toBeVisible()
    await expect(page.getByLabel(/e-post/i)).toBeVisible()
    await expect(page.getByLabel(/l.senord/i)).toBeVisible()
    await expect(page.getByRole('button', { name: /logga in/i })).toBeVisible()
  })

  base.test('Login-sidan har ratt URL', async ({ page }) => {
    await page.goto('/login')
    await expect(page).toHaveURL(/login/)
  })
})
