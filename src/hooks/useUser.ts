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

    // Timeout: 6 seconds
    const timeout = setTimeout(() => {
      console.warn('[useUser] timeout')
      done(null, null)
    }, 6000)

    const fetchProfile = async (userId: string, accessToken?: string): Promise<User | null> => {
      try {
        // If we have a token, set it explicitly on the client
        if (accessToken) {
          await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: '',
          })
        }
        const { data, error } = await supabase
          .from('users').select('*').eq('id', userId).single()
        console.log('[useUser] fetchProfile:', { data: !!data, error: error?.message, userId })
        return data ?? null
      } catch (e) {
        console.error('[useUser] fetchProfile error:', e)
        return null
      }
    }

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('[useUser] onAuthStateChange:', event, !!session, session?.user?.id)
        if (cancelled) return
        if (!session?.user) { clearTimeout(timeout); done(null, null); return }
        if (resolved) return
        clearTimeout(timeout)
        const profile = await fetchProfile(session.user.id, session.access_token)
        done(session.user, profile)
      }
    )

    // Also try getSession immediately
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      console.log('[useUser] getSession:', !!session, session?.user?.id)
      if (cancelled || resolved || !session?.user) return
      clearTimeout(timeout)
      const profile = await fetchProfile(session.user.id, session.access_token)
      done(session.user, profile)
    })

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
