# NATO University — Documentación del Sistema

Última actualización: 2026-05-06

---

## 1. Resumen ejecutivo

**Qué es.** Plataforma LMS multi-tenant para vender cursos online. Cada escuela tiene su propio branding, dominio (opcional), alumnos y cuenta de Mercado Pago. NATO se queda con una comisión por cada venta.

**Tres líneas de monetización**:
1. Venta de cursos (tenant cobra a alumno, NATO se queda 5%).
2. Plan SaaS (NATO le cobra al instructor 4 tiers: free / starter / creator / pro).
3. Producción NATO Creative (recupero de costos: las primeras N ventas van a NATO, el resto al instructor).
4. Programa de afiliados (referidor se lleva % por cada nueva escuela que paga).

**Producción**: `https://nato-learn-hub.vercel.app` — deploy automático en Vercel cada push a `main`.

---

## 2. Stack técnico

| Capa | Tecnología |
|---|---|
| Frontend | React 18 + TypeScript + Vite |
| UI | shadcn/ui (Radix) + TailwindCSS + lucide-react |
| Estado servidor | TanStack React Query v5 |
| Forms | react-hook-form + zod |
| Routing | react-router-dom v6 |
| Charts | recharts |
| Backend | Supabase (Postgres + Auth + Storage + Edge Functions Deno) |
| Pagos | Mercado Pago ARS (Checkout Pro + Preaprobación + OAuth) |
| Email | Resend API |
| SEO | react-helmet-async + sitemap dinámico (edge function) |
| Hosting | Vercel |
| Tests | Playwright (E2E) + Vitest (unit, casi vacío) |

**Decisiones**: ARS único (sin multi-moneda), SPA pura (sin SSR), sin Next.js, sin Lovable (migrado a Claude Code).

---

## 3. URLs y entornos

| Recurso | URL / ID |
|---|---|
| Producción | `https://nato-learn-hub.vercel.app` |
| Repo GitHub | `https://github.com/juanilopeznato/nato-learn-hub` |
| Supabase Project ID | `hoolsigtquohayhpqgtb` |
| Supabase API | `https://hoolsigtquohayhpqgtb.supabase.co` |
| Supabase Dashboard | `https://supabase.com/dashboard/project/hoolsigtquohayhpqgtb` |
| Sitemap | `/sitemap.xml` (rewrite a edge function `generate-sitemap`) |

---

## 4. Arquitectura general

```
[Usuario]
   │
   ▼
[Vercel — SPA React]                                         [Mercado Pago]
   │                                                              ▲
   │ supabase-js (fetch + WS realtime)                            │
   ▼                                                              │
[Supabase]                                                        │
   ├─ Auth (email + password)                                     │
   ├─ Postgres (27 tablas, RLS habilitado en todas)               │
   ├─ Storage (avatars, course-images)                            │
   └─ Edge Functions (Deno)                                       │
        ├─ create-mp-preference  ────────── crea checkout ───────►│
        ├─ mp-webhook            ◄───── notif pago ───────────────│
        ├─ create-subscription   ────────── alta plan ───────────►│
        ├─ subscription-webhook  ◄───── notif plan ───────────────│
        ├─ mp-oauth-exchange     ◄────── code OAuth ──────────────│
        ├─ send-welcome-email     ─────► Resend
        ├─ send-retention-emails  ─────► Resend (cron)
        ├─ send-abandonment-emails─────► Resend (cron)
        ├─ send-campaign          ─────► Resend (manual)
        └─ generate-sitemap       ─────► XML público
```

**Multi-tenant**: el tenant se resuelve por `custom_domain` (producción) o por slug `nato` por defecto en `*.vercel.app` y localhost. Ver `src/context/AuthContext.tsx:26` (`resolveTenant`).

**Multi-perfil**: un mismo `auth.users.id` puede tener varios `profiles` (uno por tenant). El más reciente por `last_used_at` es el activo. RPC `switch_active_school(p_profile_id)` cambia el activo.

---

## 5. Modelo de datos (Postgres / `public`)

Las 27 tablas tienen RLS habilitado.

