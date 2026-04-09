# NATO University — Guía del proyecto

## ¿Qué es esto?
Plataforma LMS multi-tenant para vender cursos online. Similar a Teachable/Gumroad pero propio de NATO. Cada escuela tiene su propio dominio, estudiantes y cuenta de Mercado Pago.

## Stack
- **Frontend**: React + TypeScript + Vite + TailwindCSS + shadcn/ui
- **Backend**: Supabase (Postgres + Auth + Storage + Edge Functions Deno)
- **Pagos**: Mercado Pago ARS (Checkout Pro + Preaprobación)
- **Email**: Resend API
- **Tests**: Playwright E2E → `npx playwright test`
- **Build**: `npm run build` → carpeta `dist/`

## Comandos
```bash
npm run dev          # Dev server en localhost:5173
npm run build        # Build de producción
npx playwright test  # 45 tests E2E (requiere dev server corriendo)
git push origin main # Deploy automático en Vercel
```

## Variables de entorno (.env)
```
VITE_SUPABASE_URL=https://hoolsigtquohayhpqgtb.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGci...
```

## Supabase
- **Project ID**: `hoolsigtquohayhpqgtb`
- **URL**: `https://hoolsigtquohayhpqgtb.supabase.co`
- **Dashboard**: https://supabase.com/dashboard/project/hoolsigtquohayhpqgtb

## GitHub
- **Repo**: `https://github.com/juanilopeznato/nato-learn-hub`
- Push a `main` → Vercel deploya automáticamente

---

## Arquitectura de archivos

```
src/
├── App.tsx                        # Rutas principales
├── context/
│   └── AuthContext.tsx             # Auth + tenant detection
├── lib/
│   └── supabase.ts                 # Cliente Supabase
├── types/
│   └── database.types.ts           # Tipos generados desde Supabase
├── components/
│   ├── ProtectedRoute.tsx          # Guard de rutas por rol
│   ├── MetaPixel.tsx               # Meta Pixel + fbTrack()
│   ├── ImageUpload.tsx             # Upload a Supabase Storage
│   ├── PlanGate.tsx                # Gate para límites de plan
│   ├── NotificationBell.tsx        # Notificaciones
│   ├── CertificateModal.tsx        # Modal de certificado
│   ├── landing/                    # Componentes landing pública
│   ├── dashboard/
│   │   ├── EnrolledCourseCard.tsx  # Card de curso con progreso
│   │   └── Leaderboard.tsx         # Tabla de posiciones
│   ├── lesson/
│   │   ├── VideoEmbed.tsx          # Embed YouTube/Vimeo
│   │   ├── LessonSidebar.tsx       # Sidebar con árbol de módulos
│   │   └── LessonComments.tsx      # Comentarios por lección
│   ├── course/
│   │   └── CourseCalendar.tsx      # Calendario de clases por curso
│   ├── community/
│   │   ├── PostCard.tsx
│   │   └── PostForm.tsx
│   └── instructor/
│       ├── CourseForm.tsx          # Form de creación/edición de curso
│       ├── ModuleList.tsx          # Módulos + lecciones con drag&drop
│       └── KpiDashboard.tsx        # Métricas + funnel por curso
└── pages/
    ├── Index.tsx                   # Landing pública
    ├── Courses.tsx                 # Marketplace de cursos
    ├── CourseDetail.tsx            # Landing de curso individual
    ├── Login.tsx / Signup.tsx
    ├── ForgotPassword.tsx / ResetPassword.tsx
    ├── Pricing.tsx                 # Planes públicos
    ├── CertificateVerify.tsx       # Verificación /certificates/:code
    ├── Dashboard.tsx               # Dashboard estudiante
    ├── LessonView.tsx              # Reproductor de lección
    ├── ProfileSettings.tsx         # Perfil de usuario
    ├── Community.tsx / MemberProfile.tsx
    ├── InstructorDashboard.tsx     # Panel instructor
    ├── InstructorCoursePage.tsx    # Gestión de curso específico
    ├── EmailMarketing.tsx          # Campañas de email
    ├── TenantSettings.tsx          # Configuración de escuela
    ├── AdminPanel.tsx              # Panel administrador
    └── NatoOwnerPanel.tsx          # Panel exclusivo NATO (/nato)
```

