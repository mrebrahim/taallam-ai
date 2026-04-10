'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function DebugPage() {
  const [info, setInfo] = useState<string>('loading...')

  useEffect(() => {
    const run = async () => {
      // Check localStorage
      const lsKeys: any = {}
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i)!
        lsKeys[k] = localStorage.getItem(k)?.substring(0, 100) + '...'
      }

      // Check supabase session
      const supabase = createClient()
      const { data: { session }, error } = await supabase.auth.getSession()
      
      const result = {
        time: new Date().toISOString(),
        sessionExists: !!session,
        userId: session?.user?.id || null,
        email: session?.user?.email || null,
        sessionError: error?.message || null,
        localStorageKeyCount: localStorage.length,
        localStorageKeys: lsKeys,
      }
      
      setInfo(JSON.stringify(result, null, 2))
    }
    run()
  }, [])

  return (
    <div style={{ padding: 20, fontFamily: 'monospace', direction: 'ltr', background: '#1a1a1a', minHeight: '100vh', color: '#fff' }}>
      <h2 style={{ color: '#58CC02' }}>🔍 Auth Debug</h2>
      <pre style={{ background: '#2a2a2a', padding: 16, borderRadius: 8, overflow: 'auto', fontSize: 12, whiteSpace: 'pre-wrap' }}>
        {info}
      </pre>
      <div style={{ display: 'flex', gap: 12, marginTop: 16 }}>
        <button onClick={() => { localStorage.clear(); window.location.href = '/auth/login' }}
          style={{ padding: '10px 20px', background: '#FF4B4B', color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer' }}>
          Clear & Go to Login
        </button>
        <button onClick={() => window.location.reload()}
          style={{ padding: '10px 20px', background: '#1CB0F6', color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer' }}>
          Refresh Debug
        </button>
        <button onClick={() => window.location.href = '/home'}
          style={{ padding: '10px 20px', background: '#58CC02', color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer' }}>
          Try Home
        </button>
      </div>
    </div>
  )
}
