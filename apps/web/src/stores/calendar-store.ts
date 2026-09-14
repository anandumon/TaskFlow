import { create } from 'zustand'
import { apiClient } from '@/lib/api-client'
import { supabase } from '@/lib/supabase/client'

export interface CalendarConnection {
  id: string
  provider: 'google' | 'microsoft'
  providerAccountId?: string
  providerEmail?: string
  status: string
  lastSyncAt?: string
  lastSuccessfulSyncAt?: string
  lastSyncStartedAt?: string
  lastSyncError?: string
  createdAt: string
}

export interface ExternalCalendar {
  id: string
  name: string
  description?: string
  timeZone?: string
  color?: string
  isPrimary: boolean
  canRead: boolean
  canWrite: boolean
}

export interface CalendarSyncPolicy {
  id?: string
  workspaceId?: string
  calendarConnectionId?: string
  externalCalendarId?: string
  syncTasks: boolean
  syncProjects: boolean
  syncDeadlines: boolean
  syncReminders: boolean
  importExternalEvents: boolean
  exportTaskflowEvents: boolean
  defaultTaskDurationMinutes: number
  defaultReminderMinutes: number
  deleteExternalOnTaskDelete: boolean
}

export interface CalendarUnifiedEvent {
  id: string
  title: string
  description?: string
  startAt: string
  endAt: string
  allDay: boolean
  status: string
  meetingUrl?: string
  location?: string
  source: 'TASKFLOW' | 'GOOGLE' | 'MICROSOFT'
  taskId?: string
  projectId?: string
  calendarId?: string
}

export interface CalendarSyncResult {
  success: boolean
  connectionId: string
  externalCalendarId?: string
  eventsCreated: number
  eventsUpdated: number
  eventsDeleted: number
  errors: string[]
}

interface CalendarState {
  connections: CalendarConnection[]
  calendars: Record<string, ExternalCalendar[]> // connectionId -> list of calendars
  policy: CalendarSyncPolicy | null
  unifiedEvents: CalendarUnifiedEvent[]
  isLoading: boolean
  isSyncing: boolean
  error: string | null

  fetchConnections: () => Promise<CalendarConnection[]>
  getAuthUrl: (provider: 'google' | 'microsoft', workspaceId?: string) => Promise<string>
  connectViaSupabase: (provider: 'google') => Promise<void>
  saveDirectTokens: (provider: string, accessToken: string, refreshToken?: string, email?: string) => Promise<CalendarConnection>
  handleCallback: (provider: 'google' | 'microsoft', code: string, workspaceId?: string) => Promise<CalendarConnection>
  fetchCalendars: (connectionId: string) => Promise<ExternalCalendar[]>
  fetchPolicy: (workspaceId?: string) => Promise<CalendarSyncPolicy>
  updatePolicy: (policy: Partial<CalendarSyncPolicy>) => Promise<CalendarSyncPolicy>
  triggerSync: (connectionId: string) => Promise<CalendarSyncResult>
  disconnect: (connectionId: string) => Promise<void>
  fetchUnifiedEvents: (workspaceId?: string, start?: string, end?: string) => Promise<CalendarUnifiedEvent[]>
}

