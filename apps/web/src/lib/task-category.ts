/**
 * Unified Task Categorization Utility
 *
 * Rules:
 * 1. User choice is STRICTLY honored. If task.tag is 'Feature', it is ALWAYS a Feature,
 *    even if the title mentions words like 'fix', 'bug', or 'vulnerability'.
 * 2. If task.tag is 'Bug Fix' (or 'bug'), it is ALWAYS a Bug Fix.
 * 3. If task.tag is custom (e.g. 'Backend', 'Frontend', 'DevOps', 'Design'), it preserves its custom tag.
 * 4. Only if task.tag is missing or empty do we fall back to title keyword heuristics.
 */

export type DeliverableCategory = 'Feature' | 'Bug Fix' | 'Custom'

export const DELIVERABLE_CATEGORIES = [
  'Feature',
  'Bug Fix',
  'Backend',
  'Frontend',
  'DevOps',
  'Design',
  'Architecture',
  'Documentation',
  'Testing / QA',
  'Maintenance',
]

/**
 * Intelligent category detection from task title/description.
 * Used for real-time suggestions in creation modals when user hasn't manually selected a category.
 *
 * Scenarios:
 * 1. Bug Fix: repairs, defects, crashes, security fixes, error corrections
 * 2. Custom: DevOps, infrastructure, tests, documentation, refactoring
 * 3. Feature: new capabilities, screens, enhancements, integrations
 */
export function detectCategoryFromTitle(title: string): 'Feature' | 'Bug Fix' | 'Custom' {
  if (!title || !title.trim()) return 'Feature'
  const lower = title.trim().toLowerCase()

  // Scenario 1: Bug / Fix keywords
  const bugKeywords = [
    'fix', 'bug', 'error', 'issue', 'crash', 'defect', 'vulnerability',
    'exception', 'patch', 'broken', 'fail', 'failure', 'leak', 'hotfix',
    'resolve', 'problem', 'flaw', 'hang', 'infinite loop', 'regression'
  ]
  const hasBugWord = bugKeywords.some((kw) => {
    // Word boundary match or prefix match like fix: / bug:
    const regex = new RegExp(`(^|\\W)${kw}(\\W|$)`, 'i')
    return regex.test(lower)
  })
  if (hasBugWord) {
    return 'Bug Fix'
  }

  // Scenario 2: Custom / Ops / QA / Refactor / Docs
  const customKeywords = [
    'refactor', 'clean', 'cleanup', 'optimize', 'perf', 'docs', 'documentation',
    'readme', 'test', 'tests', 'qa', 'ci', 'cd', 'pipeline', 'deploy',
    'deployment', 'docker', 'k8s', 'kubernetes', 'config', 'setup', 'migration',
    'script', 'chore', 'audit', 'sync', 'upgrade dep', 'dependency'
  ]
  const hasCustomWord = customKeywords.some((kw) => {
    const regex = new RegExp(`(^|\\W)${kw}(\\W|$)`, 'i')
    return regex.test(lower)
  })
  if (hasCustomWord) {
    return 'Custom'
  }

  // Scenario 3: Feature (Default for new features, additions, implementations)
  return 'Feature'
}

/**
 * Check if a task is classified as a Bug / Fix.
 * Explicit tag ALWAYS overrides title keywords.
 */
export function isBugTask(t: { tag?: string; title?: string }): boolean {
  const tag = (t.tag || '').trim().toLowerCase()

  // 1. Explicit Feature tag: NEVER a bug
  if (tag === 'feature' || tag === 'feat' || tag.startsWith('feat')) {
    return false
  }

  // 2. Explicit Bug tag
  if (
    tag === 'bug' ||
    tag === 'bug fix' ||
    tag === 'bugfix' ||
    tag === 'defect' ||
    tag === 'hotfix' ||
    tag.startsWith('bug')
  ) {
    return true
  }

  // 3. Explicit known custom tag: not a bug
  if (
    tag &&
    tag !== 'general' &&
    tag !== 'task' &&
    tag !== 'custom' &&
    tag !== 'none' &&
    tag !== 'all'
  ) {
    return false
  }

  // 4. Fallback only if no explicit tag: scan title
  const title = (t.title || '').toLowerCase()
  return (
    title.startsWith('fix') ||
    title.startsWith('bug') ||
    title.includes('bug fix') ||
    title.includes('hotfix') ||
    title.includes('vulnerability') ||
    /\b(fix|bug|error|crash|defect|patch|issue)\b/i.test(title)
  )
}

/**
 * Check if a task is classified as a Feature.
 */
export function isFeatureTask(t: { tag?: string; title?: string }): boolean {
  const tag = (t.tag || '').trim().toLowerCase()

  // 1. Explicit Feature tag
  if (tag === 'feature' || tag === 'feat' || tag.startsWith('feat')) {
    return true
  }

  // 2. Explicit Bug tag
  if (
    tag === 'bug' ||
    tag === 'bug fix' ||
    tag === 'bugfix' ||
    tag === 'defect' ||
    tag === 'hotfix' ||
    tag.startsWith('bug')
  ) {
    return false
  }

  // 3. Explicit custom tag
  if (
    tag &&
    tag !== 'general' &&
    tag !== 'task' &&
    tag !== 'custom' &&
    tag !== 'none' &&
    tag !== 'all'
  ) {
    return false
  }

  // 4. Fallback if no explicit tag
  return !isBugTask(t)
}

/**
 * Styling helper for task tags
 */
