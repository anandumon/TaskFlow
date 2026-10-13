'use client'

import { useEffect, useRef } from 'react'
import { useChatStore } from '@/stores/chat-store'
import { useAuthStore } from '@/stores/auth-store'
import { useWorkspaceStore } from '@/stores/workspace-store'
import { useNotificationStore } from '@/stores/notification-store'

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
        const token =
          typeof window !== 'undefined'
            ? localStorage.getItem('accessToken') ||
              localStorage.getItem('token') ||
              localStorage.getItem('taskflow_token')
            : null
        if (token) params.set('token', token)

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

                // Add unread notification if message is from someone else and not actively in this view
                const myId = userRef.current?.id
                if (myId && msg.senderId && msg.senderId !== myId) {
                  const isActivelyViewing =
                    (msg.channelId && currentChannel?.id === msg.channelId) ||
                    (currentDM && (msg.senderId === currentDM.id || msg.recipientId === currentDM.id))

                  if (!isActivelyViewing) {
                    const hasVoiceNote =
                      Array.isArray(msg.attachments) &&
                      msg.attachments.some((a: any) => a.type === 'audio_memo')

                    useNotificationStore.getState().addMessageNotification({
                      id: msg.id,
                      senderId: msg.senderId,
                      senderName: msg.senderName || 'Team Member',
                      senderAvatar: msg.senderAvatar,
                      workspaceId: msg.workspaceId || wsId,
                      channelId: msg.channelId,
                      recipientId: msg.recipientId,
                      content: hasVoiceNote ? '🎙️ Voice Note' : (msg.content || 'New attachment'),
                      hasVoiceNote,
                      createdAt: msg.createdAt || new Date().toISOString(),
                      read: false,
                    })
                  }
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
                const targetIds: string[] = Array.isArray(msgData?.ids)
                  ? msgData.ids
                  : msgData?.id
                  ? [msgData.id]
                  : []

                if (targetIds.length > 0) {
                  if (msgData.mode === 'me') {
                    const currentId = userRef.current?.id
                    if (currentId && msgData.userId === currentId) {
                      targetIds.forEach((id) => receiveDeleteMessage(id))
                    }
                  } else {
                    targetIds.forEach((id) => receiveDeleteMessage(id))
                  }
                }
                break
              }

              case 'pin_message': {
                const msg = payload.data
                if (msg) receivePinMessage(msg)
                break
              }

              case 'call_event':
              case 'call_incoming':
              case 'call_accepted':
              case 'call_declined':
              case 'call_ended':
              case 'call_participant_left':
              case 'call_signal': {
                if (typeof window !== 'undefined') {
                  const { useCallStore, handledCallIds } = require('@/stores/call-store')
                  const callStore = useCallStore.getState()
                  const eventType = payload.callEventType || payload.event || payload.type || ''

                  if (eventType === 'call_incoming' || payload.data?.caller) {
                    const { callSession, caller } = payload.data || {}
                    const myId = userRef.current?.id
                    if (callSession && caller && caller.id !== myId) {
                      if (!payload.recipientId || payload.recipientId === myId) {
                        if (
                          !handledCallIds.has(callSession.id) &&
                          !callStore.isCallStarting &&
                          callStore.activeCall?.id !== callSession.id
                        ) {
                          callStore.setIncomingCall({ callSession, caller })
                        }
                      }
                    }
                  } else if (eventType === 'call_accepted') {
                    if (callStore.activeCall && callStore.activeCall.id === payload.callId) {
                      callStore.setActiveCall(payload.data?.callSession || { ...callStore.activeCall, status: 'ACTIVE' })
                    }
                  } else if (eventType === 'call_declined') {
                    if (callStore.activeCall && callStore.activeCall.id === payload.callId) {
                      callStore.setErrorMessage('Call declined by user')
                      callStore.endActiveCall(false)
                    }
                    if (callStore.incomingCall && callStore.incomingCall.callSession.id === payload.callId) {
                      callStore.setIncomingCall(null)
                    }
                  } else if (eventType === 'call_ended') {
                    if (callStore.activeCall && callStore.activeCall.id === payload.callId) {
                      // End call immediately for both users without re-triggering network call
                      callStore.endActiveCall(false)
                    }
                    if (callStore.incomingCall && callStore.incomingCall.callSession.id === payload.callId) {
                      callStore.setIncomingCall(null)
                    }
                  } else if (eventType === 'call_participant_left') {
                    // In group calls: remove departed participant from active list
                    if (callStore.activeCall && callStore.activeCall.id === payload.callId) {
                      const leftId = payload.data?.userId || payload.userId
                      if (leftId && leftId !== userRef.current?.id) {
                        const remaining = (callStore.activeCall.participants || []).filter(
                          (p: any) => p.userId !== leftId
                        )
                        callStore.setActiveCall({
                          ...callStore.activeCall,
                          participants: remaining,
                        })
                      }
                    }
                  } else if (eventType === 'call_signal') {
                    const sig = payload.data?.signal
                    if (sig && typeof window !== 'undefined') {
                      window.dispatchEvent(
                        new CustomEvent('taskflow:call_signal', { detail: sig })
                      )
                    }
                  }
                }
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
