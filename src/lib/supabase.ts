import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string

// Note: Database generic intentionally omitted. The generated database.types.ts
// uses a newer schema shape (with __InternalSupabase) than the installed
// @supabase/supabase-js can consume, which collapses every query result to
// `never` and breaks the entire build. Using the default permissive types
// restores the runtime behavior the code was written against.
export const supabase = createClient(supabaseUrl, supabaseAnonKey)
