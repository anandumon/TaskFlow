/**
 * project-skeleton.tsx
 * Skeleton for the projects page (/app/projects).
 * Mirrors: header → project cards grid with progress bars.
 */

import {
  SkeletonText,
  SkeletonBadge,
  SkeletonButton,
  SkeletonCard,
  SkeletonIconBox,
  SkeletonAvatar,
} from './skeleton-primitives'

function ProjectCardSkeleton() {
  return (
    <SkeletonCard className="space-y-4">
      {/* Card header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <SkeletonIconBox size="md" className="rounded-xl" />
          <div className="space-y-1.5">
            <SkeletonText width="w-32" height="h-4" />
            <SkeletonBadge className="w-16" />
          </div>
        </div>
        <SkeletonIconBox size="sm" className="w-7 h-7 rounded-lg" />
      </div>

      {/* Description */}
      <div className="space-y-1.5">
        <SkeletonText width="w-full" height="h-3.5" />
        <SkeletonText width="w-4/5" height="h-3.5" />
      </div>

      {/* Environments */}
      <div className="flex items-center gap-1.5 flex-wrap">
        {['DEV', 'SIT', 'UAT', 'MAIN'].map((e, i) => (
          <SkeletonBadge key={i} className="w-8" />
        ))}
      </div>

      {/* Progress */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <SkeletonText width="w-16" height="h-3" />
          <SkeletonText width="w-8" height="h-3" />
        </div>
        <div className="h-2 bg-muted rounded-full overflow-hidden">
          <div className="h-full w-1/2 bg-muted-foreground/25 rounded-full" />
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between pt-1 border-t border-border/40">
        <div className="flex -space-x-1.5">
          {Array.from({ length: 3 }).map((_, i) => (
            <SkeletonAvatar key={i} size="xs" className="border-2 border-card" />
          ))}
        </div>
        <SkeletonText width="w-20" height="h-3" />
      </div>
    </SkeletonCard>
  )
}

export function ProjectSkeleton() {
  return (
    <div className="space-y-6 max-w-7xl mx-auto animate-pulse">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="space-y-1.5">
          <SkeletonText width="w-28" height="h-6" />
          <SkeletonText width="w-48" height="h-3.5" />
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <SkeletonText width="w-48 sm:w-56" height="h-9 rounded-xl" />
          <SkeletonButton width="w-32" />
        </div>
      </div>

      {/* Status filter tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {['All', 'Active', 'In Progress', 'Review', 'Completed'].map((_, i) => (
          <SkeletonButton key={i} width="w-20" className="h-7 shrink-0" />
        ))}
      </div>

      {/* Project Cards Grid: 1 col mobile, 2 col tablet, 3 col desktop */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <ProjectCardSkeleton key={i} />
        ))}
      </div>
    </div>
  )
}
