'use client'

import { useState } from 'react'
import { Building2, X, Loader2, Sparkles, Check, ArrowRight } from 'lucide-react'
import { useOrgStore } from '@/stores/org-store'
import { useWorkspaceStore } from '@/stores/workspace-store'

interface CreateOrganizationModalProps {
  isOpen: boolean
  onClose: () => void
}

export function CreateOrganizationModal({ isOpen, onClose }: CreateOrganizationModalProps) {
  const { createOrganization, setCurrentOrg, fetchOrganizations } = useOrgStore()
  const { fetchWorkspaces } = useWorkspaceStore()
  const [name, setName] = useState('')
  const [plan, setPlan] = useState('ENTERPRISE')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!isOpen) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return

    setLoading(true)
    setError(null)

    try {
      const newOrg = await createOrganization(name.trim())
      await fetchOrganizations()
      setCurrentOrg(newOrg)
      if (newOrg?.id) {
        await fetchWorkspaces(newOrg.id)
      }
      setName('')
      onClose()
    } catch (err: any) {
      setError(err?.message || 'Failed to create organization. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-md animate-fade-in">
      <div
        className="w-full max-w-md rounded-3xl bg-card border border-border shadow-2xl p-6 sm:p-7 space-y-5 animate-scale-in transition-all relative overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="absolute -top-12 -right-12 w-36 h-36 bg-primary/10 rounded-full blur-2xl pointer-events-none" />

        {/* Modal Header */}
        <div className="flex items-center justify-between relative z-10">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-primary to-indigo-500 text-white flex items-center justify-center shadow-md shadow-primary/25">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-foreground tracking-tight">Create Organization</h3>
              <p className="text-xs text-muted-foreground">Add a new company or tenant entity</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-xl hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
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
            <label className="text-xs font-semibold text-foreground">Organization Name</label>
            <input
              type="text"
              placeholder="e.g. Acme Corporation, Stark Labs"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="flex h-10 w-full rounded-xl border border-border bg-background px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary transition-all"
              required
              autoFocus
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground">Workspace Plan</label>
            <div className="grid grid-cols-3 gap-2">
              {['ENTERPRISE', 'PRO', 'STARTER'].map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPlan(p)}
                  className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all text-center ${plan === p
                      ? 'border-primary bg-primary/10 text-primary shadow-sm'
                      : 'border-border/60 bg-muted/20 text-muted-foreground hover:border-primary/40 hover:text-foreground'
                    }`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          <div className="p-3 rounded-xl bg-accent/30 border border-border/40 text-[11px] text-muted-foreground leading-relaxed flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-primary shrink-0" />
            <span>Your new organization will automatically have isolated teams, workspaces, and RBAC rules.</span>
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
                  Create Organization
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
