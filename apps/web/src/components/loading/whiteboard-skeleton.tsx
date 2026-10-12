/**
 * whiteboard-skeleton.tsx
 * Skeleton loading state for Krya Whiteboard (/app/whiteboard).
 * Mirrors: canvas toolbars + floating dock + infinite canvas grid skeleton.
 */

import { SkeletonButton, SkeletonIconBox, SkeletonText } from './skeleton-primitives'

export function WhiteboardSkeleton() {
  return (
    <div
      className="relative h-[calc(100vh-4rem)] w-full overflow-hidden bg-background select-none"
      aria-busy="true"
      aria-label="Loading whiteboard"
    >
      {/* Top Bar / Navigation */}
      <div className="absolute top-4 left-4 right-4 z-10 flex items-center justify-between pointer-events-none">
        {/* Board Title & Status */}
        <div className="flex items-center gap-3 p-2 px-3 rounded-2xl bg-card/85 backdrop-blur-md border border-border/70 shadow-lg">
          <SkeletonIconBox size="sm" className="rounded-lg" />
          <div className="space-y-1">
            <SkeletonText width="w-32" height="h-4" />
            <SkeletonText width="w-20" height="h-2.5" />
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 p-1.5 rounded-2xl bg-card/85 backdrop-blur-md border border-border/70 shadow-lg">
          <SkeletonButton width="w-20" className="h-8 rounded-xl" />
          <SkeletonButton width="w-24" className="h-8 rounded-xl" />
        </div>
      </div>

      {/* Floating Center Dock: Drawing Tools */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-10 flex items-center gap-1.5 p-2 rounded-2xl bg-card/90 backdrop-blur-md border border-border/80 shadow-2xl">
        {Array.from({ length: 9 }).map((_, i) => (
          <SkeletonIconBox
            key={i}
            size="md"
            className="w-9 h-9 rounded-xl motion-safe:animate-pulse"
          />
        ))}
      </div>

      {/* Bottom Left Zoom & Navigation Controls */}
      <div className="absolute bottom-6 left-6 z-10 flex items-center gap-2 p-1.5 rounded-2xl bg-card/85 backdrop-blur-md border border-border/70 shadow-lg">
        <SkeletonIconBox size="sm" className="rounded-lg" />
        <SkeletonText width="w-10" height="h-3" />
        <SkeletonIconBox size="sm" className="rounded-lg" />
      </div>

      {/* Canvas Canvas Background Grid Placeholder */}
      <div className="w-full h-full flex items-center justify-center bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] dark:bg-[radial-gradient(#27272a_1px,transparent_1px)] [background-size:20px_20px] opacity-70">
        {/* Placeholder canvas diagram shapes */}
        <div className="relative w-96 h-64 border-2 border-dashed border-border/50 rounded-2xl p-4 flex flex-col justify-between motion-safe:animate-pulse">
          <div className="flex items-center justify-between">
            <SkeletonText width="w-28" height="h-4" />
            <div className="w-4 h-4 rounded bg-muted/60" />
          </div>
          <div className="space-y-2">
            <SkeletonText width="w-full" height="h-3" />
            <SkeletonText width="w-4/5" height="h-3" />
          </div>
          <div className="flex justify-end gap-2">
            <div className="w-6 h-6 rounded-full bg-muted/70" />
            <div className="w-6 h-6 rounded-full bg-muted/50" />
          </div>
        </div>
      </div>
    </div>
  )
}
