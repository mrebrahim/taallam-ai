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

    // Safety net — never stay loading more than 5 seconds
    const timeout = setTimeout(() => {
      if (!cancelled) setLoading(false)
    }, 5000)

    const fetchProfile = async (userId: string) => {
      try {
        const { data } = await supabase
          .from('users')
          .select('*')
          .eq('id', userId)
          .single()
        if (!cancelled) setUser(data ?? null)
      } catch {
        // ignore
      }
    }

    const init = async () => {
      try {
        // getSession() reads from localStorage — instant, no network call
        const { data: { session } } = await supabase.auth.getSession()
        if (cancelled) return

        if (!session?.user) {
          setLoading(false)
          clearTimeout(timeout)
          return
        }

        setAuthUser(session.user)
        await fetchProfile(session.user.id)
        if (!cancelled) {
          setLoading(false)
          clearTimeout(timeout)
        }
      } catch {
        if (!cancelled) {
          setLoading(false)
          clearTimeout(timeout)
        }
      }
    }

    init()

    // Listen for auth changes (login/logout)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (cancelled) return
        setAuthUser(session?.user ?? null)
        if (session?.user) {
          await fetchProfile(session.user.id)
        } else {
          setUser(null)
        }
        setLoading(false)
        clearTimeout(timeout)
      }
    )

    return () => {
      cancelled = true
      clearTimeout(timeout)
      subscription.unsubscribe()
    }
  }, [])

  const supabase = createClient()

  const signOut = async () => {
    await supabase.auth.signOut()
    window.location.replace('/auth/login')
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
