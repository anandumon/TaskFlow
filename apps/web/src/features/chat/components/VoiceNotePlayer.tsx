'use client'

import React, { useState, useRef, useEffect } from 'react'
import { Play, Pause, Volume2, Mic } from 'lucide-react'

interface VoiceNotePlayerProps {
  url?: string
  dataUrl?: string
  audioData?: string
  durationText?: string
  title?: string
  isMe?: boolean
}

export function VoiceNotePlayer({
  url,
  dataUrl,
  audioData,
  durationText,
  title = 'Voice Note',
  isMe = false,
}: VoiceNotePlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [totalDuration, setTotalDuration] = useState(0)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const synthIntervalRef = useRef<any>(null)
  const synthCtxRef = useRef<AudioContext | null>(null)
  const parsedFallbackSecs = useRef<number>(1)

  // Resolve audio source (prefer dataUrl or url)
  const audioSrc = dataUrl || url || audioData || ''

  // Parse duration seconds from durationText or title (e.g. 'Voice Note (1s)', '1s', '0:01')
  useEffect(() => {
    const textToScan = durationText || title || ''
    const match = textToScan.match(/(\d+)\s*s/i) || textToScan.match(/(\d+)/)
    if (match && match[1]) {
      const secs = parseInt(match[1], 10)
      if (secs > 0 && isFinite(secs)) {
        parsedFallbackSecs.current = secs
        setTotalDuration((prev) => (!prev || !isFinite(prev) ? secs : prev))
      }
    }
  }, [durationText, title])

  const formatTime = (secs: number) => {
    if (!secs || !isFinite(secs) || isNaN(secs) || secs < 0) {
      return '0:00'
    }
    const m = Math.floor(secs / 60)
    const s = Math.floor(secs % 60)
    return `${m}:${s.toString().padStart(2, '0')}`
  }

  // Play synthesized harmonic voice tone fallback if no media URL is attached
  const playSynthesizedVoiceNote = () => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext
      if (!AudioCtx) return
      const ctx = new AudioCtx()
      synthCtxRef.current = ctx

      const dur = totalDuration > 0 ? totalDuration : 5
      let elapsed = 0
      setIsPlaying(true)

      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'triangle'
      osc.frequency.setValueAtTime(320, ctx.currentTime)
      osc.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + dur * 0.5)
      osc.frequency.exponentialRampToValueAtTime(360, ctx.currentTime + dur)

      gain.gain.setValueAtTime(0.12, ctx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + dur)

      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.start()
      osc.stop(ctx.currentTime + dur)

      synthIntervalRef.current = setInterval(() => {
        elapsed += 0.25
        setCurrentTime(Math.min(elapsed, dur))
        if (elapsed >= dur) {
          clearInterval(synthIntervalRef.current)
          setIsPlaying(false)
          setCurrentTime(0)
        }
      }, 250)
    } catch {
      setIsPlaying(false)
    }
  }

  const togglePlay = (e: React.MouseEvent) => {
    e.stopPropagation()

    if (isPlaying) {
      if (audioRef.current && !audioRef.current.paused) {
        audioRef.current.pause()
      }
      if (synthIntervalRef.current) {
        clearInterval(synthIntervalRef.current)
      }
      if (synthCtxRef.current) {
        synthCtxRef.current.close().catch(() => {})
        synthCtxRef.current = null
      }
      setIsPlaying(false)
      return
    }

    // Try playing real audio source
    if (audioSrc && audioRef.current) {
      if (audioRef.current.ended || audioRef.current.currentTime >= (totalDuration || parsedFallbackSecs.current || 1)) {
        audioRef.current.currentTime = 0
        setCurrentTime(0)
      }
      audioRef.current
        .play()
        .then(() => {
          setIsPlaying(true)
        })
        .catch((err) => {
          console.warn('[VoiceNotePlayer] Native play failed, using fallback:', err)
          playSynthesizedVoiceNote()
        })
    } else {
      playSynthesizedVoiceNote()
    }
  }

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    e.stopPropagation()
    const rect = e.currentTarget.getBoundingClientRect()
    const clickX = e.clientX - rect.left
    const percent = Math.max(0, Math.min(1, clickX / rect.width))
    const dur = totalDuration > 0 ? totalDuration : (parsedFallbackSecs.current || 5)
    const newTime = percent * dur

    setCurrentTime(newTime)
    if (audioRef.current && isFinite(newTime)) {
      try {
        audioRef.current.currentTime = newTime
      } catch {}
    }
  }

  useEffect(() => {
    return () => {
      if (synthIntervalRef.current) clearInterval(synthIntervalRef.current)
      if (synthCtxRef.current) synthCtxRef.current.close().catch(() => {})
    }
  }, [])

  const progressPercent = totalDuration > 0 ? (currentTime / totalDuration) * 100 : 0
  const barHeights = [40, 75, 55, 90, 60, 80, 45, 100, 70, 85, 50, 65, 95, 40, 80, 60]

  return (
    <div
      onClick={(e) => e.stopPropagation()}
      className={`p-3 rounded-2xl flex flex-col gap-2 min-w-[240px] max-w-[320px] transition-all select-none ${
        isMe
          ? 'bg-primary/95 text-primary-foreground border border-white/20 shadow-md'
          : 'bg-card border border-border/70 text-foreground shadow-xs'
      }`}
    >
      {/* Hidden real audio element */}
      {audioSrc && (
        <audio
          ref={audioRef}
          src={audioSrc}
          preload="metadata"
          onLoadedMetadata={() => {
            if (audioRef.current) {
              const d = audioRef.current.duration
              if (isFinite(d) && !isNaN(d) && d > 0) {
                setTotalDuration(Math.round(d))
              } else if (parsedFallbackSecs.current > 0) {
                setTotalDuration(parsedFallbackSecs.current)
              }
            }
          }}
          onTimeUpdate={() => {
            if (audioRef.current) {
              const cur = audioRef.current.currentTime
              if (isFinite(cur) && !isNaN(cur)) {
                setCurrentTime(cur)
                const limit = totalDuration > 0 ? totalDuration : parsedFallbackSecs.current
                if (limit > 0 && cur >= limit) {
                  audioRef.current.pause()
                  setIsPlaying(false)
                }
              }
            }
          }}
          onEnded={() => {
            setIsPlaying(false)
            setCurrentTime(0)
            if (audioRef.current) {
              audioRef.current.currentTime = 0
            }
          }}
          onError={() => {
            console.warn('[VoiceNotePlayer] Audio error, fallback enabled')
          }}
        />
      )}

      {/* Top Bar: Play/Pause Button + Title & Mic Indicator */}
      <div className="flex items-center gap-2.5">
        <button
          type="button"
          onClick={togglePlay}
          className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-transform active:scale-95 cursor-pointer shadow-md ${
            isMe
              ? 'bg-white text-primary hover:bg-white/90'
              : 'bg-primary text-primary-foreground hover:bg-primary/90'
          }`}
          title={isPlaying ? 'Pause audio note' : 'Play audio note'}
        >
          {isPlaying ? (
            <Pause className="w-4 h-4 fill-current stroke-current" />
          ) : (
            <Play className="w-4 h-4 fill-current stroke-current ml-0.5" />
          )}
        </button>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between text-[11px] font-bold gap-2">
            <span className="truncate flex items-center gap-1 min-w-0">
              <Mic className="w-3.5 h-3.5 shrink-0 opacity-80" />
              <span className="truncate">
                {title.replace(/\s*\(\d+s\)/i, '').trim() || 'Voice Note'}
              </span>
            </span>
            <span className="text-[10px] opacity-80 font-mono shrink-0 ml-auto pl-1.5 whitespace-nowrap">
              {formatTime(currentTime)} / {formatTime(isFinite(totalDuration) && totalDuration > 0 ? totalDuration : parsedFallbackSecs.current > 0 ? parsedFallbackSecs.current : 1)}
            </span>
          </div>

          {/* Interactive Waveform / Scrubber Bar */}
          <div
            onClick={handleSeek}
            className="mt-1.5 h-5 flex items-center gap-[3px] cursor-pointer group py-1"
            title="Click or drag to seek"
          >
            {barHeights.map((h, i) => {
              const barPercent = (i / barHeights.length) * 100
              const isPast = barPercent <= progressPercent
              return (
                <div
                  key={i}
                  style={{ height: `${h}%` }}
                  className={`flex-1 rounded-full transition-all duration-150 ${
                    isPast
                      ? isMe
                        ? 'bg-white'
                        : 'bg-primary'
                      : isMe
                      ? 'bg-white/35 group-hover:bg-white/50'
                      : 'bg-muted-foreground/30 group-hover:bg-muted-foreground/50'
                  } ${isPlaying && isPast ? 'animate-pulse' : ''}`}
                />
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
