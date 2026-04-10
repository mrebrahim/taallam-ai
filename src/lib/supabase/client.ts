import { createClient as createSupabaseClient, SupabaseClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://raskcogecjfwuxvwldzp.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJhc2tjb2dlY2pmd3V4dndsZHpwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU2NzgzODAsImV4cCI6MjA5MTI1NDM4MH0.ZrtuVXEEFfuEbIkofglo_rEKwZZllZJ1DN2DElpB0ec'

// Store on window to survive React strict mode double-mount
// This is the ONLY reliable way to have a true singleton in Next.js
declare global {
  interface Window { __supabase?: SupabaseClient }
}

export function createClient(): SupabaseClient {
  if (typeof window === 'undefined') {
    // Server side — create temporary client (no localStorage)
    return createSupabaseClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  }
  if (!window.__supabase) {
    window.__supabase = createSupabaseClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        storageKey: 'taallam-auth',
      }
    })
  }
  return window.__supabase
}
