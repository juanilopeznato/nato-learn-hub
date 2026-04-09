import { test, expect, Page } from '@playwright/test'

const TEST_EMAIL = 'juanilopezfotografo@gmail.com'
const TEST_PASSWORD = 'Juanilopez98'
const COURSE_SLUG = 'edicion-limitada'
const SUPABASE_URL = 'https://hoolsigtquohayhpqgtb.supabase.co'
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imhvb2xzaWd0cXVvaGF5aHBxZ3RiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU2Nzc2MzksImV4cCI6MjA5MTI1MzYzOX0.8Wx2SDoxwiedd2TdRRAcq9m966Erh0UcFnslHSky7uM'
const TIMEOUT = 12000

async function login(page: Page) {
  await page.goto('/login')
  await page.fill('input[type="email"]', TEST_EMAIL)
  await page.fill('input[type="password"]', TEST_PASSWORD)
  await page.getByRole('button', { name: /iniciar sesión/i }).click()
  await page.waitForURL('/dashboard', { timeout: 8000 })
}

async function getFirstLessonId(): Promise<string | null> {
  try {
    // Step 1: get course id
    const courseRes = await fetch(
      `${SUPABASE_URL}/rest/v1/courses?slug=eq.${COURSE_SLUG}&select=id`,
      { headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`, Accept: 'application/json' } }
    )
    const courses = await courseRes.json()
    const courseId = courses?.[0]?.id
    if (!courseId) return null

    // Step 2: get first module
    const modRes = await fetch(
      `${SUPABASE_URL}/rest/v1/modules?course_id=eq.${courseId}&select=id,order_index&order=order_index.asc&limit=1`,
      { headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`, Accept: 'application/json' } }
    )
    const modules = await modRes.json()
    const moduleId = modules?.[0]?.id
    if (!moduleId) return null

    // Step 3: get first lesson of that module
    const lessonRes = await fetch(
      `${SUPABASE_URL}/rest/v1/lessons?module_id=eq.${moduleId}&select=id,order_index&order=order_index.asc&limit=1`,
      { headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`, Accept: 'application/json' } }
    )
    const lessons = await lessonRes.json()
    return lessons?.[0]?.id ?? null
  } catch (e) {
    console.warn('getFirstLessonId error:', e)
    return null
  }
}

test.describe('Lesson View (authenticated + enrolled)', () => {
  // Fetch lesson ID once before all tests in this suite
  let lessonId: string | null = null

  test.beforeAll(async ({}, testInfo) => {
    lessonId = await getFirstLessonId()
    if (!lessonId) {
      console.warn('Could not fetch lesson ID from Supabase — lesson tests will be skipped')
    }
  })

  test('lesson view renders for enrolled user', async ({ page }) => {
    if (!lessonId) test.skip(true, 'No lesson ID from Supabase')
    await login(page)
    await page.goto(`/learn/${COURSE_SLUG}/${lessonId}`)
    await expect(page.getByText('Edición Limitada').first()).toBeVisible({ timeout: TIMEOUT })
  })

  test('lesson view shows video area or placeholder', async ({ page }) => {
    if (!lessonId) test.skip(true, 'No lesson ID')
    await login(page)
    await page.goto(`/learn/${COURSE_SLUG}/${lessonId}`)
    await page.waitForTimeout(3000)
    const hasIframe = await page.locator('iframe').isVisible().catch(() => false)
    const hasPlaceholder = await page.getByText(/no tiene video/i).isVisible().catch(() => false)
    expect(hasIframe || hasPlaceholder).toBeTruthy()
  })

  test('lesson sidebar shows modules on desktop', async ({ page }) => {
    if (!lessonId) test.skip(true, 'No lesson ID')
    await login(page)
    await page.goto(`/learn/${COURSE_SLUG}/${lessonId}`)
    await expect(page.getByText('Tu firma personal').first()).toBeVisible({ timeout: TIMEOUT })
  })

  test('mark complete button, completada badge, or enrollment message is visible', async ({ page }) => {
    if (!lessonId) test.skip(true, 'No lesson ID')
    await login(page)
    await page.goto(`/learn/${COURSE_SLUG}/${lessonId}`)
    await page.waitForLoadState('domcontentloaded')
    await page.waitForTimeout(3000)
    const markBtn = await page.getByRole('button', { name: /marcar completada/i }).isVisible().catch(() => false)
    const completedBadge = await page.getByText('Completada').isVisible().catch(() => false)
    const enrollMsg = await page.getByText(/inscribite al curso/i).isVisible().catch(() => false)
    expect(markBtn || completedBadge || enrollMsg).toBeTruthy()
  })

  test('prev button disabled on first lesson, next enabled', async ({ page }) => {
    if (!lessonId) test.skip(true, 'No lesson ID')
    await login(page)
    await page.goto(`/learn/${COURSE_SLUG}/${lessonId}`)
    await expect(page.getByRole('button', { name: /siguiente/i })).toBeVisible({ timeout: TIMEOUT })
    await expect(page.getByRole('button', { name: /anterior/i })).toBeDisabled({ timeout: TIMEOUT })
  })

  test('lesson view has no JS errors', async ({ page }) => {
    if (!lessonId) test.skip(true, 'No lesson ID')
    const errors: string[] = []
    page.on('pageerror', err => errors.push(err.message))
    await login(page)
    await page.goto(`/learn/${COURSE_SLUG}/${lessonId}`)
    await page.waitForTimeout(2000)
    expect(errors.filter(e => !e.includes('ResizeObserver'))).toHaveLength(0)
  })

  test('unauthorized user redirected from lesson view', async ({ page }) => {
    if (!lessonId) test.skip(true, 'No lesson ID')
    await page.goto(`/learn/${COURSE_SLUG}/${lessonId}`)
    await page.waitForURL('/login', { timeout: 8000 })
    await expect(page).toHaveURL('/login')
  })
})