### Identidad y multi-tenant
| Tabla | Para qué | Filas hoy |
|---|---|---|
| `tenants` | Una escuela. Tiene slug, custom_domain, branding, plan, mp config, affiliate_code | 1 |
| `profiles` | Perfil por (auth_id × tenant_id). Guarda role, points, level, streak, last_used_at | 2 |
| `plans` | Catálogo de planes SaaS (free/starter/creator/pro) con límites | 3 |
| `platform_config` | Settings globales: commission_pct, nato_mp_access_token, resend_api_key | 8 |
| `tenant_mp_config` | Credenciales MP por tenant (seguridad: refactor en curso para que no viajen al cliente) | 0 |

### Catálogo y consumo
| Tabla | Para qué | Filas |
|---|---|---|
| `courses` | Curso publicado por un instructor. Tiene slug, precio, free_preview, producido_por_nato | 1 |
| `modules` | Agrupador ordenado dentro de un curso | 5 |
| `lessons` | Lección individual (video YouTube/Vimeo + body + recursos) | 25 |
| `lesson_progress` | Marca de "completada" por (profile × lesson) | 2 |
| `enrollments` | Alumno inscripto en curso (free o pago) | 1 |
| `course_reviews` | Reviews 1-5 estrellas + comentario | 0 |
| `course_events` | Eventos en vivo asociados a curso | 104 |
| `calendar_events` | Eventos de calendario por tenant (no enrutado en frontend) | 0 |
| `resources` | Adjuntos descargables por lección | 0 |
| `lesson_notes` | Notas privadas del alumno con autosave | 0 |
| `lesson_comments` | Foro contextual por lección | 0 |
| `certificates` | Certificado emitido al completar curso (con código verificable) | 0 |

### Engagement / comunidad
| Tabla | Para qué | Filas |
|---|---|---|
| `community_posts` | Posts de feed por tenant | 12 |
| `community_comments` | Comentarios sobre posts | 0 |
| `community_reactions` | Likes/reactions | 0 |
| `points_log` | Auditoría de puntos ganados | 14 |
| `notifications` | Bell de notificaciones in-app | 0 |

### Monetización
| Tabla | Para qué |
|---|---|
| `coupons` | Cupones de descuento por tenant/curso |
| `affiliate_commissions` | Comisión generada cuando un afiliado refiere |
| `subscription_payments` | Historial de cobros del plan SaaS |
| `email_campaigns` | Campañas creadas en EmailMarketing |
| `email_sends` | Log de envíos (deliverability) |

### Vistas/ayudas (no tablas)
- `admin_enrollments`, `leaderboard_monthly`, `course_progress`, `course_instructors` — vistas usadas por dashboards. Pendiente: reemplazar `SECURITY DEFINER` por `security_invoker=true`.

---

## 6. Roles y permisos

| Role | Ruta principal | Capacidades |
|---|---|---|
| `student` | `/dashboard` | Ver cursos inscriptos, hacer lecciones, comunidad, perfil |
| `instructor` | `/instructor` | Crear/editar cursos, módulos y lecciones; ver alumnos; email marketing; settings de escuela |
| `admin` | `/admin` | Gestionar tenants, cambiar planes manualmente, configurar plataforma |
| `nato_owner` | `/nato` | Vista global: todas las escuelas, métricas, recupero de producción NATO. También entra a `/admin` y `/instructor` |

Guard: `<ProtectedRoute requiredRole="...">` en `src/components/ProtectedRoute.tsx`.

---

## 7. Mapa de rutas

### Públicas
| Ruta | Componente | Notas |
|---|---|---|
| `/` | `Index.tsx` | Landing: Hero + How it works + Pricing teaser + CTA |
| `/courses` | `Courses.tsx` | Marketplace público de cursos del tenant |
| `/courses/:slug` | `CourseDetail.tsx` | Landing del curso (con CTA pago / inscripción) |
| `/pricing` | `Pricing.tsx` | Planes SaaS NATO (Hormozi-style) |
| `/affiliates` | `Affiliates.tsx` | Pitch del programa de afiliados |
| `/login`, `/signup` | `Login.tsx`, `Signup.tsx` | Auth |
| `/forgot-password`, `/reset-password` | | Recuperación |
| `/certificates/:code` | `CertificateVerify.tsx` | Verificación pública de certificado |
| `/create-school` | `CreateSchool.tsx` | Wizard para alta de tenant |
| `/mp-oauth-callback` | `MpOAuthCallback.tsx` | Callback OAuth Mercado Pago (intercambia code) |

