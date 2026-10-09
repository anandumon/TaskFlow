'use client'

import React, { useState, useEffect, useRef } from 'react'
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  Phone,
  X,
  Volume2,
  Shield,
  AlertCircle,
  Loader2,
} from 'lucide-react'
import { useCallStore } from '@/stores/call-store'
import { useWorkspaceStore } from '@/stores/workspace-store'

export function PreJoinModal() {
  const {
    isPreJoinOpen,
    preJoinOptions,
    closePreJoin,
    startCallFromPreJoin,
    localAudioMuted,
    localVideoOff,
    toggleAudio,
    toggleVideo,
    errorMessage,
    clearError,
  } = useCallStore()

  const { currentWorkspace } = useWorkspaceStore()
  const videoRef = useRef<HTMLVideoElement>(null)
  const mediaStreamRef = useRef<MediaStream | null>(null)
  const isTransferringStreamRef = useRef(false)
  const isStartingCallRef = useRef(false)
  const [audioLevel, setAudioLevel] = useState(0)
  const [isStarting, setIsStarting] = useState(false)
  const [cameraError, setCameraError] = useState<string | null>(null)

  // Request media preview
  useEffect(() => {
    if (!isPreJoinOpen) {
      if (!isTransferringStreamRef.current && mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach((t) => t.stop())
        mediaStreamRef.current = null
      }
      return
    }

    isTransferringStreamRef.current = false
    let isCancelled = false
    const initPreview = async () => {
      try {
        setCameraError(null)
        const wantsVideo =
          preJoinOptions?.callType !== 'ONE_TO_ONE_VOICE' &&
          preJoinOptions?.callType !== 'GROUP_VOICE' &&
          !localVideoOff

        const stream = await navigator.mediaDevices.getUserMedia({
          video: wantsVideo ? { width: 1280, height: 720 } : false,
          audio: true,
        })

        if (isCancelled) {
          stream.getTracks().forEach((t) => t.stop())
          return
        }

        mediaStreamRef.current = stream

        if (videoRef.current && wantsVideo) {
          videoRef.current.srcObject = stream
        }

        // Live Audio Visualizer Analyzer
        try {
          const AudioCtx = window.AudioContext || (window as any).webkitAudioContext
          const audioCtx = new AudioCtx()
          if (audioCtx.state === 'suspended') {
            audioCtx.resume().catch(() => {})
          }
          const analyser = audioCtx.createAnalyser()
          const source = audioCtx.createMediaStreamSource(stream)
          source.connect(analyser)
          analyser.fftSize = 64
          const dataArray = new Uint8Array(analyser.frequencyBinCount)

          const updateMeter = () => {
            if (isCancelled || !mediaStreamRef.current) return
            analyser.getByteFrequencyData(dataArray)
            let sum = 0
            for (let i = 0; i < dataArray.length; i++) sum += dataArray[i]
            const avg = sum / dataArray.length
            setAudioLevel(Math.min(100, Math.round((avg / 128) * 100)))
            requestAnimationFrame(updateMeter)
          }
          updateMeter()
        } catch {}
      } catch (err: any) {
        console.warn('[PreJoin] Camera/Mic access warning:', err)
        setCameraError('Camera or microphone permissions were denied or unavailable.')
      }
    }

    initPreview()

    return () => {
      isCancelled = true
      if (!isTransferringStreamRef.current && mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach((t) => t.stop())
        mediaStreamRef.current = null
      }
    }
  }, [isPreJoinOpen, preJoinOptions?.callType, localVideoOff])

  if (!isPreJoinOpen || !preJoinOptions) return null

  const handleStart = async () => {
    if (!currentWorkspace?.id || isStarting || isStartingCallRef.current) return
    isStartingCallRef.current = true
    setIsStarting(true)
    clearError()

    try {
      // Unlock browser audio context on user gesture
      try {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext
        const ctx = new AudioCtx()
        await ctx.resume()
        ctx.close().catch(() => {})
      } catch {}

      // Hand over active stream to call store so LiveCallModal reuses it without re-prompting or interruptions
      if (mediaStreamRef.current) {
        isTransferringStreamRef.current = true
        useCallStore.getState().setLocalStream(mediaStreamRef.current)
      }

      const success = await startCallFromPreJoin(currentWorkspace.id)

      if (!success) {
        isTransferringStreamRef.current = false
        useCallStore.getState().setLocalStream(null)
        if (mediaStreamRef.current) {
          mediaStreamRef.current.getTracks().forEach((t) => t.stop())
          mediaStreamRef.current = null
        }
      }
    } finally {
      setIsStarting(false)
      isStartingCallRef.current = false
    }
  }

  const isVoiceOnly =
    preJoinOptions.callType === 'ONE_TO_ONE_VOICE' ||
    preJoinOptions.callType === 'GROUP_VOICE'

  return (
    <div className="fixed inset-0 z-[99990] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-fade-in select-none">
      <div className="bg-[#12131b] border border-white/15 rounded-3xl w-full max-w-xl shadow-2xl overflow-hidden flex flex-col space-y-5 p-6 animate-scale-in">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-white/10">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <Phone className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-tight">
                {preJoinOptions.recipientName
                  ? `Call with ${preJoinOptions.recipientName}`
                  : preJoinOptions.channelName
                  ? `${preJoinOptions.channelName} Call`
                  : 'Start Live Call'}
              </h2>
              <div className="flex items-center gap-1.5 text-xs text-zinc-400">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>
                  {isVoiceOnly ? 'Voice Call' : 'Video Call'} &bull; Ready to connect
                </span>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={closePreJoin}
            className="p-1.5 rounded-xl text-zinc-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Video / Avatar Preview Area */}
        <div className="relative rounded-2xl overflow-hidden bg-black/60 border border-white/10 aspect-video flex items-center justify-center">
          {!isVoiceOnly && !localVideoOff && !cameraError ? (
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover scale-x-[-1]"
            />
          ) : (
            <div className="flex flex-col items-center justify-center space-y-3">
              <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-indigo-500/30 to-purple-500/30 border border-white/20 flex items-center justify-center text-white text-2xl font-bold shadow-xl">
                {(preJoinOptions.recipientName || 'U').charAt(0).toUpperCase()}
              </div>
              <span className="text-xs font-semibold text-zinc-400">
                {isVoiceOnly ? 'Voice Call (Camera Off)' : 'Camera is turned off'}
              </span>
            </div>
          )}

          {/* E2EE Badge Overlay */}
          <div className="absolute top-3 left-3 flex items-center gap-1 px-2.5 py-1 rounded-xl bg-black/70 backdrop-blur-md border border-white/15 text-[11px] font-semibold text-emerald-400">
            <Shield className="w-3 h-3" />
            <span>End-to-End Encrypted</span>
          </div>

          {/* Audio Input Level Meter Bar */}
          <div className="absolute bottom-3 left-3 right-3 flex items-center gap-2 px-3 py-1.5 rounded-xl bg-black/70 backdrop-blur-md border border-white/10">
            <Volume2 className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
            <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full transition-all duration-75"
                style={{ width: `${localAudioMuted ? 0 : audioLevel}%` }}
              />
            </div>
            <span className="text-[10px] text-zinc-400 font-mono">
              {localAudioMuted ? 'Muted' : `${audioLevel}%`}
            </span>
          </div>
        </div>

        {/* Error Notification if any */}
        {(errorMessage || cameraError) && (
          <div className="p-3 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2.5">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            <span className="leading-snug">{errorMessage || cameraError}</span>
          </div>
        )}

        {/* Device Quick Toggles & Join Action */}
        <div className="flex items-center justify-between pt-1">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={toggleAudio}
              className={`p-3 rounded-2xl border text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                localAudioMuted
                  ? 'bg-rose-500/20 text-rose-400 border-rose-500/40'
                  : 'bg-white/10 text-white border-white/15 hover:bg-white/15'
              }`}
              title={localAudioMuted ? 'Unmute Microphone' : 'Mute Microphone'}
            >
              {localAudioMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
            </button>

            {!isVoiceOnly && (
              <button
                type="button"
                onClick={toggleVideo}
                className={`p-3 rounded-2xl border text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                  localVideoOff
                    ? 'bg-rose-500/20 text-rose-400 border-rose-500/40'
                    : 'bg-white/10 text-white border-white/15 hover:bg-white/15'
                }`}
                title={localVideoOff ? 'Turn Camera On' : 'Turn Camera Off'}
              >
                {localVideoOff ? <VideoOff className="w-4 h-4" /> : <Video className="w-4 h-4" />}
              </button>
            )}
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={closePreJoin}
              className="px-4 py-2.5 rounded-xl text-xs font-semibold text-zinc-400 hover:text-white transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={isStarting}
              onClick={handleStart}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-zinc-950 font-bold text-xs shadow-lg shadow-emerald-500/20 flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50"
            >
              {isStarting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-zinc-950" />
                  <span>Connecting...</span>
                </>
              ) : (
                <>
                  <Phone className="w-4 h-4 text-zinc-950 stroke-[2.5]" />
                  <span>Start Call</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
