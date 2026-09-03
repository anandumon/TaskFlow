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
  confirmationToken?: string
}

interface AuthState {
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
  error: string | null

  checkUser: (email: string) => Promise<boolean>
  login: (email: string, password: string) => Promise<void>
  socialLogin: (
    provider: string,
    email?: string,
    name?: string,
    code?: string,
    idToken?: string,
    mode?: string,
    providerId?: string
  ) => Promise<void>
  register: (data: {
    firstName: string
    lastName: string
    email: string
    password: string
    authProvider?: string
    providerId?: string
    avatarUrl?: string
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

  checkUser: async (email: string) => {
    try {
      const res = await apiClient.get<{ email: string; exists: boolean }>(
        `/api/v1/auth/check-user?email=${encodeURIComponent(email)}`
      )
      return res.data?.exists ?? false
    } catch {
      return false
    }
  },

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
    mode?: string,
    providerId?: string
  ) => {
    set({ isLoading: true, error: null })
    try {
      let cleanProviderId = providerId
      if (!cleanProviderId && idToken) {
        try {
          const parts = idToken.split('.')
          if (parts.length >= 2) {
            const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/')
            const payload = JSON.parse(atob(base64))
            cleanProviderId = payload.sub
          }
        } catch {}
      }
      if (!cleanProviderId && code) {
        cleanProviderId = code.substring(0, 100)
      }
      if (!cleanProviderId) {
        cleanProviderId = `${provider}-${Date.now()}`
      }
      if (cleanProviderId.length > 255) {
        cleanProviderId = cleanProviderId.substring(0, 255)
      }

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
        providerId: cleanProviderId,
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
        confirmationToken?: string
        user: User
      }>('/api/v1/auth/register', data)

      set({ isLoading: false, error: null })

      set({ isLoading: false, error: null })

      return {
        requiresVerification: true,
        email: data.email,
        message: response.data?.verificationMessage || 'A confirmation link has been sent to your email address.',
        devCode: response.data?.devCode,
        confirmationToken: response.data?.confirmationToken,
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
      try {
        const response = await apiClient.post<{
          success: boolean
          code: string
          message: string
          remainingAttempts?: number
          accessToken?: string
          refreshToken?: string
          user?: User
        }>('/api/v1/auth/verify-email', {
          email,
          code,
          otp: code,
        })

        if (response.data.accessToken) {
          apiClient.setAccessToken(response.data.accessToken)
          localStorage.setItem('accessToken', response.data.accessToken)
          if (response.data.refreshToken) {
            localStorage.setItem('refreshToken', response.data.refreshToken)
          }
          if (response.data.user) {
            set({ user: response.data.user, isAuthenticated: true })
          }
        }

        set({ isLoading: false })
        return response.data?.message || 'Email verified successfully!'
      } catch (backendErr: any) {
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
        accessToken?: string
        refreshToken?: string
        user?: User
      }>(`/api/v1/auth/confirm-email?${queryParams.toString()}`)
      
      if (response.data.accessToken) {
        apiClient.setAccessToken(response.data.accessToken)
        localStorage.setItem('accessToken', response.data.accessToken)
        if (response.data.refreshToken) {
          localStorage.setItem('refreshToken', response.data.refreshToken)
        }
        if (response.data.user) {
          set({ user: response.data.user, isAuthenticated: true })
        }
      }

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
    const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null
    if (!token) {
      set({ user: null, isAuthenticated: false, isLoading: false })
      return
    }

    set({ isLoading: true })
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
