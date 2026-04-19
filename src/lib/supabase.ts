import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL ?? 'https://hoolsigtquohayhpqgtb.supabase.co'
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY ?? 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imhvb2xzaWd0cXVvaGF5aHBxZ3RiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU2Nzc2MzksImV4cCI6MjA5MTI1MzYzOX0.8Wx2SDoxwiedd2TdRRAcq9m966Erh0UcFnslHSky7uM'

// Note: Database generic intentionally omitted. The generated database.types.ts
// uses a newer schema shape (with __InternalSupabase) than the installed
// @supabase/supabase-js can consume, which collapses every query result to
// `never` and breaks the entire build. Using the default permissive types
// restores the runtime behavior the code was written against.
export const supabase = createClient(supabaseUrl, supabaseAnonKey)
