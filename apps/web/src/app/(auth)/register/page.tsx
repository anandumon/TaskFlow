'use client'

import React, { useState, useEffect, Suspense } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { apiClient } from '@/lib/api-client'
import { SocialAuthButtons } from '@/features/auth/components/SocialAuthButtons'
import { AuthMarketingPanel } from '@/features/auth/components/AuthMarketingPanel'
import { Eye, EyeOff, Loader2, ArrowLeft, AlertCircle, CheckCircle2 } from 'lucide-react'

function RegisterContent() {
  const router = useRouter()
  const searchParams = useSearchParams()

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
  const [serverError, setServerError] = useState<string | null>(null)
  const [emailExists, setEmailExists] = useState(false)
  const [notFoundNotice, setNotFoundNotice] = useState(false)
  const [googleNotFoundNotice, setGoogleNotFoundNotice] = useState(false)

  useEffect(() => {
    setValidationError(null)
    setServerError(null)
    setEmailExists(false)

    const qEmail = searchParams.get('email')
    const qName = searchParams.get('name')
    const qReason = searchParams.get('reason')
    const qToken = searchParams.get('token') || searchParams.get('invite_token')
    if (qToken && typeof window !== 'undefined') {
      localStorage.setItem('tf_invite_token', qToken)
    }

    if (qEmail) {
      // Decode and clean malformed %10 to @
      const cleanEmail = decodeURIComponent(qEmail).replace(/%10|\x10/g, '@').trim()
      setForm((prev) => ({ ...prev, email: cleanEmail }))
    }
    if (qName) {
      const parts = decodeURIComponent(qName).trim().split(' ')
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
  }, [searchParams])

  // Password criteria checks
  const passwordChecks = [
    { label: 'At least 8 characters', met: form.password.length >= 8 },
    { label: 'Contains a number or symbol', met: /[0-9!@#$%^&*(),.?":{}|<>]/.test(form.password) },
  ]
  const isPasswordValid = passwordChecks.every((c) => c.met)
  const passwordsMatch = form.password.length > 0 && form.password === form.confirmPassword

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setValidationError(null)
    setServerError(null)
    setEmailExists(false)

    const cleanFirst = form.firstName.trim()
    const cleanLast = form.lastName.trim()
    const cleanEmail = form.email.trim().toLowerCase().replace(/%10|\x10/g, '@')

    if (!cleanFirst) {
      setValidationError('Please enter your first name.')
      return
    }

    if (!cleanLast) {
      setValidationError('Please enter your last name.')
      return
    }

    if (!cleanEmail || !cleanEmail.includes('@') || !cleanEmail.includes('.')) {
      setValidationError('Please enter a valid email address.')
      return
    }

    if (form.password.length < 8) {
      setValidationError('Password must be at least 8 characters long.')
      return
    }

    if (!/[0-9!@#$%^&*(),.?":{}|<>]/.test(form.password)) {
      setValidationError('Password must contain at least one number or special symbol.')
      return
    }

    if (form.password !== form.confirmPassword) {
      setValidationError('Passwords do not match. Please verify both password fields.')
      return
    }

    try {
      setIsSubmitting(true)

      const res = await apiClient.post<any>('/api/v1/auth/register', {
        email: cleanEmail,
        password: form.password,
        firstName: cleanFirst,
        lastName: cleanLast,
      })

      if (typeof window !== 'undefined') {
        sessionStorage.setItem('pending_verify_email', cleanEmail)
      }

      router.push(`/verify-email?email=${encodeURIComponent(cleanEmail)}`)
    } catch (err: any) {
      const msg = err?.message || err?.error?.message || 'Registration failed. Please try again.'
      if (msg.toLowerCase().includes('already exists') || msg.toLowerCase().includes('email_exists')) {
        setEmailExists(true)
        setServerError('An account with this email already exists.')
      } else {
        setServerError(msg)
      }
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
                  Click &ldquo;Continue with Google&rdquo; above to sign up with Google, or fill out the form below.
                </p>
              </div>
            </div>
          )}

          {/* Error Banner */}
          {(serverError || validationError) && (
            <div className="flex items-start gap-2.5 p-3.5 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs animate-fade-in">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="font-semibold">{serverError || validationError}</p>
                {emailExists && (
                  <Link
                    href={`/login?email=${encodeURIComponent(form.email)}`}
                    className="inline-block font-bold underline hover:text-foreground transition-colors text-[11px]"
                  >
                    Click here to sign in with this email →
                  </Link>
                )}
              </div>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-3.5">
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
                  setServerError(null)
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
                  placeholder="Create a strong password"
                  value={form.password}
                  onChange={(e) => {
                    setForm({ ...form, password: e.target.value })
                    setValidationError(null)
                  }}
                  className="flex h-10 w-full rounded-xl border border-border bg-background pl-3 pr-10 py-1.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary transition-all font-mono"
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
                    className={`text-[10px] flex items-center gap-1 transition-colors ${
                      check.met ? 'text-emerald-500 font-medium' : 'text-muted-foreground'
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
                  placeholder="Re-enter password"
                  value={form.confirmPassword}
                  onChange={(e) => {
                    setForm({ ...form, confirmPassword: e.target.value })
                    setValidationError(null)
                  }}
                  className={`flex h-10 w-full rounded-xl border bg-background pl-3 pr-10 py-1.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 transition-all font-mono ${
                    form.confirmPassword.length > 0 && !passwordsMatch
                      ? 'border-destructive focus:ring-destructive'
                      : form.confirmPassword.length > 0 && passwordsMatch
                      ? 'border-emerald-500/80 focus:ring-emerald-500'
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

              {form.confirmPassword.length > 0 && (
                <p
                  className={`text-[10px] font-medium flex items-center gap-1 pt-0.5 ${
                    passwordsMatch ? 'text-emerald-500' : 'text-destructive'
                  }`}
                >
                  {passwordsMatch ? (
                    <>
                      <CheckCircle2 className="w-3 h-3" />
                      <span>Passwords match</span>
                    </>
                  ) : (
                    <>
                      <AlertCircle className="w-3 h-3" />
                      <span>Passwords do not match</span>
                    </>
                  )}
                </p>
              )}
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full h-11 rounded-xl bg-primary text-primary-foreground font-bold text-xs hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 shadow-md shadow-primary/25 active:scale-[0.99] cursor-pointer mt-3"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Creating your account...</span>
                </>
              ) : (
                <span>Create account</span>
              )}
            </button>
          </form>

          {/* Already have an account */}
          <p className="text-center text-xs text-muted-foreground pt-1">
            Already have an account?{' '}
            <Link
              href={
                searchParams.get('token') || searchParams.get('invite_token')
                  ? `/login?invite_token=${encodeURIComponent(
                      (searchParams.get('token') || searchParams.get('invite_token'))!
                    )}`
                  : '/login'
              }
              className="text-primary font-bold hover:underline"
            >
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
