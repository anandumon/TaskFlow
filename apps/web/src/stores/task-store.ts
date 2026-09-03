'use client'

import { create } from 'zustand'
import { apiClient } from '@/lib/api-client'

export type TaskStatus = 'todo' | 'in_progress' | 'in_review' | 'done' | string
export type TaskEnvironment = 'DEV' | 'SIT' | 'UAT' | 'RELEASE' | 'MAIN'

export interface Subtask {
  id: string
  title: string
  completed: boolean
  description?: string
  branchName?: string
  serviceName?: string
  filesChanged?: string
  notes?: string
  historyLogs?: string
  createdAt?: string
  dueDate?: string
}

export interface FileChange {
  name: string
  status: 'added' | 'modified' | 'deleted'
  additions: number
  deletions: number
}

export interface HistoryLog {
  id: string
  event: string
  timestamp: string
  actor: string
}

export interface Task {
  id: string
  workspaceId: string
  projectId?: string
  title: string
  description?: string
  status: TaskStatus
  environment: TaskEnvironment
  priority: 'low' | 'medium' | 'high' | 'urgent'
  tag: string
  tagColor?: string
  assigneeId?: string
  assigneeName?: string
  assignees?: string
  reviewerName?: string
  dueDate?: string
  subtasks?: string
  branchName?: string
  filesChanged?: string
  notes?: string
  historyLogs?: string
  createdAt: string
  updatedAt: string
}

interface TaskState {
  tasks: Task[]
  isLoading: boolean
  error: string | null
  loadTasks: (workspaceId: string) => Promise<void>
  createTask: (workspaceId: string, task: Partial<Task>) => Promise<Task>
  updateTask: (id: string, updates: Partial<Task>) => Promise<Task>
  updateStatus: (id: string, newStatus: TaskStatus, newEnv?: TaskEnvironment) => Promise<void>
  updateEnvironment: (id: string, newEnv: TaskEnvironment) => Promise<void>
  toggleSubtask: (taskId: string, subtaskId: string) => Promise<void>
  addSubtask: (taskId: string, subtaskTitle: string, branchName?: string) => Promise<void>
  updateSubtaskBranch: (taskId: string, subtaskId: string, branchName: string) => Promise<void>
  addNote: (taskId: string, noteText: string) => Promise<void>
  deleteTask: (id: string) => Promise<void>
}

export const useTaskStore = create<TaskState>((set, get) => ({
  tasks: [],
  isLoading: false,
  error: null,

  loadTasks: async (workspaceId: string) => {
    set({ isLoading: true, error: null })
    try {
      const res = await apiClient.get<Task[]>(`/api/v1/workspaces/${workspaceId}/tasks`)
      set({ tasks: res.data || [], isLoading: false })
    } catch (err: any) {
      set({ error: err?.message || 'Failed to load tasks', isLoading: false })
    }
  },

  createTask: async (workspaceId: string, taskData: Partial<Task>) => {
    set({ isLoading: true, error: null })
    try {
      const res = await apiClient.post<Task>(`/api/v1/workspaces/${workspaceId}/tasks`, taskData)
      set((state) => ({
        tasks: [res.data, ...state.tasks],
        isLoading: false,
      }))
      return res.data
    } catch (err: any) {
      set({ error: err?.message || 'Failed to create task', isLoading: false })
      throw err
    }
  },

  updateTask: async (id: string, updates: Partial<Task>) => {
    try {
      const res = await apiClient.patch<Task>(`/api/v1/tasks/${id}`, updates)
      set((state) => ({
        tasks: state.tasks.map((t) => (t.id === id ? res.data : t)),
      }))
      return res.data
    } catch (err: any) {
      set({ error: err?.message || 'Failed to update task' })
      throw err
    }
  },

  updateStatus: async (id: string, newStatus: TaskStatus, newEnv?: TaskEnvironment) => {
    let env = newEnv
    if (newStatus === 'done') {
      env = 'MAIN'
    } else if (newStatus === 'in_review' && !env) {
      env = 'DEV'
    }

    try {
      const res = await apiClient.patch<Task>(`/api/v1/tasks/${id}`, {
        status: newStatus,
        ...(env ? { environment: env } : {}),
      })
      set((state) => ({
        tasks: state.tasks.map((t) => (t.id === id ? res.data : t)),
      }))
    } catch (err: any) {
      set({ error: err?.message || 'Failed to update task status' })
      throw err
    }
  },

  updateEnvironment: async (id: string, newEnv: TaskEnvironment) => {
    try {
      const res = await apiClient.patch<Task>(`/api/v1/tasks/${id}`, {
        environment: newEnv,
        ...(newEnv === 'MAIN' ? { status: 'done' } : {}),
      })
      set((state) => ({
        tasks: state.tasks.map((t) => (t.id === id ? res.data : t)),
      }))
    } catch (err: any) {
      set({ error: err?.message || 'Failed to update environment' })
      throw err
    }
  },

  toggleSubtask: async (taskId: string, subtaskId: string) => {
    const task = get().tasks.find((t) => t.id === taskId)
    if (!task) return

    let subtasksList: Subtask[] = []
    try {
      subtasksList = JSON.parse(task.subtasks || '[]')
    } catch {
      subtasksList = []
    }

    subtasksList = subtasksList.map((st) =>
      st.id === subtaskId ? { ...st, completed: !st.completed } : st
    )

    await get().updateTask(taskId, {
      subtasks: JSON.stringify(subtasksList),
    })
  },

  addSubtask: async (taskId: string, subtaskTitle: string, branchName?: string) => {
    const task = get().tasks.find((t) => t.id === taskId)
    if (!task || !subtaskTitle.trim()) return

    let subtasksList: Subtask[] = []
    try {
      subtasksList = JSON.parse(task.subtasks || '[]')
    } catch {
      subtasksList = []
    }

    const newSubtask: Subtask = {
      id: 'st-' + Date.now(),
      title: subtaskTitle.trim(),
      completed: false,
      branchName: branchName?.trim() || '',
    }

    subtasksList.push(newSubtask)
    await get().updateTask(taskId, {
      subtasks: JSON.stringify(subtasksList),
    })
  },

  updateSubtaskBranch: async (taskId: string, subtaskId: string, branchName: string) => {
    const task = get().tasks.find((t) => t.id === taskId)
    if (!task) return

    let subtasksList: Subtask[] = []
    try {
      subtasksList = JSON.parse(task.subtasks || '[]')
    } catch {
      subtasksList = []
    }

    subtasksList = subtasksList.map((st) =>
      st.id === subtaskId ? { ...st, branchName: branchName.trim() } : st
    )

    await get().updateTask(taskId, {
      subtasks: JSON.stringify(subtasksList),
    })
  },

  addNote: async (taskId: string, noteText: string) => {
    const task = get().tasks.find((t) => t.id === taskId)
    if (!task || !noteText.trim()) return

    const timestamp = new Date().toLocaleString()
    const updatedNotes = task.notes
      ? `${task.notes}\n\n[${timestamp}] ${noteText.trim()}`
      : `[${timestamp}] ${noteText.trim()}`

    await get().updateTask(taskId, {
      notes: updatedNotes,
    })
  },

  deleteTask: async (id: string) => {
    try {
      await apiClient.delete(`/api/v1/tasks/${id}`)
      set((state) => ({
        tasks: state.tasks.filter((t) => t.id !== id),
      }))
    } catch (err: any) {
      set({ error: err?.message || 'Failed to delete task' })
      throw err
    }
  },
}))
