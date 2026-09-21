/**
 * task-list-skeleton.tsx
 * Skeleton for the tasks board page (/app/tasks).
 * Mirrors: header + filters → view tabs → task card grid/list.
 */

import {
  SkeletonText,
  SkeletonAvatar,
  SkeletonBadge,
  SkeletonButton,
  SkeletonCard,
  SkeletonIconBox,
} from './skeleton-primitives'

function TaskCardSkeleton({ compact = false }: { compact?: boolean }) {
  return (
    <div
      className={`bg-card border border-border/60 rounded-2xl p-3.5 space-y-2.5 ${
        compact ? 'sm:flex sm:items-center sm:gap-3 sm:space-y-0' : ''
      }`}
    >
      {/* Title row */}
      <div className="flex items-start gap-2.5">
        <div className="w-4 h-4 mt-0.5 rounded border border-border bg-muted shrink-0" />
        <div className="flex-1 space-y-1.5 min-w-0">
          <SkeletonText width="w-full" height="h-3.5" />
          {!compact && <SkeletonText width="w-3/4" height="h-3" />}
        </div>
      </div>
      {/* Metadata row */}
      <div className="flex items-center gap-2 flex-wrap pl-6">
        <SkeletonBadge className="w-14" />
        <SkeletonBadge className="w-10" />
        <SkeletonBadge className="w-12" />
        {!compact && <SkeletonText width="w-16" height="h-3" className="ml-auto" />}
      </div>
      {/* Footer row */}
      {!compact && (
        <div className="flex items-center justify-between pl-6">
          <div className="flex -space-x-1">
            <SkeletonAvatar size="xs" />
            <SkeletonAvatar size="xs" />
          </div>
          <SkeletonText width="w-14" height="h-3" />
        </div>
      )}
    </div>
  )
}

export function TaskListSkeleton() {
  return (
    <div className="space-y-5 max-w-7xl mx-auto animate-pulse">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="space-y-1.5">
          <SkeletonText width="w-40" height="h-6" />
          <SkeletonText width="w-56" height="h-3.5" />
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <SkeletonButton width="w-28" />
          <SkeletonButton width="w-28" />
        </div>
      </div>

      {/* Filter / Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
        <SkeletonText width="w-full sm:w-64" height="h-9 rounded-xl" />
        <div className="flex items-center gap-2">
          <SkeletonButton width="w-24" className="h-9" />
          <SkeletonButton width="w-24" className="h-9" />
          <SkeletonButton width="w-24" className="h-9" />
        </div>
        {/* View toggle */}
        <div className="flex items-center gap-1 ml-auto">
          <SkeletonIconBox size="sm" className="w-8 h-8 rounded-lg" />
          <SkeletonIconBox size="sm" className="w-8 h-8 rounded-lg" />
        </div>
      </div>

      {/* View Tabs */}
      <div className="flex gap-1 border-b border-border/50 pb-px overflow-x-auto">
        {['All Tasks', 'Todo', 'In Progress', 'In Review', 'Done'].map((_, i) => (
          <SkeletonText
            key={i}
            width={i === 0 ? 'w-16' : 'w-20'}
            height="h-8 rounded-t-lg"
            className="shrink-0"
          />
        ))}
      </div>

      {/* Task Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <TaskCardSkeleton key={i} />
        ))}
      </div>

      {/* Kanban hint: columns */}
      <SkeletonCard className="hidden md:block">
        <div className="flex items-center justify-between mb-3">
          <SkeletonText width="w-28" height="h-4" />
          <SkeletonText width="w-16" height="h-3.5" />
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
          {['Todo', 'In Progress', 'In Review', 'Release', 'Done'].map((_, i) => (
            <div key={i} className="space-y-1.5">
              <SkeletonText width="w-full" height="h-6 rounded-lg" />
              <SkeletonText width="w-full" height="h-16 rounded-xl" />
              <SkeletonText width="w-full" height="h-16 rounded-xl" />
            </div>
          ))}
        </div>
      </SkeletonCard>
    </div>
  )
}
