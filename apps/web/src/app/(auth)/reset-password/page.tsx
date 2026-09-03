'use client'

import React, { useState, Suspense } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { ArrowLeft, Loader2, CheckCircle2, Zap, Eye, EyeOff } from 'lucide-react'
import { apiClient } from '@/lib/api-client'

function ResetPasswordContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get('token') || ''

  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters long')
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      await apiClient.post('/api/v1/auth/reset-password', {
        token,
        newPassword: password,
      })
      setSuccess(true)
    } catch (err: any) {
      setError(err?.message || 'Password reset failed or token is invalid/expired.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-background">
      <div className="w-full max-w-md space-y-6 animate-scale-in">
        <div className="flex items-center gap-3 justify-center mb-4">
          <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center text-primary-foreground shadow-lg">
            <Zap className="w-6 h-6" />
          </div>
          <span className="text-2xl font-bold">TaskFlow</span>
        </div>

        <div className="space-y-1.5 text-center">
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Set new password</h1>
          <p className="text-xs text-muted-foreground">
            Choose a secure password for your TaskFlow workspace account.
          </p>
        </div>

        {success ? (
          <div className="p-6 rounded-2xl bg-card border border-border text-center space-y-4 shadow-sm">
            <div className="w-12 h-12 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <h2 className="text-sm font-bold text-foreground">Password reset complete</h2>
            <p className="text-xs text-muted-foreground">
              Your password has been updated. You can now sign in with your new credentials.
            </p>
            <Link
              href="/login"
              className="inline-flex items-center justify-center w-full h-10 rounded-xl bg-primary text-primary-foreground font-semibold text-xs hover:bg-primary/90 transition-all"
            >
              Sign in with new password
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 p-6 rounded-2xl bg-card border border-border shadow-sm">
            {error && (
              <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-xs text-destructive">
                {error}
              </div>
            )}

            <div className="space-y-1.5">
              <label htmlFor="password" className="text-xs font-semibold text-foreground">
                New Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="At least 8 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="flex h-10 w-full rounded-xl border border-border bg-background px-3 py-2 pr-10 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary transition-all"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="confirmPassword" className="text-xs font-semibold text-foreground">
                Confirm Password
              </label>
              <input
                id="confirmPassword"
                type="password"
                placeholder="Re-enter new password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="flex h-10 w-full rounded-xl border border-border bg-background px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary transition-all"
                required
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full h-10 rounded-xl bg-primary text-primary-foreground font-bold text-xs hover:bg-primary/90 disabled:opacity-50 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Updating password...
                </>
              ) : (
                'Update password'
              )}
            </button>

            <div className="pt-2 text-center">
              <Link
                href="/login"
                className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground font-medium transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5" /> Back to Sign in
              </Link>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      }
    >
      <ResetPasswordContent />
    </Suspense>
  )
}
