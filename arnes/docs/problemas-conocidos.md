---
type: article
title: Problemas conocidos de nato-learn-hub
description: Bugs, deudas técnicas y riesgos detectados. Se tachan al resolverse, no se borran.
timestamp: 2026-10-10T21:10:00Z
---

# Problemas conocidos

| Fecha | Problema | Dónde | Estado |
|---|---|---|---|
| 2026-10-10 | Repo público con la contraseña del usuario de pruebas E2E escrita en los tests. Cambiarla y pasarla a variable de entorno. | `tests/e2e/*.spec.ts` | abierto |
| 2026-10-10 | Edge functions y migraciones de Supabase no están versionadas en el repo (solo SQL sueltos en `docs/` que se aplican a mano). | Supabase | abierto |
| 2026-10-10 | Dónde está producción no queda claro: CLAUDE.md dice que la prod real es Lovable y también que push a main deploya en Vercel; el código usa university.natoglobal.com.ar. | CLAUDE.md, [docs/MIGRACION_VERCEL.md](../../docs/MIGRACION_VERCEL.md) | abierto |
| 2026-10-10 | Mails transaccionales podían salir desde el sandbox de Resend (no llegan a compradores) si no se cargó el remitente con dominio verificado. Verificar estado. | [docs/PAGOS-modelo-y-routing.md](../../docs/PAGOS-modelo-y-routing.md) | abierto |
| 2026-10-10 | Deudas multi-escuela señaladas por la verificación adversarial (no afectan con una sola escuela). | [docs/SPRINT_AUTONOMO_2026-06.md](../../docs/SPRINT_AUTONOMO_2026-06.md) | abierto |
| 2026-10-10 | ~145 violaciones de ESLint legacy; el lint no bloquea en CI. | `.github/workflows/ci.yml` | abierto |
| 2026-10-10 | Pendientes de la migración a Vercel y checklist post-deploy sin tildar en los docs (pueden estar hechos y sin actualizar). | [docs/MIGRACION_VERCEL.md](../../docs/MIGRACION_VERCEL.md), CLAUDE.md | abierto |
| 2026-10-10 | README es el genérico de Lovable. | `README.md` | abierto |
