'use client'

import { create } from 'zustand'
import { apiClient } from '@/lib/api-client'
import { useAuthStore } from './auth-store'

interface PresenceState {
  onlineUserIds: string[]
  onlineEmails: string[]
  lastSync: number
  isInitialized: boolean

  fetchPresence: (workspaceId?: string) => Promise<void>
  sendHeartbeat: (data?: {
    userId?: string
    workspaceId?: string
    status?: 'online' | 'away' | 'offline'
  }) => Promise<void>
  isUserOnline: (userId?: string, email?: string) => boolean
}

export const usePresenceStore = create<PresenceState>((set, get) => ({
  onlineUserIds: [],
  onlineEmails: [],
  lastSync: 0,
  isInitialized: false,

  fetchPresence: async (workspaceId?: string) => {
    try {
      const url = workspaceId
        ? `/api/v1/presence?workspaceId=${workspaceId}`
        : `/api/v1/presence`
      const res = await apiClient.get<{
        onlineUserIds: string[]
        onlineEmails: string[]
      }>(url)

      if (res?.data) {
        set({
          onlineUserIds: res.data.onlineUserIds || [],
          onlineEmails: (res.data.onlineEmails || []).map((e) => e.toLowerCase()),
          lastSync: Date.now(),
          isInitialized: true,
        })
      }
    } catch {
      // Non-fatal fallback
    }
  },

  sendHeartbeat: async (data = {}) => {
    try {
      const currentUser = useAuthStore.getState().user
      const payload = {
        userId: data.userId || currentUser?.id,
        email: currentUser?.email,
        name: (currentUser as any)?.name,
        workspaceId: data.workspaceId,
        status: data.status || 'online',
      }

      if (!payload.userId && !payload.email) return

      const res = await apiClient.post<{
        onlineUserIds: string[]
        onlineEmails: string[]
      }>('/api/v1/presence', payload)

      if (res?.data) {
        set({
          onlineUserIds: res.data.onlineUserIds || [],
          onlineEmails: (res.data.onlineEmails || []).map((e) => e.toLowerCase()),
          lastSync: Date.now(),
          isInitialized: true,
        })
      }
    } catch {
      // Ignore background network blips
    }
  },

  isUserOnline: (userId?: string, email?: string) => {
    const currentUser = useAuthStore.getState().user

    // If matching current logged in user, they are always online
    if (
      currentUser &&
      ((userId && currentUser.id === userId) ||
        (email && currentUser.email?.toLowerCase() === email.toLowerCase()))
    ) {
      return true
    }

    const { onlineUserIds, onlineEmails } = get()
    if (userId && onlineUserIds.includes(userId)) return true
    if (email && onlineEmails.includes(email.toLowerCase())) return true

    return false
  },
}))
