#!/usr/bin/env node
/**
 * Falla si encuentra uploads directos a Supabase Storage fuera de `src/lib/storage.ts`.
 *
 * Lección Ranerzzz (14-may-2026): bandwidth llegó a 16/5 GB porque cada feature
 * subía imágenes a su manera, sin compresión ni thumbs. Esta regla obliga a
 * pasar por el pipeline único en `src/lib/storage.ts`.
 *
 * Corre como parte de `npm run lint:storage` y en CI.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(__dirname, '..', 'src')

// Patrones prohibidos fuera de lib/storage.ts
const DENY = [
  // Uploads directos
  /supabase\.storage\.from\([^)]+\)\.upload\(/,
  // Acceso directo a publicUrl en componentes (debería usar SmartImage / getOptimizedUrl)
]

// Archivos donde sí está permitido el patrón
const ALLOW = new Set([
  'lib/storage.ts',
  // Excepción: la página admin de migración legacy necesita pasar por debajo
  // del pipeline para reprocessar archivos viejos. Es one-shot, manual.
  'components/StorageMigration.tsx',
])

function walk(dir, acc = []) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry)
    const st = statSync(full)
    if (st.isDirectory()) walk(full, acc)
    else if (/\.(ts|tsx)$/.test(entry)) acc.push(full)
  }
  return acc
}

const files = walk(ROOT)
let violations = 0

for (const file of files) {
  const rel = file.replace(ROOT + '/', '')
  if (ALLOW.has(rel)) continue
  const content = readFileSync(file, 'utf8')

  // Colapsamos whitespace para detectar uploads multi-línea
  // (ej: supabase.storage\n.from(x)\n.upload(...))
  const collapsed = content.replace(/\s+/g, ' ')

  for (const pattern of DENY) {
    if (pattern.test(collapsed)) {
      // Encontrar la línea aproximada del primer match per-line para reporte
      const lines = content.split('\n')
      let reported = false
      lines.forEach((line, i) => {
        if (!reported && pattern.test(line)) {
          reported = true
          console.error(`\x1b[31m✗\x1b[0m ${rel}:${i + 1}`)
          console.error(`  ${line.trim()}`)
          console.error(`  → usá uploadImage() de @/lib/storage en lugar de upload directo.\n`)
        }
      })
      if (!reported) {
        // Match en patrón multi-línea: reportar sin línea exacta
        violations++
        console.error(`\x1b[31m✗\x1b[0m ${rel}`)
        console.error(`  → usá uploadImage() de @/lib/storage. Detecté un upload directo multi-línea.\n`)
      } else {
        violations++
      }
    }
  }
}

if (violations > 0) {
  console.error(`\n\x1b[31m${violations} violación(es) del pipeline de storage.\x1b[0m`)
  console.error('Todo upload de imagen debe pasar por src/lib/storage.ts (uploadImage).')
  console.error('Ver feedback_supabase_storage_pipeline en memoria — lección Ranerzzz may-2026.\n')
  process.exit(1)
}

console.log('\x1b[32m✓\x1b[0m Pipeline de storage OK — sin uploads directos detectados.')
