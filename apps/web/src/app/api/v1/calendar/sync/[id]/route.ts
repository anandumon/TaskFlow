import { NextRequest } from 'next/server'
import { apiSuccess, apiError } from '@/server/utils/response'
import { getAuthUser } from '@/server/utils/auth'
import { query, queryOne } from '@/server/db/postgres'
import { sendCalendarSyncNotificationEmail } from '@/server/services/email.service'
import { decryptCalendarToken, encryptCalendarToken } from '@/server/utils/calendar-crypto'

const GOOGLE_CLIENT_ID =
  process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ||
  process.env.GOOGLE_CLIENT_ID ||
  '467128497270-r9o4vs5bdk699dtl58qpoij7k86f4j7t.apps.googleusercontent.com'
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || ''

async function refreshGoogleAccessToken(refreshToken: string, connectionId: string): Promise<string | null> {
  try {
    const res = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET,
        refresh_token: refreshToken,
        grant_type: 'refresh_token',
      }),
    })
    const data = await res.json()
    if (res.ok && data.access_token) {
      const encryptedBuf = encryptCalendarToken(data.access_token)
      await query(
        `UPDATE calendar_connection SET access_token = $1, updated_at = $2 WHERE id = $3`,
        [encryptedBuf, new Date(), connectionId]
      )
      return data.access_token
    }
  } catch (err) {
    console.warn('[calendar/sync] Token refresh failed:', err)
  }
  return null
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getAuthUser(req)
    const connectionId = params.id
    const now = new Date()

    // 1. Fetch connection from base table
    const conn = await queryOne(
      `SELECT * FROM calendar_connection WHERE id = $1`,
      [connectionId]
    )

    if (!conn) {
      return apiError('Calendar connection not found', 404)
    }

    let accessToken = decryptCalendarToken(conn.access_token)
    const refreshToken = decryptCalendarToken(conn.refresh_token)

    // 2. Determine target Google calendar
    const policy = await queryOne(
      `SELECT external_calendar_id, sync_tasks, export_taskflow_events, default_task_duration_minutes 
       FROM calendar_sync_policy 
       WHERE calendar_connection_id = $1 OR user_id = $2 
       ORDER BY updated_at DESC LIMIT 1`,
      [connectionId, conn.user_id]
    )
    const targetCalendarId = policy?.external_calendar_id || 'primary'

    let eventsCount = 0
    let tasksExported = 0

    if (accessToken) {
      const timeMin = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
      let fetchUrl = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(
        targetCalendarId
      )}/events?timeMin=${encodeURIComponent(timeMin)}&maxResults=50`

      let googleRes = await fetch(fetchUrl, {
        headers: { Authorization: `Bearer ${accessToken}` },
      })

      // If token expired, attempt automatic refresh
      if (googleRes.status === 401 && refreshToken) {
        const refreshed = await refreshGoogleAccessToken(refreshToken, connectionId)
        if (refreshed) {
          accessToken = refreshed
          googleRes = await fetch(fetchUrl, {
            headers: { Authorization: `Bearer ${accessToken}` },
          })
        }
      }

      if (googleRes.ok) {
        const gData = await googleRes.json()
        eventsCount = (gData.items || []).length
      } else {
        console.warn('[calendar/sync] Google events fetch non-200:', googleRes.status)
      }

      // 3. Export tasks to Google Calendar if enabled
      if (policy?.export_taskflow_events !== false) {
        try {
          const tasksQuery = `SELECT id, title, description, due_date, priority, status 
             FROM tasks 
             WHERE (deleted = false OR deleted IS NULL) 
               AND LOWER(status) != 'done' 
               AND due_date IS NOT NULL AND due_date != '' 
             ORDER BY due_date ASC 
             LIMIT 25`
          const activeTasks = await query(tasksQuery, [])

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
                description: `${task.description || ''}\n\nPriority: ${
                  task.priority || 'Medium'
                }\nStatus: ${task.status || 'Active'}\nDue Date: ${dateStr}\nSynchronized from TaskFlow`,
                start: { date: dateStr },
                end: { date: dateStr },
              }

              const pushRes = await fetch(
                `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(
                  targetCalendarId
                )}/events`,
                {
                  method: 'POST',
                  headers: {
                    Authorization: `Bearer ${accessToken}`,
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify(eventPayload),
                }
              )

              if (pushRes.ok) {
                tasksExported++
              }
            } catch (taskExportErr) {
              console.warn('[calendar/sync] Task push error for task:', task.id, taskExportErr)
            }
          }
        } catch (tasksErr) {
          console.warn('[calendar/sync] Active tasks query error:', tasksErr)
        }
      }
    }

    // 4. Update connection status cleanly without missing column error
    await query(
      `UPDATE calendar_connection SET
        status = 'CONNECTED',
        last_sync_at = $1,
        last_successful_sync_at = $1,
        last_sync_error = NULL,
        updated_at = $1
       WHERE id = $2`,
      [now, connectionId]
    )

    // 5. Send notification email if configured
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
      targetCalendar: targetCalendarId,
      message: `Calendar sync completed: ${eventsCount} events synced, ${tasksExported} tasks exported`,
      timestamp: now.toISOString(),
    })
  } catch (err: any) {
    console.error('[calendar/sync] Error:', err)
    return apiError(err.message || 'Calendar sync failed', 500)
  }
}
