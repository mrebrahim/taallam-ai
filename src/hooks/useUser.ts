'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { User } from '@/types'

export function useUser() {
  const [user, setUser] = useState<User | null>(null)
  const [authUser, setAuthUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const supabase = createClient()
    let cancelled = false
    let resolved = false

    const done = (au: any, u: User | null) => {
      if (cancelled || resolved) return
      resolved = true
      setAuthUser(au)
      setUser(u)
      setLoading(false)
    }

    const fetchProfile = async (userId: string): Promise<User | null> => {
      try {
        const { data, error } = await supabase
          .from('users').select('*').eq('id', userId).single()
        if (error) console.error('[useUser] profile error:', error.message)
        return data ?? null
      } catch (e) {
        console.error('[useUser] profile exception:', e)
        return null
      }
    }

    // Timeout: 6 seconds max
    const timeout = setTimeout(() => {
      console.warn('[useUser] TIMEOUT — forcing done(null,null)')
      done(null, null)
    }, 6000)

    // Try getSession immediately
    supabase.auth.getSession().then(async ({ data: { session }, error }) => {
      console.log('[useUser] getSession result:', { 
        hasSession: !!session, 
        userId: session?.user?.id,
        error: error?.message 
      })
      if (!session?.user || cancelled) return
      clearTimeout(timeout)
      const profile = await fetchProfile(session.user.id)
      console.log('[useUser] profile result:', profile?.id)
      done(session.user, profile)
    })

    // Also listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('[useUser] onAuthStateChange:', event, !!session)
        if (cancelled) return
        if (!session?.user) { clearTimeout(timeout); done(null, null); return }
        if (resolved) return
        clearTimeout(timeout)
        const profile = await fetchProfile(session.user.id)
        done(session.user, profile)
      }
    )

    return () => { cancelled = true; clearTimeout(timeout); subscription.unsubscribe() }
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

  return { user, authUser, loading, signOut, refreshUser }
}
