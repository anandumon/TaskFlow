'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Loader2, CheckCircle2, Zap, AlertCircle } from 'lucide-react'
import { apiClient } from '@/lib/api-client'

export default function ForgotPasswordPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email) return
    setIsLoading(true)
    setError(null)

    try {
      await apiClient.post('/api/v1/auth/forgot-password', { email })
      setSubmitted(true)
    } catch (err: any) {
      setError(err?.message || 'Failed to send reset link. Please check your email address.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-background">
      <div className="w-full max-w-[440px] space-y-6 animate-scale-in">
        <div className="flex items-center gap-3 justify-center mb-4">
          <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center text-primary-foreground shadow-md shadow-primary/25">
            <Zap className="w-6 h-6" />
          </div>
          <span className="text-2xl font-black tracking-tight text-foreground">TaskFlow</span>
        </div>

        <div className="space-y-1.5 text-center">
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Reset your password</h1>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Enter your email address and we&apos;ll help you securely reset your password.
          </p>
        </div>

        {submitted ? (
          <div className="p-6 rounded-2xl bg-card border border-border text-center space-y-4 shadow-sm animate-fade-in">
            <div className="w-12 h-12 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <h2 className="text-sm font-bold text-foreground">Check your inbox</h2>
            <p className="text-xs text-muted-foreground leading-relaxed">
              We&apos;ve sent password reset instructions to <span className="font-semibold text-foreground">{email}</span>.
            </p>
            <Link
              href="/login"
              className="inline-flex items-center justify-center w-full h-11 rounded-xl bg-primary text-primary-foreground font-semibold text-xs hover:bg-primary/90 transition-all shadow-md shadow-primary/25"
            >
              Back to sign in
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 p-6 rounded-2xl bg-card border border-border shadow-sm">
            {error && (
              <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-xs text-destructive flex items-center gap-2">
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
                type="email"
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="flex h-11 w-full rounded-xl border border-border bg-background px-3.5 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary transition-all shadow-inner"
                required
                autoFocus
                autoComplete="email"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full h-11 rounded-xl bg-primary text-primary-foreground font-bold text-xs hover:bg-primary/90 disabled:opacity-50 transition-all flex items-center justify-center gap-2 shadow-md shadow-primary/25 cursor-pointer"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Sending reset link...
                </>
              ) : (
                'Send reset link'
              )}
            </button>

            <div className="pt-2 text-center">
              <Link
                href="/login"
                className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground font-medium transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5" /> Back to sign in
              </Link>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
