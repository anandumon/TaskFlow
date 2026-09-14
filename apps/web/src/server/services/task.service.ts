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

export interface DueDateInfo {
  daysLeft: number
  timeRemainingText: string
  bannerText: string
  badgeClass: string
  isDueNearOrToday: boolean
}

export function parseDueDate(rawDue?: string): DueDateInfo {
  if (!rawDue || !rawDue.trim()) {
    return { daysLeft: 0, timeRemainingText: 'Due Date not set', bannerText: 'DUE DATE NOTICE', badgeClass: 'due-near', isDueNearOrToday: false }
  }
  const cleaned = rawDue.trim()
  const todayStr = new Date().toISOString().split('T')[0]
  const tomorrow = new Date(Date.now() + 86400000)
  const tomorrowStr = tomorrow.toISOString().split('T')[0]

  if (cleaned.toLowerCase() === 'today' || cleaned === todayStr) {
    return { daysLeft: 0, timeRemainingText: 'Due Today', bannerText: 'DUE TODAY', badgeClass: 'due-today', isDueNearOrToday: true }
  }
  if (cleaned.toLowerCase() === 'tomorrow' || cleaned === tomorrowStr) {
    return { daysLeft: 1, timeRemainingText: '1 Day Left', bannerText: 'DUE IN 1 DAY', badgeClass: 'due-near', isDueNearOrToday: true }
  }

  try {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const dueDate = new Date(cleaned)
    if (isNaN(dueDate.getTime())) {
      return { daysLeft: 0, timeRemainingText: cleaned, bannerText: 'TASK DUE ALERT', badgeClass: 'due-near', isDueNearOrToday: false }
    }
    dueDate.setHours(0, 0, 0, 0)
    const diffMs = dueDate.getTime() - today.getTime()
    const days = Math.round(diffMs / (1000 * 60 * 60 * 24))

    if (days === 0) {
      return { daysLeft: 0, timeRemainingText: 'Due Today', bannerText: 'DUE TODAY', badgeClass: 'due-today', isDueNearOrToday: true }
    } else if (days === 1) {
      return { daysLeft: 1, timeRemainingText: '1 Day Left', bannerText: 'DUE IN 1 DAY', badgeClass: 'due-near', isDueNearOrToday: true }
    } else if (days > 1) {
      return { daysLeft: days, timeRemainingText: `${days} Days Left`, bannerText: `DUE IN ${days} DAYS`, badgeClass: 'due-near', isDueNearOrToday: days <= 3 }
    } else {
      const overdueDays = Math.abs(days)
      return { daysLeft: days, timeRemainingText: `${overdueDays} ${overdueDays === 1 ? 'Day' : 'Days'} Overdue`, bannerText: `OVERDUE BY ${overdueDays} ${overdueDays === 1 ? 'DAY' : 'DAYS'}`, badgeClass: 'due-today', isDueNearOrToday: true }
    }
  } catch {
    return { daysLeft: 0, timeRemainingText: cleaned, bannerText: 'TASK DUE ALERT', badgeClass: 'due-near', isDueNearOrToday: false }
  }
}

function escapeHtml(input: string): string {
  if (!input) return ''
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
}

