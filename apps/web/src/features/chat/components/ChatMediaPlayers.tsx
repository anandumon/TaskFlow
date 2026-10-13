'use client'

import React, { useState, useRef, useEffect, useMemo } from 'react'
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize2,
  Minimize2,
  Video,
  Sparkles,
  RotateCcw,
} from 'lucide-react'

interface VideoMessagePlayerProps {
  url: string
  title?: string
  duration?: string
  poster?: string
}

export function VideoMessagePlayer({ url, title, duration, poster }: VideoMessagePlayerProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const containerRef = useRef<HTMLDivElement | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [totalDuration, setTotalDuration] = useState(0)
  const [isMuted, setIsMuted] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [showControls, setShowControls] = useState(false)
  const hideControlsTimer = useRef<any>(null)

  // Clean title: Avoid duplicate "(3s) (3s)"
  const cleanTitle = useMemo(() => {
    let t = title || 'Video Clip'
    if (duration) {
      // Remove trailing duration from title if already present
      const escapedDur = duration.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&')
      t = t.replace(new RegExp(`\\s*\\(${escapedDur}\\)$`, 'i'), '').trim()
    }
    return t
  }, [title, duration])

  const togglePlay = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation()
    const video = videoRef.current
    if (!video) return

    if (video.paused || video.ended) {
      video.play().then(() => {
        setIsPlaying(true)
      }).catch((err) => {
        console.warn('[VideoMessagePlayer] autoplay prevented:', err)
      })
    } else {
      video.pause()
      setIsPlaying(false)
    }
  }

  const toggleMute = (e: React.MouseEvent) => {
    e.stopPropagation()
    const video = videoRef.current
    if (!video) return
    video.muted = !video.muted
    setIsMuted(video.muted)
  }

  const toggleFullscreen = (e: React.MouseEvent) => {
    e.stopPropagation()
    const container = containerRef.current
    if (!container) return

    if (!document.fullscreenElement) {
      container.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {})
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {})
    }
  }

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.stopPropagation()
    const video = videoRef.current
    if (!video) return
    const target = parseFloat(e.target.value)
    video.currentTime = target
    setCurrentTime(target)
  }

  const formatTime = (secs: number) => {
    if (!secs || isNaN(secs)) return '0:00'
    const m = Math.floor(secs / 60)
    const s = Math.floor(secs % 60)
    return `${m}:${s.toString().padStart(2, '0')}`
  }

  const handleMouseMove = () => {
    setShowControls(true)
    if (hideControlsTimer.current) clearTimeout(hideControlsTimer.current)
    hideControlsTimer.current = setTimeout(() => {
      if (isPlaying) setShowControls(false)
    }, 2500)
  }

  useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement))
    }
    document.addEventListener('fullscreenchange', handleFsChange)
    return () => {
      document.removeEventListener('fullscreenchange', handleFsChange)
      if (hideControlsTimer.current) clearTimeout(hideControlsTimer.current)
    }
  }, [])

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={() => isPlaying && setShowControls(false)}
      className="relative rounded-2xl overflow-hidden max-w-sm sm:max-w-md bg-zinc-950/90 border border-border/60 shadow-xl group select-none"
    >
      {/* Header bar */}
      <div className="flex items-center justify-between px-3 py-2 bg-gradient-to-b from-black/80 to-transparent text-[11px] font-bold z-10 text-white pointer-events-none">
        <div className="flex items-center gap-1.5">
          <div className="w-5 h-5 rounded-md bg-purple-500/20 text-purple-400 flex items-center justify-center border border-purple-500/30">
            <Video className="w-3 h-3" />
          </div>
          <span className="truncate">{cleanTitle}</span>
          {duration && <span className="opacity-70 font-normal text-[10px]">({duration})</span>}
        </div>
      </div>

      {/* Video Element */}
      <div className="relative aspect-video w-full bg-black flex items-center justify-center cursor-pointer" onClick={togglePlay}>
        <video
          ref={videoRef}
          src={url}
          poster={poster}
          preload="metadata"
          playsInline
          onTimeUpdate={() => {
            if (videoRef.current) setCurrentTime(videoRef.current.currentTime)
          }}
          onLoadedMetadata={() => {
            if (videoRef.current) setTotalDuration(videoRef.current.duration)
          }}
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
          onEnded={() => {
            setIsPlaying(false)
            setShowControls(true)
          }}
          className="w-full h-full object-contain"
        />

        {/* Big Center Play / Replay Button */}
        {(!isPlaying || showControls) && (
          <div
            className={`absolute inset-0 flex items-center justify-center bg-black/35 backdrop-blur-[1px] transition-all duration-200 pointer-events-none ${
              isPlaying ? 'opacity-0 hover:opacity-100' : 'opacity-100'
            }`}
          >
            <button
              type="button"
              onClick={togglePlay}
              className="w-13 h-13 rounded-full bg-white/95 hover:bg-white text-zinc-950 flex items-center justify-center shadow-2xl transition-all transform hover:scale-110 active:scale-95 pointer-events-auto border border-white/40 ring-4 ring-black/20 cursor-pointer"
              title={isPlaying ? 'Pause Video' : 'Play Video'}
            >
              {videoRef.current?.ended ? (
                <RotateCcw className="w-5 h-5 text-zinc-900" />
              ) : isPlaying ? (
                <Pause className="w-5 h-5 fill-zinc-900 text-zinc-900" />
              ) : (
                <Play className="w-5 h-5 fill-zinc-900 text-zinc-900 ml-0.5" />
              )}
            </button>
          </div>
        )}

        {/* Floating Bottom Control Bar */}
        <div
          onClick={(e) => e.stopPropagation()}
          className={`absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/95 via-black/80 to-transparent px-3 py-2.5 flex flex-col gap-1.5 transition-opacity duration-200 ${
            showControls || !isPlaying ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
          }`}
        >
          {/* Progress scrubber bar */}
          <div className="flex items-center gap-2 w-full">
            <input
              type="range"
              min={0}
              max={totalDuration || 100}
              step={0.1}
              value={currentTime}
              onChange={handleSeek}
              className="w-full h-1.5 bg-white/20 rounded-lg appearance-none cursor-pointer accent-purple-400 hover:accent-purple-300"
            />
          </div>

          <div className="flex items-center justify-between text-white text-[11px]">
            <div className="flex items-center gap-2">
              {/* Play / Pause small button */}
              <button
                type="button"
                onClick={togglePlay}
                className="p-1 rounded-md hover:bg-white/20 transition-colors text-white cursor-pointer"
                title={isPlaying ? 'Pause' : 'Play'}
              >
                {isPlaying ? <Pause className="w-4 h-4 fill-white" /> : <Play className="w-4 h-4 fill-white" />}
              </button>

              {/* Time display */}
              <span className="font-mono text-[10px] text-zinc-300">
                {formatTime(currentTime)} / {formatTime(totalDuration)}
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              {/* Volume / Mute */}
              <button
                type="button"
                onClick={toggleMute}
                className="p-1 rounded-md hover:bg-white/20 transition-colors text-white cursor-pointer"
                title={isMuted ? 'Unmute' : 'Mute'}
              >
                {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
              </button>

              {/* Fullscreen */}
              <button
                type="button"
                onClick={toggleFullscreen}
                className="p-1 rounded-md hover:bg-white/20 transition-colors text-white cursor-pointer"
                title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
              >
                {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

interface GifMessagePlayerProps {
  url: string
  name?: string
  onPreview?: () => void
}

export function GifMessagePlayer({ url, name = 'Animated GIF', onPreview }: GifMessagePlayerProps) {
  const [isPaused, setIsPaused] = useState(false)
  const imgRef = useRef<HTMLImageElement | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  const togglePause = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!isPaused) {
      // Freeze frame on canvas
      const img = imgRef.current
      const canvas = canvasRef.current
      if (img && canvas) {
        canvas.width = img.naturalWidth || img.clientWidth || 300
        canvas.height = img.naturalHeight || img.clientHeight || 200
        const ctx = canvas.getContext('2d')
        if (ctx) {
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
        }
      }
      setIsPaused(true)
    } else {
      setIsPaused(false)
    }
  }

  return (
    <div
      onClick={onPreview}
      className="relative rounded-2xl overflow-hidden max-w-sm group border border-border/50 bg-black/40 shadow-md cursor-pointer select-none"
    >
      {/* Animated Image */}
      <img
        ref={imgRef}
        src={url}
        alt={name}
        className={`max-h-60 w-auto rounded-2xl object-cover transition-opacity ${
          isPaused ? 'hidden' : 'block'
        }`}
      />

      {/* Frozen Canvas when paused */}
      <canvas
        ref={canvasRef}
        className={`max-h-60 w-auto rounded-2xl object-cover ${
          isPaused ? 'block' : 'hidden'
        }`}
      />

      {/* Top Left GIF Badge */}
      <div className="absolute top-2.5 left-2.5 px-2 py-0.5 rounded-md bg-black/70 backdrop-blur-sm text-white font-black text-[9px] uppercase tracking-wider border border-white/20 flex items-center gap-1 shadow-md">
        <Sparkles className="w-2.5 h-2.5 text-amber-400" />
        <span>GIF</span>
      </div>

      {/* Play / Pause Toggle Button Overlay */}
      <div
        className={`absolute inset-0 flex items-center justify-center transition-opacity ${
          isPaused ? 'bg-black/40 opacity-100' : 'opacity-0 group-hover:opacity-100 bg-black/25'
        }`}
      >
        <button
          type="button"
          onClick={togglePause}
          className="w-11 h-11 rounded-full bg-black/80 hover:bg-black text-white flex items-center justify-center shadow-2xl transition-transform transform hover:scale-110 active:scale-95 border border-white/30 cursor-pointer"
          title={isPaused ? 'Play Animated GIF' : 'Pause GIF'}
        >
          {isPaused ? (
            <Play className="w-5 h-5 fill-white text-white ml-0.5" />
          ) : (
            <Pause className="w-5 h-5 fill-white text-white" />
          )}
        </button>
      </div>
    </div>
  )
}
