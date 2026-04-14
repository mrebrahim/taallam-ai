import { useEffect, useState } from 'react'
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'
import { Colors } from '@/constants/Colors'

type Period = 'weekly' | 'monthly' | 'all_time'

const DEMO = [
  { id:'d1', name:'محمد إبراهيم',  w:2400, m:9800,  a:34200, streak:28, seed:7  },
  { id:'d2', name:'أحمد خالد',     w:2100, m:8400,  a:28700, streak:21, seed:13 },
  { id:'d3', name:'سارة محمود',   w:1950, m:7900,  a:25100, streak:35, seed:3  },
  { id:'d4', name:'عمر حسين',     w:1800, m:7200,  a:22800, streak:14, seed:17 },
  { id:'d5', name:'نور علي',       w:1650, m:6600,  a:19500, streak:9,  seed:5  },
  { id:'d6', name:'يوسف عبدالله', w:1500, m:6000,  a:17200, streak:42, seed:11 },
  { id:'d7', name:'مريم أحمد',    w:1350, m:5400,  a:15600, streak:7,  seed:9  },
  { id:'d8', name:'علي محمد',     w:1200, m:4800,  a:13400, streak:16, seed:2  },
  { id:'d9', name:'فاطمة حسن',   w:1050, m:4200,  a:11800, streak:5,  seed:15 },
  { id:'d10',name:'كريم سامي',    w:900,  m:3600,  a:9900,  streak:11, seed:6  },
  { id:'d11',name:'هناء رضا',     w:750,  m:3000,  a:8200,  streak:3,  seed:19 },
  { id:'d12',name:'طارق وليد',    w:600,  m:2400,  a:6700,  streak:19, seed:4  },
]

function dailyXP(base: number, seed: number) {
  const day = Math.floor(Date.now() / 86400000)
  const r = Math.abs(Math.sin(seed * 9301 + day * 49297))
  return Math.round(base * (1 + r * 0.3 - 0.15) / 50) * 50
}

const MEDALS = ['🥇','🥈','🥉']

