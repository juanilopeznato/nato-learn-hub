# Ciclo de vida post-compra — NATO University

**Feature reusable, multi-tenant.** Este documento define la secuencia de emails de lifecycle que se dispara **después** de que alguien compra un curso. Está diseñada como plantilla genérica (placeholders) para que cualquier instructor/tenant la use, y al final incluye el ejemplo lleno para el primer caso real: **Nata Álvarez — Edición Limitada**.

## El problema que resuelve

Medición actual: de 6 compradoras de un curso, solo 1 lo hizo completo; el resto quedó entre 0% y 4% de progreso. La gente compra y no arranca. Hoy el post-compra no existe de forma efectiva.

El ciclo tiene que hacer tres cosas:
1. **Activar** a los que no arrancan.
2. **Retener** a los que se estancan.
3. **Convertir** a los que terminan en reseñas + referidos (esto alimenta ventas nuevas).

---

## Placeholders (contrato de datos)

| Placeholder | Qué es | Fuente |
|---|---|---|
| `{{NOMBRE}}` | Nombre de pila del comprador | `profiles.first_name` |
| `{{CURSO}}` | Nombre del curso comprado | `courses.title` |
| `{{TENANT}}` | Nombre de la marca del instructor | `tenants.brand_name` |
| `{{INSTRUCTOR}}` | Nombre del instructor (firma) | `tenants.instructor_name` |
| `{{LINK_CURSO}}` | URL al curso (overview) | armado por tenant slug + course slug |
| `{{LINK_PRIMERA_LECCION}}` | URL directa a la lección 1, sin pasar por el índice | primera `lessons` por `order` |
| `{{LINK_RESENA}}` | URL al formulario/flujo de reseña | ruta de reseña por curso |
| `{{LINK_REFERIDO}}` | URL con el código de referido del comprador | link de referido personalizado |
| `{{CERTIFICADO}}` | URL o adjunto del certificado de finalización | generado al 100% |

> **Regla de oro de la señal de progreso:** la actividad se mide con **`progress_percent`** y **cantidad de lecciones completadas** (`completed_lessons`). **NO** usar `last_accessed_at` — está roto y da falsos negativos/positivos.

---

## Mapa de las 5 etapas

| # | Etapa | Trigger (condición exacta) | Señal de datos | Objetivo |
|---|---|---|---|---|
| 1 | Bienvenida / onboarding | `days_since_purchase == 0` (al confirmarse el pago) | evento de compra | Que entren HOY a la primera lección |
| 2 | Activación (no-arrancó) | `days_since_purchase ∈ [2,3]` **Y** `progress_percent == 0` **Y** no se mandó ya la etapa 2 | `progress_percent == 0` | Derribar la inercia del arranque |
| 3 | Check-in de progreso | `days_since_purchase >= 7` **Y** `0 < progress_percent < 100` **Y** sin avanzar hace >= 3 días (delta de `completed_lessons` = 0) | `progress_percent` + delta de `completed_lessons` | Reenganchar, "te falta poco" |
| 4 | Completar (100%) | `progress_percent == 100` (al completarse) | `progress_percent == 100` | Felicitar + reseña + certificado + referido |
| 5 | Win-back | `days_since_purchase >= 14` **Y** `progress_percent < 100` **Y** sin avanzar hace >= 10 días **Y** ya se enviaron 2/3 | inactividad prolongada | Último intento de reactivar |

**Reglas de exclusión (para todas):**
- Cada etapa se envía **una sola vez** por comprador+curso (guardar `stage_sent` con timestamp).
- Si el comprador ya llegó al 100%, no recibe 2, 3 ni 5.
- La etapa 4 (100%) puede dispararse en cualquier momento y **corta** las demás.
- Respetar horario razonable de envío (ej. 9–20h del timezone del tenant) para no caer de madrugada.

---

## Qué se personaliza por tenant

El copy de abajo es **genérico, tono cálido-profesional neutral**. Cada tenant debería sobrescribir:
- **Voz y vocabulario** (Nata = editorial/lujo sin hype; otro tenant puede ser más coloquial).
- **Firma** (`{{INSTRUCTOR}}` + cierre).
- **Subject/preview** si su marca tiene un tono muy propio.
- **From** (nombre y dirección remitente **verificados por tenant** — ver notas de deliverability).
- Opcionalmente, un P.D. o detalle de marca.

