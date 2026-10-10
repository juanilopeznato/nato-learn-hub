---
type: article
title: Features de nato-learn-hub
description: Qué hace el proyecto hoy. Se agrega una fila por feature nueva.
timestamp: 2026-10-10T21:10:00Z
---

# Features

| Feature | Dónde vive | Desde | Notas |
|---|---|---|---|
| Auth, roles (`nato_owner`, `admin`, `instructor`, `student`) y rutas protegidas | `src/context/AuthContext.tsx`, `ProtectedRoute.tsx` | 2026-04-09 | |
| Cursos, módulos y lecciones con reproductor y progreso | `src/pages/LessonView.tsx`, `components/lesson/` | 2026-04-09 | Descripción y markdown por clase desde 2026-06-03 |
| Panel de instructor (cursos, alumnos, KPIs, email marketing) | `src/pages/Instructor*`, `components/instructor/` | 2026-04-09 | Simplificado 2026-04-20 |
| Panel NATO `/nato` (métricas, recupero de producción, Edición Limitada $, ventas por canal) | `src/pages/NatoOwnerPanel.tsx` | 2026-04-09 | |
| Venta de cursos con Mercado Pago y comisión de NATO | edge functions `create-mp-preference`, `mp-webhook` | 2026-04-14 | Conexión por token manual desde 2026-06-17 |
| Planes SaaS para instructores y afiliados | `Pricing.tsx`, edge functions de suscripción | 2026-04-13 | |
| Cupones, reseñas, notificaciones, export CSV | varios | 2026-04-13 | Cupones vía RPC `validate_coupon` desde 2026-06-17 |
| Emails automáticos (comprobante, retención, campañas) | Resend, `send-campaign` | 2026-04-13 | |
| Certificados con verificación pública | `CertificateVerify.tsx` | 2026-04-09 | |
| Comunidad y leaderboard, rachas | `Community.tsx`, `components/dashboard/` | 2026-04-09 | Rachas 2026-06-13 |
| Pipeline único de imágenes (WebP + thumbs) | `src/lib/storage.ts` | 2026-05-14 | Regla bloqueante |
| Videos protegidos (bucket privado, URL firmada, marca de agua) | lesson player | 2026-06-03 | |
| Checkout sin cuenta (guest) con WhatsApp y atribución UTM | `CourseDetail.tsx` | 2026-06-13 | |
| Multi-escuela por path (`/:escuela/:curso`) con marca y tipografía por escuela | routing, tema | 2026-06-14 | |
| SEO (meta por página, schema.org, sitemap dinámico), PWA, Sentry | varios | 2026-04-15 | |
