'use client'

import { useEffect, useRef } from 'react'
import { useChatStore } from '@/stores/chat-store'
import { useAuthStore } from '@/stores/auth-store'
import { useWorkspaceStore } from '@/stores/workspace-store'

export function useChatRealtime() {
  const { user } = useAuthStore()
  const { currentWorkspace } = useWorkspaceStore()
  const {
    activeChannel,
    activeDMUser,
    receiveNewMessage,
    receiveEditMessage,
    receiveDeleteMessage,
    receivePinMessage,
    silentSyncMessages,
    fetchChannels,
  } = useChatStore()

  const activeChannelRef = useRef(activeChannel)
  activeChannelRef.current = activeChannel

  const activeDMUserRef = useRef(activeDMUser)
  activeDMUserRef.current = activeDMUser

  const userRef = useRef(user)
  userRef.current = user

  const currentWorkspaceRef = useRef(currentWorkspace)
  currentWorkspaceRef.current = currentWorkspace

  // 1. Instant Real-Time Stream (Server-Sent Events)
  useEffect(() => {
    const wsId = currentWorkspace?.id
    if (!wsId || typeof window === 'undefined') return

    let eventSource: EventSource | null = null
    let reconnectTimer: NodeJS.Timeout | null = null
    let isAborted = false

    const connect = () => {
      if (isAborted) return

      try {
        const params = new URLSearchParams()
        if (user?.id) params.set('userId', user.id)
        if (activeChannel?.id) params.set('channelId', activeChannel.id)
        if (activeDMUser?.id) params.set('recipientId', activeDMUser.id)

        const streamUrl = `/api/v1/workspaces/${wsId}/messages/stream?${params.toString()}`
        eventSource = new EventSource(streamUrl)

        eventSource.onmessage = (event) => {
          try {
            if (!event.data || event.data.startsWith(':')) return
            const payload = JSON.parse(event.data)
            if (!payload || !payload.type) return

            const currentChannel = activeChannelRef.current
            const currentDM = activeDMUserRef.current
            const currentUser = userRef.current

            switch (payload.type) {
              case 'new_message': {
                const msg = payload.data
                if (!msg) return

                // Check if message belongs to active Channel
                if (currentChannel && msg.channelId === currentChannel.id) {
                  receiveNewMessage(msg)
                }
                // Check if message belongs to active Direct Message
                else if (
                  currentDM &&
                  currentUser &&
                  ((msg.senderId === currentDM.id && msg.recipientId === currentUser.id) ||
                    (msg.senderId === currentUser.id && msg.recipientId === currentDM.id))
                ) {
                  receiveNewMessage(msg)
                }

                // If message is in another channel or another DM, refresh channels/counts in background
                if (msg.channelId && (!currentChannel || msg.channelId !== currentChannel.id)) {
                  fetchChannels(wsId)
                }
                break
              }

              case 'edit_message': {
                const msg = payload.data
                if (msg) receiveEditMessage(msg)
                break
              }

              case 'delete_message': {
                const msgData = payload.data
                if (msgData?.id) {
                  if (msgData.mode === 'me') {
                    const currentId = userRef.current?.id
                    if (currentId && msgData.userId === currentId) {
                      receiveDeleteMessage(msgData.id)
                    }
                  } else {
                    receiveDeleteMessage(msgData.id)
                  }
                }
                break
              }

              case 'pin_message': {
                const msg = payload.data
                if (msg) receivePinMessage(msg)
                break
              }
            }
          } catch (err) {
            // Ignore parse errors from comments/heartbeats
          }
        }

        eventSource.onerror = () => {
          if (eventSource) {
            eventSource.close()
            eventSource = null
          }
          if (!isAborted) {
            reconnectTimer = setTimeout(connect, 3000)
          }
        }
      } catch (err) {
        if (!isAborted) {
          reconnectTimer = setTimeout(connect, 3000)
        }
      }
    }

    connect()

    return () => {
      isAborted = true
      if (reconnectTimer) clearTimeout(reconnectTimer)
      if (eventSource) {
        eventSource.close()
        eventSource = null
      }
    }
  }, [
    currentWorkspace?.id,
    activeChannel?.id,
    activeDMUser?.id,
    user?.id,
    receiveNewMessage,
    receiveEditMessage,
    receiveDeleteMessage,
    receivePinMessage,
    fetchChannels,
  ])

  // 2. High-Frequency Fallback Polling Loop (every 2.5s)
  useEffect(() => {
    const wsId = currentWorkspace?.id
    if (!wsId || (!activeChannel?.id && !activeDMUser?.id)) return

    const target = activeChannel?.id
      ? { channelId: activeChannel.id }
      : { recipientId: activeDMUser?.id }

    // Immediate background sync on target change
    silentSyncMessages(wsId, target)

    const interval = setInterval(() => {
      silentSyncMessages(wsId, target)
    }, 2500)

    // Immediate sync when tab becomes visible or receives focus
    const handleSync = () => {
      if (document.visibilityState === 'visible') {
        silentSyncMessages(wsId, target)
      }
    }

    document.addEventListener('visibilitychange', handleSync)
    window.addEventListener('focus', handleSync)

    return () => {
      clearInterval(interval)
      document.removeEventListener('visibilitychange', handleSync)
      window.removeEventListener('focus', handleSync)
    }
  }, [currentWorkspace?.id, activeChannel?.id, activeDMUser?.id, silentSyncMessages])
}
