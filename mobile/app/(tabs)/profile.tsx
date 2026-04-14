import { useEffect, useState } from 'react'
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'
import { Colors } from '@/constants/Colors'

const LEVELS = [
  { level:1, name:'مبتدئ',    xp:0,    color:'#94a3b8' },
  { level:2, name:'متعلم',    xp:100,  color:Colors.green },
  { level:3, name:'محترف',    xp:400,  color:Colors.blue },
  { level:4, name:'خبير',     xp:900,  color:Colors.orange },
  { level:5, name:'أسطورة',   xp:1600, color:Colors.purple },
  { level:6, name:'نخبة',     xp:2500, color:'#FFD700' },
]

function getLvl(xp: number) {
  let cur = LEVELS[0], nxt = LEVELS[1]
  for (let i = 0; i < LEVELS.length; i++) {
    if (xp >= LEVELS[i].xp) { cur = LEVELS[i]; nxt = LEVELS[i+1] || LEVELS[i] }
  }
  const prog = nxt.xp > cur.xp ? Math.min(100, Math.round(((xp - cur.xp) / (nxt.xp - cur.xp)) * 100)) : 100
  return { cur, nxt, prog, toNext: Math.max(0, nxt.xp - xp) }
}

export default function ProfileScreen() {
  const { user } = useAuth()
  const [stats, setStats] = useState({ completed_challenges: 0, completed_lessons: 0, groups: 0 })

  useEffect(() => {
    if (!user) return
    const load = async () => {
      const [{ count: challenges }, { count: lessons }, { count: groups }] = await Promise.all([
        supabase.from('user_challenge_attempts').select('*', { count: 'exact', head: true }).eq('user_id', user.id).eq('is_correct', true),
        supabase.from('user_lesson_progress').select('*', { count: 'exact', head: true }).eq('user_id', user.id).eq('completed', true),
        supabase.from('study_group_members').select('*', { count: 'exact', head: true }).eq('user_id', user.id),
      ])
      setStats({ completed_challenges: challenges || 0, completed_lessons: lessons || 0, groups: groups || 0 })
    }
    load()
  }, [user])

  const logout = async () => {
    Alert.alert('تسجيل الخروج', 'هل أنت متأكد؟', [
      { text: 'إلغاء', style: 'cancel' },
      { text: 'خروج', style: 'destructive', onPress: async () => {
        await supabase.auth.signOut()
        router.replace('/(auth)/login')
      }}
    ])
  }

  if (!user) return null

  const lvl = getLvl(user.xp_total || 0)

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

        {/* Header */}
        <View style={s.header}>
          <Text style={s.headerTitle}>👤 ملفي الشخصي</Text>
        </View>

        {/* Avatar + Name */}
        <View style={s.profileCard}>
          <View style={[s.avatar, { backgroundColor: lvl.cur.color + '20', borderColor: lvl.cur.color }]}>
            <Text style={{ fontSize: 36 }}>🤖</Text>
          </View>
          <Text style={s.name}>{user.full_name || user.username || 'مستخدم'}</Text>
          <Text style={s.email}>{user.email}</Text>
          <View style={[s.levelBadge, { backgroundColor: lvl.cur.color + '20' }]}>
            <Text style={[s.levelText, { color: lvl.cur.color }]}>{lvl.cur.name} · المستوى {user.current_level || 1}</Text>
          </View>
        </View>

        {/* XP Progress */}
        <View style={s.card}>
          <View style={s.cardRow}>
            <Text style={s.cardLabel}>إجمالي XP</Text>
            <Text style={[s.cardValue, { color: lvl.cur.color }]}>{(user.xp_total || 0).toLocaleString()}</Text>
          </View>
          <View style={s.bar}>
            <View style={[s.barFill, { width: `${lvl.prog}%`, backgroundColor: lvl.cur.color }]} />
          </View>
          <Text style={s.barLabel}>{lvl.toNext.toLocaleString()} XP للوصول لـ {lvl.nxt.name}</Text>
        </View>

        {/* Stats Grid */}
        <View style={s.grid}>
          {[
            { label: '🔥 Streak', val: `${user.streak_current || 0} يوم` },
            { label: '💎 عملات', val: (user.coins_balance || 0).toLocaleString() },
            { label: '⚔️ تحديات', val: stats.completed_challenges },
            { label: '📚 دروس', val: stats.completed_lessons },
            { label: '📿 مجموعات', val: stats.groups },
            { label: '🏆 ترتيب', val: '#—' },
          ].map((item, i) => (
            <View key={i} style={s.statBox}>
              <Text style={s.statVal}>{item.val}</Text>
              <Text style={s.statLabel}>{item.label}</Text>
            </View>
          ))}
        </View>

        {/* Quick links */}
        <View style={s.card}>
          {[
            { icon:'📿', label:'صدقة العلم', onPress:() => router.push('/sadaqat' as any) },
            { icon:'🏆', label:'لوحة الترتيب', onPress:() => router.push('/(tabs)/leaderboard' as any) },
          ].map((item, i) => (
            <TouchableOpacity key={i} style={[s.link, i>0 && { borderTopWidth: 1, borderTopColor: Colors.border }]}
              onPress={item.onPress}>
              <Text style={{ fontSize: 20 }}>{item.icon}</Text>
              <Text style={s.linkText}>{item.label}</Text>
              <Text style={{ color: '#ddd', fontSize: 16 }}>←</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Logout */}
        <TouchableOpacity style={s.logoutBtn} onPress={logout}>
          <Text style={s.logoutText}>تسجيل الخروج</Text>
        </TouchableOpacity>

      </ScrollView>
    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  scroll: { padding: 16, paddingBottom: 32 },
  header: { marginBottom: 16 },
  headerTitle: { fontSize: 22, fontWeight: '900', color: Colors.text, textAlign: 'right' },
  profileCard: { backgroundColor: '#fff', borderRadius: 20, padding: 20, alignItems: 'center', marginBottom: 12, borderWidth: 2, borderColor: Colors.border },
  avatar: { width: 80, height: 80, borderRadius: 24, justifyContent: 'center', alignItems: 'center', borderWidth: 3, marginBottom: 10 },
  name: { fontSize: 20, fontWeight: '900', color: Colors.text, marginBottom: 4 },
  email: { fontSize: 13, color: Colors.textSub, marginBottom: 10 },
  levelBadge: { borderRadius: 99, paddingHorizontal: 14, paddingVertical: 5 },
  levelText: { fontSize: 13, fontWeight: '700' },
  card: { backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 2, borderColor: Colors.border },
  cardRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  cardLabel: { fontSize: 13, color: Colors.textSub, fontWeight: '600' },
  cardValue: { fontSize: 18, fontWeight: '900' },
  bar: { height: 12, backgroundColor: '#f0f0f0', borderRadius: 99, overflow: 'hidden', marginBottom: 6 },
  barFill: { height: '100%', borderRadius: 99 },
  barLabel: { fontSize: 11, color: Colors.textSub, textAlign: 'right' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 12 },
  statBox: { backgroundColor: '#fff', borderRadius: 14, padding: 14, width: '31%', alignItems: 'center', borderWidth: 2, borderColor: Colors.border },
  statVal: { fontSize: 18, fontWeight: '900', color: Colors.text, marginBottom: 4 },
  statLabel: { fontSize: 10, color: Colors.textSub, textAlign: 'center' },
  link: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 },
  linkText: { flex: 1, fontSize: 15, fontWeight: '700', color: Colors.text, textAlign: 'right' },
  logoutBtn: { backgroundColor: '#FFE5E5', borderRadius: 14, padding: 16, alignItems: 'center', borderWidth: 2, borderColor: '#ffcdd2', marginTop: 8 },
  logoutText: { fontSize: 15, fontWeight: '800', color: Colors.red },
})
