'use client'
// Simple re-export — no Provider needed
export { useUser as useAuth } from '@/hooks/useUser'
export function AuthProvider({ children }: { children: React.ReactNode }) {
  return children as any
}
