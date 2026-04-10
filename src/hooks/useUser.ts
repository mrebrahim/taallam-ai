'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { User } from '@/types'

export function useUser() {
  const [user, setUser] = useState<User | null>(null)
  const [authUser, setAuthUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    let cancelled = false

    // Safety timeout — never stay loading more than 6 seconds
    const timeout = setTimeout(() => {
      if (!cancelled) setLoading(false)
    }, 6000)

    const init = async () => {
      try {
        const { data: { user: authU }, error } = await supabase.auth.getUser()
        if (cancelled) return
        if (error || !authU) {
          setLoading(false)
          return
        }
        setAuthUser(authU)
        const { data } = await supabase
          .from('users')
          .select('*')
          .eq('id', authU.id)
          .single()
        if (!cancelled) {
          setUser(data ?? null)
          setLoading(false)
        }
      } catch {
        if (!cancelled) setLoading(false)
      }
    }

    init()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (cancelled) return
        setAuthUser(session?.user ?? null)
        if (session?.user) {
          try {
            const { data } = await supabase
              .from('users')
              .select('*')
              .eq('id', session.user.id)
              .single()
            if (!cancelled) setUser(data ?? null)
          } catch {}
        } else {
          setUser(null)
        }
        if (!cancelled) setLoading(false)
      }
    )

    return () => {
      cancelled = true
      clearTimeout(timeout)
      subscription.unsubscribe()
    }
  }, [])

  const signOut = async () => {
    await supabase.auth.signOut()
    window.location.href = '/auth/login'
  }

  const refreshUser = async () => {
    if (!authUser) return
    const { data } = await supabase
      .from('users')
      .select('*')
      .eq('id', authUser.id)
      .single()
    setUser(data ?? null)
  }

  return { user, authUser, loading, signOut, refreshUser }
}
