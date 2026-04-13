'use client'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!

export default function SadaqatPage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [groups, setGroups] = useState<any[]>([])
  const [challenges, setChallenges] = useState<any[]>([])
  const [lessons, setLessons] = useState<any[]>([])
  const [myGroups, setMyGroups] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [tab, setTab] = useState<'browse' | 'mine'>('browse')
  const [msg, setMsg] = useState('')

  // Create form
  const [form, setForm] = useState({
    name_ar: '', description_ar: '', group_type: 'challenge',
    challenge_id: '', lesson_id: '', max_members: 4, group_xp_reward: 100,
  })
  const [creating, setCreating] = useState(false)

  useEffect(() => {
    const supabase = createClient()
    const load = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.replace('/auth/login'); return }

      const [{ data: u }, { data: g }, { data: ch }, { data: ls }] = await Promise.all([
        supabase.from('users').select('*').eq('id', session.user.id).single(),
        supabase.from('study_groups')
          .select(`*, creator:users!creator_id(full_name, username),
            study_group_members(user_id, completed, users(full_name, username, current_level)),
            challenges(title_ar), lessons(title_ar)`)
          .eq('is_active', true)
          .order('created_at', { ascending: false }),
        supabase.from('challenges').select('id, title_ar').eq('is_active', true),
        supabase.from('lessons').select('id, title_ar, roadmap_id').eq('is_active', true).limit(30),
      ])

      setUser(u)
      setGroups(g || [])
      setChallenges(ch || [])
      setLessons(ls || [])

      // Which groups am I in?
      const mine = new Set(
        (g || [])
          .filter((grp: any) => grp.study_group_members?.some((m: any) => m.user_id === session.user.id))
          .map((grp: any) => grp.id)
      )
      setMyGroups(mine)
      setLoading(false)
    }
    load()
  }, [])

  const joinGroup = async (groupId: string) => {
    const supabase = createClient()
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return

    const { error } = await supabase.from('study_group_members').insert({
      group_id: groupId, user_id: session.user.id, role: 'member',
    })
    if (!error) {
      setMyGroups(prev => new Set([...prev, groupId]))
      setMsg('✅ انضممت للمجموعة!')
      // Refresh
      const { data: g } = await supabase.from('study_groups')
        .select(`*, creator:users!creator_id(full_name, username),
          study_group_members(user_id, completed, users(full_name, username, current_level)),
          challenges(title_ar), lessons(title_ar)`)
        .eq('is_active', true).order('created_at', { ascending: false })
      setGroups(g || [])
    } else {
      setMsg('❌ ' + (error.message || 'خطأ'))
    }
    setTimeout(() => setMsg(''), 3000)
  }

  const leaveGroup = async (groupId: string) => {
    const supabase = createClient()
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return
    await supabase.from('study_group_members')
      .delete().eq('group_id', groupId).eq('user_id', session.user.id)
    setMyGroups(prev => { const n = new Set(prev); n.delete(groupId); return n })
    setMsg('تم الخروج من المجموعة')
    setTimeout(() => setMsg(''), 2000)
  }

  const createGroup = async () => {
    if (!form.name_ar) { setMsg('❌ اكتب اسم المجموعة'); setTimeout(() => setMsg(''), 3000); return }
    setCreating(true)
    const supabase = createClient()
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return

    const payload: any = {
      name_ar: form.name_ar,
      description_ar: form.description_ar || null,
      group_type: form.group_type,
      creator_id: session.user.id,
      max_members: Number(form.max_members),
      group_xp_reward: Number(form.group_xp_reward),
    }
    if (form.group_type === 'challenge' && form.challenge_id) payload.challenge_id = form.challenge_id
    if (form.group_type === 'lesson_study' && form.lesson_id) payload.lesson_id = form.lesson_id

    const { data: newGroup, error } = await supabase
      .from('study_groups').insert(payload).select().single()

    if (!error && newGroup) {
      // Auto-join as creator
      await supabase.from('study_group_members').insert({
        group_id: newGroup.id, user_id: session.user.id, role: 'creator',
      })
      setMsg('✅ تم إنشاء المجموعة!')
      setShowCreate(false)
      setForm({ name_ar: '', description_ar: '', group_type: 'challenge', challenge_id: '', lesson_id: '', max_members: 4, group_xp_reward: 100 })
      // Refresh
      const { data: g } = await supabase.from('study_groups')
        .select(`*, creator:users!creator_id(full_name, username),
          study_group_members(user_id, completed, users(full_name, username, current_level)),
          challenges(title_ar), lessons(title_ar)`)
        .eq('is_active', true).order('created_at', { ascending: false })
      setGroups(g || [])
      setMyGroups(prev => new Set([...prev, newGroup.id]))
    } else {
      setMsg('❌ ' + (error?.message || 'خطأ'))
    }
    setCreating(false)
    setTimeout(() => setMsg(''), 4000)
  }

  if (loading) return (
    <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'#f7f7f7' }}>
      <div style={{ textAlign:'center' }}>
        <div style={{ fontSize:52, marginBottom:8 }}>📿</div>
        <div style={{ fontSize:14, color:'#999' }}>جاري التحميل...</div>
      </div>
    </div>
  )

  const allGroups = groups
  const filteredGroups = tab === 'mine'
    ? allGroups.filter(g => myGroups.has(g.id))
    : allGroups.filter(g => !myGroups.has(g.id) && g.study_group_members?.length < g.max_members)

  return (
    <div dir="rtl" style={{ maxWidth:480, margin:'0 auto', minHeight:'100vh', background:'#f7f7f7', fontFamily:"'Segoe UI',Tahoma,sans-serif", paddingBottom:90 }}>

      {/* Header */}
      <div style={{ background:'linear-gradient(135deg, #1e293b, #0f172a)', padding:'20px 16px 24px' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:12 }}>
          <div>
            <h1 style={{ margin:0, fontSize:22, fontWeight:900, color:'#fff' }}>📿 صدقة العلم</h1>
            <p style={{ margin:'4px 0 0', fontSize:13, color:'rgba(255,255,255,0.6)' }}>مجتمع التعلم الجماعي</p>
          </div>
          <button onClick={() => setShowCreate(true)} style={{
            padding:'9px 16px', borderRadius:10, border:'none',
            background:'#58CC02', color:'#fff', fontWeight:800, fontSize:14, cursor:'pointer',
          }}>
            + مجموعة
          </button>
        </div>

        {/* Stats */}
        <div style={{ display:'flex', gap:10 }}>
          {[
            { label:'مجموعات نشطة', val: allGroups.filter(g => g.status !== 'completed').length, emoji:'👥' },
            { label:'أنت فيها', val: myGroups.size, emoji:'⭐' },
          ].map(s => (
            <div key={s.label} style={{ flex:1, background:'rgba(255,255,255,0.1)', borderRadius:12, padding:'10px 14px' }}>
              <div style={{ fontSize:20, fontWeight:900, color:'#fff' }}>{s.emoji} {s.val}</div>
              <div style={{ fontSize:11, color:'rgba(255,255,255,0.6)', marginTop:2 }}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display:'flex', background:'#fff', borderBottom:'2px solid #f0f0f0' }}>
        {([['browse','اكتشف المجموعات'], ['mine','مجموعاتي']] as [string,string][]).map(([key, label]) => (
          <button key={key} onClick={() => setTab(key as any)} style={{
            flex:1, padding:'12px', border:'none', background:'transparent',
            color: tab===key ? '#1CB0F6' : '#aaa',
            fontWeight: tab===key ? 800 : 400, fontSize:14, cursor:'pointer',
            borderBottom: tab===key ? '3px solid #1CB0F6' : '3px solid transparent',
          }}>
            {label}
          </button>
        ))}
      </div>

      {msg && (
        <div style={{ background: msg.startsWith('✅') ? '#D7FFB8' : '#FFE5E5', padding:'10px 16px', fontSize:14, fontWeight:700, color: msg.startsWith('✅') ? '#27500A' : '#7f1d1d', textAlign:'center' }}>
          {msg}
        </div>
      )}

      <div style={{ padding:'16px 16px 0' }}>
        {filteredGroups.length === 0 && (
          <div style={{ background:'#fff', borderRadius:20, padding:'40px 24px', textAlign:'center', border:'2px solid #f0f0f0' }}>
            <div style={{ fontSize:52, marginBottom:12 }}>📿</div>
            <div style={{ fontSize:17, fontWeight:800, color:'#333', marginBottom:8 }}>
              {tab === 'mine' ? 'لم تنضم لأي مجموعة بعد' : 'لا توجد مجموعات متاحة'}
            </div>
            <div style={{ fontSize:13, color:'#999', marginBottom:16 }}>
              {tab === 'mine' ? 'انضم لمجموعة أو أنشئ واحدة جديدة!' : 'كن أول من ينشئ مجموعة تعلم!'}
            </div>
            <button onClick={() => setShowCreate(true)} style={{ padding:'12px 24px', borderRadius:12, border:'none', background:'#58CC02', color:'#fff', fontWeight:800, fontSize:14, cursor:'pointer' }}>
              + أنشئ مجموعة
            </button>
          </div>
        )}

        {filteredGroups.map(grp => {
          const members = grp.study_group_members || []
          const isMember = myGroups.has(grp.id)
          const isFull = members.length >= grp.max_members
          const completedCount = members.filter((m: any) => m.completed).length
          const type = grp.group_type
          const typeColor = type === 'challenge' ? '#CE82FF' : type === 'lesson_study' ? '#1CB0F6' : '#58CC02'
          const typeLabel = type === 'challenge' ? '⚔️ تحدي جماعي' : type === 'lesson_study' ? '📚 دراسة مشتركة' : '💬 نقاش حر'

          return (
            <div key={grp.id} style={{ background:'#fff', borderRadius:18, padding:'16px 18px', marginBottom:12, border:`2px solid ${isMember ? typeColor + '40' : '#f0f0f0'}` }}>
              {/* Header */}
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:10 }}>
                <div style={{ flex:1 }}>
                  <div style={{ fontWeight:800, color:'#333', fontSize:16, marginBottom:4 }}>{grp.name_ar}</div>
                  <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
                    <span style={{ background: typeColor+'20', color: typeColor, borderRadius:6, padding:'2px 8px', fontSize:11, fontWeight:700 }}>
                      {typeLabel}
                    </span>
                    {grp.challenges?.title_ar && (
                      <span style={{ background:'#f0f0f0', color:'#666', borderRadius:6, padding:'2px 8px', fontSize:11 }}>
                        {grp.challenges.title_ar.slice(0, 20)}...
                      </span>
                    )}
                    {grp.lessons?.title_ar && (
                      <span style={{ background:'#f0f0f0', color:'#666', borderRadius:6, padding:'2px 8px', fontSize:11 }}>
                        {grp.lessons.title_ar.slice(0, 20)}...
                      </span>
                    )}
                  </div>
                </div>
                {/* XP reward */}
                <div style={{ background:'#FFF5D3', borderRadius:8, padding:'4px 10px', fontSize:12, fontWeight:800, color:'#A56644', flexShrink:0 }}>
                  ⚡ {grp.group_xp_reward} XP
                </div>
              </div>

              {/* Description */}
              {grp.description_ar && (
                <p style={{ margin:'0 0 10px', fontSize:13, color:'#666', lineHeight:1.5 }}>{grp.description_ar}</p>
              )}

              {/* Members */}
              <div style={{ marginBottom:12 }}>
                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:6 }}>
                  <span style={{ fontSize:12, color:'#999', fontWeight:600 }}>الأعضاء</span>
                  <span style={{ fontSize:12, color: isFull ? '#FF4B4B' : '#58CC02', fontWeight:700 }}>
                    {members.length}/{grp.max_members} {isFull ? '(ممتلئة)' : ''}
                  </span>
                </div>
                <div style={{ display:'flex', gap:8, alignItems:'center' }}>
                  {members.slice(0, 5).map((m: any, i: number) => (
                    <div key={i} style={{
                      width:36, height:36, borderRadius:10,
                      background: m.completed ? '#D7FFB8' : '#f0f0f0',
                      border: `2px solid ${m.completed ? '#58CC02' : '#ddd'}`,
                      display:'flex', alignItems:'center', justifyContent:'center',
                      fontSize:14, fontWeight:800,
                    }}>
                      {m.completed ? '✅' : m.users?.full_name?.[0] || '?'}
                    </div>
                  ))}
                  {members.length < grp.max_members && !isMember && (
                    <div style={{ width:36, height:36, borderRadius:10, border:'2px dashed #ddd', display:'flex', alignItems:'center', justifyContent:'center', fontSize:18, color:'#ddd' }}>+</div>
                  )}
                </div>
                {/* Progress bar */}
                {members.length > 0 && (
                  <div style={{ marginTop:8, height:6, background:'#f0f0f0', borderRadius:99, overflow:'hidden' }}>
                    <div style={{ height:'100%', width:`${(completedCount / members.length) * 100}%`, background: typeColor, borderRadius:99, transition:'width 0.5s' }} />
                  </div>
                )}
              </div>

              {/* Creator */}
              <div style={{ fontSize:12, color:'#aaa', marginBottom:10 }}>
                بواسطة: {grp.creator?.full_name || grp.creator?.username || '—'}
              </div>

              {/* Action button */}
              {isMember ? (
                <div style={{ display:'flex', gap:8 }}>
                  <Link href={`/sadaqat/${grp.id}`} style={{
                    flex:1, padding:'11px', borderRadius:12, border:'none',
                    background: typeColor, color:'#fff', fontWeight:800, fontSize:14,
                    textDecoration:'none', textAlign:'center',
                  }}>
                    دخول المجموعة 🚀
                  </Link>
                  <button onClick={() => leaveGroup(grp.id)} style={{ padding:'11px 14px', borderRadius:12, border:'2px solid #f0f0f0', background:'transparent', color:'#aaa', cursor:'pointer', fontSize:12 }}>
                    خروج
                  </button>
                </div>
              ) : isFull ? (
                <div style={{ padding:'11px', borderRadius:12, background:'#f7f7f7', color:'#aaa', fontWeight:700, fontSize:13, textAlign:'center' }}>
                  المجموعة ممتلئة
                </div>
              ) : (
                <button onClick={() => joinGroup(grp.id)} style={{
                  width:'100%', padding:'12px', borderRadius:12, border:'none',
                  background:'#1CB0F6', color:'#fff', fontWeight:800, fontSize:14, cursor:'pointer',
                }}>
                  انضم للمجموعة 👥
                </button>
              )}
            </div>
          )
        })}
      </div>

      {/* Create Group Modal */}
      {showCreate && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.7)', display:'flex', alignItems:'flex-end', justifyContent:'center', zIndex:200 }}>
          <div style={{ background:'#fff', borderRadius:'24px 24px 0 0', padding:'24px 20px 40px', width:'100%', maxWidth:480, maxHeight:'90vh', overflowY:'auto' }} dir="rtl">
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
              <h2 style={{ margin:0, fontSize:18, fontWeight:900, color:'#333' }}>📿 مجموعة جديدة</h2>
              <button onClick={() => setShowCreate(false)} style={{ width:32, height:32, borderRadius:8, border:'none', background:'#f0f0f0', cursor:'pointer', fontSize:16 }}>✕</button>
            </div>

            <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
              {/* Name */}
              <div>
                <label style={{ display:'block', fontSize:13, color:'#666', marginBottom:6, fontWeight:600 }}>اسم المجموعة *</label>
                <input value={form.name_ar} onChange={e => setForm(f => ({ ...f, name_ar: e.target.value }))}
                  placeholder="مثال: مجموعة تحدي HTTP Request"
                  style={{ width:'100%', padding:'12px 14px', borderRadius:12, border:`2px solid ${form.name_ar ? '#1CB0F6' : '#f0f0f0'}`, fontSize:14, boxSizing:'border-box', outline:'none' }} />
              </div>

              {/* Description */}
              <div>
                <label style={{ display:'block', fontSize:13, color:'#666', marginBottom:6, fontWeight:600 }}>وصف (اختياري)</label>
                <textarea value={form.description_ar} onChange={e => setForm(f => ({ ...f, description_ar: e.target.value }))}
                  rows={2} placeholder="ما هدف المجموعة؟"
                  style={{ width:'100%', padding:'12px 14px', borderRadius:12, border:'2px solid #f0f0f0', fontSize:13, boxSizing:'border-box', resize:'vertical', outline:'none' }} />
              </div>

              {/* Type */}
              <div>
                <label style={{ display:'block', fontSize:13, color:'#666', marginBottom:8, fontWeight:600 }}>نوع المجموعة *</label>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:8 }}>
                  {[
                    { key:'challenge', icon:'⚔️', label:'تحدي جماعي' },
                    { key:'lesson_study', icon:'📚', label:'دراسة مشتركة' },
                    { key:'free', icon:'💬', label:'نقاش حر' },
                  ].map(t => (
                    <button key={t.key} type="button" onClick={() => setForm(f => ({ ...f, group_type: t.key }))}
                      style={{ padding:'12px 8px', borderRadius:10, border:`2px solid ${form.group_type===t.key ? '#1CB0F6' : '#f0f0f0'}`, background: form.group_type===t.key ? '#DDF4FF' : '#f9f9f9', cursor:'pointer', display:'flex', flexDirection:'column', alignItems:'center', gap:4 }}>
                      <span style={{ fontSize:22 }}>{t.icon}</span>
                      <span style={{ fontSize:11, color: form.group_type===t.key ? '#1CB0F6' : '#666', fontWeight: form.group_type===t.key ? 800 : 400 }}>{t.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Select challenge */}
              {form.group_type === 'challenge' && (
                <div>
                  <label style={{ display:'block', fontSize:13, color:'#666', marginBottom:6, fontWeight:600 }}>اختر التحدي</label>
                  <select value={form.challenge_id} onChange={e => setForm(f => ({ ...f, challenge_id: e.target.value }))}
                    style={{ width:'100%', padding:'12px 14px', borderRadius:12, border:'2px solid #f0f0f0', fontSize:13, background:'#f9f9f9' }}>
                    <option value="">اختر تحدي...</option>
                    {challenges.map(c => <option key={c.id} value={c.id}>{c.title_ar}</option>)}
                  </select>
                </div>
              )}

              {/* Select lesson */}
              {form.group_type === 'lesson_study' && (
                <div>
                  <label style={{ display:'block', fontSize:13, color:'#666', marginBottom:6, fontWeight:600 }}>اختر الدرس</label>
                  <select value={form.lesson_id} onChange={e => setForm(f => ({ ...f, lesson_id: e.target.value }))}
                    style={{ width:'100%', padding:'12px 14px', borderRadius:12, border:'2px solid #f0f0f0', fontSize:13, background:'#f9f9f9' }}>
                    <option value="">اختر درس...</option>
                    {lessons.map(l => <option key={l.id} value={l.id}>{l.title_ar}</option>)}
                  </select>
                </div>
              )}

              {/* Max members + XP */}
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
                <div>
                  <label style={{ display:'block', fontSize:13, color:'#666', marginBottom:6, fontWeight:600 }}>عدد الأعضاء (1-5)</label>
                  <div style={{ display:'flex', gap:6 }}>
                    {[2,3,4,5].map(n => (
                      <button key={n} type="button" onClick={() => setForm(f => ({ ...f, max_members: n }))}
                        style={{ flex:1, padding:'8px', borderRadius:8, border:`2px solid ${form.max_members===n ? '#58CC02' : '#f0f0f0'}`, background: form.max_members===n ? '#D7FFB8' : '#f9f9f9', cursor:'pointer', fontWeight:800, color: form.max_members===n ? '#27500A' : '#666', fontSize:14 }}>
                        {n}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label style={{ display:'block', fontSize:13, color:'#666', marginBottom:6, fontWeight:600 }}>XP الجائزة</label>
                  <input type="number" value={form.group_xp_reward} onChange={e => setForm(f => ({ ...f, group_xp_reward: Number(e.target.value) }))}
                    style={{ width:'100%', padding:'10px 12px', borderRadius:8, border:'2px solid #f0f0f0', fontSize:15, fontWeight:800, color:'#FF9600', textAlign:'center', boxSizing:'border-box' }} />
                </div>
              </div>
            </div>

            <button onClick={createGroup} disabled={creating} style={{
              width:'100%', marginTop:20, padding:'15px', borderRadius:14, border:'none',
              background: creating ? '#aaa' : '#58CC02', color:'#fff',
              fontWeight:900, fontSize:16, cursor: creating ? 'not-allowed' : 'pointer',
              boxShadow: creating ? 'none' : '0 4px 0 #3d8f00',
            }}>
              {creating ? '⏳ جاري الإنشاء...' : '📿 إنشاء المجموعة'}
            </button>
          </div>
        </div>
      )}

      {/* Bottom Nav */}
      <nav style={{ position:'fixed', bottom:0, left:'50%', transform:'translateX(-50%)', width:'100%', maxWidth:480, background:'#fff', borderTop:'2px solid #f0f0f0', display:'flex', padding:'8px 0 16px', zIndex:100, direction:'ltr' }}>
        {[
          { href:'/profile',     icon:'👤', label:'ملفي'     },
          { href:'/leaderboard', icon:'🏆', label:'الترتيب'  },
          { href:'/challenges',  icon:'⚔️',  label:'التحديات'},
          { href:'/learn',       icon:'📚', label:'التعلم'   },
          { href:'/home',        icon:'🏠', label:'الرئيسية' },
        ].map(n => (
          <Link key={n.href} href={n.href} style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', gap:3, textDecoration:'none', padding:'4px 0' }}>
            <span style={{ fontSize:22 }}>{n.icon}</span>
            <span style={{ fontSize:10, color:'#aaa' }}>{n.label}</span>
          </Link>
        ))}
      </nav>
    </div>
  )
}
