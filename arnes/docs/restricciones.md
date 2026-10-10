---
type: article
title: Restricciones de nato-learn-hub
description: Lo que no se puede o no se debe hacer en este proyecto, además de la constitución.
timestamp: 2026-10-10T21:10:00Z
---

# Restricciones

Además de `../constitucion.md` (resumen; detalle en [CLAUDE.md](../../CLAUDE.md)):

- **Uploads de imágenes solo por `src/lib/storage.ts`** (`uploadImage()`); nunca `supabase.storage.from(...).upload()` directo. Para mostrar: `<SmartImage>` / `<SmartAvatar>`. Lo bloquean el pre-commit y la CI.
- Precios siempre en ARS con `toLocaleString('es-AR')`.
- `nato_owner` ≠ `admin`: el primero ve toda la plataforma, el segundo solo su escuela.
- Si se tocó UI en Lovable y lógica acá, mergear lo de Lovable antes de pushear.
- No hacer `--no-verify`: el hook corre typecheck + lint de storage.
- El repo es **público**: nada de tokens, datos de alumnos ni listas de leads en commits.
- Antes de un deploy: checklist «Config post-deploy» de CLAUDE.md.
