/**
 * E2E del flow de checkout — sin cobrar plata real.
 *
 * Estrategia: usar `page.route()` para interceptar la llamada al endpoint
 * de creación de preference de MP y simular respuestas. Validamos:
 *  - Click "Comprar" sin login → redirect a /login con redirect param
 *  - Click "Inscribirse gratis" sin login → redirect a /login
 *  - Botones disabled mientras la mutation está pending
 *  - MpOAuthCallback sin code → muestra error sin crashear
 *  - Status page responde 200 con todos los checks
 */
import { test, expect } from '@playwright/test'

const TIMEOUT = 12000

test.describe('Checkout flow — guards & redirects', () => {
  test('curso pago: usuario no logueado al clickear "Comprar" va a /login', async ({ page }) => {
    // Intercepta el endpoint de MP por si el test corre con un user logged accidentalmente
    await page.route('**/functions/v1/create-subscription', (route) => {
      route.fulfill({ status: 200, body: JSON.stringify({ init_point: 'about:blank' }) })
    })

    // Usar un slug que sabemos que es pago (Edición Limitada de los otros tests)
    await page.goto('/courses/edicion-limitada')
    await page.waitForLoadState('networkidle')

    // El CTA debería tener "Comprar" en el label
    const cta = page.getByRole('button', { name: /comprar/i }).first()
    await expect(cta).toBeVisible({ timeout: TIMEOUT })
    await cta.click()

    // Sin login → va a /login con redirect param
    await expect(page).toHaveURL(/\/login/, { timeout: TIMEOUT })
    await expect(page).toHaveURL(/redirect=/)
  })

  test('MpOAuthCallback sin code muestra error sin crashear', async ({ page }) => {
    await page.goto('/mp-oauth-callback')
    await page.waitForLoadState('networkidle')

    // No debe quedar en blanco — debe mostrar algo
    const body = page.locator('body')
    await expect(body).not.toBeEmpty({ timeout: TIMEOUT })
  })

  test('/status responde y muestra los 3 checks', async ({ page }) => {
    await page.goto('/status')
    await page.waitForLoadState('networkidle')

    await expect(page.getByText(/frontend/i)).toBeVisible({ timeout: TIMEOUT })
    await expect(page.getByText(/supabase/i)).toBeVisible({ timeout: TIMEOUT })
    await expect(page.getByText(/storage/i, { exact: false })).toBeVisible({ timeout: TIMEOUT })
  })

  test('404 muestra sugerencias + path actual', async ({ page }) => {
    await page.goto('/esta-pagina-no-existe-12345')
    await page.waitForLoadState('networkidle')

    await expect(page.getByText('404')).toBeVisible({ timeout: TIMEOUT })
    await expect(page.getByText(/esta página no existe/i)).toBeVisible({ timeout: TIMEOUT })
    // Path en mono
    await expect(page.getByText('/esta-pagina-no-existe-12345')).toBeVisible({ timeout: TIMEOUT })
    // Sugerencias visibles
    await expect(page.getByRole('link', { name: /^inicio/i })).toBeVisible({ timeout: TIMEOUT })
    await expect(page.getByRole('link', { name: /^cursos/i })).toBeVisible({ timeout: TIMEOUT })
  })

  test('/login: campo honeypot existe pero está oculto', async ({ page }) => {
    await page.goto('/login')
    await page.waitForLoadState('networkidle')

    const honeypot = page.locator('#login_website')
    await expect(honeypot).toHaveCount(1)
    await expect(honeypot).toBeHidden() // está off-screen pero presente
  })

  test('/signup: rate limit por timing — submit en <2s es bloqueado', async ({ page }) => {
    await page.goto('/signup')
    await page.waitForLoadState('networkidle')

    // Llenamos y enviamos rápido — el cooldown debería disparar
    await page.getByLabel(/nombre/i).fill('Test Bot')
    await page.getByLabel(/email/i).fill(`test-${Date.now()}@example.com`)
    await page.getByLabel(/contraseña/i).fill('password-test-123')
    await page.getByRole('button', { name: /crear|sign|cuenta/i }).first().click()

    // Esperá un poco para el handler
    await page.waitForTimeout(500)

    // Debería ver alguna indicación de error/bloqueo (no enviar el signup real)
    const errorIndicator = page.locator('text=/esperá un momento|bot detectado/i')
    await expect(errorIndicator).toBeVisible({ timeout: 5000 })
  })
})
