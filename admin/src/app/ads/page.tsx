'use client'
import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'

const URL2 = process.env.NEXT_PUBLIC_SUPABASE_URL!
const KEY  = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const H    = { 'apikey': KEY, 'Authorization': `Bearer ${KEY}`, 'Content-Type': 'application/json', 'Prefer': 'return=representation' }

const AUDIENCES = [
  { key:'all',                     label:'الكل',                         emoji:'🌍' },
  { key:'non_subscribers',         label:'غير المشتركين',                emoji:'👤' },
  { key:'n8n_subscribers',         label:'مشتركي n8n',                   emoji:'⚡' },
  { key:'ai_video_subscribers',    label:'مشتركي AI Video',              emoji:'🎬' },
  { key:'vibe_coding_subscribers', label:'مشتركي Vibe Coding',           emoji:'💻' },
  { key:'bundle_subscribers',      label:'مشتركي الـ Bundle (3 كورسات)', emoji:'🎯' },
]

const APP_SECTIONS = [
  { key:'learn',       label:'📚 التعلم',      desc:'صفحة المسارات والدروس' },
  { key:'challenges',  label:'⚔️ التحديات',     desc:'صفحة التحديات' },
  { key:'leaderboard', label:'🏆 الترتيب',     desc:'لوحة المتصدرين' },
  { key:'profile',     label:'👤 ملفي',         desc:'الملف الشخصي' },
  { key:'home',        label:'🏠 الرئيسية',    desc:'الصفحة الرئيسية' },
]

const EMPTY: any = {
  title_ar: '', description_ar: '',
  banner_image_url: '', banner_image_dimensions: '480x280',
  video_url: '', vimeo_id: '', vimeo_url: '',
  thumbnail_url: '',
  price_egp: 0, price_label: 'EGP 0.00',
  notification_text: 'سنقوم بإخطارك قبل انتهاء تجربتك المجانية بيومين',
  trial_days: 7,
  cta_text_ar: 'جرّبه مقابل EGP 0.00',
  cta_type: 'in_app',
  cta_section: 'learn',
  cta_url: '',
  target_audience: ['all'],
  starts_at: '', ends_at: '',
  is_active: true,
  show_frequency: 'once',
  sort_order: 0,
}

function extractVimeoId(input: string): string {
  if (!input) return ''
  if (/^\d+$/.test(input.trim())) return input.trim()
  const m = input.match(/vimeo\.com\/(\d+)/) || input.match(/video\/(\d+)/)
  return m ? m[1] : ''
}