Lo que **no** se toca por tenant: la estructura de etapas, los triggers, los CTAs y la lógica de exclusión. Eso es la feature.

---

# SECUENCIA GENÉRICA (plantilla)

## Etapa 1 — Bienvenida / onboarding
**Trigger:** día 0, al confirmarse la compra.
**Objetivo:** que entren a la primera lección hoy. Bajar la fricción del arranque.

- **Subject A:** `{{NOMBRE}}, tu acceso a {{CURSO}} ya está listo`
- **Subject B:** `Bienvenida a {{CURSO}} — empezá por acá`
- **Preview:** `Un solo clic y arrancás con la primera lección.`

**Cuerpo:**

> Hola {{NOMBRE}},
>
> Ya tenés acceso completo a **{{CURSO}}**. Gracias por confiar en {{TENANT}}.
>
> Un consejo antes de que la vida se meta en el medio: **la mejor forma de aprovecharlo es empezar hoy**, aunque sea la primera lección. Son unos minutos y ya vas a sentir que arrancaste.
>
> No hace falta que veas todo el índice ni que armes un plan. Un botón, la primera lección, y listo.
>
> **[Empezar la primera lección →]({{LINK_PRIMERA_LECCION}})**
>
> Cuando quieras ver todo el contenido, entrá por acá: {{LINK_CURSO}}
>
> Nos vemos adentro,
> {{INSTRUCTOR}}

**CTA:** *Empezar la primera lección* → `{{LINK_PRIMERA_LECCION}}`

---

## Etapa 2 — Activación (no-arrancó)
**Trigger:** día 2–3 **si `progress_percent == 0`**.
**Objetivo:** derribar la inercia. "El primer paso es fácil, empezá por acá".

- **Subject A:** `{{NOMBRE}}, ¿arrancamos con la primera lección?`
- **Subject B:** `El primer paso de {{CURSO}} es más corto de lo que pensás`
- **Preview:** `No necesitás tiempo, necesitás empezar. Te lo hago fácil.`

**Cuerpo:**

> Hola {{NOMBRE}},
>
> Vi que todavía no entraste a **{{CURSO}}**. Es normal — comprar es fácil, empezar es lo que cuesta.
>
> Así que te lo hago simple: no pienses en el curso entero. Pensá solo en la **primera lección**. Dura poco y es el paso que después hace que todo lo demás fluya.
>
> **[Ver la primera lección →]({{LINK_PRIMERA_LECCION}})**
>
> Si te trabó algo (un acceso, una duda), respondé este mail y lo resolvemos.
>
> {{INSTRUCTOR}}

**CTA:** *Ver la primera lección* → `{{LINK_PRIMERA_LECCION}}`

---

## Etapa 3 — Check-in de progreso
**Trigger:** día 7+ **si `0 < progress_percent < 100`** y sin avanzar hace >= 3 días.
**Objetivo:** reenganchar. "Te falta poco, seguí".

- **Subject A:** `{{NOMBRE}}, ya arrancaste {{CURSO}} — sigamos`
- **Subject B:** `Estás más cerca de lo que creés`
- **Preview:** `Retomá donde lo dejaste, en un clic.`

**Cuerpo:**

> Hola {{NOMBRE}},
>
> Ya empezaste **{{CURSO}}** — eso es lo difícil y ya lo hiciste. Ahora solo es cuestión de seguir.
>
> Retomar cuesta menos cuando no tenés que buscar dónde quedaste. Te dejo el link directo:
>
> **[Seguir donde lo dejaste →]({{LINK_CURSO}})**
>
> Un ratito por día alcanza. Lo importante es no cortar del todo.
>
> {{INSTRUCTOR}}

**CTA:** *Seguir donde lo dejaste* → `{{LINK_CURSO}}`

---

## Etapa 4 — Completar (100%)
**Trigger:** al llegar a `progress_percent == 100`.
**Objetivo:** felicitar + pedir **reseña** + entregar/mencionar **certificado** + invitar a **referir**. Esta etapa alimenta ventas nuevas.

