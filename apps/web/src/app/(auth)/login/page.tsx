'use client'

import React, { useState, useEffect, Suspense } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuthStore } from '@/stores/auth-store'
import { SocialAuthButtons } from '@/features/auth/components/SocialAuthButtons'
import { AuthMarketingPanel } from '@/features/auth/components/AuthMarketingPanel'
import { Eye, EyeOff, Loader2, Zap, CheckCircle2, AlertCircle } from 'lucide-react'

function LoginContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { login, checkUser, error, clearError } = useAuthStore()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [verifiedBanner, setVerifiedBanner] = useState(false)
  const [redirectNotice, setRedirectNotice] = useState<string | null>(null)

  useEffect(() => {
    clearError()
    const qEmail = searchParams.get('email')
    const qVerified = searchParams.get('verified')
    const qRegistered = searchParams.get('registered')
    const qReason = searchParams.get('reason')
    if (qEmail) {
      setEmail(qEmail)
    }
    if (qVerified === 'true' || qRegistered === 'google') {
      setVerifiedBanner(true)
    }
    if (qReason === 'google_not_found') {
      setRedirectNotice('No TaskFlow account was found for that Google account. Please create an account below.')
    }
  }, [searchParams, clearError])

  const handleLoginSubmit = async (emailToUse: string, passwordToUse: string) => {
    if (!emailToUse || !passwordToUse) return
    setIsSubmitting(true)
    clearError()
    setRedirectNotice(null)

    // Check if user exists in database first
    try {
      const exists = await checkUser(emailToUse)
      if (!exists) {
        setIsSubmitting(false)
        setRedirectNotice('No account found for this email. Redirecting you to sign up...')
        setTimeout(() => {
          router.push(`/register?email=${encodeURIComponent(emailToUse)}&reason=not_found`)
        }, 1200)
        return
      }
    } catch {
      // Non-fatal, proceed with login attempt
    }

    try {
      await login(emailToUse, passwordToUse)
      router.push('/app/home')
      setTimeout(() => {
        if (window.location.pathname.includes('login')) {
          window.location.href = '/app/home'
        }
      }, 400)
    } catch (err: any) {
      setIsSubmitting(false)
      const msg = err?.response?.data?.error?.message || err?.message || ''
      const status = err?.response?.status || err?.response?.data?.error?.status
      if (status === 404 || msg.includes('No account found')) {
        setRedirectNotice('No account found for this email. Redirecting you to sign up...')
        setTimeout(() => {
          router.push(`/register?email=${encodeURIComponent(emailToUse)}&reason=not_found`)
        }, 1200)
      }
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    handleLoginSubmit(email, password)
  }

  return (
    <div className="h-screen max-h-screen w-full flex bg-background overflow-hidden select-none">
      {/* Left — Brand Value Proposition Panel (Differentiated Sign In Variant) */}
      <AuthMarketingPanel variant="signin" />

      {/* Right — Login form */}
      <main className="flex-1 h-full flex items-center justify-center p-4 sm:p-6 lg:p-8 overflow-y-auto lg:overflow-hidden">
        <div className="w-full max-w-[420px] space-y-4 my-auto">
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-2.5 justify-center mb-1">
            <div className="w-8 h-8 rounded-xl bg-primary flex items-center justify-center text-primary-foreground shadow-md shadow-primary/25">
              <Zap className="w-4 h-4" />
            </div>
            <span className="text-xl font-black tracking-tight text-foreground">TaskFlow</span>
          </div>

          {/* Heading */}
          <div className="space-y-1 text-center lg:text-left">
            <h1 className="text-2xl xl:text-[26px] font-extrabold tracking-tight text-foreground">
              Welcome back
            </h1>
            <p className="text-xs text-muted-foreground">
              Sign in to continue to TaskFlow.
            </p>
          </div>

          {/* Google & Microsoft Social Authentication */}
          <SocialAuthButtons mode="signin" email={email} />

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-3.5">
            {verifiedBanner && (
              <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/30 p-2.5 text-xs text-emerald-600 animate-fade-in font-semibold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                <span>Email verified successfully! Please enter your password to sign in.</span>
              </div>
            )}

            {redirectNotice && (
              <div className="rounded-xl bg-amber-500/10 border border-amber-500/30 p-2.5 text-xs text-amber-500 animate-fade-in font-medium flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-amber-500" />
                <span>{redirectNotice}</span>
              </div>
            )}

            {error && (
              <div className="rounded-xl bg-destructive/10 border border-destructive/20 p-2.5 text-xs text-destructive animate-fade-in font-medium flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Email Field */}
            <div className="space-y-1">
              <label htmlFor="email" className="text-xs font-semibold text-foreground">
                Email address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                placeholder="name@example.com"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value)
                  clearError()
                }}
                className="flex h-10 w-full rounded-xl border border-border bg-background px-3 py-1.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary transition-all shadow-inner"
                required
                autoComplete="email"
              />
            </div>

            {/* Password Field */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label htmlFor="password" className="text-xs font-semibold text-foreground">
                  Password
                </label>
                <Link
                  href="/forgot-password"
                  className="text-[11px] text-muted-foreground hover:text-primary transition-colors"
                >
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value)
                    clearError()
                  }}
                  className="flex h-10 w-full rounded-xl border border-border bg-background pl-3 pr-10 py-1.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary transition-all shadow-inner"
                  required
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Primary CTA */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full h-10 rounded-xl bg-primary text-primary-foreground font-bold text-xs hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 shadow-md shadow-primary/25 active:scale-98 cursor-pointer mt-1"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Signing in...
                </>
              ) : (
                'Sign in'
              )}
            </button>
          </form>

          {/* Switch to Signup */}
          <p className="text-center text-xs text-muted-foreground pt-0.5">
            Don&apos;t have a TaskFlow account?{' '}
            <Link href="/register" className="text-primary font-bold hover:underline">
              Create account
            </Link>
          </p>
        </div>
      </main>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="h-screen w-full flex items-center justify-center bg-background">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      }
    >
      <LoginContent />
    </Suspense>
  )
}
