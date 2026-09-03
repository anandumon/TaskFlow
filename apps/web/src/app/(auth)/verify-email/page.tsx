'use client'

import { useState, useEffect, Suspense } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuthStore } from '@/stores/auth-store'
import {
  Loader2,
  Zap,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  ShieldCheck,
  MailCheck,
} from 'lucide-react'

function VerifyEmailContent() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const emailParam = searchParams.get('email') || ''
  const tokenParam = searchParams.get('token') || searchParams.get('code') || ''

  const { confirmEmail, isLoading, error, clearError } = useAuthStore()

  const [status, setStatus] = useState<'verifying' | 'success' | 'error'>('verifying')
  const [statusMessage, setStatusMessage] = useState('Verifying your email address...')

  useEffect(() => {
    clearError()

    const executeConfirmation = async () => {
      // Check if this is a direct token / email confirmation from email link
      if (emailParam || tokenParam) {
        try {
          const msg = await confirmEmail(emailParam, tokenParam)
          setStatus('success')
          setStatusMessage(msg || 'Email address confirmed successfully!')

          // Auto-redirect to signin page after 1.5 seconds
          setTimeout(() => {
            router.push(`/login?email=${encodeURIComponent(emailParam)}&verified=true`)
          }, 1500)
        } catch (err: any) {
          setStatus('error')
          setStatusMessage(
            err?.response?.data?.message || err?.message || 'Could not verify email confirmation link.'
          )
        }
      } else {
        // If arrived without params, direct to sign in
        setStatus('error')
        setStatusMessage('No verification link parameters were detected. Please click the link inside your email.')
      }
    }

    executeConfirmation()
  }, [emailParam, tokenParam, confirmEmail, clearError, router])

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-6">
      <div className="max-w-md w-full p-8 rounded-3xl bg-card border border-border shadow-2xl text-center space-y-6 animate-scale-in">
        {status === 'verifying' && (
          <div className="space-y-4">
            <div className="w-16 h-16 rounded-3xl bg-primary/10 flex items-center justify-center mx-auto text-primary animate-pulse border border-primary/20">
              <Loader2 className="w-8 h-8 animate-spin" />
            </div>
            <h2 className="text-2xl font-extrabold text-foreground tracking-tight">Confirming your email...</h2>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Please wait while we verify your confirmation link and activate your TaskFlow account.
            </p>
          </div>
        )}

        {status === 'success' && (
          <div className="space-y-4 animate-fade-in">
            <div className="w-16 h-16 rounded-3xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto text-emerald-500 shadow-lg shadow-emerald-500/10">
              <MailCheck className="w-8 h-8 text-emerald-500" />
            </div>
            <h2 className="text-2xl font-extrabold text-foreground tracking-tight">Email Confirmed!</h2>
            <p className="text-xs text-emerald-600 font-semibold leading-relaxed">
              {statusMessage}
            </p>
            <p className="text-xs text-muted-foreground">
              Redirecting you to the Sign In page now...
            </p>
            <div className="pt-2">
              <Link
                href={`/login?email=${encodeURIComponent(emailParam)}&verified=true`}
                className="w-full h-11 rounded-xl bg-primary text-primary-foreground text-xs font-bold hover:bg-primary/90 transition-all flex items-center justify-center gap-2 shadow-md shadow-primary/25 cursor-pointer"
              >
                Proceed to Sign In <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        )}

        {status === 'error' && (
          <div className="space-y-4 animate-fade-in">
            <div className="w-16 h-16 rounded-3xl bg-destructive/10 border border-destructive/20 flex items-center justify-center mx-auto text-destructive shadow-lg shadow-destructive/10">
              <AlertCircle className="w-8 h-8 text-destructive" />
            </div>
            <h2 className="text-2xl font-extrabold text-foreground tracking-tight">Verification Issue</h2>
            <p className="text-xs text-muted-foreground leading-relaxed px-2">
              {statusMessage}
            </p>
            <div className="pt-3 space-y-2">
              <Link
                href={`/login?email=${encodeURIComponent(emailParam)}`}
                className="w-full h-11 rounded-xl bg-primary text-primary-foreground text-xs font-bold hover:bg-primary/90 transition-all flex items-center justify-center gap-2 shadow-md shadow-primary/25 cursor-pointer"
              >
                Go to Sign In
              </Link>
              <Link
                href="/register"
                className="block text-xs text-muted-foreground hover:text-foreground font-medium pt-1 transition-colors"
              >
                Back to Sign Up
              </Link>
            </div>
          </div>
        )}
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
