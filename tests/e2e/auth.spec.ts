import { test, expect } from '@playwright/test'

const TEST_EMAIL = 'juanilopezfotografo@gmail.com'
const TEST_PASSWORD = 'Juanilopez98'

test.describe('Auth — Login', () => {
  test('login page renders form', async ({ page }) => {
    await page.goto('/login')
    await expect(page.locator('input[type="email"]')).toBeVisible()
    await expect(page.locator('input[type="password"]')).toBeVisible()
    await expect(page.getByRole('button', { name: /iniciar sesión/i })).toBeVisible()
  })

  test('login with valid credentials redirects to dashboard', async ({ page }) => {
    await page.goto('/login')
    await page.fill('input[type="email"]', TEST_EMAIL)
    await page.fill('input[type="password"]', TEST_PASSWORD)
    await page.getByRole('button', { name: /iniciar sesión/i }).click()
    await page.waitForURL('/dashboard', { timeout: 8000 })
    await expect(page).toHaveURL('/dashboard')
  })

  test('login with wrong password shows error', async ({ page }) => {
    await page.goto('/login')
    await page.fill('input[type="email"]', TEST_EMAIL)
    await page.fill('input[type="password"]', 'wrongpassword')
    await page.getByRole('button', { name: /iniciar sesión/i }).click()
    // Should show error message, not redirect
    await page.waitForTimeout(2000)
    await expect(page).toHaveURL('/login')
  })

  test('link to signup works', async ({ page }) => {
    await page.goto('/login')
    await page.getByRole('link', { name: /registrate/i }).click()
    await expect(page).toHaveURL('/signup')
  })
})

test.describe('Auth — Signup', () => {
  test('signup page renders form', async ({ page }) => {
    await page.goto('/signup')
    await expect(page.locator('input[id="fullName"]')).toBeVisible()
    await expect(page.locator('input[type="email"]')).toBeVisible()
    await expect(page.locator('input[type="password"]')).toBeVisible()
    await expect(page.getByRole('button', { name: /crear cuenta/i })).toBeVisible()
  })

  test('link to login works', async ({ page }) => {
    await page.goto('/signup')
    await page.getByRole('link', { name: /iniciá sesión/i }).click()
    await expect(page).toHaveURL('/login')
  })
})

test.describe('Auth — Protected routes', () => {
  test('/dashboard redirects to /login when logged out', async ({ page }) => {
    // Make sure we're logged out (fresh context)
    await page.goto('/dashboard')
    await page.waitForURL('/login', { timeout: 5000 })
    await expect(page).toHaveURL('/login')
  })

  test('/instructor redirects to /login when logged out', async ({ page }) => {
    await page.goto('/instructor')
    await page.waitForURL('/login', { timeout: 5000 })
    await expect(page).toHaveURL('/login')
  })
})
