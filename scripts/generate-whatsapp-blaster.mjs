#!/usr/bin/env node
/**
 * generate-whatsapp-blaster.mjs
 *
 * Genera un HTML interactivo para que Nata mande mensajes de WhatsApp UNO A UNO
 * (personal, desde su teléfono) a la base de leads del evento + sorteo.
 *
 * Cada contacto tiene un botón verde "Enviar WhatsApp" que abre el chat directo
 * con esa persona, con el texto YA ESCRITO y personalizado con su nombre + el link
 * del curso. Nata solo toca enviar. Incluye buscador, contador y "marcar enviado"
 * que persiste en el navegador (localStorage).
 *
 * El HTML resultante CONTIENE DATOS PERSONALES (nombres + teléfonos), por eso se
 * genera FUERA del repo, en la carpeta de Nata. NUNCA commitear el HTML poblado.
 *
 * Uso:
 *   node scripts/generate-whatsapp-blaster.mjs
 *
 * Editá CURSO_URL y MENSAJE abajo antes de correr (o reemplazá en el HTML después).
 */

import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { execSync } from 'node:child_process'

// ─── CONFIG (editá esto) ──────────────────────────────────────────────────
const BASE_DIR = '/Users/juanilopez/Documents/Claudio/Nata Alvarez/BASES DE DATOS'
const OUTPUT = '/Users/juanilopez/Documents/Claudio/Nata Alvarez/whatsapp-nata-lanzamiento.html'

// ⚠️ El link puede cambiar cuando se defina el dominio final. Reemplazar acá o en el HTML.
const CURSO_URL = 'https://nato-learn-hub.vercel.app/courses/edicion-limitada'

// Mensaje personal de Nata (uno a uno). {nombre} se reemplaza por el nombre real.
// {origen} se reemplaza según de dónde vino el contacto (evento o sorteo de Style).
// SIN emojis a propósito: los emojis se rompían como caracteres raros (◆) al pasar
// por el link de WhatsApp en algunos teléfonos. Si Nata quiere, los agrega a mano.
const MENSAJE = `Hola {nombre}! Soy Nata.

Te escribo personalmente porque {origen} y quiero que seas de las primeras en enterarte de algo que vengo construyendo hace años.

Lanzo *Edición Limitada*, mi curso de marca personal: 5 semanas para construir tu imagen, tu presencia y tu comunicación desde el lujo, el criterio y la autenticidad. Todo lo que aprendí en 20 años, hecho curso.

Estoy abriendo a precio de preventa solo para las primeras. Te dejo acá todo:

{link}

Cualquier cosa respondeme por acá. Un beso!`

// ─── Normalización de teléfono AR a formato wa.me ──────────────────────────
function toWaMe(raw) {
  if (!raw) return null
  let d = String(raw).replace(/\D/g, '')
  if (!d) return null
  // Sacar 0 inicial y 15 (formato viejo AR)
  if (d.startsWith('0')) d = d.slice(1)
  // Ya viene con país
  if (d.startsWith('549') && d.length >= 12) return d
  if (d.startsWith('54') && d.length >= 11) return '549' + d.slice(2)
  // 10 dígitos = área + número (ej 2235852456) → prepend 549
  if (d.length === 10) return '549' + d
  // 11 dígitos con 15 intercalado (ej 2231512345) — heurística, dejar y marcar
  if (d.length === 11) return '549' + d.slice(0, 3) + d.slice(4)
  // Internacional de otro país (ej empieza con +1, +34): usar tal cual si >10
  if (d.length >= 11) return d
  return null // muy corto, dudoso
}

// ─── Leer CSV ──────────────────────────────────────────────────────────────
function parseCsv(path) {
  const text = readFileSync(path, 'utf-8')
  const lines = text.split(/\r?\n/).filter(Boolean)
  const parseLine = (l) => {
    const out = []; let cur = ''; let q = false
    for (const ch of l) {
      if (ch === '"') q = !q
      else if (ch === ',' && !q) { out.push(cur); cur = '' }
      else cur += ch
    }
    out.push(cur)
    return out.map(s => s.trim())
  }
  const headers = parseLine(lines[0])
  return lines.slice(1).map(l => {
    const cells = parseLine(l)
    const o = {}
    headers.forEach((h, i) => { o[h] = cells[i] ?? '' })
    return o
  })
}

