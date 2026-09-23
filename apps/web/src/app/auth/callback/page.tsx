'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import { apiClient } from '@/lib/api-client'
import { useAuthStore } from '@/stores/auth-store'
import { useOrgStore } from '@/stores/org-store'
import { useWorkspaceStore } from '@/stores/workspace-store'
import { Loader2, CheckCircle2, AlertCircle, User, AtSign, Check } from 'lucide-react'

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
  const [status, setStatus] = useState<'loading' | 'prompt_username' | 'success' | 'error'>('loading')
  const [statusMessage, setStatusMessage] = useState('Verifying Google credentials...')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  // Prompt username state
  const [promptEmail, setPromptEmail] = useState('')
  const [promptUsername, setPromptUsername] = useState('')
  const [promptName, setPromptName] = useState('')
  const [promptAvatarUrl, setPromptAvatarUrl] = useState('')
  const [promptDirectTokens, setPromptDirectTokens] = useState<{ accessToken?: string; refreshToken?: string }>({})
  const [isSubmittingUsername, setIsSubmittingUsername] = useState(false)
  const [isCheckingUsername, setIsCheckingUsername] = useState(false)
  const [usernameStatus, setUsernameStatus] = useState<{ available: boolean; message: string } | null>(null)
  const [usernameError, setUsernameError] = useState<string | null>(null)
  const checkTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Live debounced check for username
  useEffect(() => {
    const cleanUser = promptUsername.trim().toLowerCase()
    if (!cleanUser) {
      setUsernameStatus(null)
      setIsCheckingUsername(false)
      return
    }

    if (cleanUser.length < 3) {
      setUsernameStatus({ available: false, message: 'Username must be at least 3 characters' })
      return
    }

    if (!/^[a-z0-9_-]+$/.test(cleanUser)) {
      setUsernameStatus({ available: false, message: 'Only letters, numbers, underscores, and hyphens allowed' })
      return
    }

    setIsCheckingUsername(true)
    if (checkTimeoutRef.current) clearTimeout(checkTimeoutRef.current)

    checkTimeoutRef.current = setTimeout(async () => {
      try {
        const res = await apiClient.get<{ available: boolean; message: string }>(
          `/api/v1/users/check-username?username=${encodeURIComponent(cleanUser)}`
        )
        if (res.data) {
          setUsernameStatus(res.data)
        }
      } catch {
        setUsernameStatus(null)
      } finally {
        setIsCheckingUsername(false)
      }
    }, 400)

    return () => {
      if (checkTimeoutRef.current) clearTimeout(checkTimeoutRef.current)
    }
  }, [promptUsername])

  const finishAuth = (authData: any, directAccessToken?: string, directRefreshToken?: string) => {
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

    setStatus('success')
    const inviteToken = typeof window !== 'undefined' ? localStorage.getItem('tf_invite_token') : null
    if (inviteToken) {
      setStatusMessage('Google authentication verified! Connecting you to project...')
      apiClient
        .post<any>(`/api/v1/invitations/${inviteToken}/accept`, {})
        .then((res) => {
          if (typeof window !== 'undefined') {
            localStorage.removeItem('tf_invite_token')
            if (authData?.user?.id) {
              localStorage.setItem(`taskflow_onboarding_completed_${authData.user.id}`, 'true')
            }
            localStorage.setItem('taskflow_onboarding_completed', 'true')
          }
          const targetProj = res.data?.projectId
          window.location.href = targetProj ? `/app/projects/${targetProj}` : '/app/home'
        })
        .catch((err) => {
          console.warn('Auto-accept in auth/callback warning:', err)
          window.location.href = `/invite?token=${encodeURIComponent(inviteToken!)}&auto_accept=true`
        })
    } else {
      setStatusMessage('Authentication successful! Opening dashboard...')
      setTimeout(() => {
        window.location.href = '/app/home'
      }, 100)
    }
  }

  const handlePromptSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setUsernameError(null)

    const cleanEmail = promptEmail.trim().toLowerCase()
    const cleanUser = promptUsername.trim().toLowerCase()

    if (!cleanEmail || !cleanEmail.includes('@')) {
      setUsernameError('Please enter a valid Google email address.')
      return
    }

    if (!cleanUser) {
      setUsernameError('Please choose a username.')
      return
    }

    if (usernameStatus && !usernameStatus.available) {
      setUsernameError(usernameStatus.message || 'Username is not available.')
      return
    }

    try {
      setIsSubmittingUsername(true)
      const res = await apiClient.post<any>('/api/v1/auth/oauth', {
        provider: 'google',
        email: cleanEmail,
        username: cleanUser,
        name: promptName || cleanUser,
        avatarUrl: promptAvatarUrl,
      })

      if (res.data?.requiresUsername) {
        setUsernameError('Please provide a unique username.')
        return
      }

      finishAuth(res.data, promptDirectTokens.accessToken, promptDirectTokens.refreshToken)
    } catch (err: any) {
      setUsernameError(err?.response?.data?.message || err?.message || 'Failed to save username.')
    } finally {
      setIsSubmittingUsername(false)
    }
  }

  useEffect(() => {
    let active = true

    const processOAuth = async () => {
      try {
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
        }

        // Check for explicit OAuth error in query or hash
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
        let directAccessToken = ''
        let directRefreshToken = ''

        // 1. Direct Token Extraction from URL Hash fragment
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

              const payload = decodeJwtPayload(token)
              if (payload && payload.email) {
                userEmail = (payload.email as string).toLowerCase().trim()
                const metadata = payload.user_metadata || {}
                fullName = metadata.full_name || metadata.name || payload.name || ''
                avatarUrl = metadata.avatar_url || metadata.picture || payload.picture || ''
              }
            }
          } catch (hashErr) {
            console.warn('[AuthCallback] Hash extraction error:', hashErr)
          }
        }

        // 2. Code exchange fallback
        if (!userEmail && typeof window !== 'undefined') {
          const searchParams = new URLSearchParams(window.location.search)
          const code = searchParams.get('code')
          if (code) {
            try {
              const { data: exchangeData } = await supabase.auth.exchangeCodeForSession(code)
              if (exchangeData?.session?.user) {
                const u = exchangeData.session.user
                userEmail = (u.email || '').toLowerCase().trim()
                const meta = u.user_metadata || {}
                fullName = meta.full_name || meta.name || ''
                avatarUrl = meta.avatar_url || meta.picture || ''
                directAccessToken = exchangeData.session.access_token
                directRefreshToken = exchangeData.session.refresh_token || ''
              }
            } catch (ex) {
              console.debug('[AuthCallback] Code exchange fallback:', ex)
            }
          }
        }

        // 3. Existing Supabase session fallback
        if (!userEmail) {
          const { data: { session } } = await supabase.auth.getSession()
          if (session?.user) {
            userEmail = (session.user.email || '').toLowerCase().trim()
            const meta = session.user.user_metadata || {}
            fullName = meta.full_name || meta.name || ''
            avatarUrl = meta.avatar_url || meta.picture || ''
            directAccessToken = session.access_token
            directRefreshToken = session.refresh_token || ''
          }
        }

        if (!userEmail || !active) {
          if (active) {
            setStatus('error')
            setErrorMessage('Unable to retrieve your Google credentials. Please try signing in again.')
          }
          return
        }

        // Check if pending username was pre-set in localStorage
        const pendingUser = typeof window !== 'undefined' ? localStorage.getItem('tf_pending_username') : null
        if (pendingUser) {
          localStorage.removeItem('tf_pending_username')
        }

        if (active) {
          setStatusMessage('Connecting your TaskFlow account...')
        }

        const oauthRes = await apiClient.post<any>('/api/v1/auth/oauth', {
          provider: 'google',
          email: userEmail,
          name: fullName,
          username: pendingUser || undefined,
          avatarUrl,
          mode,
        })

        const authData = oauthRes.data

        if (authData?.requiresUsername) {
          // Prompt user for username & confirm email
          setPromptEmail(userEmail)
          setPromptName(fullName)
          setPromptAvatarUrl(avatarUrl)
          setPromptDirectTokens({ accessToken: directAccessToken, refreshToken: directRefreshToken })
          const suggestedUser = userEmail.split('@')[0].toLowerCase().replace(/[^a-z0-9_]/g, '')
          setPromptUsername(suggestedUser)
          setStatus('prompt_username')
          return
        }

        finishAuth(authData, directAccessToken, directRefreshToken)
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
      <div className="w-full max-w-md p-8 rounded-3xl border border-border bg-card shadow-2xl text-center space-y-5 animate-scale-in">
        {status === 'loading' && (
          <div className="space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mx-auto shadow-xs">
              <Loader2 className="w-6 h-6 animate-spin" />
            </div>
            <h2 className="text-lg font-bold text-foreground">Completing authentication...</h2>
            <p className="text-xs text-muted-foreground">{statusMessage}</p>
          </div>
        )}

        {status === 'prompt_username' && (
          <div className="text-left space-y-4">
            <div className="text-center space-y-1">
              <div className="w-10 h-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mx-auto shadow-xs">
                <User className="w-5 h-5 text-primary" />
              </div>
              <h2 className="text-base font-bold text-foreground">Complete Google Sign-In</h2>
              <p className="text-xs text-muted-foreground">
                Confirm your email and choose your unique TaskFlow username.
              </p>
            </div>

            {usernameError && (
              <div className="p-3 rounded-2xl bg-destructive/10 border border-destructive/20 text-destructive text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{usernameError}</span>
              </div>
            )}

            <form onSubmit={handlePromptSubmit} className="space-y-3.5">
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                  <AtSign className="w-3.5 h-3.5 text-primary" /> Google Email Address
                </label>
                <input
                  type="email"
                  required
                  value={promptEmail}
                  onChange={(e) => setPromptEmail(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-background border border-border text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary shadow-xs"
                />
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-primary" /> Choose Unique Username *
                  </label>
                  {isCheckingUsername && (
                    <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                      <Loader2 className="w-2.5 h-2.5 animate-spin text-primary" /> Checking...
                    </span>
                  )}
                </div>
                <div className="relative">
                  <input
                    type="text"
                    required
                    placeholder="e.g. anandu, dev_alex"
                    value={promptUsername}
                    onChange={(e) => setPromptUsername(e.target.value)}
                    className={`w-full px-3.5 py-2.5 rounded-xl bg-background border text-xs text-foreground focus:outline-none focus:ring-2 pr-9 shadow-xs transition-colors ${
                      usernameStatus
                        ? usernameStatus.available
                          ? 'border-emerald-500/60 focus:ring-emerald-500'
                          : 'border-destructive/60 focus:ring-destructive'
                        : 'border-border focus:ring-primary'
                    }`}
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    {isCheckingUsername ? (
                      <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                    ) : usernameStatus ? (
                      usernameStatus.available ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                      ) : (
                        <AlertCircle className="w-4 h-4 text-destructive" />
                      )
                    ) : null}
                  </div>
                </div>
                {usernameStatus && (
                  <p
                    className={`text-[10px] font-medium pl-1 flex items-center gap-1 ${
                      usernameStatus.available ? 'text-emerald-600 dark:text-emerald-400' : 'text-destructive'
                    }`}
                  >
                    {usernameStatus.available ? (
                      <>
                        <Check className="w-3 h-3" /> {usernameStatus.message}
                      </>
                    ) : (
                      <>
                        <AlertCircle className="w-3 h-3" /> {usernameStatus.message}
                      </>
                    )}
                  </p>
                )}
              </div>

              <button
                type="submit"
                disabled={isSubmittingUsername || (usernameStatus !== null && !usernameStatus.available)}
                className="w-full py-3 rounded-2xl bg-primary text-primary-foreground hover:bg-primary/90 font-bold text-xs transition-all flex items-center justify-center gap-2 shadow-md active:scale-98 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmittingUsername ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Saving to database...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    <span>Save & Proceed to TaskFlow</span>
                  </>
                )}
              </button>
            </form>
          </div>
        )}

        {status === 'success' && (
          <div className="space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center mx-auto shadow-xs">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <h2 className="text-lg font-bold text-foreground">Authentication Verified!</h2>
            <p className="text-xs text-muted-foreground">{statusMessage}</p>
          </div>
        )}

        {status === 'error' && (
          <div className="space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/10 text-rose-500 flex items-center justify-center mx-auto shadow-xs">
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
          </div>
        )}
      </div>
    </div>
  )
}
