/**
 * dashboard-skeleton.tsx
 * Skeleton for the home/dashboard page (/app/home).
 * Mirrors: welcome banner → KPI grid → tasks list → projects panel.
 */

import {
  SkeletonText,
  SkeletonAvatar,
  SkeletonStatCard,
  SkeletonRow,
  SkeletonCard,
  SkeletonButton,
  SkeletonBadge,
  SkeletonIconBox,
} from './skeleton-primitives'

export function DashboardSkeleton() {
  return (
    <div className="space-y-6 max-w-7xl mx-auto animate-pulse">
      {/* Welcome Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 sm:p-6 rounded-3xl bg-card border border-border/60">
        <div className="space-y-2.5 flex-1">
          <SkeletonText width="w-28" height="h-3" />
          <SkeletonText width="w-56 sm:w-72" height="h-7" />
          <SkeletonText width="w-40 sm:w-60" height="h-3.5" />
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <SkeletonButton width="w-28" />
          <SkeletonButton width="w-28" />
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <SkeletonStatCard key={i} />
        ))}
      </div>

      {/* Sprint Progress Bar */}
      <SkeletonCard className="space-y-3">
        <div className="flex items-center justify-between">
          <SkeletonText width="w-32" height="h-4" />
          <SkeletonText width="w-12" height="h-4" />
        </div>
        <div className="h-2.5 bg-muted rounded-full overflow-hidden">
          <div className="h-full w-2/3 bg-muted-foreground/20 rounded-full" />
        </div>
        <div className="flex gap-4 flex-wrap">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-muted-foreground/30" />
              <SkeletonText width="w-16" height="h-3" />
            </div>
          ))}
        </div>
      </SkeletonCard>

      {/* Tasks + Projects Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-5">
        {/* Tasks list — 2/3 width on large */}
        <SkeletonCard className="lg:col-span-2 space-y-1">
          <div className="flex items-center justify-between pb-2 border-b border-border/40">
            <SkeletonText width="w-28" height="h-4" />
            <SkeletonButton width="w-20" className="h-7" />
          </div>
          {Array.from({ length: 7 }).map((_, i) => (
            <div
              key={i}
              className="flex items-center gap-3 py-2.5 border-b border-border/30 last:border-0"
            >
              {/* Checkbox */}
              <div className="w-4 h-4 rounded border border-border bg-muted shrink-0" />
              {/* Task content */}
              <div className="flex-1 space-y-1.5 min-w-0">
                <SkeletonText
                  width={i % 3 === 0 ? 'w-full' : i % 3 === 1 ? 'w-4/5' : 'w-3/5'}
                  height="h-3.5"
                />
                <div className="flex items-center gap-2">
                  <SkeletonBadge className="w-10" />
                  <SkeletonBadge className="w-12" />
                  <SkeletonText width="w-16" height="h-3" />
                </div>
              </div>
              {/* Avatar + date */}
              <div className="flex items-center gap-2 shrink-0">
                <SkeletonAvatar size="xs" />
                <SkeletonText width="w-12" height="h-3" />
              </div>
            </div>
          ))}
        </SkeletonCard>

        {/* Projects panel — 1/3 width */}
        <SkeletonCard className="space-y-3">
          <div className="flex items-center justify-between pb-1">
            <SkeletonText width="w-20" height="h-4" />
            <SkeletonText width="w-8" height="h-4" className="rounded-full" />
          </div>
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="space-y-2 p-3 rounded-xl bg-muted/40 border border-border/40">
              <div className="flex items-center gap-2">
                <SkeletonIconBox size="sm" className="rounded-lg" />
                <SkeletonText width={i % 2 === 0 ? 'w-28' : 'w-20'} height="h-3.5" />
              </div>
              <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-muted-foreground/25 rounded-full"
                  style={{ width: `${30 + i * 18}%` }}
                />
              </div>
              <div className="flex items-center justify-between">
                <SkeletonText width="w-12" height="h-3" />
                <SkeletonBadge className="w-10" />
              </div>
            </div>
          ))}
        </SkeletonCard>
      </div>
    </div>
  )
}
