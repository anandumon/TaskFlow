'use client'

import React, { useState, useEffect, useMemo, useCallback } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import {
  ArrowLeft,
  FolderKanban,
  Plus,
  Bug,
  Sparkles,
  Columns,
  List,
  User,
  Calendar,
  Layers,
  ArrowUpDown,
  Edit2,
  Trash2,
  CheckCircle2,
  Server,
  GitBranch,
  LayoutGrid,
  CheckSquare,
  AlertCircle,
  Clock,
  Sliders,
  X,
  UserPlus,
  Mail,
  Loader2,
  Bell,
  ArrowUp,
  ChevronUp,
  ChevronDown,
  ChevronRight,
  UserCheck,
  GripVertical,
  SlidersHorizontal,
  Paperclip,
  MessageSquare,
  Lock,
  Eye,
  Workflow,
  Filter,
  Check,
} from 'lucide-react'
import { apiClient } from '@/lib/api-client'
import { useWorkspaceStore } from '@/stores/workspace-store'
import { useTaskStore, Task, TaskStatus, TaskEnvironment } from '@/stores/task-store'
import { useProjectStore } from '@/stores/project-store'
import { useStatusStore } from '@/stores/status-store'
import { useAuthStore } from '@/stores/auth-store'
import { useOrgStore } from '@/stores/org-store'
import { Portal } from '@/components/ui/portal'
import { StylishDatePicker } from '@/components/ui/stylish-date-picker'
import { UserSelect, AssignableUser, getInitials, getAvatarColor } from '@/components/ui/user-select'
import { EditSpaceStatusesModal } from '@/components/EditSpaceStatusesModal'
import { UserGuideModal } from '@/components/user-guide-modal'
import { getFirstName } from '@/lib/utils'
import { Project } from '@/types'
import { ALL_ENVIRONMENTS } from '@/constants'
import { ProjectDetailsSkeleton } from '@/components/loading'
import {
  isBugTask,
  isFeatureTask,
  detectCategoryFromTitle,
  getTagStyle,
  DELIVERABLE_CATEGORIES,
  getEnvForStatus,
} from '@/lib/task-category'

const getCategoryDropdownValue = (tag?: string) => {
  if (!tag || !tag.trim()) return 'Feature'
  const lower = tag.trim().toLowerCase()
  if (lower === 'bug' || lower === 'bugfix' || lower === 'bug fix' || lower === 'defect' || lower === 'hotfix') {
    return 'Bug Fix'
  }
  if (lower === 'feature' || lower === 'feat') {
    return 'Feature'
  }
  const matched = DELIVERABLE_CATEGORIES.find((c) => c.toLowerCase() === lower)
  return matched || 'custom'
}

