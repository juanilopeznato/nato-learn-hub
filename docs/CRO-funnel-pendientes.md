# CRO del funnel de compra — hecho + pendiente

Auditoría con agente experto en lanzamientos de infoproductos. Estado a jun 2026.

## ✅ Hecho y deployado

| # | Fricción | Fix | Commit |
|---|---|---|---|
| 2 | **No había retorno post-pago** → comprador caía en la landing de venta mientras el webhook confirmaba async (pánico/chargebacks) | Overlay con polling al enrollment: "Confirmando tu pago…" → "¡Listo! Empezar ahora". `?payment=failure` → toast | ed7233c |
| 3 | **Signup en limbo** si Supabase exige confirmar email (navegaba a ruta protegida → rebote a /login) | `signUp` devuelve `needsConfirmation` → pantalla "Revisá tu email" | ed7233c |
| QW | Cupón por URL `?cupon=NATA` | Auto-aplica al cargar (silent), toast si válido. Habilita campañas con descuento embebido | ed7233c |
| QW | Urgencia de preventa | "Precio de preventa — luego sube a ARS 350.000" (honesto, sin countdown falso) | 7c0fcb7 |

## 🔴 PENDIENTE GRANDE — Guest checkout (#1, el pedido original)

**Por qué no se implementó ahora:** toca el corazón del pago (crear cuentas + enrollment + webhook), el modelo profile/auth tiene ambigüedad a confirmar, y **no es testeable sin MP conectado**. Meterlo a ciegas pre-launch arriesga romper el checkout de usuarios logueados, que funciona. Hacerlo CON Juani + MP de Nata conectado + test real.

### El problema
`CourseDetail.tsx` → `handleCTA`: si `!user`, manda a `/login`. El lead que ya decidió comprar choca con login/signup (3 fricciones: cooldown 2s, checkbox TyC, campo nombre). Se pierden leads calificados a ARS 280k.

### Diseño técnico (validado leyendo las edge functions)

Hoy `create-mp-preference` (verify_jwt=true) hace: `student_id = user.id` (auth user), crea enrollment `pending`, preferencia MP con `external_reference = enrollmentId`. El `mp-webhook` resuelve por external_reference, marca approved, manda 2 emails (comprobante + bienvenida).

**Plan de implementación (NO tocar la función actual — crear una nueva, aislada):**

1. **Front (CourseDetail)**: si `!user` y aprieta Comprar → abrir modal con 1 campo (email) en vez de `navigate('/login')`. Botón "Continuar al pago".

2. **Edge function NUEVA `create-guest-preference`** (no tocar `create-mp-preference`):
   - Body: `{ course_id, guest_email, guest_name?, coupon_code? }`
   - Rate limit por email/IP (`check_rate_limit` RPC ya existe) — anti spam
   - Resolver cuenta: buscar profile por `email + tenant_id`. Si existe → usar su id. Si no → `auth.admin.createUser({ email, email_confirm: true })` (sin password) + `create_profile` RPC → usar ese id como `student_id`.
   - ⚠️ **CONFIRMAR PRIMERO**: si `enrollment.student_id` apunta a `auth.users.id` o a `profiles.id`. En `create-mp-preference` usa `user.id` para ambos (`student_id` y `.eq('id', user.id)` del profile) → sugiere `profiles.id === auth.users.id`. PERO `sign-lesson-video` usa `profiles.auth_id`. Verificar el modelo antes de tocar.
   - Resto idéntico a `create-mp-preference`: enrollment pending + preferencia MP.

3. **`mp-webhook`** (cambio additive, no rompe nada): en el welcome email, cambiar el botón "Ir al curso" para que use un **magic link** (`auth.admin.generateLink({ type: 'magiclink', email })`). Así:
   - Usuario logueado que compró → clickea, entra (ya tenía sesión).
   - Guest que compró → magic link lo loguea sin password, entra al curso. Después setea password en su perfil.
   Esto unifica el acceso de ambos sin lógica condicional frágil.

4. **Retorno post-pago para guest**: el overlay actual (#2) usa el enrollment del `profile` logueado. Para guest sin sesión, el `?payment=success` debe mostrar "Te mandamos un email para entrar al curso" (no puede hacer polling sin sesión). Manejar ese caso.

**Complejidad: L. Riesgo: alto (toca pago). Requiere: MP de Nata conectado + test end-to-end con tarjeta de prueba.**

## 🟡 Otras oportunidades (post-launch o cuando haya datos)

- **Prueba social seedeada**: hoy reviews/contador aparecen solo si hay datos → en launch nuevo = 0. Curar 2-3 testimonios reales de Nata (video o screenshot) y mostrarlos fijos, no depender del contador.
- **Order bump / upsell** en la `/gracias` post-compra (mentoría, comunidad premium, bonus) → sube ticket sin costo de adquisición.
- **Pago por transferencia con 5% off** para tickets altos (AR convierte mejor en >200k evitando límites de tarjeta). Confirma manual.
- **Recuperación de carrito**: si se implementa guest checkout, se captura el email ANTES de MP → secuencia "te quedó el pago a medias".
- **Meta CAPI / Purchase server-side**: verificar que el pixel trackee Purchase de compras pagas (hoy `fbTrack('Purchase')` solo corre en enroll gratis; la compra paga lo delega al webhook → confirmar que dispare).
- **Colapsar input de cupón** detrás de "¿Tenés cupón?" (hoy visible invita a irse a buscar uno).

## 🔒 Decisión de garantía (a charlar)
Hoy se removió la garantía promocional (riesgo de abuso con contenido digital). El experto CRO sugiere reconsiderar "garantía 10 días" porque a 280k sube conversión más de lo que sube devoluciones. Decisión de negocio de Juani/Nata.
