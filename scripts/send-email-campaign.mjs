#!/usr/bin/env node
/**
 * send-email-campaign.mjs
 *
 * Manda la secuencia de lanzamiento de Edición Limitada a la base de leads
 * (CSV del evento) vía Resend. Con salvaguardas: dry-run, test a 1 mail,
 * throttle anti-spam, dedup, y placeholder de exclusión de ya-compradores.
 *
 * ⚠️ ENVÍO REAL A TERCEROS. Correr SOLO tras: (1) verificar dominio en Resend,
 * (2) revisar el copy, (3) decidir la fecha. Empezá SIEMPRE con --test.
 *
 * Requiere env: RESEND_API_KEY  (la key del curso de Nata)
 *
 * Uso:
 *   # 1. Ver a quién le mandaría (no manda nada):
 *   RESEND_API_KEY=re_... node scripts/send-email-campaign.mjs --email 1 --dry-run
 *
 *   # 2. Mandar solo a vos para ver cómo llega:
 *   RESEND_API_KEY=re_... node scripts/send-email-campaign.mjs --email 1 --test tu@email.com
 *
 *   # 3. Envío real a toda la base (con throttle):
 *   RESEND_API_KEY=re_... node scripts/send-email-campaign.mjs --email 1
 */

import { readFileSync } from 'node:fs'

// ─── CONFIG ─────────────────────────────────────────────────────────────────
const BASE_CSV = '/Users/juanilopez/Documents/Claudio/Nata Alvarez/BASES DE DATOS/registros-eventos-2026-06-13.csv'
const FROM = 'Nata Álvarez <hola@natoglobal.com.ar>' // dominio verificado en Resend
const REPLY_TO = 'nata@stylecontenidos.com'
const CURSO_URL = 'https://university.natoglobal.com.ar/nata-alvarez/edicion-limitada?utm_source=email'
const throttleArg = process.argv.find(a => a.startsWith('--throttle'))
const THROTTLE_MS = throttleArg ? Number(throttleArg.split(/[=\s]/)[1] ?? process.argv[process.argv.indexOf(throttleArg) + 1]) : 1200 // ms entre requests

const API_KEY = process.env.RESEND_API_KEY
const emailArg = process.argv.find(a => a.startsWith('--email'))
const EMAIL_N = emailArg ? parseInt(emailArg.split(/[=\s]/)[1] ?? process.argv[process.argv.indexOf(emailArg) + 1], 10) : null
const DRY = process.argv.includes('--dry-run')
const testArg = process.argv.find(a => a === '--test')
const TEST_TO = testArg ? process.argv[process.argv.indexOf(testArg) + 1] : null
// --at <ISO>: programa el envío (scheduled_at de Resend) en vez de mandar ya
const atArg = process.argv.find(a => a === '--at')
const AT = atArg ? process.argv[process.argv.indexOf(atArg) + 1] : null
// --skip N: saltea los primeros N destinatarios (para reanudar un envío cortado a la mitad)
const skipArg = process.argv.find(a => a.startsWith('--skip'))
const SKIP = skipArg ? Number(skipArg.split(/[=\s]/)[1] ?? process.argv[process.argv.indexOf(skipArg) + 1]) : 0

if (!API_KEY && !DRY) { console.error('Falta RESEND_API_KEY (o usá --dry-run)'); process.exit(1) }
if (!EMAIL_N || EMAIL_N < 1 || EMAIL_N > 5) { console.error('Indicá --email <1-5>'); process.exit(1) }

