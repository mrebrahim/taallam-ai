'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const H = { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}`, 'Content-Type': 'application/json', 'Prefer': 'return=representation' }

const EMPTY = { title_ar:'', description_ar:'', content_ar:'', xp_reward:50, duration_minutes:10, lesson_type:'video', is_active:true, sort_order:1, video_url:'', roadmap_id:'' }

export default function LessonsPage() {
  const [lessons, setLessons] = useState<any[]>([])
  const [roadmaps, setRoadmaps] = useState<any[]>([])
  const [form, setForm] = useState<any>(EMPTY)
  const [editing, setEditing] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [filter, setFilter] = useState('')
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')
  
  // Bulk selection state
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [bulkAction, setBulkAction] = useState<'delete'|'activate'|'deactivate'|''>('')
  const [showBulkConfirm, setShowBulkConfirm] = useState(false)

  useEffect(() => { load() }, [])

  const load = async () => {
    const [l, r] = await Promise.all([
      fetch(`${SUPABASE_URL}/rest/v1/lessons?select=*,roadmaps(title_ar,slug)&order=roadmap_id,sort_order`, { headers: H }).then(r=>r.json()),
      fetch(`${SUPABASE_URL}/rest/v1/roadmaps?select=*&order=sort_order`, { headers: H }).then(r=>r.json()),
    ])
    setLessons(l || [])
    setRoadmaps(r || [])
    setSelected(new Set()) // clear selection on reload
  }

  const save = async () => {
    setSaving(true)
    const data = { ...form, xp_reward: Number(form.xp_reward), duration_minutes: Number(form.duration_minutes), sort_order: Number(form.sort_order) }
    if (editing) {
      await fetch(`${SUPABASE_URL}/rest/v1/lessons?id=eq.${editing}`, { method:'PATCH', headers: H, body: JSON.stringify(data) })
      setMsg('✅ تم التحديث')
    } else {
      await fetch(`${SUPABASE_URL}/rest/v1/lessons`, { method:'POST', headers: H, body: JSON.stringify(data) })
      setMsg('✅ تم الإضافة')
    }
    setSaving(false); setForm(EMPTY); setEditing(null); setShowForm(false); load()
    setTimeout(() => setMsg(''), 3000)
  }

  const del = async (id: string) => {
    if (!confirm('حذف الدرس؟')) return
    await fetch(`${SUPABASE_URL}/rest/v1/lessons?id=eq.${id}`, { method:'DELETE', headers: H })
    load()
  }

  const edit = (l: any) => { setForm({ ...l, roadmap_id: l.roadmap_id || '' }); setEditing(l.id); setShowForm(true) }

  // ── BULK OPERATIONS ──────────────────────────────
  const filtered = lessons.filter(l => !filter || l.roadmap_id === filter)

  const toggleSelect = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const toggleSelectAll = () => {
    if (selected.size === filtered.length) {
      setSelected(new Set())
    } else {
      setSelected(new Set(filtered.map(l => l.id)))
    }
  }

  const executeBulk = async () => {
    if (!bulkAction || selected.size === 0) return
    setSaving(true)

    const ids = Array.from(selected)

    if (bulkAction === 'delete') {
      // Delete one by one (Supabase REST doesn't support IN easily without PostgREST v12)
      await Promise.all(ids.map(id =>
        fetch(`${SUPABASE_URL}/rest/v1/lessons?id=eq.${id}`, { method:'DELETE', headers: H })
      ))
      setMsg(`✅ تم حذف ${ids.length} درس`)
    } else if (bulkAction === 'activate') {
      await Promise.all(ids.map(id =>
        fetch(`${SUPABASE_URL}/rest/v1/lessons?id=eq.${id}`, { method:'PATCH', headers: H, body: JSON.stringify({ is_active: true }) })
      ))
      setMsg(`✅ تم تفعيل ${ids.length} درس`)
    } else if (bulkAction === 'deactivate') {
      await Promise.all(ids.map(id =>
        fetch(`${SUPABASE_URL}/rest/v1/lessons?id=eq.${id}`, { method:'PATCH', headers: H, body: JSON.stringify({ is_active: false }) })
      ))
      setMsg(`✅ تم إخفاء ${ids.length} درس`)
    }

    setSaving(false); setShowBulkConfirm(false); setBulkAction(''); load()
    setTimeout(() => setMsg(''), 3000)
  }

  const COLORS: Record<string, string> = { n8n_automation:'#58CC02', ai_video:'#FF9600', vibe_coding:'#CE82FF' }
  const allFilteredSelected = filtered.length > 0 && selected.size === filtered.length
  const someSelected = selected.size > 0

  return (
    <div style={{minHeight:'100vh', background:'#0f172a', color:'#fff', fontFamily:'system-ui,sans-serif'}}>
      <header style={{background:'#1e293b', borderBottom:'1px solid #334155', padding:'16px 32px', display:'flex', alignItems:'center', gap:16}}>
        <Link href="/" style={{color:'#64748b', textDecoration:'none', fontSize:20}}>←</Link>
        <h1 style={{margin:0, fontSize:20, fontWeight:800, color:'#e2e8f0'}}>📚 إدارة الدروس</h1>
        <button onClick={()=>{setForm(EMPTY);setEditing(null);setShowForm(true)}} style={{marginRight:'auto', padding:'8px 20px', borderRadius:8, border:'none', background:'#58CC02', color:'#fff', fontWeight:700, cursor:'pointer'}}>+ درس جديد</button>
      </header>

      {msg && <div style={{background: msg.startsWith('✅') ? '#166534' : '#7f1d1d', color: msg.startsWith('✅') ? '#bbf7d0' : '#fca5a5', padding:'12px 32px', fontSize:14}}>{msg}</div>}

      <div style={{padding:32, maxWidth:1200, margin:'0 auto'}}>

        {/* Filter tabs */}
        <div style={{display:'flex', gap:8, marginBottom:16, flexWrap:'wrap', alignItems:'center'}}>
          <button onClick={()=>{setFilter('');setSelected(new Set())}} style={{padding:'6px 16px', borderRadius:8, border:'none', background: filter==='' ? '#58CC02' : '#1e293b', color:'#fff', cursor:'pointer'}}>الكل ({lessons.length})</button>
          {roadmaps.map(r => (
            <button key={r.id} onClick={()=>{setFilter(r.id);setSelected(new Set())}} style={{padding:'6px 16px', borderRadius:8, border:'none', background: filter===r.id ? COLORS[r.slug]||'#58CC02' : '#1e293b', color:'#fff', cursor:'pointer'}}>
              {r.title_ar} ({lessons.filter(l=>l.roadmap_id===r.id).length})
            </button>
          ))}
        </div>

        {/* Bulk Actions Bar */}
        <div style={{display:'flex', alignItems:'center', gap:12, marginBottom:12, padding:'10px 16px', background:'#1e293b', borderRadius:10, border:'1px solid #334155'}}>
          {/* Select All checkbox */}
          <label style={{display:'flex', alignItems:'center', gap:8, cursor:'pointer', userSelect:'none'}}>
            <div onClick={toggleSelectAll} style={{
              width:20, height:20, borderRadius:4, border:`2px solid ${allFilteredSelected ? '#58CC02' : '#475569'}`,
              background: allFilteredSelected ? '#58CC02' : someSelected ? '#1e3a2e' : 'transparent',
              display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', flexShrink:0
            }}>
              {allFilteredSelected && <span style={{color:'#fff', fontSize:13, fontWeight:900}}>✓</span>}
              {someSelected && !allFilteredSelected && <span style={{color:'#58CC02', fontSize:16, lineHeight:1}}>—</span>}
            </div>
            <span style={{fontSize:13, color: someSelected ? '#e2e8f0' : '#64748b'}}>
              {someSelected ? `${selected.size} محدد` : 'تحديد الكل'}
            </span>
          </label>

          {/* Bulk action buttons — only show when items selected */}
          {someSelected && (
            <>
              <div style={{width:1, height:24, background:'#334155'}}/>
              <span style={{fontSize:12, color:'#64748b'}}>تنفيذ على المحدد:</span>
              <button onClick={()=>{setBulkAction('activate');setShowBulkConfirm(true)}} style={{padding:'5px 14px', borderRadius:6, border:'1px solid #166534', background:'transparent', color:'#4ade80', cursor:'pointer', fontSize:12, fontWeight:600}}>
                ✅ تفعيل ({selected.size})
              </button>
              <button onClick={()=>{setBulkAction('deactivate');setShowBulkConfirm(true)}} style={{padding:'5px 14px', borderRadius:6, border:'1px solid #854d0e', background:'transparent', color:'#fbbf24', cursor:'pointer', fontSize:12, fontWeight:600}}>
                ⏸️ إخفاء ({selected.size})
              </button>
              <button onClick={()=>{setBulkAction('delete');setShowBulkConfirm(true)}} style={{padding:'5px 14px', borderRadius:6, border:'1px solid #7f1d1d', background:'transparent', color:'#f87171', cursor:'pointer', fontSize:12, fontWeight:600}}>
                🗑️ حذف ({selected.size})
              </button>
              <button onClick={()=>setSelected(new Set())} style={{padding:'5px 14px', borderRadius:6, border:'1px solid #334155', background:'transparent', color:'#64748b', cursor:'pointer', fontSize:12}}>
                ✕ إلغاء التحديد
              </button>
            </>
          )}

          <span style={{marginRight:'auto', fontSize:12, color:'#475569'}}>{filtered.length} درس</span>
        </div>

        {/* Lessons table */}
        <div style={{background:'#1e293b', borderRadius:12, border:'1px solid #334155', overflow:'hidden'}}>
          <table style={{width:'100%', borderCollapse:'collapse'}}>
            <thead>
              <tr style={{borderBottom:'1px solid #334155', background:'#0f172a'}}>
                <th style={{padding:'12px 16px', width:40}}></th>
                {['#','العنوان','المسار','النوع','XP','الوقت','الحالة',''].map(h => (
                  <th key={h} style={{padding:'12px 16px', textAlign:'right', fontSize:12, color:'#64748b', fontWeight:600}}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((l, i) => {
                const isSelected = selected.has(l.id)
                return (
                  <tr key={l.id} style={{borderBottom:'1px solid #334155', background: isSelected ? '#1e3a2e' : i%2===0?'transparent':'#ffffff05', transition:'background 0.1s'}}>
                    {/* Checkbox */}
                    <td style={{padding:'12px 16px', textAlign:'center'}}>
                      <div onClick={()=>toggleSelect(l.id)} style={{
                        width:18, height:18, borderRadius:4, border:`2px solid ${isSelected ? '#58CC02' : '#475569'}`,
                        background: isSelected ? '#58CC02' : 'transparent',
                        display:'inline-flex', alignItems:'center', justifyContent:'center', cursor:'pointer'
                      }}>
                        {isSelected && <span style={{color:'#fff', fontSize:11, fontWeight:900}}>✓</span>}
                      </div>
                    </td>
                    <td style={{padding:'12px 16px', color:'#64748b', fontSize:13}}>{l.sort_order}</td>
                    <td style={{padding:'12px 16px'}}>
                      <div style={{fontWeight:600, color:'#e2e8f0', fontSize:14}}>{l.title_ar}</div>
                      {l.video_url && <div style={{fontSize:11, color:'#58CC02', marginTop:2}}>📹 فيديو</div>}
                    </td>
                    <td style={{padding:'12px 16px'}}>
                      <span style={{background:(COLORS[l.roadmaps?.slug]||'#58CC02')+'30', color:COLORS[l.roadmaps?.slug]||'#58CC02', borderRadius:6, padding:'3px 8px', fontSize:12, fontWeight:600}}>
                        {l.roadmaps?.title_ar || '—'}
                      </span>
                    </td>
                    <td style={{padding:'12px 16px', color:'#94a3b8', fontSize:13}}>{l.lesson_type}</td>
                    <td style={{padding:'12px 16px', color:'#fbbf24', fontWeight:700, fontSize:13}}>{l.xp_reward}</td>
                    <td style={{padding:'12px 16px', color:'#94a3b8', fontSize:13}}>{l.duration_minutes}د</td>
                    <td style={{padding:'12px 16px'}}>
                      <span style={{background: l.is_active ? '#166534' : '#7f1d1d', color: l.is_active ? '#bbf7d0' : '#fca5a5', borderRadius:6, padding:'3px 8px', fontSize:11}}>
                        {l.is_active ? 'نشط' : 'مخفي'}
                      </span>
                    </td>
                    <td style={{padding:'12px 16px'}}>
                      <div style={{display:'flex', gap:8}}>
                        <button onClick={()=>edit(l)} style={{padding:'4px 12px', borderRadius:6, border:'1px solid #334155', background:'transparent', color:'#94a3b8', cursor:'pointer', fontSize:12}}>تعديل</button>
                        <button onClick={()=>del(l.id)} style={{padding:'4px 12px', borderRadius:6, border:'1px solid #7f1d1d', background:'transparent', color:'#f87171', cursor:'pointer', fontSize:12}}>حذف</button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          {filtered.length === 0 && <div style={{padding:40, textAlign:'center', color:'#64748b'}}>لا توجد دروس</div>}
        </div>
      </div>

      {/* Bulk Confirm Modal */}
      {showBulkConfirm && (
        <div style={{position:'fixed', inset:0, background:'rgba(0,0,0,0.7)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:200}}>
          <div style={{background:'#1e293b', borderRadius:16, padding:32, width:380, border:'1px solid #334155', textAlign:'center'}}>
            <div style={{fontSize:48, marginBottom:12}}>
              {bulkAction==='delete' ? '🗑️' : bulkAction==='activate' ? '✅' : '⏸️'}
            </div>
            <h2 style={{margin:'0 0 8px', color:'#e2e8f0', fontSize:18}}>
              {bulkAction==='delete' ? `حذف ${selected.size} درس؟` : bulkAction==='activate' ? `تفعيل ${selected.size} درس؟` : `إخفاء ${selected.size} درس؟`}
            </h2>
            <p style={{color:'#64748b', fontSize:14, margin:'0 0 24px'}}>
              {bulkAction==='delete' ? 'هذا الإجراء لا يمكن التراجع عنه!' : 'سيتم تطبيق التغيير على جميع الدروس المحددة.'}
            </p>
            <div style={{display:'flex', gap:12}}>
              <button onClick={executeBulk} disabled={saving} style={{
                flex:1, padding:'12px', borderRadius:8, border:'none', fontWeight:700, cursor:'pointer', fontSize:15,
                background: bulkAction==='delete' ? '#dc2626' : bulkAction==='activate' ? '#16a34a' : '#d97706',
                color:'#fff'
              }}>
                {saving ? 'جاري...' : 'تأكيد'}
              </button>
              <button onClick={()=>{setShowBulkConfirm(false);setBulkAction('')}} style={{padding:'12px 24px', borderRadius:8, border:'1px solid #334155', background:'transparent', color:'#94a3b8', cursor:'pointer'}}>
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add/Edit Form Modal */}
      {showForm && (
        <div style={{position:'fixed', inset:0, background:'rgba(0,0,0,0.7)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:100}}>
          <div style={{background:'#1e293b', borderRadius:16, padding:32, width:'100%', maxWidth:600, maxHeight:'90vh', overflowY:'auto', border:'1px solid #334155'}}>
            <h2 style={{margin:'0 0 24px', color:'#e2e8f0'}}>{editing ? 'تعديل درس' : 'درس جديد'}</h2>
            <div style={{display:'grid', gap:16}}>
              <div>
                <label style={{display:'block', fontSize:13, color:'#94a3b8', marginBottom:6}}>المسار *</label>
                <select value={form.roadmap_id} onChange={e=>setForm({...form, roadmap_id:e.target.value})} style={{width:'100%', padding:'10px 12px', borderRadius:8, border:'1px solid #334155', background:'#0f172a', color:'#fff', fontSize:14}}>
                  <option value="">اختر المسار</option>
                  {roadmaps.map(r => <option key={r.id} value={r.id}>{r.title_ar}</option>)}
                </select>
              </div>
              <div>
                <label style={{display:'block', fontSize:13, color:'#94a3b8', marginBottom:6}}>عنوان الدرس *</label>
                <input value={form.title_ar} onChange={e=>setForm({...form, title_ar:e.target.value})} placeholder="مثال: مقدمة في n8n" style={{width:'100%', padding:'10px 12px', borderRadius:8, border:'1px solid #334155', background:'#0f172a', color:'#fff', fontSize:14, boxSizing:'border-box'}}/>
              </div>
              <div>
                <label style={{display:'block', fontSize:13, color:'#94a3b8', marginBottom:6}}>وصف الدرس</label>
                <textarea value={form.description_ar} onChange={e=>setForm({...form, description_ar:e.target.value})} rows={3} style={{width:'100%', padding:'10px 12px', borderRadius:8, border:'1px solid #334155', background:'#0f172a', color:'#fff', fontSize:14, boxSizing:'border-box', resize:'vertical'}}/>
              </div>
              <div>
                <label style={{display:'block', fontSize:13, color:'#94a3b8', marginBottom:6}}>محتوى الدرس</label>
                <textarea value={form.content_ar} onChange={e=>setForm({...form, content_ar:e.target.value})} rows={5} style={{width:'100%', padding:'10px 12px', borderRadius:8, border:'1px solid #334155', background:'#0f172a', color:'#fff', fontSize:13, boxSizing:'border-box', resize:'vertical', fontFamily:'monospace'}}/>
              </div>
              <div>
                <label style={{display:'block', fontSize:13, color:'#94a3b8', marginBottom:6}}>رابط الفيديو</label>
                <input value={form.video_url||''} onChange={e=>setForm({...form, video_url:e.target.value})} placeholder="https://youtube.com/watch?v=..." style={{width:'100%', padding:'10px 12px', borderRadius:8, border:'1px solid #334155', background:'#0f172a', color:'#fff', fontSize:14, boxSizing:'border-box'}}/>
              </div>
              <div style={{display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:12}}>
                {[['xp_reward','XP'],['duration_minutes','الوقت (د)'],['sort_order','الترتيب']].map(([k,l])=>(
                  <div key={k}>
                    <label style={{display:'block', fontSize:13, color:'#94a3b8', marginBottom:6}}>{l}</label>
                    <input type="number" value={form[k]} onChange={e=>setForm({...form,[k]:e.target.value})} style={{width:'100%', padding:'10px 12px', borderRadius:8, border:'1px solid #334155', background:'#0f172a', color:'#fff', fontSize:14, boxSizing:'border-box'}}/>
                  </div>
                ))}
              </div>
              <div style={{display:'flex', gap:12, alignItems:'flex-end'}}>
                <div style={{flex:1}}>
                  <label style={{display:'block', fontSize:13, color:'#94a3b8', marginBottom:6}}>النوع</label>
                  <select value={form.lesson_type} onChange={e=>setForm({...form, lesson_type:e.target.value})} style={{width:'100%', padding:'10px 12px', borderRadius:8, border:'1px solid #334155', background:'#0f172a', color:'#fff', fontSize:14}}>
                    <option value="video">فيديو</option>
                    <option value="text">نص</option>
                    <option value="quiz">اختبار</option>
                  </select>
                </div>
                <label style={{display:'flex', alignItems:'center', gap:8, cursor:'pointer', marginBottom:8}}>
                  <input type="checkbox" checked={form.is_active} onChange={e=>setForm({...form, is_active:e.target.checked})} style={{width:18, height:18}}/>
                  <span style={{color:'#e2e8f0', fontSize:14}}>نشط</span>
                </label>
              </div>
            </div>
            <div style={{display:'flex', gap:12, marginTop:24}}>
              <button onClick={save} disabled={saving} style={{flex:1, padding:'12px', borderRadius:8, border:'none', background:'#58CC02', color:'#fff', fontWeight:700, cursor:'pointer', fontSize:15}}>
                {saving ? 'جاري الحفظ...' : editing ? 'تحديث' : 'إضافة'}
              </button>
              <button onClick={()=>{setShowForm(false);setForm(EMPTY);setEditing(null)}} style={{padding:'12px 24px', borderRadius:8, border:'1px solid #334155', background:'transparent', color:'#94a3b8', cursor:'pointer'}}>إلغاء</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
