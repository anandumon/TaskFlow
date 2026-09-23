'use client'

import { useState, useEffect, useMemo } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Trash2, CheckCircle2, AlertCircle, FolderKanban, Lock } from 'lucide-react'
import { getEnvForStatus, getStatusForEnv, getProjectEnvironments } from '@/lib/task-category'
import { useWorkspaceStore } from '@/stores/workspace-store'
import { useOrgStore } from '@/stores/org-store'
import { useAuthStore } from '@/stores/auth-store'
import {
  useTaskStore,
  TaskStatus,
  TaskEnvironment,
  Subtask,
  FileChange,
  TaskAttachment,
} from '@/stores/task-store'
import { useProjectStore } from '@/stores/project-store'
import { useStatusStore } from '@/stores/status-store'

import { TaskDescriptionCard } from '@/features/tasks/components/TaskDescriptionCard'
import { TaskGitBranchCard } from '@/features/tasks/components/TaskGitBranchCard'
import { TaskSubtasksCard } from '@/features/tasks/components/TaskSubtasksCard'
import { TaskFilesChangedCard } from '@/features/tasks/components/TaskFilesChangedCard'
import { TaskPropertiesCard } from '@/features/tasks/components/TaskPropertiesCard'
import { TaskDiscussionCard } from '@/features/tasks/components/TaskDiscussionCard'
import { TaskDetailsSkeleton } from '@/components/loading'
import { AssignableUser, getInitials, getAvatarColor } from '@/components/ui/user-select'
import { getFirstName } from '@/lib/utils'

