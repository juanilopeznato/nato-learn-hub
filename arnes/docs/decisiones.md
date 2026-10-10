---
type: decision
title: Decisiones de nato-learn-hub
description: Registro de decisiones importantes, la más nueva arriba. No se editan entradas viejas.
timestamp: 2026-10-10T21:10:00Z
---

# Decisiones

Formato (la más nueva arriba; si una decisión cambia, se agrega otra que dice «reemplaza a AAAA-MM-DD …»):

```
## AAAA-MM-DD · Título corto
- Qué: …
- Por qué: …
- Alternativas: …
- Quién decidió: Juani / agente con OK de Juani / heredado
```

## 2026-10-10 · Instalar el Arnés v1.0.0
- Qué: se agregó `arnes/` (constitución, docs y tools) y el bloque mínimo en CLAUDE.md/AGENTS.md.
- Por qué: que cualquier agente sepa cómo está armado el proyecto sin reinvestigarlo y no rehaga lo que ya existe.
- Alternativas: instalar RSC de Eric Risco tal cual (descartado: preferimos archivos propios, en castellano y sin sincronización automática a GitHub).
- Quién decidió: Juani (10-oct-2026).

## 2026-06-17 · Conectar Mercado Pago por token manual (sin OAuth)
- Qué: cada escuela carga su token de MP en Ajustes en vez del flujo OAuth.
- Por qué: no consta en el commit.
- Quién decidió: heredado (historial).

## 2026-06-14 · Multi-escuela por path: la marca la decide la URL
- Qué: raíz = plataforma, `/:escuela` = escuela, URL de curso canónica `/:escuela/:curso`; la marca sale de la URL, no del login.
- Por qué: no consta.
- Quién decidió: heredado (historial).

## 2026-06-13 · Checkout sin cuenta (guest checkout)
- Qué: se puede comprar sin crear cuenta.
- Por qué: era el pendiente principal del CRO ([docs/CRO-funnel-pendientes.md](../../docs/CRO-funnel-pendientes.md)).
- Quién decidió: heredado (historial).

## 2026-06-08 · Sin garantía de 30 días
- Qué: se quita la garantía de devolución.
- Por qué: «agujero en mercado AR con contenido digital» (commit).
- Quién decidió: heredado (historial).

## 2026-06-08 · Sin selector de cuotas sin interés
- Qué: se saca del pricing.
- Por qué: la comisión de MP es 28 % (commit).
- Quién decidió: heredado (historial).

## 2026-06-08 · Tema claro por defecto
- Qué: default light en vez de seguir al sistema.
- Por qué: «la marca se ve mejor en claro» (commit).
- Quién decidió: heredado (historial).

## 2026-06-03 · Videos en bucket privado con URL firmada y marca de agua
- Qué: protección de video de las lecciones.
- Por qué: no consta.
- Quién decidió: heredado (historial).

## 2026-06-01 · Migrar el hosting de Lovable a Vercel
- Qué: `vercel.json` completo y plan en [docs/MIGRACION_VERCEL.md](../../docs/MIGRACION_VERCEL.md).
- Por qué: ver ese doc.
- Quién decidió: heredado (historial).

## 2026-05-14 · Pipeline único de uploads (regla post-Ranerzzz)
- Qué: toda imagen pasa por `src/lib/storage.ts`; `lint:storage` bloquea en pre-commit y CI.
- Por qué: en otro proyecto el ancho de banda de Supabase se disparó porque cada feature subía imágenes a su manera (comentario en `scripts/check-storage-pipeline.mjs`).
- Quién decidió: heredado (historial).

## 2026-05-14 · Credenciales de Mercado Pago a variables de entorno; AdminPanel solo para nato_owner
- Qué: hardening de seguridad.
- Por qué: no consta.
- Quién decidió: heredado (historial).

## 2026-04-14 · Split automático del 5 % para NATO
- Qué: NATO se queda con una comisión configurable (`platform_config.commission_pct`) en cada venta.
- Por qué: no consta.
- Quién decidió: heredado (historial).

## 2026-04-09 · Todo en pesos argentinos; Lovable para UI y Claude Code para lógica
- Qué: sin multi-moneda; UI desde Lovable, Supabase/edge functions desde Claude Code (ver [CLAUDE.md](../../CLAUDE.md), «Decisiones importantes»).
- Por qué: no consta.
- Quién decidió: heredado (CLAUDE.md).
