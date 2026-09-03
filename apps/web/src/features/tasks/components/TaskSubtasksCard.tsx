'use client'

import { useState } from 'react'
import {
  CheckSquare,
  GitBranch,
  Trash2,
  Plus,
  Check,
  Copy,
  Server,
  Edit2,
  AlertTriangle,
  FileCode,
  MessageSquare,
  History,
  X,
  ChevronRight,
  ExternalLink,
  Clock,
  CheckCircle2,
  FileText,
  Layers,
} from 'lucide-react'
import { Subtask, FileChange, HistoryLog } from '@/stores/task-store'
import { ServiceBranchEntry } from './TaskGitBranchCard'

interface TaskSubtasksCardProps {
  subtasks: Subtask[]
  onToggleSubtask: (subtaskId: string) => Promise<void>
  onAddSubtask: (title: string, branchName?: string) => Promise<void>
  onSaveSubtaskBranch: (subtaskId: string, branch: string) => Promise<void>
  onDeleteSubtask: (subtaskId: string) => Promise<void>
  onUpdateSubtaskDetails?: (subtaskId: string, updatedSubtask: Partial<Subtask>) => Promise<void>
}

export function TaskSubtasksCard({
  subtasks,
  onToggleSubtask,
  onAddSubtask,
  onSaveSubtaskBranch,
  onDeleteSubtask,
  onUpdateSubtaskDetails,
}: TaskSubtasksCardProps) {
  // Add Subtask Modal/Form State
  const [isAddingSubtask, setIsAddingSubtask] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [newServiceName, setNewServiceName] = useState('')
  const [newBranchName, setNewBranchName] = useState('')
  const [newDescription, setNewDescription] = useState('')

  // Subtask Deep-Dive Inspection Modal State
  const [selectedSubtask, setSelectedSubtask] = useState<Subtask | null>(null)
  const [activeTab, setActiveTab] = useState<'overview' | 'files' | 'notes' | 'history'>('overview')

  // Edit fields inside Deep-Dive Modal
  const [inspectTitle, setInspectTitle] = useState('')
  const [inspectDesc, setInspectDesc] = useState('')
  const [inspectService, setInspectService] = useState('')
  const [inspectBranch, setInspectBranch] = useState('')
  const [inspectNotes, setInspectNotes] = useState('')
  const [newNoteInput, setNewNoteInput] = useState('')

  // Files Changed state inside Deep-Dive
  const [newFileName, setNewFileName] = useState('')
  const [newFileStatus, setNewFileStatus] = useState<'added' | 'modified' | 'deleted'>('modified')
  const [newAdditions, setNewAdditions] = useState('12')
  const [newDeletions, setNewDeletions] = useState('3')

  // Delete Confirmation Modal State
  const [itemToDelete, setItemToDelete] = useState<{
    subtaskId: string
    title: string
  } | null>(null)

  const [copiedId, setCopiedId] = useState<string | null>(null)

  const completedCount = subtasks.filter((s) => s.completed).length
  const progress = subtasks.length > 0 ? Math.round((completedCount / subtasks.length) * 100) : 0

  const getSubtaskBranches = (st: Subtask): ServiceBranchEntry[] => {
    if (!st.branchName || st.branchName.trim() === '') return []
    try {
      const parsed = JSON.parse(st.branchName)
      if (Array.isArray(parsed)) return parsed
    } catch {}
    let svc = st.serviceName || ''
    if (!svc && st.branchName.includes('/')) {
      const parts = st.branchName.split('/')
      if (parts.length >= 3) svc = parts[1]
    }
    return [{ id: `b-${st.id}`, serviceName: svc, branchName: st.branchName }]
  }

  const handleCopy = (id: string, branch: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation()
    if (!branch) return
    navigator.clipboard.writeText(`git checkout -b ${branch}`)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  const handleCreateSubtaskSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newTitle.trim()) return

    let branchPayload = ''
    if (newBranchName.trim()) {
      const entry: ServiceBranchEntry = {
        id: `st-branch-${Date.now()}`,
        serviceName: newServiceName.trim(),
        branchName: newBranchName.trim(),
      }
      branchPayload = JSON.stringify([entry])
    }

    await onAddSubtask(newTitle.trim(), branchPayload)
    setNewTitle('')
    setNewServiceName('')
    setNewBranchName('')
    setNewDescription('')
    setIsAddingSubtask(false)
  }

  const openDeepDiveModal = (st: Subtask) => {
    setSelectedSubtask(st)
    setInspectTitle(st.title)
    setInspectDesc(st.description || '')

    const branches = getSubtaskBranches(st)
    if (branches.length > 0) {
      setInspectService(branches[0].serviceName || '')
      setInspectBranch(branches[0].branchName || '')
    } else {
      setInspectService(st.serviceName || '')
      setInspectBranch(st.branchName || '')
    }

    setInspectNotes(st.notes || '')
    setActiveTab('overview')
  }

  const handleSaveSubtaskInspection = async () => {
    if (!selectedSubtask) return

    let branchPayload = ''
    if (inspectBranch.trim()) {
      const entry: ServiceBranchEntry = {
        id: `st-branch-${selectedSubtask.id}`,
        serviceName: inspectService.trim(),
        branchName: inspectBranch.trim(),
      }
      branchPayload = JSON.stringify([entry])
    }

    // Append history log
    let historyList: HistoryLog[] = []
    try {
      historyList = JSON.parse(selectedSubtask.historyLogs || '[]')
    } catch {
      historyList = []
    }
    historyList.unshift({
      id: `log-${Date.now()}`,
      event: 'Updated subtask properties and engineering metadata',
      timestamp: new Date().toISOString(),
      actor: 'You',
    })

    const updates: Partial<Subtask> = {
      title: inspectTitle.trim() || selectedSubtask.title,
      description: inspectDesc.trim(),
      serviceName: inspectService.trim(),
      branchName: branchPayload,
      notes: inspectNotes,
      historyLogs: JSON.stringify(historyList),
    }

    if (onUpdateSubtaskDetails) {
      await onUpdateSubtaskDetails(selectedSubtask.id, updates)
    } else {
      await onSaveSubtaskBranch(selectedSubtask.id, branchPayload)
    }

    setSelectedSubtask((prev) => (prev ? { ...prev, ...updates } : null))
  }

  const handleAddFileToSubtask = async () => {
    if (!selectedSubtask || !newFileName.trim()) return

    let filesList: FileChange[] = []
    try {
      filesList = JSON.parse(selectedSubtask.filesChanged || '[]')
    } catch {
      filesList = []
    }

    filesList.push({
      name: newFileName.trim(),
      status: newFileStatus,
      additions: parseInt(newAdditions, 10) || 0,
      deletions: parseInt(newDeletions, 10) || 0,
    })

    const updates = { filesChanged: JSON.stringify(filesList) }
    if (onUpdateSubtaskDetails) {
      await onUpdateSubtaskDetails(selectedSubtask.id, updates)
    }
    setSelectedSubtask((prev) => (prev ? { ...prev, ...updates } : null))
    setNewFileName('')
  }

  const handleAddNoteToSubtask = async () => {
    if (!selectedSubtask || !newNoteInput.trim()) return

    const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    const noteEntry = `[${timestamp} - You]: ${newNoteInput.trim()}`
    const updatedNotes = inspectNotes ? `${inspectNotes}\n${noteEntry}` : noteEntry

    setInspectNotes(updatedNotes)
    setNewNoteInput('')

    const updates = { notes: updatedNotes }
    if (onUpdateSubtaskDetails) {
      await onUpdateSubtaskDetails(selectedSubtask.id, updates)
    }
    setSelectedSubtask((prev) => (prev ? { ...prev, ...updates } : null))
  }

  const handleConfirmDelete = async () => {
    if (!itemToDelete) return
    await onDeleteSubtask(itemToDelete.subtaskId)
    if (selectedSubtask?.id === itemToDelete.subtaskId) {
      setSelectedSubtask(null)
    }
    setItemToDelete(null)
  }

  return (
    <div className="p-6 rounded-3xl bg-card border border-border/80 shadow-sm space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-bold text-foreground flex items-center gap-2">
            <CheckSquare className="w-4 h-4 text-primary" /> Subtasks & Action Items ({completedCount}/{subtasks.length})
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Granular engineering items in a dedicated card grid with multi-service branches, files, and discussion.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsAddingSubtask(true)}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-bold hover:bg-primary/90 transition-all shadow-sm active:scale-95 cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Add Subtask</span>
        </button>
      </div>

      {/* Progress Bar */}
      <div className="space-y-1">
        <div className="flex items-center justify-between text-xs font-semibold">
          <span className="text-muted-foreground">Subtask Completion</span>
          <span className="text-primary font-bold">{progress}%</span>
        </div>
        <div className="w-full h-2 rounded-full bg-muted overflow-hidden">
          <div
            className="h-full rounded-full bg-primary transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* --- ADD SUBTASK FORM (Toggleable) --- */}
      {isAddingSubtask && (
        <form
          onSubmit={handleCreateSubtaskSubmit}
          className="p-5 rounded-2xl bg-gradient-to-br from-primary/10 via-purple-500/5 to-transparent border border-primary/30 space-y-3.5 animate-scale-in"
        >
          <div className="flex items-center justify-between pb-1 border-b border-border/40">
            <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
              <Plus className="w-3.5 h-3.5 text-primary" /> Create New Engineering Subtask
            </span>
            <button
              type="button"
              onClick={() => setIsAddingSubtask(false)}
              className="p-1 text-muted-foreground hover:text-foreground rounded"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-bold text-muted-foreground uppercase">Subtask Title</label>
            <input
              type="text"
              placeholder="e.g. Implement JWT verification in auth-service..."
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-background border border-border text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-muted-foreground uppercase flex items-center gap-1">
                <Server className="w-3 h-3 text-primary" /> Microservice Name (Optional)
              </label>
              <input
                type="text"
                placeholder="e.g. payment-service"
                value={newServiceName}
                onChange={(e) => setNewServiceName(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-background border border-border font-mono text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-muted-foreground uppercase flex items-center gap-1">
                <GitBranch className="w-3 h-3 text-primary" /> Git Feature Branch Name (Optional)
              </label>
              <input
                type="text"
                placeholder="e.g. feature/payment-service/jwt-auth"
                value={newBranchName}
                onChange={(e) => setNewBranchName(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-background border border-border font-mono text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={() => setIsAddingSubtask(false)}
              className="px-3.5 py-1.5 rounded-xl bg-muted text-xs font-semibold text-foreground hover:bg-accent"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!newTitle.trim()}
              className="px-4 py-1.5 rounded-xl bg-primary text-primary-foreground text-xs font-bold hover:bg-primary/90 transition-all shadow-sm disabled:opacity-50"
            >
              Save Subtask
            </button>
          </div>
        </form>
      )}

      {/* --- SUBTASKS CARD GRID --- */}
      {subtasks.length === 0 ? (
        <div className="p-8 text-center text-xs text-muted-foreground border border-dashed border-border rounded-2xl space-y-2">
          <p>No subtasks created yet.</p>
          <button
            type="button"
            onClick={() => setIsAddingSubtask(true)}
            className="text-primary font-bold hover:underline"
          >
            + Add your first subtask
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {subtasks.map((st) => {
            const branches = getSubtaskBranches(st)
            let filesCount = 0
            try {
              filesCount = JSON.parse(st.filesChanged || '[]').length
            } catch {}

            return (
              <div
                key={st.id}
                onClick={() => openDeepDiveModal(st)}
                className="p-4 rounded-2xl bg-muted/40 hover:bg-muted/70 border border-border/80 hover:border-primary/50 transition-all space-y-3 cursor-pointer shadow-xs hover:shadow-md group relative flex flex-col justify-between"
              >
                <div className="space-y-2.5">
                  {/* Top Bar: Checkbox + Title + Delete */}
                  <div className="flex items-start justify-between gap-2">
                    <label
                      onClick={(e) => e.stopPropagation()}
                      className="flex items-start gap-2.5 cursor-pointer flex-1 min-w-0"
                    >
                      <input
                        type="checkbox"
                        checked={st.completed}
                        onChange={() => onToggleSubtask(st.id)}
                        className="mt-0.5 w-4 h-4 rounded text-primary focus:ring-primary cursor-pointer accent-primary shrink-0"
                      />
                      <span
                        className={`text-xs font-bold leading-snug break-words ${
                          st.completed ? 'line-through text-muted-foreground' : 'text-foreground group-hover:text-primary transition-colors'
                        }`}
                      >
                        {st.title}
                      </span>
                    </label>

                    <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                      <button
                        type="button"
                        onClick={() => openDeepDiveModal(st)}
                        className="p-1 rounded-lg text-muted-foreground hover:text-primary hover:bg-accent transition-colors"
                        title="Inspect subtask details"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          setItemToDelete({
                            subtaskId: st.id,
                            title: st.title,
                          })
                        }
                        className="p-1 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                        title="Delete subtask"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Microservice & Branch Badges */}
                  {branches.length > 0 ? (
                    <div className="space-y-1.5 pt-1">
                      {branches.map((b) => (
                        <div
                          key={b.id}
                          className="flex items-center justify-between gap-2 p-2 rounded-xl bg-background/90 border border-border/80 text-[11px] font-mono"
                        >
                          <div className="flex items-center gap-1.5 truncate">
                            {b.serviceName && (
                              <span className="px-2 py-0.5 rounded-lg bg-primary/15 text-primary text-[9px] font-sans font-bold flex items-center gap-1 shrink-0">
                                <Server className="w-2.5 h-2.5" />
                                {b.serviceName}
                              </span>
                            )}
                            <span className="truncate text-foreground font-bold flex items-center gap-1">
                              <GitBranch className="w-3 h-3 text-primary shrink-0" />
                              {b.branchName}
                            </span>
                          </div>

                          <button
                            type="button"
                            onClick={(e) => handleCopy(b.id, b.branchName, e)}
                            className="px-2 py-0.5 rounded-lg bg-muted hover:bg-accent text-[9px] font-sans font-bold text-foreground transition-all shrink-0 flex items-center gap-1"
                            title="Copy branch command"
                          >
                            {copiedId === b.id ? (
                              <Check className="w-2.5 h-2.5 text-emerald-500" />
                            ) : (
                              <Copy className="w-2.5 h-2.5" />
                            )}
                            <span>{copiedId === b.id ? 'Copied' : 'Copy'}</span>
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : null}
                </div>

                {/* Card Footer: Metadata & View Details CTA */}
                <div className="pt-2 border-t border-border/40 flex items-center justify-between text-[10px] text-muted-foreground font-medium">
                  <div className="flex items-center gap-2">
                    {filesCount > 0 && (
                      <span className="flex items-center gap-1 bg-muted px-1.5 py-0.5 rounded">
                        <FileCode className="w-2.5 h-2.5 text-primary" /> {filesCount} files
                      </span>
                    )}
                    {st.notes && (
                      <span className="flex items-center gap-1 bg-muted px-1.5 py-0.5 rounded">
                        <MessageSquare className="w-2.5 h-2.5 text-primary" /> Notes
                      </span>
                    )}
                  </div>

                  <span className="text-primary font-bold flex items-center gap-0.5 group-hover:translate-x-0.5 transition-transform">
                    Inspect Details <ChevronRight className="w-3 h-3" />
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* --- SUBTASK DEEP-DIVE MODAL --- */}
      {selectedSubtask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-md animate-fade-in">
          <div className="w-full max-w-2xl bg-card border border-border rounded-3xl p-6 shadow-2xl space-y-5 animate-scale-in max-h-[90vh] flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-border shrink-0">
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={selectedSubtask.completed}
                  onChange={async () => {
                    await onToggleSubtask(selectedSubtask.id)
                    setSelectedSubtask((prev) => (prev ? { ...prev, completed: !prev.completed } : null))
                  }}
                  className="w-5 h-5 rounded text-primary focus:ring-primary cursor-pointer accent-primary"
                />
                <div>
                  <h2 className="text-sm font-bold text-foreground">{selectedSubtask.title}</h2>
                  <span className="text-[10px] font-mono text-muted-foreground">ID: {selectedSubtask.id}</span>
                </div>
              </div>

              <button
                onClick={() => setSelectedSubtask(null)}
                className="p-1.5 rounded-xl text-muted-foreground hover:text-foreground hover:bg-accent"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Navigation Tabs */}
            <div className="flex items-center gap-1.5 p-1 rounded-xl bg-muted/60 border border-border shrink-0 text-xs font-semibold">
              <button
                type="button"
                onClick={() => setActiveTab('overview')}
                className={`flex-1 py-1.5 rounded-lg flex items-center justify-center gap-1.5 transition-all ${
                  activeTab === 'overview' ? 'bg-background text-primary shadow-xs font-bold' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <FileText className="w-3.5 h-3.5" /> Overview & Branch
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('files')}
                className={`flex-1 py-1.5 rounded-lg flex items-center justify-center gap-1.5 transition-all ${
                  activeTab === 'files' ? 'bg-background text-primary shadow-xs font-bold' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <FileCode className="w-3.5 h-3.5" /> Files Changed
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('notes')}
                className={`flex-1 py-1.5 rounded-lg flex items-center justify-center gap-1.5 transition-all ${
                  activeTab === 'notes' ? 'bg-background text-primary shadow-xs font-bold' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <MessageSquare className="w-3.5 h-3.5" /> Discussion & Notes
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('history')}
                className={`flex-1 py-1.5 rounded-lg flex items-center justify-center gap-1.5 transition-all ${
                  activeTab === 'history' ? 'bg-background text-primary shadow-xs font-bold' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <History className="w-3.5 h-3.5" /> Activity Logs
              </button>
            </div>

            {/* Tab Contents */}
            <div className="flex-1 overflow-y-auto space-y-4 pr-1">
              {activeTab === 'overview' && (
                <div className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-muted-foreground uppercase">Subtask Title</label>
                    <input
                      type="text"
                      value={inspectTitle}
                      onChange={(e) => setInspectTitle(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-background border border-border text-xs font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-muted-foreground uppercase">Subtask Description</label>
                    <textarea
                      rows={3}
                      placeholder="Add granular engineering specifications, test plan, or acceptance criteria..."
                      value={inspectDesc}
                      onChange={(e) => setInspectDesc(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-background border border-border text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                    />
                  </div>

                  <div className="p-4 rounded-2xl bg-muted/40 border border-border/80 space-y-3">
                    <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                      <GitBranch className="w-3.5 h-3.5 text-primary" /> Dedicated Microservice & Git Branch
                    </span>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-muted-foreground uppercase">Service Name</label>
                        <input
                          type="text"
                          placeholder="e.g. auth-service"
                          value={inspectService}
                          onChange={(e) => setInspectService(e.target.value)}
                          className="w-full px-3 py-2 rounded-xl bg-background border border-border font-mono text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-muted-foreground uppercase">Branch Name</label>
                        <input
                          type="text"
                          placeholder="e.g. feature/auth-service/jwt-login"
                          value={inspectBranch}
                          onChange={(e) => setInspectBranch(e.target.value)}
                          className="w-full px-3 py-2 rounded-xl bg-background border border-border font-mono text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'files' && (
                <div className="space-y-4">
                  <div className="p-4 rounded-2xl bg-muted/30 border border-border/60 space-y-3">
                    <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                      <Plus className="w-3.5 h-3.5 text-primary" /> Log Modified / Added File
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <input
                        type="text"
                        placeholder="Path (e.g. /src/services/Auth.ts)..."
                        value={newFileName}
                        onChange={(e) => setNewFileName(e.target.value)}
                        className="sm:col-span-2 px-3 py-1.5 rounded-xl bg-background border border-border font-mono text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                      />
                      <select
                        value={newFileStatus}
                        onChange={(e) => setNewFileStatus(e.target.value as any)}
                        className="px-3 py-1.5 rounded-xl bg-background border border-border text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                      >
                        <option value="modified">Modified</option>
                        <option value="added">Added</option>
                        <option value="deleted">Deleted</option>
                      </select>
                    </div>
                    <div className="flex items-center justify-end gap-2">
                      <button
                        type="button"
                        onClick={handleAddFileToSubtask}
                        disabled={!newFileName.trim()}
                        className="px-3.5 py-1.5 rounded-xl bg-primary text-primary-foreground text-xs font-bold hover:bg-primary/90 transition-all disabled:opacity-50"
                      >
                        Add File Entry
                      </button>
                    </div>
                  </div>

                  {/* List of Files Changed */}
                  {(() => {
                    let files: FileChange[] = []
                    try {
                      files = JSON.parse(selectedSubtask.filesChanged || '[]')
                    } catch {}

                    if (files.length === 0) {
                      return (
                        <div className="p-6 text-center text-xs text-muted-foreground border border-dashed border-border rounded-2xl">
                          No files logged for this subtask yet.
                        </div>
                      )
                    }

                    return (
                      <div className="space-y-2">
                        {files.map((f, fIdx) => (
                          <div
                            key={fIdx}
                            className="flex items-center justify-between p-2.5 rounded-xl bg-background border border-border font-mono text-xs"
                          >
                            <span className="truncate flex items-center gap-1.5 text-foreground">
                              <FileCode className="w-3.5 h-3.5 text-primary shrink-0" />
                              {f.name}
                            </span>
                            <span
                              className={`text-[9px] font-sans font-bold px-2 py-0.5 rounded-md ${
                                f.status === 'added'
                                  ? 'bg-emerald-500/15 text-emerald-600'
                                  : f.status === 'deleted'
                                  ? 'bg-rose-500/15 text-rose-600'
                                  : 'bg-amber-500/15 text-amber-600'
                              }`}
                            >
                              {f.status}
                            </span>
                          </div>
                        ))}
                      </div>
                    )
                  })()}
                </div>
              )}

              {activeTab === 'notes' && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-muted-foreground uppercase">Add Discussion Note</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Type engineering note or feedback..."
                        value={newNoteInput}
                        onChange={(e) => setNewNoteInput(e.target.value)}
                        className="flex-1 px-3 py-2 rounded-xl bg-background border border-border text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                      />
                      <button
                        type="button"
                        onClick={handleAddNoteToSubtask}
                        disabled={!newNoteInput.trim()}
                        className="px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-bold hover:bg-primary/90 transition-all disabled:opacity-50 shrink-0"
                      >
                        Post Note
                      </button>
                    </div>
                  </div>

                  <div className="p-4 rounded-2xl bg-muted/30 border border-border/80 space-y-2">
                    <span className="text-[10px] font-bold text-muted-foreground uppercase">Subtask Notes Log</span>
                    <pre className="text-xs text-foreground font-mono whitespace-pre-wrap leading-relaxed max-h-48 overflow-y-auto">
                      {inspectNotes || 'No discussion notes logged yet.'}
                    </pre>
                  </div>
                </div>
              )}

              {activeTab === 'history' && (
                <div className="space-y-3">
                  {(() => {
                    let logs: HistoryLog[] = []
                    try {
                      logs = JSON.parse(selectedSubtask.historyLogs || '[]')
                    } catch {}

                    if (logs.length === 0) {
                      return (
                        <div className="p-6 text-center text-xs text-muted-foreground border border-dashed border-border rounded-2xl">
                          Subtask created & ready for execution.
                        </div>
                      )
                    }

                    return (
                      <div className="space-y-2">
                        {logs.map((log) => (
                          <div
                            key={log.id}
                            className="flex items-center justify-between p-2.5 rounded-xl bg-background border border-border text-xs"
                          >
                            <div className="space-y-0.5">
                              <span className="font-bold text-foreground block">{log.event}</span>
                              <span className="text-[10px] text-muted-foreground">Actor: {log.actor}</span>
                            </div>
                            <span className="text-[10px] text-muted-foreground font-mono">
                              {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                        ))}
                      </div>
                    )
                  })()}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-end gap-2 pt-3 border-t border-border shrink-0">
              <button
                type="button"
                onClick={() => setSelectedSubtask(null)}
                className="px-4 py-2 rounded-xl bg-muted hover:bg-accent text-xs font-semibold text-foreground transition-all"
              >
                Close
              </button>
              <button
                type="button"
                onClick={async () => {
                  await handleSaveSubtaskInspection()
                  setSelectedSubtask(null)
                }}
                className="px-5 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-bold hover:bg-primary/90 transition-all shadow-md active:scale-95 flex items-center gap-1.5"
              >
                <Check className="w-4 h-4" /> Save Subtask Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- DELETE CONFIRMATION MODAL --- */}
      {itemToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-md animate-fade-in">
          <div className="w-full max-w-md bg-card border border-destructive/40 rounded-3xl p-6 shadow-2xl space-y-5 animate-scale-in">
            <div className="flex items-center gap-2.5 text-destructive font-bold text-sm">
              <div className="w-8 h-8 rounded-xl bg-destructive/15 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <span>Delete Subtask Item?</span>
            </div>

            <p className="text-xs text-muted-foreground leading-relaxed">
              Are you sure you want to delete this subtask?
            </p>

            <div className="p-3.5 rounded-2xl bg-destructive/10 border border-destructive/20 font-mono text-xs text-foreground space-y-1">
              <div>
                Subtask: <strong className="text-destructive">{itemToDelete.title}</strong>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setItemToDelete(null)}
                className="px-5 py-2 rounded-xl bg-muted hover:bg-accent text-xs font-bold text-foreground transition-all"
              >
                No
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="px-5 py-2 rounded-xl bg-destructive text-destructive-foreground text-xs font-bold hover:bg-destructive/90 transition-all shadow-md active:scale-95"
              >
                Yes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
