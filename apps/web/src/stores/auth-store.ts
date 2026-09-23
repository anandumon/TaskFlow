'use client'

import { create } from 'zustand'
import { supabase } from '@/lib/supabase/client'
import { mapSupabaseError } from '@/lib/supabase/errors'
import { apiClient } from '@/lib/api-client'

export interface User {
  id: string
  email: string
  username?: string
  firstName: string
  lastName: string
  displayName?: string
  avatarUrl?: string
  emailVerified: boolean
  isNewUser?: boolean
}


export interface RegisterResult {
  requiresVerification: boolean
  email: string
  message?: string
}

interface AuthState {
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
  error: string | null

  login: (email: string, password: string) => Promise<void>
  register: (data: {
    firstName: string
    lastName: string
    email: string
    password: string
  }) => Promise<RegisterResult>
  verifyEmail: (email: string, code: string) => Promise<string>
  resendCode: (email: string) => Promise<string>
  logout: () => Promise<void>
  loadUser: () => Promise<void>
  updateUserAvatar: (avatarUrl: string) => Promise<void>
  clearError: () => void
}

import { useOrgStore } from './org-store'
import { useWorkspaceStore } from './workspace-store'

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,

  login: async (email: string, password: string) => {
    set({ isLoading: true, error: null })
    try {
      // Clear previous user's workspace/org state to prevent cross-tenant contamination
      useOrgStore.setState({ organizations: [], currentOrg: null, members: [] })
      useWorkspaceStore.setState({ workspaces: [], currentWorkspace: null, members: [], teams: [] })

      const cleanEmail = email.trim().toLowerCase()
      const res = await apiClient.post<any>('/api/v1/auth/login', {
        email: cleanEmail,
        password,
      })

      const authData = res.data
      if (!authData || !authData.accessToken) {
        throw new Error('Authentication failed: No access token returned')
      }

      apiClient.setAccessToken(authData.accessToken)
      const u = authData.user
      if (typeof window !== 'undefined') {
        localStorage.setItem('accessToken', authData.accessToken)
        if (authData.refreshToken) {
          localStorage.setItem('refreshToken', authData.refreshToken)
        }
        localStorage.setItem('taskflow_is_new_user', 'false')
        if (u?.id) {
          localStorage.setItem(`taskflow_onboarding_completed_${u.id}`, 'true')
        }
        localStorage.setItem('taskflow_onboarding_completed', 'true')
      }

      set({
        user: {
          id: u?.id || '',
          email: u?.email || cleanEmail,
          username: u?.username,
          firstName: u?.firstName || '',
          lastName: u?.lastName || '',
          displayName: u?.displayName || `${u?.firstName || ''} ${u?.lastName || ''}`.trim() || cleanEmail,
          emailVerified: !!u?.emailVerified,
          avatarUrl: u?.avatarUrl,
          isNewUser: false,
        },
        isAuthenticated: true,
        isLoading: false,
        error: null,
      })
    } catch (err: any) {
      const errMsg = err?.response?.data?.message || err?.message || 'Invalid email or password'
      set({ error: errMsg, isLoading: false })
      throw new Error(errMsg)
    }
  },

  register: async (data) => {
    set({ isLoading: true, error: null })
    try {
      const cleanEmail = data.email.trim().toLowerCase()
      await apiClient.post('/api/v1/auth/register', {
        email: cleanEmail,
        password: data.password,
        firstName: data.firstName.trim(),
        lastName: data.lastName.trim(),
      })

      if (typeof window !== 'undefined') {
        localStorage.setItem('taskflow_is_new_user', 'true')
      }

      set({ isLoading: false })
      return {
        requiresVerification: true,
        email: cleanEmail,
        message: 'A verification email with your 6-digit code has been sent.',
      }
    } catch (err: any) {
      const errMsg = err?.response?.data?.message || err?.message || 'Failed to create account. Please try again.'
      set({ error: errMsg, isLoading: false })
      throw new Error(errMsg)
    }
  },

  verifyEmail: async (email: string, code: string) => {
    set({ isLoading: true, error: null })
    try {
      const cleanToken = code.replace(/[\s-]+/g, '').trim()
      const cleanEmail = email.trim().toLowerCase()

      const res = await apiClient.post<any>('/api/v1/auth/verify-email', {
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
          localStorage.setItem('taskflow_is_new_user', 'true')
        }
      }

      if (authData?.user) {
        const u = authData.user
        set({
          user: {
            id: u.id,
            email: u.email || cleanEmail,
            firstName: u.firstName || '',
            lastName: u.lastName || '',
            displayName: u.displayName || `${u.firstName || ''} ${u.lastName || ''}`.trim() || cleanEmail,
            emailVerified: true,
            avatarUrl: u.avatarUrl,
            isNewUser: true,
          },
          isAuthenticated: true,
          isLoading: false,
          error: null,
        })
      } else {
        set({ isLoading: false })
      }

      return authData?.accessToken || 'verified'
    } catch (err: any) {
      const errMsg = err?.response?.data?.message || err?.message || 'Verification failed. Please try again.'
      set({ error: errMsg, isLoading: false })
      throw new Error(errMsg)
    }
  },

  resendCode: async (email: string) => {
    try {
      const cleanEmail = email.trim().toLowerCase()
      await apiClient.post('/api/v1/auth/resend-verification-otp', {
        email: cleanEmail,
      })
      return 'Verification code sent successfully!'
    } catch (err: any) {
      const errMsg = err?.response?.data?.message || err?.message || 'Failed to resend verification code.'
      throw new Error(errMsg)
    }
  },

  logout: async () => {
    try {
      await apiClient.post('/api/v1/auth/logout', {}).catch(() => {})
      await supabase.auth.signOut().catch(() => {})
    } finally {
      apiClient.setAccessToken(null)
      if (typeof window !== 'undefined') {
        localStorage.removeItem('accessToken')
        localStorage.removeItem('refreshToken')
        localStorage.removeItem('taskflow_is_new_user')
      }
      useOrgStore.setState({ organizations: [], currentOrg: null, members: [] })
      useWorkspaceStore.setState({ workspaces: [], currentWorkspace: null, members: [], teams: [] })
      set({ user: null, isAuthenticated: false, error: null })
      if (typeof window !== 'undefined') {
        window.location.href = '/'
      }
    }
  },

  loadUser: async () => {
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null
      if (token) {
        apiClient.setAccessToken(token)
        try {
          const res = await apiClient.get<any>('/api/v1/auth/me')
          if (res.data) {
            const u = res.data
            const isNew = u.isNewUser === true || (typeof window !== 'undefined' && localStorage.getItem('taskflow_is_new_user') === 'true')

            set({
              user: {
                id: u.id,
                email: u.email || '',
                username: u.username,
                firstName: u.firstName || '',
                lastName: u.lastName || '',
                displayName: u.displayName || `${u.firstName || ''} ${u.lastName || ''}`.trim() || u.email || 'User',
                emailVerified: !!u.emailVerified,
                avatarUrl: u.avatarUrl,
                isNewUser: isNew,
              },
              isAuthenticated: true,
              isLoading: false,
            })
            return
          }

        } catch {
          // Token expired or invalid, continue to fallback or clear
        }
      }

      // Fallback: check Supabase session
      const { data: { session } } = await supabase.auth.getSession()
      if (session) {
        apiClient.setAccessToken(session.access_token)
        const u = session.user
        set({
          user: {
            id: u.id,
            email: u.email || '',
            firstName: u.user_metadata?.first_name || '',
            lastName: u.user_metadata?.last_name || '',
            displayName: `${u.user_metadata?.first_name || ''} ${u.user_metadata?.last_name || ''}`.trim() || u.email || 'User',
            emailVerified: !!u.email_confirmed_at,
          },
          isAuthenticated: true,
          isLoading: false,
        })
        return
      }

      set({ user: null, isAuthenticated: false, isLoading: false })
    } catch {
      set({ user: null, isAuthenticated: false, isLoading: false })
    }
  },

  updateUserAvatar: async (avatarUrl: string) => {
    try {
      const res = await apiClient.patch<any>('/api/v1/auth/me', { avatarUrl })
      const u = res.data
      set((state) => ({
        user: state.user ? { ...state.user, avatarUrl: u?.avatarUrl || avatarUrl } : null
      }))
    } catch (err: any) {
      console.error('Failed to update avatar:', err)
      throw err
    }
  },

  clearError: () => set({ error: null }),
}))
