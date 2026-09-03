'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type StatusCategory = 'NOT_STARTED' | 'ACTIVE' | 'DONE' | 'CLOSED'

export interface CustomStatus {
  id: string
  name: string
  color: string
  category: StatusCategory
  order: number
  isDefault?: boolean
}

export interface StatusTemplate {
  id: string
  name: string
  description: string
  statuses: Omit<CustomStatus, 'id'>[]
}

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
  setStatuses: (workspaceId: string, statuses: CustomStatus[]) => void
  addStatus: (workspaceId: string, category: StatusCategory, name: string, color?: string) => void
  updateStatus: (workspaceId: string, statusId: string, updates: Partial<CustomStatus>) => void
  deleteStatus: (workspaceId: string, statusId: string) => void
  applyTemplate: (workspaceId: string, templateKey: string) => void
  toggleProgressIcons: () => void
}

const DEFAULT_STATUSES: CustomStatus[] = [
  { id: 'todo', name: 'TO DO', color: '#87909e', category: 'NOT_STARTED', order: 0, isDefault: true },
  { id: 'in_progress', name: 'IN PROGRESS', color: '#0284c7', category: 'ACTIVE', order: 1 },
  { id: 'in_review', name: 'IN REVIEW', color: '#a855f7', category: 'ACTIVE', order: 2 },
  { id: 'done', name: 'COMPLETE', color: '#10b981', category: 'CLOSED', order: 3 },
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
          return current.sort((a, b) => a.order - b.order)
        }
        return DEFAULT_STATUSES
      },

      setStatuses: (workspaceId: string, statuses: CustomStatus[]) => {
        set((state) => ({
          workspaceStatuses: {
            ...state.workspaceStatuses,
            [workspaceId]: statuses,
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
          order: statuses.length,
        }

        set((state) => ({
          workspaceStatuses: {
            ...state.workspaceStatuses,
            [workspaceId]: [...statuses, newStatus],
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
