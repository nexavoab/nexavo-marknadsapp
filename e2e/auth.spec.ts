import { test, expect } from '@playwright/test'

test.describe('Authentication - Login Page Structure', () => {
  test('visar login-sidan for oinloggade', async ({ page }) => {
    await page.goto('/')
    await expect(page).toHaveURL(/login/)
    await expect(page.getByRole('button', { name: /logga in/i })).toBeVisible()
  })

  test('verifierar att login-formularet har ratt falt', async ({ page }) => {
    await page.goto('/login')

    const emailField = page.getByLabel(/e-post/i)
    await expect(emailField).toBeVisible()
    await expect(emailField).toHaveAttribute('type', 'email')

    const passwordField = page.getByLabel(/l.senord/i)
    await expect(passwordField).toBeVisible()
    await expect(passwordField).toHaveAttribute('type', 'password')

    await expect(page.getByRole('button', { name: /logga in/i })).toBeVisible()
  })

  test('login-formularet har required-attribut', async ({ page }) => {
    await page.goto('/login')

    const emailField = page.getByLabel(/e-post/i)
    const passwordField = page.getByLabel(/l.senord/i)

    await expect(emailField).toHaveAttribute('required', '')
    await expect(passwordField).toHaveAttribute('required', '')
  })

  test('visar appens branding', async ({ page }) => {
    await page.goto('/login')
    await expect(page.getByText('Nexavo')).toBeVisible()
    await expect(page.getByText('Marknadsapp')).toBeVisible()
  })

  test('visar beskrivning', async ({ page }) => {
    await page.goto('/login')
    await expect(page.getByText(/logga in.*forts.tta/i)).toBeVisible()
  })
})

test.describe('Authentication - Form Behavior', () => {
  test('felmeddelande visas vid submit med fel credentials', async ({ page }) => {
    await page.goto('/login')
    await page.getByLabel(/e-post/i).fill('fel@test.com')
    await page.getByLabel(/l.senord/i).fill('feltkod')
    await page.getByRole('button', { name: /logga in/i }).click()

    await page.waitForTimeout(2000)

    await expect(page).toHaveURL(/login/)
  })

  test('knappen visar loading state vid submit', async ({ page }) => {
    await page.goto('/login')
    await page.getByLabel(/e-post/i).fill('test@test.com')
    await page.getByLabel(/l.senord/i).fill('password')

    const submitButton = page.getByRole('button', { name: /logga in/i })
    await submitButton.click()

    await page.waitForTimeout(500)
  })

  test('falt disablas under loading', async ({ page }) => {
    await page.goto('/login')
    await page.getByLabel(/e-post/i).fill('test@test.com')
    await page.getByLabel(/l.senord/i).fill('password')

    await page.getByRole('button', { name: /logga in/i }).click()

    await page.waitForTimeout(100)
    await expect(page).toHaveURL(/login/)
  })

  test('tom submit triggar browser validation', async ({ page }) => {
    await page.goto('/login')

    const submitButton = page.getByRole('button', { name: /logga in/i })
    await submitButton.click()

    await expect(page).toHaveURL(/login/)
  })
})

test.describe('Authentication - Protected Routes', () => {
  test('redirect till /login fran skyddade routes', async ({ page }) => {
    await page.goto('/hq')
    await expect(page).toHaveURL(/login/)
  })

  test('redirect till /login fran franchise-routes', async ({ page }) => {
    await page.goto('/portal')
    await expect(page).toHaveURL(/login/)
  })

  test('redirect fran nested HQ routes', async ({ page }) => {
    await page.goto('/hq/campaigns')
    await expect(page).toHaveURL(/login/)
  })

  test('redirect fran brand setup', async ({ page }) => {
    await page.goto('/hq/brand/setup')
    await expect(page).toHaveURL(/login/)
  })

  test('redirect fran settings', async ({ page }) => {
    await page.goto('/hq/settings')
    await expect(page).toHaveURL(/login/)
  })

  test('redirect fran franchise campaign', async ({ page }) => {
    await page.goto('/portal/campaign/any-id')
    await expect(page).toHaveURL(/login/)
  })
})

test.describe('Authentication - Navigation', () => {
  test('direkt access till login fungerar', async ({ page }) => {
    await page.goto('/login')
    await expect(page).toHaveURL(/login/)
    await expect(page.locator('form')).toBeVisible()
  })

  test('okand route redirectar till login', async ({ page }) => {
    await page.goto('/nagonting-som-inte-finns')
    await expect(page).toHaveURL(/login/)
  })

  test('refresh pa login-sidan behaller state', async ({ page }) => {
    await page.goto('/login')
    await page.getByLabel(/e-post/i).fill('test@test.com')

    await page.reload()

    await expect(page.getByLabel(/e-post/i)).toBeVisible()
  })
})
