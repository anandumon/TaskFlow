/**
 * index.ts
 * Barrel export for all TaskFlow skeleton loading components.
 * Import from '@/components/loading' anywhere in the app.
 */

// Primitives
export * from './skeleton-primitives'

// Page-level skeletons
export { AppShellSkeleton } from './app-shell-skeleton'
export { DashboardSkeleton } from './dashboard-skeleton'
export { TaskListSkeleton } from './task-list-skeleton'
export { TaskDetailsSkeleton } from './task-details-skeleton'
export { ProjectSkeleton } from './project-skeleton'
export { ProjectDetailsSkeleton } from './project-details-skeleton'
export { AnalyticsSkeleton } from './analytics-skeleton'
export { CalendarSkeleton } from './calendar-skeleton'
export { SettingsSkeleton } from './settings-skeleton'
export { TeamsSkeleton, MemberTableRowSkeleton } from './teams-skeleton'
