import { useEffect } from 'react'
import { Stack } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import * as SplashScreen from 'expo-splash-screen'
import { LangProvider, useLang } from '@/lib/LanguageContext'
import { router } from 'expo-router'
import { supabase } from '@/lib/supabase'
import { View, ActivityIndicator } from 'react-native'
import { Colors } from '@/constants/Colors'

SplashScreen.preventAutoHideAsync()

function AppNavigator() {
  const { loading, chosen } = useLang()

  useEffect(() => {
    if (loading) return

    const init = async () => {
      await SplashScreen.hideAsync()

      if (!chosen) {
        router.replace('/lang')
        return
      }

      const { data: { session } } = await supabase.auth.getSession()
      if (session) {
        router.replace('/(tabs)/home')
      } else {
        router.replace('/(auth)/login')
      }
    }
    init()

    // Listen to auth changes - navigate automatically on login/logout
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!chosen) return
      if (event === 'SIGNED_IN' && session) {
        router.replace('/(tabs)/home')
      } else if (event === 'SIGNED_OUT') {
        router.replace('/(auth)/login')
      }
    })

    return () => subscription.unsubscribe()
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
      <Stack.Screen name="courses" options={{ headerShown: false }} />
        <Stack.Screen name="challenge/[id]" options={{ headerShown: false }} />
        <Stack.Screen name="task/[id]" options={{ headerShown: false }} />
        <Stack.Screen name="course/[slug]" options={{ headerShown: false }} />
        <Stack.Screen name="lesson/[id]" options={{ presentation: 'card', animation: 'slide_from_right' }} />
      <Stack.Screen name="sadaqat/index" />
      <Stack.Screen name="sadaqat/[id]" />
      <Stack.Screen name="store" options={{ headerShown: false }} />
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
