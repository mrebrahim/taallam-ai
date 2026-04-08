'use client'
import type { SubscriptionPlan } from '@/types'

export function useSubscription(plan: SubscriptionPlan) {
  const isPro = plan === 'pro' || plan === 'elite'
  const isElite = plan === 'elite'
  const isFree = plan === 'free'

  const xpMultiplier = isPro ? 2 : 1

  const canAccess = (requiredPlan: SubscriptionPlan): boolean => {
    if (requiredPlan === 'free') return true
    if (requiredPlan === 'pro') return isPro
    if (requiredPlan === 'elite') return isElite
    return false
  }

  return { isPro, isElite, isFree, xpMultiplier, canAccess }
}
