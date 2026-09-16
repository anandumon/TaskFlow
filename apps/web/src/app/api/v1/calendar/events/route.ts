import { NextRequest } from 'next/server'
import { apiSuccess, apiError } from '@/server/utils/response'
import { getAuthUser } from '@/server/utils/auth'
import { query, queryOne } from '@/server/db/postgres'
import { decryptCalendarToken } from '@/server/utils/calendar-crypto'

export async function GET(req: NextRequest) {
  try {
    const user = await getAuthUser(req)
    if (!user?.id) {
      return apiSuccess([])
    }

    const events: any[] = []

    // 1. Fetch Google Calendar events if connected
    let conn: any = null
    try {
      conn = await queryOne(
        `SELECT * FROM calendar_connection WHERE user_id = $1 AND UPPER(provider) = 'GOOGLE' AND UPPER(status) IN ('ACTIVE', 'CONNECTED') LIMIT 1`,
        [user.id]
      )
    } catch {
      try {
        conn = await queryOne(
          `SELECT * FROM calendar_connections WHERE user_id = $1 AND UPPER(provider) = 'GOOGLE' AND UPPER(status) IN ('ACTIVE', 'CONNECTED') LIMIT 1`,
          [user.id]
        )
      } catch {}
    }

    if (conn && conn.access_token) {
      try {
        const decryptedToken = decryptCalendarToken(conn.access_token)
        if (!decryptedToken) {
          throw new Error('Could not decrypt access token')
        }

        const timeMin = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
        const timeMax = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString()

        const googleRes = await fetch(
          `https://www.googleapis.com/calendar/v3/calendars/primary/events?singleEvents=true&orderBy=startTime&timeMin=${encodeURIComponent(
            timeMin
          )}&timeMax=${encodeURIComponent(timeMax)}&maxResults=100`,
          {
            headers: {
              Authorization: `Bearer ${decryptedToken}`,
            },
          }
        )

        if (googleRes.ok) {
          const gData = await googleRes.json()
          const items = gData.items || []
          for (const item of items) {
            const startStr = item.start?.dateTime || item.start?.date
            const endStr = item.end?.dateTime || item.end?.date || startStr
            if (!startStr) continue

            events.push({
              id: `google-${item.id}`,
              title: item.summary || 'Google Calendar Event',
              description: item.description || '',
              startAt: startStr,
              endAt: endStr,
              allDay: !item.start?.dateTime,
              status: item.status || 'CONFIRMED',
              meetingUrl:
                item.hangoutLink ||
                item.conferenceData?.entryPoints?.find((e: any) => e.entryPointType === 'video')?.uri ||
                '',
              location: item.location || '',
              source: 'GOOGLE',
              calendarId: conn.provider_email || 'Google Calendar',
            })
          }
        }
      } catch (gErr) {
        console.warn('[calendar/events] Google fetch notice:', gErr)
      }
    }

    // 2. Fetch TaskFlow tasks with due dates
    try {
      const taskRows = await query(
        `SELECT t.id, t.title, t.description, t.due_date, t.status, t.priority, t.workspace_id, p.name as project_name
         FROM tasks t
         LEFT JOIN projects p ON p.id = t.project_id
         WHERE (t.deleted = false OR t.deleted IS NULL)
           AND t.due_date IS NOT NULL
         ORDER BY t.due_date ASC
         LIMIT 100`
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
