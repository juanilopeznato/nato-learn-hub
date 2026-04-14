/**
 * NATO University — Screenshot + HTML patcher
 * Uso: node docs/take-screenshots.js
 */
import { chromium } from 'playwright'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const BASE_URL = 'http://localhost:8083'
const EMAIL = 'juanilopezfotografo@gmail.com'
const PASSWORD = process.env.SCREENSHOT_PASSWORD

if (!PASSWORD) {
  console.error('❌  Falta la contraseña. Usá: SCREENSHOT_PASSWORD=tupass node docs/take-screenshots.js')
  process.exit(1)
}

const OUT_DIR = path.join(__dirname, 'screenshots')
if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true })

async function shot(page, name) {
  await page.waitForTimeout(1500)
  await page.screenshot({ path: path.join(OUT_DIR, `${name}.png`), fullPage: false })
  console.log(`  ✓ ${name}.png`)
  return path.join(OUT_DIR, `${name}.png`)
}

function toBase64(filePath) {
  if (!fs.existsSync(filePath)) return null
  return 'data:image/png;base64,' + fs.readFileSync(filePath).toString('base64')
}

async function main() {
  const browser = await chromium.launch({ headless: true })
  const ctx = await browser.newContext({
    viewport: { width: 1280, height: 780 },
    deviceScaleFactor: 2,
  })
  const page = await ctx.newPage()

  const screenshots = {}

  // ─── Páginas públicas ─────────────────────────────────────────────
  console.log('\n📸 Páginas públicas...')

  await page.goto(`${BASE_URL}/courses`, { waitUntil: 'networkidle' })
  screenshots.marketplace = await shot(page, '1-marketplace')

  await page.goto(`${BASE_URL}/pricing`, { waitUntil: 'networkidle' })
  screenshots.pricing = await shot(page, '2-pricing')

  await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle' })
  screenshots.login = await shot(page, '3-login')

  // ─── Login ────────────────────────────────────────────────────────
  console.log('\n🔐 Iniciando sesión...')
  await page.fill('input[type="email"]', EMAIL)
  await page.fill('input[type="password"]', PASSWORD)
  await page.click('button[type="submit"]')
  try {
    await page.waitForURL(/\/(dashboard|instructor|nato)/, { timeout: 15000 })
    console.log('  ✓ Sesión iniciada en:', page.url())
  } catch {
    console.log('  ⚠ Redireccionando a:', page.url())
  }

  // ─── Páginas autenticadas ─────────────────────────────────────────
  console.log('\n📸 Páginas autenticadas...')

  await page.goto(`${BASE_URL}/nato`, { waitUntil: 'networkidle' })
  screenshots.nato = await shot(page, '4-nato-panel')

  await page.goto(`${BASE_URL}/instructor`, { waitUntil: 'networkidle' })
  screenshots.instructor = await shot(page, '5-instructor')

  await page.goto(`${BASE_URL}/dashboard`, { waitUntil: 'networkidle' })
  screenshots.dashboard = await shot(page, '6-dashboard')

  await page.goto(`${BASE_URL}/settings`, { waitUntil: 'networkidle' })
  screenshots.settings = await shot(page, '7-settings')

  await page.goto(`${BASE_URL}/community`, { waitUntil: 'networkidle' })
  screenshots.community = await shot(page, '8-community')

  // ─── Landing de un curso ──────────────────────────────────────────
  await page.goto(`${BASE_URL}/courses`, { waitUntil: 'networkidle' })
  const courseLink = page.locator('a[href^="/courses/"]:not([href="/courses"])').first()
  if (await courseLink.count() > 0) {
    const href = await courseLink.getAttribute('href')
    await page.goto(`${BASE_URL}${href}`, { waitUntil: 'networkidle' })
    screenshots.courseDetail = await shot(page, '9-course-detail')
  }

  await browser.close()

  // ─── Parchear el HTML ────────────────────────────────────────────
  console.log('\n🔧 Actualizando presentacion-socios.html...')

  const htmlPath = path.join(__dirname, 'presentacion-socios.html')
  let html = fs.readFileSync(htmlPath, 'utf8')

  // Map of CSS mockup class → screenshot key
  const patches = [
    { cssClass: 'mock-landing',     key: 'marketplace',  label: 'Vista 1 — Marketplace público' },
    { cssClass: 'mock-dashboard',   key: 'dashboard',    label: 'Vista 2 — Dashboard estudiante' },
    { cssClass: 'mock-lesson',      key: 'courseDetail', label: 'Vista 3 — Detalle de curso' },
    { cssClass: 'mock-instructor',  key: 'instructor',   label: 'Vista 4 — Panel instructor' },
    { cssClass: 'mock-nato',        key: 'nato',         label: 'Vista 5 — NATO Owner Panel' },
  ]

  let patched = 0
  for (const { cssClass, key, label } of patches) {
    const b64 = toBase64(screenshots[key])
    if (!b64) { console.log(`  ⚠ Sin captura para ${key}`); continue }

    // Match the entire <div class="mock-...">...</div> block
    const re = new RegExp(`(<div class="${cssClass}">[\\s\\S]*?<\\/div>\\s*<\\/div>)`, 'm')
    if (re.test(html)) {
      html = html.replace(re, `<img src="${b64}" style="width:100%;display:block" alt="${label}" />`)
      console.log(`  ✓ ${label}`)
      patched++
    } else {
      // fallback: replace entire mockup-body content
      const re2 = new RegExp(`(class="mockup-body">\\s*<div class="${cssClass})[\\s\\S]*?(<\\/div>\\s*<\\/div>\\s*<\\/div>)`, 'm')
      if (re2.test(html)) {
        html = html.replace(re2, `class="mockup-body"><img src="${b64}" style="width:100%;display:block" alt="${label}" /></div>`)
        console.log(`  ✓ ${label} (fallback)`)
        patched++
      }
    }
  }

  // Add pricing screenshot after pricing mockup section (if exists)
  if (screenshots.pricing) {
    const b64 = toBase64(screenshots.pricing)
    if (b64) {
      // inject a pricing section screenshot before the plans section
      const pricingImg = `\n<!-- PRICING SCREENSHOT -->\n<div style="max-width:1100px;margin:0 auto;padding:0 40px 40px"><div class="mockup-browser"><div class="mockup-bar"><div class="mockup-dots"><div class="mockup-dot red"></div><div class="mockup-dot yellow"></div><div class="mockup-dot green"></div></div><div class="mockup-url">natodigital.com/pricing</div></div><img src="${b64}" style="width:100%;display:block" alt="Pricing" /></div></div>\n`
      html = html.replace('<!-- ══════════════════════════════════════════════════════════ PLANES -->', pricingImg + '<!-- PLANES -->')
    }
  }

  fs.writeFileSync(htmlPath, html)
  console.log(`\n✅ ${patched} secciones reemplazadas con capturas reales.`)
  console.log(`📄 Abrí: docs/presentacion-socios.html\n`)
}

main().catch(e => { console.error('Error:', e.message); process.exit(1) })
