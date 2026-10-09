'use client'

import { create } from 'zustand'

export type TermsStatus = 'PENDING' | 'ACCEPTED' | 'DECLINED'

interface TermsState {
  status: TermsStatus
  acceptedAt: string | null
  declinedAt: string | null
  isLoading: boolean
  isModalOpen: boolean
  hasLoaded: boolean

  fetchTermsStatus: (userId?: string) => Promise<TermsStatus>
  acceptTerms: (userId?: string) => Promise<boolean>
  declineTerms: (userId?: string) => Promise<boolean>
  openModal: () => void
  closeModal: () => void
}

export const useTermsStore = create<TermsState>((set, get) => ({
  status: 'PENDING',
  acceptedAt: null,
  declinedAt: null,
  isLoading: false,
  isModalOpen: false,
  hasLoaded: false,

  fetchTermsStatus: async (userId?: string) => {
    // 1. Check local cache first for sub-millisecond response
    let cachedStatus: TermsStatus | null = null
    if (typeof window !== 'undefined' && userId) {
      const local = localStorage.getItem(`taskflow_terms_status_${userId}`)
      if (local === 'ACCEPTED' || local === 'DECLINED') {
        cachedStatus = local
        set({
          status: local,
          acceptedAt: localStorage.getItem(`taskflow_terms_accepted_at_${userId}`),
          declinedAt: localStorage.getItem(`taskflow_terms_declined_at_${userId}`),
        })
      }
    }

    try {
      set({ isLoading: true })
      const token =
        typeof window !== 'undefined'
          ? localStorage.getItem('accessToken') ||
            localStorage.getItem('token') ||
            localStorage.getItem('taskflow_token')
          : null

      const res = await fetch('/api/v1/me/terms', {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })

      if (res.ok) {
        const json = await res.json()
        const data = json?.data
        if (data && (data.status === 'ACCEPTED' || data.status === 'DECLINED' || data.status === 'PENDING')) {
          const fetchedStatus = data.status as TermsStatus
          set({
            status: fetchedStatus,
            acceptedAt: data.acceptedAt || null,
            declinedAt: data.declinedAt || null,
            hasLoaded: true,
          })

          if (typeof window !== 'undefined' && userId) {
            localStorage.setItem(`taskflow_terms_status_${userId}`, fetchedStatus)
            if (data.acceptedAt) localStorage.setItem(`taskflow_terms_accepted_at_${userId}`, data.acceptedAt)
            if (data.declinedAt) localStorage.setItem(`taskflow_terms_declined_at_${userId}`, data.declinedAt)
          }

          return fetchedStatus
        }
      }
    } catch {
      // Fallback to cache if network fails
    } finally {
      set({ isLoading: false, hasLoaded: true })
    }

    return cachedStatus || get().status
  },

  acceptTerms: async (userId?: string) => {
    try {
      set({ isLoading: true })
      const token =
        typeof window !== 'undefined'
          ? localStorage.getItem('accessToken') ||
            localStorage.getItem('token') ||
            localStorage.getItem('taskflow_token')
          : null

      const res = await fetch('/api/v1/me/terms', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ status: 'ACCEPTED' }),
      })

      const now = new Date().toISOString()
      set({
        status: 'ACCEPTED',
        acceptedAt: now,
        declinedAt: null,
        isModalOpen: false,
      })

      if (typeof window !== 'undefined') {
        if (userId) {
          localStorage.setItem(`taskflow_terms_status_${userId}`, 'ACCEPTED')
          localStorage.setItem(`taskflow_terms_accepted_at_${userId}`, now)
          localStorage.removeItem(`taskflow_terms_declined_at_${userId}`)
          localStorage.setItem(`taskflow_privacy_terms_${userId}`, now)
        }
        localStorage.setItem('taskflow_terms_status', 'ACCEPTED')
        // Dispatch custom event so listeners update immediately
        window.dispatchEvent(new CustomEvent('taskflow_terms_changed', { detail: { status: 'ACCEPTED' } }))
      }

      return res.ok
    } catch {
      return false
    } finally {
      set({ isLoading: false })
    }
  },

  declineTerms: async (userId?: string) => {
    try {
      set({ isLoading: true })
      const token =
        typeof window !== 'undefined'
          ? localStorage.getItem('accessToken') ||
            localStorage.getItem('token') ||
            localStorage.getItem('taskflow_token')
          : null

      const res = await fetch('/api/v1/me/terms', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ status: 'DECLINED' }),
      })

      const now = new Date().toISOString()
      set({
        status: 'DECLINED',
        acceptedAt: null,
        declinedAt: now,
        isModalOpen: false,
      })

      if (typeof window !== 'undefined') {
        if (userId) {
          localStorage.setItem(`taskflow_terms_status_${userId}`, 'DECLINED')
          localStorage.setItem(`taskflow_terms_declined_at_${userId}`, now)
          localStorage.removeItem(`taskflow_terms_accepted_at_${userId}`)
          localStorage.removeItem(`taskflow_privacy_terms_${userId}`)
        }
        localStorage.setItem('taskflow_terms_status', 'DECLINED')
        window.dispatchEvent(new CustomEvent('taskflow_terms_changed', { detail: { status: 'DECLINED' } }))
      }

      return res.ok
    } catch {
      return false
    } finally {
      set({ isLoading: false })
    }
  },

  openModal: () => set({ isModalOpen: true }),
  closeModal: () => set({ isModalOpen: false }),
}))
