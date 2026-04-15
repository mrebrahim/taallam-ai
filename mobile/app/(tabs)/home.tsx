import { useEffect, useState } from 'react'
import {
  View, Text, ScrollView, StyleSheet,
  TouchableOpacity, ActivityIndicator, Image, Modal, Animated, Easing,
} from 'react-native'
import { router } from 'expo-router'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'
import { Colors, ROADMAP_META } from '@/constants/Colors'
import { useLang } from '@/lib/LanguageContext'
import { SafeAreaView } from 'react-native-safe-area-context'

const LEVELS = [
  { level:1, name:'مبتدئ',   nameEn:'Beginner',  xp:0,    color:'#94a3b8' },
  { level:2, name:'متعلم',   nameEn:'Learner',   xp:100,  color:Colors.green  },
  { level:3, name:'محترف',   nameEn:'Pro',       xp:400,  color:Colors.blue   },
  { level:4, name:'خبير',    nameEn:'Expert',    xp:900,  color:Colors.orange },
  { level:5, name:'أسطورة',  nameEn:'Legend',    xp:1600, color:Colors.purple },
  { level:6, name:'نخبة 🔥', nameEn:'Elite 🔥', xp:2500, color:'#FFD700'    },
]

function getLvl(xp: number) {
  let cur = LEVELS[0]
  let nxt = LEVELS[1]
  for (let i = 0; i < LEVELS.length - 1; i++) {
    if (xp >= LEVELS[i].xp) { cur = LEVELS[i]; nxt = LEVELS[i+1] || LEVELS[i] }
  }
  const prog = nxt.xp > cur.xp ? Math.min(100, Math.round(((xp - cur.xp) / (nxt.xp - cur.xp)) * 100)) : 100
  return { cur, nxt, prog, toNext: Math.max(0, nxt.xp - xp) }
}

// ── Sticker System ────────────────────────────────────────────
// Stickers from getstickerpack.com — Pushkas (Egyptian) + Ana Byh (Gulf)
const BASE = 'https://s3.getstickerpack.com/storage/uploads/sticker-pack/'
const STICKERS = {
  // days absent → sticker URL + funny Arabic message
  d2:  { url: BASE + 'pushkas-bwshkash/sticker_3.webp?38a38d7deecb5815fe1774706d9d0291', msg: 'يومين ومعملتش حاجة؟ 😤 انت بتعمل إيه بالظبط؟!' },
  d3:  { url: BASE + 'pushkas-bwshkash/sticker_7.webp?38a38d7deecb5815fe1774706d9d0291', msg: '3 أيام! الكورس بيعيط عليك 😭 ارجع بقى!' },
  d4:  { url: BASE + 'pushkas-bwshkash/sticker_11.webp?38a38d7deecb5815fe1774706d9d0291', msg: '4 أيام!! الكورس نسيك تقريباً 😒' },
  d5:  { url: BASE + 'pushkas-bwshkash/sticker_14.webp?38a38d7deecb5815fe1774706d9d0291', msg: '5 أيام ولا درس واحد؟! بوشكاش بيحكم عليك 👀' },
  d7:  { url: BASE + 'ana-byh-abn-byh/sticker_2.webp?38a38d7deecb5815fe1774706d9d0291',  msg: 'أسبوع كامل! وين كنت يا زلمة؟ 😅' },
  d10: { url: BASE + 'pushkas-bwshkash/sticker_18.webp?38a38d7deecb5815fe1774706d9d0291', msg: '10 أيام! اللي اتعلمته بدأ ينسى 😬 سريع!' },
  d14: { url: BASE + 'ana-byh-abn-byh/sticker_5.webp?38a38d7deecb5815fe1774706d9d0291',  msg: 'أسبوعين! يا خسارة على الفلوس اللي دفعتها 😅' },
  d21: { url: BASE + 'pushkas-bwshkash/sticker_22.webp?38a38d7deecb5815fe1774706d9d0291', msg: '3 أسابيع! بجد مش قادر تفتح الابليكيشن؟ 😤' },
  d30: { url: BASE + 'ana-byh-abn-byh/sticker_8.webp?38a38d7deecb5815fe1774706d9d0291',  msg: 'شهر! ما شاء الله عليك... على الغياب 👋' },
}

function getDaysAbsent(lastActivityDate: string | null): number {
  if (!lastActivityDate) return 0
  const last = new Date(lastActivityDate)
  const now  = new Date()
  const diff = Math.floor((now.getTime() - last.getTime()) / (1000 * 60 * 60 * 24))
  return diff
}

