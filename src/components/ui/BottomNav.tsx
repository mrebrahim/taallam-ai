'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

const NAV_ITEMS = [
  { href: '/profile',     icon: '👤', label: 'ملفي'      },
  { href: '/leaderboard', icon: '🏆', label: 'الترتيب'   },
  { href: '/challenges',  icon: '⚔️',  label: 'التحديات' },
  { href: '/learn',       icon: '📚', label: 'التعلم'    },
  { href: '/home',        icon: '🏠', label: 'الرئيسية'  },
]

export default function BottomNav() {
  const pathname = usePathname()

  return (
    <nav style={{
      position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)',
      width: '100%', maxWidth: 480,
      background: 'var(--color-background-primary)',
      borderTop: '2px solid var(--color-border-tertiary)',
      display: 'flex', padding: '8px 0 16px', zIndex: 100,
      direction: 'ltr'  // Always LTR so icons stay in correct visual order
    }}>
      {NAV_ITEMS.map(n => {
        const active = pathname === n.href || (n.href !== '/home' && pathname?.startsWith(n.href))
        return (
          <Link key={n.href} href={n.href} style={{
            flex: 1, display: 'flex', flexDirection: 'column',
            alignItems: 'center', gap: 3, textDecoration: 'none', padding: '4px 0'
          }}>
            <span style={{ fontSize: 22 }}>{n.icon}</span>
            <span style={{
              fontSize: 10,
              color: active ? '#1CB0F6' : 'var(--color-text-tertiary)',
              fontWeight: active ? 700 : 400,
              fontFamily: 'var(--font-sans)'
            }}>{n.label}</span>
          </Link>
        )
      })}
    </nav>
  )
}
