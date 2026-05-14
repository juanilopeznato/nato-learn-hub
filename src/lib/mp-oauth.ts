/**
 * Helper para armar la URL de OAuth de Mercado Pago.
 *
 * El Client ID y el redirect URI vienen de env vars. Si no están seteados,
 * usa fallbacks para no romper el flow legacy pero loggea un warning.
 */

const FALLBACK_CLIENT_ID = '8771179743002501'
const FALLBACK_REDIRECT_URI = 'https://natouniversity.lovable.app/mp-oauth-callback'

export function buildMpOAuthUrl(tenantId: string): string {
  const clientId = import.meta.env.VITE_MP_CLIENT_ID ?? FALLBACK_CLIENT_ID
  const redirectUri = import.meta.env.VITE_MP_REDIRECT_URI ?? FALLBACK_REDIRECT_URI

  if (!import.meta.env.VITE_MP_CLIENT_ID) {
    console.warn('[mp-oauth] VITE_MP_CLIENT_ID no configurado — usando fallback. Setealo en Lovable env.')
  }
  if (!import.meta.env.VITE_MP_REDIRECT_URI) {
    console.warn('[mp-oauth] VITE_MP_REDIRECT_URI no configurado — usando fallback. Setealo en Lovable env.')
  }

  const params = new URLSearchParams({
    client_id: clientId,
    response_type: 'code',
    platform_id: 'mp',
    redirect_uri: redirectUri,
    state: tenantId,
  })
  return `https://auth.mercadopago.com/authorization?${params.toString()}`
}