export default function LeaderboardScreen() {
  const { user } = useAuth()
  const [period, setPeriod] = useState<Period>('weekly')
  const [entries, setEntries] = useState<any[]>([])

  useEffect(() => {
    if (!user) return
    build()
  }, [user, period])

  const build = () => {
    const userXP = period === 'weekly' ? Math.round((user!.xp_total || 0) * 0.15)
      : period === 'monthly' ? Math.round((user!.xp_total || 0) * 0.4)
      : user!.xp_total || 0

    const demo = DEMO.map(d => ({
      id: d.id, name: d.name,
      xp: dailyXP(period === 'weekly' ? d.w : period === 'monthly' ? d.m : d.a, d.seed),
      streak: d.streak, isMe: false,
    }))

    const me = { id: user!.id, name: user!.full_name || user!.username || 'أنت', xp: userXP, streak: user!.streak_current || 0, isMe: true }
    const all = [...demo, me].sort((a, b) => b.xp - a.xp)
    setEntries(all)
  }

  const myRank = entries.findIndex(e => e.isMe) + 1
  const top3 = entries.slice(0, 3)
  const rest = entries.slice(3)

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      {/* Header */}
      <View style={s.header}>
        <Text style={s.title}>🏆 الترتيب</Text>
        {myRank > 0 && <View style={s.rankBadge}><Text style={s.rankText}>ترتيبك: #{myRank}</Text></View>}
      </View>

      {/* Period tabs */}
      <View style={s.tabs}>
        {(['weekly','monthly','all_time'] as Period[]).map((p, i) => (
          <TouchableOpacity key={p} style={[s.tab, period===p && s.tabActive]} onPress={() => setPeriod(p)}>
            <Text style={[s.tabText, period===p && s.tabTextActive]}>{['هذا الأسبوع','هذا الشهر','كل الوقت'][i]}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

        {/* Podium */}
        <View style={s.podium}>
          {/* 2nd */}
          {top3[1] && <View style={[s.podiumItem, { marginTop: 20 }]}>
            <Text style={{ fontSize: 28 }}>{top3[1].isMe ? '⭐' : '🧑‍💻'}</Text>
            <Text style={s.podiumName}>{top3[1].name}</Text>
            <View style={[s.podiumBar, { backgroundColor: '#C0C0C0', height: 70 }]}>
              <Text style={{ fontSize: 16 }}>🥈</Text>
              <Text style={s.podiumXP}>{top3[1].xp.toLocaleString()}</Text>
            </View>
          </View>}

          {/* 1st */}
          {top3[0] && <View style={s.podiumItem}>
            <Text style={{ fontSize: 14 }}>👑</Text>
            <Text style={{ fontSize: 34 }}>{top3[0].isMe ? '⭐' : '🧑‍💻'}</Text>
            <Text style={[s.podiumName, { fontWeight: '900' }]}>{top3[0].name}</Text>
            <View style={[s.podiumBar, { backgroundColor: '#FFD700', height: 90 }]}>
              <Text style={{ fontSize: 18 }}>🥇</Text>
              <Text style={s.podiumXP}>{top3[0].xp.toLocaleString()}</Text>
            </View>
          </View>}

          {/* 3rd */}
          {top3[2] && <View style={[s.podiumItem, { marginTop: 30 }]}>
            <Text style={{ fontSize: 26 }}>{top3[2].isMe ? '⭐' : '🧑‍💻'}</Text>
            <Text style={s.podiumName}>{top3[2].name}</Text>
            <View style={[s.podiumBar, { backgroundColor: '#CD7F32', height: 55 }]}>
              <Text style={{ fontSize: 14 }}>🥉</Text>
              <Text style={s.podiumXP}>{top3[2].xp.toLocaleString()}</Text>
            </View>
          </View>}
        </View>

        {/* Rest */}
        {rest.map((e, i) => {
          const rank = i + 4
          const isMe = e.isMe
          return (
            <View key={e.id} style={[s.row, isMe && s.rowMe]}>
              <Text style={[s.rowRank, { color: isMe ? Colors.blue : '#aaa' }]}>#{rank}</Text>
              <View style={[s.rowAvatar, { backgroundColor: isMe ? '#DDF4FF' : '#f5f5f5' }]}>
                <Text style={{ fontSize: 18 }}>{isMe ? '⭐' : '🧑‍💻'}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[s.rowName, { color: isMe ? '#1453A3' : Colors.text }]}>
                  {e.name}{isMe ? ' (أنت)' : ''}
                </Text>
                <Text style={s.rowStreak}>🔥 {e.streak} يوم</Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={[s.rowXP, { color: isMe ? Colors.blue : Colors.text }]}>{e.xp.toLocaleString()}</Text>
                <Text style={{ fontSize: 10, color: '#ccc' }}>XP</Text>
              </View>
            </View>
          )
        })}
      </ScrollView>
    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, paddingBottom: 8 },
  title: { fontSize: 22, fontWeight: '900', color: Colors.text },
  rankBadge: { backgroundColor: '#DDF4FF', borderRadius: 99, paddingHorizontal: 12, paddingVertical: 5 },
  rankText: { fontSize: 13, fontWeight: '800', color: Colors.blue },
  tabs: { flexDirection: 'row', marginHorizontal: 16, backgroundColor: '#e8e8e8', borderRadius: 12, padding: 3, marginBottom: 8 },
  tab: { flex: 1, paddingVertical: 8, borderRadius: 10, alignItems: 'center' },
  tabActive: { backgroundColor: '#fff' },
  tabText: { fontSize: 12, color: '#aaa' },
  tabTextActive: { fontWeight: '800', color: Colors.blue },
  scroll: { padding: 16 },
  podium: { flexDirection: 'row', justifyContent: 'center', alignItems: 'flex-end', gap: 8, marginBottom: 20 },
  podiumItem: { alignItems: 'center', flex: 1 },
  podiumName: { fontSize: 11, fontWeight: '700', color: Colors.text, marginVertical: 4, textAlign: 'center' },
  podiumBar: { width: '100%', borderRadius: '10 10 0 0' as any, alignItems: 'center', justifyContent: 'center', paddingVertical: 8, gap: 2 },
  podiumXP: { fontSize: 12, fontWeight: '900', color: '#fff' },
  row: { backgroundColor: '#fff', borderRadius: 14, padding: 12, marginBottom: 8, flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 2, borderColor: Colors.border },
  rowMe: { backgroundColor: '#DDF4FF', borderColor: Colors.blue },
  rowRank: { width: 28, fontSize: 14, fontWeight: '800', textAlign: 'center' },
  rowAvatar: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  rowName: { fontSize: 14, fontWeight: '700', textAlign: 'right' },
  rowStreak: { fontSize: 11, color: '#aaa', textAlign: 'right', marginTop: 2 },
  rowXP: { fontSize: 15, fontWeight: '900' },
})
