import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'

export default function MpOAuthCallback() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')

  useEffect(() => {
    const code = searchParams.get('code')
    const tenantId = searchParams.get('state')

    if (!code || !tenantId) {
      setStatus('error')
      return
    }

    async function exchange() {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) throw new Error('Sin sesión')

        const res = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/mp-oauth-exchange`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${session.access_token}`,
            },
            body: JSON.stringify({ code, tenant_id: tenantId }),
          }
        )
        const data = await res.json()
        if (!res.ok || data.error) throw new Error(data.error ?? 'Error desconocido')

        setStatus('success')
        toast.success('Mercado Pago conectado correctamente')
        setTimeout(() => navigate('/settings'), 1500)
      } catch (e: any) {
        setStatus('error')
        toast.error('No pudimos conectar tu cuenta: ' + e.message)
      }
    }

    exchange()
  }, [])

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="bg-white rounded-2xl border border-gray-200 p-10 text-center max-w-sm w-full shadow-sm">
        {status === 'loading' && (
          <>
            <div className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-gray-700 font-medium">Conectando tu cuenta de Mercado Pago...</p>
            <p className="text-gray-400 text-sm mt-1">Esto tarda unos segundos</p>
          </>
        )}
        {status === 'success' && (
          <>
            <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-7 h-7 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <p className="text-gray-900 font-semibold text-lg">¡Cuenta conectada!</p>
            <p className="text-gray-500 text-sm mt-1">Redirigiendo a Configuración...</p>
          </>
        )}
        {status === 'error' && (
          <>
            <div className="w-14 h-14 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-7 h-7 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <p className="text-gray-900 font-semibold text-lg">Algo salió mal</p>
            <p className="text-gray-500 text-sm mt-1">No pudimos conectar tu cuenta de Mercado Pago.</p>
            <button
              onClick={() => navigate('/settings')}
              className="mt-5 text-primary text-sm underline"
            >
              Volver a Configuración
            </button>
          </>
        )}
      </div>
    </div>
  )
}
