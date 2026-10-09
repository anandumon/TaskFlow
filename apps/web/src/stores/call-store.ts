import { create } from 'zustand'

export type CallType =
  | 'ONE_TO_ONE_VOICE'
  | 'ONE_TO_ONE_VIDEO'
  | 'GROUP_VOICE'
  | 'GROUP_VIDEO'
  | 'CHANNEL_CALL'

export type CallStatus =
  | 'CREATED'
  | 'RINGING'
  | 'ACTIVE'
  | 'ENDING'
  | 'ENDED'
  | 'CANCELLED'
  | 'DECLINED'
  | 'MISSED'
  | 'EXPIRED'

export interface ParticipantInfo {
  id: string
  userId: string
  name: string
  avatarUrl?: string
  role: string
  status: string
  isMuted: boolean
  isVideoOff: boolean
  isSpeaking?: boolean
}

export interface CallSession {
  id: string
  workspaceId: string
  channelId?: string
  conversationId?: string
  roomName: string
  callType: CallType
  status: CallStatus
  createdBy: string
  createdByName?: string
  createdByAvatar?: string
  isE2EE: boolean
  encryptionKeyVersion: number
  participants?: ParticipantInfo[]
}

interface CallState {
  activeCall: CallSession | null
  incomingCall: {
    callSession: CallSession
    caller: { id: string; name: string; avatarUrl?: string }
  } | null
  isPreJoinOpen: boolean
  isLiveCallOpen: boolean
  isMinimized: boolean
  isIncomingMinimized: boolean
  preJoinOptions: {
    callType: CallType
    recipientId?: string
    recipientName?: string
    recipientAvatar?: string
    channelId?: string
    channelName?: string
  } | null
  localAudioMuted: boolean
  localVideoOff: boolean
  isScreenSharing: boolean
  isCallStarting: boolean
  localStream: MediaStream | null
  liveKitToken: string | null
  serverUrl: string | null
  roomName: string | null
  e2eeKey: string | null
  connectionQuality: 'excellent' | 'good' | 'poor' | 'reconnecting'
  errorMessage: string | null

  // Actions
  openPreJoin: (options: CallState['preJoinOptions']) => void
  closePreJoin: () => void
  startCallFromPreJoin: (workspaceId: string) => Promise<boolean>
  acceptIncomingCall: () => Promise<boolean>
  declineIncomingCall: () => Promise<void>
  endActiveCall: () => Promise<void>
  toggleAudio: () => void
  toggleVideo: () => void
  toggleScreenShare: () => void
  toggleMinimize: () => void
  toggleIncomingMinimize: () => void
  setIncomingCall: (incoming: CallState['incomingCall']) => void
  setActiveCall: (call: CallSession | null) => void
  setLocalStream: (stream: MediaStream | null) => void
  setLiveKitCredentials: (token: string, serverUrl: string, roomName: string, e2eeKey?: string) => void
  setErrorMessage: (msg: string | null) => void
  clearError: () => void
}

