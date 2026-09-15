'use client'

import React, { useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import { Loader2 } from 'lucide-react'

interface SocialAuthButtonsProps {
  mode?: 'signup' | 'signin'
  email?: string
}

export function SocialAuthButtons({ mode = 'signup', email }: SocialAuthButtonsProps) {
  const [isGoogleLoading, setIsGoogleLoading] = useState(false)
  const [authError, setAuthError] = useState<string | null>(null)

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://dxrcfczdfstnymbeicmq.supabase.co'
  const origin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000'
  const callbackUrl = `${origin}/auth/callback?mode=${mode}`

  // Force Google to ALWAYS display the account selection dialog by passing prompt=select_account
  const directOAuthUrl = `${supabaseUrl}/auth/v1/authorize?provider=google&redirect_to=${encodeURIComponent(
    callbackUrl
  )}&prompt=select_account&access_type=offline&queryParams[prompt]=select_account&queryParams[access_type]=offline`

  const handleGoogleLogin = async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault()
    setIsGoogleLoading(true)
    setAuthError(null)

    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('tf_auth_mode', mode)
      } catch {
        // ignore
      }
    }

    // Clear any existing local Supabase session to prevent automatic account re-use
    try {
      await supabase.auth.signOut({ scope: 'local' })
    } catch {
      // ignore
    }

    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: callbackUrl,
          queryParams: {
            access_type: 'offline',
            prompt: 'select_account',
            ...(email && email.trim() ? { login_hint: email.trim() } : {}),
          },
        },
      })

      if (error) {
        console.warn('[GoogleAuth] signInWithOAuth returned error, navigating to direct URL:', error)
        if (typeof window !== 'undefined') {
          window.location.href = directOAuthUrl
        }
        return
      }

      if (data?.url && typeof window !== 'undefined') {
        window.location.href = data.url
      } else if (typeof window !== 'undefined') {
        window.location.href = directOAuthUrl
      }
    } catch (err: any) {
      console.warn('[GoogleAuth] Fallback direct navigation:', err)
      if (typeof window !== 'undefined') {
        window.location.href = directOAuthUrl
      }
    }
  }

  return (
    <div className="w-full space-y-2">
      {authError && (
        <div className="p-2.5 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs text-center font-medium">
          {authError}
        </div>
      )}

      <button
        type="button"
        id="google-auth-btn"
        onClick={handleGoogleLogin}
        disabled={isGoogleLoading}
        className="w-full h-10 rounded-xl border border-border bg-card hover:bg-muted/50 active:bg-muted text-foreground font-semibold text-xs transition-all flex items-center justify-center gap-3 shadow-sm hover:shadow active:scale-[0.99] cursor-pointer select-none disabled:opacity-75 disabled:cursor-not-allowed"
      >
        {isGoogleLoading ? (
          <Loader2 className="w-4 h-4 animate-spin text-primary" />
        ) : (
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
        )}
        <span>{isGoogleLoading ? 'Connecting to Google...' : 'Continue with Google'}</span>
      </button>
    </div>
  )
}
