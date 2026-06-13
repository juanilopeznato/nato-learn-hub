# Sprint autónomo pre-launch — NATO University

**Modo:** trabajo autónomo (Opus 4.8) mientras Juani está afuera.
**Método:** 3 agentes expertos auditaron en paralelo (alumno / instructor-dueño / UX-UI) → consolidé → implementé en 5 olas → deploy continuo.

---

## ✅ Hecho y deployado (productivo Vercel)

### Ola 1 — Bugs críticos
- **`paid_amount` → `amount_paid`** (AdminPanel + InstructorCoursePage): el monto de cada inscripción salía siempre "—". Revenue invisible para instructor y dueño. Fix de 1 palabra, 5 ocurrencias.
- **`bg-secondary/50/50`** (clase Tailwind inválida) en CourseDetail → filas de lecciones y FAQ sin fondo. **Esto era el "FAQ horrible" reportado.**
- `divide-gray-50` → `divide-border/40` · `placeholder-gray-400` → token (dark mode).
- **Intro video Play sin `onClick`** → modal de preview (YouTube/Vimeo, autoplay, Escape/click-outside). Gancho de conversión mobile que estaba muerto.

### Ola 2 — Retención (motor del negocio)
- **🔥 Sistema de rachas resucitado** (`streak_engine_trigger`): `profiles.streak_days` se leía en 3 lugares pero NADA lo escribía → el badge nunca aparecía. Trigger SQL en `lesson_progress`, TZ Argentina.
- **Micro-meta** en reproductor: "Te faltan X lecciones para tu certificado" (antes "3 de 25", frío).
- **Completar-y-seguir**: el botón completa Y avanza en un tap. Resuelve que en mobile nadie marcaba completo → certificados nunca se emitían.

### Ola 3 — Pulido UX + revenue
- Botón Completar `variant="accent"` (sacó el halo púrpura+verde cruzado).
- Gradientes de fallback de cards: yellow/orange → paleta NATO (púrpura+verde).
- Trust signal 🔒 emoji → ícono Lucide Lock.
- **Comisión dinámica** en TenantSettings: decía "5%" hardcodeado pero la plataforma puede configurar por plan/tenant. Ahora muestra la efectiva (override > plan > 5%).

### Ola 4 — Retención dashboard
- **Banner para recién inscriptos (0%)**: antes solo aparecía con progreso. Ahora engancha al recién comprado con "Empezar ahora".
- **Leaderboard "vos: #24"**: si quedás fuera del top 10, ahora ves tu puesto real.

### Ola 5 — Pulido final
- Spinner inline en los 5 botones de compra (calidad percibida).
- Cleanup tokens hardcodeados InstructorDashboard (dark mode).

**Estado build:** typecheck limpio · 57/57 tests verde · auto-deploy GitHub↔Vercel funcionando.

---

## ⏳ Pendiente — requiere TEST con curso real o decisión

Estos los dejé sin tocar porque necesitan validar con un curso completo (videos cargados + alumno real) que no puedo simular:

- **Certificado re-accesible**: al cerrar el CertificateModal se abre el Upsell encima; si el alumno no descargó, debe buscar el cert en el Dashboard. Mejora: botón "Ver mi certificado" persistente. (Riesgo de tocar a ciegas — mejor con test real.)
- **`completeMutation` lento**: 2 round-trips secuenciales post-completar (award_points → cert). En 4G el cierre del curso se siente lento. Optimización necesita profiling real.

## ⏳ Pendiente — features grandes (post-launch o L)

- **Email visual WYSIWYG + automatizaciones** (bienvenida, follow-up a inactivos en 1 clic). Hoy EmailMarketing pide pegar HTML crudo. Depende de Resend del tenant configurado.
- **Vista de ventas individuales + reembolsos** desde el panel (hoy solo conteo agregado).
- **Funnel en dashboard multi-curso** (hoy solo con 1 curso). Bajo impacto con catálogo de 1.
- **Consolidar AdminPanel vs NatoOwnerPanel** (KPIs solapados).
- **Drawer mobile → shadcn Sheet** (focus trap + Escape).
- **Unificar doble sistema de toast** (sonner + shadcn coexisten).

---

## 🔒 Bloqueantes que SOLO puede resolver Juani

1. **Subir los 25 videos a YouTube (Unlisted)** + pegar URLs con el bulk-import del panel instructor.
2. **Nata conecta Mercado Pago** en `/tenant-settings` (sin esto no se cobra).
3. **Nata: logo + Instagram + WhatsApp** del tenant.
4. **Rotar Supabase Anon Key** + borrar fallback en `src/lib/supabase.ts`.
5. **Crear proyecto Sentry** (la API lo bloquea para members; manual).
6. **MP de Nata: desactivar "cuotas sin interés"** (comisión 28%).

---

## Commits del sprint
`96c079b` ola1 · `985fee5` ola2 · `b31222c` ola3 · `b55a363` ola4 · `2a16aee` ola5
