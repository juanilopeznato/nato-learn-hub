# Plan Semana Launch — NATO University

**Lanzamiento: 12 jun 2026 · Hoy: 1 jun 2026 · Quedan 11 días**

Foco semana: NATO University es prioridad #1. Vercel ya está productivo (https://nato-learn-hub.vercel.app). Falta validar todo end-to-end y meter polish de conversión.

## Track A — Confianza técnica (días 1-3)

- [ ] **A1**. Smoke test end-to-end en Vercel productivo
  - Signup → email verification → login → ver curso → empezar lección → completar lección
  - Multi-tenant: crear escuela de prueba → ver landing custom
- [ ] **A2**. Checkout MP real con tarjeta test
  - Click "Comprar" → redirect MP → pago test → callback → enrollment creado
  - Verificar `enrollments.mp_payment_id` UNIQUE constraint trabaja
- [ ] **A3**. Webhook MP idempotencia en prod
  - Trigger webhook 2x con mismo payment_id → solo 1 enrollment
  - Verificar HMAC signature validation
- [ ] **A4**. Emails Resend funcionan
  - Signup verification email llega
  - Reset password email llega
  - SPF/DKIM/DMARC verificados
- [ ] **A5**. 🚨 Rotar Supabase Anon Key
  - Está expuesta en bundle (normal) pero la del transcript inicial puede haber leakeado
  - Rotar + borrar fallback en `src/lib/supabase.ts`
- [ ] **A6**. Dominio final
  - Decidir entre `.vercel.app` / `natouniversity.com` / `lms.natoglobal.com`
  - Si custom: registrar + DNS + verificar
- [ ] **A7**. Lighthouse audit + top 3 fixes
  - Perf, A11y, SEO, Best Practices > 90

## Track B — Conversión landing (días 2-4)

- [ ] **B1**. Hero landing validation
  - Copy: ¿claro qué es? ¿claro para quién? ¿claro qué hacer?
  - Social proof above the fold (X instructores activos, Y alumnos)
  - CTA hierarchy: primario vs secundario
- [ ] **B2**. Pricing page conversion
  - Scarcity/urgency (Black Friday, oferta lanzamiento?)
  - Comparison table clara (qué tiene cada plan)
  - Money-back guarantee si aplica
- [ ] **B3**. CourseDetail trust signals
  - Reviews/ratings prominentes
  - Instructor bio + foto
  - Preview gratuito de 1 lección
  - "Lo que aprenderás" specific
- [ ] **B4**. Testimonials reales en landing (si tenemos)
- [ ] **B5**. Microcopy sweep
  - Error states empáticos
  - Empty states con CTA
  - Success states celebratorios

## Track C — Onboarding + retención (días 4-6)

- [ ] **C1**. Welcome modal primera vez
  - "Bienvenido [Nombre], ¿qué querés hacer primero?"
  - Tour de 3 pasos
- [ ] **C2**. Email automation
  - D+1: "tu primera lección te espera"
  - D+3: "extrañamos verte"
  - D+7: "completaste X%, +Y para el certificado"
- [ ] **C3**. Streak/gamification visible
  - Días consecutivos
  - Badge "primera lección completada"
- [ ] **C4**. Push notifications (PWA)
  - Permission prompt no agresivo
  - Notif "tu instructor publicó algo nuevo"

## Track D — Operacional launch (días 6-8)

- [ ] **D1**. Sentry NATO University project
  - Crear proyecto en org `nato-ii`
  - Setear `VITE_SENTRY_DSN` en Vercel
  - Verificar primeros eventos llegan
- [ ] **D2**. Alertas Sentry
  - Error rate > 5% → email
  - Payment failures → email
  - Webhook MP errors → email
- [ ] **D3**. Runbook incidentes
  - "Si X falla → hacer Y"
  - Checkout caído, signup caído, webhook caído, DB caído
- [ ] **D4**. Status page validación
  - `/status` muestra estado real (Supabase, MP, Resend)
- [ ] **D5**. Apagar Lovable
  - Solo después de soft launch en Vercel exitoso 48h
  - Pausar proyecto Lovable (ahorra $$)

## Track E — Polish residual (paralelo)

- [ ] **E1**. Dark mode QA todas las pantallas
  - Instructor panel, AdminPanel, NatoOwnerPanel
- [ ] **E2**. Mobile QA top routes
  - Landing, /courses, /pricing, /dashboard, /learn, /community
- [ ] **E3**. Accessibility audit
  - Skip-to-content visible
  - Contrast ratios
  - Form labels
  - Keyboard nav
- [ ] **E4**. SEO meta por route
  - OG image dinámica por curso
  - Twitter cards
  - Schema.org markup

## Calendario tentativo

| Día | Foco |
|---|---|
| 1-jun (hoy) | A1, A2, A3 (smoke test + checkout MP) |
| 2-jun | A4, A5, A6 (emails, rotate key, domain) |
| 3-jun | A7, B1, B2 (lighthouse, landing copy, pricing) |
| 4-jun | B3, B4, B5 (course detail, microcopy) |
| 5-jun | C1, C2 (welcome modal, emails D+1/3/7) |
| 6-jun | C3, D1, D2 (gamification, Sentry, alertas) |
| 7-jun | D3, D4, E1 (runbook, status, dark mode QA) |
| 8-jun | E2, E3, E4 (mobile, a11y, SEO) |
| 9-jun | Buffer + soft launch a 10 personas |
| 10-jun | Fixes de soft launch |
| 11-jun | D5 (apagar Lovable) + final QA |
| **12-jun** | 🚀 **LAUNCH** |

## Métricas de éxito launch

- < 5% error rate en signup
- < 1% error rate en checkout
- > 80% completion rate primer lesson
- Email delivery > 95%
- Lighthouse Perf > 85, A11y > 95
- Cero 5xx en primeras 24h
