import { apiClient } from '@/lib/api-client'
import { Task, TaskStatus, TaskEnvironment } from '@/stores/task-store'

export const taskApi = {
  getWorkspaceTasks: (workspaceId: string) =>
    apiClient.get<Task[]>(`/api/v1/workspaces/${workspaceId}/tasks`),

  createTask: (workspaceId: string, taskData: Partial<Task>) =>
    apiClient.post<Task>(`/api/v1/workspaces/${workspaceId}/tasks`, taskData),

  getTaskById: (id: string) =>
    apiClient.get<Task>(`/api/v1/tasks/${id}`),

  updateTask: (id: string, updates: Partial<Task>) =>
    apiClient.patch<Task>(`/api/v1/tasks/${id}`, updates),

  updateTaskStatus: (id: string, status: TaskStatus, environment?: TaskEnvironment) =>
    apiClient.patch<Task>(`/api/v1/tasks/${id}`, {
      status,
      ...(environment ? { environment } : {}),
    }),

  updateTaskEnvironment: (id: string, environment: TaskEnvironment) =>
    apiClient.patch<Task>(`/api/v1/tasks/${id}`, {
      environment,
      ...(environment === 'MAIN' ? { status: 'done' } : {}),
    }),

  deleteTask: (id: string) =>
    apiClient.delete(`/api/v1/tasks/${id}`),
}
