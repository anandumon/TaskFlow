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

    // 2. Periodic heartbeat & sync every 10 seconds
    const interval = setInterval(() => {
      sendHeartbeat({ workspaceId: currentWorkspace?.id })
      fetchPresence(currentWorkspace?.id)
    }, 10000)

    // 3. Tab visibility listener: immediately update heartbeat when user switches back to tab
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        sendHeartbeat({ workspaceId: currentWorkspace?.id })
        fetchPresence(currentWorkspace?.id)
      }
    }
    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      clearInterval(interval)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [user?.id, currentWorkspace?.id, sendHeartbeat, fetchPresence])

  return { isUserOnline, onlineUserIds }
}
