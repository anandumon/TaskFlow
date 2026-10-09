'use client'

import React, { useEffect, useRef } from 'react'
import { PreJoinModal } from './PreJoinModal'
import { IncomingCallModal } from './IncomingCallModal'
import { LiveCallModal } from './LiveCallModal'
import { MinimizedCallBar } from './MinimizedCallBar'
import { useCallStore } from '@/stores/call-store'
import { useAuthStore } from '@/stores/auth-store'
import { useWorkspaceStore } from '@/stores/workspace-store'

export function CallProvider({ children }: { children?: React.ReactNode }) {
  const { user } = useAuthStore()
  const { currentWorkspace } = useWorkspaceStore()
  const {
    activeCall,
    incomingCall,
    setIncomingCall,
    setActiveCall,
    endActiveCall,
    setErrorMessage,
  } = useCallStore()

  const activeCallRef = useRef(activeCall)
  activeCallRef.current = activeCall

  const incomingCallRef = useRef(incomingCall)
  incomingCallRef.current = incomingCall

  // Background Call Synchronization Poller
  // Ensures incoming call popup shows across ANY screen even if SSE had connection drops or delays
  useEffect(() => {
    const wsId = currentWorkspace?.id
    const userId = user?.id
    if (!wsId || !userId) return

    let isAborted = false

    const syncCallState = async () => {
      if (isAborted) return

      try {
        const token =
          typeof window !== 'undefined'
            ? localStorage.getItem('accessToken') ||
              localStorage.getItem('token') ||
              localStorage.getItem('taskflow_token')
            : null

        // 1. Check for incoming calls where current user is ringing
        if (!activeCallRef.current) {
          const res = await fetch(`/api/v1/workspaces/${wsId}/calls?incoming=true`, {
            headers: token ? { Authorization: `Bearer ${token}` } : {},
          })
          if (res.ok) {
            const json = await res.json()
            const inc = json?.data
            if (inc && inc.callSession && inc.caller) {
              if (
                !incomingCallRef.current ||
                incomingCallRef.current.callSession.id !== inc.callSession.id
              ) {
                setIncomingCall(inc)
              }
            } else if (incomingCallRef.current && !inc) {
              // Call was cancelled or declined elsewhere
              setIncomingCall(null)
            }
          }
        }

        // 2. If caller is in RINGING state, check if recipient accepted, declined, or call ended
        const curActive = activeCallRef.current
        if (curActive && curActive.status === 'RINGING') {
          const res = await fetch(
            `/api/v1/workspaces/${curActive.workspaceId}/calls/${curActive.id}`,
            {
              headers: token ? { Authorization: `Bearer ${token}` } : {},
            }
          )
          if (res.ok) {
            const json = await res.json()
            const freshSession = json?.data
            if (freshSession) {
              if (freshSession.status === 'ACTIVE') {
                setActiveCall(freshSession)
              } else if (freshSession.status === 'DECLINED') {
                setErrorMessage('Call was declined')
                endActiveCall()
              } else if (
                freshSession.status === 'ENDED' ||
                freshSession.status === 'CANCELLED'
              ) {
                endActiveCall()
              }
            }
          }
        }
      } catch {
        // Ignore network hiccups
      }
    }

    // Run poll every 1 second for instant accept/decline detection
    const interval = setInterval(syncCallState, 1000)

    // Run on window focus or visibility change
    const onFocus = () => {
      syncCallState()
    }
    window.addEventListener('focus', onFocus)
    document.addEventListener('visibilitychange', onFocus)

    return () => {
      isAborted = true
      clearInterval(interval)
      window.removeEventListener('focus', onFocus)
      document.removeEventListener('visibilitychange', onFocus)
    }
  }, [
    currentWorkspace?.id,
    user?.id,
    setIncomingCall,
    setActiveCall,
    endActiveCall,
    setErrorMessage,
  ])

  return (
    <>
      {children}
      <PreJoinModal />
      <IncomingCallModal />
      <LiveCallModal />
      <MinimizedCallBar />
    </>
  )
}