export async function dispatchDueAlert(
  taskId: string,
  callerEmail?: string,
  callerName?: string
): Promise<any> {
  const { sendTaskDueAlertEmail } = await import('./email.service')
  const task = await queryOne(`SELECT * FROM tasks WHERE id = $1 AND (deleted = false OR deleted IS NULL)`, [taskId])
  if (!task) throw new Error('Task not found')

  const dueInfo = parseDueDate(task.due_date)

  let projectName = 'Project'
  if (task.project_id) {
    const proj = await queryOne(`SELECT name FROM projects WHERE id = $1`, [task.project_id])
    if (proj?.name) projectName = proj.name
  }

  let workspaceName = 'Workspace'
  let workspace: any = null
  if (task.workspace_id) {
    workspace = await queryOne(`SELECT name, created_by FROM workspaces WHERE id = $1`, [task.workspace_id])
    if (workspace?.name) workspaceName = workspace.name
  }

  let recipientEmail = callerEmail || ''
  let recipientName = callerName || task.assignee_name || 'Team Member'

  if (task.assignee_id) {
    const assignee = await queryOne(`SELECT email, first_name, last_name FROM users WHERE id = $1`, [task.assignee_id])
    if (assignee?.email) {
      recipientEmail = assignee.email
      recipientName = `${assignee.first_name || ''} ${assignee.last_name || ''}`.trim() || assignee.email
    }
  }

  if (!recipientEmail && workspace?.created_by) {
    const creator = await queryOne(`SELECT email, first_name, last_name FROM users WHERE id = $1`, [workspace.created_by])
    if (creator?.email) {
      recipientEmail = creator.email
      recipientName = `${creator.first_name || ''} ${creator.last_name || ''}`.trim() || creator.email
    }
  }

  if (!recipientEmail) {
    recipientEmail = process.env.MAIL_USERNAME || 'anandu2109@gmail.com'
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  const taskUrl = `${appUrl}/app/tasks`

  await sendTaskDueAlertEmail(
    recipientEmail,
    recipientName,
    task.title,
    projectName,
    workspaceName,
    task.due_date || 'Today',
    dueInfo.timeRemainingText,
    dueInfo.bannerText,
    (task.status || 'todo').toUpperCase(),
    (task.priority || 'medium').toUpperCase(),
    taskUrl
  )

  await query(`UPDATE tasks SET last_due_alert_at = NOW() WHERE id = $1`, [taskId])
  console.log(`🔔 [task.service] Dispatched due alert for task '${task.title}' to ${recipientEmail}`)

  return {
    success: true,
    taskId: task.id,
    recipientEmail,
    recipientName,
    dueDate: task.due_date,
    status: dueInfo.bannerText,
  }
}

export async function dispatchDateDueAlerts(
  workspaceId: string,
  selectedDate?: string,
  overrideEmail?: string,
  callerName?: string
): Promise<any> {
  const { sendDateDueAlertDigestEmail } = await import('./email.service')
  const workspace = await queryOne(`SELECT * FROM workspaces WHERE id = $1`, [workspaceId])
  if (!workspace) throw new Error('Workspace not found')

  const targetDate = selectedDate && selectedDate.trim() ? selectedDate.trim() : new Date().toISOString().split('T')[0]
  const todayStr = new Date().toISOString().split('T')[0]
  const tomorrowStr = new Date(Date.now() + 86400000).toISOString().split('T')[0]

  const tasks = await query(
    `SELECT * FROM tasks WHERE workspace_id = $1 AND (deleted = false OR deleted IS NULL) AND LOWER(status) != 'done' ORDER BY created_at DESC`,
    [workspaceId]
  )

  const matchingTasks = tasks.filter((t: any) => {
    if (!t.due_date || !t.due_date.trim()) return false
    const d = t.due_date.trim()
    if (d.toLowerCase() === targetDate.toLowerCase()) return true
    if (d.toLowerCase() === 'today' && targetDate === todayStr) return true
    if (d.toLowerCase() === 'tomorrow' && targetDate === tomorrowStr) return true
    return false
  })

  let recipientEmail = overrideEmail || ''
  let recipientName = callerName || 'Team Member'

  if (!recipientEmail && workspace.created_by) {
    const creator = await queryOne(`SELECT email, first_name, last_name FROM users WHERE id = $1`, [workspace.created_by])
    if (creator?.email) {
      recipientEmail = creator.email
      recipientName = `${creator.first_name || ''} ${creator.last_name || ''}`.trim() || creator.email
    }
  }

  if (!recipientEmail) {
    recipientEmail = process.env.MAIL_USERNAME || 'anandu2109@gmail.com'
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  const workspaceUrl = `${appUrl}/app/tasks`

  if (matchingTasks.length === 0) {
    return {
      success: true,
      taskCount: 0,
      recipientEmail,
      selectedDate: targetDate,
      message: `No tasks found due on ${targetDate}`,
    }
  }

  let taskListHtml = ''
  for (const t of matchingTasks) {
    let projName = 'General'
    if (t.project_id) {
      const p = await queryOne(`SELECT name FROM projects WHERE id = $1`, [t.project_id])
      if (p?.name) projName = p.name
    }

    taskListHtml += `
      <div class="task-card">
        <h3 class="task-title">${escapeHtml(t.title)}</h3>
        <div class="task-meta">
          <span>📁 <strong>${escapeHtml(projName)}</strong></span>
          <span class="tag-badge">${escapeHtml(t.tag || 'Task')}</span>
          <span class="priority-badge">${escapeHtml((t.priority || 'Medium').toUpperCase())}</span>
          <span>👤 ${escapeHtml(t.assignee_name || 'You')}</span>
          <span>⚙️ ${escapeHtml((t.status || 'todo').toUpperCase())}</span>
        </div>
      </div>
    `
    await query(`UPDATE tasks SET last_due_alert_at = NOW() WHERE id = $1`, [t.id])
  }

  await sendDateDueAlertDigestEmail(
    recipientEmail,
    recipientName,
    targetDate,
    matchingTasks.length,
    taskListHtml,
    workspaceUrl
  )

  return {
    success: true,
    taskCount: matchingTasks.length,
    recipientEmail,
    selectedDate: targetDate,
    message: `Sent due alert for ${matchingTasks.length} task(s) to ${recipientEmail}`,
  }
}

export async function dispatchUpcomingDueAlerts(
  workspaceId: string,
  overrideEmail?: string,
  callerName?: string
): Promise<any> {
  const { sendDateDueAlertDigestEmail } = await import('./email.service')
  const workspace = await queryOne(`SELECT * FROM workspaces WHERE id = $1`, [workspaceId])
  if (!workspace) throw new Error('Workspace not found')

  const tasks = await query(
    `SELECT * FROM tasks WHERE workspace_id = $1 AND (deleted = false OR deleted IS NULL) AND LOWER(status) != 'done' AND due_date IS NOT NULL AND due_date != '' ORDER BY created_at DESC`,
    [workspaceId]
  )

  let recipientEmail = overrideEmail || ''
  let recipientName = callerName || 'Team Member'

  if (!recipientEmail && workspace.created_by) {
    const creator = await queryOne(`SELECT email, first_name, last_name FROM users WHERE id = $1`, [workspace.created_by])
    if (creator?.email) {
      recipientEmail = creator.email
      recipientName = `${creator.first_name || ''} ${creator.last_name || ''}`.trim() || creator.email
    }
  }

  if (!recipientEmail) {
    recipientEmail = process.env.MAIL_USERNAME || 'anandu2109@gmail.com'
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  const workspaceUrl = `${appUrl}/app/tasks`

  let taskListHtml = ''
  let totalPendingSubtasks = 0

  for (const t of tasks) {
    let projName = 'General'
    if (t.project_id) {
      const p = await queryOne(`SELECT name FROM projects WHERE id = $1`, [t.project_id])
      if (p?.name) projName = p.name
    }

    let subtasksList: any[] = []
    try {
      if (typeof t.subtasks === 'string' && t.subtasks.trim()) {
        subtasksList = JSON.parse(t.subtasks)
      } else if (Array.isArray(t.subtasks)) {
        subtasksList = t.subtasks
      }
    } catch {}

    const pendingSubtasks = Array.isArray(subtasksList)
      ? subtasksList.filter((s: any) => !s?.completed && s?.title).map((s: any) => s.title)
      : []

    totalPendingSubtasks += pendingSubtasks.length

    taskListHtml += `
      <div class="task-card" style="margin-bottom: 16px; padding: 16px; border-radius: 12px; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1);">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
          <span style="font-size: 11px; font-weight: 700; color: #6366f1;">📁 ${escapeHtml(projName)}</span>
          <span style="font-size: 11px; font-weight: 700; color: #f43f5e;">📅 Due: ${escapeHtml(t.due_date)}</span>
        </div>
        <h3 class="task-title" style="margin: 0 0 8px 0; font-size: 14px; font-weight: 700; color: #ffffff;">${escapeHtml(t.title)}</h3>
        <div class="task-meta" style="font-size: 11px; color: #94a3b8; display: flex; gap: 10px; margin-bottom: 8px;">
          <span>Priority: <strong>${escapeHtml((t.priority || 'medium').toUpperCase())}</strong></span>
          <span>Status: <strong>${escapeHtml((t.status || 'todo').toUpperCase())}</strong></span>
          <span>Assignee: <strong>${escapeHtml(t.assignee_name || 'You')}</strong></span>
        </div>
        ${
          pendingSubtasks.length > 0
            ? `
          <div style="margin-top: 10px; padding: 8px 12px; border-radius: 8px; background: rgba(99,102,241,0.08); border-left: 3px solid #6366f1;">
            <div style="font-size: 10px; font-weight: 800; color: #a5b4fc; text-transform: uppercase; margin-bottom: 4px;">Pending Subtasks (${pendingSubtasks.length})</div>
            <ul style="margin: 0; padding-left: 16px; font-size: 11px; color: #cbd5e1;">
              ${pendingSubtasks.map((st: string) => `<li style="margin-bottom: 2px;">${escapeHtml(st)}</li>`).join('')}
            </ul>
          </div>
        `
            : ''
        }
      </div>
    `
    await query(`UPDATE tasks SET last_due_alert_at = NOW() WHERE id = $1`, [t.id])
  }

  await sendDateDueAlertDigestEmail(
    recipientEmail,
    recipientName,
    'Upcoming Sprint Milestones',
    tasks.length,
    taskListHtml,
    workspaceUrl
  )

  return {
    success: true,
    taskCount: tasks.length,
    pendingSubtasksCount: totalPendingSubtasks,
    recipientEmail,
    message: `Sent upcoming due alert for ${tasks.length} task(s) and ${totalPendingSubtasks} subtask(s) to ${recipientEmail}`,
  }
}