export default function ProjectDetailsPage() {
  const params = useParams()
  const router = useRouter()
  const projectId = params?.id as string

  const { currentWorkspace } = useWorkspaceStore()
  const { tasks, loadTasks, createTask, updateTask, updateStatus, updateEnvironment, deleteTask, toggleSubtask } = useTaskStore()
  const { projects, loadProjects, isLoading: isProjectsLoading } = useProjectStore()

  // View mode: default to 'grid' matching Screenshot 4
  const [viewMode, setViewMode] = useState<'grid' | 'list' | 'tree' | 'board'>('grid')
  const [activeCategoryTab, setActiveCategoryTab] = useState<'all' | 'bugs' | 'features'>('all')
  const [selectedStatusTab, setSelectedStatusTab] = useState<string>('all')
  const [filterTag, setFilterTag] = useState<string>('all')
  const [selectedUserFilter, setSelectedUserFilter] = useState<string>('all')
  const [sortBy, setSortBy] = useState<'assignee' | 'due' | 'priority' | 'status' | 'title'>('assignee')

  const { user } = useAuthStore()
  const { members: orgMembers } = useOrgStore()
  const now = new Date()
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
  const currentUserName = getFirstName(user?.firstName || user?.displayName || user?.email?.split('@')[0] || 'You')

  // Date alert dispatcher state
  const [selectedAlertDate, setSelectedAlertDate] = useState<string>(todayStr)
  const [isDispatchingDateAlert, setIsDispatchingDateAlert] = useState(false)

  // Expandable trees & subtasks in cards
  const [expandedTasks, setExpandedTasks] = useState<Record<string, boolean>>({})
  const [expandedTreeStatuses, setExpandedTreeStatuses] = useState<Record<string, boolean>>({
    todo: true,
    in_progress: true,
    in_review: true,
    done: true,
  })

  const toggleTaskTree = (taskId: string) => {
    setExpandedTasks((prev) => ({ ...prev, [taskId]: !prev[taskId] }))
  }

  const toggleTreeStatus = (statusId: string) => {
    setExpandedTreeStatuses((prev) => ({ ...prev, [statusId]: !prev[statusId] }))
  }

  // Guide Modal State
  const [guideModalOpen, setGuideModalOpen] = useState(false)

  // Add Task Modal State
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [newTaskCategory, setNewTaskCategory] = useState('Feature')
  const [userManuallySelectedCategory, setUserManuallySelectedCategory] = useState(false)
  const [autoDetectedCategory, setAutoDetectedCategory] = useState<'Feature' | 'Bug Fix' | 'Custom' | null>(null)
  const [customTagInput, setCustomTagInput] = useState('')
  const [newTaskTitle, setNewTaskTitle] = useState('')
  const [newTaskTag, setNewTaskTag] = useState('Feature')
  const [newTaskAssignee, setNewTaskAssignee] = useState(currentUserName)
  const [newTaskAssignedBy, setNewTaskAssignedBy] = useState(currentUserName)
  const [newTaskDue, setNewTaskDue] = useState(todayStr)
  const [newTaskPriority, setNewTaskPriority] = useState<'low' | 'medium' | 'high'>('medium')
  const [newTaskStatus, setNewTaskStatus] = useState<string>('todo')
  const [newTaskEnv, setNewTaskEnv] = useState<TaskEnvironment>('DEV')

  // Drag and Drop State
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null)
  const [dragOverColId, setDragOverColId] = useState<string | null>(null)
  const [dragOverStatusId, setDragOverStatusId] = useState<string | null>(null)
  const [dragOverTaskId, setDragOverTaskId] = useState<string | null>(null)

  const [isCreatingTask, setIsCreatingTask] = useState(false)
  const [isUpdatingTask, setIsUpdatingTask] = useState(false)
  const [taskToDelete, setTaskToDelete] = useState<Task | null>(null)
  const [isDeletingTask, setIsDeletingTask] = useState(false)

  // Edit Task Modal State
  const [editingTask, setEditingTask] = useState<Task | null>(null)
  const [editTitle, setEditTitle] = useState('')
  const [editCategory, setEditCategory] = useState('Feature')
  const [editCustomTag, setEditCustomTag] = useState('')
  const [editTag, setEditTag] = useState('')
  const [editAssignee, setEditAssignee] = useState('')
  const [editDue, setEditDue] = useState('')
  const [editPriority, setEditPriority] = useState<'low' | 'medium' | 'high' | 'urgent'>('medium')
  const [editStatus, setEditStatus] = useState<TaskStatus>('todo')
  const [editEnv, setEditEnv] = useState<TaskEnvironment>('DEV')

  // Invite Modal State
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviting, setInviting] = useState(false)

  const [toastMessage, setToastMessage] = useState<string | null>(null)
  const [dispatchingAlertId, setDispatchingAlertId] = useState<string | null>(null)

  const handleSendDueAlert = async (task: Task) => {
    try {
      setDispatchingAlertId(task.id)
      const res = await useTaskStore.getState().dispatchDueAlert(task.id)
      showToast(`🔔 Due date alert sent to ${res.recipientEmail || 'assignee'}!`)
    } catch (err: any) {
      showToast(err?.message || 'Failed to dispatch due alert')
    } finally {
      setDispatchingAlertId(null)
    }
  }

  const handleDispatchDateDueAlerts = async (targetDate?: string) => {
    const dateToUse = targetDate || selectedAlertDate || todayStr
    const wsId = currentWorkspace?.id || '50a4c29f-09ff-4480-8b6b-495381247d0f'
    const currentUserEmail = user?.email || 'anandu2109@gmail.com'
    try {
      setIsDispatchingDateAlert(true)
      const res = await useTaskStore.getState().dispatchDateDueAlerts(wsId, dateToUse, currentUserEmail)
      if (res && res.taskCount > 0) {
        showToast(`🔔 Dispatched due alert email for ${res.taskCount} task(s) to ${res.recipientEmail}!`)
      } else {
        showToast(res?.message || `ℹ️ No overdue or upcoming tasks found in this project.`)
      }
    } catch (err: any) {
      showToast(err?.response?.data?.message || err?.message || 'Failed to dispatch due alerts')
    } finally {
      setIsDispatchingDateAlert(false)
    }
  }

  const getDueStatus = (dueDateStr?: string) => {
    if (!dueDateStr) return { isToday: false, isNear: false, isOverdue: false, text: '' }
    const cleaned = dueDateStr.trim()
    if (cleaned.toLowerCase() === 'today') return { isToday: true, isNear: true, isOverdue: false, text: 'Due Today' }
    if (cleaned.toLowerCase() === 'tomorrow') return { isToday: false, isNear: true, isOverdue: false, text: 'Due Tomorrow' }

    try {
      const now = new Date()
      now.setHours(0, 0, 0, 0)
      const due = new Date(cleaned)
      due.setHours(0, 0, 0, 0)
      const diffDays = Math.round((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))

      if (diffDays < 0) return { isToday: false, isNear: true, isOverdue: true, text: `${Math.abs(diffDays)}d overdue` }
      if (diffDays === 0) return { isToday: true, isNear: true, isOverdue: false, text: 'Due Today' }
      if (diffDays <= 3) return { isToday: false, isNear: true, isOverdue: false, text: `${diffDays}d left` }
      return { isToday: false, isNear: false, isOverdue: false, text: `${diffDays}d left` }
    } catch {
      return { isToday: false, isNear: false, isOverdue: false, text: cleaned }
    }
  }

  const calculateTaskProgress = (t: Task) => {
    if (t.progress !== undefined && t.progress !== null) return t.progress
    if (t.status === 'done' || t.status === 'complete' || t.status === 'closed' || t.status === 'release') return 100
    try {
      if (t.subtasks) {
        const parsed = JSON.parse(t.subtasks)
        if (Array.isArray(parsed) && parsed.length > 0) {
          const completed = parsed.filter((s: any) => s.completed).length
          return Math.round((completed / parsed.length) * 100)
        }
      }
    } catch {}
    if (t.status === 'in_progress' || t.status === 'in_dev') return 50
    if (t.status === 'in_review' || t.status === 'in_uat' || t.status === 'in_sit') return 75
    return 0
  }

  useEffect(() => {
    if (currentWorkspace?.id) {
      loadTasks(currentWorkspace.id)
      loadProjects(currentWorkspace.id)
    }
  }, [currentWorkspace?.id, loadTasks, loadProjects])

  const showToast = (msg: string) => {
    setToastMessage(msg)
    setTimeout(() => setToastMessage(null), 3000)
  }

  const handleSendInvite = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!inviteEmail.trim() || !projectId) return
    setInviting(true)
    try {
      await apiClient.post(`/api/v1/projects/${projectId}/invitations`, {
        email: inviteEmail.trim().toLowerCase(),
        role: 'MEMBER',
      })
      showToast(`Invitation sent to ${inviteEmail}!`)
      setInviteEmail('')
      setIsInviteModalOpen(false)
    } catch (err: any) {
      showToast(err?.response?.data?.message || err?.message || 'Failed to send invitation')
    } finally {
      setInviting(false)
    }
  }

  const project = projects.find((p) => p.id === projectId)

  const getProjectColor = (proj?: Project | null) => {
    if (proj?.color && typeof proj.color === 'string' && proj.color.startsWith('#')) return proj.color
    const colorPalette = [
      '#6366F1', // Indigo
      '#EC4899', // Pink
      '#06B6D4', // Cyan
      '#10B981', // Emerald
      '#F59E0B', // Amber
      '#8B5CF6', // Purple
      '#3B82F6', // Blue
      '#F97316', // Orange
      '#14B8A6', // Teal
    ]
    const seed = proj?.name || proj?.id || projectId || 'TaskFlow'
    let hash = 0
    for (let i = 0; i < seed.length; i++) {
      hash = seed.charCodeAt(i) + ((hash << 5) - hash)
    }
    return colorPalette[Math.abs(hash) % colorPalette.length]
  }

  const projColor = getProjectColor(project)

  // Memoized tasks strictly belonging to this project
  const projectTasks = useMemo(() => {
    return tasks.filter((t) => t.projectId === projectId)
  }, [tasks, projectId])

  // Bug & Feature tasks strictly scoped to this project using unified categorization
  const bugTasks = useMemo(() => projectTasks.filter(isBugTask), [projectTasks])
  const featureTasks = useMemo(() => projectTasks.filter(isFeatureTask), [projectTasks])

  // Weighted progress calculation for this project
  const completedTasksCount = useMemo(() => {
    return projectTasks.filter(
      (t) => t.status === 'done' || t.status === 'complete' || t.status === 'release' || t.status === 'closed'
    ).length
  }, [projectTasks])

  const weightedProgress = useMemo(() => {
    if (projectTasks.length === 0) return project?.progress || 0
    return Math.round((completedTasksCount / projectTasks.length) * 100)
  }, [projectTasks, completedTasksCount, project?.progress])

  // Collect all registered users/assignees added to this project
  const availableUsers: AssignableUser[] = useMemo(() => {
    const list: AssignableUser[] = []
    const seenNames = new Set<string>()
    const seenEmails = new Set<string>()

    const addUser = (rawName: string, email?: string, role?: string, id?: string) => {
      const cleanFirst = getFirstName(rawName)
      if (!cleanFirst || cleanFirst.toLowerCase() === 'you') return

      const nameKey = cleanFirst.toLowerCase()
      const emailKey = email?.trim().toLowerCase()

      if (seenNames.has(nameKey) || (emailKey && seenEmails.has(emailKey))) {
        const existing = list.find(
          (u) => u.name.toLowerCase() === nameKey || (emailKey && u.email?.toLowerCase() === emailKey)
        )
        if (existing && !existing.email && email) {
          existing.email = email
        }
        return
      }

      seenNames.add(nameKey)
      if (emailKey) seenEmails.add(emailKey)

      list.push({
        id: id || emailKey || nameKey,
        name: cleanFirst,
        email,
        role: role || 'Member',
        initials: getInitials(cleanFirst),
        color: getAvatarColor(cleanFirst),
      })
    }

    // 1. Logged-in current user
    addUser(currentUserName, user?.email, 'Current User', 'current-user')

    // 2. Organization members
    if (orgMembers && Array.isArray(orgMembers)) {
      orgMembers.forEach((m: any) => {
        const memberName = m.firstName || m.displayName || m.email?.split('@')[0] || 'Member'
        addUser(memberName, m.email, m.role, m.userId || m.id)
      })
    }

    // 3. Any previous task assignees & reviewers
    projectTasks.forEach((t) => {
      if (t.assigneeName) addUser(t.assigneeName, undefined, 'Assignee')
      if (t.reviewerName) addUser(t.reviewerName, undefined, 'Reviewer')
    })

    return list
  }, [user, orgMembers, projectTasks, currentUserName])

  const availableAssignees = useMemo(() => {
    return Array.from(new Set([currentUserName, ...availableUsers.map((u) => u.name)]))
  }, [availableUsers, currentUserName])

  const [statusModalOpen, setStatusModalOpen] = useState(false)
  const { getStatuses, workspaceStatuses: rawWorkspaceStatuses } = useStatusStore()
  const workspaceStatuses = useMemo(
    () => getStatuses(currentWorkspace?.id || 'default'),
    [getStatuses, currentWorkspace?.id, rawWorkspaceStatuses]
  )

  const columns = useMemo(
    () =>
      workspaceStatuses.map((st) => ({
        id: st.id,
        title: st.name,
        color: st.color,
        category: st.category,
      })),
    [workspaceStatuses]
  )

  const getSelectValue = useCallback(
    (currentStatus?: string) => {
      if (!currentStatus) return columns[0]?.id || 'todo'
      if (columns.some((c) => c.id === currentStatus)) return currentStatus
      const matchCase = columns.find((c) => c.id.toLowerCase() === currentStatus.toLowerCase())
      if (matchCase) return matchCase.id
      if ((currentStatus === 'done' || currentStatus === 'complete') && columns.some((c) => c.id === 'complete')) return 'complete'
      if ((currentStatus === 'done' || currentStatus === 'complete') && columns.some((c) => c.id === 'done')) return 'done'
      return currentStatus
    },
    [columns]
  )

  const isTaskInColumn = useCallback(
    (task: Task, col: { id: string }, isFirstCol: boolean) => {
      if (task.status === col.id) return true
      if (task.status?.toLowerCase() === col.id.toLowerCase()) return true
      if ((col.id === 'done' || col.id === 'complete') && (task.status === 'done' || task.status === 'complete')) return true
      if (
        isFirstCol &&
        !columns.some(
          (c) =>
            c.id === task.status ||
            c.id.toLowerCase() === (task.status || '').toLowerCase() ||
            ((c.id === 'done' || c.id === 'complete') && (task.status === 'done' || task.status === 'complete'))
        )
      ) {
        return true
      }
      return false
    },
    [columns]
  )

  // Filtered according to category tab, user filter, tag filter, and horizontal status tab
  const filteredTasks = useMemo(() => {
    return projectTasks.filter((t) => {
      // Tag filter
      const matchesTag =
        filterTag === 'all' ||
        (t.tag || '').toLowerCase() === filterTag.toLowerCase() ||
        (filterTag === 'Bug Fix' && isBugTask(t)) ||
        (filterTag === 'Feature' && isFeatureTask(t))

      // User filter
      const matchesUser =
        selectedUserFilter === 'all' ||
        getFirstName(t.assigneeName || 'You').toLowerCase() === selectedUserFilter.toLowerCase()

      // Status tab filter
      const matchesStatusTab =
        selectedStatusTab === 'all' ||
        t.status === selectedStatusTab ||
        (selectedStatusTab === 'todo' && !workspaceStatuses.some((ws) => ws.id === t.status))

      // Category tab filter (All, Bugs & Fixes, Features)
      const isBug = isBugTask(t)
      const matchesCategory =
        activeCategoryTab === 'all'
          ? true
          : activeCategoryTab === 'bugs'
          ? isBug
          : !isBug

      return matchesTag && matchesUser && matchesStatusTab && matchesCategory
    })
  }, [projectTasks, filterTag, selectedUserFilter, selectedStatusTab, activeCategoryTab, workspaceStatuses])

  // Sorted tasks
  const displayTasks = useMemo(() => {
    const list = [...filteredTasks]
    list.sort((a, b) => {
      if (sortBy === 'assignee') {
        const nameA = getFirstName(a.assigneeName || 'You')
        const nameB = getFirstName(b.assigneeName || 'You')
        return nameA.localeCompare(nameB)
      }
      if (sortBy === 'due') {
        return (a.dueDate || '').localeCompare(b.dueDate || '')
      }
      if (sortBy === 'priority') {
        const priorityWeights: Record<string, number> = { urgent: 4, high: 3, medium: 2, low: 1 }
        return (priorityWeights[b.priority] || 0) - (priorityWeights[a.priority] || 0)
      }
      if (sortBy === 'status') {
        const indexA = workspaceStatuses.findIndex(
          (s) => s.id === a.status || s.id.toLowerCase() === (a.status || '').toLowerCase()
        )
        const indexB = workspaceStatuses.findIndex(
          (s) => s.id === b.status || s.id.toLowerCase() === (b.status || '').toLowerCase()
        )
        const posA = indexA === -1 ? 999 : indexA
        const posB = indexB === -1 ? 999 : indexB
        return posA - posB
      }
      if (sortBy === 'title') {
        return (a.title || '').localeCompare(b.title || '')
      }
      return 0
    })
    return list
  }, [filteredTasks, sortBy, workspaceStatuses])

  const handleStatusChange = async (taskId: string, newStatus: TaskStatus) => {
    const wsId = currentWorkspace?.id || '50a4c29f-09ff-4480-8b6b-495381247d0f'
    const targetStatusObj = workspaceStatuses.find((s) => s.id === newStatus)
    const isClosed = newStatus === 'done' || newStatus === 'complete' || targetStatusObj?.category === 'CLOSED'
    await updateStatus(taskId, newStatus, isClosed ? 'MAIN' : undefined)
    loadProjects(wsId)
    const statusLabel = targetStatusObj?.name || newStatus.replace(/_/g, ' ').toUpperCase()
    showToast(`Status updated to ${statusLabel}`)
  }

  // Drag and Drop handlers
  const handleTaskDragStart = (e: React.DragEvent, id: string) => {
    setDraggedTaskId(id)
    e.dataTransfer.setData('text/plain', id)
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleTaskDragEnd = () => {
    setDraggedTaskId(null)
    setDragOverColId(null)
    setDragOverStatusId(null)
    setDragOverTaskId(null)
  }

  const handleDropOnStatusTab = async (e: React.DragEvent, statusId: string) => {
    e.preventDefault()
    e.stopPropagation()
    const sourceId = draggedTaskId || e.dataTransfer.getData('text/plain')
    setDragOverStatusId(null)
    setDraggedTaskId(null)

    if (!sourceId) return
    if (statusId === 'all') return

    await handleStatusChange(sourceId, statusId as TaskStatus)
  }

  const handleColumnDragOver = (e: React.DragEvent, colId: string) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    if (dragOverColId !== colId) {
      setDragOverColId(colId)
    }
  }

  const handleColumnDragLeave = (e: React.DragEvent, colId: string) => {
    if (e.currentTarget.contains(e.relatedTarget as Node)) return
    if (dragOverColId === colId) {
      setDragOverColId(null)
    }
  }

  const handleColumnDrop = async (e: React.DragEvent, targetStatusId: string) => {
    e.preventDefault()
    e.stopPropagation()
    const taskId = draggedTaskId || e.dataTransfer.getData('text/plain')
    setDragOverColId(null)
    setDraggedTaskId(null)
    setDragOverTaskId(null)

    if (!taskId) return
    const task = tasks.find((t) => t.id === taskId)
    if (!task) return

    const isAlreadyInStatus =
      task.status === targetStatusId ||
      task.status?.toLowerCase() === targetStatusId.toLowerCase() ||
      ((targetStatusId === 'done' || targetStatusId === 'complete') && (task.status === 'done' || task.status === 'complete'))

    if (!isAlreadyInStatus) {
      await handleStatusChange(taskId, targetStatusId as TaskStatus)
    }
  }

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault()
    if (isCreatingTask) return
    if (!newTaskTitle.trim()) return

    const wsId = currentWorkspace?.id || '50a4c29f-09ff-4480-8b6b-495381247d0f'
    try {
      setIsCreatingTask(true)
      const finalTag =
        newTaskCategory === 'custom'
          ? (customTagInput.trim() || 'Custom')
          : (newTaskCategory || 'Feature')

      await createTask(wsId, {
        title: newTaskTitle.trim(),
        projectId: projectId,
        tag: finalTag,
        assigneeName: getFirstName(newTaskAssignee === 'You' ? currentUserName : (newTaskAssignee || currentUserName)),
        reviewerName: getFirstName(newTaskAssignedBy === 'You' ? currentUserName : (newTaskAssignedBy || currentUserName)),
        dueDate: newTaskDue || todayStr,
        priority: newTaskPriority,
        status: (newTaskStatus || columns[0]?.id || 'todo') as TaskStatus,
        environment: getEnvForStatus(newTaskStatus || columns[0]?.id || 'todo', newTaskEnv || 'DEV') as TaskEnvironment,
        subtasks: '[]',
        filesChanged: '[]',
      })
      // Reset inputs cleanly
      setNewTaskTitle('')
      setNewTaskCategory('Feature')
      setUserManuallySelectedCategory(false)
      setAutoDetectedCategory(null)
      setCustomTagInput('')
      setNewTaskDue(todayStr)
      setNewTaskStatus(columns[0]?.id || 'todo')
      setIsModalOpen(false)
      loadProjects(wsId)
      showToast('New deliverable added to project!')
    } catch (err: any) {
      showToast(err?.message || 'Failed to create deliverable')
    } finally {
      setIsCreatingTask(false)
    }
  }

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (isUpdatingTask || !editingTask || !editTitle.trim()) return

    const wsId = currentWorkspace?.id || '50a4c29f-09ff-4480-8b6b-495381247d0f'
    try {
      setIsUpdatingTask(true)
      const finalTag =
        editCategory === 'custom'
          ? (editCustomTag.trim() || 'Custom')
          : (editCategory || editTag || 'Feature')

      await updateTask(editingTask.id, {
        title: editTitle.trim(),
        tag: finalTag,
        assigneeName: getFirstName(editAssignee),
        dueDate: editDue,
        priority: editPriority,
        status: editStatus,
        environment: getEnvForStatus(editStatus, editEnv) as TaskEnvironment,
      })
      setEditingTask(null)
      loadProjects(wsId)
      showToast('Deliverable updated!')
    } catch (err: any) {
      showToast(err?.message || 'Failed to update deliverable')
    } finally {
      setIsUpdatingTask(false)
    }
  }

  const confirmDeleteTask = async () => {
    if (!taskToDelete || isDeletingTask) return
    const wsId = currentWorkspace?.id || '50a4c29f-09ff-4480-8b6b-495381247d0f'
    try {
      setIsDeletingTask(true)
      await deleteTask(taskToDelete.id)
      loadProjects(wsId)
      showToast(`Task "${taskToDelete.title}" deleted`)
      setTaskToDelete(null)
      if (editingTask?.id === taskToDelete.id) {
        setEditingTask(null)
      }
    } catch (err: any) {
      showToast(err?.message || 'Failed to delete task')
    } finally {
      setIsDeletingTask(false)
    }
  }

  const handleDelete = (id: string) => {
    const t = tasks.find((x) => x.id === id)
    if (t) {
      setTaskToDelete(t)
    }
  }

  const openEditModal = (t: Task) => {
    setEditingTask(t)
    setEditTitle(t.title)
    const catValue = getCategoryDropdownValue(t.tag)
    setEditCategory(catValue)
    if (catValue === 'custom') {
      setEditCustomTag(t.tag || '')
      setEditTag(t.tag || 'Custom')
    } else {
      setEditCustomTag('')
      setEditTag(catValue)
    }
    setEditAssignee(getFirstName(t.assigneeName || 'You'))
    setEditDue(t.dueDate || new Date().toISOString().split('T')[0])
    setEditPriority(t.priority)
    setEditStatus(t.status)
    setEditEnv(getEnvForStatus(t.status, t.environment) as TaskEnvironment)
  }

  const getEnvBadge = (env: string) => {
    switch (env) {
      case 'DEV':
        return { style: 'bg-blue-500/15 text-blue-600 border-blue-500/30' }
      case 'SIT':
        return { style: 'bg-amber-500/15 text-amber-600 border-amber-500/30' }
      case 'UAT':
        return { style: 'bg-purple-500/15 text-purple-600 border-purple-500/30' }
      case 'RELEASE':
        return { style: 'bg-rose-500/15 text-rose-600 border-rose-500/30' }
      case 'MAIN':
        return { style: 'bg-emerald-500/15 text-emerald-600 border-emerald-500/30' }
      default:
        return { style: 'bg-muted text-muted-foreground border-border' }
    }
  }

  let projectEnvs: string[] = [...ALL_ENVIRONMENTS]
  try {
    if (project?.environments) {
      projectEnvs = JSON.parse(project.environments)
    }
  } catch {
    projectEnvs = project?.environments ? project.environments.split(',') : [...ALL_ENVIRONMENTS]
  }

  if ((isProjectsLoading && !project) || (!project && projects.length === 0)) {
    return <ProjectDetailsSkeleton />
  }

  return (
    <>
      <UserGuideModal isOpen={guideModalOpen} onClose={() => setGuideModalOpen(false)} />

      <div className="space-y-6 max-w-7xl mx-auto animate-fade-in pb-12">
        {toastMessage && (
          <div className="fixed top-6 right-6 z-50 flex items-center gap-2 bg-emerald-600 text-white px-4 py-3 rounded-2xl shadow-xl animate-fade-in text-xs font-semibold backdrop-blur-md">
            <CheckCircle2 className="w-4 h-4" />
            <span>{toastMessage}</span>
          </div>
        )}

        {/* ========================================================================= */}
        {/* HEADER SECTION: Matching My Tasks & Board Structure (Screenshot 4)        */}
        {/* ========================================================================= */}
        <div
          className="p-6 rounded-3xl border shadow-sm relative overflow-hidden space-y-4"
          style={{
            backgroundColor: `${projColor}14`,
            borderColor: `${projColor}55`,
          }}
        >
          <div
            className="absolute top-0 left-0 right-0 h-1 rounded-t-3xl"
            style={{ backgroundColor: projColor }}
          />

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <Link
                href="/app/projects"
                className="inline-flex items-center gap-1.5 text-xs font-bold text-muted-foreground hover:text-foreground transition-colors mb-1"
              >
                <ArrowLeft className="w-3.5 h-3.5" /> Back to Projects &amp; Pipelines
              </Link>
              <h1 className="text-2xl font-extrabold tracking-tight" style={{ color: projColor }}>
                {project?.name || 'Project'} Deliverables
              </h1>
              <p className="text-xs text-muted-foreground max-w-2xl">
                {project?.description && project.description !== 'Comprehensive project milestones & deliverables'
                  ? project.description
                  : 'Comprehensive project deliverables overview, sprint tracking, bugs triage, and feature progress.'}
              </p>
            </div>

            <div className="flex items-center gap-2.5 shrink-0 self-start sm:self-auto flex-wrap">
              <button
                type="button"
                onClick={() => setGuideModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl border border-border bg-card/80 hover:bg-accent text-xs font-bold text-foreground transition-all shadow-sm active:scale-95 cursor-pointer"
                title="Open Workspace Guide"
              >
                <Workflow className="w-3.5 h-3.5 text-primary" />
                <span>Guide</span>
              </button>

              <button
                type="button"
                onClick={() => setIsInviteModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl border border-border bg-card/80 hover:bg-accent text-xs font-bold text-foreground transition-all shadow-sm active:scale-95 cursor-pointer"
                title="Invite a team member to this project via email"
              >
                <UserPlus className="w-3.5 h-3.5 text-primary" />
                <span>Invite</span>
              </button>

              <button
                type="button"
                onClick={() => setStatusModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl border border-border bg-card/80 hover:bg-accent text-xs font-bold text-foreground transition-all shadow-sm active:scale-95 cursor-pointer"
                title="Edit Space Statuses (ClickUp style)"
              >
                <Sliders className="w-3.5 h-3.5 text-primary" />
                <span>Statuses</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setNewTaskTitle('')
                  setNewTaskCategory('Feature')
                  setUserManuallySelectedCategory(false)
                  setAutoDetectedCategory(null)
                  setIsModalOpen(true)
                }}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-xs font-bold hover:bg-primary/90 transition-all shadow-md active:scale-95 cursor-pointer"
              >
                <Plus className="w-4 h-4" /> Add Task
              </button>
            </div>
          </div>

          {/* 4 KPI Metrics Summary Strip (Scoped strictly to this project) */}
          <div className="pt-3 border-t border-border/50 grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3 rounded-2xl bg-background/80 border border-border/60">
              <span className="text-[10px] font-bold text-muted-foreground uppercase">Total Deliverables</span>
              <div className="text-lg font-extrabold text-foreground mt-0.5">{projectTasks.length}</div>
            </div>

            <div className="p-3 rounded-2xl bg-background/80 border border-border/60">
              <span className="text-[10px] font-bold text-rose-500 uppercase flex items-center gap-1">
                <Bug className="w-3 h-3" /> Bugs &amp; Fixes
              </span>
              <div className="text-lg font-extrabold text-rose-500 mt-0.5">{bugTasks.length}</div>
            </div>

            <div className="p-3 rounded-2xl bg-background/80 border border-border/60">
              <span className="text-[10px] font-bold text-blue-500 uppercase flex items-center gap-1">
                <Sparkles className="w-3 h-3" /> Feature Tasks
              </span>
              <div className="text-lg font-extrabold text-blue-500 mt-0.5">{featureTasks.length}</div>
            </div>

            <div className="p-3 rounded-2xl bg-background/80 border border-border/60">
              <span className="text-[10px] font-bold text-muted-foreground uppercase">Weighted Progress</span>
              <div className="text-lg font-extrabold mt-0.5" style={{ color: projColor }}>
                {weightedProgress}%
              </div>
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* CONTROLS BAR: Category Filter, Tag Filter, View Switcher & Due Alerts     */}
        {/* ========================================================================= */}
        <div className="flex flex-wrap items-center justify-between gap-3 bg-card/80 border border-border/80 p-3.5 rounded-2xl shadow-xs">
          {/* Category Tabs (All Tasks, Bugs & Fixes, Features) matching Screenshot 4 */}
          <div className="flex items-center gap-1.5 overflow-x-auto max-w-full pb-1 sm:pb-0">
            <button
              onClick={() => setActiveCategoryTab('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
                activeCategoryTab === 'all'
                  ? 'bg-primary text-primary-foreground shadow-xs'
                  : 'bg-muted/70 text-muted-foreground hover:text-foreground'
              }`}
            >
              All Tasks ({projectTasks.length})
            </button>
            <button
              onClick={() => setActiveCategoryTab('bugs')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1 ${
                activeCategoryTab === 'bugs'
                  ? 'bg-rose-500 text-white shadow-xs'
                  : 'bg-rose-500/10 text-rose-600 hover:bg-rose-500/20'
              }`}
            >
              <Bug className="w-3.5 h-3.5" /> Bugs &amp; Fixes ({bugTasks.length})
            </button>
            <button
              onClick={() => setActiveCategoryTab('features')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1 ${
                activeCategoryTab === 'features'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-blue-500/10 text-blue-600 hover:bg-blue-500/20'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" /> Features ({featureTasks.length})
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Tag Filter */}
            <div className="flex items-center gap-1.5 bg-background/80 px-3 py-1.5 rounded-xl border border-border text-xs">
              <Filter className="w-3.5 h-3.5 text-primary" />
              <select
                value={filterTag}
                onChange={(e) => setFilterTag(e.target.value)}
                className="bg-transparent text-foreground text-xs focus:outline-none cursor-pointer font-medium"
              >
                <option value="all">All Tags ({projectTasks.length})</option>
                <option value="Feature">Feature</option>
                <option value="Bug Fix">Bug Fix</option>
                <option value="Frontend">Frontend</option>
                <option value="Backend">Backend</option>
                <option value="Design">Design</option>
                <option value="DevOps">DevOps</option>
                <option value="Architecture">Architecture</option>
                <option value="Documentation">Documentation</option>
                <option value="Testing / QA">Testing / QA</option>
              </select>
            </div>

            {/* Assignee / User Filter */}
            <div className="flex items-center gap-1.5 bg-background/80 px-3 py-1.5 rounded-xl border border-border text-xs">
              <User className="w-3.5 h-3.5 text-primary" />
              <select
                value={selectedUserFilter}
                onChange={(e) => setSelectedUserFilter(e.target.value)}
                className="bg-transparent text-foreground text-xs focus:outline-none cursor-pointer font-medium"
              >
                <option value="all">All Users ({availableUsers.length})</option>
                {availableUsers.map((u) => (
                  <option key={u.id} value={u.name}>
                    {u.name} {u.role ? `(${u.role})` : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* View Switcher: Minimal Grid, List, Tree / Graph, and Board */}
            <div className="flex items-center p-1 bg-black/80 backdrop-blur-md rounded-xl border border-border/80 shadow-xs">
              <button
                type="button"
                onClick={() => setViewMode('grid')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  viewMode === 'grid'
                    ? 'bg-card text-foreground border border-border shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
                title="Minimal Liquid Glass Grid View (Screenshot 4)"
              >
                <LayoutGrid className="w-3.5 h-3.5 text-primary" /> Grid
              </button>
              <button
                type="button"
                onClick={() => setViewMode('list')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  viewMode === 'list'
                    ? 'bg-card text-foreground border border-border shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
                title="Compact List View"
              >
                <List className="w-3.5 h-3.5 text-primary" /> List
              </button>
              <button
                type="button"
                onClick={() => setViewMode('tree')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  viewMode === 'tree'
                    ? 'bg-card text-foreground border border-border shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
                title="Interactive Project Hierarchy Graph"
              >
                <GitBranch className="w-3.5 h-3.5 text-primary" /> Tree / Graph
              </button>
              <button
                type="button"
                onClick={() => setViewMode('board')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  viewMode === 'board'
                    ? 'bg-card text-foreground border border-border shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
                title="Kanban Board View"
              >
                <Columns className="w-3.5 h-3.5 text-primary" /> Board
              </button>
            </div>

            {/* Dispatch Due Alerts: Date Selector + Dispatch Action */}
            <div className="flex items-center gap-1.5 bg-card border border-border px-2 py-1 rounded-xl shadow-xs">
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Calendar className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                <input
                  type="date"
                  value={selectedAlertDate}
                  onChange={(e) => setSelectedAlertDate(e.target.value)}
                  className="bg-transparent text-foreground text-xs focus:outline-none cursor-pointer font-medium"
                  title="Select date to dispatch due alerts for"
                />
              </div>
              <button
                type="button"
                onClick={() => handleDispatchDateDueAlerts(selectedAlertDate)}
                disabled={isDispatchingDateAlert}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-rose-600 to-amber-600 hover:brightness-110 text-white text-xs font-bold shadow-xs transition-all active:scale-95 disabled:opacity-50 cursor-pointer whitespace-nowrap"
                title={`Send email alert for all deliverables due on ${selectedAlertDate}`}
              >
                {isDispatchingDateAlert ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Bell className="w-3.5 h-3.5" />
                )}
                <span>Dispatch Due Alerts</span>
                {projectTasks.filter(
                  (t) =>
                    (t.dueDate === selectedAlertDate || (selectedAlertDate === todayStr && t.dueDate === 'Today')) &&
                    t.status !== 'done' &&
                    t.status !== 'complete'
                ).length > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full bg-white/30 text-[10px] font-black leading-none">
                    {
                      projectTasks.filter(
                        (t) =>
                          (t.dueDate === selectedAlertDate || (selectedAlertDate === todayStr && t.dueDate === 'Today')) &&
                          t.status !== 'done' &&
                          t.status !== 'complete'
                      ).length
                    }
                  </span>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* STATUS HORIZONTAL TABS: Matching My Tasks & Board Structure (Screenshot 4) */}
        {/* ========================================================================= */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          <button
            type="button"
            onClick={() => setSelectedStatusTab('all')}
            onDragOver={(e) => {
              e.preventDefault()
              setDragOverStatusId('all')
            }}
            onDragLeave={() => setDragOverStatusId(null)}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
              dragOverStatusId === 'all' ? 'ring-2 ring-primary scale-105' : ''
            } ${
              selectedStatusTab === 'all'
                ? 'bg-primary text-primary-foreground shadow-md border border-primary'
                : 'bg-card hover:bg-accent text-foreground border border-border'
            }`}
          >
            <span>All Tasks</span>
            <span
              className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                selectedStatusTab === 'all'
                  ? 'bg-white/20 text-white'
                  : 'bg-muted text-muted-foreground border border-border'
              }`}
            >
              {projectTasks.length}
            </span>
          </button>

          {workspaceStatuses.map((st) => {
            const count = projectTasks.filter(
              (t) => t.status === st.id || (st.id === 'todo' && !workspaceStatuses.some((ws) => ws.id === t.status))
            ).length
            const isActive = selectedStatusTab === st.id
            const isDragOver = dragOverStatusId === st.id
            return (
              <button
                key={st.id}
                type="button"
                onClick={() => setSelectedStatusTab(st.id)}
                onDragOver={(e) => {
                  e.preventDefault()
                  setDragOverStatusId(st.id)
                }}
                onDragLeave={() => setDragOverStatusId(null)}
                onDrop={(e) => handleDropOnStatusTab(e, st.id)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 whitespace-nowrap ${
                  isDragOver ? 'ring-2 ring-primary scale-105 bg-primary/20 shadow-md' : ''
                } ${
                  isActive
                    ? 'bg-primary text-primary-foreground shadow-md border border-primary'
                    : 'bg-card hover:bg-accent text-foreground border border-border'
                }`}
                title={`Drop task card here to move deliverable to ${st.name}`}
              >
                <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: st.color }} />
                <span>{st.name}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                    isActive ? 'bg-white/20 text-white' : 'bg-muted text-muted-foreground border border-border'
                  }`}
                >
                  {count}
                </span>
              </button>
            )
          })}
        </div>

        {/* ========================================================================= */}
        {/* VIEW MODE 1: MINIMAL SPACIOUS LIQUID GLASS GRID VIEW (Screenshot 4)       */}
        {/* ========================================================================= */}
        {viewMode === 'grid' && (
          <div className="space-y-6">
            {displayTasks.length === 0 ? (
              <div className="text-center py-20 rounded-3xl border border-dashed border-border/70 bg-card/40 backdrop-blur-md p-8 space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-muted/80 flex items-center justify-center mx-auto text-muted-foreground">
                  <CheckSquare className="w-6 h-6" />
                </div>
                <h3 className="text-sm font-bold text-foreground">No deliverables found</h3>
                <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                  No deliverables match the selected category or status in this project.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setNewTaskTitle('')
                    setNewTaskCategory('Feature')
                    setUserManuallySelectedCategory(false)
                    setAutoDetectedCategory(null)
                    setIsModalOpen(true)
                  }}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-bold hover:bg-primary/90 transition-all shadow-md active:scale-95 cursor-pointer mt-2"
                >
                  <Plus className="w-4 h-4" /> Add Deliverable
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {displayTasks.map((task) => {
                  const dueStatus = getDueStatus(task.dueDate)
                  const isExpanded = expandedTasks[task.id]
                  const isBug = isBugTask(task)

                  let subtaskList: any[] = []
                  try {
                    if (task.subtasks) {
                      const parsed = JSON.parse(task.subtasks)
                      subtaskList = Array.isArray(parsed) ? parsed : [parsed]
                    }
                  } catch {}
                  if (!Array.isArray(subtaskList)) subtaskList = []
                  const doneCount = subtaskList.filter((s: any) => s.completed).length

                  let attachmentsList: any[] = []
                  try {
                    if (task.filesChanged && task.filesChanged.startsWith('[')) {
                      attachmentsList = JSON.parse(task.filesChanged)
                    }
                  } catch {}

                  let commentsList: any[] = []
                  try {
                    if (task.historyLogs && task.historyLogs.startsWith('[')) {
                      commentsList = JSON.parse(task.historyLogs).filter(
                        (i: any) => i.content || i.comment || i.type === 'comment'
                      )
                    }
                  } catch {}

                  const taskProgress = calculateTaskProgress(task)
                  const assigneeName = getFirstName(task.assigneeName || 'You')
                  const reviewerName = getFirstName(task.reviewerName || 'You')

                  return (
                    <div
                      key={task.id}
                      draggable={true}
                      onDragStart={(e) => handleTaskDragStart(e, task.id)}
                      onDragEnd={handleTaskDragEnd}
                      className={`group relative rounded-3xl border border-border/80 bg-card p-5 space-y-4 backdrop-blur-xl overflow-hidden cursor-move flex flex-col justify-between select-none shadow-sm hover:shadow-xl hover:border-primary/60 transition-all ${
                        draggedTaskId === task.id ? 'opacity-40 scale-95 border-dashed border-primary ring-2 ring-primary/40' : ''
                      }`}
                      title="Drag deliverable to status tab or reorder"
                    >
                      {/* Left Accent Strip */}
                      <div
                        className="absolute left-0 top-0 bottom-0 w-1.5 rounded-l-3xl transition-all group-hover:w-2"
                        style={{ backgroundColor: projColor }}
                      />

                      {/* Card Content Area */}
                      <div className="space-y-3 relative z-10 pl-1">
                        {/* Tags and Project Row (Matching Screenshot 4) */}
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5 flex-wrap min-w-0">
                            {/* Drag Handle */}
                            <div
                              className="text-muted-foreground/50 hover:text-foreground cursor-grab active:cursor-grabbing shrink-0 p-0.5 transition-colors"
                              title="Drag to reorder or change status"
                            >
                              <GripVertical className="w-4 h-4" />
                            </div>

                            {/* Project Badge */}
                            <span
                              className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-xl border truncate max-w-[140px] shadow-xs"
                              style={{
                                backgroundColor: `${projColor}18`,
                                borderColor: `${projColor}40`,
                                color: projColor,
                              }}
                            >
                              <FolderKanban className="w-3 h-3 shrink-0" />
                              <span className="truncate">{project?.name || 'Project'}</span>
                            </span>

                            {/* Category / Tag Badge (Strict User Choice Honored!) */}
                            {isBug ? (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30 shrink-0">
                                <Bug className="w-2.5 h-2.5" /> Bug / Fix
                              </span>
                            ) : task.tag && task.tag.toLowerCase() !== 'feature' ? (
                              <span
                                className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full truncate max-w-[120px] ${getTagStyle(
                                  task.tag
                                )}`}
                              >
                                {task.tag}
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/30 shrink-0">
                                <Sparkles className="w-2.5 h-2.5" /> Feature
                              </span>
                            )}
                          </div>

                          {/* Priority Pill */}
                          <span
                            className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full border ${
                              task.priority === 'high' || task.priority === 'urgent'
                                ? 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30'
                                : task.priority === 'medium'
                                ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30'
                                : 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                            }`}
                          >
                            {task.priority || 'medium'}
                          </span>
                        </div>

                        {/* Title (Link to Detail Page) */}
                        <Link
                          href={`/app/tasks/${task.id}`}
                          className="block text-sm font-bold tracking-tight text-foreground hover:text-primary transition-colors leading-snug line-clamp-2"
                        >
                          {task.title}
                        </Link>

                        {/* Description snippet if any */}
                        {task.description && (
                          <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                            {task.description}
                          </p>
                        )}

                        {/* Dynamic Progress Bar & Percentage Pill (Matching Screenshot 4) */}
                        <div className="space-y-1.5 py-0.5">
                          <div className="flex items-center justify-between text-[11px] font-semibold">
                            <span className="text-muted-foreground flex items-center gap-1">
                              <SlidersHorizontal className="w-3 h-3 text-primary" /> Progress
                            </span>
                            <span className="font-bold text-primary px-2 py-0.2 rounded-full bg-primary/10 border border-primary/20 text-[10px]">
                              {taskProgress}%
                            </span>
                          </div>
                          <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all duration-300 bg-gradient-to-r from-primary/70 via-primary to-primary/90"
                              style={{ width: `${taskProgress}%` }}
                            />
                          </div>
                        </div>

                        {/* Attachments & Comments Badges */}
                        {(attachmentsList.length > 0 || commentsList.length > 0) && (
                          <div className="flex items-center gap-2 pt-0.5">
                            {attachmentsList.length > 0 && (
                              <button
                                type="button"
                                onClick={() => openEditModal(task)}
                                className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-lg bg-muted hover:bg-accent border border-border text-foreground cursor-pointer transition-colors shadow-xs"
                                title={`${attachmentsList.length} attachment(s)`}
                              >
                                <Paperclip className="w-3 h-3 text-primary" />
                                <span>
                                  {attachmentsList.length} file{attachmentsList.length === 1 ? '' : 's'}
                                </span>
                              </button>
                            )}
                            {commentsList.length > 0 && (
                              <button
                                type="button"
                                onClick={() => openEditModal(task)}
                                className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-lg bg-muted hover:bg-accent border border-border text-foreground cursor-pointer transition-colors shadow-xs"
                                title={`${commentsList.length} comment(s)`}
                              >
                                <MessageSquare className="w-3 h-3 text-primary" />
                                <span>
                                  {commentsList.length} comment{commentsList.length === 1 ? '' : 's'}
                                </span>
                              </button>
                            )}
                          </div>
                        )}

                        {/* Subtasks summary badge if any */}
                        {subtaskList.length > 0 && (
                          <div className="space-y-2">
                            <button
                              type="button"
                              onClick={() => toggleTaskTree(task.id)}
                              className="flex items-center gap-1.5 text-[11px] font-semibold text-foreground hover:text-primary px-2.5 py-1 rounded-xl bg-muted border border-border hover:border-primary/40 transition-all cursor-pointer"
                            >
                              <CheckSquare className="w-3 h-3 text-primary" />
                              <span>
                                Subtasks: {doneCount}/{subtaskList.length} completed
                              </span>
                              {isExpanded ? (
                                <ChevronUp className="w-3 h-3 ml-auto text-muted-foreground" />
                              ) : (
                                <ChevronDown className="w-3 h-3 ml-auto text-muted-foreground" />
                              )}
                            </button>

                            {/* Expandable subtasks preview */}
                            {isExpanded && (
                              <div className="p-3 rounded-2xl bg-muted/40 border border-border space-y-2 text-xs animate-fade-in">
                                {subtaskList.map((st: any) => (
                                  <label
                                    key={st.id}
                                    className="flex items-center gap-2 cursor-pointer text-[11px] text-foreground hover:text-primary transition-colors"
                                  >
                                    <input
                                      type="checkbox"
                                      checked={st.completed}
                                      onChange={() => toggleSubtask(task.id, st.id)}
                                      className="w-3.5 h-3.5 rounded text-primary focus:ring-primary cursor-pointer accent-primary"
                                    />
                                    <span
                                      className={
                                        st.completed
                                          ? 'line-through text-muted-foreground'
                                          : 'font-medium text-foreground'
                                      }
                                    >
                                      {st.title}
                                    </span>
                                  </label>
                                ))}
                              </div>
                            )}
                          </div>
                        )}

                        {/* Assignee & Assigned By Info (Matching Screenshot 4) */}
                        <div className="pt-2 border-t border-border/60 flex items-center justify-between gap-2 text-xs">
                          <div className="flex items-center gap-2 min-w-0">
                            <div className="w-6 h-6 rounded-full bg-primary/15 border border-primary/30 text-primary font-bold text-[10px] flex items-center justify-center shrink-0">
                              {assigneeName.charAt(0).toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <p className="text-[11px] font-bold text-foreground truncate">{assigneeName}</p>
                              <p className="text-[9px] text-muted-foreground truncate">By: {reviewerName}</p>
                            </div>
                          </div>

                          {/* Due Date Indicator */}
                          <div
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[11px] font-semibold whitespace-nowrap shrink-0 border ${
                              dueStatus.isToday
                                ? 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30 ring-1 ring-rose-500/20'
                                : dueStatus.isOverdue
                                ? 'bg-red-500/20 text-red-600 dark:text-red-400 font-bold border-red-500/30'
                                : dueStatus.isNear
                                ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30'
                                : 'bg-muted text-muted-foreground border-border'
                            }`}
                          >
                            <Calendar className="w-3 h-3 text-primary shrink-0" />
                            <span>{task.dueDate || todayStr}</span>
                            {dueStatus.text && (
                              <span className="text-[9px] font-black uppercase opacity-90">({dueStatus.text})</span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Footer Actions: Status Dropdown & Action Buttons */}
                      <div className="pt-3 border-t border-border/60 flex items-center justify-between gap-2 relative z-10 pl-1">
                        {/* Status selector */}
                        <select
                          value={getSelectValue(task.status)}
                          onChange={(e) => handleStatusChange(task.id, e.target.value as TaskStatus)}
                          className="text-[11px] font-semibold bg-background hover:bg-muted border border-border px-2.5 py-1.5 rounded-xl text-foreground focus:outline-none focus:border-primary cursor-pointer transition-colors shadow-xs"
                        >
                          {workspaceStatuses.map((st) => (
                            <option key={st.id} value={st.id}>
                              {st.name}
                            </option>
                          ))}
                        </select>

                        <div className="flex items-center gap-1">
                          {/* Due Alert bell */}
                          <button
                            type="button"
                            onClick={() => handleSendDueAlert(task)}
                            disabled={dispatchingAlertId === task.id}
                            className="p-1.5 text-muted-foreground hover:text-amber-500 rounded-lg hover:bg-muted transition-colors relative cursor-pointer"
                            title="Send due date alert email"
                          >
                            {dispatchingAlertId === task.id ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />
                            ) : (
                              <Bell className="w-3.5 h-3.5" />
                            )}
                          </button>

                          {/* Edit button */}
                          <button
                            type="button"
                            onClick={() => openEditModal(task)}
                            className="p-1.5 text-muted-foreground hover:text-primary rounded-lg hover:bg-muted transition-colors cursor-pointer"
                            title="Edit deliverable"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>

                          {/* Delete button */}
                          <button
                            type="button"
                            onClick={() => handleDelete(task.id)}
                            className="p-1.5 text-muted-foreground hover:text-destructive rounded-lg hover:bg-muted transition-colors cursor-pointer"
                            title="Delete deliverable"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* VIEW MODE 2: COMPACT LIST VIEW                                            */}
        {/* ========================================================================= */}
        {viewMode === 'list' && (
          <div className="rounded-3xl border border-border bg-card overflow-hidden shadow-sm">
            <table className="w-full text-left text-xs">
              <thead className="bg-muted/80 border-b border-border text-muted-foreground font-semibold">
                <tr>
                  <th className="p-3.5 pl-6">Deliverable Title</th>
                  <th className="p-3.5">Status</th>
                  <th className="p-3.5">Progress</th>
                  <th className="p-3.5">Category / Tag</th>
                  <th className="p-3.5">Assigned To</th>
                  <th className="p-3.5">Assigned By</th>
                  <th className="p-3.5">Due Date</th>
                  <th className="p-3.5 pr-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {displayTasks.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="text-center py-12 text-muted-foreground">
                      No deliverables match the selected filters.
                    </td>
                  </tr>
                ) : (
                  displayTasks.map((t) => {
                    const dueStatus = getDueStatus(t.dueDate)
                    const isBug = isBugTask(t)
                    const taskProgress = calculateTaskProgress(t)

                    return (
                      <tr key={t.id} className="hover:bg-muted/50 transition-colors">
                        <td className="p-3.5 pl-6 font-bold text-foreground">
                          <Link href={`/app/tasks/${t.id}`} className="hover:text-primary transition-colors">
                            {t.title}
                          </Link>
                        </td>
                        <td className="p-3.5">
                          <select
                            value={getSelectValue(t.status)}
                            onChange={(e) => handleStatusChange(t.id, e.target.value as TaskStatus)}
                            className="bg-transparent text-foreground font-semibold cursor-pointer focus:outline-none border-b border-border pb-0.5"
                          >
                            {workspaceStatuses.map((st) => (
                              <option key={st.id} value={st.id}>
                                {st.name}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="p-3.5">
                          <div className="flex items-center gap-2">
                            <div className="h-1.5 w-16 bg-muted rounded-full overflow-hidden">
                              <div className="h-full bg-primary rounded-full" style={{ width: `${taskProgress}%` }} />
                            </div>
                            <span className="text-[10px] font-bold text-primary">{taskProgress}%</span>
                          </div>
                        </td>
                        <td className="p-3.5">
                          {isBug ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-500/15 text-rose-600 border border-rose-500/30">
                              <Bug className="w-2.5 h-2.5" /> Bug / Fix
                            </span>
                          ) : (
                            <span
                              className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${getTagStyle(t.tag)}`}
                            >
                              {t.tag || 'Feature'}
                            </span>
                          )}
                        </td>
                        <td className="p-3.5 font-medium text-foreground">{getFirstName(t.assigneeName || 'You')}</td>
                        <td className="p-3.5 text-muted-foreground">{getFirstName(t.reviewerName || 'You')}</td>
                        <td className="p-3.5 text-muted-foreground">
                          <span
                            className={
                              dueStatus.isToday
                                ? 'text-rose-600 font-bold'
                                : dueStatus.isOverdue
                                ? 'text-red-500 font-bold'
                                : ''
                            }
                          >
                            {t.dueDate || 'Today'}
                          </span>
                        </td>
                        <td className="p-3.5 pr-6 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleSendDueAlert(t)}
                              disabled={dispatchingAlertId === t.id}
                              className="p-1 text-muted-foreground hover:text-amber-500 rounded transition-colors cursor-pointer"
                              title="Send due date alert email"
                            >
                              <Bell className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => openEditModal(t)}
                              className="p-1 text-muted-foreground hover:text-primary rounded transition-colors cursor-pointer"
                              title="Edit deliverable"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDelete(t.id)}
                              className="p-1 text-muted-foreground hover:text-destructive rounded transition-colors cursor-pointer"
                              title="Delete deliverable"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* ========================================================================= */}
        {/* VIEW MODE 3: TREE / GRAPH VIEW                                            */}
        {/* ========================================================================= */}
        {viewMode === 'tree' && (
          <div className="space-y-6">
            <div className="p-5 rounded-3xl bg-card border border-border shadow-md space-y-6">
              {/* Root Project Node */}
              <div
                className="flex items-center gap-3 p-4 rounded-2xl border shadow-xs"
                style={{
                  backgroundColor: `${projColor}14`,
                  borderColor: `${projColor}40`,
                }}
              >
                <div
                  className="p-2.5 rounded-xl text-white shadow-md"
                  style={{ backgroundColor: projColor }}
                >
                  <FolderKanban className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-foreground tracking-tight">
                      Project: {project?.name || 'Project'}
                    </h3>
                    <span
                      className="text-[10px] font-bold px-2 py-0.5 rounded-full border"
                      style={{
                        backgroundColor: `${projColor}20`,
                        borderColor: `${projColor}40`,
                        color: projColor,
                      }}
                    >
                      Pipeline Graph
                    </span>
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    Hierarchical deliverables tree connecting statuses, deliverables, and subtasks.
                  </p>
                </div>
              </div>

              {/* Status Branches */}
              <div className="space-y-6 pl-4 md:pl-8 border-l-2 border-primary/25 ml-4">
                {workspaceStatuses.map((status) => {
                  const statusTasks = filteredTasks.filter(
                    (t) =>
                      t.status === status.id ||
                      (status.id === 'todo' && !workspaceStatuses.some((ws) => ws.id === t.status))
                  )
                  const isExpanded = expandedTreeStatuses[status.id] ?? true

                  return (
                    <div key={status.id} className="relative space-y-3">
                      <div className="absolute -left-4 md:-left-8 top-4 w-4 md:w-8 h-0.5 bg-primary/30" />

                      <div
                        onClick={() => toggleTreeStatus(status.id)}
                        className="flex items-center justify-between p-3.5 rounded-2xl border border-border bg-card hover:border-primary/60 shadow-xs hover:shadow-md transition-all cursor-pointer group select-none"
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className="w-3.5 h-3.5 rounded-full shrink-0"
                            style={{
                              backgroundColor: status.color,
                              boxShadow: `0 0 10px ${status.color}`,
                            }}
                          />
                          <div>
                            <span className="text-xs font-bold text-foreground uppercase tracking-wide">
                              {status.name}
                            </span>
                            <span className="text-[10px] text-muted-foreground ml-2">
                              ({status.category.replace('_', ' ')})
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-muted text-muted-foreground border border-border">
                            {statusTasks.length} task{statusTasks.length === 1 ? '' : 's'}
                          </span>
                          {isExpanded ? (
                            <ChevronUp className="w-4 h-4 text-muted-foreground group-hover:text-foreground" />
                          ) : (
                            <ChevronDown className="w-4 h-4 text-muted-foreground group-hover:text-foreground" />
                          )}
                        </div>
                      </div>

                      {/* Deliverables under this status node */}
                      {isExpanded && (
                        <div className="space-y-3 pl-4 md:pl-8 border-l-2 border-dashed border-border ml-4 animate-fade-in">
                          {statusTasks.length === 0 ? (
                            <div className="text-xs text-muted-foreground py-2 italic">
                              No deliverables in this status branch.
                            </div>
                          ) : (
                            statusTasks.map((t) => {
                              const isBug = isBugTask(t)
                              let subtaskList: any[] = []
                              try {
                                if (t.subtasks) {
                                  const parsed = JSON.parse(t.subtasks)
                                  subtaskList = Array.isArray(parsed) ? parsed : [parsed]
                                }
                              } catch {}
                              if (!Array.isArray(subtaskList)) subtaskList = []

                              return (
                                <div
                                  key={t.id}
                                  className="p-3 rounded-2xl bg-card border border-border flex items-center justify-between gap-3 shadow-xs"
                                >
                                  <div className="flex items-center gap-2 min-w-0">
                                    {isBug ? (
                                      <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-500/15 text-rose-600 border border-rose-500/30 shrink-0">
                                        <Bug className="w-2.5 h-2.5" /> Bug / Fix
                                      </span>
                                    ) : (
                                      <span
                                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${getTagStyle(
                                          t.tag
                                        )}`}
                                      >
                                        {t.tag || 'Feature'}
                                      </span>
                                    )}
                                    <Link
                                      href={`/app/tasks/${t.id}`}
                                      className="text-xs font-bold text-foreground hover:text-primary transition-colors truncate"
                                    >
                                      {t.title}
                                    </Link>
                                  </div>

                                  <div className="flex items-center gap-2 shrink-0">
                                    <span className="text-[10px] font-bold text-muted-foreground">
                                      {getFirstName(t.assigneeName || 'You')}
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() => openEditModal(t)}
                                      className="p-1 text-muted-foreground hover:text-primary rounded cursor-pointer"
                                    >
                                      <Edit2 className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                </div>
                              )
                            })
                          )}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* VIEW MODE 4: BOARD (KANBAN COLUMNS)                                       */}
        {/* ========================================================================= */}
        {viewMode === 'board' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            {columns.map((col, colIndex) => {
              const colTasks = displayTasks.filter((t) => isTaskInColumn(t, col, colIndex === 0))
              const isDropTarget = dragOverColId === col.id && draggedTaskId !== null

              return (
                <div
                  key={col.id}
                  onDragOver={(e) => handleColumnDragOver(e, col.id)}
                  onDragLeave={(e) => handleColumnDragLeave(e, col.id)}
                  onDrop={(e) => handleColumnDrop(e, col.id)}
                  className={`bg-card/70 border rounded-3xl p-4 flex flex-col min-h-[400px] shadow-sm space-y-4 transition-all duration-150 ${
                    isDropTarget
                      ? 'ring-2 ring-primary/70 border-primary bg-primary/5 scale-[1.01] shadow-lg'
                      : 'border-border/80'
                  }`}
                >
                  <div className="flex items-center justify-between px-1">
                    <div className="flex items-center gap-2 font-bold text-xs">
                      <span className={`w-2 h-2 rounded-full ${col.color.replace('text-', 'bg-')}`} />
                      <h2 className="text-foreground tracking-wide">{col.title}</h2>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-muted text-muted-foreground font-semibold">
                        {colTasks.length}
                      </span>
                    </div>
                  </div>

                  {isDropTarget && (
                    <div className="border-2 border-dashed border-primary/60 bg-primary/10 rounded-2xl py-2.5 px-3 text-center text-xs font-bold text-primary animate-pulse flex items-center justify-center gap-2">
                      <ArrowUpDown className="w-3.5 h-3.5" />
                      <span>Drop to move to {col.title}</span>
                    </div>
                  )}

                  <div className="space-y-3 flex-1">
                    {colTasks.length === 0 ? (
                      <div className="text-center py-10 text-xs text-muted-foreground border border-dashed border-border/60 rounded-2xl">
                        {isDropTarget ? 'Release to drop deliverable here' : 'No deliverables'}
                      </div>
                    ) : (
                      colTasks.map((t) => {
                        const isBug = isBugTask(t)
                        const assignee = getFirstName(t.assigneeName || 'You')

                        return (
                          <div
                            key={t.id}
                            draggable={true}
                            onDragStart={(e) => handleTaskDragStart(e, t.id)}
                            onDragEnd={handleTaskDragEnd}
                            className="p-3.5 rounded-2xl border border-border/80 bg-card hover:bg-card/95 shadow-xs hover:shadow-md transition-all space-y-2.5 group relative overflow-hidden cursor-grab active:cursor-grabbing select-none"
                          >
                            <div className="flex items-center justify-between gap-1.5">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                {isBug ? (
                                  <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md bg-rose-500/15 text-rose-600 border border-rose-500/30 shrink-0">
                                    <Bug className="w-2.5 h-2.5" /> Bug / Fix
                                  </span>
                                ) : (
                                  <span
                                    className={`inline-flex items-center text-[10px] font-bold px-2 py-0.5 rounded-md truncate max-w-[120px] ${getTagStyle(
                                      t.tag
                                    )}`}
                                  >
                                    {t.tag || 'Feature'}
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => openEditModal(t)}
                                  className="p-1 text-muted-foreground hover:text-foreground rounded cursor-pointer"
                                >
                                  <Edit2 className="w-3 h-3" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDelete(t.id)}
                                  className="p-1 text-muted-foreground hover:text-destructive rounded cursor-pointer"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              </div>
                            </div>

                            <Link
                              href={`/app/tasks/${t.id}`}
                              className="text-xs font-bold text-foreground hover:text-primary transition-colors line-clamp-2 block"
                            >
                              {t.title}
                            </Link>

                            <div className="pt-2 border-t border-border/60 flex items-center justify-between text-[11px] text-muted-foreground">
                              <span>{assignee}</span>
                              <span>{t.dueDate || 'Today'}</span>
                            </div>
                          </div>
                        )
                      })
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* ========================================================================= */}
        {/* ADD DELIVERABLE MODAL (Smart Auto-Detection + Strict User Choice Lock)      */}
        {/* ========================================================================= */}
        {isModalOpen && (
          <Portal>
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
              <div className="w-full max-w-xl bg-card border border-border rounded-3xl p-5 shadow-2xl space-y-3.5 animate-scale-in backdrop-blur-xl max-h-[92vh] overflow-y-auto custom-scrollbar">
                <div className="flex items-center justify-between pb-2.5 border-b border-border">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-xl bg-primary/15 text-primary">
                      <Plus className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-foreground">
                        Add Deliverable to {project?.name || 'Project'}
                      </h3>
                      <p className="text-[11px] text-muted-foreground">Deliverable details &amp; assignments</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="p-1.5 rounded-xl text-muted-foreground hover:text-foreground hover:bg-accent transition-colors cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <form onSubmit={handleCreateTask} className="space-y-3">
                  {/* Category / Tag Selection */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-semibold text-foreground">Category / Tag</label>
                      {autoDetectedCategory && !userManuallySelectedCategory && (
                        <span className="text-[10px] font-bold text-primary flex items-center gap-1 animate-fade-in">
                          <Sparkles className="w-3 h-3" /> Auto-suggested from title
                        </span>
                      )}
                    </div>
                    <select
                      value={newTaskCategory}
                      onChange={(e) => {
                        const val = e.target.value
                        setUserManuallySelectedCategory(true)
                        setNewTaskCategory(val)
                        if (val !== 'custom') {
                          setNewTaskTag(val)
                        } else {
                          setNewTaskTag(customTagInput.trim() || 'Custom')
                        }
                      }}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-background border border-border text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary cursor-pointer"
                    >
                      {DELIVERABLE_CATEGORIES.map((cat) => (
                        <option key={cat} value={cat} className="bg-background text-foreground">
                          {cat}
                        </option>
                      ))}
                      <option value="custom" className="bg-background text-foreground">
                        Custom...
                      </option>
                    </select>

                    {newTaskCategory === 'custom' && (
                      <div className="pt-1.5 animate-fade-in">
                        <input
                          type="text"
                          placeholder="Enter custom category (e.g. Design, Architecture, DevOps)..."
                          value={customTagInput}
                          onChange={(e) => {
                            setUserManuallySelectedCategory(true)
                            setCustomTagInput(e.target.value)
                            setNewTaskTag(e.target.value.trim() || 'Custom')
                          }}
                          className="w-full px-3.5 py-2 rounded-xl bg-background border border-primary/50 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                          autoFocus
                        />
                      </div>
                    )}
                  </div>

                  {/* Deliverable Title */}
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-foreground">
                      Deliverable Title <span className="text-destructive">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder={
                        newTaskCategory === 'Bug Fix'
                          ? 'e.g. Fix memory leak in auth-service...'
                          : 'e.g. Implement payment gateway webhook...'
                      }
                      value={newTaskTitle}
                      onChange={(e) => {
                        const val = e.target.value
                        setNewTaskTitle(val)
                        if (!userManuallySelectedCategory && val.trim().length > 2) {
                          const detected = detectCategoryFromTitle(val)
                          setAutoDetectedCategory(detected)
                          setNewTaskCategory(detected)
                          setNewTaskTag(detected)
                        }
                      }}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-background border border-border text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                      required
                      autoFocus
                    />
                  </div>

                  {/* Assigned To and Assigned By */}
                  <div className="grid grid-cols-2 gap-2.5">
                    <UserSelect
                      label="Assigned To"
                      icon={User}
                      value={newTaskAssignee}
                      onChange={setNewTaskAssignee}
                      users={availableUsers}
                      placeholder="Select assignee..."
                    />
                    <UserSelect
                      label="Assigned By"
                      icon={UserCheck}
                      value={newTaskAssignedBy}
                      onChange={setNewTaskAssignedBy}
                      users={availableUsers}
                      placeholder="Select assigner..."
                    />
                  </div>

                  {/* Status, Priority & Due Date */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-foreground">Status</label>
                      <select
                        value={newTaskStatus}
                        onChange={(e) => setNewTaskStatus(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl bg-background border border-border text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary cursor-pointer"
                      >
                        {columns.map((col) => (
                          <option key={col.id} value={col.id} className="bg-background text-foreground">
                            {col.title}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-foreground">Priority</label>
                      <select
                        value={newTaskPriority}
                        onChange={(e) => setNewTaskPriority(e.target.value as any)}
                        className="w-full px-3.5 py-2.5 rounded-xl bg-background border border-border text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary cursor-pointer"
                      >
                        <option value="low">Low</option>
                        <option value="medium">Medium</option>
                        <option value="high">High</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-foreground flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-primary" /> Due Date
                      </label>
                      <StylishDatePicker
                        value={newTaskDue}
                        onChange={setNewTaskDue}
                        minDate={todayStr}
                        dropDirection="up"
                      />
                    </div>
                  </div>

                  {/* Footer buttons */}
                  <div className="flex items-center justify-between pt-3 border-t border-border">
                    <button
                      type="button"
                      onClick={() => setIsModalOpen(false)}
                      className="px-4 py-2 rounded-xl text-xs font-semibold text-muted-foreground hover:bg-accent transition-colors cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isCreatingTask || !newTaskTitle.trim()}
                      className="px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-xs font-bold hover:bg-primary/90 transition-all shadow-md shadow-primary/20 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer flex items-center gap-1.5"
                    >
                      {isCreatingTask && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                      <span>{isCreatingTask ? 'Creating...' : 'Create Deliverable'}</span>
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </Portal>
        )}

        {/* ========================================================================= */}
        {/* EDIT DELIVERABLE MODAL                                                    */}
        {/* ========================================================================= */}
        {editingTask && (
          <Portal>
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-md animate-fade-in">
              <div className="w-full max-w-lg bg-card border border-border rounded-3xl p-6 shadow-2xl space-y-4 animate-scale-in">
                <div className="flex items-center justify-between pb-3 border-b border-border">
                  <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                    <Edit2 className="w-4 h-4 text-primary" /> Edit Deliverable
                  </h3>
                  <button
                    onClick={() => setEditingTask(null)}
                    className="p-1 rounded-xl text-muted-foreground hover:text-foreground"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <form onSubmit={handleSaveEdit} className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-muted-foreground uppercase">Deliverable Title</label>
                    <input
                      type="text"
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-background border border-border text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-muted-foreground uppercase">Category / Tag</label>
                      <select
                        value={editCategory}
                        onChange={(e) => {
                          const val = e.target.value
                          setEditCategory(val)
                          if (val === 'custom') {
                            setEditTag(editCustomTag.trim() || 'Custom')
                          } else {
                            setEditTag(val)
                          }
                        }}
                        className="w-full px-3 py-2 rounded-xl bg-background border border-border text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary cursor-pointer"
                      >
                        {DELIVERABLE_CATEGORIES.map((cat) => (
                          <option key={cat} value={cat} className="bg-background text-foreground">
                            {cat}
                          </option>
                        ))}
                        <option value="custom" className="bg-background text-foreground">
                          Custom...
                        </option>
                      </select>

                      {editCategory === 'custom' && (
                        <div className="pt-1.5 animate-fade-in">
                          <input
                            type="text"
                            placeholder="Enter custom category / tag..."
                            value={editCustomTag}
                            onChange={(e) => {
                              setEditCustomTag(e.target.value)
                              setEditTag(e.target.value.trim() || 'Custom')
                            }}
                            className="w-full px-3 py-2 rounded-xl bg-background border border-primary/50 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                            autoFocus
                          />
                        </div>
                      )}
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-muted-foreground uppercase">Assignee</label>
                      <input
                        type="text"
                        list="edit-assignee-options"
                        value={editAssignee}
                        onChange={(e) => setEditAssignee(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl bg-background border border-border text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                        placeholder="Assignee name..."
                      />
                      <datalist id="edit-assignee-options">
                        {availableAssignees.map((name) => (
                          <option key={name} value={name} />
                        ))}
                      </datalist>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-muted-foreground uppercase">Priority</label>
                      <select
                        value={editPriority}
                        onChange={(e) => setEditPriority(e.target.value as any)}
                        className="w-full px-3 py-2 rounded-xl bg-background border border-border text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                      >
                        <option value="low">Low</option>
                        <option value="medium">Medium</option>
                        <option value="high">High</option>
                        <option value="urgent">Urgent</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-muted-foreground uppercase">Status</label>
                      <select
                        value={getSelectValue(editStatus)}
                        onChange={(e) => {
                          const newStatus = e.target.value as any
                          setEditStatus(newStatus)
                          setEditEnv(getEnvForStatus(newStatus) as TaskEnvironment)
                        }}
                        className="w-full px-3 py-2 rounded-xl bg-background border border-border text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                      >
                        {columns.map((col) => (
                          <option key={col.id} value={col.id} className="bg-background text-foreground">
                            {col.title}
                          </option>
                        ))}
                        {!columns.some((c) => c.id === editStatus) && (
                          <option value={editStatus} className="bg-background text-foreground">
                            {editStatus.replace(/_/g, ' ').toUpperCase()}
                          </option>
                        )}
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-muted-foreground uppercase">Due Date</label>
                      <StylishDatePicker
                        value={editDue}
                        onChange={setEditDue}
                        minDate={todayStr}
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t border-border">
                    <button
                      type="button"
                      onClick={() => setTaskToDelete(editingTask)}
                      className="px-3 py-2 rounded-xl bg-destructive/10 text-destructive hover:bg-destructive/20 text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Delete Task</span>
                    </button>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setEditingTask(null)}
                        className="px-4 py-2 rounded-xl bg-muted hover:bg-accent text-xs font-semibold text-foreground transition-all cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={isUpdatingTask || !editTitle.trim()}
                        className="px-5 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-bold hover:bg-primary/90 transition-all shadow-md flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed active:scale-95 cursor-pointer"
                      >
                        {isUpdatingTask && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                        <span>{isUpdatingTask ? 'Saving...' : 'Save Changes'}</span>
                      </button>
                    </div>
                  </div>
                </form>
              </div>
            </div>
          </Portal>
        )}

        {/* Delete Task Confirmation Modal */}
        {taskToDelete && (
          <Portal>
            <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-fade-in">
              <div className="bg-card border border-border rounded-3xl p-6 w-full max-w-md shadow-2xl space-y-4 animate-scale-in">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-destructive/15 text-destructive flex items-center justify-center shrink-0">
                    <Trash2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-foreground">Delete Deliverable</h3>
                    <p className="text-xs text-muted-foreground">Permanent deletion confirmation</p>
                  </div>
                </div>

                <p className="text-xs text-muted-foreground leading-relaxed">
                  Are you sure you want to delete deliverable <strong className="text-foreground">"{taskToDelete.title}"</strong>? This will permanently remove the task from this project. This action cannot be undone.
                </p>

                <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-border">
                  <button
                    type="button"
                    onClick={() => setTaskToDelete(null)}
                    disabled={isDeletingTask}
                    className="px-4 py-2 rounded-xl text-xs font-semibold text-muted-foreground hover:bg-accent transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={confirmDeleteTask}
                    disabled={isDeletingTask}
                    className="px-4 py-2 rounded-xl bg-destructive text-destructive-foreground text-xs font-bold hover:bg-destructive/90 transition-all shadow-md shadow-destructive/20 disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
                  >
                    {isDeletingTask && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                    <span>{isDeletingTask ? 'Deleting...' : 'Delete Task'}</span>
                  </button>
                </div>
              </div>
            </div>
          </Portal>
        )}

        {/* Edit Space Statuses Modal */}
        <EditSpaceStatusesModal
          isOpen={statusModalOpen}
          onClose={() => setStatusModalOpen(false)}
          workspaceId={currentWorkspace?.id || 'default'}
          spaceName={project?.name || 'Project'}
        />

        {/* Invite Member to Project Modal */}
        {isInviteModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
            <div className="bg-card border border-border rounded-3xl p-6 w-full max-w-md shadow-2xl space-y-4 animate-scale-in relative overflow-hidden">
              <div className="absolute -top-10 -right-10 w-32 h-32 bg-primary/10 rounded-full blur-xl pointer-events-none" />

              <div className="flex items-center justify-between pb-3 border-b border-border relative z-10">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-primary/15 text-primary flex items-center justify-center">
                    <UserPlus className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-foreground">Invite Member to Project</h3>
                    <p className="text-[11px] text-muted-foreground">Collaborate on {project?.name}</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsInviteModalOpen(false)}
                  className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSendInvite} className="space-y-4 relative z-10">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">Email Address</label>
                  <div className="relative">
                    <Mail className="w-3.5 h-3.5 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="email"
                      required
                      autoFocus
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                      placeholder="colleague@example.com"
                      className="w-full pl-9 pr-3 py-2 rounded-xl bg-background border border-border text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-accent/30 border border-border/50 text-[11px] text-muted-foreground leading-relaxed space-y-1">
                  <div className="font-semibold text-foreground flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-primary" /> Automatic Setup Included
                  </div>
                  <p>
                    When they open the invite link, if they don't have an account, they can sign up and the organization, workspace, and project will be automatically attached for them.
                  </p>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
                  <button
                    type="button"
                    onClick={() => setIsInviteModalOpen(false)}
                    className="px-4 py-2 rounded-xl text-xs font-semibold text-muted-foreground hover:bg-accent transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={inviting || !inviteEmail.trim()}
                    className="px-5 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-bold hover:bg-primary/90 transition-all flex items-center gap-2 shadow-md shadow-primary/25 disabled:opacity-50 cursor-pointer"
                  >
                    {inviting ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        Sending Invitation...
                      </>
                    ) : (
                      <>Send Invitation Email</>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </>
  )
}
