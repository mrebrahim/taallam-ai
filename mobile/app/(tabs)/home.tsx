import { useEffect, useRef, useState } from 'react'
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  ActivityIndicator, Animated, Easing,
} from 'react-native'
import { router } from 'expo-router'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'
import { Colors, ROADMAP_META } from '@/constants/Colors'
import { useLang } from '@/lib/LanguageContext'
import { SafeAreaView } from 'react-native-safe-area-context'

// ─── XP Levels ────────────────────────────────────────────────
const LEVELS = [
  { level:1, name:'مبتدئ',   nameEn:'Beginner',   xp:0,    color:'#94a3b8' },
  { level:2, name:'متعلم',   nameEn:'Learner',    xp:100,  color:Colors.green  },
  { level:3, name:'محترف',   nameEn:'Pro',        xp:400,  color:Colors.blue   },
  { level:4, name:'خبير',    nameEn:'Expert',     xp:900,  color:Colors.orange },
  { level:5, name:'أسطورة',  nameEn:'Legend',     xp:1600, color:Colors.purple },
  { level:6, name:'نخبة 🔥', nameEn:'Elite 🔥',  xp:2500, color:'#FFD700'    },
]
function getLvl(xp: number) {
  let cur = LEVELS[0], nxt = LEVELS[1]
  for (let i = 0; i < LEVELS.length - 1; i++) {
    if (xp >= LEVELS[i].xp) { cur = LEVELS[i]; nxt = LEVELS[i+1] || LEVELS[i] }
  }
  const prog = nxt.xp > cur.xp ? Math.min(100, Math.round(((xp - cur.xp) / (nxt.xp - cur.xp)) * 100)) : 100
  const toNext = Math.max(0, nxt.xp - xp)
  return { cur, nxt, prog, toNext }
}

// ─── Nar Messages (streak-based) ──────────────────────────────
function getNarMessage(streak: number, name: string, isAr: boolean): string {
  const n = name?.split(' ')[0] || (isAr ? 'بطل' : 'Champion')
  if (!isAr) {
    if (streak === 0) return `Welcome back ${n}! Start your streak today 🚀`
    if (streak === 1) return `Day 1 ${n}! Every legend starts here 💪`
    if (streak < 3)  return `${streak} days ${n}! You're building a habit 🔥`
    if (streak < 7)  return `${streak} days! You're ahead of 80% of students 💪`
    if (streak < 14) return `${streak} days! One full week — the habit is forming 🎯`
    if (streak < 30) return `${streak} days! You're unstoppable 🚀`
    return `⚠️ ${streak} days! Don't break it now — you've built something real!`
  }
  if (streak === 0) return `أهلاً ${n}! ابدأ streak جديد النهارده 🚀`
  if (streak === 1) return `يوم 1 ${n}! كل legend ابتدت من هنا 💪`
  if (streak < 3)  return `${streak} أيام ${n}! العادة بتتبنى 🔥`
  if (streak < 7)  return `${streak} أيام! إنت أحسن من 80% من الطلاب 💪`
  if (streak < 14) return `${streak} أيام! أسبوع كامل — العادة بتتكون 🎯`
  if (streak < 30) return `${streak} يوم! إنت مش قادر توقف 🚀`
  return `⚠️ ${streak} يوم! إنجاز حقيقي — ماتضيعوش!`
}

// ─── Streak Card Color ─────────────────────────────────────────
function getStreakColor(streak: number) {
  if (streak >= 30) return { bg: '#FF4B4B', border: '#CC0000', text: '#fff', glow: '#FF4B4B' }
  if (streak >= 7)  return { bg: Colors.orange, border: '#CC7700', text: '#fff', glow: Colors.orange }
  return { bg: Colors.green, border: Colors.greenDk, text: '#fff', glow: Colors.green }
}

