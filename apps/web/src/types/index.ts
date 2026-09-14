export type TaskStatus = 'todo' | 'in_progress' | 'in_review' | 'done' | string
export type TaskEnvironment = 'DEV' | 'SIT' | 'UAT' | 'RELEASE' | 'MAIN'
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent'

export interface TaskAttachment {
  id: string
  name: string
  size: number
  type: string
  dataUrl: string
  uploadedAt: string
}

export interface TaskComment {
  id: string
  authorName: string
  authorEmail?: string
  authorAvatar?: string
  content: string
  createdAt: string
}

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
  attachments?: TaskAttachment[]
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
  priority: TaskPriority
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
  createdAt: string
  updatedAt: string
}

export interface Project {
  id: string
  workspaceId: string
  name: string
  slug: string
  description?: string
  icon?: string
  color?: string
  status: 'ACTIVE' | 'IN_PROGRESS' | 'REVIEW' | 'COMPLETED' | 'active' | 'archived' | 'completed' | string
  progress: number
  environments?: string
  createdAt: string
  updatedAt: string
}

export interface Organization {
  id: string
  name: string
  slug: string
  domain?: string
  logoUrl?: string
  plan: string
  createdAt: string
}

export interface Workspace {
  id: string
  organizationId: string
  name: string
  slug: string
  description?: string
  icon?: string
  color?: string
  createdAt: string
}

export interface User {
  id: string
  email: string
  firstName: string
  lastName: string
  displayName?: string
  avatarUrl?: string
  emailVerified: boolean
}
