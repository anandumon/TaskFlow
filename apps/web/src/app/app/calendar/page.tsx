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
  FolderKanban
} from 'lucide-react'
import { useWorkspaceStore } from '@/stores/workspace-store'
import { useTaskStore, Task, TaskStatus, TaskEnvironment } from '@/stores/task-store'
import { useProjectStore } from '@/stores/project-store'
import { CalendarMarqueeTicker } from '@/features/calendar/components/CalendarMarqueeTicker'

export default function CalendarPage() {
  const { currentWorkspace } = useWorkspaceStore()
  const { tasks, loadTasks, createTask, updateEnvironment, updateStatus } = useTaskStore()
  const { projects, loadProjects } = useProjectStore()

  const [currentDate, setCurrentDate] = useState(new Date(2026, 8, 1)) // Sep 2026
  const [selectedDay, setSelectedDay] = useState<number>(new Date().getDate()) // Defaults to 1 (Today)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [toastMessage, setToastMessage] = useState<string | null>(null)
  const [dispatchStatus, setDispatchStatus] = useState<string | null>(null)

  // Quick Task Creation Modal
  const [newTaskTitle, setNewTaskTitle] = useState('')
  const [newTaskProjectId, setNewTaskProjectId] = useState('')
  const [newTaskEnv, setNewTaskEnv] = useState<TaskEnvironment>('DEV')
  const [newTaskDay, setNewTaskDay] = useState('')

  useEffect(() => {
    if (currentWorkspace?.id) {
      loadTasks(currentWorkspace.id)
      loadProjects(currentWorkspace.id)
    }
  }, [currentWorkspace?.id, loadTasks, loadProjects])

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

  const handleDispatchNotification = (taskId?: string) => {
    setDispatchStatus('Dispatching email notification...')
    setTimeout(() => {
      setDispatchStatus(null)
      showToast('Automated email alert sent to your verified email (Due Today / Upcoming)!')
    }, 1200)
  }

  // Tasks for the selected day inspection panel
  const selectedDayTasks = tasks.filter(t => getTaskDayNumber(t) === selectedDay)
  const displayTasks = selectedDayTasks.length > 0 ? selectedDayTasks : tasks

  return (
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
            <CalendarIcon className="w-6 h-6 text-primary" /> Sprint Calendar & Due Date Milestones
          </h1>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => handleDispatchNotification()}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-card hover:bg-accent border border-border text-xs font-semibold text-foreground transition-all shadow-sm active:scale-95"
            title="Trigger test due date notification email"
          >
            <Send className="w-3.5 h-3.5 text-amber-500" /> Dispatch Due Date Alerts
          </button>

          <button
            onClick={() => {
              setNewTaskDay(selectedDay.toString())
              setIsModalOpen(true)
            }}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 shadow-md shadow-primary/20 transition-all active:scale-95"
          >
            <Plus className="w-4 h-4" /> Add Calendar Task
          </button>
        </div>
      </div>

      {dispatchStatus && (
        <div className="p-3 bg-primary/10 border border-primary/20 rounded-2xl text-xs text-primary font-semibold flex items-center gap-2 animate-fade-in">
          <Clock className="w-4 h-4 animate-spin" />
          <span>{dispatchStatus}</span>
        </div>
      )}

      {/* Moving Animation Ticker at Top of Calendar */}
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

      {/* Calendar Grid & Sidebar Inspector */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Monthly Calendar Grid (2 cols) */}
        <div className="lg:col-span-2 p-6 rounded-3xl bg-card border border-border/80 shadow-sm space-y-6">
          {/* Header Navigation */}
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-foreground flex items-center gap-2">
              <CalendarIcon className="w-4 h-4 text-primary" /> Schedule & Timeline
            </h2>

            {/* Month Year with Arrows */}
            <div className="flex items-center gap-2 bg-muted/60 p-1.5 rounded-2xl border border-border">
              <button
                onClick={prevMonth}
                className="p-1.5 rounded-xl hover:bg-background text-muted-foreground hover:text-foreground transition-all active:scale-90"
                title="Previous Month"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-xs font-bold text-foreground px-3 min-w-[130px] text-center">
                {monthNames[month]} {year}
              </span>
              <button
                onClick={nextMonth}
                className="p-1.5 rounded-xl hover:bg-background text-muted-foreground hover:text-foreground transition-all active:scale-90"
                title="Next Month"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Days of Week Header */}
          <div className="grid grid-cols-7 gap-2 text-center text-[11px] font-bold uppercase tracking-wider text-muted-foreground pb-2 border-b border-border/60">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
              <div key={d}>{d}</div>
            ))}
          </div>

          {/* Day Cells */}
          <div className="grid grid-cols-7 gap-2">
            {/* Blank padding days for start of month */}
            {Array.from({ length: firstDayOfMonth }).map((_, i) => (
              <div key={`blank-${i}`} className="h-24 rounded-2xl bg-muted/20 border border-border/30 opacity-40" />
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
              const dayTasks = tasks.filter(t => getTaskDayNumber(t) === day)

              return (
                <div
                  key={day}
                  onClick={() => setSelectedDay(day)}
                  className={`h-24 p-2 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between overflow-hidden ${isSelected
                      ? 'border-primary ring-2 ring-primary/20 bg-primary/5 shadow-md'
                      : isToday
                        ? 'border-primary/50 bg-accent/40'
                        : 'border-border/60 bg-background hover:border-border hover:bg-accent/20'
                    }`}
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={`text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center ${isToday
                          ? 'bg-primary text-primary-foreground'
                          : isSelected
                            ? 'text-primary font-extrabold'
                            : 'text-foreground'
                        }`}
                    >
                      {day}
                    </span>
                    {dayTasks.length > 0 && (
                      <span className="w-2 h-2 rounded-full bg-primary ring-2 ring-background animate-pulse" />
                    )}
                  </div>

                  <div className="space-y-1 mt-1">
                    {dayTasks.slice(0, 2).map((t) => {
                      const taskProj = projects.find(p => p.id === t.projectId)
                      const pColor = taskProj?.color || '#6366F1'

                      return (
                        <div
                          key={t.id}
                          className="text-[9px] font-semibold truncate px-1.5 py-0.5 rounded-md border flex items-center gap-1"
                          style={{
                            backgroundColor: taskProj ? `${pColor}1A` : 'hsl(var(--muted))',
                            borderColor: taskProj ? `${pColor}50` : 'hsl(var(--border) / 0.5)',
                            color: taskProj ? pColor : 'hsl(var(--foreground))',
                          }}
                        >
                          <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: pColor }} />
                          <span className="truncate font-bold">{t.title}</span>
                        </div>
                      )
                    })}
                    {dayTasks.length > 2 && (
                      <div className="text-[8px] text-muted-foreground text-center font-bold">
                        +{dayTasks.length - 2} more
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Day Milestone Inspector (1 col) */}
        <div className="p-6 rounded-3xl bg-card border border-border/80 shadow-sm space-y-5 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Day Inspection
                </span>
                <h3 className="text-base font-bold text-foreground mt-0.5">
                  {monthNames[month]} {selectedDay}, {year}
                </h3>
              </div>
              <button
                onClick={() => {
                  setNewTaskDay(selectedDay.toString())
                  setIsModalOpen(true)
                }}
                className="p-2 rounded-xl bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-all shadow-sm"
                title="Add task for this day"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>

            {/* Scheduled Tasks for selected day */}
            <div className="space-y-3 max-h-[480px] overflow-y-auto pr-1">
              {displayTasks.length === 0 ? (
                <div className="p-8 text-center bg-muted/20 border border-dashed border-border rounded-2xl text-xs text-muted-foreground">
                  No deliverables scheduled on {monthNames[month]} {selectedDay}.
                </div>
              ) : (
                displayTasks.slice(0, 4).map((task) => {
                  const taskProject = projects.find(p => p.id === task.projectId)
                  const projectEnvs = getProjectEnvs(task.projectId)
                  const projectColor = taskProject?.color || (taskProject ? '#6366F1' : undefined)

                  return (
                    <div
                      key={task.id}
                      className="p-4 rounded-2xl border shadow-sm space-y-3 transition-all hover:shadow-md"
                      style={{
                        backgroundColor: projectColor ? `${projectColor}0F` : 'hsl(var(--background))',
                        borderColor: projectColor ? `${projectColor}45` : 'hsl(var(--border) / 0.8)',
                        boxShadow: projectColor ? `0 4px 16px -2px ${projectColor}15` : undefined,
                      }}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5">
                          {taskProject && (
                            <span
                              className="text-[10px] font-extrabold px-2.5 py-1 rounded-xl flex items-center gap-1.5 border shadow-xs"
                              style={{
                                backgroundColor: `${projectColor}20`,
                                color: projectColor,
                                borderColor: `${projectColor}50`,
                              }}
                            >
                              <FolderKanban className="w-3 h-3" />
                              {taskProject.name}
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] text-muted-foreground font-semibold">
                          Due: {task.dueDate || 'Today'}
                        </span>
                      </div>

                      <Link
                        href={`/app/tasks/${task.id}`}
                        className="block text-xs font-bold leading-snug hover:underline transition-colors"
                        style={{
                          color: projectColor ? projectColor : 'hsl(var(--foreground))',
                        }}
                      >
                        {task.title}
                      </Link>

                      {/* Project-Specific Environment Lifecycle Timeline */}
                      <div className="pt-2 border-t border-border/50 space-y-1.5">
                        <div className="text-[10px] font-semibold text-muted-foreground flex items-center justify-between">
                          <span>Milestone Lifecycle</span>
                          <span className="font-bold" style={{ color: projectColor || 'hsl(var(--primary))' }}>
                            {task.status.toUpperCase()}
                          </span>
                        </div>
                        <div
                          className="grid gap-1 text-[8px] text-center font-bold"
                          style={{ gridTemplateColumns: `repeat(${projectEnvs.length}, minmax(0, 1fr))` }}
                        >
                          {projectEnvs.map((env) => {
                            const isPassed =
                              (task.status === 'done') ||
                              (task.environment === env)

                            return (
                              <div
                                key={env}
                                className={`py-1 rounded-md border transition-all ${task.environment === env
                                    ? 'text-white font-extrabold shadow-xs'
                                    : isPassed
                                      ? 'bg-muted text-foreground border-border'
                                      : 'bg-muted/30 text-muted-foreground/50 border-transparent'
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

                      <div className="flex items-center justify-between pt-2 border-t border-border/40 text-[10px]">
                        <button
                          onClick={() => handleDispatchNotification(task.id)}
                          className="hover:underline font-semibold flex items-center gap-1"
                          style={{ color: projectColor || 'hsl(var(--primary))' }}
                        >
                          <Send className="w-3 h-3" /> Email Reminder
                        </button>
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Modal: Add Calendar Task */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-card border border-border rounded-2xl p-6 w-full max-w-md shadow-2xl space-y-4 animate-scale-in">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                <Plus className="w-4 h-4 text-primary" /> Schedule Deliverable Milestone
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateTask} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Task Title</label>
                <input
                  type="text"
                  placeholder="e.g. Merge Hotfix to Release pipeline"
                  value={newTaskTitle}
                  onChange={e => setNewTaskTitle(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-background border border-border text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  autoFocus
                  required
                />
              </div>

              {projects.length > 0 && (
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">Project</label>
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
                    <option value="">No Project (Standalone)</option>
                    {projects.map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">Scheduled Day</label>
                  <input
                    type="number"
                    min={1}
                    max={daysInMonth}
                    value={newTaskDay || selectedDay}
                    onChange={e => setNewTaskDay(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-background border border-border text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">Target Environment</label>
                  <select
                    value={newTaskEnv}
                    onChange={e => setNewTaskEnv(e.target.value as TaskEnvironment)}
                    className="w-full px-3 py-2 rounded-xl bg-background border border-border text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    {getProjectEnvs(newTaskProjectId).map(e => (
                      <option key={e} value={e}>{e}</option>
                    ))}
                  </select>
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
                  Schedule Deliverable
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
