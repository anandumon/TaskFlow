'use client'

import { useEffect, useState, useCallback } from 'react'
import { User, Session } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase/client'
import { mapSupabaseError } from '@/lib/supabase/errors'
import { apiClient } from '@/lib/api-client'
import { useAuthStore } from '@/stores/auth-store'

export interface SignUpParams {
  email: string
  password: string
  firstName: string
  lastName: string
}

export interface SignInParams {
  email: string
  password: string
}

export interface VerifyOtpParams {
  email: string
  token: string
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Initialize and synchronize session with Supabase & apiClient
  useEffect(() => {
    let mounted = true

    supabase.auth.getSession().then(({ data: { session: initialSession } }) => {
      if (!mounted) return
      setSession(initialSession)
      setUser(initialSession?.user ?? null)
      if (initialSession?.access_token) {
        apiClient.setAccessToken(initialSession.access_token)
      }
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, currentSession) => {
        if (!mounted) return
        setSession(currentSession)
        setUser(currentSession?.user ?? null)
        if (currentSession?.access_token) {
          apiClient.setAccessToken(currentSession.access_token)
          if (typeof window !== 'undefined') {
            localStorage.setItem('accessToken', currentSession.access_token)
          }
        } else {
          apiClient.setAccessToken(null)
          if (typeof window !== 'undefined') {
            localStorage.removeItem('accessToken')
          }
        }
        setLoading(false)
      }
    )

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [])

  // Sign up using TaskFlow backend (single 6-digit OTP email)
  const signUp = useCallback(async ({ email, password, firstName, lastName }: SignUpParams) => {
    setError(null)
    setLoading(true)
    try {
      const cleanEmail = email.trim().toLowerCase()
      const cleanFirst = firstName.trim()
      const cleanLast = lastName.trim()

      await apiClient.post('/api/v1/auth/register', {
        email: cleanEmail,
        password,
        firstName: cleanFirst,
        lastName: cleanLast,
      })

      setLoading(false)
      return {
        user: null,
        session: null,
        requiresVerification: true,
      }
    } catch (err: any) {
      const errMsg = err?.response?.data?.message || err?.message || 'An account with this email already exists or registration failed.'
      setError(errMsg)
      setLoading(false)
      throw new Error(errMsg)
    }
  }, [])

  // Sign in using TaskFlow backend
  const signIn = useCallback(async ({ email, password }: SignInParams) => {
    setError(null)
    setLoading(true)
    try {
      const cleanEmail = email.trim().toLowerCase()
      const res = await apiClient.post<{
        accessToken?: string
        refreshToken?: string
        user?: any
      }>('/api/v1/auth/login', {
        email: cleanEmail,
        password,
      })

      const authData = res.data
      if (!authData || !authData.accessToken) {
        throw new Error('Authentication failed: No access token returned')
      }

      apiClient.setAccessToken(authData.accessToken)
      if (typeof window !== 'undefined') {
        localStorage.setItem('accessToken', authData.accessToken)
        if (authData.refreshToken) {
          localStorage.setItem('refreshToken', authData.refreshToken)
        }
      }

      const u = authData.user
      useAuthStore.setState({
        user: {
          id: u?.id || '',
          email: u?.email || cleanEmail,
          firstName: u?.firstName || '',
          lastName: u?.lastName || '',
          displayName: u?.displayName || `${u?.firstName || ''} ${u?.lastName || ''}`.trim() || cleanEmail,
          emailVerified: !!u?.emailVerified,
          avatarUrl: u?.avatarUrl,
        },
        isAuthenticated: true,
        isLoading: false,
        error: null,
      })

      setLoading(false)
      return authData
    } catch (err: any) {
      const errMsg = err?.response?.data?.message || err?.message || 'Invalid email or password'
      setError(errMsg)
      setLoading(false)
      throw new Error(errMsg)
    }
  }, [])

  // Verify email OTP using TaskFlow backend
  const verifyEmail = useCallback(async ({ email, token }: VerifyOtpParams) => {
    setError(null)
    setLoading(true)
    try {
      const cleanToken = token.replace(/[\s-]+/g, '').trim()
      const cleanEmail = email.trim().toLowerCase()

      const res = await apiClient.post<{
        accessToken?: string
        refreshToken?: string
        user?: any
        success?: boolean
        message?: string
      }>('/api/v1/auth/verify-email', {
        email: cleanEmail,
        code: cleanToken,
        otp: cleanToken,
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
        const u = authData.user
        useAuthStore.setState({
          user: {
            id: u.id,
            email: u.email || cleanEmail,
            firstName: u.firstName || '',
            lastName: u.lastName || '',
            displayName: u.displayName || `${u.firstName || ''} ${u.lastName || ''}`.trim() || cleanEmail,
            emailVerified: true,
            avatarUrl: u.avatarUrl,
          },
          isAuthenticated: true,
          isLoading: false,
          error: null,
        })
      }

      setLoading(false)
      return authData
    } catch (err: any) {
      const errMsg = err?.response?.data?.message || err?.message || 'Verification failed. Please check the code.'
      setError(errMsg)
      setLoading(false)
      throw new Error(errMsg)
    }
  }, [])

  // Resend verification email via TaskFlow backend
  const resendVerification = useCallback(async (email: string) => {
    setError(null)
    try {
      const cleanEmail = email.trim().toLowerCase()
      await apiClient.post('/api/v1/auth/resend-verification-otp', {
        email: cleanEmail,
      })
      return true
    } catch (err: any) {
      const errMsg = err?.response?.data?.message || err?.message || 'Failed to resend verification email.'
      setError(errMsg)
      throw new Error(errMsg)
    }
  }, [])

  // Continue with Google via Supabase OAuth
  const signInWithGoogle = useCallback(async (mode: 'signin' | 'signup' = 'signin') => {
    setError(null)
    const redirectOrigin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000'
    if (typeof window !== 'undefined') {
      localStorage.setItem('tf_auth_mode', mode)
    }
    const { data, error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${redirectOrigin}/auth/callback?mode=${mode}`,
        queryParams: {
          access_type: 'offline',
          prompt: 'consent',
        },
      },
    })

    if (oauthError) {
      const friendly = mapSupabaseError(oauthError)
      setError(friendly)
      throw new Error(friendly)
    }

    return data
  }, [])

  // Sign out via Supabase Auth
  const signOut = useCallback(async () => {
    setLoading(true)
    try {
      await supabase.auth.signOut()
      setSession(null)
      setUser(null)
      apiClient.setAccessToken(null)
      if (typeof window !== 'undefined') {
        localStorage.removeItem('accessToken')
        localStorage.removeItem('refreshToken')
      }
    } finally {
      setLoading(false)
    }
  }, [])

  return {
    user,
    session,
    loading,
    error,
    isAuthenticated: !!session && !!user,
    clearError: () => setError(null),
    signUp,
    signIn,
    verifyEmail,
    resendVerification,
    signInWithGoogle,
    signOut,
  }
}
