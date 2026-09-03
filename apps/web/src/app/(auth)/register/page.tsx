'use client'

import React, { useState, useEffect, Suspense } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuthStore } from '@/stores/auth-store'
import { SocialAuthButtons } from '@/features/auth/components/SocialAuthButtons'
import { AuthMarketingPanel } from '@/features/auth/components/AuthMarketingPanel'
import {
  Eye,
  EyeOff,
  Loader2,
  Zap,
  Mail,
  CheckCircle2,
  ArrowLeft,
  ArrowRight,
  AlertCircle,
  RotateCw,
  KeyRound,
} from 'lucide-react'

function RegisterContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { register, resendCode, verifyEmail, isLoading, error, clearError } = useAuthStore()
  const [form, setForm] = useState({ firstName: '', lastName: '', email: '', password: '' })
  const [showPassword, setShowPassword] = useState(false)
  const [oauthMeta, setOauthMeta] = useState<{ provider?: string; googleId?: string } | null>(null)
  const [googleNotice, setGoogleNotice] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Step State: 'register' -> 'verify' (Email Confirmation Screen)
  const [step, setStep] = useState<'register' | 'verify'>('register')
  const [registeredEmail, setRegisteredEmail] = useState('')
  const [verificationOtp, setVerificationOtp] = useState('')
  const [confirmationToken, setConfirmationToken] = useState('')
  const [otpInput, setOtpInput] = useState('')
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false)
  const [otpError, setOtpError] = useState<string | null>(null)
  const [resendStatus, setResendStatus] = useState<string | null>(null)
  const [cooldownSeconds, setCooldownSeconds] = useState(60)

  // Clear residual errors on page mount & prepopulate parameters
  useEffect(() => {
    clearError()
    const qEmail = searchParams.get('email')
    const qFirst = searchParams.get('firstName')
    const qLast = searchParams.get('lastName')
    const qProvider = searchParams.get('provider')
    const qGoogleId = searchParams.get('googleId')
    const qReason = searchParams.get('reason')

    if (qEmail || qFirst || qLast) {
      setForm((prev) => ({
        ...prev,
        email: qEmail || prev.email,
        firstName: qFirst || prev.firstName,
        lastName: qLast || prev.lastName,
      }))
    }

    if (qProvider === 'google') {
      setOauthMeta({ provider: 'GOOGLE', googleId: qGoogleId || undefined })
    }

    if (qReason === 'google_not_found') {
      setGoogleNotice('Account not found. Please create your account first to continue.')
    }
  }, [clearError, searchParams])

  // 60-second resend cooldown countdown
  useEffect(() => {
    if (step === 'verify' && cooldownSeconds > 0) {
      const timer = setInterval(() => {
        setCooldownSeconds((prev) => (prev > 0 ? prev - 1 : 0))
      }, 1000)
      return () => clearInterval(timer)
    }
  }, [step, cooldownSeconds])

  // Password requirements calculation
  const passwordChecks = [
    { label: '8+ chars', met: form.password.length >= 8 },
    { label: 'Number', met: /\d/.test(form.password) },
    { label: 'Special symbol', met: /[^A-Za-z0-9]/.test(form.password) },
  ]
  const isPasswordValid = passwordChecks.every((c) => c.met)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!isPasswordValid) return
    clearError()
    setIsSubmitting(true)

    try {
      const res = await register({
        ...form,
        authProvider: oauthMeta?.provider || 'LOCAL',
        providerId: oauthMeta?.googleId,
      })
      setRegisteredEmail(form.email)
      if (res.devCode) setVerificationOtp(res.devCode)
      if (res.confirmationToken) setConfirmationToken(res.confirmationToken)
      setCooldownSeconds(60)
      setStep('verify')
    } catch {
      // handled by auth store
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleVerifyOtp = async (codeToVerify: string) => {
    if (!codeToVerify || codeToVerify.length < 6) return
    setIsVerifyingOtp(true)
    setOtpError(null)
    try {
      await verifyEmail(registeredEmail, codeToVerify)
      // Authentication and verification successful: take user directly inside!
      window.location.replace('/app/home')
    } catch (err: any) {
      setOtpError(
        err?.response?.data?.message || err?.message || 'Invalid verification code. Please check and try again.'
      )
    } finally {
      setIsVerifyingOtp(false)
    }
  }

  const handleResend = async () => {
    if (cooldownSeconds > 0) return
    try {
      setResendStatus('Resending confirmation code...')
      await resendCode(registeredEmail)
      setCooldownSeconds(60)
      setResendStatus('A fresh confirmation code has been dispatched.')
      setTimeout(() => setResendStatus(null), 5000)
    } catch (err: any) {
      setResendStatus(err?.message || 'Failed to resend confirmation email')
    }
  }

  const updateField = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  return (
    <div className="flex h-screen max-h-screen overflow-hidden bg-background">
      {/* LEFT MARKETING PANEL (Sticky & responsive) */}
      <AuthMarketingPanel />

      {/* RIGHT AUTH PANEL */}
      <main className="flex-1 h-full flex items-center justify-center p-4 sm:p-6 lg:p-8 overflow-y-auto lg:overflow-hidden">
        <div className="w-full max-w-[420px] space-y-3.5 my-auto">

          {/* STEP 1: Registration Screen */}
          {step === 'register' && (
            <div className="space-y-3.5 animate-fade-in">
              {/* Mobile Branding Logo */}
              <div className="lg:hidden flex items-center gap-2.5 justify-center mb-1">
                <div className="w-8 h-8 rounded-xl bg-primary flex items-center justify-center text-primary-foreground shadow-md shadow-primary/25">
                  <Zap className="w-4 h-4" />
                </div>
                <span className="text-xl font-black tracking-tight text-foreground">TaskFlow</span>
              </div>

              {/* Header Badge, Title & Subtitle */}
              <div className="space-y-1 text-center lg:text-left">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-primary/10 text-primary text-[11px] font-semibold border border-primary/20">
                  <Zap className="w-3 h-3" />
                  Start free &bull; Set up in minutes
                </div>
                <h1 className="text-2xl xl:text-[26px] font-extrabold tracking-tight text-foreground">
                  Create your TaskFlow account
                </h1>
                <p className="text-xs text-muted-foreground">
                  Start organizing your work, projects, and everyday life in one place.
                </p>
              </div>

              {/* Account Not Found Notice Banner */}
              {googleNotice && (
                <div className="rounded-xl bg-primary/10 border border-primary/25 p-2.5 text-xs text-primary font-medium flex items-center gap-2 animate-fade-in">
                  <AlertCircle className="w-4 h-4 shrink-0 text-primary" />
                  <span>{googleNotice}</span>
                </div>
              )}

              {/* Error Banner */}
              {error && (
                <div className="rounded-xl bg-destructive/10 border border-destructive/20 p-2.5 text-xs text-destructive animate-fade-in font-medium flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {/* Google Social Authentication */}
              <SocialAuthButtons mode="signup" email={form.email} />

              {/* Email Signup Form */}
              <form onSubmit={handleSubmit} className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div className="space-y-1">
                    <label htmlFor="firstName" className="text-xs font-semibold text-foreground">
                      First name
                    </label>
                    <input
                      id="firstName"
                      name="firstName"
                      type="text"
                      placeholder="Jane"
                      autoComplete="given-name"
                      value={form.firstName}
                      onChange={(e) => updateField('firstName', e.target.value)}
                      className="flex h-10 w-full rounded-xl border border-border bg-background px-3 py-1.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary transition-all shadow-inner"
                      required
                    />
                  </div>

                  <div className="space-y-1">
                    <label htmlFor="lastName" className="text-xs font-semibold text-foreground">
                      Last name
                    </label>
                    <input
                      id="lastName"
                      name="lastName"
                      type="text"
                      placeholder="Doe"
                      autoComplete="family-name"
                      value={form.lastName}
                      onChange={(e) => updateField('lastName', e.target.value)}
                      className="flex h-10 w-full rounded-xl border border-border bg-background px-3 py-1.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary transition-all shadow-inner"
                      required
                    />
                  </div>
                </div>

                {/* Email Input */}
                <div className="space-y-1">
                  <label htmlFor="email" className="text-xs font-semibold text-foreground">
                    Work email or personal email
                  </label>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    placeholder="name@company.com"
                    autoComplete="email"
                    value={form.email}
                    onChange={(e) => updateField('email', e.target.value)}
                    className="flex h-10 w-full rounded-xl border border-border bg-background px-3 py-1.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary transition-all shadow-inner"
                    required
                  />
                </div>

                {/* Password Input */}
                <div className="space-y-1">
                  <label htmlFor="password" className="text-xs font-semibold text-foreground">
                    Create password
                  </label>
                  <div className="relative">
                    <input
                      id="password"
                      name="password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="At least 8 characters"
                      autoComplete="new-password"
                      value={form.password}
                      onChange={(e) => updateField('password', e.target.value)}
                      className="flex h-10 w-full rounded-xl border border-border bg-background px-3 py-1.5 pr-10 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary transition-all shadow-inner"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors p-1"
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>

                  {/* Horizontal Compact Validation Row */}
                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    {passwordChecks.map((check, idx) => (
                      <div
                        key={idx}
                        className={`flex items-center gap-1 text-[11px] font-medium transition-colors ${
                          check.met ? 'text-emerald-500' : 'text-muted-foreground/70'
                        }`}
                      >
                        <span
                          className={`w-3.5 h-3.5 rounded-full flex items-center justify-center text-[9px] font-bold ${
                            check.met ? 'bg-emerald-500 text-white' : 'bg-muted text-muted-foreground'
                          }`}
                        >
                          {check.met ? '✓' : '○'}
                        </span>
                        <span>{check.label}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Primary CTA */}
                <button
                  type="submit"
                  disabled={isSubmitting || !isPasswordValid}
                  className="w-full h-10 rounded-xl bg-primary text-primary-foreground font-bold text-xs hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 shadow-md shadow-primary/25 active:scale-98 cursor-pointer mt-1"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Creating your account...
                    </>
                  ) : (
                    'Create account'
                  )}
                </button>
              </form>

              {/* Already have an account */}
              <p className="text-center text-xs text-muted-foreground pt-0.5">
                Already have an account?{' '}
                <Link href="/login" className="text-primary font-bold hover:underline">
                  Sign in
                </Link>
              </p>
            </div>
          )}

          {/* STEP 2: Email Confirmation & Verification Screen */}
          {step === 'verify' && (
            <div className="rounded-3xl bg-card/85 border border-border/80 shadow-2xl p-6 sm:p-7 space-y-4 animate-fade-in backdrop-blur-md text-center">
              <div className="space-y-2">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-primary/20 via-primary/10 to-transparent text-primary flex items-center justify-center mx-auto shadow-inner border border-primary/20 animate-pulse">
                  <Mail className="w-7 h-7 text-primary" />
                </div>
                <h1 className="text-xl font-extrabold tracking-tight text-foreground">Confirm your email address</h1>
                <p className="text-muted-foreground text-xs leading-relaxed max-w-xs mx-auto">
                  Enter your 6-digit verification code below to activate your TaskFlow account.
                </p>
                <div className="inline-block px-3.5 py-1 rounded-full bg-primary/10 text-primary font-bold text-xs border border-primary/20">
                  {registeredEmail}
                </div>
              </div>

              {/* 6-Digit OTP Form */}
              <form
                onSubmit={(e) => {
                  e.preventDefault()
                  handleVerifyOtp(otpInput)
                }}
                className="space-y-2 pt-1 text-left"
              >
                <label htmlFor="otp" className="text-xs font-semibold text-foreground">
                  Verification Code (6-digits)
                </label>
                <div className="flex gap-2">
                  <input
                    id="otp"
                    type="text"
                    maxLength={6}
                    placeholder="123456"
                    value={otpInput}
                    onChange={(e) => setOtpInput(e.target.value.replace(/\D/g, ''))}
                    className="flex h-11 w-full rounded-xl border border-border bg-background px-3 py-1.5 text-center text-lg tracking-widest font-mono font-bold text-foreground focus:outline-none focus:ring-2 focus:ring-primary shadow-inner"
                    autoFocus
                  />
                  <button
                    type="submit"
                    disabled={isVerifyingOtp || otpInput.length !== 6}
                    className="h-11 px-5 rounded-xl bg-primary text-primary-foreground font-bold text-xs hover:bg-primary/90 disabled:opacity-50 transition-all flex items-center justify-center gap-1.5 shadow-md shadow-primary/25 cursor-pointer shrink-0"
                  >
                    {isVerifyingOtp ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Confirm'}
                  </button>
                </div>

                {otpError && (
                  <div className="rounded-xl bg-destructive/10 border border-destructive/20 p-2 text-xs text-destructive font-medium flex items-center gap-1.5 animate-fade-in">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>{otpError}</span>
                  </div>
                )}
              </form>



              {resendStatus && (
                <div className="rounded-xl bg-primary/10 border border-primary/20 p-2.5 text-xs text-primary font-semibold animate-fade-in">
                  {resendStatus}
                </div>
              )}

              {/* Bottom Actions */}
              <div className="flex items-center justify-between text-xs pt-3 border-t border-border/60">
                <button
                  type="button"
                  onClick={() => setStep('register')}
                  className="text-muted-foreground hover:text-foreground font-medium flex items-center gap-1 transition-colors cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" /> Change email
                </button>

                <button
                  type="button"
                  onClick={handleResend}
                  disabled={cooldownSeconds > 0 || isLoading}
                  className={`font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
                    cooldownSeconds > 0
                      ? 'text-muted-foreground/60 cursor-not-allowed'
                      : 'text-primary hover:underline'
                  }`}
                >
                  <RotateCw className="w-3 h-3" />
                  {cooldownSeconds > 0 ? `Resend code in ${cooldownSeconds}s` : 'Resend code'}
                </button>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}

export default function RegisterPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-background">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      }
    >
      <RegisterContent />
    </Suspense>
  )
}
