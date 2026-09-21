/**
 * settings-skeleton.tsx
 * Skeleton for the settings page (/app/settings).
 * Mirrors: tab navigation → profile form → sections.
 */

import {
  SkeletonText,
  SkeletonAvatar,
  SkeletonButton,
  SkeletonCard,
  SkeletonIconBox,
} from './skeleton-primitives'

function FormFieldSkeleton({ labelWidth = 'w-24' }: { labelWidth?: string }) {
  return (
    <div className="space-y-1.5">
      <SkeletonText width={labelWidth} height="h-3.5" />
      <SkeletonText width="w-full" height="h-9 rounded-xl" />
    </div>
  )
}

export function SettingsSkeleton() {
  return (
    <div className="space-y-6 max-w-5xl mx-auto animate-pulse">
      {/* Page Header */}
      <div className="space-y-1.5">
        <SkeletonText width="w-24" height="h-6" />
        <SkeletonText width="w-56" height="h-3.5" />
      </div>

      {/* Tab Navigation — horizontal scroll on mobile */}
      <div className="flex gap-1 overflow-x-auto border-b border-border/50 pb-px">
        {['Profile', 'Appearance', 'Organization', 'Workspace', 'Calendar'].map((_, i) => (
          <SkeletonText
            key={i}
            width="w-24"
            height="h-9 rounded-t-xl"
            className="shrink-0"
          />
        ))}
      </div>

      {/* Profile Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Avatar + identity card */}
        <SkeletonCard className="flex flex-col items-center gap-4 py-6">
          <SkeletonAvatar size="xl" />
          <div className="space-y-2 w-full text-center">
            <SkeletonText width="w-32 mx-auto" height="h-4" />
            <SkeletonText width="w-40 mx-auto" height="h-3" />
          </div>
          <SkeletonButton width="w-32" />
        </SkeletonCard>

        {/* Form fields — 2/3 width */}
        <SkeletonCard className="lg:col-span-2 space-y-4">
          <SkeletonText width="w-32" height="h-5" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormFieldSkeleton labelWidth="w-20" />
            <FormFieldSkeleton labelWidth="w-20" />
          </div>
          <FormFieldSkeleton labelWidth="w-28" />
          <FormFieldSkeleton labelWidth="w-16" />
          <div className="flex justify-end pt-2">
            <SkeletonButton width="w-28" />
          </div>
        </SkeletonCard>
      </div>

      {/* Security section */}
      <SkeletonCard className="space-y-4">
        <div className="flex items-center gap-2">
          <SkeletonIconBox size="sm" className="rounded-lg" />
          <SkeletonText width="w-28" height="h-4" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormFieldSkeleton labelWidth="w-28" />
          <FormFieldSkeleton labelWidth="w-32" />
        </div>
        <div className="flex justify-end">
          <SkeletonButton width="w-36" />
        </div>
      </SkeletonCard>

      {/* Organization list section */}
      <SkeletonCard className="space-y-3">
        <div className="flex items-center justify-between">
          <SkeletonText width="w-36" height="h-4" />
          <SkeletonButton width="w-32" className="h-8" />
        </div>
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-muted/40 border border-border/40">
            <SkeletonAvatar size="md" className="rounded-xl" />
            <div className="flex-1 space-y-1.5 min-w-0">
              <SkeletonText width="w-32" height="h-3.5" />
              <SkeletonText width="w-20" height="h-3" />
            </div>
            <SkeletonText width="w-16" height="h-6 rounded-full" />
          </div>
        ))}
      </SkeletonCard>
    </div>
  )
}
