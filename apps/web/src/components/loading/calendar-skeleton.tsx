/**
 * calendar-skeleton.tsx
 * Skeleton for the calendar page (/app/calendar).
 * Mirrors: toolbar → calendar grid → right panel (connections/events).
 */

import {
  SkeletonText,
  SkeletonButton,
  SkeletonCard,
  SkeletonIconBox,
  SkeletonBadge,
} from './skeleton-primitives'

export function CalendarSkeleton() {
  const WEEKS = 5
  const DAYS = 7

  return (
    <div className="space-y-4 max-w-7xl mx-auto animate-pulse h-full">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="space-y-1.5">
          <SkeletonText width="w-32" height="h-6" />
          <SkeletonText width="w-52" height="h-3.5" />
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <SkeletonButton width="w-28" />
        </div>
      </div>

      {/* Calendar Toolbar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3 bg-card border border-border/60 rounded-2xl">
        {/* Navigation */}
        <div className="flex items-center gap-2">
          <SkeletonIconBox size="sm" className="w-8 h-8 rounded-lg" />
          <SkeletonText width="w-32 sm:w-40" height="h-5" />
          <SkeletonIconBox size="sm" className="w-8 h-8 rounded-lg" />
        </div>
        {/* View toggle + Today btn */}
        <div className="flex items-center gap-2">
          <SkeletonButton width="w-16" className="h-8" />
          <div className="flex items-center gap-1 bg-muted rounded-xl p-1">
            {['Month', 'Week', 'Day'].map((_, i) => (
              <SkeletonText key={i} width="w-14" height="h-7 rounded-lg" />
            ))}
          </div>
        </div>
      </div>

      {/* Main Calendar Content */}
      <div className="flex gap-4 flex-col lg:flex-row">
        {/* Calendar Grid */}
        <div className="flex-1 bg-card border border-border/60 rounded-2xl overflow-hidden">
          {/* Day-of-week header */}
          <div className="grid grid-cols-7 border-b border-border/40">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((_, i) => (
              <div
                key={i}
                className="px-2 py-2.5 flex justify-center"
              >
                <SkeletonText width="w-6 sm:w-8" height="h-3" />
              </div>
            ))}
          </div>

          {/* Calendar cells */}
          {Array.from({ length: WEEKS }).map((_, week) => (
            <div
              key={week}
              className={`grid grid-cols-7 ${week < WEEKS - 1 ? 'border-b border-border/30' : ''}`}
            >
              {Array.from({ length: DAYS }).map((_, day) => (
                <div
                  key={day}
                  className={`min-h-[60px] sm:min-h-[90px] p-1.5 space-y-1 ${
                    day < DAYS - 1 ? 'border-r border-border/30' : ''
                  }`}
                >
                  {/* Date number */}
                  <div className="flex justify-end">
                    <SkeletonText width="w-5 h-5 rounded-full" height="h-5" />
                  </div>
                  {/* Event chips — sparse */}
                  {(week + day) % 3 === 0 && (
                    <SkeletonText width="w-full" height="h-5 rounded-md" />
                  )}
                  {(week * day) % 5 === 0 && (
                    <SkeletonText width="w-4/5" height="h-5 rounded-md" />
                  )}
                </div>
              ))}
            </div>
          ))}
        </div>

        {/* Right sidebar panel */}
        <div className="w-full lg:w-72 xl:w-80 space-y-4 shrink-0">
          {/* Calendar connections */}
          <SkeletonCard className="space-y-3">
            <SkeletonText width="w-36" height="h-4" />
            {Array.from({ length: 2 }).map((_, i) => (
              <div key={i} className="flex items-center gap-2.5 p-2.5 rounded-xl bg-muted/40 border border-border/40">
                <SkeletonIconBox size="sm" className="w-8 h-8 rounded-lg" />
                <div className="flex-1 space-y-1.5 min-w-0">
                  <SkeletonText width="w-24" height="h-3.5" />
                  <SkeletonText width="w-32" height="h-3" />
                </div>
                <SkeletonBadge className="w-12" />
              </div>
            ))}
            <SkeletonButton width="w-full" className="h-8" />
          </SkeletonCard>

          {/* Upcoming events */}
          <SkeletonCard className="space-y-2">
            <SkeletonText width="w-28" height="h-4" />
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex gap-2.5 py-2 border-b border-border/30 last:border-0">
                <div className="w-1 rounded-full bg-muted-foreground/30 shrink-0" />
                <div className="space-y-1.5 min-w-0 flex-1">
                  <SkeletonText width={i % 2 === 0 ? 'w-36' : 'w-28'} height="h-3.5" />
                  <SkeletonText width="w-20" height="h-3" />
                </div>
              </div>
            ))}
          </SkeletonCard>
        </div>
      </div>
    </div>
  )
}
