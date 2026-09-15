'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
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
  Server,
  LayoutGrid,
  List,
  ArrowRight,
  Check,
  GripVertical,
} from 'lucide-react'
import { Portal } from '@/components/ui/portal'
import { useOrgStore } from '@/stores/org-store'
import { useWorkspaceStore } from '@/stores/workspace-store'
import { useProjectStore, Project } from '@/stores/project-store'
import { ProjectCard } from '@/features/projects/components/ProjectCard'

export default function ProjectsPage() {
  const { currentOrg } = useOrgStore()
  const { currentWorkspace, workspaces, setCurrentWorkspace, fetchWorkspaces } = useWorkspaceStore()
  const { projects, loadProjects, createProject, deleteProject, isLoading } = useProjectStore()

  const [isModalOpen, setIsModalOpen] = useState(false)
  const [newProjectName, setNewProjectName] = useState('')
  const [newProjectDescription, setNewProjectDescription] = useState('')
  const [newProjectColor, setNewProjectColor] = useState('#6366F1')
  const [newProjectStatus, setNewProjectStatus] = useState<Project['status']>('ACTIVE')

  // Drag and drop custom project ordering
  const [projectOrder, setProjectOrder] = useState<string[]>([])
  const [draggedProjId, setDraggedProjId] = useState<string | null>(null)

  const handleProjDragStart = (e: React.DragEvent, id: string) => {
    setDraggedProjId(id)
    e.dataTransfer.setData('text/plain', id)
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleProjDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }

  const handleProjDrop = (e: React.DragEvent, targetId: string) => {
    e.preventDefault()
    const sourceId = draggedProjId || e.dataTransfer.getData('text/plain')
    if (!sourceId || sourceId === targetId) return

    setProjectOrder((prev) => {
      const allIds = prev.length > 0 ? [...prev] : projects.map((p) => p.id)
      const fromIndex = allIds.indexOf(sourceId)
      const toIndex = allIds.indexOf(targetId)
      if (fromIndex === -1 || toIndex === -1) return prev

      const [moved] = allIds.splice(fromIndex, 1)
      allIds.splice(toIndex, 0, moved)
      return allIds
    })
    setDraggedProjId(null)
  }

  // Custom Environment Pipeline for this project
  const [selectedEnvs, setSelectedEnvs] = useState<string[]>(['DEV', 'SIT', 'UAT', 'RELEASE', 'MAIN'])
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [toastMessage, setToastMessage] = useState<string | null>(null)

  // Ensure currentWorkspace is synchronized if workspaces list exists
  useEffect(() => {
    if (!currentWorkspace && workspaces && workspaces.length > 0) {
      setCurrentWorkspace(workspaces[0])
    }
  }, [currentWorkspace, workspaces, setCurrentWorkspace])

  // If workspaces is empty and we have an active organization, fetch them
  useEffect(() => {
    if (currentOrg?.id && (!workspaces || workspaces.length === 0)) {
      fetchWorkspaces(currentOrg.id)
    }
  }, [currentOrg?.id, workspaces, fetchWorkspaces])

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

    const activeWs = currentWorkspace || (workspaces && workspaces[0])
    if (!activeWs?.id) {
      showToast('No active workspace found. Please select or create a workspace first.')
      return
    }

    try {
      await createProject(activeWs.id, {
        name: newProjectName.trim(),
        description: newProjectDescription.trim() || 'Comprehensive project milestones & deliverables',
        color: newProjectColor,
        status: newProjectStatus,
        environments: JSON.stringify(selectedEnvs),
        progress: 0,
      })
      setNewProjectName('')
      setNewProjectDescription('')
      setSelectedEnvs(['DEV', 'SIT', 'UAT', 'RELEASE', 'MAIN'])
      setIsModalOpen(false)
      showToast('Project created with custom environments!')
    } catch (err: any) {
      showToast(err?.message || 'Failed to create project')
    }
  }

  const handleDelete = async (id: string) => {
    try {
      await deleteProject(id)
      showToast('Project deleted')
    } catch (err: any) {
      showToast(err?.message || 'Failed to delete project')
    }
  }

  const allAvailableEnvs = [
    { id: 'DEV', name: 'DEV', title: 'Development', desc: 'Local feature implementation' },
    { id: 'SIT', name: 'SIT', title: 'System Integration', desc: 'Cross-service pipeline testing' },
    { id: 'UAT', name: 'UAT', title: 'User Acceptance', desc: 'Business & client sign-off' },
    { id: 'RELEASE', name: 'RELEASE', title: 'Release Staging', desc: 'Staging candidate verification' },
    { id: 'MAIN', name: 'MAIN', title: 'Production', desc: 'Live customer environment' },
  ]

  const orderedProjects = [...projects].sort((a, b) => {
    if (projectOrder.length === 0) return 0
    const indexA = projectOrder.indexOf(a.id)
    const indexB = projectOrder.indexOf(b.id)
    if (indexA === -1 && indexB === -1) return 0
    if (indexA === -1) return 1
    if (indexB === -1) return -1
    return indexA - indexB
  })

  return (
    <div className="space-y-8 max-w-7xl mx-auto animate-fade-in pb-12">
      {toastMessage && (
        <div className="fixed top-6 right-6 z-50 flex items-center gap-2 bg-emerald-600 text-white px-4 py-3 rounded-2xl shadow-xl animate-fade-in text-xs font-semibold backdrop-blur-md">
          <CheckCircle2 className="w-4 h-4" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-primary/10 border border-primary/20 text-primary">
              <FolderKanban className="w-5 h-5" />
            </div>
            <span>Projects &amp; Roadmaps</span>
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            Organize work across initiatives, custom environments, and automated delivery pipelines.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* View Switcher: Grid vs List */}
          <div className="flex items-center p-1 bg-slate-100 dark:bg-[#141414] backdrop-blur-md rounded-xl border border-slate-200 dark:border-[#2B2B2B] shadow-xs">
            <button
              onClick={() => setViewMode('grid')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                viewMode === 'grid'
                  ? 'bg-white dark:bg-[#00638E] text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
              title="Glass Grid View"
            >
              <LayoutGrid className="w-3.5 h-3.5 text-[#00638E] dark:text-[#BFD8E3]" /> Grid
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                viewMode === 'list'
                  ? 'bg-white dark:bg-[#00638E] text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
              title="Table List View"
            >
              <List className="w-3.5 h-3.5 text-[#00638E] dark:text-[#BFD8E3]" /> List
            </button>
          </div>

          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-[#004A6B] via-[#00638E] to-[#00638E] text-white text-xs font-semibold hover:opacity-95 shadow-md shadow-[#00638E]/25 transition-all active:scale-95 cursor-pointer"
          >
            <Plus className="w-4 h-4" /> New Project
          </button>
        </div>
      </div>

      {projects.length === 0 ? (
        <div className="p-16 text-center bg-card/60 backdrop-blur-xl border border-dashed border-border rounded-3xl space-y-3">
          <FolderKanban className="w-12 h-12 text-muted-foreground mx-auto" />
          <h3 className="text-sm font-bold text-foreground">No projects found</h3>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto">
            Get started by creating your first project roadmap with custom delivery environments.
          </p>
          <button
            onClick={() => setIsModalOpen(true)}
            className="px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-all cursor-pointer shadow-md shadow-primary/20"
          >
            + Create First Project
          </button>
        </div>
      ) : viewMode === 'grid' ? (
        /* Clean Minimal Liquid Glass Grid View with Drag & Drop */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {orderedProjects.map((project) => (
            <ProjectCard
              key={project.id}
              project={project as any}
              onDeleteProject={handleDelete}
              draggable={true}
              onDragStart={(e) => handleProjDragStart(e, project.id)}
              onDragOver={handleProjDragOver}
              onDrop={(e) => handleProjDrop(e, project.id)}
              onDragEnd={() => setDraggedProjId(null)}
              isDragging={draggedProjId === project.id}
            />
          ))}
        </div>
      ) : (
        /* Clean Spacious Table List View with Drag & Drop */
        <div className="rounded-3xl border border-slate-200 dark:border-[#2B2B2B] bg-white dark:bg-[#141414] backdrop-blur-xl overflow-hidden shadow-lg dark:shadow-2xl">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-[#000000] border-b border-slate-200 dark:border-[#2B2B2B] text-slate-600 dark:text-slate-300 font-semibold">
              <tr>
                <th className="p-4 pl-6">Project</th>
                <th className="p-4">Status</th>
                <th className="p-4">Delivery Progress</th>
                <th className="p-4">Environments</th>
                <th className="p-4 pr-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-[#2B2B2B]">
              {orderedProjects.map((p) => {
                let envList: string[] = ['DEV', 'SIT', 'UAT', 'RELEASE', 'MAIN']
                try {
                  if (p.environments) envList = JSON.parse(p.environments)
                } catch {}

                return (
                  <tr
                    key={p.id}
                    draggable={true}
                    onDragStart={(e) => handleProjDragStart(e, p.id)}
                    onDragOver={handleProjDragOver}
                    onDrop={(e) => handleProjDrop(e, p.id)}
                    onDragEnd={() => setDraggedProjId(null)}
                    className={`hover:bg-slate-50/80 dark:hover:bg-[#2B2B2B]/40 transition-colors group cursor-move select-none ${
                      draggedProjId === p.id ? 'opacity-40 bg-[#00638E]/15 border-[#00638E] border-y-2' : ''
                    }`}
                    title="Drag to place at any position"
                  >
                    <td className="p-4 pl-6">
                      <div className="flex items-center gap-2.5">
                        <div className="text-slate-400 dark:text-slate-500 hover:text-[#00638E] dark:hover:text-[#BFD8E3] cursor-grab active:cursor-grabbing p-0.5 shrink-0 transition-colors" title="Drag to reorder">
                          <GripVertical className="w-4 h-4" />
                        </div>
                        <Link
                          href={`/app/projects/${p.id}`}
                          className="flex items-center gap-3 block group-hover:translate-x-0.5 transition-transform"
                        >
                          <div
                            className="w-3.5 h-3.5 rounded-full shrink-0 shadow-xs"
                            style={{
                              backgroundColor: p.color || '#00638E',
                              boxShadow: `0 0 10px ${p.color || '#00638E'}60`,
                            }}
                          />
                          <div>
                            <p
                              className="font-bold text-sm tracking-tight text-slate-900 dark:text-white group-hover:text-[#00638E] dark:group-hover:text-[#BFD8E3] transition-colors flex items-center gap-1.5"
                            >
                              {p.name}
                              <ArrowRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all text-[#00638E] dark:text-[#BFD8E3]" />
                            </p>
                            {p.description && p.description !== 'Comprehensive project milestones & deliverables' && (
                              <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-1">
                                {p.description}
                              </p>
                            )}
                          </div>
                        </Link>
                      </div>
                    </td>

                    <td className="p-4">
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#00638E]/10 dark:bg-[#00638E]/20 text-[#00638E] dark:text-[#BFD8E3] border border-[#00638E]/25 dark:border-[#00638E]/40 uppercase">
                        {p.status || 'ACTIVE'}
                      </span>
                    </td>

                    <td className="p-4 min-w-[180px]">
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-[11px] font-semibold">
                          <span className="text-slate-500 dark:text-slate-400">Progress</span>
                          <span className="font-bold text-[#00638E] dark:text-[#BFD8E3]">
                            {p.progress || 0}%
                          </span>
                        </div>
                        <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-[#2B2B2B] overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-500 bg-gradient-to-r from-[#004A6B] via-[#00638E] to-[#8CB9CC]"
                            style={{
                              width: `${p.progress || 0}%`,
                            }}
                          />
                        </div>
                      </div>
                    </td>

                    <td className="p-4">
                      <div className="flex items-center gap-1.5 flex-wrap max-w-xs">
                        {envList.map((env) => (
                          <span
                            key={env}
                            className="px-2 py-0.5 rounded-md text-[9px] font-bold bg-slate-100 dark:bg-[#000000]/60 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-[#2B2B2B]"
                          >
                            {env}
                          </span>
                        ))}
                      </div>
                    </td>

                    <td className="p-4 pr-6 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          href={`/app/projects/${p.id}`}
                          className="px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-[#000000]/70 hover:bg-slate-100 dark:hover:bg-[#2B2B2B] border border-slate-200 dark:border-[#2B2B2B] text-xs font-semibold text-slate-700 dark:text-slate-200 hover:text-[#00638E] dark:hover:text-white transition-all cursor-pointer"
                        >
                          View Roadmap
                        </Link>
                        <button
                          onClick={() => handleDelete(p.id)}
                          className="p-1.5 text-slate-400 hover:text-rose-500 dark:hover:text-rose-400 hover:bg-rose-500/10 rounded-xl transition-colors cursor-pointer"
                          title="Delete Project"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Interactive Modal: New Project with Custom Environments (Rendered in Portal so backdrop covers the entire window) */}
      {isModalOpen && (
        <Portal>
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-fade-in">
            <div className="bg-card border border-border rounded-3xl p-6 w-full max-w-lg shadow-2xl space-y-4 animate-scale-in max-h-[90vh] overflow-y-auto custom-scrollbar">
              <div className="flex items-center justify-between pb-3 border-b border-border">
                <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                  <FolderKanban className="w-4 h-4 text-primary" /> Create Project with Custom Environments
                </h3>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="p-1.5 rounded-xl text-muted-foreground hover:text-foreground hover:bg-accent transition-colors cursor-pointer"
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
                <div className="space-y-2.5 bg-muted/20 p-3.5 rounded-2xl border border-border/60">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                      <Server className="w-3.5 h-3.5 text-primary" /> Select Required Environments for this Project
                    </label>
                    <span className="text-[10px] text-primary font-bold px-2 py-0.5 rounded-full bg-primary/10 border border-primary/20">
                      {selectedEnvs.length} stages selected
                    </span>
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    Pick which environments this project requires for review & testing:
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-0.5">
                    {allAvailableEnvs.map((env) => {
                      const isSelected = selectedEnvs.includes(env.id)
                      const isFixed = env.id === 'DEV' || env.id === 'MAIN'

                      return (
                        <div
                          key={env.id}
                          onClick={() => toggleEnv(env.id)}
                          className={`p-2.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-2 select-none ${
                            isSelected
                              ? 'bg-primary/10 border-primary/60 text-foreground shadow-xs'
                              : 'bg-background/70 border-border/70 text-muted-foreground hover:border-border hover:bg-background'
                          }`}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <span
                              className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded-md border shrink-0 ${
                                isSelected
                                  ? 'bg-primary/20 border-primary/40 text-primary'
                                  : 'bg-muted border-border/80 text-muted-foreground'
                              }`}
                            >
                              {env.name}
                            </span>
                            <div className="min-w-0">
                              <div className="text-xs font-bold truncate flex items-center gap-1">
                                <span>{env.title}</span>
                                {isFixed && (
                                  <span className="text-[8px] font-extrabold px-1 rounded bg-primary/20 text-primary uppercase">
                                    Req
                                  </span>
                                )}
                              </div>
                              <div className="text-[9px] text-muted-foreground truncate">{env.desc}</div>
                            </div>
                          </div>

                          <div
                            className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 transition-all ${
                              isSelected
                                ? 'bg-primary border-primary text-primary-foreground shadow-xs'
                                : 'border-border/80 bg-muted/40'
                            }`}
                          >
                            {isSelected && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">Status</label>
                  <select
                    value={newProjectStatus}
                    onChange={e => setNewProjectStatus(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl bg-background border border-border text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary cursor-pointer"
                  >
                    <option value="ACTIVE">ACTIVE</option>
                    <option value="IN_PROGRESS">IN PROGRESS</option>
                    <option value="REVIEW">REVIEW</option>
                    <option value="COMPLETED">COMPLETED</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-foreground">Project Brand Color</label>
                    <div className="flex items-center gap-1.5 text-xs font-mono font-bold" style={{ color: newProjectColor }}>
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: newProjectColor }} />
                      <span>{newProjectColor}</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-6 gap-2 p-2 rounded-2xl bg-muted/30 border border-border/70">
                    {[
                      { name: 'Electric Indigo', hex: '#6366F1' },
                      { name: 'Neon Violet', hex: '#8B5CF6' },
                      { name: 'Cyber Rose', hex: '#F43F5E' },
                      { name: 'Radiant Pink', hex: '#EC4899' },
                      { name: 'Sunset Orange', hex: '#F97316' },
                      { name: 'Amber Glow', hex: '#F59E0B' },
                      { name: 'Emerald Green', hex: '#10B981' },
                      { name: 'Liquid Teal', hex: '#14B8A6' },
                      { name: 'Aqua Cyan', hex: '#06B6D4' },
                      { name: 'Sky Blue', hex: '#0EA5E9' },
                      { name: 'Royal Blue', hex: '#3B82F6' },
                      { name: 'Magenta Luxe', hex: '#D946EF' },
                    ].map((c) => (
                      <button
                        type="button"
                        key={c.hex}
                        onClick={() => setNewProjectColor(c.hex)}
                        title={c.name}
                        className={`h-7 rounded-xl transition-all flex items-center justify-center cursor-pointer ${
                          newProjectColor === c.hex
                            ? 'scale-110 ring-2 ring-white ring-offset-2 ring-offset-background shadow-lg'
                            : 'hover:scale-105 opacity-85 hover:opacity-100'
                        }`}
                        style={{
                          backgroundColor: c.hex,
                          boxShadow: newProjectColor === c.hex ? `0 0 14px ${c.hex}` : undefined,
                        }}
                      >
                        {newProjectColor === c.hex && <Check className="w-3.5 h-3.5 text-white drop-shadow" />}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-3 py-2 rounded-xl text-xs font-semibold text-muted-foreground hover:bg-accent transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-bold hover:bg-primary/90 transition-all shadow-md shadow-primary/20 cursor-pointer active:scale-95"
                  >
                    Save Project to DB
                  </button>
                </div>
              </form>
            </div>
          </div>
        </Portal>
      )}
    </div>
  )
}

