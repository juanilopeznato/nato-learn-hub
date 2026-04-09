import { test, expect, Page } from '@playwright/test'

const TEST_EMAIL = 'juanilopezfotografo@gmail.com'
const TEST_PASSWORD = 'Juanilopez98'
const DATA_TIMEOUT = 20000

async function loginAndGo(page: Page, path: string) {
  await page.goto('/login')
  await page.fill('input[type="email"]', TEST_EMAIL)
  await page.fill('input[type="password"]', TEST_PASSWORD)
  await page.getByRole('button', { name: /iniciar sesión/i }).click()
  await page.waitForURL('/dashboard', { timeout: 8000 })
  await page.goto(path)
  await expect(page.getByRole('tab', { name: /mis cursos/i })).toBeVisible({ timeout: 15000 })
}

test.describe('Instructor Dashboard', () => {
  test('accessible for instructor/admin role', async ({ page }) => {
    await loginAndGo(page, '/instructor')
    await expect(page).not.toHaveURL('/login')
    await expect(page).not.toHaveURL('/dashboard')
  })

  test('shows Mis Cursos and KPIs tabs', async ({ page }) => {
    await loginAndGo(page, '/instructor')
    await expect(page.getByRole('tab', { name: /mis cursos/i })).toBeVisible({ timeout: 10000 })
    await expect(page.getByRole('tab', { name: /kpis/i })).toBeVisible({ timeout: 10000 })
  })

  test('course list shows Edición Limitada', async ({ page }) => {
    await loginAndGo(page, '/instructor')
    await expect(page.getByText('Edición Limitada')).toBeVisible({ timeout: DATA_TIMEOUT })
  })

  test('Nuevo Curso button opens dialog', async ({ page }) => {
    await loginAndGo(page, '/instructor')
    // Wait for courses to load first
    await expect(page.getByText('Edición Limitada')).toBeVisible({ timeout: DATA_TIMEOUT })
    await page.getByRole('button', { name: /nuevo curso/i }).click()
    await expect(page.getByRole('dialog')).toBeVisible({ timeout: 5000 })
    await expect(page.getByRole('dialog').locator('input').first()).toBeVisible()
  })

  test('KPIs tab shows metrics', async ({ page }) => {
    await loginAndGo(page, '/instructor')
    // Wait for page to fully load by checking tab is rendered
    await expect(page.getByRole('tab', { name: /kpis/i })).toBeVisible({ timeout: DATA_TIMEOUT })
    await page.getByRole('tab', { name: /kpis/i }).click()
    await expect(page.getByText(/total inscriptos/i).first()).toBeVisible({ timeout: DATA_TIMEOUT })
  })

  test('edit course link navigates to course editor', async ({ page }) => {
    await loginAndGo(page, '/instructor')
    await expect(page.getByText('Edición Limitada')).toBeVisible({ timeout: DATA_TIMEOUT })
    await page.getByRole('link', { name: /editar/i }).first().click()
    await expect(page).toHaveURL(/\/instructor\/courses\//, { timeout: 8000 })
    await expect(page.getByRole('tab', { name: /lecciones/i })).toBeVisible({ timeout: DATA_TIMEOUT })
  })
})
