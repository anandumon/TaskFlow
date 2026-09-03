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
  Split,
  LayoutGrid,
  CheckSquare,
  AlertCircle,
  Clock,
  Sliders,
  X,
} from 'lucide-react'
import { useWorkspaceStore } from '@/stores/workspace-store'
import { useTaskStore, Task, TaskStatus, TaskEnvironment } from '@/stores/task-store'
import { useProjectStore } from '@/stores/project-store'
import { useStatusStore } from '@/stores/status-store'
import { EditSpaceStatusesModal } from '@/components/EditSpaceStatusesModal'
import { Project } from '@/types'
import { ALL_ENVIRONMENTS } from '@/constants'

export default function ProjectDetailsPage() {
  const params = useParams()
  const router = useRouter()
  const projectId = params?.id as string

  const { currentWorkspace } = useWorkspaceStore()
  const { tasks, loadTasks, createTask, updateTask, updateStatus, updateEnvironment, deleteTask } = useTaskStore()
  const { projects, loadProjects } = useProjectStore()

  const [viewMode, setViewMode] = useState<'board' | 'list'>('board')
  const [differentiationMode, setDifferentiationMode] = useState<'all' | 'split'>('all')
  const [activeCategoryTab, setActiveCategoryTab] = useState<string>('all')
  const [sortBy, setSortBy] = useState<'assignee' | 'due' | 'priority' | 'status' | 'title'>('assignee')
  const [selectedUserFilter, setSelectedUserFilter] = useState<string>('all')

  // Add Task Modal State
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [newTaskType, setNewTaskType] = useState<'feature' | 'bug'>('feature')
  const [newTaskTitle, setNewTaskTitle] = useState('')
  const [newTaskTag, setNewTaskTag] = useState('Backend')
  const [newTaskAssignee, setNewTaskAssignee] = useState('You')
  const [newTaskDue, setNewTaskDue] = useState(new Date().toISOString().split('T')[0])
  const [newTaskPriority, setNewTaskPriority] = useState<'low' | 'medium' | 'high'>('medium')
  const [newTaskStatus, setNewTaskStatus] = useState<TaskStatus>('todo')
  const [newTaskEnv, setNewTaskEnv] = useState<TaskEnvironment>('DEV')

  // Edit Task Modal State
  const [editingTask, setEditingTask] = useState<Task | null>(null)
  const [editTitle, setEditTitle] = useState('')
  const [editTag, setEditTag] = useState('')
  const [editAssignee, setEditAssignee] = useState('')
  const [editDue, setEditDue] = useState('')
  const [editPriority, setEditPriority] = useState<'low' | 'medium' | 'high' | 'urgent'>('medium')
  const [editStatus, setEditStatus] = useState<TaskStatus>('todo')
  const [editEnv, setEditEnv] = useState<TaskEnvironment>('DEV')

  const [toastMessage, setToastMessage] = useState<string | null>(null)

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

  // Determine if a task is a Bug
  const isBugTask = useCallback((t: Task) => {
    const title = (t.title || '').toLowerCase()
    const tag = (t.tag || '').toLowerCase()
    return (
      tag.includes('bug') ||
      tag.includes('fix') ||
      title.includes('bug') ||
      title.includes('fix') ||
      title.includes('vulnerability') ||
      title.includes('issue')
    )
  }, [])

  const bugTasks = useMemo(() => projectTasks.filter(isBugTask), [projectTasks, isBugTask])
  const nonBugTasks = useMemo(() => projectTasks.filter((t) => !isBugTask(t)), [projectTasks, isBugTask])

  // Collect all registered users/assignees added to this project
  const availableAssignees = useMemo(() => {
    return Array.from(
      new Set([
        'You',
        'Admin User',
        ...projectTasks.map((t) => t.assigneeName).filter(Boolean) as string[],
      ])
    )
  }, [projectTasks])

  // Filtered according to category tab & selected user
  const getFilteredTasks = useCallback((taskList: Task[]) => {
    let list = [...taskList]

    if (activeCategoryTab === 'bugs') {
      list = list.filter(isBugTask)
    } else if (activeCategoryTab === 'features') {
      list = list.filter((t) => !isBugTask(t))
    }

    if (selectedUserFilter !== 'all') {
      list = list.filter((t) => (t.assigneeName || 'You') === selectedUserFilter)
    }

    // Apply Sorting
    list.sort((a, b) => {
      if (sortBy === 'assignee') {
        const nameA = a.assigneeName || 'You'
        const nameB = b.assigneeName || 'You'
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
        const statusWeights: Record<string, number> = { todo: 1, in_progress: 2, in_review: 3, done: 4 }
        return (statusWeights[a.status] || 0) - (statusWeights[b.status] || 0)
      }
      if (sortBy === 'title') {
        return (a.title || '').localeCompare(b.title || '')
      }
      return 0
    })

    return list
  }, [activeCategoryTab, selectedUserFilter, sortBy, isBugTask])

  const displayTasks = useMemo(() => getFilteredTasks(projectTasks), [getFilteredTasks, projectTasks])

  const [statusModalOpen, setStatusModalOpen] = useState(false)
  const { getStatuses } = useStatusStore()
  const workspaceStatuses = getStatuses(currentWorkspace?.id || 'default')

  const columns = workspaceStatuses.map((st) => ({
    id: st.id,
    title: st.name,
    color: st.color,
    category: st.category,
  }))

  const handleStatusChange = async (taskId: string, newStatus: TaskStatus) => {
    const wsId = currentWorkspace?.id || '50a4c29f-09ff-4480-8b6b-495381247d0f'
    await updateStatus(taskId, newStatus)
    loadProjects(wsId)
    showToast(`Status updated to ${newStatus.replace('_', ' ').toUpperCase()}`)
  }

  const handleEnvChange = async (taskId: string, newEnv: TaskEnvironment) => {
    const wsId = currentWorkspace?.id || '50a4c29f-09ff-4480-8b6b-495381247d0f'
    if (newEnv === 'MAIN') {
      await updateStatus(taskId, 'done', 'MAIN')
      showToast('Task promoted to MAIN (Production) and marked Done!')
    } else {
      await updateEnvironment(taskId, newEnv)
      showToast(`Environment updated to ${newEnv}`)
    }
    loadProjects(wsId)
  }

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newTaskTitle.trim()) return

    const wsId = currentWorkspace?.id || '50a4c29f-09ff-4480-8b6b-495381247d0f'
    try {
      await createTask(wsId, {
        title: newTaskTitle.trim(),
        projectId: projectId,
        tag: newTaskTag,
        assigneeName: newTaskAssignee,
        dueDate: newTaskDue,
        priority: newTaskPriority,
        status: newTaskStatus,
        environment: newTaskEnv,
        subtasks: '[]',
        filesChanged: '[]',
      })
      setNewTaskTitle('')
      setIsModalOpen(false)
      loadProjects(wsId)
      showToast('New deliverable added to project!')
    } catch (err: any) {
      showToast(err?.message || 'Failed to create deliverable')
    }
  }

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingTask || !editTitle.trim()) return

    const wsId = currentWorkspace?.id || '50a4c29f-09ff-4480-8b6b-495381247d0f'
    try {
      await updateTask(editingTask.id, {
        title: editTitle.trim(),
        tag: editTag,
        assigneeName: editAssignee,
        dueDate: editDue,
        priority: editPriority,
        status: editStatus,
        environment: editEnv,
      })
      setEditingTask(null)
      loadProjects(wsId)
      showToast('Deliverable updated!')
    } catch (err: any) {
      showToast(err?.message || 'Failed to update deliverable')
    }
  }

  const handleDelete = async (id: string) => {
    const wsId = currentWorkspace?.id || '50a4c29f-09ff-4480-8b6b-495381247d0f'
    await deleteTask(id)
    loadProjects(wsId)
    showToast('Task removed from project')
  }

  const openEditModal = (t: Task) => {
    setEditingTask(t)
    setEditTitle(t.title)
    setEditTag(t.tag)
    setEditAssignee(t.assigneeName || 'You')
    setEditDue(t.dueDate || new Date().toISOString().split('T')[0])
    setEditPriority(t.priority)
    setEditStatus(t.status)
    setEditEnv(t.environment || 'DEV')
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

  const getTagColor = (tag: string) => {
    const t = (tag || '').toLowerCase()
    if (t.includes('bug') || t.includes('fix') || t.includes('vulnerab')) return 'bg-rose-500/15 text-rose-500 border border-rose-500/30'
    if (t.includes('backend')) return 'bg-purple-500/15 text-purple-500 border border-purple-500/30'
    if (t.includes('frontend') || t.includes('ui')) return 'bg-blue-500/15 text-blue-500 border border-blue-500/30'
    if (t.includes('devops') || t.includes('infra')) return 'bg-amber-500/15 text-amber-500 border border-amber-500/30'
    return 'bg-emerald-500/15 text-emerald-500 border border-emerald-500/30'
  }

  let projectEnvs: string[] = [...ALL_ENVIRONMENTS]
  try {
    if (project?.environments) {
      projectEnvs = JSON.parse(project.environments)
    }
  } catch {
    projectEnvs = project?.environments ? project.environments.split(',') : [...ALL_ENVIRONMENTS]
  }

  const renderKanbanBoard = (taskList: Task[]) => {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        {columns.map((col) => {
          const colTasks = taskList.filter((t) => t.status === col.id)

          return (
            <div
              key={col.id}
              className="bg-card/70 border border-border/80 rounded-3xl p-4 flex flex-col min-h-[400px] shadow-sm space-y-4"
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

              <div className="space-y-3 flex-1">
                {colTasks.length === 0 ? (
                  <div className="text-center py-10 text-xs text-muted-foreground border border-dashed border-border/60 rounded-2xl">
                    No deliverables
                  </div>
                ) : (
                  colTasks.map((t) => {
                    const isBug = isBugTask(t)
                    const envBadge = getEnvBadge(t.environment || 'DEV')

                    return (
                      <div
                        key={t.id}
                        className="p-4 rounded-2xl border shadow-xs hover:shadow-lg transition-all space-y-3 group relative overflow-hidden"
                        style={{
                          backgroundColor: `${projColor}14`,
                          borderColor: `${projColor}55`,
                          boxShadow: `0 4px 20px -2px ${projColor}15`,
                        }}
                      >
                        {/* Top Accent Strip */}
                        <div
                          className="absolute top-0 left-0 right-0 h-1"
                          style={{ backgroundColor: projColor }}
                        />

                        {/* Tag + Bug Indicator */}
                        <div className="flex items-center justify-between gap-1 pt-0.5">
                          <span className={`text-[9px] font-extrabold px-2 py-0.5 rounded-full ${getTagColor(t.tag)}`}>
                            {t.tag}
                          </span>

                          {isBug ? (
                            <span className="flex items-center gap-1 text-[9px] font-extrabold px-2 py-0.5 rounded-md bg-rose-500/20 text-rose-500 border border-rose-500/40">
                              <Bug className="w-2.5 h-2.5" /> Bug / Fix
                            </span>
                          ) : (
                            <span className="flex items-center gap-1 text-[9px] font-extrabold px-2 py-0.5 rounded-md bg-blue-500/20 text-blue-500 border border-blue-500/40">
                              <Sparkles className="w-2.5 h-2.5" /> Feature
                            </span>
                          )}
                        </div>

                        {/* Title Link */}
                        <Link
                          href={`/app/tasks/${t.id}`}
                          className="block text-xs font-bold leading-relaxed group-hover:underline transition-colors"
                          style={{ color: projColor }}
                        >
                          {t.title}
                        </Link>

                        {/* Microservice / Branch Pill if available */}
                        {t.branchName && (() => {
                          try {
                            const parsed = JSON.parse(t.branchName)
                            if (Array.isArray(parsed) && parsed.length > 0) {
                              return (
                                <div className="flex items-center gap-1 text-[9px] font-mono text-primary bg-background/80 px-2 py-1 rounded-lg border border-border/80 truncate">
                                  <GitBranch className="w-3 h-3 shrink-0" />
                                  <span className="truncate">{parsed[0].branchName}</span>
                                </div>
                              )
                            }
                          } catch {}
                          return (
                            <div className="flex items-center gap-1 text-[9px] font-mono text-primary bg-background/80 px-2 py-1 rounded-lg border border-border/80 truncate">
                              <GitBranch className="w-3 h-3 shrink-0" />
                              <span className="truncate">{t.branchName}</span>
                            </div>
                          )
                        })()}

                        {/* Subtasks Count */}
                        {t.subtasks && t.subtasks !== '[]' && (() => {
                          try {
                            const stList = JSON.parse(t.subtasks)
                            if (!stList || stList.length === 0) return null
                            const doneCount = stList.filter((s: any) => s.completed).length
                            return (
                              <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground font-medium">
                                <span className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-muted/80 border border-border/40">
                                  <CheckSquare className="w-3 h-3 text-primary" /> {doneCount}/{stList.length} subtasks
                                </span>
                              </div>
                            )
                          } catch { return null }
                        })()}

                        {/* Bottom Controls */}
                        <div className="flex items-center justify-between text-[10px] text-muted-foreground pt-2.5 border-t border-border/50">
                          <div className="flex items-center gap-2">
                            <div className="flex items-center gap-1">
                              <User className="w-3 h-3 text-muted-foreground" />
                              <span className="font-semibold text-foreground">{t.assigneeName || 'You'}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Calendar className="w-3 h-3 text-primary" />
                              <span>{t.dueDate || 'Today'}</span>
                            </div>
                          </div>

                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => openEditModal(t)}
                              className="p-1 text-muted-foreground hover:text-primary transition-colors rounded"
                              title="Edit task"
                            >
                              <Edit2 className="w-3 h-3" />
                            </button>

                            <select
                              value={t.status}
                              onChange={(e) => handleStatusChange(t.id, e.target.value as TaskStatus)}
                              className="text-[10px] bg-muted/90 px-1.5 py-0.5 rounded text-muted-foreground font-semibold focus:outline-none cursor-pointer"
                            >
                              <option value="todo">To Do</option>
                              <option value="in_progress">In Progress</option>
                              <option value="in_review">In Review</option>
                              <option value="done">Done</option>
                            </select>

                            <button
                              onClick={() => handleDelete(t.id)}
                              className="p-1 text-muted-foreground hover:text-destructive transition-colors rounded"
                              title="Delete task"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
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
    )
  }

  const renderListView = (taskList: Task[]) => {
    return (
      <div className="bg-card border border-border/80 rounded-2xl overflow-hidden shadow-sm">
        <table className="w-full text-left text-xs">
          <thead className="bg-muted/50 border-b border-border text-muted-foreground text-[10px] font-bold uppercase tracking-wider">
            <tr>
              <th className="p-3.5 pl-6">Deliverable Title</th>
              <th className="p-3.5">Type</th>
              <th className="p-3.5">Status</th>
              <th className="p-3.5">Environment</th>
              <th className="p-3.5">Category</th>
              <th className="p-3.5">Assignee</th>
              <th className="p-3.5">Due Date</th>
              <th className="p-3.5 pr-6 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/60">
            {taskList.length === 0 ? (
              <tr>
                <td colSpan={8} className="p-8 text-center text-xs text-muted-foreground">
                  No deliverables match the selected criteria.
                </td>
              </tr>
            ) : (
              taskList.map((t) => {
                const isBug = isBugTask(t)
                const envBadge = getEnvBadge(t.environment || 'DEV')

                return (
                  <tr key={t.id} className="hover:bg-accent/40 transition-colors">
                    <td className="p-3.5 pl-6 font-medium text-foreground">
                      <Link
                        href={`/app/tasks/${t.id}`}
                        className="font-bold hover:underline transition-colors"
                        style={{ color: projColor }}
                      >
                        {t.title}
                      </Link>
                    </td>
                    <td className="p-3.5">
                      {isBug ? (
                        <span className="text-[10px] font-extrabold px-2.5 py-0.5 rounded-lg bg-rose-500/15 text-rose-600 border border-rose-500/30 inline-flex items-center gap-1">
                          <Bug className="w-3 h-3" /> Bug
                        </span>
                      ) : (
                        <span className="text-[10px] font-extrabold px-2.5 py-0.5 rounded-lg bg-blue-500/15 text-blue-600 border border-blue-500/30 inline-flex items-center gap-1">
                          <Sparkles className="w-3 h-3" /> Feature
                        </span>
                      )}
                    </td>
                    <td className="p-3.5">
                      <select
                        value={t.status}
                        onChange={(e) => handleStatusChange(t.id, e.target.value as TaskStatus)}
                        className="text-[10px] font-semibold px-2 py-1 rounded-full bg-primary/10 text-primary border-none cursor-pointer focus:outline-none"
                      >
                        <option value="todo">To Do</option>
                        <option value="in_progress">In Progress</option>
                        <option value="in_review">In Review</option>
                        <option value="done">Done</option>
                      </select>
                    </td>
                    <td className="p-3.5">
                      <select
                        value={t.environment || 'DEV'}
                        disabled={t.status === 'done'}
                        onChange={(e) => handleEnvChange(t.id, e.target.value as TaskEnvironment)}
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full border cursor-pointer focus:outline-none ${envBadge.style}`}
                      >
                        {projectEnvs.map((e) => (
                          <option key={e} value={e}>
                            {e}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="p-3.5">
                      <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${getTagColor(t.tag)}`}>
                        {t.tag}
                      </span>
                    </td>
                    <td className="p-3.5 font-medium text-foreground">{t.assigneeName || 'You'}</td>
                    <td className="p-3.5 text-muted-foreground">{t.dueDate || 'Today'}</td>
                    <td className="p-3.5 pr-6 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => openEditModal(t)}
                          className="p-1 text-muted-foreground hover:text-primary rounded transition-colors"
                          title="Edit task"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(t.id)}
                          className="p-1 text-muted-foreground hover:text-destructive rounded transition-colors"
                          title="Delete task"
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
    )
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto animate-fade-in pb-12">
      {toastMessage && (
        <div className="fixed top-6 right-6 z-50 flex items-center gap-2 bg-emerald-600 text-white px-4 py-3 rounded-2xl shadow-xl animate-fade-in text-xs font-semibold">
          <CheckCircle2 className="w-4 h-4" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header Banner */}
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
              <ArrowLeft className="w-3.5 h-3.5" /> Back to Projects & Pipelines
            </Link>
            <h1 className="text-2xl font-extrabold tracking-tight" style={{ color: projColor }}>
              {project?.name || 'Project Deliverables'}
            </h1>
            {project?.description && project.description !== 'Comprehensive project milestones & deliverables' ? (
              <p className="text-xs text-muted-foreground max-w-2xl">{project.description}</p>
            ) : null}
          </div>

          <div className="flex items-center gap-2.5 shrink-0 self-start sm:self-auto">
            <button
              onClick={() => setStatusModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl border border-border bg-card/80 hover:bg-accent text-xs font-bold text-foreground transition-all shadow-sm active:scale-95 cursor-pointer"
              title="Edit Space Statuses (ClickUp style)"
            >
              <Sliders className="w-3.5 h-3.5 text-primary" />
              <span>Statuses</span>
            </button>

            <button
              onClick={() => setIsModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-xs font-bold hover:bg-primary/90 transition-all shadow-md active:scale-95 cursor-pointer"
            >
              <Plus className="w-4 h-4" /> Add Task to Project
            </button>
          </div>
        </div>

        {/* Metrics Summary Strip */}
        <div className="pt-3 border-t border-border/50 grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-3 rounded-2xl bg-background/80 border border-border/60">
            <span className="text-[10px] font-bold text-muted-foreground uppercase">Total Deliverables</span>
            <div className="text-lg font-extrabold text-foreground mt-0.5">{projectTasks.length}</div>
          </div>

          <div className="p-3 rounded-2xl bg-background/80 border border-border/60">
            <span className="text-[10px] font-bold text-rose-500 uppercase flex items-center gap-1">
              <Bug className="w-3 h-3" /> Bugs & Fixes
            </span>
            <div className="text-lg font-extrabold text-rose-500 mt-0.5">{bugTasks.length}</div>
          </div>

          <div className="p-3 rounded-2xl bg-background/80 border border-border/60">
            <span className="text-[10px] font-bold text-blue-500 uppercase flex items-center gap-1">
              <Sparkles className="w-3 h-3" /> Feature Tasks
            </span>
            <div className="text-lg font-extrabold text-blue-500 mt-0.5">{nonBugTasks.length}</div>
          </div>

          <div className="p-3 rounded-2xl bg-background/80 border border-border/60">
            <span className="text-[10px] font-bold text-muted-foreground uppercase">Weighted Progress</span>
            <div className="text-lg font-extrabold mt-0.5" style={{ color: projColor }}>
              {project?.progress || 0}%
            </div>
          </div>
        </div>
      </div>

      {/* Controls Bar: Category Tabs, User Selector, Sort By, Differentiation Toggle & View Toggle */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-card/80 border border-border/80 p-3.5 rounded-2xl shadow-xs">
        {/* Category Tabs (All Tasks, Bugs & Fixes, Features) */}
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
            <Bug className="w-3.5 h-3.5" /> Bugs & Fixes ({bugTasks.length})
          </button>
          <button
            onClick={() => setActiveCategoryTab('features')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1 ${
              activeCategoryTab === 'features'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-blue-500/10 text-blue-600 hover:bg-blue-500/20'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" /> Features ({nonBugTasks.length})
          </button>
        </div>

        {/* Sort & User Filter Controls */}
        <div className="flex items-center gap-2.5 flex-wrap ml-auto">
          {/* User / Registered Assignee Selector */}
          <div className="flex items-center gap-1.5 bg-muted/80 px-3 py-1.5 rounded-xl border border-border text-xs">
            <User className="w-3.5 h-3.5 text-primary" />
            <span className="text-[10px] text-muted-foreground uppercase font-bold">User:</span>
            <select
              value={selectedUserFilter}
              onChange={(e) => setSelectedUserFilter(e.target.value)}
              className="bg-transparent text-foreground font-bold focus:outline-none cursor-pointer"
            >
              <option value="all">All Users ({availableAssignees.length})</option>
              {availableAssignees.map((u) => (
                <option key={u} value={u}>
                  {u}
                </option>
              ))}
            </select>
          </div>

          {/* Sort Selector */}
          <div className="flex items-center gap-1.5 bg-muted/80 px-3 py-1.5 rounded-xl border border-border text-xs">
            <ArrowUpDown className="w-3.5 h-3.5 text-primary" />
            <span className="text-[10px] text-muted-foreground uppercase font-bold">Sort by:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="bg-transparent text-foreground font-bold focus:outline-none cursor-pointer"
            >
              <option value="assignee">Assignee / User</option>
              <option value="priority">Priority (High to Low)</option>
              <option value="due">Due Date</option>
              <option value="status">Status</option>
              <option value="title">Title (A-Z)</option>
            </select>
          </div>

          {/* Differentiation Mode (Split Bugs vs Tasks) */}
          <button
            type="button"
            onClick={() => setDifferentiationMode(differentiationMode === 'all' ? 'split' : 'all')}
            className={`px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
              differentiationMode === 'split'
                ? 'bg-primary/15 border-primary text-primary shadow-xs'
                : 'bg-muted/70 border-border text-muted-foreground hover:text-foreground'
            }`}
            title="Separate Bugs and Tasks into dedicated sections"
          >
            <Split className="w-3.5 h-3.5" />
            <span>Separate Bugs & Tasks</span>
          </button>

          {/* Board / List Toggle */}
          <div className="flex items-center bg-muted/80 p-1 rounded-xl border border-border">
            <button
              onClick={() => setViewMode('board')}
              className={`p-1.5 rounded-lg transition-all ${
                viewMode === 'board' ? 'bg-background text-primary shadow-xs' : 'text-muted-foreground hover:text-foreground'
              }`}
              title="Board View"
            >
              <Columns className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded-lg transition-all ${
                viewMode === 'list' ? 'bg-background text-primary shadow-xs' : 'text-muted-foreground hover:text-foreground'
              }`}
              title="List View"
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      {differentiationMode === 'split' ? (
        <div className="space-y-8 animate-fade-in">
          {/* Section 1: 🐛 Bugs & Defect Fixes */}
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 rounded-2xl bg-rose-500/10 border border-rose-500/30">
              <h2 className="text-sm font-extrabold text-rose-500 flex items-center gap-2">
                <Bug className="w-4 h-4" /> Bugs, Vulnerabilities & Hotfixes ({bugTasks.length})
              </h2>
              <span className="text-[10px] font-mono font-bold text-rose-500 px-2 py-0.5 rounded-md bg-rose-500/20">
                Requires QA & Verification
              </span>
            </div>
            {viewMode === 'board' ? renderKanbanBoard(bugTasks) : renderListView(bugTasks)}
          </div>

          {/* Section 2: ✨ Feature Tasks & Core Deliverables */}
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 rounded-2xl bg-blue-500/10 border border-blue-500/30">
              <h2 className="text-sm font-extrabold text-blue-500 flex items-center gap-2">
                <Sparkles className="w-4 h-4" /> Feature Deliverables & Enhancements ({nonBugTasks.length})
              </h2>
              <span className="text-[10px] font-mono font-bold text-blue-500 px-2 py-0.5 rounded-md bg-blue-500/20">
                Pipeline Milestones
              </span>
            </div>
            {viewMode === 'board' ? renderKanbanBoard(nonBugTasks) : renderListView(nonBugTasks)}
          </div>
        </div>
      ) : (
        <div>
          {viewMode === 'board' ? renderKanbanBoard(displayTasks) : renderListView(displayTasks)}
        </div>
      )}

      {/* --- ADD TASK MODAL (Project Pre-selected) --- */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-md animate-fade-in">
          <div className="w-full max-w-lg bg-card border border-border rounded-3xl p-6 shadow-2xl space-y-4 animate-scale-in">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                <Plus className="w-4 h-4 text-primary" /> Add Task to {project?.name}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-xl text-muted-foreground hover:text-foreground"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateTask} className="space-y-4">
              {/* Deliverable Type (Bug vs Feature) */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-muted-foreground uppercase">Deliverable Type</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setNewTaskType('feature')
                      if (newTaskTag === 'Bug Fix') setNewTaskTag('Backend')
                    }}
                    className={`p-2.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                      newTaskType === 'feature'
                        ? 'bg-blue-600/15 border-blue-500 text-blue-500 shadow-xs'
                        : 'bg-muted/60 border-border text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Feature Task</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setNewTaskType('bug')
                      setNewTaskTag('Bug Fix')
                    }}
                    className={`p-2.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                      newTaskType === 'bug'
                        ? 'bg-rose-600/15 border-rose-500 text-rose-500 shadow-xs'
                        : 'bg-muted/60 border-border text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    <Bug className="w-3.5 h-3.5" />
                    <span>Bug & Fix</span>
                  </button>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-muted-foreground uppercase">Deliverable Title</label>
                <input
                  type="text"
                  placeholder={newTaskType === 'bug' ? 'e.g. Fix memory leak in auth-service...' : 'e.g. Implement payment gateway webhook...'}
                  value={newTaskTitle}
                  onChange={(e) => setNewTaskTitle(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-background border border-border text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase">Category / Tag</label>
                  <select
                    value={newTaskTag}
                    onChange={(e) => setNewTaskTag(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-background border border-border text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="Backend">Backend</option>
                    <option value="Frontend">Frontend</option>
                    <option value="Bug Fix">Bug Fix / Vulnerability</option>
                    <option value="DevOps">DevOps & Infra</option>
                    <option value="Testing">Testing & QA</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase">Assignee</label>
                  <input
                    type="text"
                    value={newTaskAssignee}
                    onChange={(e) => setNewTaskAssignee(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-background border border-border text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase">Priority</label>
                  <select
                    value={newTaskPriority}
                    onChange={(e) => setNewTaskPriority(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl bg-background border border-border text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase">Status</label>
                  <select
                    value={newTaskStatus}
                    onChange={(e) => setNewTaskStatus(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl bg-background border border-border text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="todo">To Do</option>
                    <option value="in_progress">In Progress</option>
                    <option value="in_review">In Review</option>
                    <option value="done">Done</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase">Due Date</label>
                  <input
                    type="date"
                    value={newTaskDue}
                    onChange={(e) => setNewTaskDue(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-background border border-border text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-muted hover:bg-accent text-xs font-semibold text-foreground transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-bold hover:bg-primary/90 transition-all shadow-md"
                >
                  Create Deliverable
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- EDIT TASK MODAL --- */}
      {editingTask && (
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
                  <input
                    type="text"
                    value={editTag}
                    onChange={(e) => setEditTag(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-background border border-border text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase">Assignee</label>
                  <input
                    type="text"
                    value={editAssignee}
                    onChange={(e) => setEditAssignee(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-background border border-border text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  />
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
                    value={editStatus}
                    onChange={(e) => setEditStatus(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl bg-background border border-border text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="todo">To Do</option>
                    <option value="in_progress">In Progress</option>
                    <option value="in_review">In Review</option>
                    <option value="done">Done</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase">Due Date</label>
                  <input
                    type="date"
                    value={editDue}
                    onChange={(e) => setEditDue(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-background border border-border text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
                <button
                  type="button"
                  onClick={() => setEditingTask(null)}
                  className="px-4 py-2 rounded-xl bg-muted hover:bg-accent text-xs font-semibold text-foreground transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-bold hover:bg-primary/90 transition-all shadow-md"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ClickUp Style Edit Space Statuses Modal */}
      <EditSpaceStatusesModal
        isOpen={statusModalOpen}
        onClose={() => setStatusModalOpen(false)}
        workspaceId={currentWorkspace?.id || 'default'}
        spaceName={project?.name || 'Project'}
      />
    </div>
  )
}
