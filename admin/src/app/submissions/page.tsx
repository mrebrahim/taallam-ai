'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

const STATUS_COLORS: Record<string, string> = {
  pending: '#FF9600', reviewing: '#1CB0F6', approved: '#58CC02', rejected: '#FF4B4B'
}
const STATUS_LABELS: Record<string, string> = {
  pending: '⏳ انتظار المراجعة', reviewing: '👀 قيد المراجعة',
  approved: '✅ تمت الموافقة', rejected: '❌ مرفوض'
}

export default function SubmissionsPage() {
  const [submissions, setSubmissions] = useState<any[]>([])
  const [notifications, setNotifications] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<string>('all')
  const [selected, setSelected] = useState<any>(null)
  const [adminNotes, setAdminNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')

  useEffect(() => { load() }, [])

  const load = async () => {
    setLoading(true)
    const [{ data: subs }, { data: notifs }] = await Promise.all([
      supabase
        .from('task_submissions')
        .select(`
          *,
          user:users!task_submissions_user_id_fkey(id, full_name, email, username),
          challenge:challenges(id, title_ar, xp_reward)
        `)
        .order('submitted_at', { ascending: false }),
      supabase
        .from('admin_notifications')
        .select('*')
        .eq('type', 'task_submission')
        .eq('is_read', false)
        .order('created_at', { ascending: false })
        .limit(5),
    ])
    setSubmissions(Array.isArray(subs) ? subs : [])
    setNotifications(Array.isArray(notifs) ? notifs : [])
    setLoading(false)
  }

  const flash = (m: string) => { setMsg(m); setTimeout(() => setMsg(''), 3000) }

  const updateStatus = async (id: string, status: string, notes: string) => {
    setSaving(true)
    const update: any = { status, admin_notes: notes || null, reviewed_at: new Date().toISOString() }

    // Award XP if approved
    if (status === 'approved' && selected) {
      const xp = selected.challenge?.xp_reward || 50
      await supabase.from('users')
        .update({ xp_total: (selected.user?.xp_total || 0) + xp })
        .eq('id', selected.user_id)
      update.xp_awarded = xp
    }

    const { error } = await supabase
      .from('task_submissions')
      .update(update)
      .eq('id', id)

    if (!error) {
      flash(status === 'approved' ? '✅ تمت الموافقة' : status === 'rejected' ? '❌ تم الرفض' : '✅ تم التحديث')
      setSelected(null)
      setAdminNotes('')
      load()
    }
    setSaving(false)
  }

  const markNotifRead = async (notifId: string) => {
    await supabase.from('admin_notifications').update({ is_read: true }).eq('id', notifId)
    setNotifications(prev => prev.filter(n => n.id !== notifId))
  }

  const filtered = submissions.filter(s => filter === 'all' || s.status === filter)
  const counts = {
    all: submissions.length,
    pending: submissions.filter(s => s.status === 'pending').length,
    reviewing: submissions.filter(s => s.status === 'reviewing').length,
    approved: submissions.filter(s => s.status === 'approved').length,
    rejected: submissions.filter(s => s.status === 'rejected').length,
  }

  const formatSize = (bytes: number) => bytes > 1048576
    ? `${(bytes / 1048576).toFixed(1)} MB`
    : `${Math.round(bytes / 1024)} KB`

  return (
    <div style={{ minHeight: '100vh', background: '#0f172a', color: '#fff', fontFamily: 'system-ui,sans-serif', direction: 'rtl' }}>
      {/* Header */}
      <header style={{ background: '#1e293b', borderBottom: '1px solid #334155', padding: '16px 32px', display: 'flex', alignItems: 'center', gap: 16 }}>
        <Link href="/" style={{ color: '#64748b', textDecoration: 'none', fontSize: 20 }}>→</Link>
        <h1 style={{ margin: 0, fontSize: 20, fontWeight: 800 }}>📩 مراجعة التاسكات</h1>
        {counts.pending > 0 && (
          <span style={{ background: Colors.orange, color: '#fff', borderRadius: 99, padding: '3px 10px', fontSize: 12, fontWeight: 800 }}>
            {counts.pending} جديد
          </span>
        )}
        <button onClick={load} style={{ marginRight: 'auto', padding: '6px 14px', borderRadius: 8, border: '1px solid #334155', background: 'transparent', color: '#94a3b8', cursor: 'pointer', fontSize: 13 }}>
          🔄 تحديث
        </button>
      </header>

      {msg && (
        <div style={{ background: msg.startsWith('✅') ? '#166534' : '#7f1d1d', color: msg.startsWith('✅') ? '#bbf7d0' : '#fca5a5', padding: '10px 32px', fontSize: 14, fontWeight: 600 }}>
          {msg}
        </div>
      )}

      <div style={{ padding: 32, maxWidth: 1100, margin: '0 auto' }}>

        {/* New notifications */}
        {notifications.length > 0 && (
          <div style={{ marginBottom: 24 }}>
            <div style={{ fontSize: 13, color: '#64748b', fontWeight: 700, marginBottom: 10 }}>🔔 إشعارات جديدة</div>
            {notifications.map(n => (
              <div key={n.id} style={{ background: '#1e293b', borderRadius: 12, padding: '14px 16px', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 12, borderRight: '3px solid #FF9600' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 700 }}>{n.title}</div>
                  <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>{n.body}</div>
                </div>
                <button onClick={() => markNotifRead(n.id)} style={{ padding: '4px 10px', borderRadius: 6, border: 'none', background: '#334155', color: '#94a3b8', cursor: 'pointer', fontSize: 11 }}>
                  تم
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12, marginBottom: 24 }}>
          {Object.entries(counts).map(([status, count]) => (
            <button key={status} onClick={() => setFilter(status)}
              style={{ background: filter === status ? '#334155' : '#1e293b', borderRadius: 12, padding: '14px', border: `2px solid ${filter === status ? '#475569' : 'transparent'}`, cursor: 'pointer', textAlign: 'center' }}>
              <div style={{ fontSize: 24, fontWeight: 900, color: status === 'all' ? '#fff' : STATUS_COLORS[status] || '#fff' }}>{count}</div>
              <div style={{ fontSize: 11, color: '#64748b', marginTop: 4 }}>
                {status === 'all' ? 'الكل' : STATUS_LABELS[status]?.replace(/^[^\s]+ /, '') || status}
              </div>
            </button>
          ))}
        </div>

        {/* Table */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: 48, color: '#64748b' }}>⏳ جاري التحميل...</div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 48, color: '#64748b' }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>📭</div>
            <div style={{ fontSize: 16, fontWeight: 700 }}>لا يوجد تسليمات</div>
          </div>
        ) : (
          <div style={{ background: '#1e293b', borderRadius: 14, overflow: 'hidden', border: '1px solid #334155' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#334155', textAlign: 'right' }}>
                  {['المستخدم', 'التاسك', 'الملف', 'الحجم', 'تاريخ الرفع', 'الحالة', 'إجراءات'].map(h => (
                    <th key={h} style={{ padding: '12px 16px', fontSize: 12, color: '#94a3b8', fontWeight: 600 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((sub, i) => (
                  <tr key={sub.id} style={{ borderTop: '1px solid #334155', background: i % 2 === 0 ? 'transparent' : '#162032' }}>
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ fontWeight: 700, fontSize: 13, color: '#e2e8f0' }}>{sub.user?.full_name || '—'}</div>
                      <div style={{ fontSize: 11, color: '#64748b' }}>{sub.user?.email || '—'}</div>
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: 13, color: '#94a3b8' }}>
                      {sub.challenge?.title_ar || '—'}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <a href={sub.file_url} target="_blank" rel="noreferrer"
                        style={{ color: '#60a5fa', fontSize: 12, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4 }}>
                        📎 {sub.file_name?.length > 20 ? sub.file_name.slice(0, 18) + '...' : sub.file_name}
                      </a>
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: 12, color: '#64748b' }}>
                      {formatSize(sub.file_size_bytes || 0)}
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: 11, color: '#64748b' }}>
                      {sub.submitted_at ? new Date(sub.submitted_at).toLocaleDateString('ar-EG') : '—'}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{ background: (STATUS_COLORS[sub.status] || '#64748b') + '20', color: STATUS_COLORS[sub.status] || '#64748b', borderRadius: 6, padding: '3px 10px', fontSize: 11, fontWeight: 700 }}>
                        {STATUS_LABELS[sub.status] || sub.status}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <button onClick={() => { setSelected(sub); setAdminNotes(sub.admin_notes || '') }}
                        style={{ padding: '5px 12px', borderRadius: 6, border: '1px solid #334155', background: 'transparent', color: '#60a5fa', cursor: 'pointer', fontSize: 12 }}>
                        مراجعة
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Review Modal */}
      {selected && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: 20 }}>
          <div style={{ background: '#1e293b', borderRadius: 16, width: '100%', maxWidth: 560, border: '1px solid #334155', overflow: 'hidden' }}>
            <div style={{ padding: '18px 24px', borderBottom: '1px solid #334155', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <h2 style={{ margin: 0, fontSize: 17, color: '#e2e8f0' }}>📋 مراجعة التاسك</h2>
              <button onClick={() => setSelected(null)} style={{ width: 28, height: 28, borderRadius: 8, border: 'none', background: '#334155', color: '#94a3b8', cursor: 'pointer' }}>✕</button>
            </div>

            <div style={{ padding: '20px 24px' }}>
              {/* User info */}
              <div style={{ background: '#0f172a', borderRadius: 10, padding: 14, marginBottom: 16 }}>
                <div style={{ fontSize: 13, color: '#94a3b8', marginBottom: 4 }}>المستخدم</div>
                <div style={{ fontSize: 16, fontWeight: 800, color: '#e2e8f0' }}>{selected.user?.full_name || '—'}</div>
                <div style={{ fontSize: 12, color: '#64748b' }}>{selected.user?.email}</div>
              </div>

              {/* Task info */}
              <div style={{ background: '#0f172a', borderRadius: 10, padding: 14, marginBottom: 16 }}>
                <div style={{ fontSize: 13, color: '#94a3b8', marginBottom: 4 }}>التاسك</div>
                <div style={{ fontSize: 15, fontWeight: 700, color: '#e2e8f0' }}>{selected.challenge?.title_ar}</div>
                <div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>⚡ {selected.challenge?.xp_reward} XP عند الموافقة</div>
              </div>

              {/* File */}
              <div style={{ background: '#0f172a', borderRadius: 10, padding: 14, marginBottom: 16 }}>
                <div style={{ fontSize: 13, color: '#94a3b8', marginBottom: 8 }}>الملف المرفوع</div>
                <a href={selected.file_url} target="_blank" rel="noreferrer"
                  style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#60a5fa', textDecoration: 'none', padding: '10px 14px', background: '#1e293b', borderRadius: 8 }}>
                  <span style={{ fontSize: 20 }}>📎</span>
                  <span style={{ flex: 1, fontSize: 13 }}>{selected.file_name}</span>
                  <span style={{ fontSize: 11, color: '#475569' }}>{formatSize(selected.file_size_bytes || 0)}</span>
                  <span style={{ fontSize: 12, color: '#3b82f6' }}>↗ فتح</span>
                </a>
              </div>

              {/* Admin notes */}
              <div style={{ marginBottom: 20 }}>
                <label style={{ fontSize: 13, color: '#94a3b8', fontWeight: 700, display: 'block', marginBottom: 8 }}>
                  💬 ملاحظة للمستخدم (اختياري)
                </label>
                <textarea
                  value={adminNotes}
                  onChange={e => setAdminNotes(e.target.value)}
                  rows={3}
                  placeholder="اكتب ملاحظة أو سبب الرفض..."
                  style={{ width: '100%', padding: '12px 14px', borderRadius: 8, border: '1px solid #334155', background: '#0f172a', color: '#fff', fontSize: 13, resize: 'vertical', boxSizing: 'border-box' }}
                />
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', gap: 10 }}>
                <button
                  onClick={() => updateStatus(selected.id, 'reviewing', adminNotes)}
                  disabled={saving}
                  style={{ flex: 1, padding: '12px', borderRadius: 10, border: 'none', background: '#1CB0F6', color: '#fff', fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1 }}>
                  👀 قيد المراجعة
                </button>
                <button
                  onClick={() => updateStatus(selected.id, 'approved', adminNotes)}
                  disabled={saving}
                  style={{ flex: 1, padding: '12px', borderRadius: 10, border: 'none', background: '#58CC02', color: '#fff', fontWeight: 800, cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1 }}>
                  ✅ موافقة + XP
                </button>
                <button
                  onClick={() => updateStatus(selected.id, 'rejected', adminNotes)}
                  disabled={saving}
                  style={{ flex: 1, padding: '12px', borderRadius: 10, border: 'none', background: '#FF4B4B', color: '#fff', fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1 }}>
                  ❌ رفض
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

const Colors: Record<string, string> = { orange: '#FF9600' }
