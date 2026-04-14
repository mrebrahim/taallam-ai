import { useEffect } from 'react'
import { View, ActivityIndicator } from 'react-native'
import { router } from 'expo-router'
import { supabase } from '@/lib/supabase'
import { Colors } from '@/constants/Colors'

export default function AuthCallback() {
  useEffect(() => {
    const handleCallback = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (session) {
        router.replace('/(tabs)/home')
      } else {
        router.replace('/(auth)/login')
      }
    }
    setTimeout(handleCallback, 1000)
  }, [])

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0f172a' }}>
      <ActivityIndicator color={Colors.green} size="large" />
    </View>
  )
}