export default function AdsPage() {
  const [ads, setAds]           = useState<any[]>([])
  const [form, setForm]         = useState<any>({ ...EMPTY, target_audience: ['all'] })
  const [editing, setEditing]   = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving]     = useState(false)
  const [msg, setMsg]           = useState('')
  const [vimeoPreview, setVimeoPreview] = useState<string | null>(null)
  const [uploadingBanner, setUploadingBanner] = useState(false)
  const [uploadingThumb, setUploadingThumb]   = useState(false)
  const bannerRef = useRef<HTMLInputElement>(null)
  const thumbRef  = useRef<HTMLInputElement>(null)

  useEffect(() => { load() }, [])

  const load = async () => {
    const r = await fetch(`${URL2}/rest/v1/ads?select=*&order=sort_order,created_at.desc`, { headers: H }).then(r => r.json())
    setAds(Array.isArray(r) ? r : [])
  }

  const handleVimeoInput = (val: string) => {
    const id = extractVimeoId(val)
    setForm((f: any) => ({ ...f, vimeo_url: val, vimeo_id: id }))
    if (id) setVimeoPreview(`https://player.vimeo.com/video/${id}?title=0&byline=0&portrait=0`)
    else setVimeoPreview(null)
  }

  const uploadFile = async (file: File, prefix: string, setter: (url: string) => void, setLoading: (v: boolean) => void) => {
    setLoading(true)
    const ext = file.name.split('.').pop()
    const filename = `${prefix}-${Date.now()}.${ext}`
    const res = await fetch(`${URL2}/storage/v1/object/challenges/${filename}`, {
      method: 'POST',
      headers: { 'apikey': KEY, 'Authorization': `Bearer ${KEY}`, 'Content-Type': file.type, 'x-upsert': 'true' },
      body: file,
    })
    if (res.ok) {
      setter(`${URL2}/storage/v1/object/public/challenges/${filename}`)
      setMsg('✅ تم رفع الصورة')
    } else {
      setMsg('❌ فشل الرفع — تأكد من Supabase Storage bucket "challenges"')
    }
    setLoading(false)
    setTimeout(() => setMsg(''), 3000)
  }

  // Auto-update price label when price changes
  const handlePriceChange = (val: string) => {
    const num = parseFloat(val) || 0
    setForm((f: any) => ({
      ...f,
      price_egp: num,
      price_label: num === 0 ? 'EGP 0.00' : `EGP ${num.toFixed(2)}`,
      cta_text_ar: num === 0 ? 'جرّبه مقابل EGP 0.00' : `اشترك مقابل EGP ${num.toFixed(2)}`,
    }))
  }

  const toggleAudience = (key: string) => {
    setForm((f: any) => {
      const curr: string[] = f.target_audience || []
      if (key === 'all') return { ...f, target_audience: ['all'] }
      const without = curr.filter((k: string) => k !== 'all')
      if (without.includes(key)) {
        const next = without.filter((k: string) => k !== key)
        return { ...f, target_audience: next.length === 0 ? ['all'] : next }
      }
      return { ...f, target_audience: [...without, key] }
    })
  }

  const save = async () => {
    if (!form.title_ar) { setMsg('❌ اكتب عنوان الإعلان'); setTimeout(() => setMsg(''), 3000); return }
    setSaving(true)
    const vimeoId = extractVimeoId(form.vimeo_url || form.vimeo_id)
    const payload: any = {
      title_ar: form.title_ar,
      description_ar: form.description_ar || null,
      banner_image_url: form.banner_image_url || null,
      banner_image_dimensions: form.banner_image_dimensions || '480x280',
      video_url: form.video_url || null,
      vimeo_id: vimeoId || null,
      vimeo_url: form.vimeo_url || null,
      thumbnail_url: form.thumbnail_url || null,
      price_egp: Number(form.price_egp) || 0,
      price_label: form.price_label || 'EGP 0.00',
      notification_text: form.notification_text || null,
      trial_days: Number(form.trial_days) || 7,
      cta_text_ar: form.cta_text_ar || 'جرّبه الآن',
      cta_type: form.cta_type || 'in_app',
      cta_section: form.cta_section || 'learn',
      cta_url: form.cta_url || null,
      target_audience: form.target_audience,
      starts_at: form.starts_at || null,
      ends_at: form.ends_at || null,
      is_active: form.is_active,
      show_frequency: form.show_frequency,
      sort_order: Number(form.sort_order) || 0,
    }
    let res: Response
    if (editing) {
      res = await fetch(`${URL2}/rest/v1/ads?id=eq.${editing}`, { method: 'PATCH', headers: H, body: JSON.stringify(payload) })
    } else {
      res = await fetch(`${URL2}/rest/v1/ads`, { method: 'POST', headers: H, body: JSON.stringify(payload) })
    }
    if (res.ok || res.status === 201) {
      setMsg('✅ تم حفظ الإعلان')
      resetForm(); load()
    } else {
      const err = await res.json().catch(() => ({}))
      setMsg('❌ ' + (err?.message || res.status))
    }
    setSaving(false)
    setTimeout(() => setMsg(''), 4000)
  }

  const del = async (id: string) => {
    if (!confirm('حذف الإعلان؟')) return
    await fetch(`${URL2}/rest/v1/ads?id=eq.${id}`, { method: 'DELETE', headers: H })
    load()
  }

  const toggleActive = async (id: string, curr: boolean) => {
    await fetch(`${URL2}/rest/v1/ads?id=eq.${id}`, { method: 'PATCH', headers: H, body: JSON.stringify({ is_active: !curr }) })
    load()
  }

  const resetForm = () => {
    setForm({ ...EMPTY, target_audience: ['all'] })
    setEditing(null); setShowForm(false); setVimeoPreview(null)
  }

  const edit = (ad: any) => {
    setForm({ ...EMPTY, ...ad, target_audience: ad.target_audience || ['all'] })
    setEditing(ad.id)
    if (ad.vimeo_id) setVimeoPreview(`https://player.vimeo.com/video/${ad.vimeo_id}?title=0&byline=0&portrait=0`)
    setShowForm(true)
  }

  // Live preview of the CTA banner
  const CTAPreview = () => (
    <div style={{ background:'linear-gradient(135deg,#1a237e,#283593,#1565c0)', borderRadius:16, overflow:'hidden', maxWidth:320, margin:'0 auto' }}>
      {form.banner_image_url && (
        <img src={form.banner_image_url} alt="" style={{ width:'100%', display:'block', maxHeight:180, objectFit:'cover' }} />
      )}
      {!form.banner_image_url && (
        <div style={{ height:140, background:'rgba(255,255,255,0.1)', display:'flex', alignItems:'center', justifyContent:'center', flexDirection:'column', gap:8 }}>
          <span style={{ fontSize:32 }}>🤖</span>
          <span style={{ fontSize:12, color:'rgba(255,255,255,0.5)' }}>صورة البانر هنا</span>
        </div>
      )}
      <div style={{ padding:'16px 16px 20px' }}>
        {form.title_ar && <div style={{ fontSize:18, fontWeight:900, color:'#fff', marginBottom:8, textAlign:'right', lineHeight:1.4 }}>{form.title_ar}</div>}
        {form.notification_text && (
          <div style={{ background:'rgba(255,255,255,0.15)', borderRadius:10, padding:'10px 12px', marginBottom:12, fontSize:13, color:'#fff', textAlign:'right', lineHeight:1.5 }}>
            {form.notification_text} <span style={{ color:'#69F0AE' }}>بيومين</span>
          </div>
        )}
        {form.description_ar && (
          <div style={{ fontSize:13, color:'rgba(255,255,255,0.75)', textAlign:'center', marginBottom:12 }}>{form.description_ar}</div>
        )}
        <div style={{ background:'#fff', borderRadius:12, padding:'14px', textAlign:'center' }}>
          <div style={{ fontSize:16, fontWeight:900, color:'#333' }}>{form.cta_text_ar || 'جرّبه الآن'}</div>
          <div style={{ fontSize:11, color:'#999', marginTop:2 }}>
            {form.cta_type === 'in_app' ? `يفتح: ${APP_SECTIONS.find(s=>s.key===form.cta_section)?.label || form.cta_section}` : form.cta_url}
          </div>
        </div>
        {form.description_ar && (
          <div style={{ fontSize:11, color:'rgba(255,255,255,0.5)', textAlign:'center', marginTop:8 }}>يمكنك إلغاء الاشتراك بسهولة، دون غرامات أو رسوم</div>
        )}
      </div>
    </div>
  )

  return (
    <div style={{ minHeight:'100vh', background:'#0f172a', color:'#fff', fontFamily:'system-ui,sans-serif' }}>
      <header style={{ background:'#1e293b', borderBottom:'1px solid #334155', padding:'16px 32px', display:'flex', alignItems:'center', gap:16 }}>
        <Link href="/" style={{ color:'#64748b', textDecoration:'none', fontSize:20 }}>←</Link>
        <h1 style={{ margin:0, fontSize:20, fontWeight:800, color:'#e2e8f0' }}>📢 إدارة الإعلانات</h1>
        <button onClick={() => { resetForm(); setShowForm(true) }}
          style={{ marginRight:'auto', padding:'8px 20px', borderRadius:8, border:'none', background:'#1CB0F6', color:'#fff', fontWeight:700, cursor:'pointer' }}>
          + إعلان جديد
        </button>
      </header>

      {msg && <div style={{ background:msg.startsWith('✅')?'#166534':'#7f1d1d', color:msg.startsWith('✅')?'#bbf7d0':'#fca5a5', padding:'12px 32px', fontSize:14, fontWeight:600 }}>{msg}</div>}

      <div style={{ padding:32, maxWidth:1200, margin:'0 auto' }}>
        {/* Stats */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:16, marginBottom:32 }}>
          {[
            { label:'إجمالي الإعلانات', val:ads.length, color:'#1CB0F6' },
            { label:'نشطة', val:ads.filter(a=>a.is_active).length, color:'#58CC02' },
            { label:'إجمالي المشاهدات', val:ads.reduce((s,a)=>s+(a.views_count||0),0).toLocaleString(), color:'#FF9600' },
          ].map(s => (
            <div key={s.label} style={{ background:'#1e293b', borderRadius:12, padding:'20px 24px', border:'1px solid #334155' }}>
              <div style={{ fontSize:28, fontWeight:900, color:s.color }}>{s.val}</div>
              <div style={{ fontSize:13, color:'#64748b', marginTop:4 }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Ads list */}
        <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
          {ads.length === 0 && (
            <div style={{ background:'#1e293b', borderRadius:12, padding:40, textAlign:'center', color:'#64748b' }}>
              لا توجد إعلانات — اضغط "+ إعلان جديد"
            </div>
          )}
          {ads.map(ad => (
            <div key={ad.id} style={{ background:'#1e293b', borderRadius:14, padding:20, border:'1px solid #334155', display:'flex', gap:16 }}>
              {/* Banner/Thumb */}
              <div style={{ width:100, height:72, borderRadius:10, overflow:'hidden', flexShrink:0, background:'#334155' }}>
                {(ad.banner_image_url || ad.thumbnail_url) ? (
                  <img src={ad.banner_image_url || ad.thumbnail_url} alt="" style={{ width:'100%', height:'100%', objectFit:'cover' }} />
                ) : <div style={{ width:'100%', height:'100%', display:'flex', alignItems:'center', justifyContent:'center', fontSize:24 }}>📢</div>}
              </div>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ display:'flex', alignItems:'center', gap:8, flexWrap:'wrap', marginBottom:6 }}>
                  <span style={{ fontWeight:800, color:'#e2e8f0', fontSize:15 }}>{ad.title_ar}</span>
                  <span style={{ background:ad.is_active?'#166534':'#7f1d1d', color:ad.is_active?'#bbf7d0':'#fca5a5', borderRadius:6, padding:'2px 8px', fontSize:11 }}>
                    {ad.is_active ? '✅ نشط' : '⏸️ مخفي'}
                  </span>
                  {ad.price_egp === 0 && <span style={{ background:'#166534', color:'#bbf7d0', borderRadius:6, padding:'2px 8px', fontSize:11 }}>🆓 مجاني</span>}
                  {ad.price_egp > 0 && <span style={{ background:'#78350f', color:'#fbbf24', borderRadius:6, padding:'2px 8px', fontSize:11 }}>💰 {ad.price_egp} ج.م</span>}
                  {ad.cta_type === 'in_app' && <span style={{ background:'#1e3a5f', color:'#60a5fa', borderRadius:6, padding:'2px 8px', fontSize:11 }}>
                    {APP_SECTIONS.find(s=>s.key===ad.cta_section)?.label || '📱'}
                  </span>}
                </div>
                <div style={{ display:'flex', gap:6, flexWrap:'wrap', marginBottom:6 }}>
                  {(ad.target_audience||['all']).map((k: string) => {
                    const a = AUDIENCES.find(a=>a.key===k)
                    return a ? <span key={k} style={{ background:'#1e3a5f', color:'#93c5fd', borderRadius:6, padding:'2px 8px', fontSize:11 }}>{a.emoji} {a.label}</span> : null
                  })}
                </div>
                <div style={{ display:'flex', gap:16, fontSize:12, color:'#64748b' }}>
                  <span>👁️ {ad.views_count||0}</span>
                  <span>🖱️ {ad.clicks_count||0}</span>
                  <span>🔁 {ad.show_frequency==='once'?'مرة واحدة':ad.show_frequency==='daily'?'يومياً':'دائماً'}</span>
                  {ad.banner_image_dimensions && <span>📐 {ad.banner_image_dimensions}</span>}
                </div>
              </div>
              <div style={{ display:'flex', flexDirection:'column', gap:6, flexShrink:0 }}>
                <button onClick={() => toggleActive(ad.id, ad.is_active)}
                  style={{ padding:'5px 12px', borderRadius:6, border:`1px solid ${ad.is_active?'#854d0e':'#166534'}`, background:'transparent', color:ad.is_active?'#fbbf24':'#4ade80', cursor:'pointer', fontSize:11 }}>
                  {ad.is_active?'إخفاء':'تفعيل'}
                </button>
                <button onClick={() => edit(ad)}
                  style={{ padding:'5px 12px', borderRadius:6, border:'1px solid #334155', background:'transparent', color:'#94a3b8', cursor:'pointer', fontSize:11 }}>تعديل</button>
                <button onClick={() => del(ad.id)}
                  style={{ padding:'5px 12px', borderRadius:6, border:'1px solid #7f1d1d', background:'transparent', color:'#f87171', cursor:'pointer', fontSize:11 }}>حذف</button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ══ FORM MODAL ══ */}
      {showForm && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.85)', display:'flex', alignItems:'flex-start', justifyContent:'center', zIndex:100, overflowY:'auto', padding:'20px 0' }}>
          <div style={{ background:'#1e293b', borderRadius:16, width:'100%', maxWidth:760, border:'1px solid #334155', marginBottom:20 }}>

            <div style={{ padding:'20px 28px 16px', borderBottom:'1px solid #334155', display:'flex', alignItems:'center', justifyContent:'space-between', position:'sticky', top:0, background:'#1e293b', zIndex:10 }}>
              <h2 style={{ margin:0, color:'#e2e8f0', fontSize:18 }}>{editing?'✏️ تعديل إعلان':'➕ إعلان جديد'}</h2>
              <button onClick={resetForm} style={{ width:32, height:32, borderRadius:8, border:'none', background:'#334155', color:'#94a3b8', cursor:'pointer', fontSize:16 }}>✕</button>
            </div>

            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:0 }}>

              {/* LEFT — Form */}
              <div style={{ padding:'20px 24px 28px', borderLeft:'1px solid #334155', display:'grid', gap:16 }}>

                {/* Title */}
                <div>
                  <label style={{ display:'block', fontSize:12, color:'#94a3b8', marginBottom:5, fontWeight:600 }}>عنوان الإعلان *</label>
                  <input value={form.title_ar} onChange={e=>setForm((f:any)=>({...f,title_ar:e.target.value}))}
                    placeholder="احصل على تجربة مجانية 7 أيام"
                    style={{ width:'100%', padding:'9px 11px', borderRadius:8, border:`1px solid ${form.title_ar?'#1CB0F6':'#334155'}`, background:'#0f172a', color:'#fff', fontSize:13, boxSizing:'border-box' }}/>
                </div>

                {/* Description */}
                <div>
                  <label style={{ display:'block', fontSize:12, color:'#94a3b8', marginBottom:5, fontWeight:600 }}>وصف مختصر</label>
                  <textarea value={form.description_ar||''} onChange={e=>setForm((f:any)=>({...f,description_ar:e.target.value}))}
                    rows={2} placeholder="يمكنك إلغاء الاشتراك بسهولة، دون غرامات أو رسوم"
                    style={{ width:'100%', padding:'9px 11px', borderRadius:8, border:'1px solid #334155', background:'#0f172a', color:'#fff', fontSize:12, boxSizing:'border-box', resize:'vertical' }}/>
                </div>

                {/* Notification text */}
                <div>
                  <label style={{ display:'block', fontSize:12, color:'#94a3b8', marginBottom:5, fontWeight:600 }}>💬 نص الإشعار (Speech bubble)</label>
                  <textarea value={form.notification_text||''} onChange={e=>setForm((f:any)=>({...f,notification_text:e.target.value}))}
                    rows={2} placeholder="سنقوم بإخطارك قبل انتهاء تجربتك المجانية بيومين"
                    style={{ width:'100%', padding:'9px 11px', borderRadius:8, border:'1px solid #334155', background:'#0f172a', color:'#fff', fontSize:12, boxSizing:'border-box', resize:'vertical' }}/>
                </div>

                {/* ══ BANNER IMAGE ══ */}
                <div style={{ background:'#0f172a', borderRadius:10, padding:12, border:'2px solid #7c3aed' }}>
                  <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:8 }}>
                    <span style={{ fontSize:12, fontWeight:700, color:'#a78bfa' }}>🖼️ صورة البانر</span>
                    <span style={{ fontSize:11, color:'#475569', background:'#1e293b', borderRadius:6, padding:'2px 8px' }}>
                      المقاسات: {form.banner_image_dimensions || '480×280 px'}
                    </span>
                  </div>
                  <input ref={bannerRef} type="file" accept="image/*" style={{ display:'none' }}
                    onChange={e => { if (e.target.files?.[0]) uploadFile(e.target.files[0], 'ad-banner', (url)=>setForm((f:any)=>({...f,banner_image_url:url})), setUploadingBanner) }} />
                  {form.banner_image_url ? (
                    <div>
                      <img src={form.banner_image_url} alt="" style={{ width:'100%', borderRadius:6, marginBottom:6, maxHeight:120, objectFit:'cover' }}/>
                      <div style={{ display:'flex', gap:6 }}>
                        <button type="button" onClick={()=>bannerRef.current?.click()} style={{ flex:1, padding:'5px', borderRadius:6, border:'1px solid #334155', background:'transparent', color:'#94a3b8', cursor:'pointer', fontSize:11 }}>تغيير</button>
                        <button type="button" onClick={()=>setForm((f:any)=>({...f,banner_image_url:''}))} style={{ padding:'5px 10px', borderRadius:6, border:'1px solid #7f1d1d', background:'transparent', color:'#f87171', cursor:'pointer', fontSize:11 }}>حذف</button>
                      </div>
                    </div>
                  ) : (
                    <button type="button" onClick={()=>bannerRef.current?.click()} disabled={uploadingBanner}
                      style={{ width:'100%', padding:'14px', borderRadius:8, border:'2px dashed #334155', background:'transparent', color:'#64748b', cursor:'pointer', fontSize:12, textAlign:'center' }}>
                      {uploadingBanner ? '⏳ جاري الرفع...' : '📤 ارفع صورة البانر (480×280 px موصى به)'}
                    </button>
                  )}
                  <div style={{ marginTop:8 }}>
                    <label style={{ display:'block', fontSize:11, color:'#64748b', marginBottom:4 }}>المقاسات (للمرجع)</label>
                    <input value={form.banner_image_dimensions||'480x280'} onChange={e=>setForm((f:any)=>({...f,banner_image_dimensions:e.target.value}))}
                      placeholder="480x280"
                      style={{ width:'100%', padding:'7px 10px', borderRadius:6, border:'1px solid #334155', background:'#1e293b', color:'#fff', fontSize:12, boxSizing:'border-box', fontFamily:'monospace' }}/>
                  </div>
                </div>

                {/* ══ PRICE ══ */}
                <div style={{ background:'#0f172a', borderRadius:10, padding:12, border:'2px solid #d97706' }}>
                  <div style={{ fontSize:12, fontWeight:700, color:'#fbbf24', marginBottom:10 }}>💰 السعر</div>
                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
                    <div>
                      <label style={{ display:'block', fontSize:11, color:'#94a3b8', marginBottom:4 }}>السعر (ج.م)</label>
                      <input type="number" min={0} step={0.01} value={form.price_egp} onChange={e=>handlePriceChange(e.target.value)}
                        style={{ width:'100%', padding:'9px 10px', borderRadius:8, border:'1px solid #334155', background:'#1e293b', color:'#fbbf24', fontSize:16, fontWeight:800, boxSizing:'border-box' }}/>
                    </div>
                    <div>
                      <label style={{ display:'block', fontSize:11, color:'#94a3b8', marginBottom:4 }}>label السعر</label>
                      <input value={form.price_label||''} onChange={e=>setForm((f:any)=>({...f,price_label:e.target.value}))}
                        placeholder="EGP 0.00"
                        style={{ width:'100%', padding:'9px 10px', borderRadius:8, border:'1px solid #334155', background:'#1e293b', color:'#fff', fontSize:13, boxSizing:'border-box' }}/>
                    </div>
                    <div>
                      <label style={{ display:'block', fontSize:11, color:'#94a3b8', marginBottom:4 }}>أيام التجربة</label>
                      <input type="number" min={1} value={form.trial_days} onChange={e=>setForm((f:any)=>({...f,trial_days:e.target.value}))}
                        style={{ width:'100%', padding:'9px 10px', borderRadius:8, border:'1px solid #334155', background:'#1e293b', color:'#fff', fontSize:13, boxSizing:'border-box' }}/>
                    </div>
                    <div>
                      <label style={{ display:'block', fontSize:11, color:'#94a3b8', marginBottom:4 }}>نص زرار CTA</label>
                      <input value={form.cta_text_ar||''} onChange={e=>setForm((f:any)=>({...f,cta_text_ar:e.target.value}))}
                        placeholder="جرّبه مقابل EGP 0.00"
                        style={{ width:'100%', padding:'9px 10px', borderRadius:8, border:'1px solid #334155', background:'#1e293b', color:'#fff', fontSize:12, boxSizing:'border-box' }}/>
                    </div>
                  </div>
                </div>

                {/* ══ CTA SECTION ══ */}
                <div style={{ background:'#0f172a', borderRadius:10, padding:12, border:'2px solid #1CB0F6' }}>
                  <div style={{ fontSize:12, fontWeight:700, color:'#60a5fa', marginBottom:10 }}>📱 وجهة الزرار (داخل الـ App)</div>

                  {/* CTA Type */}
                  <div style={{ display:'flex', gap:8, marginBottom:10 }}>
                    {[['in_app','📱 داخل الـ App'],['external','🌐 رابط خارجي']].map(([k,l])=>(
                      <button key={k} type="button" onClick={()=>setForm((f:any)=>({...f,cta_type:k}))}
                        style={{ flex:1, padding:'8px', borderRadius:8, border:`2px solid ${form.cta_type===k?'#1CB0F6':'#334155'}`, background:form.cta_type===k?'#1e3a5f':'transparent', cursor:'pointer', fontSize:12, color:form.cta_type===k?'#60a5fa':'#64748b', fontWeight:700 }}>
                        {l}
                      </button>
                    ))}
                  </div>

                  {/* In-App Sections */}
                  {form.cta_type === 'in_app' && (
                    <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                      {APP_SECTIONS.map(s => (
                        <button key={s.key} type="button" onClick={()=>setForm((f:any)=>({...f,cta_section:s.key}))}
                          style={{ padding:'9px 12px', borderRadius:8, border:`2px solid ${form.cta_section===s.key?'#1CB0F6':'#334155'}`, background:form.cta_section===s.key?'#1e3a5f':'transparent', cursor:'pointer', display:'flex', alignItems:'center', gap:10, textAlign:'right' }}>
                          <span style={{ width:18, height:18, borderRadius:4, border:`2px solid ${form.cta_section===s.key?'#1CB0F6':'#475569'}`, background:form.cta_section===s.key?'#1CB0F6':'transparent', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                            {form.cta_section===s.key && <span style={{ color:'#fff', fontSize:11, fontWeight:900 }}>✓</span>}
                          </span>
                          <span style={{ fontSize:13, color:form.cta_section===s.key?'#93c5fd':'#94a3b8' }}>{s.label}</span>
                          <span style={{ fontSize:11, color:'#475569', marginRight:'auto' }}>{s.desc}</span>
                        </button>
                      ))}
                    </div>
                  )}

                  {/* External URL */}
                  {form.cta_type === 'external' && (
                    <input value={form.cta_url||''} onChange={e=>setForm((f:any)=>({...f,cta_url:e.target.value}))}
                      placeholder="https://..."
                      style={{ width:'100%', padding:'9px 11px', borderRadius:8, border:'1px solid #334155', background:'#1e293b', color:'#fff', fontSize:13, boxSizing:'border-box', fontFamily:'monospace' }}/>
                  )}
                </div>

                {/* Audience */}
                <div style={{ background:'#0f172a', borderRadius:10, padding:12, border:'2px solid #7c3aed' }}>
                  <div style={{ fontSize:12, fontWeight:700, color:'#a78bfa', marginBottom:10 }}>🎯 الجمهور المستهدف</div>
                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:6 }}>
                    {AUDIENCES.map(a => {
                      const sel = (form.target_audience||[]).includes(a.key)
                      return (
                        <button key={a.key} type="button" onClick={()=>toggleAudience(a.key)}
                          style={{ padding:'8px 10px', borderRadius:8, border:`2px solid ${sel?'#7c3aed':'#334155'}`, background:sel?'#2d1a4e':'transparent', cursor:'pointer', display:'flex', alignItems:'center', gap:6 }}>
                          <span style={{ width:14, height:14, borderRadius:3, border:`2px solid ${sel?'#a78bfa':'#475569'}`, background:sel?'#7c3aed':'transparent', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                            {sel && <span style={{ color:'#fff', fontSize:9, fontWeight:900 }}>✓</span>}
                          </span>
                          <span style={{ fontSize:11 }}>{a.emoji}</span>
                          <span style={{ fontSize:11, color:sel?'#c4b5fd':'#94a3b8' }}>{a.label}</span>
                        </button>
                      )
                    })}
                  </div>
                </div>

                {/* Frequency + Dates */}
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:8 }}>
                  <div>
                    <label style={{ display:'block', fontSize:11, color:'#94a3b8', marginBottom:4, fontWeight:600 }}>تكرار الظهور</label>
                    <select value={form.show_frequency} onChange={e=>setForm((f:any)=>({...f,show_frequency:e.target.value}))}
                      style={{ width:'100%', padding:'8px 10px', borderRadius:8, border:'1px solid #334155', background:'#0f172a', color:'#fff', fontSize:12 }}>
                      <option value="once">مرة واحدة</option>
                      <option value="daily">يومياً</option>
                      <option value="always">دائماً</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ display:'block', fontSize:11, color:'#94a3b8', marginBottom:4 }}>تاريخ البداية</label>
                    <input type="datetime-local" value={form.starts_at?.slice(0,16)||''} onChange={e=>setForm((f:any)=>({...f,starts_at:e.target.value}))}
                      style={{ width:'100%', padding:'8px 10px', borderRadius:8, border:'1px solid #334155', background:'#0f172a', color:'#fff', fontSize:11, boxSizing:'border-box' }}/>
                  </div>
                  <div>
                    <label style={{ display:'block', fontSize:11, color:'#94a3b8', marginBottom:4 }}>تاريخ الانتهاء</label>
                    <input type="datetime-local" value={form.ends_at?.slice(0,16)||''} onChange={e=>setForm((f:any)=>({...f,ends_at:e.target.value}))}
                      style={{ width:'100%', padding:'8px 10px', borderRadius:8, border:'1px solid #334155', background:'#0f172a', color:'#fff', fontSize:11, boxSizing:'border-box' }}/>
                  </div>
                </div>

                <label style={{ display:'flex', alignItems:'center', gap:8, cursor:'pointer' }}>
                  <input type="checkbox" checked={form.is_active} onChange={e=>setForm((f:any)=>({...f,is_active:e.target.checked}))} style={{ width:15,height:15 }}/>
                  <span style={{ color:'#e2e8f0', fontSize:13 }}>نشط ومرئي للمستخدمين</span>
                </label>

                <button onClick={save} disabled={saving}
                  style={{ width:'100%', padding:'13px', borderRadius:8, border:'none', background:saving?'#334155':'#58CC02', color:'#fff', fontWeight:800, cursor:saving?'not-allowed':'pointer', fontSize:15 }}>
                  {saving ? '⏳ جاري الحفظ...' : editing ? '💾 تحديث' : '✅ إضافة الإعلان'}
                </button>
              </div>

              {/* RIGHT — Live Preview */}
              <div style={{ padding:'20px 24px 28px', background:'#0f172a' }}>
                <div style={{ fontSize:12, fontWeight:700, color:'#64748b', marginBottom:12, textAlign:'center' }}>👁️ معاينة مباشرة</div>
                <CTAPreview />
                <div style={{ marginTop:16, background:'#1e293b', borderRadius:10, padding:10 }}>
                  <div style={{ fontSize:11, color:'#64748b', marginBottom:6 }}>📱 كيف يظهر في الـ App:</div>
                  <div style={{ fontSize:12, color:'#94a3b8', lineHeight:1.8 }}>
                    • يظهر في الـ Home Screen<br/>
                    • الزرار يفتح: <strong style={{ color:'#60a5fa' }}>{APP_SECTIONS.find(s=>s.key===form.cta_section)?.label || form.cta_section}</strong><br/>
                    • الجمهور: <strong style={{ color:'#a78bfa' }}>{(form.target_audience||[]).join(' + ')}</strong>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
