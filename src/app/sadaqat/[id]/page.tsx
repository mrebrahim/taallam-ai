'use client'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'

export default function GroupDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [group, setGroup] = useState<any>(null)
  const [messages, setMessages] = useState<any[]>([])
  const [myMembership, setMyMembership] = useState<any>(null)
  const [newMsg, setNewMsg] = useState('')
  const [loading, setLoading] = useState(true)
  const [completing, setCompleting] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const supabase = createClient()
    const load = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.replace('/auth/login'); return }

      const [{ data: u }, { data: g }, { data: msgs }] = await Promise.all([
        supabase.from('users').select('*').eq('id', session.user.id).single(),
        supabase.from('study_groups')
          .select(`*, creator:users!creator_id(full_name, username),
            study_group_members(*, users(full_name, username, current_level, xp_total)),
            challenges(title_ar, question_ar, xp_reward),
            lessons(title_ar, description_ar, vimeo_id)`)
          .eq('id', id).single(),
        supabase.from('study_group_messages')
          .select('*, users(full_name, username)')
          .eq('group_id', id)
          .order('created_at', { ascending: true })
          .limit(50),
      ])

      setUser(u)
      setGroup(g)
      setMessages(msgs || [])

      const membership = g?.study_group_members?.find((m: any) => m.user_id === session.user.id)
      setMyMembership(membership)
      setLoading(false)

      // Subscribe to realtime messages
      const channel = supabase.channel(`group_${id}`)
        .on('postgres_changes', {
          event: 'INSERT', schema: 'public', table: 'study_group_messages',
          filter: `group_id=eq.${id}`
        }, async (payload) => {
          const { data: newMsg } = await supabase
            .from('study_group_messages')
            .select('*, users(full_name, username)')
            .eq('id', payload.new.id)
            .single()
          if (newMsg) setMessages(prev => [...prev, newMsg])
        })
        .subscribe()

      return () => { supabase.removeChannel(channel) }
    }
    load()
  }, [id])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const sendMessage = async () => {
    if (!newMsg.trim() || !user) return
    const supabase = createClient()
    await supabase.from('study_group_messages').insert({
      group_id: id, user_id: user.id, message_ar: newMsg.trim(),
    })
    setNewMsg('')
  }

  const markComplete = async () => {
    if (!myMembership || myMembership.completed || !user) return
    setCompleting(true)
    const supabase = createClient()

    await supabase.from('study_group_members')
      .update({ completed: true, completed_at: new Date().toISOString() })
      .eq('id', myMembership.id)

    // Check if ALL members completed
    const { data: members } = await supabase
      .from('study_group_members').select('*').eq('group_id', id)
    const allDone = members?.every(m => m.completed || m.user_id === user.id)

    if (allDone && group) {
      // Award XP to all members
      for (const m of members || []) {
        try {
          await supabase.rpc('award_xp', {
            p_user_id: m.user_id,
            p_amount: group.group_xp_reward,
            p_reason: 'study_group_complete',
            p_reference_id: id,
          })
        } catch {}
      }
      await supabase.from('study_groups').update({ status: 'completed' }).eq('id', id)
      await supabase.from('study_group_messages').insert({
        group_id: id, user_id: user.id,
        message_ar: `🎉 أكمل الجميع التحدي! كل عضو حصل على ${group.group_xp_reward} XP!`
      })
    } else {
      await supabase.from('study_group_messages').insert({
        group_id: id, user_id: user.id,
        message_ar: `✅ ${user.full_name || user.username} أكمل التحدي/الدرس!`
      })
    }

    // Refresh
    const { data: g } = await supabase.from('study_groups')
      .select(`*, creator:users!creator_id(full_name, username),
        study_group_members(*, users(full_name, username, current_level, xp_total)),
        challenges(title_ar, question_ar, xp_reward), lessons(title_ar)`)
      .eq('id', id).single()
    setGroup(g)
    setMyMembership({ ...myMembership, completed: true })
    setCompleting(false)
  }

  if (loading) return (
    <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center' }}>
      <span style={{ fontSize:48 }}>📿</span>
    </div>
  )

  if (!group) return (
    <div style={{ minHeight:'100vh', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:16 }}>
      <span style={{ fontSize:48 }}>😕</span>
      <Link href="/sadaqat" style={{ color:'#1CB0F6' }}>← رجوع لصدقة العلم</Link>
    </div>
  )

  const members = group.study_group_members || []
  const completedCount = members.filter((m: any) => m.completed).length
  const allCompleted = completedCount === members.length && members.length > 0
  const typeColor = group.group_type === 'challenge' ? '#CE82FF' : group.group_type === 'lesson_study' ? '#1CB0F6' : '#58CC02'

  return (
    <div dir="rtl" style={{ maxWidth:480, margin:'0 auto', height:'100vh', display:'flex', flexDirection:'column', background:'#f7f7f7', fontFamily:"'Segoe UI',Tahoma,sans-serif" }}>

      {/* Header */}
      <div style={{ background:'#fff', padding:'12px 16px', borderBottom:'2px solid #f0f0f0', flexShrink:0 }}>
        <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:8 }}>
          <Link href="/sadaqat" style={{ width:34, height:34, borderRadius:10, background:'#f0f0f0', display:'flex', alignItems:'center', justifyContent:'center', textDecoration:'none', fontSize:16, color:'#333', flexShrink:0 }}>←</Link>
          <div style={{ flex:1 }}>
            <div style={{ fontWeight:800, color:'#333', fontSize:15 }}>{group.name_ar}</div>
            <div style={{ fontSize:11, color:'#aaa' }}>
              {group.group_type === 'challenge' ? '⚔️ تحدي جماعي' : group.group_type === 'lesson_study' ? '📚 دراسة مشتركة' : '💬 نقاش حر'}
              {' · '}{members.length}/{group.max_members} أعضاء
            </div>
          </div>
          <div style={{ background:'#FFF5D3', borderRadius:8, padding:'4px 10px', fontSize:12, fontWeight:800, color:'#A56644', flexShrink:0 }}>
            ⚡ {group.group_xp_reward} XP
          </div>
        </div>

        {/* Members row */}
        <div style={{ display:'flex', gap:8, alignItems:'center' }}>
          {members.map((m: any, i: number) => (
            <div key={i} title={m.users?.full_name || '?'} style={{
              width:36, height:36, borderRadius:10,
              background: m.completed ? '#D7FFB8' : typeColor + '20',
              border: `2px solid ${m.completed ? '#58CC02' : typeColor + '40'}`,
              display:'flex', alignItems:'center', justifyContent:'center',
              fontSize:13, fontWeight:800, color: m.completed ? '#27500A' : typeColor,
            }}>
              {m.completed ? '✅' : (m.users?.full_name?.[0] || '?')}
            </div>
          ))}
          {/* Progress */}
          <div style={{ flex:1 }}>
            <div style={{ height:6, background:'#f0f0f0', borderRadius:99, overflow:'hidden' }}>
              <div style={{ height:'100%', width:`${members.length ? (completedCount/members.length)*100 : 0}%`, background: typeColor, borderRadius:99 }} />
            </div>
            <div style={{ fontSize:10, color:'#aaa', marginTop:2 }}>{completedCount}/{members.length} أكمل</div>
          </div>
        </div>

        {/* Challenge/Lesson content */}
        {group.challenges && (
          <div style={{ marginTop:8, background:'#F5E6FF', borderRadius:10, padding:'8px 12px' }}>
            <div style={{ fontSize:12, fontWeight:700, color:'#7B2FBE', marginBottom:2 }}>⚔️ {group.challenges.title_ar}</div>
            <div style={{ fontSize:11, color:'#555' }}>{group.challenges.question_ar}</div>
          </div>
        )}
        {group.lessons && (
          <div style={{ marginTop:8, background:'#DDF4FF', borderRadius:10, padding:'8px 12px' }}>
            <div style={{ fontSize:12, fontWeight:700, color:'#1453A3' }}>📚 {group.lessons.title_ar}</div>
          </div>
        )}
      </div>

      {/* Chat messages */}
      <div style={{ flex:1, overflowY:'auto', padding:'12px 16px', display:'flex', flexDirection:'column', gap:8 }}>
        {/* Welcome message */}
        <div style={{ textAlign:'center', marginBottom:8 }}>
          <span style={{ background:'#f0f0f0', borderRadius:99, padding:'4px 14px', fontSize:11, color:'#aaa' }}>
            📿 مجتمع التعلم — {group.name_ar}
          </span>
        </div>

        {messages.map((msg: any, i: number) => {
          const isMe = msg.user_id === user?.id
          const isSystem = msg.message_ar.startsWith('🎉') || msg.message_ar.startsWith('✅')
          if (isSystem) return (
            <div key={i} style={{ textAlign:'center' }}>
              <span style={{ background:'#D7FFB8', borderRadius:99, padding:'5px 14px', fontSize:12, color:'#27500A', fontWeight:600 }}>{msg.message_ar}</span>
            </div>
          )
          return (
            <div key={i} style={{ display:'flex', flexDirection: isMe ? 'row-reverse' : 'row', gap:8, alignItems:'flex-end' }}>
              <div style={{ width:28, height:28, borderRadius:8, background:'#f0f0f0', display:'flex', alignItems:'center', justifyContent:'center', fontSize:12, fontWeight:800, flexShrink:0 }}>
                {msg.users?.full_name?.[0] || '?'}
              </div>
              <div style={{ maxWidth:'70%' }}>
                {!isMe && <div style={{ fontSize:10, color:'#aaa', marginBottom:3 }}>{msg.users?.full_name || msg.users?.username}</div>}
                <div style={{
                  background: isMe ? '#1CB0F6' : '#fff',
                  color: isMe ? '#fff' : '#333',
                  borderRadius: isMe ? '12px 12px 4px 12px' : '12px 12px 12px 4px',
                  padding:'8px 12px', fontSize:14, lineHeight:1.5,
                  border: isMe ? 'none' : '2px solid #f0f0f0',
                }}>
                  {msg.message_ar}
                </div>
                <div style={{ fontSize:10, color:'#bbb', marginTop:2, textAlign: isMe ? 'left' : 'right' }}>
                  {new Date(msg.created_at).toLocaleTimeString('ar-EG', { hour:'2-digit', minute:'2-digit' })}
                </div>
              </div>
            </div>
          )
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Complete button (if not done) */}
      {myMembership && !myMembership.completed && !allCompleted && (
        <div style={{ padding:'8px 16px', background:'#fff', borderTop:'2px solid #f0f0f0', flexShrink:0 }}>
          <button onClick={markComplete} disabled={completing} style={{
            width:'100%', padding:'12px', borderRadius:12, border:'none',
            background: completing ? '#aaa' : typeColor,
            color:'#fff', fontWeight:800, fontSize:14, cursor: completing ? 'not-allowed' : 'pointer',
          }}>
            {completing ? '⏳ جاري التسجيل...' : '✅ أكملت التحدي/الدرس!'}
          </button>
        </div>
      )}

      {allCompleted && (
        <div style={{ padding:'10px 16px', background:'#D7FFB8', borderTop:'2px solid #58CC02', textAlign:'center', flexShrink:0 }}>
          <span style={{ fontSize:14, fontWeight:800, color:'#27500A' }}>🎉 أكمل الجميع! كل عضو حصل على {group.group_xp_reward} XP</span>
        </div>
      )}

      {/* Message input */}
      <div style={{ padding:'10px 16px 24px', background:'#fff', borderTop:'2px solid #f0f0f0', display:'flex', gap:8, flexShrink:0 }}>
        <input
          value={newMsg} onChange={e => setNewMsg(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && sendMessage()}
          placeholder="اكتب رسالة..."
          style={{ flex:1, padding:'10px 14px', borderRadius:24, border:'2px solid #f0f0f0', fontSize:14, outline:'none', background:'#f7f7f7' }}
        />
        <button onClick={sendMessage} disabled={!newMsg.trim()} style={{
          width:42, height:42, borderRadius:'50%', border:'none',
          background: newMsg.trim() ? '#1CB0F6' : '#f0f0f0',
          color: newMsg.trim() ? '#fff' : '#aaa',
          cursor: newMsg.trim() ? 'pointer' : 'not-allowed',
          fontSize:18, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0,
        }}>
          ←
        </button>
      </div>
    </div>
  )
}
