/**
 * app-shell-skeleton.tsx
 * Full-page app shell skeleton shown during initial auth/load.
 * Mirrors the exact layout of the main app: fixed sidebar + header + main content area.
 */

import {
  SkeletonText,
  SkeletonAvatar,
  SkeletonIconBox,
  SkeletonStatCard,
  SkeletonRow,
  SkeletonCard,
} from './skeleton-primitives'

export function AppShellSkeleton() {
  return (
    <div className="flex h-screen w-screen overflow-hidden bg-background">
      {/* ── Sidebar Skeleton ─────────────────────────────────── */}
      <aside className="hidden lg:flex w-64 h-screen bg-sidebar border-r border-border/60 flex-col justify-between shrink-0">
        {/* Top */}
        <div>
          {/* Brand + Org */}
          <div className="p-4 border-b border-border/50 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <SkeletonIconBox size="sm" />
                <SkeletonText width="w-20" height="h-4" />
              </div>
              <SkeletonText width="w-16" height="h-5" className="rounded-full" />
            </div>
            {/* Org card */}
            <div className="flex items-center gap-2.5 p-2.5 rounded-2xl bg-card/60 border border-border/70">
              <SkeletonAvatar size="sm" className="rounded-xl" />
              <div className="flex-1 space-y-1.5 min-w-0">
                <SkeletonText width="w-24" height="h-3" />
                <SkeletonText width="w-14" height="h-2.5" />
              </div>
            </div>
          </div>

          {/* Workspace */}
          <div className="px-4 pt-3 pb-1 space-y-2">
            <SkeletonText width="w-20" height="h-3" />
            <div className="flex items-center gap-2.5 p-2.5 rounded-2xl bg-card/60 border border-border/70">
              <SkeletonIconBox size="sm" className="rounded-xl" />
              <div className="flex-1 space-y-1.5 min-w-0">
                <SkeletonText width="w-24" height="h-3" />
                <SkeletonText width="w-16" height="h-2.5" />
              </div>
            </div>
          </div>

          {/* Nav links */}
          <nav className="p-3 space-y-1">
            {Array.from({ length: 7 }).map((_, i) => (
              <div
                key={i}
                className={`flex items-center gap-3 px-3 py-2 rounded-xl ${
                  i === 0 ? 'bg-primary/10' : ''
                }`}
              >
                <SkeletonIconBox size="sm" className="rounded-lg w-4 h-4" />
                <SkeletonText
                  width={i === 0 ? 'w-20' : i % 2 === 0 ? 'w-24' : 'w-28'}
                  height="h-3"
                />
              </div>
            ))}
          </nav>
        </div>

        {/* Bottom */}
        <div className="p-3 border-t border-border/50 space-y-2">
          <div className="p-2.5 rounded-xl bg-primary/5 border border-primary/15 flex items-center gap-2">
            <SkeletonIconBox size="sm" className="w-3.5 h-3.5 rounded" />
            <SkeletonText width="w-24" height="h-3" />
          </div>
          <div className="flex items-center gap-2 px-2 py-1">
            <SkeletonAvatar size="sm" />
            <div className="flex-1 space-y-1.5 min-w-0">
              <SkeletonText width="w-20" height="h-3" />
              <SkeletonText width="w-28" height="h-2.5" />
            </div>
          </div>
        </div>
      </aside>

      {/* ── Main Area ────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Header Skeleton */}
        <header className="h-14 border-b border-border/60 px-4 sm:px-6 flex items-center justify-between gap-4 bg-background/80 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            {/* Mobile menu button placeholder */}
            <SkeletonIconBox size="sm" className="lg:hidden w-8 h-8 rounded-lg" />
            <SkeletonText width="w-32 sm:w-48" height="h-4" />
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <SkeletonText width="hidden sm:block w-48 lg:w-64" height="h-8 rounded-xl" />
            <SkeletonIconBox size="sm" className="w-8 h-8 rounded-xl" />
            <SkeletonIconBox size="sm" className="w-8 h-8 rounded-xl" />
            <SkeletonAvatar size="sm" />
          </div>
        </header>

        {/* Content Area Skeleton */}
        <main className="flex-1 overflow-y-auto bg-background/50 p-4 sm:p-6">
          <div className="space-y-6 max-w-7xl mx-auto animate-pulse">
            {/* Page banner */}
            <div className="p-6 rounded-3xl bg-card border border-border/60 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-2">
                <SkeletonText width="w-24" height="h-3" />
                <SkeletonText width="w-48" height="h-7" />
                <SkeletonText width="w-64" height="h-3.5" />
              </div>
              <div className="flex gap-2">
                <SkeletonText width="w-24" height="h-9 rounded-xl" />
                <SkeletonText width="w-24" height="h-9 rounded-xl" />
              </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <SkeletonStatCard key={i} />
              ))}
            </div>

            {/* Two-column content */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
              <SkeletonCard className="lg:col-span-2">
                {Array.from({ length: 5 }).map((_, i) => (
                  <SkeletonRow key={i} />
                ))}
              </SkeletonCard>
              <SkeletonCard>
                <SkeletonText width="w-24" height="h-4" />
                {Array.from({ length: 4 }).map((_, i) => (
                  <SkeletonRow key={i} showTrailing={false} />
                ))}
              </SkeletonCard>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
