---
type: article
title: Cómo correr nato-learn-hub
description: Instalar, correr local, probar y publicar.
timestamp: 2026-10-10T21:10:00Z
---

# Cómo correrlo

## Requisitos
Node 20 + npm. `.env` según [.env.example](../../.env.example). direnv opcional (`.envrc` carga tokens de Vercel y Supabase).

## Instalar
```bash
npm install      # "prepare" apunta los hooks de git a .husky
```

## Correr local
```bash
npm run dev      # Vite
npm run build    # sitemap + vite build + postbuild (URLs con VITE_PUBLIC_URL)
npm run preview
```

## Probar
```bash
npm test               # Vitest
npm run lint:storage   # bloqueante: uploads solo por src/lib/storage.ts
npm run check          # lint + lint:storage + tests
npx playwright test    # E2E, con el dev server corriendo
```
Hook pre-commit (`.husky/pre-commit`): `tsc --noEmit` + `lint:storage`. CI (`.github/workflows/ci.yml`): lint (no bloquea), lint:storage, typecheck, build y Vitest en PR y push a main.

## Publicar / deploy
Según CLAUDE.md, push a `main` → Vercel deploya solo (y Lovable importa el repo). Ver [docs/MIGRACION_VERCEL.md](../../docs/MIGRACION_VERCEL.md). Con el Arnés: rama + PR y el merge lo decide Juani. Los SQL de `docs/*.sql` se aplican a mano en Supabase.
