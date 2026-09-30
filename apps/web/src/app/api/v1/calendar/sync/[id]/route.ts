import { NextRequest } from 'next/server'
import { apiSuccess, apiError } from '@/server/utils/response'
import { getAuthUser } from '@/server/utils/auth'
import { query, queryOne } from '@/server/db/postgres'
import { sendCalendarSyncNotificationEmail } from '@/server/services/email.service'
import { decryptCalendarToken, encryptCalendarToken } from '@/server/utils/calendar-crypto'

const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || process.env.GOOGLE_CLIENT_ID || ''
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || ''

async function fetchWithTimeout(url: string, init: RequestInit, timeoutMs = 6000): Promise<Response> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const res = await fetch(url, { ...init, signal: controller.signal })
    return res
  } finally {
    clearTimeout(timer)
  }
}

async function refreshGoogleAccessToken(refreshToken: string, connectionId: string): Promise<string | null> {
  try {
    const res = await fetchWithTimeout('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET,
        refresh_token: refreshToken,
        grant_type: 'refresh_token',
      }),
    }, 6000)
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
      const fetchUrl = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(
        targetCalendarId
      )}/events?timeMin=${encodeURIComponent(timeMin)}&maxResults=50`

      let googleRes = await fetchWithTimeout(fetchUrl, {
        headers: { Authorization: `Bearer ${accessToken}` },
      }, 7000).catch(() => null)

      // If token expired, attempt automatic refresh
      if ((!googleRes || googleRes.status === 401) && refreshToken) {
        const refreshed = await refreshGoogleAccessToken(refreshToken, connectionId)
        if (refreshed) {
          accessToken = refreshed
          googleRes = await fetchWithTimeout(fetchUrl, {
            headers: { Authorization: `Bearer ${accessToken}` },
          }, 7000).catch(() => null)
        }
      }

      if (googleRes && googleRes.ok) {
        const gData = await googleRes.json().catch(() => ({}))
        eventsCount = (gData.items || []).length
      } else if (googleRes) {
        console.warn('[calendar/sync] Google events fetch non-200:', googleRes.status)
      }

      // 3. Export tasks to Google Calendar if enabled (optimized with concurrency + pre-fetched mappings)
      if (policy?.export_taskflow_events !== false) {
        try {
          const tasksQuery = `SELECT id, title, description, due_date, priority, status 
             FROM tasks 
             WHERE (deleted = false OR deleted IS NULL) 
               AND LOWER(status) != 'done' 
               AND due_date IS NOT NULL AND due_date != '' 
             ORDER BY due_date ASC 
             LIMIT 20`
          const activeTasks = await query(tasksQuery, [])

          if (activeTasks.length > 0) {
            // Pre-fetch all existing mappings in 1 query to avoid N roundtrips
            const taskIds = activeTasks.map((t) => String(t.id))
            const existingMappings = await query(
              `SELECT taskflow_resource_id, external_event_id 
               FROM calendar_event_mapping 
               WHERE taskflow_resource_id = ANY($1::text[]) AND provider = 'GOOGLE'`,
              [taskIds]
            ).catch(() => [])

            const mappingMap = new Map<string, string>()
            for (const m of existingMappings) {
              if (m.taskflow_resource_id && m.external_event_id) {
                mappingMap.set(String(m.taskflow_resource_id), String(m.external_event_id))
              }
            }

            // Sync in parallel batches of 4 tasks with 5s timeout each
            const BATCH_SIZE = 4
            for (let i = 0; i < activeTasks.length; i += BATCH_SIZE) {
              const chunk = activeTasks.slice(i, i + BATCH_SIZE)
              await Promise.allSettled(
                chunk.map(async (task) => {
                  let dateStr = ''
                  if (task.due_date instanceof Date) {
                    dateStr = task.due_date.toISOString().split('T')[0]
                  } else if (typeof task.due_date === 'string') {
                    dateStr = task.due_date.split('T')[0]
                  }
                  if (!dateStr || dateStr.length < 10) return

                  const startDateObj = new Date(dateStr + 'T00:00:00Z')
                  const nextDayObj = new Date(startDateObj.getTime() + 24 * 60 * 60 * 1000)
                  const nextDayStr = nextDayObj.toISOString().split('T')[0]

                  const eventPayload = {
                    summary: `[TaskFlow] ${task.title}`,
                    description: `${task.description || ''}\n\nPriority: ${
                      task.priority || 'Medium'
                    }\nStatus: ${task.status || 'Active'}\nDue Date: ${dateStr}\nSynchronized from TaskFlow`,
                    start: { date: dateStr },
                    end: { date: nextDayStr },
                    extendedProperties: {
                      private: {
                        taskflow_resource_id: String(task.id),
                        taskflow_origin: 'true',
                      },
                    },
                  }

                  const existingEventId = mappingMap.get(String(task.id))
                  let pushRes: Response | null = null

                  if (existingEventId) {
                    pushRes = await fetchWithTimeout(
                      `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(
                        targetCalendarId
                      )}/events/${encodeURIComponent(existingEventId)}`,
                      {
                        method: 'PATCH',
                        headers: {
                          Authorization: `Bearer ${accessToken}`,
                          'Content-Type': 'application/json',
                        },
                        body: JSON.stringify(eventPayload),
                      },
                      5000
                    ).catch(() => null)
                  } else {
                    pushRes = await fetchWithTimeout(
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
                      },
                      5000
                    ).catch(() => null)

                    if (pushRes && pushRes.ok) {
                      const gEvent = await pushRes.json().catch(() => null)
                      if (gEvent?.id) {
                        await query(
                          `INSERT INTO calendar_event_mapping 
                            (taskflow_resource_type, taskflow_resource_id, external_calendar_id, external_event_id, provider, last_synced_at)
                           VALUES ('TASK', $1, $2, $3, 'GOOGLE', NOW())
                           ON CONFLICT (taskflow_resource_type, taskflow_resource_id, provider)
                           DO UPDATE SET external_event_id = $3, last_synced_at = NOW()`,
                          [task.id, targetCalendarId, gEvent.id]
                        ).catch((err) => console.warn('[calendar/sync] Mapping insert error:', err))
                      }
                    }
                  }

                  if (pushRes && pushRes.ok) {
                    tasksExported++
                  }
                })
              )
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
