#!/usr/bin/env node
/**
 * Postbuild: reemplaza URLs hardcoded en dist/index.html y robots.txt con VITE_PUBLIC_URL.
 *
 * Mantenemos `index.html` con un dominio default (natouniversity.lovable.app) por compat
 * histórica con Lovable, y este script lo sobreescribe para que canonical/OG/twitter
 * apunten al dominio real del deploy.
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const DIST = resolve(__dirname, '../dist')

const PUBLIC_URL = (process.env.VITE_PUBLIC_URL ?? 'https://nato-learn-hub.vercel.app').replace(/\/$/, '')
const HOST = new URL(PUBLIC_URL).host

const FROM_URL = 'https://natouniversity.lovable.app'
const FROM_HOST = 'natouniversity.lovable.app'

function patch(file) {
  const path = resolve(DIST, file)
  if (!existsSync(path)) {
    console.log(`[postbuild] ${file} not found, skipping`)
    return
  }
  let content = readFileSync(path, 'utf8')
  const beforeUrl = (content.match(new RegExp(FROM_URL, 'g')) || []).length
  const beforeHost = (content.match(new RegExp(FROM_HOST.replace(/\./g, '\\.'), 'g')) || []).length
  content = content.replaceAll(FROM_URL, PUBLIC_URL)
  // Reemplazar el host suelto (data-domain="..." de Plausible) sin tocar el URL ya migrado
  content = content.replaceAll(`data-domain="${FROM_HOST}"`, `data-domain="${HOST}"`)
  writeFileSync(path, content)
  console.log(`[postbuild] ${file}: replaced ${beforeUrl} URLs + ${beforeHost - beforeUrl} hostnames → ${PUBLIC_URL}`)
}

console.log(`[postbuild] VITE_PUBLIC_URL = ${PUBLIC_URL}`)
patch('index.html')
patch('robots.txt')
console.log('[postbuild] done')
