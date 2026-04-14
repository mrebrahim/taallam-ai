import { Tabs } from 'expo-router'
import { View, Text, StyleSheet, Platform } from 'react-native'
import { Colors } from '@/constants/Colors'
import { useLang } from '@/lib/LanguageContext'
import { Analytics } from '@/lib/analytics'

function TabIcon({ emoji, label, active }: { emoji: string; label: string; active: boolean }) {
  return (
    <View style={styles.tab}>
      <Text style={styles.tabEmoji}>{emoji}</Text>
      <Text style={[styles.tabLabel, active && styles.tabLabelActive]}>{label}</Text>
      {active && <View style={styles.activeDot} />}
    </View>
  )
}

export default function TabsLayout() {
  const { isAr } = useLang()

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: styles.tabBar,
        tabBarShowLabel: false,
      }}
    >
      {/* Order: Profile (LEFT/start) → Leaderboard → Challenges → Learn → Home (RIGHT/end) */}
      {/* In RTL: Home is on the right, Profile is on the left */}

      <Tabs.Screen
        name="profile"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon emoji="👤" label={isAr ? 'ملفي' : 'Profile'} active={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="leaderboard"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon emoji="🏆" label={isAr ? 'الترتيب' : 'Ranking'} active={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="challenges"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon emoji="⚔️" label={isAr ? 'التحديات' : 'Challenges'} active={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="learn"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon emoji="📚" label={isAr ? 'التعلم' : 'Learn'} active={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="home"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon emoji="🏠" label={isAr ? 'الرئيسية' : 'Home'} active={focused} />
          ),
        }}
      />
    </Tabs>
  )
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: '#fff',
    borderTopWidth: 2,
    borderTopColor: '#f0f0f0',
    height: Platform.OS === 'ios' ? 84 : 64,
    paddingBottom: Platform.OS === 'ios' ? 24 : 8,
    paddingTop: 8,
    flexDirection: 'row-reverse', // ← Arabic RTL: Home on right
  },
  tab: { alignItems: 'center', gap: 2, position: 'relative', paddingTop: 4 },
  tabEmoji: { fontSize: 22 },
  tabLabel: { fontSize: 10, color: '#aaa', fontWeight: '400' },
  tabLabelActive: { color: Colors.blue, fontWeight: '800' },
  activeDot: { position: 'absolute', top: -8, width: 32, height: 3, backgroundColor: Colors.blue, borderRadius: 99 },
})
