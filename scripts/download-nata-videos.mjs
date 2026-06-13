#!/usr/bin/env node
/**
 * download-nata-videos.mjs
 *
 * Descarga SOLO los videos principales (largos) del curso "EDICIÓN LIMITADA"
 * directamente desde Google Drive a una carpeta local plana, numerados y
 * ordenados, listos para arrastrar a YouTube. Sin ZIPs, sin mezcla, sin basura.
 *
 * Filtra automáticamente: clips "Frase Ancla", resource forks (._*), .DS_Store,
 * subcarpetas CLIPS, y cualquier archivo < 10MB (no es el video full).
 *
 * Requiere env: GOOGLE_DRIVE_API_KEY
 * (el folder tiene que ser público "anyone with link" — ya lo es)
 *
 * Uso:
 *   GOOGLE_DRIVE_API_KEY=... node scripts/download-nata-videos.mjs [--dry-run]
 *
 * Salida: ~/Desktop/nata-videos-youtube/
 *   01 - ¿Qué es una marca personal y por qué el estilo importa.mp4
 *   02 - El lujo como lenguaje de marca.mp4
 *   ...
 *   25 - Tu declaración de Edición Limitada.mp4
 */

import { createWriteStream, mkdirSync, existsSync, statSync } from 'node:fs'
import { Readable } from 'node:stream'
import { pipeline } from 'node:stream/promises'
import { join } from 'node:path'
import { homedir } from 'node:os'

const ROOT_FOLDER_ID = '1BxH3JjPSYF74Lzz1-VnqmI56pPofKV3G' // EDICIÓN LIMITADA
const API_KEY = process.env.GOOGLE_DRIVE_API_KEY
const DRY_RUN = process.argv.includes('--dry-run')
// --modulo N → baja solo el módulo N (1-5). Útil para bajar por tandas y no llenar el disco.
const moduloArg = process.argv.find(a => a.startsWith('--modulo'))
const ONLY_MODULE = moduloArg ? parseInt(moduloArg.split(/[=\s]/)[1] ?? process.argv[process.argv.indexOf(moduloArg) + 1], 10) : null
const DEST = join(homedir(), 'Desktop', 'nata-videos-youtube')

if (!API_KEY) {
  console.error('Falta GOOGLE_DRIVE_API_KEY. Uso:')
  console.error('  GOOGLE_DRIVE_API_KEY=AIza... node scripts/download-nata-videos.mjs --dry-run')
  process.exit(1)
}

async function listFolder(folderId) {
  const params = new URLSearchParams({
    q: `'${folderId}' in parents and trashed=false`,
    fields: 'files(id,name,mimeType,size)',
    pageSize: '200',
    key: API_KEY,
    orderBy: 'name',
  })
  const res = await fetch(`https://www.googleapis.com/drive/v3/files?${params}`)
  if (!res.ok) throw new Error(`Drive list ${folderId}: ${res.status} ${(await res.text()).slice(0, 200)}`)
  return (await res.json()).files ?? []
}

// macOS guarda los nombres en Unicode NFD (acentos descompuestos: "o"+◌́).
// Quitamos los combining marks para que los regex matcheen "Módulo"/"Modulo" igual.
function deaccent(s) {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '')
}

function parseNum(name) {
  const m = name.match(/\d+/)
  return m ? parseInt(m[0], 10) : 9999
}

// ¿Es un archivo de video (no resource fork ni oculto)?
function isVideoFile(file) {
  if (file.mimeType !== 'video/mp4' && file.mimeType !== 'video/quicktime') return false
  if (file.name.startsWith('._') || file.name.startsWith('.')) return false
  return true
}

// Elige el video LARGO de una clase = el más pesado. Los clips (Frase Ancla,
// "Frase 16-9", etc.) siempre pesan <100MB; el video de clase pesa 1-3GB.
// Robusto ante typos en los nombres de los clips.
const MIN_MAIN_VIDEO_BYTES = 300_000_000 // 300MB — bajo esto es clip, no clase

function pickMainVideo(files) {
  const videos = files.filter(isVideoFile)
  if (videos.length === 0) return { video: null, reason: 'sin videos' }
  const biggest = videos.reduce((a, b) =>
    parseInt(a.size || '0', 10) >= parseInt(b.size || '0', 10) ? a : b)
  if (parseInt(biggest.size || '0', 10) < MIN_MAIN_VIDEO_BYTES) {
    return { video: null, reason: `solo clips (max ${fmtBytes(biggest.size)}) — falta el video largo` }
  }
  return { video: biggest, reason: null }
}