export default function TaskDetailsPage() {
  const params = useParams()
  const router = useRouter()
  const taskId = params.id as string

  const { currentWorkspace } = useWorkspaceStore()
  const { currentOrg, members: orgMembers } = useOrgStore()
  const { user } = useAuthStore()
  const {
    tasks,
    loadTasks,
    isLoading: isTasksLoading,
    updateTask,
    updateStatus,
    updateEnvironment,
    deleteTask,
    toggleSubtask,
    addSubtask,
    updateSubtaskBranch,
    addNote,
  } = useTaskStore()
  const { projects, loadProjects } = useProjectStore()

  const [toastMessage, setToastMessage] = useState<string | null>(null)

  useEffect(() => {
    if (currentWorkspace?.id) {
      loadTasks(currentWorkspace.id)
      loadProjects(currentWorkspace.id)
    }
  }, [currentWorkspace?.id, loadTasks, loadProjects])

  const task = tasks.find((t) => t.id === taskId)
  const project = projects.find((p) => p.id === task?.projectId)

  const showToast = (msg: string) => {
    setToastMessage(msg)
    setTimeout(() => setToastMessage(null), 3000)
  }

  if ((isTasksLoading && !task) || (!task && tasks.length === 0)) {
    return <TaskDetailsSkeleton />
  }

  if (!task) {
    return (
      <div className="max-w-4xl mx-auto py-12 text-center space-y-4 animate-fade-in">
        <AlertCircle className="w-12 h-12 text-muted-foreground mx-auto" />
        <h2 className="text-xl font-bold text-foreground">Task Not Found</h2>
        <p className="text-xs text-muted-foreground">The requested deliverable could not be loaded.</p>
        <Link
          href="/app/tasks"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90"
        >
          <ArrowLeft className="w-4 h-4" /> Back to My Tasks
        </Link>
      </div>
    )
  }

  // Parse JSON data safely
  let subtasks: Subtask[] = []
  try {
    subtasks = JSON.parse(task.subtasks || '[]')
  } catch {
    subtasks = []
  }

  let filesChanged: FileChange[] = []
  try {
    filesChanged = JSON.parse(task.filesChanged || '[]')
  } catch {
    filesChanged = []
  }

  let attachments: TaskAttachment[] = []
  try {
    attachments = JSON.parse(task.attachments || '[]')
  } catch {
    attachments = []
  }

  const canEdit = Boolean(
    task &&
    user &&
    (
      (currentOrg?.ownerId && currentOrg.ownerId === user.id) ||
      orgMembers?.some((m: any) =>
        (m.userId === user.id || m.id === user.id || (m.email && m.email.toLowerCase() === user.email?.toLowerCase())) &&
        (m.role?.toLowerCase() === 'owner' || m.role?.toLowerCase() === 'admin')
      ) ||
      (task.createdBy && task.createdBy === user.id) ||
      (task.assigneeId && task.assigneeId === user.id) ||
      (() => {
        const myName = (user.displayName || `${user.firstName || ''} ${user.lastName || ''}`).trim().toLowerCase()
        const myEmail = (user.email || '').toLowerCase()
        const aName = (task.assigneeName || '').trim().toLowerCase()
        if (aName && (aName === myName || aName === myEmail || aName === 'you')) return true
        const allAssignees = (task.assignees || '').toLowerCase()
        if (allAssignees && ((myEmail && allAssignees.includes(myEmail)) || (myName && allAssignees.includes(myName)))) return true
        return false
      })()
    )
  )

  const handleSaveMainBranch = async (branchToSave: string) => {
    if (!canEdit) {
      showToast('You can only edit tasks assigned to you.')
      return
    }
    await updateTask(task.id, { branchName: branchToSave.trim() })
    showToast('Branch configuration saved!')
  }

  const handleSaveDescription = async (newDesc: string) => {
    if (!canEdit) {
      showToast('You can only edit tasks assigned to you.')
      return
    }
    await updateTask(task.id, { description: newDesc })
    showToast('Task description updated!')
  }

  const handleSaveAttachments = async (updated: TaskAttachment[]) => {
    if (!canEdit) {
      showToast('You can only edit tasks assigned to you.')
      return
    }
    await updateTask(task.id, { attachments: JSON.stringify(updated) })
    showToast('Task attachments updated!')
  }

  const handleToggleSubtask = async (subtaskId: string) => {
    if (!canEdit) {
      showToast('You can only edit tasks assigned to you.')
      return
    }
    await toggleSubtask(task.id, subtaskId)
  }

  const handleAddSubtask = async (subtaskData: Partial<Subtask> | string, legacyBranchName?: string) => {
    if (!canEdit) {
      showToast('You can only edit tasks assigned to you.')
      return
    }
    await addSubtask(task.id, subtaskData, legacyBranchName)
    showToast('Subtask added!')
  }

  const handleSaveSubtaskBranch = async (subtaskId: string, branch: string) => {
    if (!canEdit) {
      showToast('You can only edit tasks assigned to you.')
      return
    }
    await updateSubtaskBranch(task.id, subtaskId, branch)
    showToast('Subtask branch updated!')
  }

  const handleUpdateSubtaskDetails = async (subtaskId: string, updatedFields: Partial<Subtask>) => {
    if (!canEdit) {
      showToast('You can only edit tasks assigned to you.')
      return
    }
    const updated = subtasks.map((s) => (s.id === subtaskId ? { ...s, ...updatedFields } : s))
    await updateTask(task.id, { subtasks: JSON.stringify(updated) })
    showToast('Subtask details updated!')
  }

  const handleDeleteSubtask = async (subtaskId: string) => {
    if (!canEdit) {
      showToast('You can only edit tasks assigned to you.')
      return
    }
    const updated = subtasks.filter((s) => s.id !== subtaskId)
    await updateTask(task.id, { subtasks: JSON.stringify(updated) })
    showToast('Subtask removed')
  }

  const handleAddFileChange = async (newFile: FileChange) => {
    if (!canEdit) {
      showToast('You can only edit tasks assigned to you.')
      return
    }
    const updated = [...filesChanged, newFile]
    await updateTask(task.id, { filesChanged: JSON.stringify(updated) })
    showToast('File change logged!')
  }

  const handleUpdateFileChange = async (index: number, updatedFile: FileChange) => {
    if (!canEdit) {
      showToast('You can only edit tasks assigned to you.')
      return
    }
    const updated = [...filesChanged]
    updated[index] = updatedFile
    await updateTask(task.id, { filesChanged: JSON.stringify(updated) })
    showToast('File change updated!')
  }

  const handleDeleteFileChange = async (index: number) => {
    if (!canEdit) {
      showToast('You can only edit tasks assigned to you.')
      return
    }
    const updated = filesChanged.filter((_, i) => i !== index)
    await updateTask(task.id, { filesChanged: JSON.stringify(updated) })
    showToast('File change removed!')
  }

  const { getStatuses, workspaceStatuses: rawWorkspaceStatuses } = useStatusStore()
  const workspaceStatuses = useMemo(
    () => getStatuses(currentWorkspace?.id || 'default'),
    [getStatuses, currentWorkspace?.id, rawWorkspaceStatuses]
  )

  // Only show the selected environments for this project
  const projectEnvs = useMemo(() => {
    return getProjectEnvironments(project)
  }, [project])

  // Current environment dynamically computed according to status rule:
  // in dev -> DEV, in sit -> SIT, in uat -> UAT, release -> RELEASE, completed -> MAIN.
  // for others -> show the same as the status for env!
  const currentEnv = useMemo(() => {
    return task ? getEnvForStatus(task.status, task.environment) : 'DEV'
  }, [task?.status, task?.environment])

  const envOptions = useMemo(() => {
    const list = [...projectEnvs]
    if (currentEnv && !list.includes(currentEnv)) {
      list.unshift(currentEnv)
    }
    return list
  }, [projectEnvs, currentEnv])

  const handleAddNote = async (noteText: string) => {
    await addNote(task.id, noteText)
    showToast('Note added to discussion!')
  }

  const handleStatusUpdate = async (newStatus: TaskStatus) => {
    if (!canEdit) {
      showToast('You can only edit tasks assigned to you.')
      return
    }
    const wsId = currentWorkspace?.id || '50a4c29f-09ff-4480-8b6b-495381247d0f'
    const newEnv = getEnvForStatus(newStatus)
    await updateStatus(task.id, newStatus, newEnv as TaskEnvironment)
    loadProjects(wsId)
    showToast(`Status updated to ${newStatus.toUpperCase()}`)
  }

  const handleEnvUpdate = async (newEnv: string) => {
    if (!canEdit) {
      showToast('You can only edit tasks assigned to you.')
      return
    }
    const wsId = currentWorkspace?.id || '50a4c29f-09ff-4480-8b6b-495381247d0f'
    const matchingStatus = getStatusForEnv(newEnv, workspaceStatuses)
    if (matchingStatus) {
      await updateStatus(task.id, matchingStatus as TaskStatus, newEnv as TaskEnvironment)
      showToast(`Environment updated to ${newEnv}`)
    } else {
      await updateEnvironment(task.id, newEnv as TaskEnvironment)
      showToast(`Review environment updated to ${newEnv}`)
    }
    loadProjects(wsId)
  }

  const currentUserName = getFirstName(
    user?.firstName ||
    user?.displayName?.split(' ')[0] ||
    user?.displayName ||
    user?.email?.split('@')[0] ||
    'You'
  )

  const availableUsers: AssignableUser[] = (orgMembers || []).map((m: any) => {
    const name = getFirstName(m.firstName || m.name || m.displayName || m.email?.split('@')[0] || 'Member')
    return {
      id: m.userId || m.id,
      name,
      email: m.email,
      initials: getInitials(name),
      color: getAvatarColor(name),
      role: m.role,
    }
  })

  if (user && !availableUsers.some((u) => u.id === user.id || u.name.toLowerCase() === currentUserName.toLowerCase())) {
    availableUsers.unshift({
      id: user.id,
      name: currentUserName,
      email: user.email,
      initials: getInitials(currentUserName),
      color: getAvatarColor(currentUserName),
      role: 'You',
    })
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto animate-fade-in pb-12">
      {toastMessage && (
        <div className="fixed top-6 right-6 z-50 flex items-center gap-2 bg-emerald-600 text-white px-4 py-3 rounded-2xl shadow-xl animate-fade-in text-xs font-semibold">
          <CheckCircle2 className="w-4 h-4" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* 1st: Top Breadcrumb & Task Title Header Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border/70">
        <div className="flex items-center gap-3">
          <Link
            href={project ? `/app/projects/${project.id}` : '/app/tasks'}
            className="p-2.5 rounded-xl border border-border bg-card hover:bg-accent text-muted-foreground hover:text-foreground transition-all shadow-xs flex items-center gap-1.5 text-xs font-bold"
            title={project ? `Back to ${project.name}` : 'Back to Tasks Board'}
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">{project ? `Back to ${project.name}` : 'Back'}</span>
          </Link>
          <div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Link href="/app/projects" className="hover:underline">Projects</Link>
              <span>/</span>
              {project ? (
                <Link
                  href={`/app/projects/${project.id}`}
                  className="text-primary font-bold hover:underline flex items-center gap-1.5"
                >
                  {project.icon && (project.icon.startsWith('data:image') || project.icon.startsWith('http') || project.icon.startsWith('/')) ? (
                    <img src={project.icon} alt={project.name} className="w-3.5 h-3.5 rounded object-cover" />
                  ) : (
                    <FolderKanban className="w-3.5 h-3.5" />
                  )}
                  {project.name}
                </Link>
              ) : (
                <span>Standalone</span>
              )}
            </div>
            <h1 className="text-xl font-bold text-foreground mt-0.5 flex items-center gap-2">
              <span>{task.title}</span>
              {!canEdit && (
                <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-500 border border-amber-500/30">
                  <Lock className="w-3 h-3" /> View Only
                </span>
              )}
            </h1>
          </div>
        </div>

        {/* Status & Environment Selectors */}
        <div className="flex items-center gap-2.5">
          <div className="flex items-center gap-1.5 bg-muted/80 px-3 py-1.5 rounded-xl border border-border text-xs">
            <span className="text-[10px] text-muted-foreground uppercase font-bold">Status:</span>
            <select
              value={task.status}
              disabled={!canEdit}
              onChange={(e) => handleStatusUpdate(e.target.value as TaskStatus)}
              className="bg-transparent text-foreground font-bold focus:outline-none cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {workspaceStatuses.map((st) => (
                <option key={st.id} value={st.id} className="bg-background text-foreground">
                  {st.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-1.5 bg-muted/80 px-3 py-1.5 rounded-xl border border-border text-xs">
            <span className="text-[10px] text-muted-foreground uppercase font-bold">Env:</span>
            <select
              value={currentEnv}
              disabled={!canEdit}
              onChange={(e) => handleEnvUpdate(e.target.value)}
              className="bg-transparent text-foreground font-bold focus:outline-none cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {envOptions.map((env) => (
                <option key={env} value={env} className="bg-background text-foreground">
                  {env}
                </option>
              ))}
            </select>
          </div>

          {canEdit && (
            <button
              onClick={async () => {
                await deleteTask(task.id)
                router.push('/app/tasks')
              }}
              className="p-2 rounded-xl text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors cursor-pointer"
              title="Delete Task"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {!canEdit && (
        <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center gap-2.5 text-xs text-amber-500 font-semibold shadow-xs">
          <Lock className="w-4 h-4 shrink-0" />
          <span>View-Only Deliverable: You can review details and discussions, but only assigned members or workspace administrators can modify status, branches, or files.</span>
        </div>
      )}

      {/* Main Layout Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Columns: Ordered as requested by user */}
        <div className="lg:col-span-2 space-y-6">
          {/* 2nd: Task Descriptions & Universal Document Upload / Download */}
          <TaskDescriptionCard
            description={task.description}
            attachments={attachments}
            canEdit={canEdit}
            onSaveDescription={handleSaveDescription}
            onSaveAttachments={handleSaveAttachments}
            currentUserName={currentUserName}
          />

          {/* 3rd: Multi-Service & Git Branch Configuration with 10-item pagination */}
          <TaskGitBranchCard
            branchName={task.branchName}
            taskTitle={task.title}
            onSaveBranch={handleSaveMainBranch}
            canEdit={canEdit}
          />

          {/* 4th: Files Changed & Code Diffs */}
          <TaskFilesChangedCard
            filesChanged={filesChanged}
            onAddFileChange={handleAddFileChange}
            onUpdateFileChange={handleUpdateFileChange}
            onDeleteFileChange={handleDeleteFileChange}
            canEdit={canEdit}
          />

          {/* 5th: Notes & Discussion */}
          <TaskDiscussionCard
            notes={task.notes}
            onAddNote={handleAddNote}
          />

          {/* 6th: Subtasks (Creation form asks for Title, Description, Category, Assignee, Assigned By, Due Date) */}
          <TaskSubtasksCard
            subtasks={subtasks}
            onToggleSubtask={handleToggleSubtask}
            onAddSubtask={handleAddSubtask}
            onSaveSubtaskBranch={handleSaveSubtaskBranch}
            onDeleteSubtask={handleDeleteSubtask}
            onUpdateSubtaskDetails={handleUpdateSubtaskDetails}
            availableUsers={availableUsers}
            currentUserName={currentUserName}
          />
        </div>

        {/* Right 1 Column: Metadata & Activity History */}
        <div className="space-y-6">
          <TaskPropertiesCard
            task={task}
            project={project}
          />
        </div>
      </div>
    </div>
  )
}
