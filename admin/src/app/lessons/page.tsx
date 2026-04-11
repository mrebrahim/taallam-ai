'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const H = { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}`, 'Content-Type': 'application/json', 'Prefer': 'return=representation' }

const EMPTY = {
  title_ar: '', title: '', description_ar: '',
  xp_reward: 50, video_duration_seconds: 600,
  lesson_type: 'video' as const,
  is_active: true, is_free: false, sort_order: 1,
  vimeo_id: '', vimeo_url: '', video_url: '', roadmap_id: '',
}

// Extract Vimeo ID from various URL formats
function extractVimeoId(input: string): string {
  if (!input) return ''
  // Already just an ID
  if (/^\d+$/.test(input.trim())) return input.trim()
  // vimeo.com/123456789
  const m1 = input.match(/vimeo\.com\/(\d+)/)
  if (m1) return m1[1]
  // player.vimeo.com/video/123456789
  const m2 = input.match(/video\/(\d+)/)
  if (m2) return m2[1]
  return input.trim()
}

export default function LessonsPage() {
  const [lessons, setLessons] = useState<any[]>([])
  const [roadmaps, setRoadmaps] = useState<any[]>([])
  const [form, setForm] = useState<any>(EMPTY)
  const [editing, setEditing] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [filter, setFilter] = useState('')
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [bulkAction, setBulkAction] = useState<'delete'|'activate'|'deactivate'|''>('')
  const [showBulkConfirm, setShowBulkConfirm] = useState(false)
  const [vimeoPreview, setVimeoPreview] = useState<string | null>(null)

  useEffect(() => { load() }, [])

  const load = async () => {
    const [l, r] = await Promise.all([
      fetch(`${SUPABASE_URL}/rest/v1/lessons?select=*,roadmaps(title_ar,slug)&order=roadmap_id,sort_order`, { headers: H }).then(r=>r.json()),
      fetch(`${SUPABASE_URL}/rest/v1/roadmaps?select=*&order=sort_order`, { headers: H }).then(r=>r.json()),
    ])
    setLessons(Array.isArray(l) ? l : [])
    setRoadmaps(Array.isArray(r) ? r : [])
    setSelected(new Set())
  }

  // Auto-extract Vimeo ID when URL is pasted
  const handleVimeoInput = (value: string) => {
    const id = extractVimeoId(value)
    setForm({ ...form, vimeo_url: value, vimeo_id: id })
    if (id && /^\d+$/.test(id)) {
      setVimeoPreview(`https://player.vimeo.com/video/${id}?title=0&byline=0&portrait=0`)
    } else {
      setVimeoPreview(null)
    }
  }

  const save = async () => {
    if (!form.roadmap_id) { setMsg('❌ اختر المسار أولاً'); setTimeout(()=>setMsg(''),3000); return }
    if (!form.title_ar) { setMsg('❌ اكتب عنوان الدرس'); setTimeout(()=>setMsg(''),3000); return }
    if (!form.vimeo_id && !form.video_url) { setMsg('❌ أضف رابط Vimeo أو YouTube'); setTimeout(()=>setMsg(''),3000); return }

    setSaving(true)
    const vimeoId = extractVimeoId(form.vimeo_url || form.vimeo_id)
    
    const payload: any = {
      roadmap_id: form.roadmap_id,
      title_ar: form.title_ar,
      title: form.title || form.title_ar,
      description_ar: form.description_ar || null,
      lesson_type: form.lesson_type,
      vimeo_id: vimeoId || null,
      vimeo_url: form.vimeo_url || null,
      video_url: form.video_url || null,
      video_duration_seconds: Number(form.video_duration_seconds) || 600,
      xp_reward: Number(form.xp_reward) || 50,
      sort_order: Number(form.sort_order) || 1,
      is_active: form.is_active,
      is_free: form.is_free,
    }

    let res: Response
    if (editing) {
      res = await fetch(`${SUPABASE_URL}/rest/v1/lessons?id=eq.${editing}`, { method:'PATCH', headers: H, body: JSON.stringify(payload) })
    } else {
      res = await fetch(`${SUPABASE_URL}/rest/v1/lessons`, { method:'POST', headers: H, body: JSON.stringify(payload) })
    }

    if (res.ok || res.status === 201) {
      setMsg(editing ? '✅ تم التحديث' : '✅ تم إضافة الدرس')
      setForm(EMPTY); setEditing(null); setShowForm(false); setVimeoPreview(null); load()
    } else {
      const err = await res.json().catch(()=>({}))
      setMsg('❌ خطأ: ' + (err?.message || err?.details || res.status))
    }
    setSaving(false)
    setTimeout(() => setMsg(''), 4000)
  }

  const del = async (id: string) => {
    if (!confirm('حذف الدرس؟')) return
    await fetch(`${SUPABASE_URL}/rest/v1/lessons?id=eq.${id}`, { method:'DELETE', headers: H })
    load()
  }

  const edit = (l: any) => {
    setForm({ ...EMPTY, ...l, roadmap_id: l.roadmap_id || '' })
    setEditing(l.id)
    if (l.vimeo_id) setVimeoPreview(`https://player.vimeo.com/video/${l.vimeo_id}?title=0&byline=0&portrait=0`)
    setShowForm(true)
  }

  const filtered = lessons.filter(l => !filter || l.roadmap_id === filter)
  const toggleSelect = (id: string) => setSelected(prev => { const n = new Set(prev); n.has(id)?n.delete(id):n.add(id); return n })
  const toggleAll = () => setSelected(selected.size===filtered.length ? new Set() : new Set(filtered.map(l=>l.id)))

  const executeBulk = async () => {
    setSaving(true)
    const ids = Array.from(selected)
    if (bulkAction === 'delete') {
      await Promise.all(ids.map(id => fetch(`${SUPABASE_URL}/rest/v1/lessons?id=eq.${id}`, { method:'DELETE', headers: H })))
      setMsg(`✅ تم حذف ${ids.length} درس`)
    } else {
      const val = bulkAction === 'activate'
      await Promise.all(ids.map(id => fetch(`${SUPABASE_URL}/rest/v1/lessons?id=eq.${id}`, { method:'PATCH', headers: H, body: JSON.stringify({ is_active: val }) })))
      setMsg(`✅ تم ${val?'تفعيل':'إخفاء'} ${ids.length} درس`)
    }
    setSaving(false); setShowBulkConfirm(false); setBulkAction(''); load()
    setTimeout(()=>setMsg(''), 3000)
  }

  const COLORS: Record<string, string> = { n8n_automation:'#58CC02', ai_video:'#FF9600', vibe_coding:'#CE82FF' }
  const allSelected = filtered.length > 0 && selected.size === filtered.length
  const someSelected = selected.size > 0

  return (
    <div style={{minHeight:'100vh', background:'#0f172a', color:'#fff', fontFamily:'system-ui,sans-serif'}}>
      <header style={{background:'#1e293b', borderBottom:'1px solid #334155', padding:'16px 32px', display:'flex', alignItems:'center', gap:16}}>
        <Link href="/" style={{color:'#64748b', textDecoration:'none', fontSize:20}}>←</Link>
        <h1 style={{margin:0, fontSize:20, fontWeight:800, color:'#e2e8f0'}}>📚 إدارة الدروس</h1>
        <button onClick={()=>{setForm(EMPTY);setEditing(null);setVimeoPreview(null);setShowForm(true)}}
          style={{marginRight:'auto', padding:'8px 20px', borderRadius:8, border:'none', background:'#58CC02', color:'#fff', fontWeight:700, cursor:'pointer'}}>
          + درس جديد
        </button>
      </header>

      {msg && <div style={{background:msg.startsWith('✅')?'#166534':'#7f1d1d', color:msg.startsWith('✅')?'#bbf7d0':'#fca5a5', padding:'12px 32px', fontSize:14, fontWeight:600}}>{msg}</div>}

      <div style={{padding:32, maxWidth:1400, margin:'0 auto'}}>
        {/* Filter Tabs */}
        <div style={{display:'flex', gap:8, marginBottom:16, flexWrap:'wrap'}}>
          <button onClick={()=>{setFilter('');setSelected(new Set())}} style={{padding:'6px 16px', borderRadius:8, border:'none', background:filter===''?'#58CC02':'#1e293b', color:'#fff', cursor:'pointer', fontWeight:600, fontSize:13}}>
            الكل ({lessons.length})
          </button>
          {roadmaps.map(r => (
            <button key={r.id} onClick={()=>{setFilter(r.id);setSelected(new Set())}}
              style={{padding:'6px 16px', borderRadius:8, border:'none', background:filter===r.id?(COLORS[r.slug]||'#58CC02'):'#1e293b', color:'#fff', cursor:'pointer', fontWeight:600, fontSize:13}}>
              {r.slug==='n8n_automation'?'⚡':r.slug==='ai_video'?'🎬':'💻'} {r.title_ar} ({lessons.filter(l=>l.roadmap_id===r.id).length})
            </button>
          ))}
        </div>

        {/* Bulk Bar */}
        <div style={{display:'flex', alignItems:'center', gap:12, marginBottom:12, padding:'10px 16px', background:'#1e293b', borderRadius:10, border:'1px solid #334155'}}>
          <div onClick={toggleAll} style={{width:20, height:20, borderRadius:4, border:`2px solid ${allSelected?'#58CC02':'#475569'}`, background:allSelected?'#58CC02':someSelected?'#1e3a2e':'transparent', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', flexShrink:0}}>
            {allSelected && <span style={{color:'#fff', fontSize:13, fontWeight:900}}>✓</span>}
            {someSelected && !allSelected && <span style={{color:'#58CC02', fontSize:14, lineHeight:1}}>—</span>}
          </div>
          <span style={{fontSize:13, color:someSelected?'#e2e8f0':'#64748b'}}>{someSelected?`${selected.size} محدد`:'تحديد الكل'}</span>
          {someSelected && (<>
            <div style={{width:1, height:24, background:'#334155'}}/>
            <button onClick={()=>{setBulkAction('activate');setShowBulkConfirm(true)}} style={{padding:'4px 12px', borderRadius:6, border:'1px solid #166534', background:'transparent', color:'#4ade80', cursor:'pointer', fontSize:12, fontWeight:600}}>✅ تفعيل</button>
            <button onClick={()=>{setBulkAction('deactivate');setShowBulkConfirm(true)}} style={{padding:'4px 12px', borderRadius:6, border:'1px solid #854d0e', background:'transparent', color:'#fbbf24', cursor:'pointer', fontSize:12, fontWeight:600}}>⏸️ إخفاء</button>
            <button onClick={()=>{setBulkAction('delete');setShowBulkConfirm(true)}} style={{padding:'4px 12px', borderRadius:6, border:'1px solid #7f1d1d', background:'transparent', color:'#f87171', cursor:'pointer', fontSize:12, fontWeight:600}}>🗑️ حذف ({selected.size})</button>
            <button onClick={()=>setSelected(new Set())} style={{padding:'4px 12px', borderRadius:6, border:'1px solid #334155', background:'transparent', color:'#64748b', cursor:'pointer', fontSize:12}}>✕</button>
          </>)}
          <span style={{marginRight:'auto', fontSize:12, color:'#475569'}}>{filtered.length} درس</span>
        </div>

        {/* Table */}
        <div style={{background:'#1e293b', borderRadius:12, border:'1px solid #334155', overflow:'hidden'}}>
          <table style={{width:'100%', borderCollapse:'collapse'}}>
            <thead>
              <tr style={{borderBottom:'1px solid #334155', background:'#0f172a'}}>
                <th style={{padding:'10px 12px', width:36}}></th>
                {['#','العنوان','المسار','الفيديو','XP','الوقت','الحالة',''].map(h=>(
                  <th key={h} style={{padding:'10px 12px', textAlign:'right', fontSize:11, color:'#64748b', fontWeight:600}}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((l, i) => {
                const isSel = selected.has(l.id)
                const hasVimeo = l.vimeo_id || l.vimeo_url
                const hasYoutube = l.video_url
                return (
                  <tr key={l.id} style={{borderBottom:'1px solid #1e293b', background:isSel?'#1e3a2e':i%2===0?'transparent':'#ffffff05'}}>
                    <td style={{padding:'10px 12px', textAlign:'center'}}>
                      <div onClick={()=>toggleSelect(l.id)} style={{width:16, height:16, borderRadius:3, border:`2px solid ${isSel?'#58CC02':'#475569'}`, background:isSel?'#58CC02':'transparent', display:'inline-flex', alignItems:'center', justifyContent:'center', cursor:'pointer'}}>
                        {isSel && <span style={{color:'#fff', fontSize:10, fontWeight:900}}>✓</span>}
                      </div>
                    </td>
                    <td style={{padding:'10px 12px', color:'#64748b', fontSize:12}}>{l.sort_order}</td>
                    <td style={{padding:'10px 12px'}}>
                      <div style={{fontWeight:600, color:'#e2e8f0', fontSize:14}}>{l.title_ar}</div>
                      {l.description_ar && <div style={{fontSize:11, color:'#64748b', marginTop:1, maxWidth:200, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap'}}>{l.description_ar}</div>}
                    </td>
                    <td style={{padding:'10px 12px'}}>
                      <span style={{background:(COLORS[l.roadmaps?.slug]||'#58CC02')+'25', color:COLORS[l.roadmaps?.slug]||'#58CC02', borderRadius:6, padding:'2px 8px', fontSize:11, fontWeight:700}}>
                        {l.roadmaps?.title_ar||'—'}
                      </span>
                    </td>
                    <td style={{padding:'10px 12px'}}>
                      {hasVimeo ? (
                        <span style={{background:'#1a3a5c', color:'#60a5fa', borderRadius:6, padding:'3px 8px', fontSize:11, fontWeight:700, display:'flex', alignItems:'center', gap:4, width:'fit-content'}}>
                          <span>🎬</span> Vimeo {l.vimeo_id}
                        </span>
                      ) : hasYoutube ? (
                        <span style={{background:'#3a1a1a', color:'#f87171', borderRadius:6, padding:'3px 8px', fontSize:11, fontWeight:700, display:'flex', alignItems:'center', gap:4, width:'fit-content'}}>
                          <span>📺</span> YouTube
                        </span>
                      ) : (
                        <span style={{color:'#475569', fontSize:12}}>—</span>
                      )}
                    </td>
                    <td style={{padding:'10px 12px', color:'#fbbf24', fontWeight:700, fontSize:13}}>{l.xp_reward}</td>
                    <td style={{padding:'10px 12px', color:'#94a3b8', fontSize:12}}>{Math.floor((l.video_duration_seconds||600)/60)}د</td>
                    <td style={{padding:'10px 12px'}}>
                      <span style={{background:l.is_active?'#166534':'#7f1d1d', color:l.is_active?'#bbf7d0':'#fca5a5', borderRadius:6, padding:'2px 8px', fontSize:11}}>
                        {l.is_active?'نشط':'مخفي'}
                      </span>
                    </td>
                    <td style={{padding:'10px 12px'}}>
                      <div style={{display:'flex', gap:6}}>
                        <button onClick={()=>edit(l)} style={{padding:'3px 10px', borderRadius:5, border:'1px solid #334155', background:'transparent', color:'#94a3b8', cursor:'pointer', fontSize:11}}>تعديل</button>
                        <button onClick={()=>del(l.id)} style={{padding:'3px 10px', borderRadius:5, border:'1px solid #7f1d1d', background:'transparent', color:'#f87171', cursor:'pointer', fontSize:11}}>حذف</button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          {filtered.length===0 && <div style={{padding:40, textAlign:'center', color:'#64748b'}}>لا توجد دروس — اضغط "+ درس جديد"</div>}
        </div>
      </div>

      {/* Bulk Confirm */}
      {showBulkConfirm && (
        <div style={{position:'fixed', inset:0, background:'rgba(0,0,0,0.75)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:200}}>
          <div style={{background:'#1e293b', borderRadius:16, padding:32, width:360, border:'1px solid #334155', textAlign:'center'}}>
            <div style={{fontSize:48, marginBottom:12}}>{bulkAction==='delete'?'🗑️':bulkAction==='activate'?'✅':'⏸️'}</div>
            <h2 style={{margin:'0 0 8px', color:'#e2e8f0', fontSize:18}}>{bulkAction==='delete'?`حذف ${selected.size} درس؟`:bulkAction==='activate'?`تفعيل ${selected.size} درس؟`:`إخفاء ${selected.size} درس؟`}</h2>
            <p style={{color:'#64748b', fontSize:13, margin:'0 0 24px'}}>{bulkAction==='delete'?'لا يمكن التراجع!':'سيتم تطبيق التغيير فوراً.'}</p>
            <div style={{display:'flex', gap:12}}>
              <button onClick={executeBulk} disabled={saving} style={{flex:1, padding:'12px', borderRadius:8, border:'none', fontWeight:700, cursor:'pointer', fontSize:15, background:bulkAction==='delete'?'#dc2626':bulkAction==='activate'?'#16a34a':'#d97706', color:'#fff'}}>
                {saving?'جاري...':'تأكيد'}
              </button>
              <button onClick={()=>{setShowBulkConfirm(false);setBulkAction('')}} style={{padding:'12px 20px', borderRadius:8, border:'1px solid #334155', background:'transparent', color:'#94a3b8', cursor:'pointer'}}>إلغاء</button>
            </div>
          </div>
        </div>
      )}

      {/* Add/Edit Form */}
      {showForm && (
        <div style={{position:'fixed', inset:0, background:'rgba(0,0,0,0.8)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:100}}>
          <div style={{background:'#1e293b', borderRadius:16, padding:32, width:'100%', maxWidth:680, maxHeight:'94vh', overflowY:'auto', border:'1px solid #334155'}}>
            <h2 style={{margin:'0 0 24px', color:'#e2e8f0', fontSize:18}}>{editing?'✏️ تعديل درس':'➕ درس جديد'}</h2>
            
            <div style={{display:'grid', gap:16}}>
              {/* Roadmap Selection */}
              <div>
                <label style={{display:'block', fontSize:12, color:'#94a3b8', marginBottom:8, fontWeight:600}}>المسار *</label>
                <div style={{display:'flex', gap:8}}>
                  {roadmaps.map(r=>(
                    <button key={r.id} type="button" onClick={()=>setForm({...form,roadmap_id:r.id})}
                      style={{flex:1, padding:'12px 8px', borderRadius:8, border:`2px solid ${form.roadmap_id===r.id?(COLORS[r.slug]||'#58CC02'):'#334155'}`, background:form.roadmap_id===r.id?(COLORS[r.slug]||'#58CC02')+'20':'transparent', color:form.roadmap_id===r.id?(COLORS[r.slug]||'#58CC02'):'#64748b', cursor:'pointer', fontWeight:700, fontSize:13, display:'flex', flexDirection:'column', alignItems:'center', gap:4}}>
                      <span style={{fontSize:20}}>{r.slug==='n8n_automation'?'⚡':r.slug==='ai_video'?'🎬':'💻'}</span>
                      <span>{r.title_ar}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Title */}
              <div>
                <label style={{display:'block', fontSize:12, color:'#94a3b8', marginBottom:6, fontWeight:600}}>عنوان الدرس *</label>
                <input value={form.title_ar} onChange={e=>setForm({...form,title_ar:e.target.value,title:e.target.value})} placeholder="مثال: مقدمة في n8n" style={{width:'100%', padding:'10px 12px', borderRadius:8, border:`1px solid ${form.title_ar?'#58CC02':'#334155'}`, background:'#0f172a', color:'#fff', fontSize:14, boxSizing:'border-box'}}/>
              </div>

              {/* Description */}
              <div>
                <label style={{display:'block', fontSize:12, color:'#94a3b8', marginBottom:6, fontWeight:600}}>وصف الدرس</label>
                <textarea value={form.description_ar||''} onChange={e=>setForm({...form,description_ar:e.target.value})} rows={2} placeholder="ماذا سيتعلم الطالب..." style={{width:'100%', padding:'10px 12px', borderRadius:8, border:'1px solid #334155', background:'#0f172a', color:'#fff', fontSize:13, boxSizing:'border-box', resize:'vertical'}}/>
              </div>

              {/* ══ VIMEO SECTION ══ */}
              <div style={{background:'#0f172a', borderRadius:12, padding:16, border:'2px solid #1d4ed8'}}>
                <div style={{display:'flex', alignItems:'center', gap:8, marginBottom:12}}>
                  <span style={{fontSize:20}}>🎬</span>
                  <span style={{fontWeight:700, color:'#60a5fa', fontSize:15}}>Vimeo (مُوصى به)</span>
                  <span style={{background:'#1d4ed820', color:'#60a5fa', borderRadius:6, padding:'2px 8px', fontSize:11}}>بدون روابط جانبية</span>
                </div>

                <label style={{display:'block', fontSize:12, color:'#94a3b8', marginBottom:6, fontWeight:600}}>رابط أو ID الفيديو من Vimeo</label>
                <input 
                  value={form.vimeo_url||''} 
                  onChange={e=>handleVimeoInput(e.target.value)} 
                  placeholder="https://vimeo.com/123456789  أو  123456789"
                  style={{width:'100%', padding:'10px 12px', borderRadius:8, border:`1px solid ${form.vimeo_id?'#1d4ed8':'#334155'}`, background:'#1e293b', color:'#fff', fontSize:14, boxSizing:'border-box', fontFamily:'monospace'}}
                />
                {form.vimeo_id && (
                  <div style={{marginTop:8, display:'flex', alignItems:'center', gap:8}}>
                    <span style={{background:'#1d4ed820', color:'#60a5fa', borderRadius:6, padding:'4px 10px', fontSize:12, fontWeight:700}}>
                      ✅ Vimeo ID: {form.vimeo_id}
                    </span>
                  </div>
                )}

                {/* Vimeo Preview */}
                {vimeoPreview && (
                  <div style={{marginTop:12}}>
                    <div style={{fontSize:12, color:'#64748b', marginBottom:6}}>معاينة الفيديو:</div>
                    <div style={{position:'relative', paddingBottom:'56.25%', borderRadius:8, overflow:'hidden', background:'#000'}}>
                      <iframe
                        src={vimeoPreview}
                        style={{position:'absolute', top:0, left:0, width:'100%', height:'100%', border:'none'}}
                        allow="autoplay; fullscreen; picture-in-picture"
                        allowFullScreen
                      />
                    </div>
                  </div>
                )}

                {/* How to get Vimeo URL */}
                <div style={{marginTop:12, background:'#1e293b', borderRadius:8, padding:10, fontSize:12, color:'#64748b', lineHeight:1.6}}>
                  <strong style={{color:'#94a3b8'}}>كيف تحصل على رابط Vimeo:</strong><br/>
                  1. افتح الفيديو على Vimeo<br/>
                  2. اضغط Share أو Copy Link<br/>
                  3. الصق الرابط هنا — هنستخرج الـ ID تلقائياً ✨
                </div>
              </div>

              {/* YouTube Fallback */}
              <div style={{background:'#0f172a', borderRadius:12, padding:16, border:'1px solid #334155'}}>
                <div style={{display:'flex', alignItems:'center', gap:8, marginBottom:12}}>
                  <span style={{fontSize:18}}>📺</span>
                  <span style={{fontWeight:600, color:'#94a3b8', fontSize:14}}>YouTube (اختياري — احتياطي)</span>
                </div>
                <input value={form.video_url||''} onChange={e=>setForm({...form,video_url:e.target.value})} placeholder="https://youtube.com/watch?v=..." style={{width:'100%', padding:'10px 12px', borderRadius:8, border:'1px solid #334155', background:'#1e293b', color:'#fff', fontSize:14, boxSizing:'border-box', fontFamily:'monospace'}}/>
              </div>

              {/* Numbers */}
              <div style={{display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:10}}>
                {[['xp_reward','XP','#fbbf24'],['video_duration_seconds','المدة (ثانية)','#94a3b8'],['sort_order','الترتيب','#94a3b8']].map(([k,l,c])=>(
                  <div key={k}>
                    <label style={{display:'block', fontSize:12, color:'#94a3b8', marginBottom:6, fontWeight:600}}>{l}</label>
                    <input type="number" value={form[k]} onChange={e=>setForm({...form,[k]:e.target.value})} style={{width:'100%', padding:'10px 12px', borderRadius:8, border:'1px solid #334155', background:'#0f172a', color:c, fontSize:14, boxSizing:'border-box', fontWeight:k==='xp_reward'?700:400}}/>
                  </div>
                ))}
              </div>

              {/* Type + Toggles */}
              <div style={{display:'flex', gap:16, alignItems:'center', flexWrap:'wrap'}}>
                <div style={{flex:1, minWidth:120}}>
                  <label style={{display:'block', fontSize:12, color:'#94a3b8', marginBottom:6, fontWeight:600}}>النوع</label>
                  <select value={form.lesson_type} onChange={e=>setForm({...form,lesson_type:e.target.value})} style={{width:'100%', padding:'10px 12px', borderRadius:8, border:'1px solid #334155', background:'#0f172a', color:'#fff', fontSize:14}}>
                    <option value="video">🎬 فيديو</option>
                    <option value="quiz">❓ اختبار</option>
                    <option value="task">📝 مهمة</option>
                  </select>
                </div>
                <label style={{display:'flex', alignItems:'center', gap:8, cursor:'pointer', marginTop:18}}>
                  <input type="checkbox" checked={form.is_active} onChange={e=>setForm({...form,is_active:e.target.checked})} style={{width:16,height:16}}/>
                  <span style={{color:'#e2e8f0', fontSize:13}}>نشط ومرئي</span>
                </label>
                <label style={{display:'flex', alignItems:'center', gap:8, cursor:'pointer', marginTop:18}}>
                  <input type="checkbox" checked={form.is_free} onChange={e=>setForm({...form,is_free:e.target.checked})} style={{width:16,height:16}}/>
                  <span style={{color:'#e2e8f0', fontSize:13}}>🆓 مجاني</span>
                </label>
              </div>
            </div>

            <div style={{display:'flex', gap:12, marginTop:24}}>
              <button onClick={save} disabled={saving} style={{flex:1, padding:'13px', borderRadius:8, border:'none', background:saving?'#334155':'#58CC02', color:'#fff', fontWeight:800, cursor:saving?'not-allowed':'pointer', fontSize:15}}>
                {saving ? '⏳ جاري الحفظ...' : editing ? '💾 تحديث الدرس' : '✅ إضافة الدرس'}
              </button>
              <button onClick={()=>{setShowForm(false);setForm(EMPTY);setEditing(null);setVimeoPreview(null)}} style={{padding:'13px 24px', borderRadius:8, border:'1px solid #334155', background:'transparent', color:'#94a3b8', cursor:'pointer'}}>إلغاء</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
