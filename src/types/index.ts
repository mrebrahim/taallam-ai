// ═══════════════════════════════════════
// Taallam AI — Global Types
// ═══════════════════════════════════════

export type SubscriptionPlan = 'free' | 'pro' | 'elite'
export type RoadmapSlug = 'n8n_automation' | 'ai_video' | 'vibe_coding'
export type LessonType = 'video' | 'quiz' | 'task' | 'challenge'

// ── User ──
export interface User {
  id: string
  username: string
  full_name: string | null
  avatar_url: string | null
  subscription_plan: SubscriptionPlan
  subscription_expires_at: string | null
  xp_total: number
  coins_balance: number
  current_level: number
  streak_current: number
  streak_longest: number
  last_activity_date: string | null
  created_at: string
}

// ── Roadmap ──
export interface Roadmap {
  id: string
  slug: RoadmapSlug
  title: string
  title_ar: string
  description_ar: string | null
  cover_image_url: string | null
  color_hex: string
  total_xp: number
  certificate_title: string | null
  certificate_title_ar: string | null
  is_active: boolean
  sort_order: number
}

// ── Lesson ──
export interface Lesson {
  id: string
  roadmap_id: string
  title: string
  title_ar: string
  description_ar: string | null
  lesson_type: LessonType
  video_url: string | null
  video_duration_seconds: number | null
  xp_reward: number
  coins_reward: number
  sort_order: number
  is_free: boolean
}

// ── User Roadmap Progress ──
export interface UserRoadmapProgress {
  id: string
  user_id: string
  roadmap_id: string
  enrolled_at: string
  completed_at: string | null
  lessons_completed: number
  total_xp_earned: number
  certificate_issued: boolean
}

// ── Stripe Product ──
export interface StripeProduct {
  id: string
  stripe_product_id: string
  stripe_price_id: string
  name: string
  name_ar: string
  plan: SubscriptionPlan
  price_usd: number
  interval: 'month' | 'year'
  features_ar: string[]
}

// ── Leaderboard ──
export interface LeaderboardEntry {
  id: string
  user_id: string
  period_type: 'weekly' | 'monthly' | 'all_time'
  period_key: string
  xp_earned: number
  rank: number | null
  users: {
    username: string
    avatar_url: string | null
    current_level: number
  }
}

// ── Badge ──
export interface Badge {
  id: string
  slug: string
  title_ar: string
  description_ar: string | null
  icon_url: string | null
  category: 'streak' | 'level' | 'challenge' | 'roadmap' | 'special'
  xp_reward: number
  coins_reward: number
}

export interface UserBadge {
  id: string
  badge_id: string
  earned_at: string
  badges: Badge
}

// ── Level config ──
export const LEVELS = [
  { level: 1, name: 'Starter',       name_ar: 'مبتدئ',         xp_min: 0,    color: '#888780' },
  { level: 2, name: 'Learner',       name_ar: 'متعلم',         xp_min: 100,  color: '#1D9E75' },
  { level: 3, name: 'Achiever',      name_ar: 'محقق',          xp_min: 400,  color: '#378ADD' },
  { level: 4, name: 'Master',        name_ar: 'ماهر',          xp_min: 900,  color: '#7F77DD' },
  { level: 5, name: 'Legend',        name_ar: 'أسطورة',        xp_min: 1600, color: '#D85A30' },
  { level: 6, name: 'Ibrahim Elite', name_ar: 'Ibrahim Elite', xp_min: 2500, color: '#BA7517' },
]

export function getLevelInfo(xp: number) {
  for (let i = LEVELS.length - 1; i >= 0; i--) {
    if (xp >= LEVELS[i].xp_min) return LEVELS[i]
  }
  return LEVELS[0]
}

export function getXPToNextLevel(xp: number): number {
  const current = getLevelInfo(xp)
  const nextLevel = LEVELS.find(l => l.level === current.level + 1)
  if (!nextLevel) return 0
  return nextLevel.xp_min - xp
}
