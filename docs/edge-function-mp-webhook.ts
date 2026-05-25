/**
 * Edge function template para recibir webhooks de MercadoPago.
 *
 * Copiar el contenido en Supabase Dashboard → Edge Functions → "mp-webhook"
 * (o el nombre que tengas para el handler de webhooks de MP).
 *
 * Esta versión:
 *  - Valida la firma `x-signature` HMAC SHA256 con MP_WEBHOOK_SECRET
 *  - Llama a public.confirm_payment(...) en lugar de INSERT directo → idempotente
 *  - Hace lookup del access_token del tenant para consultar el pago en MP
 *  - Loggea todo a console (Sentry lo agarra si lo configurás)
 *
 * Setear en Supabase → Edge Functions → mp-webhook → Secrets:
 *  - MP_WEBHOOK_SECRET  (lo configurás en MP → Notificaciones → Webhooks → Secret)
 *  - SUPABASE_SERVICE_ROLE_KEY  (automático de Supabase)
 *  - SUPABASE_URL  (automático)
 *
 * En MP Dashboard:
 *  - Notificaciones → Webhooks → URL: https://hoolsigtquohayhpqgtb.supabase.co/functions/v1/mp-webhook
 *  - Eventos: payment, merchant_order
 *  - Click "Mostrar secret" → guardalo como MP_WEBHOOK_SECRET
 */

// @ts-nocheck — deno runtime, no node types
import { serve } from "https://deno.land/std@0.224.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import { createHmac } from "https://deno.land/std@0.224.0/crypto/mod.ts"

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
const MP_WEBHOOK_SECRET = Deno.env.get("MP_WEBHOOK_SECRET")!

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
})

interface MpWebhookPayload {
  id?: string | number
  topic?: string
  type?: string
  action?: string
  data?: { id?: string | number }
  user_id?: string | number
}

interface MpPayment {
  id: number
  status: string
  status_detail: string
  transaction_amount: number
  external_reference?: string
  collector_id: number
  payer?: { email?: string; id?: string | number }
  metadata?: Record<string, unknown>
}

/**
 * Validación de firma según docs MP:
 * https://www.mercadopago.com.ar/developers/es/docs/your-integrations/notifications/webhooks#editor_5
 *
 * El header `x-signature` viene como `ts=NNN,v1=HEX`.
 * El template es: `id:<data.id>;request-id:<x-request-id>;ts:<ts>;`
 */
async function verifySignature(
  req: Request,
  payload: MpWebhookPayload,
): Promise<boolean> {
  if (!MP_WEBHOOK_SECRET) {
    console.warn("[mp-webhook] MP_WEBHOOK_SECRET no seteado — saltando validación (INSECURE)")
    return true // Solo en dev. En prod siempre debería estar seteado.
  }

  const signatureHeader = req.headers.get("x-signature") ?? ""
  const requestId = req.headers.get("x-request-id") ?? ""

  // Parse "ts=123,v1=abcdef"
  const parts = signatureHeader.split(",")
  const ts = parts.find(p => p.trim().startsWith("ts="))?.split("=")[1]?.trim()
  const v1 = parts.find(p => p.trim().startsWith("v1="))?.split("=")[1]?.trim()

  if (!ts || !v1) {
    console.warn("[mp-webhook] x-signature header malformado")
    return false
  }

  const dataId = String(payload.data?.id ?? payload.id ?? "")
  if (!dataId) {
    console.warn("[mp-webhook] no data.id en payload, no se puede validar firma")
    return false
  }

  const template = `id:${dataId};request-id:${requestId};ts:${ts};`

  const encoder = new TextEncoder()
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(MP_WEBHOOK_SECRET),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  )
  const signatureBytes = await crypto.subtle.sign("HMAC", key, encoder.encode(template))
  const expectedHex = Array.from(new Uint8Array(signatureBytes))
    .map(b => b.toString(16).padStart(2, "0"))
    .join("")

  const ok = expectedHex === v1
  if (!ok) console.warn("[mp-webhook] firma inválida", { expected: expectedHex.slice(0, 8), got: v1.slice(0, 8) })
  return ok
}

