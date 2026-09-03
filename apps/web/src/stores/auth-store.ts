'use client'

import { create } from 'zustand'
import { apiClient } from '@/lib/api-client'

interface User {
  id: string
  email: string
  firstName: string
  lastName: string
  displayName?: string
  avatarUrl?: string
  emailVerified: boolean
}

interface RegisterResult {
  requiresVerification: boolean
  email: string
  message?: string
  devCode?: string
}

interface AuthState {
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
  error: string | null

  login: (email: string, password: string) => Promise<void>
  socialLogin: (
    provider: string,
    email?: string,
    name?: string,
    code?: string,
    idToken?: string,
    mode?: string
  ) => Promise<void>
  register: (data: {
    firstName: string
    lastName: string
    email: string
    password: string
  }) => Promise<RegisterResult>
  verifyEmail: (email: string, code: string) => Promise<string>
  confirmEmail: (email?: string, token?: string) => Promise<string>
  resendCode: (email: string) => Promise<string>
  logout: () => Promise<void>
  loadUser: () => Promise<void>
  clearError: () => void
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,

  login: async (email: string, password: string) => {
    set({ isLoading: true, error: null })
    try {
      const response = await apiClient.post<{
        accessToken: string
        refreshToken: string
        user: User
      }>('/api/v1/auth/login', { email, password })

      const { accessToken, refreshToken, user } = response.data
      apiClient.setAccessToken(accessToken)
      localStorage.setItem('accessToken', accessToken)
      localStorage.setItem('refreshToken', refreshToken)

      set({ user, isAuthenticated: true, isLoading: false })
    } catch (err: any) {
      set({
        error: err?.message || 'Login failed',
        isLoading: false,
      })
      throw err
    }
  },

  socialLogin: async (
    provider: string,
    email?: string,
    name?: string,
    code?: string,
    idToken?: string,
    mode?: string
  ) => {
    set({ isLoading: true, error: null })
    try {
      const response = await apiClient.post<{
        accessToken: string
        refreshToken: string
        user: User
      }>('/api/v1/auth/oauth', {
        provider,
        email,
        name,
        code,
        idToken,
        mode: mode || 'signin',
        providerId: code || idToken || `${provider}-${Date.now()}`,
      })

      const { accessToken, refreshToken, user } = response.data
      apiClient.setAccessToken(accessToken)
      localStorage.setItem('accessToken', accessToken)
      localStorage.setItem('refreshToken', refreshToken)

      set({ user, isAuthenticated: true, isLoading: false })
    } catch (err: any) {
      set({
        error: err?.message || 'OAuth social login failed',
        isLoading: false,
      })
      throw err
    }
  },

  register: async (data) => {
    set({ isLoading: true, error: null })
    try {
      const response = await apiClient.post<{
        accessToken?: string
        refreshToken?: string
        requiresVerification?: boolean
        verificationMessage?: string
        devCode?: string
        user: User
      }>('/api/v1/auth/register', data)

      // Dispatch live real email confirmation link to user's inbox via Supabase cloud mailer
      try {
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://dxrcfczdfstnymbeicmq.supabase.co'
        const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR4cmNmY3pkZnN0bnltYmVpY21xIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODgyNDQ3NjYsImV4cCI6MjEwMzgyMDc2Nn0.Ec38y04rUfXHECajZ__g1CW0hn_k41jSXxTwBJjO9_c'

        const redirectTo = typeof window !== 'undefined'
          ? `${window.location.origin}/verify-email?email=${encodeURIComponent(data.email)}`
          : `http://localhost:3000/verify-email?email=${encodeURIComponent(data.email)}`

        fetch(`${supabaseUrl}/auth/v1/signup`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': supabaseAnonKey,
            'Authorization': `Bearer ${supabaseAnonKey}`,
          },
          body: JSON.stringify({
            email: data.email,
            password: data.password,
            options: {
              data: {
                first_name: data.firstName,
                last_name: data.lastName,
              },
              emailRedirectTo: redirectTo,
            },
          }),
        }).catch((e) => console.warn('Supabase mailer non-fatal:', e))
      } catch (mailErr) {
        console.warn('Live mailer dispatch warning:', mailErr)
      }

      set({ isLoading: false, error: null })

