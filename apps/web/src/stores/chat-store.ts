'use client'

import { create } from 'zustand'
import { apiClient } from '@/lib/api-client'

export interface ChatChannel {
  id: string
  workspaceId: string
  projectId?: string
  projectName?: string
  name: string
  description?: string
  isPrivate: boolean
  memberIds: string[]
  createdBy?: string
  createdAt: string
  updatedAt: string
}

export interface ChatMessage {
  id: string
  workspaceId: string
  channelId?: string
  recipientId?: string
  senderId: string
  senderName: string
  senderAvatar?: string
  content: string
  attachments?: any[]
  isPinned?: boolean
  isEdited?: boolean
  deletedFor?: string[]
  createdAt: string
  updatedAt?: string
}

export interface DMContact {
  id: string
  name: string
  email: string
  avatarUrl?: string
  role?: string
  isOnline?: boolean
}

interface ChatState {
  channels: ChatChannel[]
  activeChannel: ChatChannel | null
  activeDMUser: DMContact | null
  messages: ChatMessage[]
  isLoadingChannels: boolean
  isLoadingMessages: boolean
  isSendingMessage: boolean
  error: string | null

  fetchChannels: (workspaceId: string) => Promise<ChatChannel[]>
  createChannel: (
    workspaceId: string,
    data: {
      name: string
      description?: string
      projectId?: string
      projectName?: string
      isPrivate?: boolean
      memberIds?: string[]
    }
  ) => Promise<ChatChannel>
  setActiveChannel: (channel: ChatChannel | null) => void
  setActiveDMUser: (user: DMContact | null) => void
  fetchMessages: (
    workspaceId: string,
    target: { channelId?: string; recipientId?: string }
  ) => Promise<ChatMessage[]>
  sendMessage: (
    workspaceId: string,
    data: { channelId?: string; recipientId?: string; content: string; attachments?: any[] }
  ) => Promise<ChatMessage | null>
  editMessage: (
    workspaceId: string,
    messageId: string,
    content: string,
    attachments?: any[]
  ) => Promise<ChatMessage | null>
  togglePinMessage: (
    workspaceId: string,
    messageId: string,
    isPinned: boolean
  ) => Promise<ChatMessage | null>
  deleteMessage: (
    workspaceId: string,
    messageId: string,
    mode: 'everyone' | 'me'
  ) => Promise<boolean>
  receiveNewMessage: (msg: ChatMessage) => void
  receiveEditMessage: (msg: ChatMessage) => void
  receiveDeleteMessage: (messageId: string) => void
  receivePinMessage: (msg: ChatMessage) => void
  silentSyncMessages: (
    workspaceId: string,
    target: { channelId?: string; recipientId?: string }
  ) => Promise<void>
}

