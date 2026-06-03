#!/usr/bin/env node
/**
 * upload-drive-to-supabase.mjs
 *
 * Migrá videos desde un folder de Google Drive (público, anyone-with-link reader)
 * a Supabase Storage bucket privado `lesson-videos`, matcheando por orden de
 * carpetas Módulo X/Clase Y contra los registros de la DB.
 *
 * 0 transcoding, 0 recompresión — bytes raw del Drive a bytes raw en Supabase.
 * Si el video es 4K, se mantiene 4K.
 *
 * Requiere:
 *   - GOOGLE_DRIVE_API_KEY  (Google Cloud Console → APIs & Services → Credentials → Create API key)
 *   - SUPABASE_URL          (https://hoolsigtquohayhpqgtb.supabase.co)
 *   - SUPABASE_SERVICE_ROLE_KEY (Supabase → Project Settings → API → service_role)
 *
 * Uso:
 *   node scripts/upload-drive-to-supabase.mjs <ROOT_FOLDER_ID> <COURSE_ID> [--dry-run]
 *
 * Ejemplo Edición Limitada:
 *   GOOGLE_DRIVE_API_KEY=... SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... \
 *     node scripts/upload-drive-to-supabase.mjs \
 *     1BxH3JjPSYF74Lzz1-VnqmI56pPofKV3G \
 *     48e79c6a-9e97-4340-8977-124f938a4c16
 */

import { createClient } from '@supabase/supabase-js'
import { Readable } from 'node:stream'

// ─── Args + env ──────────────────────────────────────────────────────────
const ROOT_FOLDER_ID = process.argv[2]
const COURSE_ID = process.argv[3]
const DRY_RUN = process.argv.includes('--dry-run')

const DRIVE_API_KEY = process.env.GOOGLE_DRIVE_API_KEY
const SUPABASE_URL = process.env.SUPABASE_URL
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!ROOT_FOLDER_ID || !COURSE_ID) {
  console.error('Uso: node upload-drive-to-supabase.mjs <ROOT_FOLDER_ID> <COURSE_ID> [--dry-run]')
  process.exit(1)
}
if (!DRIVE_API_KEY || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Faltan env vars: GOOGLE_DRIVE_API_KEY, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
})

// ─── Helpers ────────────────────────────────────────────────────────────
async function listFolder(folderId) {
  const params = new URLSearchParams({
    q: `'${folderId}' in parents and trashed=false`,
    fields: 'files(id,name,mimeType,size)',
    pageSize: '100',
    key: DRIVE_API_KEY,
  })
  const res = await fetch(`https://www.googleapis.com/drive/v3/files?${params}`)
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Drive API list failed for ${folderId}: ${res.status} — ${text.slice(0, 200)}`)
  }
  const json = await res.json()
  return json.files ?? []
}

async function downloadDriveStream(fileId) {
  const url = `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media&key=${DRIVE_API_KEY}`
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Drive download failed for ${fileId}: ${res.status}`)
  return res.body // ReadableStream
}

function parseOrder(name) {
  const m = name.match(/\d+/)
  return m ? parseInt(m[0], 10) : 9999
}

function isMainVideo(file) {
  if (file.mimeType !== 'video/mp4' && file.mimeType !== 'video/quicktime') return false
  if (file.name.startsWith('._')) return false       // resource fork macOS
  if (file.name.startsWith('.')) return false        // hidden
  if (/Frase\s+Ancla/i.test(file.name)) return false // clips de marketing
  const size = parseInt(file.size || '0', 10)
  if (size < 10_000_000) return false                // <10MB → no es video full
  return true
}

function fmtMB(bytes) {
  return `${(parseInt(bytes || '0', 10) / 1024 / 1024).toFixed(1)} MB`
}

