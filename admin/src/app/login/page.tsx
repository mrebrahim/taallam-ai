'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const [pass, setPass] = useState('')
  const [error, setError] = useState('')
  const router = useRouter()

  const login = async (e: React.FormEvent) => {
    e.preventDefault()
    const res = await fetch('/api/login', { method:'POST', body: JSON.stringify({password: pass}), headers:{'Content-Type':'application/json'} })
    if (res.ok) router.push('/')
    else setError('كلمة المرور غلط')
  }

  return (
    <div style={{minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'#0f172a'}}>
      <div style={{background:'#1e293b', borderRadius:16, padding:40, width:320}}>
        <h1 style={{color:'#58CC02', margin:'0 0 8px', fontSize:24}}>🦉 Taallam Admin</h1>
        <p style={{color:'#94a3b8', margin:'0 0 24px', fontSize:14}}>لوحة التحكم</p>
        <form onSubmit={login}>
          <input type="password" placeholder="كلمة المرور" value={pass} onChange={e=>setPass(e.target.value)}
            style={{width:'100%', padding:'10px 14px', borderRadius:8, border:'1px solid #334155', background:'#0f172a', color:'#fff', fontSize:14, boxSizing:'border-box', marginBottom:12, outline:'none'}}/>
          {error && <p style={{color:'#ff4b4b', fontSize:13, margin:'0 0 12px'}}>{error}</p>}
          <button type="submit" style={{width:'100%', padding:'10px 14px', borderRadius:8, border:'none', background:'#58CC02', color:'#fff', fontSize:15, fontWeight:700, cursor:'pointer'}}>دخول</button>
        </form>
      </div>
    </div>
  )
}
