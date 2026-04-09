import { test, expect, Page } from '@playwright/test'

const TEST_EMAIL = 'juanilopezfotografo@gmail.com'
const TEST_PASSWORD = 'Juanilopez98'
const TIMEOUT = 10000

async function login(page: Page) {
  await page.goto('/login')
  await page.fill('input[type="email"]', TEST_EMAIL)
  await page.fill('input[type="password"]', TEST_PASSWORD)
  await page.getByRole('button', { name: /iniciar sesión/i }).click()
  await page.waitForURL('/dashboard', { timeout: 8000 })
}

test.describe('Dashboard (authenticated)', () => {
  test('shows greeting with user name', async ({ page }) => {
    await login(page)
    await expect(page.getByText(/hola/i)).toBeVisible({ timeout: TIMEOUT })
  })

  test('shows enrolled courses or empty state', async ({ page }) => {
    await login(page)
    // Wait for loading skeleton to disappear, then check for any course-related content
    await page.waitForFunction(() => !document.querySelector('.animate-pulse'), { timeout: TIMEOUT })
    const content = await page.content()
    const hasContent = content.includes('Mis cursos') || content.includes('Empez') || content.includes('aprender') || content.includes('cursos')
    expect(hasContent).toBeTruthy()
  })

  test('shows points and level in header', async ({ page }) => {
    await login(page)
    await expect(page.getByText(/pts/i)).toBeVisible({ timeout: TIMEOUT })
    await expect(page.getByText(/nv\./i)).toBeVisible({ timeout: TIMEOUT })
  })

  test('shows leaderboard section', async ({ page }) => {
    await login(page)
    await expect(page.getByText(/ranking mensual/i)).toBeVisible({ timeout: TIMEOUT })
  })

  test('community link is visible', async ({ page }) => {
    await login(page)
    await expect(page.getByRole('link', { name: /comunidad/i })).toBeVisible({ timeout: TIMEOUT })
  })

  test('signout works', async ({ page }) => {
    await login(page)
    await expect(page).toHaveURL('/dashboard')
    // The logout button is the last button in the header (LogOut icon)
    const headerButtons = page.locator('header button')
    const count = await headerButtons.count()
    await headerButtons.nth(count - 1).click()
    await page.waitForURL('/login', { timeout: 5000 })
    await expect(page).toHaveURL('/login')
  })
})