### Protegidas — alumno
| Ruta | Componente |
|---|---|
| `/dashboard` | `Dashboard.tsx` (cursos, racha, leaderboard, onboarding) |
| `/learn/:courseSlug/:lessonId` | `LessonView.tsx` (reproductor + notas + comentarios) |
| `/profile` | `ProfileSettings.tsx` |
| `/community` | `Community.tsx` |
| `/members/:profileId` | `MemberProfile.tsx` |

### Protegidas — instructor / admin / nato
| Ruta | Componente | Role |
|---|---|---|
| `/instructor` | `InstructorDashboard.tsx` | instructor |
| `/instructor/courses/:courseId` | `InstructorCoursePage.tsx` | instructor |
| `/instructor/email` | `EmailMarketing.tsx` | instructor |
| `/settings` | `TenantSettings.tsx` | instructor |
| `/admin` | `AdminPanel.tsx` | admin |
| `/nato` | `NatoOwnerPanel.tsx` | nato_owner |

---

## 8. Flujos clave

### 8.1 Signup → primer curso
1. Usuario entra a un dominio (custom o `nato.vercel.app`). `resolveTenant()` setea `tenant`.
2. `/signup` → `supabase.auth.signUp` → RPC `create_profile(auth_id, tenant_id, email, full_name)` → role default `student`.
3. Si Supabase tiene email-confirm activo, queda esperando confirmación. Si no, redirect a `/dashboard`.
4. `OnboardingModal` arranca al primer login y termina con redirect al primer curso (mejorable: hoy redirige al dashboard, no a la lección).
5. Al completar 1 lección: confetti + puntos + actualización de racha (`points_log`, `profiles.points`, `profiles.streak`).

### 8.2 Compra de curso (alumno)
1. `/courses/:slug` → click "Comprar".
2. Frontend llama a edge function `create-mp-preference` con `{ course_id, profile_id, coupon_code? }`.
3. La función decide a qué cuenta MP enviar el cobro:
   - Si curso es **producido por NATO** y la venta es ≤ `recupero_target` → cuenta NATO (`platform_config.nato_mp_access_token`).
   - Si no → cuenta del tenant (`tenant_mp_config.access_token`).
4. Devuelve `init_point` → redirige a Checkout Pro de MP.
5. MP procesa pago. Notifica a `mp-webhook` (no JWT, deduplicación por `payment_id`).
6. Webhook valida pago, crea `enrollment`, dispara `send-welcome-email` (Resend).
7. Si hay `?ref=`, se registra `affiliate_commissions`.

> **Pendiente de seguridad**: `mp-webhook` no valida la firma `x-signature` de MP — cualquiera podría POSTear un pago falso. Ver `docs/AUDITORIA_2026_05_04.md` (si se crea).

### 8.3 Plan SaaS (instructor → NATO)
1. `/pricing` → click en plan.
2. `create-subscription` crea preaprobación MP → URL de autorización.
3. Usuario autoriza → MP crea `preapproval_id` y notifica a `subscription-webhook`.
4. Webhook activa `tenants.plan` y registra `subscription_payments`. Si hubo `?ref=`, calcula comisión a `affiliate_commissions`.

### 8.4 OAuth Mercado Pago (instructor → conectar su cuenta)
1. `/settings` → "Conectar Mercado Pago" → redirect a `auth.mercadopago.com.ar` con `state=tenant_id`.
2. Vuelve a `/mp-oauth-callback?code=...&state=...`.
3. Frontend llama a `mp-oauth-exchange` con el `code` → la function hace exchange con MP y guarda `access_token` + `refresh_token` en `tenant_mp_config`.
4. Pendiente: validar que `state==tenant_id` pertenece al user logueado.

