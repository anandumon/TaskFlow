'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuthStore } from '@/stores/auth-store'
import { SocialAuthButtons } from '@/features/auth/components/SocialAuthButtons'
import { AuthMarketingPanel } from '@/features/auth/components/AuthMarketingPanel'
import { Eye, EyeOff, Loader2, Zap, CheckCircle2, AlertCircle } from 'lucide-react'

export default function LoginPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { login, error, clearError } = useAuthStore()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [verifiedBanner, setVerifiedBanner] = useState(false)

  useEffect(() => {
    clearError()
    const qEmail = searchParams.get('email')
    const qVerified = searchParams.get('verified')
    if (qEmail) {
      setEmail(qEmail)
    }
    if (qVerified === 'true') {
      setVerifiedBanner(true)
    }
  }, [searchParams, clearError])

  const handleLoginSubmit = async (emailToUse: string, passwordToUse: string) => {
    if (!emailToUse || !passwordToUse) return
    setIsSubmitting(true)
    clearError()
    try {
      await login(emailToUse, passwordToUse)
      router.push('/app/home')
      setTimeout(() => {
        if (window.location.pathname.includes('login')) {
          window.location.href = '/app/home'
        }
      }, 400)
    } catch {
      setIsSubmitting(false)
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    handleLoginSubmit(email, password)
  }

  return (
    <div className="min-h-screen flex bg-background">
      {/* Left — Brand Value Proposition Panel (Differentiated Sign In Variant) */}
      <AuthMarketingPanel variant="signin" />

      {/* Right — Login form */}
      <main className="flex-1 flex items-center justify-center p-6 sm:p-10 lg:p-12 overflow-y-auto">
        <div className="w-full max-w-[480px] space-y-6">
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-3 justify-center mb-4">
            <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center text-primary-foreground shadow-md shadow-primary/25">
              <Zap className="w-6 h-6" />
            </div>
            <span className="text-2xl font-black tracking-tight text-foreground">TaskFlow</span>
          </div>

          {/* Heading & Subtitle */}
          <div className="space-y-2 text-center lg:text-left">
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
              Welcome back
            </h1>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Sign in to continue to TaskFlow.
            </p>
          </div>

          {/* Google & Microsoft Social Authentication */}
          <SocialAuthButtons mode="signin" />

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {verifiedBanner && (
              <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/30 p-3 text-xs text-emerald-600 animate-fade-in font-semibold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                <span>Email verified successfully! Please enter your password to sign in.</span>
              </div>
            )}

            {error && (
              <div className="rounded-xl bg-destructive/10 border border-destructive/20 p-3 text-xs text-destructive animate-fade-in font-medium flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div className="space-y-1.5">
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
                className="flex h-11 w-full rounded-xl border border-border bg-background px-3.5 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary transition-all shadow-inner"
                required
                autoComplete="email"
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label htmlFor="password" className="text-xs font-semibold text-foreground">
                  Password
                </label>
                <Link
                  href="/forgot-password"
                  className="text-xs text-primary hover:underline font-medium transition-colors"
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
                  className="flex h-11 w-full rounded-xl border border-border bg-background px-3.5 py-2 pr-10 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary transition-all shadow-inner"
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
              className="w-full h-11 rounded-xl bg-primary text-primary-foreground font-bold text-xs hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 shadow-md shadow-primary/25 active:scale-98 cursor-pointer mt-2"
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
          <p className="text-center text-xs text-muted-foreground">
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
