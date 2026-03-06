import { test as base, Page } from '@playwright/test'

const HQ_EMAIL = 'hq@test.nexavo.se'
const HQ_PASSWORD = 'Test1234!'
const FRANCHISE_EMAIL = 'franchise@test.nexavo.se'
const FRANCHISE_PASSWORD = 'Test1234!'

async function loginAs(page: Page, email: string, password: string) {
  await page.goto('/login')
  await page.getByLabel(/e-post/i).fill(email)
  await page.getByLabel(/lösenord/i).fill(password)
  await page.getByRole('button', { name: /logga in/i }).click()
  // Vänta tills redirect sker (bort från /login)
  await page.waitForURL((url) => !url.pathname.includes('login'), { timeout: 10000 })
}

export const test = base.extend<{
  hqPage: Page
  franchisePage: Page
  authenticated: boolean
}>({
  hqPage: async ({ page }, use) => {
    await loginAs(page, HQ_EMAIL, HQ_PASSWORD)
    await use(page)
  },
  franchisePage: async ({ page }, use) => {
    await loginAs(page, FRANCHISE_EMAIL, FRANCHISE_PASSWORD)
    await use(page)
  },
  authenticated: async ({}, use) => {
    await use(true)
  },
})

export { expect } from '@playwright/test'
export { HQ_EMAIL, HQ_PASSWORD, FRANCHISE_EMAIL, FRANCHISE_PASSWORD, loginAs }
