'use client'

import { useState } from 'react'
import { FileCode, FileText, FilePlus } from 'lucide-react'
import { FileChange } from '@/stores/task-store'

interface TaskFilesChangedCardProps {
  filesChanged: FileChange[]
  onAddFileChange: (file: FileChange) => Promise<void>
}

export function TaskFilesChangedCard({ filesChanged, onAddFileChange }: TaskFilesChangedCardProps) {
  const [fileName, setFileName] = useState('')
  const [status, setStatus] = useState<'added' | 'modified' | 'deleted'>('modified')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!fileName.trim()) return
    await onAddFileChange({
      name: fileName.trim(),
      status,
      additions: Math.floor(Math.random() * 40) + 1,
      deletions: Math.floor(Math.random() * 15),
    })
    setFileName('')
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
          filesChanged.map((f, i) => (
            <div
              key={i}
              className="flex items-center justify-between p-3 rounded-2xl bg-muted/40 border border-border/60 font-mono text-xs"
            >
              <div className="flex items-center gap-2">
                <FileText className="w-3.5 h-3.5 text-muted-foreground" />
                <span className="font-semibold text-foreground">{f.name}</span>
                <span
                  className={`text-[9px] uppercase px-1.5 py-0.5 rounded font-sans font-bold ${
                    f.status === 'added'
                      ? 'bg-emerald-500/15 text-emerald-600'
                      : f.status === 'deleted'
                      ? 'bg-destructive/15 text-destructive'
                      : 'bg-amber-500/15 text-amber-600'
                  }`}
                >
                  {f.status}
                </span>
              </div>
              <div className="flex items-center gap-2 font-mono text-[11px]">
                <span className="text-emerald-500">+{f.additions}</span>
                <span className="text-destructive">-{f.deletions}</span>
              </div>
            </div>
          ))
        )}
      </div>

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
          className="px-3 py-2 rounded-xl bg-background border border-border text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
        >
          <option value="modified">Modified</option>
          <option value="added">Newly Added</option>
          <option value="deleted">Deleted</option>
        </select>
        <button
          type="submit"
          className="px-4 py-2 rounded-xl bg-secondary text-secondary-foreground text-xs font-semibold hover:bg-secondary/90 transition-all flex items-center gap-1"
        >
          <FilePlus className="w-3.5 h-3.5" /> Log File
        </button>
      </form>
    </div>
  )
}
