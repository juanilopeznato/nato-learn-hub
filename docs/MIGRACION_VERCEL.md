# Migración Lovable → Vercel

Estado de la migración a 2026-06-01.

## ✅ Hecho

- [x] `vercel.json` con framework, cache headers, CSP reforzado (Sentry + MP iframe + fonts + worker-src + form-action)
- [x] `.env.example` documentado con las 9 vars que usa la app
- [x] Build local pasa (4.33s · 280KB gzip total)
- [x] Proyecto Vercel ya linkeado: `juanilopezfotografo-8726s-projects/nato-learn-hub`
- [x] **Deploy productivo activo**: https://nato-learn-hub.vercel.app (HTTP 200)
- [x] 3/8 env vars seteadas en Vercel production:
  - `VITE_SUPABASE_URL`
  - `VITE_SUPABASE_ANON_KEY`
  - `VITE_PUBLIC_URL = https://nato-learn-hub.vercel.app`

## ⚠️ Pendiente — depende de Juani

### 1. Setear 4 env vars faltantes en Vercel

Dashboard: https://vercel.com/juanilopezfotografo-8726s-projects/nato-learn-hub/settings/environment-variables

```bash
# Las que tenés que copiar de Lovable (Lovable → Settings → Env vars):
VITE_MP_CLIENT_ID=<tu-mp-app-id>
VITE_MP_REDIRECT_URI=https://nato-learn-hub.vercel.app/mp/oauth/callback
VITE_SENTRY_DSN=<el-DSN-de-Sentry>
VITE_DEFAULT_TENANT_SLUG=nato     # o el que estés usando
```

Para setearlas via CLI desde la terminal:

```bash
cd "/Users/juanilopez/Documents/Claudio/Nato University/nato-learn-hub"
echo "<valor>" | vercel env add VITE_MP_CLIENT_ID production --force
echo "https://nato-learn-hub.vercel.app/mp/oauth/callback" | vercel env add VITE_MP_REDIRECT_URI production --force
echo "<dsn>" | vercel env add VITE_SENTRY_DSN production --force
echo "nato" | vercel env add VITE_DEFAULT_TENANT_SLUG production --force
```

Después: `vercel --prod` para redeployar con las vars nuevas.

### 2. Registrar el redirect URI en MercadoPago

Dashboard MP → Tus aplicaciones → NATO University → Configuración → Redirect URIs.

Agregar: `https://nato-learn-hub.vercel.app/mp/oauth/callback`

Si después usás dominio propio, agregar también ese.

### 3. Decidir dominio productivo

Opciones:

- **A. Quedarse con `nato-learn-hub.vercel.app`** — gratis, instantáneo, ya funciona. Bueno para soft launch.
- **B. Dominio propio nuevo** — `natouniversity.com` o `natouniversity.com.ar`. Comprar + 30min DNS.
- **C. Subdominio en dominio existente** — `lms.natoglobal.com` o `app.natoglobal.com`. 10min DNS si ya tenés natoglobal.com.

Si elegís B o C:
```bash
vercel domains add tu-dominio.com
# Después seteás A/CNAME records en tu registrar según indique Vercel
```

Y actualizás:
- `VITE_PUBLIC_URL` en Vercel
- Redirect URI en MercadoPago
- Verificación de dominio en Resend (SPF/DKIM/DMARC)

### 4. Cutover de Lovable

Una vez validado que todo funciona en Vercel:

1. Verificar checkout MP real con tarjeta de prueba
2. Verificar signup + login + curse completo
3. Verificar emails (signup verification, welcome)
4. Verificar webhook MP recibe (Supabase → check edge function logs)
5. Apagar Publish en Lovable (o pausar el proyecto)
6. Si hay DNS apuntando a Lovable, switchearlo a Vercel

## 🔧 Lo que NO cambia

- Supabase (DB + Auth + Storage + Edge Functions) → todo igual, no se toca
- MercadoPago webhook → sigue apuntando a la edge function de Supabase, no a Vercel
- Resend → sigue mandando emails como hasta ahora
- Sentry → sigue capturando del mismo DSN

## 🚀 Workflow nuevo

- **Push a `main` en GitHub** → deploy automático a producción Vercel (1-2 min)
- **Push a otra branch** → preview URL automática
- **Pull Request** → preview URL automática
- **No más "Preview/Publish" en Lovable** — todo es git-driven

## 📊 Performance esperado

- Build: ~30s (Vercel ya corrió uno: 27s)
- TTFB: <100ms desde Vercel Edge (vs Lovable que es más variable)
- Cache: assets immutable 1y, imágenes 1d, sw.js never-cache
