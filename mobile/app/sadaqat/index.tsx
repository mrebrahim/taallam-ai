import { useEffect, useState } from 'react'
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Modal, TextInput, Alert, ActivityIndicator } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'
import { Colors } from '@/constants/Colors'

export default function SadaqatScreen() {
  const { user } = useAuth()
  const [groups, setGroups] = useState<any[]>([])
  const [myGroups, setMyGroups] = useState<Set<string>>(new Set())
  const [challenges, setChallenges] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'browse'|'mine'>('browse')
  const [showCreate, setShowCreate] = useState(false)
  const [form, setForm] = useState({ name_ar: '', description_ar: '', group_type: 'challenge', challenge_id: '', max_members: 4, group_xp_reward: 100 })
  const [creating, setCreating] = useState(false)

  const load = async () => {
    if (!user) return
    const [{ data: g }, { data: ch }] = await Promise.all([
      supabase.from('study_groups')
        .select(`*, creator:users!creator_id(full_name, username), study_group_members(user_id, completed, users(full_name)), challenges(title_ar)`)
        .eq('is_active', true).order('created_at', { ascending: false }),
      supabase.from('challenges').select('id, title_ar').eq('is_active', true),
    ])
    setGroups(g || [])
    setChallenges(ch || [])
    const mine = new Set((g || []).filter((grp: any) => grp.study_group_members?.some((m: any) => m.user_id === user.id)).map((grp: any) => grp.id))
    setMyGroups(mine as Set<string>)
    setLoading(false)
  }

  useEffect(() => { load() }, [user])

  const join = async (groupId: string) => {
    if (!user) return
    const { error } = await supabase.from('study_group_members').insert({ group_id: groupId, user_id: user.id, role: 'member' })
    if (!error) { setMyGroups(prev => new Set([...prev, groupId])); load() }
    else Alert.alert('خطأ', error.message)
  }

  const leave = async (groupId: string) => {
    if (!user) return
    await supabase.from('study_group_members').delete().eq('group_id', groupId).eq('user_id', user.id)
    setMyGroups(prev => { const n = new Set(prev); n.delete(groupId); return n })
  }

  const create = async () => {
    if (!form.name_ar || !user) return
    setCreating(true)
    const payload: any = { name_ar: form.name_ar, description_ar: form.description_ar || null, group_type: form.group_type, creator_id: user.id, max_members: form.max_members, group_xp_reward: form.group_xp_reward }
    if (form.challenge_id) payload.challenge_id = form.challenge_id
    const { data, error } = await supabase.from('study_groups').insert(payload).select().single()
    if (!error && data) {
      await supabase.from('study_group_members').insert({ group_id: data.id, user_id: user.id, role: 'creator' })
      setShowCreate(false)
      setForm({ name_ar: '', description_ar: '', group_type: 'challenge', challenge_id: '', max_members: 4, group_xp_reward: 100 })
      load()
    }
    setCreating(false)
  }

  if (loading) return (
    <SafeAreaView style={s.container} edges={['top']}>
      <View style={s.center}><ActivityIndicator color={Colors.orange} size="large" /></View>
    </SafeAreaView>
  )

  const filtered = tab === 'mine'
    ? groups.filter(g => myGroups.has(g.id))
    : groups.filter(g => !myGroups.has(g.id) && (g.study_group_members?.length || 0) < g.max_members)

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()}><Text style={s.back}>←</Text></TouchableOpacity>
        <Text style={s.title}>📿 صدقة العلم</Text>
        <TouchableOpacity style={s.addBtn} onPress={() => setShowCreate(true)}>
          <Text style={s.addBtnText}>+ مجموعة</Text>
        </TouchableOpacity>
      </View>

      {/* Tabs */}
      <View style={s.tabs}>
        {(['browse','mine'] as const).map((t, i) => (
          <TouchableOpacity key={t} style={[s.tab, tab===t && s.tabActive]} onPress={() => setTab(t)}>
            <Text style={[s.tabText, tab===t && s.tabTextActive]}>{['اكتشف','مجموعاتي'][i]}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        {filtered.length === 0 && (
          <View style={s.empty}>
            <Text style={{ fontSize: 48, marginBottom: 12 }}>📿</Text>
            <Text style={s.emptyText}>{tab === 'mine' ? 'لم تنضم لأي مجموعة بعد' : 'لا توجد مجموعات متاحة'}</Text>
            <TouchableOpacity style={s.createBtn} onPress={() => setShowCreate(true)}>
              <Text style={s.createBtnText}>+ أنشئ مجموعة</Text>
            </TouchableOpacity>
          </View>
        )}

        {filtered.map(grp => {
          const members = grp.study_group_members || []
          const isMember = myGroups.has(grp.id)
          const isFull = members.length >= grp.max_members
          const color = grp.group_type === 'challenge' ? Colors.purple : grp.group_type === 'lesson_study' ? Colors.blue : Colors.green
          const typeLabel = grp.group_type === 'challenge' ? '⚔️ تحدي' : grp.group_type === 'lesson_study' ? '📚 دراسة' : '💬 نقاش'

          return (
            <View key={grp.id} style={[s.card, isMember && { borderColor: color }]}>
              <View style={s.cardTop}>
                <Text style={s.cardTitle}>{grp.name_ar}</Text>
                <View style={[s.typeBadge, { backgroundColor: color + '20' }]}>
                  <Text style={[s.typeText, { color }]}>{typeLabel}</Text>
                </View>
              </View>
              {grp.description_ar && <Text style={s.cardDesc}>{grp.description_ar}</Text>}
              {grp.challenges?.title_ar && <Text style={s.cardChallenge}>⚔️ {grp.challenges.title_ar}</Text>}

              <View style={s.cardFooter}>
                <Text style={s.membersText}>{members.length}/{grp.max_members} أعضاء</Text>
                <Text style={s.xpText}>⚡ {grp.group_xp_reward} XP</Text>
              </View>

              {isMember ? (
                <View style={s.cardBtns}>
                  <TouchableOpacity style={[s.enterBtn, { backgroundColor: color }]}
                    onPress={() => router.push(`/sadaqat/${grp.id}` as any)}>
                    <Text style={s.enterBtnText}>دخول المجموعة 🚀</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={s.leaveBtn} onPress={() => leave(grp.id)}>
                    <Text style={s.leaveBtnText}>خروج</Text>
                  </TouchableOpacity>
                </View>
              ) : isFull ? (
                <View style={s.fullBadge}><Text style={s.fullText}>المجموعة ممتلئة</Text></View>
              ) : (
                <TouchableOpacity style={[s.joinBtn]} onPress={() => join(grp.id)}>
                  <Text style={s.joinBtnText}>انضم للمجموعة 👥</Text>
                </TouchableOpacity>
              )}
            </View>
          )
        })}
      </ScrollView>

      {/* Create Modal */}
      <Modal visible={showCreate} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={{ flex: 1, backgroundColor: '#f7f7f7' }}>
          <View style={s.modalHeader}>
            <TouchableOpacity onPress={() => setShowCreate(false)}><Text style={{ color: Colors.blue, fontWeight: '700' }}>إغلاق</Text></TouchableOpacity>
            <Text style={s.modalTitle}>مجموعة جديدة 📿</Text>
          </View>
          <ScrollView contentContainerStyle={{ padding: 16, gap: 14 }}>
            <TextInput style={s.input} placeholder="اسم المجموعة *" placeholderTextColor="#aaa" textAlign="right" value={form.name_ar} onChangeText={t => setForm(f => ({...f, name_ar: t}))} />
            <TextInput style={[s.input, { height: 70 }]} placeholder="وصف (اختياري)" placeholderTextColor="#aaa" textAlign="right" multiline value={form.description_ar} onChangeText={t => setForm(f => ({...f, description_ar: t}))} />

            <Text style={s.label}>نوع المجموعة</Text>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {[['challenge','⚔️ تحدي'],['lesson_study','📚 دراسة'],['free','💬 نقاش']].map(([k,l]) => (
                <TouchableOpacity key={k} style={[s.typeBtn, form.group_type===k && { backgroundColor: '#DDF4FF', borderColor: Colors.blue }]} onPress={() => setForm(f => ({...f, group_type: k}))}>
                  <Text style={{ fontSize: 11, color: form.group_type===k ? Colors.blue : '#666', fontWeight: '700' }}>{l}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {form.group_type === 'challenge' && challenges.length > 0 && (
              <View>
                <Text style={s.label}>اختر التحدي</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ gap: 8 }}>
                  {challenges.map(c => (
                    <TouchableOpacity key={c.id} style={[s.chBtn, form.challenge_id===c.id && { backgroundColor: '#DDF4FF', borderColor: Colors.blue }]} onPress={() => setForm(f => ({...f, challenge_id: c.id}))}>
                      <Text style={{ fontSize: 11, color: form.challenge_id===c.id ? Colors.blue : '#666' }}>{c.title_ar.slice(0, 20)}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}

            <View style={{ flexDirection: 'row', gap: 10 }}>
              <View style={{ flex: 1 }}>
                <Text style={s.label}>عدد الأعضاء</Text>
                <View style={{ flexDirection: 'row', gap: 6 }}>
                  {[2,3,4,5].map(n => (
                    <TouchableOpacity key={n} style={[s.numBtn, form.max_members===n && { backgroundColor: '#D7FFB8', borderColor: Colors.green }]} onPress={() => setForm(f => ({...f, max_members: n}))}>
                      <Text style={{ fontWeight: '800', color: form.max_members===n ? '#27500A' : '#666' }}>{n}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.label}>XP الجائزة</Text>
                <TextInput style={s.input} keyboardType="numeric" textAlign="center" value={String(form.group_xp_reward)} onChangeText={t => setForm(f => ({...f, group_xp_reward: Number(t)||100}))} />
              </View>
            </View>

            <TouchableOpacity style={[s.createBtn, { marginTop: 8 }]} disabled={creating || !form.name_ar} onPress={create}>
              <Text style={s.createBtnText}>{creating ? '⏳ جاري الإنشاء...' : '📿 إنشاء المجموعة'}</Text>
            </TouchableOpacity>
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', padding: 16, paddingBottom: 8, gap: 10 },
  back: { fontSize: 22, color: Colors.blue, fontWeight: '700', marginLeft: 4 },
  title: { flex: 1, fontSize: 20, fontWeight: '900', color: Colors.text, textAlign: 'center' },
  addBtn: { backgroundColor: Colors.green, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 7 },
  addBtnText: { color: '#fff', fontWeight: '800', fontSize: 13 },
  tabs: { flexDirection: 'row', marginHorizontal: 16, backgroundColor: '#e8e8e8', borderRadius: 12, padding: 3, marginBottom: 8 },
  tab: { flex: 1, paddingVertical: 8, borderRadius: 10, alignItems: 'center' },
  tabActive: { backgroundColor: '#fff' },
  tabText: { fontSize: 13, color: '#aaa' },
  tabTextActive: { fontWeight: '800', color: Colors.blue },
  scroll: { padding: 16 },
  empty: { alignItems: 'center', paddingVertical: 40 },
  emptyText: { fontSize: 16, fontWeight: '700', color: Colors.textSub, marginBottom: 16 },
  card: { backgroundColor: '#fff', borderRadius: 16, padding: 14, marginBottom: 12, borderWidth: 2, borderColor: Colors.border },
  cardTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  cardTitle: { fontSize: 15, fontWeight: '800', color: Colors.text, flex: 1, textAlign: 'right' },
  typeBadge: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  typeText: { fontSize: 11, fontWeight: '700' },
  cardDesc: { fontSize: 13, color: Colors.textSub, marginBottom: 8, textAlign: 'right' },
  cardChallenge: { fontSize: 12, color: Colors.purple, marginBottom: 8, textAlign: 'right' },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  membersText: { fontSize: 12, color: Colors.textSub },
  xpText: { fontSize: 12, fontWeight: '700', color: Colors.orange },
  cardBtns: { flexDirection: 'row', gap: 8 },
  enterBtn: { flex: 1, borderRadius: 12, padding: 12, alignItems: 'center' },
  enterBtnText: { color: '#fff', fontWeight: '800', fontSize: 14 },
  leaveBtn: { borderRadius: 12, padding: 12, borderWidth: 1, borderColor: '#ddd', paddingHorizontal: 16 },
  leaveBtnText: { color: '#aaa', fontSize: 13 },
  fullBadge: { backgroundColor: '#f7f7f7', borderRadius: 10, padding: 10, alignItems: 'center' },
  fullText: { color: '#aaa', fontWeight: '700' },
  joinBtn: { backgroundColor: Colors.blue, borderRadius: 12, padding: 12, alignItems: 'center' },
  joinBtnText: { color: '#fff', fontWeight: '800', fontSize: 14 },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, backgroundColor: '#fff', borderBottomWidth: 2, borderBottomColor: Colors.border },
  modalTitle: { fontSize: 17, fontWeight: '900', color: Colors.text },
  input: { backgroundColor: '#fff', borderRadius: 12, padding: 14, fontSize: 14, color: Colors.text, borderWidth: 2, borderColor: Colors.border },
  label: { fontSize: 13, color: Colors.textSub, fontWeight: '600', textAlign: 'right', marginBottom: 6 },
  typeBtn: { flex: 1, borderRadius: 10, padding: 10, borderWidth: 2, borderColor: Colors.border, alignItems: 'center' },
  chBtn: { borderRadius: 8, padding: 8, borderWidth: 2, borderColor: Colors.border, marginLeft: 8 },
  numBtn: { flex: 1, borderRadius: 8, padding: 10, borderWidth: 2, borderColor: Colors.border, alignItems: 'center' },
  createBtn: { backgroundColor: Colors.green, borderRadius: 14, padding: 15, alignItems: 'center', shadowColor: Colors.green, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 6 },
  createBtnText: { color: '#fff', fontWeight: '900', fontSize: 15 },
})
