'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'

const URL2 = process.env.NEXT_PUBLIC_SUPABASE_URL!
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const SVC = process.env.SUPABASE_SERVICE_ROLE_KEY!
const H = { 'apikey': SVC||ANON, 'Authorization': `Bearer ${SVC||ANON}`, 'Content-Type': 'application/json', 'Prefer': 'return=representation' }
const HR = { 'apikey': ANON, 'Authorization': `Bearer ${ANON}` }

const EMPTY = { title_ar:'', title_en:'', description_ar:'', slug:'', price_egp:0, is_active:true, sort_order:0, icon:'⚡', color:'#58CC02', cta_label_ar:'تواصل الآن', cta_type:'whatsapp', cta_url:'', cta2_label_ar:'', cta2_type:'whatsapp', cta2_url:'' }

export default function RoadmapsPage() {
  const [roadmaps, setRoadmaps] = useState<any[]>([])
  const [form, setForm] = useState<any>(EMPTY)
  const [editing, setEditing] = useState<string|null>(null)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')
  const [waPhone, setWaPhone] = useState('201027555789')
  const [waPrefix, setWaPrefix] = useState('أريد الاستفسار عن')
  const [copied, setCopied] = useState('')

  const load = () => {
    fetch(`${URL2}/rest/v1/roadmaps?select=*&order=sort_order`, { headers: HR }).then(r=>r.json()).then(d=>setRoadmaps(d||[]))
    fetch(`${URL2}/rest/v1/app_settings?select=key,value`, { headers: HR }).then(r=>r.json()).then((d:any[])=>{
      d?.forEach(s=>{ if(s.key==='whatsapp_number') setWaPhone(s.value); if(s.key==='whatsapp_message_prefix') setWaPrefix(s.value) })
    })
  }
  useEffect(()=>{ load() },[])

  const save = async () => {
    if (!form.title_ar || !form.slug) return setMsg('⚠️ الاسم والـ slug مطلوبين')
    setSaving(true)
    const body = { title_ar:form.title_ar, title_en:form.title_en||'', description_ar:form.description_ar||'', slug:form.slug, price_egp:parseFloat(form.price_egp)||0, is_active:form.is_active, sort_order:parseInt(form.sort_order)||0, icon:form.icon||'⚡', color:form.color||'#58CC02', cta_label_ar:form.cta_label_ar||'تواصل الآن', cta_type:form.cta_type||'whatsapp', cta_url:form.cta_url||null, cta2_label_ar:form.cta2_label_ar||null, cta2_type:form.cta2_type||'whatsapp', cta2_url:form.cta2_url||null }
    if (editing === 'new') {
      await fetch(`${URL2}/rest/v1/roadmaps`, { method:'POST', headers:H, body:JSON.stringify(body) })
      setMsg('✅ تم إنشاء المسار!')
    } else {
      await fetch(`${URL2}/rest/v1/roadmaps?id=eq.${editing}`, { method:'PATCH', headers:H, body:JSON.stringify(body) })
      setMsg('✅ تم الحفظ!')
    }
    setSaving(false); setEditing(null); load()
    setTimeout(()=>setMsg(''),3000)
  }

  const inp = { padding:'10px 12px', borderRadius:8, border:'1px solid #334155', background:'#0f172a', color:'#fff', fontSize:14, width:'100%', boxSizing:'border-box' as const }
  const lbl = { fontSize:12, color:'#94a3b8', marginBottom:4, display:'block' }
  const g2 = { display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }
  const btn = (c='#58CC02') => ({ padding:'10px 20px', borderRadius:10, border:'none', background:c, color:'#fff', fontWeight:700, fontSize:14, cursor:'pointer' })
  const buildWA = (name:string) => `https://wa.me/${waPhone}?text=${encodeURIComponent(`${waPrefix} ${name}`)}`

  return (
    <div style={{minHeight:'100vh', background:'#0f172a', color:'#fff', fontFamily:'system-ui,sans-serif'}}>
      <header style={{background:'#1e293b', borderBottom:'1px solid #334155', padding:'16px 32px', display:'flex', alignItems:'center', justifyContent:'space-between'}}>
        <div style={{display:'flex',alignItems:'center',gap:16}}>
          <Link href="/" style={{color:'#64748b',textDecoration:'none',fontSize:20}}>←</Link>
          <h1 style={{margin:0,fontSize:20,fontWeight:800,color:'#e2e8f0'}}>🗺️ المسارات</h1>
        </div>
        <button style={btn()} onClick={()=>{setForm({...EMPTY});setEditing('new')}}>+ مسار جديد</button>
      </header>

      <div style={{padding:32, maxWidth:1100, margin:'0 auto'}}>
        {msg && <div style={{background:'#1e293b',border:'1px solid #334155',borderRadius:10,padding:'12px 20px',marginBottom:16}}>{msg}</div>}

        {editing && (
          <div style={{background:'#1e293b',borderRadius:16,padding:28,border:'2px solid #58CC02',marginBottom:20}}>
            <h2 style={{margin:'0 0 20px',fontSize:16,fontWeight:800,color:'#58CC02'}}>{editing==='new'?'+ إنشاء مسار جديد':'✏️ تعديل المسار'}</h2>
            <div style={{...g2,marginBottom:12}}>
              <div><label style={lbl}>الاسم بالعربي *</label><input style={inp} value={form.title_ar||''} onChange={e=>setForm({...form,title_ar:e.target.value})} /></div>
              <div><label style={lbl}>الاسم بالإنجليزي</label><input style={inp} value={form.title_en||''} onChange={e=>setForm({...form,title_en:e.target.value})} /></div>
            </div>
            <div style={{marginBottom:12}}><label style={lbl}>الوصف</label><textarea style={{...inp,height:60,resize:'vertical' as const}} value={form.description_ar||''} onChange={e=>setForm({...form,description_ar:e.target.value})} /></div>
            <div style={{...g2,marginBottom:12}}>
              <div><label style={lbl}>Slug * (مثال: n8n-automation)</label><input style={inp} value={form.slug||''} onChange={e=>setForm({...form,slug:e.target.value.toLowerCase().replace(/\s+/g,'-')})} /></div>
              <div><label style={lbl}>السعر (ج.م) — 0 = مجاني</label><input style={inp} type="number" value={form.price_egp||0} onChange={e=>setForm({...form,price_egp:e.target.value})} /></div>
            </div>
            <div style={{...g2,marginBottom:16}}>
              <div><label style={lbl}>الأيقونة (emoji)</label><input style={inp} value={form.icon||'⚡'} onChange={e=>setForm({...form,icon:e.target.value})} /></div>
              <div style={{display:'flex',alignItems:'center',gap:10,paddingTop:20}}>
                <input type="checkbox" checked={form.is_active} onChange={e=>setForm({...form,is_active:e.target.checked})} id="act" />
                <label htmlFor="act" style={{color:'#fff',fontSize:14,cursor:'pointer'}}>نشط (ظاهر في الأبلكيشن)</label>
              </div>
            </div>

            {/* CTA 1 */}
            <div style={{background:'#0f172a',borderRadius:10,padding:14,border:'1px solid #58CC02',marginBottom:10}}>
              <div style={{fontSize:12,color:'#58CC02',marginBottom:10,fontWeight:700}}>🟢 زرار CTA الأول</div>
              <div style={{...g2,marginBottom:form.cta_type!=='whatsapp'?10:0}}>
                <div><label style={lbl}>نص الزرار</label><input style={inp} placeholder="مثال: اشتري الآن" value={form.cta_label_ar||''} onChange={e=>setForm({...form,cta_label_ar:e.target.value})} /></div>
                <div><label style={lbl}>النوع</label>
                  <select style={inp} value={form.cta_type||'whatsapp'} onChange={e=>setForm({...form,cta_type:e.target.value})}>
                    <option value="whatsapp">💬 واتساب</option>
                    <option value="payment">💳 رابط دفع</option>
                    <option value="url">🔗 رابط خارجي</option>
                  </select>
                </div>
              </div>
              {form.cta_type!=='whatsapp' && <div><label style={lbl}>الرابط</label><input style={inp} placeholder="https://..." value={form.cta_url||''} onChange={e=>setForm({...form,cta_url:e.target.value})} /></div>}
            </div>

            {/* CTA 2 */}
            <div style={{background:'#0f172a',borderRadius:10,padding:14,border:'1px solid #334155',marginBottom:16}}>
              <div style={{fontSize:12,color:'#94a3b8',marginBottom:10,fontWeight:700}}>🔵 زرار CTA الثاني (اختياري)</div>
              <div style={{...g2,marginBottom:form.cta2_type!=='whatsapp'?10:0}}>
                <div><label style={lbl}>نص الزرار</label><input style={inp} placeholder="مثال: تواصل واتساب" value={form.cta2_label_ar||''} onChange={e=>setForm({...form,cta2_label_ar:e.target.value})} /></div>
                <div><label style={lbl}>النوع</label>
                  <select style={inp} value={form.cta2_type||'whatsapp'} onChange={e=>setForm({...form,cta2_type:e.target.value})}>
                    <option value="whatsapp">💬 واتساب</option>
                    <option value="payment">💳 رابط دفع</option>
                    <option value="url">🔗 رابط خارجي</option>
                  </select>
                </div>
              </div>
              {form.cta2_type!=='whatsapp' && form.cta2_label_ar && <div><label style={lbl}>الرابط</label><input style={inp} placeholder="https://..." value={form.cta2_url||''} onChange={e=>setForm({...form,cta2_url:e.target.value})} /></div>}
            </div>

            <div style={{display:'flex',gap:10}}>
              <button style={btn()} onClick={save} disabled={saving}>{saving?'جاري الحفظ...':'💾 حفظ'}</button>
              <button style={btn('#334155')} onClick={()=>setEditing(null)}>إلغاء</button>
            </div>
          </div>
        )}

        {roadmaps.length===0 && !editing ? (
          <div style={{textAlign:'center',padding:'60px 20px',color:'#64748b'}}>
            <div style={{fontSize:48,marginBottom:12}}>🗺️</div>
            <p>مفيش مسارات — اضغط "+ مسار جديد"</p>
          </div>
        ) : roadmaps.map(r => (
          <div key={r.id} style={{background:'#1e293b',borderRadius:14,padding:20,border:'1px solid #334155',marginBottom:12}}>
            <div style={{display:'flex',alignItems:'flex-start',gap:16}}>
              <div style={{width:48,height:48,borderRadius:12,background:(r.color||'#58CC02')+'33',display:'flex',alignItems:'center',justifyContent:'center',fontSize:22,flexShrink:0}}>{r.icon||'⚡'}</div>
              <div style={{flex:1}}>
                <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:4,flexWrap:'wrap'}}>
                  <span style={{fontWeight:800,fontSize:16}}>{r.title_ar}</span>
                  <span style={{fontSize:11,padding:'2px 8px',borderRadius:6,background:r.is_active?'#16653433':'#7f1d1d33',color:r.is_active?'#86efac':'#fca5a5'}}>{r.is_active?'نشط':'مخفي'}</span>
                  {r.price_egp>0 && <span style={{fontSize:12,fontWeight:700,color:'#fbbf24'}}>{r.price_egp} ج.م</span>}
                  {r.price_egp===0 && <span style={{fontSize:11,color:'#64748b'}}>مجاني</span>}
                </div>
                <div style={{color:'#64748b',fontSize:13,marginBottom:8}}>{r.description_ar}</div>
                <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>
                  {r.cta_label_ar && <span style={{fontSize:11,padding:'3px 10px',borderRadius:8,background:'#1e40af33',border:'1px solid #1e40af',color:'#93c5fd'}}>{r.cta_type==='payment'?'💳':r.cta_type==='url'?'🔗':'💬'} {r.cta_label_ar}</span>}
                  {r.cta2_label_ar && <span style={{fontSize:11,padding:'3px 10px',borderRadius:8,background:'#16653433',border:'1px solid #166534',color:'#86efac'}}>{r.cta2_type==='payment'?'💳':r.cta2_type==='url'?'🔗':'💬'} {r.cta2_label_ar}</span>}
                </div>
              </div>
              <div style={{display:'flex',gap:8,flexShrink:0,flexWrap:'wrap',justifyContent:'flex-end'}}>
                {r.price_egp>0 && (()=>{ const lnk=buildWA(r.title_ar); return (<>
                  <a href={lnk} target="_blank" style={{padding:'7px 12px',borderRadius:8,background:'#25D366',color:'#fff',fontSize:12,fontWeight:700,textDecoration:'none'}}>🟢 WA</a>
                  <button onClick={()=>{navigator.clipboard.writeText(lnk);setCopied(r.id);setTimeout(()=>setCopied(''),2000)}} style={{padding:'7px 12px',borderRadius:8,border:'1px solid #334155',background:copied===r.id?'#166534':'transparent',color:copied===r.id?'#86efac':'#94a3b8',cursor:'pointer',fontSize:12}}>{copied===r.id?'✅':'📋'}</button>
                </>)})()}
                <Link href={`/lessons?roadmap=${r.id}&name=${encodeURIComponent(r.title_ar)}`} style={{padding:'7px 14px',borderRadius:8,background:'#1e40af',color:'#fff',fontSize:12,fontWeight:700,textDecoration:'none'}}>📚 الدروس</Link>
                <button onClick={()=>{setForm({...r});setEditing(r.id)}} style={{padding:'7px 14px',borderRadius:8,border:'1px solid #334155',background:'transparent',color:'#94a3b8',cursor:'pointer',fontSize:12}}>✏️</button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
