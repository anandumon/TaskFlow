import { create } from 'zustand'
import { apiClient } from '@/lib/api-client'

export interface Project {
  id: string
  workspaceId: string
  name: string
  slug: string
  description?: string
  status: 'ACTIVE' | 'IN_PROGRESS' | 'REVIEW' | 'COMPLETED'
  progress: number
  color: string
  icon: string
  environments?: string
  totalTasks?: number
  completedTasks?: number
  createdAt: string
  updatedAt: string
}

interface ProjectState {
  projects: Project[]
  isLoading: boolean
  error: string | null

  loadProjects: (workspaceId: string) => Promise<void>
  createProject: (workspaceId: string, data: {
    name: string
    description?: string
    status?: string
    progress?: number
    color?: string
    icon?: string
    environments?: string
  }) => Promise<Project>
  updateProject: (id: string, data: Partial<Project>) => Promise<void>
  deleteProject: (id: string) => Promise<void>
}

export const useProjectStore = create<ProjectState>((set, get) => ({
  projects: [],
  isLoading: false,
  error: null,

  loadProjects: async (workspaceId: string) => {
    if (!workspaceId) return
    set({ isLoading: true, error: null })
    try {
      const res = await apiClient.get<Project[]>(`/api/v1/workspaces/${workspaceId}/projects`)
      set({ projects: res.data || [], isLoading: false })
    } catch (err: any) {
      set({ error: err?.message || 'Failed to load projects', isLoading: false })
    }
  },

  createProject: async (workspaceId, data) => {
    set({ isLoading: true, error: null })
    try {
      const res = await apiClient.post<Project>(`/api/v1/workspaces/${workspaceId}/projects`, data)
      const newProj = res.data
      set((state) => ({
        projects: [newProj, ...state.projects],
        isLoading: false,
      }))
      return newProj
    } catch (err: any) {
      set({ error: err?.message || 'Failed to create project', isLoading: false })
      throw err
    }
  },

  updateProject: async (id, data) => {
    try {
      const res = await apiClient.patch<Project>(`/api/v1/projects/${id}`, data)
      set((state) => ({
        projects: state.projects.map((p) => (p.id === id ? res.data : p)),
      }))
    } catch (err: any) {
      set({ error: err?.message || 'Failed to update project' })
      throw err
    }
  },

  deleteProject: async (id) => {
    try {
      await apiClient.delete(`/api/v1/projects/${id}`)
      set((state) => ({
        projects: state.projects.filter((p) => p.id !== id),
      }))
    } catch (err: any) {
      set({ error: err?.message || 'Failed to delete project' })
      throw err
    }
  },
}))
