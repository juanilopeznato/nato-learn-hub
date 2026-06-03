#!/usr/bin/env node
/**
 * extract-nata-videos.mjs
 *
 * Después de descargar la carpeta `EDICIÓN LIMITADA` del Drive como ZIP y
 * descomprimirla, este script encuentra los 25 videos principales (uno por clase)
 * y los copia a una carpeta plana con nombres listos para YouTube.
 *
 * Estructura esperada de input:
 *   EDICIÓN LIMITADA/
 *     Módulo 1 - Tu firma personal/
 *       Clase 1 - ¿Qué es una marca.../
 *         Clase 1 - ...mp4           ← VIDEO PRINCIPAL
 *         Frase Ancla 16-9.mp4       ← ignorar
 *         Frase Ancla 9-16.mp4       ← ignorar
 *         .DS_Store / ._.DS_Store    ← ignorar
 *     ...
 *
 * Output:
 *   nata-yt-upload/
 *     M1L1.mp4   (Módulo 1, Clase 1)
 *     M1L2.mp4   (Módulo 1, Clase 2)
 *     ...
 *     M5L5.mp4   (Módulo 5, Clase 5)
 *
 * Uso:
 *   node scripts/extract-nata-videos.mjs "/ruta/a/EDICIÓN LIMITADA"
 *
 * Default destino: ~/Desktop/nata-yt-upload/
 */

import { readdirSync, statSync, copyFileSync, mkdirSync, existsSync } from 'node:fs'
import { join, basename } from 'node:path'
import { homedir } from 'node:os'

const SRC = process.argv[2]
const DST = process.argv[3] ?? join(homedir(), 'Desktop', 'nata-yt-upload')

if (!SRC) {
  console.error('Uso: node scripts/extract-nata-videos.mjs <ruta/a/EDICIÓN LIMITADA> [destino]')
  console.error('Ejemplo:')
  console.error('  node scripts/extract-nata-videos.mjs "$HOME/Downloads/EDICIÓN LIMITADA"')
  process.exit(1)
}

if (!existsSync(SRC)) {
  console.error(`No existe: ${SRC}`)
  process.exit(1)
}

mkdirSync(DST, { recursive: true })

// Filtros — qué considerar video principal de la clase
function isMainVideo(filename, sizeBytes) {
  const lower = filename.toLowerCase()
  if (!lower.endsWith('.mp4') && !lower.endsWith('.mov')) return false
  if (filename.startsWith('._')) return false      // resource fork macOS
  if (filename.startsWith('.')) return false       // hidden
  if (/frase\s+ancla/i.test(filename)) return false // clips marketing
  if (sizeBytes < 10_000_000) return false          // < 10MB = no es video full
  return true
}

function sortByOrderIndex(names) {
  return names.sort((a, b) => {
    const na = parseInt(a.match(/\d+/)?.[0] ?? '999', 10)
    const nb = parseInt(b.match(/\d+/)?.[0] ?? '999', 10)
    return na - nb
  })
}

function listDirs(path) {
  return readdirSync(path)
    .filter(name => statSync(join(path, name)).isDirectory())
}

function listFiles(path) {
  return readdirSync(path)
    .filter(name => statSync(join(path, name)).isFile())
}

console.log(`📂 Source: ${SRC}`)
console.log(`📂 Destino: ${DST}\n`)

// 1. Listar módulos (subcarpetas que empiezan con "Módulo")
const moduleDirs = sortByOrderIndex(
  listDirs(SRC).filter(d => /m[óo]dulo/i.test(d))
)

console.log(`📚 Módulos encontrados: ${moduleDirs.length}`)
moduleDirs.forEach((m, i) => console.log(`   ${i + 1}. ${m}`))
console.log('')

let totalCopied = 0
let totalSkipped = 0
let totalBytes = 0

// 2. Recorrer módulos en orden
moduleDirs.forEach((modDir, mIdx) => {
  const modPath = join(SRC, modDir)
  const classDirs = sortByOrderIndex(
    listDirs(modPath).filter(d => /clase/i.test(d))
  )

  console.log(`━━━ Módulo ${mIdx + 1}: ${modDir} (${classDirs.length} clases)`)

  classDirs.forEach((classDir, lIdx) => {
    const classPath = join(modPath, classDir)
    const files = listFiles(classPath)

    const mainVideo = files.find(name => {
      const fullPath = join(classPath, name)
      return isMainVideo(name, statSync(fullPath).size)
    })

    if (!mainVideo) {
      console.log(`   ⚠️  ${classDir} → sin video principal`)
      totalSkipped++
      return
    }

    const srcPath = join(classPath, mainVideo)
    const sizeMB = (statSync(srcPath).size / 1024 / 1024).toFixed(1)
    const dstName = `M${mIdx + 1}L${lIdx + 1}.mp4`
    const dstPath = join(DST, dstName)

    copyFileSync(srcPath, dstPath)

    console.log(`   ✅ ${dstName} ← ${mainVideo} (${sizeMB} MB)`)
    totalCopied++
    totalBytes += statSync(srcPath).size
  })
  console.log('')
})

console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`)
console.log(`✅ ${totalCopied} videos copiados`)
if (totalSkipped > 0) console.log(`⚠️  ${totalSkipped} clases sin video`)
console.log(`📦 Total: ${(totalBytes / 1024 / 1024 / 1024).toFixed(2)} GB`)
console.log(`\n📂 Listos para subir a YouTube en: ${DST}`)
console.log(`\nPróximo paso:`)
console.log(`  1. Abrí https://studio.youtube.com/ (con tu perfil de Nata)`)
console.log(`  2. Click "CREATE" → "Upload videos"`)
console.log(`  3. Arrastrá los 25 archivos de ${DST}`)
console.log(`  4. Mientras suben, marcá todos → Visibility: Unlisted`)
console.log(`  5. Cuando termine el processing, copiá las 25 URLs en orden`)
console.log(`  6. Volvé al panel instructor → "Importar URLs en bulk"`)
