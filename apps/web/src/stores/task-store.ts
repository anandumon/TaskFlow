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
  progress?: number
  order?: number
  createdBy?: string
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
  moveTask: (workspaceId: string, taskId: string, targetStatus: TaskStatus, targetIndex: number, newEnv?: TaskEnvironment) => Promise<void>
  reorderTasks: (workspaceId: string, newTasks: Task[]) => void
  toggleSubtask: (taskId: string, subtaskId: string) => Promise<void>
  addSubtask: (taskId: string, subtaskTitle: string, branchName?: string) => Promise<void>
  updateSubtaskBranch: (taskId: string, subtaskId: string, branchName: string) => Promise<void>
  addNote: (taskId: string, noteText: string) => Promise<void>
  deleteTask: (id: string) => Promise<void>
  dispatchDueAlert: (taskId: string) => Promise<{ success: boolean; recipientEmail: string; dueDate: string }>
  dispatchDateDueAlerts: (workspaceId: string, date?: string) => Promise<{ success: boolean; taskCount: number; recipientEmail: string; message: string }>
  dispatchUpcomingDueAlerts: (workspaceId: string) => Promise<{ success: boolean; taskCount: number; recipientEmail: string; message: string }>
}

export const useTaskStore = create<TaskState>((set, get) => ({
  tasks: [],
  isLoading: false,
  error: null,

  loadTasks: async (workspaceId: string) => {
    set({ isLoading: true, error: null })
    try {
      const res = await apiClient.get<Task[]>(`/api/v1/workspaces/${workspaceId}/tasks`)
      let list = res.data || []
      if (typeof window !== 'undefined') {
        const savedOrderStr = localStorage.getItem(`taskflow_task_order_${workspaceId}`)
        if (savedOrderStr) {
          try {
            const savedOrderMap: Record<string, number> = JSON.parse(savedOrderStr)
            list = list
              .map((t) => ({
                ...t,
                order: savedOrderMap[t.id] !== undefined ? savedOrderMap[t.id] : t.order ?? 0,
              }))
              .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
          } catch {}
        }
      }
      set({ tasks: list, isLoading: false })
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

  moveTask: async (workspaceId: string, taskId: string, targetStatus: TaskStatus, targetIndex: number, newEnv?: TaskEnvironment) => {
    const currentTasks = [...get().tasks]
    const taskIndex = currentTasks.findIndex((t) => t.id === taskId)
    if (taskIndex === -1) return

    const [movedTask] = currentTasks.splice(taskIndex, 1)
    let env = newEnv || movedTask.environment
    if (targetStatus === 'done') {
      env = 'MAIN'
    } else if (targetStatus === 'in_review' && (!env || env === 'MAIN')) {
      env = 'DEV'
    }

    const updatedTask = {
      ...movedTask,
      status: targetStatus,
      environment: env,
    }

    // Filter tasks belonging to the target status column
    const columnTasks = currentTasks.filter((t) => t.status === targetStatus)
    const clampedIndex = Math.max(0, Math.min(targetIndex, columnTasks.length))
    columnTasks.splice(clampedIndex, 0, updatedTask)

    // Reassign order & position to column tasks
    columnTasks.forEach((t, idx) => {
      t.order = idx
    })

    // Now reconstruct all tasks: keep other tasks, place this column's tasks
    const otherTasks = currentTasks.filter((t) => t.status !== targetStatus)
    const allUpdatedTasks = [...otherTasks, ...columnTasks]

    // Save order map in localStorage for persistence
    if (typeof window !== 'undefined') {
      const orderMap: Record<string, number> = {}
      allUpdatedTasks.forEach((t) => {
        orderMap[t.id] = t.order ?? 0
      })
      localStorage.setItem(`taskflow_task_order_${workspaceId}`, JSON.stringify(orderMap))
    }

    set({ tasks: allUpdatedTasks })

    // Sync to backend: status, env, and position
    try {
      await apiClient.patch(`/api/v1/tasks/${taskId}`, {
        status: targetStatus,
        environment: env,
        position: clampedIndex,
      })
    } catch (err: any) {
      console.error('Failed to sync moved task to server:', err)
    }
  },

  reorderTasks: (workspaceId: string, newTasks: Task[]) => {
    const updated = newTasks.map((t, idx) => ({ ...t, order: idx }))
    if (typeof window !== 'undefined') {
      const orderMap: Record<string, number> = {}
      updated.forEach((t, idx) => {
        orderMap[t.id] = idx
      })
      localStorage.setItem(`taskflow_task_order_${workspaceId}`, JSON.stringify(orderMap))
    }
    set({ tasks: updated })
  },

  dispatchDueAlert: async (taskId: string) => {
    try {
      const res = await apiClient.post<{ success: boolean; recipientEmail: string; dueDate: string }>(
        `/api/v1/tasks/${taskId}/due-alert`,
        {}
      )
      return res.data
    } catch (err: any) {
      throw err
    }
  },

  dispatchDateDueAlerts: async (workspaceId: string, date?: string, email?: string) => {
    try {
      const params = new URLSearchParams()
      if (date) params.set('date', date)
      if (email) params.set('email', email)
      const q = params.toString() ? `?${params.toString()}` : ''
      const res = await apiClient.post<{ success: boolean; taskCount: number; recipientEmail: string; message: string }>(
        `/api/v1/workspaces/${workspaceId}/tasks/due-alerts/dispatch-date${q}`,
        {}
      )
      return res.data
    } catch (err: any) {
      throw err
    }
  },

  dispatchUpcomingDueAlerts: async (workspaceId: string) => {
    try {
      const res = await apiClient.post<{ success: boolean; taskCount: number; recipientEmail: string; message: string }>(
        `/api/v1/workspaces/${workspaceId}/tasks/due-alerts/dispatch-upcoming`,
        {}
      )
      return res.data
    } catch (err: any) {
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
