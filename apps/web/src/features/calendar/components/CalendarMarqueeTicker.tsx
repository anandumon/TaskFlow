'use client'

import { Zap, Clock, FolderKanban } from 'lucide-react'
import { Task, Project } from '@/types'

interface CalendarMarqueeTickerProps {
  tasks: Task[]
  projects: Project[]
  onSelectTaskDate: (dueDate: string) => void
}

export function CalendarMarqueeTicker({ tasks, projects, onSelectTaskDate }: CalendarMarqueeTickerProps) {
  const upcomingTasks = tasks
    .filter((t) => t.status !== 'done' && t.dueDate)
    .slice(0, 10)

  if (upcomingTasks.length === 0) return null

  // Ensure plenty of looped elements for smooth non-stop RTL marquee translation
  const tickerItems = [
    ...upcomingTasks,
    ...upcomingTasks,
    ...upcomingTasks,
    ...upcomingTasks,
  ]

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
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-primary/15 via-purple-500/10 to-primary/15 border border-primary/20 p-2.5 shadow-xs">
      <style jsx>{`
        @keyframes marqueeRtlNonStop {
          0% {
            transform: translate3d(0%, 0, 0);
          }
          100% {
            transform: translate3d(-50%, 0, 0);
          }
        }
        .marquee-track-rtl {
          display: flex;
          gap: 1rem;
          width: max-content;
          animation: marqueeRtlNonStop 22s linear infinite;
          will-change: transform;
        }
      `}</style>

      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-primary text-primary-foreground text-[10px] font-extrabold uppercase tracking-wider shrink-0 shadow-xs z-10">
          <Zap className="w-3.5 h-3.5 animate-pulse" />
          <span>Upcoming Due Dates</span>
        </div>

        <div className="relative flex-1 overflow-hidden mask-fade-edges">
          <div className="marquee-track-rtl">
            {tickerItems.map((t, idx) => {
              const proj = projects.find((p) => p.id === t.projectId)
              const projColor = getProjectColor(proj)

              return (
                <button
                  key={`${t.id}-${idx}`}
                  type="button"
                  onClick={() => t.dueDate && onSelectTaskDate(t.dueDate)}
                  className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl border text-xs font-semibold text-foreground transition-all shadow-xs cursor-pointer active:scale-95 shrink-0"
                  style={{
                    borderColor: `${projColor}55`,
                    backgroundColor: `${projColor}14`,
                  }}
                >
                  <span
                    className="w-2 h-2 rounded-full shrink-0 animate-pulse"
                    style={{ backgroundColor: projColor }}
                  />
                  <span className="max-w-[240px] truncate font-bold text-foreground">{t.title}</span>
                  {proj && (
                    <span
                      className="text-[10px] px-2 py-0.5 rounded-md font-extrabold flex items-center gap-1 border"
                      style={{
                        backgroundColor: `${projColor}25`,
                        color: projColor,
                        borderColor: `${projColor}50`,
                      }}
                    >
                      <FolderKanban className="w-2.5 h-2.5" />
                      {proj.name}
                    </span>
                  )}
                  <span className="text-[10px] text-muted-foreground font-mono flex items-center gap-1 bg-muted px-1.5 py-0.5 rounded border border-border/40">
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
