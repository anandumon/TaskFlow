import { NextRequest } from 'next/server'
import { apiSuccess, apiError } from '@/server/utils/response'
import { getAuthUser } from '@/server/utils/auth'
import { query, queryOne } from '@/server/db/postgres'

function extractTokenString(token: any): string {
  if (!token) return ''
  if (Buffer.isBuffer(token)) return token.toString('utf-8')
  if (typeof token === 'string') {
    if (token.startsWith('\\x')) {
      return Buffer.from(token.slice(2), 'hex').toString('utf-8')
    }
    return token
  }
  return String(token)
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getAuthUser(req)
    const connectionId = params.id
    const body = await req.json().catch(() => ({}))
    const calendarName = (body.name || 'TaskFlow').trim()
    const now = new Date()

    const conn = await queryOne(
      `SELECT * FROM calendar_connection WHERE id = $1`,
      [connectionId]
    )

    if (!conn) {
      return apiError('Calendar connection not found', 404)
    }

    const accessToken = extractTokenString(conn.access_token)
    if (!accessToken) {
      return apiError('No access token found for this connection', 400)
    }

    // Call Google Calendar API to create a new secondary calendar
    const gRes = await fetch('https://www.googleapis.com/calendar/v3/calendars', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        summary: calendarName,
        description: 'TaskFlow project tasks, sprint deadlines, and deliverable milestones',
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
      }),
    })

    const newCal = await gRes.json()
    if (!gRes.ok || !newCal.id) {
      return apiError(newCal.error?.message || 'Failed to create Google calendar', 500)
    }

    // Insert into external_calendar table
    const extId = crypto.randomUUID()
    await query(
      `INSERT INTO external_calendar (
        id, connection_id, external_calendar_id, name, description, timezone,
        is_primary, sync_enabled, created_at, updated_at, can_read, can_write
      ) VALUES ($1, $2, $3, $4, $5, $6, false, true, $7, $7, true, true)`,
      [
        extId,
        connectionId,
        newCal.id,
        newCal.summary || calendarName,
        newCal.description || '',
        newCal.timeZone || 'UTC',
        now,
      ]
    )

    // Automatically set this newly created calendar as the target calendar in calendar_sync_policy
    const existingPolicy = await queryOne(
      `SELECT id FROM calendar_sync_policy WHERE calendar_connection_id = $1 OR user_id = $2 LIMIT 1`,
      [connectionId, conn.user_id]
    )

    if (existingPolicy) {
      await query(
        `UPDATE calendar_sync_policy SET external_calendar_id = $1, updated_at = $2 WHERE id = $3`,
        [newCal.id, now, existingPolicy.id]
      )
    } else {
      await query(
        `INSERT INTO calendar_sync_policy (
          id, user_id, calendar_connection_id, external_calendar_id, sync_tasks, sync_projects,
          sync_deadlines, sync_reminders, import_external_events, export_taskflow_events,
          default_task_duration_minutes, default_reminder_minutes, delete_external_on_task_delete,
          created_at, updated_at
        ) VALUES ($1, $2, $3, $4, true, true, true, true, false, true, 30, 30, true, $5, $5)`,
        [crypto.randomUUID(), conn.user_id, connectionId, newCal.id, now]
      )
    }

    return apiSuccess({
      id: extId,
      connectionId,
      externalCalendarId: newCal.id,
      name: newCal.summary || calendarName,
      description: newCal.description,
      timezone: newCal.timeZone,
      isPrimary: false,
      canRead: true,
      canWrite: true,
      syncEnabled: true,
      message: `Successfully created and selected new Google Calendar "${calendarName}"`,
    })
  } catch (err: any) {
    console.error('[calendar/create-calendar] Error:', err)
    return apiError(err.message || 'Failed to create dedicated calendar', 500)
  }
}
