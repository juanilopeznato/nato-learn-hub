import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
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
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: string | null }>
  signOut: () => Promise<void>
  switchSchool: (profileId: string) => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

const DEV_TENANT_SLUG = import.meta.env.VITE_DEFAULT_TENANT_SLUG ?? 'nato'

async function resolveTenant(): Promise<Tenant | null> {
  const hostname = window.location.hostname
  const isDevOrStaging =
    hostname === 'localhost' ||
    hostname === '127.0.0.1' ||
    hostname.endsWith('.vercel.app')

  try {
    if (isDevOrStaging) {
      const { data, error } = await supabase
        .from('tenants')
        .select('*')
        .eq('slug', DEV_TENANT_SLUG)
        .single()
      if (error) throw error
      return data
    }
    const { data, error } = await supabase
      .from('tenants')
      .select('*')
      .eq('custom_domain', hostname)
      .single()
    if (error) throw error
    return data
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

  useEffect(() => {
    resolveTenant().then(setTenant)
  }, [])

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
      const { tenant: profileTenant, ...activeProfile } = profiles[0] as any
      setProfile(activeProfile)
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
    return { error: null }
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
