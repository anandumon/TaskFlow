'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import {
  StatusCategory,
  CustomStatus,
  StatusTemplate,
  CATEGORY_RANK,
  getStatusCanonicalRank,
  sortStatusesByStructure,
} from '@/lib/status-utils'

export type { StatusCategory, CustomStatus, StatusTemplate }
export { CATEGORY_RANK, getStatusCanonicalRank, sortStatusesByStructure }

export const BUILT_IN_TEMPLATES: Record<string, StatusTemplate> = {
  default: {
    id: 'default',
    name: 'Normal',
    description: 'Standard 3-stage workflow for everyday tasks',
    statuses: [
      { name: 'TO DO', color: '#87909e', category: 'NOT_STARTED', order: 0, isDefault: true },
      { name: 'IN PROGRESS', color: '#0284c7', category: 'ACTIVE', order: 1 },
      { name: 'COMPLETE', color: '#10b981', category: 'CLOSED', order: 2 },
    ],
  },
  taskflow: {
    id: 'taskflow',
    name: 'TaskFlow Multi-Stage (DEV → SIT → UAT → RELEASE)',
    description: 'Full multi-environment delivery pipeline with Git promotion',
    statuses: [
      { name: 'TO DO', color: '#87909e', category: 'NOT_STARTED', order: 0, isDefault: true },
      { name: 'ON HOLD', color: '#87909e', category: 'NOT_STARTED', order: 1 },
      { name: 'IN PROGRESS', color: '#0284c7', category: 'ACTIVE', order: 2 },
      { name: 'IN DEV', color: '#0ea5e9', category: 'ACTIVE', order: 3 },
      { name: 'IN REVIEW', color: '#a855f7', category: 'ACTIVE', order: 4 },
      { name: 'IN SIT', color: '#3b82f6', category: 'ACTIVE', order: 5 },
      { name: 'IN UAT', color: '#06b6d4', category: 'ACTIVE', order: 6 },
      { name: 'RELEASE', color: '#6366f1', category: 'ACTIVE', order: 7 },
      { name: 'COMPLETED', color: '#10b981', category: 'CLOSED', order: 8 },
    ],
  },
  kanban: {
    id: 'kanban',
    name: 'Kanban / Agile',
    description: 'Multi-stage board for agile sprint tracking',
    statuses: [
      { name: 'BACKLOG', color: '#64748b', category: 'NOT_STARTED', order: 0 },
      { name: 'TO DO', color: '#87909e', category: 'NOT_STARTED', order: 1, isDefault: true },
      { name: 'IN PROGRESS', color: '#0284c7', category: 'ACTIVE', order: 2 },
      { name: 'IN REVIEW', color: '#a855f7', category: 'ACTIVE', order: 3 },
      { name: 'DONE', color: '#10b981', category: 'CLOSED', order: 4 },
    ],
  },
  scrum: {
    id: 'scrum',
    name: 'Scrum / Engineering',
    description: 'Full software engineering pipeline with QA & Deploy stages',
    statuses: [
      { name: 'TODO', color: '#87909e', category: 'NOT_STARTED', order: 0, isDefault: true },
      { name: 'IN DEV', color: '#0ea5e9', category: 'ACTIVE', order: 1 },
      { name: 'CODE REVIEW', color: '#8b5cf6', category: 'ACTIVE', order: 2 },
      { name: 'QA TESTING', color: '#f59e0b', category: 'ACTIVE', order: 3 },
      { name: 'DEPLOYED', color: '#10b981', category: 'CLOSED', order: 4 },
    ],
  },
  marketing: {
    id: 'marketing',
    name: 'Marketing & Content',
    description: 'Content creation pipeline from ideation to publishing',
    statuses: [
      { name: 'IDEA', color: '#ec4899', category: 'NOT_STARTED', order: 0, isDefault: true },
      { name: 'IN WRITING', color: '#3b82f6', category: 'ACTIVE', order: 1 },
      { name: 'DESIGN & EDIT', color: '#f97316', category: 'ACTIVE', order: 2 },
      { name: 'APPROVED', color: '#a855f7', category: 'DONE', order: 3 },
      { name: 'PUBLISHED', color: '#10b981', category: 'CLOSED', order: 4 },
    ],
  },
}

