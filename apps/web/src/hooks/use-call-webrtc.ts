'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { getIceServers } from '@/features/calls/utils/webrtc'
import { useCallStore } from '@/stores/call-store'

export interface UseCallWebRTCOptions {
  enabled: boolean
  callId?: string
  workspaceId?: string
  status?: string
  createdBy?: string
  userId?: string
  wantVideo?: boolean
  audioMuted?: boolean
  videoOff?: boolean
  authHeaders?: () => Record<string, string>
}

export interface UseCallWebRTCResult {
  localStream: MediaStream | null
  remoteStream: MediaStream | null
  connectionState: RTCPeerConnectionState | 'idle'
  mediaError: string | null
  isSpeaking: boolean
  hasRemoteVideo: boolean
  remoteAudioMuted: boolean
  audioBlocked: boolean
  isEncrypted: boolean
  resumeAudio: () => Promise<void>
  pcRef: React.MutableRefObject<RTCPeerConnection | null>
  localStreamRef: React.MutableRefObject<MediaStream | null>
}

/**
 * Attaches a MediaStream to a video or audio element ref and keeps it attached across renders.
 * Re-attaches when either the stream OR the element changes (handles minimize/restore remounting).
 */
export function attachStreamToElement(
  el: HTMLVideoElement | HTMLAudioElement | null,
  stream: MediaStream | null
) {
  if (!el) return
  if (el.srcObject !== stream) {
    el.srcObject = stream
  }
  if (stream) {
    const playPromise = el.play()
    if (playPromise !== undefined) {
      playPromise.catch((err) => {
        // Autoplay may need user gesture
        console.warn('[attachStreamToElement] Play deferred:', err?.name || err)
      })
    }
  }
}

/**
 * Attaches a MediaStream to a video or audio element ref and keeps it attached across renders.
 * Re-attaches when either the stream OR the element changes (handles minimize/restore remounting).
 */
export function useStreamRef<T extends HTMLVideoElement | HTMLAudioElement>(
  stream: MediaStream | null
): React.MutableRefObject<T | null> {
  const ref = useRef<T | null>(null)

  // Re-attach whenever the stream changes
  useEffect(() => {
    const el = ref.current
    if (el) {
      attachStreamToElement(el, stream)
    }
  }, [stream])

  return ref
}


