// Analytics wrapper using Expo/React Native compatible approach
// Firebase Analytics requires native setup - using graceful fallback

type EventParams = Record<string, string | number | boolean>

// Simple event queue for debugging
const eventLog: Array<{ name: string; params?: EventParams; time: string }> = []

const track = (name: string, params?: EventParams) => {
  const entry = { name, params, time: new Date().toISOString() }
  eventLog.push(entry)
  if (__DEV__) {
    console.log(`[Analytics] ${name}`, params || '')
  }
  // TODO: When Firebase is properly set up with native modules,
  // uncomment the code below and run: npx expo prebuild
  //
  // import analytics from '@react-native-firebase/analytics'
  // analytics().logEvent(name, params)
}

export const Analytics = {
  // Auth
  login:             (method: string) => track('login', { method }),
  signup:            (method: string) => track('sign_up', { method }),
  logout:            () => track('logout'),

  // Learning
  lessonStart:       (lessonId: string, title: string) => track('lesson_start', { lesson_id: lessonId, lesson_title: title }),
  lessonComplete:    (lessonId: string, xp: number) => track('lesson_complete', { lesson_id: lessonId, xp_earned: xp }),

  // Challenges
  challengeStart:    (challengeId: string) => track('challenge_start', { challenge_id: challengeId }),
  challengeCorrect:  (challengeId: string, xp: number) => track('challenge_correct', { challenge_id: challengeId, xp_earned: xp }),
  challengeWrong:    (challengeId: string) => track('challenge_wrong', { challenge_id: challengeId }),

  // Engagement
  streakUpdate:      (days: number) => track('streak_update', { streak_days: days }),
  xpEarned:          (amount: number, reason: string) => track('xp_earned', { xp_amount: amount, reason }),

  // Navigation
  screenView:        (screen: string) => track('screen_view', { screen_name: screen }),

  // Subscription
  enrollView:        (courseSlug: string) => track('course_enroll_view', { course_slug: courseSlug }),

  // Language
  langSelect:        (lang: string) => track('language_selected', { language: lang }),

  // User
  identify:          (userId: string) => track('user_identified', { user_id: userId }),
  reset:             () => track('user_reset'),

  // Debug
  getLog:            () => eventLog,
}
