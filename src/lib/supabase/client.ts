import { createBrowserClient } from '@supabase/ssr'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://raskcogecjfwuxvwldzp.supabase.co'
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJhc2tjb2dlY2pmd3V4dndsZHpwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU2NzgzODAsImV4cCI6MjA5MTI1NDM4MH0.ZrtuVXEEFfuEbIkofglo_rEKwZZllZJ1DN2DElpB0ec'

export function createClient() {
  // Always create a fresh client — the singleton was causing SSR/CSR conflicts
  return createBrowserClient(SUPABASE_URL, SUPABASE_ANON_KEY)
}
