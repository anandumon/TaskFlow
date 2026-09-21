/**
 * task-details-skeleton.tsx
 * Skeleton for the task detail page (/app/tasks/[id]).
 * Mirrors: Header bar (Back link, title, status & env dropdowns)
 * → 2-column layout (Left: Branch, Subtasks, Files, Discussion; Right: Properties card).
 */

import {
  SkeletonText,
  SkeletonButton,
  SkeletonCard,
  SkeletonBadge,
} from './skeleton-primitives'

export function TaskDetailsSkeleton() {
  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-12 animate-pulse">
      {/* Top Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border/60">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-muted/60" />
          <div className="space-y-1.5">
            <SkeletonBadge className="w-24 h-4" />
            <SkeletonText width="w-64 sm:w-80" height="h-6" />
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <div className="h-8 w-28 rounded-xl bg-muted/60 border border-border/60" />
          <div className="h-8 w-24 rounded-xl bg-muted/60 border border-border/60" />
          <div className="w-8 h-8 rounded-xl bg-muted/60" />
        </div>
      </div>

      {/* Main Layout Grid (2 cols left, 1 col right) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Columns */}
        <div className="lg:col-span-2 space-y-6">
          {/* Git Branch Card */}
          <SkeletonCard className="space-y-4">
            <div className="flex items-center justify-between">
              <SkeletonText width="w-36" height="h-5" />
              <SkeletonBadge className="w-16" />
            </div>
            <div className="h-10 rounded-xl bg-muted/50 border border-border/50" />
          </SkeletonCard>

          {/* Subtasks Card */}
          <SkeletonCard className="space-y-4">
            <div className="flex items-center justify-between">
              <SkeletonText width="w-28" height="h-5" />
              <SkeletonButton width="w-24" className="h-8" />
            </div>
            <div className="space-y-2.5">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-muted/30 border border-border/40">
                  <div className="w-4 h-4 rounded bg-muted/60" />
                  <SkeletonText width="w-48" height="h-3.5" />
                  <div className="ml-auto w-16 h-5 rounded-md bg-muted/50" />
                </div>
              ))}
            </div>
          </SkeletonCard>

          {/* Files Changed Card */}
          <SkeletonCard className="space-y-4">
            <div className="flex items-center justify-between">
              <SkeletonText width="w-32" height="h-5" />
              <SkeletonBadge className="w-12" />
            </div>
            <div className="h-16 rounded-xl bg-muted/30 border border-dashed border-border/60" />
          </SkeletonCard>

          {/* Discussion Card */}
          <SkeletonCard className="space-y-4">
            <SkeletonText width="w-28" height="h-5" />
            <div className="h-20 rounded-xl bg-muted/30 border border-border/50" />
          </SkeletonCard>
        </div>

        {/* Right Column: Task Properties Card */}
        <div className="space-y-6">
          <SkeletonCard className="space-y-5">
            <SkeletonText width="w-32" height="h-5" />
            <div className="space-y-4 pt-2 border-t border-border/40">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="flex items-center justify-between">
                  <SkeletonText width="w-20" height="h-3.5" />
                  <SkeletonText width="w-28" height="h-4" />
                </div>
              ))}
            </div>
          </SkeletonCard>
        </div>
      </div>
    </div>
  )
}
