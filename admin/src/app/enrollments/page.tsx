'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'

const URL2 = process.env.NEXT_PUBLIC_SUPABASE_URL!
const KEY  = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const H    = {
  'apikey': KEY,
  'Authorization': `Bearer ${KEY}`,
  'Content-Type': 'application/json',
  'Prefer': 'return=representation',
}

const ROADMAP_COLORS: Record<string, string> = {
  n8n_automation: '#58CC02',
  ai_video: '#FF9600',
  vibe_coding: '#CE82FF',
}
const ROADMAP_ICONS: Record<string, string> = {
  n8n_automation: '⚡',
  ai_video: '🎬',
  vibe_coding: '💻',
}

export default function EnrollmentsPage() {
  const [enrollments, setEnrollments] = useState<any[]>([])
  const [users, setUsers]             = useState<any[]>([])
  const [roadmaps, setRoadmaps]       = useState<any[]>([])
  const [loading, setLoading]         = useState(true)
  const [showForm, setShowForm]       = useState(false)
  const [form, setForm]               = useState({ user_id: '', roadmap_id: '', expires_days: '' })
  const [saving, setSaving]           = useState(false)
  const [msg, setMsg]                 = useState('')
  const [search, setSearch]           = useState('')

  useEffect(() => { load() }, [])

  const load = async () => {
    setLoading(true)
    try {
      const [e, u, r] = await Promise.all([
        fetch(`${URL2}/rest/v1/course_enrollments?select=*,users(id,full_name,email,username),roadmaps(id,title_ar,slug)&order=enrolled_at.desc`, { headers: H }).then(r => r.json()),
        fetch(`${URL2}/rest/v1/users?select=id,full_name,email,username&order=full_name`, { headers: H }).then(r => r.json()),
        fetch(`${URL2}/rest/v1/roadmaps?select=*&order=sort_order`, { headers: H }).then(r => r.json()),
      ])
      setEnrollments(Array.isArray(e) ? e : [])
      setUsers(Array.isArray(u) ? u : [])
      setRoadmaps(Array.isArray(r) ? r : [])
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const flash = (m: string) => { setMsg(m); setTimeout(() => setMsg(''), 4000) }

  const enroll = async () => {
    if (!form.user_id || !form.roadmap_id) {
      flash('❌ اختر المستخدم والكورس أولاً')
      return
    }
    setSaving(true)
    try {
      const payload: any = {
        user_id: form.user_id,
        roadmap_id: form.roadmap_id,
        is_active: true,
        enrolled_at: new Date().toISOString(),
      }
      if (form.expires_days) {
        const d = new Date()
        d.setDate(d.getDate() + Number(form.expires_days))
        payload.expires_at = d.toISOString()
      }

      // Try upsert first (handles duplicate)
      const res = await fetch(
        `${URL2}/rest/v1/course_enrollments?on_conflict=user_id,roadmap_id`,
        {
          method: 'POST',
          headers: { ...H, 'Prefer': 'return=representation,resolution=merge-duplicates' },
          body: JSON.stringify(payload),
        }
      )

      if (res.ok || res.status === 201) {
        flash('✅ تم تسجيل المستخدم في الكورس بنجاح!')
        setShowForm(false)
        setForm({ user_id: '', roadmap_id: '', expires_days: '' })
        load()
      } else if (res.status === 409) {
        // Conflict — just reactivate
        const patch = await fetch(
          `${URL2}/rest/v1/course_enrollments?user_id=eq.${form.user_id}&roadmap_id=eq.${form.roadmap_id}`,
          { method: 'PATCH', headers: H, body: JSON.stringify({ is_active: true }) }
        )
        if (patch.ok) {
          flash('✅ تم تفعيل الاشتراك الموجود')
          setShowForm(false)
          setForm({ user_id: '', roadmap_id: '', expires_days: '' })
          load()
        }
      } else {
        const err = await res.json().catch(() => ({}))
        flash('❌ خطأ: ' + (err?.message || err?.code || res.status))
      }
    } catch (e: any) {
      flash('❌ ' + e.message)
    } finally {
      setSaving(false)
    }
  }

  const toggleActive = async (id: string, current: boolean) => {
    await fetch(`${URL2}/rest/v1/course_enrollments?id=eq.${id}`, {
      method: 'PATCH', headers: H,
      body: JSON.stringify({ is_active: !current }),
    })
    load()
  }

  const remove = async (id: string) => {
    if (!confirm('حذف الاشتراك؟')) return
    await fetch(`${URL2}/rest/v1/course_enrollments?id=eq.${id}`, { method: 'DELETE', headers: H })
    load()
  }

  const filtered = enrollments.filter(e => {
    if (!search) return true
    const q = search.toLowerCase()
    return (
      e.users?.email?.toLowerCase().includes(q) ||
      e.users?.full_name?.toLowerCase().includes(q) ||
      e.roadmaps?.title_ar?.includes(q)
    )
  })

  // Stats per roadmap
  const stats = roadmaps.map(r => ({
    ...r,
    total: enrollments.filter(e => e.roadmap_id === r.id).length,
    active: enrollments.filter(e => e.roadmap_id === r.id && e.is_active).length,
  }))

  return (
    <div style={{ minHeight: '100vh', background: '#0f172a', color: '#fff', fontFamily: 'system-ui,sans-serif', direction: 'rtl' }}>
      {/* Header */}
      <header style={{ background: '#1e293b', borderBottom: '1px solid #334155', padding: '16px 32px', display: 'flex', alignItems: 'center', gap: 16 }}>
        <Link href="/" style={{ color: '#64748b', textDecoration: 'none', fontSize: 20 }}>→</Link>
        <h1 style={{ margin: 0, fontSize: 20, fontWeight: 800 }}>🎓 إدارة المشتركين</h1>
        <button
          onClick={() => setShowForm(true)}
          style={{ marginRight: 'auto', padding: '8px 20px', borderRadius: 8, border: 'none', background: '#58CC02', color: '#fff', fontWeight: 700, cursor: 'pointer', fontSize: 14 }}>
          + تسجيل مشترك جديد
        </button>
      </header>

      {msg && (
        <div style={{
          background: msg.startsWith('✅') ? '#166534' : '#7f1d1d',
          color: msg.startsWith('✅') ? '#bbf7d0' : '#fca5a5',
          padding: '12px 32px', fontSize: 14, fontWeight: 600,
        }}>{msg}</div>
      )}

      <div style={{ padding: 32, maxWidth: 1100, margin: '0 auto' }}>

        {/* Stats Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14, marginBottom: 28 }}>
          <div style={{ background: '#1e293b', borderRadius: 12, padding: '18px 20px', borderLeft: '4px solid #1CB0F6' }}>
            <div style={{ fontSize: 28, fontWeight: 900, color: '#1CB0F6' }}>{enrollments.filter(e => e.is_active).length}</div>
            <div style={{ fontSize: 13, color: '#64748b', marginTop: 4 }}>مشتركين نشطين</div>
          </div>
          {stats.map(r => (
            <div key={r.id} style={{ background: '#1e293b', borderRadius: 12, padding: '18px 20px', borderLeft: `4px solid ${ROADMAP_COLORS[r.slug] || '#64748b'}` }}>
              <div style={{ fontSize: 26, fontWeight: 900, color: ROADMAP_COLORS[r.slug] || '#fff' }}>
                {ROADMAP_ICONS[r.slug] || '📚'} {r.active}
              </div>
              <div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>{r.title_ar}</div>
            </div>
          ))}
        </div>

        {/* Search */}
        <div style={{ marginBottom: 18 }}>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="🔍 ابحث بالاسم أو الإيميل..."
            style={{ width: '100%', padding: '12px 16px', borderRadius: 10, border: '1px solid #334155', background: '#1e293b', color: '#fff', fontSize: 14, boxSizing: 'border-box', outline: 'none' }}
          />
        </div>

        {/* Table */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: 48, color: '#64748b', fontSize: 16 }}>⏳ جاري التحميل...</div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 48, color: '#64748b' }}>
            <div style={{ fontSize: 52, marginBottom: 12 }}>🎓</div>
            <div style={{ fontSize: 18, fontWeight: 700 }}>لا يوجد مشتركين بعد</div>
            <div style={{ marginTop: 8, fontSize: 14 }}>اضغط "+ تسجيل مشترك جديد" لإضافة أول مشترك</div>
          </div>
        ) : (
          <div style={{ background: '#1e293b', borderRadius: 14, overflow: 'hidden', border: '1px solid #334155' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#334155', textAlign: 'right' }}>
                  {['المستخدم', 'الإيميل', 'الكورس', 'تاريخ التسجيل', 'الانتهاء', 'الحالة', 'إجراءات'].map(h => (
                    <th key={h} style={{ padding: '12px 16px', fontSize: 12, color: '#94a3b8', fontWeight: 600 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((e, i) => {
                  const color = ROADMAP_COLORS[e.roadmaps?.slug] || '#64748b'
                  const icon  = ROADMAP_ICONS[e.roadmaps?.slug] || '📚'
                  const isExpired = e.expires_at && new Date(e.expires_at) < new Date()
                  return (
                    <tr key={e.id} style={{ borderTop: '1px solid #334155', background: i % 2 === 0 ? 'transparent' : '#1a2744' }}>
                      <td style={{ padding: '12px 16px', fontSize: 14, fontWeight: 700, color: '#e2e8f0' }}>
                        {e.users?.full_name || e.users?.username || '—'}
                      </td>
                      <td style={{ padding: '12px 16px', fontSize: 13, color: '#94a3b8' }}>
                        {e.users?.email || '—'}
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <span style={{ background: color + '20', color, borderRadius: 6, padding: '3px 10px', fontSize: 12, fontWeight: 700 }}>
                          {icon} {e.roadmaps?.title_ar || '—'}
                        </span>
                      </td>
                      <td style={{ padding: '12px 16px', fontSize: 12, color: '#64748b' }}>
                        {e.enrolled_at ? new Date(e.enrolled_at).toLocaleDateString('ar-EG') : '—'}
                      </td>
                      <td style={{ padding: '12px 16px', fontSize: 12, color: isExpired ? '#f87171' : '#4ade80' }}>
                        {e.expires_at ? new Date(e.expires_at).toLocaleDateString('ar-EG') : '♾️ دائم'}
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <span style={{
                          background: e.is_active && !isExpired ? '#166534' : '#7f1d1d',
                          color: e.is_active && !isExpired ? '#bbf7d0' : '#fca5a5',
                          borderRadius: 6, padding: '3px 10px', fontSize: 11, fontWeight: 700,
                        }}>
                          {e.is_active && !isExpired ? '✅ نشط' : isExpired ? '⏰ منتهي' : '⏸️ موقوف'}
                        </span>
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button
                            onClick={() => toggleActive(e.id, e.is_active)}
                            style={{ padding: '4px 10px', borderRadius: 6, border: `1px solid ${e.is_active ? '#854d0e' : '#166534'}`, background: 'transparent', color: e.is_active ? '#fbbf24' : '#4ade80', cursor: 'pointer', fontSize: 11 }}>
                            {e.is_active ? 'إيقاف' : 'تفعيل'}
                          </button>
                          <button
                            onClick={() => remove(e.id)}
                            style={{ padding: '4px 10px', borderRadius: 6, border: '1px solid #7f1d1d', background: 'transparent', color: '#f87171', cursor: 'pointer', fontSize: 11 }}>
                            حذف
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ══ FORM MODAL ══ */}
      {showForm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div style={{ background: '#1e293b', borderRadius: 16, width: '100%', maxWidth: 500, border: '1px solid #334155', overflow: 'hidden' }}>
            {/* Modal Header */}
            <div style={{ padding: '20px 24px 16px', borderBottom: '1px solid #334155', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <h2 style={{ margin: 0, fontSize: 18, color: '#e2e8f0' }}>🎓 تسجيل مشترك جديد</h2>
              <button onClick={() => setShowForm(false)} style={{ width: 30, height: 30, borderRadius: 8, border: 'none', background: '#334155', color: '#94a3b8', cursor: 'pointer', fontSize: 16 }}>✕</button>
            </div>

            <div style={{ padding: '20px 24px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>

              {/* User Select */}
              <div>
                <label style={{ display: 'block', fontSize: 12, color: '#94a3b8', marginBottom: 8, fontWeight: 600 }}>
                  👤 اختر المستخدم *
                </label>
                <select
                  value={form.user_id}
                  onChange={e => setForm(f => ({ ...f, user_id: e.target.value }))}
                  style={{ width: '100%', padding: '12px 14px', borderRadius: 8, border: `2px solid ${form.user_id ? '#58CC02' : '#334155'}`, background: '#0f172a', color: '#fff', fontSize: 14 }}>
                  <option value="">-- اختر مستخدم --</option>
                  {users.map((u: any) => (
                    <option key={u.id} value={u.id}>
                      {u.full_name || u.username} {u.email ? `(${u.email})` : ''}
                    </option>
                  ))}
                </select>
                {users.length === 0 && (
                  <div style={{ fontSize: 12, color: '#f87171', marginTop: 4 }}>⚠️ لا يوجد مستخدمين — يجب أن يسجّل المستخدم دخوله أولاً</div>
                )}
              </div>

              {/* Roadmap Select */}
              <div>
                <label style={{ display: 'block', fontSize: 12, color: '#94a3b8', marginBottom: 8, fontWeight: 600 }}>
                  📚 اختر الكورس *
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
                  {roadmaps.map((r: any) => {
                    const color = ROADMAP_COLORS[r.slug] || '#64748b'
                    const icon  = ROADMAP_ICONS[r.slug] || '📚'
                    const sel   = form.roadmap_id === r.id
                    return (
                      <button
                        key={r.id}
                        type="button"
                        onClick={() => setForm(f => ({ ...f, roadmap_id: r.id }))}
                        style={{ padding: '12px 8px', borderRadius: 10, border: `2px solid ${sel ? color : '#334155'}`, background: sel ? color + '20' : 'transparent', cursor: 'pointer', textAlign: 'center' }}>
                        <div style={{ fontSize: 22, marginBottom: 4 }}>{icon}</div>
                        <div style={{ fontSize: 11, color: sel ? color : '#64748b', fontWeight: sel ? 700 : 400, lineHeight: 1.3 }}>
                          {r.title_ar}
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Expiry */}
              <div>
                <label style={{ display: 'block', fontSize: 12, color: '#94a3b8', marginBottom: 8, fontWeight: 600 }}>
                  📅 مدة الاشتراك (اتركها فاضية = دائم)
                </label>
                <select
                  value={form.expires_days}
                  onChange={e => setForm(f => ({ ...f, expires_days: e.target.value }))}
                  style={{ width: '100%', padding: '12px 14px', borderRadius: 8, border: '1px solid #334155', background: '#0f172a', color: '#fff', fontSize: 14 }}>
                  <option value="">♾️ دائم (بدون انتهاء)</option>
                  <option value="30">30 يوم</option>
                  <option value="90">3 شهور</option>
                  <option value="180">6 شهور</option>
                  <option value="365">سنة كاملة</option>
                </select>
              </div>

              {/* Submit */}
              <button
                onClick={enroll}
                disabled={saving || !form.user_id || !form.roadmap_id}
                style={{
                  padding: '14px', borderRadius: 10, border: 'none',
                  background: saving || !form.user_id || !form.roadmap_id ? '#334155' : '#58CC02',
                  color: saving || !form.user_id || !form.roadmap_id ? '#64748b' : '#fff',
                  fontWeight: 800, fontSize: 15,
                  cursor: saving || !form.user_id || !form.roadmap_id ? 'not-allowed' : 'pointer',
                }}>
                {saving ? '⏳ جاري التسجيل...' : '✅ تسجيل المشترك'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
