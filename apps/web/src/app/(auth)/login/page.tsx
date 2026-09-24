'use client'

import React, { useState, useEffect, Suspense } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { SocialAuthButtons } from '@/features/auth/components/SocialAuthButtons'
import { AuthMarketingPanel } from '@/features/auth/components/AuthMarketingPanel'
import { Eye, EyeOff, Loader2, CheckCircle2, AlertCircle } from 'lucide-react'
import { apiClient } from '@/lib/api-client'

function LoginContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { signIn, resendVerification, error, clearError } = useAuth()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isResending, setIsResending] = useState(false)
  const [localError, setLocalError] = useState<string | null>(null)
  const [resendNotice, setResendNotice] = useState<string | null>(null)
  const [unconfirmedEmail, setUnconfirmedEmail] = useState<string | null>(null)
  const [verifiedBanner, setVerifiedBanner] = useState(false)
  const [googleRegisteredBanner, setGoogleRegisteredBanner] = useState(false)
  const [alreadyRegisteredBanner, setAlreadyRegisteredBanner] = useState(false)

  useEffect(() => {
    clearError()
    setLocalError(null)
    const qEmail = searchParams.get('email')
    const qVerified = searchParams.get('verified')
    const qGoogleRegistered = searchParams.get('google_registered')
    const qReason = searchParams.get('reason')
    const qToken = searchParams.get('token') || searchParams.get('invite_token')
    if (qToken && typeof window !== 'undefined') {
      localStorage.setItem('tf_invite_token', qToken)
    }
    if (qEmail) {
      setEmail(qEmail)
    }
    if (qVerified === 'true') {
      setVerifiedBanner(true)
    }
    if (qGoogleRegistered === 'true') {
      setGoogleRegisteredBanner(true)
    }
    if (qReason === 'already_registered') {
      setAlreadyRegisteredBanner(true)
    }
  }, [searchParams, clearError])

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (isSubmitting) return

    setLocalError(null)
    clearError()
    setResendNotice(null)
    setUnconfirmedEmail(null)

    const cleanEmail = email.trim().toLowerCase()
    if (!cleanEmail) {
      setLocalError('Please enter your email address.')
      return
    }

    if (!cleanEmail.includes('@') || !cleanEmail.includes('.')) {
      setLocalError('Please enter a valid email address.')
      return
    }

    if (!password) {
      setLocalError('Please enter your password.')
      return
    }

    setIsSubmitting(true)

    try {
      // 1. First check if user exists
      const checkRes = await apiClient.get<{ email: string; exists: boolean }>(
        `/api/v1/auth/check-user?email=${encodeURIComponent(cleanEmail)}`
      )

      const activeInviteToken =
        searchParams.get('token') ||
        searchParams.get('invite_token') ||
        (typeof window !== 'undefined' ? localStorage.getItem('tf_invite_token') : null)

      if (!checkRes.data?.exists) {
        // User does not exist -> redirect to signup / register page
        const invParam = activeInviteToken ? `&invite_token=${encodeURIComponent(activeInviteToken)}` : ''
        router.push(`/register?email=${encodeURIComponent(cleanEmail)}&reason=not_found${invParam}`)
        return
      }

      await signIn({
        email: cleanEmail,
        password,
      })

      // Store active invite token in localStorage so in-app onboarding wizard asks for referral code
      if (activeInviteToken && typeof window !== 'undefined') {
        localStorage.setItem('tf_invite_token', activeInviteToken)
      }

      // 3. Valid credentials -> take inside
      router.push('/app/home')
    } catch (err: any) {
      const errMsg = err.message || ''
      if (errMsg.toLowerCase().includes('verify your email')) {
        setUnconfirmedEmail(cleanEmail)
      } else {
        setLocalError(errMsg || 'Invalid email or password.')
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleResendForUnverified = async () => {
    if (!unconfirmedEmail || isResending) return
    setIsResending(true)
    setResendNotice(null)
    try {
      await resendVerification(unconfirmedEmail)
      setResendNotice('Verification email sent! Check your inbox.')
    } catch (err: any) {
      setResendNotice(err.message || 'Failed to resend verification email.')
    } finally {
      setIsResending(false)
    }
  }

  const displayedError = localError || error

  return (
    <div className="min-h-screen flex bg-background">
      {/* Left Column: Sign In Form */}
      <div className="flex-1 flex flex-col justify-center px-4 sm:px-6 lg:px-12 py-8 max-w-xl mx-auto w-full">
        <div className="w-full space-y-5">
          {/* Header */}
          <div className="space-y-1">
            <h1 className="text-xl font-bold tracking-tight text-foreground">
              Sign in to TaskFlow
            </h1>
            <p className="text-xs text-muted-foreground">
              Welcome back. Access your workspaces, tasks, and team projects.
            </p>
          </div>

          {/* Social Auth (Google via Supabase OAuth) */}
          <SocialAuthButtons mode="signin" email={email} />

          {/* Divider */}
          <div className="relative my-2">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-[10px] uppercase">
              <span className="bg-background px-3 text-muted-foreground font-semibold tracking-wider">
                Or continue with email
              </span>
            </div>
          </div>

          {/* Verified Email Banner */}
          {verifiedBanner && (
            <div className="flex items-center gap-2 p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-medium">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>Email verified successfully! Please enter your password to sign in.</span>
            </div>
          )}

          {/* Google Registered Banner */}
          {googleRegisteredBanner && (
            <div className="flex items-center gap-2 p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-medium">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>Google account created successfully! Click Continue with Google to sign in.</span>
            </div>
          )}

          {/* Already Registered Banner */}
          {alreadyRegisteredBanner && (
            <div className="flex items-center gap-2 p-3.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-600 dark:text-blue-400 text-xs font-medium">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>An account with this Google email already exists. Please sign in below.</span>
            </div>
          )}

          {/* Unverified Email Warning Banner with Resend Button */}
          {unconfirmedEmail && (
            <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-400 text-xs space-y-2">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="font-semibold">Email verification required</p>
                  <p className="text-[11px] text-amber-700/80 dark:text-amber-400/80">
                    Your email address has not been verified yet. Please check your inbox for the
                    verification link, or request a new one below.
                  </p>
                </div>
              </div>
              <div className="pt-1 flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleResendForUnverified}
                  disabled={isResending}
                  className="px-3 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-800 dark:text-amber-300 font-semibold text-[11px] transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {isResending ? (
                    <>
                      <Loader2 className="w-3 h-3 animate-spin" />
                      Sending link...
                    </>
                  ) : (
                    'Resend verification email'
                  )}
                </button>
                {resendNotice && (
                  <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
                    {resendNotice}
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Error Banner */}
          {displayedError && !unconfirmedEmail && (
            <div className="flex items-start gap-2.5 p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <div className="space-y-0.5">
                <p className="font-semibold">{displayedError}</p>
              </div>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleLoginSubmit} className="space-y-3">
            {/* Email Field */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-foreground" htmlFor="email">
                Email address
              </label>
              <input
                id="email"
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value)
                  setLocalError(null)
                  clearError()
                  setUnconfirmedEmail(null)
                }}
                className="flex h-10 w-full rounded-xl border border-border bg-background px-3 py-1.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary transition-all shadow-inner"
                autoComplete="email"
              />
            </div>

            {/* Password Field */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-foreground" htmlFor="password">
                  Password
                </label>
                <Link
                  href="/forgot-password"
                  className="text-[11px] text-primary hover:underline font-medium"
                >
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value)
                    setLocalError(null)
                    clearError()
                    setUnconfirmedEmail(null)
                  }}
                  className="flex h-10 w-full rounded-xl border border-border bg-background pl-3 pr-10 py-1.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary transition-all shadow-inner"
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
              id="signin-submit-btn"
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

          {/* Switch to Signup / Create Account */}
          <div className="pt-2 space-y-2.5">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-border/50" />
              </div>
              <div className="relative flex justify-center text-[10px] uppercase">
                <span className="bg-background px-3 text-muted-foreground font-medium tracking-wider">
                  New to TaskFlow?
                </span>
              </div>
            </div>

            <Link
              id="create-account-btn"
              href={
                searchParams.get('token') || searchParams.get('invite_token')
                  ? `/register?invite_token=${encodeURIComponent(
                      (searchParams.get('token') || searchParams.get('invite_token'))!
                    )}`
                  : '/register'
              }
              className="w-full h-10 rounded-xl border border-primary/35 hover:border-primary/70 bg-primary/5 hover:bg-primary/10 text-primary font-bold text-xs transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm hover:shadow active:scale-98"
            >
              Create account
            </Link>

            <p className="text-center text-xs text-muted-foreground pt-0.5">
              Don&apos;t have a TaskFlow account?{' '}
              <Link
                href={
                  searchParams.get('token') || searchParams.get('invite_token')
                    ? `/register?invite_token=${encodeURIComponent(
                        (searchParams.get('token') || searchParams.get('invite_token'))!
                      )}`
                    : '/register'
                }
                className="text-primary font-bold hover:underline"
              >
                Sign up
              </Link>
            </p>
          </div>
        </div>
      </div>

      {/* Right Column: Visual Brand Panel */}
      <AuthMarketingPanel />
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      }
    >
      <LoginContent />
    </Suspense>
  )
}
