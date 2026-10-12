/**
 * docs-skeleton.tsx
 * Skeleton loading state for Knowledge Base & Docs (/app/docs).
 * Mirrors: doc navigation header + filter chips + responsive doc cards grid.
 */

import {
  SkeletonText,
  SkeletonBadge,
  SkeletonButton,
  SkeletonCard,
  SkeletonIconBox,
  SkeletonAvatar,
} from './skeleton-primitives'

function DocCardSkeleton() {
  return (
    <SkeletonCard className="space-y-4 hover:border-primary/40 transition-colors">
      {/* Header: Doc icon + title + menu */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <SkeletonIconBox size="md" className="rounded-xl" />
          <div className="space-y-1.5">
            <SkeletonText width="w-36" height="h-4" />
            <SkeletonBadge className="w-20" />
          </div>
        </div>
        <SkeletonIconBox size="sm" className="w-7 h-7 rounded-lg" />
      </div>

      {/* Snippet / preview body */}
      <div className="space-y-2 pt-1">
        <SkeletonText width="w-full" height="h-3.5" />
        <SkeletonText width="w-11/12" height="h-3.5" />
        <SkeletonText width="w-3/5" height="h-3.5" />
      </div>

      {/* Footer: Author avatar, timestamp, reading badge */}
      <div className="flex items-center justify-between pt-3 border-t border-border/40">
        <div className="flex items-center gap-2">
          <SkeletonAvatar size="xs" />
          <SkeletonText width="w-20" height="h-3" />
        </div>
        <SkeletonText width="w-16" height="h-3" />
      </div>
    </SkeletonCard>
  )
}

export function DocsSkeleton() {
  return (
    <div
      className="max-w-7xl mx-auto p-6 space-y-6"
      aria-busy="true"
      aria-label="Loading documents"
    >
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1.5">
          <SkeletonText width="w-44" height="h-7" />
          <SkeletonText width="w-72" height="h-4" />
        </div>
        <div className="flex items-center gap-3">
          <div className="h-9 w-48 bg-muted/60 rounded-xl motion-safe:animate-pulse hidden sm:block" />
          <SkeletonButton width="w-32" />
        </div>
      </div>

      {/* Filter / Category Tags */}
      <div className="flex items-center gap-2 pb-1 overflow-x-auto">
        {['All Docs', 'Product Specs', 'Engineering', 'Meeting Notes', 'Architecture'].map(
          (_, i) => (
            <div
              key={i}
              className="h-8 px-4 rounded-xl bg-card border border-border/60 flex items-center motion-safe:animate-pulse"
            >
              <SkeletonText width="w-16" height="h-3" />
            </div>
          )
        )}
      </div>

      {/* Documents Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {Array.from({ length: 6 }).map((_, i) => (
          <DocCardSkeleton key={i} />
        ))}
      </div>
    </div>
  )
}
