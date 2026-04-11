import { useEffect } from 'react'
import * as Notifications from 'expo-notifications'
import * as Device from 'expo-device'
import { Platform } from 'react-native'
import { supabase } from '@/lib/supabase'

// Configure how notifications appear when app is foregrounded
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
})

export async function registerForPushNotifications(userId: string) {
  if (!Device.isDevice) return null

  // Request permission
  const { status: existing } = await Notifications.getPermissionsAsync()
  let finalStatus = existing
  if (existing !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync()
    finalStatus = status
  }
  if (finalStatus !== 'granted') return null

  // Get Expo push token
  const token = (await Notifications.getExpoPushTokenAsync({
    projectId: 'your-expo-project-id', // Replace with actual Expo project ID
  })).data

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#58CC02',
    })
  }

  // Save token to Supabase
  if (token) {
    await supabase.from('push_tokens').upsert({
      user_id: userId,
      token,
      platform: Platform.OS,
    }, { onConflict: 'user_id,token' })
  }

  return token
}

// Schedule local streak reminder
export async function scheduleStreakReminder() {
  await Notifications.cancelAllScheduledNotificationsAsync()
  
  // Schedule daily at 8 PM
  await Notifications.scheduleNotificationAsync({
    content: {
      title: '🦉 إيه أخبارك؟',
      body: 'تعال تعلم حاجة جديدة النهارده! 📚',
      sound: true,
      badge: 1,
    },
    trigger: {
      hour: 20,
      minute: 0,
      repeats: true,
    } as any,
  })
}
