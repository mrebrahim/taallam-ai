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

  const hideSplash = useCallback(async () => {
    if (splashHidden.current) return
    splashHidden.current = true
    try { await SplashScreen.hideAsync() } catch {}
  }, [])

  const goToHome = useCallback(() => {
    hideSplash()
    router.replace('/(tabs)/home')
  }, [hideSplash])

  const goToLogin = useCallback(() => {
    hideSplash()
    router.replace('/(auth)/login')
  }, [hideSplash])

  const goToLang = useCallback(() => {
    hideSplash()
    router.replace('/lang')
  }, [hideSplash])

  // Auth state listener — fires on ANY auth change including OTP verify
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session) {
        goToHome()
      } else if (event === 'SIGNED_OUT') {
        goToLogin()
      } else if (event === 'USER_UPDATED' && session) {
        goToHome()
      }
    })
    return () => subscription.unsubscribe()
  }, [goToHome, goToLogin])

  // Initial navigation
  useEffect(() => {
    if (loading || initDone.current) return
    initDone.current = true

    const init = async () => {
      if (!chosen) { goToLang(); return }
      const { data: { session } } = await supabase.auth.getSession()
      if (session) { goToHome() } else { goToLogin() }
    }
    init()
  }, [loading, chosen])

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0f172a' }}>
        <ActivityIndicator color={Colors.green} size="large" />
      </View>
    )
  }

  return (
    <Stack screenOptions={{ headerShown: false, animation: 'fade' }}>
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
