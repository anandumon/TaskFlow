import { query, queryOne } from '../db/postgres'
import crypto from 'crypto'
import { decryptCalendarToken, encryptCalendarToken } from '../utils/calendar-crypto'

export interface CalendarConnectionDto {
  id: string
  userId?: string
  provider: string
  providerEmail?: string
  connected: boolean
  syncStatus: string
  lastSyncAt?: string
  createdAt: string
}

export interface ExternalCalendarDto {
  id: string
  connectionId: string
  externalCalendarId: string
  name: string
  description?: string
  timezone?: string
  isPrimary: boolean
  canRead: boolean
  canWrite: boolean
  syncEnabled: boolean
}

export interface CalendarSyncPolicyDto {
  id?: string
  syncTasks: boolean
  syncProjects: boolean
  syncDeadlines: boolean
  syncReminders: boolean
  importExternalEvents: boolean
  exportTaskflowEvents: boolean
  defaultTaskDurationMinutes: number
  defaultReminderMinutes: number
  deleteExternalOnTaskDelete: boolean
  targetCalendarId?: string
}

const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || process.env.GOOGLE_CLIENT_ID || ''
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || ''

function isUuid(val?: string | null): boolean {
  if (!val || typeof val !== 'string') return false
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val.trim())
}

function resolveUserId(userId?: string | null): string {
  if (isUuid(userId)) return userId!.trim()
  return '543cb7a9-44dc-4a3e-844c-020d52cefca7'
}

export async function listConnections(userId?: string): Promise<CalendarConnectionDto[]> {
  try {
    const effectiveUserId = resolveUserId(userId)
    const rows = await query(`SELECT * FROM calendar_connection WHERE user_id = $1`, [effectiveUserId])

    return rows.map((row: any) => ({
      id: String(row.id),
      userId: row.user_id ? String(row.user_id) : undefined,
      provider: row.provider || 'GOOGLE',
      providerEmail: row.provider_email || row.providerEmail,
      connected: row.status === 'ACTIVE' || row.status === 'CONNECTED' || row.connected !== false,
      syncStatus: row.last_sync_error ? 'ERROR' : 'IDLE',
      lastSyncAt: row.last_sync_at ? new Date(row.last_sync_at).toISOString() : undefined,
      createdAt: row.created_at ? new Date(row.created_at).toISOString() : new Date().toISOString(),
    }))
  } catch (err) {
    console.warn('[calendar.service] listConnections error:', err)
    return []
  }
}

export async function saveDirectTokens(
  userId: string,
  provider: string,
  accessToken: string,
  refreshToken?: string,
  email?: string
): Promise<CalendarConnectionDto> {
  const effectiveUserId = resolveUserId(userId)
  const providerUpper = provider.toUpperCase()
  const now = new Date()

  const existing = await queryOne(
    `SELECT * FROM calendar_connection WHERE user_id = $1 AND provider = $2 LIMIT 1`,
    [effectiveUserId, providerUpper]
  )

  const id = existing?.id || crypto.randomUUID()
  const tokenBuf = encryptCalendarToken(accessToken)
  const refreshBuf = refreshToken ? encryptCalendarToken(refreshToken) : null

  if (existing) {
    await query(
      `UPDATE calendar_connection SET
        provider_email = $1, access_token = $2,
        refresh_token = COALESCE($3, refresh_token),
        status = 'CONNECTED', updated_at = $4
       WHERE id = $5`,
      [email || existing.provider_email || '', tokenBuf, refreshBuf, now, id]
    )
  } else {
    await query(
      `INSERT INTO calendar_connection (
        id, user_id, provider, provider_email, access_token, refresh_token,
        status, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, 'CONNECTED', $7, $7)`,
      [id, effectiveUserId, providerUpper, email || '', tokenBuf, refreshBuf, now]
    )
  }

  try {
    if (providerUpper === 'GOOGLE') {
      await fetchAndStoreGoogleCalendars(id, accessToken)
    }
  } catch (e) {
    console.warn('[calendar.service] fetchAndStoreGoogleCalendars error:', e)
  }

  return {
    id: String(id),
    userId: effectiveUserId,
    provider: providerUpper,
    providerEmail: email,
    connected: true,
    syncStatus: 'IDLE',
    createdAt: now.toISOString(),
  }
}

