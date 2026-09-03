'use client'

import { useState } from 'react'
import { Layers, X, Loader2, Sparkles, Check, ArrowRight, FolderKanban, Terminal, Zap, Shield, Rocket } from 'lucide-react'
import { useOrgStore } from '@/stores/org-store'
import { useWorkspaceStore } from '@/stores/workspace-store'

interface CreateWorkspaceModalProps {
  isOpen: boolean
  onClose: () => void
}

const PRESET_COLORS = [
  { label: 'Indigo', value: '#6366F1' },
  { label: 'Purple', value: '#8B5CF6' },
  { label: 'Pink', value: '#EC4899' },
  { label: 'Emerald', value: '#10B981' },
  { label: 'Amber', value: '#F59E0B' },
  { label: 'Cyan', value: '#06B6D4' },
  { label: 'Blue', value: '#3B82F6' },
]

export function CreateWorkspaceModal({ isOpen, onClose }: CreateWorkspaceModalProps) {
  const { currentOrg } = useOrgStore()
  const { createWorkspace, setCurrentWorkspace, fetchWorkspaces } = useWorkspaceStore()
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [color, setColor] = useState('#6366F1')
  const [icon, setIcon] = useState('Layers')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!isOpen) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    if (!currentOrg?.id) {
      setError('Please select an active organization first.')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const newWs = await createWorkspace(currentOrg.id, {
        name: name.trim(),
        description: description.trim() || undefined,
        color,
        icon,
      })
      await fetchWorkspaces(currentOrg.id)
      setCurrentWorkspace(newWs)
      setName('')
      setDescription('')
      onClose()
    } catch (err: any) {
      setError(err?.message || 'Failed to create workspace. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-fade-in">
      <div
        className="w-full max-w-md rounded-2xl bg-card border border-border/80 shadow-2xl p-6 space-y-5 animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-md transition-colors"
              style={{ backgroundColor: color }}
            >
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-foreground">Create Workspace</h3>
              <p className="text-xs text-muted-foreground">
                In <span className="font-semibold text-primary">{currentOrg?.name || 'Organization'}</span>
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-xs text-destructive font-medium">
            {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground">Workspace Name</label>
            <input
              type="text"
              placeholder="e.g. Core Engineering, Mobile App, Growth Team"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="flex h-10 w-full rounded-xl border border-border bg-background px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary transition-all"
              required
              autoFocus
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground">Description (Optional)</label>
            <textarea
              rows={2}
              placeholder="What does this workspace focus on?"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="flex w-full rounded-xl border border-border bg-background px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary transition-all resize-none"
            />
          </div>

          {/* Theme Color Picker */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground">Brand Color</label>
            <div className="flex items-center gap-2">
              {PRESET_COLORS.map((c) => (
                <button
                  key={c.value}
                  type="button"
                  onClick={() => setColor(c.value)}
                  className={`w-7 h-7 rounded-full transition-transform flex items-center justify-center ${color === c.value ? 'scale-115 ring-2 ring-primary ring-offset-2 ring-offset-background' : 'hover:scale-105'
                    }`}
                  style={{ backgroundColor: c.value }}
                  title={c.label}
                >
                  {color === c.value && <Check className="w-3.5 h-3.5 text-white" />}
                </button>
              ))}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-muted-foreground hover:bg-muted transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !name.trim()}
              className="px-5 py-2 rounded-xl bg-primary text-primary-foreground font-bold text-xs hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2 shadow-md shadow-primary/25"
            >
              {loading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  Create Workspace
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
