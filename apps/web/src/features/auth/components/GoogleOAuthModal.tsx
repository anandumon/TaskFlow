'use client'

import { useState, useEffect, useRef } from 'react'
import { X, Globe, Check, AlertCircle, Loader2, CheckCircle2, AtSign, User } from 'lucide-react'
import { apiClient } from '@/lib/api-client'

interface GoogleOAuthModalProps {
  isOpen: boolean
  onClose: () => void
  onDirectGoogleLogin: (email: string, username: string, name?: string) => Promise<void>
  initialEmail?: string
  mode?: 'signin' | 'signup'
}

export function GoogleOAuthModal({
  isOpen,
  onClose,
  onDirectGoogleLogin,
  initialEmail = '',
  mode = 'signup',
}: GoogleOAuthModalProps) {
  const isSignIn = mode === 'signin'
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

  const handleGoogleSignInClick = async () => {
    setFormError(null)
    const cleanEmail = (googleEmail || initialEmail || '').trim().toLowerCase()
    if (cleanEmail && cleanEmail.includes('@')) {
      try {
        setIsSubmitting(true)
        await onDirectGoogleLogin(cleanEmail, '')
        return
      } catch (err: any) {
        console.warn('Direct signin error, falling back to OAuth redirect:', err)
      } finally {
        setIsSubmitting(false)
      }
    }
    handleRedirectToSupabaseGoogleOAuth()
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
              <p className="text-[11px] text-muted-foreground">
                {isSignIn
                  ? 'Continue with your Google account to access your workspace'
                  : 'Setup your email & unique TaskFlow username'}
              </p>
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

        <div className="pt-2 pb-1 space-y-4">
          <button
            type="button"
            id="google-signin-action-btn"
            onClick={handleRedirectToSupabaseGoogleOAuth}
            disabled={isSubmitting}
            className="w-full h-12 rounded-2xl border border-border/80 bg-card hover:bg-muted/70 active:bg-muted text-foreground font-bold text-xs flex items-center justify-center gap-3 transition-all cursor-pointer shadow-sm hover:shadow active:scale-[0.99] disabled:opacity-50"
          >
            <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
            <span>Continue with Google Account</span>
          </button>
          <p className="text-[11px] text-center text-muted-foreground">
            {isSignIn
              ? 'Click to securely access your workspace with Google OAuth.'
              : 'Setup your account instantly with your verified Google email and identity.'}
          </p>
        </div>
      </div>
    </div>
  )
}
