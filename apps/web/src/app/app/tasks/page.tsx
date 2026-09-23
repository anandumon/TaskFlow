'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  CheckSquare,
  Plus,
  Filter,
  List,
  Calendar,
  User,
  X,
  Trash2,
  Edit2,
  CheckCircle2,
  Clock,
  Layers,
  Server,
  GitBranch,
  Sparkles,
  Bug,
  FolderKanban,
  Folder,
  FolderOpen,
  FileText,
  FileCode,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Bell,
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  Loader2,
  LayoutGrid,
  Workflow,
  Sliders,
  UserCheck,
  UserPlus,
  Users,
  CircleDot,
  Check,
  Search,
  Lock,
  Eye,
  Download,
  UploadCloud,
  Paperclip,
  MessageSquare,
  ImageIcon,
  FileSpreadsheet,
  File,
  Send,
  SlidersHorizontal,
  Image as LucideImage,
  GripVertical,
} from 'lucide-react'
import { useWorkspaceStore } from '@/stores/workspace-store'
import { useOrgStore } from '@/stores/org-store'
import { useTaskStore, Task, TaskStatus, TaskEnvironment } from '@/stores/task-store'
import { TaskAttachment, TaskComment } from '@/types'
import { useProjectStore } from '@/stores/project-store'
import { useStatusStore, CustomStatus } from '@/stores/status-store'
import { useAuthStore } from '@/stores/auth-store'
import { Portal } from '@/components/ui/portal'
import { TaskListSkeleton } from '@/components/loading'
import { UserGuideModal } from '@/components/user-guide-modal'
import { EditSpaceStatusesModal } from '@/components/EditSpaceStatusesModal'
import { StylishDatePicker } from '@/components/ui/stylish-date-picker'
import { getFirstName } from '@/lib/utils'
import { isBugTask, isFeatureTask, getEnvForStatus } from '@/lib/task-category'

interface AssignableUser {
  id: string
  name: string
  email?: string
  role?: string
  initials: string
  color: string
}