### 8.5 Producción NATO Creative (recupero)
- Toggle en `CourseForm`: "Producido por NATO Creative" + campo "Ventas de recupero" (default 10).
- `create-mp-preference` consulta `enrollments` count del curso. Si < `recupero_target` → cobra NATO; si ≥ → cobra al tenant.
- Dashboard `NatoOwnerPanel.tsx` → tab "Producción NATO" con forecast.

### 8.6 Afiliados
- `tenants.affiliate_code` único auto-generado al crear escuela.
- `?ref=CODIGO` en cualquier landing → guardado en `localStorage` → atado al `tenant` creado o suscripción pagada.
- Webhook calcula `commission_pct` (de `platform_config`) y crea row en `affiliate_commissions`.

### 8.7 Certificado
- Al completar 100% de las lecciones de un curso → RPC `issue_certificate(p_course_id)` crea row en `certificates` con `code` corto.
- Modal `CertificateModal.tsx` muestra preview + descarga PNG (html-to-image) + share LinkedIn + WhatsApp.
- `/certificates/:code` página pública verifica autenticidad.

---

## 9. Edge Functions (Supabase Deno)

10 funciones desplegadas. Path remoto: `https://hoolsigtquohayhpqgtb.supabase.co/functions/v1/<slug>`.

| Slug | JWT | Trigger | Qué hace |
|---|---|---|---|
| `create-mp-preference` | ✅ | Frontend | Crea preferencia MP. Decide cuenta NATO vs tenant según recupero. |
| `mp-webhook` | ❌ | MP → server | Procesa pago. Crea enrollment. Dispara welcome email. |
| `create-subscription` | ✅ | Frontend | Crea preapproval MP para plan SaaS. |
| `subscription-webhook` | ❌ | MP → server | Activa plan en tenant + comisión afiliado. |
| `mp-oauth-exchange` | ✅ | Frontend (callback) | Intercambia OAuth code por access/refresh token. |
| `send-welcome-email` | ✅ | mp-webhook | Email de bienvenida + acceso al curso. |
| `send-campaign` | ✅ | EmailMarketing UI | Envía broadcast a alumnos del curso/tenant. |
| `send-retention-emails` | ❌ | Cron | D+3, D+7, D+14 según `last_activity_at`. |
| `send-abandonment-emails` | ❌ | Cron | Avisa lecciones empezadas y abandonadas. |
| `generate-sitemap` | ❌ | `/sitemap.xml` rewrite | Genera XML con cursos publicados. |

**Pendiente crítico**: `mp-webhook` y `subscription-webhook` no validan firma de MP. Ver §13.

---

## 10. Variables de entorno y secretos

### Frontend (`.env`)
```
VITE_SUPABASE_URL=https://hoolsigtquohayhpqgtb.supabase.co
VITE_SUPABASE_ANON_KEY=<anon-key>
VITE_DEFAULT_TENANT_SLUG=nato   # opcional, default 'nato'
```
La anon key se debe rotar (pendiente desde abril 2026).

### Supabase (Edge Functions secrets)
Configurados en Supabase Dashboard → Project Settings → Functions:
- `MP_CLIENT_ID`, `MP_CLIENT_SECRET` — para OAuth
- `MP_WEBHOOK_SECRET` — para validar firma (pendiente de implementar)
- `RESEND_API_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` — usada solo por edge functions

### Tabla `platform_config` (settings dinámicos)
- `nato_mp_access_token` — access token MP de NATO (para cobros propios y recupero).
- `commission_pct` — comisión NATO sobre ventas (default 5%).
- `affiliate_pct` — comisión a afiliados.
- `recupero_default` — ventas de recupero por defecto en cursos NATO.

### Tabla `tenant_mp_config` (por escuela)
- `tenant_id`, `access_token`, `refresh_token`, `public_key`, `expires_at`, `mp_user_id`.

---

## 11. Headers de seguridad (Vercel)

Configurados en `vercel.json`:
- `X-Frame-Options: DENY`
- `X-Content-Type-Options: nosniff`
- `Strict-Transport-Security` con preload
- CSP con `script-src 'self' 'unsafe-inline' connect.facebook.net`, `frame-src youtube + vimeo`, `connect-src supabase + mercadopago`.
- `Permissions-Policy` denegando camera/mic/geo.

