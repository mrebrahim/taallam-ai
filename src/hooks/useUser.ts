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

    const resolve = (au: any, u: User | null) => {
      if (cancelled || resolved) return
      resolved = true
      setAuthUser(au)
      setUser(u)
      setLoading(false)
    }

    const fetchProfile = async (userId: string): Promise<User | null> => {
      try {
        const { data } = await supabase.from('users').select('*').eq('id', userId).single()
        return data ?? null
      } catch { return null }
    }

    // Hard timeout: 5 seconds max
    const timeout = setTimeout(() => resolve(null, null), 5000)

    // Primary: onAuthStateChange fires reliably after hydration
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        clearTimeout(timeout)
        if (cancelled) return
        if (!session?.user) { resolve(null, null); return }
        const profile = await fetchProfile(session.user.id)
        resolve(session.user, profile)
      }
    )

    // Secondary: also check getSession() to cover cases where
    // onAuthStateChange doesn't fire immediately
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (cancelled || resolved) return
      if (!session?.user) return // wait for onAuthStateChange
      const profile = await fetchProfile(session.user.id)
      clearTimeout(timeout)
      resolve(session.user, profile)
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
