import { createClient as createSupabaseClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://raskcogecjfwuxvwldzp.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJhc2tjb2dlY2pmd3V4dndsZHpwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU2NzgzODAsImV4cCI6MjA5MTI1NDM4MH0.ZrtuVXEEFfuEbIkofglo_rEKwZZllZJ1DN2DElpB0ec'

// Plain supabase-js — stores session in localStorage reliably
// No SSR complications, no cookie conflicts
export function createClient() {
  return createSupabaseClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      storageKey: 'taallam-auth',
    }
  })
}
