/**
 * skeleton-primitives.tsx
 * Core reusable skeleton loading primitives for TaskFlow.
 * Colors use semantic CSS custom properties so they adapt to light/dark themes automatically.
 * The `motion-safe:animate-pulse` class respects `prefers-reduced-motion`.
 */

import { cn } from '@/lib/utils'

// ─── Base Skeleton ──────────────────────────────────────────────────────────

interface SkeletonBaseProps {
  className?: string
}

function SkeletonBase({ className }: SkeletonBaseProps) {
  return (
    <div
      className={cn(
        'bg-muted motion-safe:animate-pulse rounded-md',
        className
      )}
    />
  )
}

// ─── Text Line ──────────────────────────────────────────────────────────────

interface SkeletonTextProps {
  className?: string
  /** Width in Tailwind units or arbitrary value, e.g. 'w-32', 'w-3/4' */
  width?: string
  /** Height of the text line placeholder */
  height?: string
}

export function SkeletonText({
  className,
  width = 'w-full',
  height = 'h-4',
}: SkeletonTextProps) {
  return <SkeletonBase className={cn(height, width, 'rounded-full', className)} />
}

// ─── Avatar / Circle ────────────────────────────────────────────────────────

interface SkeletonAvatarProps {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
  className?: string
}

const avatarSizeMap: Record<NonNullable<SkeletonAvatarProps['size']>, string> = {
  xs: 'w-5 h-5',
  sm: 'w-7 h-7',
  md: 'w-9 h-9',
  lg: 'w-11 h-11',
  xl: 'w-14 h-14',
}

export function SkeletonAvatar({ size = 'md', className }: SkeletonAvatarProps) {
  return (
    <SkeletonBase
      className={cn('rounded-full shrink-0', avatarSizeMap[size], className)}
    />
  )
}

// ─── Button ─────────────────────────────────────────────────────────────────

interface SkeletonButtonProps {
  className?: string
  width?: string
}

export function SkeletonButton({ className, width = 'w-24' }: SkeletonButtonProps) {
  return <SkeletonBase className={cn('h-9 rounded-xl', width, className)} />
}

// ─── Badge / Pill ───────────────────────────────────────────────────────────

interface SkeletonBadgeProps {
  className?: string
}

export function SkeletonBadge({ className }: SkeletonBadgeProps) {
  return <SkeletonBase className={cn('h-5 w-14 rounded-full', className)} />
}

// ─── Card Container ─────────────────────────────────────────────────────────

interface SkeletonCardProps {
  children: React.ReactNode
  className?: string
}

export function SkeletonCard({ children, className }: SkeletonCardProps) {
  return (
    <div
      className={cn(
        'bg-card border border-border/60 rounded-2xl p-4 space-y-3',
        className
      )}
    >
      {children}
    </div>
  )
}

// ─── Icon Box ───────────────────────────────────────────────────────────────

interface SkeletonIconBoxProps {
  className?: string
  size?: 'sm' | 'md' | 'lg'
}

const iconBoxSizeMap: Record<NonNullable<SkeletonIconBoxProps['size']>, string> = {
  sm: 'w-7 h-7',
  md: 'w-9 h-9',
  lg: 'w-11 h-11',
}

export function SkeletonIconBox({ size = 'md', className }: SkeletonIconBoxProps) {
  return (
    <SkeletonBase
      className={cn('rounded-xl shrink-0', iconBoxSizeMap[size], className)}
    />
  )
}

// ─── Row (for list items) ───────────────────────────────────────────────────

interface SkeletonRowProps {
  /** Show leading avatar/icon */
  showLeading?: boolean
  /** Show trailing element */
  showTrailing?: boolean
  className?: string
}

export function SkeletonRow({
  showLeading = true,
  showTrailing = true,
  className,
}: SkeletonRowProps) {
  return (
    <div className={cn('flex items-center gap-3 py-2', className)}>
      {showLeading && <SkeletonAvatar size="sm" />}
      <div className="flex-1 space-y-2 min-w-0">
        <SkeletonText width="w-2/3" height="h-3.5" />
        <SkeletonText width="w-1/3" height="h-3" />
      </div>
      {showTrailing && <SkeletonBadge />}
    </div>
  )
}

// ─── Stat / KPI Card ─────────────────────────────────────────────────────────

export function SkeletonStatCard({ className }: { className?: string }) {
  return (
    <SkeletonCard className={cn('space-y-4', className)}>
      <div className="flex items-center justify-between">
        <SkeletonText width="w-24" height="h-3.5" />
        <SkeletonIconBox size="sm" />
      </div>
      <SkeletonText width="w-16" height="h-7" />
      <SkeletonText width="w-32" height="h-3" />
    </SkeletonCard>
  )
}

// ─── Table Row ───────────────────────────────────────────────────────────────

interface SkeletonTableRowProps {
  columns?: number
  className?: string
}

export function SkeletonTableRow({ columns = 4, className }: SkeletonTableRowProps) {
  return (
    <div className={cn('flex items-center gap-4 px-4 py-3 border-b border-border/40', className)}>
      {Array.from({ length: columns }).map((_, i) => (
        <SkeletonText
          key={i}
          className="flex-1"
          height="h-3.5"
          width={i === 0 ? 'w-full' : i === columns - 1 ? 'w-16' : 'w-full'}
        />
      ))}
    </div>
  )
}