// ─── Leer XLSX (raw zip, sin libs) ─────────────────────────────────────────
function parseXlsx(path) {
  // Fallback simple: requiere unzip del xlsx. Para mantenerlo sin dependencias,
  // intentamos via el módulo zlib no alcanza (xlsx es zip, no gzip). Si no hay
  // openpyxl ni unzip programático, devolvemos [] y avisamos.
  try {
    const tmp = '/tmp/_xlsx_extract'
    execSync(`rm -rf ${tmp} && mkdir -p ${tmp} && cd ${tmp} && unzip -oq "${path}"`, { stdio: 'ignore' })
    const shared = []
    try {
      const ss = readFileSync(join(tmp, 'xl/sharedStrings.xml'), 'utf-8')
      const matches = ss.match(/<t[^>]*>([\s\S]*?)<\/t>/g) || []
      matches.forEach(m => shared.push(m.replace(/<[^>]+>/g, '')))
    } catch { /* */ }
    const sheet = readFileSync(join(tmp, 'xl/worksheets/sheet1.xml'), 'utf-8')
    const rowsXml = sheet.match(/<row[\s\S]*?<\/row>/g) || []
    const rows = rowsXml.map(rx => {
      const cells = rx.match(/<c[\s\S]*?(?:\/>|<\/c>)/g) || []
      return cells.map(cx => {
        const isStr = /t="s"/.test(cx)
        const vm = cx.match(/<v>([\s\S]*?)<\/v>/)
        if (!vm) return ''
        return isStr ? (shared[parseInt(vm[1])] ?? '') : vm[1]
      })
    })
    return rows
  } catch (e) {
    console.warn('No se pudo leer XLSX:', e.message)
    return []
  }
}

// ─── Recolectar contactos ──────────────────────────────────────────────────
const contacts = []
const seen = new Set()

// CSV eventos
for (const r of parseCsv(join(BASE_DIR, 'registros-eventos-2026-06-13.csv'))) {
  const phone = toWaMe(r.WhatsApp)
  const name = (r.Nombre || '').split(' ')[0] || 'Hola'
  const key = phone || (r.Email || '').toLowerCase()
  if (!phone || seen.has(key)) continue
  seen.add(key)
  const origen = r.Origen === 'sorteo' ? 'participaste del sorteo de Style' : 'te sumaste a uno de mis eventos'
  contacts.push({ name: r.Nombre || '', first: name, phone, origen })
}

// XLSX sorteo
const xrows = parseXlsx(join(BASE_DIR, 'Style sorteo (Responses).xlsx'))
if (xrows.length) {
  const hdr = xrows[0].map(h => String(h).toLowerCase())
  const iNom = hdr.findIndex(h => h.includes('nombre'))
  const iTel = hdr.findIndex(h => h.includes('tel'))
  for (const row of xrows.slice(1)) {
    const phone = toWaMe(row[iTel])
    const nom = String(row[iNom] || '')
    if (!phone || seen.has(phone)) continue
    seen.add(phone)
    contacts.push({ name: nom, first: nom.split(' ')[0] || 'Hola', phone, origen: 'participaste del sorteo de Style' })
  }
}

console.log(`Contactos con WhatsApp válido: ${contacts.length}`)

// ─── Generar HTML ───────────────────────────────────────────────────────────
function waLink(c) {
  const txt = MENSAJE
    .replaceAll('{nombre}', c.first)
    .replaceAll('{origen}', c.origen)
    .replaceAll('{link}', CURSO_URL)
  return `https://wa.me/${c.phone}?text=${encodeURIComponent(txt)}`
}

const rows = contacts.map((c, i) => `
  <div class="card" data-name="${(c.name || '').toLowerCase()}" data-i="${i}">
    <div class="info">
      <span class="num">${i + 1}</span>
      <div>
        <p class="name">${c.name || '(sin nombre)'}</p>
        <p class="phone">+${c.phone}</p>
      </div>
    </div>
    <div class="actions">
      <a class="wa-btn" href="${waLink(c)}" target="_blank" rel="noopener" onclick="markSent(${i})">
        <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M.057 24l1.687-6.163a11.867 11.867 0 01-1.587-5.945C.16 5.335 5.495 0 12.05 0a11.82 11.82 0 018.413 3.488 11.82 11.82 0 013.48 8.414c-.003 6.557-5.338 11.892-11.893 11.892a11.9 11.9 0 01-5.688-1.448L.057 24zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884a9.86 9.86 0 001.51 5.26l-.999 3.648 3.978-1.042z"/></svg>
        Enviar
      </a>
      <label class="done"><input type="checkbox" onchange="toggleSent(${i}, this.checked)"> Enviado</label>
    </div>
  </div>`).join('')

