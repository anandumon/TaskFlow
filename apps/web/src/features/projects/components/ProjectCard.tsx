import Link from 'next/link'
import { FolderKanban, Trash2, Layers, ArrowRight, GripVertical, Pencil } from 'lucide-react'
import { Project } from '@/types'
import { ALL_ENVIRONMENTS } from '@/constants'

interface ProjectCardProps {
  project: Project
  onDeleteProject: (id: string) => Promise<void>
  onEditProject?: (project: any) => void
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
  onEditProject,
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

  const isImageLogo =
    project.icon &&
    (project.icon.startsWith('data:image') ||
      project.icon.startsWith('http') ||
      project.icon.startsWith('/'))

  const getEnvBadgeStyle = (env: string) => {
    switch (env) {
      case 'DEV':
        return 'bg-blue-500/10 dark:bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/20 dark:border-blue-500/30'
      case 'SIT':
        return 'bg-amber-500/10 dark:bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/20 dark:border-amber-500/30'
      case 'UAT':
        return 'bg-[#00638E]/10 dark:bg-[#00638E]/20 text-[#00638E] dark:text-[#BFD8E3] border-[#00638E]/30 dark:border-[#00638E]/40'
      case 'RELEASE':
        return 'bg-rose-500/10 dark:bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/20 dark:border-rose-500/30'
      case 'MAIN':
        return 'bg-emerald-500/10 dark:bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 dark:border-emerald-500/30'
      default:
        return 'bg-slate-100 dark:bg-[#000000]/60 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-[#2B2B2B]'
    }
  }

  return (
    <div
      draggable={draggable}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDrop={onDrop}
      onDragEnd={onDragEnd}
      className={`p-6 rounded-3xl border border-slate-200 dark:border-[#2B2B2B] bg-white dark:bg-[#141414] hover:border-[#00638E]/70 dark:hover:border-[#00638E]/70 transition-all space-y-4 relative overflow-hidden group flex flex-col justify-between backdrop-blur-xl shadow-md dark:shadow-2xl dark:shadow-black/50 hover:shadow-xl dark:hover:shadow-[#00638E]/15 hover:scale-[1.01] ${
        draggable ? 'cursor-move select-none' : ''
      } ${isDragging ? 'opacity-40 scale-95 border-dashed border-[#00638E] ring-2 ring-[#00638E]/40' : ''}`}
      title={draggable ? 'Drag to reorder project position' : undefined}
    >
      {/* Top Glass Gloss Shine */}
      <div className="absolute inset-x-0 top-0 h-[1.5px] bg-gradient-to-r from-transparent via-[#00638E]/30 dark:via-white/30 to-transparent pointer-events-none" />

      <div className="space-y-3 relative z-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0">
            {draggable && (
              <div className="text-slate-400 dark:text-slate-500 hover:text-[#00638E] dark:hover:text-[#BFD8E3] cursor-grab active:cursor-grabbing p-0.5 shrink-0 transition-colors" title="Drag to reorder">
                <GripVertical className="w-4 h-4" />
              </div>
            )}
            <Link
              href={`/app/projects/${project.id}`}
              className="transition-all block group-hover:translate-x-0.5 min-w-0"
            >
              <h3
                className="text-lg font-bold text-slate-900 dark:text-white group-hover:text-[#00638E] dark:group-hover:text-[#BFD8E3] transition-colors tracking-tight flex items-center gap-2"
              >
                {isImageLogo ? (
                  <img
                    src={project.icon}
                    alt={project.name}
                    className="w-6 h-6 rounded-lg object-cover shrink-0 border border-slate-200 dark:border-[#2B2B2B] shadow-xs"
                  />
                ) : (
                  <div
                    className="w-2.5 h-2.5 rounded-full shrink-0 shadow-xs"
                    style={{ backgroundColor: projColor }}
                  />
                )}
                <span className="truncate">{project.name}</span>
                <ArrowRight className="w-4 h-4 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all text-[#00638E] dark:text-[#BFD8E3] shrink-0" />
              </h3>
              {project.description && project.description !== 'Comprehensive project milestones & deliverables' ? (
                <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-1 mt-0.5">
                  {project.description}
                </p>
              ) : null}
            </Link>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            {onEditProject && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  onEditProject(project)
                }}
                className="p-1.5 rounded-xl text-slate-400 hover:text-[#00638E] dark:hover:text-[#BFD8E3] hover:bg-[#00638E]/10 transition-colors cursor-pointer"
                title="Edit Project"
              >
                <Pencil className="w-4 h-4" />
              </button>
            )}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                onDeleteProject(project.id)
              }}
              className="p-1.5 rounded-xl text-slate-400 hover:text-rose-500 dark:hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
              title="Delete Project"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        <Link href={`/app/projects/${project.id}`} className="block space-y-1.5 cursor-pointer">
          <div className="flex items-center justify-between text-xs font-semibold">
            <span className="text-slate-500 dark:text-slate-400">Weighted Delivery Progress</span>
            <span className="font-extrabold text-[#00638E] dark:text-[#BFD8E3]">
              {project.progress || 0}%
            </span>
          </div>
          <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-[#2B2B2B] overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500 bg-gradient-to-r from-[#004A6B] via-[#00638E] to-[#8CB9CC]"
              style={{
                width: `${project.progress || 0}%`,
              }}
            />
          </div>
        </Link>
      </div>

      <div className="pt-3 border-t border-slate-200 dark:border-[#2B2B2B] flex items-center justify-between gap-2 relative z-10">
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
          className="text-xs font-bold text-[#00638E] dark:text-[#BFD8E3] hover:text-[#004A6B] dark:hover:text-white flex items-center gap-1 transition-colors shrink-0"
        >
          <span>View Tasks</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>
    </div>
  )
}
