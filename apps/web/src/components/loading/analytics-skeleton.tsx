/**
 * analytics-skeleton.tsx
 * Skeleton for the analytics page (/app/analytics).
 * Mirrors: KPI grid → chart panels → project pipeline list.
 */

import {
  SkeletonText,
  SkeletonStatCard,
  SkeletonCard,
  SkeletonBadge,
  SkeletonButton,
  SkeletonIconBox,
} from './skeleton-primitives'

function ChartPanelSkeleton({ title = true }: { title?: boolean }) {
  return (
    <SkeletonCard className="space-y-4">
      {title && (
        <div className="flex items-center justify-between">
          <SkeletonText width="w-36" height="h-4" />
          <SkeletonButton width="w-20" className="h-7" />
        </div>
      )}
      {/* Fake bar chart */}
      <div className="flex items-end gap-2 h-36 sm:h-44 px-1">
        {Array.from({ length: 12 }).map((_, i) => (
          <div
            key={i}
            className="flex-1 bg-muted rounded-t-md"
            style={{ height: `${20 + Math.floor(((i * 37) % 80) + 15)}%` }}
          />
        ))}
      </div>
      {/* X axis labels */}
      <div className="flex justify-between gap-1 px-1">
        {['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'].map((_, i) => (
          <SkeletonText key={i} width="w-6" height="h-3" />
        ))}
      </div>
    </SkeletonCard>
  )
}

function PipelineRowSkeleton() {
  return (
    <div className="flex items-center gap-3 py-2.5 border-b border-border/40 last:border-0">
      <SkeletonIconBox size="sm" className="rounded-lg" />
      <div className="flex-1 space-y-1.5 min-w-0">
        <SkeletonText width="w-1/2" height="h-3.5" />
        <div className="flex items-center gap-2">
          <SkeletonText width="w-24" height="h-2 rounded-full" />
          <SkeletonText width="w-8" height="h-3" />
        </div>
      </div>
      <SkeletonBadge />
    </div>
  )
}

export function AnalyticsSkeleton() {
  return (
    <div className="space-y-6 max-w-7xl mx-auto animate-pulse">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="space-y-1.5">
          <SkeletonText width="w-24" height="h-6" />
          <SkeletonText width="w-52" height="h-3.5" />
        </div>
        <div className="flex items-center gap-2">
          <SkeletonButton width="w-28" />
          <SkeletonButton width="w-24" />
        </div>
      </div>

      {/* KPI Cards — draggable grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <SkeletonStatCard key={i} />
        ))}
      </div>

      {/* Main Chart Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-5">
        <div className="lg:col-span-2">
          <ChartPanelSkeleton />
        </div>
        <ChartPanelSkeleton title={false} />
      </div>

      {/* Draggable Panels Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5">
        {/* Pipeline Panel */}
        <SkeletonCard className="space-y-1">
          <div className="flex items-center justify-between pb-2 border-b border-border/40">
            <SkeletonText width="w-36" height="h-4" />
            <SkeletonIconBox size="sm" className="w-5 h-5 rounded" />
          </div>
          {Array.from({ length: 5 }).map((_, i) => (
            <PipelineRowSkeleton key={i} />
          ))}
        </SkeletonCard>

        {/* Workload Panel */}
        <SkeletonCard className="space-y-1">
          <div className="flex items-center justify-between pb-2 border-b border-border/40">
            <SkeletonText width="w-28" height="h-4" />
            <SkeletonIconBox size="sm" className="w-5 h-5 rounded" />
          </div>
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 py-2.5 border-b border-border/40 last:border-0">
              <SkeletonText width="w-24" height="h-3.5" />
              <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-muted-foreground/20 rounded-full"
                  style={{ width: `${25 + (i * 15) % 60}%` }}
                />
              </div>
              <SkeletonText width="w-6" height="h-3" />
            </div>
          ))}
        </SkeletonCard>
      </div>
    </div>
  )
}