---

## Roles y acceso

| Role | Ruta principal | Descripción |
|---|---|---|
| `nato_owner` | `/nato` | Dueño de la plataforma. Ve métricas globales, todas las escuelas, recupero de producción |
| `admin` | `/admin` | Gestión de tenants, config de plataforma, cambio de planes |
| `instructor` | `/instructor` | Gestiona sus cursos, lecciones, estudiantes, email marketing |
| `student` | `/dashboard` | Ve sus cursos inscritos, progreso, comunidad |

`nato_owner` también puede acceder a `/instructor` y `/admin`.

---

## Monetización

### 1. Venta de cursos (tenant → estudiante)
- Tenant conecta cuenta MP en `/settings` → Integraciones
- Edge Function `create-mp-preference` crea la preferencia
- Webhook `mp-webhook` activa el enrollment al pagar
- NATO descuenta 5% automáticamente (commission_pct en platform_config)
- Comprobante por email via Resend

### 2. Planes SaaS (NATO → instructor)
- 4 planes en tabla `plans`: free / starter / creator / pro
- Pago via MP Preaprobación → `create-subscription` Edge Function
- Webhook `subscription-webhook` activa el plan y calcula comisión de afiliado
- Requiere `nato_mp_access_token` en AdminPanel → Configuración

### 3. Recupero de costos NATO Creative
- En CourseForm (tab Instructor): toggle "Producido por NATO Creative"
- Campo "Ventas de recupero" (default: 10)
- Primeras N ventas → cuenta MP de NATO
- A partir de N+1 → cuenta MP del instructor
- Dashboard en `/nato` → tab "Producción NATO"

### 4. Afiliados
- Código único por escuela en `tenants.affiliate_code`
- Signup con `?ref=CODIGO` → comisión al referidor
- % configurable en `platform_config.commission_pct`

---

## Edge Functions (Supabase)

| Función | JWT | Descripción |
|---|---|---|
| `create-mp-preference` | ✅ | Crea preferencia de pago. Enruta a cuenta NATO o instructor según recupero |
| `mp-webhook` | ❌ | Notificaciones MP → activa enrollment + envía comprobante email |
| `create-subscription` | ✅ | Crea suscripción de plan SaaS via MP Preaprobación |
| `subscription-webhook` | ❌ | Activa plan en tenant + calcula comisión afiliado |
| `send-campaign` | ✅ | Envía campaña email via Resend, trackea en email_sends |

---

## Config post-deploy (checklist)

- [ ] Conectar repo en Vercel + agregar env vars
- [ ] Supabase → Auth → URL Configuration → agregar URL de Vercel en Redirect URLs
- [ ] AdminPanel → Configuración → cargar `nato_mp_access_token` (cuenta MP de NATO)
- [ ] AdminPanel → Configuración → cargar `resend_api_key` (plataforma)
- [ ] MP Developers → webhooks apuntar a:
  - `https://hoolsigtquohayhpqgtb.supabase.co/functions/v1/mp-webhook`
  - `https://hoolsigtquohayhpqgtb.supabase.co/functions/v1/subscription-webhook`
- [ ] TenantSettings → Integraciones → cargar MP Access Token del tenant

---

## Decisiones importantes

- **Todo en ARS** — no hay soporte multi-moneda. `toLocaleString('es-AR')` en todos los precios.
- **Sin Lovable** — el proyecto empezó con Lovable pero se migró completamente a Claude Code.
- **45/45 tests** — Playwright E2E cubre auth, dashboard, cursos, instructor, lección, comunidad, landing.
- **nato_owner ≠ admin** — nato_owner ve toda la plataforma; admin gestiona solo su tenant.
