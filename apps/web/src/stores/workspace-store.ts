import { create } from 'zustand'
import { apiClient } from '@/lib/api-client'

export interface Workspace {
  id: string
  organizationId: string
  name: string
  slug: string
  description?: string
  color: string
  icon: string
  createdAt: string
}

export interface WorkspaceMember {
  id: string
  userId: string
  email?: string
  displayName?: string
  avatarUrl?: string
  role: string
  joinedAt: string
}

export interface Team {
  id: string
  workspaceId: string
  name: string
  description?: string
  color: string
  icon: string
  memberCount: number
  createdAt: string
}

interface WorkspaceState {
  workspaces: Workspace[]
  currentWorkspace: Workspace | null
  members: WorkspaceMember[]
  teams: Team[]
  isLoading: boolean
  error: string | null

  fetchWorkspaces: (orgId: string) => Promise<Workspace[]>
  setCurrentWorkspace: (workspace: Workspace | null) => void
  createWorkspace: (orgId: string, data: { name: string; description?: string; color?: string; icon?: string }) => Promise<Workspace>
  updateWorkspace: (orgId: string, workspaceId: string, data: { name?: string; description?: string; color?: string; icon?: string }) => Promise<Workspace>
  fetchTeams: (workspaceId: string) => Promise<Team[]>
  createTeam: (workspaceId: string, data: { name: string; description?: string; color?: string; icon?: string }) => Promise<Team>
  fetchMembers: (workspaceId: string) => Promise<WorkspaceMember[]>
}

export const useWorkspaceStore = create<WorkspaceState>((set, get) => ({
  workspaces: [],
  currentWorkspace: null,
  members: [],
  teams: [],
  isLoading: false,
  error: null,

  fetchWorkspaces: async (orgId: string) => {
    if (!orgId) {
      set({ workspaces: [], currentWorkspace: null, isLoading: false })
      return []
    }
    set({ isLoading: true, error: null })
    try {
      const res = await apiClient.get<Workspace[]>(`/api/v1/organizations/${orgId}/workspaces`)
      const list = res.data || []
      const current = get().currentWorkspace
      const validCurrent = list.find((w) => w.id === current?.id) || list[0] || null
      set({
        workspaces: list,
        currentWorkspace: validCurrent,
        isLoading: false,
      })
      return list
    } catch (err: any) {
      set({ error: err?.message || 'Failed to fetch workspaces', isLoading: false, workspaces: [], currentWorkspace: null })
      return []
    }
  },

  setCurrentWorkspace: (workspace) => set({ currentWorkspace: workspace }),

  createWorkspace: async (orgId, data) => {
    set({ isLoading: true, error: null })
    try {
      const res = await apiClient.post<Workspace>(`/api/v1/organizations/${orgId}/workspaces`, data)
      const newWs = res.data
      set((state) => ({
        workspaces: [...state.workspaces, newWs],
        currentWorkspace: newWs,
        isLoading: false,
      }))
      return newWs
    } catch (err: any) {
      set({ error: err?.message || 'Failed to create workspace', isLoading: false })
      throw err
    }
  },

  updateWorkspace: async (orgId, workspaceId, data) => {
    set({ isLoading: true, error: null })
    try {
      const res = await apiClient.put<Workspace>(
        `/api/v1/organizations/${orgId}/workspaces/${workspaceId}`,
        data
      )
      const updatedWs = res.data
      set((state) => ({
        workspaces: state.workspaces.map((w) => (w.id === workspaceId ? updatedWs : w)),
        currentWorkspace: state.currentWorkspace?.id === workspaceId ? updatedWs : state.currentWorkspace,
        isLoading: false,
      }))
      return updatedWs
    } catch (err: any) {
      set({ error: err?.message || 'Failed to update workspace', isLoading: false })
      throw err
    }
  },

  fetchTeams: async (workspaceId: string) => {
    try {
      const res = await apiClient.get<Team[]>(`/api/v1/workspaces/${workspaceId}/teams`)
      const teams = res.data || []
      set({ teams })
      return teams
    } catch (err: any) {
      set({ error: err?.message || 'Failed to fetch teams' })
      return []
    }
  },

  createTeam: async (workspaceId, data) => {
    const res = await apiClient.post<Team>(`/api/v1/workspaces/${workspaceId}/teams`, data)
    set((state) => ({ teams: [...state.teams, res.data] }))
    return res.data
  },

  fetchMembers: async (workspaceId: string) => {
    try {
      const res = await apiClient.get<WorkspaceMember[]>(`/api/v1/workspaces/${workspaceId}/members`)
      const members = res.data || []
      set({ members })
      return members
    } catch (err: any) {
      set({ error: err?.message || 'Failed to fetch workspace members' })
      return []
    }
  },
}))
