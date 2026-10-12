/**
 * onboarding-skeleton.tsx
 * Skeleton loading state for Onboarding Wizard (/onboarding).
 * Mirrors: simulated background + centered glassmorphic setup card + step indicators.
 */

import {
  SkeletonText,
  SkeletonButton,
  SkeletonAvatar,
  SkeletonIconBox,
} from './skeleton-primitives'

export function OnboardingSkeleton() {
  return (
    <div
      className="relative min-h-screen w-full flex items-center justify-center bg-[#0c0c0e] overflow-hidden p-4"
      aria-busy="true"
      aria-label="Loading onboarding wizard"
    >
      {/* Blurred Simulated Workspace Backdrop */}
      <div className="absolute inset-0 flex pointer-events-none filter blur-[3px] opacity-30 select-none">
        <div className="w-64 h-full border-r border-white/10 bg-[#121216] p-4 space-y-4">
          <div className="h-8 w-36 rounded-lg bg-white/10 motion-safe:animate-pulse" />
          <div className="space-y-2 pt-4">
            <div className="h-6 w-44 rounded-md bg-white/5 motion-safe:animate-pulse" />
            <div className="h-6 w-36 rounded-md bg-white/5 motion-safe:animate-pulse" />
            <div className="h-6 w-48 rounded-md bg-white/5 motion-safe:animate-pulse" />
          </div>
        </div>
        <div className="flex-1 p-8 space-y-4">
          <div className="h-10 w-64 rounded-xl bg-white/10 motion-safe:animate-pulse" />
          <div className="h-40 w-full rounded-2xl bg-white/5 motion-safe:animate-pulse" />
        </div>
      </div>

      {/* Centered Glassmorphic Wizard Card */}
      <div className="relative z-10 w-full max-w-lg rounded-3xl bg-card/90 backdrop-blur-xl border border-border/80 shadow-2xl p-8 space-y-6">
        {/* Step Progress Indicators */}
        <div className="flex items-center justify-between pb-2 border-b border-border/60">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center">
              <div className="w-2.5 h-2.5 rounded-full bg-primary motion-safe:animate-pulse" />
            </div>
            <SkeletonText width="w-24" height="h-3.5" />
          </div>
          <div className="flex gap-1.5">
            <div className="w-6 h-1.5 rounded-full bg-primary" />
            <div className="w-6 h-1.5 rounded-full bg-muted" />
            <div className="w-6 h-1.5 rounded-full bg-muted" />
          </div>
        </div>

        {/* Wizard Header */}
        <div className="space-y-2 text-center sm:text-left">
          <SkeletonText width="w-48" height="h-6" />
          <SkeletonText width="w-72" height="h-4" />
        </div>

        {/* Form Fields Placeholders */}
        <div className="space-y-4 pt-2">
          {/* Avatar Upload Placeholder */}
          <div className="flex items-center gap-4">
            <SkeletonAvatar size="xl" />
            <div className="space-y-1.5">
              <SkeletonText width="w-32" height="h-4" />
              <SkeletonText width="w-48" height="h-3" />
            </div>
          </div>

          {/* Text Input Placeholders */}
          <div className="space-y-1.5">
            <SkeletonText width="w-24" height="h-3" />
            <div className="h-11 w-full rounded-xl bg-muted/60 motion-safe:animate-pulse border border-border/60" />
          </div>

          <div className="space-y-1.5">
            <SkeletonText width="w-32" height="h-3" />
            <div className="h-11 w-full rounded-xl bg-muted/60 motion-safe:animate-pulse border border-border/60" />
          </div>
        </div>

        {/* Action Footer Buttons */}
        <div className="flex items-center justify-between pt-4 border-t border-border/60">
          <SkeletonButton width="w-24" className="h-10 rounded-xl" />
          <SkeletonButton width="w-32" className="h-10 rounded-xl bg-primary/30" />
        </div>
      </div>
    </div>
  )
}
