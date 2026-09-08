'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  CheckSquare,
  Plus,
  Filter,
  Columns,
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
  GripVertical,
} from 'lucide-react'
import { useWorkspaceStore } from '@/stores/workspace-store'
import { useTaskStore, Task, TaskStatus, TaskEnvironment } from '@/stores/task-store'
import { useProjectStore } from '@/stores/project-store'
import { useStatusStore, CustomStatus } from '@/stores/status-store'
import { UserGuideModal } from '@/components/user-guide-modal'
import { EditSpaceStatusesModal } from '@/components/EditSpaceStatusesModal'
import { Sliders } from 'lucide-react'

export default function TasksPage() {
  const { currentWorkspace } = useWorkspaceStore()
  const { tasks, loadTasks, createTask, updateTask, updateStatus, updateEnvironment, deleteTask, toggleSubtask } = useTaskStore()
  const { projects, loadProjects } = useProjectStore()

  const todayStr = new Date().toISOString().split('T')[0] // 'YYYY-MM-DD'

  const [viewMode, setViewMode] = useState<'board' | 'list'>('board')
  const [filterTag, setFilterTag] = useState<string>('all')
  const [filterEnv, setFilterEnv] = useState<string>('all')
  const [filterProject, setFilterProject] = useState<string>('all')
  const [guideModalOpen, setGuideModalOpen] = useState(false)
  const [expandedTasks, setExpandedTasks] = useState<Record<string, boolean>>({})

  const toggleTaskTree = (taskId: string) => {
    setExpandedTasks(prev => ({ ...prev, [taskId]: !prev[taskId] }))
  }

  // Add Task Modal State
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [newTaskType, setNewTaskType] = useState<'feature' | 'bug'>('feature')
  const [newTaskTitle, setNewTaskTitle] = useState('')
  const [newTaskProjectId, setNewTaskProjectId] = useState('')
  const [newTaskTag, setNewTaskTag] = useState('Frontend')
  const [newTaskAssignee, setNewTaskAssignee] = useState('You')
  const [newTaskDue, setNewTaskDue] = useState(todayStr)
  const [newTaskPriority, setNewTaskPriority] = useState<'low' | 'medium' | 'high'>('medium')
  const [newTaskStatus, setNewTaskStatus] = useState<TaskStatus>('todo')
  const [newTaskEnv, setNewTaskEnv] = useState<TaskEnvironment>('DEV')

  // Edit Task Modal State
  const [editingTask, setEditingTask] = useState<Task | null>(null)
  const [editTitle, setEditTitle] = useState('')
  const [editProjectId, setEditProjectId] = useState('')
  const [editTag, setEditTag] = useState('')
  const [editAssignee, setEditAssignee] = useState('')
  const [editDue, setEditDue] = useState('')
  const [editPriority, setEditPriority] = useState<'low' | 'medium' | 'high' | 'urgent'>('medium')
  const [editStatus, setEditStatus] = useState<TaskStatus>('todo')
  const [editEnv, setEditEnv] = useState<TaskEnvironment>('DEV')

  const [toastMessage, setToastMessage] = useState<string | null>(null)
  const [statusModalOpen, setStatusModalOpen] = useState(false)

  const { getStatuses, reorderStatuses, progressIconsEnabled } = useStatusStore()
  const workspaceStatuses = getStatuses(currentWorkspace?.id || 'default')

  // Drag and Drop State for Columns and Tasks
  const [draggedColId, setDraggedColId] = useState<string | null>(null)
  const [dragOverColId, setDragOverColId] = useState<string | null>(null)
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null)
  const [taskDragOverColId, setTaskDragOverColId] = useState<string | null>(null)

  const handleColDragStart = (e: React.DragEvent, colId: string) => {
    e.dataTransfer.setData('type', 'column')
    e.dataTransfer.setData('col_id', colId)
    e.dataTransfer.effectAllowed = 'move'
    setDraggedColId(colId)
  }

  const handleColDragOver = (e: React.DragEvent, colId: string) => {
    if (draggedColId && draggedColId !== colId) {
      e.preventDefault()
      e.dataTransfer.dropEffect = 'move'
      setDragOverColId(colId)
    }
  }

  const handleColDragLeave = (colId: string) => {
    if (dragOverColId === colId) {
      setDragOverColId(null)
    }
  }

  const handleColDrop = (e: React.DragEvent, targetColId: string) => {
    e.preventDefault()
    if (!draggedColId || draggedColId === targetColId) {
      setDraggedColId(null)
      setDragOverColId(null)
      return
    }

    const currentStatuses = [...workspaceStatuses]
    const fromIndex = currentStatuses.findIndex((s) => s.id === draggedColId)
    const toIndex = currentStatuses.findIndex((s) => s.id === targetColId)

    if (fromIndex !== -1 && toIndex !== -1) {
      const [moved] = currentStatuses.splice(fromIndex, 1)
      currentStatuses.splice(toIndex, 0, moved)
      const updated = currentStatuses.map((s, idx) => ({ ...s, order: idx }))
      reorderStatuses(currentWorkspace?.id || 'default', updated)
      showToast(`Position updated: "${moved.name}" column moved`)
    }

    setDraggedColId(null)
    setDragOverColId(null)
  }

  const handleColDragEnd = () => {
    setDraggedColId(null)
    setDragOverColId(null)
  }

  const handleTaskDragStart = (e: React.DragEvent, taskId: string) => {
    e.stopPropagation()
    e.dataTransfer.setData('type', 'task')
    e.dataTransfer.setData('task_id', taskId)
    e.dataTransfer.effectAllowed = 'move'
    setDraggedTaskId(taskId)
  }

  const handleTaskDragOverCol = (e: React.DragEvent, colId: string) => {
    if (draggedTaskId) {
      e.preventDefault()
      e.stopPropagation()
      e.dataTransfer.dropEffect = 'move'
      setTaskDragOverColId(colId)
    }
  }

  const handleTaskDragLeaveCol = (colId: string) => {
    if (taskDragOverColId === colId) {
      setTaskDragOverColId(null)
    }
  }

  const handleTaskDropOnCol = (e: React.DragEvent, targetColId: string) => {
    e.preventDefault()
    e.stopPropagation()
    if (!draggedTaskId) return

    const task = tasks.find((t) => t.id === draggedTaskId)
    if (task && task.status !== targetColId) {
      updateStatus(draggedTaskId, targetColId as TaskStatus)
      const targetCol = columns.find((c) => c.id === targetColId)
      if (targetCol?.category === 'CLOSED') {
        updateEnvironment(draggedTaskId, 'MAIN')
      }
      showToast(`Moved "${task.title}" to ${targetCol?.title || targetColId}`)
    }

    setDraggedTaskId(null)
    setTaskDragOverColId(null)
  }

  const handleTaskDragEnd = () => {
    setDraggedTaskId(null)
    setTaskDragOverColId(null)
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

  const columns = workspaceStatuses.map((st) => ({
    id: st.id,
    title: st.name,
    color: st.color,
    category: st.category,
    desc:
      st.category === 'CLOSED'
        ? 'Completed & deployed'
        : st.category === 'ACTIVE'
        ? 'Active progress'
        : 'Pending tasks',
  }))

  const getTagColor = (tag: string) => {
    switch (tag) {
      case 'Design': return 'bg-pink-500/10 text-pink-600 dark:text-pink-400'
      case 'DevOps': return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
      case 'Backend': return 'bg-blue-500/10 text-blue-600 dark:text-blue-400'
      case 'Architecture': return 'bg-purple-500/10 text-purple-600 dark:text-purple-400'
      case 'Frontend': return 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400'
      default: return 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400'
    }
  }

  const getEnvBadge = (env: TaskEnvironment) => {
    switch (env) {
      case 'DEV':
        return {
          label: 'DEV',
          style: 'bg-sky-500/15 text-sky-700 dark:text-sky-300 border-sky-500/30',
          dot: 'bg-sky-500',
        }
      case 'SIT':
        return {
          label: 'SIT',
          style: 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30',
          dot: 'bg-amber-500',
        }
      case 'UAT':
        return {
          label: 'UAT',
          style: 'bg-purple-500/15 text-purple-700 dark:text-purple-300 border-purple-500/30',
          dot: 'bg-purple-500',
        }
      case 'RELEASE':
        return {
          label: 'RELEASE',
          style: 'bg-pink-500/15 text-pink-700 dark:text-pink-300 border-pink-500/30',
          dot: 'bg-pink-500',
        }
      case 'MAIN':
        return {
          label: 'MAIN',
          style: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30',
          dot: 'bg-emerald-500',
        }
      default:
        return {
          label: 'DEV',
          style: 'bg-muted text-muted-foreground border-border',
          dot: 'bg-muted-foreground',
        }
    }
  }

  const getProjectColor = (proj?: any, projId?: string) => {
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
    const seed = proj?.name || proj?.id || projId || 'TaskFlow'
    let hash = 0
    for (let i = 0; i < seed.length; i++) {
      hash = seed.charCodeAt(i) + ((hash << 5) - hash)
    }
    return colorPalette[Math.abs(hash) % colorPalette.length]
  }

  const getProjectEnvs = (projId?: string) => {
    if (!projId) return ['DEV', 'SIT', 'UAT', 'RELEASE', 'MAIN']
    const p = projects.find(proj => proj.id === projId)
    if (!p || !p.environments) return ['DEV', 'SIT', 'UAT', 'RELEASE', 'MAIN']
    return p.environments.split(',')
  }

  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newTaskTitle.trim()) return

    const wsId = currentWorkspace?.id || '50a4c29f-09ff-4480-8b6b-495381247d0f'
    try {
      const isDone = newTaskStatus === 'done' || newTaskEnv === 'MAIN'
      await createTask(wsId, {
        projectId: newTaskProjectId || undefined,
        title: newTaskTitle.trim(),
        tag: newTaskTag,
        tagColor: getTagColor(newTaskTag),
        assigneeName: newTaskAssignee,
        dueDate: newTaskDue || todayStr,
        status: isDone ? 'done' : newTaskStatus,
        environment: isDone ? 'MAIN' : newTaskEnv,
        priority: newTaskPriority,
      })
      setNewTaskTitle('')
      setNewTaskDue(todayStr)
      setIsModalOpen(false)
      loadProjects(wsId)
      showToast('Task saved to database successfully!')
    } catch (err: any) {
      showToast(err?.message || 'Task creation failed')
    }
  }

  const openEditModal = (task: Task) => {
    setEditingTask(task)
    setEditTitle(task.title)
    setEditProjectId(task.projectId || '')
    setEditTag(task.tag)
    setEditAssignee(task.assigneeName || 'You')
    setEditDue(task.dueDate || todayStr)
    setEditPriority(task.priority || 'medium')
    setEditStatus(task.status)
    setEditEnv(task.environment || 'DEV')
  }

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingTask || !editTitle.trim()) return

    const wsId = currentWorkspace?.id || '50a4c29f-09ff-4480-8b6b-495381247d0f'
    try {
      const isDone = editStatus === 'done' || editEnv === 'MAIN'
      await updateTask(editingTask.id, {
        projectId: editProjectId || undefined,
        title: editTitle.trim(),
        tag: editTag,
        assigneeName: editAssignee,
        dueDate: editDue,
        priority: editPriority,
        status: isDone ? 'done' : editStatus,
        environment: isDone ? 'MAIN' : editEnv,
      })
      setEditingTask(null)
      loadProjects(wsId)
      showToast('Task updated in database!')
    } catch (err: any) {
      showToast(err?.message || 'Failed to update task')
    }
  }

  const handleStatusChange = async (taskId: string, newStatus: TaskStatus) => {
    const wsId = currentWorkspace?.id || '50a4c29f-09ff-4480-8b6b-495381247d0f'
    await updateStatus(taskId, newStatus)
    loadProjects(wsId)
    showToast(`Task moved to ${newStatus.replace('_', ' ').toUpperCase()}`)
  }

  const handleEnvChange = async (taskId: string, newEnv: TaskEnvironment) => {
    const wsId = currentWorkspace?.id || '50a4c29f-09ff-4480-8b6b-495381247d0f'
    // If MAIN is selected, automatically advance status to Done!
    if (newEnv === 'MAIN') {
      await updateStatus(taskId, 'done', 'MAIN')
      showToast('Task promoted to MAIN & moved to Done!')
    } else {
      await updateEnvironment(taskId, newEnv)
      showToast(`Review environment updated to ${newEnv}`)
    }
    loadProjects(wsId)
  }

  const handleDelete = async (taskId: string) => {
    const wsId = currentWorkspace?.id || '50a4c29f-09ff-4480-8b6b-495381247d0f'
    await deleteTask(taskId)
    loadProjects(wsId)
    showToast('Task deleted from database')
  }

  const filteredTasks = tasks.filter((t) => {
    const matchesTag = filterTag === 'all' || t.tag?.toLowerCase() === filterTag.toLowerCase()
    const matchesEnv = filterEnv === 'all' || t.environment?.toUpperCase() === filterEnv.toUpperCase()
    const matchesProj = filterProject === 'all' || t.projectId === filterProject
    return matchesTag && matchesEnv && matchesProj
  })

  return (
    <>
      <UserGuideModal isOpen={guideModalOpen} onClose={() => setGuideModalOpen(false)} />

      <div className="space-y-6 max-w-7xl mx-auto animate-fade-in">
        {toastMessage && (
          <div className="fixed top-6 right-6 z-50 flex items-center gap-2 bg-emerald-600 text-white px-4 py-3 rounded-2xl shadow-xl animate-fade-in text-xs font-semibold">
            <CheckCircle2 className="w-4 h-4" />
            <span>{toastMessage}</span>
          </div>
        )}

        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
              <CheckSquare className="w-6 h-6 text-primary" /> My Tasks & Board
            </h1>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Guide Tour Button */}
            <button
              onClick={() => setGuideModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-card hover:bg-accent border border-border text-xs font-semibold text-primary transition-all shadow-sm active:scale-95"
            >
              <Sparkles className="w-3.5 h-3.5" /> User Guide
            </button>

            {/* Project Filter */}
            {projects.length > 0 && (
              <div className="flex items-center gap-1.5 bg-muted px-3 py-1.5 rounded-xl border border-border text-xs">
                <FolderKanban className="w-3.5 h-3.5 text-muted-foreground" />
                <select
                  value={filterProject}
                  onChange={e => setFilterProject(e.target.value)}
                  className="bg-transparent text-foreground text-xs focus:outline-none cursor-pointer font-medium"
                >
                  <option value="all">All Projects ({projects.length})</option>
                  {projects.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Environment Filter */}
            <div className="flex items-center gap-1.5 bg-muted px-3 py-1.5 rounded-xl border border-border text-xs">
              <Server className="w-3.5 h-3.5 text-muted-foreground" />
              <select
                value={filterEnv}
                onChange={e => setFilterEnv(e.target.value)}
                className="bg-transparent text-foreground text-xs focus:outline-none cursor-pointer font-medium"
              >
                <option value="all">All Envs</option>
                <option value="DEV">DEV</option>
                <option value="SIT">SIT</option>
                <option value="UAT">UAT</option>
                <option value="RELEASE">RELEASE</option>
                <option value="MAIN">MAIN</option>
              </select>
            </div>

            {/* Tag Filter */}
            <div className="flex items-center gap-1.5 bg-muted px-3 py-1.5 rounded-xl border border-border text-xs">
              <Filter className="w-3.5 h-3.5 text-muted-foreground" />
              <select
                value={filterTag}
                onChange={e => setFilterTag(e.target.value)}
                className="bg-transparent text-foreground text-xs focus:outline-none cursor-pointer font-medium"
              >
                <option value="all">All Tags ({tasks.length})</option>
                <option value="Design">Design</option>
                <option value="Backend">Backend</option>
                <option value="Frontend">Frontend</option>
                <option value="DevOps">DevOps</option>
                <option value="Architecture">Architecture</option>
                <option value="Database">Database</option>
              </select>
            </div>

            {/* View toggle */}
            <div className="flex items-center p-1 bg-muted rounded-xl border border-border">
              <button
                onClick={() => setViewMode('board')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${viewMode === 'board'
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                  }`}
              >
                <Columns className="w-3.5 h-3.5" /> Board
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${viewMode === 'list'
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                  }`}
              >
                <List className="w-3.5 h-3.5" /> List
              </button>
            </div>

            {/* ClickUp Style Edit Space Statuses Trigger */}
            <button
              onClick={() => setStatusModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-border bg-card hover:bg-accent text-xs font-semibold text-foreground transition-all shadow-sm active:scale-95 cursor-pointer"
              title="Edit Space Statuses (ClickUp style)"
            >
              <Sliders className="w-3.5 h-3.5 text-primary" />
              <span className="hidden sm:inline">Statuses</span>
            </button>

            <button
              onClick={() => {
                setNewTaskDue(todayStr)
                setIsModalOpen(true)
              }}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 shadow-md shadow-primary/20 transition-all active:scale-95"
            >
              <Plus className="w-4 h-4" /> Add Task
            </button>
          </div>
        </div>

        {/* Board View - Horizontal Kanban Workflow matching Statuses Structure */}
        {viewMode === 'board' && (
          <div className="flex gap-4 items-start overflow-x-auto pb-6 pt-1 px-1 scrollbar-thin scrollbar-thumb-border/80 scrollbar-track-transparent">
            {columns.map((col) => {
              const colTasks = filteredTasks.filter(
                (t) =>
                  t.status === col.id ||
                  (col.id === 'todo' && !workspaceStatuses.some((ws) => ws.id === t.status))
              )
              const isClosed = col.category === 'CLOSED' || col.id === 'done' || col.id === 'complete'

              const isDraggingThisCol = draggedColId === col.id
              const isDragOverThisCol = dragOverColId === col.id
              const isTaskDragOverThisCol = taskDragOverColId === col.id

              return (
                <div
                  key={col.id}
                  onDragOver={(e) => handleColDragOver(e, col.id)}
                  onDragLeave={() => handleColDragLeave(col.id)}
                  onDrop={(e) => handleColDrop(e, col.id)}
                  className={`w-[320px] min-w-[300px] max-w-[340px] shrink-0 bg-card/75 border rounded-2xl p-4 space-y-3 backdrop-blur-sm shadow-sm flex flex-col transition-all duration-200 ${
                    isDraggingThisCol
                      ? 'opacity-40 border-dashed border-primary ring-2 ring-primary/20 scale-[0.98]'
                      : isDragOverThisCol
                      ? 'border-primary ring-2 ring-primary/60 bg-primary/[0.04] scale-[1.02] shadow-lg'
                      : isTaskDragOverThisCol
                      ? 'border-primary/80 ring-2 ring-primary/40 bg-accent/30'
                      : 'border-border/70 hover:border-border'
                  }`}
                >
                  {/* Column Header (Draggable to reorder columns) */}
                  <div
                    draggable={true}
                    onDragStart={(e) => handleColDragStart(e, col.id)}
                    onDragEnd={handleColDragEnd}
                    className="flex items-center justify-between pb-2.5 border-b border-border/50 cursor-grab active:cursor-grabbing group/header select-none"
                    title="Drag column header to change position"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <GripVertical className="w-3.5 h-3.5 text-muted-foreground/30 group-hover/header:text-muted-foreground/90 shrink-0 transition-colors" />
                      <div
                        className="w-3 h-3 rounded-full flex items-center justify-center shrink-0"
                        style={{
                          border: `2px solid ${col.color}`,
                          backgroundColor: isClosed ? col.color : 'transparent',
                        }}
                      >
                        {isClosed && <CheckCircle2 className="w-2 h-2 text-white" />}
                      </div>
                      <div className="truncate">
                        <span className="text-xs font-bold text-foreground uppercase tracking-wide truncate">
                          {col.title}
                        </span>
                        <span className="ml-2 text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground font-semibold">
                          {colTasks.length}
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        setNewTaskStatus(col.id)
                        setNewTaskEnv(isClosed ? 'MAIN' : 'DEV')
                        setNewTaskDue(todayStr)
                        setIsModalOpen(true)
                      }}
                      title="Add task to this column"
                      className="p-1 rounded-lg text-muted-foreground hover:text-primary hover:bg-accent transition-colors cursor-pointer shrink-0"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Subtitle explaining environment lifecycle rule */}
                  {(col.id === 'in_review' || col.category === 'ACTIVE') && (
                    <div className="text-[10px] text-purple-600 dark:text-purple-400 bg-purple-500/10 px-2.5 py-1 rounded-lg font-medium flex items-center gap-1.5">
                      <GitBranch className="w-3 h-3" />
                      <span>{col.desc}</span>
                    </div>
                  )}
                  {isClosed && (
                    <div className="text-[10px] text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-lg font-medium flex items-center gap-1.5">
                      <CheckCircle2 className="w-3 h-3" />
                      <span>Merged to Production (MAIN)</span>
                    </div>
                  )}

                  {/* Task list in col */}
                  <div
                    onDragOver={(e) => handleTaskDragOverCol(e, col.id)}
                    onDragLeave={() => handleTaskDragLeaveCol(col.id)}
                    onDrop={(e) => handleTaskDropOnCol(e, col.id)}
                    className={`space-y-2.5 min-h-[160px] rounded-xl transition-colors ${
                      isTaskDragOverThisCol ? 'bg-primary/[0.04] p-1.5 border-2 border-dashed border-primary/50' : ''
                    }`}
                  >
                    {colTasks.length === 0 ? (
                      <div className={`text-center py-8 text-xs rounded-xl border-2 border-dashed transition-colors ${
                        isTaskDragOverThisCol
                          ? 'border-primary text-primary font-semibold bg-primary/10'
                          : 'border-border/40 text-muted-foreground'
                      }`}>
                        {isTaskDragOverThisCol ? 'Drop task here' : `No tasks in ${col.title.toLowerCase()}`}
                      </div>
                    ) : (
                      colTasks.map((task) => {
                        const envBadge = getEnvBadge(task.environment || 'DEV')
                        const allowedEnvs = getProjectEnvs(task.projectId)
                        const proj = projects.find(p => p.id === task.projectId)
                        const projColor = getProjectColor(proj, task.projectId)
                        const isDraggingTask = draggedTaskId === task.id

                        return (
                          <div
                            key={task.id}
                            draggable={true}
                            onDragStart={(e) => handleTaskDragStart(e, task.id)}
                            onDragEnd={handleTaskDragEnd}
                            className={`p-4 rounded-2xl border shadow-xs hover:shadow-lg transition-all space-y-3 group relative overflow-hidden cursor-grab active:cursor-grabbing select-none ${
                              isDraggingTask ? 'opacity-35 scale-[0.98] border-dashed border-primary' : ''
                            }`}
                            style={{
                              backgroundColor: `${projColor}14`,
                              borderColor: `${projColor}55`,
                              boxShadow: `0 4px 20px -2px ${projColor}20`,
                            }}
                          >
                            {/* Top Accent Strip */}
                            <div
                              className="absolute top-0 left-0 right-0 h-1"
                              style={{ backgroundColor: projColor }}
                            />

                            {/* Tags & Badges */}
                            <div className="flex items-center justify-between gap-1 pt-0.5">
                              <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${getTagColor(task.tag)}`}>
                                {task.tag}
                              </span>

                              {/* Project Badge */}
                              {proj && (
                                <div
                                  className="flex items-center gap-1.5 text-[10px] font-extrabold px-2.5 py-1 rounded-lg border shadow-xs"
                                  style={{
                                    backgroundColor: `${projColor}25`,
                                    color: projColor,
                                    borderColor: `${projColor}60`,
                                  }}
                                >
                                  <FolderKanban className="w-3 h-3" />
                                  <span>{proj.name}</span>
                                </div>
                              )}
                            </div>

                            {/* Task Title (Click to open Dedicated Details Screen) */}
                            <Link
                              href={`/app/tasks/${task.id}`}
                              className="block text-xs font-bold leading-relaxed group-hover:underline transition-colors"
                              style={{
                                color: projColor,
                              }}
                            >
                              {task.title}
                            </Link>

                            {/* Optional subtle subtask count indicator */}
                            {task.subtasks && task.subtasks !== '[]' && (() => {
                              try {
                                const stList = JSON.parse(task.subtasks)
                                if (!stList || stList.length === 0) return null
                                const doneCount = stList.filter((s: any) => s.completed).length
                                return (
                                  <div className="flex items-center gap-2 text-[10px] text-muted-foreground font-medium pt-0.5">
                                    <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-muted/80 border border-border/50">
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
                                  <User className="w-3 h-3" />
                                  <span>{task.assigneeName || 'You'}</span>
                                </div>
                                <div className="flex items-center gap-1 font-medium">
                                  <Calendar className="w-3 h-3 text-primary" />
                                  <span>{task.dueDate || todayStr}</span>
                                </div>
                              </div>

                              <div className="flex items-center gap-1">
                                {/* Edit button */}
                                <button
                                  onClick={() => openEditModal(task)}
                                  title="Edit task"
                                  className="p-1 text-muted-foreground hover:text-primary transition-colors rounded"
                                >
                                  <Edit2 className="w-3 h-3" />
                                </button>

                                {/* Quick Move Status Dropdown */}
                                <select
                                  value={task.status}
                                  onChange={(e) => handleStatusChange(task.id, e.target.value as TaskStatus)}
                                  className="text-[10px] bg-muted/80 px-1.5 py-0.5 rounded text-muted-foreground focus:outline-none cursor-pointer hover:text-foreground font-medium"
                                >
                                  <option value="todo">To Do</option>
                                  <option value="in_progress">In Progress</option>
                                  <option value="in_review">In Review</option>
                                  <option value="done">Done</option>
                                </select>

                                {/* Delete button */}
                                <button
                                  onClick={() => handleDelete(task.id)}
                                  title="Delete task from database"
                                  className="p-1 text-muted-foreground hover:text-destructive transition-colors rounded"
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
        )}

        {/* List View */}
        {viewMode === 'list' && (
          <div className="bg-card border border-border/80 rounded-2xl overflow-hidden shadow-sm">
            <table className="w-full text-left text-xs">
              <thead className="bg-muted/50 border-b border-border text-muted-foreground text-[10px] font-bold uppercase tracking-wider">
                <tr>
                  <th className="p-3.5 pl-6">Task Title & Subtasks</th>
                  <th className="p-3.5">Project</th>
                  <th className="p-3.5">Status</th>
                  <th className="p-3.5">Environment</th>
                  <th className="p-3.5">Category</th>
                  <th className="p-3.5">Assignee</th>
                  <th className="p-3.5">Due Date</th>
                  <th className="p-3.5 pr-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {filteredTasks.map((t) => {
                  const envBadge = getEnvBadge(t.environment || 'DEV')
                  const allowedEnvs = getProjectEnvs(t.projectId)
                  const proj = projects.find(p => p.id === t.projectId)
                  const projColor = getProjectColor(proj, t.projectId)

                  let subtaskList: any[] = []
                  try {
                    subtaskList = JSON.parse(t.subtasks || '[]')
                  } catch {
                    subtaskList = []
                  }
                  const doneCount = subtaskList.filter((s: any) => s.completed).length
                  const isExpanded = expandedTasks[t.id] ?? true // default expanded to show folder

                  return (
                    <React.Fragment key={t.id}>
                      <tr className="hover:bg-accent/40 transition-colors">
                        <td className="p-3.5 pl-6 font-medium text-foreground">
                          <div className="flex items-center gap-2">
                            {subtaskList.length > 0 && (
                              <button
                                type="button"
                                onClick={() => toggleTaskTree(t.id)}
                                className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors shrink-0"
                                title={isExpanded ? 'Collapse subtasks folder' : 'Expand subtasks folder'}
                              >
                                {isExpanded ? (
                                  <FolderOpen className="w-4 h-4 text-amber-500" />
                                ) : (
                                  <Folder className="w-4 h-4 text-amber-500" />
                                )}
                              </button>
                            )}
                            <Link
                              href={`/app/tasks/${t.id}`}
                              className="font-bold hover:underline transition-colors"
                              style={{ color: projColor }}
                            >
                              {t.title}
                            </Link>
                            {subtaskList.length > 0 && (
                              <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                                {doneCount}/{subtaskList.length}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="p-3.5">
                          {proj ? (
                            <span
                              className="text-[10px] font-extrabold px-2.5 py-1 rounded-lg border inline-flex items-center gap-1 shadow-xs"
                              style={{
                                backgroundColor: `${projColor}20`,
                                color: projColor,
                                borderColor: `${projColor}50`,
                              }}
                            >
                              <FolderKanban className="w-3 h-3" />
                              {proj.name}
                            </span>
                          ) : (
                            <span className="text-[10px] text-muted-foreground">&mdash;</span>
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
                            {allowedEnvs.map(e => (
                              <option key={e} value={e}>{e}</option>
                            ))}
                          </select>
                        </td>
                        <td className="p-3.5">
                          <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${getTagColor(t.tag)}`}>
                            {t.tag}
                          </span>
                        </td>
                        <td className="p-3.5 text-muted-foreground">{t.assigneeName || 'You'}</td>
                        <td className="p-3.5 text-muted-foreground">{t.dueDate || todayStr}</td>
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

                      {/* Nested Folder Structure in List View */}
                      {isExpanded && subtaskList.length > 0 && (
                        <tr className="bg-muted/15">
                          <td colSpan={8} className="py-2.5 pl-12 pr-6">
                            <div className="rounded-2xl bg-card/80 border border-border/80 p-3 space-y-2 max-w-2xl">
                              <div className="flex items-center gap-2 text-xs font-bold text-foreground">
                                <FolderOpen className="w-4 h-4 text-amber-500 fill-amber-500/20" />
                                <span className="font-mono text-[11px] text-primary">subtasks/</span>
                                <span className="text-[10px] text-muted-foreground">({doneCount}/{subtaskList.length} completed)</span>
                              </div>

                              <div className="space-y-1.5 pl-2 border-l-2 border-primary/20 ml-2">
                                {subtaskList.map((st: any, sIdx: number) => (
                                  <div key={st.id || sIdx} className="flex items-center justify-between gap-2 p-1.5 rounded-xl hover:bg-muted/60 transition-colors">
                                    <label className="flex items-center gap-2 cursor-pointer min-w-0">
                                      <input
                                        type="checkbox"
                                        checked={st.completed}
                                        onChange={() => toggleSubtask(t.id, st.id)}
                                        className="w-3.5 h-3.5 rounded text-primary focus:ring-primary cursor-pointer accent-primary"
                                      />
                                      <FileText className={`w-3.5 h-3.5 shrink-0 ${st.completed ? 'text-emerald-500' : 'text-sky-400'}`} />
                                      <span className={`text-xs truncate ${st.completed ? 'line-through text-muted-foreground' : 'text-foreground font-medium'}`}>
                                        {st.title}
                                      </span>
                                    </label>

                                    {st.branchName && (
                                      <span className="font-mono text-[9px] text-primary flex items-center gap-1 bg-muted px-2 py-0.5 rounded border border-border">
                                        <GitBranch className="w-2.5 h-2.5" />
                                        {(() => {
                                          try {
                                            const pb = JSON.parse(st.branchName)
                                            if (Array.isArray(pb) && pb.length > 0) return pb[0].branchName
                                          } catch { }
                                          return st.branchName
                                        })()}
                                      </span>
                                    )}
                                  </div>
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

        {/* Interactive Modal: Add Task */}
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
            <div className="bg-card border border-border rounded-2xl p-6 w-full max-w-md shadow-2xl space-y-4 animate-scale-in">
              <div className="flex items-center justify-between pb-3 border-b border-border">
                <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                  <Plus className="w-4 h-4 text-primary" /> Create Task in Database
                </h3>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleAddTask} className="space-y-4">
                {/* Deliverable Type (Feature vs Bug) */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">Task Type</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setNewTaskType('feature')
                        if (newTaskTag === 'Bug Fix') setNewTaskTag('Frontend')
                      }}
                      className={`p-2.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${newTaskType === 'feature'
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
                      className={`p-2.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${newTaskType === 'bug'
                          ? 'bg-rose-600/15 border-rose-500 text-rose-500 shadow-xs'
                          : 'bg-muted/60 border-border text-muted-foreground hover:text-foreground'
                        }`}
                    >
                      <Bug className="w-3.5 h-3.5" />
                      <span>Bug & Fix</span>
                    </button>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">Task Title</label>
                  <input
                    type="text"
                    placeholder={newTaskType === 'bug' ? 'e.g. Fix memory leak in auth-service' : 'e.g. Implement payment gateway webhook'}
                    value={newTaskTitle}
                    onChange={e => setNewTaskTitle(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-background border border-border text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                    autoFocus
                    required
                  />
                </div>

                {projects.length > 0 && (
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-foreground">Assign to Project (Optional)</label>
                    <select
                      value={newTaskProjectId}
                      onChange={e => {
                        setNewTaskProjectId(e.target.value)
                        const pEnvs = getProjectEnvs(e.target.value)
                        if (!pEnvs.includes(newTaskEnv)) {
                          setNewTaskEnv(pEnvs[0] as TaskEnvironment)
                        }
                      }}
                      className="w-full px-3 py-2 rounded-xl bg-background border border-border text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                    >
                      <option value="">No Project (Standalone Task)</option>
                      {projects.map(p => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-foreground">Initial Status</label>
                    <select
                      value={newTaskStatus}
                      onChange={e => {
                        const s = e.target.value
                        setNewTaskStatus(s)
                        const stObj = workspaceStatuses.find(ws => ws.id === s)
                        if (stObj?.category === 'CLOSED' || s === 'done' || s === 'complete') setNewTaskEnv('MAIN')
                        else if (newTaskEnv === 'MAIN') setNewTaskEnv('DEV')
                      }}
                      className="w-full px-3 py-2 rounded-xl bg-background border border-border text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                    >
                      {workspaceStatuses.map((st) => (
                        <option key={st.id} value={st.id}>
                          {st.name} ({st.category.replace('_', ' ')})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-foreground">Target Environment</label>
                    <select
                      value={newTaskStatus === 'done' ? 'MAIN' : newTaskEnv}
                      disabled={newTaskStatus === 'done'}
                      onChange={e => {
                        const env = e.target.value as TaskEnvironment
                        setNewTaskEnv(env)
                        if (env === 'MAIN') setNewTaskStatus('done')
                      }}
                      className="w-full px-3 py-2 rounded-xl bg-background border border-border text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50"
                    >
                      {getProjectEnvs(newTaskProjectId).map(e => (
                        <option key={e} value={e}>{e}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-foreground">Tag / Category</label>
                    <select
                      value={newTaskTag}
                      onChange={e => setNewTaskTag(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-background border border-border text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                    >
                      <option value="Frontend">Frontend</option>
                      <option value="Backend">Backend</option>
                      <option value="Design">Design</option>
                      <option value="DevOps">DevOps</option>
                      <option value="Architecture">Architecture</option>
                      <option value="Database">Database</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-foreground">Priority</label>
                    <select
                      value={newTaskPriority}
                      onChange={e => setNewTaskPriority(e.target.value as any)}
                      className="w-full px-3 py-2 rounded-xl bg-background border border-border text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-foreground">Assignee</label>
                    <input
                      type="text"
                      value={newTaskAssignee}
                      onChange={e => setNewTaskAssignee(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-background border border-border text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-foreground flex items-center gap-1">
                      <Calendar className="w-3 h-3 text-primary" /> Due Date (Calendar)
                    </label>
                    <input
                      type="date"
                      value={newTaskDue}
                      onChange={e => setNewTaskDue(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-background border border-border text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary cursor-pointer"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-3 py-2 rounded-xl text-xs font-semibold text-muted-foreground hover:bg-accent transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-all shadow-md shadow-primary/20"
                  >
                    Save Task to DB
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Interactive Modal: EDIT Task */}
        {editingTask && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
            <div className="bg-card border border-border rounded-2xl p-6 w-full max-w-md shadow-2xl space-y-4 animate-scale-in">
              <div className="flex items-center justify-between pb-3 border-b border-border">
                <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                  <Edit2 className="w-4 h-4 text-primary" /> Edit Task Deliverable
                </h3>
                <button
                  onClick={() => setEditingTask(null)}
                  className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSaveEdit} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">Task Title</label>
                  <input
                    type="text"
                    value={editTitle}
                    onChange={e => setEditTitle(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-background border border-border text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                    required
                  />
                </div>

                {projects.length > 0 && (
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-foreground">Assign to Project</label>
                    <select
                      value={editProjectId}
                      onChange={e => {
                        setEditProjectId(e.target.value)
                        const pEnvs = getProjectEnvs(e.target.value)
                        if (!pEnvs.includes(editEnv)) {
                          setEditEnv(pEnvs[0] as TaskEnvironment)
                        }
                      }}
                      className="w-full px-3 py-2 rounded-xl bg-background border border-border text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                    >
                      <option value="">No Project</option>
                      {projects.map(p => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-foreground">Status</label>
                    <select
                      value={editStatus}
                      onChange={e => {
                        const s = e.target.value
                        setEditStatus(s)
                        const stObj = workspaceStatuses.find(ws => ws.id === s)
                        if (stObj?.category === 'CLOSED' || s === 'done' || s === 'complete') setEditEnv('MAIN')
                        else if (editEnv === 'MAIN') setEditEnv('DEV')
                      }}
                      className="w-full px-3 py-2 rounded-xl bg-background border border-border text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                    >
                      {workspaceStatuses.map((st) => (
                        <option key={st.id} value={st.id}>
                          {st.name} ({st.category.replace('_', ' ')})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-foreground">Environment Stage</label>
                    <select
                      value={editStatus === 'done' ? 'MAIN' : editEnv}
                      disabled={editStatus === 'done'}
                      onChange={e => {
                        const env = e.target.value as TaskEnvironment
                        setEditEnv(env)
                        if (env === 'MAIN') setEditStatus('done')
                      }}
                      className="w-full px-3 py-2 rounded-xl bg-background border border-border text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50"
                    >
                      {getProjectEnvs(editProjectId).map(e => (
                        <option key={e} value={e}>{e}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-foreground">Category / Tag</label>
                    <select
                      value={editTag}
                      onChange={e => setEditTag(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-background border border-border text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                    >
                      <option value="Frontend">Frontend</option>
                      <option value="Backend">Backend</option>
                      <option value="Design">Design</option>
                      <option value="DevOps">DevOps</option>
                      <option value="Architecture">Architecture</option>
                      <option value="Database">Database</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-foreground">Priority</label>
                    <select
                      value={editPriority}
                      onChange={e => setEditPriority(e.target.value as any)}
                      className="w-full px-3 py-2 rounded-xl bg-background border border-border text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                      <option value="urgent">Urgent</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-foreground">Assignee</label>
                    <input
                      type="text"
                      value={editAssignee}
                      onChange={e => setEditAssignee(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-background border border-border text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-foreground flex items-center gap-1">
                      <Calendar className="w-3 h-3 text-primary" /> Due Date (Calendar)
                    </label>
                    <input
                      type="date"
                      value={editDue}
                      onChange={e => setEditDue(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-background border border-border text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary cursor-pointer"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
                  <button
                    type="button"
                    onClick={() => setEditingTask(null)}
                    className="px-3 py-2 rounded-xl text-xs font-semibold text-muted-foreground hover:bg-accent transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-all shadow-md shadow-primary/20"
                  >
                    Save Changes to DB
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>

      <EditSpaceStatusesModal
        isOpen={statusModalOpen}
        onClose={() => setStatusModalOpen(false)}
        workspaceId={currentWorkspace?.id || 'default'}
        spaceName={currentWorkspace?.name || 'Workspace'}
      />
    </>
  )
}
