# Sistema de pagos NATO University — modelo de datos, routing y estado

Documento maestro del flujo de pago. Verificado contra la DB real (jun 2026).

---

## 1. Modelo de datos — RESUELTO (era la "ambigüedad")

Verificado con SQL contra la DB de producción:

- **`enrollments.student_id`** → FK a **`profiles.id`** (NO a `auth.users.id`).
- **`profiles.id`** es un UUID PROPIO del profile. **NO** es el auth user id.
- **`profiles.auth_id`** → apunta a `auth.users.id`. Esta es la columna que linkea con la sesión.
- En las 2 filas reales: `profiles.id ≠ profiles.auth_id`, y solo `auth_id` existe en `auth.users`.

**Regla de oro para cualquier código que toque enrollments:**
> Desde una sesión tenés `auth.users.id`. Para operar enrollments necesitás primero el profile: `profiles WHERE auth_id = <auth user id>` → usar `profile.id` como `student_id`.

El front (`CourseDetail.enrollMutation`) ya lo hacía bien (`student_id: profile.id`). Las edge functions NO.

---

## 2. 🔴 BUG CRÍTICO encontrado y ARREGLADO (jun 2026)

**El checkout pago estaba roto** y nunca se detectó porque MP nunca se probó con un pago real.

- **`create-mp-preference` (v7)**: usaba `student_id: user.id` (auth id) e `.eq('id', user.id)` para el profile. Como `enrollments.student_id` exige `profiles.id`, el insert **violaba la FK → error 500 → ninguna venta se podía completar**.
  - **Fix (v8):** busca profile por `.eq('auth_id', user.id)`, usa `profile.id` como `student_id` en el insert y en la búsqueda de enrollment pendiente.

- **`mp-webhook` (v4)**: usaba `auth.admin.getUserById(student_id)` para sacar el email, pero `student_id` es `profiles.id` (no auth id) → no encontraba al user → **no mandaba el email de acceso/comprobante**.
  - **Fix (v5):** trae `email, auth_id` en el join del profile y usa `profile.email` directo (fallback a `getUserById(profile.auth_id)`).

Ambas desplegadas. **Esto desbloquea las ventas.** Falta validar end-to-end con un pago real cuando MP esté conectado (ver §4).

---

## 3. Routing de pagos Creative → Nata — CONFIGURADO ✅

El modelo que pidió Juani (primeras ventas a NATO Creative, después a Nata) está implementado y configurado:

| Variable | Valor | Estado |
|---|---|---|
| `courses.nato_produced` | `true` | ✅ |
| `courses.production_recovery_sales` | **15** | ✅ (primeras 15 ventas → NATO Creative) |
| `platform_config.nato_mp_access_token` | seteado | ✅ NATO Creative puede cobrar |
| `tenants(Nata).mp_access_token` | NULL | ⚠️ Nata debe conectar su MP (solo para venta 16+) |

**Cómo funciona** (en `create-mp-preference` + `mp-webhook`):
- Cuenta `enrollments` con `mp_status='approved'` del curso.
- Si `< 15` → usa el MP de NATO Creative (`platform_config.nato_mp_access_token`), **sin** marketplace_fee. `payment_destination='nato'`.
- Si `>= 15` → usa el MP de Nata (`tenant.mp_access_token`), **con** 5% marketplace_fee. `payment_destination='creator'`.

**Implicancia para el launch:** las primeras 15 ventas funcionan con lo que YA está (MP de Creative). Que Nata conecte su MP NO bloquea el lanzamiento — solo hace falta antes de la venta 16.

---

## 4. Dominio (SITE_URL) y from transaccional — RESUELTO vía DB (sin redeploy)

Antes las edge functions caían a `https://natodigital.com` (dominio muerto). **Arreglado:** ahora el dominio y el remitente de los mails se leen de la tabla `platform_config`, así se cambian con un `UPDATE` de SQL **sin redeploy ni tocar secrets** (que no se pueden setear vía MCP).

| Key en `platform_config` | Valor actual | Usado para |
|---|---|---|
| `site_url` | `https://nato-learn-hub.vercel.app` | `back_urls` de MP (retorno post-pago) + link del curso en los mails |
| `transactional_from_email` | *(vacío)* | Remitente de comprobante/bienvenida |

**Orden de resolución del dominio** (en ambas funciones): `platform_config.site_url` → env `SITE_URL` → `https://nato-learn-hub.vercel.app`. Nunca más `natodigital.com`.

**Cuando cambie el dominio** (Juani lo mueve de Vercel a uno propio en días):
```sql
update platform_config set value = 'https://EL_DOMINIO_NUEVO' where key = 'site_url';
```
Efecto inmediato, sin deploy.

**🟡 Pendiente (Juani + Tomi) — from transaccional:** `transactional_from_email` está vacío → hoy los mails de comprobante/bienvenida salen desde el sandbox de Resend (`onboarding@resend.dev`), que **solo entrega al dueño de la cuenta Resend, NO a compradores reales**. Para que el comprador reciba el mail hay que verificar un dominio en Resend (SPF/DKIM) y setear:
```sql
update platform_config set value = 'Nata Álvarez <nata@DOMINIO_VERIFICADO>' where key = 'transactional_from_email';
```
Esto NO bloquea el cobro (el acceso al curso se da igual al aprobarse el pago); solo afecta el email de comprobante.

---

## 5. Checklist para validar pagos antes del launch (con MP conectado)

1. [x] Dominio: ya sale de `platform_config.site_url` (Vercel hoy). Cambiarlo con un UPDATE cuando haya dominio propio (§4)
2. [ ] `transactional_from_email`: setear con dominio verificado en Resend (Tomi) para que el comprobante llegue a compradores reales (§4)
3. [ ] Verificar `MP_WEBHOOK_SECRET` seteado (hoy corre en modo unverified si falta)
3. [ ] Compra de prueba con tarjeta de test de MP → verificar:
   - [ ] Enrollment pasa a `approved`
   - [ ] `payment_destination = 'nato'` (primeras 15)
   - [ ] Llega email de comprobante + bienvenida
   - [ ] El comprador vuelve y ve el overlay "¡Listo! Empezar ahora"
   - [ ] Accede al curso
4. [ ] Simular venta 16 → verificar que rutea al MP de Nata + marketplace_fee 5%

---

## 6. Guest checkout (pendiente — ahora con el modelo CLARO)

Con §1 resuelto, el diseño del guest checkout es más sólido. Ver `CRO-funnel-pendientes.md` §"Guest checkout". Punto clave ahora confirmado:
- La edge function nueva `create-guest-preference` debe: crear `auth.admin.createUser({email})` → crear profile vía `create_profile` RPC (que setea `auth_id` + devuelve `profiles.id`) → usar ese `profiles.id` como `student_id`. Mismo patrón que el fix de create-mp-preference.
- El welcome email del webhook → magic link con `profile.auth_id` para que el guest entre sin password.

Sigue requiriendo MP conectado + test. Hacer con Juani.
