'use client'

import { FolderKanban, Users, ShieldCheck, Calendar, Tag, History } from 'lucide-react'
import { Task } from '@/stores/task-store'
import { Project } from '@/stores/project-store'
import { getEnvForStatus } from '@/lib/task-category'

interface TaskPropertiesCardProps {
  task: Task
  project?: Project
}

export function getFirstName(raw?: string): string {
  const trimmed = (raw || '').trim()
  if (!trimmed) return ''
  if (trimmed.toLowerCase() === 'you') return 'You'
  if (trimmed.toLowerCase() === 'lead reviewer') return 'Lead Reviewer'
  if (trimmed.includes('@')) {
    const local = trimmed.split('@')[0]
    const part = local.split(/[._-]/)[0]
    return part.charAt(0).toUpperCase() + part.slice(1)
  }
  const parts = trimmed.split(/\s+/)
  return parts[0]
}

export function TaskPropertiesCard({ task, project }: TaskPropertiesCardProps) {
  return (
    <div className="space-y-6">
      {/* Properties Card */}
      <div className="p-6 rounded-3xl bg-card border border-border/80 shadow-sm space-y-5">
        <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
          Deliverable Properties
        </h3>

        <div className="space-y-4 text-xs">
          {/* Project Link */}
          <div className="flex items-center justify-between pb-3 border-b border-border/50">
            <span className="text-muted-foreground font-medium flex items-center gap-1.5">
              <FolderKanban className="w-3.5 h-3.5" /> Project
            </span>
            <span className="font-bold text-primary">
              {project ? project.name : 'Standalone Deliverable'}
            </span>
          </div>

          {/* Multi-Assignees */}
          <div className="space-y-2 pb-3 border-b border-border/50">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground font-medium flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5" /> Assigned Team
              </span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {(task.assignees || task.assigneeName || 'You')
                .split(',')
                .map((a, i) => {
                  const firstName = getFirstName(a)
                  if (!firstName) return null
                  return (
                    <span
                      key={i}
                      className="px-2.5 py-1 rounded-xl bg-primary/10 text-primary font-bold text-[11px] flex items-center gap-1"
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                      {firstName}
                    </span>
                  )
                })}
            </div>
          </div>

          {/* Dedicated Reviewer */}
          <div className="flex items-center justify-between pb-3 border-b border-border/50">
            <span className="text-muted-foreground font-medium flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-purple-500" /> Reviewer
            </span>
            <span className="font-bold text-purple-600 dark:text-purple-400 px-2 py-0.5 rounded-md bg-purple-500/10">
              {getFirstName(task.reviewerName || 'Lead Reviewer')}
            </span>
          </div>

          {/* Due Date */}
          <div className="flex items-center justify-between pb-3 border-b border-border/50">
            <span className="text-muted-foreground font-medium flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5" /> Due Date
            </span>
            <span className="font-bold text-foreground">{task.dueDate || 'Today'}</span>
          </div>

          {/* Priority */}
          <div className="flex items-center justify-between pb-3 border-b border-border/50">
            <span className="text-muted-foreground font-medium">Priority</span>
            <span className="font-bold uppercase text-amber-500 px-2 py-0.5 rounded-md bg-amber-500/10">
              {task.priority || 'Medium'}
            </span>
          </div>

          {/* Tag / Category */}
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground font-medium flex items-center gap-1.5">
              <Tag className="w-3.5 h-3.5" /> Category
            </span>
            <span className="font-bold text-primary px-2 py-0.5 rounded-md bg-primary/10">
              {task.tag || 'Frontend'}
            </span>
          </div>
        </div>
      </div>

      {/* Activity History Timeline */}
      <div className="p-6 rounded-3xl bg-card border border-border/80 shadow-sm space-y-4">
        <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
          <History className="w-3.5 h-3.5 text-primary" /> Activity History
        </h3>

        <div className="space-y-3 text-xs">
          <div className="p-3 rounded-2xl bg-muted/40 border border-border/60 space-y-1">
            <div className="flex items-center justify-between font-bold text-foreground">
              <span>Current Stage: {getEnvForStatus(task.status, task.environment)}</span>
              <span className="text-[10px] text-muted-foreground font-normal">Active</span>
            </div>
            <div className="text-[11px] text-muted-foreground">
              Status: <strong>{task.status.toUpperCase()}</strong> &bull; Reviewer:{' '}
              {getFirstName(task.reviewerName || 'Lead')}
            </div>
          </div>

          <div className="p-3 rounded-2xl bg-muted/40 border border-border/60 space-y-1">
            <div className="flex items-center justify-between font-bold text-foreground">
              <span>Deliverable Created</span>
              <span className="text-[10px] text-muted-foreground font-normal">Created</span>
            </div>
            <div className="text-[11px] text-muted-foreground">
              Initial environment: DEV &bull; Database isolated
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