export const useCalendarStore = create<CalendarState>((set, get) => ({
  connections: [],
  calendars: {},
  policy: null,
  unifiedEvents: [],
  isLoading: false,
  isSyncing: false,
  error: null,

  fetchConnections: async () => {
    set({ isLoading: true, error: null })
    try {
      const res = await apiClient.get<CalendarConnection[]>('/api/v1/calendar/connections')
      const connections = res.data || []
      set({ connections, isLoading: false })

      // Auto fetch calendars for all active connections
      for (const conn of connections) {
        get().fetchCalendars(conn.id).catch(() => {})
      }
      return connections
    } catch (err: any) {
      set({ error: err.message || 'Failed to fetch calendar connections', isLoading: false })
      return []
    }
  },

  connectViaSupabase: async (provider = 'google') => {
    const redirectOrigin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000'
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        scopes: 'https://www.googleapis.com/auth/calendar https://www.googleapis.com/auth/calendar.events',
        redirectTo: `${redirectOrigin}/app/calendar/callback?source=supabase`,
        queryParams: {
          access_type: 'offline',
          prompt: 'consent',
        },
      },
    })
    if (error) throw error
  },

  saveDirectTokens: async (provider: string, accessToken: string, refreshToken?: string, email?: string) => {
    set({ isLoading: true, error: null })
    try {
      const res = await apiClient.post<CalendarConnection>(`/api/v1/calendar/callback/${provider}`, {
        accessToken,
        refreshToken,
        email,
      })
      await get().fetchConnections()
      set({ isLoading: false })
      return res.data
    } catch (err: any) {
      set({ error: err.message || 'Failed to save calendar integration tokens', isLoading: false })
      throw err
    }
  },

  getAuthUrl: async (provider, workspaceId) => {
    const params = new URLSearchParams()
    if (workspaceId) params.append('workspaceId', workspaceId)
    if (typeof window !== 'undefined') {
      params.append('redirectUri', `${window.location.origin}/app/calendar/callback`)
    }
    const url = `/api/v1/calendar/connect/${provider}?${params.toString()}`
    const res = await apiClient.get<{ authorizationUrl: string }>(url)
    return res.data.authorizationUrl
  },

  handleCallback: async (provider, code, workspaceId) => {
    set({ isLoading: true, error: null })
    try {
      const redirectUri = typeof window !== 'undefined'
        ? `${window.location.origin}/app/calendar/callback`
        : undefined
      const res = await apiClient.post<CalendarConnection>(`/api/v1/calendar/callback/${provider}`, {
        code,
        workspaceId,
        redirectUri,
      })
      await get().fetchConnections()
      set({ isLoading: false })
      return res.data
    } catch (err: any) {
      set({ error: err.message || 'OAuth code exchange failed', isLoading: false })
      throw err
    }
  },

  fetchCalendars: async (connectionId: string) => {
    try {
      const res = await apiClient.get<ExternalCalendar[]>(`/api/v1/calendar/connections/${connectionId}/calendars`)
      const list = res.data || []
      set(state => ({
        calendars: { ...state.calendars, [connectionId]: list }
      }))
      return list
    } catch (err: any) {
      console.warn(`Failed to fetch calendars for connection ${connectionId}:`, err)
      return []
    }
  },

  fetchPolicy: async (workspaceId?: string) => {
    try {
      const query = workspaceId ? `?workspaceId=${workspaceId}` : ''
      const res = await apiClient.get<CalendarSyncPolicy>(`/api/v1/calendar/policy${query}`)
      const policy = res.data
      set({ policy })
      return policy
    } catch (err: any) {
      console.warn('Failed to fetch sync policy:', err)
      throw err
    }
  },

  updatePolicy: async (policyUpdate: Partial<CalendarSyncPolicy>) => {
    set({ isLoading: true, error: null })
    try {
      const current = get().policy || {
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
      const merged = { ...current, ...policyUpdate }
      const res = await apiClient.put<CalendarSyncPolicy>('/api/v1/calendar/policy', merged)
      set({ policy: res.data, isLoading: false })
      return res.data
    } catch (err: any) {
      set({ error: err.message || 'Failed to update calendar sync policy', isLoading: false })
      throw err
    }
  },

  triggerSync: async (connectionId: string) => {
    set({ isSyncing: true, error: null })
    try {
      const res = await apiClient.post<CalendarSyncResult>(`/api/v1/calendar/sync/${connectionId}`)
      await get().fetchConnections()
      set({ isSyncing: false })
      return res.data
    } catch (err: any) {
      set({ error: err.message || 'Sync failed', isSyncing: false })
      throw err
    }
  },

  disconnect: async (connectionId: string) => {
    set({ isLoading: true, error: null })
    try {
      await apiClient.delete(`/api/v1/calendar/connections/${connectionId}`)
      set(state => ({
        connections: state.connections.filter(c => c.id !== connectionId),
        isLoading: false,
      }))
    } catch (err: any) {
      set({ error: err.message || 'Failed to disconnect calendar', isLoading: false })
      throw err
    }
  },

  fetchUnifiedEvents: async (workspaceId?: string, start?: string, end?: string) => {
    try {
      const params = new URLSearchParams()
      if (workspaceId) params.append('workspaceId', workspaceId)
      if (start) params.append('start', start)
      if (end) params.append('end', end)
      const res = await apiClient.get<CalendarUnifiedEvent[]>(`/api/v1/calendar/events?${params.toString()}`)
      const events = res.data || []
      set({ unifiedEvents: events })
      return events
    } catch (err: any) {
      console.warn('Failed to fetch unified events:', err)
      return []
    }
  }
}))
