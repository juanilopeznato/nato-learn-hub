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
const FROM = 'Nata Álvarez <nata@stylecontenidos.com>' // requiere dominio verificado en Resend
const REPLY_TO = 'nata@stylecontenidos.com'
const CURSO_URL = 'https://university.natoglobal.com.ar/nata-alvarez/edicion-limitada' // cambiar al dominio final
const THROTTLE_MS = 1200 // ~50 emails/min — natural, no levanta flags de spam

const API_KEY = process.env.RESEND_API_KEY
const emailArg = process.argv.find(a => a.startsWith('--email'))
const EMAIL_N = emailArg ? parseInt(emailArg.split(/[=\s]/)[1] ?? process.argv[process.argv.indexOf(emailArg) + 1], 10) : null
const DRY = process.argv.includes('--dry-run')
const testArg = process.argv.find(a => a === '--test')
const TEST_TO = testArg ? process.argv[process.argv.indexOf(testArg) + 1] : null

if (!API_KEY && !DRY) { console.error('Falta RESEND_API_KEY (o usá --dry-run)'); process.exit(1) }
if (!EMAIL_N || EMAIL_N < 1 || EMAIL_N > 7) { console.error('Indicá --email <1-7>'); process.exit(1) }

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
function btn(label) { return `<table cellpadding="0" cellspacing="0" style="margin:8px 0 22px"><tr><td style="border-radius:10px;background:#5B21F5"><a href="${CURSO_URL}" style="display:inline-block;padding:14px 30px;color:#fff;font-family:-apple-system,sans-serif;font-weight:700;font-size:15px;text-decoration:none">${label}</a></td></tr></table>` }

