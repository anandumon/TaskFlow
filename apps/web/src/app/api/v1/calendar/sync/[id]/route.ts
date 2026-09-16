import { NextRequest } from 'next/server'
import { apiSuccess, apiError } from '@/server/utils/response'
import { getAuthUser } from '@/server/utils/auth'
import { query, queryOne } from '@/server/db/postgres'
import { sendCalendarSyncNotificationEmail } from '@/server/services/email.service'

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getAuthUser(req)
    const connectionId = params.id
    const now = new Date()

    const conn = await queryOne(
      `SELECT * FROM calendar_connections WHERE id = $1`,
      [connectionId]
    )

    if (!conn) {
      return apiError('Calendar connection not found', 404)
    }

    let eventsCount = 0
    let tasksExported = 0

    if (conn.access_token) {
      // 1. Fetch remote Google Calendar events
      try {
        const timeMin = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
        const googleRes = await fetch(
          `https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${encodeURIComponent(timeMin)}&maxResults=50`,
          {
            headers: { Authorization: `Bearer ${conn.access_token}` },
          }
        )
        if (googleRes.ok) {
          const gData = await googleRes.json()
          eventsCount = (gData.items || []).length
        }
      } catch (gErr) {
        console.warn('[calendar/sync] Google sync fetch error:', gErr)
      }

      // 2. Export / Push TaskFlow tasks with due dates to Google Calendar
      try {
        const tasksQuery = conn.workspace_id
          ? `SELECT id, title, description, due_date, priority, status FROM tasks WHERE workspace_id = $1 AND (deleted = false OR deleted IS NULL) AND LOWER(status) != 'done' AND due_date IS NOT NULL AND due_date != '' LIMIT 25`
          : `SELECT id, title, description, due_date, priority, status FROM tasks WHERE (deleted = false OR deleted IS NULL) AND LOWER(status) != 'done' AND due_date IS NOT NULL AND due_date != '' LIMIT 25`
        const tasksParams = conn.workspace_id ? [conn.workspace_id] : []
        const activeTasks = await query(tasksQuery, tasksParams)

        for (const task of activeTasks) {
          try {
            let dateStr = ''
            if (task.due_date instanceof Date) {
              dateStr = task.due_date.toISOString().split('T')[0]
            } else if (typeof task.due_date === 'string') {
              dateStr = task.due_date.split('T')[0]
            }
            if (!dateStr || dateStr.length < 10) continue

            const eventPayload = {
              summary: `[TaskFlow] ${task.title}`,
              description: `${task.description || ''}\n\nTask Priority: ${task.priority || 'Medium'}\nTask Status: ${task.status || 'Active'}\nDue Date: ${dateStr}\nSynchronized from TaskFlow`,
              start: { date: dateStr },
              end: { date: dateStr },
            }

            const pushRes = await fetch(
              'https://www.googleapis.com/calendar/v3/calendars/primary/events',
              {
                method: 'POST',
                headers: {
                  Authorization: `Bearer ${conn.access_token}`,
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify(eventPayload),
              }
            )

            if (pushRes.ok) {
              tasksExported++
            }
          } catch (taskExportErr) {
            console.warn('[calendar/sync] Task push failed for task:', task.id, taskExportErr)
          }
        }
      } catch (tasksErr) {
        console.warn('[calendar/sync] Active tasks query error:', tasksErr)
      }
    }

    // Update connection status
    await query(
      `UPDATE calendar_connections SET
        status = 'ACTIVE',
        sync_status = 'SYNCED',
        last_sync_at = $1,
        last_successful_sync_at = $1,
        updated_at = $1
       WHERE id = $2`,
      [now, connectionId]
    )

    // Send calendar sync notification email if user email is available
    if (user?.email) {
      sendCalendarSyncNotificationEmail(
        user.email,
        user.fullName || user.email.split('@')[0],
        conn.provider_email || 'Google Calendar',
        eventsCount,
        tasksExported
      ).catch((err) => console.warn('[calendar/sync] Email dispatch notice:', err))
    }

    return apiSuccess({
      connectionId,
      eventsSynced: eventsCount,
      tasksExported,
      status: 'SUCCESS',
      message: `Calendar sync completed: ${eventsCount} events synced, ${tasksExported} tasks exported to Google Calendar`,
      timestamp: now.toISOString(),
    })
  } catch (err: any) {
    return apiError(err.message || 'Calendar sync failed', 500)
  }
}