export async function handleOAuthCode(
  userId: string,
  provider: string,
  code: string,
  redirectUri?: string
): Promise<CalendarConnectionDto> {
  const effectiveUserId = resolveUserId(userId)
  if (provider.toUpperCase() === 'GOOGLE') {
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET,
        redirect_uri: redirectUri || 'http://localhost:3000/app/calendar/callback',
        grant_type: 'authorization_code',
      }),
    })

    const tokenData = await tokenRes.json()
    if (!tokenRes.ok || !tokenData.access_token) {
      throw new Error(tokenData.error_description || 'Failed to exchange Google OAuth code')
    }

    let email = ''
    try {
      const userRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: { Authorization: `Bearer ${tokenData.access_token}` },
      })
      const userInfo = await userRes.json()
      email = userInfo.email || ''
    } catch {}

    return saveDirectTokens(effectiveUserId, 'GOOGLE', tokenData.access_token, tokenData.refresh_token, email)
  }

  throw new Error(`Provider ${provider} not supported`)
}

export async function fetchAndStoreGoogleCalendars(connectionId: string, accessToken: string) {
  try {
    const res = await fetch('https://www.googleapis.com/calendar/v3/users/me/calendarList', {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
    if (!res.ok) return

    const data = await res.json()
    const items = data.items || []

    for (const it of items) {
      const isPrimary = Boolean(it.primary)
      const canWrite = it.accessRole === 'writer' || it.accessRole === 'owner'
      const now = new Date()

      const existing = await queryOne(
        `SELECT id FROM external_calendar WHERE connection_id = $1 AND external_calendar_id = $2`,
        [connectionId, it.id]
      )

      if (existing) {
        await query(
          `UPDATE external_calendar SET name = $1, description = $2, timezone = $3,
           is_primary = $4, can_read = true, can_write = $5, sync_enabled = true, updated_at = $6
           WHERE id = $7`,
          [it.summary || 'Calendar', it.description || '', it.timeZone || 'UTC', isPrimary, canWrite, now, existing.id]
        )
      } else {
        await query(
          `INSERT INTO external_calendar (
            id, connection_id, external_calendar_id, name, description, timezone,
            is_primary, can_read, can_write, sync_enabled, created_at, updated_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, true, $8, true, $9, $9)`,
          [
            crypto.randomUUID(),
            connectionId,
            it.id,
            it.summary || 'Calendar',
            it.description || '',
            it.timeZone || 'UTC',
            isPrimary,
            canWrite,
            now,
          ]
        )
      }
    }
  } catch (err) {
    console.warn('[calendar.service] Failed to fetch Google calendars:', err)
  }
}

export async function listExternalCalendars(connectionId: string): Promise<ExternalCalendarDto[]> {
  try {
    const stored = await query(
      `SELECT * FROM external_calendar WHERE connection_id = $1`,
      [connectionId]
    )

    if (stored.length > 0) {
      return stored.map((s: any) => ({
        id: String(s.id),
        connectionId: String(s.connection_id),
        externalCalendarId: s.external_calendar_id,
        name: s.name,
        description: s.description,
        timezone: s.timezone,
        isPrimary: Boolean(s.is_primary),
        canRead: Boolean(s.can_read),
        canWrite: Boolean(s.can_write),
        syncEnabled: Boolean(s.sync_enabled),
      }))
    }

    const conn = await queryOne(`SELECT access_token FROM calendar_connection WHERE id = $1`, [connectionId])
    if (conn?.access_token) {
      const tokenStr = decryptCalendarToken(conn.access_token)
      await fetchAndStoreGoogleCalendars(connectionId, tokenStr)
      const newlyStored = await query(`SELECT * FROM external_calendar WHERE connection_id = $1`, [connectionId])
      return newlyStored.map((s: any) => ({
        id: String(s.id),
        connectionId: String(s.connection_id),
        externalCalendarId: s.external_calendar_id,
        name: s.name,
        description: s.description,
        timezone: s.timezone,
        isPrimary: Boolean(s.is_primary),
        canRead: Boolean(s.can_read),
        canWrite: Boolean(s.can_write),
        syncEnabled: Boolean(s.sync_enabled),
      }))
    }
  } catch (err) {
    console.warn('[calendar.service] listExternalCalendars error:', err)
  }

  return []
}

export async function getSyncPolicy(userId?: string): Promise<CalendarSyncPolicyDto> {
  const effectiveUserId = resolveUserId(userId)
  try {
    const data = await queryOne(
      `SELECT * FROM calendar_sync_policy WHERE user_id = $1 ORDER BY created_at DESC LIMIT 1`,
      [effectiveUserId]
    )

    if (data) {
      return {
        id: String(data.id),
        syncTasks: data.sync_tasks ?? true,
        syncProjects: data.sync_projects ?? true,
        syncDeadlines: data.sync_deadlines ?? true,
        syncReminders: data.sync_reminders ?? true,
        importExternalEvents: data.import_external_events ?? false,
        exportTaskflowEvents: data.export_taskflow_events ?? true,
        defaultTaskDurationMinutes: data.default_task_duration_minutes ?? 30,
        defaultReminderMinutes: data.default_reminder_minutes ?? 30,
        deleteExternalOnTaskDelete: data.delete_external_on_task_delete ?? true,
        targetCalendarId: data.external_calendar_id,
      }
    }
  } catch (err) {
    console.warn('[calendar.service] getSyncPolicy error:', err)
  }

  return {
    syncTasks: true,
    syncProjects: true,
    syncDeadlines: true,
    syncReminders: true,
    importExternalEvents: false,
    exportTaskflowEvents: true,
    defaultTaskDurationMinutes: 30,
    defaultReminderMinutes: 30,
    deleteExternalOnTaskDelete: true,
  }
}

export async function updateSyncPolicy(
  userId: string,
  policy: Partial<CalendarSyncPolicyDto>
): Promise<CalendarSyncPolicyDto> {
  const effectiveUserId = resolveUserId(userId)
  const now = new Date()
  const existing = await queryOne(`SELECT id FROM calendar_sync_policy WHERE user_id = $1 LIMIT 1`, [effectiveUserId])

  if (existing) {
    await query(
      `UPDATE calendar_sync_policy SET
        sync_tasks = $1, sync_projects = $2, sync_deadlines = $3, sync_reminders = $4,
        import_external_events = $5, export_taskflow_events = $6,
        default_task_duration_minutes = $7, default_reminder_minutes = $8,
        delete_external_on_task_delete = $9, external_calendar_id = $10, updated_at = $11
       WHERE id = $12`,
      [
        policy.syncTasks ?? true,
        policy.syncProjects ?? true,
        policy.syncDeadlines ?? true,
        policy.syncReminders ?? true,
        policy.importExternalEvents ?? false,
        policy.exportTaskflowEvents ?? true,
        policy.defaultTaskDurationMinutes ?? 30,
        policy.defaultReminderMinutes ?? 30,
        policy.deleteExternalOnTaskDelete ?? true,
        policy.targetCalendarId || null,
        now,
        existing.id,
      ]
    )
  } else {
    await query(
      `INSERT INTO calendar_sync_policy (
        id, user_id, sync_tasks, sync_projects, sync_deadlines, sync_reminders,
        import_external_events, export_taskflow_events, default_task_duration_minutes,
        default_reminder_minutes, delete_external_on_task_delete, external_calendar_id,
        created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $13)`,
      [
        crypto.randomUUID(),
        effectiveUserId,
        policy.syncTasks ?? true,
        policy.syncProjects ?? true,
        policy.syncDeadlines ?? true,
        policy.syncReminders ?? true,
        policy.importExternalEvents ?? false,
        policy.exportTaskflowEvents ?? true,
        policy.defaultTaskDurationMinutes ?? 30,
        policy.defaultReminderMinutes ?? 30,
        policy.deleteExternalOnTaskDelete ?? true,
        policy.targetCalendarId || null,
        now,
      ]
    )
  }

  return getSyncPolicy(effectiveUserId)
}

export async function disconnectConnection(connectionId: string): Promise<void> {
  await query(`DELETE FROM calendar_connection WHERE id = $1`, [connectionId])
  await query(`DELETE FROM external_calendar WHERE connection_id = $1`, [connectionId])
}
