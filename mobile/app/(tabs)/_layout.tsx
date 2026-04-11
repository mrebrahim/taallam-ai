import { Tabs } from 'expo-router'
import { View, Text, StyleSheet, Platform } from 'react-native'
import { Colors } from '@/constants/Colors'
import { useAuth } from '@/hooks/useAuth'
import { Redirect } from 'expo-router'

function TabIcon({ emoji, label, focused }: { emoji: string; label: string; focused: boolean }) {
  return (
    <View style={styles.tabItem}>
      {focused && <View style={styles.indicator} />}
      <Text style={styles.tabEmoji}>{emoji}</Text>
      <Text style={[styles.tabLabel, focused && styles.tabLabelActive]}>{label}</Text>
    </View>
  )
}

export default function TabsLayout() {
  const { session, loading } = useAuth()
  if (!loading && !session) return <Redirect href="/(auth)/login" />

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: styles.tabBar,
        tabBarShowLabel: false,
      }}
    >
      <Tabs.Screen name="home" options={{
        tabBarIcon: ({ focused }) => <TabIcon emoji="🏠" label="الرئيسية" focused={focused} />
      }} />
      <Tabs.Screen name="learn" options={{
        tabBarIcon: ({ focused }) => <TabIcon emoji="📚" label="التعلم" focused={focused} />
      }} />
      <Tabs.Screen name="challenges" options={{
        tabBarIcon: ({ focused }) => <TabIcon emoji="⚔️" label="التحديات" focused={focused} />
      }} />
      <Tabs.Screen name="leaderboard" options={{
        tabBarIcon: ({ focused }) => <TabIcon emoji="🏆" label="الترتيب" focused={focused} />
      }} />
      <Tabs.Screen name="profile" options={{
        tabBarIcon: ({ focused }) => <TabIcon emoji="👤" label="ملفي" focused={focused} />
      }} />
    </Tabs>
  )
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: '#fff',
    borderTopWidth: 2,
    borderTopColor: Colors.border,
    height: Platform.OS === 'ios' ? 84 : 65,
    paddingBottom: Platform.OS === 'ios' ? 20 : 8,
    paddingTop: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 10,
  },
  tabItem: { alignItems: 'center', gap: 3, position: 'relative' },
  indicator: {
    position: 'absolute',
    top: -8,
    width: 32,
    height: 3,
    borderRadius: 99,
    backgroundColor: Colors.blue,
  },
  tabEmoji: { fontSize: 22 },
  tabLabel: { fontSize: 10, color: '#aaa', fontWeight: '400' },
  tabLabelActive: { color: Colors.blue, fontWeight: '800' },
})