const html = `<!DOCTYPE html>
<html lang="es"><head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>WhatsApp — Lanzamiento Edición Limitada · Nata</title>
<style>
  :root { --purple:#5B21F5; --green:#25D366; --bg:#faf9fc; --card:#fff; --border:#ece9f5; --text:#1a1a2e; --muted:#6b7280; }
  * { box-sizing:border-box; margin:0; padding:0; }
  body { font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif; background:var(--bg); color:var(--text); padding:24px 16px 80px; }
  .wrap { max-width:640px; margin:0 auto; }
  header { text-align:center; margin-bottom:24px; }
  h1 { font-size:22px; font-weight:800; letter-spacing:-.02em; }
  .sub { color:var(--muted); font-size:14px; margin-top:6px; line-height:1.5; }
  .howto { background:#f3effe; border:1px solid #e3dcfa; border-radius:14px; padding:16px 18px; margin:20px 0; font-size:13px; color:#4a3f6b; line-height:1.6; }
  .howto b { color:var(--purple); }
  .bar { position:sticky; top:0; background:var(--bg); padding:12px 0; z-index:10; }
  .search { width:100%; padding:12px 16px; border:1px solid var(--border); border-radius:12px; font-size:15px; outline:none; }
  .search:focus { border-color:var(--purple); box-shadow:0 0 0 3px rgba(91,33,245,.12); }
  .progress { display:flex; align-items:center; gap:10px; margin-top:10px; font-size:13px; color:var(--muted); }
  .progress .track { flex:1; height:6px; background:var(--border); border-radius:99px; overflow:hidden; }
  .progress .fill { height:100%; background:var(--green); width:0%; transition:width .3s; }
  .card { background:var(--card); border:1px solid var(--border); border-radius:14px; padding:12px 14px; display:flex; align-items:center; justify-content:space-between; gap:12px; margin-bottom:8px; transition:opacity .2s; }
  .card.sent { opacity:.45; }
  .info { display:flex; align-items:center; gap:12px; min-width:0; }
  .num { width:26px; height:26px; border-radius:99px; background:#f3effe; color:var(--purple); font-size:11px; font-weight:700; display:flex; align-items:center; justify-content:center; flex-shrink:0; }
  .name { font-weight:600; font-size:15px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; max-width:200px; }
  .phone { color:var(--muted); font-size:12px; font-variant-numeric:tabular-nums; }
  .actions { display:flex; align-items:center; gap:10px; flex-shrink:0; }
  .wa-btn { display:inline-flex; align-items:center; gap:6px; background:var(--green); color:#fff; font-weight:700; font-size:14px; padding:9px 16px; border-radius:10px; text-decoration:none; }
  .wa-btn:active { transform:scale(.97); }
  .done { font-size:12px; color:var(--muted); display:flex; align-items:center; gap:4px; cursor:pointer; white-space:nowrap; }
  .reset { display:block; margin:24px auto 0; background:none; border:1px solid var(--border); color:var(--muted); padding:8px 16px; border-radius:10px; font-size:12px; cursor:pointer; }
</style></head><body>
<div class="wrap">
  <header>
    <h1>💛 Mensajes de lanzamiento</h1>
    <p class="sub">Edición Limitada · ${contacts.length} contactos de tu base de eventos y sorteos</p>
  </header>

  <div class="howto">
    <b>Cómo usarlo:</b> tocá <b>Enviar</b> en cada persona. Se abre WhatsApp con el mensaje ya escrito y personalizado con su nombre — vos solo apretás enviar. Marcá <b>Enviado</b> para no repetir. El progreso se guarda solo en este navegador.<br><br>
    💡 Mandá de a tandas (20-30 por vez) para que sea natural y no parezca masivo.
  </div>

  <div class="bar">
    <input class="search" id="q" placeholder="🔍 Buscar por nombre..." oninput="filter()">
    <div class="progress">
      <div class="track"><div class="fill" id="fill"></div></div>
      <span id="count">0 / ${contacts.length} enviados</span>
    </div>
  </div>

  <div id="list">${rows}</div>

  <button class="reset" onclick="if(confirm('¿Resetear todos los enviados?')){localStorage.removeItem(KEY);location.reload()}">Resetear marcados</button>
</div>

<script>
  const TOTAL = ${contacts.length};
  const KEY = 'nata-wa-sent-v1';
  let sent = new Set(JSON.parse(localStorage.getItem(KEY) || '[]'));
  function save(){ localStorage.setItem(KEY, JSON.stringify([...sent])); render(); }
  function markSent(i){ sent.add(i); save(); syncChecks(); }
  function toggleSent(i, on){ on ? sent.add(i) : sent.delete(i); save(); }
  function syncChecks(){ document.querySelectorAll('.card').forEach(c=>{ const i=+c.dataset.i; const cb=c.querySelector('input'); if(cb) cb.checked=sent.has(i); }); }
  function render(){
    document.querySelectorAll('.card').forEach(c=>{ c.classList.toggle('sent', sent.has(+c.dataset.i)); });
    const n=sent.size;
    document.getElementById('count').textContent = n+' / '+TOTAL+' enviados';
    document.getElementById('fill').style.width = (TOTAL? (n/TOTAL*100):0)+'%';
  }
  function filter(){
    const q=document.getElementById('q').value.toLowerCase();
    document.querySelectorAll('.card').forEach(c=>{ c.style.display = c.dataset.name.includes(q)?'':'none'; });
  }
  syncChecks(); render();
</script>
</body></html>`

writeFileSync(OUTPUT, html)
console.log(`✅ HTML generado: ${OUTPUT}`)
console.log(`   Abrilo con doble click. ${contacts.length} contactos listos para WhatsApp 1-a-1.`)
console.log(`   ⚠️ Tiene datos personales — NO subir al repo ni compartir públicamente.`)
