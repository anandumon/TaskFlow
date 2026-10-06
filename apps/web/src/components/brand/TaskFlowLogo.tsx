'use client'

import React from 'react'

export interface TaskFlowLogoProps {
  /**
   * Layout variant:
   * - 'full': Monogram + "TaskFlow" serif wordmark (default)
   * - 'icon': Monogram only (for collapsed sidebars, favicons, avatars)
   * - 'wordmark': Serif typography only
   */
  variant?: 'full' | 'icon' | 'wordmark'
  /**
   * Predefined size:
   * - 'sm': compact (28px icon / 14px text)
   * - 'md': standard (36px icon / 18px text)
   * - 'lg': prominent (48px icon / 24px text)
   * - 'xl': hero (64px icon / 32px text)
   */
  size?: 'sm' | 'md' | 'lg' | 'xl'
  /**
   * Enable luxury micro-animations (shimmer, hover float, gold sweep)
   */
  animated?: boolean
  className?: string
  iconClassName?: string
  textClassName?: string
  /**
   * Theme mode override (optional, defaults to adaptive)
   */
  colorScheme?: 'adaptive' | 'light' | 'dark'
}

export function TaskFlowLogo({
  variant = 'full',
  size = 'md',
  animated = true,
  className = '',
  iconClassName = '',
  textClassName = '',
  colorScheme = 'adaptive',
}: TaskFlowLogoProps) {
  // Dimensions map
  const dimensions = {
    sm: { iconSize: 28, textClass: 'text-sm tracking-tight' },
    md: { iconSize: 36, textClass: 'text-lg tracking-tight' },
    lg: { iconSize: 48, textClass: 'text-2xl tracking-tight' },
    xl: { iconSize: 64, textClass: 'text-3xl tracking-tight' },
  }[size]

  return (
    <div
      className={`inline-flex items-center gap-3 select-none group transition-all duration-300 ${className}`}
      style={{ cursor: 'pointer' }}
    >
      {/* ── Monogram Icon (Intertwined Script "TF") ────────── */}
      {variant !== 'wordmark' && (
        <div
          className={`relative shrink-0 flex items-center justify-center transition-transform duration-300 ${
            animated ? 'group-hover:scale-105 group-hover:-translate-y-0.5' : ''
          } ${iconClassName}`}
          style={{ width: dimensions.iconSize, height: dimensions.iconSize }}
        >
          <svg
            viewBox="0 0 200 200"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="w-full h-full drop-shadow-sm overflow-visible"
            aria-label="TaskFlow Monogram"
          >
            <defs>
              {/* Luxury Navy Stroke Gradient */}
              <linearGradient id="tfNavyGrad" x1="20" y1="20" x2="180" y2="180" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor="#0a192f" />
                <stop offset="50%" stopColor="#0f2744" />
                <stop offset="100%" stopColor="#1e3a8a" />
              </linearGradient>

              {/* Dark mode adaptive Navy/Platinum gradient */}
              <linearGradient id="tfAdaptiveGrad" x1="20" y1="20" x2="180" y2="180" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor="currentColor" />
                <stop offset="100%" stopColor="currentColor" stopOpacity="0.85" />
              </linearGradient>

              {/* Rich Champagne Gold Accent Gradient */}
              <linearGradient id="tfGoldGrad" x1="40" y1="30" x2="160" y2="140" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor="#f59e0b" />
                <stop offset="35%" stopColor="#fbbf24" />
                <stop offset="70%" stopColor="#d97706" />
                <stop offset="100%" stopColor="#fef3c7" />
              </linearGradient>

              {/* Shimmer sweep animation gradient */}
              <linearGradient id="tfShimmer" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.3" />
                <stop offset="50%" stopColor="#ffffff" stopOpacity="0.9" />
                <stop offset="100%" stopColor="#f59e0b" stopOpacity="0.3" />
                {animated && (
                  <animate
                    attributeName="x1"
                    from="-100%"
                    to="200%"
                    dur="3.5s"
                    repeatCount="indefinite"
                  />
                )}
                {animated && (
                  <animate
                    attributeName="x2"
                    from="0%"
                    to="300%"
                    dur="3.5s"
                    repeatCount="indefinite"
                  />
                )}
              </linearGradient>

              {/* Subtle ambient drop shadow filter */}
              <filter id="tfGlow" x="-20%" y="-20%" width="140%" height="140%">
                <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#d97706" floodOpacity="0.25" />
              </filter>
            </defs>

            {/* 1. Underlying Gold Accent Ribbon Trace (Following the exact curve of the top flourish and stem) */}
            <path
              d="M 45 68 C 65 52, 95 44, 130 46 C 152 47, 168 55, 164 64 C 160 72, 142 74, 126 73 C 98 71, 74 88, 66 112 C 58 136, 70 158, 92 161 C 114 163, 136 148, 144 130"
              stroke="url(#tfGoldGrad)"
              strokeWidth="5"
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
              className={animated ? 'opacity-90 transition-opacity' : ''}
              filter={animated ? 'url(#tfGlow)' : undefined}
            />

            {/* Shimmer overlay path for live gold glow animation */}
            {animated && (
              <path
                d="M 45 68 C 65 52, 95 44, 130 46 C 152 47, 168 55, 164 64 C 160 72, 142 74, 126 73 C 98 71, 74 88, 66 112 C 58 136, 70 158, 92 161 C 114 163, 136 148, 144 130"
                stroke="url(#tfShimmer)"
                strokeWidth="6"
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
                className="opacity-75 mix-blend-overlay pointer-events-none"
              />
            )}

            {/* 2. Main Calligraphic "T" and "F" Intertwined Stroke (Deep Navy / Midnight) */}
            {/* Elegant upper terminal loop */}
            <path
              d="M 48 72 C 34 68, 32 52, 44 42 C 58 30, 84 38, 110 40 C 138 42, 164 45, 172 58 C 178 68, 168 76, 148 74 C 118 71, 98 88, 86 114 C 74 140, 82 166, 104 166 C 122 166, 140 152, 148 134"
              stroke={colorScheme === 'light' ? '#0a192f' : colorScheme === 'dark' ? '#f8fafc' : 'currentColor'}
              strokeWidth="10"
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
              className="dark:stroke-slate-100 stroke-slate-900 transition-colors duration-300"
            />

            {/* The sweeping descending downstroke with tapered flourish */}
            <path
              d="M 124 50 C 116 76, 88 134, 76 156 C 70 168, 62 172, 54 168 C 44 162, 46 146, 56 136 C 68 124, 86 122, 102 124"
              stroke={colorScheme === 'light' ? '#0a192f' : colorScheme === 'dark' ? '#f8fafc' : 'currentColor'}
              strokeWidth="9"
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
              className="dark:stroke-slate-100 stroke-slate-900 transition-colors duration-300"
            />

            {/* Crossbar of the "F" with graceful calligraphic serif loop */}
            <path
              d="M 88 114 C 104 112, 126 110, 142 108 C 148 107, 150 114, 144 118 C 136 122, 120 125, 108 125"
              stroke={colorScheme === 'light' ? '#0a192f' : colorScheme === 'dark' ? '#f8fafc' : 'currentColor'}
              strokeWidth="6"
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
              className="dark:stroke-slate-100 stroke-slate-900 transition-colors duration-300"
            />

            {/* Golden decorative accent dot on the crossbar loop */}
            <circle cx="146" cy="113" r="3.5" fill="url(#tfGoldGrad)" />
          </svg>
        </div>
      )}

      {/* ── Wordmark Typography ("TaskFlow" Refined Serif) ───── */}
      {variant !== 'icon' && (
        <span
          className={`font-serif font-bold tracking-tight whitespace-nowrap transition-colors duration-200 select-none ${dimensions.textClass} ${textClassName}`}
          style={{
            fontFamily: "'Playfair Display', 'Cormorant Garamond', 'Cinzel', Georgia, 'Times New Roman', serif",
            letterSpacing: '-0.02em',
          }}
        >
          <span className="text-foreground transition-colors group-hover:text-primary">
            Task
          </span>
          <span className="text-foreground transition-colors group-hover:text-primary">
            Flow
          </span>
        </span>
      )}
    </div>
  )
}
export default TaskFlowLogo
