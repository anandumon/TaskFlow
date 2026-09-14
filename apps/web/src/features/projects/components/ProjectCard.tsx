import Link from 'next/link'
import { FolderKanban, Trash2, Layers, ArrowRight, GripVertical } from 'lucide-react'
import { Project } from '@/types'
import { ALL_ENVIRONMENTS } from '@/constants'

interface ProjectCardProps {
  project: Project
  onDeleteProject: (id: string) => Promise<void>
  draggable?: boolean
  onDragStart?: (e: React.DragEvent) => void
  onDragOver?: (e: React.DragEvent) => void
  onDrop?: (e: React.DragEvent) => void
  onDragEnd?: () => void
  isDragging?: boolean
}

export function ProjectCard({
  project,
  onDeleteProject,
  draggable,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
  isDragging,
}: ProjectCardProps) {
  let projectEnvs: string[] = [...ALL_ENVIRONMENTS]
  try {
    if (project.environments) {
      projectEnvs = JSON.parse(project.environments)
    }
  } catch {
    projectEnvs = [...ALL_ENVIRONMENTS]
  }

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

  const projColor = getProjectColor(project)

  const getEnvBadgeStyle = (env: string) => {
    switch (env) {
      case 'DEV':
        return 'bg-blue-500/15 text-blue-600 border-blue-500/30'
      case 'SIT':
        return 'bg-amber-500/15 text-amber-600 border-amber-500/30'
      case 'UAT':
        return 'bg-purple-500/15 text-purple-600 border-purple-500/30'
      case 'RELEASE':
        return 'bg-rose-500/15 text-rose-600 border-rose-500/30'
      case 'MAIN':
        return 'bg-emerald-500/15 text-emerald-600 border-emerald-500/30'
      default:
        return 'bg-muted text-muted-foreground border-border'
    }
  }

  return (
    <div
      draggable={draggable}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDrop={onDrop}
      onDragEnd={onDragEnd}
      className={`p-6 rounded-3xl border transition-all space-y-4 relative overflow-hidden group flex flex-col justify-between backdrop-blur-xl shadow-[0_8px_32px_0_rgba(0,0,0,0.3)] hover:scale-[1.01] ${
        draggable ? 'cursor-move select-none' : ''
      } ${isDragging ? 'opacity-40 scale-95 border-dashed border-primary ring-2 ring-primary/40' : ''}`}
      style={{
        backgroundColor: `${projColor}14`,
        borderColor: `${projColor}50`,
        boxShadow: `0 8px 32px -4px ${projColor}25`,
      }}
      title={draggable ? 'Drag to reorder project position' : undefined}
    >
      {/* Top Glass Gloss Shine */}
      <div className="absolute inset-x-0 top-0 h-[1.5px] bg-gradient-to-r from-transparent via-white/40 to-transparent pointer-events-none" />

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {draggable && (
              <div className="text-muted-foreground/40 hover:text-foreground cursor-grab active:cursor-grabbing p-0.5 shrink-0" title="Drag to reorder">
                <GripVertical className="w-4 h-4" />
              </div>
            )}
            <Link
              href={`/app/projects/${project.id}`}
              className="transition-all block"
            >
              <h3
                className="text-lg font-bold transition-colors tracking-tight flex items-center gap-1.5"
                style={{ color: projColor }}
              >
                {project.name}
                <ArrowRight className="w-4 h-4 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
              </h3>
              {project.description && project.description !== 'Comprehensive project milestones & deliverables' ? (
                <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
                  {project.description}
                </p>
              ) : null}
            </Link>
          </div>

          <button
            onClick={(e) => {
              e.stopPropagation()
              onDeleteProject(project.id)
            }}
            className="p-1.5 rounded-xl text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
            title="Delete Project"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>

        <Link href={`/app/projects/${project.id}`} className="block space-y-1.5 cursor-pointer">
          <div className="flex items-center justify-between text-xs font-semibold">
            <span className="text-muted-foreground">Weighted Delivery Progress</span>
            <span className="font-extrabold" style={{ color: projColor }}>
              {project.progress || 0}%
            </span>
          </div>
          <div className="w-full h-2.5 rounded-full bg-muted/80 overflow-hidden border border-border/40">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                backgroundColor: projColor,
                width: `${project.progress || 0}%`,
              }}
            />
          </div>
        </Link>
      </div>

      <div className="pt-3 border-t border-border/50 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 flex-wrap">
          {projectEnvs.map((env) => (
            <span
              key={env}
              className={`text-[9px] font-extrabold px-2 py-0.5 rounded-md border ${getEnvBadgeStyle(env)}`}
            >
              {env}
            </span>
          ))}
        </div>

        <Link
          href={`/app/projects/${project.id}`}
          className="text-xs font-bold text-primary flex items-center gap-1 hover:underline shrink-0"
        >
          <span>View Tasks</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>
    </div>
  )
}