interface StatusStore {
  workspaceStatuses: Record<string, CustomStatus[]>
  selectedTemplate: Record<string, string>
  progressIconsEnabled: boolean
  getStatuses: (workspaceId: string) => CustomStatus[]
  fetchWorkspaceStatuses: (workspaceId: string) => Promise<CustomStatus[]>
  setStatuses: (workspaceId: string, statuses: CustomStatus[]) => void
  reorderStatuses: (workspaceId: string, statuses: CustomStatus[]) => void
  addStatus: (workspaceId: string, category: StatusCategory, name: string, color?: string) => void
  updateStatus: (workspaceId: string, statusId: string, updates: Partial<CustomStatus>) => void
  deleteStatus: (workspaceId: string, statusId: string) => void
  applyTemplate: (workspaceId: string, templateKey: string) => void
  toggleProgressIcons: () => void
}

const DEFAULT_STATUSES: CustomStatus[] = [
  { id: 'todo', name: 'TO DO', color: '#87909e', category: 'NOT_STARTED', order: 0, isDefault: true },
  { id: 'on_hold_9074', name: 'ON HOLD', color: '#87909e', category: 'NOT_STARTED', order: 1 },
  { id: 'in_progress', name: 'IN PROGRESS', color: '#0284c7', category: 'ACTIVE', order: 2 },
  { id: 'in_dev_7722', name: 'IN DEV', color: '#0ea5e9', category: 'ACTIVE', order: 3 },
  { id: 'in_review', name: 'IN REVIEW', color: '#a855f7', category: 'ACTIVE', order: 4 },
  { id: 'in_sit_2471', name: 'IN SIT', color: '#3b82f6', category: 'ACTIVE', order: 5 },
  { id: 'in_uat_3343', name: 'IN UAT', color: '#06b6d4', category: 'ACTIVE', order: 6 },
  { id: 'release_5155', name: 'RELEASE', color: '#6366f1', category: 'ACTIVE', order: 7 },
  { id: 'done', name: 'COMPLETED', color: '#10b981', category: 'CLOSED', order: 8 },
]

