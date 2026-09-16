import { NextRequest } from 'next/server'
import { apiSuccess, apiError } from '@/server/utils/response'
import { getAuthUser } from '@/server/utils/auth'
import { query, queryOne } from '@/server/db/postgres'
import { decryptCalendarToken } from '@/server/utils/calendar-crypto'

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getAuthUser(req)
    const connectionId = params.id

    const conn = await queryOne(
      `SELECT * FROM calendar_connection WHERE id = $1`,
      [connectionId]
    )

    if (!conn) {
      return apiError('Calendar connection not found', 404)
    }

    const accessToken = decryptCalendarToken(conn.access_token)
    if (!accessToken) {
      return apiError('No access token found for this connection', 400)
    }

    const policy = await queryOne(
      `SELECT external_calendar_id FROM calendar_sync_policy 
       WHERE calendar_connection_id = $1 OR user_id = $2 
       ORDER BY updated_at DESC LIMIT 1`,
      [connectionId, conn.user_id]
    )
    const targetCalendarId = policy?.external_calendar_id || 'primary'

    // Fetch events created by TaskFlow
    const listRes = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(
        targetCalendarId
      )}/events?q=${encodeURIComponent('[TaskFlow]')}&maxResults=100`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    )

    let deletedCount = 0
    if (listRes.ok) {
      const data = await listRes.json()
      const items = data.items || []

      for (const it of items) {
        if (it.summary?.includes('[TaskFlow]')) {
          try {
            const delRes = await fetch(
              `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(
                targetCalendarId
              )}/events/${encodeURIComponent(it.id)}`,
              {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${accessToken}` },
              }
            )
            if (delRes.ok || delRes.status === 204) {
              deletedCount++
            }
          } catch {}
        }
      }
    }

    return apiSuccess({
      deletedCount,
      targetCalendar: targetCalendarId,
      message: `Cleared ${deletedCount} TaskFlow event(s) from your Google Calendar.`,
    })
  } catch (err: any) {
    console.error('[calendar/clear-events] Error:', err)
    return apiError(err.message || 'Failed to clear calendar events', 500)
  }
}
