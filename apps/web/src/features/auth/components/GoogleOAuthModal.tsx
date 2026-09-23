'use client'

import { useState, useEffect, useRef } from 'react'
import { X, Globe, Check, AlertCircle, Loader2, CheckCircle2, AtSign, User } from 'lucide-react'
import { apiClient } from '@/lib/api-client'

interface GoogleOAuthModalProps {
  isOpen: boolean
  onClose: () => void
  onDirectGoogleLogin: (email: string, username: string, name?: string) => Promise<void>
  initialEmail?: string
}

export function GoogleOAuthModal({
  isOpen,
  onClose,
  onDirectGoogleLogin,
  initialEmail = '',
}: GoogleOAuthModalProps) {
  const [googleEmail, setGoogleEmail] = useState(initialEmail)
  const [username, setUsername] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  // Username validation state
  const [isCheckingUsername, setIsCheckingUsername] = useState(false)
  const [usernameStatus, setUsernameStatus] = useState<{
    available: boolean
    message: string
  } | null>(null)

  const checkTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    if (initialEmail) {
      setGoogleEmail(initialEmail)
      if (!username) {
        const prefix = initialEmail.split('@')[0].toLowerCase().replace(/[^a-z0-9_]/g, '')
        if (prefix) setUsername(prefix)
      }
    }
  }, [initialEmail])

  // Live debounced check for username uniqueness
  useEffect(() => {
    const cleanUser = username.trim().toLowerCase()
    if (!cleanUser) {
      setUsernameStatus(null)
      setIsCheckingUsername(false)
      return
    }

    if (cleanUser.length < 3) {
      setUsernameStatus({
        available: false,
        message: 'Username must be at least 3 characters',
      })
      return
    }

    if (!/^[a-z0-9_-]+$/.test(cleanUser)) {
      setUsernameStatus({
        available: false,
        message: 'Only letters, numbers, underscores, and hyphens allowed',
      })
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
  }, [username])

  if (!isOpen) return null

  const handleRedirectToSupabaseGoogleOAuth = () => {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://dxrcfczdfstnymbeicmq.supabase.co'
    const inviteToken = typeof window !== 'undefined' ? localStorage.getItem('tf_invite_token') : null
    const redirectUrl = `${window.location.origin}/auth/callback${inviteToken ? `?invite_token=${encodeURIComponent(inviteToken)}` : ''}`
    if (typeof window !== 'undefined') {
      if (username.trim()) {
        localStorage.setItem('tf_pending_username', username.trim().toLowerCase())
      }
    }
    window.location.href = `${supabaseUrl}/auth/v1/authorize?provider=google&redirect_to=${encodeURIComponent(
      redirectUrl
    )}&prompt=select_account`
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError(null)

    const cleanEmail = googleEmail.trim().toLowerCase()
    const cleanUser = username.trim().toLowerCase()

    if (!cleanEmail || !cleanEmail.includes('@') || !cleanEmail.includes('.')) {
      setFormError('Please enter a valid Google email address.')
      return
    }

    if (!cleanUser) {
      setFormError('Please choose a username.')
      return
    }

    if (usernameStatus && !usernameStatus.available) {
      setFormError(usernameStatus.message || 'Username is not available.')
      return
    }

    try {
      setIsSubmitting(true)
      await onDirectGoogleLogin(cleanEmail, cleanUser, displayName.trim() || undefined)
    } catch (err: any) {
      setFormError(err?.message || 'Failed to sign in with Google account.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-md animate-fade-in">
      <div className="w-full max-w-md bg-card border border-border/80 rounded-3xl p-6 shadow-2xl space-y-5 animate-scale-in">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-white flex items-center justify-center shadow-xs border border-border/40">
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
                  fill="#4285F4"
                />
                <path
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  fill="#34A853"
                />
                <path
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  fill="#FBBC05"
                />
                <path
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  fill="#EA4335"
                />
              </svg>
            </div>
            <div>
              <h3 className="text-sm font-bold text-foreground">Sign In to TaskFlow with Google</h3>
              <p className="text-[11px] text-muted-foreground">Setup your email & unique TaskFlow username</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {formError && (
          <div className="p-3 rounded-2xl bg-destructive/10 border border-destructive/20 text-destructive text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{formError}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3.5">
          {/* Email Address */}
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
              <AtSign className="w-3.5 h-3.5 text-primary" /> Google Email Address *
            </label>
            <input
              type="email"
              required
              placeholder="e.g. yourname@gmail.com"
              value={googleEmail}
              onChange={(e) => setGoogleEmail(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-background border border-border text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary shadow-xs"
            />
          </div>

          {/* Username with real-time uniqueness validation */}
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
                placeholder="e.g. anandu, dev_sam, alex99"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className={`w-full px-3.5 py-2.5 rounded-xl bg-background border text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 pr-9 shadow-xs transition-colors ${
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

          {/* Optional Display Name */}
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
              Display Name (Optional)
            </label>
            <input
              type="text"
              placeholder="e.g. Anandu Sharma"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-background border border-border text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary shadow-xs"
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting || (usernameStatus !== null && !usernameStatus.available)}
            className="w-full py-3 rounded-2xl bg-primary text-primary-foreground hover:bg-primary/90 font-bold text-xs transition-all flex items-center justify-center gap-2 shadow-md active:scale-98 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Saving to database...</span>
              </>
            ) : (
              <>
                <Check className="w-4 h-4" />
                <span>Save & Continue to TaskFlow</span>
              </>
            )}
          </button>
        </form>

        <div className="relative pt-1">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-border" />
          </div>
          <div className="relative flex justify-center text-[10px] uppercase font-bold">
            <span className="bg-card px-3 text-muted-foreground">or</span>
          </div>
        </div>

        <button
          type="button"
          onClick={handleRedirectToSupabaseGoogleOAuth}
          className="w-full py-2.5 rounded-xl bg-muted/60 hover:bg-accent border border-border/80 text-foreground font-semibold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-xs"
        >
          <Globe className="w-3.5 h-3.5 text-primary" />
          <span>Launch Google OAuth Consent Screen</span>
        </button>
      </div>
    </div>
  )
}