export const useChatStore = create<ChatState>((set, get) => ({
  channels: [],
  activeChannel: null,
  activeDMUser: null,
  messages: [],
  isLoadingChannels: false,
  isLoadingMessages: false,
  isSendingMessage: false,
  error: null,

  fetchChannels: async (workspaceId: string) => {
    set({ isLoadingChannels: true, error: null })
    try {
      const res = await apiClient.get<ChatChannel[]>(`/api/v1/workspaces/${workspaceId}/channels`)
      const channels = res.data || []
      set({ channels, isLoadingChannels: false })

      // If no active channel selected and we have channels, select the first one
      if (!get().activeChannel && !get().activeDMUser && channels.length > 0) {
        set({ activeChannel: channels[0] })
      }
      return channels
    } catch (err: any) {
      set({
        isLoadingChannels: false,
        error: err?.response?.data?.message || err?.message || 'Failed to fetch channels',
      })
      return []
    }
  },

  createChannel: async (workspaceId, data) => {
    try {
      const res = await apiClient.post<ChatChannel>(
        `/api/v1/workspaces/${workspaceId}/channels`,
        data
      )
      const newChannel = res.data
      set((state) => ({
        channels: [...state.channels, newChannel],
        activeChannel: newChannel,
        activeDMUser: null,
      }))
      return newChannel
    } catch (err: any) {
      throw err
    }
  },

  setActiveChannel: (channel) => {
    set({ activeChannel: channel, activeDMUser: null, messages: [] })
  },

  setActiveDMUser: (user) => {
    set({ activeDMUser: user, activeChannel: null, messages: [] })
  },

  fetchMessages: async (workspaceId, target) => {
    set({ isLoadingMessages: true })
    try {
      const queryParam = target.channelId
        ? `channelId=${target.channelId}`
        : `recipientId=${target.recipientId}`

      const res = await apiClient.get<ChatMessage[]>(
        `/api/v1/workspaces/${workspaceId}/messages?${queryParam}`
      )
      const messages = res.data || []
      set({ messages, isLoadingMessages: false })
      return messages
    } catch (err) {
      set({ isLoadingMessages: false })
      return []
    }
  },

  sendMessage: async (workspaceId, data) => {
    set({ isSendingMessage: true })
    try {
      const res = await apiClient.post<ChatMessage>(
        `/api/v1/workspaces/${workspaceId}/messages`,
        data
      )
      const newMsg = res.data
      set((state) => ({
        messages: [...state.messages, newMsg],
        isSendingMessage: false,
      }))
      return newMsg
    } catch (err: any) {
      set({ isSendingMessage: false })
      throw err
    }
  },

  editMessage: async (workspaceId, messageId, content, attachments) => {
    try {
      const res = await apiClient.patch<ChatMessage>(
        `/api/v1/workspaces/${workspaceId}/messages/${messageId}`,
        {
          action: 'edit',
          content,
          attachments,
        }
      )
      const updated = res.data
      set((state) => ({
        messages: state.messages.map((m) =>
          m.id === messageId ? { ...m, ...updated, isEdited: true } : m
        ),
      }))
      return updated
    } catch (err) {
      console.error('Failed to edit message:', err)
      return null
    }
  },

  togglePinMessage: async (workspaceId, messageId, isPinned) => {
    try {
      const res = await apiClient.patch<ChatMessage>(
        `/api/v1/workspaces/${workspaceId}/messages/${messageId}`,
        {
          action: 'pin',
          isPinned,
        }
      )
      const updated = res.data
      set((state) => ({
        messages: state.messages.map((m) =>
          m.id === messageId ? { ...m, ...updated, isPinned } : m
        ),
      }))
      return updated
    } catch (err) {
      console.error('Failed to toggle pin message:', err)
      return null
    }
  },

  deleteMessage: async (workspaceId, messageId, mode) => {
    try {
      await apiClient.delete(
        `/api/v1/workspaces/${workspaceId}/messages/${messageId}?mode=${mode}`
      )
      set((state) => ({
        messages: state.messages.filter((m) => m.id !== messageId),
      }))
      return true
    } catch (err) {
      console.error('Failed to delete message:', err)
      return false
    }
  },

  receiveNewMessage: (msg: ChatMessage) => {
    set((state) => {
      // Check if message already exists
      if (state.messages.some((m) => m.id === msg.id)) {
        return state
      }
      return {
        messages: [...state.messages, msg],
      }
    })
  },

  receiveEditMessage: (msg: ChatMessage) => {
    set((state) => ({
      messages: state.messages.map((m) =>
        m.id === msg.id ? { ...m, ...msg, isEdited: true } : m
      ),
    }))
  },

  receiveDeleteMessage: (messageId: string) => {
    set((state) => ({
      messages: state.messages.filter((m) => m.id !== messageId),
    }))
  },

  receivePinMessage: (msg: ChatMessage) => {
    set((state) => ({
      messages: state.messages.map((m) =>
        m.id === msg.id ? { ...m, isPinned: msg.isPinned } : m
      ),
    }))
  },

  silentSyncMessages: async (workspaceId, target) => {
    try {
      const queryParam = target.channelId
        ? `channelId=${target.channelId}`
        : `recipientId=${target.recipientId}`

      const res = await apiClient.get<ChatMessage[]>(
        `/api/v1/workspaces/${workspaceId}/messages?${queryParam}`
      )
      const freshMessages = res.data || []
      set((state) => {
        // Fast shallow equality check by IDs, count, and updated timestamps
        if (
          state.messages.length === freshMessages.length &&
          state.messages.every((m, i) => {
            const f = freshMessages[i]
            return f && m.id === f.id && m.content === f.content && m.isPinned === f.isPinned && m.isEdited === f.isEdited
          })
        ) {
          return state
        }
        return { messages: freshMessages }
      })
    } catch {
      // Silent sync fails gracefully without disrupting the UI
    }
  },
}))
