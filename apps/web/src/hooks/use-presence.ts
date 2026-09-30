'use client'

import { useEffect } from 'react'
import { usePresenceStore } from '@/stores/presence-store'
import { useAuthStore } from '@/stores/auth-store'
import { useWorkspaceStore } from '@/stores/workspace-store'

export function usePresence() {
  const { user } = useAuthStore()
  const { currentWorkspace } = useWorkspaceStore()
  const { fetchPresence, sendHeartbeat, isUserOnline, onlineUserIds } = usePresenceStore()

  useEffect(() => {
    if (!user?.id) return

    // 1. Initial heartbeat & sync
    sendHeartbeat({ workspaceId: currentWorkspace?.id })
    fetchPresence(currentWorkspace?.id)

    // 2. Periodic heartbeat every 15 seconds
    const interval = setInterval(() => {
      sendHeartbeat({ workspaceId: currentWorkspace?.id })
    }, 15000)

    // 3. Tab visibility listener: immediately update heartbeat when user switches back to tab
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        sendHeartbeat({ workspaceId: currentWorkspace?.id })
        fetchPresence(currentWorkspace?.id)
      }
    }
    document.addEventListener('visibilitychange', handleVisibilityChange)

    // 4. Send offline on window unload
    const handleBeforeUnload = () => {
      if (user?.id) {
        navigator.sendBeacon?.(
          '/api/v1/presence',
          JSON.stringify({ userId: user.id, status: 'offline' })
        )
      }
    }
    window.addEventListener('beforeunload', handleBeforeUnload)

    return () => {
      clearInterval(interval)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('beforeunload', handleBeforeUnload)
    }
  }, [user?.id, currentWorkspace?.id, sendHeartbeat, fetchPresence])

  return { isUserOnline, onlineUserIds }
}
