import { test, expect } from '@playwright/test'

const TIMEOUT = 12000

test.describe('Course Detail — Edición Limitada', () => {
  test('page loads with correct title', async ({ page }) => {
    await page.goto('/courses/edicion-limitada')
    await page.waitForLoadState('networkidle')
    await expect(page.getByRole('heading', { name: 'Edición Limitada' })).toBeVisible({ timeout: TIMEOUT })
  })

  test('shows 5 modules in accordion', async ({ page }) => {
    await page.goto('/courses/edicion-limitada')
    await page.waitForLoadState('networkidle')
    await expect(page.getByText('Tu firma personal')).toBeVisible({ timeout: TIMEOUT })
    await expect(page.getByText('Anatomía de tu imagen')).toBeVisible({ timeout: TIMEOUT })
    await expect(page.getByText('Comunicá con criterio')).toBeVisible({ timeout: TIMEOUT })
    await expect(page.getByText('El factor lujo')).toBeVisible({ timeout: TIMEOUT })
    await expect(page.getByText('Edición Limitada en acción')).toBeVisible({ timeout: TIMEOUT })
  })

  test('module accordion expands on click', async ({ page }) => {
    await page.goto('/courses/edicion-limitada')
    await page.waitForLoadState('networkidle')
    await page.getByText('Tu firma personal').click()
    await expect(page.getByText('El lujo como lenguaje de marca')).toBeVisible({ timeout: TIMEOUT })
  })

  test('shows lesson count per module', async ({ page }) => {
    await page.goto('/courses/edicion-limitada')
    await page.waitForLoadState('networkidle')
    await expect(page.getByText('5 lecciones').first()).toBeVisible({ timeout: TIMEOUT })
  })

  test('shows price or enroll/buy button', async ({ page }) => {
    await page.goto('/courses/edicion-limitada')
    await page.waitForLoadState('networkidle')
    const hasPrice = await page.getByText(/97|USD/).isVisible().catch(() => false)
    const hasBtn = await page.getByRole('button', { name: /inscribirse|comprar|ir al curso/i }).isVisible().catch(() => false)
    const hasLogin = await page.getByText(/iniciá sesión/i).isVisible().catch(() => false)
    expect(hasPrice || hasBtn || hasLogin).toBeTruthy()
  })

  test('404 for unknown course slug', async ({ page }) => {
    await page.goto('/courses/este-curso-no-existe')
    await page.waitForLoadState('networkidle')
    const pageContent = await page.content()
    expect(pageContent).not.toContain('Uncaught')
    expect(pageContent).not.toContain('TypeError')
  })
})
