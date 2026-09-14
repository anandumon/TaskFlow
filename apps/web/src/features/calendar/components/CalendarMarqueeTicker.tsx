'use client'

import { Zap, Clock, FolderKanban } from 'lucide-react'
import { Task, Project } from '@/types'

interface CalendarMarqueeTickerProps {
  tasks: Task[]
  projects: Project[]
  onSelectTaskDate: (dueDate: string) => void
}

export function CalendarMarqueeTicker({ tasks, projects, onSelectTaskDate }: CalendarMarqueeTickerProps) {
  // Ensure only unique tasks by id and show each task only once
  const uniqueUpcomingTasks = Array.from(
    new Map(
      tasks
        .filter((t) => t.status !== 'done' && t.dueDate)
        .map((t) => [t.id, t])
    ).values()
  ).slice(0, 15)

  if (uniqueUpcomingTasks.length === 0) return null

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
    const seed = proj?.name || proj?.id || 'TaskFlow'
    let hash = 0
    for (let i = 0; i < seed.length; i++) {
      hash = seed.charCodeAt(i) + ((hash << 5) - hash)
    }
    return colorPalette[Math.abs(hash) % colorPalette.length]
  }

  return (
    <div className="relative overflow-hidden rounded-2xl backdrop-blur-xl bg-card/60 dark:bg-black/30 border border-white/10 dark:border-white/[0.08] p-2.5 shadow-[0_8px_30px_rgb(0,0,0,0.12)]">
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-primary to-purple-600 text-white text-[10px] font-extrabold uppercase tracking-wider shrink-0 shadow-md shadow-primary/20 z-10">
          <Zap className="w-3.5 h-3.5 animate-pulse text-amber-300" />
          <span>Upcoming Due Dates ({uniqueUpcomingTasks.length})</span>
        </div>

        {/* Liquid Glass Scrollable Container - Each unique task appears exactly once */}
        <div className="flex-1 overflow-x-auto scrollbar-none py-0.5">
          <div className="flex items-center gap-2.5 w-max">
            {uniqueUpcomingTasks.map((t) => {
              const proj = projects.find((p) => p.id === t.projectId)
              const projColor = getProjectColor(proj)

              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => t.dueDate && onSelectTaskDate(t.dueDate)}
                  className="inline-flex items-center gap-2.5 px-3.5 py-1.5 rounded-xl border text-xs font-semibold transition-all shadow-xs cursor-pointer hover:scale-[1.02] active:scale-95 shrink-0 backdrop-blur-md relative overflow-hidden group"
                  style={{
                    borderColor: `${projColor}50`,
                    backgroundColor: `${projColor}15`,
                    boxShadow: `0 4px 16px -2px ${projColor}20`,
                  }}
                  title={`Click to inspect due date ${t.dueDate}`}
                >
                  {/* Subtle top glass reflection highlight */}
                  <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-white/30 to-transparent pointer-events-none" />

                  <span
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{ backgroundColor: projColor }}
                  />
                  <span className="max-w-[200px] truncate font-bold text-foreground group-hover:text-primary transition-colors">
                    {t.title}
                  </span>

                  {proj && (
                    <span
                      className="text-[10px] px-2 py-0.5 rounded-md font-extrabold flex items-center gap-1 border truncate max-w-[120px]"
                      style={{
                        backgroundColor: `${projColor}25`,
                        color: projColor,
                        borderColor: `${projColor}55`,
                      }}
                    >
                      <FolderKanban className="w-2.5 h-2.5 shrink-0" />
                      <span className="truncate">{proj.name}</span>
                    </span>
                  )}

                  <span className="text-[10px] font-mono flex items-center gap-1 px-2 py-0.5 rounded-lg border border-border/60 bg-muted/70 text-foreground font-semibold">
                    <Clock className="w-2.5 h-2.5 text-primary" />
                    {t.dueDate}
                  </span>
                </button>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
