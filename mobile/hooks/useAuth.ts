import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { Session, User } from '@supabase/supabase-js'

export interface AppUser {
  id: string
  username: string
  full_name: string | null
  email: string | null
  xp_total: number
  coins_balance: number
  current_level: number
  streak_current: number
  subscription_plan: 'free' | 'pro' | 'elite'
}

export function useAuth() {
  const [session, setSession] = useState<Session | null>(null)
  const [user, setUser] = useState<AppUser | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      if (session?.user) fetchProfile(session.user.id)
      else setLoading(false)
    })

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session)
        if (session?.user) await fetchProfile(session.user.id)
        else { setUser(null); setLoading(false) }
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  const fetchProfile = async (userId: string) => {
    const { data } = await supabase.from('users').select('*').eq('id', userId).single()
    setUser(data)
    setLoading(false)
  }

  const signOut = async () => {
    await supabase.auth.signOut()
  }

  return { session, user, loading, signOut, refetch: () => session && fetchProfile(session.user.id) }
}
