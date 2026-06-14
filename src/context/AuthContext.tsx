import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { useLocation } from 'react-router-dom'
import type { User, Session } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import type { Tables } from '@/types/database.types'

type Profile = Tables<'profiles'>
type Tenant = Tables<'tenants'>

interface AuthContextValue {
  user: User | null
  session: Session | null
  profile: Profile | null
  tenant: Tenant | null
  allProfiles: (Profile & { tenant: Tenant })[]
  loading: boolean
  signIn: (email: string, password: string) => Promise<{ error: string | null }>
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: string | null; needsConfirmation?: boolean }>
  signOut: () => Promise<void>
  switchSchool: (profileId: string) => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

const DEV_TENANT_SLUG = import.meta.env.VITE_DEFAULT_TENANT_SLUG ?? 'nato'

/**
 * Resuelve la escuela (tenant). Modelo path-based:
 *   1. Si la URL trae `/:escuela/...`, busca por ese slug (fuente principal).
 *   2. Si no, por dominio propio (custom_domain) — escuelas con su dominio.
 *   3. Si no, el default de la plataforma (dev/staging).
 * Devuelve null si el slug de la URL no corresponde a ninguna escuela
 * (ej. rutas reservadas /login, /dashboard) o en la raíz de plataforma.
 */
async function resolveTenant(pathSlug?: string | null): Promise<Tenant | null> {
  try {
    if (pathSlug) {
      const { data } = await supabase.from('tenants').select('*').eq('slug', pathSlug).maybeSingle()
      if (data) return data as Tenant
      // slug no es una escuela (ruta reservada) → seguir con fallbacks
    }
    const hostname = window.location.hostname
    const isDevOrStaging =
      hostname === 'localhost' || hostname === '127.0.0.1' || hostname.endsWith('.vercel.app')
    if (isDevOrStaging) {
      const { data } = await supabase.from('tenants').select('*').eq('slug', DEV_TENANT_SLUG).maybeSingle()
      if (data) return data as Tenant
      // Fallback resiliente (setup mono-escuela): si el slug default no existe
      // —ej. se renombró— tomar la primera escuela. Evita romper si cambia el slug.
      const { data: first } = await supabase.from('tenants').select('*').order('created_at').limit(1).maybeSingle()
      return (first as Tenant) ?? null
    }
    const { data } = await supabase.from('tenants').select('*').eq('custom_domain', hostname).maybeSingle()
    return (data as Tenant) ?? null
  } catch (e) {
    console.error('[AuthContext] No se pudo resolver el tenant:', e)
    return null
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [tenant, setTenant] = useState<Tenant | null>(null)
  const [allProfiles, setAllProfiles] = useState<(Profile & { tenant: Tenant })[]>([])
  const [loading, setLoading] = useState(true)

  // Escuela reactiva a la URL: `/` = plataforma (sin escuela → marca NATO),
  // `/:escuela/...` resuelve por slug. Las rutas reservadas/logueadas caen al
  // default (y el perfil del usuario igual setea su escuela en loadProfile).
  const location = useLocation()
  const firstSeg = location.pathname === '/' ? null : (location.pathname.split('/')[1] || null)
  useEffect(() => {
    let active = true
    if (firstSeg === null) { setTenant(null); return }
    resolveTenant(firstSeg).then(t => { if (active && t) setTenant(t) })
    return () => { active = false }
  }, [firstSeg])

  const loadProfile = useCallback(async (authId: string, attempt = 1): Promise<void> => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*, tenant:tenants(*)')
      .eq('auth_id', authId)
      .order('last_used_at', { ascending: false })

    if (error && attempt < 3) {
      await new Promise(r => setTimeout(r, 500 * attempt))
      return loadProfile(authId, attempt + 1)
    }

    if (data && data.length > 0) {
      const profiles = data as (Profile & { tenant: Tenant })[]
      setAllProfiles(profiles)
      const { tenant: profileTenant, ...activeProfile } = profiles[0]
      setProfile(activeProfile as Profile)
      if (profileTenant) setTenant(profileTenant as Tenant)
    } else {
      setProfile(null)
      setAllProfiles([])
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setUser(session?.user ?? null)
      if (session?.user) loadProfile(session.user.id)
      else setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      setUser(session?.user ?? null)
      if (session?.user) loadProfile(session.user.id)
      else {
        setProfile(null)
        setAllProfiles([])
        setLoading(false)
      }
    })

    return () => subscription.unsubscribe()
  }, [loadProfile])

  const switchSchool = useCallback(async (profileId: string) => {
    const { error } = await supabase.rpc('switch_active_school', { p_profile_id: profileId })
    if (error) throw error
    if (user) await loadProfile(user.id)
  }, [user, loadProfile])

  const signIn = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    return { error: error?.message ?? null }
  }, [])

  const signUp = useCallback(async (email: string, password: string, fullName: string) => {
    if (!tenant) return { error: 'No se pudo detectar la escuela. Intentá de nuevo.' }

    const { data, error } = await supabase.auth.signUp({ email, password })
    if (error) return { error: error.message }
    if (!data.user) return { error: 'Error al crear el usuario.' }

    const { error: profileError } = await supabase.rpc('create_profile', {
      p_auth_id: data.user.id,
      p_tenant_id: tenant.id,
      p_email: email,
      p_full_name: fullName,
    })

    if (profileError) return { error: profileError.message }
    // Si Supabase tiene "Confirm email" activado, no hay sesión hasta confirmar.
    // El caller usa esto para mostrar "revisá tu mail" en vez de redirigir a una
    // ruta protegida que rebotaría a /login (usuario en limbo).
    return { error: null, needsConfirmation: !data.session }
  }, [tenant])

  const signOut = useCallback(async () => {
    await supabase.auth.signOut()
  }, [])

  const value = useMemo<AuthContextValue>(() => ({
    user, session, profile, tenant, allProfiles, loading,
    signIn, signUp, signOut, switchSchool,
  }), [user, session, profile, tenant, allProfiles, loading, signIn, signUp, signOut, switchSchool])

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth debe usarse dentro de AuthProvider')
  return ctx
}
