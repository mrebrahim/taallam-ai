import { useEffect, useState } from 'react'
import { Stack } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import * as SplashScreen from 'expo-splash-screen'
import { loadLang } from '@/lib/i18n'
import { router } from 'expo-router'
import AsyncStorage from '@react-native-async-storage/async-storage'

SplashScreen.preventAutoHideAsync()

export default function RootLayout() {
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const init = async () => {
      const { lang, chosen } = await loadLang()
      // Check auth session
      const { createClient } = await import('@/lib/supabase')

      // We just need to know if lang was chosen before
      // Navigation happens in index.tsx based on session
      setReady(true)
      await SplashScreen.hideAsync()
    }
    init()
  }, [])

  if (!ready) return null

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <StatusBar style="auto" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="lang" />
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="lesson/[id]" options={{ presentation: 'card' }} />
        <Stack.Screen name="sadaqat/index" options={{ headerShown: false }} />
        <Stack.Screen name="sadaqat/[id]" options={{ headerShown: false }} />
      </Stack>
    </GestureHandlerRootView>
  )
}