export const useCallStore = create<CallState>((set, get) => ({
  activeCall: null,
  incomingCall: null,
  isPreJoinOpen: false,
  isLiveCallOpen: false,
  isMinimized: false,
  isIncomingMinimized: false,
  preJoinOptions: null,
  localAudioMuted: false,
  localVideoOff: false,
  isScreenSharing: false,
  isCallStarting: false,
  localStream: null,
  liveKitToken: null,
  serverUrl: null,
  roomName: null,
  e2eeKey: null,
  connectionQuality: 'excellent',
  errorMessage: null,

  openPreJoin: (options) => {
    if (get().activeCall || get().isCallStarting) return
    set({
      isPreJoinOpen: true,
      preJoinOptions: options,
      errorMessage: null,
      localVideoOff: options?.callType === 'ONE_TO_ONE_VOICE' || options?.callType === 'GROUP_VOICE',
    })
  },

  closePreJoin: () => {
    set({ isPreJoinOpen: false, preJoinOptions: null })
  },

  startCallFromPreJoin: async (workspaceId: string) => {
    if (get().isCallStarting || get().activeCall) return false
    const { preJoinOptions } = get()
    if (!preJoinOptions) return false

    set({ isCallStarting: true })
    try {
      const token =
        localStorage.getItem('accessToken') ||
        localStorage.getItem('token') ||
        localStorage.getItem('taskflow_token')

      const res = await fetch(`/api/v1/workspaces/${workspaceId}/calls`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          callType: preJoinOptions.callType,
          recipientId: preJoinOptions.recipientId,
          channelId: preJoinOptions.channelId,
          isE2EE: true,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        const errorMsg = data?.message || data?.error || 'Failed to start call'
        set({ errorMessage: errorMsg })
        return false
      }

      const callSession: CallSession = data.data
      set({
        activeCall: callSession,
        isPreJoinOpen: false,
        isLiveCallOpen: true,
        isMinimized: false,
      })

      // Fetch LiveKit media token and E2EE key
      const tokenRes = await fetch(
        `/api/v1/workspaces/${workspaceId}/calls/${callSession.id}/token`,
        {
          method: 'POST',
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        }
      )
      const tokenData = await tokenRes.json()

      let keyStr = ''
      try {
        const keyRes = await fetch(
          `/api/v1/workspaces/${workspaceId}/calls/${callSession.id}/e2ee-key`,
          {
            method: 'POST',
            headers: token ? { Authorization: `Bearer ${token}` } : {},
          }
        )
        const keyJson = await keyRes.json()
        keyStr = keyJson?.data?.key || ''
      } catch {}

      if (tokenData?.data) {
        set({
          liveKitToken: tokenData.data.token,
          serverUrl: tokenData.data.serverUrl,
          roomName: tokenData.data.roomName,
          e2eeKey: keyStr,
        })
      }

      return true
    } catch (err: any) {
      console.error('[call-store] startCall error:', err)
      set({ errorMessage: err?.message || 'Network error starting call' })
      return false
    } finally {
      set({ isCallStarting: false })
    }
  },

  acceptIncomingCall: async () => {
    const { incomingCall, isCallStarting, activeCall } = get()
    if (!incomingCall || isCallStarting || activeCall) return false

    // Immediately clear incomingCall and lock with isCallStarting
    set({ incomingCall: null, isCallStarting: true })

    try {
      const { callSession } = incomingCall
      const token =
        localStorage.getItem('accessToken') ||
        localStorage.getItem('token') ||
        localStorage.getItem('taskflow_token')

      const res = await fetch(
        `/api/v1/workspaces/${callSession.workspaceId}/calls/${callSession.id}/respond`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({ action: 'ACCEPT' }),
        }
      )

      if (!res.ok) return false
      const resJson = await res.json()
      // The respond API returns apiSuccess(callSession) → { success, data: callSession }
      const updatedCall: CallSession = resJson?.data || {
        ...callSession,
        status: 'ACTIVE',
      }

      const tokenRes = await fetch(
        `/api/v1/workspaces/${callSession.workspaceId}/calls/${callSession.id}/token`,
        {
          method: 'POST',
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        }
      )
      const tokenData = await tokenRes.json()

      let keyStr = ''
      try {
        const keyRes = await fetch(
          `/api/v1/workspaces/${callSession.workspaceId}/calls/${callSession.id}/e2ee-key`,
          {
            method: 'POST',
            headers: token ? { Authorization: `Bearer ${token}` } : {},
          }
        )
        const keyJson = await keyRes.json()
        keyStr = keyJson?.data?.key || ''
      } catch {}

      set({
        activeCall: updatedCall,
        incomingCall: null,
        isLiveCallOpen: true,
        isMinimized: false,
        liveKitToken: tokenData?.data?.token || null,
        serverUrl: tokenData?.data?.serverUrl || null,
        roomName: tokenData?.data?.roomName || null,
        e2eeKey: keyStr,
      })

      return true
    } catch (err) {
      console.error('[call-store] accept error:', err)
      return false
    } finally {
      set({ isCallStarting: false })
    }
  },

  declineIncomingCall: async () => {
    const { incomingCall } = get()
    if (!incomingCall) return

    try {
      const { callSession } = incomingCall
      const token =
        localStorage.getItem('accessToken') ||
        localStorage.getItem('token') ||
        localStorage.getItem('taskflow_token')

      await fetch(
        `/api/v1/workspaces/${callSession.workspaceId}/calls/${callSession.id}/respond`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({ action: 'DECLINE' }),
        }
      )

      set({ incomingCall: null })
    } catch (err) {
      console.error('[call-store] decline error:', err)
      set({ incomingCall: null })
    }
  },

  endActiveCall: async () => {
    const { activeCall, localStream } = get()
    if (localStream) {
      try {
        localStream.getTracks().forEach((track) => track.stop())
      } catch (e) {
        console.warn('[call-store] Failed to stop local tracks:', e)
      }
    }

    if (!activeCall) {
      set({
        localStream: null,
        activeCall: null,
        isLiveCallOpen: false,
        isMinimized: false,
      })
      return
    }

    try {
      const token =
        localStorage.getItem('accessToken') ||
        localStorage.getItem('token') ||
        localStorage.getItem('taskflow_token')

      await fetch(
        `/api/v1/workspaces/${activeCall.workspaceId}/calls/${activeCall.id}/end`,
        {
          method: 'POST',
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        }
      )
    } catch (err) {
      console.error('[call-store] end call error:', err)
    } finally {
      set({
        activeCall: null,
        localStream: null,
        isLiveCallOpen: false,
        isMinimized: false,
        liveKitToken: null,
        serverUrl: null,
        roomName: null,
        e2eeKey: null,
      })
    }
  },

  toggleAudio: () => set((state) => ({ localAudioMuted: !state.localAudioMuted })),
  toggleVideo: () => set((state) => ({ localVideoOff: !state.localVideoOff })),
  toggleScreenShare: () => set((state) => ({ isScreenSharing: !state.isScreenSharing })),
  toggleMinimize: () => set((state) => ({ isMinimized: !state.isMinimized })),
  toggleIncomingMinimize: () => set((state) => ({ isIncomingMinimized: !state.isIncomingMinimized })),

  setIncomingCall: (incoming) =>
    set({
      incomingCall: incoming,
      isIncomingMinimized: incoming ? false : false,
    }),
  setActiveCall: (call) => set({ activeCall: call }),
  setLocalStream: (stream) => set({ localStream: stream }),
  setLiveKitCredentials: (token, serverUrl, roomName, e2eeKey) =>
    set({ liveKitToken: token, serverUrl, roomName, e2eeKey }),
  setErrorMessage: (msg) => set({ errorMessage: msg }),
  clearError: () => set({ errorMessage: null }),
}))
