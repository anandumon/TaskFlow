'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Plus,
  Clock,
  Send,
  CheckCircle2,
  AlertCircle,
  GitBranch,
  X,
  User,
  Sparkles,
  Server,
  FolderKanban,
  Bell,
  Loader2,
  ArrowRightLeft,
  GripVertical,
} from 'lucide-react'
import { useWorkspaceStore } from '@/stores/workspace-store'
import { useTaskStore, Task, TaskStatus, TaskEnvironment } from '@/stores/task-store'
import { useProjectStore } from '@/stores/project-store'
import { useCalendarStore } from '@/stores/calendar-store'
import { CalendarMarqueeTicker } from '@/features/calendar/components/CalendarMarqueeTicker'
import { CalendarIntegrationPanel } from '@/features/calendar/components/CalendarIntegrationPanel'

export default function CalendarPage() {
  const { currentWorkspace } = useWorkspaceStore()
  const { tasks, loadTasks, createTask, updateEnvironment, updateStatus, updateTask } = useTaskStore()
  const { projects, loadProjects } = useProjectStore()
  const { connections, unifiedEvents, fetchConnections, fetchUnifiedEvents } = useCalendarStore()

  const [currentDate, setCurrentDate] = useState(new Date(2026, 8, 1)) // Sep 2026
  const [selectedDay, setSelectedDay] = useState<number>(new Date().getDate()) // Defaults to 1 (Today)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isSyncModalOpen, setIsSyncModalOpen] = useState(false)
  const [toastMessage, setToastMessage] = useState<string | null>(null)
  const [dispatchStatus, setDispatchStatus] = useState<string | null>(null)
  const [dispatchingAlertId, setDispatchingAlertId] = useState<string | null>(null)
  const [isDispatchingUpcoming, setIsDispatchingUpcoming] = useState(false)

  // Drag and drop rescheduling onto calendar days
  const [draggedCalTaskId, setDraggedCalTaskId] = useState<string | null>(null)
  const [dragOverCalDay, setDragOverCalDay] = useState<number | null>(null)

  // Day Inspection Drag & Drop Reordering in any position
  const [draggedInspectorTaskId, setDraggedInspectorTaskId] = useState<string | null>(null)
  const [dragOverInspectorTaskId, setDragOverInspectorTaskId] = useState<string | null>(null)
  const [dragOverInspectorPosition, setDragOverInspectorPosition] = useState<'before' | 'after' | null>(null)

  const handleCalTaskDragStart = (e: React.DragEvent, taskId: string) => {
    setDraggedCalTaskId(taskId)
    e.dataTransfer.setData('text/plain', taskId)
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleInspectorDragStart = (e: React.DragEvent, taskId: string) => {
    setDraggedInspectorTaskId(taskId)
    setDraggedCalTaskId(taskId)
    e.dataTransfer.setData('text/plain', taskId)
    e.dataTransfer.setData('source', 'day-inspector')
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleInspectorDragOver = (e: React.DragEvent, targetTaskId: string) => {
    e.preventDefault()
    e.stopPropagation()
    e.dataTransfer.dropEffect = 'move'

    if (draggedInspectorTaskId === targetTaskId) return

    const rect = e.currentTarget.getBoundingClientRect()
    const midpoint = rect.top + rect.height / 2
    const position = e.clientY < midpoint ? 'before' : 'after'

    setDragOverInspectorTaskId(targetTaskId)
    setDragOverInspectorPosition(position)
  }

  const handleInspectorDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
  }

  const handleInspectorDrop = (e: React.DragEvent, targetTaskId: string) => {
    e.preventDefault()
    e.stopPropagation()

    const draggedId = draggedInspectorTaskId || e.dataTransfer.getData('text/plain')
    if (!draggedId || draggedId === targetTaskId) {
      setDragOverInspectorTaskId(null)
      setDragOverInspectorPosition(null)
      setDraggedInspectorTaskId(null)
      return
    }

    const currentDayTasks = tasks.filter((t) => getTaskDayNumber(t) === selectedDay)
    const draggedIndex = currentDayTasks.findIndex((t) => t.id === draggedId)
    const targetIndex = currentDayTasks.findIndex((t) => t.id === targetTaskId)

    if (draggedIndex === -1 || targetIndex === -1) {
      setDragOverInspectorTaskId(null)
      setDragOverInspectorPosition(null)
      setDraggedInspectorTaskId(null)
      return
    }

    const reorderedDayTasks = [...currentDayTasks]
    const [removed] = reorderedDayTasks.splice(draggedIndex, 1)

    let insertIndex = targetIndex
    if (dragOverInspectorPosition === 'after') {
      insertIndex = draggedIndex < targetIndex ? targetIndex : targetIndex + 1
    } else {
      insertIndex = draggedIndex < targetIndex ? targetIndex - 1 : targetIndex
    }
    const clampedIndex = Math.max(0, Math.min(insertIndex, reorderedDayTasks.length))
    reorderedDayTasks.splice(clampedIndex, 0, removed)

    // Reconstruct full list preserving newly reordered day tasks
    const otherTasks = tasks.filter((t) => getTaskDayNumber(t) !== selectedDay)
    const updatedAllTasks = [...otherTasks, ...reorderedDayTasks]

    const wsId = currentWorkspace?.id || '50a4c29f-09ff-4480-8b6b-495381247d0f'
    useTaskStore.getState().reorderTasks(wsId, updatedAllTasks)

    showToast(`✨ Reordered task in Day Inspection!`)
    setDragOverInspectorTaskId(null)
    setDragOverInspectorPosition(null)
    setDraggedInspectorTaskId(null)
    setDraggedCalTaskId(null)
  }

  const handleCalDayDragOver = (e: React.DragEvent, day: number) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    if (dragOverCalDay !== day) {
      setDragOverCalDay(day)
    }
  }

  const handleCalDayDrop = async (e: React.DragEvent, day: number) => {
    e.preventDefault()
    setDragOverCalDay(null)
    const taskId = draggedCalTaskId || e.dataTransfer.getData('text/plain')
    if (!taskId) return

    const targetTask = tasks.find(t => t.id === taskId)
    const formattedDue = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`

    try {
      await updateTask(taskId, { dueDate: formattedDue })
      setSelectedDay(day)
      showToast(`📅 Rescheduled "${targetTask?.title || 'Task'}" to ${monthNames[month]} ${day}, ${year}!`)
    } catch (err: any) {
      showToast(err?.message || 'Failed to reschedule task')
    } finally {
      setDraggedCalTaskId(null)
    }
  }

  // Quick Task Creation Modal
  const [newTaskTitle, setNewTaskTitle] = useState('')
  const [newTaskProjectId, setNewTaskProjectId] = useState('')
  const [newTaskEnv, setNewTaskEnv] = useState<TaskEnvironment>('DEV')
  const [newTaskDay, setNewTaskDay] = useState('')

  useEffect(() => {
    if (currentWorkspace?.id) {
      loadTasks(currentWorkspace.id)
      loadProjects(currentWorkspace.id)
      fetchConnections().catch(() => {})
      fetchUnifiedEvents(currentWorkspace.id).catch(() => {})
    }
  }, [currentWorkspace?.id, loadTasks, loadProjects, fetchConnections, fetchUnifiedEvents])

  const showToast = (msg: string) => {
    setToastMessage(msg)
    setTimeout(() => setToastMessage(null), 3500)
  }

  const year = currentDate.getFullYear()
  const month = currentDate.getMonth()

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ]

  const firstDayOfMonth = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1))
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1))

  // Helper to extract the day of month for a task
  const getTaskDayNumber = (t: Task): number | null => {
    if (t.dueDate) {
      const match = t.dueDate.match(/^\d{4}-(\d{2})-(\d{2})/)
      if (match) {
        const dYear = parseInt(t.dueDate.substring(0, 4), 10)
        const dMonth = parseInt(match[1], 10) - 1
        const dDay = parseInt(match[2], 10)
        if (dYear === year && dMonth === month) {
          return dDay
        }
      }
    }
    // Fallback: if createdAt falls in current month/year
    if (t.createdAt) {
      const createdDate = new Date(t.createdAt)
      if (createdDate.getFullYear() === year && createdDate.getMonth() === month) {
        return createdDate.getDate()
      }
    }
    return null
  }

  // Get project environments
  const getProjectEnvs = (projId?: string) => {
    if (!projId) return ['DEV', 'SIT', 'UAT', 'RELEASE', 'MAIN']
    const p = projects.find(proj => proj.id === projId)
    if (!p || !p.environments) return ['DEV', 'SIT', 'UAT', 'RELEASE', 'MAIN']
    return p.environments.split(',')
  }

  const getEnvBadgeStyle = (env: string) => {
    switch (env) {
      case 'DEV': return 'bg-sky-500/15 text-sky-700 dark:text-sky-300 border-sky-500/30'
      case 'SIT': return 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30'
      case 'UAT': return 'bg-purple-500/15 text-purple-700 dark:text-purple-300 border-purple-500/30'
      case 'RELEASE': return 'bg-pink-500/15 text-pink-700 dark:text-pink-300 border-pink-500/30'
      case 'MAIN': return 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30'
      default: return 'bg-muted text-muted-foreground border-border'
    }
  }

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newTaskTitle.trim()) return

    const targetDay = newTaskDay ? parseInt(newTaskDay, 10) : selectedDay
    const formattedDue = `${year}-${String(month + 1).padStart(2, '0')}-${String(targetDay).padStart(2, '0')}`

    const wsId = currentWorkspace?.id || '50a4c29f-09ff-4480-8b6b-495381247d0f'
    try {
      await createTask(wsId, {
        title: newTaskTitle.trim(),
        projectId: newTaskProjectId || undefined,
        environment: newTaskEnv,
        status: newTaskEnv === 'MAIN' ? 'done' : 'in_review',
        dueDate: formattedDue,
        tag: 'Sprint Deliverable',
        assigneeName: 'You',
        priority: 'high',
      })
      setNewTaskTitle('')
      setIsModalOpen(false)
      showToast(`Milestone created for ${monthNames[month]} ${targetDay}, ${year}!`)
    } catch (err: any) {
      showToast(err?.message || 'Failed to create task')
    }
  }

  const handleSendTaskAlert = async (task: Task) => {
    try {
      setDispatchingAlertId(task.id)
      const res = await useTaskStore.getState().dispatchDueAlert(task.id)
      showToast(`🔔 Due date alert email sent to ${res.recipientEmail || 'assignee'}!`)
    } catch (err: any) {
      showToast(err?.response?.data?.message || err?.message || 'Failed to send alert email')
    } finally {
      setDispatchingAlertId(null)
    }
  }

  const handleDispatchUpcomingAlerts = async () => {
    if (!currentWorkspace?.id) return
    try {
      setIsDispatchingUpcoming(true)
      const res = await useTaskStore.getState().dispatchUpcomingDueAlerts(currentWorkspace.id)
      if (res && res.taskCount > 0) {
        showToast(`🔔 Dispatched upcoming alerts for ${res.taskCount} task(s) to ${res.recipientEmail}!`)
      } else {
        showToast(res?.message || 'ℹ️ No upcoming uncompleted tasks found.')
      }
    } catch (err: any) {
      showToast(err?.response?.data?.message || err?.message || 'Failed to dispatch upcoming alerts')
    } finally {
      setIsDispatchingUpcoming(false)
    }
  }

  // Tasks for the selected day inspection panel
  const selectedDayTasks = tasks.filter((t) => getTaskDayNumber(t) === selectedDay)

  // External calendar events for selected day
  const selectedDayExternalEvents = unifiedEvents.filter((e) => {
    if (e.source === 'TASKFLOW') return false
    if (!e.startAt) return false
    const d = new Date(e.startAt)
    return d.getFullYear() === year && d.getMonth() === month && d.getDate() === selectedDay
  })

  // Dynamic calculation of row count for calendar grid
  const totalSlots = firstDayOfMonth + daysInMonth
  const rowCount = totalSlots > 35 ? 6 : 5
  const gridRowsClass = rowCount === 6 ? 'grid-rows-6' : 'grid-rows-5'

  const googleConnection = connections.find(
    (c) => (c.provider as string)?.toLowerCase() === 'google' && (c.status === 'ACTIVE' || (c as any).connected !== false)
  )
  const [isSyncingGoogle, setIsSyncingGoogle] = useState(false)

  const handleSyncGoogleNow = async () => {
    if (!googleConnection?.id) return
    setIsSyncingGoogle(true)
    try {
      await useCalendarStore.getState().triggerSync(googleConnection.id)
      if (currentWorkspace?.id) {
        await fetchUnifiedEvents(currentWorkspace.id)
      }
      showToast('✅ Synced with Google Calendar successfully!')
    } catch (err: any) {
      showToast(err?.message || 'Failed to sync with Google Calendar')
    } finally {
      setIsSyncingGoogle(false)
    }
  }

  return (
    <div className="h-[calc(100vh-7.5rem)] flex flex-col min-h-0 max-w-7xl mx-auto gap-2.5 animate-fade-in overflow-hidden">
      {toastMessage && (
        <div className="fixed top-6 right-6 z-50 flex items-center gap-2 bg-emerald-600 text-white px-4 py-2.5 rounded-2xl shadow-xl animate-fade-in text-xs font-semibold">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 shrink-0">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <CalendarIcon className="w-5 h-5 sm:w-6 sm:h-6 text-primary" /> Sprint Calendar & Due Date Milestones
          </h1>
        </div>

        <div className="flex items-center gap-2 sm:gap-2.5 flex-wrap">
          {googleConnection ? (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-blue-500/10 border border-blue-500/30 text-blue-400 text-xs font-semibold">
              <span className="w-2 h-2 rounded-full bg-emerald-400 ring-2 ring-emerald-500/30 animate-pulse" />
              <span className="hidden sm:inline">Connected:</span>
              <span className="text-foreground font-bold truncate max-w-[150px]">{googleConnection.providerEmail || 'Google Calendar'}</span>
              <button
                onClick={handleSyncGoogleNow}
                disabled={isSyncingGoogle}
                className="ml-1 px-2 py-0.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-[11px] font-bold transition-all active:scale-95 disabled:opacity-50 flex items-center gap-1 cursor-pointer"
                title="Sync with Google Calendar now"
              >
                {isSyncingGoogle ? <Loader2 className="w-3 h-3 animate-spin" /> : <ArrowRightLeft className="w-3 h-3" />}
                <span>Sync with Google</span>
              </button>
            </div>
          ) : (
            <button
              onClick={() => setIsSyncModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 sm:py-2 rounded-xl bg-card border border-border/80 text-foreground text-xs font-semibold hover:bg-muted/60 transition-all shadow-xs active:scale-95 cursor-pointer"
              title="Google Calendar Integration and Two-Way Sync"
            >
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
              </svg>
              <span>Connect Google Calendar</span>
            </button>
          )}

          <button
            onClick={() => setIsSyncModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 sm:py-2 rounded-xl bg-card border border-border/80 text-foreground text-xs font-semibold hover:bg-muted/60 transition-all shadow-xs active:scale-95 cursor-pointer"
            title="Calendar Settings & Accounts"
          >
            <ArrowRightLeft className="w-3.5 h-3.5 text-primary" />
            <span>Manage Sync</span>
          </button>

          <button
            onClick={handleDispatchUpcomingAlerts}
            disabled={isDispatchingUpcoming}
            className="flex items-center gap-1.5 px-3 py-1.5 sm:py-2 rounded-xl bg-gradient-to-r from-amber-500 via-rose-500 to-purple-600 hover:from-amber-600 hover:to-purple-700 text-white text-xs font-bold transition-all shadow-xs active:scale-95 disabled:opacity-50 cursor-pointer"
            title="Dispatch email alert for upcoming tasks and subtasks"
          >
            {isDispatchingUpcoming ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Bell className="w-3.5 h-3.5 animate-pulse" />
            )}
            <span>Dispatch Due Date Alerts</span>
          </button>

          <button
            onClick={() => {
              setNewTaskDay(selectedDay.toString())
              setIsModalOpen(true)
            }}
            className="flex items-center gap-1.5 px-3.5 py-1.5 sm:py-2 rounded-xl bg-primary text-primary-foreground text-xs font-bold hover:bg-primary/90 shadow-md shadow-primary/20 transition-all active:scale-95 cursor-pointer"
          >
            <Plus className="w-4 h-4" /> Add Calendar Task
          </button>
        </div>
      </div>

      {dispatchStatus && (
        <div className="p-2.5 bg-primary/10 border border-primary/20 rounded-xl text-xs text-primary font-semibold flex items-center gap-2 animate-fade-in shrink-0">
          <Clock className="w-4 h-4 animate-spin" />
          <span>{dispatchStatus}</span>
        </div>
      )}

      {/* Moving Animation Ticker at Top of Calendar */}
      <div className="shrink-0">
        <CalendarMarqueeTicker
          tasks={tasks}
          projects={projects}
          onSelectTaskDate={(dateStr) => {
            const parts = dateStr.split('-')
            if (parts.length === 3) {
              setSelectedDay(parseInt(parts[2], 10))
            }
          }}
        />
      </div>

      {/* Calendar Grid & Sidebar Inspector */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 flex-1 min-h-0">
        {/* Main Monthly Calendar Grid (2 cols) */}
        <div className="lg:col-span-2 p-3 sm:p-4 rounded-2xl bg-card border border-border/80 shadow-xs flex flex-col min-h-0 overflow-hidden">
          {/* Header Navigation */}
          <div className="flex items-center justify-between pb-2 shrink-0">
            <h2 className="text-sm sm:text-base font-bold text-foreground flex items-center gap-2">
              <CalendarIcon className="w-4 h-4 text-primary" /> Schedule & Timeline
            </h2>

            {/* Month Year with Arrows & Today Button */}
            <div className="flex items-center gap-1.5 bg-muted/60 p-1 rounded-xl border border-border/80">
              <button
                onClick={prevMonth}
                className="p-1 rounded-lg hover:bg-background text-muted-foreground hover:text-foreground transition-all active:scale-90 cursor-pointer"
                title="Previous Month"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <span className="text-xs font-bold text-foreground px-2 min-w-[110px] text-center select-none">
                {monthNames[month]} {year}
              </span>
              <button
                onClick={nextMonth}
                className="p-1 rounded-lg hover:bg-background text-muted-foreground hover:text-foreground transition-all active:scale-90 cursor-pointer"
                title="Next Month"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => {
                  const now = new Date()
                  setCurrentDate(new Date(now.getFullYear(), now.getMonth(), 1))
                  setSelectedDay(now.getDate())
                }}
                className="ml-1 px-2 py-0.5 rounded-lg bg-background hover:bg-accent text-[10px] font-bold text-muted-foreground hover:text-foreground border border-border/50 transition-colors cursor-pointer"
                title="Jump to Today"
              >
                Today
              </button>
            </div>
          </div>

          {/* Days of Week Header */}
          <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-bold uppercase tracking-wider text-muted-foreground py-1 border-b border-border/50 shrink-0">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
              <div key={d}>{d}</div>
            ))}
          </div>

          {/* Day Cells: Exactly fits available height */}
          <div className={`grid grid-cols-7 gap-1 flex-1 min-h-0 pt-1 ${gridRowsClass}`}>
            {/* Blank padding days for start of month */}
            {Array.from({ length: firstDayOfMonth }).map((_, i) => (
              <div key={`blank-${i}`} className="h-full min-h-0 rounded-xl bg-muted/10 border border-border/20 opacity-30" />
            ))}

            {/* Days in Month */}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1
              const isToday =
                day === new Date().getDate() &&
                month === new Date().getMonth() &&
                year === new Date().getFullYear()
              const isSelected = selectedDay === day

              // Accurate day mapping based on actual dueDate/createdAt
              const dayTasks = tasks.filter((t) => getTaskDayNumber(t) === day)
              const dayExtEvents = unifiedEvents.filter((ev) => {
                if (ev.source === 'TASKFLOW') return false
                if (!ev.startAt) return false
                const d = new Date(ev.startAt)
                return d.getFullYear() === year && d.getMonth() === month && d.getDate() === day
              })
              const totalEventsCount = dayTasks.length + dayExtEvents.length

              return (
                <div
                  key={day}
                  onClick={() => setSelectedDay(day)}
                  onDragOver={(e) => handleCalDayDragOver(e, day)}
                  onDragLeave={() => setDragOverCalDay(null)}
                  onDrop={(e) => handleCalDayDrop(e, day)}
                  className={`h-full min-h-0 p-1.5 rounded-xl border transition-all cursor-pointer flex flex-col justify-between overflow-hidden group ${
                    dragOverCalDay === day
                      ? 'border-primary ring-2 ring-primary scale-[1.03] bg-primary/20 shadow-md z-10'
                      : isSelected
                      ? 'border-primary ring-2 ring-primary/20 bg-primary/5 shadow-xs'
                      : isToday
                        ? 'border-primary/50 bg-accent/30'
                        : 'border-border/50 bg-background/50 hover:border-border hover:bg-accent/20'
                  }`}
                  title="Click to inspect, or drop tasks here to reschedule"
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={`text-[11px] font-bold w-5 h-5 rounded-full flex items-center justify-center transition-all ${isToday
                          ? 'bg-primary text-primary-foreground font-extrabold'
                          : isSelected
                            ? 'bg-primary/20 text-primary font-extrabold border border-primary/40'
                            : 'text-foreground/90 group-hover:text-foreground'
                        }`}
                    >
                      {day}
                    </span>
                    <div className="flex items-center gap-1">
                      {dayExtEvents.length > 0 && (
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-500 ring-1 ring-background animate-pulse" title="Google Calendar Event" />
                      )}
                      {dayTasks.length > 0 && (
                        <span className="w-1.5 h-1.5 rounded-full bg-primary ring-1 ring-background animate-pulse" />
                      )}
                    </div>
                  </div>

                  <div className="space-y-0.5 mt-0.5">
                    {/* External Google Calendar Event Pill */}
                    {dayExtEvents.slice(0, 1).map((ev) => (
                      <div
                        key={ev.id}
                        className="text-[8.5px] font-semibold truncate px-1 py-0.5 rounded border flex items-center gap-1 leading-none bg-blue-500/15 border-blue-500/30 text-blue-400 select-none"
                        title={`Google Calendar: ${ev.title}`}
                      >
                        <span className="w-1 h-1 rounded-full bg-blue-400 shrink-0" />
                        <span className="truncate font-bold">{ev.title}</span>
                      </div>
                    ))}

                    {dayTasks.slice(0, dayExtEvents.length > 0 ? 1 : 2).map((t) => {
                      const taskProj = projects.find((p) => p.id === t.projectId)
                      const pColor = taskProj?.color || '#6366F1'

                      return (
                        <div
                          key={t.id}
                          draggable={true}
                          onDragStart={(e) => {
                            e.stopPropagation()
                            handleCalTaskDragStart(e, t.id)
                          }}
                          className="text-[8.5px] font-semibold truncate px-1 py-0.5 rounded border flex items-center gap-1 leading-none cursor-grab active:cursor-grabbing hover:scale-105 transition-all select-none"
                          style={{
                            backgroundColor: taskProj ? `${pColor}18` : 'hsl(var(--muted)/0.5)',
                            borderColor: taskProj ? `${pColor}40` : 'hsl(var(--border) / 0.5)',
                            color: taskProj ? pColor : 'hsl(var(--foreground))',
                          }}
                          title={`Drag "${t.title}" onto any day cell to reschedule`}
                        >
                          <span className="w-1 h-1 rounded-full shrink-0" style={{ backgroundColor: pColor }} />
                          <span className="truncate font-bold">{t.title}</span>
                        </div>
                      )
                    })}
                    {totalEventsCount > 2 && (
                      <div className="text-[7.5px] text-muted-foreground text-center font-bold">
                        +{totalEventsCount - 2} more
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Day Milestone Inspector (1 col) */}
        <div className="p-3.5 sm:p-4 rounded-2xl bg-card border border-border/80 shadow-xs flex flex-col min-h-0 overflow-hidden">
          <div className="flex items-center justify-between pb-2 border-b border-border/70 shrink-0">
            <div>
              <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">
                Day Inspection
              </span>
              <h3 className="text-xs sm:text-sm font-bold text-foreground mt-0.5">
                {monthNames[month]} {selectedDay}, {year}
              </h3>
            </div>
            <button
              onClick={() => {
                setNewTaskDay(selectedDay.toString())
                setIsModalOpen(true)
              }}
              className="p-1.5 rounded-xl bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-all shadow-xs cursor-pointer"
              title="Add task for this day"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>

          {/* Scheduled Tasks for selected day: internally scrollable if many tasks */}
          <div className="flex-1 min-h-0 overflow-y-auto py-2.5 space-y-2 pr-1 custom-scrollbar">
            {selectedDayTasks.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center p-6 text-center bg-muted/10 border border-dashed border-border/60 rounded-xl text-xs text-muted-foreground gap-2">
                <CalendarIcon className="w-7 h-7 text-muted-foreground/30" />
                <p className="font-medium">No deliverables on {monthNames[month]} {selectedDay}.</p>
                <button
                  type="button"
                  onClick={() => {
                    setNewTaskDay(selectedDay.toString())
                    setIsModalOpen(true)
                  }}
                  className="text-xs text-primary hover:underline font-bold flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" /> Schedule Deliverable
                </button>
              </div>
            ) : (
              selectedDayTasks.map((task, taskIdx) => {
                const taskProject = projects.find((p) => p.id === task.projectId)
                const projectEnvs = getProjectEnvs(task.projectId)
                const projectColor = taskProject?.color || (taskProject ? '#6366F1' : undefined)
                const isDraggingThis = draggedInspectorTaskId === task.id
                const isOverThis = dragOverInspectorTaskId === task.id

                return (
                  <div
                    key={task.id}
                    draggable={true}
                    onDragStart={(e) => handleInspectorDragStart(e, task.id)}
                    onDragOver={(e) => handleInspectorDragOver(e, task.id)}
                    onDragLeave={handleInspectorDragLeave}
                    onDrop={(e) => handleInspectorDrop(e, task.id)}
                    className={`p-3 rounded-xl border space-y-2 transition-all duration-150 hover:scale-[1.01] bg-card/60 relative overflow-hidden cursor-move select-none ${
                      isDraggingThis
                        ? 'opacity-30 scale-95 border-dashed border-primary ring-2 ring-primary/40'
                        : isOverThis
                        ? 'ring-2 ring-primary/60 border-primary shadow-lg bg-card/90'
                        : ''
                    }`}
                    style={{
                      backgroundColor: projectColor ? `${projectColor}10` : 'rgba(255,255,255,0.02)',
                      borderColor: projectColor ? `${projectColor}40` : 'rgba(255,255,255,0.08)',
                    }}
                    title="Drag to reorder in this day, or drop onto any calendar day to reschedule"
                  >
                    {/* Visual Drop Placement Indicators */}
                    {isOverThis && dragOverInspectorPosition === 'before' && (
                      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary via-indigo-400 to-primary rounded-full shadow-lg shadow-primary/60 animate-pulse z-30 pointer-events-none" />
                    )}
                    {isOverThis && dragOverInspectorPosition === 'after' && (
                      <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-primary via-indigo-400 to-primary rounded-full shadow-lg shadow-primary/60 animate-pulse z-30 pointer-events-none" />
                    )}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5">
                        <div className="text-muted-foreground/40 hover:text-foreground cursor-grab active:cursor-grabbing p-0.5 shrink-0" title="Drag to any day">
                          <GripVertical className="w-3.5 h-3.5" />
                        </div>
                        {taskProject && (
                          <span
                            className="text-[9px] font-extrabold px-2 py-0.5 rounded-lg flex items-center gap-1 border"
                            style={{
                              backgroundColor: `${projectColor}20`,
                              color: projectColor,
                              borderColor: `${projectColor}40`,
                            }}
                          >
                            <FolderKanban className="w-2.5 h-2.5" />
                            {taskProject.name}
                          </span>
                        )}
                      </div>
                      <span className="text-[9px] text-muted-foreground font-semibold">
                        Due: {task.dueDate || 'Today'}
                      </span>
                    </div>

                    <Link
                      href={`/app/tasks/${task.id}`}
                      className="block text-xs font-bold leading-snug hover:opacity-85 transition-opacity"
                      style={{
                        color: projectColor ? projectColor : 'hsl(var(--foreground))',
                      }}
                    >
                      {task.title}
                    </Link>

                    {/* Project-Specific Environment Lifecycle Timeline */}
                    <div className="pt-1.5 border-t border-border/40 space-y-1">
                      <div className="text-[9px] font-semibold text-muted-foreground flex items-center justify-between">
                        <span>Milestone</span>
                        <span className="font-bold" style={{ color: projectColor || 'hsl(var(--primary))' }}>
                          {task.status.toUpperCase()}
                        </span>
                      </div>
                      <div
                        className="grid gap-1 text-[7.5px] text-center font-bold"
                        style={{ gridTemplateColumns: `repeat(${projectEnvs.length}, minmax(0, 1fr))` }}
                      >
                        {projectEnvs.map((env) => {
                          const isPassed =
                            task.status === 'done' || task.environment === env

                          return (
                            <div
                              key={env}
                              className={`py-0.5 rounded border transition-all ${task.environment === env
                                  ? 'text-white font-extrabold'
                                  : isPassed
                                    ? 'bg-muted text-foreground border-border'
                                    : 'bg-muted/20 text-muted-foreground/40 border-transparent'
                                }`}
                              style={
                                task.environment === env
                                  ? {
                                      backgroundColor: projectColor || 'hsl(var(--primary))',
                                      borderColor: projectColor || 'hsl(var(--primary))',
                                    }
                                  : undefined
                              }
                            >
                              {env}
                            </div>
                          )
                        })}
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-1.5 border-t border-border/40 text-[9px]">
                      <div className="flex items-center gap-1 text-muted-foreground font-medium">
                        <User className="w-3 h-3" />
                        <span className="truncate max-w-[90px]">{task.assigneeName || 'You'}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleSendTaskAlert(task)}
                        disabled={dispatchingAlertId === task.id}
                        className="inline-flex items-center gap-1 px-2 py-1 rounded-lg border text-[10px] font-bold transition-all cursor-pointer hover:opacity-90 active:scale-95 disabled:opacity-50"
                        style={{
                          borderColor: `${projectColor || '#6366f1'}45`,
                          backgroundColor: `${projectColor || '#6366f1'}15`,
                          color: projectColor || '#818cf8',
                        }}
                        title={`Send due date alert email for "${task.title}" now`}
                      >
                        {dispatchingAlertId === task.id ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          <Bell className="w-3 h-3 text-rose-500 animate-pulse" />
                        )}
                        <span>Alert</span>
                      </button>
                    </div>
                  </div>
                )
              })
            )}

            {selectedDayExternalEvents.length > 0 && (
              <div className="pt-2 border-t border-border/60 space-y-1.5">
                <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground block">
                  External Events ({selectedDayExternalEvents.length})
                </span>
                {selectedDayExternalEvents.map((ev) => (
                  <div key={ev.id} className="p-2 rounded-xl border border-border/70 bg-background/50 flex items-center justify-between text-[11px]">
                    <div>
                      <div className="font-semibold text-foreground flex items-center gap-1.5">
                        <span className={`w-1.5 h-1.5 rounded-full ${ev.source === 'GOOGLE' ? 'bg-blue-500' : 'bg-cyan-500'}`} />
                        <span className="truncate max-w-[140px]">{ev.title}</span>
                      </div>
                      <span className="text-[9px] text-muted-foreground">
                        {new Date(ev.startAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {new Date(ev.endAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    {ev.meetingUrl && (
                      <a
                        href={ev.meetingUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[10px] font-semibold text-primary hover:underline"
                      >
                        Join ↗
                      </a>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal: Add Calendar Task */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-card border border-border rounded-2xl p-5 w-full max-w-md shadow-2xl space-y-3.5 animate-scale-in">
            <div className="flex items-center justify-between pb-2.5 border-b border-border">
              <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                <Plus className="w-4 h-4 text-primary" /> Schedule Deliverable Milestone
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateTask} className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-muted-foreground block mb-1">
                  Deliverable Title
                </label>
                <input
                  type="text"
                  required
                  value={newTaskTitle}
                  onChange={(e) => setNewTaskTitle(e.target.value)}
                  placeholder="e.g., Release candidate validation"
                  className="w-full bg-background border border-border rounded-xl px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-muted-foreground block mb-1">
                    Project
                  </label>
                  <select
                    value={newTaskProjectId}
                    onChange={(e) => setNewTaskProjectId(e.target.value)}
                    className="w-full bg-background border border-border rounded-xl px-2.5 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  >
                    <option value="">No Project</option>
                    {projects.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-muted-foreground block mb-1">
                    Due Day (in {monthNames[month]})
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={daysInMonth}
                    value={newTaskDay || selectedDay}
                    onChange={(e) => setNewTaskDay(e.target.value)}
                    className="w-full bg-background border border-border rounded-xl px-3 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-muted-foreground block mb-1">
                  Target Pipeline Stage
                </label>
                <div className="grid grid-cols-4 gap-1.5">
                  {(['DEV', 'MAIN', 'UAT', 'RELEASE'] as TaskEnvironment[]).map((env) => (
                    <button
                      key={env}
                      type="button"
                      onClick={() => setNewTaskEnv(env)}
                      className={`py-1.5 rounded-xl border text-[11px] font-bold transition-all cursor-pointer ${newTaskEnv === env
                          ? 'bg-primary text-primary-foreground border-primary'
                          : 'bg-muted/40 text-muted-foreground border-border hover:bg-muted'
                        }`}
                    >
                      {env}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-border">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-3 py-1.5 rounded-xl text-xs font-semibold hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-xl bg-primary text-primary-foreground text-xs font-bold hover:bg-primary/90 shadow-md shadow-primary/20 transition-all cursor-pointer active:scale-95"
                >
                  Schedule Deliverable
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Calendar Integration & Sync (No bottom cut-off, beautifully scrollable container) */}
      {isSyncModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-3 sm:p-4 animate-fade-in">
          <div className="bg-card border border-border rounded-3xl w-full max-w-3xl shadow-2xl flex flex-col max-h-[85vh] overflow-hidden animate-scale-in">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-border shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                  <ArrowRightLeft className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-foreground">Calendar Integration & Two-Way Sync</h3>
                  <p className="text-[11px] text-muted-foreground">Google Calendar, Microsoft Outlook & Automated Task Sync</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsSyncModalOpen(false)}
                className="p-1.5 rounded-xl hover:bg-accent text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body: Sleek and perfectly scrollable without clipping */}
            <div className="p-4 sm:p-5 flex-1 min-h-0 overflow-y-auto custom-scrollbar">
              <CalendarIntegrationPanel onSuccess={showToast} />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
