'use client'

import { useState, useEffect } from 'react'
import {
  FolderKanban,
  Plus,
  MoreVertical,
  Users2,
  Clock,
  X,
  Trash2,
  CheckCircle2,
  GitBranch,
  Layers,
  Sparkles,
  Server
} from 'lucide-react'
import { useWorkspaceStore } from '@/stores/workspace-store'
import { useProjectStore, Project } from '@/stores/project-store'
import { ProjectCard } from '@/features/projects/components/ProjectCard'

export default function ProjectsPage() {
  const { currentWorkspace } = useWorkspaceStore()
  const { projects, loadProjects, createProject, deleteProject, isLoading } = useProjectStore()

  const [isModalOpen, setIsModalOpen] = useState(false)
  const [newProjectName, setNewProjectName] = useState('')
  const [newProjectDescription, setNewProjectDescription] = useState('')
  const [newProjectColor, setNewProjectColor] = useState('#6366F1')
  const [newProjectStatus, setNewProjectStatus] = useState<Project['status']>('ACTIVE')

  // Custom Environment Pipeline for this project
  const [selectedEnvs, setSelectedEnvs] = useState<string[]>(['DEV', 'SIT', 'UAT', 'RELEASE', 'MAIN'])
  const [toastMessage, setToastMessage] = useState<string | null>(null)

  useEffect(() => {
    if (currentWorkspace?.id) {
      loadProjects(currentWorkspace.id)
    }
  }, [currentWorkspace?.id, loadProjects])

  const showToast = (msg: string) => {
    setToastMessage(msg)
    setTimeout(() => setToastMessage(null), 3000)
  }

  const toggleEnv = (env: string) => {
    if (env === 'DEV' || env === 'MAIN') return // Keep base DEV and MAIN required
    if (selectedEnvs.includes(env)) {
      setSelectedEnvs(selectedEnvs.filter(e => e !== env))
    } else {
      setSelectedEnvs([...selectedEnvs, env])
    }
  }

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newProjectName.trim()) return

    const wsId = currentWorkspace?.id || '50a4c29f-09ff-4480-8b6b-495381247d0f'
    try {
      await createProject(wsId, {
        name: newProjectName.trim(),
        description: newProjectDescription.trim() || 'Comprehensive project milestones & deliverables',
        status: newProjectStatus,
        color: newProjectColor,
        icon: 'folder',
        environments: selectedEnvs.join(','),
      })
      setNewProjectName('')
      setNewProjectDescription('')
      setSelectedEnvs(['DEV', 'SIT', 'UAT', 'RELEASE', 'MAIN'])
      setIsModalOpen(false)
      showToast('Project with custom environment pipeline saved to database!')
    } catch (err: any) {
      showToast(err?.message || 'Project creation failed')
    }
  }

  const handleDelete = async (id: string) => {
    try {
      await deleteProject(id)
      showToast('Project deleted from database')
    } catch (err: any) {
      showToast(err?.message || 'Failed to delete project')
    }
  }

  const allAvailableEnvs = [
    { id: 'DEV', name: 'DEV', desc: 'Local feature development (Required)' },
    { id: 'SIT', name: 'SIT', desc: 'System Integration Testing' },
    { id: 'UAT', name: 'UAT', desc: 'User Acceptance / Business Testing' },
    { id: 'RELEASE', name: 'RELEASE', desc: 'Staging candidate verification' },
    { id: 'MAIN', name: 'MAIN', desc: 'Production deployment (Required)' },
  ]

  return (
    <div className="space-y-6 max-w-7xl mx-auto animate-fade-in">
      {toastMessage && (
        <div className="fixed top-6 right-6 z-50 flex items-center gap-2 bg-emerald-600 text-white px-4 py-3 rounded-2xl shadow-xl animate-fade-in text-xs font-semibold">
          <CheckCircle2 className="w-4 h-4" />
          <span>{toastMessage}</span>
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <FolderKanban className="w-6 h-6 text-primary" /> Projects & Pipelines
          </h1>
        </div>

        {projects.length > 0 && (
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 shadow-md shadow-primary/20 transition-all active:scale-95"
          >
            <Plus className="w-4 h-4" /> New Project
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {projects.length === 0 ? (
          <div className="col-span-full p-12 text-center bg-card border border-dashed border-border rounded-3xl">
            <FolderKanban className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
            <h3 className="text-sm font-bold text-foreground">No projects found</h3>
            <p className="text-xs text-muted-foreground mt-1 mb-4">
              Get started by creating your first project roadmap with custom environments.
            </p>
            <button
              onClick={() => setIsModalOpen(true)}
              className="px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-all"
            >
              + Create First Project
            </button>
          </div>
        ) : (
          projects.map((project) => (
            <ProjectCard
              key={project.id}
              project={project as any}
              onDeleteProject={handleDelete}
            />
          ))
        )}
      </div>

      {/* Interactive Modal: New Project with Custom Environments */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-card border border-border rounded-3xl p-6 w-full max-w-lg shadow-2xl space-y-4 animate-scale-in">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                <FolderKanban className="w-4 h-4 text-primary" /> Create Project with Custom Environments
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateProject} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Project Name</label>
                <input
                  type="text"
                  placeholder="e.g. Core Payment Engine"
                  value={newProjectName}
                  onChange={e => setNewProjectName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-background border border-border text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  autoFocus
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Description</label>
                <textarea
                  rows={2}
                  placeholder="Short summary of project scope..."
                  value={newProjectDescription}
                  onChange={e => setNewProjectDescription(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-background border border-border text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              {/* Environments Selection */}
              <div className="space-y-2 bg-muted/30 p-3.5 rounded-2xl border border-border/60">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                    <Server className="w-3.5 h-3.5 text-primary" /> Select Required Environments for this Project
                  </label>
                  <span className="text-[10px] text-muted-foreground font-semibold">
                    {selectedEnvs.length} stages selected
                  </span>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Pick which environments this project requires for review & testing:
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                  {allAvailableEnvs.map((env) => {
                    const isSelected = selectedEnvs.includes(env.id)
                    const isFixed = env.id === 'DEV' || env.id === 'MAIN'

                    return (
                      <div
                        key={env.id}
                        onClick={() => toggleEnv(env.id)}
                        className={`p-2.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${isSelected
                            ? 'bg-primary/10 border-primary text-primary font-bold'
                            : 'bg-background border-border text-muted-foreground hover:border-border hover:text-foreground'
                          } ${isFixed ? 'opacity-90' : ''}`}
                      >
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            disabled={isFixed}
                            onChange={() => { }}
                            className="rounded accent-primary"
                          />
                          <div>
                            <div className="text-xs font-bold">{env.name}</div>
                            <div className="text-[9px] text-muted-foreground">{env.desc}</div>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">Status</label>
                  <select
                    value={newProjectStatus}
                    onChange={e => setNewProjectStatus(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl bg-background border border-border text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="ACTIVE">ACTIVE</option>
                    <option value="IN_PROGRESS">IN PROGRESS</option>
                    <option value="REVIEW">REVIEW</option>
                    <option value="COMPLETED">COMPLETED</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">Brand Color</label>
                  <div className="flex items-center gap-2 pt-1">
                    {['#6366F1', '#8B5CF6', '#EC4899', '#10B981', '#F59E0B'].map((c) => (
                      <button
                        type="button"
                        key={c}
                        onClick={() => setNewProjectColor(c)}
                        className={`w-6 h-6 rounded-full transition-transform ${newProjectColor === c ? 'scale-125 ring-2 ring-foreground ring-offset-2' : 'hover:scale-110'
                          }`}
                        style={{ backgroundColor: c }}
                      />
                    ))}
                  </div>
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
                  Save Project to DB
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
