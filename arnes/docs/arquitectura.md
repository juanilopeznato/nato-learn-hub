---
type: article
title: Arquitectura de nato-learn-hub
description: Cómo está armado el proyecto, piezas y cómo se conectan.
timestamp: 2026-10-10T21:10:00Z
---

# Arquitectura

## Resumen
SPA en Vite servida como estática (Vercel, con rewrites y headers de seguridad en `vercel.json`). Toda la lógica de servidor está en Supabase: Postgres con RLS, Auth, Storage y Edge Functions (Deno). Detalle de rutas, roles y edge functions en [CLAUDE.md](../../CLAUDE.md) y [docs/SISTEMA.md](../../docs/SISTEMA.md).

## Stack
React 18 + TypeScript + Vite + Tailwind + shadcn/ui, React Router, TanStack Query, react-helmet-async. Tests: Vitest (`src/test/`) y Playwright E2E (`tests/e2e/`). Sentry, Plausible, Meta Pixel y Vercel Web Analytics.

## Carpetas principales
| Carpeta | Qué hay |
|---|---|
| `src/pages/` | Una página por ruta (landing, cursos, curso, lección, dashboard, instructor, admin, `/nato`) |
| `src/components/` | landing, lesson, course, community, dashboard, instructor, ui (shadcn) |
| `src/lib/` | `supabase.ts`, `storage.ts` (único camino para subir imágenes), utilidades |
| `src/context/`, `src/hooks/` | Auth + detección de escuela (tenant), hooks |
| `src/types/database.types.ts` | Tipos generados de Supabase |
| `scripts/` | Build (sitemap, postbuild), lint de storage, scripts de lanzamiento (ver [tools](../tools/INDICE.md)) |
| `docs/` | Docs técnicos y SQL sueltos para aplicar a mano en Supabase |
| `tests/e2e/` | Playwright |

## Servicios externos
| Servicio | Para qué | Variables de entorno (solo nombres) |
|---|---|---|
| Supabase | Base, auth, storage, edge functions | `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`; scripts: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`; CLI: `SUPABASE_ACCESS_TOKEN` (vía `.envrc`) |
| Mercado Pago | Venta de cursos, suscripciones, conexión de cuentas | `VITE_MP_CLIENT_ID`, `VITE_MP_REDIRECT_URI`; tokens de NATO y de cada escuela se cargan en la base desde los paneles |
| Resend | Mails transaccionales y campañas | `RESEND_API_KEY` (scripts); clave de plataforma cargada en AdminPanel |
| Vercel | Hosting | `VERCEL_TOKEN` (vía `.envrc`) |
| Sentry | Errores | `VITE_SENTRY_DSN` |
| Google Drive API | Scripts de migración de videos | `GOOGLE_DRIVE_API_KEY` |
| General | URL pública y escuela por defecto | `VITE_PUBLIC_URL`, `VITE_DEFAULT_TENANT_SLUG` |

## Datos
Postgres en Supabase. Tablas principales (según `database.types.ts` y CLAUDE.md): `tenants`, `profiles`, `courses`, `modules`, `lessons`, `resources`, `enrollments`, `lesson_progress`, `certificates`, `tenant_mp_config`, `plans`, `platform_config`, `email_sends`. Storage: bucket privado `lesson-videos` + imágenes vía `storage.ts`. **No hay `supabase/migrations` ni código de edge functions en el repo** (solo SQL sueltos en `docs/`).
