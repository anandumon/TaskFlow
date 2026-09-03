import { create } from 'zustand'
import { apiClient } from '@/lib/api-client'

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

interface OrgState {
  organizations: Organization[]
  currentOrg: Organization | null
  members: OrgMember[]
  isLoading: boolean
  error: string | null

  fetchOrganizations: () => Promise<Organization[]>
  setCurrentOrg: (org: Organization | null) => void
  createOrganization: (name: string) => Promise<Organization>
  fetchMembers: (orgId: string) => Promise<OrgMember[]>
  addMember: (orgId: string, userId: string, roleId?: string) => Promise<OrgMember>
  removeMember: (orgId: string, memberId: string) => Promise<void>
}

export const useOrgStore = create<OrgState>((set, get) => ({
  organizations: [],
  currentOrg: null,
  members: [],
  isLoading: false,
  error: null,

  fetchOrganizations: async () => {
    set({ isLoading: true, error: null })
    try {
      const res = await apiClient.get<Organization[]>('/api/v1/organizations')
      const orgs = res.data || []
      set({
        organizations: orgs,
        currentOrg: get().currentOrg || orgs[0] || null,
        isLoading: false,
      })
      return orgs
    } catch (err: any) {
      set({ error: err?.message || 'Failed to fetch organizations', isLoading: false })
      return []
    }
  },

  setCurrentOrg: (org) => set({ currentOrg: org }),

  createOrganization: async (name: string) => {
    set({ isLoading: true, error: null })
    try {
      const res = await apiClient.post<Organization>('/api/v1/organizations', { name })
      const newOrg = res.data
      set((state) => ({
        organizations: [...state.organizations, newOrg],
        currentOrg: newOrg,
        isLoading: false,
      }))
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
}))
