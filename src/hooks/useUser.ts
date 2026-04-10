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

    const fetchProfile = async (userId: string) => {
      try {
        const { data } = await supabase.from('users').select('*').eq('id', userId).single()
        if (!cancelled) setUser(data ?? null)
      } catch {
        if (!cancelled) setUser(null)
      }
    }

    // Hard timeout — NEVER stay loading more than 3 seconds
    const timeout = setTimeout(() => {
      if (!cancelled) {
        console.log('[useUser] timeout — forcing loading=false')
        setLoading(false)
      }
    }, 3000)

    const init = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (cancelled) return
        clearTimeout(timeout)
        if (!session?.user) { setLoading(false); return }
        setAuthUser(session.user)
        await fetchProfile(session.user.id)
        if (!cancelled) setLoading(false)
      } catch {
        clearTimeout(timeout)
        if (!cancelled) setLoading(false)
      }
    }

    init()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (cancelled) return
        if (event === 'SIGNED_OUT' || !session) {
          setAuthUser(null); setUser(null); setLoading(false); return
        }
        setAuthUser(session.user)
        if (session.user) await fetchProfile(session.user.id)
        if (!cancelled) setLoading(false)
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
