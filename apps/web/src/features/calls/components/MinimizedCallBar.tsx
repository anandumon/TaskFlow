'use client'

import React, { useState, useEffect } from 'react'
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  PhoneOff,
  Maximize2,
  Shield,
} from 'lucide-react'
import { useCallStore } from '@/stores/call-store'

export function MinimizedCallBar() {
  const {
    activeCall,
    isMinimized,
    toggleMinimize,
    endActiveCall,
    localAudioMuted,
    localVideoOff,
    toggleAudio,
    toggleVideo,
  } = useCallStore()

  const [callDuration, setCallDuration] = useState(0)

  useEffect(() => {
    if (!activeCall) {
      setCallDuration(0)
      return
    }

    const interval = setInterval(() => {
      setCallDuration((prev) => prev + 1)
    }, 1000)

    return () => clearInterval(interval)
  }, [activeCall])

  if (!activeCall || !isMinimized) return null

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  return (
    <div className="fixed bottom-6 right-6 z-[99992] flex items-center gap-3 p-3 px-4 rounded-2xl bg-[#14151e]/95 backdrop-blur-xl border border-white/20 shadow-2xl shadow-black/60 animate-scale-in select-none">
      {/* Call Details & Pulse Dot */}
      <div className="flex items-center gap-2.5 pr-2 border-r border-white/10">
        <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
        <div className="space-y-0.5">
          <p className="text-xs font-bold text-white tracking-tight truncate max-w-[140px]">
            {activeCall.createdByName || 'Live Call'}
          </p>
          <div className="flex items-center gap-1.5 text-[10px] text-zinc-400 font-mono">
            <span>{formatDuration(callDuration)}</span>
            <span>&bull;</span>
            <span className="text-emerald-400 flex items-center gap-0.5">
              <Shield className="w-2.5 h-2.5" /> E2EE
            </span>
          </div>
        </div>
      </div>

      {/* Quick Controls */}
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={toggleAudio}
          className={`p-2 rounded-xl transition-all cursor-pointer ${
            localAudioMuted
              ? 'bg-rose-500/20 text-rose-400 hover:bg-rose-500/30'
              : 'bg-white/10 text-white hover:bg-white/15'
          }`}
          title={localAudioMuted ? 'Unmute' : 'Mute'}
        >
          {localAudioMuted ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
        </button>

        <button
          type="button"
          onClick={toggleVideo}
          className={`p-2 rounded-xl transition-all cursor-pointer ${
            localVideoOff
              ? 'bg-rose-500/20 text-rose-400 hover:bg-rose-500/30'
              : 'bg-white/10 text-white hover:bg-white/15'
          }`}
          title={localVideoOff ? 'Turn Video On' : 'Turn Video Off'}
        >
          {localVideoOff ? <VideoOff className="w-3.5 h-3.5" /> : <Video className="w-3.5 h-3.5" />}
        </button>

        <button
          type="button"
          onClick={toggleMinimize}
          className="p-2 rounded-xl bg-white/10 hover:bg-white/15 text-white transition-all cursor-pointer"
          title="Expand Call"
        >
          <Maximize2 className="w-3.5 h-3.5" />
        </button>

        <button
          type="button"
          onClick={endActiveCall}
          className="p-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white transition-all shadow-md shadow-rose-600/30 cursor-pointer ml-1"
          title="End Call"
        >
          <PhoneOff className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  )
}
