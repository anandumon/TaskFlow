/**
 * messages-skeleton.tsx
 * Skeleton loading state for the Chat & Realtime Messaging page (/app/messages).
 * Mirrors: sidebar channel/DM list + active message stream + composer input.
 */

import {
  SkeletonText,
  SkeletonAvatar,
  SkeletonButton,
  SkeletonIconBox,
} from './skeleton-primitives'

export function MessagesSkeleton() {
  return (
    <div
      className="flex h-[calc(100vh-4rem)] w-full overflow-hidden bg-background"
      aria-busy="true"
      aria-label="Loading messages"
    >
      {/* ─── Left Sidebar: Channels & Conversations ─── */}
      <div className="w-80 shrink-0 border-r border-border/70 flex flex-col bg-card/40">
        {/* Header & Search */}
        <div className="p-4 border-b border-border/60 space-y-3">
          <div className="flex items-center justify-between">
            <SkeletonText width="w-24" height="h-6" />
            <SkeletonIconBox size="sm" className="rounded-lg" />
          </div>
          <div className="h-9 w-full bg-muted/60 rounded-xl motion-safe:animate-pulse" />
        </div>

        {/* Conversation List */}
        <div className="flex-1 overflow-y-auto p-3 space-y-4">
          {/* Channels Section */}
          <div className="space-y-2">
            <div className="px-2">
              <SkeletonText width="w-20" height="h-3" />
            </div>
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={`ch-${i}`}
                className="flex items-center gap-2.5 px-3 py-2 rounded-xl bg-card/60 border border-border/30"
              >
                <div className="w-5 h-5 rounded-md bg-muted motion-safe:animate-pulse shrink-0" />
                <SkeletonText width="w-28" height="h-4" />
              </div>
            ))}
          </div>

          {/* Direct Messages Section */}
          <div className="space-y-2 pt-2">
            <div className="px-2">
              <SkeletonText width="w-28" height="h-3" />
            </div>
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={`dm-${i}`}
                className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-muted/30 transition-colors"
              >
                <div className="relative shrink-0">
                  <SkeletonAvatar size="md" />
                  <div className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-muted-foreground/30 ring-2 ring-card" />
                </div>
                <div className="min-w-0 flex-1 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <SkeletonText width="w-24" height="h-3.5" />
                    <SkeletonText width="w-8" height="h-2.5" />
                  </div>
                  <SkeletonText width="w-36" height="h-3" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ─── Right Panel: Chat Thread & Composer ─── */}
      <div className="flex-1 flex flex-col min-w-0 bg-background/50">
        {/* Chat Thread Header */}
        <div className="h-16 px-6 border-b border-border/60 flex items-center justify-between bg-card/30">
          <div className="flex items-center gap-3">
            <SkeletonAvatar size="md" />
            <div className="space-y-1">
              <SkeletonText width="w-32" height="h-4" />
              <SkeletonText width="w-20" height="h-3" />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <SkeletonIconBox size="md" className="rounded-xl" />
            <SkeletonIconBox size="md" className="rounded-xl" />
            <SkeletonIconBox size="md" className="rounded-xl" />
          </div>
        </div>

        {/* Message Bubble History */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Incoming message */}
          <div className="flex items-start gap-3 max-w-lg">
            <SkeletonAvatar size="sm" className="mt-1" />
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <SkeletonText width="w-20" height="h-3" />
                <SkeletonText width="w-12" height="h-2.5" />
              </div>
              <div className="p-3.5 rounded-2xl rounded-tl-xs bg-card border border-border/60 space-y-2">
                <SkeletonText width="w-72" height="h-3.5" />
                <SkeletonText width="w-48" height="h-3.5" />
              </div>
            </div>
          </div>

          {/* Outgoing message */}
          <div className="flex items-start justify-end gap-3">
            <div className="space-y-1.5 items-end flex flex-col">
              <div className="flex items-center gap-2">
                <SkeletonText width="w-12" height="h-2.5" />
                <SkeletonText width="w-16" height="h-3" />
              </div>
              <div className="p-3.5 rounded-2xl rounded-tr-xs bg-primary/15 border border-primary/20 space-y-2">
                <SkeletonText width="w-64" height="h-3.5" />
                <SkeletonText width="w-40" height="h-3.5" />
              </div>
            </div>
          </div>

          {/* Another incoming message */}
          <div className="flex items-start gap-3 max-w-md">
            <SkeletonAvatar size="sm" className="mt-1" />
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <SkeletonText width="w-24" height="h-3" />
                <SkeletonText width="w-12" height="h-2.5" />
              </div>
              <div className="p-3.5 rounded-2xl rounded-tl-xs bg-card border border-border/60 space-y-1.5">
                <SkeletonText width="w-56" height="h-3.5" />
              </div>
            </div>
          </div>
        </div>

        {/* Composer Bar */}
        <div className="p-4 border-t border-border/60 bg-card/20">
          <div className="flex items-center gap-3 p-2 rounded-2xl bg-card border border-border/70">
            <SkeletonIconBox size="sm" className="rounded-lg shrink-0" />
            <div className="h-5 flex-1 bg-muted/40 rounded-md motion-safe:animate-pulse" />
            <SkeletonButton width="w-16" className="h-8 rounded-lg" />
          </div>
        </div>
      </div>
    </div>
  )
}
