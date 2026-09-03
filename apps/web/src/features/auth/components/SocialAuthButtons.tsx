'use client'

import React, { useState } from 'react'
import { Loader2 } from 'lucide-react'

interface SocialAuthButtonsProps {
  mode?: 'signup' | 'signin'
  email?: string
}

export function SocialAuthButtons({ mode = 'signup', email }: SocialAuthButtonsProps) {
  const [isGoogleLoading, setIsGoogleLoading] = useState(false)

  const handleGoogleLogin = async () => {
    try {
      setIsGoogleLoading(true)
      const clientId =
        process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ||
        '467128497270-rosss833r78go1fkgav1hp1mc6ur7884.apps.googleusercontent.com'
      const redirectUri = `${window.location.origin}/oauth/callback`
      const scope = encodeURIComponent('openid email profile')
      const nonce = Math.random().toString(36).substring(2)

      // Generate RFC 7636 PKCE Code Verifier & Challenge
      let codeChallenge = ''
      try {
        const array = new Uint8Array(32)
        window.crypto.getRandomValues(array)
        const verifier = Array.from(array, (byte) => ('0' + (byte & 0xff).toString(16)).slice(-2)).join('')
        sessionStorage.setItem('google_oauth_code_verifier', verifier)

        const encoder = new TextEncoder()
        const data = encoder.encode(verifier)
        const digest = await window.crypto.subtle.digest('SHA-256', data)
        const uint8 = new Uint8Array(digest)
        let binary = ''
        for (let i = 0; i < uint8.byteLength; i++) {
          binary += String.fromCharCode(uint8[i])
        }
        const base64 = btoa(binary)
        codeChallenge = base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
      } catch (pkceErr) {
        console.warn('PKCE challenge generation fallback:', pkceErr)
      }

      const state = encodeURIComponent(
        JSON.stringify({
          provider: 'google',
          mode: mode,
          email: email ? email.trim().toLowerCase() : undefined,
          returnUrl: '/app/home',
        })
      )

      let googleAuthUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${encodeURIComponent(
        redirectUri
      )}&response_type=id_token%20token&scope=${scope}&nonce=${nonce}&prompt=select_account&state=${state}`

      if (email && email.includes('@')) {
        googleAuthUrl += `&login_hint=${encodeURIComponent(email.trim())}`
      }

      window.location.href = googleAuthUrl
    } catch (err) {
      console.error('Google login initialization failed:', err)
      setIsGoogleLoading(false)
    }
  }

  /*
  // ============================================================================
  // MICROSOFT SIGNUP & SIGNIN — COMMENTED OUT AS REQUESTED
  // ============================================================================
  // Uncomment when Microsoft OAuth credentials / Azure Entra ID app are ready.
  //
  // const [isMicrosoftLoading, setIsMicrosoftLoading] = useState(false)
  //
  // const handleMicrosoftLogin = () => {
  //   setIsMicrosoftLoading(true)
  //   const clientId =
  //     process.env.NEXT_PUBLIC_MICROSOFT_CLIENT_ID ||
  //     'taskflow-microsoft-oauth-app'
  //   const redirectUri = `${window.location.origin}/oauth/callback`
  //   const scope = encodeURIComponent('openid profile email offline_access')
  //   const state = encodeURIComponent(
  //     JSON.stringify({
  //       provider: 'microsoft',
  //       mode: mode,
  //       returnUrl: '/app/home',
  //     })
  //   )
  //
  //   const microsoftAuthUrl = `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?client_id=${clientId}&response_type=code&redirect_uri=${encodeURIComponent(
  //     redirectUri
  //   )}&response_mode=query&scope=${scope}&state=${state}`
  //
  //   window.location.href = microsoftAuthUrl
  // }
  // ============================================================================
  */

  const dividerText = mode === 'signup' ? 'or sign up with email' : 'or continue with email'

  return (
    <div className="space-y-4 w-full">
      {/* Social Buttons Container */}
      <div className="w-full">
        {/* Google OAuth Button */}
        <button
          type="button"
          onClick={handleGoogleLogin}
          disabled={isGoogleLoading}
          aria-label="Continue with Google"
          className="w-full h-11 px-4 rounded-xl border border-border/80 bg-card/75 hover:bg-accent/80 hover:border-border text-foreground font-semibold text-xs transition-all duration-150 flex items-center justify-center gap-2.5 shadow-xs hover:shadow-sm active:scale-98 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {isGoogleLoading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin text-primary" />
              <span className="text-[11px]">Connecting...</span>
            </>
          ) : (
            <>
              <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
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
              <span className="truncate">Continue with Google</span>
            </>
          )}
        </button>

        {/* 
        ========================================================================
        MICROSOFT SIGNIN & SIGNUP BUTTON — COMMENTED OUT AS REQUESTED
        ========================================================================
        <button
          type="button"
          onClick={handleMicrosoftLogin}
          disabled={isMicrosoftLoading}
          aria-label="Continue with Microsoft"
          className="w-full h-11 px-3 rounded-xl border border-border/80 bg-card/75 hover:bg-accent/80 hover:border-border text-foreground font-semibold text-xs transition-all duration-150 flex items-center justify-center gap-2.5 shadow-xs hover:shadow-sm active:scale-98 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {isMicrosoftLoading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin text-primary" />
              <span className="text-[11px]">Connecting...</span>
            </>
          ) : (
            <>
              <svg className="w-4 h-4 shrink-0" viewBox="0 0 23 23" aria-hidden="true">
                <path fill="#f35325" d="M1 1h10v10H1z" />
                <path fill="#81bc06" d="M12 1h10v10H12z" />
                <path fill="#05a6f0" d="M1 12h10v10H1z" />
                <path fill="#ffba08" d="M12 12h10v10H12z" />
              </svg>
              <span className="truncate">Continue with Microsoft</span>
            </>
          )}
        </button>
        ========================================================================
        */}
      </div>

      {/* Perfectly Centered Horizontal Divider */}
      <div className="relative flex items-center justify-center pt-1" aria-hidden="true">
        <div className="border-t border-border/70 w-full" />
        <span className="bg-background px-3 text-[11px] font-medium text-muted-foreground whitespace-nowrap lowercase shrink-0">
          {dividerText}
        </span>
        <div className="border-t border-border/70 w-full" />
      </div>
    </div>
  )
}