export const useStatusStore = create<StatusStore>()(
  persist(
    (set, get) => ({
      workspaceStatuses: {},
      selectedTemplate: {},
      progressIconsEnabled: true,

      getStatuses: (workspaceId: string) => {
        const current = get().workspaceStatuses[workspaceId]
        if (current && current.length > 0) {
          return sortStatusesByStructure(current)
        }
        return DEFAULT_STATUSES
      },

      fetchWorkspaceStatuses: async (workspaceId: string) => {
        try {
          const token =
            typeof window !== 'undefined'
              ? localStorage.getItem('accessToken') ||
                localStorage.getItem('token') ||
                localStorage.getItem('taskflow_token')
              : null

          const res = await fetch(`/api/v1/workspaces/${workspaceId}/statuses`, {
            headers: token ? { Authorization: `Bearer ${token}` } : {},
          })
          if (res.ok) {
            const json = await res.json()
            if (json?.data && Array.isArray(json.data) && json.data.length > 0) {
              const loaded = sortStatusesByStructure(json.data)
              set((state) => ({
                workspaceStatuses: {
                  ...state.workspaceStatuses,
                  [workspaceId]: loaded,
                },
              }))
              return loaded
            }
          }
        } catch (err) {
          console.warn('[status-store] Failed to fetch statuses:', err)
        }
        return get().getStatuses(workspaceId)
      },

      setStatuses: (workspaceId: string, statuses: CustomStatus[]) => {
        const reindexed = sortStatusesByStructure(statuses).map((s, idx) => ({ ...s, order: idx }))
        set((state) => ({
          workspaceStatuses: {
            ...state.workspaceStatuses,
            [workspaceId]: reindexed,
          },
        }))

        // Sync to backend DB asynchronously
        if (typeof window !== 'undefined') {
          const token =
            localStorage.getItem('accessToken') ||
            localStorage.getItem('token') ||
            localStorage.getItem('taskflow_token')
          fetch(`/api/v1/workspaces/${workspaceId}/statuses`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
            body: JSON.stringify({ statuses: reindexed }),
          }).catch(() => {})
        }
      },

      reorderStatuses: (workspaceId: string, statuses: CustomStatus[]) => {
        const updated = statuses.map((s, idx) => ({ ...s, order: idx }))
        set((state) => ({
          workspaceStatuses: {
            ...state.workspaceStatuses,
            [workspaceId]: updated,
          },
          selectedTemplate: {
            ...state.selectedTemplate,
            [workspaceId]: 'custom',
          },
        }))
      },

      addStatus: (workspaceId: string, category: StatusCategory, name: string, color?: string) => {
        const statuses = get().getStatuses(workspaceId)
        const id = name.toLowerCase().replace(/[^a-z0-9]/g, '_') + '_' + Date.now().toString().slice(-4)
        
        const defaultColors: Record<StatusCategory, string> = {
          NOT_STARTED: '#87909e',
          ACTIVE: '#0284c7',
          DONE: '#a855f7',
          CLOSED: '#10b981',
        }

        const newStatus: CustomStatus = {
          id,
          name: name.toUpperCase().trim(),
          color: color || defaultColors[category],
          category,
          order: 0,
        }

        const reindexed = sortStatusesByStructure([...statuses, newStatus]).map((s, idx) => ({
          ...s,
          order: idx,
        }))

        set((state) => ({
          workspaceStatuses: {
            ...state.workspaceStatuses,
            [workspaceId]: reindexed,
          },
          selectedTemplate: {
            ...state.selectedTemplate,
            [workspaceId]: 'custom',
          },
        }))
      },

      updateStatus: (workspaceId: string, statusId: string, updates: Partial<CustomStatus>) => {
        const statuses = get().getStatuses(workspaceId)
        const updated = statuses.map((s) => (s.id === statusId ? { ...s, ...updates } : s))
        set((state) => ({
          workspaceStatuses: {
            ...state.workspaceStatuses,
            [workspaceId]: updated,
          },
          selectedTemplate: {
            ...state.selectedTemplate,
            [workspaceId]: 'custom',
          },
        }))
      },

      deleteStatus: (workspaceId: string, statusId: string) => {
        const statuses = get().getStatuses(workspaceId)
        if (statuses.length <= 2) return // Prevent deleting below minimum
        const filtered = statuses.filter((s) => s.id !== statusId)
        set((state) => ({
          workspaceStatuses: {
            ...state.workspaceStatuses,
            [workspaceId]: filtered,
          },
          selectedTemplate: {
            ...state.selectedTemplate,
            [workspaceId]: 'custom',
          },
        }))
      },

      applyTemplate: (workspaceId: string, templateKey: string) => {
        const template = BUILT_IN_TEMPLATES[templateKey]
        if (!template) return

        const newStatuses: CustomStatus[] = template.statuses.map((s, idx) => ({
          ...s,
          id: s.name.toLowerCase().replace(/[^a-z0-9]/g, '_'),
          order: idx,
        }))

        set((state) => ({
          workspaceStatuses: {
            ...state.workspaceStatuses,
            [workspaceId]: newStatuses,
          },
          selectedTemplate: {
            ...state.selectedTemplate,
            [workspaceId]: templateKey,
          },
        }))
      },

      toggleProgressIcons: () => {
        set((state) => ({ progressIconsEnabled: !state.progressIconsEnabled }))
      },
    }),
    {
      name: 'taskflow_custom_statuses_store',
    }
  )
)
