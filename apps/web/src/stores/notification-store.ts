'use client'

import { create } from 'zustand'

export interface MessageNotificationItem {
  id: string
  senderId: string
  senderName: string
  senderAvatar?: string
  workspaceId: string
  channelId?: string
  channelName?: string
  recipientId?: string
  content: string
  hasVoiceNote?: boolean
  createdAt: string
  read: boolean
}

interface NotificationStore {
  messageNotifications: MessageNotificationItem[]
  addMessageNotification: (item: MessageNotificationItem) => void
  markAsRead: (id: string) => void
  markAllAsRead: () => void
  clearAll: () => void
  initNotifications: (userId?: string) => void
}

const STORAGE_KEY = 'taskflow_message_notifications'

function getInitialNotifications(userId?: string): MessageNotificationItem[] {
  if (typeof window === 'undefined') return []
  try {
    const key = userId ? `${STORAGE_KEY}_${userId}` : STORAGE_KEY
    const raw = localStorage.getItem(key)
    if (raw) {
      const parsed = JSON.parse(raw)
      return Array.isArray(parsed) ? parsed : []
    }
  } catch {}
  return []
}

function persistNotifications(items: MessageNotificationItem[], userId?: string) {
  if (typeof window === 'undefined') return
  try {
    const key = userId ? `${STORAGE_KEY}_${userId}` : STORAGE_KEY
    localStorage.setItem(key, JSON.stringify(items.slice(0, 50)))
  } catch {}
}

export const useNotificationStore = create<NotificationStore>((set, get) => ({
  messageNotifications: [],

  initNotifications: (userId) => {
    const loaded = getInitialNotifications(userId)
    set({ messageNotifications: loaded })
  },

  addMessageNotification: (item) => {
    set((state) => {
      // Avoid duplicate notifications for same message ID
      const existing = state.messageNotifications.find((n) => n.id === item.id)
      if (existing) return state

      const updated = [item, ...state.messageNotifications].slice(0, 50)
      persistNotifications(updated)
      return { messageNotifications: updated }
    })
  },

  markAsRead: (id) => {
    set((state) => {
      const updated = state.messageNotifications.map((n) =>
        n.id === id ? { ...n, read: true } : n
      )
      persistNotifications(updated)
      return { messageNotifications: updated }
    })
  },

  markAllAsRead: () => {
    set((state) => {
      const updated = state.messageNotifications.map((n) => ({ ...n, read: true }))
      persistNotifications(updated)
      return { messageNotifications: updated }
    })
  },

  clearAll: () => {
    persistNotifications([])
    set({ messageNotifications: [] })
  },
}))