function getStickerForDays(days: number): { url: string; msg: string } | null {
  if (days >= 30) return STICKERS.d30
  if (days >= 21) return STICKERS.d21
  if (days >= 14) return STICKERS.d14
  if (days >= 10) return STICKERS.d10
  if (days >= 7)  return STICKERS.d7
  if (days >= 5)  return STICKERS.d5
  if (days >= 4)  return STICKERS.d4
  if (days >= 3)  return STICKERS.d3
  if (days >= 2)  return STICKERS.d2
  return null
}


function getNarMsg(streak: number, name: string, isAr: boolean): string {
  const n = (name || '').split(' ')[0] || (isAr ? 'بطل' : 'Champion')
  if (isAr) {
    if (streak === 0) return 'ابدأ streak جديد النهارده 🚀'
    if (streak < 3)  return streak + ' أيام ' + n + '! العادة بتتبنى 🔥'
    if (streak < 7)  return streak + ' أيام! إنت أحسن من 80% من الطلاب 💪'
    if (streak < 14) return streak + ' أيام! أسبوع كامل — العادة بتتكون 🎯'
    if (streak < 30) return streak + ' يوم! إنت مش قادر توقف 🚀'
    return '⚠️ ' + streak + ' يوم! إنجاز حقيقي — ماتضيعوش!'
  } else {
    if (streak === 0) return 'Start your streak today ' + n + '! 🚀'
    if (streak < 3)  return streak + ' days ' + n + '! Building the habit 🔥'
    if (streak < 7)  return streak + ' days! Ahead of 80% of students 💪'
    if (streak < 14) return streak + ' days! One full week — habit forming 🎯'
    if (streak < 30) return streak + ' days! You cannot be stopped 🚀'
    return '⚠️ ' + streak + ' days! Real achievement — don\'t lose it!'
  }
}

function getStreakColor(streak: number) {
  if (streak >= 30) return Colors.red
  if (streak >= 7)  return Colors.orange
  return Colors.green
}

