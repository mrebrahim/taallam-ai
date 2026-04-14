'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

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
      // Load all data in parallel using Supabase client (handles RLS properly)
      const [
        { data: e, error: eErr },
        { data: u, error: uErr },
        { data: r, error: rErr },
      ] = await Promise.all([
        supabase
          .from('course_enrollments')
          .select('*, user:users!course_enrollments_user_id_fkey(id, full_name, email, username), roadmaps(id, title_ar, slug)')
          .order('enrolled_at', { ascending: false }),
        supabase
          .from('users')
          .select('id, full_name, email, username')
          .order('full_name'),
        supabase
          .from('roadmaps')
          .select('*')
          .order('sort_order'),
      ])

      if (eErr) console.error('Enrollments error:', eErr)
      if (uErr) console.error('Users error:', uErr)
      if (rErr) console.error('Roadmaps error:', rErr)

      setEnrollments(Array.isArray(e) ? e : [])
      setUsers(Array.isArray(u) ? u : [])
      setRoadmaps(Array.isArray(r) ? r : [])
    } catch (err) {
      console.error('Load error:', err)
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

      // Try upsert
      const { error } = await supabase
        .from('course_enrollments')
        .upsert(payload, { onConflict: 'user_id,roadmap_id' })

      if (error) {
        // Fallback: try plain insert
        const { error: insertErr } = await supabase
          .from('course_enrollments')
          .insert(payload)
        
        if (insertErr) {
          // Last resort: update existing to active
          const { error: updateErr } = await supabase
            .from('course_enrollments')
            .update({ is_active: true })
            .eq('user_id', form.user_id)
            .eq('roadmap_id', form.roadmap_id)
          
          if (updateErr) {
            flash('❌ خطأ: ' + updateErr.message)
            setSaving(false)
            return
          }
        }
      }

      flash('✅ تم تسجيل المشترك بنجاح!')
      setShowForm(false)
      setForm({ user_id: '', roadmap_id: '', expires_days: '' })
      load()
    } catch (e: any) {
      flash('❌ ' + e.message)
    } finally {
      setSaving(false)
    }
  }

  const toggleActive = async (id: string, current: boolean) => {
    await supabase
      .from('course_enrollments')
      .update({ is_active: !current })
      .eq('id', id)
    load()
  }

  const remove = async (id: string) => {
    if (!confirm('حذف الاشتراك نهائياً؟')) return
    await supabase.from('course_enrollments').delete().eq('id', id)
    load()
  }

  const filtered = enrollments.filter(e => {
    if (!search) return true
    const q = search.toLowerCase()
    return (
      e.user?.email?.toLowerCase().includes(q) ||
      e.user?.full_name?.toLowerCase().includes(q) ||
      e.roadmaps?.title_ar?.includes(q)
    )
  })

  const stats = roadmaps.map(r => ({
    ...r,
    total: enrollments.filter(e => e.roadmap_id === r.id).length,
    active: enrollments.filter(e => e.roadmap_id === r.id && e.is_active).length,
  }))

  const activeCount = enrollments.filter(e => {
    if (!e.is_active) return false
    if (e.expires_at && new Date(e.expires_at) < new Date()) return false
    return true
  }).length

  return (
    <div style={{ minHeight: '100vh', background: '#0f172a', color: '#fff', fontFamily: 'system-ui,sans-serif', direction: 'rtl' }}>
      {/* Header */}
      <header style={{ background: '#1e293b', borderBottom: '1px solid #334155', padding: '16px 32px', display: 'flex', alignItems: 'center', gap: 16 }}>
        <Link href="/" style={{ color: '#64748b', textDecoration: 'none', fontSize: 20 }}>→</Link>
        <h1 style={{ margin: 0, fontSize: 20, fontWeight: 800 }}>🎓 إدارة المشتركين</h1>
        <div style={{ marginRight: 'auto', display: 'flex', gap: 10, alignItems: 'center' }}>
          <span style={{ fontSize: 13, color: '#64748b' }}>
            {enrollments.length} اشتراك في الـ DB
          </span>
          <button
            onClick={() => setShowForm(true)}
            style={{ padding: '8px 20px', borderRadius: 8, border: 'none', background: '#58CC02', color: '#fff', fontWeight: 700, cursor: 'pointer', fontSize: 14 }}>
            + تسجيل مشترك جديد
          </button>
        </div>
      </header>

      {msg && (
        <div style={{
          background: msg.startsWith('✅') ? '#166534' : '#7f1d1d',
          color: msg.startsWith('✅') ? '#bbf7d0' : '#fca5a5',
          padding: '12px 32px', fontSize: 14, fontWeight: 600,
        }}>{msg}</div>
      )}

      <div style={{ padding: 32, maxWidth: 1100, margin: '0 auto' }}>

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14, marginBottom: 28 }}>
          <div style={{ background: '#1e293b', borderRadius: 12, padding: '18px 20px', borderLeft: '4px solid #1CB0F6' }}>
            <div style={{ fontSize: 32, fontWeight: 900, color: '#1CB0F6' }}>{activeCount}</div>
            <div style={{ fontSize: 13, color: '#64748b', marginTop: 4 }}>مشتركين نشطين</div>
          </div>
          {stats.map(r => (
            <div key={r.id} style={{ background: '#1e293b', borderRadius: 12, padding: '18px 20px', borderLeft: `4px solid ${ROADMAP_COLORS[r.slug] || '#64748b'}` }}>
              <div style={{ fontSize: 28, fontWeight: 900, color: ROADMAP_COLORS[r.slug] || '#fff' }}>
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
            placeholder="🔍 ابحث بالاسم أو الإيميل أو الكورس..."
            style={{ width: '100%', padding: '12px 16px', borderRadius: 10, border: '1px solid #334155', background: '#1e293b', color: '#fff', fontSize: 14, boxSizing: 'border-box', outline: 'none' }}
          />
        </div>

        {/* Table */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: 48, color: '#64748b', fontSize: 18 }}>
            ⏳ جاري تحميل البيانات...
          </div>
        ) : filtered.length === 0 && enrollments.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 48, color: '#64748b' }}>
            <div style={{ fontSize: 52, marginBottom: 12 }}>🎓</div>
            <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>لا يوجد مشتركين بعد</div>
            <div style={{ fontSize: 14 }}>اضغط "+ تسجيل مشترك جديد" للبدء</div>
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 32, color: '#64748b' }}>
            لا توجد نتائج للبحث عن "{search}"
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
                  const color    = ROADMAP_COLORS[e.roadmaps?.slug] || '#64748b'
                  const icon     = ROADMAP_ICONS[e.roadmaps?.slug] || '📚'
                  const isExpired = e.expires_at && new Date(e.expires_at) < new Date()
                  const isActive  = e.is_active && !isExpired
                  return (
                    <tr key={e.id} style={{ borderTop: '1px solid #334155', background: i % 2 === 0 ? 'transparent' : '#162032' }}>
                      <td style={{ padding: '13px 16px', fontSize: 14, fontWeight: 700, color: '#e2e8f0' }}>
                        {e.user?.full_name || e.user?.username || e.user_id?.slice(0, 8) + '...'}
                      </td>
                      <td style={{ padding: '13px 16px', fontSize: 13, color: '#94a3b8' }}>
                        {e.user?.email || '—'}
                      </td>
                      <td style={{ padding: '13px 16px' }}>
                        <span style={{ background: color + '20', color, borderRadius: 6, padding: '4px 10px', fontSize: 12, fontWeight: 700 }}>
                          {icon} {e.roadmaps?.title_ar || e.roadmap_id?.slice(0, 8) + '...'}
                        </span>
                      </td>
                      <td style={{ padding: '13px 16px', fontSize: 12, color: '#64748b' }}>
                        {e.enrolled_at ? new Date(e.enrolled_at).toLocaleDateString('ar-EG') : '—'}
                      </td>
                      <td style={{ padding: '13px 16px', fontSize: 12, color: isExpired ? '#f87171' : '#4ade80' }}>
                        {e.expires_at ? new Date(e.expires_at).toLocaleDateString('ar-EG') : '♾️ دائم'}
                      </td>
                      <td style={{ padding: '13px 16px' }}>
                        <span style={{
                          background: isActive ? '#166534' : '#7f1d1d',
                          color: isActive ? '#bbf7d0' : '#fca5a5',
                          borderRadius: 6, padding: '3px 10px', fontSize: 11, fontWeight: 700,
                        }}>
                          {isActive ? '✅ نشط' : isExpired ? '⏰ منتهي' : '⏸️ موقوف'}
                        </span>
                      </td>
                      <td style={{ padding: '13px 16px' }}>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button onClick={() => toggleActive(e.id, e.is_active)}
                            style={{ padding: '4px 10px', borderRadius: 6, border: `1px solid ${e.is_active ? '#854d0e' : '#166534'}`, background: 'transparent', color: e.is_active ? '#fbbf24' : '#4ade80', cursor: 'pointer', fontSize: 11 }}>
                            {e.is_active ? 'إيقاف' : 'تفعيل'}
                          </button>
                          <button onClick={() => remove(e.id)}
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
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: 20 }}>
          <div style={{ background: '#1e293b', borderRadius: 16, width: '100%', maxWidth: 520, border: '1px solid #334155', overflow: 'hidden' }}>

            {/* Modal Header */}
            <div style={{ padding: '20px 24px 16px', borderBottom: '1px solid #334155', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <h2 style={{ margin: 0, fontSize: 18, color: '#e2e8f0' }}>🎓 تسجيل مشترك جديد</h2>
              <button onClick={() => setShowForm(false)} style={{ width: 30, height: 30, borderRadius: 8, border: 'none', background: '#334155', color: '#94a3b8', cursor: 'pointer', fontSize: 16 }}>✕</button>
            </div>

            <div style={{ padding: '20px 24px 24px', display: 'flex', flexDirection: 'column', gap: 18 }}>

              {/* User Select */}
              <div>
                <label style={{ display: 'block', fontSize: 13, color: '#94a3b8', marginBottom: 8, fontWeight: 700 }}>
                  👤 اختر المستخدم *
                  <span style={{ fontSize: 11, color: '#475569', marginRight: 6 }}>({users.length} مستخدم)</span>
                </label>
                <select
                  value={form.user_id}
                  onChange={e => setForm(f => ({ ...f, user_id: e.target.value }))}
                  style={{ width: '100%', padding: '12px 14px', borderRadius: 8, border: `2px solid ${form.user_id ? '#58CC02' : '#334155'}`, background: '#0f172a', color: form.user_id ? '#fff' : '#64748b', fontSize: 14 }}>
                  <option value="">-- اختر مستخدم --</option>
                  {users.map((u: any) => (
                    <option key={u.id} value={u.id}>
                      {u.full_name || u.username || 'مستخدم'} {u.email ? `— ${u.email}` : ''}
                    </option>
                  ))}
                </select>
                {users.length === 0 && (
                  <p style={{ fontSize: 12, color: '#f87171', margin: '6px 0 0' }}>
                    ⚠️ لا يوجد مستخدمين — يجب أن يسجّل دخوله في التطبيق أولاً
                  </p>
                )}
              </div>

              {/* Roadmap Select */}
              <div>
                <label style={{ display: 'block', fontSize: 13, color: '#94a3b8', marginBottom: 8, fontWeight: 700 }}>
                  📚 اختر الكورس *
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
                  {roadmaps.map((r: any) => {
                    const color = ROADMAP_COLORS[r.slug] || '#64748b'
                    const icon  = ROADMAP_ICONS[r.slug] || '📚'
                    const sel   = form.roadmap_id === r.id
                    return (
                      <button key={r.id} type="button"
                        onClick={() => setForm(f => ({ ...f, roadmap_id: r.id }))}
                        style={{
                          padding: '14px 8px', borderRadius: 12,
                          border: `2px solid ${sel ? color : '#334155'}`,
                          background: sel ? color + '25' : '#0f172a',
                          cursor: 'pointer', textAlign: 'center',
                          transition: 'all 0.15s',
                        }}>
                        <div style={{ fontSize: 24, marginBottom: 6 }}>{icon}</div>
                        <div style={{ fontSize: 11, color: sel ? color : '#64748b', fontWeight: sel ? 800 : 400, lineHeight: 1.3 }}>
                          {r.title_ar}
                        </div>
                        {sel && <div style={{ fontSize: 10, color, marginTop: 4 }}>✓ محدد</div>}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Expiry */}
              <div>
                <label style={{ display: 'block', fontSize: 13, color: '#94a3b8', marginBottom: 8, fontWeight: 700 }}>
                  📅 مدة الاشتراك
                </label>
                <select
                  value={form.expires_days}
                  onChange={e => setForm(f => ({ ...f, expires_days: e.target.value }))}
                  style={{ width: '100%', padding: '12px 14px', borderRadius: 8, border: '1px solid #334155', background: '#0f172a', color: '#fff', fontSize: 14 }}>
                  <option value="">♾️ دائم — بدون انتهاء</option>
                  <option value="7">أسبوع (7 أيام)</option>
                  <option value="30">شهر (30 يوم)</option>
                  <option value="90">3 شهور (90 يوم)</option>
                  <option value="180">6 شهور (180 يوم)</option>
                  <option value="365">سنة كاملة (365 يوم)</option>
                </select>
              </div>

              {/* Submit */}
              <button
                onClick={enroll}
                disabled={saving || !form.user_id || !form.roadmap_id}
                style={{
                  padding: '15px', borderRadius: 10, border: 'none',
                  background: saving || !form.user_id || !form.roadmap_id ? '#334155' : '#58CC02',
                  color: saving || !form.user_id || !form.roadmap_id ? '#64748b' : '#fff',
                  fontWeight: 800, fontSize: 16,
                  cursor: saving || !form.user_id || !form.roadmap_id ? 'not-allowed' : 'pointer',
                  boxShadow: !saving && form.user_id && form.roadmap_id ? '0 4px 0 #3d8f00' : 'none',
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