export default function HomeScreen() {
  const { user, loading } = useAuth()
  const { isAr } = useLang()

  const [roadmaps, setRoadmaps]       = useState<any[]>([])
  const [enrollments, setEnrollments] = useState<Set<string>>(new Set())
  const [progress, setProgress]       = useState<Record<string, any>>({})
  const [todayChallenge, setTodayChallenge] = useState<any>(null)
  const [challengeDone, setChallengeDone]   = useState(false)
  const [freezeCount, setFreezeCount] = useState(0)

  // Animations
  const streakScale   = useRef(new Animated.Value(1)).current
  const xpBarWidth    = useRef(new Animated.Value(0)).current
  const narBounce     = useRef(new Animated.Value(0)).current

  useEffect(() => {
    if (!user) return
    loadData()
    animateEntrance()
  }, [user])

  const animateEntrance = () => {
    // Nar bounce
    Animated.loop(
      Animated.sequence([
        Animated.timing(narBounce, { toValue: -8, duration: 600, useNativeDriver: true, easing: Easing.out(Easing.quad) }),
        Animated.timing(narBounce, { toValue: 0, duration: 600, useNativeDriver: true, easing: Easing.in(Easing.quad) }),
      ])
    ).start()
    // Streak pulse if > 0
    if (user?.streak_current > 0) {
      Animated.sequence([
        Animated.timing(streakScale, { toValue: 1.15, duration: 300, useNativeDriver: true }),
        Animated.timing(streakScale, { toValue: 1, duration: 300, useNativeDriver: true }),
      ]).start()
    }
  }

  const loadData = async () => {
    const [
      { data: rm }, { data: en }, { data: pr },
      { data: dc }, { data: freezes },
    ] = await Promise.all([
      supabase.from('roadmaps').select('*').eq('is_active', true).order('sort_order'),
      supabase.from('course_enrollments').select('roadmap_id').eq('user_id', user!.id).eq('is_active', true),
      supabase.from('user_roadmap_progress').select('*').eq('user_id', user!.id),
      supabase.from('daily_challenge_schedule')
        .select('*, challenge:challenges(*)')
        .eq('scheduled_date', new Date().toISOString().split('T')[0])
        .single(),
      supabase.from('streak_freezes').select('id').eq('user_id', user!.id).is('used_at', null),
    ])

    setRoadmaps(rm || [])
    setEnrollments(new Set(en?.map((e: any) => e.roadmap_id) || []))
    if (pr) {
      const m: Record<string, any> = {}
      pr.forEach((p: any) => { m[p.roadmap_id] = p })
      setProgress(m)
    }
    setTodayChallenge(dc?.challenge || null)
    setFreezeCount(freezes?.length || 0)

    // Check if today's challenge is done
    if (dc?.challenge) {
      const { data: attempt } = await supabase
        .from('user_challenge_attempts')
        .select('is_correct')
        .eq('user_id', user!.id)
        .eq('challenge_id', dc.challenge.id)
        .maybeSingle()
      setChallengeDone(!!attempt?.is_correct)
    }

    // Animate XP bar
    const lvl = getLvl(user!.xp_total || 0)
    Animated.timing(xpBarWidth, {
      toValue: lvl.prog / 100,
      duration: 1000,
      useNativeDriver: false,
      easing: Easing.out(Easing.cubic),
    }).start()
  }

  if (loading || !user) {
    return <View style={s.loading}><ActivityIndicator size="large" color={Colors.green} /></View>
  }

  const lvl            = getLvl(user.xp_total || 0)
  const streak         = user.streak_current || 0
  const streakColors   = getStreakColor(streak)
  const narMsg         = getNarMessage(streak, user.full_name || user.username || '', isAr)
  const enrolledList   = roadmaps.filter(r => enrollments.has(r.id))
  const daysToWeek     = Math.max(0, 7 - (streak % 7))

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      {/* ── Header ── */}
      <View style={s.header}>
        <View style={s.headerLeft}>
          {/* Streak Pill */}
          <Animated.View style={{ transform: [{ scale: streakScale }] }}>
            <TouchableOpacity style={[s.streakPill, { backgroundColor: streakColors.bg, shadowColor: streakColors.glow }]}>
              <Text style={s.streakFire}>🔥</Text>
              <Text style={[s.streakNum, { color: streakColors.text }]}>{streak}</Text>
            </TouchableOpacity>
          </Animated.View>
          {/* Freeze shield */}
          {freezeCount > 0 && (
            <View style={s.shieldPill}>
              <Text style={s.shieldText}>🛡️</Text>
            </View>
          )}
          {/* XP pill */}
          <View style={s.xpPill}>
            <Text style={s.xpPillText}>⚡ {(user.xp_total || 0).toLocaleString()}</Text>
          </View>
        </View>
        {/* Level avatar */}
        <View style={[s.avatar, { backgroundColor: lvl.cur.color }]}>
          <Text style={s.avatarLevel}>{user.current_level || 1}</Text>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scroll}>

        {/* ── Nar Mascot ── */}
        <View style={s.narCard}>
          <Animated.Text style={[s.narEmoji, { transform: [{ translateY: narBounce }] }]}>🤖</Animated.Text>
          <View style={{ flex: 1 }}>
            <Text style={s.narName}>Nar</Text>
            <Text style={s.narMsg}>{narMsg}</Text>
          </View>
        </View>

        {/* ── Streak Card ── */}
        <View style={[s.streakCard, { borderColor: streakColors.border + '60' }]}>
          <View style={s.streakCardTop}>
            <View>
              <Text style={s.streakLabel}>{isAr ? 'Streak الحالي' : 'Current Streak'}</Text>
              <View style={s.streakRow}>
                <Text style={[s.streakBig, { color: streakColors.bg }]}>{streak}</Text>
                <Text style={s.streakDays}>{isAr ? ' يوم 🔥' : ' days 🔥'}</Text>
              </View>
            </View>
            <View style={s.streakRight}>
              {/* Days to next milestone */}
              {streak < 7 && (
                <View style={[s.milestoneBadge, { backgroundColor: Colors.green + '15', borderColor: Colors.green + '40' }]}>
                  <Text style={[s.milestoneText, { color: Colors.green }]}>
                    {daysToWeek === 0
                      ? (isAr ? '🎯 أسبوع!' : '🎯 Week!')
                      : isAr ? `${daysToWeek} للأسبوع` : `${daysToWeek} to week`}
                  </Text>
                </View>
              )}
              {streak >= 7 && streak < 30 && (
                <View style={[s.milestoneBadge, { backgroundColor: Colors.orange + '15', borderColor: Colors.orange + '40' }]}>
                  <Text style={[s.milestoneText, { color: Colors.orange }]}>
                    {isAr ? `${30 - streak} للشهر` : `${30 - streak} to month`}
                  </Text>
                </View>
              )}
              {streak >= 30 && (
                <View style={[s.milestoneBadge, { backgroundColor: '#FF4B4B15', borderColor: '#FF4B4B40' }]}>
                  <Text style={[s.milestoneText, { color: '#FF4B4B' }]}>
                    {isAr ? '🔥 ما شاء الله!' : '🔥 On Fire!'}
                  </Text>
                </View>
              )}
              {freezeCount > 0 && (
                <View style={[s.milestoneBadge, { backgroundColor: '#1CB0F615', borderColor: '#1CB0F640', marginTop: 6 }]}>
                  <Text style={[s.milestoneText, { color: Colors.blue }]}>
                    🛡️ {isAr ? 'لديك freeze' : 'Freeze ready'}
                  </Text>
                </View>
              )}
            </View>
          </View>

          {/* Streak dots (7-day view) */}
          <View style={s.streakDots}>
            {Array.from({ length: 7 }).map((_, i) => {
              const dayNum = i + 1
              const filled = streak >= dayNum
              const today  = dayNum === (streak % 7 === 0 && streak > 0 ? 7 : streak % 7)
              return (
                <View key={i} style={s.streakDotWrap}>
                  <View style={[
                    s.streakDot,
                    filled && { backgroundColor: streakColors.bg },
                    today && { borderWidth: 2, borderColor: streakColors.bg, transform: [{ scale: 1.2 }] },
                  ]}>
                    {filled && <Text style={{ fontSize: 10 }}>🔥</Text>}
                  </View>
                  <Text style={s.streakDotDay}>
                    {isAr ? ['أح','إث','ثل','أر','خم','جم','سب'][i] : ['M','T','W','T','F','S','S'][i]}
                  </Text>
                </View>
              )
            })}
          </View>
        </View>

        {/* ── XP Progress ── */}
        <View style={s.xpCard}>
          <View style={s.xpCardTop}>
            <View style={[s.levelCircle, { backgroundColor: lvl.cur.color }]}>
              <Text style={s.levelCircleText}>{user.current_level || 1}</Text>
            </View>
            <View style={{ flex: 1, marginHorizontal: 12 }}>
              <Text style={s.levelName}>{isAr ? lvl.cur.name : lvl.cur.nameEn}</Text>
              <Text style={s.xpCount}>{(user.xp_total || 0).toLocaleString()} XP</Text>
            </View>
            {lvl.toNext > 0 && (
              <Text style={[s.toNext, { color: lvl.cur.color }]}>
                +{lvl.toNext.toLocaleString()} {isAr ? 'للـ' : 'to'} {isAr ? lvl.nxt.name : lvl.nxt.nameEn}
              </Text>
            )}
          </View>
          <View style={s.xpBarBg}>
            <Animated.View style={[
              s.xpBarFill,
              {
                width: xpBarWidth.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }),
                backgroundColor: lvl.cur.color,
              }
            ]} />
          </View>
          <View style={s.xpBarLabels}>
            <Text style={s.xpBarLabel}>0</Text>
            <Text style={s.xpBarLabel}>{lvl.prog}%</Text>
            <Text style={s.xpBarLabel}>{lvl.nxt.xp.toLocaleString()}</Text>
          </View>
        </View>

        {/* ── Daily Challenge ── */}
        {todayChallenge && (
          <TouchableOpacity
            style={[s.challengeCard, challengeDone && s.challengeDone]}
            onPress={() => !challengeDone && router.push('/(tabs)/challenges' as any)}
            activeOpacity={challengeDone ? 1 : 0.85}>
            <View style={s.challengeLeft}>
              <View style={[s.challengeIcon, { backgroundColor: challengeDone ? Colors.green : Colors.purple }]}>
                <Text style={{ fontSize: 22 }}>{challengeDone ? '✅' : '⚔️'}</Text>
              </View>
              <View>
                <Text style={s.challengeLabel}>{isAr ? '⚡ تحدي اليوم' : '⚡ Daily Challenge'}</Text>
                <Text style={s.challengeTitle} numberOfLines={1}>{todayChallenge.title_ar}</Text>
                <Text style={s.challengeXP}>+{todayChallenge.xp_reward} XP</Text>
              </View>
            </View>
            {challengeDone
              ? <Text style={{ color: Colors.green, fontWeight: '900', fontSize: 13 }}>{isAr ? 'أنجزت! ✅' : 'Done! ✅'}</Text>
              : <View style={s.challengeArrow}><Text style={{ color: '#fff', fontSize: 14 }}>←</Text></View>}
          </TouchableOpacity>
        )}

        {/* ── Continue Learning ── */}
        {enrolledList.length > 0 && (
          <View style={s.section}>
            <Text style={s.sectionTitle}>{isAr ? '📚 كمّل من حيث وقفت' : '📚 Continue Learning'}</Text>
            {enrolledList.map(r => {
              const meta = ROADMAP_META[r.slug as keyof typeof ROADMAP_META]
              const prog = progress[r.id]
              if (!meta) return null
              const pct = r.total_xp > 0 && prog ? Math.min(100, Math.round((prog.total_xp_earned / r.total_xp) * 100)) : 0
              return (
                <TouchableOpacity key={r.id} style={[s.courseCard, { borderColor: meta.color + '30' }]}
                  onPress={() => router.push(`/course/${r.slug}` as any)} activeOpacity={0.8}>
                  <View style={[s.courseIcon, { backgroundColor: meta.bg }]}>
                    <Text style={{ fontSize: 26 }}>{meta.emoji}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.courseTitle}>{isAr ? meta.label : r.title_ar}</Text>
                    <View style={s.courseBar}>
                      <View style={[s.courseBarFill, { width: `${pct}%` as any, backgroundColor: meta.color }]} />
                    </View>
                  </View>
                  <Text style={[s.coursePct, { color: meta.color }]}>{pct}%</Text>
                </TouchableOpacity>
              )
            })}\n          </View>
        )}

        {/* ── All Courses ── */}
        <View style={s.section}>
          <View style={s.sectionHeader}>
            <Text style={s.sectionTitle}>{isAr ? '🚀 المسارات' : '🚀 Courses'}</Text>
            <TouchableOpacity onPress={() => router.push('/courses' as any)}>
              <Text style={s.seeAll}>{isAr ? 'عرض الكل ←' : 'See All →'}</Text>
            </TouchableOpacity>
          </View>
          {Object.entries(ROADMAP_META).map(([slug, meta]) => {
            const roadmap    = roadmaps.find(r => r.slug === slug)
            const isEnrolled = roadmap && enrollments.has(roadmap.id)
            return (
              <TouchableOpacity key={slug}
                style={[s.pathCard, isEnrolled && { borderColor: meta.color + '50', borderWidth: 2 }]}
                onPress={() => router.push(`/course/${slug}` as any)} activeOpacity={0.8}>
                <View style={[s.pathAccent, { backgroundColor: meta.color }]} />
                <View style={[s.pathIcon, { backgroundColor: meta.bg }]}>
                  <Text style={{ fontSize: 22 }}>{meta.emoji}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <View style={s.pathTop}>
                    <Text style={s.pathName}>{isAr ? meta.label : slug}</Text>
                    {isEnrolled && (
                      <View style={[s.enrolledTag, { backgroundColor: meta.bg }]}>
                        <Text style={[s.enrolledTagText, { color: meta.color }]}>
                          {isAr ? '✓ مشترك' : '✓ Enrolled'}
                        </Text>
                      </View>
                    )}
                  </View>
                  <Text style={s.pathDesc}>{meta.desc}</Text>
                </View>
                {!isEnrolled && (
                  <View style={[s.priceBadge, { backgroundColor: meta.bg }]}>
                    <Text style={[s.priceText, { color: meta.color }]}>
                      {roadmap?.price_egp > 0 ? `${roadmap.price_egp?.toLocaleString()}` : 'مجاني'}
                    </Text>
                  </View>
                )}
                <Text style={{ color: '#ddd', fontSize: 16 }}>←</Text>
              </TouchableOpacity>
            )
          })}
        </View>

        <View style={{ height: 24 }} />
      </ScrollView>
    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  container:       { flex: 1, backgroundColor: Colors.bg },
  loading:         { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.bg },

  // Header
  header:          { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 10, backgroundColor: '#fff', borderBottomWidth: 2, borderBottomColor: Colors.border },
  headerLeft:      { flexDirection: 'row', alignItems: 'center', gap: 8 },
  streakPill:      { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 99, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 6, elevation: 4 },
  streakFire:      { fontSize: 16 },
  streakNum:       { fontSize: 16, fontWeight: '900' },
  shieldPill:      { backgroundColor: '#DDF4FF', borderRadius: 99, padding: 7 },
  shieldText:      { fontSize: 14 },
  xpPill:          { backgroundColor: Colors.purpleL, borderRadius: 99, paddingHorizontal: 10, paddingVertical: 6 },
  xpPillText:      { fontSize: 12, fontWeight: '800', color: Colors.purple },
  avatar:          { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  avatarLevel:     { color: '#fff', fontSize: 17, fontWeight: '900' },

  scroll:          { padding: 16 },

  // Nar
  narCard:         { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#fff', borderRadius: 20, padding: 16, marginBottom: 14, borderWidth: 2, borderColor: Colors.border, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, elevation: 2 },
  narEmoji:        { fontSize: 44 },
  narName:         { fontSize: 11, fontWeight: '800', color: Colors.blue, marginBottom: 2 },
  narMsg:          { fontSize: 14, fontWeight: '700', color: Colors.text, textAlign: 'right', lineHeight: 20 },

  // Streak Card
  streakCard:      { backgroundColor: '#fff', borderRadius: 20, padding: 16, marginBottom: 14, borderWidth: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, elevation: 2 },
  streakCardTop:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 },
  streakLabel:     { fontSize: 12, color: Colors.textSub, textAlign: 'right', marginBottom: 2 },
  streakRow:       { flexDirection: 'row', alignItems: 'baseline' },
  streakBig:       { fontSize: 42, fontWeight: '900' },
  streakDays:      { fontSize: 18, fontWeight: '700', color: Colors.textSub },
  streakRight:     { alignItems: 'flex-end' },
  milestoneBadge:  { borderRadius: 99, paddingHorizontal: 12, paddingVertical: 5, borderWidth: 1 },
  milestoneText:   { fontSize: 12, fontWeight: '700' },
  streakDots:      { flexDirection: 'row', justifyContent: 'space-between' },
  streakDotWrap:   { alignItems: 'center', gap: 4 },
  streakDot:       { width: 36, height: 36, borderRadius: 12, backgroundColor: Colors.border, justifyContent: 'center', alignItems: 'center' },
  streakDotDay:    { fontSize: 9, color: Colors.textSub, fontWeight: '600' },

  // XP Card
  xpCard:          { backgroundColor: '#fff', borderRadius: 20, padding: 16, marginBottom: 14, borderWidth: 2, borderColor: Colors.border },
  xpCardTop:       { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  levelCircle:     { width: 48, height: 48, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  levelCircleText: { color: '#fff', fontSize: 20, fontWeight: '900' },
  levelName:       { fontSize: 15, fontWeight: '800', color: Colors.text, textAlign: 'right' },
  xpCount:         { fontSize: 13, color: Colors.textSub, textAlign: 'right' },
  toNext:          { fontSize: 12, fontWeight: '700', textAlign: 'right' },
  xpBarBg:         { height: 12, backgroundColor: '#f0f0f0', borderRadius: 99, overflow: 'hidden', marginBottom: 4 },
  xpBarFill:       { height: '100%', borderRadius: 99 },
  xpBarLabels:     { flexDirection: 'row', justifyContent: 'space-between' },
  xpBarLabel:      { fontSize: 10, color: Colors.textMuted },

  // Daily Challenge
  challengeCard:   { backgroundColor: '#fff', borderRadius: 20, padding: 16, marginBottom: 14, borderWidth: 2, borderColor: Colors.purple + '30', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  challengeDone:   { borderColor: Colors.green + '50', backgroundColor: '#F8FFF5' },
  challengeLeft:   { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  challengeIcon:   { width: 48, height: 48, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  challengeLabel:  { fontSize: 11, color: Colors.textSub, marginBottom: 2 },
  challengeTitle:  { fontSize: 14, fontWeight: '800', color: Colors.text, textAlign: 'right', maxWidth: 180 },
  challengeXP:     { fontSize: 12, fontWeight: '700', color: Colors.purple, marginTop: 2 },
  challengeArrow:  { backgroundColor: Colors.purple, borderRadius: 10, width: 30, height: 30, justifyContent: 'center', alignItems: 'center' },

  // Sections
  section:         { marginBottom: 20 },
  sectionHeader:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sectionTitle:    { fontSize: 17, fontWeight: '900', color: Colors.text, textAlign: 'right' },
  seeAll:          { fontSize: 13, color: Colors.blue, fontWeight: '700' },

  // Course cards (enrolled)
  courseCard:      { backgroundColor: '#fff', borderRadius: 18, padding: 14, marginBottom: 10, borderWidth: 2, flexDirection: 'row', alignItems: 'center', gap: 12 },
  courseIcon:      { width: 52, height: 52, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  courseTitle:     { fontSize: 14, fontWeight: '800', color: Colors.text, textAlign: 'right', marginBottom: 8 },
  courseBar:       { height: 8, backgroundColor: '#f0f0f0', borderRadius: 99, overflow: 'hidden' },
  courseBarFill:   { height: '100%', borderRadius: 99 },
  coursePct:       { fontSize: 14, fontWeight: '900', minWidth: 36, textAlign: 'right' },

  // Path cards
  pathCard:        { backgroundColor: '#fff', borderRadius: 18, padding: 14, marginBottom: 10, borderWidth: 2, borderColor: Colors.border, flexDirection: 'row', alignItems: 'center', gap: 12, position: 'relative', overflow: 'hidden' },
  pathAccent:      { position: 'absolute', right: 0, top: 0, bottom: 0, width: 4 },
  pathIcon:        { width: 48, height: 48, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  pathTop:         { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 8, marginBottom: 4 },
  pathName:        { fontSize: 14, fontWeight: '800', color: Colors.text },
  pathDesc:        { fontSize: 12, color: Colors.textSub, textAlign: 'right' },
  enrolledTag:     { borderRadius: 6, paddingHorizontal: 7, paddingVertical: 2 },
  enrolledTagText: { fontSize: 10, fontWeight: '800' },
  priceBadge:      { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  priceText:       { fontSize: 11, fontWeight: '800' },
})
