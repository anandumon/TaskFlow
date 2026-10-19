'use client'

import { useEffect, useState, useRef } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/stores/auth-store'
import { useWorkspaceStore } from '@/stores/workspace-store'
import { useTaskStore, Task } from '@/stores/task-store'
import { useProjectStore } from '@/stores/project-store'
import { DashboardSkeleton } from '@/components/loading'
import { usePermissions } from '@/hooks/usePermissions'
import {
  calculateWeightedProgress,
  isCompletedTask,
  isInReviewTask,
  isInProgressTask,
  isTodoTask,
} from '@/lib/progress'
import {
  CheckCircle2,
  CheckSquare,
  Clock,
  AlertCircle,
  TrendingUp,
  FolderKanban,
  Users2,
  ArrowUpRight,
  Plus,
  Sparkles,
  MoreVertical,
  Calendar,
  GitBranch,
  Server
} from 'lucide-react'

export default function DashboardPage() {
  const router = useRouter()
  const { user } = useAuthStore()
  const { canCreateProject } = usePermissions()
  const { currentWorkspace } = useWorkspaceStore()
  const { tasks, loadTasks, updateStatus, isLoading: tasksLoading } = useTaskStore()
  const { projects, loadProjects, isLoading: projectsLoading } = useProjectStore()

  const [dataLoaded, setDataLoaded] = useState(false)
  const lastWsRef = useRef<string | null>(null)

  useEffect(() => {
    if (!currentWorkspace?.id) return
    let active = true
    if (lastWsRef.current !== currentWorkspace.id) {
      setDataLoaded(false)
    }

    Promise.all([
      loadTasks(currentWorkspace.id),
      loadProjects(currentWorkspace.id),
    ]).finally(() => {
      if (active) {
        lastWsRef.current = currentWorkspace.id
        setDataLoaded(true)
      }
    })

    return () => {
      active = false
    }
  }, [currentWorkspace?.id, loadTasks, loadProjects])

  // Show skeleton until all APIs complete or while actively loading
  if (!dataLoaded || (tasksLoading && tasks.length === 0) || (projectsLoading && projects.length === 0)) {
    return <DashboardSkeleton />
  }

  const totalTasks = tasks.length
  const completedTasks = tasks.filter((t) => isCompletedTask(t)).length
  const inReviewTasks = tasks.filter((t) => isInReviewTask(t)).length
  const inProgressTasks = tasks.filter((t) => isInProgressTask(t)).length
  const weightedProgress = calculateWeightedProgress(tasks)

  const handleToggleTask = async (task: Task) => {
    const nextStatus = task.status === 'done' ? 'todo' : 'done'
    const nextEnv = nextStatus === 'done' ? 'MAIN' : 'DEV'
    await updateStatus(task.id, nextStatus as any, nextEnv as any)
    if (currentWorkspace?.id) {
      loadProjects(currentWorkspace.id)
    }
  }

  const stats = [
    {
      label: 'Tasks Completed',
      value: completedTasks.toString(),
      change: `${completedTasks} of ${totalTasks} in MAIN`,
      trend: 'up',
      icon: CheckCircle2,
      color: 'text-emerald-500 bg-emerald-500/10',
    },
    {
      label: 'In Progress',
      value: inProgressTasks.toString(),
      change: `${inProgressTasks} active (35% weighted)`,
      trend: inProgressTasks > 0 ? 'up' : 'neutral',
      icon: Clock,
      color: 'text-amber-500 bg-amber-500/10',
    },
    {
      label: 'Sprint Progress',
      value: `${weightedProgress}%`,
      change: 'Weighted across all stages',
      trend: 'up',
      icon: TrendingUp,
      color: 'text-primary bg-primary/10',
    },
    {
      label: 'In Review (SIT/UAT)',
      value: inReviewTasks.toString(),
      change: `${inReviewTasks} in review (75% weighted)`,
      trend: inReviewTasks > 0 ? 'up' : 'neutral',
      icon: GitBranch,
      color: 'text-purple-500 bg-purple-500/10',
    },
  ]

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

  return (
    <div className="space-y-8 max-w-7xl mx-auto animate-fade-in">
      {/* Welcome Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 rounded-3xl bg-gradient-to-r from-primary/10 via-secondary/10 to-transparent border border-border/70 backdrop-blur-sm shadow-sm">
        <div>
          <div className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-primary mb-1">
            <Sparkles className="w-3.5 h-3.5" /> Workspace Overview & Health
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight text-foreground">
            Good day, {user?.firstName || 'Admin'} 👋
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            Activity and deliverables across{' '}
            <span className="font-semibold text-foreground">
              {currentWorkspace?.name || 'Engineering & Product'}
            </span>
            .
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/app/calendar"
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-card hover:bg-accent border border-border text-xs font-semibold transition-all shadow-sm active:scale-95"
          >
            <Calendar className="w-3.5 h-3.5 text-primary" />
            <span>Sprint Calendar</span>
          </Link>
          {canCreateProject && (
            <Link
              href="/app/projects"
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-all shadow-md shadow-primary/20 active:scale-95"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New Project</span>
            </Link>
          )}
        </div>
      </div>

      {/* Real Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, i) => {
          const Icon = stat.icon
          return (
            <div
              key={i}
              className="p-5 rounded-3xl bg-card border border-border/80 shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground">{stat.label}</span>
                <div className={`p-2 rounded-xl ${stat.color}`}>
                  <Icon className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-4 flex items-baseline justify-between">
                <div className="text-2xl font-extrabold tracking-tight text-foreground">
                  {stat.value}
                </div>
                <span className="text-[11px] font-semibold text-muted-foreground">
                  {stat.change}
                </span>
              </div>
            </div>
          )
        })}
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Active Projects (2 cols) */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FolderKanban className="w-4 h-4 text-primary" />
              <h2 className="text-base font-bold text-foreground">Active Projects ({projects.length})</h2>
            </div>
            <Link
              href="/app/projects"
              className="text-xs font-semibold text-primary hover:underline flex items-center gap-1"
            >
              View all <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="space-y-3">
            {projects.length === 0 ? (
              <div className="p-8 text-center bg-card border border-dashed border-border rounded-2xl text-xs text-muted-foreground">
                No active projects. Click &quot;New Project&quot; to create one.
              </div>
            ) : (
              projects.slice(0, 3).map((project) => {
                const projectTasks = tasks.filter((t) => t.projectId === project.id)
                const projTotal = projectTasks.length > 0 ? projectTasks.length : (project.totalTasks || 0)
                const projCompleted = projectTasks.length > 0 ? projectTasks.filter(isCompletedTask).length : (project.completedTasks || 0)
                const projProgress = projectTasks.length > 0 ? calculateWeightedProgress(projectTasks) : (project.progress || 0)

                let envList: string[] = ['DEV', 'SIT', 'UAT', 'RELEASE', 'MAIN']
                try {
                  if (project.environments) {
                    const parsed = JSON.parse(project.environments)
                    if (Array.isArray(parsed) && parsed.length > 0) envList = parsed
                  }
                } catch {
                  if (typeof project.environments === 'string' && project.environments.trim()) {
                    envList = project.environments.split(',').map((e) => e.trim())
                  }
                }

                return (
                  <div
                    key={project.id}
                    onClick={() => router.push(`/app/projects/${project.id}`)}
                    className="p-5 rounded-2xl bg-card border border-border/80 shadow-sm hover:border-primary/40 transition-all group cursor-pointer"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2.5">
                          <div
                            className="w-3 h-3 rounded-full shrink-0 shadow-xs"
                            style={{ backgroundColor: project.color || '#6366F1' }}
                          />
                          <h3 className="text-sm font-bold text-foreground group-hover:text-primary transition-colors">
                            {project.name}
                          </h3>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-primary/10 text-primary uppercase">
                            {project.status || 'ACTIVE'}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{project.description}</p>
                      </div>
                      <span className="text-xs font-bold text-foreground">{projProgress}%</span>
                    </div>

                    {/* Progress bar */}
                    <div className="mt-4 space-y-1.5">
                      <div className="w-full h-2 rounded-full bg-muted overflow-hidden">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-primary to-secondary transition-all duration-500"
                          style={{ width: `${projProgress}%` }}
                        />
                      </div>
                    </div>

                    <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground pt-3 border-t border-border/50 flex-wrap gap-2">
                      <div className="flex items-center gap-1.5 text-[11px]">
                        <Users2 className="w-3.5 h-3.5" />
                        <span>{projCompleted}/{projTotal} tasks completed</span>
                      </div>
                      <div className="flex items-center gap-1 flex-wrap">
                        <span className="text-[10px] font-semibold text-muted-foreground mr-1">Pipeline:</span>
                        {envList.map((env) => (
                          <span
                            key={env}
                            className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded-md border ${getEnvBadgeStyle(env)}`}
                          >
                            {env}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>

        {/* Actionable Live Tasks (1 col) */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckSquare className="w-4 h-4 text-primary" />
              <h2 className="text-base font-bold text-foreground">Priority Tasks ({tasks.length})</h2>
            </div>
            <Link href="/app/tasks" className="text-xs font-semibold text-primary hover:underline">
              All Tasks
            </Link>
          </div>

          <div className="space-y-2.5">
            {tasks.length === 0 ? (
              <div className="p-8 text-center bg-card border border-dashed border-border rounded-2xl text-xs text-muted-foreground">
                No tasks available. Add tasks from the Tasks Board.
              </div>
            ) : (
              tasks.slice(0, 5).map((task) => {
                const isDone = task.status === 'done'

                return (
                  <div
                    key={task.id}
                    onClick={() => handleToggleTask(task)}
                    className={`p-4 rounded-xl bg-card border border-border/80 shadow-sm hover:bg-accent/30 transition-all flex items-start gap-3 cursor-pointer ${isDone ? 'opacity-50' : ''
                      }`}
                  >
                    <input
                      type="checkbox"
                      checked={isDone}
                      onChange={() => handleToggleTask(task)}
                      onClick={(e) => e.stopPropagation()}
                      className="mt-1 rounded border-border text-primary focus:ring-primary h-4 w-4 cursor-pointer"
                    />
                    <div className="flex-1 min-w-0">
                      <div className={`text-xs font-semibold text-foreground truncate ${isDone ? 'line-through text-muted-foreground' : ''}`}>
                        {task.title}
                      </div>
                      <div className="flex items-center gap-2 mt-1.5">
                        <span className={`text-[8px] font-bold px-1.5 py-0.2 rounded border ${getEnvBadgeStyle(task.environment || 'DEV')}`}>
                          {task.environment || 'DEV'}
                        </span>
                        <span className="text-[10px] font-medium text-muted-foreground">
                          {task.tag}
                        </span>
                        <span className="text-[10px] text-muted-foreground ml-auto">
                          {task.dueDate || 'Tomorrow'}
                        </span>
                      </div>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
