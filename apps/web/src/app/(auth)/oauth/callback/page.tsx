'use client'

import React, { useEffect, useState, useRef, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { useAuthStore } from '@/stores/auth-store'
import { Loader2, CheckCircle2, AlertCircle, ArrowRight } from 'lucide-react'

function OAuthCallbackContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { socialLogin } = useAuthStore()

  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  // Guard against React StrictMode duplicate execution
  const hasExecutedRef = useRef(false)

  useEffect(() => {
    if (hasExecutedRef.current) return
    hasExecutedRef.current = true

    const code = searchParams.get('code') || ''
    const idToken = searchParams.get('id_token') || ''
    let stateStr = searchParams.get('state')
    const error = searchParams.get('error')

    if (error) {
      setStatus('error')
      setErrorMessage(`Authentication was cancelled or failed: ${error}`)
      return
    }

    // Extract id_token, access_token, and state from URL hash or search params
    let effectiveIdToken = idToken
    let effectiveAccessToken = ''
    if (typeof window !== 'undefined' && window.location.hash) {
      const hashParams = new URLSearchParams(window.location.hash.substring(1))
      if (!effectiveIdToken) {
        effectiveIdToken = hashParams.get('id_token') || ''
      }
      if (!effectiveAccessToken) {
        effectiveAccessToken = hashParams.get('access_token') || ''
      }
      if (!stateStr) {
        stateStr = hashParams.get('state')
      }
    }

    if (!code && !effectiveIdToken && !effectiveAccessToken) {
      setStatus('error')
      setErrorMessage('No authorization code or token was returned by Google.')
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

    const handleCallbackFlow = async () => {
      let decodedGoogleEmail = ''
      let decodedGoogleName = ''
      let decodedFirstName = ''
      let decodedLastName = ''
      let decodedSub = ''
      let decodedAvatar = ''

      // 1. Decode Google id_token if available
      if (effectiveIdToken) {
        try {
          const parts = effectiveIdToken.split('.')
          if (parts.length >= 2) {
            const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/')
            const jsonPayload = decodeURIComponent(
              atob(base64)
                .split('')
                .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
                .join('')
            )
            const payload = JSON.parse(jsonPayload)
            decodedGoogleEmail = payload.email || ''
            decodedFirstName = payload.given_name || ''
            decodedLastName = payload.family_name || ''
            decodedGoogleName = payload.name || `${decodedFirstName} ${decodedLastName}`.trim()
            decodedSub = payload.sub || ''
            decodedAvatar = payload.picture || ''
          }
        } catch (decodeErr) {
          console.warn('Could not decode Google ID token:', decodeErr)
        }
      }

      // 2. If access_token available and email still missing, fetch Google userinfo
      if (!decodedGoogleEmail && effectiveAccessToken) {
        try {
          const userinfoRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
            headers: { Authorization: `Bearer ${effectiveAccessToken}` },
          })
          if (userinfoRes.ok) {
            const info = await userinfoRes.json()
            decodedGoogleEmail = info.email || ''
            decodedFirstName = info.given_name || decodedFirstName
            decodedLastName = info.family_name || decodedLastName
            decodedGoogleName = info.name || decodedGoogleName
            decodedSub = info.sub || decodedSub
            decodedAvatar = info.picture || decodedAvatar
          }
        } catch (infoErr) {
          console.warn('UserInfo fetch warning:', infoErr)
        }
      }

      const emailToUse = decodedGoogleEmail || (parsedState.email ? parsedState.email.trim().toLowerCase() : '')
      const nameToUse = decodedGoogleName || (emailToUse ? emailToUse.split('@')[0] : 'Google User')
      const providerIdToUse = decodedSub || (code ? code.substring(0, 100) : `${provider}-${Date.now()}`)

      // If email could not be extracted at all, automatically redirect to register page
      if (!emailToUse) {
        const targetUrl = `/register?provider=google&googleId=${encodeURIComponent(providerIdToUse)}&reason=google_not_found`
        router.replace(targetUrl)
        return
      }

      // 3. Authenticate with TaskFlow backend
      try {
        await socialLogin(
          provider,
          emailToUse,
          nameToUse,
          code || undefined,
          effectiveIdToken || undefined,
          mode,
          providerIdToUse
        )

        setStatus('success')

        setTimeout(() => {
          // Authentication successful: take the user straight inside the app!
          window.location.replace(parsedState.returnUrl || '/app/home')
        }, 300)
      } catch (err: any) {
        const msg =
          err?.response?.data?.error?.message ||
          err?.response?.data?.message ||
          err?.message ||
          'Failed to complete OAuth authentication.'
        const statusCode = err?.response?.status || err?.response?.data?.error?.status

        // Non-existent user on signin: AUTOMATICALLY redirect to signup page!
        if (
          statusCode === 404 ||
          msg.includes('No TaskFlow account found') ||
          msg.includes('Please sign up')
        ) {
          const targetUrl = `/register?email=${encodeURIComponent(
            emailToUse
          )}&firstName=${encodeURIComponent(decodedFirstName)}&lastName=${encodeURIComponent(
            decodedLastName
          )}&provider=google&googleId=${encodeURIComponent(
            providerIdToUse
          )}&reason=google_not_found`
          
          // Use window.location.replace to eliminate any Next.js soft navigation stall
          window.location.replace(targetUrl)
          return
        }

        setStatus('error')
        setErrorMessage(msg)
      }
    }

    handleCallbackFlow()
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
              Connecting your Google account with TaskFlow.
            </p>
          </div>
        )}

        {status === 'success' && (
          <div className="space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 flex items-center justify-center mx-auto text-emerald-500">
              <CheckCircle2 className="w-7 h-7" />
            </div>
            <h2 className="text-xl font-bold text-foreground">Authentication Successful!</h2>
            <p className="text-xs text-muted-foreground">
              Redirecting you to TaskFlow...
            </p>
          </div>
        )}

        {status === 'error' && (
          <div className="space-y-5">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto bg-destructive/10 text-destructive">
              <AlertCircle className="w-7 h-7 text-destructive" />
            </div>

            <div className="space-y-1.5">
              <h2 className="text-lg font-bold text-foreground">Authentication Failed</h2>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {errorMessage}
              </p>
            </div>

            <div className="pt-2">
              <Link
                href="/login"
                className="inline-flex items-center justify-center w-full h-11 rounded-xl bg-secondary text-secondary-foreground font-semibold text-xs hover:bg-secondary/80 transition-all cursor-pointer"
              >
                Return to Sign In
              </Link>
            </div>
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
        <div className="min-h-screen flex items-center justify-center bg-background">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      }
    >
      <OAuthCallbackContent />
    </Suspense>
  )
}
