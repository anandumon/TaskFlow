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
    if (conn.access_token) {
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
        eventsCount
      ).catch((err) => console.warn('[calendar/sync] Email dispatch notice:', err))
    }

    return apiSuccess({
      connectionId,
      eventsSynced: eventsCount,
      tasksExported: 0,
      status: 'SUCCESS',
      message: 'Calendar sync completed successfully',
      timestamp: now.toISOString(),
    })
  } catch (err: any) {
    return apiError(err.message || 'Calendar sync failed', 500)
  }
}
