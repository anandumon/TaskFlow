'use client'

import { create } from 'zustand'
import { apiClient } from '@/lib/api-client'
import { useAuthStore } from './auth-store'

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
  recentlyDeletedIds: Set<string>
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
  deleteMessagesBulk: (
    workspaceId: string,
    messageIds: string[],
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
  recentlyDeletedIds: new Set<string>(),
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
      const rawMessages = res.data || []
      const deletedIds = get().recentlyDeletedIds
      // Exclude any messages that were recently deleted
      const messages = rawMessages.filter((m) => !deletedIds.has(m.id))
      set({ messages, isLoadingMessages: false })
      return messages
    } catch (err) {
      set({ isLoadingMessages: false })
      return []
    }
  },

  sendMessage: async (workspaceId, data) => {
    const authUser = useAuthStore.getState().user
    const currentUserId = authUser?.id || (authUser as any)?.sub || 'current-user'
    const currentUserName = authUser
      ? `${authUser.firstName || ''} ${authUser.lastName || ''}`.trim() || authUser.email?.split('@')[0] || 'You'
      : 'You'
    const currentUserAvatar = authUser?.avatarUrl

    const tempId = `temp-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`
    const optimisticMsg: ChatMessage = {
      id: tempId,
      workspaceId,
      channelId: data.channelId,
      recipientId: data.recipientId,
      senderId: currentUserId,
      senderName: currentUserName,
      senderAvatar: currentUserAvatar,
      content: data.content,
      attachments: data.attachments || [],
      createdAt: new Date().toISOString(),
      isPinned: false,
      isEdited: false,
    }
    set((state) => ({
      messages: [...state.messages, optimisticMsg],
      isSendingMessage: true,
    }))
    try {
      const res = await apiClient.post<ChatMessage>(
        `/api/v1/workspaces/${workspaceId}/messages`,
        data
      )
      const newMsg = res.data
      set((state) => {
        // If the server-sent event (SSE) already added/reconciled this message, drop tempId to avoid duplicate
        const alreadyHasNewMsg = state.messages.some((m) => m.id === newMsg.id)
        if (alreadyHasNewMsg) {
          return {
            messages: state.messages.filter((m) => m.id !== tempId),
            isSendingMessage: false,
          }
        }
        return {
          messages: state.messages.map((m) =>
            m.id === tempId
              ? {
                  ...newMsg,
                  senderId: currentUserId,
                  senderName: currentUserName,
                  senderAvatar: currentUserAvatar,
                }
              : m
          ),
          isSendingMessage: false,
        }
      })
      return newMsg
    } catch (err: any) {
      set((state) => ({
        messages: state.messages.filter((m) => m.id !== tempId),
        isSendingMessage: false,
      }))
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
    // 1. Instantly tombstone the message ID so polling & sync can NEVER resurrect it
    const updatedDeletedIds = new Set(get().recentlyDeletedIds)
    updatedDeletedIds.add(messageId)

    // 2. Instant optimistic removal from UI with zero delay
    set((state) => ({
      messages: state.messages.filter((m) => m.id !== messageId),
      recentlyDeletedIds: updatedDeletedIds,
    }))

    // 3. Auto-expire tombstone after 30 seconds
    setTimeout(() => {
      const current = get().recentlyDeletedIds
      if (current.has(messageId)) {
        const next = new Set(current)
        next.delete(messageId)
        set({ recentlyDeletedIds: next })
      }
    }, 30000)

    if (messageId.startsWith('temp-')) {
      return true
    }
    try {
      await apiClient.delete(
        `/api/v1/workspaces/${workspaceId}/messages/${messageId}?mode=${mode}`
      )
      return true
    } catch (err) {
      console.error('Failed to delete message:', err)
      return false
    }
  },

  deleteMessagesBulk: async (workspaceId, messageIds, mode) => {
    if (!messageIds || messageIds.length === 0) return true
    const idSet = new Set(messageIds)
    const updatedDeletedIds = new Set(get().recentlyDeletedIds)
    messageIds.forEach((id) => updatedDeletedIds.add(id))

    // Instant optimistic removal from UI
    set((state) => ({
      messages: state.messages.filter((m) => !idSet.has(m.id)),
      recentlyDeletedIds: updatedDeletedIds,
    }))

    // Auto-expire tombstones after 30 seconds
    setTimeout(() => {
      const current = get().recentlyDeletedIds
      let changed = false
      const next = new Set(current)
      messageIds.forEach((id) => {
        if (next.has(id)) {
          next.delete(id)
          changed = true
        }
      })
      if (changed) {
        set({ recentlyDeletedIds: next })
      }
    }, 30000)

    try {
      await apiClient.delete(
        `/api/v1/workspaces/${workspaceId}/messages`,
        {
          messageIds,
          mode,
        }
      )
      return true
    } catch (err) {
      console.error('Failed to bulk delete messages:', err)
      return false
    }
  },

  receiveNewMessage: (msg: ChatMessage) => {
    set((state) => {
      // 1. Ignore if message was recently deleted
      if (state.recentlyDeletedIds.has(msg.id)) {
        return state
      }

      // 2. Ignore if message with this exact id already exists
      if (state.messages.some((m) => m.id === msg.id)) {
        return state
      }

      // 3. Reconcile with optimistic temp-* message to eliminate duplicates completely!
      const authUser = useAuthStore.getState().user
      const currentUserId = authUser?.id || (authUser as any)?.sub
      const isFromMe = Boolean(
        currentUserId &&
          (msg.senderId === currentUserId ||
            msg.senderId === 'current-user' ||
            msg.senderId === 'me' ||
            (authUser?.email && msg.senderName?.toLowerCase() === authUser.email.toLowerCase()))
      )

      const tempIdx = state.messages.findIndex((m) => {
        if (!m.id.startsWith('temp-')) return false
        const matchesTarget =
          (msg.channelId && m.channelId === msg.channelId) ||
          (msg.recipientId && m.recipientId === msg.recipientId) ||
          (!msg.channelId && !msg.recipientId)
        if (!matchesTarget) return false

        if (isFromMe || m.senderId === msg.senderId) return true

        const hasMatchingVoiceNote =
          Array.isArray(m.attachments) &&
          Array.isArray(msg.attachments) &&
          m.attachments.some((a1: any) =>
            msg.attachments?.some((a2: any) => a1.type === 'audio_memo' && a2.type === 'audio_memo')
          )
        return hasMatchingVoiceNote || m.content === msg.content
      })

      if (tempIdx !== -1) {
        const nextMessages = [...state.messages]
        nextMessages[tempIdx] = {
          ...msg,
          senderId: isFromMe && currentUserId ? currentUserId : msg.senderId,
          senderName: nextMessages[tempIdx].senderName || msg.senderName,
          senderAvatar: nextMessages[tempIdx].senderAvatar || msg.senderAvatar,
        }
        return { messages: nextMessages }
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
    const updatedDeletedIds = new Set(get().recentlyDeletedIds)
    updatedDeletedIds.add(messageId)
    set((state) => ({
      messages: state.messages.filter((m) => m.id !== messageId),
      recentlyDeletedIds: updatedDeletedIds,
    }))
    setTimeout(() => {
      const current = get().recentlyDeletedIds
      if (current.has(messageId)) {
        const next = new Set(current)
        next.delete(messageId)
        set({ recentlyDeletedIds: next })
      }
    }, 30000)
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
      const rawMessages = res.data || []
      const deletedIds = get().recentlyDeletedIds

      // 1. Filter out tombstoned messages so deleted items NEVER flash or reappear
      let freshMessages = rawMessages.filter((m) => !deletedIds.has(m.id))

      // 2. Preserve any in-flight optimistic temp-* messages that have not finished server-roundtrip yet
      const currentTempMessages = get().messages.filter((m) => m.id.startsWith('temp-'))
      if (currentTempMessages.length > 0) {
        const nonReconciledTemps = currentTempMessages.filter((tm) => {
          return !freshMessages.some(
            (fm) =>
              fm.senderId === tm.senderId &&
              (fm.content === tm.content ||
                (Array.isArray(fm.attachments) &&
                  Array.isArray(tm.attachments) &&
                  fm.attachments.some((a1: any) =>
                    tm.attachments?.some((a2: any) => a1.type === a2.type)
                  )))
          )
        })
        if (nonReconciledTemps.length > 0) {
          freshMessages = [...freshMessages, ...nonReconciledTemps]
        }
      }

      set((state) => {
        // Fast shallow equality check by IDs, count, and updated timestamps
        if (
          state.messages.length === freshMessages.length &&
          state.messages.every((m, i) => {
            const f = freshMessages[i]
            return (
              f &&
              m.id === f.id &&
              m.content === f.content &&
              m.isPinned === f.isPinned &&
              m.isEdited === f.isEdited
            )
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
