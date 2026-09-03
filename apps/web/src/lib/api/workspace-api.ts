import { apiClient } from '@/lib/api-client'
import { Organization } from '@/stores/org-store'
import { Workspace } from '@/stores/workspace-store'

export const workspaceApi = {
  getUserOrganizations: () =>
    apiClient.get<Organization[]>('/api/v1/organizations'),

  createOrganization: (name: string, plan: string = 'FREE') =>
    apiClient.post<Organization>('/api/v1/organizations', { name, plan }),

  getOrganizationWorkspaces: (organizationId: string) =>
    apiClient.get<Workspace[]>(`/api/v1/organizations/${organizationId}/workspaces`),

  createWorkspace: (organizationId: string, name: string) =>
    apiClient.post<Workspace>(`/api/v1/organizations/${organizationId}/workspaces`, { name }),
}
