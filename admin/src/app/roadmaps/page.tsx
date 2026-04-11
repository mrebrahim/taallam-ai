'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'

const URL2 = process.env.NEXT_PUBLIC_SUPABASE_URL!
const KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const H = { 'apikey': KEY, 'Authorization': `Bearer ${KEY}`, 'Content-Type': 'application/json', 'Prefer': 'return=representation' }

export default function RoadmapsPage() {
  const [roadmaps, setRoadmaps] = useState<any[]>([])
  const [form, setForm] = useState<any>({})
  const [editing, setEditing] = useState<string|null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetch(`${URL2}/rest/v1/roadmaps?select=*&order=sort_order`, { headers: H }).then(r=>r.json()).then(setRoadmaps)
  }, [])

  const save = async () => {
    setSaving(true)
    await fetch(`${URL2}/rest/v1/roadmaps?id=eq.${editing}`, { method:'PATCH', headers: H, body: JSON.stringify({ title_ar: form.title_ar, description_ar: form.description_ar, is_active: form.is_active }) })
    setSaving(false); setEditing(null)
    const r = await fetch(`${URL2}/rest/v1/roadmaps?select=*&order=sort_order`, { headers: H }).then(r=>r.json())
    setRoadmaps(r)
  }

  return (
    <div style={{minHeight:'100vh', background:'#0f172a', color:'#fff', fontFamily:'system-ui,sans-serif'}}>
      <header style={{background:'#1e293b', borderBottom:'1px solid #334155', padding:'16px 32px', display:'flex', alignItems:'center', gap:16}}>
        <Link href="/" style={{color:'#64748b', textDecoration:'none', fontSize:20}}>←</Link>
        <h1 style={{margin:0, fontSize:20, fontWeight:800, color:'#e2e8f0'}}>🗺️ المسارات</h1>
      </header>
      <div style={{padding:32, maxWidth:1200, margin:'0 auto', display:'grid', gap:16}}>
        {roadmaps.map(r => (
          <div key={r.id} style={{background:'#1e293b', borderRadius:12, padding:24, border:'1px solid #334155'}}>
            {editing===r.id ? (
              <div style={{display:'grid', gap:12}}>
                <input value={form.title_ar} onChange={e=>setForm({...form,title_ar:e.target.value})} style={{padding:'10px 12px', borderRadius:8, border:'1px solid #334155', background:'#0f172a', color:'#fff', fontSize:14}}/>
                <textarea value={form.description_ar||''} onChange={e=>setForm({...form,description_ar:e.target.value})} rows={2} style={{padding:'10px 12px', borderRadius:8, border:'1px solid #334155', background:'#0f172a', color:'#fff', fontSize:14, resize:'vertical'}}/>
                <div style={{display:'flex', gap:12}}>
                  <button onClick={save} disabled={saving} style={{padding:'8px 20px', borderRadius:8, border:'none', background:'#58CC02', color:'#fff', fontWeight:700, cursor:'pointer'}}>{saving?'...':'حفظ'}</button>
                  <button onClick={()=>setEditing(null)} style={{padding:'8px 20px', borderRadius:8, border:'1px solid #334155', background:'transparent', color:'#94a3b8', cursor:'pointer'}}>إلغاء</button>
                </div>
              </div>
            ) : (
              <div style={{display:'flex', alignItems:'center', gap:16}}>
                <div style={{flex:1}}>
                  <div style={{fontWeight:700, color:'#e2e8f0', fontSize:18, marginBottom:4}}>{r.title_ar}</div>
                  <div style={{color:'#64748b', fontSize:13}}>{r.description_ar}</div>
                  <div style={{fontSize:12, color:'#94a3b8', marginTop:6}}>slug: {r.slug}</div>
                </div>
                <button onClick={()=>{setForm(r);setEditing(r.id)}} style={{padding:'8px 16px', borderRadius:8, border:'1px solid #334155', background:'transparent', color:'#94a3b8', cursor:'pointer', fontSize:13}}>تعديل</button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
