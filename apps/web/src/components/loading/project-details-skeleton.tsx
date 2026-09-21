/**
 * project-details-skeleton.tsx
 * Skeleton for the project detail page (/app/projects/[id]).
 * Mirrors: Back button + Title banner + Action buttons + 4-metric strip + Controls bar + 4-column kanban board.
 */

import {
  SkeletonText,
  SkeletonButton,
  SkeletonCard,
  SkeletonBadge,
} from './skeleton-primitives'

export function ProjectDetailsSkeleton() {
  return (
    <div className="space-y-6 max-w-7xl mx-auto animate-pulse pb-12">
      {/* Header Banner */}
      <div className="p-6 rounded-3xl border border-border/70 bg-card/60 relative overflow-hidden space-y-4">
        {/* Accent Strip */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-primary/30 rounded-t-3xl" />

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-2">
            <SkeletonText width="w-44" height="h-3.5" />
            <SkeletonText width="w-72" height="h-8" />
            <SkeletonText width="w-96" height="h-3.5" />
          </div>

          <div className="flex items-center gap-2.5 shrink-0 self-start sm:self-auto">
            <div className="h-10 w-24 rounded-xl bg-muted/60 border border-border/50" />
            <div className="h-10 w-28 rounded-xl bg-muted/60 border border-border/50" />
            <SkeletonButton width="w-36" className="h-10 rounded-xl" />
          </div>
        </div>

        {/* Metrics Summary Strip (4 boxes) */}
        <div className="pt-3 border-t border-border/50 grid grid-cols-2 sm:grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="p-3 rounded-2xl bg-background/80 border border-border/60 space-y-2">
              <SkeletonText width="w-24" height="h-3" />
              <SkeletonText width="w-12" height="h-6" />
            </div>
          ))}
        </div>
      </div>

      {/* Controls Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-card/80 border border-border/80 p-3.5 rounded-2xl shadow-xs">
        {/* Category Tabs */}
        <div className="flex items-center gap-2">
          <div className="h-8 w-24 rounded-xl bg-primary/20" />
          <div className="h-8 w-32 rounded-xl bg-muted/60" />
          <div className="h-8 w-28 rounded-xl bg-muted/60" />
        </div>

        {/* Dropdowns */}
        <div className="flex items-center gap-2.5 flex-wrap ml-auto">
          <div className="h-8 w-36 rounded-xl bg-muted/60 border border-border/60" />
          <div className="h-8 w-32 rounded-xl bg-muted/60 border border-border/60" />
          <div className="h-8 w-24 rounded-xl bg-muted/60 border border-border/60" />
        </div>
      </div>

      {/* Kanban Board (4 Columns) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        {['To Do', 'In Progress', 'In Review', 'Done'].map((colName, colIdx) => (
          <div
            key={colIdx}
            className="bg-card/70 border border-border/80 rounded-3xl p-4 flex flex-col min-h-[420px] space-y-4"
          >
            {/* Column Header */}
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-primary/40" />
                <SkeletonText width="w-20" height="h-3.5" />
                <div className="w-5 h-4 rounded-full bg-muted/60" />
              </div>
            </div>

            {/* Column Tasks */}
            <div className="space-y-3 flex-1">
              {Array.from({ length: colIdx === 0 ? 3 : colIdx === 1 ? 2 : 1 }).map((_, taskIdx) => (
                <div
                  key={taskIdx}
                  className="p-4 rounded-2xl border border-border/70 bg-background/70 space-y-3 shadow-xs"
                >
                  <div className="flex items-center justify-between">
                    <SkeletonBadge className="w-14 h-4" />
                    <SkeletonBadge className="w-16 h-4" />
                  </div>
                  <SkeletonText width="w-full" height="h-4" />
                  <SkeletonText width="w-3/4" height="h-3" />
                  <div className="flex items-center justify-between pt-1 border-t border-border/40">
                    <SkeletonBadge className="w-12 h-4" />
                    <SkeletonText width="w-16" height="h-3" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
