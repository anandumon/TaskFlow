import { create } from 'zustand'
import { apiClient } from '@/lib/api-client'
import { useWorkspaceStore } from './workspace-store'

export interface Organization {
  id: string
  name: string
  slug: string
  logoUrl?: string
  plan: string
  ownerId: string
  createdAt: string
}

export interface OrgMember {
  id: string
  userId: string
  email?: string
  firstName?: string
  lastName?: string
  avatarUrl?: string
  role: string
  roleId: string
  joinedAt: string
}

export interface ProjectResource {
  id: string
  name: string
  slug: string
  color?: string
  icon?: string
  status?: string
  role?: string
}

export interface WorkspaceResource {
  id: string
  name: string
  slug: string
  color?: string
  icon?: string
  role?: string
  projects: ProjectResource[]
}

export interface OrgResource {
  id: string
  name: string
  slug: string
  logoUrl?: string
  role: string
  isOwner: boolean
  workspaces: WorkspaceResource[]
}

export interface UserResourceTree {
  personalSpace?: {
    id: string
    name: string
    description?: string
  }
  organizations: OrgResource[]
}

interface OrgState {
  organizations: Organization[]
  currentOrg: Organization | null
  members: OrgMember[]
  resourceTree: UserResourceTree | null
  isLoading: boolean
  error: string | null

  fetchOrganizations: () => Promise<Organization[]>
  fetchUserResources: () => Promise<UserResourceTree | null>
  setCurrentOrg: (org: Organization | null) => void
  createOrganization: (name: string, workspaceName?: string, workspaceColor?: string) => Promise<Organization>
  fetchMembers: (orgId: string) => Promise<OrgMember[]>
  addMember: (orgId: string, userId: string, roleId?: string) => Promise<OrgMember>
  removeMember: (orgId: string, memberId: string) => Promise<void>
  updateOrg: (orgId: string, data: { name?: string; logoUrl?: string }) => Promise<Organization>
  deleteOrganization: (orgId: string) => Promise<void>
}

export const useOrgStore = create<OrgState>((set, get) => ({
  organizations: [],
  currentOrg: null,
  members: [],
  resourceTree: null,
  isLoading: false,
  error: null,

  fetchUserResources: async () => {
    try {
      const res = await apiClient.get<UserResourceTree>('/api/v1/me/resources')
      const tree = res.data || null
      set({ resourceTree: tree })
      return tree
    } catch (err: any) {
      console.warn('Failed to fetch user resource tree', err)
      return null
    }
  },

  fetchOrganizations: async () => {
    if (get().organizations.length === 0) {
      set({ isLoading: true, error: null })
    }
    try {
      const res = await apiClient.get<Organization[]>('/api/v1/organizations')
      const orgs = res.data || []
      const current = get().currentOrg
      const validCurrent = orgs.find((o) => o.id === current?.id) || orgs[0] || null
      set({
        organizations: orgs,
        currentOrg: validCurrent,
        isLoading: false,
      })
      return orgs
    } catch (err: any) {
      set({ error: err?.message || 'Failed to fetch organizations', isLoading: false, organizations: [], currentOrg: null })
      return []
    }
  },

  setCurrentOrg: (org) => set({ currentOrg: org }),

  createOrganization: async (name: string, workspaceName?: string, workspaceColor?: string) => {
    set({ isLoading: true, error: null })
    try {
      const res = await apiClient.post<Organization>('/api/v1/organizations', {
        name,
        workspaceName,
        workspaceColor,
      })
      const newOrg = res.data
      set((state) => ({
        organizations: [...state.organizations, newOrg],
        currentOrg: newOrg,
        isLoading: false,
      }))
      const wss = await useWorkspaceStore.getState().fetchWorkspaces(newOrg.id)
      if (wss && wss.length > 0) {
        useWorkspaceStore.getState().setCurrentWorkspace(wss[0])
      }
      return newOrg
    } catch (err: any) {
      set({ error: err?.message || 'Failed to create organization', isLoading: false })
      throw err
    }
  },

  fetchMembers: async (orgId: string) => {
    try {
      const res = await apiClient.get<OrgMember[]>(`/api/v1/organizations/${orgId}/members`)
      const members = res.data || []
      set({ members })
      return members
    } catch (err: any) {
      set({ error: err?.message || 'Failed to fetch members' })
      return []
    }
  },

  addMember: async (orgId: string, userId: string, roleId?: string) => {
    const res = await apiClient.post<OrgMember>(`/api/v1/organizations/${orgId}/members`, {
      userId,
      roleId,
    })
    set((state) => ({ members: [...state.members, res.data] }))
    return res.data
  },

  removeMember: async (orgId: string, memberId: string) => {
    await apiClient.delete(`/api/v1/organizations/${orgId}/members/${memberId}`)
    set((state) => ({
      members: state.members.filter((m) => m.id !== memberId),
    }))
  },

  updateOrg: async (orgId: string, data: { name?: string; logoUrl?: string }) => {
    const res = await apiClient.patch<Organization>(`/api/v1/organizations/${orgId}`, data)
    const updated = res.data
    set((state) => ({
      organizations: state.organizations.map((o) => (o.id === orgId ? updated : o)),
      currentOrg: state.currentOrg?.id === orgId ? updated : state.currentOrg,
    }))
    return updated
  },

  deleteOrganization: async (orgId: string) => {
    await apiClient.delete(`/api/v1/organizations/${orgId}`)
    const filtered = get().organizations.filter((o) => o.id !== orgId)
    const nextOrg = get().currentOrg?.id === orgId ? (filtered[0] || null) : get().currentOrg
    set({
      organizations: filtered,
      currentOrg: nextOrg,
    })
    if (nextOrg) {
      useWorkspaceStore.getState().fetchWorkspaces(nextOrg.id).then((wss) => {
        if (wss && wss.length > 0) {
          useWorkspaceStore.getState().setCurrentWorkspace(wss[0])
        } else {
          useWorkspaceStore.getState().setCurrentWorkspace(null)
        }
      })
    } else {
      useWorkspaceStore.getState().setCurrentWorkspace(null)
    }
  },
}))

