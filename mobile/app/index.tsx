import { useEffect } from 'react'
import { View, ActivityIndicator } from 'react-native'
import { router } from 'expo-router'
import { supabase } from '@/lib/supabase'
import { loadLang } from '@/lib/i18n'
import { Colors } from '@/constants/Colors'

export default function Index() {
  useEffect(() => {
    const init = async () => {
      // Check if lang was chosen
      const { chosen } = await loadLang()

      if (!chosen) {
        // First time — show language selector
        router.replace('/lang')
        return
      }

      // Check auth session
      const { data: { session } } = await supabase.auth.getSession()
      if (session) {
        router.replace('/(tabs)/home')
      } else {
        router.replace('/(auth)/login')
      }
    }
    init()
  }, [])

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0f172a' }}>
      <ActivityIndicator color={Colors.green} size="large" />
    </View>
  )
}