---

## 12. Comandos

```bash
npm run dev          # Vite dev server en :5173
npm run build        # Build de producción → dist/
npm run lint         # ESLint
npm run test         # Vitest unit (1 test placeholder)
npx playwright test  # 45 E2E (requiere dev server arriba)
git push origin main # Deploy automático en Vercel
```

---

## 13. Estado de seguridad (snapshot 2026-05-04)

Última auditoría completa: 5 agentes paralelos. Resumen:

### Críticos pendientes
1. **Rotar Supabase anon key** (en `.env` y Vercel envs).
2. **`mp-webhook` y `subscription-webhook` sin validar firma `x-signature`** — endpoints abiertos al pago falso.
3. **23 RPCs `SECURITY DEFINER` con EXECUTE para `anon`** (ej: `toggle_tenant_active`, `mark_course_recovered`, `update_tenant_commission`). Migration de REVOKE pendiente.
4. **Vistas `SECURITY DEFINER` saltan RLS cross-tenant** (`admin_enrollments`, `leaderboard_monthly`, `course_progress`, `course_instructors`). Cambiar a `security_invoker=true`.
5. **`notifications_insert_service` policy con `WITH CHECK = true`** — cualquier authenticated puede insertar notif a otro user.
6. **`mp_access_token` se actualiza desde el browser** en `TenantSettings.tsx:159` — mover a edge function.
7. **6 `target="_blank"` sin `rel="noopener"`**.

### Lo que ya está bien
- RLS habilitado en las 27 tablas.
- Sin `getClaims()`, sin `service_role` en cliente, sin `console.log` de debug, sin `@ts-ignore`.
- DOMPurify usado en EmailMarketing.
- Headers CSP/HSTS configurados en Vercel.

---

## 14. Performance (snapshot 2026-05-04)

- Bundle main: **1.33 MB / 378 KB gzip** (excede 500KB). Causas: recharts y html-to-image en main, varias rutas calientes sin lazy.
- 14 rutas lazy, 7 eager (Dashboard, CourseDetail, LessonView, Community, InstructorDashboard, Index, MemberProfile, Login, Signup).
- `QueryClient` con defaults (staleTime=0, refetchOnWindowFocus=true) — refetch agresivo.
- AuthContext value sin `useMemo` — re-render en cascada.
- 0 de 43 `<img>` con `loading="lazy"`.
- Fonts Google con `@import` bloqueante en CSS.

---

## 15. Calidad de código (snapshot 2026-05-04)

| Métrica | Valor |
|---|---|
| Total LOC src/ | ~17.9k (118 archivos) |
| Archivos > 500 líneas | 9 (CourseDetail 938, InstructorCoursePage 702, NatoOwnerPanel 657, InstructorDashboard 608, TenantSettings 596, ModuleList 573, EmailMarketing 567, LessonView 551) |
| `as any` | 92 |
| `: any` | 35 |
| `@ts-ignore` | 0 |
| `console.log` debug | 0 |
| TODO/FIXME | 0 |
| Tests unit reales | 0 (1 placeholder) |
| ErrorBoundary global | NO |
| Página huérfana | `Calendar.tsx` (375 líneas, no enrutada) |

---

## 16. Convenciones del proyecto

- **Moneda**: ARS, formato `toLocaleString('es-AR')`.
- **Idioma**: español argentino en UI.
- **Diseño**: dark mode-first via shadcn + tokens en `tailwind.config.ts`.
- **Auth**: usar `useAuth()` (nunca `getClaims()`).
- **Queries Supabase**: hoy dispersas en pages. Patrón a futuro: hooks en `src/api/<dominio>.ts`.
- **Lecciones nuevas**: video embed por URL (YouTube/Vimeo) + body markdown + adjuntos opcionales.
- **Slugs**: cursos y tenants por slug; rutas humanas (`/courses/marketing-101`).

---

## 17. Roadmap conocido (de memoria)