export function getTagStyle(tag?: string): string {
  if (!tag) return 'bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/30'
  const lower = tag.trim().toLowerCase()

  if (lower === 'bug' || lower === 'bug fix' || lower === 'bugfix' || lower === 'defect') {
    return 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30'
  }
  if (lower === 'feature' || lower === 'feat') {
    return 'bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/30'
  }
  if (lower === 'frontend') {
    return 'bg-sky-500/15 text-sky-600 dark:text-sky-400 border border-sky-500/30'
  }
  if (lower === 'backend') {
    return 'bg-purple-500/15 text-purple-600 dark:text-purple-400 border border-purple-500/30'
  }
  if (lower === 'devops') {
    return 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
  }
  if (lower === 'design') {
    return 'bg-pink-500/15 text-pink-600 dark:text-pink-400 border border-pink-500/30'
  }
  if (lower === 'architecture') {
    return 'bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border border-indigo-500/30'
  }
  if (lower === 'documentation') {
    return 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30'
  }
  if (lower === 'testing / qa' || lower === 'qa') {
    return 'bg-teal-500/15 text-teal-600 dark:text-teal-400 border border-teal-500/30'
  }

  return 'bg-slate-500/15 text-slate-700 dark:text-slate-300 border border-slate-500/30'
}

/**
 * Maps a task status to its corresponding environment according to:
 * - 'in dev' / 'in_dev' -> 'DEV'
 * - 'in sit' / 'in_sit' -> 'SIT'
 * - 'in uat' / 'in_uat' -> 'UAT'
 * - 'release' -> 'RELEASE'
 * - 'complete' / 'completed' / 'done' -> 'MAIN'
 * - For others (e.g. 'to do', 'on hold', 'in progress') -> shows the same as the status name (e.g. 'TO DO')
 */
export function getEnvForStatus(status?: string, fallbackEnv?: string): string {
  if (!status) return fallbackEnv || 'DEV'
  const s = status.toLowerCase().trim()

  if (s === 'in dev' || s === 'in_dev' || s === 'dev' || s.includes('dev')) return 'DEV'
  if (s === 'in sit' || s === 'in_sit' || s === 'sit' || s.includes('sit')) return 'SIT'
  if (s === 'in uat' || s === 'in_uat' || s === 'uat' || s.includes('uat')) return 'UAT'
  if (s === 'release' || s.includes('release')) return 'RELEASE'
  if (
    s === 'complete' ||
    s === 'completed' ||
    s === 'done' ||
    s === 'closed' ||
    s.includes('complete')
  ) {
    return 'MAIN'
  }
  if (s === 'todo' || s === 'to do') return 'TO DO'
  if (s === 'in_progress' || s === 'in progress') return 'IN PROGRESS'
  if (s === 'on_hold' || s === 'on hold') return 'ON HOLD'
  if (s === 'in_review' || s === 'in review') return 'IN REVIEW'

  // "for others show the same as the status for env"
  return status.toUpperCase().replace(/_/g, ' ')
}

/**
 * Maps an environment back to its corresponding status id
 */
export function getStatusForEnv(
  env: string,
  availableStatuses?: { id: string; name: string }[]
): string | undefined {
  const e = (env || '').toLowerCase().trim()
  if (!availableStatuses || availableStatuses.length === 0) {
    if (e === 'dev') return 'in_dev'
    if (e === 'sit') return 'in_sit'
    if (e === 'uat') return 'in_uat'
    if (e === 'release') return 'release'
    if (e === 'main') return 'complete'
    if (e === 'to do' || e === 'todo') return 'todo'
    return undefined
  }

  if (e === 'dev') {
    return availableStatuses.find((st) => st.id === 'in_dev' || st.name.toLowerCase().includes('dev'))?.id || 'in_dev'
  }
  if (e === 'sit') {
    return availableStatuses.find((st) => st.id === 'in_sit' || st.name.toLowerCase().includes('sit'))?.id || 'in_sit'
  }
  if (e === 'uat') {
    return availableStatuses.find((st) => st.id === 'in_uat' || st.name.toLowerCase().includes('uat'))?.id || 'in_uat'
  }
  if (e === 'release') {
    return availableStatuses.find((st) => st.id === 'release' || st.name.toLowerCase().includes('release'))?.id || 'release'
  }
  if (e === 'main') {
    return availableStatuses.find((st) => st.id === 'done' || st.id === 'complete' || st.name.toLowerCase().includes('complete') || st.name.toLowerCase().includes('done'))?.id || 'complete'
  }

  // Exact or normalized match for custom status / others (e.g. TO DO -> todo)
  const normalizedE = e.replace(/[\s-_]/g, '')
  const directMatch = availableStatuses.find(
    (st) =>
      st.id.toLowerCase() === e ||
      st.name.toLowerCase() === e ||
      st.id.toLowerCase().replace(/[\s-_]/g, '') === normalizedE ||
      st.name.toLowerCase().replace(/[\s-_]/g, '') === normalizedE
  )
  return directMatch?.id
}

/**
 * Extract selected environments configured for a project.
 */
export function getProjectEnvironments(project?: { environments?: string } | null): string[] {
  if (!project?.environments) return ['DEV', 'SIT', 'UAT', 'RELEASE', 'MAIN']
  try {
    const parsed = JSON.parse(project.environments)
    if (Array.isArray(parsed) && parsed.length > 0) return parsed
  } catch {}
  if (typeof project.environments === 'string' && project.environments.includes(',')) {
    return project.environments.split(',').map((s) => s.trim().toUpperCase()).filter(Boolean)
  }
  if (project.environments) {
    return [project.environments.trim().toUpperCase()]
  }
  return ['DEV', 'SIT', 'UAT', 'RELEASE', 'MAIN']
}
