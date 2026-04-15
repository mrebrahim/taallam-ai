'use client'
import { useEffect, useState, useRef } from 'react'
import Link from 'next/link'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const H = { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}`, 'Content-Type': 'application/json', 'Prefer': 'return=representation' }

type EntryType = 'lesson' | 'challenge'
type BlockType = 'text' | 'image' | 'file' | 'code'
interface Block { id: string; type: BlockType; content?: string; url?: string; caption?: string; name?: string; drive_url?: string; description?: string; language?: string; code?: string }

const EMPTY_LESSON = {
  title_ar: '', title: '', description_ar: '',
  xp_reward: 50, video_duration_seconds: 600,
  lesson_type: 'video' as const,
  is_active: true, is_free: false, sort_order: 1,
  vimeo_id: '', vimeo_url: '', video_url: '',
  roadmap_id: '',
  content_blocks: [] as Block[],
  resources: [] as any[],
  linked_challenge_id: '',
}

function extractVimeoId(input: string): string {
  if (!input) return ''
  if (/^\d+$/.test(input.trim())) return input.trim()
  const m = input.match(/vimeo\.com\/(\d+)/) || input.match(/video\/(\d+)/)
  return m ? m[1] : input.trim()
}

const uid = () => Math.random().toString(36).slice(2, 9)

export default function LessonsPage() {
  const [items, setItems] = useState<any[]>([])
  const [challenges, setChallenges] = useState<any[]>([])
  const [roadmaps, setRoadmaps] = useState<any[]>([])
  const [entryType, setEntryType] = useState<EntryType>('lesson')
  const [form, setForm] = useState<any>({ ...EMPTY_LESSON })
  const [editing, setEditing] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [filter, setFilter] = useState('')
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')
  const [vimeoPreview, setVimeoPreview] = useState<string | null>(null)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [showBulk, setShowBulk] = useState(false)
  const [bulkAction, setBulkAction] = useState('')

  // For challenge form when entryType === 'challenge'
  const [challengeForm, setChallengeForm] = useState<any>({
    title_ar: '', description_ar: '', challenge_type: 'complete_sentence',
    question_ar: '', options: ['', '', '', ''], correct_answer: 0,
    explanation_ar: '', image_url: '', use_ai_validation: false,
    xp_reward: 100, difficulty: 1, is_active: true, sort_order: 0, roadmap_id: '',
  })
  const challengeImgRef = useRef<HTMLInputElement>(null)
  const [challengeImgPreview, setChallengeImgPreview] = useState<string | null>(null)
  const [uploadingImg, setUploadingImg] = useState(false)

  useEffect(() => { load() }, [])

  const load = async () => {
    const [l, r, c] = await Promise.all([
      fetch(`${SUPABASE_URL}/rest/v1/lessons?select=*,roadmaps(title_ar,slug)&order=roadmap_id,sort_order`, { headers: H }).then(r => r.json()),
      fetch(`${SUPABASE_URL}/rest/v1/roadmaps?select=*&order=sort_order`, { headers: H }).then(r => r.json()),
      fetch(`${SUPABASE_URL}/rest/v1/challenges?select=id,title_ar,challenge_type&order=created_at.desc`, { headers: H }).then(r => r.json()),
    ])
    setItems(Array.isArray(l) ? l : [])
    setRoadmaps(Array.isArray(r) ? r : [])
    setChallenges(Array.isArray(c) ? c : [])
    setSelected(new Set())
  }

  const handleVimeoInput = (value: string) => {
    const id = extractVimeoId(value)
    setForm((f: any) => ({ ...f, vimeo_url: value, vimeo_id: id }))
    if (id && /^\d+$/.test(id)) setVimeoPreview(`https://player.vimeo.com/video/${id}?title=0&byline=0&portrait=0`)
    else setVimeoPreview(null)
  }

  // ── Block helpers ──
  const addBlock = (type: BlockType) => {
    const block: Block = { id: uid(), type }
    if (type === 'text') block.content = ''
    if (type === 'image') { block.url = ''; block.caption = '' }
    if (type === 'file') { block.name = ''; block.drive_url = ''; block.description = '' }
    if (type === 'code') { block.language = 'javascript'; block.code = '' }
    setForm((f: any) => ({ ...f, content_blocks: [...(f.content_blocks || []), block] }))
  }

  const updateBlock = (id: string, patch: Partial<Block>) => {
    setForm((f: any) => ({
      ...f,
      content_blocks: (f.content_blocks || []).map((b: Block) => b.id === id ? { ...b, ...patch } : b)
    }))
  }

  const removeBlock = (id: string) => {
    setForm((f: any) => ({ ...f, content_blocks: (f.content_blocks || []).filter((b: Block) => b.id !== id) }))
  }

  const addResource = () => {
    setForm((f: any) => ({ ...f, resources: [...(f.resources || []), { id: uid(), name: '', drive_url: '', type: 'link', description: '' }] }))
  }

  const updateResource = (id: string, patch: any) => {
    setForm((f: any) => ({ ...f, resources: (f.resources || []).map((r: any) => r.id === id ? { ...r, ...patch } : r) }))
  }

  const removeResource = (id: string) => {
    setForm((f: any) => ({ ...f, resources: (f.resources || []).filter((r: any) => r.id !== id) }))
  }

  // ── Save lesson ──
  const saveLesson = async () => {
    if (!form.roadmap_id) { setMsg('❌ اختر المسار'); setTimeout(() => setMsg(''), 3000); return }
    if (!form.title_ar) { setMsg('❌ اكتب عنوان الدرس'); setTimeout(() => setMsg(''), 3000); return }
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
      content_blocks: form.content_blocks || [],
      resources: form.resources || [],
      linked_challenge_id: form.linked_challenge_id || null,
    }

    let res: Response
    if (editing) {
      res = await fetch(`${SUPABASE_URL}/rest/v1/lessons?id=eq.${editing}`, { method: 'PATCH', headers: H, body: JSON.stringify(payload) })
    } else {
      res = await fetch(`${SUPABASE_URL}/rest/v1/lessons`, { method: 'POST', headers: H, body: JSON.stringify(payload) })
    }

    if (res.ok || res.status === 201) {
      setMsg('✅ تم حفظ الدرس')
      resetForm(); load()
    } else {
      const err = await res.json().catch(() => ({}))
      setMsg('❌ ' + (err?.message || err?.details || res.status))
    }
    setSaving(false)
    setTimeout(() => setMsg(''), 4000)
  }

  // ── Upload challenge image ──
  const uploadChallengeImg = async (file: File) => {
    setUploadingImg(true)
    const ext = file.name.split('.').pop()
    const filename = `challenge-${Date.now()}.${ext}`
    const res = await fetch(`${SUPABASE_URL}/storage/v1/object/challenges/${filename}`, {
      method: 'POST', headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}`, 'Content-Type': file.type, 'x-upsert': 'true' }, body: file,
    })
    if (res.ok) {
      const url = `${SUPABASE_URL}/storage/v1/object/public/challenges/${filename}`
      setChallengeForm((f: any) => ({ ...f, image_url: url }))
      setChallengeImgPreview(url)
    } else {
      setMsg('❌ فشل رفع الصورة — تأكد من إنشاء bucket "challenges" في Supabase Storage')
      setTimeout(() => setMsg(''), 4000)
    }
    setUploadingImg(false)
  }

  // ── Save challenge and auto-link to current lesson ──
  const saveChallenge = async () => {
    if (!challengeForm.title_ar?.trim()) { 
      setMsg('❌ اكتب عنوان التحدي'); setTimeout(() => setMsg(''), 3000); return 
    }
    if (!challengeForm.question_ar?.trim()) { 
      setMsg('❌ اكتب السؤال'); setTimeout(() => setMsg(''), 3000); return 
    }
    if (challengeForm.challenge_type === 'complete_sentence') {
      const opts = challengeForm.options || []
      if (opts.length < 4 || opts.some((o: string) => !o?.trim())) {
        setMsg('❌ أكمل الخيارات الأربعة'); setTimeout(() => setMsg(''), 3000); return
      }
    }
    setSaving(true)
    try {
      const payload: any = {
        title_ar: challengeForm.title_ar.trim(),
        description_ar: challengeForm.description_ar || null,
        challenge_type: challengeForm.challenge_type || 'complete_sentence',
        question_ar: challengeForm.question_ar.trim(),
        options: challengeForm.options || [],
        correct_answer: Number(challengeForm.correct_answer) || 0,
        explanation_ar: challengeForm.explanation_ar || null,
        image_url: challengeForm.image_url || null,
        xp_reward: Number(challengeForm.xp_reward) || 100,
        difficulty: Number(challengeForm.difficulty) || 1,
        sort_order: Number(challengeForm.sort_order) || 0,
        roadmap_id: challengeForm.roadmap_id || form.roadmap_id || null,
        is_active: true,
        use_ai_validation: challengeForm.use_ai_validation || false,
      }

      // Use direct fetch with explicit headers for better control
      const resp = await fetch(
        `${SUPABASE_URL}/rest/v1/challenges`,
        {
          method: 'POST',
          headers: {
            'apikey': SUPABASE_KEY,
            'Authorization': `Bearer ${SUPABASE_KEY}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=representation',
          },
          body: JSON.stringify(payload),
        }
      )

      const respText = await resp.text()
      console.log('Challenge save response:', resp.status, respText)

      if (resp.ok || resp.status === 201) {
        let newChallenge: any = null
        try {
          const parsed = JSON.parse(respText)
          newChallenge = Array.isArray(parsed) ? parsed[0] : parsed
        } catch {}

        if (newChallenge?.id) {
          setForm((f: any) => ({ ...f, linked_challenge_id: newChallenge.id }))
          setMsg('✅ تم إنشاء التحدي وربطه بالدرس تلقائياً! الآن احفظ الدرس.')
        } else {
          setMsg('✅ تم إضافة التحدي')
        }

        // Reset challenge form and go back to lesson view
        setChallengeForm({
          title_ar: '', description_ar: '', challenge_type: 'complete_sentence',
          question_ar: '', options: ['', '', '', ''], correct_answer: 0,
          explanation_ar: '', image_url: '', use_ai_validation: false,
          xp_reward: 100, difficulty: 1, is_active: true, sort_order: 0, roadmap_id: ''
        })
        setEntryType('lesson')
        load()
      } else {
        let errMsg = `HTTP ${resp.status}`
        try {
          const errBody = JSON.parse(respText)
          errMsg = errBody?.message || errBody?.details || errBody?.hint || errMsg
        } catch {}
        console.error('Challenge save failed:', resp.status, respText)
        setMsg('❌ ' + errMsg)
      }
    } catch (e: any) {
      console.error('Challenge save exception:', e)
      setMsg('❌ ' + (e?.message || 'خطأ غير متوقع'))
    }
    setSaving(false)
    setTimeout(() => setMsg(''), 6000)
  }

  const resetForm = () => {
    setForm({ ...EMPTY_LESSON }); setEditing(null); setShowForm(false)
    setVimeoPreview(null); setEntryType('lesson')
    setChallengeForm({ title_ar: '', description_ar: '', challenge_type: 'complete_sentence', question_ar: '', options: ['', '', '', ''], correct_answer: 0, explanation_ar: '', image_url: '', use_ai_validation: false, xp_reward: 100, difficulty: 1, is_active: true, sort_order: 0, roadmap_id: '' })
    setChallengeImgPreview(null)
  }

  const del = async (id: string) => {
    if (!confirm('حذف؟')) return
    await fetch(`${SUPABASE_URL}/rest/v1/lessons?id=eq.${id}`, { method: 'DELETE', headers: H })
    load()
  }

  const edit = (l: any) => {
    setEntryType('lesson')
    setForm({ ...EMPTY_LESSON, ...l, roadmap_id: l.roadmap_id || '', content_blocks: l.content_blocks || [], resources: l.resources || [], linked_challenge_id: l.linked_challenge_id || '' })
    setEditing(l.id)
    if (l.vimeo_id) setVimeoPreview(`https://player.vimeo.com/video/${l.vimeo_id}?title=0&byline=0&portrait=0`)
    setShowForm(true)
  }

  const toggleSelect = (id: string) => setSelected(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })
  const toggleAll = () => setSelected(selected.size === filtered.length ? new Set() : new Set(filtered.map((l: any) => l.id)))

  const executeBulk = async () => {
    const ids = Array.from(selected)
    if (bulkAction === 'delete') {
      if (!confirm(`حذف ${ids.length} درس؟`)) return
      await Promise.all(ids.map(id => fetch(`${SUPABASE_URL}/rest/v1/lessons?id=eq.${id}`, { method: 'DELETE', headers: H })))
      setMsg(`✅ تم حذف ${ids.length} درس`)
    } else {
      const val = bulkAction === 'activate'
      await Promise.all(ids.map(id => fetch(`${SUPABASE_URL}/rest/v1/lessons?id=eq.${id}`, { method: 'PATCH', headers: H, body: JSON.stringify({ is_active: val }) })))
      setMsg(`✅ تم ${val ? 'تفعيل' : 'إخفاء'} ${ids.length} درس`)
    }
    setShowBulk(false); setBulkAction(''); load()
    setTimeout(() => setMsg(''), 3000)
  }

  const filtered = items.filter(l => !filter || l.roadmap_id === filter)
  const COLORS: Record<string, string> = { n8n_automation: '#58CC02', ai_video: '#FF9600', vibe_coding: '#CE82FF' }
  const allSel = filtered.length > 0 && selected.size === filtered.length
  const someSel = selected.size > 0

  return (
    <div style={{ minHeight: '100vh', background: '#0f172a', color: '#fff', fontFamily: 'system-ui,sans-serif' }}>
      <header style={{ background: '#1e293b', borderBottom: '1px solid #334155', padding: '16px 32px', display: 'flex', alignItems: 'center', gap: 16 }}>
        <Link href="/" style={{ color: '#64748b', textDecoration: 'none', fontSize: 20 }}>←</Link>
        <h1 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: '#e2e8f0' }}>📚 إدارة المحتوى</h1>
        <button onClick={() => { resetForm(); setShowForm(true) }}
          style={{ marginRight: 'auto', padding: '8px 20px', borderRadius: 8, border: 'none', background: '#58CC02', color: '#fff', fontWeight: 700, cursor: 'pointer' }}>
          + محتوى جديد
        </button>
      </header>

      {msg && <div style={{ background: msg.startsWith('✅') ? '#166534' : '#7f1d1d', color: msg.startsWith('✅') ? '#bbf7d0' : '#fca5a5', padding: '12px 32px', fontSize: 14, fontWeight: 600 }}>{msg}</div>}

      <div style={{ padding: 32, maxWidth: 1400, margin: '0 auto' }}>
        {/* Filters */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
          <button onClick={() => { setFilter(''); setSelected(new Set()) }} style={{ padding: '6px 16px', borderRadius: 8, border: 'none', background: filter === '' ? '#58CC02' : '#1e293b', color: '#fff', cursor: 'pointer', fontWeight: 600, fontSize: 13 }}>
            الكل ({items.length})
          </button>
          {roadmaps.map(r => (
            <button key={r.id} onClick={() => { setFilter(r.id); setSelected(new Set()) }}
              style={{ padding: '6px 16px', borderRadius: 8, border: 'none', background: filter === r.id ? (COLORS[r.slug] || '#58CC02') : '#1e293b', color: '#fff', cursor: 'pointer', fontWeight: 600, fontSize: 13 }}>
              {r.slug === 'n8n_automation' ? '⚡' : r.slug === 'ai_video' ? '🎬' : '💻'} {r.title_ar} ({items.filter(l => l.roadmap_id === r.id).length})
            </button>
          ))}
        </div>

        {/* Bulk bar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12, padding: '10px 16px', background: '#1e293b', borderRadius: 10, border: '1px solid #334155' }}>
          <div onClick={toggleAll} style={{ width: 20, height: 20, borderRadius: 4, border: `2px solid ${allSel ? '#58CC02' : '#475569'}`, background: allSel ? '#58CC02' : someSel ? '#1e3a2e' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}>
            {allSel && <span style={{ color: '#fff', fontSize: 13, fontWeight: 900 }}>✓</span>}
            {someSel && !allSel && <span style={{ color: '#58CC02', fontSize: 14, lineHeight: 1 }}>—</span>}
          </div>
          <span style={{ fontSize: 13, color: someSel ? '#e2e8f0' : '#64748b' }}>{someSel ? `${selected.size} محدد` : 'تحديد الكل'}</span>
          {someSel && (<>
            <div style={{ width: 1, height: 24, background: '#334155' }} />
            <button onClick={() => { setBulkAction('activate'); setShowBulk(true) }} style={{ padding: '4px 12px', borderRadius: 6, border: '1px solid #166534', background: 'transparent', color: '#4ade80', cursor: 'pointer', fontSize: 12 }}>✅ تفعيل</button>
            <button onClick={() => { setBulkAction('deactivate'); setShowBulk(true) }} style={{ padding: '4px 12px', borderRadius: 6, border: '1px solid #854d0e', background: 'transparent', color: '#fbbf24', cursor: 'pointer', fontSize: 12 }}>⏸️ إخفاء</button>
            <button onClick={() => { setBulkAction('delete'); executeBulk() }} style={{ padding: '4px 12px', borderRadius: 6, border: '1px solid #7f1d1d', background: 'transparent', color: '#f87171', cursor: 'pointer', fontSize: 12 }}>🗑️ حذف ({selected.size})</button>
            <button onClick={() => setSelected(new Set())} style={{ padding: '4px 12px', borderRadius: 6, border: '1px solid #334155', background: 'transparent', color: '#64748b', cursor: 'pointer', fontSize: 12 }}>✕</button>
          </>)}
          <span style={{ marginRight: 'auto', fontSize: 12, color: '#475569' }}>{filtered.length} عنصر</span>
        </div>

        {/* Table */}
        <div style={{ background: '#1e293b', borderRadius: 12, border: '1px solid #334155', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #334155', background: '#0f172a' }}>
                <th style={{ padding: '10px 12px', width: 36 }}></th>
                {['#', 'العنوان', 'المسار', 'الفيديو', 'المحتوى', 'XP', 'الحالة', ''].map(h => (
                  <th key={h} style={{ padding: '10px 12px', textAlign: 'right', fontSize: 11, color: '#64748b', fontWeight: 600 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((l, i) => {
                const isSel = selected.has(l.id)
                const hasVimeo = l.vimeo_id
                const hasBlocks = l.content_blocks?.length > 0
                const hasResources = l.resources?.length > 0
                const hasChallenge = l.linked_challenge_id
                const linkedCh = hasChallenge ? challenges.find((ch: any) => ch.id === l.linked_challenge_id) : null
                return (
                  <tr key={l.id} style={{ borderBottom: '1px solid #1e293b', background: isSel ? '#1e3a2e' : i % 2 === 0 ? 'transparent' : '#ffffff05' }}>
                    <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                      <div onClick={() => toggleSelect(l.id)} style={{ width: 16, height: 16, borderRadius: 3, border: `2px solid ${isSel ? '#58CC02' : '#475569'}`, background: isSel ? '#58CC02' : 'transparent', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                        {isSel && <span style={{ color: '#fff', fontSize: 10, fontWeight: 900 }}>✓</span>}
                      </div>
                    </td>
                    <td style={{ padding: '10px 12px', color: '#64748b', fontSize: 12 }}>{l.sort_order}</td>
                    <td style={{ padding: '10px 12px' }}>
                      <div style={{ fontWeight: 600, color: '#e2e8f0', fontSize: 14 }}>{l.title_ar}</div>
                      {l.description_ar && <div style={{ fontSize: 11, color: '#64748b', marginTop: 1 }}>{l.description_ar.slice(0, 50)}...</div>}
                    </td>
                    <td style={{ padding: '10px 12px' }}>
                      <span style={{ background: (COLORS[l.roadmaps?.slug] || '#58CC02') + '25', color: COLORS[l.roadmaps?.slug] || '#58CC02', borderRadius: 6, padding: '2px 8px', fontSize: 11, fontWeight: 700 }}>
                        {l.roadmaps?.title_ar || '—'}
                      </span>
                    </td>
                    <td style={{ padding: '10px 12px' }}>
                      {hasVimeo ? (
                        <span style={{ background: '#1a3a5c', color: '#60a5fa', borderRadius: 6, padding: '2px 8px', fontSize: 11 }}>🎬 Vimeo</span>
                      ) : l.video_url ? (
                        <span style={{ background: '#3a1a1a', color: '#f87171', borderRadius: 6, padding: '2px 8px', fontSize: 11 }}>📺 YT</span>
                      ) : <span style={{ color: '#475569', fontSize: 11 }}>—</span>}
                    </td>
                    <td style={{ padding: '10px 12px' }}>
                      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                        {hasBlocks && <span style={{ background: '#1e3a2e', color: '#4ade80', borderRadius: 6, padding: '2px 6px', fontSize: 10 }}>📝 {l.content_blocks.length}</span>}
                        {hasResources && <span style={{ background: '#1e293b', color: '#94a3b8', borderRadius: 6, padding: '2px 6px', fontSize: 10 }}>📎 {l.resources.length}</span>}
                        {hasChallenge && <span style={{ background: '#2d1a4e', color: '#a78bfa', borderRadius: 6, padding: '2px 6px', fontSize: 10 }}>⚔️</span>}
                      </div>
                    </td>
                    <td style={{ padding: '10px 12px', color: '#fbbf24', fontWeight: 700, fontSize: 13 }}>{l.xp_reward}</td>
                    <td style={{ padding: '10px 12px' }}>
                      <span style={{ background: l.is_active ? '#166534' : '#7f1d1d', color: l.is_active ? '#bbf7d0' : '#fca5a5', borderRadius: 6, padding: '2px 8px', fontSize: 11 }}>
                        {l.is_active ? 'نشط' : 'مخفي'}
                      </span>
                    </td>
                    <td style={{ padding: '10px 12px' }}>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button onClick={() => edit(l)} style={{ padding: '3px 10px', borderRadius: 5, border: '1px solid #334155', background: 'transparent', color: '#94a3b8', cursor: 'pointer', fontSize: 11 }}>تعديل</button>
                        <button onClick={() => del(l.id)} style={{ padding: '3px 10px', borderRadius: 5, border: '1px solid #7f1d1d', background: 'transparent', color: '#f87171', cursor: 'pointer', fontSize: 11 }}>حذف</button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          {filtered.length === 0 && <div style={{ padding: 40, textAlign: 'center', color: '#64748b' }}>لا يوجد محتوى — اضغط "+ محتوى جديد"</div>}
        </div>
      </div>

      {/* ══ MAIN FORM MODAL ══ */}
      {showForm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div style={{ background: '#1e293b', borderRadius: 16, width: '100%', maxWidth: 720, maxHeight: '95vh', overflowY: 'auto', border: '1px solid #334155' }}>

            {/* Header */}
            <div style={{ padding: '20px 28px 0', position: 'sticky', top: 0, background: '#1e293b', zIndex: 10, borderBottom: '1px solid #334155', paddingBottom: 16, marginBottom: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <h2 style={{ margin: 0, color: '#e2e8f0', fontSize: 18 }}>{editing ? 'تعديل محتوى' : 'محتوى جديد'}</h2>
                <button onClick={resetForm} style={{ width: 32, height: 32, borderRadius: 8, border: 'none', background: '#334155', color: '#94a3b8', cursor: 'pointer', fontSize: 16 }}>✕</button>
              </div>

              {/* Type Selector — Lesson or Challenge */}
              {!editing && (
                <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
                  {([['lesson', '📚', 'درس', 'فيديو + محتوى + مصادر'], ['challenge', '⚔️', 'تحدي', 'MCQ أو رفع صورة + Gemini AI']] as [EntryType, string, string, string][]).map(([type, icon, label, desc]) => (
                    <button key={type} onClick={() => setEntryType(type)}
                      style={{ flex: 1, padding: '14px', borderRadius: 10, border: `2px solid ${entryType === type ? (type === 'lesson' ? '#58CC02' : '#CE82FF') : '#334155'}`, background: entryType === type ? (type === 'lesson' ? '#1e3a2e' : '#2d1a4e') : 'transparent', cursor: 'pointer', textAlign: 'right' }}>
                      <div style={{ fontSize: 22, marginBottom: 4 }}>{icon}</div>
                      <div style={{ fontWeight: 800, color: entryType === type ? (type === 'lesson' ? '#4ade80' : '#a78bfa') : '#94a3b8', fontSize: 15 }}>{label}</div>
                      <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>{desc}</div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div style={{ padding: '0 28px 28px' }}>

              {/* ══ LESSON FORM ══ */}
              {entryType === 'lesson' && (
                <div style={{ display: 'grid', gap: 16 }}>

                  {/* Roadmap */}
                  <div>
                    <label style={{ display: 'block', fontSize: 12, color: '#94a3b8', marginBottom: 8, fontWeight: 600 }}>المسار *</label>
                    <div style={{ display: 'flex', gap: 8 }}>
                      {roadmaps.map(r => (
                        <button key={r.id} type="button" onClick={() => setForm((f: any) => ({ ...f, roadmap_id: r.id }))}
                          style={{ flex: 1, padding: '10px', borderRadius: 8, border: `2px solid ${form.roadmap_id === r.id ? (COLORS[r.slug] || '#58CC02') : '#334155'}`, background: form.roadmap_id === r.id ? (COLORS[r.slug] || '#58CC02') + '20' : 'transparent', color: form.roadmap_id === r.id ? (COLORS[r.slug] || '#58CC02') : '#64748b', cursor: 'pointer', fontWeight: 700, fontSize: 13 }}>
                          {r.slug === 'n8n_automation' ? '⚡' : r.slug === 'ai_video' ? '🎬' : '💻'} {r.title_ar}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Title */}
                  <div>
                    <label style={{ display: 'block', fontSize: 12, color: '#94a3b8', marginBottom: 6, fontWeight: 600 }}>عنوان الدرس *</label>
                    <input value={form.title_ar} onChange={e => setForm((f: any) => ({ ...f, title_ar: e.target.value, title: e.target.value }))} placeholder="مثال: مقدمة في n8n"
                      style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: `1px solid ${form.title_ar ? '#58CC02' : '#334155'}`, background: '#0f172a', color: '#fff', fontSize: 14, boxSizing: 'border-box' }} />
                  </div>

                  {/* Description */}
                  <div>
                    <label style={{ display: 'block', fontSize: 12, color: '#94a3b8', marginBottom: 6, fontWeight: 600 }}>وصف مختصر</label>
                    <textarea value={form.description_ar || ''} onChange={e => setForm((f: any) => ({ ...f, description_ar: e.target.value }))} rows={2}
                      placeholder="ماذا سيتعلم الطالب..."
                      style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #334155', background: '#0f172a', color: '#fff', fontSize: 13, boxSizing: 'border-box', resize: 'vertical' }} />
                  </div>

                  {/* Vimeo */}
                  <div style={{ background: '#0f172a', borderRadius: 12, padding: 16, border: '2px solid #1d4ed8' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                      <span style={{ fontSize: 18 }}>🎬</span>
                      <span style={{ fontWeight: 700, color: '#60a5fa', fontSize: 14 }}>🎬 Vimeo — مطلوب للتطبيق المحمول</span>
                    </div>
                    <input value={form.vimeo_url || ''} onChange={e => handleVimeoInput(e.target.value)} placeholder="https://vimeo.com/123456789  أو  123456789"
                      style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: `1px solid ${form.vimeo_id ? '#1d4ed8' : '#334155'}`, background: '#1e293b', color: '#fff', fontSize: 13, boxSizing: 'border-box', fontFamily: 'monospace' }} />
                    {form.vimeo_id && <div style={{ marginTop: 6, fontSize: 12, color: '#60a5fa' }}>✅ Vimeo ID: {form.vimeo_id} — سيظهر في التطبيق المحمول ✅</div>}
                    {vimeoPreview && (
                      <div style={{ marginTop: 10, position: 'relative', paddingBottom: '56.25%', borderRadius: 8, overflow: 'hidden', background: '#000' }}>
                        <iframe src={vimeoPreview} style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', border: 'none' }} allow="autoplay; fullscreen" allowFullScreen />
                      </div>
                    )}
                  </div>

                  {/* YouTube fallback */}
                  <div style={{ background: '#0f172a', borderRadius: 12, padding: 12, border: '1px solid #334155' }}>
                    <div style={{ fontSize: 12, color: '#64748b', marginBottom: 6 }}>📺 YouTube (احتياطي — للمتصفح فقط)</div>
                    <input value={form.video_url || ''} onChange={e => setForm((f: any) => ({ ...f, video_url: e.target.value }))} placeholder="https://youtube.com/watch?v=..."
                      style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid #334155', background: '#1e293b', color: '#fff', fontSize: 13, boxSizing: 'border-box', fontFamily: 'monospace' }} />
                  </div>

                  {/* ── CONTENT BLOCKS ── */}
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                      <label style={{ fontSize: 13, color: '#e2e8f0', fontWeight: 700 }}>📝 محتوى الدرس</label>
                      <div style={{ display: 'flex', gap: 6 }}>
                        {([['text', '📄', 'نص'], ['image', '🖼️', 'صورة'], ['file', '📎', 'ملف'], ['code', '💻', 'كود']] as [BlockType, string, string][]).map(([t, icon, label]) => (
                          <button key={t} type="button" onClick={() => addBlock(t)}
                            style={{ padding: '5px 10px', borderRadius: 6, border: '1px solid #334155', background: '#0f172a', color: '#94a3b8', cursor: 'pointer', fontSize: 11, display: 'flex', alignItems: 'center', gap: 4 }}>
                            {icon} {label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {(form.content_blocks || []).length === 0 && (
                      <div style={{ padding: '20px', border: '2px dashed #334155', borderRadius: 10, textAlign: 'center', color: '#475569', fontSize: 13 }}>
                        اضغط على نص / صورة / ملف / كود لإضافة محتوى
                      </div>
                    )}

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                      {(form.content_blocks || []).map((block: Block) => (
                        <div key={block.id} style={{ background: '#0f172a', borderRadius: 10, padding: 12, border: '1px solid #334155', position: 'relative' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                            <span style={{ fontSize: 11, color: '#64748b', fontWeight: 600 }}>
                              {block.type === 'text' ? '📄 نص' : block.type === 'image' ? '🖼️ صورة' : block.type === 'file' ? '📎 ملف' : '💻 كود'}
                            </span>
                            <button onClick={() => removeBlock(block.id)} style={{ width: 22, height: 22, borderRadius: 4, border: 'none', background: '#7f1d1d', color: '#fca5a5', cursor: 'pointer', fontSize: 12 }}>✕</button>
                          </div>

                          {block.type === 'text' && (
                            <textarea value={block.content || ''} onChange={e => updateBlock(block.id, { content: e.target.value })}
                              rows={3} placeholder="اكتب النص هنا..."
                              style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #334155', background: '#1e293b', color: '#fff', fontSize: 13, boxSizing: 'border-box', resize: 'vertical' }} />
                          )}

                          {block.type === 'image' && (
                            <div style={{ display: 'grid', gap: 8 }}>
                              <input value={block.url || ''} onChange={e => updateBlock(block.id, { url: e.target.value })} placeholder="رابط الصورة (URL)"
                                style={{ padding: '8px 10px', borderRadius: 6, border: '1px solid #334155', background: '#1e293b', color: '#fff', fontSize: 13 }} />
                              <input value={block.caption || ''} onChange={e => updateBlock(block.id, { caption: e.target.value })} placeholder="وصف الصورة (اختياري)"
                                style={{ padding: '8px 10px', borderRadius: 6, border: '1px solid #334155', background: '#1e293b', color: '#fff', fontSize: 13 }} />
                              {block.url && <img src={block.url} alt="" style={{ width: '100%', borderRadius: 6, maxHeight: 120, objectFit: 'contain', background: '#334155' }} />}
                            </div>
                          )}

                          {block.type === 'file' && (
                            <div style={{ display: 'grid', gap: 8 }}>
                              <div style={{ background: '#1e293b', borderRadius: 8, padding: '10px 12px', border: '1px solid #334155' }}>
                                <div style={{ fontSize: 11, color: '#60a5fa', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
                                  <span>📌</span> رابط Google Drive (مؤقتاً)
                                </div>
                                <input value={block.drive_url || ''} onChange={e => updateBlock(block.id, { drive_url: e.target.value })}
                                  placeholder="https://drive.google.com/file/d/..."
                                  style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: `1px solid ${block.drive_url ? '#1d4ed8' : '#334155'}`, background: '#0f172a', color: '#fff', fontSize: 12, fontFamily: 'monospace', boxSizing: 'border-box' }} />
                              </div>
                              <input value={block.name || ''} onChange={e => updateBlock(block.id, { name: e.target.value })} placeholder="اسم الملف (مثال: Workflow Template.json)"
                                style={{ padding: '8px 10px', borderRadius: 6, border: '1px solid #334155', background: '#1e293b', color: '#fff', fontSize: 13 }} />
                              <input value={block.description || ''} onChange={e => updateBlock(block.id, { description: e.target.value })} placeholder="وصف الملف (اختياري)"
                                style={{ padding: '8px 10px', borderRadius: 6, border: '1px solid #334155', background: '#1e293b', color: '#fff', fontSize: 13 }} />
                            </div>
                          )}

                          {block.type === 'code' && (
                            <div style={{ display: 'grid', gap: 8 }}>
                              <select value={block.language || 'javascript'} onChange={e => updateBlock(block.id, { language: e.target.value })}
                                style={{ padding: '6px 10px', borderRadius: 6, border: '1px solid #334155', background: '#1e293b', color: '#fff', fontSize: 12 }}>
                                {['javascript', 'python', 'json', 'bash', 'typescript', 'html', 'css', 'sql'].map(l => <option key={l} value={l}>{l}</option>)}
                              </select>
                              <textarea value={block.code || ''} onChange={e => updateBlock(block.id, { code: e.target.value })}
                                rows={5} placeholder="// الكود هنا..."
                                style={{ padding: '8px 10px', borderRadius: 6, border: '1px solid #334155', background: '#0d1117', color: '#58CC02', fontSize: 12, fontFamily: 'monospace', resize: 'vertical', width: '100%', boxSizing: 'border-box' }} />
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* ── RESOURCES (Google Drive) ── */}
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                      <label style={{ fontSize: 13, color: '#e2e8f0', fontWeight: 700 }}>📎 مصادر ومرفقات</label>
                      <button type="button" onClick={addResource}
                        style={{ padding: '5px 12px', borderRadius: 6, border: '1px solid #334155', background: '#0f172a', color: '#94a3b8', cursor: 'pointer', fontSize: 12 }}>
                        + مصدر
                      </button>
                    </div>

                    {(form.resources || []).length === 0 && (
                      <div style={{ padding: '14px', border: '2px dashed #334155', borderRadius: 10, textAlign: 'center', color: '#475569', fontSize: 12 }}>
                        أضف روابط Google Drive أو PDF أو Templates
                      </div>
                    )}

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {(form.resources || []).map((res: any) => (
                        <div key={res.id} style={{ background: '#0f172a', borderRadius: 10, padding: 12, border: '1px solid #334155' }}>
                          <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                            <input value={res.name || ''} onChange={e => updateResource(res.id, { name: e.target.value })} placeholder="اسم المصدر (مثال: Template الـ Workflow)"
                              style={{ flex: 1, padding: '8px 10px', borderRadius: 6, border: '1px solid #334155', background: '#1e293b', color: '#fff', fontSize: 13 }} />
                            <select value={res.type || 'link'} onChange={e => updateResource(res.id, { type: e.target.value })}
                              style={{ padding: '8px 10px', borderRadius: 6, border: '1px solid #334155', background: '#1e293b', color: '#fff', fontSize: 12 }}>
                              <option value="link">🔗 رابط</option>
                              <option value="pdf">📄 PDF</option>
                              <option value="sheet">📊 Sheet</option>
                              <option value="doc">📝 Doc</option>
                              <option value="template">🔧 Template</option>
                            </select>
                            <button onClick={() => removeResource(res.id)} style={{ width: 32, height: 32, borderRadius: 6, border: 'none', background: '#7f1d1d', color: '#fca5a5', cursor: 'pointer', fontSize: 14, flexShrink: 0 }}>✕</button>
                          </div>
                          <div style={{ background: '#1e293b', borderRadius: 8, padding: '8px 10px', border: '1px solid #334155', marginBottom: 6 }}>
                            <div style={{ fontSize: 10, color: '#60a5fa', marginBottom: 4 }}>📌 Google Drive رابط (مؤقتاً)</div>
                            <input value={res.drive_url || ''} onChange={e => updateResource(res.id, { drive_url: e.target.value })}
                              placeholder="https://drive.google.com/..."
                              style={{ width: '100%', padding: '6px 8px', borderRadius: 5, border: `1px solid ${res.drive_url ? '#1d4ed8' : '#334155'}`, background: '#0f172a', color: '#fff', fontSize: 11, fontFamily: 'monospace', boxSizing: 'border-box' }} />
                          </div>
                          <input value={res.description || ''} onChange={e => updateResource(res.id, { description: e.target.value })} placeholder="وصف (اختياري)"
                            style={{ width: '100%', padding: '6px 10px', borderRadius: 6, border: '1px solid #334155', background: '#1e293b', color: '#fff', fontSize: 12, boxSizing: 'border-box' }} />
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* ── Link Challenge ── */}
                  <div style={{ background: '#0f172a', borderRadius: 12, padding: 14, border: '2px solid #4c1d95' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                      <label style={{ fontSize: 13, color: '#a78bfa', fontWeight: 700 }}>⚔️ تحدي بعد الدرس</label>
                      <button
                        type="button"
                        onClick={() => setEntryType((entryType as string) === 'challenge' ? 'lesson' : 'challenge' as EntryType)}
                        style={{ padding: '5px 12px', borderRadius: 8, border: '1px solid #4c1d95', background: '#4c1d95', color: '#fff', cursor: 'pointer', fontSize: 11, fontWeight: 700 }}>
                        {(entryType as string) === 'challenge' ? '← رجوع للدرس' : '+ إنشاء تحدي جديد'}
                      </button>
                    </div>
                    <select value={form.linked_challenge_id || ''} onChange={e => setForm((f: any) => ({ ...f, linked_challenge_id: e.target.value }))}
                      style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: `1px solid ${form.linked_challenge_id ? '#7c3aed' : '#334155'}`, background: '#1e293b', color: '#fff', fontSize: 14, marginBottom: 6 }}>
                      <option value="">بدون تحدي</option>
                      {Array.isArray(challenges) && challenges.map((c: any) => (
                        <option key={c.id} value={c.id}>⚔️ {c.title_ar}</option>
                      ))}
                    </select>
                    {form.linked_challenge_id ? (
                      <div style={{ fontSize: 12, color: '#a78bfa', padding: '6px 10px', background: '#1e1b4b', borderRadius: 6 }}>
                        ✅ سيظهر للطالب زرار "ابدأ التحدي" بعد إكمال الدرس مباشرة
                      </div>
                    ) : (
                      <div style={{ fontSize: 12, color: '#475569' }}>
                        اختر تحدياً موجوداً أو اضغط "+ إنشاء تحدي جديد" لإنشاء تحدي مرتبط بهذا الدرس
                      </div>
                    )}
                  </div>

                  {/* Settings */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
                    {[['xp_reward', 'XP', '#fbbf24'], ['video_duration_seconds', 'المدة (ثانية)', '#94a3b8'], ['sort_order', 'الترتيب', '#94a3b8']].map(([k, l, c]) => (
                      <div key={k}>
                        <label style={{ display: 'block', fontSize: 12, color: '#94a3b8', marginBottom: 6, fontWeight: 600 }}>{l}</label>
                        <input type="number" value={(form as any)[k]} onChange={e => setForm((f: any) => ({ ...f, [k]: e.target.value }))}
                          style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: '1px solid #334155', background: '#0f172a', color: c, fontSize: 14, boxSizing: 'border-box', fontWeight: k === 'xp_reward' ? 700 : 400 }} />
                      </div>
                    ))}
                  </div>

                  <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                    {[['is_active', 'نشط ومرئي'], ['is_free', '🆓 مجاني']].map(([k, l]) => (
                      <label key={k} style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                        <input type="checkbox" checked={(form as any)[k]} onChange={e => setForm((f: any) => ({ ...f, [k]: e.target.checked }))} style={{ width: 16, height: 16 }} />
                        <span style={{ color: '#e2e8f0', fontSize: 13 }}>{l}</span>
                      </label>
                    ))}
                  </div>

                  <button onClick={saveLesson} disabled={saving}
                    style={{ width: '100%', padding: '14px', borderRadius: 8, border: 'none', background: saving ? '#334155' : '#58CC02', color: '#fff', fontWeight: 800, cursor: saving ? 'not-allowed' : 'pointer', fontSize: 15 }}>
                    {saving ? '⏳ جاري الحفظ...' : editing ? '💾 تحديث الدرس' : '✅ إضافة الدرس'}
                  </button>
                </div>
              )}

              {/* ══ CHALLENGE FORM ══ */}
              {entryType === 'challenge' && (
                <div style={{ display: 'grid', gap: 16 }}>

                  {/* Roadmap */}
                  <div>
                    <label style={{ display: 'block', fontSize: 12, color: '#94a3b8', marginBottom: 8, fontWeight: 600 }}>المسار</label>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button type="button" onClick={() => setChallengeForm((f: any) => ({ ...f, roadmap_id: '' }))}
                        style={{ flex: 1, padding: '8px', borderRadius: 8, border: `2px solid ${!challengeForm.roadmap_id ? '#CE82FF' : '#334155'}`, background: !challengeForm.roadmap_id ? '#CE82FF20' : 'transparent', color: !challengeForm.roadmap_id ? '#CE82FF' : '#64748b', cursor: 'pointer', fontSize: 12 }}>
                        الكل
                      </button>
                      {roadmaps.map(r => (
                        <button key={r.id} type="button" onClick={() => setChallengeForm((f: any) => ({ ...f, roadmap_id: r.id }))}
                          style={{ flex: 1, padding: '8px', borderRadius: 8, border: `2px solid ${challengeForm.roadmap_id === r.id ? (COLORS[r.slug] || '#CE82FF') : '#334155'}`, background: challengeForm.roadmap_id === r.id ? (COLORS[r.slug] || '#CE82FF') + '20' : 'transparent', color: challengeForm.roadmap_id === r.id ? (COLORS[r.slug] || '#CE82FF') : '#64748b', cursor: 'pointer', fontWeight: 600, fontSize: 12 }}>
                          {r.slug === 'n8n_automation' ? '⚡' : r.slug === 'ai_video' ? '🎬' : '💻'} {r.title_ar}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Challenge Type */}
                  <div>
                    <label style={{ display: 'block', fontSize: 12, color: '#94a3b8', marginBottom: 8, fontWeight: 600 }}>نوع التحدي *</label>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                      {[
                        ['complete_sentence', '❓', 'أكمل الجملة', 'اختيار من 4 خيارات'],
                        ['node_analysis', '📸', 'تحليل Node', 'الطالب يرفع screenshot + Gemini يصحح'],
                      ].map(([type, icon, label, desc]) => (
                        <button key={type} type="button" onClick={() => setChallengeForm((f: any) => ({ ...f, challenge_type: type }))}
                          style={{ padding: '12px', borderRadius: 8, border: `2px solid ${challengeForm.challenge_type === type ? '#CE82FF' : '#334155'}`, background: challengeForm.challenge_type === type ? '#2d1a4e' : 'transparent', cursor: 'pointer', textAlign: 'right' }}>
                          <div style={{ fontSize: 20, marginBottom: 4 }}>{icon}</div>
                          <div style={{ fontWeight: 700, color: challengeForm.challenge_type === type ? '#a78bfa' : '#94a3b8', fontSize: 13 }}>{label}</div>
                          <div style={{ fontSize: 11, color: '#475569', marginTop: 2 }}>{desc}</div>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: 12, color: '#94a3b8', marginBottom: 6, fontWeight: 600 }}>عنوان التحدي *</label>
                    <input value={challengeForm.title_ar} onChange={e => setChallengeForm((f: any) => ({ ...f, title_ar: e.target.value }))} placeholder="مثال: تحدي n8n — HTTP Request"
                      style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: `1px solid ${challengeForm.title_ar ? '#CE82FF' : '#334155'}`, background: '#0f172a', color: '#fff', fontSize: 14, boxSizing: 'border-box' }} />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: 12, color: '#94a3b8', marginBottom: 6, fontWeight: 600 }}>السؤال *</label>
                    <textarea value={challengeForm.question_ar} onChange={e => setChallengeForm((f: any) => ({ ...f, question_ar: e.target.value }))} rows={2}
                      placeholder="أكمل الجملة: node الـ HTTP Request بيستخدم لـ ___"
                      style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #334155', background: '#0f172a', color: '#fff', fontSize: 14, boxSizing: 'border-box', resize: 'vertical' }} />
                  </div>

                  {/* Node Image Upload */}
                  <div style={{ background: '#0f172a', borderRadius: 12, padding: 14, border: '1px solid #334155' }}>
                    <div style={{ fontSize: 13, color: '#94a3b8', fontWeight: 600, marginBottom: 10 }}>📸 صورة الـ Node (للمرجع أو للتحليل)</div>
                    <input ref={challengeImgRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={e => { if (e.target.files?.[0]) uploadChallengeImg(e.target.files[0]) }} />
                    {!challengeImgPreview ? (
                      <button type="button" onClick={() => challengeImgRef.current?.click()} disabled={uploadingImg}
                        style={{ width: '100%', padding: '16px', borderRadius: 8, border: '2px dashed #334155', background: 'transparent', color: '#64748b', cursor: 'pointer', fontSize: 13 }}>
                        {uploadingImg ? '⏳ جاري الرفع...' : '📤 ارفع صورة الـ Node من n8n'}
                      </button>
                    ) : (
                      <div>
                        <img src={challengeImgPreview} alt="" style={{ width: '100%', borderRadius: 8, marginBottom: 8, maxHeight: 160, objectFit: 'contain', background: '#1e293b' }} />
                        <button type="button" onClick={() => { setChallengeImgPreview(null); setChallengeForm((f: any) => ({ ...f, image_url: '' })) }}
                          style={{ padding: '6px 14px', borderRadius: 6, border: '1px solid #7f1d1d', background: 'transparent', color: '#f87171', cursor: 'pointer', fontSize: 12 }}>
                          حذف الصورة
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Options (MCQ) */}
                  {challengeForm.challenge_type === 'complete_sentence' && (
                    <div>
                      <label style={{ display: 'block', fontSize: 12, color: '#94a3b8', marginBottom: 8, fontWeight: 600 }}>الخيارات الأربعة * (اضغط الحرف للإجابة الصحيحة)</label>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {challengeForm.options.map((opt: string, i: number) => (
                          <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                            <button type="button" onClick={() => setChallengeForm((f: any) => ({ ...f, correct_answer: i }))}
                              style={{ width: 34, height: 34, borderRadius: 8, border: `2px solid ${challengeForm.correct_answer === i ? '#58CC02' : '#334155'}`, background: challengeForm.correct_answer === i ? '#58CC02' : 'transparent', color: challengeForm.correct_answer === i ? '#fff' : '#64748b', cursor: 'pointer', fontWeight: 800, flexShrink: 0 }}>
                              {['أ', 'ب', 'ج', 'د'][i]}
                            </button>
                            <input value={opt} onChange={e => { const opts = [...challengeForm.options]; opts[i] = e.target.value; setChallengeForm((f: any) => ({ ...f, options: opts })) }}
                              placeholder={`الخيار ${['الأول', 'الثاني', 'الثالث', 'الرابع'][i]}`}
                              style={{ flex: 1, padding: '8px 12px', borderRadius: 8, border: `1px solid ${challengeForm.correct_answer === i ? '#58CC02' : '#334155'}`, background: challengeForm.correct_answer === i ? '#1e3a2e' : '#0f172a', color: '#fff', fontSize: 13 }} />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Gemini AI toggle for node_analysis */}
                  {challengeForm.challenge_type === 'node_analysis' && (
                    <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', background: '#0f172a', padding: 12, borderRadius: 10, border: '1px solid #334155' }}>
                      <div onClick={() => setChallengeForm((f: any) => ({ ...f, use_ai_validation: !f.use_ai_validation }))}
                        style={{ width: 44, height: 24, borderRadius: 99, background: challengeForm.use_ai_validation ? '#7c3aed' : '#334155', position: 'relative', cursor: 'pointer', flexShrink: 0 }}>
                        <div style={{ width: 18, height: 18, borderRadius: '50%', background: '#fff', position: 'absolute', top: 3, left: challengeForm.use_ai_validation ? 23 : 3, transition: 'left 0.2s' }} />
                      </div>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 700, color: challengeForm.use_ai_validation ? '#a78bfa' : '#94a3b8' }}>🤖 Gemini AI يحلل صورة الطالب</div>
                        <div style={{ fontSize: 11, color: '#475569' }}>يقارن بين صورة الـ Node المرجعية وصورة الطالب</div>
                      </div>
                    </label>
                  )}

                  <div>
                    <label style={{ display: 'block', fontSize: 12, color: '#94a3b8', marginBottom: 6, fontWeight: 600 }}>شرح الإجابة</label>
                    <textarea value={challengeForm.explanation_ar || ''} onChange={e => setChallengeForm((f: any) => ({ ...f, explanation_ar: e.target.value }))} rows={2} placeholder="اشرح لماذا هذه الإجابة صحيحة..."
                      style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid #334155', background: '#0f172a', color: '#fff', fontSize: 13, boxSizing: 'border-box', resize: 'vertical' }} />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    <div>
                      <label style={{ display: 'block', fontSize: 12, color: '#94a3b8', marginBottom: 6, fontWeight: 600 }}>XP</label>
                      <input type="number" value={challengeForm.xp_reward} onChange={e => setChallengeForm((f: any) => ({ ...f, xp_reward: e.target.value }))}
                        style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: '1px solid #334155', background: '#0f172a', color: '#fbbf24', fontSize: 14, fontWeight: 700, boxSizing: 'border-box' }} />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: 12, color: '#94a3b8', marginBottom: 6, fontWeight: 600 }}>الصعوبة (1-5)</label>
                      <input type="number" min={1} max={5} value={challengeForm.difficulty} onChange={e => setChallengeForm((f: any) => ({ ...f, difficulty: e.target.value }))}
                        style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: '1px solid #334155', background: '#0f172a', color: '#fff', fontSize: 14, boxSizing: 'border-box' }} />
                    </div>
                  </div>

                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                    <input type="checkbox" checked={challengeForm.is_active} onChange={e => setChallengeForm((f: any) => ({ ...f, is_active: e.target.checked }))} style={{ width: 16, height: 16 }} />
                    <span style={{ color: '#e2e8f0', fontSize: 13 }}>نشط ومرئي للطلاب</span>
                  </label>

                  <button onClick={saveChallenge} disabled={saving}
                    style={{ width: '100%', padding: '14px', borderRadius: 8, border: 'none', background: saving ? '#334155' : '#CE82FF', color: '#fff', fontWeight: 800, cursor: saving ? 'not-allowed' : 'pointer', fontSize: 15 }}>
                    {saving ? '⏳ جاري الحفظ...' : '⚔️ إنشاء التحدي وربطه بالدرس'}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
