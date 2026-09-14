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
        let inviteToken: string | null = null
        if (typeof window !== 'undefined') {
          const urlParams = new URLSearchParams(window.location.search)
          const modeParam = urlParams.get('mode')
          const storedMode = localStorage.getItem('tf_auth_mode')
          if (modeParam === 'signup' || storedMode === 'signup') {
            mode = 'signup'
          }
          inviteToken = urlParams.get('invite_token') || localStorage.getItem('tf_invite_token')
          localStorage.removeItem('tf_auth_mode')
          if (inviteToken) {
            localStorage.removeItem('tf_invite_token')
          }
        }

        // 2. Retrieve session from Supabase - Immediate code exchange if code query param is present
        const urlParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null
        
        // Check if OAuth provider returned an explicit error (e.g. user cancelled)
        const oauthError = urlParams?.get('error_description') || urlParams?.get('error')
        if (oauthError) {
          if (active) {
            setStatus('error')
            setErrorMessage(oauthError.replace(/\+/g, ' '))
          }
          return
        }

        const codeParam = urlParams?.get('code')
        let currentSession: any = null

        if (codeParam) {
          try {
            const { data: exchangeData, error: exchangeError } = await supabase.auth.exchangeCodeForSession(codeParam)
            if (!exchangeError && exchangeData?.session) {
              currentSession = exchangeData.session
            }
          } catch (ex) {
            console.debug('Code exchange fallback:', ex)
          }
        }

        if (!currentSession) {
          const { data: { session }, error: sessionError } = await supabase.auth.getSession()
          if (!sessionError && session) {
            currentSession = session
          }
        }

        // Support direct tokens returned in hash fragment (#access_token=...)
        if (!currentSession && typeof window !== 'undefined' && window.location.hash) {
          try {
            const hashString = window.location.hash.startsWith('#') ? window.location.hash.substring(1) : window.location.hash
            const hashParams = new URLSearchParams(hashString)
            const hashAccessToken = hashParams.get('access_token')
            const hashRefreshToken = hashParams.get('refresh_token')

            if (hashAccessToken) {
              const { data: sessionData } = await supabase.auth.setSession({
                access_token: hashAccessToken,
                refresh_token: hashRefreshToken || '',
              })
              if (sessionData?.session) {
                currentSession = sessionData.session
              } else {
                const { data: userData } = await supabase.auth.getUser(hashAccessToken)
                if (userData?.user) {
                  currentSession = {
                    access_token: hashAccessToken,
                    refresh_token: hashRefreshToken,
                    user: userData.user,
                  }
                }
              }
            }
          } catch (hashErr) {
            console.debug('Hash parameter parsing fallback:', hashErr)
          }
        }

        if (!currentSession) {
          // Robust fallback: listen for auth state change up to 4s
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

        // 3. Authenticate / register seamlessly via TaskFlow backend
        setStatusMessage('Connecting your TaskFlow account...')
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
          if (inviteToken) {
            setStatusMessage('Google authentication verified! Opening project invite...')
            setTimeout(() => {
              router.push(`/invite?token=${encodeURIComponent(inviteToken!)}&auto_accept=true`)
            }, 150)
          } else {
            setStatusMessage('Authentication successful! Opening dashboard...')
            setTimeout(() => {
              router.push('/app/home')
            }, 150)
          }
        }
        return
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
