import { useEffect, useRef, useCallback } from 'react'
import { Stack, router } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import * as SplashScreen from 'expo-splash-screen'
import { LangProvider, useLang } from '@/lib/LanguageContext'
import { supabase } from '@/lib/supabase'
import { View, ActivityIndicator } from 'react-native'
import { Colors } from '@/constants/Colors'

SplashScreen.preventAutoHideAsync()

function AppNavigator() {
  const { loading, chosen } = useLang()
  const splashHidden = useRef(false)
  const initDone = useRef(false)
  const navigated = useRef(false)

  const hideSplash = useCallback(async () => {
    if (splashHidden.current) return
    splashHidden.current = true
    try { await SplashScreen.hideAsync() } catch {}
  }, [])

  const navigateOnce = useCallback((dest: string) => {
    if (navigated.current) { hideSplash(); return }
    navigated.current = true
    hideSplash()
    router.replace(dest as any)
  }, [hideSplash])

  // Only listen to SIGNED_OUT to handle logout
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') {
        navigated.current = false
        router.replace('/(auth)/login')
      } else if (event === 'SIGNED_IN' && session && !navigated.current) {
        navigateOnce('/(tabs)/home')
      }
    })
    return () => subscription.unsubscribe()
  }, [navigateOnce])

  // Initial navigation
  useEffect(() => {
    if (loading || initDone.current) return
    initDone.current = true
    const init = async () => {
      if (!chosen) { navigateOnce('/lang'); return }
      const { data: { session } } = await supabase.auth.getSession()
      if (session) { navigateOnce('/(tabs)/home') }
      else { navigateOnce('/(auth)/login') }
    }
    init()
  }, [loading, chosen, navigateOnce])

  if (loading) return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0f172a' }}>
      <ActivityIndicator color={Colors.green} size="large" />
    </View>
  )

  return (
    <Stack screenOptions={{ headerShown: false, animation: 'none' }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="lang" />
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="auth/callback" />
      <Stack.Screen name="courses" />
      <Stack.Screen name="challenge/[id]" />
      <Stack.Screen name="task/[id]" />
      <Stack.Screen name="course/[slug]" />
      <Stack.Screen name="lesson/[id]" options={{ presentation: 'card', animation: 'slide_from_right' }} />
      <Stack.Screen name="sadaqat/index" />
      <Stack.Screen name="sadaqat/[id]" />
      <Stack.Screen name="store" />
    </Stack>
  )
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <StatusBar style="light" />
      <LangProvider>
        <AppNavigator />
      </LangProvider>
    </GestureHandlerRootView>
  )
}
