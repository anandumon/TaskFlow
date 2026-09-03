import { apiClient } from '@/lib/api-client'
import { Project } from '@/stores/project-store'

export const projectApi = {
  getWorkspaceProjects: (workspaceId: string) =>
    apiClient.get<Project[]>(`/api/v1/workspaces/${workspaceId}/projects`),

  createProject: (workspaceId: string, projectData: Partial<Project>) =>
    apiClient.post<Project>(`/api/v1/workspaces/${workspaceId}/projects`, projectData),

  deleteProject: (id: string) =>
    apiClient.delete(`/api/v1/projects/${id}`),
}
