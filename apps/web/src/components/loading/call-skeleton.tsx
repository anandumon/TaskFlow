'use client'

import React from 'react'
import { Shield, Loader2, Sparkles, Phone, Users } from 'lucide-react'

export interface CallSkeletonProps {
  isGroup?: boolean
  isVoiceOnly?: boolean
  participantName?: string
  channelName?: string
  statusText?: string
}

export function CallSkeleton({
  isGroup = false,
  isVoiceOnly = false,
  participantName = 'Participant',
  channelName,
  statusText = 'Establishing secure encrypted media stream...',
}: CallSkeletonProps) {
  return (
    <div className="w-full h-full flex flex-col bg-[#0c0d14] relative overflow-hidden select-none animate-fade-in">
      {/* Background Ambient Glow */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/4 left-1/3 w-96 h-96 bg-primary/10 rounded-full blur-[120px] animate-pulse" />
        <div className="absolute bottom-1/3 right-1/4 w-80 h-80 bg-indigo-500/10 rounded-full blur-[100px] animate-pulse delay-700" />
      </div>

      {/* Main Video / Voice Grid Stage */}
      <div className="flex-1 relative flex items-center justify-center p-4 sm:p-6 z-10">
        {isGroup ? (
          /* Group / Channel Call Skeleton Grid */
          <div className="w-full h-full max-w-6xl grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 items-center justify-center">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div
                key={i}
                className="relative aspect-video rounded-2xl bg-[#12131d]/90 border border-white/10 overflow-hidden flex flex-col items-center justify-center shadow-xl p-4"
              >
                {/* Shimmer overlay */}
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/[0.04] to-transparent animate-shimmer" />

                {/* Avatar skeleton */}
                <div className="relative mb-3">
                  <div className="w-16 h-16 rounded-full bg-white/10 border border-white/15 flex items-center justify-center">
                    <Users className="w-7 h-7 text-white/30" />
                  </div>
                  <span className="absolute -inset-1 rounded-full border border-primary/30 animate-ping pointer-events-none" />
                </div>

                {/* Name bar shimmer */}
                <div className="w-24 h-3 rounded-full bg-white/10 animate-pulse mb-2" />
                <div className="w-16 h-2 rounded-full bg-white/5 animate-pulse" />

                {/* Bottom audio indicator placeholder */}
                <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between">
                  <div className="w-16 h-2.5 rounded bg-white/10 animate-pulse" />
                  <div className="flex items-center gap-1">
                    <span className="w-1 h-2 rounded-full bg-primary/40 animate-pulse" />
                    <span className="w-1 h-3 rounded-full bg-primary/60 animate-pulse delay-100" />
                    <span className="w-1 h-2 rounded-full bg-primary/40 animate-pulse delay-200" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : !isVoiceOnly ? (
          /* 1-on-1 Video Call Skeleton Stage */
          <div className="w-full h-full max-w-5xl rounded-3xl bg-[#12131d]/95 border border-white/10 flex items-center justify-center relative shadow-2xl overflow-hidden">
            {/* Shimmer sweep */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/[0.03] to-transparent animate-shimmer" />

            {/* Central Participant Pulse Skeleton */}
            <div className="relative flex flex-col items-center justify-center space-y-4 z-10 p-6 text-center">
              <div className="relative">
                <div className="w-28 h-28 sm:w-32 sm:h-32 rounded-full bg-gradient-to-tr from-primary/20 via-indigo-500/20 to-teal-500/20 border-2 border-primary/30 flex items-center justify-center shadow-2xl">
                  <span className="text-4xl sm:text-5xl font-extrabold text-white/70">
                    {participantName.charAt(0).toUpperCase()}
                  </span>
                </div>
                <span className="absolute -inset-3 rounded-full border-2 border-primary/30 animate-ping pointer-events-none" />
                <span className="absolute -inset-6 rounded-full border border-indigo-400/20 animate-pulse pointer-events-none" />
              </div>

              <div className="space-y-2 max-w-md">
                <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-black/60 backdrop-blur-md border border-white/10 text-white font-semibold text-sm shadow-lg">
                  <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
                  <span>Connecting with {participantName}...</span>
                </div>
                <p className="text-xs text-zinc-400 flex items-center justify-center gap-2">
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />
                  <span>{statusText}</span>
                </p>
              </div>
            </div>

            {/* Floating PiP Self-view Skeleton */}
            <div className="absolute bottom-6 right-6 w-44 sm:w-52 aspect-video rounded-2xl bg-[#181924]/90 border border-white/15 shadow-2xl overflow-hidden flex flex-col items-center justify-center z-20">
              <div className="w-10 h-10 rounded-full bg-white/10 border border-white/15 flex items-center justify-center mb-1.5">
                <span className="text-xs font-bold text-white/60">You</span>
              </div>
              <div className="w-16 h-2 rounded-full bg-white/10 animate-pulse" />
              <div className="absolute bottom-2 left-2 text-[10px] text-zinc-400 px-2 py-0.5 rounded bg-black/60">
                Local camera
              </div>
            </div>
          </div>
        ) : (
          /* 1-on-1 Voice Call Skeleton Stage */
          <div className="flex flex-col items-center justify-center space-y-6 z-10 p-6 text-center">
            <div className="relative">
              <div className="w-32 h-32 rounded-full bg-gradient-to-tr from-indigo-500/20 to-purple-500/20 border-2 border-indigo-400/30 flex items-center justify-center shadow-2xl">
                <span className="text-5xl font-bold text-white/70">
                  {participantName.charAt(0).toUpperCase()}
                </span>
              </div>
              <span className="absolute -inset-3 rounded-full border-2 border-indigo-400/30 animate-ping pointer-events-none" />
              <span className="absolute -inset-6 rounded-full border border-purple-400/20 animate-pulse pointer-events-none" />
            </div>

            <div className="space-y-2">
              <h3 className="text-lg font-bold text-white flex items-center justify-center gap-2">
                <span>{participantName}</span>
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
              </h3>
              <p className="text-xs text-zinc-400 flex items-center justify-center gap-2">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />
                <span>{statusText}</span>
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
