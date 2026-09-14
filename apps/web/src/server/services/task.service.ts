import { query, queryOne } from '../db/postgres'
import crypto from 'crypto'

export interface TaskDto {
  id: string
  workspaceId: string
  projectId?: string
  title: string
  description?: string
  status: string
  environment: string
  priority: string
  tag: string
  tagColor?: string
  assigneeId?: string
  assigneeName?: string
  dueDate?: string
  subtasks?: string
  assignees?: string
  reviewerName?: string
  branchName?: string
  filesChanged?: string
  notes?: string
  historyLogs?: string
  position?: number
  progress?: number
  createdAt: string
  updatedAt: string
}

function ensureJsonArrayString(val: any): string {
  if (!val) return '[]'
  if (Array.isArray(val)) return JSON.stringify(val)
  if (typeof val === 'object') return JSON.stringify([val])
  if (typeof val === 'string') {
    const trimmed = val.trim()
    if (!trimmed || trimmed === '[]') return '[]'
    try {
      const p = JSON.parse(trimmed)
      if (Array.isArray(p)) return JSON.stringify(p)
      if (p && typeof p === 'object') return JSON.stringify([p])
    } catch {}
  }
  return '[]'
}

function mapTask(row: any): TaskDto {
  return {
    id: String(row.id),
    workspaceId: String(row.workspace_id || row.workspaceId),
    projectId: row.project_id ? String(row.project_id) : undefined,
    title: row.title,
    description: row.description || '',
    status: row.status || 'todo',
    environment: row.environment || 'DEV',
    priority: row.priority || 'medium',
    tag: row.tag || 'Frontend',
    tagColor: row.tag_color || row.tagColor || 'blue',
    assigneeId: row.assignee_id ? String(row.assignee_id) : undefined,
    assigneeName: row.assignee_name || row.assigneeName || 'You',
    dueDate: row.due_date || row.dueDate || 'Tomorrow',
    subtasks: ensureJsonArrayString(row.subtasks),
    assignees: row.assignees || 'You',
    reviewerName: row.reviewer_name || row.reviewerName || 'Lead Reviewer',
    branchName: row.branch_name || row.branchName || '',
    filesChanged: ensureJsonArrayString(row.files_changed),
    notes: row.notes || '',
    historyLogs: ensureJsonArrayString(row.history_logs),
    position: Number(row.position ?? 0),
    progress: Number(row.progress ?? 0),
    createdAt: row.created_at ? new Date(row.created_at).toISOString() : new Date().toISOString(),
    updatedAt: row.updated_at ? new Date(row.updated_at).toISOString() : new Date().toISOString(),
  }
}

export async function getTasksByWorkspace(workspaceId: string): Promise<TaskDto[]> {
  try {
    const rows = await query(
      `SELECT * FROM tasks WHERE workspace_id = $1 AND (deleted = false OR deleted IS NULL) ORDER BY created_at DESC`,
      [workspaceId]
    )
    return rows.map(mapTask)
  } catch (err) {
    console.error('[task.service] getTasksByWorkspace error:', err)
    return []
  }
}

export async function getTasksByProject(projectId: string): Promise<TaskDto[]> {
  try {
    const rows = await query(
      `SELECT * FROM tasks WHERE project_id = $1 AND (deleted = false OR deleted IS NULL) ORDER BY created_at DESC`,
      [projectId]
    )
    return rows.map(mapTask)
  } catch (err) {
    console.error('[task.service] getTasksByProject error:', err)
    return []
  }
}

export async function getTaskById(id: string): Promise<TaskDto | null> {
  const row = await queryOne(`SELECT * FROM tasks WHERE id = $1 AND (deleted = false OR deleted IS NULL)`, [id])
  if (!row) return null
  return mapTask(row)
}

