'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import { apiClient } from '@/lib/api-client'
import { useAuthStore } from '@/stores/auth-store'
import { Loader2, CheckCircle2, AlertCircle } from 'lucide-react'

export default function AuthCallbackPage() {
  const router = useRouter()
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')
  const [statusMessage, setStatusMessage] = useState('Verifying Google credentials...')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  useEffect(() => {
    let active = true

    const processOAuth = async () => {
      try {
        // 1. Determine mode: 'signin' (default) vs 'signup'
        let mode: 'signin' | 'signup' = 'signin'
        if (typeof window !== 'undefined') {
          const urlParams = new URLSearchParams(window.location.search)
          const modeParam = urlParams.get('mode')
          const storedMode = localStorage.getItem('tf_auth_mode')
          if (modeParam === 'signup' || storedMode === 'signup') {
            mode = 'signup'
          }
          localStorage.removeItem('tf_auth_mode')
        }

        // 2. Retrieve session from Supabase
        const { data: { session }, error: sessionError } = await supabase.auth.getSession()
        if (sessionError) throw sessionError

        let currentSession = session
        if (!currentSession) {
          // Wait for onAuthStateChange if session isn't available immediately
          currentSession = await new Promise((resolve) => {
            const timeout = setTimeout(() => resolve(null), 4000)
            const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, sess) => {
              if (sess) {
                clearTimeout(timeout)
                subscription.unsubscribe()
                resolve(sess)
              }
            })
          })
        }

        if (!currentSession || !currentSession.user || !active) {
          if (active) {
            setStatus('error')
            setErrorMessage('Unable to retrieve Google session. Please try again.')
          }
          return
        }

        const userEmail = currentSession.user.email?.toLowerCase().trim() || ''
        const metadata = currentSession.user.user_metadata || {}
        const fullName = metadata.full_name || metadata.name || ''
        const avatarUrl = metadata.avatar_url || ''
        const providerId = currentSession.user.id

        if (!userEmail) {
          throw new Error('Google did not provide an email address.')
        }

        // 3. Evaluate Condition: "check user exist or not"
        setStatusMessage('Checking account status...')
        const checkRes = await apiClient.get<{ email: string; exists: boolean }>(
          `/api/v1/auth/check-user?email=${encodeURIComponent(userEmail)}`
        )
        const userExists = !!checkRes.data?.exists

        // === FLOW 1: SIGN IN (initiated from /login) ===
        if (mode === 'signin') {
          if (!userExists) {
            // USER DOES NOT EXIST: Branch to "account creations" (Register page)
            await supabase.auth.signOut()
            if (typeof window !== 'undefined') {
              localStorage.removeItem('accessToken')
              localStorage.removeItem('refreshToken')
            }
            if (active) {
              router.push(
                `/register?email=${encodeURIComponent(userEmail)}&name=${encodeURIComponent(fullName)}&reason=google_not_registered`
              )
            }
            return
          }

          // USER EXISTS: Authenticate via TaskFlow backend -> Dashboard
          setStatusMessage('Signing in to your dashboard...')
          const oauthRes = await apiClient.post<any>('/api/v1/auth/oauth', {
            provider: 'google',
            email: userEmail,
            name: fullName,
            avatarUrl,
            providerId,
            mode: 'signin',
          })

          const authData = oauthRes.data
          const accessToken = authData?.accessToken || currentSession.access_token
          apiClient.setAccessToken(accessToken)
          if (typeof window !== 'undefined') {
            localStorage.setItem('accessToken', accessToken)
            if (authData?.refreshToken) {
              localStorage.setItem('refreshToken', authData.refreshToken)
            }
          }

          if (authData?.user) {
            useAuthStore.setState({
              user: authData.user,
              isAuthenticated: true,
              isLoading: false,
              error: null,
            })
          }

          if (active) {
            setStatus('success')
            setStatusMessage('Authentication successful! Opening dashboard...')
            setTimeout(() => {
              router.push('/app/home')
            }, 600)
          }
          return
        }

        // === FLOW 2: SIGN UP / "google s" (initiated from /register) ===
        if (mode === 'signup') {
          if (userExists) {
            // User is already registered -> Redirect to login page
            await supabase.auth.signOut()
            if (active) {
              router.push(
                `/login?email=${encodeURIComponent(userEmail)}&reason=already_registered`
              )
            }
            return
          }

          // User does not exist -> Create account via backend, send confirmation, redirect to login
          setStatusMessage('Creating your TaskFlow account...')
          await apiClient.post<any>('/api/v1/auth/oauth', {
            provider: 'google',
            email: userEmail,
            name: fullName,
            avatarUrl,
            providerId,
            mode: 'signup',
          })

          // As specified in diagram: account creations -> send email & save to DB -> redirect to login
          await supabase.auth.signOut()
          if (typeof window !== 'undefined') {
            localStorage.removeItem('accessToken')
            localStorage.removeItem('refreshToken')
          }

          if (active) {
            setStatus('success')
            setStatusMessage('Account created successfully! Redirecting to sign in...')
            setTimeout(() => {
              router.push(
                `/login?email=${encodeURIComponent(userEmail)}&google_registered=true`
              )
            }, 800)
          }
          return
        }
      } catch (err: any) {
        if (active) {
          setStatus('error')
          setErrorMessage(err?.response?.data?.message || err?.message || 'Google authentication failed.')
        }
      }
    }

    processOAuth()

    return () => {
      active = false
    }
  }, [router])

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-md p-8 rounded-2xl border border-border bg-card shadow-xl text-center space-y-4">
        {status === 'loading' && (
          <>
            <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto">
              <Loader2 className="w-6 h-6 animate-spin" />
            </div>
            <h2 className="text-lg font-bold text-foreground">Completing authentication...</h2>
            <p className="text-xs text-muted-foreground">{statusMessage}</p>
          </>
        )}

        {status === 'success' && (
          <>
            <div className="w-12 h-12 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <h2 className="text-lg font-bold text-foreground">Authentication Verified!</h2>
            <p className="text-xs text-muted-foreground">{statusMessage}</p>
          </>
        )}

        {status === 'error' && (
          <>
            <div className="w-12 h-12 rounded-full bg-rose-500/10 text-rose-500 flex items-center justify-center mx-auto">
              <AlertCircle className="w-6 h-6" />
            </div>
            <h2 className="text-lg font-bold text-foreground">Authentication Failed</h2>
            <p className="text-xs text-rose-500 font-medium">
              {errorMessage || 'Unable to complete Google authentication.'}
            </p>
            <button
              onClick={() => router.push('/login')}
              className="mt-2 px-4 py-2 bg-primary text-primary-foreground text-xs font-bold rounded-xl hover:bg-primary/90 transition-all cursor-pointer"
            >
              Return to Sign In
            </button>
          </>
        )}
      </div>
    </div>
  )
}