function getInitials(name: string) {
  const parts = name.trim().split(/\s+/)
  if (parts.length === 0 || !parts[0]) return 'TF'
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

function getAvatarColor(name: string) {
  const colors = [
    'bg-indigo-500/20 text-indigo-400 border-indigo-500/30',
    'bg-purple-500/20 text-purple-400 border-purple-500/30',
    'bg-pink-500/20 text-pink-400 border-pink-500/30',
    'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
    'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
    'bg-amber-500/20 text-amber-400 border-amber-500/30',
  ]
  let hash = 0
  for (let i = 0; i < name.length; i++) hash += name.charCodeAt(i)
  return colors[Math.abs(hash) % colors.length]
}

function UserSelect({
  label,
  icon: Icon,
  value,
  onChange,
  users,
  placeholder = 'Select a user...',
}: {
  label: string
  icon: React.ComponentType<{ className?: string }>
  value: string
  onChange: (val: string) => void
  users: AssignableUser[]
  placeholder?: string
}) {
  const [isOpen, setIsOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [isCustomMode, setIsCustomMode] = useState(false)
  const dropdownRef = React.useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    if (isOpen) document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isOpen])

  const selectedUser = users.find(
    (u) =>
      u.name.toLowerCase() === (value || '').toLowerCase() ||
      (u.email && u.email.toLowerCase() === (value || '').toLowerCase()) ||
      ((value || '').toLowerCase() === 'you' && (u.role === 'Current User' || u.id === 'current-user'))
  )

  const filteredUsers = users.filter((u) => {
    if (!searchTerm.trim()) return true
    const q = searchTerm.toLowerCase()
    return (
      u.name.toLowerCase().includes(q) ||
      (u.email && u.email.toLowerCase().includes(q)) ||
      (u.role && u.role.toLowerCase().includes(q))
    )
  })

  return (
    <div className="space-y-1.5" ref={dropdownRef}>
      <div className="flex items-center justify-between">
        <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
          <Icon className="w-3.5 h-3.5 text-primary" /> {label}
        </label>
        <button
          type="button"
          onClick={() => {
            setIsCustomMode(!isCustomMode)
            setIsOpen(false)
          }}
          className={`text-[10px] font-semibold px-2 py-0.5 rounded-lg border transition-all flex items-center gap-1 cursor-pointer ${
            isCustomMode
              ? 'bg-primary/15 text-primary border-primary/30 shadow-xs'
              : 'bg-muted/60 text-muted-foreground hover:text-foreground border-border/60 hover:bg-muted'
          }`}
          title={isCustomMode ? 'Choose from workspace members' : 'Enter a manual name for non-registered user'}
        >
          {isCustomMode ? (
            <>
              <Users className="w-3 h-3 text-primary" />
              <span>Choose member</span>
            </>
          ) : (
            <>
              <UserPlus className="w-3 h-3 text-primary" />
              <span>Custom name</span>
            </>
          )}
        </button>
      </div>

      {isCustomMode ? (
        <div className="space-y-1 animate-fade-in">
          <div className="relative">
            <input
              type="text"
              placeholder={`Enter name manually for ${label.toLowerCase()} (e.g. John Doe, External Client)...`}
              value={value}
              onChange={(e) => onChange(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-background border border-primary/50 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary pr-24 shadow-xs"
              autoFocus
            />
            <button
              type="button"
              onClick={() => setIsCustomMode(false)}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-bold text-primary hover:underline px-2 py-0.5 rounded bg-primary/10 cursor-pointer"
            >
              Pick member
            </button>
          </div>
          <p className="text-[10px] text-muted-foreground pl-1">
            Manual name for non-registered person. This will appear as {label.toLowerCase()} on the task.
          </p>
        </div>
      ) : (
        <div className="relative">
          <button
            type="button"
            onClick={() => {
              setIsOpen(!isOpen)
              setSearchTerm('')
            }}
            className="w-full px-3 py-2 rounded-xl bg-background border border-border text-xs text-foreground flex items-center justify-between gap-2 hover:border-primary/50 transition-colors cursor-pointer text-left shadow-xs"
          >
            {selectedUser ? (
              <div className="flex items-center gap-2 min-w-0">
                <div
                  className={`w-5 h-5 rounded-full border text-[9px] font-bold flex items-center justify-center shrink-0 ${selectedUser.color}`}
                >
                  {selectedUser.initials}
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-medium text-foreground truncate">{selectedUser.name}</div>
                </div>
                {selectedUser.role && (
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground shrink-0 border border-border/50">
                    {selectedUser.role}
                  </span>
                )}
              </div>
            ) : value ? (
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-5 h-5 rounded-full border border-primary/30 bg-primary/10 text-primary text-[9px] font-bold flex items-center justify-center shrink-0">
                  {getInitials(value)}
                </div>
                <span className="text-xs font-medium text-foreground truncate">{value}</span>
                <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-500/15 text-amber-500 font-semibold border border-amber-500/30 shrink-0">
                  Custom
                </span>
              </div>
            ) : (
              <span className="text-xs text-muted-foreground">{placeholder}</span>
            )}
            <ChevronDown
              className={`w-3.5 h-3.5 text-muted-foreground transition-transform shrink-0 ${
                isOpen ? 'rotate-180' : ''
              }`}
            />
          </button>

          {isOpen && (
            <div className="absolute left-0 right-0 top-full mt-1 z-[120] bg-card border border-border rounded-2xl shadow-2xl p-1.5 space-y-1 animate-scale-in max-h-64 overflow-y-auto custom-scrollbar backdrop-blur-xl">
              <div className="p-1 border-b border-border/60 mb-1">
                <input
                  type="text"
                  placeholder="Search members or type custom name..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onClick={(e) => e.stopPropagation()}
                  className="w-full px-2.5 py-1.5 rounded-lg bg-muted/60 border border-border text-[11px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  autoFocus
                />
              </div>

              {/* Quick option: Assign the typed custom name if user entered any text */}
              {searchTerm.trim() && (
                <button
                  type="button"
                  onClick={() => {
                    onChange(searchTerm.trim())
                    setIsOpen(false)
                  }}
                  className="w-full px-2.5 py-2 rounded-xl flex items-center gap-2 text-left bg-primary/10 hover:bg-primary/15 text-primary transition-colors cursor-pointer text-xs font-semibold border border-primary/25 shadow-xs mb-1"
                >
                  <UserPlus className="w-3.5 h-3.5 shrink-0" />
                  <div className="min-w-0">
                    <div className="truncate">
                      Assign custom name: <span className="font-bold underline text-foreground">"{searchTerm.trim()}"</span>
                    </div>
                    <div className="text-[10px] text-muted-foreground font-normal">Person without a TaskFlow account</div>
                  </div>
                </button>
              )}

              {filteredUsers.length === 0 ? (
                <div className="py-2 px-2 text-center text-[11px] text-muted-foreground">
                  No matching workspace members.
                </div>
              ) : (
                filteredUsers.map((u) => {
                  const isCur =
                    (value || '').toLowerCase() === u.name.toLowerCase() ||
                    (u.email && (value || '').toLowerCase() === u.email.toLowerCase()) ||
                    ((value || '').toLowerCase() === 'you' && (u.role === 'Current User' || u.id === 'current-user'))
                  return (
                    <button
                      key={u.id}
                      type="button"
                      onClick={() => {
                        onChange(u.name)
                        setIsOpen(false)
                      }}
                      className={`w-full px-2.5 py-1.5 rounded-xl flex items-center justify-between gap-2 text-left transition-colors cursor-pointer ${
                        isCur ? 'bg-primary/15 text-primary font-semibold' : 'hover:bg-accent text-foreground'
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <div
                          className={`w-6 h-6 rounded-full border text-[10px] font-bold flex items-center justify-center shrink-0 ${u.color}`}
                        >
                          {u.initials}
                        </div>
                        <div className="min-w-0">
                          <div className="text-xs font-semibold truncate leading-tight">{u.name}</div>
                          {u.email && (
                            <div className="text-[10px] text-muted-foreground truncate leading-tight">{u.email}</div>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        {u.role && (
                          <span className="text-[9px] px-1.5 py-0.5 rounded-md bg-muted text-muted-foreground border border-border/40 font-medium">
                            {u.role}
                          </span>
                        )}
                        {isCur && <Check className="w-3.5 h-3.5 text-primary stroke-[3]" />}
                      </div>
                    </button>
                  )
                })
              )}

              {/* Bottom option: Switch to manual name input */}
              <div className="pt-1.5 mt-1 border-t border-border/60">
                <button
                  type="button"
                  onClick={() => {
                    setIsCustomMode(true)
                    setIsOpen(false)
                  }}
                  className="w-full px-2.5 py-1.5 rounded-xl flex items-center gap-2 text-left hover:bg-primary/10 text-primary transition-colors cursor-pointer text-xs font-semibold"
                >
                  <UserPlus className="w-3.5 h-3.5 shrink-0" />
                  <div className="min-w-0">
                    <div className="truncate">Enter name manually (non-registered person)</div>
                    <div className="text-[10px] text-muted-foreground font-normal">Type custom name for someone not in TaskFlow</div>
                  </div>
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}


export default function TasksPage() {
  const { currentWorkspace, members: wsMembers, fetchMembers: fetchWsMembers } = useWorkspaceStore()
  const { currentOrg, members: orgMembers, fetchMembers: fetchOrgMembers } = useOrgStore()
  const { tasks, loadTasks, createTask, updateTask, updateStatus, updateEnvironment, moveTask, deleteTask, toggleSubtask, isLoading: tasksLoading } = useTaskStore()
  const { projects, loadProjects } = useProjectStore()
  const { user } = useAuthStore()

  const todayStr = new Date().toISOString().split('T')[0] // 'YYYY-MM-DD'
  const currentUserName = getFirstName(user?.firstName || user?.displayName || user?.email?.split('@')[0] || 'You')

  // View modes: 'grid' (minimal spacious liquid glass), 'list', 'tree' (graph / tree view)
  const [viewMode, setViewMode] = useState<'grid' | 'list' | 'tree'>('grid')
  const [selectedStatusTab, setSelectedStatusTab] = useState<string>('all')
  const [activeCategoryTab, setActiveCategoryTab] = useState<'all' | 'bugs' | 'features'>('all')

  const [selectedAlertDate, setSelectedAlertDate] = useState<string>(todayStr)
  const [isDispatchingDateAlert, setIsDispatchingDateAlert] = useState<boolean>(false)
  const [dispatchingAlertId, setDispatchingAlertId] = useState<string | null>(null)

  const [filterTag, setFilterTag] = useState<string>('all')
  const [filterEnv, setFilterEnv] = useState<string>('all')
  const [filterProject, setFilterProject] = useState<string>('all')
  const [guideModalOpen, setGuideModalOpen] = useState(false)

  // Deliverables summary metrics identical to Project Board
  const totalDeliverablesCount = tasks.length
  const bugTasksCount = tasks.filter(isBugTask).length
  const featureTasksCount = tasks.filter(isFeatureTask).length
  const completedTasksCount = tasks.filter(
    (t) =>
      t.status === 'done' ||
      t.status === 'completed' ||
      t.status === 'closed' ||
      t.status?.toLowerCase() === 'complete'
  ).length
  const weightedProgress = totalDeliverablesCount > 0
    ? Math.round((completedTasksCount / totalDeliverablesCount) * 100)
    : 0

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

  // Add Task Modal State (Multi-step Wizard: 1 = Core Details, 2 = Description & Attachments, 3 = Subtasks & Progress)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [createTaskStep, setCreateTaskStep] = useState<1 | 2 | 3>(1)
  const [newTaskType, setNewTaskType] = useState<'feature' | 'bug' | 'custom'>('feature')
  const [customTagInput, setCustomTagInput] = useState('')
  const [newTaskTitle, setNewTaskTitle] = useState('')
  const [newTaskProjectId, setNewTaskProjectId] = useState('')
  const [newTaskTag, setNewTaskTag] = useState('Feature')
  const [newTaskAssignee, setNewTaskAssignee] = useState(currentUserName)
  const [newTaskAssignedBy, setNewTaskAssignedBy] = useState(currentUserName)
  const [newTaskDue, setNewTaskDue] = useState(todayStr)
  const [newTaskPriority, setNewTaskPriority] = useState<'low' | 'medium' | 'high'>('medium')
  const [newTaskStatus, setNewTaskStatus] = useState<TaskStatus>('todo')
  const [newTaskDescription, setNewTaskDescription] = useState('')
  const [newTaskAttachments, setNewTaskAttachments] = useState<TaskAttachment[]>([])
  const [newTaskSubtasks, setNewTaskSubtasks] = useState<any[]>([])
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('')
  const [newSubtaskDesc, setNewSubtaskDesc] = useState('')
  const [newSubtaskDue, setNewSubtaskDue] = useState(todayStr)
  const [newSubtaskAttachments, setNewSubtaskAttachments] = useState<TaskAttachment[]>([])
  const [isSavingTask, setIsSavingTask] = useState(false)
  const [isUpdatingTask, setIsUpdatingTask] = useState(false)
  const [deletingTaskId, setDeletingTaskId] = useState<string | null>(null)

  // Edit / View Task Modal State
  const [editingTask, setEditingTask] = useState<Task | null>(null)
  const [editingTaskTab, setEditingTaskTab] = useState<'overview' | 'attachments' | 'subtasks' | 'comments'>('overview')
  const [editTitle, setEditTitle] = useState('')
  const [editProjectId, setEditProjectId] = useState('')
  const [editTag, setEditTag] = useState('')
  const [editAssignee, setEditAssignee] = useState('')
  const [editAssignedBy, setEditAssignedBy] = useState('')
  const [editDue, setEditDue] = useState('')
  const [editPriority, setEditPriority] = useState<'low' | 'medium' | 'high' | 'urgent'>('medium')
  const [editStatus, setEditStatus] = useState<TaskStatus>('todo')
  const [editDescription, setEditDescription] = useState('')
  const [editProgress, setEditProgress] = useState<number>(0)
  const [editAttachments, setEditAttachments] = useState<TaskAttachment[]>([])
  const [editSubtasks, setEditSubtasks] = useState<any[]>([])
  const [editComments, setEditComments] = useState<TaskComment[]>([])
  const [newCommentText, setNewCommentText] = useState('')
  const [editSubtaskTitle, setEditSubtaskTitle] = useState('')
  const [editSubtaskDesc, setEditSubtaskDesc] = useState('')
  const [editSubtaskDue, setEditSubtaskDue] = useState(todayStr)
  const [editSubtaskAttachments, setEditSubtaskAttachments] = useState<TaskAttachment[]>([])

  // Attachment & Progress Helpers
  const formatFileSize = (bytes: number) => {
    if (!bytes || bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`
  }

  const getFileIcon = (mimeType?: string, fileName?: string) => {
    const ext = fileName?.split('.').pop()?.toLowerCase() || ''
    if (mimeType?.startsWith('image/') || ['png', 'jpg', 'jpeg', 'webp', 'gif', 'svg', 'bmp'].includes(ext)) {
      return <ImageIcon className="w-4 h-4 text-pink-400 shrink-0" />
    }
    if (['xls', 'xlsx', 'csv'].includes(ext)) {
      return <FileSpreadsheet className="w-4 h-4 text-emerald-400 shrink-0" />
    }
    if (['pdf'].includes(ext)) {
      return <FileText className="w-4 h-4 text-rose-400 shrink-0" />
    }
    if (['doc', 'docx', 'txt', 'rtf'].includes(ext)) {
      return <FileText className="w-4 h-4 text-blue-400 shrink-0" />
    }
    if (['env', 'json', 'yml', 'yaml', 'xml', 'js', 'ts', 'tsx'].includes(ext)) {
      return <FileCode className="w-4 h-4 text-amber-400 shrink-0" />
    }
    return <File className="w-4 h-4 text-muted-foreground shrink-0" />
  }

  const downloadAttachment = (att: TaskAttachment) => {
    try {
      const link = document.createElement('a')
      link.href = att.dataUrl
      link.download = att.name
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    } catch (e) {
      console.error('Download failed', e)
    }
  }

  const readFilesAsAttachments = async (files: FileList | null): Promise<TaskAttachment[]> => {
    if (!files || files.length === 0) return []
    const results: TaskAttachment[] = []
    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(reader.result as string)
        reader.onerror = reject
        reader.readAsDataURL(file)
      })
      results.push({
        id: 'att_' + Date.now() + '_' + Math.random().toString(36).substring(2, 8),
        name: file.name,
        size: file.size,
        type: file.type || 'application/octet-stream',
        dataUrl,
        uploadedAt: new Date().toISOString(),
      })
    }
    return results
  }

  const calculateTaskProgress = (task: Task): number => {
    let subtaskList: any[] = []
    try {
      if (task.subtasks) subtaskList = JSON.parse(task.subtasks)
    } catch {}
    if (Array.isArray(subtaskList) && subtaskList.length > 0) {
      const done = subtaskList.filter((s) => s.completed).length
      return Math.round((done / subtaskList.length) * 100)
    }
    if (task.progress != null && task.progress > 0) return task.progress
    if (task.status === 'done') return 100
    if (task.status === 'in_review') return 75
    if (task.status === 'in_progress') return 50
    return 0
  }

  const [toastMessage, setToastMessage] = useState<string | null>(null)
  const [statusModalOpen, setStatusModalOpen] = useState(false)

  const { getStatuses } = useStatusStore()
  const workspaceStatuses = getStatuses(currentWorkspace?.id || 'default')

  // Toast notification helper
  const showToast = (msg: string) => {
    setToastMessage(msg)
    setTimeout(() => setToastMessage(null), 3500)
  }

  // Check if due date is today or overdue or near
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

  // Load initial tasks, projects, workspace members, and org members
  useEffect(() => {
    if (currentWorkspace?.id) {
      loadTasks(currentWorkspace.id)
      loadProjects(currentWorkspace.id)
      fetchWsMembers(currentWorkspace.id)
    }
    if (currentOrg?.id) {
      fetchOrgMembers(currentOrg.id)
    }
  }, [currentWorkspace?.id, currentOrg?.id, loadTasks, loadProjects, fetchWsMembers, fetchOrgMembers])

  // Sync default assignee / assignedBy when user profile is ready
  useEffect(() => {
    if (user) {
      const myName =
        user.displayName ||
        (user.firstName ? `${user.firstName} ${user.lastName || ''}`.trim() : '') ||
        user.email?.split('@')[0] ||
        'You'
      if (!newTaskAssignee || newTaskAssignee === 'You') setNewTaskAssignee(myName)
      if (!newTaskAssignedBy || newTaskAssignedBy === 'You') setNewTaskAssignedBy(myName)
    }
  }, [user])

  // Aggregated list of all unique users having access to the workspace / project
  const availableUsers = React.useMemo(() => {
    const list: AssignableUser[] = []
    const seenIds = new Set<string>()
    const seenEmails = new Set<string>()
    const seenNames = new Set<string>()

    // Helper to register an identity as seen
    const registerSeen = (name?: string, email?: string, id?: string) => {
      if (id && id.trim()) seenIds.add(id.trim())
      if (email && email.trim()) {
        const cleanEmail = email.trim().toLowerCase()
        seenEmails.add(cleanEmail)
        const prefix = cleanEmail.split('@')[0]
        if (prefix) seenNames.add(prefix)
      }
      if (name && name.trim()) {
        const cleanName = name.trim().toLowerCase().replace(/\s+/g, ' ')
        seenNames.add(cleanName)
      }
    }

    // Helper to check if an identity is already present
    const isAlreadySeen = (name?: string, email?: string, id?: string) => {
      const cleanId = id?.trim()
      if (cleanId && seenIds.has(cleanId)) return true

      const cleanEmail = email?.trim().toLowerCase()
      if (cleanEmail && seenEmails.has(cleanEmail)) return true

      const cleanName = name?.trim().toLowerCase().replace(/\s+/g, ' ')
      if (cleanName) {
        if (cleanName === 'you') return true
        if (seenNames.has(cleanName)) return true
        if (cleanName.includes('@') && seenEmails.has(cleanName)) return true
      }

      return false
    }

    const addUser = (name: string, email?: string, role?: string, id?: string) => {
      const cleanFirst = getFirstName(name)
      const cleanEmail = email ? email.trim() : undefined
      const cleanId = id ? id.trim() : undefined

      if (!cleanFirst && !cleanEmail) return

      // Never add placeholder 'You' as a separate user
      if (cleanFirst.toLowerCase() === 'you') return

      if (isAlreadySeen(cleanFirst, cleanEmail, cleanId)) {
        return
      }

      registerSeen(cleanFirst, cleanEmail, cleanId)

      list.push({
        id: cleanId || cleanEmail?.toLowerCase() || cleanFirst.toLowerCase(),
        name: cleanFirst,
        email: cleanEmail,
        role: role || 'Member',
        initials: getInitials(cleanFirst),
        color: getAvatarColor(cleanFirst),
      })
    }

    // 1. Current logged-in user (always placed first)
    if (user) {
      const myName = getFirstName(
        user.firstName ||
        user.displayName ||
        user.email?.split('@')[0] ||
        'You'
      )

      const cleanMyEmail = user.email?.trim()
      const cleanMyId = user.id?.trim()

      registerSeen(myName, cleanMyEmail, cleanMyId)
      seenNames.add('you')
      if (user.firstName?.trim()) seenNames.add(user.firstName.trim().toLowerCase())
      if (user.lastName?.trim()) seenNames.add(user.lastName.trim().toLowerCase())
      if (user.displayName?.trim()) seenNames.add(user.displayName.trim().toLowerCase())
      if (cleanMyEmail) {
        const prefix = cleanMyEmail.toLowerCase().split('@')[0]
        if (prefix) seenNames.add(prefix)
      }

      list.push({
        id: cleanMyId || 'current-user',
        name: myName,
        email: cleanMyEmail,
        role: 'Current User',
        initials: getInitials(myName),
        color: getAvatarColor(myName),
      })
    }

    // 2. Workspace members
    if (wsMembers && Array.isArray(wsMembers)) {
      wsMembers.forEach((m: any) => {
        const memberName = m.displayName?.trim() || m.email?.split('@')[0]?.trim() || 'Member'
        addUser(memberName, m.email, m.role, m.userId || m.id)
      })
    }

    // 3. Organization members
    if (orgMembers && Array.isArray(orgMembers)) {
      orgMembers.forEach((m: any) => {
        const memberName =
          [m.firstName, m.lastName].filter(Boolean).join(' ').trim() ||
          m.email?.split('@')[0]?.trim() ||
          'Member'
        addUser(memberName, m.email, m.role, m.userId || m.id)
      })
    }

    // 4. Any assignees or reviewers previously assigned across existing tasks
    tasks.forEach((t) => {
      if (t.assigneeName) addUser(t.assigneeName, undefined, 'Assignee')
      if (t.reviewerName) addUser(t.reviewerName, undefined, 'Reviewer')
    })

    return list
  }, [user, wsMembers, orgMembers, tasks])

  // Automatically select first project for new tasks if available
  useEffect(() => {
    if (projects.length > 0 && !newTaskProjectId) {
      setNewTaskProjectId(projects[0].id)
    }
  }, [projects, newTaskProjectId])

  const getTagColor = (tag: string) => {
    switch (tag) {
      case 'Feature': return 'bg-[#00638E]/25 text-[#BFD8E3] border border-[#00638E]/45'
      case 'Bug Fix': return 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
      case 'Custom': return 'bg-purple-500/15 text-purple-400 border border-purple-500/30'
      case 'Design': return 'bg-[#004A6B]/25 text-[#BFD8E3] border border-[#00638E]/35'
      case 'DevOps': return 'bg-[#2B2B2B] text-[#BFD8E3] border border-[#383838]'
      case 'Backend': return 'bg-[#004A6B]/35 text-[#8CB9CC] border border-[#004A6B]/50'
      case 'Architecture': return 'bg-[#00638E]/20 text-white border border-[#00638E]/35'
      case 'Frontend': return 'bg-[#00638E]/25 text-[#BFD8E3] border border-[#00638E]/45'
      default: return 'bg-[#00638E]/20 text-[#BFD8E3] border border-[#00638E]/35'
    }
  }

  const getProjectColor = (proj?: any, projId?: string) => {
    if (proj?.color && typeof proj.color === 'string' && proj.color.startsWith('#')) return proj.color
    const colorPalette = [
      '#00638E', // Dark Azure
      '#004A6B', // Deep Azure
      '#8CB9CC', // Soft Azure
      '#BFD8E3', // Light Azure
      '#007EA7', // Vivid Azure
      '#00557A', // Navy Azure
    ]
    const seed = proj?.name || proj?.id || projId || 'TaskFlow'
    let hash = 0
    for (let i = 0; i < seed.length; i++) {
      hash = seed.charCodeAt(i) + ((hash << 5) - hash)
    }
    return colorPalette[Math.abs(hash) % colorPalette.length]
  }

  // Single Task Due Date Alert
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

  // Dispatch Date Due Alerts
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
        showToast(res?.message || `ℹ️ No overdue or upcoming tasks found in this workspace.`)
      }
    } catch (err: any) {
      showToast(err?.response?.data?.message || err?.message || 'Failed to dispatch due alerts')
    } finally {
      setIsDispatchingDateAlert(false)
    }
  }

  // Add Task Handler (Multi-step Wizard with Description, Attachments, Subtasks & Progress)
  const handleAddTask = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    if (isSavingTask) return
    if (!newTaskTitle.trim()) {
      showToast('Please enter a task title.')
      setCreateTaskStep(1)
      return
    }

    if (projects.length === 0) {
      showToast('A project is required. Please create a project first.')
      return
    }

    if (!newTaskProjectId) {
      showToast('Please select a project for this task.')
      setCreateTaskStep(1)
      return
    }

    const wsId = currentWorkspace?.id || '50a4c29f-09ff-4480-8b6b-495381247d0f'
    try {
      setIsSavingTask(true)
      let initialProgress = 0
      if (newTaskSubtasks.length > 0) {
        const done = newTaskSubtasks.filter((s: any) => s.completed).length
        initialProgress = Math.round((done / newTaskSubtasks.length) * 100)
      }

      const finalTag =
        newTaskType === 'feature'
          ? 'Feature'
          : newTaskType === 'bug'
          ? 'Bug Fix'
          : (customTagInput.trim() || 'Custom')

      await createTask(wsId, {
        projectId: newTaskProjectId,
        title: newTaskTitle.trim(),
        description: newTaskDescription.trim(),
        tag: finalTag,
        tagColor: getTagColor(finalTag),
        assigneeName: getFirstName(newTaskAssignee === 'You' ? currentUserName : (newTaskAssignee || currentUserName)),
        reviewerName: getFirstName(newTaskAssignedBy === 'You' ? currentUserName : (newTaskAssignedBy || currentUserName)),
        dueDate: newTaskDue || todayStr,
        status: 'todo', // Always defaults to todo
        environment: getEnvForStatus('todo') as TaskEnvironment,
        priority: newTaskPriority,
        progress: initialProgress,
        filesChanged: JSON.stringify(newTaskAttachments),
        subtasks: JSON.stringify(newTaskSubtasks),
      })

      // Reset form states and close modal immediately
      setNewTaskTitle('')
      setNewTaskDescription('')
      setNewTaskAttachments([])
      setNewTaskSubtasks([])
      setNewSubtaskTitle('')
      setNewSubtaskDesc('')
      setNewSubtaskAttachments([])
      setCustomTagInput('')
      setCreateTaskStep(1)
      setNewTaskDue(todayStr)
      setIsModalOpen(false)
      loadProjects(wsId)
      showToast('Task created and saved to database!')
    } catch (err: any) {
      showToast(err?.message || 'Task creation failed')
    } finally {
      setIsSavingTask(false)
    }
  }

  // Check if current user has edit permission for a task (Org Owner/Admin, creator, or assigned to user)
  const canEditTask = React.useCallback((task: Task) => {
    if (!user) return false
    // Org Owner has full control
    if (currentOrg?.ownerId && currentOrg.ownerId === user.id) return true

    // Org Admin has full control
    const isOrgAdmin = orgMembers?.some((m: any) =>
      (m.userId === user.id || m.id === user.id || (m.email && m.email.toLowerCase() === user.email?.toLowerCase())) &&
      (m.role?.toLowerCase() === 'owner' || m.role?.toLowerCase() === 'admin')
    )
    if (isOrgAdmin) return true

    // Task Creator
    if (task.createdBy && task.createdBy === user.id) return true

    // Assigned by ID
    if (task.assigneeId && task.assigneeId === user.id) return true

    // Assigned by Name / Email
    const myName = (user.displayName || `${user.firstName || ''} ${user.lastName || ''}`).trim().toLowerCase()
    const myEmail = (user.email || '').toLowerCase()
    const aName = (task.assigneeName || '').trim().toLowerCase()
    if (aName && (aName === myName || aName === myEmail || aName === 'you')) return true

    // In assignees string (comma-separated names/emails)
    const allAssignees = (task.assignees || '').toLowerCase()
    if (allAssignees && ((myEmail && allAssignees.includes(myEmail)) || (myName && allAssignees.includes(myName)))) return true

    return false
  }, [user, currentOrg?.ownerId, orgMembers])

  // Open Edit Modal with full task data loaded
  const openEditModal = (task: Task) => {
    setEditingTask(task)
    setEditingTaskTab('overview')
    setEditTitle(task.title || '')
    setEditProjectId(task.projectId || '')
    setEditTag(task.tag || 'Frontend')
    setEditAssignee(task.assigneeName === 'You' ? currentUserName : (task.assigneeName || currentUserName))
    setEditAssignedBy(task.reviewerName === 'You' ? currentUserName : (task.reviewerName || currentUserName))
    setEditDue(task.dueDate || todayStr)
    setEditPriority(task.priority || 'medium')
    setEditStatus(task.status || 'todo')
    setEditDescription(task.description || '')
    setEditProgress(calculateTaskProgress(task))

    // Parse attachments from filesChanged
    try {
      if (task.filesChanged && task.filesChanged.startsWith('[')) {
        const parsed = JSON.parse(task.filesChanged)
        setEditAttachments(Array.isArray(parsed) ? parsed : [])
      } else {
        setEditAttachments([])
      }
    } catch {
      setEditAttachments([])
    }

    // Parse subtasks
    try {
      if (task.subtasks) {
        const parsed = JSON.parse(task.subtasks)
        setEditSubtasks(Array.isArray(parsed) ? parsed : [])
      } else {
        setEditSubtasks([])
      }
    } catch {
      setEditSubtasks([])
    }

    // Parse comments from historyLogs
    try {
      if (task.historyLogs) {
        const parsed = JSON.parse(task.historyLogs)
        if (Array.isArray(parsed)) {
          const commentsOnly = parsed.filter((item: any) => item.content || item.comment || item.type === 'comment')
          setEditComments(commentsOnly.map((c: any) => ({
            id: c.id || 'c_' + Math.random().toString(36).substring(2, 7),
            authorName: c.authorName || c.author || 'User',
            authorEmail: c.authorEmail,
            authorAvatar: c.authorAvatar,
            content: c.content || c.comment || '',
            createdAt: c.createdAt || c.timestamp || new Date().toISOString()
          })))
        } else {
          setEditComments([])
        }
      } else {
        setEditComments([])
      }
    } catch {
      setEditComments([])
    }

    setNewCommentText('')
    setEditSubtaskTitle('')
    setEditSubtaskDesc('')
    setEditSubtaskDue(todayStr)
    setEditSubtaskAttachments([])
  }

  // Save Edit Handler
  const handleSaveEdit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    if (isUpdatingTask || !editingTask || !editTitle.trim()) return

    if (!canEditTask(editingTask)) {
      showToast('You can only edit tasks assigned to you.')
      return
    }

    const wsId = currentWorkspace?.id || '50a4c29f-09ff-4480-8b6b-495381247d0f'
    try {
      setIsUpdatingTask(true)
      const isDone = editStatus === 'done'

      // Calculate progress if subtasks exist
      let finalProgress = editProgress
      if (editSubtasks.length > 0) {
        const done = editSubtasks.filter((s: any) => s.completed).length
        finalProgress = Math.round((done / editSubtasks.length) * 100)
      } else if (isDone) {
        finalProgress = 100
      }

      await updateTask(editingTask.id, {
        projectId: editProjectId || undefined,
        title: editTitle.trim(),
        description: editDescription.trim(),
        tag: editTag,
        assigneeName: getFirstName(editAssignee === 'You' ? currentUserName : (editAssignee || currentUserName)),
        reviewerName: getFirstName(editAssignedBy === 'You' ? currentUserName : (editAssignedBy || currentUserName)),
        dueDate: editDue,
        priority: editPriority,
        status: editStatus,
        progress: finalProgress,
        subtasks: JSON.stringify(editSubtasks),
        filesChanged: JSON.stringify(editAttachments),
        historyLogs: JSON.stringify(editComments),
        environment: getEnvForStatus(editStatus, editingTask.environment) as TaskEnvironment,
      })
      setEditingTask(null)
      loadProjects(wsId)
      showToast('Task updated successfully!')
    } catch (err: any) {
      showToast(err?.message || 'Failed to update task')
    } finally {
      setIsUpdatingTask(false)
    }
  }

  // Add Comment Handler
  const handleAddComment = () => {
    if (!newCommentText.trim()) return
    const newComment: TaskComment = {
      id: 'c_' + Date.now(),
      authorName: currentUserName,
      authorEmail: user?.email,
      content: newCommentText.trim(),
      createdAt: new Date().toISOString(),
    }
    const updated = [...editComments, newComment]
    setEditComments(updated)
    setNewCommentText('')
    showToast('Comment added!')
  }

  // Direct status update
  const handleStatusChange = async (taskId: string, newStatus: TaskStatus) => {
    const task = tasks.find((t) => t.id === taskId)
    if (task && !canEditTask(task)) {
      showToast('You can only edit tasks assigned to you.')
      return
    }
    const wsId = currentWorkspace?.id || '50a4c29f-09ff-4480-8b6b-495381247d0f'
    await updateStatus(taskId, newStatus, newStatus === 'done' ? 'MAIN' : undefined)
    loadProjects(wsId)
    showToast(`Task updated to ${newStatus.replace('_', ' ').toUpperCase()}`)
  }

  // Delete Task with confirmation
  const [taskToDelete, setTaskToDelete] = useState<Task | null>(null)
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false)

  const confirmDeleteTask = async () => {
    if (!taskToDelete || isConfirmingDelete) return
    const wsId = currentWorkspace?.id || '50a4c29f-09ff-4480-8b6b-495381247d0f'
    try {
      setIsConfirmingDelete(true)
      await deleteTask(taskToDelete.id)
      loadProjects(wsId)
      showToast('Task deleted from database')
      setTaskToDelete(null)
      if (editingTask?.id === taskToDelete.id) setEditingTask(null)
    } catch (err: any) {
      showToast(err?.message || 'Failed to delete task')
    } finally {
      setIsConfirmingDelete(false)
    }
  }

  const handleDelete = (taskId: string) => {
    const task = tasks.find((t) => t.id === taskId)
    if (task && !canEditTask(task)) {
      showToast('You can only delete tasks assigned to you.')
      return
    }
    if (task) {
      setTaskToDelete(task)
    }
  }

  // Drag and drop task reordering & status drop target
  const [taskOrder, setTaskOrder] = useState<string[]>([])
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null)
  const [dragOverStatusId, setDragOverStatusId] = useState<string | null>(null)

  const handleTaskDragStart = (e: React.DragEvent, id: string) => {
    setDraggedTaskId(id)
    e.dataTransfer.setData('text/plain', id)
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleTaskDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }

  const handleTaskDrop = (e: React.DragEvent, targetId: string) => {
    e.preventDefault()
    const sourceId = draggedTaskId || e.dataTransfer.getData('text/plain')
    if (!sourceId || sourceId === targetId) return

    setTaskOrder((prev) => {
      const allIds = prev.length > 0 ? [...prev] : tasks.map((t) => t.id)
      const fromIndex = allIds.indexOf(sourceId)
      const toIndex = allIds.indexOf(targetId)
      if (fromIndex === -1 || toIndex === -1) return prev

      const [moved] = allIds.splice(fromIndex, 1)
      allIds.splice(toIndex, 0, moved)
      return allIds
    })
    setDraggedTaskId(null)
  }

  const handleDropOnStatusTab = async (e: React.DragEvent, statusId: string) => {
    e.preventDefault()
    setDragOverStatusId(null)
    const sourceId = draggedTaskId || e.dataTransfer.getData('text/plain')
    if (!sourceId) return
    if (statusId === 'all') return

    await handleStatusChange(sourceId, statusId as TaskStatus)
    setDraggedTaskId(null)
  }

  // Filter tasks
  const filteredTasks = tasks.filter((t) => {
    const matchesTag = filterTag === 'all' || t.tag?.toLowerCase() === filterTag.toLowerCase()
    const matchesEnv = filterEnv === 'all' || t.environment?.toUpperCase() === filterEnv.toUpperCase()
    const matchesProj = filterProject === 'all' || t.projectId === filterProject
    const matchesStatusTab = selectedStatusTab === 'all' || t.status === selectedStatusTab || (selectedStatusTab === 'todo' && !workspaceStatuses.some((ws) => ws.id === t.status))
    const isBug = isBugTask(t)
    const matchesCategory =
      activeCategoryTab === 'all'
        ? true
        : activeCategoryTab === 'bugs'
        ? isBug
        : !isBug
    return matchesTag && matchesEnv && matchesProj && matchesStatusTab && matchesCategory
  })

  // Ordered tasks according to drag and drop custom position
  const orderedFilteredTasks = [...filteredTasks].sort((a, b) => {
    if (taskOrder.length === 0) return 0
    const indexA = taskOrder.indexOf(a.id)
    const indexB = taskOrder.indexOf(b.id)
    if (indexA === -1 && indexB === -1) return 0
    if (indexA === -1) return 1
    if (indexB === -1) return -1
    return indexA - indexB
  })

  // Show skeleton during initial load only (after all hooks have executed)
  if (tasksLoading && tasks.length === 0) {
    return <TaskListSkeleton />
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

        {/* Project & Tasks Overview Banner with 4 KPI Summary Cards (Identical to Project Board) */}
        <div className="p-6 rounded-3xl border border-border/80 bg-card/70 backdrop-blur-md shadow-sm relative overflow-hidden space-y-4">
          <div className="absolute top-0 left-0 right-0 h-1 rounded-t-3xl bg-primary" />

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <Link
                href="/app/projects"
                className="inline-flex items-center gap-1.5 text-xs font-bold text-muted-foreground hover:text-foreground transition-colors mb-1"
              >
                <ArrowLeft className="w-3.5 h-3.5" /> Back to Projects &amp; Pipelines
              </Link>
              <h1 className="text-2xl font-extrabold tracking-tight text-foreground">
                {currentWorkspace?.name || 'TaskFlow Workspace'} Deliverables
              </h1>
              <p className="text-xs text-muted-foreground max-w-2xl">
                Comprehensive workspace deliverables overview, sprint tracking, bugs triage, and feature progress.
              </p>
            </div>

            <div className="flex items-center gap-2.5 shrink-0 self-start sm:self-auto">
              <button
                onClick={() => setGuideModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl border border-border bg-card/80 hover:bg-accent text-xs font-bold text-foreground transition-all shadow-sm active:scale-95 cursor-pointer"
                title="Workspace User Guide"
              >
                <Sparkles className="w-3.5 h-3.5 text-primary" />
                <span>Guide</span>
              </button>

              <button
                onClick={() => setStatusModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl border border-border bg-card/80 hover:bg-accent text-xs font-bold text-foreground transition-all shadow-sm active:scale-95 cursor-pointer"
                title="Edit Space Statuses"
              >
                <Sliders className="w-3.5 h-3.5 text-primary" />
                <span>Statuses</span>
              </button>

              <button
                onClick={() => {
                  setNewTaskDue(todayStr)
                  setIsModalOpen(true)
                }}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-xs font-bold hover:bg-primary/90 transition-all shadow-md shadow-primary/20 active:scale-95 cursor-pointer"
              >
                <Plus className="w-4 h-4" /> Add Task
              </button>
            </div>
          </div>

          {/* 4 KPI Metrics Summary Strip */}
          <div className="pt-3 border-t border-border/50 grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3 rounded-2xl bg-background/80 border border-border/60">
              <span className="text-[10px] font-bold text-muted-foreground uppercase">Total Deliverables</span>
              <div className="text-lg font-extrabold text-foreground mt-0.5">{totalDeliverablesCount}</div>
            </div>

            <div className="p-3 rounded-2xl bg-background/80 border border-border/60">
              <span className="text-[10px] font-bold text-rose-500 uppercase flex items-center gap-1">
                <Bug className="w-3 h-3" /> Bugs &amp; Fixes
              </span>
              <div className="text-lg font-extrabold text-rose-500 mt-0.5">{bugTasksCount}</div>
            </div>

            <div className="p-3 rounded-2xl bg-background/80 border border-border/60">
              <span className="text-[10px] font-bold text-blue-500 uppercase flex items-center gap-1">
                <Sparkles className="w-3 h-3" /> Feature Tasks
              </span>
              <div className="text-lg font-extrabold text-blue-500 mt-0.5">{featureTasksCount}</div>
            </div>

            <div className="p-3 rounded-2xl bg-background/80 border border-border/60">
              <span className="text-[10px] font-bold text-muted-foreground uppercase">Weighted Progress</span>
              <div className="text-lg font-extrabold text-primary mt-0.5">
                {weightedProgress}%
              </div>
            </div>
          </div>
        </div>

        {/* Controls Bar: Category Filter, Project Filter, Tag Filter & View Switcher */}
        <div className="flex flex-wrap items-center justify-between gap-3 bg-card/80 border border-border/80 p-3.5 rounded-2xl shadow-xs">
          {/* Category Tabs (All Tasks, Bugs & Fixes, Features) matching Screenshot 2 */}
          <div className="flex items-center gap-1.5 overflow-x-auto max-w-full pb-1 sm:pb-0">
            <button
              onClick={() => setActiveCategoryTab('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
                activeCategoryTab === 'all'
                  ? 'bg-primary text-primary-foreground shadow-xs'
                  : 'bg-muted/70 text-muted-foreground hover:text-foreground'
              }`}
            >
              All Tasks ({tasks.length})
            </button>
            <button
              onClick={() => setActiveCategoryTab('bugs')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1 ${
                activeCategoryTab === 'bugs'
                  ? 'bg-rose-500 text-white shadow-xs'
                  : 'bg-rose-500/10 text-rose-600 hover:bg-rose-500/20'
              }`}
            >
              <Bug className="w-3.5 h-3.5" /> Bugs &amp; Fixes ({bugTasksCount})
            </button>
            <button
              onClick={() => setActiveCategoryTab('features')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1 ${
                activeCategoryTab === 'features'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-blue-500/10 text-blue-600 hover:bg-blue-500/20'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" /> Features ({featureTasksCount})
            </button>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {/* Project Filter */}
            {projects.length > 0 && (
              <div className="flex items-center gap-1.5 bg-background/80 px-3 py-1.5 rounded-xl border border-border text-xs">
                <FolderKanban className="w-3.5 h-3.5 text-primary" />
                <select
                  value={filterProject}
                  onChange={(e) => setFilterProject(e.target.value)}
                  className="bg-transparent text-foreground text-xs focus:outline-none cursor-pointer font-medium"
                >
                  <option value="all">All Projects ({projects.length})</option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Tag Filter */}
            <div className="flex items-center gap-1.5 bg-background/80 px-3 py-1.5 rounded-xl border border-border text-xs">
              <Filter className="w-3.5 h-3.5 text-primary" />
              <select
                value={filterTag}
                onChange={(e) => setFilterTag(e.target.value)}
                className="bg-transparent text-foreground text-xs focus:outline-none cursor-pointer font-medium"
              >
                <option value="all">All Tags ({tasks.length})</option>
                <option value="Frontend">Frontend</option>
                <option value="Backend">Backend</option>
                <option value="Design">Design</option>
                <option value="DevOps">DevOps</option>
                <option value="Architecture">Architecture</option>
                <option value="Bug Fix">Bug Fix</option>
              </select>
            </div>
          </div>

            {/* View Switcher: Minimal Grid, List, and Tree / Graph */}
            <div className="flex items-center p-1 bg-[#000000]/80 backdrop-blur-md rounded-xl border border-[#2B2B2B] shadow-xs">
              <button
                onClick={() => setViewMode('grid')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  viewMode === 'grid'
                    ? 'bg-[#141414] text-white border border-[#2B2B2B] shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
                title="Minimal Liquid Glass Grid View"
              >
                <LayoutGrid className="w-3.5 h-3.5 text-[#BFD8E3]" /> Grid
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  viewMode === 'list'
                    ? 'bg-[#141414] text-white border border-[#2B2B2B] shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
                title="Compact List View"
              >
                <List className="w-3.5 h-3.5 text-[#BFD8E3]" /> List
              </button>
              <button
                onClick={() => setViewMode('tree')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  viewMode === 'tree'
                    ? 'bg-[#141414] text-white border border-[#2B2B2B] shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
                title="Interactive Status & Project Hierarchy Graph"
              >
                <GitBranch className="w-3.5 h-3.5 text-[#BFD8E3]" /> Tree / Graph
              </button>
            </div>

            {/* Dispatch Due Alerts: Date Selector + Dispatch Action */}
            <div className="flex items-center gap-1.5 bg-[#141414] border border-[#2B2B2B] px-2 py-1 rounded-xl shadow-xs">
              <div className="flex items-center gap-1 text-xs text-slate-400">
                <Calendar className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                <input
                  type="date"
                  value={selectedAlertDate}
                  onChange={(e) => setSelectedAlertDate(e.target.value)}
                  className="bg-transparent text-white text-xs focus:outline-none cursor-pointer font-medium"
                  title="Select date to dispatch due alerts for"
                />
              </div>
              <button
                type="button"
                onClick={() => handleDispatchDateDueAlerts(selectedAlertDate)}
                disabled={isDispatchingDateAlert}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-rose-600 to-amber-600 hover:brightness-110 text-white text-xs font-bold shadow-xs transition-all active:scale-95 disabled:opacity-50 cursor-pointer whitespace-nowrap"
                title={`Send email alert for all tasks due on ${selectedAlertDate}`}
              >
                {isDispatchingDateAlert ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Bell className="w-3.5 h-3.5" />
                )}
                <span>Dispatch Due Alerts</span>
                {tasks.filter((t) => (t.dueDate === selectedAlertDate || (selectedAlertDate === todayStr && t.dueDate === 'Today')) && t.status !== 'done').length > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full bg-white/30 text-[10px] font-black leading-none">
                    {tasks.filter((t) => (t.dueDate === selectedAlertDate || (selectedAlertDate === todayStr && t.dueDate === 'Today')) && t.status !== 'done').length}
                  </span>
                )}
              </button>
            </div>
          </div>

        {/* Mandatory Project Banner if no projects in workspace */}
        {projects.length === 0 && (
          <div className="bg-gradient-to-r from-amber-500/15 via-amber-500/10 to-transparent border border-amber-500/30 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm animate-fade-in">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-amber-500/20 text-amber-500 shrink-0">
                <FolderKanban className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-foreground">Project Required Before Creating Tasks</h4>
                <p className="text-[11px] text-muted-foreground">Every task must belong to a project. Create your first project to start creating and organizing tasks.</p>
              </div>
            </div>
            <Link
              href="/app/projects"
              className="px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-bold hover:bg-primary/90 transition-all shrink-0 flex items-center gap-1.5 shadow-md shadow-primary/20"
            >
              <Plus className="w-3.5 h-3.5" /> Create Project
            </Link>
          </div>
        )}

        {/* ========================================================================= */}
        {/* VIEW MODE 1: MINIMAL SPACIOUS LIQUID GLASS GRID VIEW                     */}
        {/* ========================================================================= */}
        {viewMode === 'grid' && (
          <div className="space-y-6">
            {/* Status Filter Tabs for Minimal Congestion-Free Navigation & Status Drop Targets */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
              <button
                onClick={() => setSelectedStatusTab('all')}
                onDragOver={(e) => {
                  e.preventDefault()
                  setDragOverStatusId('all')
                }}
                onDragLeave={() => setDragOverStatusId(null)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                  dragOverStatusId === 'all' ? 'ring-2 ring-[#00638E] scale-105' : ''
                } ${
                  selectedStatusTab === 'all'
                    ? 'bg-[#00638E] text-white shadow-md shadow-[#00638E]/30 border border-[#00638E]'
                    : 'bg-white dark:bg-[#141414] hover:bg-slate-100 dark:hover:bg-[#2B2B2B] text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-[#2B2B2B]'
                }`}
              >
                <span>All Tasks</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${selectedStatusTab === 'all' ? 'bg-white/20 text-white' : 'bg-slate-100 dark:bg-[#000000] text-slate-700 dark:text-[#BFD8E3] border border-slate-200 dark:border-[#2B2B2B]'}`}>
                  {tasks.length}
                </span>
              </button>

              {workspaceStatuses.map((st) => {
                const count = tasks.filter((t) => t.status === st.id || (st.id === 'todo' && !workspaceStatuses.some((ws) => ws.id === t.status))).length
                const isActive = selectedStatusTab === st.id
                const isDragOver = dragOverStatusId === st.id
                return (
                  <button
                    key={st.id}
                    onClick={() => setSelectedStatusTab(st.id)}
                    onDragOver={(e) => {
                      e.preventDefault()
                      setDragOverStatusId(st.id)
                    }}
                    onDragLeave={() => setDragOverStatusId(null)}
                    onDrop={(e) => handleDropOnStatusTab(e, st.id)}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 whitespace-nowrap ${
                      isDragOver ? 'ring-2 ring-[#00638E] scale-105 bg-[#00638E]/20 shadow-md' : ''
                    } ${
                      isActive
                        ? 'bg-[#00638E] text-white shadow-md shadow-[#00638E]/30 border border-[#00638E]'
                        : 'bg-white dark:bg-[#141414] hover:bg-slate-100 dark:hover:bg-[#2B2B2B] text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-[#2B2B2B]'
                    }`}
                    title={`Drop task card here to set status to ${st.name}`}
                  >
                    <div
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: st.color }}
                    />
                    <span>{st.name}</span>
                    <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${isActive ? 'bg-white/20 text-white' : 'bg-slate-100 dark:bg-[#000000] text-slate-700 dark:text-[#BFD8E3] border border-slate-200 dark:border-[#2B2B2B]'}`}>
                      {count}
                    </span>
                  </button>
                )
              })}
            </div>

            {/* Empty State */}
            {orderedFilteredTasks.length === 0 ? (
              <div className="text-center py-20 rounded-3xl border border-dashed border-border/70 bg-card/40 backdrop-blur-md p-8 space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-muted/80 flex items-center justify-center mx-auto text-muted-foreground">
                  <CheckSquare className="w-6 h-6" />
                </div>
                <h3 className="text-sm font-bold text-foreground">No tasks found</h3>
                <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                  {selectedStatusTab !== 'all' ? `There are no tasks with status "${selectedStatusTab}".` : 'Get started by creating your first task in this workspace.'}
                </p>
                <button
                  onClick={() => setIsModalOpen(true)}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-all shadow-md shadow-primary/20"
                >
                  <Plus className="w-3.5 h-3.5" /> Create Task
                </button>
              </div>
            ) : (
              /* Spacious, Non-Congested Liquid Glass Grid with Reordering */
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {orderedFilteredTasks.map((task) => {
                  const proj = projects.find((p) => p.id === task.projectId)
                  const projColor = getProjectColor(proj, task.projectId)
                  const dueStatus = getDueStatus(task.dueDate)
                  const isDispatchingThis = dispatchingAlertId === task.id
                  const isExpanded = expandedTasks[task.id]

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
                    if (task.filesChanged && task.filesChanged.startsWith('[')) attachmentsList = JSON.parse(task.filesChanged)
                  } catch {}

                  let commentsList: any[] = []
                  try {
                    if (task.historyLogs && task.historyLogs.startsWith('[')) {
                      commentsList = JSON.parse(task.historyLogs).filter((i: any) => i.content || i.comment || i.type === 'comment')
                    }
                  } catch {}

                  const taskProgress = calculateTaskProgress(task)

                  return (
                    <div
                      key={task.id}
                      draggable={true}
                      onDragStart={(e) => handleTaskDragStart(e, task.id)}
                      onDragOver={handleTaskDragOver}
                      onDrop={(e) => handleTaskDrop(e, task.id)}
                      onDragEnd={() => setDraggedTaskId(null)}
                      className={`group relative rounded-3xl border border-slate-200 dark:border-[#2B2B2B] bg-white dark:bg-[#141414] p-5 space-y-4 backdrop-blur-xl overflow-hidden cursor-move flex flex-col justify-between select-none smooth-card animate-slide-up hover:border-[#00638E]/70 dark:hover:border-[#00638E]/70 shadow-md hover:shadow-xl dark:shadow-2xl dark:shadow-black/40 dark:hover:shadow-[#00638E]/10 transition-all ${
                        draggedTaskId === task.id ? 'opacity-40 scale-95 border-dashed border-[#00638E] ring-2 ring-[#00638E]/40' : ''
                      }`}
                      title="Drag to place at any position or drop on status tabs"
                    >

                      {/* Gloss Reflection Highlights */}
                      <div className="absolute -top-16 -right-16 w-36 h-36 bg-gradient-to-br from-[#00638E]/10 dark:from-white/10 to-transparent rounded-full blur-2xl pointer-events-none" />
                      <div
                        className="absolute -bottom-16 -left-16 w-36 h-36 rounded-full blur-3xl pointer-events-none opacity-10 dark:opacity-15 bg-[#00638E]"
                      />

                      {/* Card Content Area */}
                      <div className="space-y-3.5 relative z-10">
                        {/* Tags and Project Row */}
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 flex-wrap min-w-0">
                            {/* Drag Handle */}
                            <div className="text-slate-400 dark:text-slate-500 hover:text-[#00638E] dark:hover:text-[#BFD8E3] cursor-grab active:cursor-grabbing shrink-0 p-0.5 transition-colors" title="Drag to reorder position">
                              <GripVertical className="w-4 h-4" />
                            </div>

                            {/* Project Badge */}
                            {proj ? (
                              <span
                                className="inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1 rounded-xl border border-[#00638E]/25 dark:border-[#00638E]/35 bg-[#00638E]/10 dark:bg-[#00638E]/15 text-[#00638E] dark:text-[#BFD8E3] truncate max-w-[160px] shadow-xs"
                              >
                                <FolderKanban className="w-3 h-3 shrink-0 text-[#00638E] dark:text-[#BFD8E3]" />
                                <span className="truncate">{proj.name}</span>
                              </span>
                            ) : (
                              <span className="text-[10px] text-slate-400 dark:text-slate-500">&mdash;</span>
                            )}

                            {/* Tag Badge */}
                            <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${getTagColor(task.tag)}`}>
                              {task.tag}
                            </span>
                          </div>

                          {/* Priority Pill & View-Only Badge */}
                          <div className="flex items-center gap-1.5">
                            {!canEditTask(task) && (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-500 dark:text-amber-400 border border-amber-500/30 shadow-xs">
                                <Lock className="w-2.5 h-2.5" />
                                <span>View Only</span>
                              </span>
                            )}
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
                        </div>

                        {/* Title (Link to Detail Page) */}
                        <Link
                          href={`/app/tasks/${task.id}`}
                          className="block text-sm font-bold tracking-tight text-slate-900 dark:text-white group-hover:text-[#00638E] dark:group-hover:text-[#BFD8E3] transition-colors leading-snug line-clamp-2"
                        >
                          {task.title}
                        </Link>

                        {/* Description snippet if any */}
                        {task.description && (
                          <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2 leading-relaxed">
                            {task.description}
                          </p>
                        )}

                        {/* Dynamic Progress Bar & Percentage Pill */}
                        <div className="space-y-1.5 py-0.5">
                          <div className="flex items-center justify-between text-[11px] font-semibold">
                            <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1">
                              <SlidersHorizontal className="w-3 h-3 text-[#00638E] dark:text-[#BFD8E3]" /> Progress
                            </span>
                            <span className="font-bold text-[#00638E] dark:text-[#BFD8E3] px-2 py-0.2 rounded-full bg-[#00638E]/10 dark:bg-[#00638E]/20 border border-[#00638E]/25 dark:border-[#00638E]/35 text-[10px]">
                              {taskProgress}%
                            </span>
                          </div>
                          <div className="h-1.5 w-full bg-slate-100 dark:bg-[#2B2B2B] rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all duration-300 bg-gradient-to-r from-[#004A6B] via-[#00638E] to-[#8CB9CC]"
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
                                className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-[#000000]/60 hover:bg-slate-200 dark:hover:bg-[#2B2B2B] border border-slate-200 dark:border-[#2B2B2B] text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white cursor-pointer transition-colors shadow-xs"
                                title={`${attachmentsList.length} attachment(s)`}
                              >
                                <Paperclip className="w-3 h-3 text-[#00638E] dark:text-[#BFD8E3]" />
                                <span>{attachmentsList.length} file{attachmentsList.length === 1 ? '' : 's'}</span>
                              </button>
                            )}
                            {commentsList.length > 0 && (
                              <button
                                type="button"
                                onClick={() => openEditModal(task)}
                                className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-[#000000]/60 hover:bg-slate-200 dark:hover:bg-[#2B2B2B] border border-slate-200 dark:border-[#2B2B2B] text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white cursor-pointer transition-colors shadow-xs"
                                title={`${commentsList.length} comment(s)`}
                              >
                                <MessageSquare className="w-3 h-3 text-[#00638E] dark:text-[#BFD8E3]" />
                                <span>{commentsList.length} comment{commentsList.length === 1 ? '' : 's'}</span>
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
                              className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-700 dark:text-[#BFD8E3] hover:text-slate-900 dark:hover:text-white px-2.5 py-1 rounded-xl bg-slate-100 dark:bg-[#000000]/50 border border-slate-200 dark:border-[#2B2B2B] hover:border-[#00638E]/40 hover:bg-slate-200 dark:hover:bg-[#2B2B2B]/40 transition-all cursor-pointer"
                            >
                              <CheckSquare className="w-3 h-3 text-[#00638E]" />
                              <span>
                                Subtasks: {doneCount}/{subtaskList.length} completed
                              </span>
                              {isExpanded ? (
                                <ChevronUp className="w-3 h-3 ml-auto text-slate-400" />
                              ) : (
                                <ChevronDown className="w-3 h-3 ml-auto text-slate-400" />
                              )}
                            </button>

                            {/* Expandable subtasks preview */}
                            {isExpanded && (
                              <div className="p-3 rounded-2xl bg-slate-50 dark:bg-[#0c0c0c] border border-slate-200 dark:border-[#2B2B2B] space-y-2 text-xs animate-fade-in">
                                {subtaskList.map((st: any) => (
                                  <label
                                    key={st.id}
                                    className="flex items-center gap-2 cursor-pointer text-[11px] text-slate-800 dark:text-slate-200 hover:text-[#00638E] dark:hover:text-[#BFD8E3] transition-colors"
                                  >
                                    <input
                                      type="checkbox"
                                      checked={st.completed}
                                      onChange={() => toggleSubtask(task.id, st.id)}
                                      className="w-3.5 h-3.5 rounded text-[#00638E] focus:ring-[#00638E] cursor-pointer accent-[#00638E]"
                                    />
                                    <span className={st.completed ? 'line-through text-slate-400 dark:text-muted-foreground' : 'font-medium text-slate-800 dark:text-slate-200'}>
                                      {st.title}
                                    </span>
                                  </label>
                                ))}
                              </div>
                            )}
                          </div>
                        )}

                        {/* Assignee & Assigned By Info */}
                        <div className="pt-2 border-t border-slate-100 dark:border-[#2B2B2B] flex items-center justify-between gap-2 text-xs">
                          <div className="flex items-center gap-2 min-w-0">
                            <div className="w-6 h-6 rounded-full bg-[#00638E]/15 dark:bg-[#00638E]/25 border border-[#00638E]/30 dark:border-[#00638E]/40 text-[#00638E] dark:text-[#BFD8E3] font-bold text-[10px] flex items-center justify-center shrink-0">
                              {(getFirstName(task.assigneeName || 'You')).charAt(0).toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <p className="text-[11px] font-bold text-slate-900 dark:text-white truncate">
                                {getFirstName(task.assigneeName || 'You')}
                              </p>
                              <p className="text-[9px] text-slate-500 dark:text-slate-400 truncate">
                                By: {getFirstName(task.reviewerName || 'You')}
                              </p>
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
                                : 'bg-slate-100 dark:bg-[#000000]/60 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-[#2B2B2B]'
                            }`}
                          >
                            <Calendar className="w-3 h-3 text-[#00638E] shrink-0" />
                            <span>{task.dueDate || todayStr}</span>
                            {dueStatus.text && (
                              <span className="text-[9px] font-black uppercase opacity-90">
                                ({dueStatus.text})
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Footer Actions: Status Dropdown & Action Buttons */}
                      <div className="pt-3 border-t border-slate-100 dark:border-[#2B2B2B] flex items-center justify-between gap-2 relative z-10">
                        {/* Status selector */}
                        <select
                          value={task.status}
                          disabled={!canEditTask(task)}
                          onChange={(e) => handleStatusChange(task.id, e.target.value as TaskStatus)}
                          className="text-[11px] font-semibold bg-white dark:bg-[#000000]/80 hover:bg-slate-50 dark:hover:bg-[#000000] border border-slate-200 dark:border-[#2B2B2B] hover:border-[#00638E]/50 px-2.5 py-1.5 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:border-[#00638E] cursor-pointer transition-colors shadow-xs disabled:opacity-60 disabled:cursor-not-allowed"
                        >
                          {workspaceStatuses.map((st) => (
                            <option key={st.id} value={st.id}>
                              {st.name}
                            </option>
                          ))}
                        </select>

                        <div className="flex items-center gap-1.5">
                          {/* Bell button for separate task due alert */}
                          <button
                            type="button"
                            onClick={() => handleSendDueAlert(task)}
                            disabled={isDispatchingThis}
                            title={`Send due date alert email for "${task.title}" now`}
                            className={`p-2 rounded-xl transition-all relative flex items-center justify-center cursor-pointer border ${
                              dueStatus.isToday || dueStatus.isOverdue
                                ? 'bg-rose-500/15 text-rose-500 hover:bg-rose-500/25 border-rose-500/30 ring-1 ring-rose-500/30'
                                : 'bg-slate-100 dark:bg-[#000000]/70 hover:bg-slate-200 dark:hover:bg-[#2B2B2B] border-slate-200 dark:border-[#2B2B2B] text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                            }`}
                          >
                            {isDispatchingThis ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin text-[#00638E]" />
                            ) : (
                              <Bell className="w-3.5 h-3.5" />
                            )}
                            {(dueStatus.isToday || dueStatus.isNear || dueStatus.isOverdue) && !isDispatchingThis && (
                              <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                            )}
                          </button>

                          {/* Edit / View button */}
                          <button
                            type="button"
                            onClick={() => openEditModal(task)}
                            title={canEditTask(task) ? "Edit Task" : "View Task Details"}
                            className="p-2 rounded-xl bg-slate-100 dark:bg-[#000000]/70 hover:bg-slate-200 dark:hover:bg-[#2B2B2B] border border-slate-200 dark:border-[#2B2B2B] text-slate-600 dark:text-slate-300 hover:text-[#00638E] dark:hover:text-[#BFD8E3] hover:border-[#00638E]/50 transition-colors cursor-pointer"
                          >
                            {canEditTask(task) ? (
                              <Edit2 className="w-3.5 h-3.5" />
                            ) : (
                              <Eye className="w-3.5 h-3.5 text-[#00638E] dark:text-[#8CB9CC]" />
                            )}
                          </button>

                          {/* Delete button (only if editable) */}
                          {canEditTask(task) && (
                            <button
                              type="button"
                              disabled={deletingTaskId === task.id}
                              onClick={() => handleDelete(task.id)}
                              title="Delete Task"
                              className="p-2 rounded-xl bg-slate-100 dark:bg-[#000000]/70 hover:bg-rose-500/15 border border-slate-200 dark:border-[#2B2B2B] hover:border-rose-500/40 text-slate-500 dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              {deletingTaskId === task.id ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin text-rose-500" />
                              ) : (
                                <Trash2 className="w-3.5 h-3.5" />
                              )}
                            </button>
                          )}
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
        {/* VIEW MODE 2: INTERACTIVE TREE / GRAPH VIEW                                */}
        {/* ========================================================================= */}
        {viewMode === 'tree' && (
          <div className="space-y-6">
            <div className="p-5 rounded-3xl bg-white dark:bg-[#141414] backdrop-blur-xl border border-slate-200 dark:border-[#2B2B2B] shadow-lg dark:shadow-2xl space-y-6">
              {/* Root Workspace Node */}
              <div className="flex items-center gap-3 p-4 rounded-2xl bg-slate-50 dark:bg-gradient-to-r dark:from-[#004A6B]/20 dark:via-[#00638E]/10 dark:to-transparent border border-slate-200 dark:border-[#00638E]/30 shadow-xs">
                <div className="p-2.5 rounded-xl bg-[#00638E] text-white shadow-md shadow-[#00638E]/30">
                  <Workflow className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white tracking-tight">
                      Workspace: {currentWorkspace?.name || 'Main Workspace'}
                    </h3>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#00638E]/10 dark:bg-[#00638E]/20 text-[#00638E] dark:text-[#BFD8E3] border border-[#00638E]/25 dark:border-[#00638E]/40">
                      Root Graph
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Hierarchical task tree connecting statuses, projects, deliverables, and subtasks.
                  </p>
                </div>
              </div>

              {/* Status Branches */}
              <div className="space-y-6 pl-4 md:pl-8 border-l-2 border-[#00638E]/25 ml-4">
                {workspaceStatuses.map((status) => {
                  const statusTasks = filteredTasks.filter(
                    (t) =>
                      t.status === status.id ||
                      (status.id === 'todo' && !workspaceStatuses.some((ws) => ws.id === t.status))
                  )
                  const isExpanded = expandedTreeStatuses[status.id] ?? true

                  return (
                    <div key={status.id} className="relative space-y-3">
                      {/* Branch line connector */}
                      <div className="absolute -left-4 md:-left-8 top-4 w-4 md:w-8 h-0.5 bg-[#00638E]/30" />

                      {/* Status Node Card */}
                      <div
                        onClick={() => toggleTreeStatus(status.id)}
                        className="flex items-center justify-between p-3.5 rounded-2xl border border-slate-200 dark:border-[#2B2B2B] bg-white dark:bg-[#141414] hover:border-[#00638E]/60 backdrop-blur-md shadow-xs hover:shadow-md transition-all cursor-pointer group select-none"
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className="w-3.5 h-3.5 rounded-full ring-4 ring-offset-1 ring-offset-background shrink-0"
                            style={{
                              backgroundColor: status.color,
                              boxShadow: `0 0 10px ${status.color}`,
                            }}
                          />
                          <div>
                            <span className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wide">
                              {status.name}
                            </span>
                            <span className="text-[10px] text-slate-500 dark:text-slate-400 ml-2">
                              ({status.category.replace('_', ' ')})
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-100 dark:bg-[#000000] text-slate-700 dark:text-[#BFD8E3] border border-slate-200 dark:border-[#2B2B2B]">
                            {statusTasks.length} task{statusTasks.length === 1 ? '' : 's'}
                          </span>
                          {isExpanded ? (
                            <ChevronUp className="w-4 h-4 text-slate-400 group-hover:text-slate-900 dark:group-hover:text-white" />
                          ) : (
                            <ChevronDown className="w-4 h-4 text-slate-400 group-hover:text-slate-900 dark:group-hover:text-white" />
                          )}
                        </div>
                      </div>

                      {/* Tasks under this status node */}
                      {isExpanded && (
                        <div className="space-y-3 pl-4 md:pl-8 border-l-2 border-dashed border-slate-200 dark:border-[#2B2B2B] ml-4 animate-fade-in">
                          {statusTasks.length === 0 ? (
                            <div className="text-xs text-slate-400 py-2 italic">
                              No tasks in this status branch.
                            </div>
                          ) : (
                            statusTasks.map((t) => {
                              const proj = projects.find((p) => p.id === t.projectId)
                              const projColor = getProjectColor(proj, t.projectId)
                              const dueStatus = getDueStatus(t.dueDate)
                              const isDispatchingThis = dispatchingAlertId === t.id

                              let subtaskList: any[] = []
                              try {
                                if (t.subtasks) {
                                  const parsed = JSON.parse(t.subtasks)
                                  subtaskList = Array.isArray(parsed) ? parsed : [parsed]
                                }
                              } catch {}
                              if (!Array.isArray(subtaskList)) subtaskList = []

                              let attachmentsList: any[] = []
                              try {
                                if (t.filesChanged && t.filesChanged.startsWith('[')) attachmentsList = JSON.parse(t.filesChanged)
                              } catch {}

                              let commentsList: any[] = []
                              try {
                                if (t.historyLogs && t.historyLogs.startsWith('[')) {
                                  commentsList = JSON.parse(t.historyLogs).filter((i: any) => i.content || i.comment || i.type === 'comment')
                                }
                              } catch {}

                              const taskProgress = calculateTaskProgress(t)
                              const isTaskSubExpanded = expandedTasks[t.id]

                              return (
                                <div key={t.id} className="relative space-y-2">
                                  {/* Sub-branch horizontal line */}
                                  <div className="absolute -left-4 md:-left-8 top-4 w-4 md:w-8 h-0.5 bg-slate-200 dark:bg-[#2B2B2B]" />

                                  {/* Task Node Glass Card */}
                                  <div
                                    className="p-4 rounded-2xl border border-slate-200 dark:border-[#2B2B2B] bg-white dark:bg-[#141414] hover:border-[#00638E]/60 backdrop-blur-xl shadow-xs hover:shadow-md transition-all space-y-2.5"
                                  >
                                    <div className="flex items-center justify-between gap-2 flex-wrap">
                                      <div className="flex items-center gap-2 min-w-0">
                                        <div
                                          className="w-2.5 h-2.5 rounded-full shrink-0"
                                          style={{ backgroundColor: projColor }}
                                        />
                                        <Link
                                          href={`/app/tasks/${t.id}`}
                                          className="text-xs font-bold text-slate-900 dark:text-white hover:text-[#00638E] dark:hover:text-[#BFD8E3] transition-colors truncate max-w-md"
                                        >
                                          {t.title}
                                        </Link>
                                      </div>

                                      <div className="flex items-center gap-2">
                                        {proj && (
                                          <span
                                            className="text-[10px] font-bold px-2 py-0.5 rounded-lg border border-[#00638E]/25 dark:border-[#00638E]/35 bg-[#00638E]/10 dark:bg-[#00638E]/15 text-[#00638E] dark:text-[#BFD8E3] shadow-xs"
                                          >
                                            {proj.name}
                                          </span>
                                        )}
                                        <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${getTagColor(t.tag)}`}>
                                          {t.tag}
                                        </span>
                                        {!canEditTask(t) && (
                                          <span className="inline-flex items-center gap-1 text-[9px] font-bold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                                            <Lock className="w-2.5 h-2.5" />
                                            <span>View Only</span>
                                          </span>
                                        )}
                                      </div>
                                    </div>

                                    {/* Mini Progress Bar & Badges */}
                                    <div className="space-y-1 py-0.5">
                                      <div className="flex items-center justify-between text-[10px] font-semibold text-slate-500 dark:text-slate-400">
                                        <span className="flex items-center gap-1">
                                          <SlidersHorizontal className="w-2.5 h-2.5 text-[#00638E] dark:text-[#BFD8E3]" /> Progress
                                        </span>
                                        <span className="font-bold text-[#00638E] dark:text-[#BFD8E3]">{taskProgress}%</span>
                                      </div>
                                      <div className="h-1 w-full bg-slate-100 dark:bg-[#2B2B2B] rounded-full overflow-hidden">
                                        <div
                                          className="h-full bg-gradient-to-r from-[#004A6B] via-[#00638E] to-[#8CB9CC] rounded-full transition-all duration-300"
                                          style={{ width: `${taskProgress}%` }}
                                        />
                                      </div>
                                    </div>

                                    {/* Attachments & Comments counters */}
                                    {(attachmentsList.length > 0 || commentsList.length > 0) && (
                                      <div className="flex items-center gap-2 text-[10px]">
                                        {attachmentsList.length > 0 && (
                                          <button
                                            type="button"
                                            onClick={() => openEditModal(t)}
                                            className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-slate-100 dark:bg-[#000000]/60 border border-slate-200 dark:border-[#2B2B2B] text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white cursor-pointer"
                                          >
                                            <Paperclip className="w-2.5 h-2.5 text-[#00638E] dark:text-[#BFD8E3]" />
                                            <span>{attachmentsList.length} files</span>
                                          </button>
                                        )}
                                        {commentsList.length > 0 && (
                                          <button
                                            type="button"
                                            onClick={() => openEditModal(t)}
                                            className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-slate-100 dark:bg-[#000000]/60 border border-slate-200 dark:border-[#2B2B2B] text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white cursor-pointer"
                                          >
                                            <MessageSquare className="w-2.5 h-2.5 text-[#00638E] dark:text-[#BFD8E3]" />
                                            <span>{commentsList.length} comments</span>
                                          </button>
                                        )}
                                      </div>
                                    )}

                                    {/* Assignees & Due Date row */}
                                    <div className="flex items-center justify-between gap-2 pt-1 text-xs text-slate-500 dark:text-slate-400">
                                      <div className="flex items-center gap-3">
                                        <span className="flex items-center gap-1">
                                          <User className="w-3 h-3 text-[#00638E]" />
                                          <span className="text-[11px] font-medium text-slate-900 dark:text-white">
                                            {getFirstName(t.assigneeName || 'You')}
                                          </span>
                                          <span className="text-[10px] text-slate-500 dark:text-slate-400">
                                            (By: {getFirstName(t.reviewerName || 'You')})
                                          </span>
                                        </span>
                                      </div>

                                      <div className="flex items-center gap-2">
                                        <span
                                          className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-lg border ${
                                            dueStatus.isToday
                                              ? 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30'
                                              : dueStatus.isOverdue
                                              ? 'bg-red-500/20 text-red-600 dark:text-red-400 border-red-500/30'
                                              : 'bg-slate-100 dark:bg-[#000000]/60 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-[#2B2B2B]'
                                          }`}
                                        >
                                          <Calendar className="w-2.5 h-2.5 text-[#00638E]" />
                                          <span>{t.dueDate || todayStr}</span>
                                        </span>

                                        {/* Individual Due Alert Bell Button */}
                                        <button
                                          type="button"
                                          onClick={() => handleSendDueAlert(t)}
                                          disabled={isDispatchingThis}
                                          title="Send Due Date Alert Email"
                                          className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-[#2B2B2B] text-slate-600 dark:text-slate-300 hover:text-amber-500 transition-colors cursor-pointer"
                                        >
                                          {isDispatchingThis ? (
                                            <Loader2 className="w-3 h-3 animate-spin text-[#00638E]" />
                                          ) : (
                                            <Bell className="w-3 h-3" />
                                          )}
                                        </button>

                                        {/* Edit / View */}
                                        <button
                                          type="button"
                                          onClick={() => openEditModal(t)}
                                          title={canEditTask(t) ? "Edit Task" : "View Task Details"}
                                          className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-[#2B2B2B] text-slate-600 dark:text-slate-300 hover:text-[#00638E] dark:hover:text-[#BFD8E3] transition-colors cursor-pointer"
                                        >
                                          {canEditTask(t) ? (
                                            <Edit2 className="w-3 h-3" />
                                          ) : (
                                            <Eye className="w-3 h-3 text-[#00638E] dark:text-[#8CB9CC]" />
                                          )}
                                        </button>
                                      </div>
                                    </div>

                                    {/* Subtasks branch toggle in Tree View */}
                                    {subtaskList.length > 0 && (
                                      <div className="pt-2">
                                        <button
                                          type="button"
                                          onClick={() => toggleTaskTree(t.id)}
                                          className="flex items-center gap-1.5 text-[10px] font-bold text-primary hover:underline cursor-pointer"
                                        >
                                          <GitBranch className="w-3 h-3" />
                                          <span>
                                            Subtasks Branch ({subtaskList.filter((s: any) => s.completed).length}/{subtaskList.length})
                                          </span>
                                          {isTaskSubExpanded ? (
                                            <ChevronUp className="w-2.5 h-2.5" />
                                          ) : (
                                            <ChevronDown className="w-2.5 h-2.5" />
                                          )}
                                        </button>

                                        {isTaskSubExpanded && (
                                          <div className="mt-2 pl-4 border-l-2 border-primary/30 space-y-1.5">
                                            {subtaskList.map((st: any) => (
                                              <div
                                                key={st.id}
                                                className="flex items-center justify-between gap-2 p-1.5 rounded-xl bg-card/60 border border-border/50 text-[11px]"
                                              >
                                                <label className="flex items-center gap-2 cursor-pointer">
                                                  <input
                                                    type="checkbox"
                                                    checked={st.completed}
                                                    onChange={() => toggleSubtask(t.id, st.id)}
                                                    className="w-3 h-3 rounded text-primary accent-primary cursor-pointer"
                                                  />
                                                  <span className={st.completed ? 'line-through text-muted-foreground' : 'text-foreground font-medium'}>
                                                    {st.title}
                                                  </span>
                                                </label>
                                                {st.branchName && (
                                                  <span className="font-mono text-[9px] text-primary bg-muted px-1.5 py-0.5 rounded border border-border">
                                                    {st.branchName}
                                                  </span>
                                                )}
                                              </div>
                                            ))}
                                          </div>
                                        )}
                                      </div>
                                    )}
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
        {/* VIEW MODE 3: COMPACT LIQUID GLASS LIST VIEW                               */}
        {/* ========================================================================= */}
        {viewMode === 'list' && (
          <div className="rounded-3xl border border-slate-200 dark:border-[#2B2B2B] bg-white dark:bg-[#141414] backdrop-blur-xl overflow-hidden shadow-lg dark:shadow-2xl">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-[#000000] border-b border-slate-200 dark:border-[#2B2B2B] text-slate-600 dark:text-slate-300 font-semibold">
                <tr>
                  <th className="p-3.5 pl-6">Task Title</th>
                  <th className="p-3.5">Project</th>
                  <th className="p-3.5">Status</th>
                  <th className="p-3.5">Progress</th>
                  <th className="p-3.5">Tag</th>
                  <th className="p-3.5">Assigned To</th>
                  <th className="p-3.5">Assigned By</th>
                  <th className="p-3.5">Due Date</th>
                  <th className="p-3.5 pr-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-[#2B2B2B]">
                {orderedFilteredTasks.map((t) => {
                  const proj = projects.find((p) => p.id === t.projectId)
                  const projColor = getProjectColor(proj, t.projectId)
                  const dueStatus = getDueStatus(t.dueDate)
                  const isExpanded = expandedTasks[t.id]

                  let subtaskList: any[] = []
                  try {
                    if (t.subtasks) {
                      const parsed = JSON.parse(t.subtasks)
                      subtaskList = Array.isArray(parsed) ? parsed : [parsed]
                    }
                  } catch {}
                  if (!Array.isArray(subtaskList)) subtaskList = []

                  let attachmentsList: any[] = []
                  try {
                    if (t.filesChanged && t.filesChanged.startsWith('[')) attachmentsList = JSON.parse(t.filesChanged)
                  } catch {}

                  let commentsList: any[] = []
                  try {
                    if (t.historyLogs && t.historyLogs.startsWith('[')) {
                      commentsList = JSON.parse(t.historyLogs).filter((i: any) => i.content || i.comment || i.type === 'comment')
                    }
                  } catch {}

                  const taskProgress = calculateTaskProgress(t)

                  return (
                    <React.Fragment key={t.id}>
                      <tr
                        draggable={true}
                        onDragStart={(e) => handleTaskDragStart(e, t.id)}
                        onDragOver={handleTaskDragOver}
                        onDrop={(e) => handleTaskDrop(e, t.id)}
                        onDragEnd={() => setDraggedTaskId(null)}
                        className={`hover:bg-slate-50/80 dark:hover:bg-[#2B2B2B]/40 transition-colors cursor-move select-none ${
                          draggedTaskId === t.id ? 'opacity-40 bg-[#00638E]/15 border-[#00638E] border-y-2' : ''
                        }`}
                        title="Drag to place at any position"
                      >
                        <td className="p-3.5 pl-6">
                          <div className="flex items-center gap-2 flex-wrap">
                            <div className="text-slate-400 dark:text-slate-500 hover:text-slate-900 dark:hover:text-white cursor-grab active:cursor-grabbing shrink-0 p-0.5" title="Drag to reorder position">
                              <GripVertical className="w-3.5 h-3.5" />
                            </div>
                            {subtaskList.length > 0 && (
                              <button
                                onClick={() => toggleTaskTree(t.id)}
                                className="p-1 rounded hover:bg-slate-100 dark:hover:bg-[#2B2B2B] text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white cursor-pointer"
                              >
                                {isExpanded ? (
                                  <ChevronDown className="w-3.5 h-3.5" />
                                ) : (
                                  <ChevronRight className="w-3.5 h-3.5" />
                                )}
                              </button>
                            )}
                            <Link
                              href={`/app/tasks/${t.id}`}
                              className="font-bold text-slate-900 dark:text-white hover:text-[#00638E] dark:hover:text-[#BFD8E3] transition-colors"
                            >
                              {t.title}
                            </Link>
                            {!canEditTask(t) && (
                              <span title="View Only (Assigned to someone else)" className="inline-flex items-center text-amber-500">
                                <Lock className="w-3 h-3" />
                              </span>
                            )}
                            {attachmentsList.length > 0 && (
                              <span
                                onClick={() => openEditModal(t)}
                                className="inline-flex items-center gap-0.5 text-[9px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-[#000000]/60 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white cursor-pointer border border-slate-200 dark:border-[#2B2B2B]"
                                title={`${attachmentsList.length} attachment(s)`}
                              >
                                <Paperclip className="w-2.5 h-2.5 text-[#00638E] dark:text-[#BFD8E3]" />
                                <span>{attachmentsList.length}</span>
                              </span>
                            )}
                            {commentsList.length > 0 && (
                              <span
                                onClick={() => openEditModal(t)}
                                className="inline-flex items-center gap-0.5 text-[9px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-[#000000]/60 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white cursor-pointer border border-slate-200 dark:border-[#2B2B2B]"
                                title={`${commentsList.length} comment(s)`}
                              >
                                <MessageSquare className="w-2.5 h-2.5 text-[#00638E] dark:text-[#BFD8E3]" />
                                <span>{commentsList.length}</span>
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="p-3.5">
                          {proj ? (
                            <span
                              className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-lg border border-[#00638E]/25 dark:border-[#00638E]/35 bg-[#00638E]/10 dark:bg-[#00638E]/15 text-[#00638E] dark:text-[#BFD8E3]"
                            >
                              <FolderKanban className="w-3 h-3" />
                              {proj.name}
                            </span>
                          ) : (
                            <span className="text-[10px] text-slate-400 dark:text-slate-500">&mdash;</span>
                          )}
                        </td>
                        <td className="p-3.5">
                          <select
                            value={t.status}
                            disabled={!canEditTask(t)}
                            onChange={(e) => handleStatusChange(t.id, e.target.value as TaskStatus)}
                            className="text-[10px] font-semibold px-2 py-1 rounded-full bg-white dark:bg-[#000000] text-slate-900 dark:text-[#BFD8E3] border border-slate-200 dark:border-[#2B2B2B] cursor-pointer focus:outline-none focus:border-[#00638E] disabled:opacity-60 disabled:cursor-not-allowed"
                          >
                            {workspaceStatuses.map((st) => (
                              <option key={st.id} value={st.id}>
                                {st.name}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="p-3.5 min-w-[120px]">
                          <div className="space-y-1">
                            <div className="flex items-center justify-between text-[10px] font-semibold">
                              <span className="text-[#00638E] dark:text-[#BFD8E3]">{taskProgress}%</span>
                            </div>
                            <div className="h-1.5 w-24 bg-slate-100 dark:bg-[#2B2B2B] rounded-full overflow-hidden">
                              <div
                                className="h-full bg-gradient-to-r from-[#004A6B] via-[#00638E] to-[#8CB9CC] rounded-full transition-all duration-300"
                                style={{ width: `${taskProgress}%` }}
                              />
                            </div>
                          </div>
                        </td>
                        <td className="p-3.5">
                          <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${getTagColor(t.tag)}`}>
                            {t.tag}
                          </span>
                        </td>
                        <td className="p-3.5 text-slate-900 dark:text-white font-medium">{getFirstName(t.assigneeName || 'You')}</td>
                        <td className="p-3.5 text-slate-500 dark:text-slate-400">{getFirstName(t.reviewerName || 'You')}</td>
                        <td className="p-3.5 text-slate-500 dark:text-slate-400">
                          <span
                            className={`px-2 py-0.5 rounded-lg text-[10px] font-semibold border ${
                              dueStatus.isToday
                                ? 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30 font-bold'
                                : dueStatus.isOverdue
                                ? 'bg-red-500/20 text-red-600 dark:text-red-400 border-red-500/30 font-bold'
                                : 'bg-slate-100 dark:bg-[#000000]/60 border-slate-200 dark:border-[#2B2B2B] text-slate-700 dark:text-slate-300'
                            }`}
                          >
                            {t.dueDate || todayStr}
                          </span>
                        </td>
                        <td className="p-3.5 pr-6 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleSendDueAlert(t)}
                              disabled={dispatchingAlertId === t.id}
                              className="p-1 text-slate-400 hover:text-amber-500 rounded transition-colors cursor-pointer"
                              title="Send Due Date Alert Email"
                            >
                              {dispatchingAlertId === t.id ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin text-[#00638E]" />
                              ) : (
                                <Bell className="w-3.5 h-3.5" />
                              )}
                            </button>
                            <button
                              onClick={() => openEditModal(t)}
                              className="p-1 text-slate-400 hover:text-[#00638E] dark:hover:text-[#BFD8E3] rounded transition-colors cursor-pointer"
                              title={canEditTask(t) ? "Edit task" : "View task details"}
                            >
                              {canEditTask(t) ? (
                                <Edit2 className="w-3.5 h-3.5" />
                              ) : (
                                <Eye className="w-3.5 h-3.5 text-[#00638E] dark:text-[#8CB9CC]" />
                              )}
                            </button>
                            {canEditTask(t) && (
                              <button
                                disabled={deletingTaskId === t.id}
                                onClick={() => handleDelete(t.id)}
                                className="p-1 text-slate-400 hover:text-rose-500 rounded transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                                title="Delete task"
                              >
                                {deletingTaskId === t.id ? (
                                  <Loader2 className="w-3.5 h-3.5 animate-spin text-rose-500" />
                                ) : (
                                  <Trash2 className="w-3.5 h-3.5" />
                                )}
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>

                      {/* Expandable subtasks preview */}
                      {isExpanded && subtaskList.length > 0 && (
                        <tr className="bg-slate-50 dark:bg-[#000000]/40">
                          <td colSpan={9} className="py-2.5 pl-12 pr-6">
                            <div className="rounded-2xl bg-white dark:bg-[#141414] border border-slate-200 dark:border-[#2B2B2B] p-3 space-y-2 max-w-xl">
                              <div className="flex items-center gap-2 text-xs font-bold text-slate-900 dark:text-white">
                                <FolderOpen className="w-4 h-4 text-[#00638E] dark:text-[#BFD8E3]" />
                                <span>Subtasks List</span>
                              </div>
                              <div className="space-y-1.5 pl-2 border-l-2 border-[#00638E]/30 ml-2">
                                {subtaskList.map((st: any) => (
                                  <label
                                    key={st.id}
                                    className="flex items-center gap-2 cursor-pointer text-xs"
                                  >
                                    <input
                                      type="checkbox"
                                      checked={st.completed}
                                      onChange={() => toggleSubtask(t.id, st.id)}
                                      className="w-3.5 h-3.5 rounded text-[#00638E] accent-[#00638E] cursor-pointer"
                                    />
                                    <span className={st.completed ? 'line-through text-slate-400 dark:text-slate-500' : 'text-slate-800 dark:text-white font-medium'}>
                                      {st.title}
                                    </span>
                                  </label>
                                ))}
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* ========================================================================= */}
        {/* INTERACTIVE MODAL: ADD TASK (3-STEP WIZARD)                              */}
        {/* Step 1: Core Details -> Step 2: Description & Docs -> Step 3: Subtasks    */}
        {/* ========================================================================= */}
        {isModalOpen && (
          <Portal>
            <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-fade-in">
              <div className="bg-card border border-border rounded-3xl p-5 w-full max-w-xl shadow-2xl space-y-3.5 animate-scale-in backdrop-blur-xl max-h-[92vh] overflow-y-auto custom-scrollbar">
                {/* Header */}
                <div className="flex items-center justify-between pb-2.5 border-b border-border">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-xl bg-primary/15 text-primary">
                      <Plus className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-foreground">Create Task in Database</h3>
                      <p className="text-[11px] text-muted-foreground">Step {createTaskStep} of 3: {createTaskStep === 1 ? 'Core Details' : createTaskStep === 2 ? 'Description & Attachments' : 'Subtasks & Progress'}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setIsModalOpen(false)
                      setCreateTaskStep(1)
                    }}
                    className="p-1.5 rounded-xl text-muted-foreground hover:text-foreground hover:bg-accent transition-colors cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Step Navigation Bar */}
                <div className="grid grid-cols-3 gap-1.5 p-1 bg-muted/50 rounded-xl border border-border/50">
                  <button
                    type="button"
                    onClick={() => setCreateTaskStep(1)}
                    className={`py-1.5 px-2.5 rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                      createTaskStep === 1
                        ? 'bg-background text-primary shadow-sm border border-border/60'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    <span className="w-4 h-4 rounded-full bg-primary/15 text-primary text-[10px] flex items-center justify-center font-bold">1</span>
                    <span className="truncate">Core Details</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      if (!newTaskTitle.trim() || !newTaskProjectId) {
                        showToast('Please fill in Title and Project first.')
                        return
                      }
                      setCreateTaskStep(2)
                    }}
                    className={`py-1.5 px-2.5 rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                      createTaskStep === 2
                        ? 'bg-background text-primary shadow-sm border border-border/60'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    <span className="w-4 h-4 rounded-full bg-primary/15 text-primary text-[10px] flex items-center justify-center font-bold">2</span>
                    <span className="truncate">Docs & Files</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      if (!newTaskTitle.trim() || !newTaskProjectId) {
                        showToast('Please fill in Title and Project first.')
                        return
                      }
                      setCreateTaskStep(3)
                    }}
                    className={`py-1.5 px-2.5 rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                      createTaskStep === 3
                        ? 'bg-background text-primary shadow-sm border border-border/60'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    <span className="w-4 h-4 rounded-full bg-primary/15 text-primary text-[10px] flex items-center justify-center font-bold">3</span>
                    <span className="truncate">Subtasks</span>
                  </button>
                </div>

                {/* STEP 1: CORE DETAILS */}
                {createTaskStep === 1 && (
                  <div className="space-y-3 animate-fade-in">
                    {/* Task Type (Feature, Bug Fix, Custom) */}
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-foreground">Task Type</label>
                      <div className="grid grid-cols-3 gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setNewTaskType('feature')
                            setNewTaskTag('Feature')
                          }}
                          className={`py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                            newTaskType === 'feature'
                              ? 'bg-blue-600/15 border-blue-500 text-blue-500 shadow-xs ring-1 ring-blue-500/20'
                              : 'bg-muted/60 border-border text-muted-foreground hover:text-foreground'
                          }`}
                        >
                          <Sparkles className="w-3.5 h-3.5" />
                          <span>Feature</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setNewTaskType('bug')
                            setNewTaskTag('Bug Fix')
                          }}
                          className={`py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                            newTaskType === 'bug'
                              ? 'bg-rose-600/15 border-rose-500 text-rose-500 shadow-xs ring-1 ring-rose-500/20'
                              : 'bg-muted/60 border-border text-muted-foreground hover:text-foreground'
                          }`}
                        >
                          <Bug className="w-3.5 h-3.5" />
                          <span>Bug Fix</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setNewTaskType('custom')
                            setNewTaskTag(customTagInput.trim() || 'Custom')
                          }}
                          className={`py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                            newTaskType === 'custom'
                              ? 'bg-purple-600/15 border-purple-500 text-purple-400 shadow-xs ring-1 ring-purple-500/20'
                              : 'bg-muted/60 border-border text-muted-foreground hover:text-foreground'
                          }`}
                        >
                          <Layers className="w-3.5 h-3.5" />
                          <span>Custom</span>
                        </button>
                      </div>

                      {newTaskType === 'custom' && (
                        <div className="pt-1 animate-fade-in">
                          <input
                            type="text"
                            placeholder="Enter custom task type (e.g. Design, DevOps, Maintenance)..."
                            value={customTagInput}
                            onChange={(e) => {
                              setCustomTagInput(e.target.value)
                              setNewTaskTag(e.target.value.trim() || 'Custom')
                            }}
                            className="w-full px-3 py-2 rounded-xl bg-background border border-purple-500/40 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-purple-500"
                            autoFocus
                          />
                        </div>
                      )}
                    </div>

                    {/* Task Title */}
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-foreground">
                        Task Title <span className="text-destructive">*</span>
                      </label>
                      <input
                        type="text"
                        placeholder={newTaskType === 'bug' ? 'e.g. Fix memory leak in auth-service' : 'e.g. Implement payment gateway webhook'}
                        value={newTaskTitle}
                        onChange={(e) => setNewTaskTitle(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl bg-background border border-border text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                        autoFocus
                        required
                      />
                    </div>

                    {/* Mandatory Project Selection */}
                    {projects.length === 0 ? (
                      <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-600 dark:text-amber-400 space-y-1.5">
                        <div className="flex items-center gap-2 font-bold">
                          <FolderKanban className="w-4 h-4" /> Project Required Before Creating Tasks
                        </div>
                        <p className="text-[11px] text-muted-foreground leading-relaxed">
                          This workspace doesn't have any projects yet. Every task must be assigned to a project.
                        </p>
                        <Link
                          href="/app/projects"
                          className="inline-flex items-center gap-1 font-semibold text-primary hover:underline text-xs"
                        >
                          Create a Project now <ChevronRight className="w-3 h-3" />
                        </Link>
                      </div>
                    ) : (
                      <div className="space-y-1">
                        <div className="flex items-center justify-between">
                          <label className="text-xs font-semibold text-foreground">
                            Project <span className="text-destructive font-bold">*</span>
                          </label>
                          <span className="text-[10px] text-primary font-bold px-2 py-0.5 rounded-full bg-primary/10 border border-primary/20">
                            Mandatory
                          </span>
                        </div>
                        <select
                          value={newTaskProjectId}
                          required
                          onChange={(e) => setNewTaskProjectId(e.target.value)}
                          className="w-full px-3.5 py-2.5 rounded-xl bg-background border border-border text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary font-medium cursor-pointer"
                        >
                          <option value="" disabled>Select a project (Required)</option>
                          {projects.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}

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

                    {/* Priority & Due Date (Stylish Calendar Date Picker) */}
                    <div className="grid grid-cols-2 gap-2.5">
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
                        />
                      </div>
                    </div>

                    {/* Footer buttons for Step 1 */}
                    <div className="flex items-center justify-between pt-3 border-t border-border">
                      <button
                        type="button"
                        onClick={() => setIsModalOpen(false)}
                        className="px-4 py-2 rounded-xl text-xs font-semibold text-muted-foreground hover:bg-accent transition-colors cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        disabled={projects.length === 0 || !newTaskProjectId || !newTaskTitle.trim()}
                        onClick={() => setCreateTaskStep(2)}
                        className="px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-xs font-bold hover:bg-primary/90 transition-all shadow-md shadow-primary/20 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer flex items-center gap-1.5"
                      >
                        <span>Next: Description & Documents</span>
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}

                {/* STEP 2: DESCRIPTION & DOCUMENTS */}
                {createTaskStep === 2 && (
                  <div className="space-y-4 animate-fade-in">
                    {/* Task Description */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-foreground flex items-center justify-between">
                        <span>Task Description</span>
                        <span className="text-[10px] text-muted-foreground">{newTaskDescription.length} chars</span>
                      </label>
                      <textarea
                        rows={4}
                        placeholder="Provide comprehensive details, acceptance criteria, reproduction steps, or architecture specifications..."
                        value={newTaskDescription}
                        onChange={(e) => setNewTaskDescription(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl bg-background border border-border text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary custom-scrollbar resize-y"
                      />
                    </div>

                    {/* Universal File Uploader (Images + Documents) */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                          <Paperclip className="w-3.5 h-3.5 text-primary" />
                          <span>Attach Documents & Screenshots</span>
                        </label>
                        <span className="text-[10px] text-muted-foreground">
                          {newTaskAttachments.length} file{newTaskAttachments.length === 1 ? '' : 's'} attached
                        </span>
                      </div>

                      {/* Dropzone */}
                      <label className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-border/80 hover:border-primary/60 rounded-2xl bg-card/50 hover:bg-card/80 transition-all cursor-pointer group">
                        <input
                          type="file"
                          multiple
                          accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.csv,.env,.txt,.json,.yml,.yaml,.xml"
                          onChange={async (e) => {
                            const newFiles = await readFilesAsAttachments(e.target.files)
                            setNewTaskAttachments((prev) => [...prev, ...newFiles])
                            e.target.value = ''
                          }}
                          className="hidden"
                        />
                        <div className="p-3 rounded-full bg-primary/10 text-primary group-hover:scale-110 transition-transform mb-2">
                          <UploadCloud className="w-6 h-6" />
                        </div>
                        <p className="text-xs font-bold text-foreground">Click to upload or drag and drop</p>
                        <p className="text-[10px] text-muted-foreground mt-0.5 text-center">
                          Screenshots (PNG, JPG, WEBP, GIF, SVG, BMP) & Documents (PDF, Word, Excel, CSV, ENV, TXT, JSON)
                        </p>
                      </label>

                      {/* Attached Files Grid */}
                      {newTaskAttachments.length > 0 && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-56 overflow-y-auto custom-scrollbar p-1">
                          {newTaskAttachments.map((att) => {
                            const isImg = att.type.startsWith('image/') || /\.(png|jpe?g|webp|gif|svg|bmp)$/i.test(att.name)
                            return (
                              <div
                                key={att.id}
                                className="flex items-center justify-between gap-2 p-2.5 rounded-xl border border-border/70 bg-background/80 hover:bg-background transition-all shadow-xs group"
                              >
                                <div className="flex items-center gap-2.5 min-w-0">
                                  {isImg ? (
                                    <img
                                      src={att.dataUrl}
                                      alt={att.name}
                                      className="w-9 h-9 rounded-lg object-cover border border-border/60 shrink-0"
                                    />
                                  ) : (
                                    <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center shrink-0 border border-border/40">
                                      {getFileIcon(att.type, att.name)}
                                    </div>
                                  )}
                                  <div className="min-w-0">
                                    <p className="text-xs font-semibold text-foreground truncate">{att.name}</p>
                                    <p className="text-[10px] text-muted-foreground">{formatFileSize(att.size)}</p>
                                  </div>
                                </div>

                                <div className="flex items-center gap-1 shrink-0">
                                  <button
                                    type="button"
                                    onClick={() => downloadAttachment(att)}
                                    title="Download file"
                                    className="p-1.5 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors cursor-pointer"
                                  >
                                    <Download className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setNewTaskAttachments((prev) => prev.filter((a) => a.id !== att.id))}
                                    title="Remove attachment"
                                    className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors cursor-pointer"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      )}
                    </div>

                    {/* Footer buttons for Step 2 */}
                    <div className="flex items-center justify-between pt-4 border-t border-border">
                      <button
                        type="button"
                        onClick={() => setCreateTaskStep(1)}
                        className="px-4 py-2.5 rounded-xl text-xs font-semibold text-muted-foreground hover:bg-accent transition-colors cursor-pointer"
                      >
                        ← Back to Core Details
                      </button>
                      <button
                        type="button"
                        onClick={() => setCreateTaskStep(3)}
                        className="px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-xs font-bold hover:bg-primary/90 transition-all shadow-md shadow-primary/20 cursor-pointer flex items-center gap-1.5"
                      >
                        <span>Next: Subtasks & Progress</span>
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}

                {/* STEP 3: SUBTASKS & PROGRESS */}
                {createTaskStep === 3 && (
                  <div className="space-y-4 animate-fade-in">
                    {/* Subtask Input Box */}
                    <div className="p-3.5 rounded-2xl bg-muted/40 border border-border/70 space-y-3">
                      <h4 className="text-xs font-bold text-foreground flex items-center gap-2">
                        <Layers className="w-4 h-4 text-primary" />
                        <span>Add Subtask</span>
                      </h4>

                      <div className="space-y-2">
                        <input
                          type="text"
                          placeholder="Subtask title (e.g. Setup Redis cache layer)..."
                          value={newSubtaskTitle}
                          onChange={(e) => setNewSubtaskTitle(e.target.value)}
                          className="w-full px-3 py-2 rounded-xl bg-background border border-border text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                        />

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          <input
                            type="text"
                            placeholder="Optional subtask description..."
                            value={newSubtaskDesc}
                            onChange={(e) => setNewSubtaskDesc(e.target.value)}
                            className="px-3 py-2 rounded-xl bg-background border border-border text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                          />
                          <input
                            type="date"
                            value={newSubtaskDue}
                            onChange={(e) => setNewSubtaskDue(e.target.value)}
                            className="px-3 py-2 rounded-xl bg-background border border-border text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                          />
                        </div>

                        {/* Subtask Specific Attachment Uploader */}
                        <div className="flex items-center justify-between gap-2 pt-1">
                          <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-border/70 bg-background hover:bg-accent text-xs font-semibold text-muted-foreground hover:text-foreground cursor-pointer transition-colors">
                            <Paperclip className="w-3.5 h-3.5 text-primary" />
                            <span>Attach to subtask ({newSubtaskAttachments.length})</span>
                            <input
                              type="file"
                              multiple
                              accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.csv,.env,.txt,.json,.yml,.yaml,.xml"
                              onChange={async (e) => {
                                const files = await readFilesAsAttachments(e.target.files)
                                setNewSubtaskAttachments((prev) => [...prev, ...files])
                                e.target.value = ''
                              }}
                              className="hidden"
                            />
                          </label>

                          <button
                            type="button"
                            disabled={!newSubtaskTitle.trim()}
                            onClick={() => {
                              if (!newSubtaskTitle.trim()) return
                              const subtaskObj = {
                                id: 'st_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
                                title: newSubtaskTitle.trim(),
                                description: newSubtaskDesc.trim(),
                                dueDate: newSubtaskDue,
                                completed: false,
                                attachments: newSubtaskAttachments,
                              }
                              setNewTaskSubtasks((prev) => [...prev, subtaskObj])
                              setNewSubtaskTitle('')
                              setNewSubtaskDesc('')
                              setNewSubtaskAttachments([])
                            }}
                            className="px-3.5 py-1.5 rounded-xl bg-primary text-primary-foreground text-xs font-bold hover:bg-primary/90 transition-all shadow-xs disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer flex items-center gap-1"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>Add Subtask</span>
                          </button>
                        </div>

                        {/* Preview of pending subtask attachments before adding */}
                        {newSubtaskAttachments.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 pt-1">
                            {newSubtaskAttachments.map((att) => (
                              <span
                                key={att.id}
                                className="inline-flex items-center gap-1 text-[10px] bg-background border border-border px-2 py-0.5 rounded-lg text-foreground"
                              >
                                {getFileIcon(att.type, att.name)}
                                <span className="truncate max-w-[120px]">{att.name}</span>
                                <button
                                  type="button"
                                  onClick={() => setNewSubtaskAttachments((prev) => prev.filter((a) => a.id !== att.id))}
                                  className="text-muted-foreground hover:text-destructive ml-1"
                                >
                                  &times;
                                </button>
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Subtasks List */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-foreground">Subtasks Added ({newTaskSubtasks.length})</span>
                        {newTaskSubtasks.length > 0 && (
                          <span className="text-[11px] font-bold text-primary">
                            Initial Progress: {Math.round((newTaskSubtasks.filter((s) => s.completed).length / newTaskSubtasks.length) * 100)}%
                          </span>
                        )}
                      </div>

                      {newTaskSubtasks.length === 0 ? (
                        <div className="p-4 rounded-2xl border border-dashed border-border/70 text-center text-xs text-muted-foreground">
                          No subtasks added yet. You can add granular deliverables above or proceed to create the task.
                        </div>
                      ) : (
                        <div className="space-y-2 max-h-56 overflow-y-auto custom-scrollbar p-1">
                          {newTaskSubtasks.map((st, idx) => (
                            <div
                              key={st.id}
                              className="p-3 rounded-2xl border border-border/70 bg-background/80 hover:bg-background transition-all space-y-2 shadow-xs"
                            >
                              <div className="flex items-center justify-between gap-2">
                                <label className="flex items-center gap-2.5 cursor-pointer min-w-0">
                                  <input
                                    type="checkbox"
                                    checked={st.completed}
                                    onChange={() => {
                                      setNewTaskSubtasks((prev) =>
                                        prev.map((s, i) => (i === idx ? { ...s, completed: !s.completed } : s))
                                      )
                                    }}
                                    className="w-4 h-4 rounded text-primary focus:ring-primary cursor-pointer accent-primary"
                                  />
                                  <span className={`text-xs font-semibold ${st.completed ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
                                    {st.title}
                                  </span>
                                </label>

                                <button
                                  type="button"
                                  onClick={() => setNewTaskSubtasks((prev) => prev.filter((_, i) => i !== idx))}
                                  className="p-1 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors cursor-pointer"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>

                              {(st.description || st.dueDate || (st.attachments && st.attachments.length > 0)) && (
                                <div className="pl-6 space-y-1.5 text-[11px] text-muted-foreground">
                                  {st.description && <p>{st.description}</p>}
                                  <div className="flex items-center gap-3 flex-wrap">
                                    {st.dueDate && (
                                      <span className="flex items-center gap-1 text-[10px]">
                                        <Calendar className="w-3 h-3 text-primary" /> Due: {st.dueDate}
                                      </span>
                                    )}
                                    {st.attachments && st.attachments.length > 0 && (
                                      <span className="flex items-center gap-1 text-[10px] text-primary font-medium">
                                        <Paperclip className="w-3 h-3" /> {st.attachments.length} attachment{st.attachments.length === 1 ? '' : 's'}
                                      </span>
                                    )}
                                  </div>
                                  {st.attachments && st.attachments.length > 0 && (
                                    <div className="flex flex-wrap gap-1.5 pt-1">
                                      {st.attachments.map((att: TaskAttachment) => (
                                        <button
                                          key={att.id}
                                          type="button"
                                          onClick={() => downloadAttachment(att)}
                                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-muted text-[10px] text-foreground hover:text-primary border border-border/50 cursor-pointer"
                                          title="Download subtask attachment"
                                        >
                                          {getFileIcon(att.type, att.name)}
                                          <span className="truncate max-w-[100px]">{att.name}</span>
                                          <Download className="w-2.5 h-2.5 ml-1 text-primary" />
                                        </button>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Footer buttons for Step 3 */}
                    <div className="flex items-center justify-between pt-4 border-t border-border">
                      <button
                        type="button"
                        onClick={() => setCreateTaskStep(2)}
                        className="px-4 py-2.5 rounded-xl text-xs font-semibold text-muted-foreground hover:bg-accent transition-colors cursor-pointer"
                      >
                        ← Back to Documents
                      </button>
                      <button
                        type="button"
                        onClick={() => handleAddTask()}
                        disabled={isSavingTask || projects.length === 0 || !newTaskProjectId || !newTaskTitle.trim()}
                        className="px-6 py-2.5 rounded-xl bg-primary text-primary-foreground text-xs font-bold hover:bg-primary/90 transition-all shadow-md shadow-primary/25 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer flex items-center gap-2 active:scale-95"
                      >
                        {isSavingTask ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            <span>Saving Task to DB...</span>
                          </>
                        ) : (
                          <>
                            <Check className="w-4 h-4" />
                            <span>Save Task to DB</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </Portal>
        )}

        {/* ========================================================================= */}
        {/* INTERACTIVE MODAL: VIEW / EDIT TASK (TABBED DETAILS & DOWNLOADS)           */}
        {/* Tabs: Overview & Status, Documents & Screenshots, Subtasks, Comments       */}
        {/* ========================================================================= */}
        {editingTask && (() => {
          const isReadOnly = !canEditTask(editingTask)
          const proj = projects.find((p) => p.id === editProjectId)
          const calculatedSubtaskProgress = editSubtasks.length > 0
            ? Math.round((editSubtasks.filter((s: any) => s.completed).length / editSubtasks.length) * 100)
            : editProgress

          return (
            <Portal>
              <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-fade-in">
                <div className="bg-card border border-border rounded-3xl p-6 w-full max-w-2xl shadow-2xl space-y-5 animate-scale-in backdrop-blur-xl max-h-[92vh] overflow-y-auto custom-scrollbar">
                  {/* Top Header */}
                  <div className="flex items-center justify-between pb-3 border-b border-border">
                    <div className="flex items-center gap-2.5">
                      <div className={`p-2 rounded-xl ${isReadOnly ? 'bg-amber-500/15 text-amber-500' : 'bg-primary/15 text-primary'}`}>
                        {isReadOnly ? <Lock className="w-4 h-4" /> : <Edit2 className="w-4 h-4" />}
                      </div>
                      <div>
                        <h3 className="text-base font-bold text-foreground">
                          {isReadOnly ? 'Task Deliverable Details' : 'Edit Task Deliverable'}
                        </h3>
                        <p className="text-[11px] text-muted-foreground">
                          {proj ? `${proj.name} • ` : ''}{editingTask.id}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => setEditingTask(null)}
                      className="p-1.5 rounded-xl text-muted-foreground hover:text-foreground hover:bg-accent transition-colors cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  {isReadOnly && (
                    <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center gap-2 text-xs text-amber-500 font-semibold">
                      <Lock className="w-3.5 h-3.5 shrink-0" />
                      <span>View-Only Mode: You can view files, comments, and subtasks, but cannot modify task properties.</span>
                    </div>
                  )}

                  {/* Tab Navigation */}
                  <div className="grid grid-cols-4 gap-1.5 p-1 bg-muted/50 rounded-2xl border border-border/50 text-xs font-bold">
                    <button
                      type="button"
                      onClick={() => setEditingTaskTab('overview')}
                      className={`py-2 px-2 rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                        editingTaskTab === 'overview'
                          ? 'bg-background text-primary shadow-sm border border-border/60'
                          : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      <FileText className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate">Overview</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setEditingTaskTab('attachments')}
                      className={`py-2 px-2 rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                        editingTaskTab === 'attachments'
                          ? 'bg-background text-primary shadow-sm border border-border/60'
                          : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      <Paperclip className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate">Files ({editAttachments.length})</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setEditingTaskTab('subtasks')}
                      className={`py-2 px-2 rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                        editingTaskTab === 'subtasks'
                          ? 'bg-background text-primary shadow-sm border border-border/60'
                          : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      <Layers className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate">Subtasks ({editSubtasks.length})</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setEditingTaskTab('comments')}
                      className={`py-2 px-2 rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                        editingTaskTab === 'comments'
                          ? 'bg-background text-primary shadow-sm border border-border/60'
                          : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      <MessageSquare className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate">Comments ({editComments.length})</span>
                    </button>
                  </div>

                  {/* TAB 1: OVERVIEW & STATUS */}
                  {editingTaskTab === 'overview' && (
                    <div className="space-y-4 animate-fade-in">
                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-foreground">Task Title</label>
                        <input
                          type="text"
                          disabled={isReadOnly}
                          value={editTitle}
                          onChange={(e) => setEditTitle(e.target.value)}
                          className="w-full px-3.5 py-2.5 rounded-xl bg-background border border-border text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-60 disabled:cursor-not-allowed"
                          required
                        />
                      </div>

                      {/* Project Selection */}
                      {projects.length > 0 && (
                        <div className="space-y-1.5">
                          <label className="text-xs font-semibold text-foreground">Project</label>
                          <select
                            value={editProjectId}
                            disabled={isReadOnly}
                            onChange={(e) => setEditProjectId(e.target.value)}
                            className="w-full px-3.5 py-2.5 rounded-xl bg-background border border-border text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                          >
                            {projects.map((p) => (
                              <option key={p.id} value={p.id}>
                                {p.name}
                              </option>
                            ))}
                          </select>
                        </div>
                      )}

                      {/* Assigned To and Assigned By */}
                      <div className="grid grid-cols-2 gap-3">
                        {isReadOnly ? (
                          <>
                            <div className="space-y-1.5">
                              <label className="text-xs font-semibold text-foreground">Assigned To</label>
                              <input
                                type="text"
                                disabled
                                value={editAssignee || 'Unassigned'}
                                className="w-full px-3.5 py-2.5 rounded-xl bg-background border border-border text-xs text-foreground disabled:opacity-60 disabled:cursor-not-allowed"
                              />
                            </div>
                            <div className="space-y-1.5">
                              <label className="text-xs font-semibold text-foreground">Assigned By</label>
                              <input
                                type="text"
                                disabled
                                value={editAssignedBy || 'Unassigned'}
                                className="w-full px-3.5 py-2.5 rounded-xl bg-background border border-border text-xs text-foreground disabled:opacity-60 disabled:cursor-not-allowed"
                              />
                            </div>
                          </>
                        ) : (
                          <>
                            <UserSelect
                              label="Assigned To"
                              icon={User}
                              value={editAssignee}
                              onChange={setEditAssignee}
                              users={availableUsers}
                              placeholder="Select assignee..."
                            />
                            <UserSelect
                              label="Assigned By"
                              icon={UserCheck}
                              value={editAssignedBy}
                              onChange={setEditAssignedBy}
                              users={availableUsers}
                              placeholder="Select assigner..."
                            />
                          </>
                        )}
                      </div>

                      {/* Status & Priority */}
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                          <label className="text-xs font-semibold text-foreground">Status</label>
                          <select
                            value={editStatus}
                            disabled={isReadOnly}
                            onChange={(e) => setEditStatus(e.target.value as TaskStatus)}
                            className="w-full px-3.5 py-2.5 rounded-xl bg-background border border-border text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                          >
                            {workspaceStatuses.map((st) => (
                              <option key={st.id} value={st.id}>
                                {st.name}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-xs font-semibold text-foreground">Priority</label>
                          <select
                            value={editPriority}
                            disabled={isReadOnly}
                            onChange={(e) => setEditPriority(e.target.value as any)}
                            className="w-full px-3.5 py-2.5 rounded-xl bg-background border border-border text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                          >
                            <option value="low">Low</option>
                            <option value="medium">Medium</option>
                            <option value="high">High</option>
                            <option value="urgent">Urgent</option>
                          </select>
                        </div>
                      </div>

                      {/* Tag & Due Date */}
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                          <label className="text-xs font-semibold text-foreground">Tag</label>
                          <select
                            value={editTag}
                            disabled={isReadOnly}
                            onChange={(e) => setEditTag(e.target.value)}
                            className="w-full px-3.5 py-2.5 rounded-xl bg-background border border-border text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                          >
                            <option value="Frontend">Frontend</option>
                            <option value="Backend">Backend</option>
                            <option value="Design">Design</option>
                            <option value="DevOps">DevOps</option>
                            <option value="Architecture">Architecture</option>
                            <option value="Bug Fix">Bug Fix</option>
                          </select>
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-xs font-semibold text-foreground flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5 text-primary" /> Due Date
                          </label>
                          <StylishDatePicker
                            value={editDue}
                            onChange={setEditDue}
                            minDate={todayStr}
                          />
                        </div>
                      </div>

                      {/* Task Description */}
                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-foreground">Description</label>
                        <textarea
                          rows={3}
                          disabled={isReadOnly}
                          value={editDescription}
                          onChange={(e) => setEditDescription(e.target.value)}
                          placeholder="Task specifications, documentation links, or notes..."
                          className="w-full px-3.5 py-2.5 rounded-xl bg-background border border-border text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-60 disabled:cursor-not-allowed custom-scrollbar resize-y"
                        />
                      </div>

                      {/* Task Completion Progress Slider */}
                      <div className="p-3.5 rounded-2xl bg-muted/40 border border-border/70 space-y-2">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-semibold text-foreground flex items-center gap-1.5">
                            <SlidersHorizontal className="w-3.5 h-3.5 text-primary" /> Task Progress Percentage
                          </span>
                          <span className="font-bold text-primary px-2 py-0.5 rounded-full bg-primary/10 border border-primary/20">
                            {calculatedSubtaskProgress}%
                          </span>
                        </div>
                        <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-primary to-indigo-500 transition-all duration-300 rounded-full"
                            style={{ width: `${calculatedSubtaskProgress}%` }}
                          />
                        </div>
                        {editSubtasks.length === 0 ? (
                          <div className="flex items-center gap-3 pt-1">
                            <input
                              type="range"
                              min="0"
                              max="100"
                              disabled={isReadOnly}
                              value={editProgress}
                              onChange={(e) => setEditProgress(parseInt(e.target.value, 10))}
                              className="w-full accent-primary cursor-pointer disabled:cursor-not-allowed"
                            />
                          </div>
                        ) : (
                          <p className="text-[10px] text-muted-foreground">
                            Progress is automatically computed from completed subtasks ({editSubtasks.filter((s: any) => s.completed).length}/{editSubtasks.length} done).
                          </p>
                        )}
                      </div>
                    </div>
                  )}

                  {/* TAB 2: DOCUMENTS & SCREENSHOTS */}
                  {editingTaskTab === 'attachments' && (
                    <div className="space-y-4 animate-fade-in">
                      {!isReadOnly && (
                        <label className="flex flex-col items-center justify-center p-5 border-2 border-dashed border-border/80 hover:border-primary/60 rounded-2xl bg-card/50 hover:bg-card/80 transition-all cursor-pointer group">
                          <input
                            type="file"
                            multiple
                            accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.csv,.env,.txt,.json,.yml,.yaml,.xml"
                            onChange={async (e) => {
                              const newFiles = await readFilesAsAttachments(e.target.files)
                              setEditAttachments((prev) => [...prev, ...newFiles])
                              e.target.value = ''
                            }}
                            className="hidden"
                          />
                          <div className="p-2.5 rounded-full bg-primary/10 text-primary group-hover:scale-110 transition-transform mb-1.5">
                            <UploadCloud className="w-5 h-5" />
                          </div>
                          <p className="text-xs font-bold text-foreground">Upload Screenshots & Documents</p>
                          <p className="text-[10px] text-muted-foreground text-center">
                            Supports PNG, JPG, WEBP, GIF, SVG, BMP, PDF, Word, Excel, CSV, ENV, TXT, JSON
                          </p>
                        </label>
                      )}

                      {/* Uploaded Files Grid with 1-Click Downloads */}
                      {editAttachments.length === 0 ? (
                        <div className="p-8 rounded-2xl border border-dashed border-border/70 text-center space-y-2">
                          <Paperclip className="w-8 h-8 text-muted-foreground mx-auto opacity-50" />
                          <p className="text-xs font-semibold text-foreground">No documents attached yet</p>
                          <p className="text-[11px] text-muted-foreground">
                            Upload screenshots, designs, env templates, or specs to share with your team.
                          </p>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-96 overflow-y-auto custom-scrollbar p-1">
                          {editAttachments.map((att) => {
                            const isImg = att.type.startsWith('image/') || /\.(png|jpe?g|webp|gif|svg|bmp)$/i.test(att.name)
                            return (
                              <div
                                key={att.id}
                                className="flex flex-col justify-between p-3 rounded-2xl border border-border/80 bg-background/80 hover:bg-background transition-all shadow-xs space-y-2.5 group"
                              >
                                <div className="flex items-center gap-3 min-w-0">
                                  {isImg ? (
                                    <img
                                      src={att.dataUrl}
                                      alt={att.name}
                                      className="w-12 h-12 rounded-xl object-cover border border-border/60 shrink-0"
                                    />
                                  ) : (
                                    <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center shrink-0 border border-border/50">
                                      {getFileIcon(att.type, att.name)}
                                    </div>
                                  )}
                                  <div className="min-w-0">
                                    <p className="text-xs font-bold text-foreground truncate">{att.name}</p>
                                    <p className="text-[10px] text-muted-foreground">{formatFileSize(att.size)}</p>
                                    <p className="text-[9px] text-muted-foreground">
                                      {new Date(att.uploadedAt).toLocaleDateString()}
                                    </p>
                                  </div>
                                </div>

                                <div className="flex items-center justify-between pt-2 border-t border-border/40">
                                  {/* 1-Click Download Button */}
                                  <button
                                    type="button"
                                    onClick={() => downloadAttachment(att)}
                                    className="px-3 py-1.5 rounded-xl bg-primary/10 hover:bg-primary text-primary hover:text-primary-foreground text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 shadow-xs"
                                  >
                                    <Download className="w-3.5 h-3.5" />
                                    <span>Download</span>
                                  </button>

                                  {!isReadOnly && (
                                    <button
                                      type="button"
                                      onClick={() => setEditAttachments((prev) => prev.filter((a) => a.id !== att.id))}
                                      title="Delete attachment"
                                      className="p-1.5 rounded-xl text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors cursor-pointer"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  )}
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  )}

                  {/* TAB 3: SUBTASKS & PROGRESS */}
                  {editingTaskTab === 'subtasks' && (
                    <div className="space-y-4 animate-fade-in">
                      {/* Subtasks Summary Bar */}
                      <div className="p-3.5 rounded-2xl bg-muted/40 border border-border/70 space-y-2">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-semibold text-foreground flex items-center gap-1.5">
                            <Layers className="w-4 h-4 text-primary" /> Subtasks Completion
                          </span>
                          <span className="font-bold text-primary">
                            {editSubtasks.length > 0
                              ? `${editSubtasks.filter((s: any) => s.completed).length}/${editSubtasks.length} done (${calculatedSubtaskProgress}%)`
                              : '0 Subtasks'}
                          </span>
                        </div>
                        <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-primary to-emerald-500 transition-all duration-300 rounded-full"
                            style={{ width: `${calculatedSubtaskProgress}%` }}
                          />
                        </div>
                      </div>

                      {/* Add Subtask Form (if editable) */}
                      {!isReadOnly && (
                        <div className="p-3.5 rounded-2xl bg-card/60 border border-border/70 space-y-3">
                          <h4 className="text-xs font-bold text-foreground flex items-center gap-2">
                            <Plus className="w-3.5 h-3.5 text-primary" /> Add New Subtask
                          </h4>
                          <div className="space-y-2">
                            <input
                              type="text"
                              placeholder="Subtask title..."
                              value={editSubtaskTitle}
                              onChange={(e) => setEditSubtaskTitle(e.target.value)}
                              className="w-full px-3 py-2 rounded-xl bg-background border border-border text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                            />
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                              <input
                                type="text"
                                placeholder="Subtask description..."
                                value={editSubtaskDesc}
                                onChange={(e) => setEditSubtaskDesc(e.target.value)}
                                className="px-3 py-2 rounded-xl bg-background border border-border text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                              />
                              <input
                                type="date"
                                value={editSubtaskDue}
                                onChange={(e) => setEditSubtaskDue(e.target.value)}
                                className="px-3 py-2 rounded-xl bg-background border border-border text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                              />
                            </div>

                            <div className="flex items-center justify-between gap-2 pt-1">
                              <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-border/70 bg-background hover:bg-accent text-xs font-semibold text-muted-foreground hover:text-foreground cursor-pointer transition-colors">
                                <Paperclip className="w-3.5 h-3.5 text-primary" />
                                <span>Attach ({editSubtaskAttachments.length})</span>
                                <input
                                  type="file"
                                  multiple
                                  accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.csv,.env,.txt,.json,.yml,.yaml,.xml"
                                  onChange={async (e) => {
                                    const files = await readFilesAsAttachments(e.target.files)
                                    setEditSubtaskAttachments((prev) => [...prev, ...files])
                                    e.target.value = ''
                                  }}
                                  className="hidden"
                                />
                              </label>

                              <button
                                type="button"
                                disabled={!editSubtaskTitle.trim()}
                                onClick={() => {
                                  if (!editSubtaskTitle.trim()) return
                                  const subtaskObj = {
                                    id: 'st_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
                                    title: editSubtaskTitle.trim(),
                                    description: editSubtaskDesc.trim(),
                                    dueDate: editSubtaskDue,
                                    completed: false,
                                    attachments: editSubtaskAttachments,
                                  }
                                  setEditSubtasks((prev) => [...prev, subtaskObj])
                                  setEditSubtaskTitle('')
                                  setEditSubtaskDesc('')
                                  setEditSubtaskAttachments([])
                                }}
                                className="px-3.5 py-1.5 rounded-xl bg-primary text-primary-foreground text-xs font-bold hover:bg-primary/90 transition-all shadow-xs disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer flex items-center gap-1"
                              >
                                <Plus className="w-3.5 h-3.5" />
                                <span>Add Subtask</span>
                              </button>
                            </div>

                            {editSubtaskAttachments.length > 0 && (
                              <div className="flex flex-wrap gap-1.5 pt-1">
                                {editSubtaskAttachments.map((att) => (
                                  <span
                                    key={att.id}
                                    className="inline-flex items-center gap-1 text-[10px] bg-background border border-border px-2 py-0.5 rounded-lg text-foreground"
                                  >
                                    {getFileIcon(att.type, att.name)}
                                    <span className="truncate max-w-[120px]">{att.name}</span>
                                    <button
                                      type="button"
                                      onClick={() => setEditSubtaskAttachments((prev) => prev.filter((a) => a.id !== att.id))}
                                      className="text-muted-foreground hover:text-destructive ml-1"
                                    >
                                      &times;
                                    </button>
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Subtasks List */}
                      {editSubtasks.length === 0 ? (
                        <div className="p-6 rounded-2xl border border-dashed border-border/70 text-center text-xs text-muted-foreground">
                          No subtasks currently registered. Add subtasks to track granular progress.
                        </div>
                      ) : (
                        <div className="space-y-2.5 max-h-72 overflow-y-auto custom-scrollbar p-1">
                          {editSubtasks.map((st, idx) => (
                            <div
                              key={st.id}
                              className="p-3 rounded-2xl border border-border/80 bg-background/80 hover:bg-background transition-all space-y-2 shadow-xs"
                            >
                              <div className="flex items-center justify-between gap-2">
                                <label className="flex items-center gap-2.5 cursor-pointer min-w-0">
                                  <input
                                    type="checkbox"
                                    checked={st.completed}
                                    onChange={() => {
                                      setEditSubtasks((prev) =>
                                        prev.map((s, i) => (i === idx ? { ...s, completed: !s.completed } : s))
                                      )
                                    }}
                                    className="w-4 h-4 rounded text-primary focus:ring-primary cursor-pointer accent-primary"
                                  />
                                  <span className={`text-xs font-semibold ${st.completed ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
                                    {st.title}
                                  </span>
                                </label>

                                {!isReadOnly && (
                                  <button
                                    type="button"
                                    onClick={() => setEditSubtasks((prev) => prev.filter((_, i) => i !== idx))}
                                    className="p-1 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors cursor-pointer"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </div>

                              {(st.description || st.dueDate || (st.attachments && st.attachments.length > 0)) && (
                                <div className="pl-6 space-y-1.5 text-[11px] text-muted-foreground">
                                  {st.description && <p>{st.description}</p>}
                                  {st.dueDate && (
                                    <div className="flex items-center gap-1 text-[10px]">
                                      <Calendar className="w-3 h-3 text-primary" /> Due: {st.dueDate}
                                    </div>
                                  )}
                                  {/* Subtask Attachments with 1-Click Downloads */}
                                  {st.attachments && st.attachments.length > 0 && (
                                    <div className="space-y-1 pt-1">
                                      <span className="text-[10px] font-semibold text-foreground flex items-center gap-1">
                                        <Paperclip className="w-3 h-3 text-primary" /> Subtask Documents ({st.attachments.length}):
                                      </span>
                                      <div className="flex flex-wrap gap-1.5">
                                        {st.attachments.map((att: TaskAttachment) => (
                                          <button
                                            key={att.id}
                                            type="button"
                                            onClick={() => downloadAttachment(att)}
                                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-card border border-border/60 text-[10px] text-foreground hover:text-primary transition-all cursor-pointer shadow-xs"
                                            title="Download subtask attachment"
                                          >
                                            {getFileIcon(att.type, att.name)}
                                            <span className="truncate max-w-[130px] font-medium">{att.name}</span>
                                            <Download className="w-3 h-3 text-primary ml-1" />
                                          </button>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* TAB 4: COMMENTS & ACTIVITY */}
                  {editingTaskTab === 'comments' && (
                    <div className="space-y-4 animate-fade-in">
                      {/* Post Comment Input */}
                      <div className="p-3.5 rounded-2xl bg-muted/40 border border-border/70 space-y-2.5">
                        <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                          <MessageSquare className="w-3.5 h-3.5 text-primary" />
                          <span>Leave a Comment</span>
                        </label>
                        <div className="flex items-start gap-2">
                          <textarea
                            rows={2}
                            placeholder="Write an update, note or question for the team..."
                            value={newCommentText}
                            onChange={(e) => setNewCommentText(e.target.value)}
                            className="w-full px-3 py-2 rounded-xl bg-background border border-border text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary custom-scrollbar resize-y"
                          />
                          <button
                            type="button"
                            disabled={!newCommentText.trim()}
                            onClick={handleAddComment}
                            className="p-2.5 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-all shadow-md shadow-primary/20 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer shrink-0"
                            title="Send Comment"
                          >
                            <Send className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      {/* Comment History List */}
                      <div className="space-y-2.5">
                        <div className="flex items-center justify-between text-xs font-semibold text-foreground">
                          <span>Comment & Discussion History ({editComments.length})</span>
                        </div>

                        {editComments.length === 0 ? (
                          <div className="p-8 rounded-2xl border border-dashed border-border/70 text-center space-y-1.5">
                            <MessageSquare className="w-7 h-7 text-muted-foreground mx-auto opacity-40" />
                            <p className="text-xs font-semibold text-foreground">No comments yet</p>
                            <p className="text-[11px] text-muted-foreground">
                              Be the first to leave a comment on this task.
                            </p>
                          </div>
                        ) : (
                          <div className="space-y-3 max-h-80 overflow-y-auto custom-scrollbar p-1">
                            {editComments.map((c) => (
                              <div
                                key={c.id}
                                className="flex items-start gap-3 p-3.5 rounded-2xl border border-border/70 bg-background/80 hover:bg-background transition-all shadow-xs"
                              >
                                <div className="w-7 h-7 rounded-full bg-primary/15 border border-primary/30 text-primary font-bold text-xs flex items-center justify-center shrink-0">
                                  {(c.authorName || 'U').charAt(0).toUpperCase()}
                                </div>
                                <div className="min-w-0 flex-1 space-y-1">
                                  <div className="flex items-center justify-between gap-2">
                                    <span className="text-xs font-bold text-foreground truncate">{c.authorName}</span>
                                    <span className="text-[10px] text-muted-foreground shrink-0">
                                      {new Date(c.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • {new Date(c.createdAt).toLocaleDateString()}
                                    </span>
                                  </div>
                                  <p className="text-xs text-foreground/90 leading-relaxed whitespace-pre-wrap">
                                    {c.content}
                                  </p>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Modal Footer */}
                  <div className="flex items-center justify-between pt-3 border-t border-border">
                    <div>
                      {!isReadOnly && canEditTask(editingTask) && (
                        <button
                          type="button"
                          onClick={() => setTaskToDelete(editingTask)}
                          className="px-3.5 py-2 rounded-xl bg-destructive/10 text-destructive hover:bg-destructive/20 text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Delete Task</span>
                        </button>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setEditingTask(null)}
                        className="px-4 py-2.5 rounded-xl text-xs font-semibold text-muted-foreground hover:bg-accent transition-colors cursor-pointer"
                      >
                        {isReadOnly ? 'Close' : 'Cancel'}
                      </button>
                      {!isReadOnly && (
                        <button
                          type="button"
                          onClick={() => handleSaveEdit()}
                          disabled={isUpdatingTask || !editTitle.trim()}
                          className="px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-xs font-bold hover:bg-primary/90 transition-all shadow-md shadow-primary/20 cursor-pointer flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed active:scale-95"
                        >
                          {isUpdatingTask ? (
                            <>
                              <Loader2 className="w-4 h-4 animate-spin" />
                              <span>Saving Changes...</span>
                            </>
                          ) : (
                            <>
                              <Check className="w-4 h-4" />
                              <span>Save Changes to DB</span>
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </Portal>
          )
        })()}
      </div>

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
                  <h3 className="text-base font-bold text-foreground">Delete Task</h3>
                  <p className="text-xs text-muted-foreground">Permanent deletion confirmation</p>
                </div>
              </div>

              <p className="text-xs text-muted-foreground leading-relaxed">
                Are you sure you want to delete task <strong className="text-foreground">"{taskToDelete.title}"</strong>? This will permanently remove the task from the database. This action cannot be undone.
              </p>

              <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-border">
                <button
                  type="button"
                  onClick={() => setTaskToDelete(null)}
                  disabled={isConfirmingDelete}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-muted-foreground hover:bg-accent transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={confirmDeleteTask}
                  disabled={isConfirmingDelete}
                  className="px-4 py-2 rounded-xl bg-destructive text-destructive-foreground text-xs font-bold hover:bg-destructive/90 transition-all shadow-md shadow-destructive/20 disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
                >
                  {isConfirmingDelete && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>{isConfirmingDelete ? 'Deleting...' : 'Delete Task'}</span>
                </button>
              </div>
            </div>
          </div>
        </Portal>
      )}

      <EditSpaceStatusesModal
        isOpen={statusModalOpen}
        onClose={() => setStatusModalOpen(false)}
        workspaceId={currentWorkspace?.id || 'default'}
        spaceName={currentWorkspace?.name || 'Workspace'}
      />
    </>
  )
}