export default function HomeScreen() {
  const { user, loading } = useAuth()
  const { isAr } = useLang()

  const [roadmaps, setRoadmaps]     = useState<any[]>([])
  const [enrollments, setEnrollments] = useState<Set<string>>(new Set())
  const [progress, setProgress]     = useState<Record<string, any>>({})
  const [todayChallenge, setTodayChallenge] = useState<any>(null)
  const [challengeDone, setChallengeDone]   = useState(false)
  const [freezeCount, setFreezeCount] = useState(0)
  const [stickerDismissed, setStickerDismissed] = useState(false)

  useEffect(() => {
    if (!user) return
    loadData()
  }, [user])

  const loadData = async () => {
    const today = new Date().toISOString().split('T')[0]
    const [
      { data: rm },
      { data: en },
      { data: pr },
      { data: dc },
      { data: freezes },
    ] = await Promise.all([
      supabase.from('roadmaps').select('*').eq('is_active', true).order('sort_order'),
      supabase.from('course_enrollments').select('roadmap_id').eq('user_id', user!.id).eq('is_active', true),
      supabase.from('user_roadmap_progress').select('*').eq('user_id', user!.id),
      supabase.from('daily_challenge_schedule')
        .select('*, challenge:challenges(*)')
        .eq('scheduled_date', today)
        .maybeSingle(),
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

    if (dc?.challenge) {
      const { data: attempt } = await supabase
        .from('user_challenge_attempts')
        .select('is_correct')
        .eq('user_id', user!.id)
        .eq('challenge_id', dc.challenge.id)
        .maybeSingle()
      setChallengeDone(!!attempt?.is_correct)
    }
  }

  if (loading || !user) {
    return (
      <View style={s.loading}>
        <ActivityIndicator size="large" color={Colors.green} />
      </View>
    )
  }

  const streak      = user.streak_current || 0
  const xp          = user.xp_total || 0
  const lvl         = getLvl(xp)
  const streakColor = getStreakColor(streak)
  const narMsg      = getNarMsg(streak, user.full_name || user.username || '', isAr)
  const daysAbsent  = getDaysAbsent(user.last_activity_date || null)
  const sticker     = !stickerDismissed ? getStickerForDays(daysAbsent) : null
  const enrolledList = roadmaps.filter(r => enrollments.has(r.id))
  const pctBar      = lvl.prog

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      {/* ── Sticker Popup ── */}
      <Modal visible={!!sticker} transparent animationType="fade" onRequestClose={() => setStickerDismissed(true)}>
        <View style={s.stickerOverlay}>
          <TouchableOpacity style={s.stickerCard} activeOpacity={1} onPress={() => setStickerDismissed(true)}>
            <Text style={s.stickerDays}>{daysAbsent} {daysAbsent === 1 ? 'يوم' : 'أيام'} غياب!</Text>
            {sticker && (
              <Image
                source={{ uri: sticker.url }}
                style={s.stickerImg}
                resizeMode="contain"
              />
            )}
            {sticker && <Text style={s.stickerMsg}>{sticker.msg}</Text>}
            <TouchableOpacity style={s.stickerBtn} onPress={() => setStickerDismissed(true)}>
              <Text style={s.stickerBtnTxt}>😅 هروح أذاكر دلوقتي!</Text>
            </TouchableOpacity>
            <Text style={s.stickerTap}>اضغط في أي مكان للإغلاق</Text>
          </TouchableOpacity>
        </View>
      </Modal>

      {/* Header */}
      <View style={s.header}>
        <View style={s.headerPills}>
          <TouchableOpacity
            style={[s.streakPill, { backgroundColor: streakColor }]}
            onPress={() => router.push('/(tabs)/profile' as any)}>
            <Text style={s.streakFire}>🔥</Text>
            <Text style={s.streakNum}>{streak}</Text>
          </TouchableOpacity>

          {freezeCount > 0 && (
            <View style={s.freezePill}>
              <Text style={{ fontSize: 16 }}>🛡️</Text>
            </View>
          )}

          <View style={s.xpPill}>
            <Text style={s.xpPillTxt}>⚡ {xp.toLocaleString()}</Text>
          </View>
        </View>

        <View style={[s.avatar, { backgroundColor: lvl.cur.color }]}>
          <Text style={s.avatarTxt}>{user.current_level || 1}</Text>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scroll}>

        {/* Nar Mascot */}
        <View style={s.narCard}>
          <Text style={s.narEmoji}>🤖</Text>
          <View style={{ flex: 1 }}>
            <Text style={s.narLabel}>Nar</Text>
            <Text style={s.narMsg}>{narMsg}</Text>
          </View>
        </View>

        {/* Streak Card */}
        <View style={[s.streakCard, { borderColor: streakColor + '40' }]}>
          <View style={s.streakTop}>
            <View>
              <Text style={s.streakLabel}>{isAr ? 'Streak الحالي' : 'Current Streak'}</Text>
              <Text style={[s.streakBig, { color: streakColor }]}>
                {streak}
                <Text style={s.streakDaysTxt}>{isAr ? ' يوم 🔥' : ' days 🔥'}</Text>
              </Text>
            </View>
            <View style={{ alignItems: 'flex-end', gap: 6 }}>
              {streak < 7 && (
                <View style={[s.badge, { backgroundColor: Colors.green + '15', borderColor: Colors.green + '40' }]}>
                  <Text style={[s.badgeTxt, { color: Colors.green }]}>
                    {isAr ? (7-streak) + ' للأسبوع' : (7-streak) + ' to week'}
                  </Text>
                </View>
              )}
              {streak >= 7 && streak < 30 && (
                <View style={[s.badge, { backgroundColor: Colors.orange + '15', borderColor: Colors.orange + '40' }]}>
                  <Text style={[s.badgeTxt, { color: Colors.orange }]}>
                    {isAr ? (30-streak) + ' للشهر' : (30-streak) + ' to month'}
                  </Text>
                </View>
              )}
              {streak >= 30 && (
                <View style={[s.badge, { backgroundColor: Colors.red + '15', borderColor: Colors.red + '40' }]}>
                  <Text style={[s.badgeTxt, { color: Colors.red }]}>🔥 On Fire!</Text>
                </View>
              )}
              {freezeCount > 0 && (
                <View style={[s.badge, { backgroundColor: Colors.blueL, borderColor: Colors.blue + '40' }]}>
                  <Text style={[s.badgeTxt, { color: Colors.blue }]}>🛡️ Freeze ready</Text>
                </View>
              )}
            </View>
          </View>

          {/* 7-day dots */}
          <View style={s.dots}>
            {[1,2,3,4,5,6,7].map((day) => {
              const filled = streak >= day
              const isToday = day === Math.min(streak, 7)
              return (
                <View key={day} style={s.dotWrap}>
                  <View style={[
                    s.dot,
                    filled && { backgroundColor: streakColor },
                    isToday && { borderWidth: 2, borderColor: streakColor },
                  ]}>
                    {filled ? <Text style={{ fontSize: 12 }}>🔥</Text> : null}
                  </View>
                  <Text style={s.dotLabel}>
                    {isAr
                      ? ['أح','إث','ثل','أر','خم','جم','سب'][day-1]
                      : ['M','T','W','T','F','S','S'][day-1]}
                  </Text>
                </View>
              )
            })}
          </View>
        </View>

        {/* XP Card */}
        <View style={s.xpCard}>
          <View style={s.xpTop}>
            <View style={[s.levelCircle, { backgroundColor: lvl.cur.color }]}>
              <Text style={s.levelCircleTxt}>{user.current_level || 1}</Text>
            </View>
            <View style={{ flex: 1, marginHorizontal: 12 }}>
              <Text style={s.levelName}>{isAr ? lvl.cur.name : lvl.cur.nameEn}</Text>
              <Text style={s.xpSubTxt}>{xp.toLocaleString()} XP</Text>
            </View>
            {lvl.toNext > 0 && (
              <Text style={[s.toNextTxt, { color: lvl.cur.color }]}>
                +{lvl.toNext.toLocaleString()} {isAr ? 'للـ' : 'to'} {isAr ? lvl.nxt.name : lvl.nxt.nameEn}
              </Text>
            )}
          </View>
          <View style={s.xpBarBg}>
            <View style={[s.xpBarFill, { width: (pctBar + '%') as any, backgroundColor: lvl.cur.color }]} />
          </View>
          <View style={s.xpBarRow}>
            <Text style={s.xpBarLbl}>0</Text>
            <Text style={s.xpBarLbl}>{pctBar}%</Text>
            <Text style={s.xpBarLbl}>{lvl.nxt.xp.toLocaleString()}</Text>
          </View>
        </View>

        {/* Daily Challenge */}
        {todayChallenge ? (
          <TouchableOpacity
            style={[s.challengeCard, challengeDone && s.challengeDone]}
            onPress={() => { if (!challengeDone) router.push('/(tabs)/challenges' as any) }}
            activeOpacity={challengeDone ? 1 : 0.85}>
            <View style={[s.challengeIcon, { backgroundColor: challengeDone ? Colors.green : Colors.purple }]}>
              <Text style={{ fontSize: 22 }}>{challengeDone ? '✅' : '⚔️'}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.challengeTop}>{isAr ? '⚡ تحدي اليوم' : '⚡ Daily Challenge'}</Text>
              <Text style={s.challengeTitle} numberOfLines={1}>{todayChallenge.title_ar}</Text>
              <Text style={s.challengeXP}>+{todayChallenge.xp_reward} XP</Text>
            </View>
            {challengeDone
              ? <Text style={s.doneLabel}>{isAr ? 'تم ✅' : 'Done ✅'}</Text>
              : <View style={s.challengeArrow}><Text style={{ color: '#fff', fontSize: 14 }}>←</Text></View>}
          </TouchableOpacity>
        ) : null}

        {/* Continue Learning */}
        {enrolledList.length > 0 && (
          <View style={s.section}>
            <Text style={s.sectionTitle}>{isAr ? '📚 كمّل من حيث وقفت' : '📚 Continue Learning'}</Text>
            {enrolledList.map(r => {
              const meta = ROADMAP_META[r.slug as keyof typeof ROADMAP_META]
              const prog = progress[r.id]
              if (!meta) return null
              const pct = r.total_xp > 0 && prog
                ? Math.min(100, Math.round((prog.total_xp_earned / r.total_xp) * 100))
                : 0
              return (
                <TouchableOpacity
                  key={r.id}
                  style={[s.courseCard, { borderColor: meta.color + '40' }]}
                  onPress={() => router.push(('/course/' + r.slug) as any)}
                  activeOpacity={0.8}>
                  <View style={[s.courseIcon, { backgroundColor: meta.bg }]}>
                    <Text style={{ fontSize: 26 }}>{meta.emoji}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.courseTitle}>{isAr ? meta.label : r.title_ar}</Text>
                    <View style={s.courseBarBg}>
                      <View style={[s.courseBarFill, {
                        width: (pct + '%') as any,
                        backgroundColor: meta.color,
                      }]} />
                    </View>
                  </View>
                  <Text style={[s.coursePct, { color: meta.color }]}>{pct}%</Text>
                </TouchableOpacity>
              )
            })}
          </View>
        )}

        {/* All Courses */}
        <View style={s.section}>
          <View style={s.sectionHeader}>
            <Text style={s.sectionTitle}>{isAr ? '🚀 المسارات' : '🚀 Courses'}</Text>
            <TouchableOpacity onPress={() => router.push('/courses' as any)}>
              <Text style={s.seeAll}>{isAr ? 'عرض الكل ←' : 'See All →'}</Text>
            </TouchableOpacity>
          </View>
          {Object.entries(ROADMAP_META).map(([slug, meta]) => {
            const roadmap    = roadmaps.find(r => r.slug === slug)
            const isEnrolled = roadmap ? enrollments.has(roadmap.id) : false
            return (
              <TouchableOpacity
                key={slug}
                style={[s.pathCard, isEnrolled && { borderColor: meta.color + '50', borderWidth: 2 }]}
                onPress={() => router.push(('/course/' + slug) as any)}
                activeOpacity={0.8}>
                <View style={[s.pathAccent, { backgroundColor: meta.color }]} />
                <View style={[s.pathIcon, { backgroundColor: meta.bg }]}>
                  <Text style={{ fontSize: 22 }}>{meta.emoji}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <View style={s.pathTop}>
                    <Text style={s.pathName}>{isAr ? meta.label : slug}</Text>
                    {isEnrolled && (
                      <View style={[s.enrolledTag, { backgroundColor: meta.bg }]}>
                        <Text style={[s.enrolledTagTxt, { color: meta.color }]}>
                          {isAr ? '✓ مشترك' : '✓ Enrolled'}
                        </Text>
                      </View>
                    )}
                  </View>
                  <Text style={s.pathDesc}>{meta.desc}</Text>
                </View>
                {!isEnrolled && roadmap && roadmap.price_egp > 0 && (
                  <View style={[s.priceBadge, { backgroundColor: meta.bg }]}>
                    <Text style={[s.priceTxt, { color: meta.color }]}>
                      {roadmap.price_egp.toLocaleString()}
                    </Text>
                  </View>
                )}
                <Text style={s.arrow}>←</Text>
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
  container:      { flex: 1, backgroundColor: Colors.bg },
  loading:        { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.bg },
  header:         { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 10, backgroundColor: '#fff', borderBottomWidth: 2, borderBottomColor: Colors.border },
  headerPills:    { flexDirection: 'row', alignItems: 'center', gap: 8 },
  streakPill:     { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 7, borderRadius: 99, gap: 4 },
  streakFire:     { fontSize: 16 },
  streakNum:      { fontSize: 16, fontWeight: '900', color: '#fff' },
  freezePill:     { backgroundColor: Colors.blueL, borderRadius: 99, padding: 7 },
  xpPill:         { backgroundColor: Colors.purpleL, borderRadius: 99, paddingHorizontal: 10, paddingVertical: 6 },
  xpPillTxt:      { fontSize: 12, fontWeight: '800', color: Colors.purple },
  avatar:         { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  avatarTxt:      { color: '#fff', fontSize: 17, fontWeight: '900' },
  scroll:         { padding: 16 },
  narCard:        { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#fff', borderRadius: 20, padding: 16, marginBottom: 14, borderWidth: 2, borderColor: Colors.border },
  narEmoji:       { fontSize: 44 },
  narLabel:       { fontSize: 11, fontWeight: '800', color: Colors.blue, marginBottom: 2 },
  narMsg:         { fontSize: 14, fontWeight: '700', color: Colors.text, textAlign: 'right', lineHeight: 20 },
  streakCard:     { backgroundColor: '#fff', borderRadius: 20, padding: 16, marginBottom: 14, borderWidth: 2 },
  streakTop:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 },
  streakLabel:    { fontSize: 12, color: Colors.textSub, textAlign: 'right', marginBottom: 4 },
  streakBig:      { fontSize: 36, fontWeight: '900' },
  streakDaysTxt:  { fontSize: 16, fontWeight: '600', color: Colors.textSub },
  badge:          { borderRadius: 99, paddingHorizontal: 10, paddingVertical: 4, borderWidth: 1 },
  badgeTxt:       { fontSize: 11, fontWeight: '700' },
  dots:           { flexDirection: 'row', justifyContent: 'space-between' },
  dotWrap:        { alignItems: 'center', gap: 4 },
  dot:            { width: 36, height: 36, borderRadius: 12, backgroundColor: Colors.border, justifyContent: 'center', alignItems: 'center' },
  dotLabel:       { fontSize: 9, color: Colors.textSub, fontWeight: '600' },
  xpCard:         { backgroundColor: '#fff', borderRadius: 20, padding: 16, marginBottom: 14, borderWidth: 2, borderColor: Colors.border },
  xpTop:          { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  levelCircle:    { width: 48, height: 48, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  levelCircleTxt: { color: '#fff', fontSize: 20, fontWeight: '900' },
  levelName:      { fontSize: 15, fontWeight: '800', color: Colors.text, textAlign: 'right' },
  xpSubTxt:       { fontSize: 12, color: Colors.textSub, textAlign: 'right' },
  toNextTxt:      { fontSize: 11, fontWeight: '700', textAlign: 'right' },
  xpBarBg:        { height: 12, backgroundColor: '#f0f0f0', borderRadius: 99, overflow: 'hidden', marginBottom: 4 },
  xpBarFill:      { height: '100%', borderRadius: 99 },
  xpBarRow:       { flexDirection: 'row', justifyContent: 'space-between' },
  xpBarLbl:       { fontSize: 10, color: Colors.textMuted },
  challengeCard:  { backgroundColor: '#fff', borderRadius: 20, padding: 14, marginBottom: 14, borderWidth: 2, borderColor: Colors.purple + '30', flexDirection: 'row', alignItems: 'center', gap: 12 },
  challengeDone:  { borderColor: Colors.green + '50', backgroundColor: '#F8FFF5' },
  challengeIcon:  { width: 48, height: 48, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  challengeTop:   { fontSize: 11, color: Colors.textSub, marginBottom: 2 },
  challengeTitle: { fontSize: 14, fontWeight: '800', color: Colors.text, textAlign: 'right' },
  challengeXP:    { fontSize: 12, fontWeight: '700', color: Colors.purple, marginTop: 2 },
  doneLabel:      { fontSize: 13, color: Colors.green, fontWeight: '900' },
  challengeArrow: { backgroundColor: Colors.purple, borderRadius: 10, width: 30, height: 30, justifyContent: 'center', alignItems: 'center' },
  section:        { marginBottom: 20 },
  sectionHeader:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sectionTitle:   { fontSize: 17, fontWeight: '900', color: Colors.text, textAlign: 'right' },
  seeAll:         { fontSize: 13, color: Colors.blue, fontWeight: '700' },
  courseCard:     { backgroundColor: '#fff', borderRadius: 18, padding: 14, marginBottom: 10, borderWidth: 2, flexDirection: 'row', alignItems: 'center', gap: 12 },
  courseIcon:     { width: 52, height: 52, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  courseTitle:    { fontSize: 14, fontWeight: '800', color: Colors.text, textAlign: 'right', marginBottom: 8 },
  courseBarBg:    { height: 8, backgroundColor: '#f0f0f0', borderRadius: 99, overflow: 'hidden' },
  courseBarFill:  { height: '100%', borderRadius: 99 },
  coursePct:      { fontSize: 14, fontWeight: '900', minWidth: 36, textAlign: 'right' },
  pathCard:       { backgroundColor: '#fff', borderRadius: 18, padding: 14, marginBottom: 10, borderWidth: 2, borderColor: Colors.border, flexDirection: 'row', alignItems: 'center', gap: 12, position: 'relative', overflow: 'hidden' },
  pathAccent:     { position: 'absolute', right: 0, top: 0, bottom: 0, width: 4 },
  pathIcon:       { width: 48, height: 48, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  pathTop:        { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 8, marginBottom: 4 },
  pathName:       { fontSize: 14, fontWeight: '800', color: Colors.text },
  pathDesc:       { fontSize: 12, color: Colors.textSub, textAlign: 'right' },
  enrolledTag:    { borderRadius: 6, paddingHorizontal: 7, paddingVertical: 2 },
  enrolledTagTxt: { fontSize: 10, fontWeight: '800' },
  priceBadge:     { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  priceTxt:       { fontSize: 11, fontWeight: '800' },
  arrow:          { fontSize: 16, color: '#ddd' },
})
