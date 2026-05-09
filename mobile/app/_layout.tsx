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
  const isLoggedIn = useRef(false)

  const hideSplash = useCallback(async () => {
    if (splashHidden.current) return
    splashHidden.current = true
    try { await SplashScreen.hideAsync() } catch {}
  }, [])

  // Auth state listener
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session) {
        if (!isLoggedIn.current) {
          isLoggedIn.current = true
          hideSplash()
          router.replace('/(tabs)/home')
        }
      } else if (event === 'SIGNED_OUT') {
        isLoggedIn.current = false
        router.replace('/(auth)/login')
      } else if (event === 'USER_UPDATED' && session && !isLoggedIn.current) {
        isLoggedIn.current = true
        hideSplash()
        router.replace('/(tabs)/home')
      }
    })
    return () => subscription.unsubscribe()
  }, [hideSplash])

  // Initial navigation
  useEffect(() => {
    if (loading || initDone.current) return
    initDone.current = true

    const init = async () => {
      if (!chosen) { hideSplash(); router.replace('/lang'); return }
      const { data: { session } } = await supabase.auth.getSession()
      if (session) {
        isLoggedIn.current = true
        hideSplash()
        router.replace('/(tabs)/home')
      } else {
        hideSplash()
        router.replace('/(auth)/login')
      }
    }
    init()
  }, [loading, chosen, hideSplash])

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0f172a' }}>
        <ActivityIndicator color={Colors.green} size="large" />
      </View>
    )
  }

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
