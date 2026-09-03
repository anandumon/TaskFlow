'use client'

import React, { useState, useEffect } from 'react'
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
} from 'lucide-react'

export default function RegisterPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { register, resendCode, isLoading, error, clearError } = useAuthStore()
  const [form, setForm] = useState({ firstName: '', lastName: '', email: '', password: '' })
  const [showPassword, setShowPassword] = useState(false)

  // Step State: 'register' -> 'verify' (Email Confirmation Link Screen)
  const [step, setStep] = useState<'register' | 'verify'>('register')
  const [registeredEmail, setRegisteredEmail] = useState('')
  const [resendStatus, setResendStatus] = useState<string | null>(null)
  const [cooldownSeconds, setCooldownSeconds] = useState(60)

  // Clear any residual errors on page mount & prepopulate email if query param passed
  useEffect(() => {
    clearError()
    const qEmail = searchParams.get('email')
    if (qEmail) {
      setForm((prev) => ({ ...prev, email: qEmail }))
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

  const maskEmail = (email: string) => {
    if (!email || !email.includes('@')) return email
    const [name, domain] = email.split('@')
    if (name.length <= 2) return `${name}***@${domain}`
    return `${name.slice(0, 2)}***${name.slice(-1)}@${domain}`
  }

  // Password requirements calculation
  const passwordChecks = [
    { label: 'At least 8 characters', met: form.password.length >= 8 },
    { label: 'Contains a number', met: /\d/.test(form.password) },
    { label: 'Contains a special character', met: /[^A-Za-z0-9]/.test(form.password) },
  ]
  const isPasswordValid = passwordChecks.every((c) => c.met)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!isPasswordValid) return
    clearError()

    try {
      await register(form)
      setRegisteredEmail(form.email)
      setCooldownSeconds(60)
      setStep('verify')
    } catch {
      // handled by auth store
    }
  }

  const handleResend = async () => {
    if (cooldownSeconds > 0) return
    try {
      setResendStatus('Resending confirmation email...')
      await resendCode(registeredEmail)
      setCooldownSeconds(60)
      setResendStatus('A fresh confirmation link has been sent to your email.')
      setTimeout(() => setResendStatus(null), 5000)
    } catch (err: any) {
      setResendStatus(err?.message || 'Failed to resend confirmation email')
    }
  }

  const updateField = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }))
    clearError()
  }

  return (
    <div className="min-h-screen flex bg-background">
      {/* Left — Brand Value Proposition Panel (Signup Variant) */}
      <AuthMarketingPanel variant="signup" />

      {/* Right — Signup & Verification Form */}
      <main className="flex-1 flex items-center justify-center p-6 sm:p-10 lg:p-12 overflow-y-auto">
        <div className="w-full max-w-[480px] space-y-6">

          {/* STEP 1: Registration Screen */}
          {step === 'register' && (
            <div className="space-y-6 animate-fade-in">
              {/* Mobile Branding Logo */}
              <div className="lg:hidden flex items-center gap-3 justify-center mb-4">
                <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center text-primary-foreground shadow-md shadow-primary/25">
                  <Zap className="w-6 h-6" />
                </div>
                <span className="text-2xl font-black tracking-tight text-foreground">TaskFlow</span>
              </div>

              {/* Header Badge, Title & Subtitle */}
              <div className="space-y-2 text-center lg:text-left">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold border border-primary/20">
                  <Zap className="w-3.5 h-3.5" />
                  Start free &bull; Set up in minutes
                </div>
                <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
                  Create your TaskFlow account
                </h1>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Start organizing your work, projects, and everyday life in one place.
                </p>
              </div>

              {/* Error Banner */}
              {error && (
                <div className="rounded-xl bg-destructive/10 border border-destructive/20 p-3 text-xs text-destructive animate-fade-in font-medium flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {/* Google Social Authentication */}
              <SocialAuthButtons mode="signup" />

              {/* Email Signup Form */}
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
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
                      className="flex h-11 w-full rounded-xl border border-border bg-background px-3.5 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary transition-all shadow-inner"
                      required
                    />
                  </div>

                  <div className="space-y-1.5">
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
                      className="flex h-11 w-full rounded-xl border border-border bg-background px-3.5 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary transition-all shadow-inner"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="email" className="text-xs font-semibold text-foreground">
                    Email address
                  </label>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    placeholder="name@example.com"
                    autoComplete="email"
                    value={form.email}
                    onChange={(e) => updateField('email', e.target.value)}
                    className="flex h-11 w-full rounded-xl border border-border bg-background px-3.5 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary transition-all shadow-inner"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="password" className="text-xs font-semibold text-foreground">
                    Password
                  </label>
                  <div className="relative">
                    <input
                      id="password"
                      name="password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Create a strong password"
                      autoComplete="new-password"
                      value={form.password}
                      onChange={(e) => updateField('password', e.target.value)}
                      className="flex h-11 w-full rounded-xl border border-border bg-background pl-3.5 pr-10 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary transition-all shadow-inner"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>

                  {/* Password validation indicators */}
                  <div className="pt-1.5 space-y-1">
                    {passwordChecks.map((check, i) => (
                      <div
                        key={i}
                        className={`flex items-center gap-1.5 text-[11px] font-medium transition-colors ${
                          check.met ? 'text-emerald-500' : 'text-muted-foreground'
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
                  disabled={isLoading || !isPasswordValid}
                  className="w-full h-11 rounded-xl bg-primary text-primary-foreground font-bold text-xs hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 shadow-md shadow-primary/25 active:scale-98 cursor-pointer mt-2"
                >
                  {isLoading ? (
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
              <p className="text-center text-xs text-muted-foreground">
                Already have an account?{' '}
                <Link href="/login" className="text-primary font-bold hover:underline">
                  Sign in
                </Link>
              </p>
            </div>
          )}

          {/* STEP 2: Email Confirmation Sent Screen */}
          {step === 'verify' && (
            <div className="rounded-3xl bg-card/85 border border-border/80 shadow-2xl p-6 sm:p-8 space-y-6 animate-fade-in backdrop-blur-md text-center">
              <div className="space-y-3">
                <div className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-primary/20 via-primary/10 to-transparent text-primary flex items-center justify-center mx-auto shadow-inner border border-primary/20 animate-pulse">
                  <Mail className="w-8 h-8 text-primary" />
                </div>
                <h1 className="text-2xl font-extrabold tracking-tight text-foreground">Confirm your email address</h1>
                <p className="text-muted-foreground text-xs leading-relaxed max-w-sm mx-auto">
                  Follow the link sent to your email below to confirm this address and finish setting up your TaskFlow account.
                </p>
                <div className="inline-block px-4 py-1.5 rounded-full bg-primary/10 text-primary font-bold text-xs border border-primary/20">
                  {registeredEmail}
                </div>
              </div>

              {/* Instructional Note */}
              <div className="p-4 rounded-2xl bg-muted/40 border border-border/50 text-left space-y-2">
                <div className="flex items-center gap-2 text-xs font-bold text-foreground">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span>Next Step:</span>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed pl-6">
                  Open the verification email in your inbox (or spam folder) and click the <strong>Confirm email address</strong> button. You will be automatically activated and redirected to sign in.
                </p>
              </div>

              {resendStatus && (
                <div className="rounded-xl bg-primary/10 border border-primary/20 p-3 text-xs text-primary font-semibold animate-fade-in">
                  {resendStatus}
                </div>
              )}

              {/* Direct Link to Sign In */}
              <div className="space-y-3 pt-2">
                <Link
                  href={`/login?email=${encodeURIComponent(registeredEmail)}&verified=true`}
                  className="w-full h-11 rounded-xl bg-primary text-primary-foreground font-bold text-xs hover:bg-primary/90 transition-all flex items-center justify-center gap-2 shadow-md shadow-primary/25 cursor-pointer"
                >
                  Proceed to Sign In <ArrowRight className="w-4 h-4" />
                </Link>

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
                    {cooldownSeconds > 0 ? `Resend email in ${cooldownSeconds}s` : 'Resend confirmation email'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
