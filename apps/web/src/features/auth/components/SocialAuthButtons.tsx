'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { GoogleOAuthModal } from './GoogleOAuthModal'
import { apiClient } from '@/lib/api-client'
import { useAuthStore } from '@/stores/auth-store'
import { useOrgStore } from '@/stores/org-store'
import { useWorkspaceStore } from '@/stores/workspace-store'

interface SocialAuthButtonsProps {
  mode?: 'signup' | 'signin'
  email?: string
}

export function SocialAuthButtons({ mode = 'signup', email }: SocialAuthButtonsProps) {
  const router = useRouter()
  const [isGoogleModalOpen, setIsGoogleModalOpen] = useState(false)
  const [authError, setAuthError] = useState<string | null>(null)

  const handleDirectGoogleLogin = async (googleEmail: string, username: string, name?: string) => {
    setAuthError(null)

    // Clear previous stores
    useOrgStore.setState({ organizations: [], currentOrg: null, members: [] })
    useWorkspaceStore.setState({ workspaces: [], currentWorkspace: null, members: [], teams: [] })

    const res = await apiClient.post<any>('/api/v1/auth/oauth', {
      provider: 'google',
      email: googleEmail,
      username,
      name: name || username,
    })

    const authData = res.data
    if (authData?.accessToken) {
      apiClient.setAccessToken(authData.accessToken)
      if (typeof window !== 'undefined') {
        localStorage.setItem('accessToken', authData.accessToken)
        if (authData.refreshToken) {
          localStorage.setItem('refreshToken', authData.refreshToken)
        }
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

    setIsGoogleModalOpen(false)

    // Check for invite token redirect
    const inviteToken = typeof window !== 'undefined' ? localStorage.getItem('tf_invite_token') : null
    if (inviteToken) {
      router.push(`/invite?token=${encodeURIComponent(inviteToken)}`)
    } else {
      router.push('/app/home')
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
        onClick={() => setIsGoogleModalOpen(true)}
        className="w-full h-10 rounded-xl border border-border bg-card hover:bg-muted/50 active:bg-muted text-foreground font-semibold text-xs transition-all flex items-center justify-center gap-3 shadow-sm hover:shadow active:scale-[0.99] cursor-pointer select-none"
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
        <span>Continue with Google</span>
      </button>

      <GoogleOAuthModal
        isOpen={isGoogleModalOpen}
        onClose={() => setIsGoogleModalOpen(false)}
        onDirectGoogleLogin={handleDirectGoogleLogin}
        initialEmail={email}
      />
    </div>
  )
}
