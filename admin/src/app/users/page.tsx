'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'

const URL2 = process.env.NEXT_PUBLIC_SUPABASE_URL!
const KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export default function UsersPage() {
  const [users, setUsers] = useState<any[]>([])
  useEffect(() => {
    fetch(`${URL2}/rest/v1/users?select=*&order=created_at.desc`, {
      headers: { 'apikey': KEY, 'Authorization': `Bearer ${KEY}` }
    }).then(r=>r.json()).then(setUsers)
  }, [])

  return (
    <div style={{minHeight:'100vh', background:'#0f172a', color:'#fff', fontFamily:'system-ui,sans-serif'}}>
      <header style={{background:'#1e293b', borderBottom:'1px solid #334155', padding:'16px 32px', display:'flex', alignItems:'center', gap:16}}>
        <Link href="/" style={{color:'#64748b', textDecoration:'none', fontSize:20}}>←</Link>
        <h1 style={{margin:0, fontSize:20, fontWeight:800, color:'#e2e8f0'}}>👥 المستخدمين ({users.length})</h1>
      </header>
      <div style={{padding:32, maxWidth:1200, margin:'0 auto'}}>
        <div style={{background:'#1e293b', borderRadius:12, border:'1px solid #334155', overflow:'hidden'}}>
          <table style={{width:'100%', borderCollapse:'collapse'}}>
            <thead>
              <tr style={{borderBottom:'1px solid #334155'}}>
                {['الاسم','البريد','المستوى','XP','العملات','الـ Streak','الاشتراك','تاريخ الانضمام'].map(h=>(
                  <th key={h} style={{padding:'12px 16px', textAlign:'right', fontSize:12, color:'#64748b', fontWeight:600}}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {users.map((u,i) => (
                <tr key={u.id} style={{borderBottom:'1px solid #334155', background:i%2===0?'transparent':'#ffffff05'}}>
                  <td style={{padding:'12px 16px', fontWeight:600, color:'#e2e8f0', fontSize:14}}>{u.full_name||u.username}</td>
                  <td style={{padding:'12px 16px', color:'#94a3b8', fontSize:13}}>{u.email}</td>
                  <td style={{padding:'12px 16px', color:'#fbbf24', fontWeight:700}}>Lv.{u.current_level}</td>
                  <td style={{padding:'12px 16px', color:'#58CC02', fontWeight:700}}>{u.xp_total?.toLocaleString()}</td>
                  <td style={{padding:'12px 16px', color:'#1CB0F6', fontWeight:700}}>💎{u.coins_balance?.toLocaleString()}</td>
                  <td style={{padding:'12px 16px', color:'#FF9600', fontWeight:700}}>🔥{u.streak_current}</td>
                  <td style={{padding:'12px 16px'}}>
                    <span style={{background: u.subscription_plan==='free'?'#33415520':'#15803d30', color:u.subscription_plan==='free'?'#94a3b8':'#4ade80', borderRadius:6, padding:'3px 8px', fontSize:12}}>{u.subscription_plan}</span>
                  </td>
                  <td style={{padding:'12px 16px', color:'#64748b', fontSize:12}}>{new Date(u.created_at).toLocaleDateString('ar-EG')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
