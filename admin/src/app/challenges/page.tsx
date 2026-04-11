'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'

const URL2 = process.env.NEXT_PUBLIC_SUPABASE_URL!
const KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const H = { 'apikey': KEY, 'Authorization': `Bearer ${KEY}`, 'Content-Type': 'application/json', 'Prefer': 'return=representation' }
const EMPTY = { title_ar:'', description_ar:'', challenge_type:'quiz', xp_reward:100, starts_at:'', ends_at:'', is_active:true, difficulty:'medium', max_participants:0 }

export default function ChallengesPage() {
  const [items, setItems] = useState<any[]>([])
  const [form, setForm] = useState<any>(EMPTY)
  const [editing, setEditing] = useState<string|null>(null)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')

  useEffect(() => { load() }, [])
  const load = async () => {
    const r = await fetch(`${URL2}/rest/v1/challenges?select=*&order=created_at.desc`, { headers: H }).then(r=>r.json())
    setItems(r || [])
  }

  const save = async () => {
    setSaving(true)
    const data = { ...form, xp_reward: Number(form.xp_reward), max_participants: Number(form.max_participants) }
    if (!data.starts_at) delete data.starts_at
    if (!data.ends_at) delete data.ends_at

    if (editing) {
      await fetch(`${URL2}/rest/v1/challenges?id=eq.${editing}`, { method:'PATCH', headers: H, body: JSON.stringify(data) })
      setMsg('✅ تم التحديث')
    } else {
      await fetch(`${URL2}/rest/v1/challenges`, { method:'POST', headers: H, body: JSON.stringify(data) })
      setMsg('✅ تم الإضافة')
    }
    setSaving(false); setForm(EMPTY); setEditing(null); setShowForm(false); load()
    setTimeout(() => setMsg(''), 3000)
  }

  const del = async (id: string) => {
    if (!confirm('حذف التحدي؟')) return
    await fetch(`${URL2}/rest/v1/challenges?id=eq.${id}`, { method:'DELETE', headers: H })
    load()
  }

  return (
    <div style={{minHeight:'100vh', background:'#0f172a', color:'#fff', fontFamily:'system-ui,sans-serif'}}>
      <header style={{background:'#1e293b', borderBottom:'1px solid #334155', padding:'16px 32px', display:'flex', alignItems:'center', gap:16}}>
        <Link href="/" style={{color:'#64748b', textDecoration:'none', fontSize:20}}>←</Link>
        <h1 style={{margin:0, fontSize:20, fontWeight:800, color:'#e2e8f0'}}>⚔️ إدارة التحديات</h1>
        <button onClick={()=>{setForm(EMPTY);setEditing(null);setShowForm(true)}} style={{marginRight:'auto', padding:'8px 20px', borderRadius:8, border:'none', background:'#CE82FF', color:'#fff', fontWeight:700, cursor:'pointer'}}>+ تحدي جديد</button>
      </header>

      {msg && <div style={{background:'#166534', color:'#bbf7d0', padding:'12px 32px', fontSize:14}}>{msg}</div>}

      <div style={{padding:32, maxWidth:1200, margin:'0 auto'}}>
        <div style={{display:'grid', gap:16}}>
          {items.map(c => (
            <div key={c.id} style={{background:'#1e293b', borderRadius:12, padding:20, border:'1px solid #334155', display:'flex', alignItems:'center', gap:16}}>
              <div style={{flex:1}}>
                <div style={{display:'flex', alignItems:'center', gap:8, marginBottom:6}}>
                  <span style={{fontWeight:700, color:'#e2e8f0', fontSize:16}}>{c.title_ar}</span>
                  <span style={{background: c.is_active ? '#166534' : '#7f1d1d', color: c.is_active ? '#bbf7d0' : '#fca5a5', borderRadius:6, padding:'2px 8px', fontSize:11}}>{c.is_active ? 'نشط' : 'مخفي'}</span>
                  <span style={{background:'#CE82FF30', color:'#CE82FF', borderRadius:6, padding:'2px 8px', fontSize:11}}>{c.challenge_type}</span>
                  <span style={{background:'#fbbf2420', color:'#fbbf24', borderRadius:6, padding:'2px 8px', fontSize:11}}>{c.difficulty}</span>
                </div>
                <div style={{color:'#64748b', fontSize:13}}>{c.description_ar}</div>
                <div style={{display:'flex', gap:16, marginTop:8, fontSize:12, color:'#94a3b8'}}>
                  <span>⚡ {c.xp_reward} XP</span>
                  {c.starts_at && <span>📅 {new Date(c.starts_at).toLocaleDateString('ar-EG')}</span>}
                  {c.ends_at && <span>🏁 {new Date(c.ends_at).toLocaleDateString('ar-EG')}</span>}
                </div>
              </div>
              <div style={{display:'flex', gap:8}}>
                <button onClick={()=>{setForm({...c});setEditing(c.id);setShowForm(true)}} style={{padding:'6px 14px', borderRadius:6, border:'1px solid #334155', background:'transparent', color:'#94a3b8', cursor:'pointer', fontSize:12}}>تعديل</button>
                <button onClick={()=>del(c.id)} style={{padding:'6px 14px', borderRadius:6, border:'1px solid #7f1d1d', background:'transparent', color:'#f87171', cursor:'pointer', fontSize:12}}>حذف</button>
              </div>
            </div>
          ))}
          {items.length === 0 && <div style={{padding:40, textAlign:'center', color:'#64748b', background:'#1e293b', borderRadius:12}}>لا توجد تحديات — أضف أول تحدي!</div>}
        </div>
      </div>

      {showForm && (
        <div style={{position:'fixed', inset:0, background:'rgba(0,0,0,0.7)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:100}}>
          <div style={{background:'#1e293b', borderRadius:16, padding:32, width:'100%', maxWidth:560, maxHeight:'90vh', overflowY:'auto', border:'1px solid #334155'}}>
            <h2 style={{margin:'0 0 24px', color:'#e2e8f0'}}>{editing ? 'تعديل تحدي' : 'تحدي جديد'}</h2>
            <div style={{display:'grid', gap:16}}>
              {[['title_ar','عنوان التحدي *','مثال: تحدي الأتمتة الأسبوعي'],['description_ar','الوصف','صف التحدي باختصار']].map(([k,l,p])=>(
                <div key={k}>
                  <label style={{display:'block', fontSize:13, color:'#94a3b8', marginBottom:6}}>{l}</label>
                  <input value={form[k]||''} onChange={e=>setForm({...form,[k]:e.target.value})} placeholder={p} style={{width:'100%', padding:'10px 12px', borderRadius:8, border:'1px solid #334155', background:'#0f172a', color:'#fff', fontSize:14, boxSizing:'border-box'}}/>
                </div>
              ))}
              <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:12}}>
                <div>
                  <label style={{display:'block', fontSize:13, color:'#94a3b8', marginBottom:6}}>النوع</label>
                  <select value={form.challenge_type} onChange={e=>setForm({...form,challenge_type:e.target.value})} style={{width:'100%', padding:'10px 12px', borderRadius:8, border:'1px solid #334155', background:'#0f172a', color:'#fff', fontSize:14}}>
                    <option value="quiz">اختبار</option>
                    <option value="project">مشروع</option>
                    <option value="speed">سباق سرعة</option>
                  </select>
                </div>
                <div>
                  <label style={{display:'block', fontSize:13, color:'#94a3b8', marginBottom:6}}>الصعوبة</label>
                  <select value={form.difficulty} onChange={e=>setForm({...form,difficulty:e.target.value})} style={{width:'100%', padding:'10px 12px', borderRadius:8, border:'1px solid #334155', background:'#0f172a', color:'#fff', fontSize:14}}>
                    <option value="easy">سهل</option>
                    <option value="medium">متوسط</option>
                    <option value="hard">صعب</option>
                  </select>
                </div>
                <div>
                  <label style={{display:'block', fontSize:13, color:'#94a3b8', marginBottom:6}}>XP</label>
                  <input type="number" value={form.xp_reward} onChange={e=>setForm({...form,xp_reward:e.target.value})} style={{width:'100%', padding:'10px 12px', borderRadius:8, border:'1px solid #334155', background:'#0f172a', color:'#fff', fontSize:14, boxSizing:'border-box'}}/>
                </div>
                <div>
                  <label style={{display:'block', fontSize:13, color:'#94a3b8', marginBottom:6}}>بداية</label>
                  <input type="datetime-local" value={form.starts_at?.slice(0,16)||''} onChange={e=>setForm({...form,starts_at:e.target.value})} style={{width:'100%', padding:'10px 12px', borderRadius:8, border:'1px solid #334155', background:'#0f172a', color:'#fff', fontSize:14, boxSizing:'border-box'}}/>
                </div>
                <div>
                  <label style={{display:'block', fontSize:13, color:'#94a3b8', marginBottom:6}}>نهاية</label>
                  <input type="datetime-local" value={form.ends_at?.slice(0,16)||''} onChange={e=>setForm({...form,ends_at:e.target.value})} style={{width:'100%', padding:'10px 12px', borderRadius:8, border:'1px solid #334155', background:'#0f172a', color:'#fff', fontSize:14, boxSizing:'border-box'}}/>
                </div>
              </div>
              <label style={{display:'flex', alignItems:'center', gap:8, cursor:'pointer'}}>
                <input type="checkbox" checked={form.is_active} onChange={e=>setForm({...form,is_active:e.target.checked})} style={{width:18,height:18}}/>
                <span style={{color:'#e2e8f0', fontSize:14}}>نشط ومرئي للطلاب</span>
              </label>
            </div>
            <div style={{display:'flex', gap:12, marginTop:24}}>
              <button onClick={save} disabled={saving} style={{flex:1, padding:'12px', borderRadius:8, border:'none', background:'#CE82FF', color:'#fff', fontWeight:700, cursor:'pointer', fontSize:15}}>{saving ? 'جاري الحفظ...' : editing ? 'تحديث' : 'إضافة'}</button>
              <button onClick={()=>{setShowForm(false);setForm(EMPTY);setEditing(null)}} style={{padding:'12px 24px', borderRadius:8, border:'1px solid #334155', background:'transparent', color:'#94a3b8', cursor:'pointer'}}>إلغاء</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
