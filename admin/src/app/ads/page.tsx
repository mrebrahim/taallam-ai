'use client'
import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'

const URL2 = process.env.NEXT_PUBLIC_SUPABASE_URL!
const KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const H = { 'apikey': KEY, 'Authorization': `Bearer ${KEY}`, 'Content-Type': 'application/json', 'Prefer': 'return=representation' }

const AUDIENCES = [
  { key: 'all',                    label: 'الكل',                emoji: '🌍' },
  { key: 'non_subscribers',        label: 'غير المشتركين',       emoji: '👤' },
  { key: 'n8n_subscribers',        label: 'مشتركي n8n',          emoji: '⚡' },
  { key: 'ai_video_subscribers',   label: 'مشتركي AI Video',     emoji: '🎬' },
  { key: 'vibe_coding_subscribers',label: 'مشتركي Vibe Coding',  emoji: '💻' },
  { key: 'bundle_subscribers',     label: 'مشتركي الـ Bundle (3 كورسات)', emoji: '🎯' },
]

const EMPTY = {
  title_ar: '', description_ar: '',
  video_url: '', vimeo_id: '', vimeo_url: '',
  thumbnail_url: '',
  cta_text_ar: 'اشترك الآن 🚀',
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
  const [uploadingThumb, setUploadingThumb] = useState(false)
  const thumbRef = useRef<HTMLInputElement>(null)

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

  const uploadThumbnail = async (file: File) => {
    setUploadingThumb(true)
    const ext = file.name.split('.').pop()
    const filename = `ad-thumb-${Date.now()}.${ext}`
    const res = await fetch(`${URL2}/storage/v1/object/challenges/${filename}`, {
      method: 'POST',
      headers: { 'apikey': KEY, 'Authorization': `Bearer ${KEY}`, 'Content-Type': file.type, 'x-upsert': 'true' },
      body: file,
    })
    if (res.ok) {
      const url = `${URL2}/storage/v1/object/public/challenges/${filename}`
      setForm((f: any) => ({ ...f, thumbnail_url: url }))
      setMsg('✅ تم رفع الصورة')
    } else {
      setMsg('❌ فشل رفع الصورة')
    }
    setUploadingThumb(false)
    setTimeout(() => setMsg(''), 3000)
  }

  const toggleAudience = (key: string) => {
    setForm((f: any) => {
      const current: string[] = f.target_audience || []
      if (key === 'all') return { ...f, target_audience: ['all'] }
      const without_all = current.filter((k: string) => k !== 'all')
      if (without_all.includes(key)) {
        const next = without_all.filter((k: string) => k !== key)
        return { ...f, target_audience: next.length === 0 ? ['all'] : next }
      } else {
        return { ...f, target_audience: [...without_all, key] }
      }
    })
  }

  const save = async () => {
    if (!form.title_ar) { setMsg('❌ اكتب عنوان الإعلان'); setTimeout(() => setMsg(''), 3000); return }
    setSaving(true)

    const vimeoId = extractVimeoId(form.vimeo_url || form.vimeo_id)
    const payload: any = {
      title_ar: form.title_ar,
      description_ar: form.description_ar || null,
      video_url: form.video_url || null,
      vimeo_id: vimeoId || null,
      vimeo_url: form.vimeo_url || null,
      thumbnail_url: form.thumbnail_url || null,
      cta_text_ar: form.cta_text_ar || 'اشترك الآن',
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

  const toggleActive = async (id: string, current: boolean) => {
    await fetch(`${URL2}/rest/v1/ads?id=eq.${id}`, { method: 'PATCH', headers: H, body: JSON.stringify({ is_active: !current }) })
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

  return (
    <div style={{ minHeight: '100vh', background: '#0f172a', color: '#fff', fontFamily: 'system-ui,sans-serif' }}>
      <header style={{ background: '#1e293b', borderBottom: '1px solid #334155', padding: '16px 32px', display: 'flex', alignItems: 'center', gap: 16 }}>
        <Link href="/" style={{ color: '#64748b', textDecoration: 'none', fontSize: 20 }}>←</Link>
        <h1 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: '#e2e8f0' }}>📢 إدارة الإعلانات</h1>
        <button onClick={() => { resetForm(); setShowForm(true) }}
          style={{ marginRight: 'auto', padding: '8px 20px', borderRadius: 8, border: 'none', background: '#1CB0F6', color: '#fff', fontWeight: 700, cursor: 'pointer' }}>
          + إعلان جديد
        </button>
      </header>

      {msg && <div style={{ background: msg.startsWith('✅') ? '#166534' : '#7f1d1d', color: msg.startsWith('✅') ? '#bbf7d0' : '#fca5a5', padding: '12px 32px', fontSize: 14, fontWeight: 600 }}>{msg}</div>}

      <div style={{ padding: 32, maxWidth: 1200, margin: '0 auto' }}>
        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 32 }}>
          {[
            { label: 'إجمالي الإعلانات', val: ads.length, color: '#1CB0F6' },
            { label: 'نشطة', val: ads.filter(a => a.is_active).length, color: '#58CC02' },
            { label: 'إجمالي المشاهدات', val: ads.reduce((s, a) => s + (a.views_count || 0), 0).toLocaleString(), color: '#FF9600' },
          ].map(s => (
            <div key={s.label} style={{ background: '#1e293b', borderRadius: 12, padding: '20px 24px', border: '1px solid #334155' }}>
              <div style={{ fontSize: 28, fontWeight: 900, color: s.color }}>{s.val}</div>
              <div style={{ fontSize: 13, color: '#64748b', marginTop: 4 }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Ads list */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {ads.length === 0 && (
            <div style={{ background: '#1e293b', borderRadius: 12, padding: 40, textAlign: 'center', color: '#64748b' }}>
              لا توجد إعلانات — اضغط "+ إعلان جديد"
            </div>
          )}
          {ads.map(ad => (
            <div key={ad.id} style={{ background: '#1e293b', borderRadius: 14, padding: 20, border: '1px solid #334155', display: 'flex', gap: 16 }}>
              {/* Thumbnail */}
              {ad.thumbnail_url && (
                <img src={ad.thumbnail_url} alt="" style={{ width: 100, height: 72, borderRadius: 10, objectFit: 'cover', flexShrink: 0 }} />
              )}
              {!ad.thumbnail_url && (
                <div style={{ width: 100, height: 72, borderRadius: 10, background: '#334155', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, flexShrink: 0 }}>
                  📢
                </div>
              )}

              <div style={{ flex: 1 }}>
                {/* Title + Status */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, flexWrap: 'wrap' }}>
                  <span style={{ fontWeight: 800, color: '#e2e8f0', fontSize: 16 }}>{ad.title_ar}</span>
                  <span style={{ background: ad.is_active ? '#166534' : '#7f1d1d', color: ad.is_active ? '#bbf7d0' : '#fca5a5', borderRadius: 6, padding: '2px 8px', fontSize: 11 }}>
                    {ad.is_active ? '✅ نشط' : '⏸️ مخفي'}
                  </span>
                  {(ad.vimeo_id || ad.video_url) && (
                    <span style={{ background: '#1a3a5c', color: '#60a5fa', borderRadius: 6, padding: '2px 8px', fontSize: 11 }}>
                      🎬 {ad.vimeo_id ? 'Vimeo' : 'YouTube'}
                    </span>
                  )}
                </div>

                {/* Audience tags */}
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 8 }}>
                  {(ad.target_audience || ['all']).map((k: string) => {
                    const a = AUDIENCES.find(a => a.key === k)
                    return a ? (
                      <span key={k} style={{ background: '#1e3a5f', color: '#93c5fd', borderRadius: 6, padding: '2px 8px', fontSize: 11 }}>
                        {a.emoji} {a.label}
                      </span>
                    ) : null
                  })}
                </div>

                {/* Stats */}
                <div style={{ display: 'flex', gap: 16, fontSize: 12, color: '#64748b' }}>
                  <span>👁️ {ad.views_count || 0} مشاهدة</span>
                  <span>🖱️ {ad.clicks_count || 0} ضغطة</span>
                  {ad.ends_at && <span>🗓️ ينتهي: {new Date(ad.ends_at).toLocaleDateString('ar-EG')}</span>}
                  <span>🔁 {ad.show_frequency === 'once' ? 'مرة واحدة' : ad.show_frequency === 'daily' ? 'يومياً' : 'دائماً'}</span>
                </div>
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flexShrink: 0 }}>
                <button onClick={() => toggleActive(ad.id, ad.is_active)}
                  style={{ padding: '5px 12px', borderRadius: 6, border: `1px solid ${ad.is_active ? '#854d0e' : '#166534'}`, background: 'transparent', color: ad.is_active ? '#fbbf24' : '#4ade80', cursor: 'pointer', fontSize: 11 }}>
                  {ad.is_active ? 'إخفاء' : 'تفعيل'}
                </button>
                <button onClick={() => edit(ad)}
                  style={{ padding: '5px 12px', borderRadius: 6, border: '1px solid #334155', background: 'transparent', color: '#94a3b8', cursor: 'pointer', fontSize: 11 }}>
                  تعديل
                </button>
                <button onClick={() => del(ad.id)}
                  style={{ padding: '5px 12px', borderRadius: 6, border: '1px solid #7f1d1d', background: 'transparent', color: '#f87171', cursor: 'pointer', fontSize: 11 }}>
                  حذف
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ══ FORM MODAL ══ */}
      {showForm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div style={{ background: '#1e293b', borderRadius: 16, width: '100%', maxWidth: 680, maxHeight: '95vh', overflowY: 'auto', border: '1px solid #334155' }}>

            {/* Header */}
            <div style={{ padding: '20px 28px 16px', borderBottom: '1px solid #334155', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, background: '#1e293b', zIndex: 10 }}>
              <h2 style={{ margin: 0, color: '#e2e8f0', fontSize: 18 }}>{editing ? '✏️ تعديل إعلان' : '➕ إعلان جديد'}</h2>
              <button onClick={resetForm} style={{ width: 32, height: 32, borderRadius: 8, border: 'none', background: '#334155', color: '#94a3b8', cursor: 'pointer', fontSize: 16 }}>✕</button>
            </div>

            <div style={{ padding: '20px 28px 28px', display: 'grid', gap: 18 }}>

              {/* Title */}
              <div>
                <label style={{ display: 'block', fontSize: 12, color: '#94a3b8', marginBottom: 6, fontWeight: 600 }}>عنوان الإعلان *</label>
                <input value={form.title_ar} onChange={e => setForm((f: any) => ({ ...f, title_ar: e.target.value }))}
                  placeholder="مثال: هل تعلم إن بإمكانك الحصول على أسبوع مجاني؟"
                  style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: `1px solid ${form.title_ar ? '#1CB0F6' : '#334155'}`, background: '#0f172a', color: '#fff', fontSize: 14, boxSizing: 'border-box' }} />
              </div>

              {/* Description */}
              <div>
                <label style={{ display: 'block', fontSize: 12, color: '#94a3b8', marginBottom: 6, fontWeight: 600 }}>نص الإعلان</label>
                <textarea value={form.description_ar || ''} onChange={e => setForm((f: any) => ({ ...f, description_ar: e.target.value }))}
                  rows={2} placeholder="وصف مختصر للإعلان..."
                  style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #334155', background: '#0f172a', color: '#fff', fontSize: 13, boxSizing: 'border-box', resize: 'vertical' }} />
              </div>

              {/* Thumbnail Upload */}
              <div>
                <label style={{ display: 'block', fontSize: 12, color: '#94a3b8', marginBottom: 8, fontWeight: 600 }}>🖼️ صورة الإعلان (Thumbnail)</label>
                <input ref={thumbRef} type="file" accept="image/*" style={{ display: 'none' }}
                  onChange={e => { if (e.target.files?.[0]) uploadThumbnail(e.target.files[0]) }} />
                {form.thumbnail_url ? (
                  <div>
                    <img src={form.thumbnail_url} alt="" style={{ width: '100%', borderRadius: 8, marginBottom: 8, maxHeight: 140, objectFit: 'cover' }} />
                    <button type="button" onClick={() => setForm((f: any) => ({ ...f, thumbnail_url: '' }))}
                      style={{ padding: '5px 12px', borderRadius: 6, border: '1px solid #7f1d1d', background: 'transparent', color: '#f87171', cursor: 'pointer', fontSize: 12 }}>
                      حذف الصورة
                    </button>
                  </div>
                ) : (
                  <button type="button" onClick={() => thumbRef.current?.click()} disabled={uploadingThumb}
                    style={{ width: '100%', padding: '16px', borderRadius: 8, border: '2px dashed #334155', background: 'transparent', color: '#64748b', cursor: 'pointer', fontSize: 13 }}>
                    {uploadingThumb ? '⏳ جاري الرفع...' : '📤 ارفع صورة للإعلان'}
                  </button>
                )}
              </div>

              {/* Vimeo Video */}
              <div style={{ background: '#0f172a', borderRadius: 12, padding: 16, border: '2px solid #1d4ed8' }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#60a5fa', marginBottom: 10 }}>🎬 فيديو Vimeo (موصى به)</div>
                <input value={form.vimeo_url || ''} onChange={e => handleVimeoInput(e.target.value)}
                  placeholder="https://vimeo.com/123456789  أو  123456789"
                  style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: `1px solid ${form.vimeo_id ? '#1d4ed8' : '#334155'}`, background: '#1e293b', color: '#fff', fontSize: 13, boxSizing: 'border-box', fontFamily: 'monospace' }} />
                {form.vimeo_id && <div style={{ marginTop: 6, fontSize: 11, color: '#60a5fa' }}>✅ Vimeo ID: {form.vimeo_id}</div>}
                {vimeoPreview && (
                  <div style={{ marginTop: 10, position: 'relative', paddingBottom: '56.25%', borderRadius: 8, overflow: 'hidden', background: '#000' }}>
                    <iframe src={vimeoPreview} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', border: 'none' }} allow="autoplay; fullscreen" allowFullScreen />
                  </div>
                )}
              </div>

              {/* YouTube fallback */}
              <div style={{ background: '#0f172a', borderRadius: 10, padding: 12, border: '1px solid #334155' }}>
                <div style={{ fontSize: 12, color: '#64748b', marginBottom: 6 }}>📺 YouTube (احتياطي)</div>
                <input value={form.video_url || ''} onChange={e => setForm((f: any) => ({ ...f, video_url: e.target.value }))}
                  placeholder="https://youtube.com/watch?v=..."
                  style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid #334155', background: '#1e293b', color: '#fff', fontSize: 13, boxSizing: 'border-box', fontFamily: 'monospace' }} />
              </div>

              {/* CTA */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 10 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 12, color: '#94a3b8', marginBottom: 6, fontWeight: 600 }}>نص الزرار</label>
                  <input value={form.cta_text_ar} onChange={e => setForm((f: any) => ({ ...f, cta_text_ar: e.target.value }))}
                    placeholder="اشترك الآن 🚀"
                    style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #334155', background: '#0f172a', color: '#fff', fontSize: 13, boxSizing: 'border-box' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 12, color: '#94a3b8', marginBottom: 6, fontWeight: 600 }}>رابط الزرار (URL)</label>
                  <input value={form.cta_url || ''} onChange={e => setForm((f: any) => ({ ...f, cta_url: e.target.value }))}
                    placeholder="https://taallam-ai.vercel.app/learn"
                    style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #334155', background: '#0f172a', color: '#fff', fontSize: 13, boxSizing: 'border-box', fontFamily: 'monospace' }} />
                </div>
              </div>

              {/* ══ AUDIENCE TARGETING ══ */}
              <div style={{ background: '#0f172a', borderRadius: 12, padding: 16, border: '2px solid #7c3aed' }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#a78bfa', marginBottom: 12 }}>🎯 الجمهور المستهدف</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  {AUDIENCES.map(a => {
                    const selected = (form.target_audience || []).includes(a.key)
                    return (
                      <button key={a.key} type="button" onClick={() => toggleAudience(a.key)}
                        style={{ padding: '10px 12px', borderRadius: 8, border: `2px solid ${selected ? '#7c3aed' : '#334155'}`, background: selected ? '#2d1a4e' : 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, textAlign: 'right' }}>
                        <span style={{ width: 18, height: 18, borderRadius: 4, border: `2px solid ${selected ? '#a78bfa' : '#475569'}`, background: selected ? '#7c3aed' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          {selected && <span style={{ color: '#fff', fontSize: 11, fontWeight: 900 }}>✓</span>}
                        </span>
                        <span style={{ fontSize: 14 }}>{a.emoji}</span>
                        <span style={{ fontSize: 12, color: selected ? '#c4b5fd' : '#94a3b8', fontWeight: selected ? 700 : 400 }}>{a.label}</span>
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Settings Row */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 12, color: '#94a3b8', marginBottom: 6, fontWeight: 600 }}>تكرار الظهور</label>
                  <select value={form.show_frequency} onChange={e => setForm((f: any) => ({ ...f, show_frequency: e.target.value }))}
                    style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #334155', background: '#0f172a', color: '#fff', fontSize: 13 }}>
                    <option value="once">مرة واحدة فقط</option>
                    <option value="daily">مرة يومياً</option>
                    <option value="always">دائماً</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 12, color: '#94a3b8', marginBottom: 6, fontWeight: 600 }}>تاريخ البداية</label>
                  <input type="datetime-local" value={form.starts_at?.slice(0, 16) || ''}
                    onChange={e => setForm((f: any) => ({ ...f, starts_at: e.target.value }))}
                    style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #334155', background: '#0f172a', color: '#fff', fontSize: 12, boxSizing: 'border-box' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 12, color: '#94a3b8', marginBottom: 6, fontWeight: 600 }}>تاريخ الانتهاء</label>
                  <input type="datetime-local" value={form.ends_at?.slice(0, 16) || ''}
                    onChange={e => setForm((f: any) => ({ ...f, ends_at: e.target.value }))}
                    style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #334155', background: '#0f172a', color: '#fff', fontSize: 12, boxSizing: 'border-box' }} />
                </div>
              </div>

              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                <input type="checkbox" checked={form.is_active} onChange={e => setForm((f: any) => ({ ...f, is_active: e.target.checked }))} style={{ width: 16, height: 16 }} />
                <span style={{ color: '#e2e8f0', fontSize: 13 }}>نشط ومرئي للمستخدمين</span>
              </label>

              <button onClick={save} disabled={saving}
                style={{ width: '100%', padding: '14px', borderRadius: 8, border: 'none', background: saving ? '#334155' : '#1CB0F6', color: '#fff', fontWeight: 800, cursor: saving ? 'not-allowed' : 'pointer', fontSize: 15 }}>
                {saving ? '⏳ جاري الحفظ...' : editing ? '💾 تحديث الإعلان' : '✅ إضافة الإعلان'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
