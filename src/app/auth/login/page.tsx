'use client'
import { GoogleButton, AppleButton, AuthForm } from '@/components/auth'
import Link from 'next/link'

export default function LoginPage() {
  return (
    <main className="auth-page" dir="rtl">
      <div className="auth-card">

        {/* Logo */}
        <div className="auth-logo">
          <div className="auth-logo-icon">T</div>
          <h1>Taallam AI</h1>
          <p>ابدأ رحلة التعلم اليومية</p>
        </div>

        {/* Social Buttons */}
        <div className="auth-social">
          <GoogleButton label="الدخول بـ Google" />
          <AppleButton label="الدخول بـ Apple" />
        </div>

        {/* Divider */}
        <div className="auth-divider">
          <span>أو بالبريد الإلكتروني</span>
        </div>

        {/* Email form */}
        <AuthForm mode="login" />

        {/* Switch to signup */}
        <p className="auth-switch">
          مالكش حساب؟{' '}
          <Link href="/auth/signup">سجل دلوقتي</Link>
        </p>
      </div>
    </main>
  )
}
