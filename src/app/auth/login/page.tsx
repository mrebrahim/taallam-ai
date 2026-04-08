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

      <style jsx global>{`
        .auth-page {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background: var(--color-background-tertiary);
          padding: 24px;
          font-family: var(--font-sans);
        }
        .auth-card {
          background: var(--color-background-primary);
          border: 1px solid var(--color-border-tertiary);
          border-radius: 20px;
          padding: 40px 32px;
          width: 100%;
          max-width: 400px;
        }
        .auth-logo {
          text-align: center;
          margin-bottom: 32px;
        }
        .auth-logo-icon {
          width: 56px; height: 56px;
          background: #7F77DD;
          color: #fff;
          font-size: 24px;
          font-weight: 700;
          border-radius: 16px;
          display: flex; align-items: center; justify-content: center;
          margin: 0 auto 12px;
        }
        .auth-logo h1 {
          font-size: 22px;
          font-weight: 600;
          color: var(--color-text-primary);
          margin: 0 0 4px;
        }
        .auth-logo p {
          font-size: 14px;
          color: var(--color-text-secondary);
          margin: 0;
        }
        .auth-social {
          display: flex;
          flex-direction: column;
          gap: 10px;
          margin-bottom: 20px;
        }
        .social-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          width: 100%;
          padding: 11px 16px;
          border-radius: 10px;
          border: 1px solid var(--color-border-secondary);
          background: var(--color-background-primary);
          color: var(--color-text-primary);
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: background 0.15s;
        }
        .social-btn:hover { background: var(--color-background-secondary); }
        .social-btn:disabled { opacity: 0.6; cursor: not-allowed; }
        .social-btn-dark {
          background: #000;
          color: #fff;
          border-color: #000;
        }
        .social-btn-dark:hover { background: #222; }
        .auth-divider {
          display: flex;
          align-items: center;
          gap: 12px;
          margin: 16px 0;
          color: var(--color-text-tertiary);
          font-size: 12px;
        }
        .auth-divider::before,
        .auth-divider::after {
          content: '';
          flex: 1;
          height: 1px;
          background: var(--color-border-tertiary);
        }
        .auth-form {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        .auth-input {
          width: 100%;
          padding: 11px 14px;
          border: 1px solid var(--color-border-secondary);
          border-radius: 10px;
          background: var(--color-background-secondary);
          color: var(--color-text-primary);
          font-size: 14px;
          outline: none;
          box-sizing: border-box;
          text-align: right;
        }
        .auth-input:focus { border-color: #7F77DD; }
        .auth-submit {
          width: 100%;
          padding: 12px;
          border-radius: 10px;
          border: none;
          background: #7F77DD;
          color: #fff;
          font-size: 15px;
          font-weight: 600;
          cursor: pointer;
          margin-top: 4px;
          transition: opacity 0.15s;
        }
        .auth-submit:hover { opacity: 0.9; }
        .auth-submit:disabled { opacity: 0.6; cursor: not-allowed; }
        .auth-error {
          color: #A32D2D;
          font-size: 13px;
          margin: 0;
          text-align: center;
        }
        .auth-success {
          color: #0F6E56;
          font-size: 13px;
          margin: 0;
          text-align: center;
        }
        .auth-switch {
          text-align: center;
          margin: 20px 0 0;
          font-size: 14px;
          color: var(--color-text-secondary);
        }
        .auth-switch a {
          color: #7F77DD;
          font-weight: 500;
          text-decoration: none;
        }
      `}</style>
    </main>
  )
}
