'use client'

import { useEffect, useState } from 'react'
import {
  BarChart3,
  TrendingUp,
  Users,
  CheckCircle2,
  ArrowUpRight,
  Server,
  GitBranch,
  FolderKanban,
  GripVertical,
} from 'lucide-react'
import { useWorkspaceStore } from '@/stores/workspace-store'
import { useTaskStore } from '@/stores/task-store'
import { useProjectStore } from '@/stores/project-store'

export default function AnalyticsPage() {
  const { currentWorkspace } = useWorkspaceStore()
  const { tasks, loadTasks } = useTaskStore()
  const { projects, loadProjects } = useProjectStore()

  // Drag and drop ordering for KPI cards
  const [metricOrder, setMetricOrder] = useState<number[]>([0, 1, 2, 3])
  const [draggedMetricIndex, setDraggedMetricIndex] = useState<number | null>(null)

  // Drag and drop ordering for dashboard panels
  const [panelOrder, setPanelOrder] = useState<string[]>(['pipeline', 'workload'])
  const [draggedPanelId, setDraggedPanelId] = useState<string | null>(null)

  const handleMetricDragStart = (e: React.DragEvent, index: number) => {
    setDraggedMetricIndex(index)
    e.dataTransfer.setData('text/plain', index.toString())
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleMetricDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }

  const handleMetricDrop = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault()
    const sourceIdx = draggedMetricIndex != null ? draggedMetricIndex : parseInt(e.dataTransfer.getData('text/plain'), 10)
    if (isNaN(sourceIdx) || sourceIdx === targetIndex) return

    setMetricOrder((prev) => {
      const updated = [...prev]
      const fromPos = updated.indexOf(sourceIdx)
      const toPos = updated.indexOf(targetIndex)
      if (fromPos === -1 || toPos === -1) return prev

      const [moved] = updated.splice(fromPos, 1)
      updated.splice(toPos, 0, moved)
      return updated
    })
    setDraggedMetricIndex(null)
  }

  const handlePanelDragStart = (e: React.DragEvent, id: string) => {
    setDraggedPanelId(id)
    e.dataTransfer.setData('text/plain', id)
    e.dataTransfer.effectAllowed = 'move'
  }

  const handlePanelDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }

  const handlePanelDrop = (e: React.DragEvent, targetId: string) => {
    e.preventDefault()
    const sourceId = draggedPanelId || e.dataTransfer.getData('text/plain')
    if (!sourceId || sourceId === targetId) return

    setPanelOrder((prev) => {
      const updated = [...prev]
      const fromPos = updated.indexOf(sourceId)
      const toPos = updated.indexOf(targetId)
      if (fromPos === -1 || toPos === -1) return prev

      const [moved] = updated.splice(fromPos, 1)
      updated.splice(toPos, 0, moved)
      return updated
    })
    setDraggedPanelId(null)
  }

  useEffect(() => {
    if (currentWorkspace?.id) {
      loadTasks(currentWorkspace.id)
      loadProjects(currentWorkspace.id)
    }
  }, [currentWorkspace?.id, loadTasks, loadProjects])

  const totalTasks = tasks.length
  const completedTasks = tasks.filter(t => t.status === 'done').length
  const inReviewTasks = tasks.filter(t => t.status === 'in_review').length
  const inProgressTasks = tasks.filter(t => t.status === 'in_progress').length
  const todoTasks = tasks.filter(t => t.status === 'todo').length

  const velocityRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 100

  // Environment breakdown counts
  const envCounts = {
    DEV: tasks.filter(t => t.environment === 'DEV').length,
    SIT: tasks.filter(t => t.environment === 'SIT').length,
    UAT: tasks.filter(t => t.environment === 'UAT').length,
    RELEASE: tasks.filter(t => t.environment === 'RELEASE').length,
    MAIN: tasks.filter(t => t.environment === 'MAIN').length,
  }

  // Tag breakdown counts
  const tagCounts: Record<string, number> = {}
  tasks.forEach(t => {
    const tag = t.tag || 'General'
    tagCounts[tag] = (tagCounts[tag] || 0) + 1
  })

  const rawMetricCards = [
    {
      id: 0,
      title: 'Completed Sprint Velocity',
      value: `${velocityRate}%`,
      change: `${completedTasks} of ${totalTasks} deliverables done`,
      color: 'text-primary'
    },
    {
      id: 1,
      title: 'Active Projects',
      value: `${projects.length}`,
      change: `${projects.reduce((acc, p) => acc + (p.progress || 0), 0) / (projects.length || 1)}% avg progress`,
      color: 'text-emerald-500'
    },
    {
      id: 2,
      title: 'In QA & Review Pipeline',
      value: `${inReviewTasks}`,
      change: `${envCounts.SIT} SIT &bull; ${envCounts.UAT} UAT &bull; ${envCounts.RELEASE} Rel`,
      color: 'text-purple-500'
    },
    {
      id: 3,
      title: 'Production Releases (MAIN)',
      value: `${envCounts.MAIN}`,
      change: 'Deployed to Main',
      color: 'text-amber-500'
    },
  ]

  const orderedMetrics = metricOrder.map(idx => rawMetricCards[idx]).filter(Boolean)

  const envDisplayConfig: Record<string, { label: string; color: string; desc: string }> = {
    DEV: { label: 'DEV', color: 'bg-sky-500', desc: 'Local feature implementation' },
    SIT: { label: 'SIT', color: 'bg-amber-500', desc: 'System integration validation' },
    UAT: { label: 'UAT', color: 'bg-purple-500', desc: 'User acceptance testing' },
    RELEASE: { label: 'RELEASE', color: 'bg-pink-500', desc: 'Pre-release staging candidate' },
    MAIN: { label: 'MAIN', color: 'bg-emerald-500', desc: 'Merged into production' },
  }

  return (
    <div className="space-y-8 max-w-7xl mx-auto animate-fade-in pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-primary" /> Analytics &amp; Pipeline Intelligence
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            Real-time productivity analytics, environment promotion distribution, and sprint health.
          </p>
        </div>
        <span className="text-[10px] text-muted-foreground bg-muted px-2.5 py-1 rounded-full w-fit">
          Drag cards to customize dashboard layout
        </span>
      </div>

      {/* Metric Cards - Reorderable Drag & Drop */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {orderedMetrics.map((m) => (
          <div
            key={m.id}
            draggable={true}
            onDragStart={(e) => handleMetricDragStart(e, m.id)}
            onDragOver={handleMetricDragOver}
            onDrop={(e) => handleMetricDrop(e, m.id)}
            onDragEnd={() => setDraggedMetricIndex(null)}
            className={`p-5 rounded-3xl bg-card border border-border/80 shadow-sm flex flex-col justify-between cursor-move select-none transition-all hover:border-primary/50 hover:shadow-md ${
              draggedMetricIndex === m.id ? 'opacity-40 scale-95 border-dashed border-primary ring-2 ring-primary/40' : ''
            }`}
            title="Drag to place at any position"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-semibold text-muted-foreground">{m.title}</span>
              <div className="text-muted-foreground/40 hover:text-foreground cursor-grab active:cursor-grabbing p-0.5 shrink-0" title="Drag to reorder">
                <GripVertical className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="mt-3">
              <div className={`text-2xl font-extrabold tracking-tight ${m.color}`}>
                {m.value}
              </div>
              <div
                className="text-[11px] text-muted-foreground font-medium mt-1"
                dangerouslySetInnerHTML={{ __html: m.change }}
              />
            </div>
          </div>
        ))}
      </div>

      {/* Velocity and Sprint Distribution - Reorderable Panels */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {panelOrder.map((pId) => {
          if (pId === 'pipeline') {
            return (
              <div
                key="pipeline"
                draggable={true}
                onDragStart={(e) => handlePanelDragStart(e, 'pipeline')}
                onDragOver={handlePanelDragOver}
                onDrop={(e) => handlePanelDrop(e, 'pipeline')}
                onDragEnd={() => setDraggedPanelId(null)}
                className={`p-6 rounded-3xl bg-card border border-border/80 shadow-sm space-y-4 cursor-move select-none transition-all hover:border-primary/50 ${
                  draggedPanelId === 'pipeline' ? 'opacity-40 scale-95 border-dashed border-primary ring-2 ring-primary/40' : ''
                }`}
                title="Drag to place at any position"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="text-muted-foreground/40 hover:text-foreground cursor-grab active:cursor-grabbing p-0.5 shrink-0">
                      <GripVertical className="w-4 h-4" />
                    </div>
                    <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                      <Server className="w-4 h-4 text-primary" /> Environment Promotion Pipeline
                    </h3>
                  </div>
                  <span className="text-xs text-emerald-600 font-semibold flex items-center gap-1">
                    <TrendingUp className="w-3.5 h-3.5" /> Live Metrics
                  </span>
                </div>

                <p className="text-xs text-muted-foreground">
                  Distribution of tasks across promotion stages (DEV &rarr; SIT &rarr; UAT &rarr; RELEASE &rarr; MAIN):
                </p>

                <div className="space-y-3 pt-2">
                  {Object.entries(envCounts).map(([env, count]) => {
                    const percent = totalTasks > 0 ? Math.round((count / totalTasks) * 100) : 0
                    const cfg = envDisplayConfig[env] || { label: env, color: 'bg-primary', desc: '' }

                    return (
                      <div key={env} className="space-y-1.5">
                        <div className="flex justify-between text-xs font-semibold">
                          <span className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: cfg.color.replace('bg-', '') }} />
                            <span className="text-foreground">{env}</span>
                            <span className="text-[10px] text-muted-foreground font-normal">({cfg.desc})</span>
                          </span>
                          <span className="text-foreground font-bold">{count} tasks ({percent}%)</span>
                        </div>
                        <div className="w-full h-2.5 rounded-full bg-muted overflow-hidden">
                          <div className={`h-full rounded-full ${cfg.color} transition-all duration-500`} style={{ width: `${percent}%` }} />
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          }

          // Work Breakdown by Tag
          return (
            <div
              key="workload"
              draggable={true}
              onDragStart={(e) => handlePanelDragStart(e, 'workload')}
              onDragOver={handlePanelDragOver}
              onDrop={(e) => handlePanelDrop(e, 'workload')}
              onDragEnd={() => setDraggedPanelId(null)}
              className={`p-6 rounded-3xl bg-card border border-border/80 shadow-sm space-y-4 cursor-move select-none transition-all hover:border-primary/50 ${
                draggedPanelId === 'workload' ? 'opacity-40 scale-95 border-dashed border-primary ring-2 ring-primary/40' : ''
              }`}
              title="Drag to place at any position"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="text-muted-foreground/40 hover:text-foreground cursor-grab active:cursor-grabbing p-0.5 shrink-0">
                    <GripVertical className="w-4 h-4" />
                  </div>
                  <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                    <FolderKanban className="w-4 h-4 text-primary" /> Work Distribution by Category
                  </h3>
                </div>
                <span className="text-xs text-muted-foreground font-semibold">
                  {totalTasks} total tasks
                </span>
              </div>

              <p className="text-xs text-muted-foreground">
                Categorical workload allocation for engineering sprints:
              </p>

              <div className="space-y-3 pt-2">
                {Object.keys(tagCounts).length === 0 ? (
                  <div className="p-8 text-center text-xs text-muted-foreground border border-dashed border-border rounded-2xl">
                    No tasks available. Workload will appear once tasks are created.
                  </div>
                ) : (
                  Object.entries(tagCounts).map(([tag, count], idx) => {
                    const percent = totalTasks > 0 ? Math.round((count / totalTasks) * 100) : 0
                    const colors = ['bg-primary', 'bg-secondary', 'bg-emerald-500', 'bg-purple-500', 'bg-amber-500', 'bg-pink-500']
                    const color = colors[idx % colors.length]

                    return (
                      <div key={tag} className="space-y-1.5">
                        <div className="flex justify-between text-xs font-semibold">
                          <span className="text-muted-foreground">{tag}</span>
                          <span className="font-bold text-foreground">{count} tasks ({percent}%)</span>
                        </div>
                        <div className="w-full h-2.5 rounded-full bg-muted overflow-hidden">
                          <div className={`h-full rounded-full ${color} transition-all duration-500`} style={{ width: `${percent}%` }} />
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
    </div>
  )
}