- **Subject A:** `{{NOMBRE}}, terminaste {{CURSO}} 🎓`
- **Subject B:** `Lo lograste — {{CURSO}} completo`
- **Preview:** `Tu certificado está listo. Y tengo dos pedidos para vos.`

**Cuerpo:**

> Hola {{NOMBRE}},
>
> Terminaste **{{CURSO}}**. En serio: la mayoría compra y no llega hasta acá. Vos sí. Felicitaciones.
>
> **Tu certificado ya está disponible:**
> **[Ver mi certificado →]({{CERTIFICADO}})**
>
> Y ahora dos pedidos cortos, si te hizo bien el curso:
>
> **1. Contame cómo te fue.** Tu reseña ayuda a que otra persona se anime a empezar.
> **[Dejar mi reseña →]({{LINK_RESENA}})**
>
> **2. Traé a alguien.** Si conocés a alguien a quien esto le vendría bien, pasale tu link:
> **[Invitar a alguien →]({{LINK_REFERIDO}})**
>
> Gracias por haber llegado hasta el final.
> {{INSTRUCTOR}}

**CTA principal:** *Dejar mi reseña* → `{{LINK_RESENA}}` (secundarios: certificado y referido)

---

## Etapa 5 — Win-back
**Trigger:** inactivo +14 días, `progress_percent < 100`, sin avanzar hace >= 10 días.
**Objetivo:** último intento de reactivar.

- **Subject A:** `{{NOMBRE}}, {{CURSO}} sigue esperándote`
- **Subject B:** `¿Lo dejamos acá o lo retomamos?`
- **Preview:** `Tu acceso no vence. Cuando quieras, seguís.`

**Cuerpo:**

> Hola {{NOMBRE}},
>
> Hace un tiempo que no volvés a **{{CURSO}}**, y quería hacerte un último recordatorio sincero.
>
> Tu acceso no vence: está ahí para cuando estés. Pero por experiencia, cuanto más pasa, más difícil es retomar. Así que si hay un momento para volver, es este.
>
> **[Retomar {{CURSO}} →]({{LINK_CURSO}})**
>
> Y si algo no te cerró o te frenó, respondé este mail y contame. Prefiero saberlo.
>
> {{INSTRUCTOR}}

**CTA:** *Retomar el curso* → `{{LINK_CURSO}}`

---

# EJEMPLO LLENO — Nata Álvarez / Edición Limitada

**TENANT:** Nata Álvarez · **CURSO:** Edición Limitada (marca personal para mujeres) · **INSTRUCTOR:** Nata.
Tono: editorial, elegante, sin hype. Voseo. Menos signos de exclamación, más presencia.

## 1 — Bienvenida (día 0)

- **Subject A:** `Bienvenida a Edición Limitada, {{NOMBRE}}`
- **Subject B:** `Tu lugar en Edición Limitada ya está reservado`
- **Preview:** `El primer paso es más simple de lo que imaginás.`

> {{NOMBRE}},
>
> Bienvenida a **Edición Limitada**. Desde hoy es tuyo, entero.
>
> Antes de que la agenda te gane, un solo gesto: mirá la primera lección. No hace falta más. Empezar es lo que le da forma a todo lo demás.
>
> Sin planificar, sin recorrer el índice. Una lección, y ya estás adentro.
>
> **[Empezar la primera lección →]({{LINK_PRIMERA_LECCION}})**
>
> Cuando quieras ver el recorrido completo: {{LINK_CURSO}}
>
> Te espero,
> Nata

## 2 — Activación (día 2–3, progreso 0)

- **Subject A:** `{{NOMBRE}}, la primera lección te está esperando`
- **Subject B:** `Empezar Edición Limitada lleva menos de lo que pensás`
- **Preview:** `No necesitás tiempo. Necesitás dar el primer paso.`

> {{NOMBRE}},
>
> Todavía no entraste a **Edición Limitada**, y lo entiendo: comprar es fácil, empezar es otra cosa.
>
> Entonces no pienses en todo el curso. Pensá solo en la primera lección. Es breve, y es el paso que después hace que el resto se vuelva natural.
>
> **[Ver la primera lección →]({{LINK_PRIMERA_LECCION}})**
>
> Si algo te frenó, respondeme este mail. Estoy del otro lado.
>
> Nata

