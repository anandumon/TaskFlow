'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import { apiClient } from '@/lib/api-client'
import { useAuthStore } from '@/stores/auth-store'
import { useOrgStore } from '@/stores/org-store'
import { useWorkspaceStore } from '@/stores/workspace-store'
import { Loader2, CheckCircle2, AlertCircle } from 'lucide-react'

// Helper: Safely decode standard JWT payload in browser
function decodeJwtPayload(token: string): any {
  try {
    const parts = token.split('.')
    if (parts.length < 2) return null
    const base64Url = parts[1]
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/')
    const raw = atob(base64)
    const jsonStr = decodeURIComponent(
      Array.prototype.map
        .call(raw, (c: string) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    )
    return JSON.parse(jsonStr)
  } catch {
    try {
      return JSON.parse(atob(token.split('.')[1]))
    } catch {
      return null
    }
  }
}

export default function AuthCallbackPage() {
  const router = useRouter()
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')
  const [statusMessage, setStatusMessage] = useState('Verifying Google credentials...')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  useEffect(() => {
    let active = true

    const processOAuth = async () => {
      try {
        // 1. Determine mode: 'signin' vs 'signup' and invite token
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

        // 2. Check for explicit OAuth error in query or hash
        if (typeof window !== 'undefined') {
          const searchParams = new URLSearchParams(window.location.search)
          const hashString = window.location.hash.startsWith('#')
            ? window.location.hash.substring(1)
            : window.location.hash
          const hashParams = new URLSearchParams(hashString)

          const oauthError =
            searchParams.get('error_description') ||
            searchParams.get('error') ||
            hashParams.get('error_description') ||
            hashParams.get('error')

          if (oauthError) {
            if (active) {
              setStatus('error')
              setErrorMessage(oauthError.replace(/\+/g, ' '))
            }
            return
          }
        }

        let userEmail = ''
        let fullName = ''
        let avatarUrl = ''
        let providerId = ''
        let directAccessToken = ''
        let directRefreshToken = ''

        // 3. PRIORITY 1: Direct Token Extraction from URL Hash fragment (#access_token=...)
        // This is where Supabase Google OAuth returns session credentials instantly!
        if (typeof window !== 'undefined' && window.location.hash) {
          try {
            const hashString = window.location.hash.startsWith('#')
              ? window.location.hash.substring(1)
              : window.location.hash
            const hashParams = new URLSearchParams(hashString)
            const token = hashParams.get('access_token')
            const refreshToken = hashParams.get('refresh_token')

            if (token) {
              directAccessToken = token
              directRefreshToken = refreshToken || ''

              // Directly decode JWT payload in 0ms without waiting for external network calls
              const payload = decodeJwtPayload(token)
              if (payload && payload.email) {
                userEmail = (payload.email as string).toLowerCase().trim()
                const metadata = payload.user_metadata || {}
                fullName = metadata.full_name || metadata.name || payload.name || ''
                avatarUrl = metadata.avatar_url || metadata.picture || payload.picture || ''
                providerId = payload.sub || ''

                // Non-blocking sync with Supabase client in background
                supabase.auth
                  .setSession({
                    access_token: token,
                    refresh_token: directRefreshToken,
                  })
                  .catch((err) => {
                    console.debug('[AuthCallback] Non-fatal setSession sync:', err)
                  })
              }
            }
          } catch (hashErr) {
            console.warn('[AuthCallback] Hash extraction error:', hashErr)
          }
        }

        // 4. PRIORITY 2: Code exchange if ?code= is present (with 4s timeout)
        if (!userEmail && typeof window !== 'undefined') {
          const searchParams = new URLSearchParams(window.location.search)
          const code = searchParams.get('code')
          if (code) {
            try {
              const exchangePromise = supabase.auth.exchangeCodeForSession(code)
              const timeoutPromise = new Promise<{ data: { session: null }; error: any }>((resolve) =>
                setTimeout(() => resolve({ data: { session: null }, error: 'Timeout' }), 4000)
              )
              const { data: exchangeData } = await Promise.race([exchangePromise, timeoutPromise])
              if (exchangeData?.session?.user) {
                const u = exchangeData.session.user
                userEmail = (u.email || '').toLowerCase().trim()
                const meta = u.user_metadata || {}
                fullName = meta.full_name || meta.name || ''
                avatarUrl = meta.avatar_url || meta.picture || ''
                providerId = u.id || ''
                directAccessToken = exchangeData.session.access_token
                directRefreshToken = exchangeData.session.refresh_token || ''
              }
            } catch (ex) {
              console.debug('[AuthCallback] Code exchange fallback:', ex)
            }
          }
        }

        // 5. PRIORITY 3: Existing Supabase session with 3s timeout
        if (!userEmail) {
          try {
            const getSessionPromise = supabase.auth.getSession()
            const timeoutPromise = new Promise<{ data: { session: null } }>((resolve) =>
              setTimeout(() => resolve({ data: { session: null } }), 3000)
            )
            const { data: { session } } = await Promise.race([getSessionPromise, timeoutPromise])
            if (session?.user) {
              userEmail = (session.user.email || '').toLowerCase().trim()
              const meta = session.user.user_metadata || {}
              fullName = meta.full_name || meta.name || ''
              avatarUrl = meta.avatar_url || meta.picture || ''
              providerId = session.user.id || ''
              directAccessToken = session.access_token
              directRefreshToken = session.refresh_token || ''
            }
          } catch (sessErr) {
            console.debug('[AuthCallback] Session check fallback:', sessErr)
          }
        }

        // 6. PRIORITY 4: onAuthStateChange with 3s timeout
        if (!userEmail) {
          const authStateSession: any = await new Promise((resolve) => {
            const timer = setTimeout(() => resolve(null), 3000)
            const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, sess) => {
              if (sess) {
                clearTimeout(timer)
                subscription.unsubscribe()
                resolve(sess)
              }
            })
          })

          if (authStateSession?.user) {
            userEmail = (authStateSession.user.email || '').toLowerCase().trim()
            const meta = authStateSession.user.user_metadata || {}
            fullName = meta.full_name || meta.name || ''
            avatarUrl = meta.avatar_url || meta.picture || ''
            providerId = authStateSession.user.id || ''
            directAccessToken = authStateSession.access_token
            directRefreshToken = authStateSession.refresh_token || ''
          }
        }

        // If after all attempts we still don't have user info
        if (!userEmail || !active) {
          if (active) {
            setStatus('error')
            setErrorMessage('Unable to retrieve your Google credentials. Please try signing in again.')
          }
          return
        }

        // 7. Authenticate & Sync with TaskFlow Backend
        if (active) {
          setStatusMessage('Connecting your TaskFlow account...')
        }

        const oauthRes = await apiClient.post<any>('/api/v1/auth/oauth', {
          provider: 'google',
          email: userEmail,
          name: fullName,
          avatarUrl,
          providerId,
          mode,
        })

        const authData = oauthRes.data
        const tokenToSave = authData?.accessToken || directAccessToken

        if (tokenToSave) {
          apiClient.setAccessToken(tokenToSave)
          if (typeof window !== 'undefined') {
            localStorage.setItem('accessToken', tokenToSave)
            const refreshToSave = authData?.refreshToken || directRefreshToken
            if (refreshToSave) {
              localStorage.setItem('refreshToken', refreshToSave)
            }
          }
        }

        // Reset previous stores to prevent cross-account contamination
        useOrgStore.setState({ organizations: [], currentOrg: null, members: [] })
        useWorkspaceStore.setState({ workspaces: [], currentWorkspace: null, members: [], teams: [] })

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
            }, 100)
          } else {
            setStatusMessage('Authentication successful! Opening dashboard...')
            setTimeout(() => {
              router.push('/app/home')
            }, 100)
          }
        }
      } catch (err: any) {
        console.error('[AuthCallback] Error completing authentication:', err)
        if (active) {
          setStatus('error')
          setErrorMessage(
            err?.response?.data?.message || err?.message || 'Google authentication could not be completed.'
          )
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
              <Loader2 className="w-6 h-6 animate-spin text-[#00638E]" />
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
            <div className="pt-2 flex justify-center gap-2">
              <button
                onClick={() => router.push('/login')}
                className="px-4 py-2 bg-primary text-primary-foreground text-xs font-bold rounded-xl hover:bg-primary/90 transition-all cursor-pointer"
              >
                Return to Sign In
              </button>
              <button
                onClick={() => window.location.reload()}
                className="px-4 py-2 bg-muted text-foreground text-xs font-medium rounded-xl hover:bg-muted/80 transition-all cursor-pointer"
              >
                Retry
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
