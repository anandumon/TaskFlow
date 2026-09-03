'use client'

import React, { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { useAuthStore } from '@/stores/auth-store'
import { Loader2, CheckCircle2, AlertCircle, UserPlus, ArrowRight } from 'lucide-react'

function OAuthCallbackContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { socialLogin, clearError } = useAuthStore()

  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [isAccountNotFound, setIsAccountNotFound] = useState(false)

  useEffect(() => {
    const code = searchParams.get('code') || ''
    const idToken = searchParams.get('id_token') || ''
    const stateStr = searchParams.get('state')
    const error = searchParams.get('error')

    if (error) {
      setStatus('error')
      setErrorMessage(`Authentication was cancelled or failed: ${error}`)
      return
    }

    if (!code && !idToken) {
      setStatus('error')
      setErrorMessage('No authorization code or ID token was returned by the identity provider.')
      return
    }

    let parsedState: any = {}
    try {
      if (stateStr) {
        parsedState = JSON.parse(decodeURIComponent(stateStr))
      }
    } catch {
      // ignore
    }

    const provider = parsedState.provider || 'google'
    const mode = parsedState.mode || 'signin'

    // Exchange Google Auth code with TaskFlow backend
    const exchangeOAuthCode = async () => {
      try {
        await socialLogin(
          provider,
          `${provider}.user@taskflow.dev`,
          'Google User',
          code || undefined,
          idToken || undefined,
          mode
        )
        setStatus('success')
        setTimeout(() => {
          router.push(parsedState.returnUrl || '/app/home')
        }, 800)
      } catch (err: any) {
        setStatus('error')
        const msg =
          err?.response?.data?.message || err?.message || 'Failed to complete OAuth authentication.'
        setErrorMessage(msg)
        if (msg.includes('Sign Up') || msg.includes('No TaskFlow account found') || err?.response?.status === 404) {
          setIsAccountNotFound(true)
        }
      }
    }

    exchangeOAuthCode()
  }, [searchParams, router, socialLogin])

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-6">
      <div className="max-w-md w-full p-8 rounded-3xl bg-card border border-border shadow-xl text-center space-y-5 animate-scale-in">
        {status === 'loading' && (
          <div className="space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto text-primary animate-pulse">
              <Loader2 className="w-7 h-7 animate-spin" />
            </div>
            <h2 className="text-xl font-bold text-foreground">Completing authentication...</h2>
            <p className="text-xs text-muted-foreground">
              Securing connection and loading your TaskFlow workspace.
            </p>
          </div>
        )}

        {status === 'success' && (
          <div className="space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 flex items-center justify-center mx-auto text-emerald-500">
              <CheckCircle2 className="w-7 h-7" />
            </div>
            <h2 className="text-xl font-bold text-foreground">Authenticated!</h2>
            <p className="text-xs text-muted-foreground">
              Redirecting you to your workspace now...
            </p>
          </div>
        )}

        {status === 'error' && (
          <div className="space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-destructive/10 flex items-center justify-center mx-auto text-destructive">
              <AlertCircle className="w-7 h-7" />
            </div>
            <h2 className="text-xl font-bold text-foreground">
              {isAccountNotFound ? 'Account Not Found' : 'Authentication failed'}
            </h2>
            <p className="text-xs text-muted-foreground leading-relaxed px-2">
              {errorMessage}
            </p>

            {isAccountNotFound ? (
              <div className="pt-2 space-y-2">
                <Link
                  href="/register"
                  onClick={() => clearError()}
                  className="w-full h-11 rounded-xl bg-primary text-primary-foreground text-xs font-bold hover:bg-primary/90 transition-all flex items-center justify-center gap-2 shadow-md shadow-primary/25 cursor-pointer"
                >
                  <UserPlus className="w-4 h-4" /> Go to Sign Up to Create Account
                </Link>
                <Link
                  href="/login"
                  onClick={() => clearError()}
                  className="block text-xs text-muted-foreground hover:text-foreground font-medium pt-1 transition-colors"
                >
                  Back to Sign In
                </Link>
              </div>
            ) : (
              <div className="pt-2">
                <button
                  onClick={() => {
                    clearError()
                    router.push('/login')
                  }}
                  className="w-full h-11 rounded-xl bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-all cursor-pointer"
                >
                  Return to Sign In
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default function OAuthCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      }
    >
      <OAuthCallbackContent />
    </Suspense>
  )
}
