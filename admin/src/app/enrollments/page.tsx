'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'

const URL2 = process.env.NEXT_PUBLIC_SUPABASE_URL!
const KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const H = { 'apikey': KEY, 'Authorization': `Bearer ${KEY}`, 'Content-Type': 'application/json', 'Prefer': 'return=representation' }

export default function EnrollmentsPage() {
  const [enrollments, setEnrollments] = useState<any[]>([])
  const [users, setUsers] = useState<any[]>([])
  const [roadmaps, setRoadmaps] = useState<any[]>([])
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ user_id:'', roadmap_id:'', notes:'' })
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')
  const [searchEmail, setSearchEmail] = useState('')

  useEffect(() => { load() }, [])

  const load = async () => {
    const [e, u, r] = await Promise.all([
      fetch(`${URL2}/rest/v1/course_enrollments?select=*,users(full_name,email,username),roadmaps(title_ar,slug)&order=enrolled_at.desc`, { headers: H }).then(r=>r.json()),
      fetch(`${URL2}/rest/v1/users?select=id,full_name,email,username&order=created_at.desc`, { headers: H }).then(r=>r.json()),
      fetch(`${URL2}/rest/v1/roadmaps?select=*&order=sort_order`, { headers: H }).then(r=>r.json()),
    ])
    setEnrollments(Array.isArray(e) ? e : [])
    setUsers(Array.isArray(u) ? u : [])
    setRoadmaps(Array.isArray(r) ? r : [])
  }

  const enroll = async () => {
    if (!form.user_id || !form.roadmap_id) { alert('اختر المستخدم والكورس'); return }
    setSaving(true)
    const res = await fetch(`${URL2}/rest/v1/course_enrollments`, {
      method: 'POST', headers: H,
      body: JSON.stringify({ user_id: form.user_id, roadmap_id: form.roadmap_id, notes: form.notes, is_active: true })
    })
    if (res.ok) { setMsg('✅ تم تسجيل المستخدم في الكورس'); setShowForm(false); setForm({ user_id:'', roadmap_id:'', notes:'' }); load() }
    else { const e = await res.json(); setMsg('❌ ' + (e?.message || 'خطأ')) }
    setSaving(false)
    setTimeout(() => setMsg(''), 4000)
  }

  const toggleActive = async (id: string, current: boolean) => {
    await fetch(`${URL2}/rest/v1/course_enrollments?id=eq.${id}`, { method:'PATCH', headers: H, body: JSON.stringify({ is_active: !current }) })
    load()
  }

  const remove = async (id: string) => {
    if (!confirm('حذف التسجيل؟')) return
    await fetch(`${URL2}/rest/v1/course_enrollments?id=eq.${id}`, { method:'DELETE', headers: H })
    load()
  }

  const COLORS: Record<string, string> = { n8n_automation:'#58CC02', ai_video:'#FF9600', vibe_coding:'#CE82FF' }
  const filtered = enrollments.filter(e => !searchEmail || e.users?.email?.includes(searchEmail) || e.users?.full_name?.includes(searchEmail))

  // Group by roadmap for stats
  const stats = roadmaps.map(r => ({
    ...r,
    count: enrollments.filter(e => e.roadmap_id === r.id && e.is_active).length
  }))

  return (
    <div style={{ minHeight:'100vh', background:'#0f172a', color:'#fff', fontFamily:'system-ui,sans-serif' }}>
      <header style={{ background:'#1e293b', borderBottom:'1px solid #334155', padding:'16px 32px', display:'flex', alignItems:'center', gap:16 }}>
        <Link href="/" style={{ color:'#64748b', textDecoration:'none', fontSize:20 }}>←</Link>
        <h1 style={{ margin:0, fontSize:20, fontWeight:800, color:'#e2e8f0' }}>👥 إدارة المشتركين</h1>
        <button onClick={() => setShowForm(true)} style={{ marginRight:'auto', padding:'8px 20px', borderRadius:8, border:'none', background:'#1CB0F6', color:'#fff', fontWeight:700, cursor:'pointer' }}>
          + تسجيل مشترك جديد
        </button>
      </header>

      {msg && <div style={{ background: msg.startsWith('✅') ? '#166534' : '#7f1d1d', color: msg.startsWith('✅') ? '#bbf7d0' : '#fca5a5', padding:'12px 32px', fontSize:14 }}>{msg}</div>}

      <div style={{ padding:32, maxWidth:1200, margin:'0 auto' }}>
        {/* Stats */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(3, 1fr)', gap:16, marginBottom:32 }}>
          {stats.map(r => (
            <div key={r.id} style={{ background:'#1e293b', borderRadius:12, padding:'20px 24px', border:`1px solid ${COLORS[r.slug] || '#334155'}40` }}>
              <div style={{ fontSize:24, marginBottom:8 }}>
                {r.slug === 'n8n_automation' ? '⚡' : r.slug === 'ai_video' ? '🎬' : '💻'}
              </div>
              <div style={{ fontSize:28, fontWeight:800, color: COLORS[r.slug] || '#58CC02' }}>{r.count}</div>
              <div style={{ fontSize:13, color:'#64748b', marginTop:4 }}>{r.title_ar}</div>
            </div>
          ))}
        </div>

        {/* Search */}
        <div style={{ marginBottom:16 }}>
          <input value={searchEmail} onChange={e=>setSearchEmail(e.target.value)} placeholder="🔍 ابحث باسم أو إيميل..." 
            style={{ padding:'10px 16px', borderRadius:8, border:'1px solid #334155', background:'#1e293b', color:'#fff', fontSize:14, width:300 }}/>
        </div>

        {/* Table */}
        <div style={{ background:'#1e293b', borderRadius:12, border:'1px solid #334155', overflow:'hidden' }}>
          <table style={{ width:'100%', borderCollapse:'collapse' }}>
            <thead>
              <tr style={{ borderBottom:'1px solid #334155' }}>
                {['المستخدم','الإيميل','الكورس','تاريخ التسجيل','الحالة',''].map(h=>(
                  <th key={h} style={{ padding:'12px 16px', textAlign:'right', fontSize:12, color:'#64748b', fontWeight:600 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((e, i) => (
                <tr key={e.id} style={{ borderBottom:'1px solid #334155', background:i%2===0?'transparent':'#ffffff05' }}>
                  <td style={{ padding:'12px 16px', fontWeight:600, color:'#e2e8f0', fontSize:14 }}>{e.users?.full_name || e.users?.username || '—'}</td>
                  <td style={{ padding:'12px 16px', color:'#94a3b8', fontSize:13 }}>{e.users?.email}</td>
                  <td style={{ padding:'12px 16px' }}>
                    <span style={{ background:(COLORS[e.roadmaps?.slug]||'#58CC02')+'30', color:COLORS[e.roadmaps?.slug]||'#58CC02', borderRadius:6, padding:'3px 10px', fontSize:12, fontWeight:600 }}>
                      {e.roadmaps?.title_ar || '—'}
                    </span>
                  </td>
                  <td style={{ padding:'12px 16px', color:'#64748b', fontSize:12 }}>
                    {new Date(e.enrolled_at).toLocaleDateString('ar-EG')}
                  </td>
                  <td style={{ padding:'12px 16px' }}>
                    <button onClick={()=>toggleActive(e.id, e.is_active)} style={{ background: e.is_active ? '#166534' : '#7f1d1d', color: e.is_active ? '#bbf7d0' : '#fca5a5', border:'none', borderRadius:6, padding:'4px 12px', fontSize:12, cursor:'pointer' }}>
                      {e.is_active ? '✅ نشط' : '⏸️ موقوف'}
                    </button>
                  </td>
                  <td style={{ padding:'12px 16px' }}>
                    <button onClick={()=>remove(e.id)} style={{ padding:'4px 12px', borderRadius:6, border:'1px solid #7f1d1d', background:'transparent', color:'#f87171', cursor:'pointer', fontSize:12 }}>حذف</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && <div style={{ padding:40, textAlign:'center', color:'#64748b' }}>لا يوجد مشتركين</div>}
        </div>
      </div>

      {/* Modal */}
      {showForm && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.7)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:100 }}>
          <div style={{ background:'#1e293b', borderRadius:16, padding:32, width:'100%', maxWidth:480, border:'1px solid #334155' }}>
            <h2 style={{ margin:'0 0 24px', color:'#e2e8f0' }}>تسجيل مشترك في كورس</h2>
            <div style={{ display:'grid', gap:16 }}>
              <div>
                <label style={{ display:'block', fontSize:13, color:'#94a3b8', marginBottom:6 }}>اختر المستخدم *</label>
                <select value={form.user_id} onChange={e=>setForm({...form, user_id:e.target.value})} style={{ width:'100%', padding:'10px 12px', borderRadius:8, border:'1px solid #334155', background:'#0f172a', color:'#fff', fontSize:14 }}>
                  <option value="">اختر مستخدم</option>
                  {users.map(u => <option key={u.id} value={u.id}>{u.full_name || u.username} — {u.email}</option>)}
                </select>
              </div>
              <div>
                <label style={{ display:'block', fontSize:13, color:'#94a3b8', marginBottom:6 }}>اختر الكورس *</label>
                <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                  {roadmaps.map(r => (
                    <label key={r.id} style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 14px', borderRadius:8, border:`2px solid ${form.roadmap_id===r.id ? (COLORS[r.slug]||'#58CC02') : '#334155'}`, cursor:'pointer', background: form.roadmap_id===r.id ? (COLORS[r.slug]||'#58CC02')+'15' : 'transparent' }}>
                      <input type="radio" name="roadmap" value={r.id} checked={form.roadmap_id===r.id} onChange={()=>setForm({...form, roadmap_id:r.id})} style={{ width:16, height:16 }}/>
                      <span style={{ fontSize:20 }}>{r.slug==='n8n_automation'?'⚡':r.slug==='ai_video'?'🎬':'💻'}</span>
                      <span style={{ color:'#e2e8f0', fontWeight:600 }}>{r.title_ar}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <label style={{ display:'block', fontSize:13, color:'#94a3b8', marginBottom:6 }}>ملاحظات</label>
                <input value={form.notes} onChange={e=>setForm({...form, notes:e.target.value})} placeholder="مثال: اشتراك شهري" style={{ width:'100%', padding:'10px 12px', borderRadius:8, border:'1px solid #334155', background:'#0f172a', color:'#fff', fontSize:14, boxSizing:'border-box' }}/>
              </div>
            </div>
            <div style={{ display:'flex', gap:12, marginTop:24 }}>
              <button onClick={enroll} disabled={saving} style={{ flex:1, padding:'12px', borderRadius:8, border:'none', background:'#1CB0F6', color:'#fff', fontWeight:700, cursor:'pointer', fontSize:15 }}>
                {saving ? 'جاري...' : 'تسجيل ✅'}
              </button>
              <button onClick={()=>setShowForm(false)} style={{ padding:'12px 24px', borderRadius:8, border:'1px solid #334155', background:'transparent', color:'#94a3b8', cursor:'pointer' }}>إلغاء</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