## 3 — Check-in (día 7+, progreso 0<x<100, estancado)

- **Subject A:** `Ya empezaste. Sigamos, {{NOMBRE}}`
- **Subject B:** `Estás más cerca de lo que creés`
- **Preview:** `Retomá exactamente donde lo dejaste.`

> {{NOMBRE}},
>
> Ya empezaste **Edición Limitada**. Eso era lo difícil, y ya está hecho.
>
> Retomar es más simple cuando no tenés que buscar dónde quedaste. Acá tenés el camino directo:
>
> **[Seguir donde lo dejaste →]({{LINK_CURSO}})**
>
> Un rato por día es suficiente. Lo que importa es no soltar del todo.
>
> Nata

## 4 — Completar (100%)

- **Subject A:** `Lo terminaste, {{NOMBRE}}`
- **Subject B:** `Edición Limitada, completo`
- **Preview:** `Tu certificado está listo. Y quiero pedirte dos cosas.`

> {{NOMBRE}},
>
> Terminaste **Edición Limitada**. La mayoría no llega hasta acá. Vos sí, y eso dice algo de vos.
>
> **Tu certificado ya está disponible:**
> **[Ver mi certificado →]({{CERTIFICADO}})**
>
> Si el recorrido te dejó algo, tengo dos pedidos breves:
>
> **Contame cómo te fue.** Tu palabra ayuda a que otra mujer se anime a empezar.
> **[Dejar mi reseña →]({{LINK_RESENA}})**
>
> **Y si pensás en alguien** a quien esto le haría bien, pasale tu acceso:
> **[Invitar a alguien →]({{LINK_REFERIDO}})**
>
> Gracias por llegar hasta el final.
> Nata

## 5 — Win-back (+14 días, incompleto, inactivo)

- **Subject A:** `Edición Limitada sigue siendo tuyo, {{NOMBRE}}`
- **Subject B:** `¿Lo retomamos?`
- **Preview:** `Tu acceso no vence. Cuando estés, seguís.`

> {{NOMBRE}},
>
> Hace un tiempo que no volvés a **Edición Limitada**, y quería escribirte una vez más.
>
> Tu acceso no vence: está ahí, esperándote. Pero te lo digo con honestidad — cuanto más pasa, más cuesta retomar. Si hay un momento para volver, es este.
>
> **[Retomar el curso →]({{LINK_CURSO}})**
>
> Y si algo no te cerró, respondeme y contame. Prefiero saberlo.
>
> Nata

---

# Notas de arquitectura / implementación

1. **Señal de datos por trigger.** Todo se decide con `progress_percent` y `completed_lessons` (delta contra el último snapshot), **nunca** con `last_accessed_at`. Etapa 1 se dispara del evento de compra; 2/3/5 corren en un job diario que evalúa las condiciones; 4 es event-driven al cruzar 100%. Guardá `stage_sent[stage] = timestamp` por comprador+curso para no duplicar.

2. **Idempotencia y exclusión.** Un job diario (cron) que recorre compras activas y para cada una elige a lo sumo **una** etapa a enviar, respetando ventana horaria del tenant y las reglas de exclusión. Llegar a 100% cancela 2/3/5. Cada etapa es one-shot.

3. **Qué es plataforma vs. qué es tenant.** La estructura (etapas, triggers, CTAs, exclusiones) es feature de plataforma y no se toca. Por tenant se sobrescribe: voz/copy, firma (`{{INSTRUCTOR}}`), subjects opcionales, y sobre todo el **from**. Guardá overrides de copy por tenant; si no hay override, cae al genérico.

4. **Deliverability — el punto crítico multi-tenant.** El **from por-tenant tiene que estar verificado** (SPF + DKIM + DMARC del dominio del tenant, o envío con dominio propio de la plataforma y `Reply-To` del tenant). No mandes con el dominio del instructor sin verificar: cae en spam y quema la reputación de todos los tenants que comparten IP. Recomendado: dominio/subdominio de envío de la plataforma autenticado, `From: {{TENANT}} <notificaciones@mail.natoglobal...>`, `Reply-To` del instructor. Incluir link de baja y no enviar de madrugada (usar timezone del tenant).
