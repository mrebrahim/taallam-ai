'use client'
import { useState } from 'react'
import type { SubscriptionPlan } from '@/types'

interface CheckoutButtonProps {
  plan: SubscriptionPlan
  label: string
  className?: string
  disabled?: boolean
}

export function CheckoutButton({ plan, label, className = '', disabled = false }: CheckoutButtonProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleCheckout = async () => {
    if (plan === 'free') return
    setLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan }),
      })

      const data = await res.json()

      if (!res.ok || !data.url) {
        setError(data.error || 'حصل خطأ، حاول تاني')
        return
      }

      // Redirect to Stripe Checkout
      window.location.href = data.url

    } catch {
      setError('حصل خطأ في الاتصال')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <button
        onClick={handleCheckout}
        disabled={loading || disabled}
        className={className}
      >
        {loading ? 'جاري التحميل...' : label}
      </button>
      {error && (
        <p style={{ color: 'var(--color-text-danger)', fontSize: '13px', marginTop: '8px', textAlign: 'center' }}>
          {error}
        </p>
      )}
    </div>
  )
}
