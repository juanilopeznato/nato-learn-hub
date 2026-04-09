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

test.describe('Community', () => {
  test('accessible when logged in', async ({ page }) => {
    await login(page)
    await page.goto('/community')
    await expect(page).toHaveURL('/community')
    await expect(page.getByText(/comunidad/i).first()).toBeVisible({ timeout: TIMEOUT })
  })

  test('redirects to login when logged out', async ({ page }) => {
    await page.goto('/community')
    await page.waitForURL('/login', { timeout: 5000 })
    await expect(page).toHaveURL('/login')
  })

  test('shows category filter buttons', async ({ page }) => {
    await login(page)
    await page.goto('/community')
    await expect(page.getByText('Todo')).toBeVisible({ timeout: TIMEOUT })
    await expect(page.getByText(/preguntas/i)).toBeVisible({ timeout: TIMEOUT })
    await expect(page.getByText(/logros/i)).toBeVisible({ timeout: TIMEOUT })
  })

  test('Publicar button opens post dialog', async ({ page }) => {
    await login(page)
    await page.goto('/community')
    await page.getByRole('button', { name: /publicar/i }).click()
    await expect(page.getByRole('dialog')).toBeVisible({ timeout: 5000 })
    await expect(page.getByText(/nueva publicación/i)).toBeVisible()
  })

  test('can create a post', async ({ page }) => {
    await login(page)
    await page.goto('/community')
    await expect(page.locator('header img').first()).toBeVisible({ timeout: TIMEOUT })
    // Open create dialog
    await page.getByRole('button', { name: /publicar/i }).first().click()
    await expect(page.getByRole('dialog')).toBeVisible({ timeout: 5000 })
    // Fill form
    const title = `Test-${Date.now()}`
    await page.fill('input[id="title"]', title)
    await page.fill('textarea[id="body"]', 'Post de prueba automatizado con Playwright E2E testing')
    // Submit
    await page.locator('[role="dialog"] button[type="submit"]').click()
    // Dialog should close
    await expect(page.getByRole('dialog')).not.toBeVisible({ timeout: 8000 })
    // Post should appear in feed
    await expect(page.getByText(title)).toBeVisible({ timeout: TIMEOUT })
  })
})

test.describe('Leaderboard', () => {
  test('visible in dashboard', async ({ page }) => {
    await login(page)
    await page.goto('/dashboard')
    await expect(page.getByText(/ranking mensual/i)).toBeVisible({ timeout: TIMEOUT })
    await expect(page.getByText(/top del mes/i)).toBeVisible({ timeout: TIMEOUT })
  })
})

test.describe('Member Profile', () => {
  test('redirects to login when logged out', async ({ page }) => {
    await page.goto('/members/some-id')
    await page.waitForURL('/login', { timeout: 5000 })
    await expect(page).toHaveURL('/login')
  })

  test('own profile accessible from dashboard', async ({ page }) => {
    await login(page)
    await page.goto('/dashboard')
    // Click on own name link in header
    const nameLink = page.locator('header a[href^="/members"]')
    if (await nameLink.isVisible({ timeout: TIMEOUT })) {
      await nameLink.click()
      await expect(page.url()).toContain('/members/')
      await expect(page.getByText(/pts/i)).toBeVisible({ timeout: TIMEOUT })
    }
  })
})
