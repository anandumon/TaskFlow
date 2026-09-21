/**
 * teams-skeleton.tsx
 * Skeleton for the teams & members page (/app/teams).
 * Accurately mirrors: Header (title + new invites, project filter, refresh, invite buttons)
 * → Table Card (toolbar with count and project filter)
 * → Table Rows (User with avatar/grip, Project badge, Role select, Status badge, Action buttons).
 */

import {
  SkeletonText,
  SkeletonAvatar,
  SkeletonButton,
  SkeletonCard,
  SkeletonBadge,
  SkeletonIconBox,
} from './skeleton-primitives'

export function MemberTableRowSkeleton() {
  return (
    <tr className="border-b border-border/40">
      {/* Column 1: User (Grip handle + Avatar + Name & Email) */}
      <td className="p-3 pl-4 sm:pl-6">
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="w-4 h-4 rounded bg-muted/40 shrink-0" />
          <SkeletonAvatar size="md" className="rounded-xl" />
          <div className="space-y-1.5">
            <SkeletonText width="w-28 sm:w-36" height="h-3.5" />
            <SkeletonText width="w-36 sm:w-48" height="h-3" />
          </div>
        </div>
      </td>

      {/* Column 2: Project */}
      <td className="p-3">
        <SkeletonBadge className="w-24 h-5 rounded-full" />
      </td>

      {/* Column 3: Role */}
      <td className="p-3">
        <div className="w-20 h-6 rounded-lg bg-muted/60" />
      </td>

      {/* Column 4: Status */}
      <td className="p-3">
        <SkeletonBadge className="w-16 h-5 rounded-full" />
      </td>

      {/* Column 5: Actions */}
      <td className="p-3 pr-6 text-right">
        <div className="flex items-center justify-end gap-1.5">
          <SkeletonIconBox size="sm" className="w-6 h-6 rounded-md" />
          <SkeletonIconBox size="sm" className="w-6 h-6 rounded-md" />
        </div>
      </td>
    </tr>
  )
}

export function TeamsSkeleton() {
  return (
    <div className="space-y-6 max-w-7xl mx-auto animate-pulse pb-12">
      {/* Header: Title on left, Action buttons on right */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-primary/20" />
            <SkeletonText width="w-64" height="h-7" />
          </div>
          <SkeletonText width="w-80 sm:w-96" height="h-3.5" />
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* New Invites Button */}
          <div className="h-9 w-28 rounded-xl bg-card border border-border/60" />
          {/* Project Box */}
          <div className="h-9 w-36 rounded-xl bg-card border border-border/60" />
          {/* Refresh Button */}
          <div className="h-9 w-9 rounded-xl bg-card border border-border/60" />
          {/* Invite Member Button */}
          <SkeletonButton width="w-32" className="h-9 rounded-xl" />
        </div>
      </div>

      {/* Members Table Card */}
      <div className="bg-card border border-border/80 rounded-2xl overflow-hidden shadow-sm">
        {/* Table Top Toolbar */}
        <div className="p-4 border-b border-border/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-muted/20">
          <div className="flex items-center gap-2">
            <SkeletonText width="w-44" height="h-4" />
            <div className="w-24 h-4 rounded-full bg-muted/60" />
          </div>

          <div className="flex items-center gap-2">
            <SkeletonText width="w-14" height="h-3" />
            <div className="w-36 h-7 rounded-xl bg-background border border-border/60" />
          </div>
        </div>

        {/* Table */}
        <table className="w-full text-left text-xs">
          <thead className="bg-muted/40 border-b border-border text-muted-foreground text-[10px] font-bold uppercase tracking-wider">
            <tr>
              <th className="p-3 pl-4 sm:pl-6">User</th>
              <th className="p-3">Project</th>
              <th className="p-3">Role</th>
              <th className="p-3">Status</th>
              <th className="p-3 pr-6 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/60">
            {Array.from({ length: 6 }).map((_, i) => (
              <MemberTableRowSkeleton key={i} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
