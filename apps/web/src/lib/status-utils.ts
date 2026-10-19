export type StatusCategory = 'NOT_STARTED' | 'ACTIVE' | 'DONE' | 'CLOSED'

export interface CustomStatus {
  id: string
  name: string
  color: string
  category: StatusCategory
  order: number
  isDefault?: boolean
}

export interface StatusTemplate {
  id: string
  name: string
  description: string
  statuses: Omit<CustomStatus, 'id'>[]
}

export const CATEGORY_RANK: Record<StatusCategory, number> = {
  NOT_STARTED: 0,
  ACTIVE: 1,
  DONE: 2,
  CLOSED: 3,
}

export function getStatusCanonicalRank(status: CustomStatus | { id?: string; name?: string }): number {
  const id = (status.id || '').toLowerCase()
  const name = (status.name || '').toLowerCase()
  const s = `${id} ${name}`

  if (s.includes('todo') || s.includes('to do') || s.includes('backlog')) return 0
  if (s.includes('on_hold') || s.includes('on hold') || s.includes('hold')) return 1
  if (s.includes('in_progress') || s.includes('in progress') || s.includes('progress')) return 2
  if (s.includes('in_dev') || s.includes('in dev') || s.includes('dev')) return 3
  if (s.includes('in_review') || s.includes('in review') || s.includes('code review') || s.includes('review')) return 4
  if (s.includes('in_sit') || s.includes('in sit') || s.includes('sit')) return 5
  if (s.includes('in_uat') || s.includes('in uat') || s.includes('uat')) return 6
  if (s.includes('release') || s.includes('staging')) return 7
  if (s.includes('done') || s.includes('complete') || s.includes('completed') || s.includes('closed') || s.includes('deploy')) return 8
  return 50
}

export function sortStatusesByStructure(statuses: CustomStatus[]): CustomStatus[] {
  return [...statuses].sort((a, b) => {
    const rankA = CATEGORY_RANK[a.category] ?? 1
    const rankB = CATEGORY_RANK[b.category] ?? 1
    if (rankA !== rankB) {
      return rankA - rankB
    }
    const canonA = getStatusCanonicalRank(a)
    const canonB = getStatusCanonicalRank(b)
    if (canonA !== 50 || canonB !== 50) {
      if (canonA !== canonB) {
        return canonA - canonB
      }
    }
    return (a.order ?? 0) - (b.order ?? 0)
  })
}
