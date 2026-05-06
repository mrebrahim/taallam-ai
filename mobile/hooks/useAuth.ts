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
    let { data } = await supabase.from('users').select('*').eq('id', userId).single()

    // No record? Create one automatically
    if (!data) {
      const { data: authData } = await supabase.auth.getUser()
      const au = authData?.user
      if (au) {
        const email = au.email || ''
        const base = email.split('@')[0].replace(/[^a-z0-9]/gi, '').toLowerCase()
        const username = base + '_' + Math.floor(Math.random() * 9000 + 1000)
        const { data: created } = await supabase.from('users').insert({
          id: userId,
          email,
          full_name: au.user_metadata?.full_name || au.user_metadata?.name || base,
          username,
          avatar_url: au.user_metadata?.avatar_url || au.user_metadata?.picture || null,
        }).select().single()
        data = created
      }
    }

    setUser(data)
    setLoading(false)
  }

  const signOut = async () => {
    await supabase.auth.signOut()
  }

  return { session, user, loading, signOut, refetch: () => session && fetchProfile(session.user.id) }
}
