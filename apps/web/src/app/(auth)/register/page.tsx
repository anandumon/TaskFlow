'use client'

import React, { useState, useEffect, Suspense } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { SocialAuthButtons } from '@/features/auth/components/SocialAuthButtons'
import { AuthMarketingPanel } from '@/features/auth/components/AuthMarketingPanel'
import { Eye, EyeOff, Loader2, ArrowLeft, AlertCircle } from 'lucide-react'

function RegisterContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { signUp, error, clearError } = useAuth()

  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
  })

  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [validationError, setValidationError] = useState<string | null>(null)
  const [notFoundNotice, setNotFoundNotice] = useState(false)
  const [googleNotFoundNotice, setGoogleNotFoundNotice] = useState(false)

  useEffect(() => {
    clearError()
    const qEmail = searchParams.get('email')
    const qName = searchParams.get('name')
    const qReason = searchParams.get('reason')
    if (qEmail) {
      setForm((prev) => ({ ...prev, email: qEmail }))
    }
    if (qName) {
      const parts = qName.trim().split(' ')
      setForm((prev) => ({
        ...prev,
        firstName: parts[0] || prev.firstName,
        lastName: parts.slice(1).join(' ') || prev.lastName,
      }))
    }
    if (qReason === 'not_found') {
      setNotFoundNotice(true)
    }
    if (qReason === 'google_not_registered') {
      setGoogleNotFoundNotice(true)
    }
  }, [searchParams, clearError])

  // Password criteria validation
  const passwordChecks = [
    { label: 'At least 8 characters', met: form.password.length >= 8 },
    { label: 'Contains a number or symbol', met: /[0-9!@#$%^&*(),.?":{}|<>]/.test(form.password) },
  ]
  const isPasswordValid = passwordChecks.every((c) => c.met)
  const passwordsMatch = form.password && form.password === form.confirmPassword

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setValidationError(null)
    clearError()

    if (!isPasswordValid) {
      setValidationError('Please choose a password meeting the security requirements.')
      return
    }

    if (!passwordsMatch) {
      setValidationError('Passwords do not match. Please re-enter your password.')
      return
    }

    try {
      setIsSubmitting(true)
      const res = await signUp({
        email: form.email,
        password: form.password,
        firstName: form.firstName,
        lastName: form.lastName,
      })

      // If signup created the user and requires email verification (session === null)
      if (res.requiresVerification || !res.session) {
        router.push(`/verify-email?email=${encodeURIComponent(form.email.trim())}`)
      } else {
        router.push('/app/home')
      }
    } catch {
      // Error handled by useAuth hook and exposed via error
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen flex bg-background">
      {/* Left Column: Register Form */}
      <div className="flex-1 flex flex-col justify-center px-4 sm:px-6 lg:px-12 py-8 max-w-xl mx-auto w-full">
        <div className="w-full space-y-5">
          {/* Header */}
          <div className="space-y-1">
            <Link
              href="/login"
              className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors group mb-1"
            >
              <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" />
              Back to sign in
            </Link>
            <h1 className="text-xl font-bold tracking-tight text-foreground">
              Create your TaskFlow account
            </h1>
            <p className="text-xs text-muted-foreground">
              Start organizing your work, projects, and team in one powerful workspace.
            </p>
          </div>

          {/* Social Auth (Google via Supabase OAuth) */}
          <SocialAuthButtons mode="signup" email={form.email} />

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

          {/* Not Found Notice Banner */}
          {notFoundNotice && (
            <div className="flex items-start gap-2.5 p-3.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-600 dark:text-blue-400 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">No account found with this email.</p>
                <p className="text-[11px] text-blue-600/80 dark:text-blue-400/80 mt-0.5">
                  Please complete the registration below to create your TaskFlow account.
                </p>
              </div>
            </div>
          )}

          {/* Google Not Found Notice Banner */}
          {googleNotFoundNotice && (
            <div className="flex items-start gap-2.5 p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-400 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">No TaskFlow account found for this Google email.</p>
                <p className="text-[11px] text-amber-700/80 dark:text-amber-400/80 mt-0.5">
                  Please click &ldquo;Continue with Google&rdquo; above to sign up with Google, or fill out the form below.
                </p>
              </div>
            </div>
          )}

          {/* Error Banner */}
          {(error || validationError) && (
            <div className="flex items-start gap-2.5 p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <div className="space-y-0.5">
                <p className="font-semibold">{error || validationError}</p>
              </div>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-3">
            {/* Name Fields */}
            <div className="grid grid-cols-2 gap-2.5">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground" htmlFor="firstName">
                  First name
                </label>
                <input
                  id="firstName"
                  type="text"
                  placeholder="Jane"
                  value={form.firstName}
                  onChange={(e) => {
                    setForm({ ...form, firstName: e.target.value })
                    setValidationError(null)
                  }}
                  className="flex h-10 w-full rounded-xl border border-border bg-background px-3 py-1.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary transition-all"
                  required
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground" htmlFor="lastName">
                  Last name
                </label>
                <input
                  id="lastName"
                  type="text"
                  placeholder="Doe"
                  value={form.lastName}
                  onChange={(e) => {
                    setForm({ ...form, lastName: e.target.value })
                    setValidationError(null)
                  }}
                  className="flex h-10 w-full rounded-xl border border-border bg-background px-3 py-1.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary transition-all"
                  required
                />
              </div>
            </div>

            {/* Email Address */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-foreground" htmlFor="email">
                Email address
              </label>
              <input
                id="email"
                type="email"
                placeholder="jane.doe@example.com"
                value={form.email}
                onChange={(e) => {
                  setForm({ ...form, email: e.target.value })
                  setValidationError(null)
                }}
                className="flex h-10 w-full rounded-xl border border-border bg-background px-3 py-1.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary transition-all"
                required
                autoComplete="email"
              />
              <p className="text-[10px] text-muted-foreground">
                Personal or work email address.
              </p>
            </div>

            {/* Password */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-foreground" htmlFor="password">
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={form.password}
                  onChange={(e) => {
                    setForm({ ...form, password: e.target.value })
                    setValidationError(null)
                  }}
                  className="flex h-10 w-full rounded-xl border border-border bg-background pl-3 pr-10 py-1.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary transition-all"
                  required
                  autoComplete="new-password"
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

              {/* Password checks */}
              <div className="flex flex-wrap gap-x-4 gap-y-1 pt-1">
                {passwordChecks.map((check, idx) => (
                  <span
                    key={idx}
                    className={`text-[10px] flex items-center gap-1 ${
                      check.met ? 'text-emerald-600 dark:text-emerald-400 font-medium' : 'text-muted-foreground'
                    }`}
                  >
                    <span>{check.met ? '✓' : '•'}</span>
                    {check.label}
                  </span>
                ))}
              </div>
            </div>

            {/* Confirm Password */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-foreground" htmlFor="confirmPassword">
                Confirm password
              </label>
              <div className="relative">
                <input
                  id="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={form.confirmPassword}
                  onChange={(e) => {
                    setForm({ ...form, confirmPassword: e.target.value })
                    setValidationError(null)
                  }}
                  className={`flex h-10 w-full rounded-xl border bg-background pl-3 pr-10 py-1.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 transition-all ${
                    form.confirmPassword && !passwordsMatch
                      ? 'border-destructive focus:ring-destructive'
                      : 'border-border focus:ring-primary'
                  }`}
                  required
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                >
                  {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {form.confirmPassword && !passwordsMatch && (
                <p className="text-[10px] text-destructive font-medium">
                  Passwords do not match.
                </p>
              )}
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting || !isPasswordValid || (!!form.confirmPassword && !passwordsMatch)}
              className="w-full h-10 rounded-xl bg-primary text-primary-foreground font-bold text-xs hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 shadow-md shadow-primary/25 active:scale-98 cursor-pointer mt-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Creating account...
                </>
              ) : (
                'Create account'
              )}
            </button>
          </form>

          {/* Already have an account */}
          <p className="text-center text-xs text-muted-foreground pt-1">
            Already have an account?{' '}
            <Link href="/login" className="text-primary font-bold hover:underline">
              Sign in
            </Link>
          </p>
        </div>
      </div>

      {/* Right Column: Visual Brand Panel */}
      <AuthMarketingPanel />
    </div>
  )
}

export default function RegisterPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      }
    >
      <RegisterContent />
    </Suspense>
  )
}