async function fetchPaymentFromMp(paymentId: string, accessToken: string): Promise<MpPayment | null> {
  try {
    const res = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
    if (!res.ok) {
      console.warn("[mp-webhook] MP API error", res.status, await res.text())
      return null
    }
    return await res.json() as MpPayment
  } catch (e) {
    console.error("[mp-webhook] fetch MP failed", e)
    return null
  }
}

serve(async (req: Request) => {
  // CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
      },
    })
  }

  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 })
  }

  let payload: MpWebhookPayload
  try {
    payload = await req.json()
  } catch {
    return new Response("bad json", { status: 400 })
  }

  console.log("[mp-webhook] received", JSON.stringify(payload).slice(0, 500))

  // 1. Validar firma
  const validSig = await verifySignature(req, payload)
  if (!validSig) {
    return new Response("invalid signature", { status: 401 })
  }

  // 2. Solo procesamos topic=payment / type=payment
  const topic = payload.topic ?? payload.type ?? ""
  if (topic !== "payment" && topic !== "merchant_order") {
    console.log("[mp-webhook] topic ignorado:", topic)
    return new Response("ok (ignored)", { status: 200 })
  }
  if (topic === "merchant_order") {
    // Para merchant_order podrías procesar también, por ahora skip
    return new Response("ok (merchant_order skipped)", { status: 200 })
  }

  const paymentId = String(payload.data?.id ?? payload.id ?? "")
  if (!paymentId) return new Response("no payment id", { status: 400 })

  // 3. Lookup del tenant via collector_id
  // (Si tenés el flow alternativo donde guardás course_id y student_id en
  //  metadata o external_reference al crear el preference, leelo desde ahí.)
  const collectorId = String(payload.user_id ?? "")

  let tenantId: string | null = null
  let accessToken: string | null = null
  if (collectorId) {
    const { data } = await supabase
      .from("tenants")
      .select("id, mp_access_token")
      .eq("mp_collector_id", collectorId)
      .single()
    tenantId = data?.id ?? null
    accessToken = data?.mp_access_token ?? null
  }

  if (!tenantId || !accessToken) {
    console.warn("[mp-webhook] tenant no encontrado para collector", collectorId)
    return new Response("tenant not found", { status: 404 })
  }

  // 4. Pedir detalles del pago a MP
  const payment = await fetchPaymentFromMp(paymentId, accessToken)
  if (!payment) return new Response("payment not fetchable", { status: 502 })

  // 5. Resolver course_id + student_id desde external_reference o metadata
  // Patrón sugerido: en create-preference guardar `external_reference = "<courseId>:<studentId>"`
  let courseId: string | null = null
  let studentId: string | null = null
  if (payment.external_reference) {
    const [c, s] = payment.external_reference.split(":")
    courseId = c || null
    studentId = s || null
  }
  // Fallback: usar metadata
  if (!courseId && payment.metadata?.course_id) courseId = String(payment.metadata.course_id)
  if (!studentId && payment.metadata?.student_id) studentId = String(payment.metadata.student_id)

  if (!courseId || !studentId) {
    console.error("[mp-webhook] sin course_id/student_id en pago", paymentId)
    return new Response("missing references", { status: 422 })
  }

  // 6. Llamar al RPC idempotente
  const { data: enrollmentId, error: rpcError } = await supabase.rpc("confirm_payment", {
    p_mp_payment_id: String(payment.id),
    p_course_id: courseId,
    p_student_id: studentId,
    p_tenant_id: tenantId,
    p_amount_ars: payment.transaction_amount,
    p_mp_status: payment.status,
  })

  if (rpcError) {
    console.error("[mp-webhook] confirm_payment failed", rpcError)
    return new Response("rpc failed: " + rpcError.message, { status: 500 })
  }

  console.log("[mp-webhook] enrollment confirmado", enrollmentId, "payment", payment.id, "status", payment.status)
  return new Response(JSON.stringify({ ok: true, enrollment_id: enrollmentId }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  })
})
