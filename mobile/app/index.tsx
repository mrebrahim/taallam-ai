import { View, ActivityIndicator } from 'react-native'
import { Colors } from '@/constants/Colors'

export default function Index() {
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0f172a' }}>
      <ActivityIndicator color={Colors.green} size="large" />
    </View>
  )
}
