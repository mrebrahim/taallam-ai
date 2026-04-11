import { Redirect } from 'expo-router'
import { useAuth } from '@/hooks/useAuth'
import { View, ActivityIndicator } from 'react-native'
import { Colors } from '@/constants/Colors'

export default function Index() {
  const { session, loading } = useAuth()

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.bg }}>
        <ActivityIndicator size="large" color={Colors.green} />
      </View>
    )
  }

  return session ? <Redirect href="/(tabs)/home" /> : <Redirect href="/(auth)/login" />
}
