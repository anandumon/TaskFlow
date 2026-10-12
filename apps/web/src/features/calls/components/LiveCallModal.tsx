'use client'

import React, { useState, useEffect, useRef, useCallback } from 'react'
import { createPortal } from 'react-dom'
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  PhoneOff,
  Minimize2,
  Users,
  Shield,
  Wifi,
  MonitorUp,
  Volume2,
  Lock,
  AlertTriangle,
} from 'lucide-react'
import { useCallStore } from '@/stores/call-store'
import { useAuthStore } from '@/stores/auth-store'
import {
  useCallWebRTC,
  useStreamRef,
  attachStreamToElement,
  getVideoSender,
  getAudioSender,
} from '@/hooks/use-call-webrtc'

const TERMINAL = ['ENDED', 'CANCELLED', 'DECLINED', 'MISSED', 'EXPIRED']

export function LiveCallModal() {
  const {
    activeCall,
    isLiveCallOpen,
    isMinimized,
    toggleMinimize,
    endActiveCall,
    localAudioMuted,
    localVideoOff,
    isScreenSharing,
    toggleAudio,
    toggleVideo,
    toggleScreenShare,
    connectionQuality,
  } = useCallStore()

  const { user } = useAuthStore()
  const [isMounted, setIsMounted] = useState(false)
  const [callDuration, setCallDuration] = useState(0)
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [isSecurityOpen, setIsSecurityOpen] = useState(false)
  const [screenStream, setScreenStream] = useState<MediaStream | null>(null)

  useEffect(() => {
    setIsMounted(true)
  }, [])

  const isVoiceOnly =
    activeCall?.callType === 'ONE_TO_ONE_VOICE' ||
    activeCall?.callType === 'GROUP_VOICE'

  const authHeaders = useCallback((): Record<string, string> => {
    const t =
      typeof window !== 'undefined'
        ? localStorage.getItem('accessToken') ||
          localStorage.getItem('token') ||
          localStorage.getItem('taskflow_token')
        : null
    return t ? { Authorization: `Bearer ${t}` } : {}
  }, [])

  const {
    localStream,
    remoteStream,
    connectionState,
    mediaError,
    isSpeaking,
    hasRemoteVideo,
    audioBlocked,
    isEncrypted,
    resumeAudio,
    pcRef: peerConnectionRef,
    localStreamRef,
  } = useCallWebRTC({
    enabled: isLiveCallOpen && !!activeCall && !TERMINAL.includes(activeCall.status),
    callId: activeCall?.id,
    workspaceId: activeCall?.workspaceId,
    status: activeCall?.status,
    createdBy: activeCall?.createdBy,
    userId: user?.id,
    wantVideo: !isVoiceOnly,
    audioMuted: localAudioMuted,
    videoOff: localVideoOff,
    authHeaders,
  })

  const [remoteVideoPlaying, setRemoteVideoPlaying] = useState(false)
  const screenStreamRef = useRef<MediaStream | null>(null)
  const wasScreenSharingRef = useRef(false)

  // Stop screen stream tracks on unmount if active
  useEffect(() => {
    return () => {
      if (screenStreamRef.current) {
        screenStreamRef.current.getTracks().forEach((t) => t.stop())
        screenStreamRef.current = null
      }
    }
  }, [])

  const localVideoRef = useRef<HTMLVideoElement | null>(null)
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null)
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null)
  const screenVideoRef = useRef<HTMLVideoElement | null>(null)

  // Continuously attach media streams to elements
  useEffect(() => {
    if (remoteVideoRef.current) {
      attachStreamToElement(remoteVideoRef.current, remoteStream)
    }
    if (remoteAudioRef.current) {
      attachStreamToElement(remoteAudioRef.current, remoteStream)
    }
  }, [remoteStream, isScreenSharing, isMinimized])

  useEffect(() => {
    if (localVideoRef.current) {
      attachStreamToElement(localVideoRef.current, localStream)
    }
  }, [localStream, isScreenSharing, isMinimized])

  useEffect(() => {
    if (screenVideoRef.current && screenStream) {
      attachStreamToElement(screenVideoRef.current, screenStream)
    }
  }, [screenStream, isScreenSharing])

  // Continuous playback watchdog: re-verifies playback on restore, focus, tab switch, or back navigation ("goback")
  useEffect(() => {
    const resumeAllMedia = () => {
      if (remoteAudioRef.current) {
        attachStreamToElement(remoteAudioRef.current, remoteStream)
        if (remoteAudioRef.current.paused) remoteAudioRef.current.play().catch(() => {})
      }
      if (!isMinimized && remoteVideoRef.current) {
        attachStreamToElement(remoteVideoRef.current, remoteStream)
        if (remoteVideoRef.current.paused) remoteVideoRef.current.play().catch(() => {})
      }
      if (localVideoRef.current) {
        attachStreamToElement(localVideoRef.current, localStream)
        if (localVideoRef.current.paused) localVideoRef.current.play().catch(() => {})
      }
      if (screenVideoRef.current && screenStream) {
        attachStreamToElement(screenVideoRef.current, screenStream)
        if (screenVideoRef.current.paused) screenVideoRef.current.play().catch(() => {})
      }
      resumeAudio()
    }

    resumeAllMedia()

    document.addEventListener('visibilitychange', resumeAllMedia)
    window.addEventListener('focus', resumeAllMedia)
    window.addEventListener('popstate', resumeAllMedia)
    return () => {
      document.removeEventListener('visibilitychange', resumeAllMedia)
      window.removeEventListener('focus', resumeAllMedia)
      window.removeEventListener('popstate', resumeAllMedia)
    }
  }, [isMinimized, remoteStream, localStream, screenStream, resumeAudio, isScreenSharing])

  const unlockAudio = useCallback(() => {
    if (remoteAudioRef.current && remoteAudioRef.current.paused) {
      remoteAudioRef.current.play().catch(() => {})
    }
    if (remoteVideoRef.current && remoteVideoRef.current.paused) {
      remoteVideoRef.current.play().catch(() => {})
    }
    resumeAudio()
  }, [resumeAudio])

  // 45s ringing timer for caller: auto-cancels if not answered
  useEffect(() => {
    if (activeCall?.status === 'RINGING' && activeCall?.createdBy === user?.id) {
      const timer = setTimeout(() => {
        endActiveCall()
      }, 45000)
      return () => clearTimeout(timer)
    }
  }, [activeCall?.status, activeCall?.createdBy, user?.id, endActiveCall])

  // Call duration counter (only runs when activeCall.status === 'ACTIVE')
  useEffect(() => {
    if (!activeCall || !isLiveCallOpen || activeCall.status !== 'ACTIVE') {
      setCallDuration(0)
      return
    }

    const interval = setInterval(() => {
      setCallDuration((prev) => prev + 1)
    }, 1000)

    return () => clearInterval(interval)
  }, [activeCall?.status, isLiveCallOpen])

  // Screen share handler with WebRTC sender replacement
  useEffect(() => {
    if (!isLiveCallOpen || !activeCall || activeCall.status !== 'ACTIVE') {
      return
    }

    if (!isScreenSharing) {
      // Only restore camera if screen sharing was actually active
      if (!wasScreenSharingRef.current && !screenStreamRef.current && !screenStream) {
        return
      }
      wasScreenSharingRef.current = false

      const pc = peerConnectionRef.current
      const currentScreen = screenStreamRef.current || screenStream

      const restoreCamera = async () => {
        let camTrack = localStreamRef.current?.getVideoTracks().find((t) => t.readyState === 'live')

        // If local camera track was lost, re-acquire if not intentionally muted
        if (!camTrack && !localVideoOff && !isVoiceOnly) {
          try {
            const camStream = await navigator.mediaDevices.getUserMedia({
              video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' },
              audio: false,
            })
            const freshTrack = camStream.getVideoTracks()[0]
            if (freshTrack) {
              camTrack = freshTrack
              if (localStreamRef.current) {
                localStreamRef.current.getVideoTracks().forEach((t) => {
                  t.stop()
                  localStreamRef.current?.removeTrack(t)
                })
                localStreamRef.current.addTrack(freshTrack)
              }
            }
          } catch (e) {
            console.warn('[LiveCallModal] Re-acquire camera track warning:', e)
          }
        }

        if (pc) {
          const videoSender = getVideoSender(pc)
          if (videoSender) {
            if (camTrack) camTrack.enabled = !localVideoOff
            await videoSender.replaceTrack(camTrack || null).catch((err) => {
              console.warn('[LiveCallModal] replaceTrack camera error:', err)
            })
          }

          // Verify and ensure mic audio sender is 100% active and connected
          const audioSender = getAudioSender(pc)
          const micTrack = localStreamRef.current?.getAudioTracks().find((t) => t.readyState === 'live')
          if (audioSender && micTrack) {
            micTrack.enabled = !localAudioMuted
            if (audioSender.track !== micTrack) {
              await audioSender.replaceTrack(micTrack).catch((err) => {
                console.warn('[LiveCallModal] replaceTrack audio verification error:', err)
              })
            }
          }
        }

        // Clean up screen stream tracks AFTER replacing track on peer connection
        if (currentScreen) {
          currentScreen.getTracks().forEach((t) => t.stop())
        }
        screenStreamRef.current = null
        setScreenStream(null)

        if (localStreamRef.current) {
          useCallStore.getState().setLocalStream(localStreamRef.current)
        }

        // Ensure local & remote elements resume playback smoothly
        if (localVideoRef.current && localStreamRef.current) {
          attachStreamToElement(localVideoRef.current, localStreamRef.current)
        }
        if (remoteAudioRef.current && remoteStream) {
          attachStreamToElement(remoteAudioRef.current, remoteStream)
        }
        if (remoteVideoRef.current && remoteStream) {
          attachStreamToElement(remoteVideoRef.current, remoteStream)
        }
        resumeAudio()
      }

      restoreCamera()
      return
    }

    const startScreen = async () => {
      try {
        wasScreenSharingRef.current = true
        const stream = await navigator.mediaDevices.getDisplayMedia({
          video: true,
          audio: false, // Keep mic audio 100% steady on mic sender
        })
        screenStreamRef.current = stream
        setScreenStream(stream)

        const screenTrack = stream.getVideoTracks()[0]
        const pc = peerConnectionRef.current
        if (pc && screenTrack) {
          const videoSender = getVideoSender(pc)
          if (videoSender) {
            await videoSender.replaceTrack(screenTrack).catch((err) => {
              console.warn('[LiveCallModal] replaceTrack screen error:', err)
            })
          }
        }

        screenTrack.onended = () => {
          if (useCallStore.getState().isScreenSharing) {
            toggleScreenShare()
          }
        }
      } catch (err) {
        console.warn('[LiveCallModal] Screen share cancelled or error:', err)
        if (useCallStore.getState().isScreenSharing) {
          toggleScreenShare()
        }
      }
    }

    startScreen()
  }, [isScreenSharing, toggleScreenShare, localStreamRef, peerConnectionRef, localVideoOff, isVoiceOnly, isLiveCallOpen, activeCall?.status, localAudioMuted, remoteStream, resumeAudio])

  if (!isMounted || !isLiveCallOpen || !activeCall) return null

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  const participants = activeCall.participants || []
  const remoteParticipant = participants.find((p) => p.userId !== user?.id)
  const isRemoteMuted = remoteParticipant?.isMuted ?? false
  const isHost = activeCall.createdBy === user?.id
  const isGroupCall =
    activeCall.callType === 'GROUP_VOICE' ||
    activeCall.callType === 'GROUP_VIDEO' ||
    activeCall.callType === 'CHANNEL_CALL'

  const modalContent = (
    <div
      onClick={unlockAudio}
      className={
        isMinimized
          ? 'fixed bottom-0 right-0 w-1 h-1 opacity-0 pointer-events-none overflow-hidden select-none z-[99990]'
          : 'fixed inset-0 top-0 left-0 w-screen h-screen z-[99990] bg-[#090a10] text-[#e1e4ea] flex flex-col select-none animate-fade-in overflow-hidden cursor-default'
      }
    >
      {/* Unmuted Dedicated Remote Audio Player - positioned at viewport bottom so browser never throttles voice */}
      <audio
        ref={(el) => {
          remoteAudioRef.current = el
          attachStreamToElement(el, remoteStream)
        }}
        autoPlay
        playsInline
        style={{
          position: 'fixed',
          bottom: 0,
          right: 0,
          width: 1,
          height: 1,
          opacity: 0.01,
          pointerEvents: 'none',
        }}
      />

      {/* Media Error Notification Banner */}
      {mediaError && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 px-4 py-2 rounded-xl bg-amber-500/90 text-zinc-950 text-xs font-semibold backdrop-blur-md shadow-xl z-50 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{mediaError}</span>
        </div>
      )}

      {/* ── TOP HEADER BAR ── */}
      <header className="h-16 px-6 bg-[#0f1018]/90 backdrop-blur-md border-b border-white/10 flex items-center justify-between shrink-0 z-20">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm font-bold text-white tracking-tight">
                {remoteParticipant?.name || activeCall.createdByName || 'Live Call'}
              </h1>
              {activeCall.status === 'RINGING' ? (
                <span className="px-2 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-400 text-[11px] font-semibold animate-pulse">
                  Ringing...
                </span>
              ) : (
                <span className="text-xs text-zinc-400 font-mono">
                  {formatDuration(callDuration)}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 text-[11px] text-zinc-400">
              <span className="capitalize">{activeCall.callType.replace(/_/g, ' ').toLowerCase()}</span>
              <span>&bull;</span>
              <span>{participants.length || 2} participants</span>
            </div>
          </div>
        </div>

        {/* Center: Audio Unlock if blocked */}
        {audioBlocked && (
          <button
            type="button"
            onClick={unlockAudio}
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 text-xs font-bold transition-all shadow-lg shadow-amber-500/20 cursor-pointer animate-pulse"
          >
            <Volume2 className="w-3.5 h-3.5" />
            <span>Tap to enable audio</span>
          </button>
        )}

        {/* Right Actions: Minimize & Fullscreen */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={toggleMinimize}
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white transition-colors cursor-pointer"
            title="Minimize to Floating Card (bottom-right)"
          >
            <Minimize2 className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={() => setIsSidebarOpen((prev) => !prev)}
            className={`p-2 rounded-xl transition-colors cursor-pointer ${
              isSidebarOpen
                ? 'bg-primary/20 text-primary border border-primary/30'
                : 'bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white'
            }`}
            title="Toggle Participants Panel"
          >
            <Users className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* ── MAIN CONTENT AREA ── */}
      <div className="flex-1 min-h-0 flex overflow-hidden relative">
        {activeCall.status === 'RINGING' ? (
          <div className="flex-1 bg-black flex flex-col items-center justify-center space-y-6 p-4">
            <div className="relative">
              <div className="w-32 h-32 rounded-full bg-gradient-to-tr from-emerald-500/30 to-teal-500/30 border-2 border-emerald-400/40 flex items-center justify-center text-white text-5xl font-extrabold shadow-2xl">
                {(remoteParticipant?.name || 'U').charAt(0).toUpperCase()}
              </div>
              <span className="absolute -inset-3 rounded-full border-2 border-emerald-400/50 animate-ping pointer-events-none" />
              <span className="absolute -inset-6 rounded-full border border-emerald-400/20 animate-pulse pointer-events-none" />
            </div>
            <div className="text-center space-y-2">
              <h3 className="text-xl font-extrabold text-white">
                Calling {remoteParticipant?.name || 'User'}...
              </h3>
              <p className="text-xs text-emerald-400 flex items-center justify-center gap-2 font-medium">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                Ringing &bull; Waiting for recipient to answer
              </p>
            </div>
          </div>
        ) : isScreenSharing ? (
          /* ── GOOGLE MEET STYLE PRESENTATION LAYOUT ── */
          <div className="flex-1 h-full min-h-0 flex flex-col lg:flex-row overflow-hidden relative bg-[#090a10]">
            {/* 1. Main Central Screen Presentation Stage */}
            <div className="flex-1 h-full min-w-0 flex flex-col items-center justify-center p-3 sm:p-4 relative">
              <div className="w-full h-full rounded-2xl sm:rounded-3xl overflow-hidden bg-black flex items-center justify-center relative border border-emerald-500/40 shadow-2xl">
                <video
                  ref={(el) => {
                    screenVideoRef.current = el
                    attachStreamToElement(el, screenStream)
                  }}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-contain"
                />
                {/* Google Meet Style Top Banner Pill */}
                <div className="absolute top-4 left-4 flex items-center gap-2.5 px-3.5 py-1.5 rounded-xl bg-black/85 backdrop-blur-md border border-emerald-500/30 text-xs font-semibold text-white shadow-xl z-20">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                  <MonitorUp className="w-4 h-4 text-emerald-400" />
                  <span>You are presenting your screen</span>
                  <button
                    type="button"
                    onClick={toggleScreenShare}
                    className="ml-2 px-2.5 py-1 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-[11px] font-bold transition-all cursor-pointer shadow-sm active:scale-95"
                  >
                    Stop presenting
                  </button>
                </div>
              </div>
            </div>

            {/* 2. Side Participant Cards Rail (Google Meet layout) */}
            <div className="w-full lg:w-72 xl:w-80 h-auto lg:h-full shrink-0 flex flex-row lg:flex-col gap-3 p-3 lg:pl-0 overflow-x-auto lg:overflow-y-auto z-10 bg-[#0c0d14]/70 backdrop-blur-md border-t lg:border-t-0 lg:border-l border-white/10">
              {/* Remote Participant Card */}
              <div
                className={`relative w-48 sm:w-56 lg:w-full aspect-video rounded-2xl overflow-hidden bg-[#13141f] border-2 shadow-xl transition-all duration-200 shrink-0 ${
                  !isRemoteMuted ? 'border-emerald-400/80 ring-2 ring-emerald-400/20' : 'border-white/15'
                }`}
              >
                <video
                  ref={(el) => {
                    remoteVideoRef.current = el
                    attachStreamToElement(el, remoteStream)
                  }}
                  autoPlay
                  playsInline
                  muted
                  onPlay={() => setRemoteVideoPlaying(true)}
                  onPlaying={() => setRemoteVideoPlaying(true)}
                  onLoadedMetadata={() => setRemoteVideoPlaying(true)}
                  className="w-full h-full object-cover"
                />
                {/* Fallback avatar if remote video off */}
                {(!hasRemoteVideo || !remoteVideoPlaying) && (
                  <div className="absolute inset-0 bg-[#13141f] flex flex-col items-center justify-center space-y-2 pointer-events-none">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-emerald-500/30 to-teal-500/30 border border-emerald-400/40 flex items-center justify-center text-white text-lg font-bold shadow-lg">
                      {(remoteParticipant?.name || activeCall.createdByName || 'U').charAt(0).toUpperCase()}
                    </div>
                    <span className="text-[11px] font-semibold text-zinc-300 truncate max-w-[140px]">
                      {remoteParticipant?.name || activeCall.createdByName || 'Participant'}
                    </span>
                  </div>
                )}
                {/* Bottom Name & Mic Pill */}
                <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between text-[11px] text-white px-2.5 py-1 rounded-xl bg-black/75 backdrop-blur-md border border-white/10">
                  <span className="truncate font-semibold text-zinc-200">
                    {remoteParticipant?.name || activeCall.createdByName || 'Participant'}
                  </span>
                  {isRemoteMuted ? (
                    <MicOff className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                  ) : (
                    <Mic className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  )}
                </div>
              </div>

              {/* Local Participant Card (You) */}
              <div
                className={`relative w-48 sm:w-56 lg:w-full aspect-video rounded-2xl overflow-hidden bg-[#13141f] border-2 shadow-xl transition-all duration-200 shrink-0 ${
                  isSpeaking ? 'border-emerald-400 ring-2 ring-emerald-400/30' : 'border-white/15'
                }`}
              >
                {!localVideoOff ? (
                  <video
                    ref={(el) => {
                      localVideoRef.current = el
                      attachStreamToElement(el, localStream)
                    }}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover scale-x-[-1]"
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center space-y-2 bg-[#13141f]">
                    <div className="w-12 h-12 rounded-full bg-white/10 border border-white/15 flex items-center justify-center text-white font-bold text-lg">
                      {(user?.displayName || user?.firstName || 'Y').charAt(0).toUpperCase()}
                    </div>
                    <span className="text-[11px] text-zinc-400 font-medium">Camera Off</span>
                  </div>
                )}
                {/* Bottom Name & Mic Pill */}
                <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between text-[11px] text-white px-2.5 py-1 rounded-xl bg-black/75 backdrop-blur-md border border-white/10">
                  <span className="truncate font-semibold text-zinc-200">You</span>
                  {localAudioMuted ? (
                    <MicOff className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                  ) : (
                    <Mic className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  )}
                </div>
              </div>
            </div>
          </div>
        ) : !isVoiceOnly ? (
          /* Standard Video Call Layout (Non-presenting) */
          <div className="flex-1 relative bg-black flex items-center justify-center p-4">
            <div className="w-full h-full max-w-5xl rounded-3xl overflow-hidden bg-[#111218] border border-white/10 flex items-center justify-center relative shadow-2xl">
              <video
                ref={(el) => {
                  remoteVideoRef.current = el
                  attachStreamToElement(el, remoteStream)
                }}
                autoPlay
                playsInline
                muted
                onPlay={() => setRemoteVideoPlaying(true)}
                onPlaying={() => setRemoteVideoPlaying(true)}
                onLoadedMetadata={() => setRemoteVideoPlaying(true)}
                className="w-full h-full object-contain"
              />

              {/* Remote Avatar Fallback only when remote camera is off or not yet streaming */}
              {(!hasRemoteVideo || !remoteVideoPlaying) && (
                <div className="absolute inset-0 bg-[#111218] flex flex-col items-center justify-center space-y-3 pointer-events-none">
                  <div className="w-28 h-28 rounded-full bg-gradient-to-tr from-emerald-500/20 to-teal-500/20 border-2 border-emerald-400/30 flex items-center justify-center text-white text-4xl font-extrabold shadow-2xl">
                    {(remoteParticipant?.name || activeCall.createdByName || 'U').charAt(0).toUpperCase()}
                  </div>
                  <div className="flex items-center gap-2 px-3 py-1 rounded-xl bg-black/60 backdrop-blur-md border border-white/10 text-xs font-semibold text-white">
                    <span>{remoteParticipant?.name || activeCall.createdByName || 'Participant'}</span>
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  </div>
                </div>
              )}
            </div>

            {/* Local Self-View PiP Floating Corner Tile */}
            <div
              className={`absolute bottom-6 right-6 w-48 sm:w-56 aspect-video rounded-2xl overflow-hidden bg-[#181922] border-2 shadow-2xl transition-all duration-200 z-30 ${
                isSpeaking ? 'border-emerald-400 ring-2 ring-emerald-400/30' : 'border-white/20'
              }`}
            >
              {!localVideoOff ? (
                <video
                  ref={(el) => {
                    localVideoRef.current = el
                    attachStreamToElement(el, localStream)
                  }}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover scale-x-[-1]"
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center space-y-1 bg-black/80">
                  <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white font-bold text-xs">
                    {(user?.displayName || user?.firstName || 'Y').charAt(0).toUpperCase()}
                  </div>
                  <span className="text-[10px] text-zinc-400 font-medium">Camera Off</span>
                </div>
              )}

              {/* Self Label & Mute Badge */}
              <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between text-[10px] text-white px-2 py-0.5 rounded-lg bg-black/60 backdrop-blur-md">
                <span className="truncate">You</span>
                {localAudioMuted && <MicOff className="w-3 h-3 text-rose-400" />}
              </div>
            </div>
          </div>
        ) : (
          /* Voice-Only Big Harmony Avatar Grid */
          <div className="flex-1 bg-black flex flex-col items-center justify-center space-y-6 p-4">
            <div className="relative">
              <div className="w-32 h-32 rounded-full bg-gradient-to-tr from-indigo-500/30 to-purple-500/30 border-2 border-indigo-400/40 flex items-center justify-center text-white text-5xl font-bold shadow-2xl">
                {(remoteParticipant?.name || 'M').charAt(0).toUpperCase()}
              </div>
              <span className="absolute -inset-2 rounded-full border border-indigo-400/30 animate-ping pointer-events-none" />
            </div>
            <div className="text-center space-y-1">
              <h3 className="text-lg font-bold text-white">
                {remoteParticipant?.name || activeCall.createdByName || 'Member'}
              </h3>
              <p className="text-xs text-zinc-400">Live P2P Voice Connected &bull; Audio Active</p>
            </div>
          </div>
        )}

        {/* Slide-Over Participants Sidebar */}
        {isSidebarOpen && (
          <aside className="w-72 bg-[#0f1018] border-l border-white/10 flex flex-col z-20 shrink-0 animate-slide-left">
            <div className="p-4 border-b border-white/10 flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                In This Call ({participants.length || 2})
              </h3>
            </div>
            <div className="p-3 space-y-2 overflow-y-auto flex-1">
              {participants.map((p) => (
                <div
                  key={p.userId}
                  className="p-2.5 rounded-xl bg-white/5 border border-white/5 flex items-center gap-3"
                >
                  <div className="w-8 h-8 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center text-xs font-bold text-white">
                    {p.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-semibold text-white truncate">
                      {p.name} {p.userId === user?.id && '(You)'}
                    </div>
                    <div className="text-[10px] text-zinc-400 capitalize">
                      {p.role.toLowerCase()} &bull; {p.status.toLowerCase()}
                    </div>
                  </div>
                  {p.userId === user?.id && localAudioMuted && (
                    <MicOff className="w-3.5 h-3.5 text-rose-400" />
                  )}
                </div>
              ))}
            </div>
          </aside>
        )}
      </div>

      {/* ── BOTTOM CONTROL TOOLBAR ── */}
      <footer className="h-20 bg-[#0c0d14]/95 backdrop-blur-xl border-t border-white/10 px-6 flex items-center justify-between shrink-0 z-20">
        {/* Left: Connection & Encryption Status Indicator */}
        <div className="flex items-center gap-2 min-w-[140px] sm:min-w-[200px]">
          {connectionState === 'connected' ? (
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <Shield className="w-3.5 h-3.5 text-emerald-400" />
              <span>E2EE &bull; {connectionQuality}</span>
            </div>
          ) : connectionState === 'connecting' ? (
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-semibold">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
              <span>Connecting...</span>
            </div>
          ) : connectionState === 'failed' ? (
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-semibold">
              <span className="w-2 h-2 rounded-full bg-rose-400" />
              <span>Reconnecting...</span>
            </div>
          ) : (
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-zinc-400 text-xs font-medium">
              <span className="w-2 h-2 rounded-full bg-zinc-400" />
              <span className="capitalize">{connectionState}</span>
            </div>
          )}
        </div>

        {/* Center: Main Call Action Controls */}
        <div className="flex items-center gap-3 sm:gap-4">
          {/* Mute Microphone Button */}
          <button
            type="button"
            onClick={toggleAudio}
            className={`p-3.5 rounded-2xl transition-all shadow-lg cursor-pointer ${
              localAudioMuted
                ? 'bg-rose-600 hover:bg-rose-500 text-white shadow-rose-600/30'
                : 'bg-white/10 hover:bg-white/20 text-white'
            }`}
            title={localAudioMuted ? 'Unmute microphone' : 'Mute microphone'}
          >
            {localAudioMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
          </button>

          {/* Video Camera Toggle */}
          {!isVoiceOnly && (
            <button
              type="button"
              onClick={toggleVideo}
              className={`p-3.5 rounded-2xl transition-all shadow-lg cursor-pointer ${
                localVideoOff
                  ? 'bg-rose-600 hover:bg-rose-500 text-white shadow-rose-600/30'
                  : 'bg-white/10 hover:bg-white/20 text-white'
              }`}
              title={localVideoOff ? 'Turn camera on' : 'Turn camera off'}
            >
              {localVideoOff ? <VideoOff className="w-5 h-5" /> : <Video className="w-5 h-5" />}
            </button>
          )}

          {/* Screen Share Button */}
          {!isVoiceOnly && (
            <button
              type="button"
              onClick={toggleScreenShare}
              className={`p-3.5 rounded-2xl transition-all shadow-lg cursor-pointer ${
                isScreenSharing
                  ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/30'
                  : 'bg-white/10 hover:bg-white/20 text-white'
              }`}
              title={isScreenSharing ? 'Stop presenting' : 'Share your screen'}
            >
              <MonitorUp className="w-5 h-5" />
            </button>
          )}

          {/* Hang Up / Leave Button */}
          <button
            type="button"
            onClick={() => endActiveCall()}
            className="p-3.5 px-5 sm:px-6 rounded-2xl bg-rose-600 hover:bg-rose-500 text-white font-bold transition-all shadow-xl shadow-rose-600/40 flex items-center gap-2 cursor-pointer active:scale-95"
            title={isGroupCall && !isHost ? 'Leave group call' : 'End call for everyone'}
          >
            <PhoneOff className="w-5 h-5" />
            <span className="text-xs tracking-wide">
              {isGroupCall && !isHost ? 'Leave Call' : 'End Call'}
            </span>
          </button>
        </div>

        {/* Right: Duration Pill */}
        <div className="hidden sm:flex items-center justify-end min-w-[140px] sm:min-w-[200px]">
          <span className="text-xs font-mono text-zinc-400 px-3 py-1 rounded-xl bg-white/5 border border-white/5">
            {formatDuration(callDuration)}
          </span>
        </div>
      </footer>
    </div>
  )

  return createPortal(modalContent, document.body)
}
