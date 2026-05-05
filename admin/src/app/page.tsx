'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export default function Dashboard() {
  const [stats, setStats] = useState<any>({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchStats = async () => {
      const headers = { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` }
      const [users, lessons, challenges, roadmaps] = await Promise.all([
        fetch(`${SUPABASE_URL}/rest/v1/users?select=id`, { headers }).then(r=>r.json()),
        fetch(`${SUPABASE_URL}/rest/v1/lessons?select=id`, { headers }).then(r=>r.json()),
        fetch(`${SUPABASE_URL}/rest/v1/challenges?select=id`, { headers }).then(r=>r.json()),
        fetch(`${SUPABASE_URL}/rest/v1/roadmaps?select=id`, { headers }).then(r=>r.json()),
      ])
      setStats({ users: users.length, lessons: lessons.length, challenges: challenges.length, roadmaps: roadmaps.length })
      setLoading(false)
    }
    fetchStats()
  }, [])

  const NAV = [
    { href:'/lessons',     icon:'📚', label:'الدروس',     desc:'أضف وعدّل دروس المسارات', color:'#58CC02' },
    { href:'/challenges',  icon:'⚔️',  label:'التحديات',   desc:'أنشئ تحديات أسبوعية', color:'#CE82FF' },
    { href:'/enrollments', icon:'🎓', label:'المشتركين',  desc:'سجّل مستخدمين في الكورسات', color:'#1CB0F6' },
    { href:'/ads',         icon:'📢', label:'الإعلانات',  desc:'أضف إعلانات مستهدفة للمستخدمين', color:'#CE82FF' },
    { href:'/users',       icon:'👥', label:'المستخدمين', desc:'عرض بيانات كل المستخدمين', color:'#FF9600' },
    { href:'/roadmaps',    icon:'🗺️', label:'المسارات',   desc:'إدارة مسارات التعلم', color:'#FF4B4B' },
    { href:'/products',    icon:'🛍️', label:'المنتجات الرقمية', desc:'أضف وعدّل المنتجات والأسعار', color:'#58CC02' },
  ]

  const STATS = [
    { label:'مستخدمين', value: stats.users, icon:'👥', color:'#1CB0F6' },
    { label:'دروس',      value: stats.lessons, icon:'📚', color:'#58CC02' },
    { label:'تحديات',    value: stats.challenges, icon:'⚔️', color:'#CE82FF' },
    { label:'مسارات',    value: stats.roadmaps, icon:'🗺️', color:'#FF9600' },
  ]

  return (
    <div style={{minHeight:'100vh', background:'#0f172a', color:'#fff', fontFamily:'system-ui, sans-serif'}}>
      {/* Header */}
      <header style={{background:'#1e293b', borderBottom:'1px solid #334155', padding:'16px 32px', display:'flex', alignItems:'center', justifyContent:'space-between'}}>
        <div style={{display:'flex', alignItems:'center', gap:12}}>
          <span style={{fontSize:28}}>🦉</span>
          <div>
            <h1 style={{margin:0, fontSize:20, fontWeight:800, color:'#58CC02'}}>Taallam Admin</h1>
            <p style={{margin:0, fontSize:12, color:'#64748b'}}>لوحة تحكم إبراهيم سكول</p>
          </div>
        </div>
        <a href="/api/logout" style={{color:'#94a3b8', fontSize:13, textDecoration:'none'}}>تسجيل الخروج</a>
      </header>

      <main style={{padding:32, maxWidth:1200, margin:'0 auto'}}>
        {/* Stats */}
        <div style={{display:'grid', gridTemplateColumns:'repeat(4, 1fr)', gap:16, marginBottom:32}}>
          {STATS.map(s => (
            <div key={s.label} style={{background:'#1e293b', borderRadius:12, padding:'20px 24px', border:'1px solid #334155'}}>
              <div style={{fontSize:28, marginBottom:8}}>{s.icon}</div>
              <div style={{fontSize:32, fontWeight:800, color:s.color}}>{loading ? '...' : s.value}</div>
              <div style={{fontSize:13, color:'#64748b', marginTop:4}}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Quick Nav */}
        <h2 style={{margin:'0 0 16px', fontSize:18, fontWeight:700, color:'#e2e8f0'}}>الأقسام</h2>
        <div style={{display:'grid', gridTemplateColumns:'repeat(2, 1fr)', gap:16}}>
          {NAV.map(n => (
            <Link key={n.href} href={n.href} style={{background:'#1e293b', borderRadius:12, padding:'24px', border:'1px solid #334155', textDecoration:'none', display:'flex', alignItems:'center', gap:16, transition:'border-color 0.2s'}}>
              <div style={{width:52, height:52, borderRadius:12, background:n.color+'20', display:'flex', alignItems:'center', justifyContent:'center', fontSize:24, flexShrink:0}}>{n.icon}</div>
              <div>
                <div style={{fontSize:17, fontWeight:700, color:'#e2e8f0', marginBottom:4}}>{n.label}</div>
                <div style={{fontSize:13, color:'#64748b'}}>{n.desc}</div>
              </div>
            </Link>
          ))}
        </div>
      </main>
    </div>
  )
}
