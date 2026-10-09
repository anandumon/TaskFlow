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

      const payload = (res?.data as any)?.data || res?.data
      if (payload) {
        set({
          onlineUserIds: payload.onlineUserIds || [],
          onlineEmails: (payload.onlineEmails || []).map((e: string) => String(e).toLowerCase().trim()),
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
      const displayName =
        (currentUser as any)?.name ||
        currentUser?.displayName ||
        `${currentUser?.firstName || ''} ${currentUser?.lastName || ''}`.trim() ||
        currentUser?.email?.split('@')[0] ||
        'User'

      const payload = {
        userId: data.userId || currentUser?.id,
        email: currentUser?.email,
        name: displayName,
        workspaceId: data.workspaceId,
        status: data.status || 'online',
      }

      if (!payload.userId && !payload.email) return

      const res = await apiClient.post<{
        onlineUserIds: string[]
        onlineEmails: string[]
      }>('/api/v1/presence', payload)

      const payloadData = (res?.data as any)?.data || res?.data
      if (payloadData) {
        set({
          onlineUserIds: payloadData.onlineUserIds || [],
          onlineEmails: (payloadData.onlineEmails || []).map((e: string) => String(e).toLowerCase().trim()),
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
      ((userId && (currentUser.id === userId || currentUser.id?.toLowerCase() === userId.toLowerCase())) ||
        (email && currentUser.email?.toLowerCase().trim() === email.toLowerCase().trim()))
    ) {
      return true
    }

    const { onlineUserIds, onlineEmails } = get()
    const cleanId = userId?.toLowerCase().trim()
    const cleanEmail = email?.toLowerCase().trim()

    if (cleanId && onlineUserIds.some((id) => id.toLowerCase().trim() === cleanId)) return true
    if (cleanEmail && onlineEmails.some((e) => e.toLowerCase().trim() === cleanEmail)) return true

    return false
  },
}))
