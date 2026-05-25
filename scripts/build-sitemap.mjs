#!/usr/bin/env node
/**
 * Genera public/sitemap.xml a partir de cursos publicados en Supabase.
 *
 * Corre en build (npm run build) y queda inline en dist/sitemap.xml.
 * Si Supabase no responde o no hay credentials, genera el sitemap estático
 * (solo páginas públicas).
 */
import { writeFileSync, mkdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const PUBLIC_URL = process.env.VITE_PUBLIC_URL ?? 'https://natouniversity.lovable.app'
const SUPABASE_URL = process.env.VITE_SUPABASE_URL ?? 'https://hoolsigtquohayhpqgtb.supabase.co'
const ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY

const STATIC_PAGES = [
  { loc: '/', changefreq: 'weekly', priority: '1.0' },
  { loc: '/courses', changefreq: 'daily', priority: '0.9' },
  { loc: '/pricing', changefreq: 'weekly', priority: '0.8' },
  { loc: '/create-school', changefreq: 'monthly', priority: '0.7' },
  { loc: '/login', changefreq: 'monthly', priority: '0.4' },
  { loc: '/signup', changefreq: 'monthly', priority: '0.5' },
  { loc: '/affiliates', changefreq: 'monthly', priority: '0.5' },
]

async function fetchPublishedCourses() {
  if (!ANON_KEY) {
    console.warn('[sitemap] VITE_SUPABASE_ANON_KEY no seteada — generando sitemap estático')
    return []
  }
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/courses?select=slug,updated_at&is_published=eq.true`, {
      headers: { apikey: ANON_KEY, Authorization: `Bearer ${ANON_KEY}` },
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    return await res.json()
  } catch (e) {
    console.warn('[sitemap] No se pudieron obtener cursos:', e.message ?? e)
    return []
  }
}

function urlEntry({ loc, lastmod, changefreq, priority }) {
  return `  <url>
    <loc>${PUBLIC_URL}${loc}</loc>${lastmod ? `\n    <lastmod>${lastmod}</lastmod>` : ''}
    <changefreq>${changefreq}</changefreq>
    <priority>${priority}</priority>
  </url>`
}

async function build() {
  const courses = await fetchPublishedCourses()
  const entries = [
    ...STATIC_PAGES.map(urlEntry),
    ...courses.map(c => urlEntry({
      loc: `/courses/${c.slug}`,
      lastmod: (c.updated_at ?? '').slice(0, 10),
      changefreq: 'weekly',
      priority: '0.8',
    })),
  ]
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries.join('\n')}
</urlset>
`
  const outDir = resolve(__dirname, '..', 'public')
  mkdirSync(outDir, { recursive: true })
  writeFileSync(resolve(outDir, 'sitemap.xml'), xml)
  console.log(`[sitemap] OK: ${STATIC_PAGES.length} estáticas + ${courses.length} cursos`)
}

build().catch(e => {
  console.error('[sitemap] error fatal:', e)
  process.exit(1)
})
