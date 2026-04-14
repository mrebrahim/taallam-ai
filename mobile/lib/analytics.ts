// Firebase Analytics wrapper
// Works gracefully if Firebase isn't configured yet

let analytics: any = null

const initAnalytics = async () => {
  try {
    const firebaseAnalytics = await import('@react-native-firebase/analytics')
    analytics = firebaseAnalytics.default()
    return analytics
  } catch (e) {
    // Firebase not configured yet - silent fail
    return null
  }
}

// Initialize on first use
initAnalytics()

export const logEvent = async (name: string, params?: Record<string, any>) => {
  try {
    const a = analytics || await initAnalytics()
    if (a) await a.logEvent(name, params)
  } catch {}
}

export const logScreenView = async (screenName: string) => {
  try {
    const a = analytics || await initAnalytics()
    if (a) await a.logScreenView({ screen_name: screenName, screen_class: screenName })
  } catch {}
}

export const setUserId = async (userId: string | null) => {
  try {
    const a = analytics || await initAnalytics()
    if (a) await a.setUserId(userId)
  } catch {}
}

export const setUserProperty = async (name: string, value: string) => {
  try {
    const a = analytics || await initAnalytics()
    if (a) await a.setUserProperty(name, value)
  } catch {}
}

// Taallam-specific events
export const Analytics = {
  // Auth
  login:          (method: string) => logEvent('login', { method }),
  signup:         (method: string) => logEvent('sign_up', { method }),
  logout:         () => logEvent('logout'),

  // Learning
  lessonStart:    (lessonId: string, title: string) => logEvent('lesson_start', { lesson_id: lessonId, lesson_title: title }),
  lessonComplete: (lessonId: string, xp: number) => logEvent('lesson_complete', { lesson_id: lessonId, xp_earned: xp }),
  
  // Challenges
  challengeStart:    (challengeId: string) => logEvent('challenge_start', { challenge_id: challengeId }),
  challengeCorrect:  (challengeId: string, xp: number) => logEvent('challenge_correct', { challenge_id: challengeId, xp_earned: xp }),
  challengeWrong:    (challengeId: string) => logEvent('challenge_wrong', { challenge_id: challengeId }),

  // Engagement
  streakUpdate:   (days: number) => logEvent('streak_update', { streak_days: days }),
  xpEarned:       (amount: number, reason: string) => logEvent('xp_earned', { xp_amount: amount, reason }),
  
  // Navigation
  screenView:     (screen: string) => logScreenView(screen),
  
  // Subscription
  enrollView:     (courseSlug: string) => logEvent('course_enroll_view', { course_slug: courseSlug }),
  enrollStart:    (courseSlug: string) => logEvent('begin_checkout', { course_slug: courseSlug }),

  // Language
  langSelect:     (lang: string) => logEvent('language_selected', { language: lang }),

  // Set user
  identify:       (userId: string) => setUserId(userId),
  reset:          () => setUserId(null),
}
