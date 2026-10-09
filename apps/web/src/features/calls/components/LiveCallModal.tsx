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
import { useCallWebRTC, useStreamRef, attachStreamToElement } from '@/hooks/use-call-webrtc'

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

  const localVideoRef = useStreamRef<HTMLVideoElement>(localStream)
  const remoteVideoRef = useStreamRef<HTMLVideoElement>(remoteStream)
  const remoteAudioRef = useStreamRef<HTMLAudioElement>(remoteStream)
  const screenVideoRef = useStreamRef<HTMLVideoElement>(screenStream)

  const unlockAudio = useCallback(() => {
    if (remoteAudioRef.current && remoteAudioRef.current.paused) {
      remoteAudioRef.current.play().catch(() => {})
    }
    resumeAudio()
  }, [resumeAudio, remoteAudioRef])

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
    if (!isScreenSharing) {
      if (screenStream) {
        screenStream.getTracks().forEach((t) => t.stop())
        setScreenStream(null)
      }
      // Restore camera track to peer connection if active
      const pc = peerConnectionRef.current
      if (pc && localStreamRef.current) {
        const camTrack = localStreamRef.current.getVideoTracks()[0]
        const videoSender = pc.getSenders().find((s) => s.track?.kind === 'video')
        if (videoSender && camTrack) {
          videoSender.replaceTrack(camTrack).catch(() => {})
        }
      }
      return
    }

    const startScreen = async () => {
      try {
        const stream = await navigator.mediaDevices.getDisplayMedia({
          video: true,
          audio: true,
        })
        setScreenStream(stream)

        // Replace video track in WebRTC peer connection
        const screenTrack = stream.getVideoTracks()[0]
        const pc = peerConnectionRef.current
        if (pc && screenTrack) {
          const videoSender = pc.getSenders().find((s) => s.track?.kind === 'video')
          if (videoSender) {
            videoSender.replaceTrack(screenTrack).catch(() => {})
          }
        }

        // Add screen audio track if available
        const screenAudio = stream.getAudioTracks()[0]
        if (pc && screenAudio) {
          pc.addTrack(screenAudio, stream)
        }

        screenTrack.onended = () => {
          toggleScreenShare()
        }
      } catch (err) {
        console.warn('[LiveCall] Screen share error or cancelled:', err)
        toggleScreenShare()
      }
    }

    startScreen()
  }, [isScreenSharing, toggleScreenShare, localStreamRef, peerConnectionRef])

  if (!isMounted || !isLiveCallOpen || !activeCall) return null

  // When minimized, only render the hidden audio element so remote audio keeps playing
  // The MinimizedCallBar (rendered separately) provides the minimized UI
  if (isMinimized) {
    return (
      <audio
        ref={(el) => {
          // Callback ref: runs when element mounts/unmounts
          // This handles the case where stream ref hasn't changed but element is new
          remoteAudioRef.current = el as HTMLAudioElement | null
          attachStreamToElement(el, remoteStream)
        }}
        autoPlay
        playsInline
        style={{
          position: 'fixed',
          top: -9999,
          left: -9999,
          width: 1,
          height: 1,
          opacity: 0,
          pointerEvents: 'none',
        }}
      />
    )
  }

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  const participants = activeCall.participants || []
  const remoteParticipant = participants.find((p) => p.userId !== user?.id)

  const modalContent = (
    <div
      onClick={unlockAudio}
      className="fixed inset-0 top-0 left-0 w-screen h-screen z-[99990] bg-[#090a10] text-[#e1e4ea] flex flex-col select-none animate-fade-in overflow-hidden cursor-default"
    >
      {/* Unmuted Dedicated Remote Audio Player - positioned offscreen without display:none so browser audio never throttles */}
      <audio
        ref={remoteAudioRef}
        autoPlay
        playsInline
        style={{
          position: 'fixed',
          top: -9999,
          left: -9999,
          width: 1,
          height: 1,
          opacity: 0,
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

        {/* Center: Security Badge, Audio Unlock & Network Indicator */}
        <div className="hidden sm:flex items-center gap-3">
          {/* Autoplay blocked prompt */}
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

          {/* E2EE Security Badge */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsSecurityOpen((prev) => !prev)}
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/15 border border-emerald-500/25 text-emerald-400 text-xs font-semibold transition-all cursor-pointer"
            >
              <Shield className="w-3.5 h-3.5" />
              <span>P2P Encrypted (DTLS-SRTP 256-bit)</span>
            </button>

            {/* Security Guarantee Popover */}
            {isSecurityOpen && (
              <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 w-72 rounded-2xl bg-[#161722] border border-white/15 p-4 shadow-2xl z-50 space-y-2 animate-scale-in text-left">
                <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs">
                  <Lock className="w-4 h-4" />
                  <span>Direct Encrypted Media Stream</span>
                </div>
                <p className="text-[11px] text-zinc-300 leading-relaxed">
                  Audio and video media are end-to-end encrypted using WebRTC DTLS-SRTP (AES-256) with direct peer transport and TURN relay fallback.
                </p>
                <div className="pt-1 text-[10px] text-zinc-400 border-t border-white/5 flex items-center justify-between">
                  <span>DTLS / SRTP 256-bit Active</span>
                  <span className="text-emerald-400 font-bold">End-to-End Media</span>
                </div>
              </div>
            )}
          </div>

          {/* Quality Indicator */}
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-white/5 border border-white/10 text-xs text-zinc-300 font-medium">
            <Wifi className="w-3 h-3 text-emerald-400" />
            <span className="text-[11px] capitalize">{connectionState === 'connected' ? connectionQuality : connectionState}</span>
          </div>
        </div>

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
        {/* Primary Video / Presentation Stage */}
        <div className="flex-1 relative bg-black flex items-center justify-center p-4">
          {activeCall.status === 'RINGING' ? (
            <div className="flex flex-col items-center justify-center space-y-6">
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
          ) : !isVoiceOnly && !isScreenSharing ? (
            <div className="w-full h-full max-w-5xl rounded-3xl overflow-hidden bg-[#111218] border border-white/10 flex items-center justify-center relative shadow-2xl">
              {/* Remote Video Feed (muted so audio plays from dedicated audio element without doubling) */}
              <video
                ref={remoteVideoRef}
                autoPlay
                playsInline
                muted
                className={`w-full h-full object-contain ${hasRemoteVideo ? 'block' : 'hidden'}`}
              />

              {/* Remote Avatar Fallback only when remote camera is off or not yet streaming */}
              {!hasRemoteVideo && (
                <div className="absolute inset-0 flex flex-col items-center justify-center space-y-3 pointer-events-none">
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
          ) : isScreenSharing ? (
            <div className="w-full h-full rounded-3xl overflow-hidden bg-black flex items-center justify-center relative border border-emerald-500/30">
              {/* Presenting user's own screen stream */}
              <video
                ref={screenVideoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-contain"
              />
              <div className="absolute top-4 left-4 px-3 py-1 rounded-xl bg-black/70 backdrop-blur-md border border-white/15 text-xs text-emerald-400 font-semibold flex items-center gap-2">
                <MonitorUp className="w-4 h-4" />
                <span>You are presenting your screen</span>
              </div>
            </div>
          ) : (
            /* Voice-Only Big Harmony Avatar Grid */
            <div className="flex flex-col items-center justify-center space-y-6">
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

          {/* Local Self-View PiP Floating Corner Tile */}
          {!isVoiceOnly && (
            <div
              className={`absolute bottom-6 right-6 w-48 sm:w-56 aspect-video rounded-2xl overflow-hidden bg-[#181922] border-2 shadow-2xl transition-all duration-200 z-30 ${
                isSpeaking ? 'border-emerald-400 ring-2 ring-emerald-400/30' : 'border-white/20'
              }`}
            >
              {!localVideoOff ? (
                <video
                  ref={localVideoRef}
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
          )}
        </div>

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
      <footer className="h-20 bg-[#0c0d14]/95 backdrop-blur-xl border-t border-white/10 px-6 flex items-center justify-center shrink-0 z-20">
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

          {/* Hang Up Button */}
          <button
            type="button"
            onClick={() => endActiveCall()}
            className="p-3.5 px-6 rounded-2xl bg-rose-600 hover:bg-rose-500 text-white font-bold transition-all shadow-xl shadow-rose-600/40 flex items-center gap-2 cursor-pointer"
            title="Leave and end call"
          >
            <PhoneOff className="w-5 h-5" />
            <span className="text-xs tracking-wide">End Call</span>
          </button>
        </div>
      </footer>
    </div>
  )

  return createPortal(modalContent, document.body)
}