export async function createTask(
  workspaceId: string,
  input: Partial<TaskDto>,
  creatorId?: string
): Promise<TaskDto> {
  const id = crypto.randomUUID()
  const now = new Date()

  const row = await queryOne(
    `INSERT INTO tasks (
      id, workspace_id, project_id, title, description, status, environment, priority,
      tag, tag_color, assignee_id, assignee_name, due_date, subtasks, assignees,
      reviewer_name, branch_name, files_changed, notes, history_logs, position,
      progress, created_by, deleted, version, created_at, updated_at
    ) VALUES (
      $1, $2, $3, $4, $5, $6, $7, $8,
      $9, $10, $11, $12, $13, $14, $15,
      $16, $17, $18, $19, $20, $21,
      $22, $23, false, 0, $24, $24
    ) RETURNING *`,
    [
      id,
      workspaceId,
      input.projectId || null,
      input.title || 'Untitled Task',
      input.description || '',
      input.status || 'todo',
      input.environment || 'DEV',
      input.priority || 'medium',
      input.tag || 'Frontend',
      input.tagColor || 'blue',
      input.assigneeId || null,
      input.assigneeName || 'You',
      input.dueDate || 'Tomorrow',
      typeof input.subtasks === 'string' ? input.subtasks : JSON.stringify(input.subtasks || []),
      input.assignees || 'You',
      input.reviewerName || 'Lead Reviewer',
      input.branchName || '',
      typeof input.filesChanged === 'string' ? input.filesChanged : JSON.stringify(input.filesChanged || []),
      input.notes || '',
      typeof input.historyLogs === 'string' ? input.historyLogs : JSON.stringify(input.historyLogs || []),
      input.position ?? 0,
      input.progress ?? 0,
      creatorId || null,
      now,
    ]
  )

  return mapTask(row)
}

export async function updateTask(id: string, updates: Partial<TaskDto>): Promise<TaskDto> {
  const existing = await queryOne(`SELECT * FROM tasks WHERE id = $1`, [id])
  if (!existing) throw new Error('Task not found')

  const title = updates.title !== undefined ? updates.title : existing.title
  const description = updates.description !== undefined ? updates.description : existing.description
  const status = updates.status !== undefined ? updates.status : existing.status
  const environment = updates.environment !== undefined ? updates.environment : existing.environment
  const priority = updates.priority !== undefined ? updates.priority : existing.priority
  const tag = updates.tag !== undefined ? updates.tag : existing.tag
  const tagColor = updates.tagColor !== undefined ? updates.tagColor : existing.tag_color
  const assigneeId = updates.assigneeId !== undefined ? updates.assigneeId : existing.assignee_id
  const assigneeName = updates.assigneeName !== undefined ? updates.assigneeName : existing.assignee_name
  const dueDate = updates.dueDate !== undefined ? updates.dueDate : existing.due_date
  const subtasks = updates.subtasks !== undefined
    ? (typeof updates.subtasks === 'string' ? updates.subtasks : JSON.stringify(updates.subtasks))
    : existing.subtasks
  const assignees = updates.assignees !== undefined ? updates.assignees : existing.assignees
  const reviewerName = updates.reviewerName !== undefined ? updates.reviewerName : existing.reviewer_name
  const branchName = updates.branchName !== undefined ? updates.branchName : existing.branch_name
  const filesChanged = updates.filesChanged !== undefined
    ? (typeof updates.filesChanged === 'string' ? updates.filesChanged : JSON.stringify(updates.filesChanged))
    : existing.files_changed
  const notes = updates.notes !== undefined ? updates.notes : existing.notes
  const historyLogs = updates.historyLogs !== undefined
    ? (typeof updates.historyLogs === 'string' ? updates.historyLogs : JSON.stringify(updates.historyLogs))
    : existing.history_logs
  const position = updates.position !== undefined ? updates.position : existing.position
  const progress = updates.progress !== undefined ? updates.progress : existing.progress
  const projectId = updates.projectId !== undefined ? updates.projectId : existing.project_id

  const row = await queryOne(
    `UPDATE tasks SET
      title = $1, description = $2, status = $3, environment = $4, priority = $5,
      tag = $6, tag_color = $7, assignee_id = $8, assignee_name = $9, due_date = $10,
      subtasks = $11, assignees = $12, reviewer_name = $13, branch_name = $14,
      files_changed = $15, notes = $16, history_logs = $17, position = $18,
      progress = $19, project_id = $20, updated_at = $21
     WHERE id = $22 RETURNING *`,
    [
      title, description, status, environment, priority,
      tag, tagColor, assigneeId, assigneeName, dueDate,
      subtasks, assignees, reviewerName, branchName,
      filesChanged, notes, historyLogs, position,
      progress, projectId, new Date(), id,
    ]
  )

  return mapTask(row)
}

export async function deleteTask(id: string): Promise<void> {
  await query(`UPDATE tasks SET deleted = true, updated_at = $1 WHERE id = $2`, [new Date(), id])
}
