'use client'

import { useState } from 'react'
import { FileCode, FileText, FilePlus, Edit2, Trash2, Check, X } from 'lucide-react'
import { FileChange } from '@/stores/task-store'

interface TaskFilesChangedCardProps {
  filesChanged: FileChange[]
  onAddFileChange: (file: FileChange) => Promise<void>
  onUpdateFileChange?: (index: number, updatedFile: FileChange) => Promise<void>
  onDeleteFileChange?: (index: number) => Promise<void>
  canEdit?: boolean
}

export function TaskFilesChangedCard({
  filesChanged,
  onAddFileChange,
  onUpdateFileChange,
  onDeleteFileChange,
  canEdit = true,
}: TaskFilesChangedCardProps) {
  const [fileName, setFileName] = useState('')
  const [status, setStatus] = useState<'added' | 'modified' | 'deleted'>('modified')

  // Inline editing state
  const [editingIndex, setEditingIndex] = useState<number | null>(null)
  const [editName, setEditName] = useState('')
  const [editStatus, setEditStatus] = useState<'added' | 'modified' | 'deleted'>('modified')
  const [editAdditions, setEditAdditions] = useState(0)
  const [editDeletions, setEditDeletions] = useState(0)
  const [isSavingEdit, setIsSavingEdit] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const nameToAdd = fileName.trim()
    if (!nameToAdd) return
    const statusToAdd = status
    setFileName('')
    setStatus('modified')
    try {
      await onAddFileChange({
        name: nameToAdd,
        status: statusToAdd,
        additions: Math.floor(Math.random() * 40) + 1,
        deletions: Math.floor(Math.random() * 15),
      })
    } catch (err) {
      setFileName(nameToAdd)
      setStatus(statusToAdd)
    }
  }

  const handleStartEdit = (index: number, f: FileChange) => {
    setEditingIndex(index)
    setEditName(f.name)
    setEditStatus(f.status)
    setEditAdditions(f.additions || 0)
    setEditDeletions(f.deletions || 0)
  }

  const handleCancelEdit = () => {
    setEditingIndex(null)
    setEditName('')
  }

  const handleSaveEdit = async () => {
    if (editingIndex === null || !editName.trim() || !onUpdateFileChange) return
    setIsSavingEdit(true)
    try {
      await onUpdateFileChange(editingIndex, {
        name: editName.trim(),
        status: editStatus,
        additions: editAdditions,
        deletions: editDeletions,
      })
      setEditingIndex(null)
    } finally {
      setIsSavingEdit(false)
    }
  }

  const handleDelete = async (index: number) => {
    if (!onDeleteFileChange) return
    await onDeleteFileChange(index)
  }

  return (
    <div className="p-6 rounded-3xl bg-card border border-border/80 shadow-sm space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
          <FileCode className="w-4 h-4 text-primary" /> Files Changed & Code Diffs ({filesChanged.length})
        </h3>
      </div>

      <div className="space-y-2">
        {filesChanged.length === 0 ? (
          <div className="p-6 text-center text-xs text-muted-foreground border border-dashed border-border rounded-2xl">
            No changed files tracked yet. Log modified or newly added files below!
          </div>
        ) : (
          filesChanged.map((f, i) => {
            if (editingIndex === i) {
              return (
                <div
                  key={i}
                  className="p-4 rounded-2xl bg-card border border-primary/40 shadow-sm space-y-3 animate-fade-in"
                >
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-muted-foreground uppercase flex items-center gap-1">
                      <FileText className="w-3 h-3 text-primary" /> File Content / Path / Note
                    </label>
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      placeholder="e.g. psh-common-hmac-service or LoginRequest.java"
                      className="w-full px-3 py-2 rounded-xl bg-background border border-border text-xs text-foreground font-mono focus:outline-none focus:ring-2 focus:ring-primary leading-relaxed"
                      autoFocus
                    />
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                    <div className="flex flex-wrap items-center gap-3">
                      {/* Status Selector */}
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-muted-foreground uppercase">
                          Status
                        </label>
                        <select
                          value={editStatus}
                          onChange={(e) => setEditStatus(e.target.value as any)}
                          className="px-3 py-1.5 rounded-xl bg-background border border-border text-xs text-foreground font-semibold focus:outline-none focus:ring-2 focus:ring-primary cursor-pointer"
                        >
                          <option value="modified">Modified</option>
                          <option value="added">Newly Added</option>
                          <option value="deleted">Deleted</option>
                        </select>
                      </div>

                      {/* Additions */}
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-muted-foreground uppercase">
                          Additions (+)
                        </label>
                        <input
                          type="number"
                          min={0}
                          value={editAdditions}
                          onChange={(e) => setEditAdditions(Math.max(0, parseInt(e.target.value, 10) || 0))}
                          className="w-20 px-2.5 py-1.5 rounded-xl bg-background border border-border text-xs text-emerald-500 font-mono font-bold focus:outline-none focus:ring-2 focus:ring-primary"
                        />
                      </div>

                      {/* Deletions */}
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-muted-foreground uppercase">
                          Deletions (-)
                        </label>
                        <input
                          type="number"
                          min={0}
                          value={editDeletions}
                          onChange={(e) => setEditDeletions(Math.max(0, parseInt(e.target.value, 10) || 0))}
                          className="w-20 px-2.5 py-1.5 rounded-xl bg-background border border-border text-xs text-destructive font-mono font-bold focus:outline-none focus:ring-2 focus:ring-primary"
                        />
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 pt-2 sm:pt-0 ml-auto">
                      <button
                        type="button"
                        onClick={handleCancelEdit}
                        disabled={isSavingEdit}
                        className="px-3 py-1.5 rounded-xl bg-muted hover:bg-accent text-xs font-semibold text-foreground transition-all cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={handleSaveEdit}
                        disabled={!editName.trim() || isSavingEdit}
                        className="px-4 py-1.5 rounded-xl bg-primary text-primary-foreground text-xs font-bold hover:bg-primary/90 transition-all flex items-center gap-1.5 shadow-sm active:scale-95 disabled:opacity-50 cursor-pointer"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>{isSavingEdit ? 'Saving...' : 'Save Changes'}</span>
                      </button>
                    </div>
                  </div>
                </div>
              )
            }

            return (
              <div
                key={i}
                className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 rounded-2xl bg-muted/40 border border-border/60 font-mono text-xs gap-3 hover:border-border transition-all"
              >
                <div className="flex items-start sm:items-center gap-2.5 flex-1 min-w-0">
                  <FileText className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5 sm:mt-0" />
                  <span className="font-semibold text-foreground break-all leading-relaxed">{f.name}</span>
                  <span
                    className={`text-[9px] uppercase px-2 py-0.5 rounded-md font-sans font-bold shrink-0 ${
                      f.status === 'added'
                        ? 'bg-emerald-500/15 text-emerald-600 border border-emerald-500/30'
                        : f.status === 'deleted'
                        ? 'bg-destructive/15 text-destructive border border-destructive/30'
                        : 'bg-amber-500/15 text-amber-600 border border-amber-500/30'
                    }`}
                  >
                    {f.status}
                  </span>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 pl-6 sm:pl-0">
                  <div className="flex items-center gap-2 font-mono text-[11px]">
                    <span className="text-emerald-500 font-bold">+{f.additions}</span>
                    <span className="text-destructive font-bold">-{f.deletions}</span>
                  </div>

                  {canEdit && (
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleStartEdit(i, f)}
                        className="p-1.5 rounded-xl hover:bg-accent text-muted-foreground hover:text-primary transition-colors cursor-pointer"
                        title="Edit file content and status"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      {onDeleteFileChange && (
                        <button
                          type="button"
                          onClick={() => handleDelete(i)}
                          className="p-1.5 rounded-xl hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors cursor-pointer"
                          title="Delete file change"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )
          })
        )}
      </div>

      {canEdit && (
        <form onSubmit={handleSubmit} className="flex flex-wrap gap-2 pt-2">
          <input
            type="text"
            placeholder="e.g. LoginRequest.java"
            value={fileName}
            onChange={(e) => setFileName(e.target.value)}
            className="flex-1 min-w-[200px] px-3 py-2 rounded-xl bg-background border border-border text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          />
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as any)}
            className="px-3 py-2 rounded-xl bg-background border border-border text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary cursor-pointer"
          >
            <option value="modified">Modified</option>
            <option value="added">Newly Added</option>
            <option value="deleted">Deleted</option>
          </select>
          <button
            type="submit"
            className="px-4 py-2 rounded-xl bg-secondary text-secondary-foreground text-xs font-semibold hover:bg-secondary/90 transition-all flex items-center gap-1 cursor-pointer"
          >
            <FilePlus className="w-3.5 h-3.5" /> Log File
          </button>
        </form>
      )}
    </div>
  )
}
