import { test, expect } from '@playwright/test'

test.describe('Landing page', () => {
  test('loads and shows hero', async ({ page }) => {
    await page.goto('/')
    // Navbar is a <nav> element
    await expect(page.locator('nav').first()).toBeVisible()
    await expect(page.locator('img[alt="NATO University"]').first()).toBeVisible()
  })

  test('shows Edición Limitada course card', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByText('Edición Limitada')).toBeVisible({ timeout: 10000 })
  })

  test('Ver cursos CTA scrolls to courses section', async ({ page }) => {
    await page.goto('/')
    const cta = page.getByRole('link', { name: /ver cursos/i })
    if (await cta.isVisible()) {
      await cta.click()
      await expect(page.locator('#courses')).toBeInViewport()
    }
  })

  test('Iniciar Sesión link goes to /login', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('link', { name: /iniciar sesión/i }).first().click()
    await expect(page).toHaveURL('/login')
  })
})