// ─── Main ────────────────────────────────────────────────────────────────
async function main() {
  console.log(`📂 Root folder: ${ROOT_FOLDER_ID}`)
  console.log(`🎓 Course ID:   ${COURSE_ID}`)
  console.log(`🧪 Dry-run:     ${DRY_RUN ? 'SÍ (no sube nada)' : 'NO (sube de verdad)'}\n`)

  // 1) Cargar lecciones de la DB
  const { data: modules, error: mErr } = await supabase
    .from('modules')
    .select('id, order_index, title, lessons(id, order_index, title)')
    .eq('course_id', COURSE_ID)
    .order('order_index')

  if (mErr) throw new Error(`DB query modules failed: ${mErr.message}`)
  if (!modules || modules.length === 0) throw new Error(`No modules found for course ${COURSE_ID}`)

  console.log(`📚 DB: ${modules.length} módulos, ${modules.reduce((acc, m) => acc + (m.lessons?.length ?? 0), 0)} lecciones`)

  // 2) Listar módulos del Drive
  const driveModules = (await listFolder(ROOT_FOLDER_ID))
    .filter(f => f.mimeType === 'application/vnd.google-apps.folder' && /M[óo]dulo/i.test(f.name))
    .sort((a, b) => parseOrder(a.name) - parseOrder(b.name))

  console.log(`📁 Drive: ${driveModules.length} carpetas Módulo encontradas\n`)

  if (driveModules.length !== modules.length) {
    console.warn(`⚠️  Mismatch: ${driveModules.length} drive vs ${modules.length} DB modules`)
  }

  // 3) Recorrer módulos
  let totalOK = 0
  let totalFail = 0
  let totalSkip = 0
  let totalBytes = 0

  for (let mIdx = 0; mIdx < driveModules.length; mIdx++) {
    const driveModule = driveModules[mIdx]
    const dbModule = modules[mIdx]
    if (!dbModule) {
      console.warn(`⚠️  Drive module ${driveModule.name} sin contraparte en DB, skip`)
      continue
    }

    console.log(`━━━ Módulo ${mIdx + 1}: ${dbModule.title} (drive=${driveModule.name}) ━━━`)

    const driveClasses = (await listFolder(driveModule.id))
      .filter(f => f.mimeType === 'application/vnd.google-apps.folder' && /Clase/i.test(f.name))
      .sort((a, b) => parseOrder(a.name) - parseOrder(b.name))

    const dbLessons = (dbModule.lessons ?? []).sort((a, b) => a.order_index - b.order_index)

    for (let lIdx = 0; lIdx < driveClasses.length; lIdx++) {
      const driveClass = driveClasses[lIdx]
      const dbLesson = dbLessons[lIdx]
      if (!dbLesson) {
        console.warn(`  ⚠️  Drive class ${driveClass.name} sin contraparte en DB, skip`)
        totalSkip++
        continue
      }

      // Listar contenido de la clase
      const classFiles = await listFolder(driveClass.id)
      const mainVideo = classFiles.find(isMainVideo)

      if (!mainVideo) {
        console.warn(`  ⚠️  Sin video principal en ${driveClass.name}`)
        totalSkip++
        continue
      }

      const sizeMB = fmtMB(mainVideo.size)
      console.log(`  📹 ${dbLesson.title}`)
      console.log(`     ← ${mainVideo.name} (${sizeMB})`)

      if (DRY_RUN) {
        console.log(`     [DRY] would upload to lesson-videos/${COURSE_ID}/${dbLesson.id}.mp4`)
        totalOK++
        totalBytes += parseInt(mainVideo.size || '0', 10)
        continue
      }

      try {
        // Download del Drive (stream)
        const stream = await downloadDriveStream(mainVideo.id)
        // Convertimos a buffer ÚNICO para Supabase upload (Supabase JS client
        // no acepta ReadableStream directo en v2; necesita Blob/ArrayBuffer/File)
        const buf = await new Response(stream).arrayBuffer()

        const storagePath = `${COURSE_ID}/${dbLesson.id}.mp4`

        const { error: uploadErr } = await supabase.storage
          .from('lesson-videos')
          .upload(storagePath, buf, {
            contentType: 'video/mp4',
            upsert: true,
            cacheControl: '3600',
          })

        if (uploadErr) throw new Error(`upload: ${uploadErr.message}`)

        // Update lesson en DB
        const { error: updateErr } = await supabase
          .from('lessons')
          .update({ video_provider: 'supabase', video_url: storagePath })
          .eq('id', dbLesson.id)

        if (updateErr) throw new Error(`db update: ${updateErr.message}`)

        console.log(`     ✅ uploaded → ${storagePath}`)
        totalOK++
        totalBytes += parseInt(mainVideo.size || '0', 10)
      } catch (err) {
        console.error(`     ❌ ${err.message}`)
        totalFail++
      }
    }
    console.log('')
  }

  console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`)
  console.log(`Resultado final:`)
  console.log(`  ✅ OK:    ${totalOK}`)
  console.log(`  ❌ Fail:  ${totalFail}`)
  console.log(`  ⚠️  Skip:  ${totalSkip}`)
  console.log(`  📦 Total: ${(totalBytes / 1024 / 1024 / 1024).toFixed(2)} GB`)
}

main().catch(err => {
  console.error(`\n💥 Fatal:`, err)
  process.exit(1)
})