export function useCallWebRTC({
  enabled,
  callId,
  workspaceId,
  status,
  createdBy,
  userId,
  wantVideo = true,
  audioMuted = false,
  videoOff = false,
  authHeaders,
}: UseCallWebRTCOptions): UseCallWebRTCResult {
  const [localStream, setLocalStream] = useState<MediaStream | null>(() => {
    const storeStream = useCallStore.getState().localStream
    if (storeStream && storeStream.getTracks().some((t) => t.readyState === 'live')) {
      return storeStream
    }
    return null
  })
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null)
  const [connectionState, setConnectionState] = useState<RTCPeerConnectionState | 'idle'>('idle')
  const [mediaError, setMediaError] = useState<string | null>(null)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [hasRemoteVideo, setHasRemoteVideo] = useState(false)
  const [remoteAudioMuted, setRemoteAudioMuted] = useState(false)
  const [audioBlocked, setAudioBlocked] = useState(false)
  const [isEncrypted, setIsEncrypted] = useState(true)

  const pcRef = useRef<RTCPeerConnection | null>(null)
  const localStreamRef = useRef<MediaStream | null>(localStream)
  const remoteStreamRef = useRef<MediaStream | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const vadRafRef = useRef<number | null>(null)
  const processedSignalIdsRef = useRef<Set<string>>(new Set())
  const pendingIceCandidatesRef = useRef<RTCIceCandidateInit[]>([])
  const isPollingRef = useRef<boolean>(false)
  const lastServerTimestampRef = useRef<string | null>(null)
  const hasSentOfferRef = useRef<boolean>(false)
  const mediaAcquisitionPromiseRef = useRef<Promise<MediaStream | null> | null>(null)

  // Keep mutable options in refs so callbacks stay stable and don't re-create the PeerConnection
  const wantVideoRef = useRef(wantVideo)
  const videoOffRef = useRef(videoOff)
  const audioMutedRef = useRef(audioMuted)
  useEffect(() => { wantVideoRef.current = wantVideo }, [wantVideo])
  useEffect(() => { videoOffRef.current = videoOff }, [videoOff])
  useEffect(() => { audioMutedRef.current = audioMuted }, [audioMuted])

  const isCaller = createdBy === userId

  // Helper to send WebRTC signals (Offer, Answer, ICE) to backend signaling route
  const sendSignal = useCallback(
    async (type: 'OFFER' | 'ANSWER' | 'ICE_CANDIDATE', payload: any) => {
      if (!callId || !workspaceId) return
      try {
        const headers = authHeaders ? authHeaders() : {}
        const res = await fetch(
          `/api/v1/workspaces/${workspaceId}/calls/${callId}/signal`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...headers,
            },
            body: JSON.stringify({ type, payload }),
          }
        )

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}))
          console.warn(`[useCallWebRTC] Signal ${type} rejected with status ${res.status}:`, errData)
        }
      } catch (err) {
        console.warn(`[useCallWebRTC] Signal ${type} dispatch network error:`, err)
      }
    },
    [callId, workspaceId, authHeaders]
  )

  // Resume audio playback / unlock AudioContext
  const resumeAudio = useCallback(async () => {
    try {
      if (audioContextRef.current && audioContextRef.current.state === 'suspended') {
        await audioContextRef.current.resume()
      }
      setAudioBlocked(false)
    } catch (err) {
      console.warn('[useCallWebRTC] Failed to resume audio context:', err)
    }
  }, [])

  // Attach tracks from stream to RTCPeerConnection safely
  const attachTracksToPc = useCallback((pc: RTCPeerConnection, stream: MediaStream) => {
    try {
      const senders = pc.getSenders()
      stream.getTracks().forEach((track) => {
        const existingSender = senders.find(
          (s) => s.track === track || s.track?.kind === track.kind
        )
        if (existingSender) {
          if (existingSender.track !== track) {
            existingSender.replaceTrack(track).catch((e) => {
              console.warn('[useCallWebRTC] replaceTrack error:', e)
            })
          }
        } else {
          pc.addTrack(track, stream)
        }
      })
    } catch (e) {
      console.warn('[useCallWebRTC] attachTracksToPc error:', e)
    }
  }, [])

  // Acquire or reuse local media stream.
  // STABLE: no closure deps - reads options from refs so PeerConnection is never torn down by mute/unmute.
  const acquireMedia = useCallback(async (): Promise<MediaStream | null> => {
    // 1. Check if we already have an active stream (either from ref or store)
    const existing = localStreamRef.current || useCallStore.getState().localStream
    if (existing && existing.getTracks().some((t) => t.readyState === 'live')) {
      const hasVideo = existing.getVideoTracks().some((t) => t.readyState === 'live')
      // If video is requested but existing stream only has audio, augment with camera
      if (wantVideoRef.current && !videoOffRef.current && !hasVideo) {
        try {
          const videoStream = await navigator.mediaDevices.getUserMedia({
            video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' },
          })
          const videoTrack = videoStream.getVideoTracks()[0]
          if (videoTrack) {
            existing.addTrack(videoTrack)
          }
        } catch (vErr) {
          console.warn('[useCallWebRTC] Video augment warning:', vErr)
        }
      }

      existing.getAudioTracks().forEach((t) => (t.enabled = !audioMutedRef.current))
      existing.getVideoTracks().forEach((t) => (t.enabled = !videoOffRef.current))

      localStreamRef.current = existing
      setLocalStream(existing)
      useCallStore.getState().setLocalStream(existing)
      return existing
    }

    // 2. Return in-flight acquisition promise if already acquiring
    if (mediaAcquisitionPromiseRef.current) {
      return mediaAcquisitionPromiseRef.current
    }

    const promise = (async () => {
      setMediaError(null)
      let stream: MediaStream | null = null

      if (wantVideoRef.current && !videoOffRef.current) {
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
            video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' },
          })
        } catch (videoErr: any) {
          console.warn('[useCallWebRTC] Video getUserMedia failed, falling back to audio-only:', videoErr)
          setMediaError('Camera unavailable or permission denied. Connected with audio only.')
        }
      }

      if (!stream) {
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
            video: false,
          })
        } catch (audioErr: any) {
          console.error('[useCallWebRTC] Audio getUserMedia failed:', audioErr)
          setMediaError('Microphone unavailable or permission denied. Unable to join call.')
          return null
        }
      }

      stream.getAudioTracks().forEach((t) => (t.enabled = !audioMutedRef.current))
      stream.getVideoTracks().forEach((t) => (t.enabled = !videoOffRef.current))

      localStreamRef.current = stream
      setLocalStream(stream)
      useCallStore.getState().setLocalStream(stream)

      // Attach voice activity detection
      try {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext
        const ctx = new AudioCtx()
        audioContextRef.current = ctx

        if (ctx.state === 'suspended') {
          setAudioBlocked(true)
        }

        const analyser = ctx.createAnalyser()
        const source = ctx.createMediaStreamSource(stream)
        source.connect(analyser)
        analyser.fftSize = 64
        const dataArray = new Uint8Array(analyser.frequencyBinCount)

        const checkSpeaking = () => {
          if (!localStreamRef.current) return
          analyser.getByteFrequencyData(dataArray)
          let sum = 0
          for (let i = 0; i < dataArray.length; i++) sum += dataArray[i]
          const avg = sum / dataArray.length
          setIsSpeaking(!audioMutedRef.current && avg > 15)
          vadRafRef.current = requestAnimationFrame(checkSpeaking)
        }
        checkSpeaking()
      } catch (vadErr) {
        console.warn('[useCallWebRTC] VAD setup warning:', vadErr)
      }

      return stream
    })()

    mediaAcquisitionPromiseRef.current = promise
    try {
      const res = await promise
      return res
    } finally {
      mediaAcquisitionPromiseRef.current = null
    }
  }, []) // stable - reads from refs only, no deps

  // Initial media trigger on enable
  // NOTE: acquireMedia is now stable (no deps), so it does NOT need to be in the dep array
  useEffect(() => {
    if (!enabled || !callId) {
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((t) => t.stop())
        localStreamRef.current = null
        setLocalStream(null)
      }
      return
    }

    acquireMedia().catch(() => {})

    return () => {
      if (vadRafRef.current) {
        cancelAnimationFrame(vadRafRef.current)
        vadRafRef.current = null
      }
      if (audioContextRef.current) {
        audioContextRef.current.close().catch(() => {})
        audioContextRef.current = null
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, callId])

  // Sync Audio Mute
  useEffect(() => {
    if (localStreamRef.current) {
      localStreamRef.current.getAudioTracks().forEach((t) => {
        t.enabled = !audioMuted
      })
    }
  }, [audioMuted])

  // Sync Video Off
  useEffect(() => {
    if (localStreamRef.current) {
      localStreamRef.current.getVideoTracks().forEach((t) => {
        t.enabled = !videoOff
      })
    }
  }, [videoOff])

  // WebRTC PeerConnection Lifecycle & Offer Initiation
  useEffect(() => {
    if (!enabled || !callId || status !== 'ACTIVE') {
      return
    }

    let isDisposed = false
    const iceServers = getIceServers()
    const pc = new RTCPeerConnection({
      iceServers,
      iceCandidatePoolSize: 10,
    })
    pcRef.current = pc
    hasSentOfferRef.current = false
    processedSignalIdsRef.current.clear()
    pendingIceCandidatesRef.current = []
    lastServerTimestampRef.current = null

    pc.onconnectionstatechange = () => {
      if (isDisposed) return
      setConnectionState(pc.connectionState)
      if (pc.connectionState === 'connected') {
        setIsEncrypted(true)
      } else if (pc.connectionState === 'failed') {
        console.warn('[useCallWebRTC] Peer connection failed. Attempting ICE restart...')
        try {
          pc.restartIce()
        } catch (e) {
          console.warn('[useCallWebRTC] restartIce error:', e)
        }
      }
    }

    // ICE Candidate Gathering
    pc.onicecandidate = (event) => {
      if (event.candidate && !isDisposed) {
        sendSignal('ICE_CANDIDATE', event.candidate.toJSON())
      }
    }

    // Remote Track Handling
    pc.ontrack = (event) => {
      if (isDisposed) return
      console.log('[useCallWebRTC] ontrack received:', event.track.kind, event.track.id)

      let currentRemote = remoteStreamRef.current
      if (!currentRemote) {
        currentRemote = new MediaStream()
      }

      // If replacing track of same kind, remove old track
      const existing = currentRemote.getTracks().find((t) => t.kind === event.track.kind)
      if (existing && existing.id !== event.track.id) {
        currentRemote.removeTrack(existing)
      }
      if (!currentRemote.getTracks().some((t) => t.id === event.track.id)) {
        currentRemote.addTrack(event.track)
      }

      // Always create a new MediaStream instance so React updates element srcObject
      const freshStream = new MediaStream(currentRemote.getTracks())
      remoteStreamRef.current = freshStream
      setRemoteStream(freshStream)

      const updateTracks = () => {
        if (isDisposed) return
        const hasVideo = freshStream.getVideoTracks().some((t) => t.enabled && t.readyState === 'live')
        const hasAudio = freshStream.getAudioTracks().some((t) => t.enabled && t.readyState === 'live')
        setHasRemoteVideo(hasVideo)
        setRemoteAudioMuted(!hasAudio)
      }

      event.track.onmute = updateTracks
      event.track.onunmute = updateTracks
      event.track.onended = updateTracks
      updateTracks()
    }

    // Acquire or re-use local media, attach tracks, and initiate offer if caller
    acquireMedia().then(async (stream) => {
      if (isDisposed) return

      if (stream) {
        attachTracksToPc(pc, stream)
      }

      // Caller creates and sends OFFER with local tracks already attached
      if (isCaller && !hasSentOfferRef.current) {
        hasSentOfferRef.current = true
        try {
          const offer = await pc.createOffer({
            offerToReceiveAudio: true,
            offerToReceiveVideo: true,
          })
          await pc.setLocalDescription(offer)
          await sendSignal('OFFER', offer)
        } catch (offerErr) {
          console.error('[useCallWebRTC] createOffer error:', offerErr)
        }
      }
    })

    return () => {
      isDisposed = true
      pc.close()
      pcRef.current = null
      setConnectionState('idle')
      setRemoteStream(null)
      remoteStreamRef.current = null
      setIsEncrypted(false)
    }
  }, [enabled, callId, status, isCaller, sendSignal, acquireMedia, attachTracksToPc])

  // Signaling Polling Loop
  useEffect(() => {
    if (!enabled || !callId || status !== 'ACTIVE') return

    let isDestroyed = false

    const pollSignals = async () => {
      if (isDestroyed || isPollingRef.current) return
      const pc = pcRef.current
      if (!pc || pc.signalingState === 'closed') return

      isPollingRef.current = true

      try {
        const headers = authHeaders ? authHeaders() : {}
        const sinceQuery = lastServerTimestampRef.current
          ? `since=${encodeURIComponent(lastServerTimestampRef.current)}`
          : 'since=0'

        const res = await fetch(
          `/api/v1/workspaces/${workspaceId}/calls/${callId}/signal?${sinceQuery}`,
          { headers }
        )

        if (res.ok) {
          const json = await res.json()
          const signals = json?.data || []

          for (const sig of signals) {
            if (isDestroyed) break

            // Skip signals already processed or sent by self
            if (processedSignalIdsRef.current.has(sig.id)) continue
            if (sig.senderId && sig.senderId === userId) continue

            processedSignalIdsRef.current.add(sig.id)
            if (sig.createdAt) {
              lastServerTimestampRef.current = sig.createdAt
            }

            // Handle incoming OFFER (Callee side)
            if (sig.type === 'OFFER' && !isCaller) {
              if (pc.signalingState === 'stable' || pc.signalingState === 'have-local-pranswer') {
                // Ensure local tracks are attached BEFORE generating answer
                let curStream = localStreamRef.current
                if (!curStream || !curStream.getTracks().some((t) => t.readyState === 'live')) {
                  curStream = await acquireMedia()
                }
                if (curStream) {
                  attachTracksToPc(pc, curStream)
                }

                try {
                  await pc.setRemoteDescription(new RTCSessionDescription(sig.payload))

                  // Flush queued ICE candidates
                  while (pendingIceCandidatesRef.current.length > 0) {
                    const candidate = pendingIceCandidatesRef.current.shift()
                    if (candidate) {
                      try {
                        await pc.addIceCandidate(new RTCIceCandidate(candidate))
                      } catch (e) {
                        console.warn('[useCallWebRTC] Error adding queued ICE:', e)
                      }
                    }
                  }

                  const answer = await pc.createAnswer({
                    offerToReceiveAudio: true,
                    offerToReceiveVideo: true,
                  })
                  await pc.setLocalDescription(answer)
                  await sendSignal('ANSWER', answer)
                } catch (sdpErr) {
                  console.error('[useCallWebRTC] Error handling OFFER:', sdpErr)
                }
              }
            }

            // Handle incoming ANSWER (Caller side)
            else if (sig.type === 'ANSWER' && isCaller) {
              if (pc.signalingState === 'have-local-offer') {
                try {
                  await pc.setRemoteDescription(new RTCSessionDescription(sig.payload))

                  // Flush queued ICE candidates
                  while (pendingIceCandidatesRef.current.length > 0) {
                    const candidate = pendingIceCandidatesRef.current.shift()
                    if (candidate) {
                      try {
                        await pc.addIceCandidate(new RTCIceCandidate(candidate))
                      } catch (e) {
                        console.warn('[useCallWebRTC] Error adding queued ICE:', e)
                      }
                    }
                  }
                } catch (sdpErr) {
                  console.error('[useCallWebRTC] Error handling ANSWER:', sdpErr)
                }
              }
            }

            // Handle incoming ICE_CANDIDATE
            else if (sig.type === 'ICE_CANDIDATE') {
              if (pc.remoteDescription && pc.remoteDescription.type) {
                try {
                  await pc.addIceCandidate(new RTCIceCandidate(sig.payload))
                } catch (e) {
                  console.warn('[useCallWebRTC] Error adding ICE candidate:', e)
                }
              } else {
                pendingIceCandidatesRef.current.push(sig.payload)
              }
            }
          }
        }
      } catch (err) {
        console.warn('[useCallWebRTC] Signal poll warning:', err)
      } finally {
        isPollingRef.current = false
        if (!isDestroyed) {
          setTimeout(pollSignals, 500)
        }
      }
    }

    pollSignals()

    return () => {
      isDestroyed = true
    }
  }, [
    enabled,
    callId,
    status,
    isCaller,
    userId,
    workspaceId,
    authHeaders,
    sendSignal,
    acquireMedia,
    attachTracksToPc,
  ])

  return {
    localStream,
    remoteStream,
    connectionState,
    mediaError,
    isSpeaking,
    hasRemoteVideo,
    remoteAudioMuted,
    audioBlocked,
    isEncrypted,
    resumeAudio,
    pcRef,
    localStreamRef,
  }
}
