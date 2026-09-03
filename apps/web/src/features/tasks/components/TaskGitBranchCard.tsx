'use client'

import { useState, useEffect } from 'react'
import {
  GitBranch,
  Server,
  Plus,
  Edit2,
  Trash2,
  Check,
  Copy,
  AlertTriangle,
  CheckCircle2,
  X,
} from 'lucide-react'

export interface ServiceBranchEntry {
  id: string
  serviceName: string
  branchName: string
}

interface TaskGitBranchCardProps {
  branchName?: string
  taskTitle: string
  onSaveBranch: (branchData: string) => Promise<void>
}

export function TaskGitBranchCard({ branchName, taskTitle, onSaveBranch }: TaskGitBranchCardProps) {
  const [entries, setEntries] = useState<ServiceBranchEntry[]>([])
  const [newServiceName, setNewServiceName] = useState('')
  const [newBranchName, setNewBranchName] = useState('')
  const [isAdding, setIsAdding] = useState(false)
  const [copiedId, setCopiedId] = useState<string | null>(null)

  // Edit Review Modal State
  const [editingEntry, setEditingEntry] = useState<ServiceBranchEntry | null>(null)
  const [editServiceName, setEditServiceName] = useState('')
  const [editBranchName, setEditBranchName] = useState('')
  const [showEditReviewModal, setShowEditReviewModal] = useState(false)

  // Delete Confirmation Modal State
  const [entryToDelete, setEntryToDelete] = useState<ServiceBranchEntry | null>(null)

  useEffect(() => {
    if (!branchName || branchName.trim() === '') {
      setEntries([])
      return
    }

    try {
      const parsed = JSON.parse(branchName)
      if (Array.isArray(parsed)) {
        setEntries(parsed)
        return
      }
    } catch {
      // Legacy string branch
    }

    let svc = ''
    if (branchName.includes('/')) {
      const parts = branchName.split('/')
      if (parts.length >= 3) {
        svc = parts[1]
      }
    }
    setEntries([
      {
        id: 'legacy-1',
        serviceName: svc,
        branchName: branchName,
      },
    ])
  }, [branchName])

  const handleCopy = (id: string, branch: string) => {
    if (!branch) return
    navigator.clipboard.writeText(`git checkout -b ${branch}`)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  const handleAddEntry = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newBranchName.trim()) return

    const newEntry: ServiceBranchEntry = {
      id: `branch-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      serviceName: newServiceName.trim(),
      branchName: newBranchName.trim(),
    }

    const updated = [...entries, newEntry]
    setEntries(updated)
    setNewServiceName('')
    setNewBranchName('')
    await onSaveBranch(JSON.stringify(updated))
  }

  const openEditModal = (entry: ServiceBranchEntry) => {
    setEditingEntry(entry)
    setEditServiceName(entry.serviceName)
    setEditBranchName(entry.branchName)
  }

  const handleConfirmEditUpdate = async () => {
    if (!editingEntry || !editBranchName.trim()) return

    const updated = entries.map((e) =>
      e.id === editingEntry.id
        ? {
            ...e,
            serviceName: editServiceName.trim(),
            branchName: editBranchName.trim(),
          }
        : e
    )

    setEntries(updated)
    setShowEditReviewModal(false)
    setEditingEntry(null)
    await onSaveBranch(JSON.stringify(updated))
  }

  const handleConfirmDelete = async () => {
    if (!entryToDelete) return

    const updated = entries.filter((e) => e.id !== entryToDelete.id)
    setEntries(updated)
    setEntryToDelete(null)
    await onSaveBranch(JSON.stringify(updated))
  }

  return (
    <div className="p-6 rounded-3xl bg-gradient-to-br from-primary/10 via-purple-500/5 to-transparent border border-primary/20 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs font-bold text-primary">
          <GitBranch className="w-4 h-4" /> Multi-Service & Git Branch Configuration ({entries.length})
        </div>
      </div>

      {/* List of Configured Service / Branch Pairs */}
      <div className="space-y-2">
        {entries.length === 0 ? (
          <div className="p-4 text-center text-xs text-muted-foreground bg-background/50 border border-dashed border-border rounded-2xl">
            No service branches configured yet. Add one below!
          </div>
        ) : (
          entries.map((entry) => (
            <div
              key={entry.id}
              className="p-3.5 rounded-2xl bg-background/90 border border-border/80 hover:border-primary/50 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs"
            >
              <div className="flex flex-wrap items-center gap-2">
                {entry.serviceName ? (
                  <span className="px-2.5 py-1 rounded-xl bg-primary/15 border border-primary/30 text-primary text-[10px] font-extrabold flex items-center gap-1 shadow-xs">
                    <Server className="w-3 h-3" />
                    {entry.serviceName}
                  </span>
                ) : null}

                <span className="font-mono text-xs font-bold text-foreground flex items-center gap-1.5">
                  <GitBranch className="w-3.5 h-3.5 text-primary" />
                  {entry.branchName}
                </span>
              </div>

              <div className="flex items-center gap-1.5 self-end sm:self-auto">
                <button
                  type="button"
                  onClick={() => handleCopy(entry.id, entry.branchName)}
                  className="px-2.5 py-1 rounded-xl bg-muted hover:bg-accent border border-border text-[10px] font-bold text-foreground transition-all flex items-center gap-1"
                  title="Copy git checkout command"
                >
                  {copiedId === entry.id ? (
                    <Check className="w-3 h-3 text-emerald-500" />
                  ) : (
                    <Copy className="w-3 h-3" />
                  )}
                  <span>{copiedId === entry.id ? 'Copied' : 'Copy'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => openEditModal(entry)}
                  className="p-1.5 rounded-xl hover:bg-accent text-muted-foreground hover:text-primary transition-colors"
                  title="Edit service or branch"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </button>

                <button
                  type="button"
                  onClick={() => setEntryToDelete(entry)}
                  className="p-1.5 rounded-xl hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                  title="Delete service branch"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Add New Service & Branch Trigger / Form */}
      {!isAdding ? (
        <div className="pt-2">
          <button
            type="button"
            onClick={() => setIsAdding(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-bold hover:bg-primary/90 transition-all shadow-sm active:scale-95 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Branch</span>
          </button>
        </div>
      ) : (
        <form onSubmit={handleAddEntry} className="space-y-3 pt-3 p-4 rounded-2xl bg-card border border-border/80 shadow-xs animate-fade-in">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
              <GitBranch className="w-3.5 h-3.5 text-primary" /> Add New Service & Branch
            </span>
            <button
              type="button"
              onClick={() => {
                setIsAdding(false)
                setNewServiceName('')
                setNewBranchName('')
              }}
              className="p-1 text-muted-foreground hover:text-foreground"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            <div className="space-y-1 sm:col-span-1">
              <label className="text-[10px] font-bold text-muted-foreground uppercase flex items-center gap-1">
                <Server className="w-3 h-3 text-primary" /> Service Name
              </label>
              <input
                type="text"
                placeholder="e.g. auth-service"
                value={newServiceName}
                onChange={(e) => setNewServiceName(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-background border border-border font-mono text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary shadow-inner"
              />
            </div>

            <div className="space-y-1 sm:col-span-2">
              <label className="text-[10px] font-bold text-muted-foreground uppercase flex items-center gap-1">
                <GitBranch className="w-3 h-3 text-primary" /> Branch Name
              </label>
              <input
                type="text"
                placeholder="e.g. feature/auth-service/oauth-login..."
                value={newBranchName}
                onChange={(e) => setNewBranchName(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-background border border-border font-mono text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary shadow-inner"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={() => {
                setIsAdding(false)
                setNewServiceName('')
                setNewBranchName('')
              }}
              className="px-3.5 py-1.5 rounded-xl bg-muted hover:bg-accent text-xs font-semibold text-foreground transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!newBranchName.trim()}
              className="px-4 py-1.5 rounded-xl bg-primary text-primary-foreground text-xs font-bold hover:bg-primary/90 transition-all flex items-center gap-1.5 shadow-sm active:scale-95 disabled:opacity-50"
            >
              <Plus className="w-3.5 h-3.5" /> Save Branch
            </button>
          </div>
        </form>
      )}

      {/* --- EDIT MODAL (Step 1) --- */}
      {editingEntry && !showEditReviewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-md animate-fade-in">
          <div className="w-full max-w-md bg-card border border-border rounded-3xl p-6 shadow-2xl space-y-4 animate-scale-in">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                <Edit2 className="w-4 h-4 text-primary" /> Edit Service & Branch
              </h3>
              <button
                onClick={() => setEditingEntry(null)}
                className="p-1 rounded-xl text-muted-foreground hover:text-foreground"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-muted-foreground uppercase flex items-center gap-1">
                  <Server className="w-3 h-3 text-primary" /> Service Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. auth-service"
                  value={editServiceName}
                  onChange={(e) => setEditServiceName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-background border border-border font-mono text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-muted-foreground uppercase flex items-center gap-1">
                  <GitBranch className="w-3 h-3 text-primary" /> Branch Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. feature/auth-service/ticket-slug"
                  value={editBranchName}
                  onChange={(e) => setEditBranchName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-background border border-border font-mono text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
              <button
                type="button"
                onClick={() => setEditingEntry(null)}
                className="px-4 py-2 rounded-xl bg-muted hover:bg-accent text-xs font-semibold text-foreground transition-all"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => setShowEditReviewModal(true)}
                disabled={!editBranchName.trim()}
                className="px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-bold hover:bg-primary/90 transition-all disabled:opacity-50"
              >
                Review & Confirm Update &rarr;
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- REVIEW UPDATE POPUP MODAL (Step 2) --- */}
      {showEditReviewModal && editingEntry && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-md animate-fade-in">
          <div className="w-full max-w-md bg-card border border-primary/40 rounded-3xl p-6 shadow-2xl space-y-5 animate-scale-in">
            <div className="flex items-center gap-2 text-primary font-bold text-sm">
              <CheckCircle2 className="w-5 h-5" />
              <span>Review Changes Before Updating</span>
            </div>

            <p className="text-xs text-muted-foreground">
              Please review the modified service name and branch name details before applying changes.
            </p>

            <div className="space-y-3 p-4 rounded-2xl bg-muted/40 border border-border font-mono text-xs">
              <div className="space-y-1">
                <span className="text-[10px] text-muted-foreground uppercase font-sans font-bold">Previous Values:</span>
                <div className="text-muted-foreground">
                  Service: <strong>{editingEntry.serviceName || '(None)'}</strong> &bull; Branch: <strong>{editingEntry.branchName}</strong>
                </div>
              </div>

              <div className="pt-2 border-t border-border/60 space-y-1">
                <span className="text-[10px] text-primary uppercase font-sans font-bold">New Updated Values:</span>
                <div className="text-foreground font-bold">
                  Service: <span className="text-primary">{editServiceName || '(None)'}</span> &bull; Branch: <span className="text-primary">{editBranchName}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowEditReviewModal(false)}
                className="px-4 py-2 rounded-xl bg-muted hover:bg-accent text-xs font-semibold text-foreground transition-all"
              >
                Back to Edit
              </button>
              <button
                type="button"
                onClick={handleConfirmEditUpdate}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-md active:scale-95 flex items-center gap-1.5"
              >
                <Check className="w-4 h-4" /> Confirm & Save Update
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- DELETE CONFIRMATION POPUP MODAL --- */}
      {entryToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-md animate-fade-in">
          <div className="w-full max-w-md bg-card border border-destructive/40 rounded-3xl p-6 shadow-2xl space-y-5 animate-scale-in">
            <div className="flex items-center gap-2.5 text-destructive font-bold text-sm">
              <div className="w-8 h-8 rounded-xl bg-destructive/15 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <span>Delete Service Branch Configuration?</span>
            </div>

            <p className="text-xs text-muted-foreground leading-relaxed">
              Are you sure you want to delete this configuration?
            </p>

            <div className="p-3.5 rounded-2xl bg-destructive/10 border border-destructive/20 font-mono text-xs text-foreground space-y-1">
              {entryToDelete.serviceName && (
                <div>
                  Service: <strong className="text-destructive">{entryToDelete.serviceName}</strong>
                </div>
              )}
              <div>
                Branch: <strong className="text-destructive">{entryToDelete.branchName}</strong>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setEntryToDelete(null)}
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
