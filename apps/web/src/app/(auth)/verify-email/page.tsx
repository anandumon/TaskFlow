'use client'

import React, { useState, useEffect, useRef, Suspense } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { Loader2, Mail, CheckCircle2, AlertCircle, ArrowLeft, RotateCw } from 'lucide-react'

function maskEmail(email: string): string {
  if (!email || !email.includes('@')) return 'your email'
  const [local, domain] = email.split('@')
  if (local.length <= 2) {
    return `${local[0]}***@${domain}`
  }
  return `${local[0]}***${local[local.length - 1]}@${domain}`
}

function VerifyEmailContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const emailParam = searchParams.get('email') || ''
  const tokenParam = searchParams.get('token') || searchParams.get('token_hash') || ''
  const inviteTokenParam = searchParams.get('invite_token') || ''

  const { verifyEmail, resendVerification, error, clearError } = useAuth()

  // 6-digit OTP state
  const [digits, setDigits] = useState<string[]>(['', '', '', '', '', ''])
  const inputRefs = useRef<(HTMLInputElement | null)[]>([])

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isResending, setIsResending] = useState(false)
  const [resendCooldown, setResendCooldown] = useState(0)
  const [resendNotice, setResendNotice] = useState<string | null>(null)
  const [localError, setLocalError] = useState<string | null>(null)
  const [isSuccess, setIsSuccess] = useState(false)

  // Handle direct link verification if token is in URL
  useEffect(() => {
    if (tokenParam && emailParam) {
      setIsSubmitting(true)
      verifyEmail({ email: emailParam, token: tokenParam })
        .then(() => {
          setIsSuccess(true)
          const invParam = inviteTokenParam ? `&invite_token=${encodeURIComponent(inviteTokenParam)}` : ''
          setTimeout(() => router.push(`/login?email=${encodeURIComponent(emailParam)}&verified=true${invParam}`), 1000)
        })
        .catch((err) => {
          setLocalError(err.message || 'Confirmation link is invalid or expired.')
          setIsSubmitting(false)
        })
    }
  }, [tokenParam, emailParam, verifyEmail, router])

  // Cooldown countdown
  useEffect(() => {
    if (resendCooldown <= 0) return
    const interval = setInterval(() => {
      setResendCooldown((prev) => prev - 1)
    }, 1000)
    return () => clearInterval(interval)
  }, [resendCooldown])

  // Focus first input on mount
  useEffect(() => {
    if (!tokenParam && inputRefs.current[0]) {
      inputRefs.current[0].focus()
    }
  }, [tokenParam])

  const handleDigitChange = (index: number, value: string) => {
    // Only allow numeric
    const cleanVal = value.replace(/\D/g, '')

    // Handle paste event where user pastes whole string into one box
    if (cleanVal.length > 1) {
      const pastedDigits = cleanVal.slice(0, 6).split('')
      const newDigits = [...digits]
      pastedDigits.forEach((d, i) => {
        if (i < 6) newDigits[i] = d
      })
      setDigits(newDigits)
      setLocalError(null)
      clearError()

      const nextFocus = Math.min(pastedDigits.length, 5)
      inputRefs.current[nextFocus]?.focus()
      return
    }

    const newDigits = [...digits]
    newDigits[index] = cleanVal
    setDigits(newDigits)
    setLocalError(null)
    clearError()

    // Auto advance to next input
    if (cleanVal && index < 5) {
      inputRefs.current[index + 1]?.focus()
    }
  }

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus()
    }
  }

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault()
    const pastedData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
    if (!pastedData) return

    const newDigits = [...digits]
    pastedData.split('').forEach((char, i) => {
      if (i < 6) newDigits[i] = char
    })
    setDigits(newDigits)
    setLocalError(null)
    clearError()

    const targetIdx = Math.min(pastedData.length, 5)
    inputRefs.current[targetIdx]?.focus()
  }

  const otpCode = digits.join('')
  const isOtpComplete = otpCode.length === 6

  const handleVerify = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    if (!isOtpComplete || isSubmitting) return

    setLocalError(null)
    clearError()
    setIsSubmitting(true)

    try {
      await verifyEmail({
        email: emailParam,
        token: otpCode,
      })
      setIsSuccess(true)
      const invParam = inviteTokenParam ? `&invite_token=${encodeURIComponent(inviteTokenParam)}` : ''
      setTimeout(() => {
        router.push(`/login?email=${encodeURIComponent(emailParam)}&verified=true${invParam}`)
      }, 1000)
    } catch (err: any) {
      setLocalError(err.message || 'That verification code is incorrect.')
      setIsSubmitting(false)
    }
  }

  const handleResend = async () => {
    if (resendCooldown > 0 || isResending || !emailParam) return

    setIsResending(true)
    setResendNotice(null)
    setLocalError(null)
    clearError()

    try {
      await resendVerification(emailParam)
      setResendNotice('A fresh verification email and code has been sent.')
      setResendCooldown(60)
    } catch (err: any) {
      setLocalError(err.message || 'Failed to resend email. Please try again later.')
    } finally {
      setIsResending(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4 py-8">
      <div className="w-full max-w-md p-6 sm:p-8 rounded-2xl border border-border bg-card shadow-xl space-y-6 text-center">
        {/* Icon */}
        <div className="mx-auto w-14 h-14 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shadow-inner">
          {isSuccess ? (
            <CheckCircle2 className="w-7 h-7 text-emerald-500" />
          ) : (
            <Mail className="w-7 h-7" />
          )}
        </div>

        {/* Heading */}
        <div className="space-y-1.5">
          <h1 className="text-xl font-bold tracking-tight text-foreground">
            {isSuccess ? 'Email verified!' : 'Check your email'}
          </h1>
          <p className="text-xs text-muted-foreground leading-relaxed">
            {isSuccess ? (
              'Your account has been successfully verified. Taking you to TaskFlow...'
            ) : (
              <>
                We&apos;ve sent a verification code to{' '}
                <span className="font-semibold text-foreground">
                  {maskEmail(emailParam)}
                </span>
                . Enter the 6-digit code below.
              </>
            )}
          </p>
        </div>

        {/* Notices & Errors */}
        {resendNotice && (
          <div className="flex items-center justify-center gap-2 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-medium">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{resendNotice}</span>
          </div>
        )}

        {(localError || error) && (
          <div className="flex items-start gap-2.5 p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs text-left">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <p className="font-semibold">{localError || error}</p>
            </div>
          </div>
        )}

        {/* OTP Input Form */}
        {!isSuccess && (
          <form onSubmit={handleVerify} className="space-y-5">
            <div className="flex justify-center items-center gap-2 sm:gap-3" onPaste={handlePaste}>
              {digits.map((digit, idx) => (
                <input
                  key={idx}
                  ref={(el) => {
                    inputRefs.current[idx] = el
                  }}
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={1}
                  value={digit}
                  disabled={isSubmitting}
                  onChange={(e) => handleDigitChange(idx, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(idx, e)}
                  aria-label={`Digit ${idx + 1}`}
                  className="w-11 h-12 sm:w-12 sm:h-14 rounded-xl border border-border bg-background text-center text-lg sm:text-xl font-bold text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all shadow-inner disabled:opacity-50"
                  autoComplete="one-time-code"
                />
              ))}
            </div>

            {/* Verify CTA */}
            <button
              type="submit"
              disabled={!isOtpComplete || isSubmitting}
              className="w-full h-11 rounded-xl bg-primary text-primary-foreground font-bold text-xs hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 shadow-md shadow-primary/25 active:scale-98 cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Verifying email...
                </>
              ) : (
                'Verify email'
              )}
            </button>
          </form>
        )}

        {/* Resend & Navigation */}
        <div className="space-y-3 pt-2 border-t border-border">
          <p className="text-xs text-muted-foreground">
            Didn&apos;t receive the email?{' '}
            <button
              type="button"
              onClick={handleResend}
              disabled={resendCooldown > 0 || isResending}
              className="text-primary font-bold hover:underline disabled:opacity-50 disabled:no-underline cursor-pointer"
            >
              {isResending ? (
                'Sending...'
              ) : resendCooldown > 0 ? (
                `Resend code (${resendCooldown}s)`
              ) : (
                'Resend code'
              )}
            </button>
          </p>

          <div>
            <Link
              href="/login"
              className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors group"
            >
              <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" />
              Back to sign in
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function VerifyEmailPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      }
    >
      <VerifyEmailContent />
    </Suspense>
  )
}
