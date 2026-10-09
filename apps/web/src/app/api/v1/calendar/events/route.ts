import { NextRequest } from 'next/server'
import { apiSuccess, apiError } from '@/server/utils/response'
import { getAuthUser } from '@/server/utils/auth'
import { query } from '@/server/db/postgres'

export async function GET(req: NextRequest) {
  try {
    const user = await getAuthUser(req)
    if (!user?.id) {
      return apiSuccess([])
    }

    const events: any[] = []

    // Fetch TaskFlow tasks with due dates
    try {
      const taskRows = await query(
        `SELECT t.id, t.title, t.description, t.due_date, t.status, t.priority, t.workspace_id, p.name as project_name
         FROM tasks t
         LEFT JOIN projects p ON p.id = t.project_id
         WHERE (t.deleted = false OR t.deleted IS NULL)
           AND t.due_date IS NOT NULL
           AND (
             t.assignee_id = $1
             OR t.created_by = $1
             OR t.workspace_id IN (
               SELECT wm.workspace_id FROM workspace_members wm WHERE wm.user_id = $1
               UNION
               SELECT w.id FROM workspaces w JOIN organizations o ON o.id = w.organization_id WHERE o.owner_id = $1
               UNION
               SELECT w.id FROM workspaces w JOIN organization_members om ON om.organization_id = w.organization_id WHERE om.user_id = $1
             )
           )
         ORDER BY t.due_date ASC
         LIMIT 100`,
        [user.id]
      )

      for (const t of taskRows) {
        if (!t.due_date) continue
        const dueDateIso = new Date(t.due_date).toISOString()
        events.push({
          id: `taskflow-${t.id}`,
          taskId: t.id,
          title: t.title,
          description: t.description || '',
          startAt: dueDateIso,
          endAt: dueDateIso,
          allDay: true,
          status: t.status,
          source: 'TASKFLOW',
          location: t.project_name || 'TaskFlow Workspace',
        })
      }
    } catch (taskErr) {
      console.warn('[calendar/events] Task fetch notice:', taskErr)
    }

    return apiSuccess(events)
  } catch (err: any) {
    console.error('[calendar/events] Error:', err)
    return apiError(err.message || 'Failed to fetch unified events', 500)
  }
}
