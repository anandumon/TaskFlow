'use client'

import React, { useState } from 'react'
import {
  X,
  Hash,
  Lock,
  Globe,
  FolderKanban,
  Users,
  Check,
  Loader2,
  Sparkles,
} from 'lucide-react'
import { Portal } from '@/components/ui/portal'
import { useProjectStore } from '@/stores/project-store'

interface CreateChannelModalProps {
  isOpen: boolean
  onClose: () => void
  members: { id: string; name: string; email: string; avatarUrl?: string }[]
  onCreate: (data: {
    name: string
    description?: string
    projectId?: string
    projectName?: string
    isPrivate?: boolean
    memberIds?: string[]
  }) => Promise<void>
}

export function CreateChannelModal({
  isOpen,
  onClose,
  members,
  onCreate,
}: CreateChannelModalProps) {
  const { projects } = useProjectStore()
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [selectedProjectId, setSelectedProjectId] = useState<string>('')
  const [isPrivate, setIsPrivate] = useState(false)
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)

  if (!isOpen) return null

  const handleToggleMember = (id: string) => {
    setSelectedMemberIds((prev) =>
      prev.includes(id) ? prev.filter((m) => m !== id) : [...prev, id]
    )
  }

  const handleSelectAllMembers = () => {
    if (selectedMemberIds.length === members.length) {
      setSelectedMemberIds([])
    } else {
      setSelectedMemberIds(members.map((m) => m.id))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return

    const selectedPrj = projects.find((p) => p.id === selectedProjectId)

    setIsSubmitting(true)
    try {
      await onCreate({
        name: name.trim(),
        description: description.trim(),
        projectId: selectedProjectId || undefined,
        projectName: selectedPrj?.name,
        isPrivate,
        memberIds: selectedMemberIds,
      })
      onClose()
      setName('')
      setDescription('')
      setSelectedProjectId('')
      setSelectedMemberIds([])
    } catch {
      // handled by caller
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Portal>
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
        <div className="bg-card border border-border rounded-3xl p-6 w-full max-w-lg shadow-2xl space-y-4 animate-scale-in max-h-[90vh] overflow-y-auto custom-scrollbar">
          {/* Header */}
          <div className="flex items-center justify-between pb-3 border-b border-border">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                <Hash className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-base font-bold text-foreground">Create Channel</h3>
                <p className="text-xs text-muted-foreground">
                  Channels are where your team communicates on specific topics.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Channel Name */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground flex items-center gap-1">
                <span>Name</span>
                <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-bold text-xs">
                  #
                </span>
                <input
                  type="text"
                  placeholder="e.g. general, payment-hub, frontend-team"
                  value={name}
                  onChange={(e) =>
                    setName(e.target.value.toLowerCase().replace(/\s+/g, '-'))
                  }
                  className="w-full pl-7 pr-3 py-2 rounded-xl bg-background border border-border text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  autoFocus
                  required
                />
              </div>
            </div>

            {/* Description / Topic */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Topic &amp; Purpose (Optional)</label>
              <input
                type="text"
                placeholder="What is this channel about?"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-background border border-border text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            {/* Associate with Project (Optional badge) */}
            {projects.length > 0 && (
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                  <FolderKanban className="w-3.5 h-3.5 text-primary" />
                  <span>Associate Project Badge (Optional)</span>
                </label>
                <select
                  value={selectedProjectId}
                  onChange={(e) => setSelectedProjectId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-background border border-border text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary cursor-pointer"
                >
                  <option value="">No Project Tag (Workspace General)</option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Private vs Public Toggle */}
            <div className="p-3.5 rounded-2xl bg-card border border-border space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {isPrivate ? (
                    <Lock className="w-4 h-4 text-amber-500" />
                  ) : (
                    <Globe className="w-4 h-4 text-emerald-500" />
                  )}
                  <div>
                    <div className="text-xs font-bold text-foreground">
                      {isPrivate ? 'Private Channel' : 'Public Channel'}
                    </div>
                    <div className="text-[11px] text-muted-foreground">
                      {isPrivate
                        ? 'Only specific members can view and join.'
                        : 'Anyone in the workspace can view and send messages.'}
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setIsPrivate(!isPrivate)}
                  className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer ${
                    isPrivate ? 'bg-primary' : 'bg-muted'
                  }`}
                >
                  <span
                    className={`block w-4 h-4 rounded-full bg-white transition-transform ${
                      isPrivate ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
            </div>

            {/* Add Channel Members Multi-select */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-primary" />
                  <span>Channel Members ({selectedMemberIds.length} selected)</span>
                </label>
                {members.length > 1 && (
                  <button
                    type="button"
                    onClick={handleSelectAllMembers}
                    className="text-[11px] text-primary hover:underline font-semibold cursor-pointer"
                  >
                    {selectedMemberIds.length === members.length ? 'Deselect All' : 'Select All'}
                  </button>
                )}
              </div>

              <div className="max-h-40 overflow-y-auto rounded-xl border border-border bg-background/50 divide-y divide-border/40 p-1 space-y-0.5 custom-scrollbar">
                {members.length === 0 ? (
                  <div className="p-3 text-center text-xs text-muted-foreground">
                    No other members found in this workspace.
                  </div>
                ) : (
                  members.map((m) => {
                    const isChecked = selectedMemberIds.includes(m.id)
                    return (
                      <label
                        key={m.id}
                        className={`flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer transition-all ${
                          isChecked ? 'bg-primary/15 text-foreground font-semibold' : 'hover:bg-muted/50 text-muted-foreground'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 truncate">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => handleToggleMember(m.id)}
                            className="w-4 h-4 rounded border-border text-primary focus:ring-primary cursor-pointer accent-primary"
                          />
                          <div className="w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center text-[10px] font-bold shrink-0">
                            {m.name.charAt(0).toUpperCase()}
                          </div>
                          <span className="text-xs truncate text-foreground">{m.name}</span>
                        </div>
                        <span className="text-[10px] text-muted-foreground truncate">{m.email}</span>
                      </label>
                    )
                  })
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
              <button
                type="button"
                onClick={onClose}
                className="px-3.5 py-2 rounded-xl text-xs font-semibold text-muted-foreground hover:bg-accent transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting || !name.trim()}
                className="px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-bold hover:bg-primary/90 transition-all shadow-md shadow-primary/20 flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Creating...</span>
                  </>
                ) : (
                  <span>Create Channel</span>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </Portal>
  )
}