      return {
        requiresVerification: true,
        email: data.email,
        message: 'A confirmation link has been sent to your email address.',
      }
    } catch (err: any) {
      set({
        error: err?.message || 'Registration failed',
        isLoading: false,
      })
      throw err
    }
  },

  verifyEmail: async (email: string, code: string) => {
    set({ isLoading: true, error: null })
    try {
      // 1. Verify on live cloud mailer
      let cloudVerified = false
      try {
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://dxrcfczdfstnymbeicmq.supabase.co'
        const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR4cmNmY3pkZnN0bnltYmVpY21xIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODgyNDQ3NjYsImV4cCI6MjEwMzgyMDc2Nn0.Ec38y04rUfXHECajZ__g1CW0hn_k41jSXxTwBJjO9_c'

        const res = await fetch(`${supabaseUrl}/auth/v1/verify`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': supabaseAnonKey,
            'Authorization': `Bearer ${supabaseAnonKey}`,
          },
          body: JSON.stringify({
            type: 'email',
            email,
            token: code,
          }),
        })
        if (res.ok) {
          cloudVerified = true
        }
      } catch (cloudErr) {
        console.warn('Cloud OTP verification fallback:', cloudErr)
      }

      // 2. Complete verification in backend
      try {
        const response = await apiClient.post<{
          success: boolean
          code: string
          message: string
          remainingAttempts?: number
        }>('/api/v1/auth/verify-email', {
          email,
          code,
          otp: code,
        })
        set({ isLoading: false })
        return response.data?.message || 'Email verified successfully!'
      } catch (backendErr: any) {
        if (cloudVerified) {
          set({ isLoading: false })
          return 'Email verified successfully!'
        }
        throw backendErr
      }
    } catch (err: any) {
      const errMsg = err?.message || 'Verification failed. Invalid or expired code.'
      set({
        error: errMsg,
        isLoading: false,
      })
      throw err
    }
  },

  confirmEmail: async (email?: string, token?: string) => {
    set({ isLoading: true, error: null })
    try {
      const queryParams = new URLSearchParams()
      if (email) queryParams.append('email', email)
      if (token) queryParams.append('token', token)

      const response = await apiClient.post<{
        success: boolean
        code: string
        message: string
      }>(`/api/v1/auth/confirm-email?${queryParams.toString()}`)
      
      set({ isLoading: false })
      return response.data?.message || 'Email confirmed successfully!'
    } catch (err: any) {
      const errMsg = err?.response?.data?.message || err?.message || 'Failed to confirm email.'
      set({
        error: errMsg,
        isLoading: false,
      })
      throw err
    }
  },

  resendCode: async (email: string) => {
    try {
      // Trigger cloud mailer dispatch to real inbox
      try {
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://dxrcfczdfstnymbeicmq.supabase.co'
        const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR4cmNmY3pkZnN0bnltYmVpY21xIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODgyNDQ3NjYsImV4cCI6MjEwMzgyMDc2Nn0.Ec38y04rUfXHECajZ__g1CW0hn_k41jSXxTwBJjO9_c'

        const redirectTo = typeof window !== 'undefined'
          ? `${window.location.origin}/verify-email?email=${encodeURIComponent(email)}`
          : `http://localhost:3000/verify-email?email=${encodeURIComponent(email)}`

        fetch(`${supabaseUrl}/auth/v1/resend`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': supabaseAnonKey,
            'Authorization': `Bearer ${supabaseAnonKey}`,
          },
          body: JSON.stringify({
            type: 'signup',
            email,
            options: {
              emailRedirectTo: redirectTo,
            },
          }),
        }).catch((e) => console.warn('Supabase resend non-fatal:', e))
      } catch (mailErr) {
        console.warn('Resend mailer dispatch warning:', mailErr)
      }

      const response = await apiClient.post<{
        success: boolean
        code: string
        message: string
        retryAfterSeconds?: number
      }>(`/api/v1/auth/resend-code?email=${encodeURIComponent(email)}`)

      return response.data?.message || 'Confirmation email resent!'
    } catch (err: any) {
      throw err
    }
  },

  logout: async () => {
    const refreshToken = localStorage.getItem('refreshToken')
    try {
      await apiClient.post('/api/v1/auth/logout', { refreshToken })
    } catch {
      // Ignore logout errors
    }
    apiClient.setAccessToken(null)
    localStorage.removeItem('accessToken')
    localStorage.removeItem('refreshToken')
    set({ user: null, isAuthenticated: false, isLoading: false })
  },

  loadUser: async () => {
    const token = localStorage.getItem('accessToken')
    if (!token) {
      set({ isLoading: false })
      return
    }

    apiClient.setAccessToken(token)
    try {
      const response = await apiClient.get<User>('/api/v1/auth/me')
      set({ user: response.data, isAuthenticated: true, isLoading: false })
    } catch {
      // Try refresh
      const refreshToken = localStorage.getItem('refreshToken')
      if (refreshToken) {
        try {
          const res = await apiClient.post<{
            accessToken: string
            refreshToken: string
            user: User
          }>('/api/v1/auth/refresh', { refreshToken })

          apiClient.setAccessToken(res.data.accessToken)
          localStorage.setItem('accessToken', res.data.accessToken)
          localStorage.setItem('refreshToken', res.data.refreshToken)
          set({
            user: res.data.user,
            isAuthenticated: true,
            isLoading: false,
          })
          return
        } catch {
          // Refresh failed
        }
      }
      apiClient.setAccessToken(null)
      localStorage.removeItem('accessToken')
      localStorage.removeItem('refreshToken')
      set({ user: null, isAuthenticated: false, isLoading: false })
    }
  },

  clearError: () => set({ error: null }),
}))
