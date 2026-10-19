export interface TaskProgressInput {
  progress?: number | null
  status?: string | null
  environment?: string | null
  subtasks?: string | any[] | null
}

/**
 * Normalizes status strings by stripping trailing generated digits and formatting to lowercase
 * e.g. "in_uat_3343" -> "in_uat", "on_hold_9074" -> "on_hold", "IN_PROGRESS" -> "in_progress"
 */
export function normalizeStatusId(statusId?: string | null): string {
  if (!statusId) return ''
  return statusId
    .toLowerCase()
    .replace(/_\d+$/, '')
    .replace(/-/g, '_')
    .trim()
}

/**
 * Matches a task's status with a target status ID (including custom status IDs and aliases)
 */
export function matchTaskStatus(taskStatus?: string | null, targetStatusId?: string | null): boolean {
  if (!taskStatus || !targetStatusId) return false
  if (targetStatusId === 'all') return true

  const rawT = taskStatus.toLowerCase().trim()
  const rawTarget = targetStatusId.toLowerCase().trim()
  if (rawT === rawTarget) return true

  const tNorm = normalizeStatusId(taskStatus)
  const targetNorm = normalizeStatusId(targetStatusId)
  if (tNorm === targetNorm) return true

  // Specific canonical status aliases (strictly preserving distinction between in_dev and in_progress)
  if ((targetNorm === 'in_dev' || targetNorm === 'dev') && (tNorm === 'in_dev' || tNorm === 'dev')) return true
  if ((targetNorm === 'in_progress' || targetNorm === 'progress') && (tNorm === 'in_progress' || tNorm === 'progress')) return true
  if ((targetNorm === 'in_sit' || targetNorm === 'sit') && (tNorm === 'in_sit' || tNorm === 'sit')) return true
  if ((targetNorm === 'in_uat' || targetNorm === 'uat') && (tNorm === 'in_uat' || tNorm === 'uat')) return true
  if ((targetNorm === 'on_hold' || targetNorm === 'hold') && (tNorm === 'on_hold' || tNorm === 'hold')) return true
  if (
    (targetNorm === 'in_review' || targetNorm === 'review' || targetNorm === 'code_review') &&
    (tNorm === 'in_review' || tNorm === 'review' || tNorm === 'code_review')
  ) {
    return true
  }
  if ((targetNorm === 'release' || targetNorm === 'staging') && (tNorm === 'release' || tNorm === 'staging')) return true

  if (
    (targetNorm === 'done' || targetNorm === 'complete' || targetNorm === 'completed' || targetNorm === 'closed') &&
    (tNorm === 'done' || tNorm === 'complete' || tNorm === 'completed' || tNorm === 'closed' || tNorm === 'main')
  ) {
    return true
  }
  if (
    (targetNorm === 'todo' || targetNorm === 'not_started' || targetNorm === 'backlog') &&
    (tNorm === 'todo' || tNorm === 'not_started' || tNorm === 'backlog')
  ) {
    return true
  }

  return false
}

/**
 * Checks if a task is marked complete or deployed to MAIN
 */
export function isCompletedTask(task: TaskProgressInput): boolean {
  const s = (task.status || '').toLowerCase()
  const env = (task.environment || '').toLowerCase()
  return (
    s === 'done' ||
    s === 'complete' ||
    s === 'completed' ||
    s === 'closed' ||
    env === 'main' ||
    s.includes('deploy')
  )
}

/**
 * Checks if a task is in review, SIT, or UAT stage
 */
export function isInReviewTask(task: TaskProgressInput): boolean {
  if (isCompletedTask(task)) return false
  const s = (task.status || '').toLowerCase()
  const env = (task.environment || '').toLowerCase()
  return (
    s.includes('review') ||
    s.includes('sit') ||
    s.includes('uat') ||
    s.includes('qa') ||
    s.includes('test') ||
    env === 'sit' ||
    env === 'uat'
  )
}

/**
 * Checks if a task is actively in progress or development
 */
export function isInProgressTask(task: TaskProgressInput): boolean {
  if (isCompletedTask(task) || isInReviewTask(task)) return false
  const s = (task.status || '').toLowerCase()
  const env = (task.environment || '').toLowerCase()
  return (
    s.includes('progress') ||
    s.includes('dev') ||
    s.includes('active') ||
    env === 'dev'
  )
}

/**
 * Checks if a task is not started / todo / backlog / on hold
 */
export function isTodoTask(task: TaskProgressInput): boolean {
  if (isCompletedTask(task) || isInReviewTask(task) || isInProgressTask(task)) return false
  return true
}

/**
 * Calculates an individual task's progress (0 - 100%)
 */
export function getTaskProgress(task: TaskProgressInput): number {
  // 1. If explicit valid progress > 0 is set on the task, use it
  if (typeof task.progress === 'number' && !isNaN(task.progress) && task.progress > 0) {
    return Math.min(100, Math.max(0, Math.round(task.progress)))
  }

  // 2. Check subtasks completion if subtasks exist
  if (task.subtasks) {
    try {
      const parsed = typeof task.subtasks === 'string' ? JSON.parse(task.subtasks) : task.subtasks
      if (Array.isArray(parsed) && parsed.length > 0) {
        const completed = parsed.filter(
          (s: any) => s && (s.completed || s.status === 'done' || s.status === 'completed')
        ).length
        return Math.round((completed / parsed.length) * 100)
      }
    } catch {}
  }

  // 3. Fallback based on stage / environment / status
  if (isCompletedTask(task)) return 100

  const s = (task.status || '').toLowerCase()
  const env = (task.environment || '').toLowerCase()

  if (s.includes('release') || env === 'release' || env === 'stage' || env === 'staging') {
    return 90
  }
  if (s.includes('uat') || env === 'uat') {
    return 65
  }
  if (s.includes('sit') || env === 'sit' || s.includes('review') || s.includes('qa')) {
    return 60
  }
  if (s.includes('dev') || s.includes('progress') || s.includes('active') || env === 'dev') {
    return 35
  }

  return 0
}

/**
 * Calculates the overall weighted delivery progress across a set of tasks (0 - 100%)
 */
export function calculateWeightedProgress(tasks: TaskProgressInput[]): number {
  if (!tasks || tasks.length === 0) return 0
  const total = tasks.reduce((sum, t) => sum + getTaskProgress(t), 0)
  return Math.min(100, Math.max(0, Math.round(total / tasks.length)))
}

/**
 * Counts how many tasks belong to a specific status ID
 */
export function getTaskCountForStatus(tasks: TaskProgressInput[], statusId: string): number {
  if (!tasks || tasks.length === 0) return 0
  if (statusId === 'all') return tasks.length
  return tasks.filter((t) => matchTaskStatus(t.status, statusId)).length
}
