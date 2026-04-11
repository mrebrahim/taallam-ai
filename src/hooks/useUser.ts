'use client'
import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { User } from '@/types'

export function useUser() {
  const [user, setUser] = useState<User | null>(null)
  const [authUser, setAuthUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const fetchedRef = useRef(false)

  useEffect(() => {
    if (fetchedRef.current) return
    fetchedRef.current = true

    const supabase = createClient()

    const load = async () => {
      try {
        // Get session
        const { data: { session } } = await supabase.auth.getSession()
        
        if (!session?.user) {
          setLoading(false)
          return
        }

        setAuthUser(session.user)

        // Fetch profile with explicit auth header
        const { data: profile } = await supabase
          .from('users')
          .select('*')
          .eq('id', session.user.id)
          .single()

        setUser(profile ?? null)
      } catch (e) {
        console.error('[useUser] error:', e)
      } finally {
        setLoading(false)
      }
    }

    // Small delay to ensure supabase client has loaded session from storage
    const t = setTimeout(load, 100)

    // Also listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_OUT') {
          setUser(null); setAuthUser(null); setLoading(false)
          return
        }
        if (event === 'SIGNED_IN' && session?.user && !user) {
          setAuthUser(session.user)
          const { data } = await supabase.from('users').select('*').eq('id', session.user.id).single()
          setUser(data ?? null)
          setLoading(false)
        }
      }
    )

    return () => { clearTimeout(t); subscription.unsubscribe() }
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
