import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL ?? 'https://hoolsigtquohayhpqgtb.supabase.co'
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY ?? 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imhvb2xzaWd0cXVvaGF5aHBxZ3RiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU2Nzc2MzksImV4cCI6MjA5MTI1MzYzOX0.8Wx2SDoxwiedd2TdRRAcq9m966Erh0UcFnslHSky7uM'

// Lock de auth EN MEMORIA — reemplaza el lock por defecto de supabase-js, que usa
// `navigator.locks`. Ese lock se DEADLOCKEA en los navegadores in-app de iOS
// (Instagram, Facebook, TikTok): `getSession()` nunca resuelve, `loading` queda
// en true para siempre y TODA query de Supabase se cuelga → skeletons infinitos y
// botones muertos. Como casi toda la pauta entra por el navegador de Instagram,
// esto rompía la experiencia justo para el tráfico pago.
//
// Serializamos las secciones críticas del refresh de token con una cadena de
// promesas en memoria. Es suficiente dentro de una misma pestaña (el caso real en
// mobile) y no depende de navigator.locks, así que no puede deadlockear.
let lockChain: Promise<unknown> = Promise.resolve()
function inMemoryLock<R>(_name: string, _acquireTimeout: number, fn: () => Promise<R>): Promise<R> {
  const run = lockChain.then(() => fn(), () => fn())
  lockChain = run.then(() => undefined, () => undefined)
  return run
}

// Note: Database generic intentionally omitted. The generated database.types.ts
// uses a newer schema shape (with __InternalSupabase) than the installed
// @supabase/supabase-js can consume, which collapses every query result to
// `never` and breaks the entire build. Using the default permissive types
// restores the runtime behavior the code was written against.
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    // Solo overrideamos el lock. persistSession / autoRefreshToken /
    // detectSessionInUrl / flowType quedan en sus defaults (los magic links de
    // acceso passwordless dependen del flow implícito por defecto — no tocar).
    lock: inMemoryLock,
  },
})
