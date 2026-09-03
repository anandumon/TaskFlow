'use client'

import { useState } from 'react'
import { X, Globe, Check } from 'lucide-react'

interface GoogleOAuthModalProps {
  isOpen: boolean
  onClose: () => void
  onDirectGoogleLogin: (email: string, name: string) => Promise<void>
}

export function GoogleOAuthModal({ isOpen, onClose, onDirectGoogleLogin }: GoogleOAuthModalProps) {
  const [customGoogleEmail, setCustomGoogleEmail] = useState('')
  const [customGoogleName, setCustomGoogleName] = useState('')

  if (!isOpen) return null

  const handleRedirectToSupabaseGoogleOAuth = () => {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://dxrcfczdfstnymbeicmq.supabase.co'
    const redirectUrl = `${window.location.origin}/auth/callback`
    window.location.href = `${supabaseUrl}/auth/v1/authorize?provider=google&redirect_to=${encodeURIComponent(
      redirectUrl
    )}`
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-md animate-fade-in">
      <div className="w-full max-w-md bg-card border border-border/80 rounded-3xl p-6 shadow-2xl space-y-5 animate-scale-in">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-white flex items-center justify-center shadow-xs">
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
              <h3 className="text-sm font-bold text-foreground">Google Account Sign-In</h3>
              <p className="text-[11px] text-muted-foreground">Choose sign in method</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <button
          onClick={handleRedirectToSupabaseGoogleOAuth}
          className="w-full p-3.5 rounded-2xl bg-primary text-primary-foreground hover:bg-primary/90 font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-md active:scale-98"
        >
          <Globe className="w-4 h-4" />
          <span>Launch Google OAuth 2.0 Consent Screen</span>
        </button>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-border" />
          </div>
          <div className="relative flex justify-center text-[10px] uppercase font-bold">
            <span className="bg-card px-3 text-muted-foreground">or sign in with your Google Email</span>
          </div>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault()
            const em = customGoogleEmail.trim() || 'anand.google@gmail.com'
            const nm = customGoogleName.trim() || 'Google User'
            onDirectGoogleLogin(em, nm)
          }}
          className="space-y-3"
        >
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-muted-foreground uppercase">
              Google Email Address
            </label>
            <input
              type="email"
              placeholder="e.g. yourname@gmail.com"
              value={customGoogleEmail}
              onChange={(e) => setCustomGoogleEmail(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-background border border-border text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-bold text-muted-foreground uppercase">
              Display Name (Optional)
            </label>
            <input
              type="text"
              placeholder="e.g. Anand Sharma"
              value={customGoogleName}
              onChange={(e) => setCustomGoogleName(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-background border border-border text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <button
            type="submit"
            className="w-full py-2.5 rounded-xl bg-muted hover:bg-accent border border-border text-foreground font-bold text-xs transition-all flex items-center justify-center gap-2 shadow-xs"
          >
            <Check className="w-3.5 h-3.5 text-primary" /> Sign In with this Google Account
          </button>
        </form>
      </div>
    </div>
  )
}
