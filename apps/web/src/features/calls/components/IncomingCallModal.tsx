'use client'

import React, { useEffect, useRef } from 'react'
import { Phone, PhoneOff, Video, Shield, Minimize2, Maximize2 } from 'lucide-react'
import { useCallStore } from '@/stores/call-store'

export function IncomingCallModal() {
  const {
    incomingCall,
    isIncomingMinimized,
    toggleIncomingMinimize,
    acceptIncomingCall,
    declineIncomingCall,
  } = useCallStore()
  const audioContextRef = useRef<AudioContext | null>(null)
  const ringIntervalRef = useRef<NodeJS.Timeout | null>(null)

  // Web Audio Ringtone Synth (repeating friendly pleasant electronic chime)
  useEffect(() => {
    if (!incomingCall) {
      if (ringIntervalRef.current) {
        clearInterval(ringIntervalRef.current)
        ringIntervalRef.current = null
      }
      if (audioContextRef.current) {
        audioContextRef.current.close().catch(() => {})
        audioContextRef.current = null
      }
      return
    }

    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext
      const ctx = new AudioCtx()
      audioContextRef.current = ctx

      const playChime = () => {
        if (!audioContextRef.current || audioContextRef.current.state === 'closed') return
        const now = audioContextRef.current.currentTime

        // Dual pleasant harmony tone
        const osc1 = audioContextRef.current.createOscillator()
        const osc2 = audioContextRef.current.createOscillator()
        const gain = audioContextRef.current.createGain()

        osc1.type = 'sine'
        osc2.type = 'sine'
        osc1.frequency.setValueAtTime(523.25, now) // C5
        osc2.frequency.setValueAtTime(659.25, now) // E5

        gain.gain.setValueAtTime(0.05, now)
        gain.gain.exponentialRampToValueAtTime(0.001, now + 1.2)

        osc1.connect(gain)
        osc2.connect(gain)
        gain.connect(audioContextRef.current.destination)

        osc1.start(now)
        osc2.start(now)
        osc1.stop(now + 1.2)
        osc2.stop(now + 1.2)
      }

      playChime()
      ringIntervalRef.current = setInterval(playChime, 2500)
    } catch {}

    return () => {
      if (ringIntervalRef.current) {
        clearInterval(ringIntervalRef.current)
        ringIntervalRef.current = null
      }
      if (audioContextRef.current) {
        audioContextRef.current.close().catch(() => {})
        audioContextRef.current = null
      }
    }
  }, [incomingCall])

  if (!incomingCall) return null

  const { caller, callSession } = incomingCall
  const isVideo =
    callSession.callType === 'ONE_TO_ONE_VIDEO' ||
    callSession.callType === 'GROUP_VIDEO'

  // Minimized Floating Ringing Card at bottom right (doesn't block screen while navigating tasks/docs/any screen)
  if (isIncomingMinimized) {
    return (
      <div className="fixed bottom-6 right-6 z-[99998] bg-[#14151e]/95 backdrop-blur-xl border border-emerald-500/50 rounded-2xl p-3 px-4 shadow-2xl shadow-black/80 flex items-center gap-3.5 animate-scale-in text-white select-none">
        <div className="relative">
          <div className="w-9 h-9 rounded-full bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center text-xs font-bold text-white">
            {caller.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={caller.avatarUrl} alt={caller.name} className="w-full h-full object-cover rounded-full" />
            ) : (
              caller.name.charAt(0).toUpperCase()
            )}
          </div>
          <span className="absolute -inset-1 rounded-full border border-emerald-400 animate-ping pointer-events-none" />
        </div>

        <div className="flex flex-col text-left pr-1">
          <span className="text-xs font-bold leading-tight truncate max-w-[140px]">{caller.name}</span>
          <span className="text-[10px] text-emerald-400 flex items-center gap-1 mt-0.5">
            {isVideo ? <Video className="w-2.5 h-2.5" /> : <Phone className="w-2.5 h-2.5" />}
            Incoming call...
          </span>
        </div>

        <div className="flex items-center gap-1.5 pl-2 border-l border-white/10">
          {/* Maximize back to full modal */}
          <button
            type="button"
            onClick={toggleIncomingMinimize}
            className="p-2 rounded-xl bg-white/10 hover:bg-white/15 text-zinc-300 hover:text-white transition-colors cursor-pointer"
            title="Expand to Full Modal"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>

          {/* Decline */}
          <button
            type="button"
            onClick={declineIncomingCall}
            className="p-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white transition-transform hover:scale-105 cursor-pointer shadow-md shadow-rose-600/30"
            title="Decline"
          >
            <PhoneOff className="w-3.5 h-3.5 stroke-[2.5]" />
          </button>

          {/* Accept */}
          <button
            type="button"
            onClick={async (e) => {
              const btn = e.currentTarget
              if (btn.hasAttribute('data-accepting')) return
              btn.setAttribute('data-accepting', 'true')
              btn.style.opacity = '0.5'
              btn.style.pointerEvents = 'none'
              try {
                const AudioCtx = window.AudioContext || (window as any).webkitAudioContext
                const ctx = new AudioCtx()
                await ctx.resume()
                ctx.close().catch(() => {})
              } catch {}
              await acceptIncomingCall()
            }}
            className="p-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 transition-transform hover:scale-105 cursor-pointer shadow-md shadow-emerald-500/30"
            title="Accept"
          >
            <Phone className="w-3.5 h-3.5 stroke-[2.5]" />
          </button>
        </div>
      </div>
    )
  }

  // Full Screen Ringing Modal
  return (
    <div className="fixed inset-0 z-[99995] flex items-center justify-center bg-black/75 backdrop-blur-md p-4 animate-fade-in select-none">
      <div className="relative bg-[#151620] border border-white/20 rounded-3xl w-full max-w-sm p-6 shadow-2xl flex flex-col items-center text-center space-y-5 animate-scale-in">
        {/* Minimize Button in Top Right */}
        <button
          type="button"
          onClick={toggleIncomingMinimize}
          className="absolute top-4 right-4 p-2 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white transition-colors cursor-pointer"
          title="Minimize call popup"
        >
          <Minimize2 className="w-4 h-4" />
        </button>

        {/* Caller Avatar with Pulse Ring */}
        <div className="relative">
          <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-emerald-500/30 to-teal-500/30 border border-emerald-400/40 flex items-center justify-center text-white text-2xl font-bold shadow-2xl">
            {caller.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={caller.avatarUrl}
                alt={caller.name}
                className="w-full h-full object-cover rounded-full"
              />
            ) : (
              caller.name.charAt(0).toUpperCase()
            )}
          </div>
          <span className="absolute -inset-1.5 rounded-full border-2 border-emerald-400/50 animate-ping pointer-events-none" />
        </div>

        {/* Caller Info */}
        <div className="space-y-1">
          <h3 className="text-base font-extrabold text-white tracking-tight">
            {caller.name}
          </h3>
          <p className="text-xs text-zinc-400 flex items-center justify-center gap-1.5">
            {isVideo ? <Video className="w-3.5 h-3.5 text-purple-400" /> : <Phone className="w-3.5 h-3.5 text-emerald-400" />}
            <span>Incoming {isVideo ? 'Video Call' : 'Voice Call'}</span>
          </p>
        </div>

        {/* E2EE Indicator */}
        <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-white/5 border border-white/10 text-[11px] font-semibold text-emerald-400">
          <Shield className="w-3.5 h-3.5" />
          <span>End-to-End Encrypted</span>
        </div>

        {/* Accept & Decline Buttons */}
        <div className="flex items-center justify-center gap-6 pt-2 w-full">
          {/* Decline */}
          <button
            type="button"
            onClick={declineIncomingCall}
            className="flex flex-col items-center gap-1.5 group cursor-pointer"
          >
            <div className="w-14 h-14 rounded-full bg-rose-600 hover:bg-rose-500 text-white flex items-center justify-center transition-all shadow-lg shadow-rose-600/30 group-hover:scale-105">
              <PhoneOff className="w-6 h-6 stroke-[2.5]" />
            </div>
            <span className="text-[11px] font-semibold text-zinc-400 group-hover:text-rose-400">
              Decline
            </span>
          </button>

          {/* Accept */}
          <button
            type="button"
            onClick={async (e) => {
              const btn = e.currentTarget
              if (btn.hasAttribute('data-accepting')) return
              btn.setAttribute('data-accepting', 'true')
              btn.style.opacity = '0.5'
              btn.style.pointerEvents = 'none'
              try {
                const AudioCtx = window.AudioContext || (window as any).webkitAudioContext
                const ctx = new AudioCtx()
                await ctx.resume()
                ctx.close().catch(() => {})
              } catch {}
              await acceptIncomingCall()
            }}
            className="flex flex-col items-center gap-1.5 group cursor-pointer"
          >
            <div className="w-14 h-14 rounded-full bg-emerald-500 hover:bg-emerald-400 text-zinc-950 flex items-center justify-center transition-all shadow-lg shadow-emerald-500/30 group-hover:scale-105">
              <Phone className="w-6 h-6 stroke-[2.5]" />
            </div>
            <span className="text-[11px] font-semibold text-zinc-400 group-hover:text-emerald-400">
              Accept
            </span>
          </button>
        </div>
      </div>
    </div>
  )
}