// ─── Template HTML base (estética sobria) ───────────────────────────────────
function wrap(bodyHtml) {
  return `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;background:#faf9fc;font-family:Georgia,'Times New Roman',serif;color:#1a1a2e">
<table width="100%" cellpadding="0" cellspacing="0" style="padding:32px 16px"><tr><td align="center">
<table width="560" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,.06)">
<tr><td style="padding:40px 44px 36px">${bodyHtml}</td></tr>
<tr><td style="background:#1a1a2e;padding:24px 44px;text-align:center">
<p style="margin:0;color:#fff;font-family:-apple-system,sans-serif;font-size:13px;font-weight:600;letter-spacing:1px">NATA ÁLVAREZ</p>
<p style="margin:6px 0 0;color:#9a93b8;font-family:-apple-system,sans-serif;font-size:11px">Edición Limitada · Marca personal con criterio</p>
</td></tr></table>
<p style="color:#b8b3c9;font-family:-apple-system,sans-serif;font-size:11px;margin:16px 0 0">Recibís este mail porque dejaste tus datos en un evento o sorteo de Style. <a href="{unsubscribe}" style="color:#b8b3c9">Darme de baja</a></p>
</td></tr></table></body></html>`
}
function p(t) { return `<p style="margin:0 0 18px;font-size:16px;line-height:1.65">${t}</p>` }
function btn(label) { return `<table cellpadding="0" cellspacing="0" style="margin:8px 0 22px"><tr><td style="border-radius:10px;background:#966f2c"><a href="${CURSO_URL}" style="display:inline-block;padding:14px 30px;color:#fff;font-family:-apple-system,sans-serif;font-weight:700;font-size:15px;text-decoration:none">${label}</a></td></tr></table>` }

// ─── Los 5 emails — secuencia POST-lanzamiento, escasez por CUPOS LIMITADOS ───
// (sin countdown ni "el precio sube": Juani no sabe cuándo cierra). Voz de Nata.
const EMAILS = {
  1: { subject: 'Lo que presenté hoy', html: n => wrap(
    p(`Hola ${n},`) +
    p(`Hoy presenté algo que vengo construyendo hace años. Si me seguís por Instagram, ya lo cruzaste —pero quería que lo supieras de mí, no por un feed.`) +
    p(`Se llama <strong>Edición Limitada</strong>: mi curso de marca personal. 5 semanas para construir tu imagen, tu presencia y tu comunicación desde el criterio, el estilo y la autenticidad. Todo lo que aprendí en 20 años, hecho método.`) +
    p(`Te escribo a vos porque en algún momento dejaste tus datos conmigo —en un evento, en el sorteo de Style— y quiero que estés entre las primeras.`) +
    p(`Abrí <strong>cupos limitados</strong> a precio de preventa. Te dejo todo acá:`) +
    btn('Conocer Edición Limitada') +
    p(`Un beso,<br>Nata`)) },
  2: { subject: 'El lujo no grita. Susurra.', html: n => wrap(
    p(`Hola ${n},`) +
    p(`Cuando hice mi diplomatura en marketing de lujo en el IE Business School de Madrid, me quedó una idea que todavía me ordena: <strong>el lujo genuino no grita, susurra.</strong> Y en ese susurro hay más poder que en cualquier estridencia.`) +
    p(`Con las personas pasa igual. Una marca personal de lujo no es una marca cara: es una marca <strong>cuidada</strong>. Que elige con criterio. Que sabe qué mostrar y qué callar.`) +
    p(`Eso es lo que vas a construir en <strong>Edición Limitada</strong>: 25 clases y 5 rituales para que tu imagen, tu presencia y tu comunicación sean una sola estrategia. La tuya.`) +
    p(`Son <strong>cupos limitados</strong>, y todavía quedan lugares de preventa.`) +
    btn('Quiero mi lugar') +
    p(`Nata`)) },
  3: { subject: '¿Esto es para mí?', html: n => wrap(
    p(`Hola ${n},`) +
    p(`Desde que abrí Edición Limitada me llegó varias veces la misma pregunta: <em>"Nata, ¿esto es para mí? No soy famosa, no tengo una empresa."</em>`) +
    p(`Te respondo con honestidad: <strong>todas tenemos una marca personal.</strong> La diferencia es construirla con criterio, o dejar que se arme sola —contando una historia que quizás ni es la tuya.`) +
    p(`Este curso es para quien siente que tiene algo valioso para mostrar y todavía no encontró cómo. Si te quedaste pensando en esto desde que lo presenté, esa duda ya te está diciendo algo.`) +
    btn('Entrar a Edición Limitada') +
    p(`Nata`)) },
  4: { subject: 'Quiénes están entrando', html: n => wrap(
    p(`Hola ${n},`) +
    p(`Algo que me está pasando con Edición Limitada y no esperaba: las personas que se suman no son las que "más saben" de marca. Son las que <strong>decidieron que era el momento</strong> de hacerlo con criterio.`) +
    p(`Por eso lo pensé como una edición limitada de verdad: <strong>cupos acotados</strong>, para poder acompañar de cerca. No es una táctica —es la única forma en que sé hacer las cosas bien.`) +
    p(`Quedan algunos lugares de preventa. Si venías dándole vueltas, este es el mensaje.`) +
    btn('Sumarme ahora') +
    p(`Nata`)) },
  5: { subject: 'Cupos limitados (de verdad)', html: n => wrap(
    p(`Hola ${n},`) +
    p(`Esto es lo último que te escribo sobre la preventa.`) +
    p(`<strong>Edición Limitada es, literalmente, limitada:</strong> hay una cantidad de lugares y no más. No te apuro por una fecha —te invito a que decidas por vos. Por esa versión tuya que ya sabés que está, y a la que solo le falta articularse.`) +
    p(`Si es para vos, tu lugar te está esperando.`) +
    btn('Entro ahora, a precio de preventa') +
    p(`Gracias por leerme estos días, sea cual sea tu decisión.<br>Nata`)) },
}

