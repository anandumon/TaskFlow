import { NextRequest } from 'next/server'
import { apiSuccess, apiError } from '@/server/utils/response'
import { getAuthUser } from '@/server/utils/auth'
import { query, queryOne } from '@/server/db/postgres'
import { decryptCalendarToken } from '@/server/utils/calendar-crypto'

async function fetchWithTimeout(url: string, init: RequestInit, timeoutMs = 5000): Promise<Response> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const res = await fetch(url, { ...init, signal: controller.signal })
    return res
  } finally {
    clearTimeout(timer)
  }
}

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
    const listRes = await fetchWithTimeout(
      `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(
        targetCalendarId
      )}/events?q=${encodeURIComponent('[TaskFlow]')}&maxResults=100`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      },
      8000
    ).catch(() => null)

    let deletedCount = 0
    if (listRes && listRes.ok) {
      const data = await listRes.json().catch(() => ({}))
      const items = (data.items || []).filter((it: any) => it.summary?.includes('[TaskFlow]'))

      const BATCH_SIZE = 5
      for (let i = 0; i < items.length; i += BATCH_SIZE) {
        const chunk = items.slice(i, i + BATCH_SIZE)
        await Promise.allSettled(
          chunk.map(async (it: any) => {
            try {
              const delRes = await fetchWithTimeout(
                `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(
                  targetCalendarId
                )}/events/${encodeURIComponent(it.id)}`,
                {
                  method: 'DELETE',
                  headers: { Authorization: `Bearer ${accessToken}` },
                },
                4000
              )
              if (delRes.ok || delRes.status === 204) {
                deletedCount++
              }
            } catch {}
          })
        )
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
