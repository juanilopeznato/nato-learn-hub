---
type: index
title: Herramientas de nato-learn-hub
description: Scripts reutilizables del proyecto. Antes de crear uno, buscá acá.
timestamp: 2026-10-10T21:10:00Z
---

# Herramientas

Antes de escribir un script de un solo uso, fijate si ya está acá. Si lo que armás se va a repetir, guardalo en esta carpeta y agregá una fila.

| Herramienta | Qué hace | Cómo se usa | Toca producción |
|---|---|---|---|
| [`scripts/build-sitemap.mjs`](../../scripts/build-sitemap.mjs) | Genera `public/sitemap.xml` con los cursos publicados | `npm run sitemap` (corre en `npm run build`) | lee |
| [`scripts/postbuild.mjs`](../../scripts/postbuild.mjs) | Reemplaza el dominio por `VITE_PUBLIC_URL` en `dist/` | automático en `npm run build` | no |
| [`scripts/check-storage-pipeline.mjs`](../../scripts/check-storage-pipeline.mjs) | Falla si hay uploads a Storage fuera de `storage.ts` | `npm run lint:storage` | no |
| [`scripts/send-email-campaign.mjs`](../../scripts/send-email-campaign.mjs) | Manda la secuencia de emails de lanzamiento por Resend a un CSV de leads (dry-run y test a 1 mail) | ver cabecera del script | **sí** (envío masivo) |
| [`scripts/generate-whatsapp-blaster.mjs`](../../scripts/generate-whatsapp-blaster.mjs) | Genera un HTML para mandar WhatsApp uno a uno a leads | ver cabecera | no |
| [`scripts/upload-drive-to-supabase.mjs`](../../scripts/upload-drive-to-supabase.mjs) | Migra videos de una carpeta de Drive al bucket privado `lesson-videos` | ver cabecera | **sí** (escribe Storage) |
| [`scripts/download-nata-videos.mjs`](../../scripts/download-nata-videos.mjs) | Descarga de Drive los videos principales de «Edición Limitada» | ver cabecera | no |
| [`scripts/extract-nata-videos.mjs`](../../scripts/extract-nata-videos.mjs) | Encuentra los 25 videos principales en un ZIP descomprimido de Drive | ver cabecera | no |
| [`docs/take-screenshots.js`](../../docs/take-screenshots.js) | Saca capturas de la app | ver archivo | no |
| `docs/*.sql` | SQL para aplicar a mano en Supabase (métricas de storage, rate limit, hardening, campos seguros de tenant) | SQL Editor de Supabase | **sí** |

## Reglas
- Un archivo por herramienta, nombre en minúscula con verbo: `ver-tablas.sh`, `exportar-turnos.py`.
- `--help` obligatorio. Credenciales por variable de entorno o `.env` ignorado por git; nunca escritas en el script.
- Lo destructivo (borrar, cobrar, enviar masivo) exige `--confirmar`; sin eso solo muestra lo que haría.
- Si la herramienta ya existe en el repo en otra carpeta (`scripts/`, `bin/`), no la muevas: anotala acá con su ruta.
