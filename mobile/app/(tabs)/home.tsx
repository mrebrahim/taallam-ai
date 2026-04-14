import { useEffect, useState } from 'react'
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native'
import { router } from 'expo-router'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'
import { Colors, ROADMAP_META } from '@/constants/Colors'
import { getLang } from '@/lib/i18n'
import { SafeAreaView } from 'react-native-safe-area-context'

const QUOTES = ['هتبقى محترف قريباً! 🚀','كل يوم خطوة للأمام! 💪','إنت بتعمل حاجة عظيمة! ⭐','لا تكسر الـ streak! 🔥']

export default function HomeScreen() {
  const { user, loading } = useAuth()
  const lang = getLang()
  const isAr = lang === 'ar'
  const [roadmaps, setRoadmaps] = useState<any[]>([])
  const [enrollments, setEnrollments] = useState<Set<string>>(new Set())
  const [progress, setProgress] = useState<Record<string, any>>({})
  const [quote] = useState(() => QUOTES[Math.floor(Math.random() * QUOTES.length)])

  useEffect(() => {
    if (!user) return
    const load = async () => {
      const [{ data: rm }, { data: en }, { data: pr }] = await Promise.all([
        supabase.from('roadmaps').select('*').order('sort_order'),
        supabase.from('course_enrollments').select('roadmap_id').eq('user_id', user.id).eq('is_active', true),
        supabase.from('user_roadmap_progress').select('*').eq('user_id', user.id),
      ])
      setRoadmaps(rm || [])
      setEnrollments(new Set(en?.map((e: any) => e.roadmap_id) || []))
      if (pr) {
        const m: Record<string, any> = {}
        pr.forEach((p: any) => { m[p.roadmap_id] = p })
        setProgress(m)
      }
    }
    load()
  }, [user])

  if (loading || !user) {
    return <View style={styles.loadingContainer}><ActivityIndicator size="large" color={Colors.green} /></View>
  }

  const enrolledRoadmaps = roadmaps.filter(r => enrollments.has(r.id))

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerPills}>
          <TouchableOpacity style={[styles.pill, { backgroundColor: Colors.orangeL }]} onPress={() => router.push('/(tabs)/profile')}>
            <Text style={[styles.pillText, { color: '#A56644' }]}>🔥 {user.streak_current}</Text>
          </TouchableOpacity>
          <View style={[styles.pill, { backgroundColor: Colors.blueL }]}>
            <Text style={[styles.pillText, { color: '#1453A3' }]}>💎 {user.coins_balance.toLocaleString()}</Text>
          </View>
        </View>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{user.current_level}</Text>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        {/* Greeting */}
        <View style={styles.greeting}>
          <Text style={styles.greetingSub}>أهلاً، {user.full_name?.split(' ')[0] || user.username}!</Text>
          <Text style={styles.greetingMain}>{quote}</Text>
        </View>

        {/* XP Card */}
        <View style={styles.xpCard}>
          <View style={styles.xpTop}>
            <View style={[styles.levelBadge, { backgroundColor: Colors.blue }]}>
              <Text style={styles.levelText}>{user.current_level}</Text>
            </View>
            <View style={styles.xpInfo}>
              <Text style={styles.xpTitle}>المستوى {user.current_level}</Text>
              <Text style={styles.xpSub}>استمر في التعلم للوصول للمستوى التالي</Text>
            </View>
            <Text style={[styles.xpAmount, { color: Colors.blue }]}>{user.xp_total.toLocaleString()} XP</Text>
          </View>
          <View style={styles.xpBarBg}>
            <View style={[styles.xpBarFill, { width: '45%' }]} />
          </View>
        </View>

        {/* Continue Learning */}
        {enrolledRoadmaps.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>كمّل من حيث وقفت</Text>
            {enrolledRoadmaps.map(r => {
              const meta = ROADMAP_META[r.slug as keyof typeof ROADMAP_META]
              const prog = progress[r.id]
              if (!meta) return null
              const pct = r.total_xp > 0 && prog ? Math.min(100, Math.round((prog.total_xp_earned / r.total_xp) * 100)) : 0
              return (
                <TouchableOpacity key={r.id} style={styles.roadmapCard} onPress={() => router.push({ pathname: '/(tabs)/learn', params: { roadmap: r.slug } })} activeOpacity={0.8}>
                  <View style={[styles.roadmapIcon, { backgroundColor: meta.bg }]}>
                    <Text style={{ fontSize: 28 }}>{meta.emoji}</Text>
                  </View>
                  <View style={styles.roadmapInfo}>
                    <Text style={styles.roadmapLabel}>{meta.label}</Text>
                    <View style={styles.progressBg}>
                      <View style={[styles.progressFill, { width: `${pct}%` as any, backgroundColor: meta.color }]} />
                    </View>
                  </View>
                  <Text style={[styles.roadmapPct, { color: meta.color }]}>{pct}%</Text>
                </TouchableOpacity>
              )
            })}
          </View>
        )}

        {/* All Paths */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{enrolledRoadmaps.length === 0 ? '🚀 ابدأ رحلتك' : 'كل المسارات'}</Text>
          {Object.entries(ROADMAP_META).map(([slug, meta]) => {
            const roadmap = roadmaps.find(r => r.slug === slug)
            const isEnrolled = roadmap && enrollments.has(roadmap.id)
            return (
              <TouchableOpacity key={slug} style={[styles.pathCard, isEnrolled && { borderColor: meta.color + '40' }]}
                onPress={() => router.push({ pathname: '/(tabs)/learn', params: { roadmap: slug } })} activeOpacity={0.8}>
                <View style={[styles.pathAccent, { backgroundColor: meta.color }]} />
                <View style={[styles.pathIcon, { backgroundColor: meta.bg }]}>
                  <Text style={{ fontSize: 24 }}>{meta.emoji}</Text>
                </View>
                <View style={styles.pathInfo}>
                  <View style={styles.pathRow}>
                    <Text style={styles.pathLabel}>{meta.label}</Text>
                    {isEnrolled && <View style={[styles.enrolledBadge, { backgroundColor: meta.bg }]}>
                      <Text style={[styles.enrolledText, { color: meta.color }]}>مسجّل</Text>
                    </View>}
                  </View>
                  <Text style={styles.pathDesc}>{meta.desc}</Text>
                </View>
                <Text style={styles.arrow}>←</Text>
              </TouchableOpacity>
            )
          })}
        </View>

        {/* Upgrade Banner */}
        {user.subscription_plan === 'free' && (
          <TouchableOpacity style={styles.upgradeBanner} activeOpacity={0.9}>
            <Text style={{ fontSize: 32 }}>👑</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.upgradeTitle}>ترقّى لـ Pro</Text>
              <Text style={styles.upgradeSub}>XP مضاعف + دروس غير محدودة</Text>
            </View>
            <View style={styles.upgradeBtn}><Text style={styles.upgradeBtnText}>ابدأ</Text></View>
          </TouchableOpacity>
        )}

        <View style={{ height: 20 }} />
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.bg },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#fff', borderBottomWidth: 2, borderBottomColor: Colors.border },
  headerPills: { flexDirection: 'row', gap: 8 },
  pill: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 6, borderRadius: 99 },
  pillText: { fontSize: 15, fontWeight: '800' },
  avatar: { width: 42, height: 42, borderRadius: 14, backgroundColor: Colors.blue, justifyContent: 'center', alignItems: 'center' },
  avatarText: { color: '#fff', fontSize: 16, fontWeight: '900' },
  scroll: { padding: 16 },
  greeting: { marginBottom: 20 },
  greetingSub: { fontSize: 14, color: Colors.textSub, marginBottom: 4, textAlign: 'right' },
  greetingMain: { fontSize: 22, fontWeight: '900', color: Colors.text, textAlign: 'right', lineHeight: 30 },
  xpCard: { backgroundColor: '#fff', borderRadius: 20, padding: 18, marginBottom: 16, borderWidth: 2, borderColor: Colors.border, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 3 },
  xpTop: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  levelBadge: { width: 48, height: 48, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  levelText: { color: '#fff', fontSize: 22, fontWeight: '900' },
  xpInfo: { flex: 1 },
  xpTitle: { fontSize: 16, fontWeight: '800', color: Colors.text, textAlign: 'right' },
  xpSub: { fontSize: 12, color: Colors.textSub, textAlign: 'right' },
  xpAmount: { fontSize: 15, fontWeight: '800' },
  xpBarBg: { height: 12, backgroundColor: '#f0f0f0', borderRadius: 99, overflow: 'hidden' },
  xpBarFill: { height: '100%', backgroundColor: Colors.blue, borderRadius: 99 },
  section: { marginBottom: 20 },
  sectionTitle: { fontSize: 17, fontWeight: '800', color: Colors.text, textAlign: 'right', marginBottom: 10 },
  roadmapCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 20, padding: 14, marginBottom: 10, borderWidth: 2, borderColor: Colors.border, gap: 14 },
  roadmapIcon: { width: 52, height: 52, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  roadmapInfo: { flex: 1 },
  roadmapLabel: { fontSize: 15, fontWeight: '800', color: Colors.text, textAlign: 'right', marginBottom: 8 },
  progressBg: { height: 10, backgroundColor: '#f0f0f0', borderRadius: 99, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 99 },
  roadmapPct: { fontSize: 14, fontWeight: '800' },
  pathCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 20, padding: 14, marginBottom: 10, borderWidth: 2, borderColor: Colors.border, gap: 14, position: 'relative', overflow: 'hidden' },
  pathAccent: { position: 'absolute', right: 0, top: 0, bottom: 0, width: 4 },
  pathIcon: { width: 52, height: 52, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  pathInfo: { flex: 1 },
  pathRow: { flexDirection: 'row', alignItems: 'center', gap: 8, justifyContent: 'flex-end', marginBottom: 4 },
  pathLabel: { fontSize: 15, fontWeight: '800', color: Colors.text },
  enrolledBadge: { borderRadius: 99, paddingHorizontal: 8, paddingVertical: 2 },
  enrolledText: { fontSize: 10, fontWeight: '800' },
  pathDesc: { fontSize: 12, color: Colors.textSub, textAlign: 'right' },
  arrow: { fontSize: 18, color: '#ddd' },
  upgradeBanner: { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: Colors.blue, borderRadius: 20, padding: 18, shadowColor: Colors.blue, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.3, shadowRadius: 16, elevation: 8 },
  upgradeTitle: { color: '#fff', fontWeight: '900', fontSize: 17, textAlign: 'right' },
  upgradeSub: { color: 'rgba(255,255,255,0.85)', fontSize: 13, textAlign: 'right' },
  upgradeBtn: { backgroundColor: '#fff', borderRadius: 12, paddingHorizontal: 18, paddingVertical: 10 },
  upgradeBtnText: { color: Colors.blue, fontWeight: '900', fontSize: 13 },
})
