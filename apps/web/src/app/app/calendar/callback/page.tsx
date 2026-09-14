'use client'

import React, { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { useCalendarStore } from '@/stores/calendar-store'
import { useAuthStore } from '@/stores/auth-store'
import { supabase } from '@/lib/supabase/client'
import {
  Loader2,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  KeyRound,
  ArrowLeft,
  ExternalLink,
  Calendar,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
  Copy,
  Check
} from 'lucide-react'

function CalendarOAuthCallbackContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { handleCallback, saveDirectTokens, connectViaSupabase, getAuthUrl } = useCalendarStore()
  const { user } = useAuthStore()

  const [status, setStatus] = useState<'processing' | 'success' | 'error'>('processing')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [showManualInput, setShowManualInput] = useState(false)
  const [showGcpGuide, setShowGcpGuide] = useState(false)
  const [manualToken, setManualToken] = useState('')
  const [isSubmittingToken, setIsSubmittingToken] = useState(false)
  const [copiedUri, setCopiedUri] = useState(false)

  const redirectUri = typeof window !== 'undefined'
    ? `${window.location.origin}/app/calendar/callback`
    : 'http://localhost:3000/app/calendar/callback'

  const copyRedirectUri = () => {
    navigator.clipboard.writeText(redirectUri)
    setCopiedUri(true)
    setTimeout(() => setCopiedUri(false), 2000)
  }

  const isProcessingRef = React.useRef(false)

  useEffect(() => {
    let active = true

    const processCallback = async () => {
      // 1. Check URL search parameters
      const queryCode = searchParams.get('code')
      const queryState = searchParams.get('state')
      const queryError = searchParams.get('error') || searchParams.get('error_description')
      const queryProviderToken = searchParams.get('provider_token')
      const querySource = searchParams.get('source')

      if ((queryCode || queryProviderToken) && isProcessingRef.current) {
        return
      }
      if (queryCode || queryProviderToken) {
        isProcessingRef.current = true
      }

      // 2. Check URL hash parameters (Supabase OAuth returns tokens in window.location.hash)
      let hashParams = new URLSearchParams()
      if (typeof window !== 'undefined' && window.location.hash) {
        const cleanHash = window.location.hash.replace(/^#/, '')
        hashParams = new URLSearchParams(cleanHash)
      }
      const hashError = hashParams.get('error_description') || hashParams.get('error')
      const hashProviderToken = hashParams.get('provider_token')
      const hashProviderRefreshToken = hashParams.get('provider_refresh_token')
      const hashAccessToken = hashParams.get('access_token')

      // Check explicit error from either search or hash
      const explicitError = queryError || hashError
      if (explicitError) {
        if (active) {
          setStatus('error')
          let decoded = decodeURIComponent(explicitError)
          if (decoded.includes('redirect_uri_mismatch')) {
            decoded = 'Google OAuth Redirect URI mismatch: Please register http://localhost:3000/app/calendar/callback in your Google Cloud Console Authorized redirect URIs.'
          } else if (decoded.includes('access_denied')) {
            decoded = 'Access was denied. Please grant Google Calendar permissions to enable synchronization.'
          }
          setErrorMessage(decoded)
        }
        return
      }

      // 3. If hash or query contains provider_token directly
      const effectiveProviderToken = hashProviderToken || queryProviderToken
      if (effectiveProviderToken) {
        try {
          const userEmail = user?.email || undefined
          await saveDirectTokens('google', effectiveProviderToken, hashProviderRefreshToken || undefined, userEmail)
          if (active) {
            setStatus('success')
            setTimeout(() => {
              router.push('/app/calendar?connected=true')
            }, 1200)
          }
          return
        } catch (err: any) {
          if (active) {
            setStatus('error')
            setErrorMessage(err.message || 'Failed to link Google Calendar credentials.')
          }
          return
        }
      }

      // 4. Supabase PKCE Flow (source=supabase or Supabase exchange)
      if (queryCode && (querySource === 'supabase' || !queryState)) {
        try {
          const { data, error } = await supabase.auth.exchangeCodeForSession(queryCode)
          if (!error && data?.session) {
            const providerToken = (data.session as any)?.provider_token
            const providerRefreshToken = (data.session as any)?.provider_refresh_token
            const sessionEmail = data.session.user?.email || user?.email

            if (providerToken) {
              await saveDirectTokens('google', providerToken, providerRefreshToken || undefined, sessionEmail || undefined)
              if (active) {
                setStatus('success')
                setTimeout(() => {
                  router.push('/app/calendar?connected=true')
                }, 1200)
              }
              return
            }
          }
        } catch (ex) {
          console.debug('Supabase PKCE code exchange check:', ex)
        }
      }

      // 5. Direct Google OAuth flow (queryCode with state or direct from Google)
      if (queryCode) {
        let provider: 'google' | 'microsoft' = 'google'
        let workspaceId: string | undefined = undefined

        if (queryState) {
          try {
            const parsed = JSON.parse(decodeURIComponent(queryState))
            if (parsed.provider) provider = parsed.provider
            if (parsed.workspaceId) workspaceId = parsed.workspaceId
          } catch {
            if (queryState.includes('microsoft')) provider = 'microsoft'
          }
        }

        const queryProvider = searchParams.get('provider')
        if (queryProvider === 'microsoft' || queryProvider === 'google') {
          provider = queryProvider
        }

        try {
          await handleCallback(provider, queryCode, workspaceId)
          if (active) {
            setStatus('success')
            setTimeout(() => {
              router.push('/app/calendar?connected=true')
            }, 1200)
          }
          return
        } catch (err: any) {
          console.warn('Direct OAuth code exchange failed, checking Supabase session fallback:', err)
          // Fallback to Supabase code exchange in case source param was absent
          try {
            const { data } = await supabase.auth.exchangeCodeForSession(queryCode)
            if (data?.session && (data.session as any)?.provider_token) {
              await saveDirectTokens('google', (data.session as any).provider_token, (data.session as any).provider_refresh_token, data.session.user?.email || user?.email)
              if (active) {
                setStatus('success')
                setTimeout(() => {
                  router.push('/app/calendar?connected=true')
                }, 1200)
              }
              return
            }
          } catch {}

          if (active) {
            setStatus('error')
            setErrorMessage(err.message || 'Failed to exchange OAuth authorization code.')
          }
          return
        }
      }

      // 6. Check existing Supabase session (in case tokens are already cached in session)
      try {
        const { data: { session } } = await supabase.auth.getSession()
        let providerToken = (session as any)?.provider_token
        let providerRefreshToken = (session as any)?.provider_refresh_token
        let sessionEmail = session?.user?.email || user?.email

        if (providerToken) {
          await saveDirectTokens('google', providerToken, providerRefreshToken || undefined, sessionEmail || undefined)
          if (active) {
            setStatus('success')
            setTimeout(() => {
              router.push('/app/calendar?connected=true')
            }, 1200)
          }
          return
        }
      } catch (err: any) {
        console.warn('Supabase session inspection warning:', err)
      }

      // 7. No active callback parameters in URL - show clean Connection Hub
      if (active) {
        setStatus('error')
        setErrorMessage('Ready to link your Google Calendar with TaskFlow.')
      }
    }

    processCallback()

    return () => {
      active = false
    }
  }, [searchParams, handleCallback, saveDirectTokens, router, user])

  const handleRetryInstant = async () => {
    try {
      setStatus('processing')
      setErrorMessage(null)
      await connectViaSupabase('google')
    } catch (err: any) {
      setStatus('error')
      setErrorMessage(err.message || 'Failed to connect via Supabase.')
    }
  }

  const handleRetryDirect = async () => {
    try {
      setStatus('processing')
      setErrorMessage(null)
      const url = await getAuthUrl('google')
      if (url) {
        window.location.href = url
      }
    } catch (err: any) {
      setStatus('error')
      setErrorMessage(err.message || 'Failed to get direct OAuth authorization URL.')
    }
  }

  const handleManualTokenSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!manualToken.trim()) return
    setIsSubmittingToken(true)
    try {
      await saveDirectTokens('google', manualToken.trim(), undefined, user?.email || undefined)
      setStatus('success')
      setTimeout(() => {
        router.push('/app/calendar?connected=true')
      }, 1200)
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to connect with provided token.')
    } finally {
      setIsSubmittingToken(false)
    }
  }

  return (
    <div className="min-h-[75vh] flex items-center justify-center p-4 sm:p-6">
      <div className="w-full max-w-lg p-6 sm:p-8 rounded-3xl border border-border/80 bg-card/85 backdrop-blur-xl shadow-2xl text-center space-y-4 animate-fade-in">
        {status === 'processing' && (
          <div className="space-y-3 py-6">
            <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto text-primary animate-pulse">
              <Loader2 className="w-7 h-7 animate-spin" />
            </div>
            <h2 className="text-lg font-bold text-foreground">Syncing Google Calendar</h2>
            <p className="text-xs text-muted-foreground leading-relaxed max-w-sm mx-auto">
              Exchanging secure credentials, discovering calendar list, and initializing two-way TaskFlow synchronization...
            </p>
          </div>
        )}

        {status === 'success' && (
          <div className="space-y-3 py-6">
            <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto text-emerald-400">
              <CheckCircle2 className="w-7 h-7" />
            </div>
            <h2 className="text-lg font-bold text-foreground">Calendar Connected Successfully!</h2>
            <p className="text-xs text-muted-foreground leading-relaxed max-w-sm mx-auto">
              Your Google Calendar is linked with TaskFlow. All sprint tasks, due dates, and deliverable milestones are syncing. Redirecting to Sprint Calendar...
            </p>
          </div>
        )}

        {status === 'error' && (
          <div className="space-y-4 text-left">
            <div className="text-center space-y-2">
              <div className="w-12 h-12 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto text-primary">
                <Calendar className="w-6 h-6" />
              </div>
              <h2 className="text-lg font-bold text-foreground">
                Google Calendar Sync Hub
              </h2>
              <p className="text-xs text-muted-foreground leading-relaxed max-w-sm mx-auto">
                {errorMessage?.includes('Ready to link')
                  ? 'Connect your Google Calendar to synchronize tasks, sprint due dates, and deliverable milestones automatically.'
                  : errorMessage}
              </p>
            </div>

            {/* Quick Action Buttons */}
            <div className="space-y-2.5 pt-2">
              <button
                type="button"
                onClick={handleRetryInstant}
                className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-lg shadow-blue-500/25 transition-all cursor-pointer active:scale-98"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Connect with Google (Instant One-Click)</span>
              </button>

              <button
                type="button"
                onClick={handleRetryDirect}
                className="w-full py-2.5 px-4 rounded-xl border border-border/80 bg-background/50 hover:bg-muted/70 text-foreground text-xs font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                <ExternalLink className="w-3.5 h-3.5 text-primary" />
                <span>Connect via Direct Google OAuth</span>
              </button>

              {/* Collapsible Google Cloud Console Setup Checklist */}
              <div className="border border-border/70 rounded-2xl overflow-hidden bg-background/40">
                <button
                  type="button"
                  onClick={() => setShowGcpGuide(!showGcpGuide)}
                  className="w-full px-3.5 py-2.5 flex items-center justify-between text-[11px] font-semibold text-foreground hover:bg-muted/40 transition-colors cursor-pointer"
                >
                  <span className="flex items-center gap-2">
                    <ShieldCheck className="w-3.5 h-3.5 text-primary" />
                    Google Cloud Console Setup Checklist
                  </span>
                  {showGcpGuide ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                </button>

                {showGcpGuide && (
                  <div className="p-3.5 pt-1 space-y-3 text-[11px] text-muted-foreground border-t border-border/60 animate-fade-in">
                    <p className="leading-relaxed">
                      To ensure Google Calendar connects without <code className="text-foreground bg-muted px-1 py-0.5 rounded font-mono">redirect_uri_mismatch</code>:
                    </p>
                    <ol className="list-decimal list-inside space-y-1.5 leading-relaxed text-foreground/90 pl-1">
                      <li>Open <a href="https://console.cloud.google.com/apis/credentials" target="_blank" rel="noreferrer" className="text-primary hover:underline font-semibold">Google Cloud Credentials Console ↗</a></li>
                      <li>Select your OAuth 2.0 Web Client ID: <span className="font-mono text-[10px] text-muted-foreground block truncate">467128497270-r9o4vs5bdk699dtl58qpoij7k86f4j7t...</span></li>
                      <li>Under <strong>Authorized redirect URIs</strong>, paste this exact callback URI:</li>
                    </ol>

                    <div className="flex items-center gap-1.5 bg-card px-2.5 py-1.5 rounded-xl border border-border font-mono text-[10px] text-foreground">
                      <span className="truncate flex-1">{redirectUri}</span>
                      <button
                        type="button"
                        onClick={copyRedirectUri}
                        className="shrink-0 p-1 hover:bg-muted rounded text-foreground transition-colors cursor-pointer"
                        title="Copy Redirect URI"
                      >
                        {copiedUri ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>

                    <p className="leading-relaxed">
                      4. In <strong>Enabled APIs & Services</strong>, make sure <a href="https://console.cloud.google.com/apis/library/calendar-json.googleapis.com" target="_blank" rel="noreferrer" className="text-primary hover:underline font-semibold">Google Calendar API ↗</a> is enabled.
                    </p>
                  </div>
                )}
              </div>

              {/* Manual Access Token Option */}
              <button
                type="button"
                onClick={() => setShowManualInput(!showManualInput)}
                className="w-full text-center text-[11px] text-muted-foreground hover:text-foreground py-1 transition-colors cursor-pointer"
              >
                {showManualInput ? 'Hide Manual Access Token Option' : 'Connect with Google Access Token instead'}
              </button>

              {showManualInput && (
                <form onSubmit={handleManualTokenSubmit} className="p-3.5 rounded-2xl bg-background/80 border border-border/70 space-y-2.5 text-xs animate-fade-in">
                  <div className="flex items-center gap-1.5 text-muted-foreground text-[11px]">
                    <KeyRound className="w-3.5 h-3.5 text-primary" />
                    <span className="font-semibold text-foreground">Google OAuth Access Token</span>
                  </div>
                  <input
                    type="password"
                    value={manualToken}
                    onChange={(e) => setManualToken(e.target.value)}
                    placeholder="ya29.a0Ac..."
                    className="w-full px-3 py-2 rounded-xl bg-card border border-border/80 text-xs text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-1 focus:ring-primary font-mono"
                  />
                  <button
                    type="submit"
                    disabled={isSubmittingToken || !manualToken.trim()}
                    className="w-full py-2 rounded-xl bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50 cursor-pointer"
                  >
                    {isSubmittingToken ? 'Linking Token...' : 'Save & Sync Token'}
                  </button>
                </form>
              )}

              {/* Navigation Back Links */}
              <div className="pt-2 flex items-center justify-between gap-2 border-t border-border/60">
                <Link
                  href="/app/calendar"
                  className="py-2 px-3 rounded-xl text-xs font-semibold text-primary hover:bg-primary/10 transition-colors flex items-center gap-1.5"
                >
                  <Calendar className="w-3.5 h-3.5" />
                  <span>Go to Sprint Calendar</span>
                </Link>

                <Link
                  href="/app/settings?tab=calendar"
                  className="py-2 px-3 rounded-xl text-xs text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors flex items-center gap-1.5"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Calendar Settings</span>
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default function CalendarOAuthCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[75vh] flex items-center justify-center p-6">
          <div className="p-8 rounded-3xl border border-border/80 bg-card/70 backdrop-blur-xl text-center space-y-3">
            <Loader2 className="w-6 h-6 animate-spin text-primary mx-auto" />
            <p className="text-xs text-muted-foreground">Loading calendar connection...</p>
          </div>
        </div>
      }
    >
      <CalendarOAuthCallbackContent />
    </Suspense>
  )
}
