'use client'
import { GoogleButton, AppleButton, AuthForm } from '@/components/auth'
import Link from 'next/link'

export default function SignupPage() {
  return (
    <main className="auth-page" dir="rtl">
      <div className="auth-card">
        <div className="auth-logo">
          <div className="auth-logo-icon">T</div>
          <h1>انضم لـ Taallam AI</h1>
          <p>ابدأ مجاناً — لا بطاقة مطلوبة</p>
        </div>

        <div className="auth-social">
          <GoogleButton label="التسجيل بـ Google" />
          <AppleButton label="التسجيل بـ Apple" />
        </div>

        <div className="auth-divider">
          <span>أو بالبريد الإلكتروني</span>
        </div>

        <AuthForm mode="signup" />

        <p className="auth-switch">
          عندك حساب؟{' '}
          <Link href="/auth/login">سجل الدخول</Link>
        </p>
      </div>
    </main>
  )
}
