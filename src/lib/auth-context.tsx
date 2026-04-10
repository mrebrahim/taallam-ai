'use client'
import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { User } from '@/types'

interface AuthCtx {
  user: User | null
  authUser: any | null
  loading: boolean
  signOut: () => Promise<void>
  refreshUser: () => Promise<void>
}

const AuthContext = createContext<AuthCtx>({
  user: null, authUser: null, loading: true,
  signOut: async () => {}, refreshUser: async () => {}
})

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [authUser, setAuthUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    const supabase = createClient()
    let cancelled = false

    const fetchProfile = async (userId: string) => {
      try {
        const { data } = await supabase.from('users').select('*').eq('id', userId).single()
        if (!cancelled) setUser(data ?? null)
      } catch {}
    }

    const init = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (cancelled) return
        if (!session?.user) { setLoading(false); return }
        setAuthUser(session.user)
        await fetchProfile(session.user.id)
        if (!cancelled) setLoading(false)
      } catch {
        if (!cancelled) setLoading(false)
      }
    }

    init()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (cancelled) return
      if (event === 'SIGNED_OUT' || !session) {
        setAuthUser(null); setUser(null); setLoading(false); return
      }
      setAuthUser(session.user)
      if (session.user) await fetchProfile(session.user.id)
      setLoading(false)
    })

    return () => { cancelled = true; subscription.unsubscribe() }
  }, [])

  const signOut = async () => {
    setUser(null); setAuthUser(null)
    await createClient().auth.signOut()
    window.location.replace('/auth/login')
  }

  const refreshUser = async () => {
    if (!authUser) return
    const { data } = await createClient().from('users').select('*').eq('id', authUser.id).single()
    setUser(data ?? null)
  }

  return (
    <AuthContext.Provider value={{ user, authUser, loading, signOut, refreshUser }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