// ─── Los 7 emails (copy en docs/campana-email-lanzamiento-nata.md) ───────────
const EMAILS = {
  1: { subject: 'Te escribo porque me acordé de vos', html: n => wrap(
    p(`Hola ${n},`) +
    p(`Nos cruzamos hace poco —en el evento, en el sorteo de Style, en alguno de esos momentos donde dejaste tus datos sin saber muy bien qué iba a venir después.`) +
    p(`Esto es lo que viene.`) +
    p(`Llevo más de 20 años en el cruce exacto entre comunicación, moda y lujo. Fundé Style Magazine desde Mar del Plata cuando nadie apostaba a que una revista de acá podía mirar al mundo. Y en todo ese camino hubo una pregunta que se repitió, en boca de mujeres muy distintas:`) +
    p(`<em>"¿Cómo hago para que lo que muestro afuera refleje de verdad quién soy adentro?"</em>`) +
    p(`Esa pregunta es la base de algo nuevo que estoy por abrir, solo para personas como vos. Se llama <strong>Edición Limitada</strong>. En unos días te cuento todo.`) +
    p(`Un beso,<br>Nata`)) },
  2: { subject: 'El lujo no grita. Susurra.', html: n => wrap(
    p(`Hola ${n},`) +
    p(`Cuando terminé mi diplomatura en marketing de lujo en el IE Business School de Madrid, me hicieron una pregunta que todavía me acompaña: <em>"¿Cuál es la diferencia entre una marca de lujo y una que no lo es?"</em>`) +
    p(`Mi respuesta fue: <strong>el lujo genuino no grita. Susurra.</strong> Y en ese susurro hay más poder que en cualquier campaña a los gritos.`) +
    p(`Con los años entendí que lo mismo aplica a las personas. Una marca personal de lujo no es una marca cara: es una marca <strong>cuidada</strong>. Que elige con criterio. Que sabe qué mostrar y qué callar.`) +
    p(`Eso es lo que vas a construir en <strong>Edición Limitada</strong>: 5 semanas, 25 clases y 5 rituales para que tu imagen, tu presencia y tu comunicación sean una sola estrategia. La tuya.`) +
    p(`<strong>Mañana, en el evento, abre.</strong> Y por estar en esta lista, entrás al precio de preventa antes que nadie.`) +
    p(`Nata`)) },
  3: { subject: 'Hoy.', html: n => wrap(
    p(`Hola ${n},`) +
    p(`Hoy es el día. Esta tarde, en el evento, presento oficialmente <strong>Edición Limitada</strong> —y abre la preventa.`) +
    p(`<strong>Si venís al evento:</strong> buscame. Vas a poder sumarte ahí mismo, con el precio de preventa. Llevá el celu cargado 😉`) +
    p(`<strong>Si no podés venir:</strong> no te quedás afuera. Hoy mismo te mando el link para entrar online, al mismo precio.`) +
    p(`Hoy empieza algo. Y quería que lo supieras de mí.`) +
    p(`Nata`)) },
  4: { subject: 'Ya está abierto 🤍', html: n => wrap(
    p(`Hola ${n},`) +
    p(`<strong>Edición Limitada ya está disponible.</strong> Y porque estás en esta lista, entrás al precio de preventa: <strong>ARS 280.000</strong> —después sube a ARS 350.000.`) +
    p(`Lo que vas a construir en 5 semanas:`) +
    p(`🤍 Tu firma personal<br>🤍 La anatomía de tu imagen<br>🤍 Tu narrativa de marca<br>🤍 El factor lujo<br>🤍 Tu Edición Limitada en acción`) +
    p(`25 clases + 5 rituales + material descargable. Acceso permanente.`) +
    btn('Quiero mi lugar a precio de preventa') +
    p(`La preventa dura pocos días. Después, 350.000.`) +
    p(`Nata<br><span style="font-size:14px;color:#6b7280">PD: si tenés una duda, respondé este mail. Te leo yo.</span>`)) },
  5: { subject: '"¿Esto es para mí?"', html: n => wrap(
    p(`Hola ${n},`) +
    p(`Desde que abrí Edición Limitada me llegó varias veces la misma pregunta: <em>"Nata, ¿esto es para mí? Yo no soy famosa, no tengo una empresa."</em>`) +
    p(`Te respondo con honestidad: <strong>todas tenemos una marca personal.</strong> La diferencia es construirla con conciencia o dejar que se arme sola, contando una historia que quizás ni es la tuya.`) +
    p(`Este curso es para las que sienten que tienen algo valioso para mostrar y todavía no encontraron cómo. Si te quedaste pensando en este curso desde que lo abrí, esa duda ya te está diciendo algo.`) +
    btn('Entrar a Edición Limitada — ARS 280.000') +
    p(`El precio de preventa sigue por pocos días.`) +
    p(`Nata`)) },
  6: { subject: 'El precio sube pronto', html: n => wrap(
    p(`Hola ${n},`) +
    p(`Te aviso con tiempo, como me gusta: <strong>en los próximos días el precio de Edición Limitada pasa de ARS 280.000 a ARS 350.000.</strong>`) +
    p(`No es una táctica vacía. Es la diferencia entre entrar ahora, en la preventa, y entrar después.`) +
    p(`Las que más transforman su marca en este curso no son las que más saben. Son las que <strong>decidieron que ya era el momento.</strong>`) +
    btn('Sumarme ahora, antes de que suba') +
    p(`Nata`)) },
  7: { subject: 'Últimas horas a precio de preventa', html: n => wrap(
    p(`Hola ${n},`) +
    p(`Esto es lo último que te escribo sobre la preventa.`) +
    p(`<strong>Hoy es el último día para entrar a Edición Limitada a ARS 280.000.</strong> Mañana, 350.000.`) +
    p(`Si llegaste hasta acá leyendo todos estos mails, no es casualidad. Algo de esto te está llamando.`) +
    p(`No te pido que decidas por el precio. Te pido que decidas por vos —por esa versión tuya que ya sabés que está, y que solo le falta articularse.`) +
    btn('Entro ahora, a precio de preventa') +
    p(`Gracias por leerme estos días. Sea cual sea tu decisión.<br>Nata`)) },
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
// Por ahora documentado — agregar antes del envío real de los emails 5-7.

const tmpl = EMAILS[EMAIL_N]
console.log(`\n📧 Email ${EMAIL_N}: "${tmpl.subject}"`)
console.log(`   Destinatarios únicos: ${recipients.length}`)
console.log(`   Modo: ${DRY ? 'DRY-RUN' : TEST_TO ? `TEST → ${TEST_TO}` : 'ENVÍO REAL'}\n`)

async function sendOne(to, name) {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: FROM, to: [to], reply_to: REPLY_TO, subject: tmpl.subject, html: tmpl.html(name).replace('{unsubscribe}', '#') }),
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
  let ok=0, fail=0
  for (const r of recipients) {
    try { await sendOne(r.email, r.name); ok++; process.stdout.write(`\r  Enviados: ${ok}/${recipients.length}`) }
    catch (e) { fail++; console.error(`\n  ❌ ${r.email}: ${e.message}`) }
    await sleep(THROTTLE_MS)
  }
  console.log(`\n\n  ✅ ${ok} enviados · ${fail} fallaron`)
}

main().catch(e => { console.error('💥', e.message); process.exit(1) })