// Limpia el nombre de la clase para un filename prolijo
function cleanClassName(folderName) {
  return folderName
    .replace(/^Clase\s*\d+\s*-?\s*/i, '')  // saca "Clase 1 - "
    .replace(/[/\\:*?"<>|]/g, '')           // chars inválidos en filename
    .replace(/_/g, '')
    .trim()
}

function fmtBytes(b) {
  const n = parseInt(b || '0', 10)
  if (n > 1024 ** 3) return `${(n / 1024 ** 3).toFixed(2)} GB`
  return `${(n / 1024 ** 2).toFixed(0)} MB`
}

async function downloadFile(fileId, destPath) {
  const url = `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media&key=${API_KEY}`
  const res = await fetch(url)
  if (!res.ok) throw new Error(`download ${fileId}: ${res.status}`)
  await pipeline(Readable.fromWeb(res.body), createWriteStream(destPath))
}

async function main() {
  console.log(`\n📦 ${DRY_RUN ? 'DRY-RUN (no descarga, solo lista)' : 'DESCARGA REAL'}`)
  console.log(`📂 Destino: ${DEST}\n`)

  const allModules = (await listFolder(ROOT_FOLDER_ID))
    .filter(f => f.mimeType === 'application/vnd.google-apps.folder' && /modulo/i.test(deaccent(f.name)))
    .sort((a, b) => parseNum(a.name) - parseNum(b.name))
  const modules = ONLY_MODULE ? allModules.filter(m => parseNum(m.name) === ONLY_MODULE) : allModules
  if (ONLY_MODULE) console.log(`🎯 Solo módulo ${ONLY_MODULE}\n`)

  // Recolectar todos los videos principales en orden global
  const queue = []
  for (const mod of modules) {
    const classes = (await listFolder(mod.id))
      .filter(f => f.mimeType === 'application/vnd.google-apps.folder' && /clase/i.test(deaccent(f.name)))
      .sort((a, b) => parseNum(a.name) - parseNum(b.name))
    for (const cls of classes) {
      const files = await listFolder(cls.id)
      const { video, reason } = pickMainVideo(files)
      queue.push({ module: mod.name, className: cls.name, video, reason })
    }
  }

  if (!DRY_RUN) mkdirSync(DEST, { recursive: true })

  let idx = 0
  let totalBytes = 0
  let ok = 0, skip = 0, fail = 0

  for (const item of queue) {
    idx++
    const num = String(idx).padStart(2, '0')
    if (!item.video) {
      console.log(`  ⚠️  ${num} — ${cleanClassName(item.className)}: ${item.reason ?? 'SIN video principal'}`)
      skip++
      continue
    }
    const fname = `${num} - ${cleanClassName(item.className)}.mp4`
    const destPath = join(DEST, fname)
    totalBytes += parseInt(item.video.size || '0', 10)

    if (DRY_RUN) {
      console.log(`  ${num} ← ${item.video.name} (${fmtBytes(item.video.size)})`)
      console.log(`       → ${fname}`)
      ok++
      continue
    }

    // Skip si ya existe con tamaño correcto (reanudable)
    if (existsSync(destPath) && Math.abs(statSync(destPath).size - parseInt(item.video.size, 10)) < 1024) {
      console.log(`  ⏭️  ${num} ya descargado: ${fname}`)
      ok++
      continue
    }

    process.stdout.write(`  ⬇️  ${num} ${fname} (${fmtBytes(item.video.size)})... `)
    try {
      await downloadFile(item.video.id, destPath)
      console.log('✅')
      ok++
    } catch (e) {
      console.log(`❌ ${e.message}`)
      fail++
    }
  }

  console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`)
  console.log(`  Videos: ${ok} ok · ${skip} sin video · ${fail} fallaron`)
  console.log(`  Peso total: ${fmtBytes(String(totalBytes))}`)
  if (DRY_RUN) {
    console.log(`\n  Esto es solo un preview. Para descargar de verdad, corré sin --dry-run.`)
  } else {
    console.log(`\n  ✅ Listos en: ${DEST}`)
    console.log(`  Ahora: abrí YouTube Studio → Subir → arrastrá los 25 (ya están en orden).`)
  }
}

main().catch(e => { console.error('\n💥', e.message); process.exit(1) })
