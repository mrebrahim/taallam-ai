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

    const fetchAndSet = async (session: any) => {
      if (!session?.user || cancelled) return
      try {
        setAuthUser(session.user)
        const { data } = await supabase
          .from('users').select('*').eq('id', session.user.id).single()
        if (!cancelled) {
          setUser(data ?? null)
          setLoading(false)
        }
      } catch {
        if (!cancelled) setLoading(false)
      }
    }

    // Hard timeout
    const timeout = setTimeout(() => {
      if (!cancelled) setLoading(false)
    }, 5000)

    // Listen FIRST before getSession
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        clearTimeout(timeout)
        if (cancelled) return
        if (!session) { setUser(null); setAuthUser(null); setLoading(false); return }
        await fetchAndSet(session)
      }
    )

    // Also try immediately
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session && !cancelled) {
        clearTimeout(timeout)
        fetchAndSet(session)
      }
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