// ─── Leer base ───────────────────────────────────────────────────────────────
function parseCsv(path) {
  const lines = readFileSync(path, 'utf-8').split(/\r?\n/).filter(Boolean)
  const pl = (l) => { const o=[];let c='';let q=false; for(const ch of l){ if(ch==='"')q=!q; else if(ch===','&&!q){o.push(c);c=''} else c+=ch } o.push(c); return o.map(s=>s.trim()) }
  const h = pl(lines[0])
  return lines.slice(1).map(l => { const c=pl(l); const o={}; h.forEach((k,i)=>o[k]=c[i]??''); return o })
}

const seen = new Set()
const recipients = []
for (const r of parseCsv(BASE_CSV)) {
  const email = (r.Email || '').trim().toLowerCase()
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email) || seen.has(email)) continue
  seen.add(email)
  recipients.push({ email, name: (r.Nombre || '').split(' ')[0] || 'Hola' })
}

// TODO exclusión de ya-compradores: query a Supabase enrollments approved y filtrar.
// Por ahora documentado — agregar antes del envío real de los emails 4-5.

const tmpl = EMAILS[EMAIL_N]
console.log(`\n📧 Email ${EMAIL_N}: "${tmpl.subject}"`)
console.log(`   Destinatarios únicos: ${recipients.length}`)
console.log(`   Modo: ${DRY ? 'DRY-RUN' : TEST_TO ? `TEST → ${TEST_TO}` : 'ENVÍO REAL'}\n`)

async function sendOne(to, name) {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: FROM, to: [to], reply_to: REPLY_TO, subject: tmpl.subject, html: tmpl.html(name).replace('{unsubscribe}', '#'), ...(AT ? { scheduled_at: AT } : {}) }),
  })
  if (!res.ok) throw new Error(`${res.status} ${(await res.text()).slice(0,150)}`)
}

const sleep = (ms) => new Promise(r => setTimeout(r, ms))

async function main() {
  if (DRY) {
    recipients.slice(0, 10).forEach((r, i) => console.log(`  ${i+1}. ${r.name} <${r.email}>`))
    console.log(`  ... y ${Math.max(0, recipients.length - 10)} más`)
    console.log(`\n  (DRY-RUN — no se envió nada)`)
    return
  }
  if (TEST_TO) {
    await sendOne(TEST_TO, 'Juani')
    console.log(`  ✅ Test enviado a ${TEST_TO}. Revisá cómo llegó (incluí spam).`)
    return
  }
  const queue = recipients.slice(SKIP)
  if (SKIP) console.log(`  (saltando los primeros ${SKIP} — reanudando en ${queue.length} restantes)\n`)
  let ok=0, fail=0
  for (const r of queue) {
    try { await sendOne(r.email, r.name); ok++; process.stdout.write(`\r  Enviados: ${ok}/${queue.length}`) }
    catch (e) { fail++; console.error(`\n  ❌ ${r.email}: ${e.message}`) }
    await sleep(THROTTLE_MS)
  }
  console.log(`\n\n  ✅ ${ok} enviados · ${fail} fallaron`)
}

main().catch(e => { console.error('💥', e.message); process.exit(1) })
