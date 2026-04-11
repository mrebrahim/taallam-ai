'use client'
import { useEffect, useState, useRef } from 'react'
import Link from 'next/link'

const URL2 = process.env.NEXT_PUBLIC_SUPABASE_URL!
const KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const H = { 'apikey': KEY, 'Authorization': `Bearer ${KEY}`, 'Content-Type': 'application/json', 'Prefer': 'return=representation' }

const DIFF = ['', 'سهل ⭐', 'متوسط ⭐⭐', 'صعب ⭐⭐⭐', 'خبير ⭐⭐⭐⭐', 'أسطوري 🔥']
const DIFF_COLORS = ['', '#58CC02', '#1CB0F6', '#FF9600', '#CE82FF', '#FF4B4B']

const EMPTY = {
  title_ar: '', description_ar: '',
  challenge_type: 'complete_sentence',
  question_ar: '',
  options: ['', '', '', ''],
  correct_answer: 0,
  explanation_ar: '',
  image_url: '',
  image_description: '',
  use_ai_validation: false,
  ai_validation_prompt: '',
  xp_reward: 100,
  coins_reward: 20,
  difficulty: 1,
  starts_at: '',
  ends_at: '',
  is_active: true,
  sort_order: 0,
  roadmap_id: '',
}

export default function ChallengesPage() {
  const [items, setItems] = useState<any[]>([])
  const [roadmaps, setRoadmaps] = useState<any[]>([])
  const [form, setForm] = useState<any>({ ...EMPTY, options: ['', '', '', ''] })
  const [editing, setEditing] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')
  const [uploadingImg, setUploadingImg] = useState(false)
  const [previewImg, setPreviewImg] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => { load() }, [])

  const load = async () => {
    const [c, r] = await Promise.all([
      fetch(`${URL2}/rest/v1/challenges?select=*,roadmaps(title_ar,slug)&order=sort_order,created_at.desc`, { headers: H }).then(r => r.json()),
      fetch(`${URL2}/rest/v1/roadmaps?select=*&order=sort_order`, { headers: H }).then(r => r.json()),
    ])
    setItems(Array.isArray(c) ? c : [])
    setRoadmaps(Array.isArray(r) ? r : [])
  }

  // Upload image to Supabase Storage
  const uploadImage = async (file: File) => {
    setUploadingImg(true)
    try {
      const ext = file.name.split('.').pop()
      const filename = `challenge-${Date.now()}.${ext}`
      
      const res = await fetch(`${URL2}/storage/v1/object/challenges/${filename}`, {
        method: 'POST',
        headers: { 'apikey': KEY, 'Authorization': `Bearer ${KEY}`, 'Content-Type': file.type, 'x-upsert': 'true' },
        body: file,
      })
      
      if (res.ok) {
        const imageUrl = `${URL2}/storage/v1/object/public/challenges/${filename}`
        setForm((prev: any) => ({ ...prev, image_url: imageUrl }))
        setPreviewImg(imageUrl)
        setMsg('✅ تم رفع الصورة')
      } else {
        // Try creating bucket first
        await fetch(`${URL2}/storage/v1/bucket`, {
          method: 'POST',
          headers: { 'apikey': KEY, 'Authorization': `Bearer ${KEY}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: 'challenges', name: 'challenges', public: true }),
        })
        // Retry upload
        const res2 = await fetch(`${URL2}/storage/v1/object/challenges/${filename}`, {
          method: 'POST',
          headers: { 'apikey': KEY, 'Authorization': `Bearer ${KEY}`, 'Content-Type': file.type, 'x-upsert': 'true' },
          body: file,
        })
        if (res2.ok) {
          const imageUrl = `${URL2}/storage/v1/object/public/challenges/${filename}`
          setForm((prev: any) => ({ ...prev, image_url: imageUrl }))
          setPreviewImg(imageUrl)
          setMsg('✅ تم رفع الصورة')
        } else {
          setMsg('❌ فشل رفع الصورة — تأكد من إعداد Supabase Storage')
        }
      }
    } catch (e: any) {
      setMsg('❌ خطأ: ' + e.message)
    }
    setUploadingImg(false)
    setTimeout(() => setMsg(''), 4000)
  }

  const save = async () => {
    if (!form.title_ar) { setMsg('❌ أكتب عنوان التحدي'); setTimeout(() => setMsg(''), 3000); return }
    if (!form.question_ar) { setMsg('❌ أكتب السؤال'); setTimeout(() => setMsg(''), 3000); return }
    if (form.options.some((o: string) => !o.trim())) { setMsg('❌ أكمل كل الخيارات الأربعة'); setTimeout(() => setMsg(''), 3000); return }

    setSaving(true)
    const payload = {
      ...form,
      options: form.options,
      correct_answer: Number(form.correct_answer),
      xp_reward: Number(form.xp_reward),
      coins_reward: Number(form.coins_reward),
      difficulty: Number(form.difficulty),
      sort_order: Number(form.sort_order),
      roadmap_id: form.roadmap_id || null,
      starts_at: form.starts_at || null,
      ends_at: form.ends_at || null,
      image_url: form.image_url || null,
    }
    delete payload.roadmaps

    let res: Response
    if (editing) {
      res = await fetch(`${URL2}/rest/v1/challenges?id=eq.${editing}`, { method: 'PATCH', headers: H, body: JSON.stringify(payload) })
    } else {
      res = await fetch(`${URL2}/rest/v1/challenges`, { method: 'POST', headers: H, body: JSON.stringify(payload) })
    }

    if (res.ok || res.status === 201) {
      setMsg(editing ? '✅ تم التحديث' : '✅ تم إضافة التحدي')
      setForm({ ...EMPTY, options: ['', '', '', ''] })
      setEditing(null); setShowForm(false); setPreviewImg(null); load()
    } else {
      const err = await res.json().catch(() => ({}))
      setMsg('❌ ' + (err?.message || err?.details || res.status))
    }
    setSaving(false)
    setTimeout(() => setMsg(''), 4000)
  }

  const del = async (id: string) => {
    if (!confirm('حذف التحدي؟')) return
    await fetch(`${URL2}/rest/v1/challenges?id=eq.${id}`, { method: 'DELETE', headers: H })
    load()
  }

  const edit = (c: any) => {
    setForm({ ...EMPTY, ...c, options: Array.isArray(c.options) ? c.options : ['', '', '', ''], roadmap_id: c.roadmap_id || '' })
    setEditing(c.id)
    setPreviewImg(c.image_url || null)
    setShowForm(true)
  }

  const COLORS: Record<string, string> = { n8n_automation: '#58CC02', ai_video: '#FF9600', vibe_coding: '#CE82FF' }

  return (
    <div style={{ minHeight: '100vh', background: '#0f172a', color: '#fff', fontFamily: 'system-ui,sans-serif' }}>
      <header style={{ background: '#1e293b', borderBottom: '1px solid #334155', padding: '16px 32px', display: 'flex', alignItems: 'center', gap: 16 }}>
        <Link href="/" style={{ color: '#64748b', textDecoration: 'none', fontSize: 20 }}>←</Link>
        <h1 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: '#e2e8f0' }}>⚔️ إدارة التحديات</h1>
        <button onClick={() => { setForm({ ...EMPTY, options: ['', '', '', ''] }); setEditing(null); setPreviewImg(null); setShowForm(true) }}
          style={{ marginRight: 'auto', padding: '8px 20px', borderRadius: 8, border: 'none', background: '#CE82FF', color: '#fff', fontWeight: 700, cursor: 'pointer' }}>
          + تحدي جديد
        </button>
      </header>

      {msg && <div style={{ background: msg.startsWith('✅') ? '#166534' : '#7f1d1d', color: msg.startsWith('✅') ? '#bbf7d0' : '#fca5a5', padding: '12px 32px', fontSize: 14, fontWeight: 600 }}>{msg}</div>}

      <div style={{ padding: 32, maxWidth: 1200, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 12 }}>
        {items.length === 0 && (
          <div style={{ padding: 48, textAlign: 'center', color: '#64748b', background: '#1e293b', borderRadius: 16 }}>
            لا توجد تحديات — اضغط "+ تحدي جديد"
          </div>
        )}
        {items.map(c => (
          <div key={c.id} style={{ background: '#1e293b', borderRadius: 14, padding: 20, border: '1px solid #334155', display: 'flex', gap: 16 }}>
            {/* Image thumbnail */}
            {c.image_url && (
              <img src={c.image_url} alt="" style={{ width: 80, height: 60, borderRadius: 8, objectFit: 'cover', flexShrink: 0 }} />
            )}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 6 }}>
                <span style={{ fontWeight: 800, color: '#e2e8f0', fontSize: 16 }}>{c.title_ar}</span>
                <span style={{ background: (DIFF_COLORS[c.difficulty] || '#58CC02') + '25', color: DIFF_COLORS[c.difficulty] || '#58CC02', borderRadius: 6, padding: '2px 8px', fontSize: 11, fontWeight: 700 }}>
                  {DIFF[c.difficulty]}
                </span>
                <span style={{ background: c.is_active ? '#166534' : '#7f1d1d', color: c.is_active ? '#bbf7d0' : '#fca5a5', borderRadius: 6, padding: '2px 8px', fontSize: 11 }}>
                  {c.is_active ? 'نشط' : 'مخفي'}
                </span>
                {c.use_ai_validation && <span style={{ background: '#4c1d9525', color: '#a78bfa', borderRadius: 6, padding: '2px 8px', fontSize: 11 }}>🤖 Gemini AI</span>}
                {c.image_url && <span style={{ background: '#1e3a5f', color: '#60a5fa', borderRadius: 6, padding: '2px 8px', fontSize: 11 }}>📸 صورة</span>}
                {c.roadmaps && <span style={{ background: (COLORS[c.roadmaps.slug] || '#58CC02') + '25', color: COLORS[c.roadmaps.slug] || '#58CC02', borderRadius: 6, padding: '2px 8px', fontSize: 11 }}>{c.roadmaps.title_ar}</span>}
              </div>
              <div style={{ color: '#94a3b8', fontSize: 13, marginBottom: 6, textAlign: 'right' }}>{c.question_ar}</div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                {(Array.isArray(c.options) ? c.options : []).map((opt: string, i: number) => (
                  <span key={i} style={{ background: i === c.correct_answer ? '#166534' : '#334155', color: i === c.correct_answer ? '#bbf7d0' : '#94a3b8', borderRadius: 6, padding: '2px 8px', fontSize: 11 }}>
                    {i === c.correct_answer ? '✓ ' : ''}{opt}
                  </span>
                ))}
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flexShrink: 0 }}>
              <span style={{ color: '#fbbf24', fontWeight: 800, fontSize: 14 }}>+{c.xp_reward} XP</span>
              <button onClick={() => edit(c)} style={{ padding: '5px 12px', borderRadius: 6, border: '1px solid #334155', background: 'transparent', color: '#94a3b8', cursor: 'pointer', fontSize: 12 }}>تعديل</button>
              <button onClick={() => del(c.id)} style={{ padding: '5px 12px', borderRadius: 6, border: '1px solid #7f1d1d', background: 'transparent', color: '#f87171', cursor: 'pointer', fontSize: 12 }}>حذف</button>
            </div>
          </div>
        ))}
      </div>

      {/* Form Modal */}
      {showForm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div style={{ background: '#1e293b', borderRadius: 16, padding: 32, width: '100%', maxWidth: 680, maxHeight: '94vh', overflowY: 'auto', border: '1px solid #334155' }}>
            <h2 style={{ margin: '0 0 24px', color: '#e2e8f0', fontSize: 18 }}>{editing ? '✏️ تعديل تحدي' : '➕ تحدي جديد'}</h2>

            <div style={{ display: 'grid', gap: 16 }}>
              {/* Title */}
              <div>
                <label style={{ display: 'block', fontSize: 12, color: '#94a3b8', marginBottom: 6, fontWeight: 600 }}>عنوان التحدي *</label>
                <input value={form.title_ar} onChange={e => setForm({ ...form, title_ar: e.target.value })}
                  placeholder="مثال: تحدي n8n — HTTP Request"
                  style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: `1px solid ${form.title_ar ? '#CE82FF' : '#334155'}`, background: '#0f172a', color: '#fff', fontSize: 14, boxSizing: 'border-box' }} />
              </div>

              {/* Roadmap */}
              <div>
                <label style={{ display: 'block', fontSize: 12, color: '#94a3b8', marginBottom: 8, fontWeight: 600 }}>المسار (اختياري)</label>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button type="button" onClick={() => setForm({ ...form, roadmap_id: '' })}
                    style={{ flex: 1, padding: '8px', borderRadius: 8, border: `2px solid ${!form.roadmap_id ? '#CE82FF' : '#334155'}`, background: !form.roadmap_id ? '#CE82FF20' : 'transparent', color: !form.roadmap_id ? '#CE82FF' : '#64748b', cursor: 'pointer', fontSize: 12 }}>
                    كل المسارات
                  </button>
                  {roadmaps.map(r => (
                    <button key={r.id} type="button" onClick={() => setForm({ ...form, roadmap_id: r.id })}
                      style={{ flex: 1, padding: '8px', borderRadius: 8, border: `2px solid ${form.roadmap_id === r.id ? (COLORS[r.slug] || '#58CC02') : '#334155'}`, background: form.roadmap_id === r.id ? (COLORS[r.slug] || '#58CC02') + '20' : 'transparent', color: form.roadmap_id === r.id ? (COLORS[r.slug] || '#58CC02') : '#64748b', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>
                      {r.slug === 'n8n_automation' ? '⚡' : r.slug === 'ai_video' ? '🎬' : '💻'} {r.title_ar}
                    </button>
                  ))}
                </div>
              </div>

              {/* Question */}
              <div>
                <label style={{ display: 'block', fontSize: 12, color: '#94a3b8', marginBottom: 6, fontWeight: 600 }}>السؤال *</label>
                <textarea value={form.question_ar} onChange={e => setForm({ ...form, question_ar: e.target.value })}
                  rows={2} placeholder="أكمل الجملة: node الـ HTTP Request بيستخدم لـ ___"
                  style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #334155', background: '#0f172a', color: '#fff', fontSize: 14, boxSizing: 'border-box', resize: 'vertical' }} />
              </div>

              {/* Options */}
              <div>
                <label style={{ display: 'block', fontSize: 12, color: '#94a3b8', marginBottom: 8, fontWeight: 600 }}>الخيارات الأربعة * (اضغط على الخيار الصحيح)</label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {form.options.map((opt: string, i: number) => (
                    <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <button type="button" onClick={() => setForm({ ...form, correct_answer: i })}
                        style={{ width: 36, height: 36, borderRadius: 8, border: `2px solid ${form.correct_answer === i ? '#58CC02' : '#334155'}`, background: form.correct_answer === i ? '#58CC02' : 'transparent', color: form.correct_answer === i ? '#fff' : '#64748b', cursor: 'pointer', fontWeight: 800, fontSize: 14, flexShrink: 0 }}>
                        {['أ', 'ب', 'ج', 'د'][i]}
                      </button>
                      <input value={opt}
                        onChange={e => { const opts = [...form.options]; opts[i] = e.target.value; setForm({ ...form, options: opts }) }}
                        placeholder={`الخيار ${['الأول', 'الثاني', 'الثالث', 'الرابع'][i]}`}
                        style={{ flex: 1, padding: '10px 12px', borderRadius: 8, border: `1px solid ${form.correct_answer === i ? '#58CC02' : '#334155'}`, background: form.correct_answer === i ? '#1e3a2e' : '#0f172a', color: '#fff', fontSize: 14 }} />
                      {form.correct_answer === i && <span style={{ color: '#58CC02', fontSize: 18 }}>✓</span>}
                    </div>
                  ))}
                  <div style={{ fontSize: 12, color: '#475569', marginTop: 4 }}>💡 اضغط على الحرف أمام الخيار لتحديده كإجابة صحيحة</div>
                </div>
              </div>

              {/* Explanation */}
              <div>
                <label style={{ display: 'block', fontSize: 12, color: '#94a3b8', marginBottom: 6, fontWeight: 600 }}>شرح الإجابة الصحيحة</label>
                <textarea value={form.explanation_ar || ''} onChange={e => setForm({ ...form, explanation_ar: e.target.value })}
                  rows={2} placeholder="اشرح لماذا هذه الإجابة صحيحة..."
                  style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #334155', background: '#0f172a', color: '#fff', fontSize: 13, boxSizing: 'border-box', resize: 'vertical' }} />
              </div>

              {/* Image Upload */}
              <div style={{ background: '#0f172a', borderRadius: 12, padding: 16, border: '1px solid #334155' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                  <span style={{ fontSize: 18 }}>📸</span>
                  <span style={{ fontWeight: 700, color: '#94a3b8', fontSize: 14 }}>صورة الـ Node (اختياري)</span>
                  <span style={{ background: '#1e3a5f', color: '#60a5fa', borderRadius: 6, padding: '2px 8px', fontSize: 11 }}>يساعد Gemini على التحليل</span>
                </div>

                <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }}
                  onChange={e => { if (e.target.files?.[0]) uploadImage(e.target.files[0]) }} />

                {previewImg ? (
                  <div>
                    <img src={previewImg} alt="preview" style={{ width: '100%', borderRadius: 8, marginBottom: 8, maxHeight: 200, objectFit: 'contain', background: '#1e293b' }} />
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button type="button" onClick={() => fileRef.current?.click()}
                        style={{ flex: 1, padding: '8px', borderRadius: 8, border: '1px solid #334155', background: 'transparent', color: '#94a3b8', cursor: 'pointer', fontSize: 13 }}>
                        تغيير الصورة
                      </button>
                      <button type="button" onClick={() => { setPreviewImg(null); setForm((f: any) => ({ ...f, image_url: '' })) }}
                        style={{ padding: '8px 14px', borderRadius: 8, border: '1px solid #7f1d1d', background: 'transparent', color: '#f87171', cursor: 'pointer', fontSize: 13 }}>
                        حذف
                      </button>
                    </div>
                  </div>
                ) : (
                  <button type="button" onClick={() => fileRef.current?.click()} disabled={uploadingImg}
                    style={{ width: '100%', padding: '20px', borderRadius: 10, border: '2px dashed #334155', background: 'transparent', color: '#64748b', cursor: 'pointer', fontSize: 14, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 32 }}>{uploadingImg ? '⏳' : '📤'}</span>
                    <span>{uploadingImg ? 'جاري الرفع...' : 'اضغط لرفع صورة الـ Node'}</span>
                    <span style={{ fontSize: 12, color: '#475569' }}>PNG, JPG, WebP — ارفع screenshot من n8n</span>
                  </button>
                )}

                {previewImg && (
                  <div style={{ marginTop: 10 }}>
                    <label style={{ display: 'block', fontSize: 12, color: '#64748b', marginBottom: 4 }}>وصف الصورة للـ AI (اختياري)</label>
                    <input value={form.image_description || ''} onChange={e => setForm({ ...form, image_description: e.target.value })}
                      placeholder="مثال: workflow يحتوي على HTTP Request node متصل بـ Gmail"
                      style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid #334155', background: '#1e293b', color: '#fff', fontSize: 13, boxSizing: 'border-box' }} />
                  </div>
                )}
              </div>

              {/* Gemini AI Toggle */}
              <div style={{ background: '#0f172a', borderRadius: 12, padding: 16, border: `1px solid ${form.use_ai_validation ? '#7c3aed' : '#334155'}` }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', marginBottom: form.use_ai_validation ? 12 : 0 }}>
                  <div onClick={() => setForm({ ...form, use_ai_validation: !form.use_ai_validation })}
                    style={{ width: 44, height: 24, borderRadius: 99, background: form.use_ai_validation ? '#7c3aed' : '#334155', position: 'relative', cursor: 'pointer', transition: 'background 0.2s', flexShrink: 0 }}>
                    <div style={{ width: 18, height: 18, borderRadius: '50%', background: '#fff', position: 'absolute', top: 3, left: form.use_ai_validation ? 23 : 3, transition: 'left 0.2s' }} />
                  </div>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: form.use_ai_validation ? '#a78bfa' : '#94a3b8' }}>🤖 تفعيل Gemini AI للتحقق</div>
                    <div style={{ fontSize: 12, color: '#475569' }}>Gemini يحلل إجابة الطالب ويعطيه feedback مخصص</div>
                  </div>
                </label>

                {form.use_ai_validation && (
                  <div>
                    <label style={{ display: 'block', fontSize: 12, color: '#94a3b8', marginBottom: 6 }}>Prompt مخصص للـ AI (اختياري)</label>
                    <textarea value={form.ai_validation_prompt || ''} onChange={e => setForm({ ...form, ai_validation_prompt: e.target.value })}
                      rows={3} placeholder="اتركه فارغ لاستخدام الـ prompt الافتراضي..."
                      style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #334155', background: '#1e293b', color: '#fff', fontSize: 12, boxSizing: 'border-box', resize: 'vertical', fontFamily: 'monospace' }} />
                  </div>
                )}
              </div>

              {/* Settings Row */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 12, color: '#94a3b8', marginBottom: 6, fontWeight: 600 }}>XP</label>
                  <input type="number" value={form.xp_reward} onChange={e => setForm({ ...form, xp_reward: e.target.value })}
                    style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #334155', background: '#0f172a', color: '#fbbf24', fontSize: 14, boxSizing: 'border-box', fontWeight: 700 }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 12, color: '#94a3b8', marginBottom: 6, fontWeight: 600 }}>الصعوبة</label>
                  <select value={form.difficulty} onChange={e => setForm({ ...form, difficulty: Number(e.target.value) })}
                    style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #334155', background: '#0f172a', color: '#fff', fontSize: 13 }}>
                    {DIFF.slice(1).map((d, i) => <option key={i + 1} value={i + 1}>{d}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 12, color: '#94a3b8', marginBottom: 6, fontWeight: 600 }}>الترتيب</label>
                  <input type="number" value={form.sort_order} onChange={e => setForm({ ...form, sort_order: e.target.value })}
                    style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #334155', background: '#0f172a', color: '#fff', fontSize: 14, boxSizing: 'border-box' }} />
                </div>
              </div>

              {/* Dates */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                {[['starts_at', 'تاريخ البداية'], ['ends_at', 'تاريخ النهاية']].map(([k, l]) => (
                  <div key={k}>
                    <label style={{ display: 'block', fontSize: 12, color: '#94a3b8', marginBottom: 6, fontWeight: 600 }}>{l}</label>
                    <input type="datetime-local" value={(form as any)[k]?.slice(0, 16) || ''}
                      onChange={e => setForm({ ...form, [k]: e.target.value })}
                      style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #334155', background: '#0f172a', color: '#fff', fontSize: 13, boxSizing: 'border-box' }} />
                  </div>
                ))}
              </div>

              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                <input type="checkbox" checked={form.is_active} onChange={e => setForm({ ...form, is_active: e.target.checked })} style={{ width: 16, height: 16 }} />
                <span style={{ color: '#e2e8f0', fontSize: 14 }}>نشط ومرئي للطلاب</span>
              </label>
            </div>

            <div style={{ display: 'flex', gap: 12, marginTop: 24 }}>
              <button onClick={save} disabled={saving}
                style={{ flex: 1, padding: '13px', borderRadius: 8, border: 'none', background: saving ? '#334155' : '#CE82FF', color: '#fff', fontWeight: 800, cursor: saving ? 'not-allowed' : 'pointer', fontSize: 15 }}>
                {saving ? '⏳ جاري الحفظ...' : editing ? '💾 تحديث التحدي' : '✅ إضافة التحدي'}
              </button>
              <button onClick={() => { setShowForm(false); setForm({ ...EMPTY, options: ['', '', '', ''] }); setEditing(null); setPreviewImg(null) }}
                style={{ padding: '13px 24px', borderRadius: 8, border: '1px solid #334155', background: 'transparent', color: '#94a3b8', cursor: 'pointer' }}>إلغاء</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
