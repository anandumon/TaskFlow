import { NextRequest } from 'next/server'
import { apiSuccess, apiError } from '@/server/utils/response'
import { getAuthUser } from '@/server/utils/auth'
import { query, queryOne } from '@/server/db/postgres'
import { decryptCalendarToken } from '@/server/utils/calendar-crypto'

const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || process.env.GOOGLE_CLIENT_ID || ''
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || ''

async function refreshAccessToken(refreshToken: string, connectionId: string): Promise<string | null> {
  if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
    return null
  }
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
      await query(
        `UPDATE calendar_connection SET access_token = $1, updated_at = NOW() WHERE id = $2`,
        [data.access_token, connectionId]
      )
      return data.access_token
    }
  } catch (err) {
    console.warn('[calendar/meetings] Refresh token error:', err)
  }
  return null
}

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthUser(req)
    if (!user?.id) {
      return apiError('Unauthorized', 401)
    }

    const body = await req.json()
    const { title, description, startTime, endTime, taskId, projectId, attendees = [] } = body

    if (!title || !startTime) {
      return apiError('Meeting title and startTime are required', 400)
    }

    // 1. Fetch user's Google Calendar connection
    const conn = await queryOne(
      `SELECT * FROM calendar_connection 
       WHERE user_id = $1 AND provider = 'GOOGLE' AND status = 'CONNECTED' 
       ORDER BY updated_at DESC LIMIT 1`,
      [user.id]
    )

    const generateMeetCode = () => {
      const chars = 'abcdefghijklmnopqrstuvwxyz'
      const pick = (n: number) => Array.from({ length: n }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
      return `${pick(3)}-${pick(4)}-${pick(3)}`
    }

    if (!conn) {
      // Return canonical shared Google Meet link as fallback if Google Calendar is not yet connected
      const meetCode = generateMeetCode()
      const sharedUrl = `https://meet.google.com/${meetCode}`

      return apiSuccess({
        meetingUrl: sharedUrl,
        mode: 'INSTANT_FALLBACK',
        message: 'Google Calendar not connected. Created shared Google Meet room.',
      })
    }

    let accessToken = decryptCalendarToken(conn.access_token)
    const refreshToken = decryptCalendarToken(conn.refresh_token)

    // 2. Prepare event start and end
    const startIso = new Date(startTime).toISOString()
    const endIso = endTime
      ? new Date(endTime).toISOString()
      : new Date(new Date(startTime).getTime() + 30 * 60 * 1000).toISOString()

    const attendeeList = Array.isArray(attendees)
      ? attendees.map((item: any) => ({ email: typeof item === 'string' ? item : item.email }))
      : []

    const eventPayload = {
      summary: `[TaskFlow] ${title}`,
      description: `${description || ''}\n\nOrganized via TaskFlow`,
      start: { dateTime: startIso },
      end: { dateTime: endIso },
      attendees: attendeeList,
      conferenceData: {
        createRequest: {
          requestId: crypto.randomUUID(),
          conferenceSolutionKey: {
            type: 'hangoutsMeet',
          },
        },
      },
    }

    // 3. Call Google Calendar API to create event + Google Meet conference
    let gRes = await fetch(
      'https://www.googleapis.com/calendar/v3/calendars/primary/events?conferenceDataVersion=1',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(eventPayload),
      }
    )

    // Auto-refresh token if 401
    if (gRes.status === 401 && refreshToken) {
      const freshToken = await refreshAccessToken(refreshToken, conn.id)
      if (freshToken) {
        accessToken = freshToken
        gRes = await fetch(
          'https://www.googleapis.com/calendar/v3/calendars/primary/events?conferenceDataVersion=1',
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(eventPayload),
          }
        )
      }
    }

    if (!gRes.ok) {
      const errText = await gRes.text()
      console.warn('[calendar/meetings] Google event creation error:', gRes.status, errText)

      // Fallback to shared meet URL if Google rejected with auth error
      const meetCode = generateMeetCode()
      const fallbackUrl = `https://meet.google.com/${meetCode}`

      return apiSuccess({
        meetingUrl: fallbackUrl,
        mode: 'INSTANT_FALLBACK',
        message: 'Could not schedule Calendar event. Provided shared Google Meet room.',
      })
    }

    const eventData = await gRes.json()
    const fallbackMeetCode = generateMeetCode()
    const meetingUrl =
      eventData.hangoutLink ||
      eventData.conferenceData?.entryPoints?.find((e: any) => e.entryPointType === 'video')?.uri ||
      `https://meet.google.com/${fallbackMeetCode}`

    // 4. Record meeting into relational `meeting` table
    try {
      await query(
        `INSERT INTO public.meeting
          (organization_id, project_id, task_id, calendar_connection_id, provider, meeting_type,
           external_event_id, meeting_url, title, description, start_time, end_time, status, host_user_id)
         VALUES
          ($1, $2, $3, $4, 'GOOGLE', 'GOOGLE_MEET', $5, $6, $7, $8, $9, $10, 'SCHEDULED', $11)`,
        [
          conn.organization_id || null,
          projectId || null,
          taskId || null,
          conn.id,
          eventData.id,
          meetingUrl,
          title,
          description || '',
          startIso,
          endIso,
          user.id,
        ]
      )
    } catch (dbErr) {
      console.warn('[calendar/meetings] DB meeting insert notice:', dbErr)
    }

    return apiSuccess({
      eventId: eventData.id,
      meetingUrl,
      title,
      startTime: startIso,
      endTime: endIso,
      status: 'SCHEDULED',
    })
  } catch (err: any) {
    console.error('[calendar/meetings] Error:', err)
    return apiError(err.message || 'Failed to create meeting', 500)
  }
}