Ya implementado:
- Auditoría Hormozi (copy, prueba social, garantía, value stack, FAQ pricing parcial).
- Toggle anual MP, cuotas habilitadas, sitemap dinámico, afiliados, templates email, onboarding instructor.
- Forecasting de recupero en NatoOwnerPanel.
- Onboarding modal + retention emails + lecciones abandonadas.
- Mejoras UX: confetti, racha, mapa visual, tab inactivos, plan con vencimiento.

Pendiente prioritario:
1. **Seguridad**: rotar anon key, firmar webhooks MP, REVOKE EXECUTE en RPCs, vistas con security_invoker.
2. **Analítica**: 0 herramientas de medición (sin GA4/Plausible/Posthog) — operás a ciegas.
3. **Bundle**: lazy de rutas calientes + dynamic import de recharts y html-to-image.
4. **Activación**: tras OnboardingModal autoenrollar al curso intro y redirigir a 1ra lección.
5. **Drip emails real**: D+3 / D+7 / D+14 segmentado por última actividad.
6. **SSR/prerender**: la app es 100% CSR, Google indexa shell vacío.
7. **Multi-escuela switcher**: solo existe en `/instructor`, falta en Dashboard, Community, LessonView.
8. **Hero real**: stats hardcodeadas, falta video + testimonios reales.

---

## 18. Cómo extender el sistema

### Agregar una nueva página
1. Crear `src/pages/MiPagina.tsx`.
2. En `App.tsx`, lazy import + `<Route>`.
3. Si requiere auth: envolver en `<ProtectedRoute requiredRole="...">`.

### Agregar una tabla
1. Migration en Supabase Dashboard o `supabase migration new ...` (Studio).
2. **Habilitar RLS** y escribir policies (mínimo SELECT por tenant).
3. Regenerar tipos: `npx supabase gen types typescript --project-id hoolsigtquohayhpqgtb > src/types/database.types.ts`.

### Agregar una edge function
1. Crear carpeta `supabase/functions/<slug>/index.ts`.
2. `npx supabase functions deploy <slug>` (requiere CLI logueada).
3. Si recibe webhooks externos → JWT off (`--no-verify-jwt`) + validar firma manualmente.
4. Si la consume el frontend → JWT on (default).

### Cambiar la comisión NATO
- `platform_config.commission_pct` (en %).

### Agregar un plan SaaS
- Insertar fila en `plans` con `tier`, `price_monthly`, `price_yearly`, `features` (jsonb).
- Reflejar en `Pricing.tsx` y en el gate `PlanGate.tsx`.

---

## 19. Checklist post-deploy (nueva instancia)

- [ ] Conectar repo a Vercel + agregar env vars (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`).
- [ ] Supabase → Auth → URL Configuration → agregar dominio Vercel a Redirect URLs.
- [ ] AdminPanel → Configuración → cargar `nato_mp_access_token`.
- [ ] AdminPanel → Configuración → cargar `resend_api_key`.
- [ ] MP Developers → webhooks apuntando a:
  - `https://hoolsigtquohayhpqgtb.supabase.co/functions/v1/mp-webhook`
  - `https://hoolsigtquohayhpqgtb.supabase.co/functions/v1/subscription-webhook`
- [ ] TenantSettings → Integraciones → conectar Mercado Pago del tenant via OAuth.
- [ ] Configurar dominio custom (opcional) → setear `tenants.custom_domain` y agregar dominio en Vercel.

---

## Anexo — archivos clave para orientarse rápido

- Routing: `src/App.tsx`
- Auth + tenant: `src/context/AuthContext.tsx`
- Cliente Supabase: `src/lib/supabase.ts`
- Tipos DB: `src/types/database.types.ts`
- Guard rutas: `src/components/ProtectedRoute.tsx`
- Pricing (Hormozi): `src/pages/Pricing.tsx`
- Reproductor lección: `src/pages/LessonView.tsx`
- Builder de cursos: `src/pages/InstructorCoursePage.tsx` + `components/instructor/ModuleList.tsx`
- Panel NATO: `src/pages/NatoOwnerPanel.tsx`
- Headers seguridad: `vercel.json`
- Guía rápida: `CLAUDE.md`
