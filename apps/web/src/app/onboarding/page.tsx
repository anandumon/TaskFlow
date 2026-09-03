'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/stores/auth-store'
import { useOrgStore } from '@/stores/org-store'
import { useWorkspaceStore } from '@/stores/workspace-store'
import { Building2, Briefcase, ArrowRight, CheckCircle2, Sparkles, Loader2 } from 'lucide-react'

export default function OnboardingPage() {
  const router = useRouter()
  const { user } = useAuthStore()
  const { createOrganization } = useOrgStore()
  const { createWorkspace } = useWorkspaceStore()

  const [step, setStep] = useState<1 | 2>(1)
  const [orgName, setOrgName] = useState('')
  const [wsName, setWsName] = useState('')
  const [wsDescription, setWsDescription] = useState('')
  const [createdOrgId, setCreatedOrgId] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleStep1 = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!orgName.trim()) return
    setIsSubmitting(true)
    setError(null)
    try {
      const org = await createOrganization(orgName.trim())
      setCreatedOrgId(org.id)
      setStep(2)
    } catch (err: any) {
      setError(err?.message || 'Failed to create organization')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleStep2 = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!createdOrgId || !wsName.trim()) return
    setIsSubmitting(true)
    setError(null)
    try {
      await createWorkspace(createdOrgId, {
        name: wsName.trim(),
        description: wsDescription.trim(),
      })
      router.push('/app/home')
    } catch (err: any) {
      setError(err?.message || 'Failed to create workspace')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-muted/30 to-background flex items-center justify-center p-6">
      <div className="w-full max-w-xl">
        {/* Progress Bar & Header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold uppercase tracking-wider mb-4">
            <Sparkles className="w-3.5 h-3.5" /> Getting Started
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight">
            Welcome to TaskFlow, {user?.firstName || 'there'}!
          </h1>
          <p className="text-muted-foreground mt-2 text-sm">
            Let&apos;s set up your collaboration hub in two quick steps.
          </p>

          {/* Stepper Dots */}
          <div className="flex items-center justify-center gap-4 mt-6">
            <div className="flex items-center gap-2">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                  step >= 1
                    ? 'bg-primary text-primary-foreground shadow-md shadow-primary/20'
                    : 'bg-muted text-muted-foreground'
                }`}
              >
                1
              </div>
              <span className="text-xs font-medium">Organization</span>
            </div>
            <div className="w-12 h-0.5 bg-border" />
            <div className="flex items-center gap-2">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                  step === 2
                    ? 'bg-primary text-primary-foreground shadow-md shadow-primary/20'
                    : 'bg-muted text-muted-foreground'
                }`}
              >
                2
              </div>
              <span className="text-xs font-medium">Workspace</span>
            </div>
          </div>
        </div>

        {/* Card */}
        <div className="bg-card border border-border/80 shadow-xl shadow-black/5 rounded-2xl p-8 backdrop-blur-sm relative overflow-hidden">
          {error && (
            <div className="mb-6 p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm">
              {error}
            </div>
          )}

          {step === 1 ? (
            <form onSubmit={handleStep1} className="space-y-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                  <Building2 className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold">Name your Organization</h2>
                  <p className="text-xs text-muted-foreground">
                    This represents your company, agency, or team.
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <label htmlFor="orgName" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Organization Name
                </label>
                <input
                  id="orgName"
                  type="text"
                  placeholder="e.g. Acme Corp, Stark Industries, Design Studio"
                  value={orgName}
                  onChange={(e) => setOrgName(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-input bg-background/50 focus:bg-background focus:ring-2 focus:ring-primary focus:outline-none text-sm transition-all shadow-sm"
                  required
                  autoFocus
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting || !orgName.trim()}
                className="w-full py-3.5 px-6 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90 transition-all flex items-center justify-center gap-2 shadow-lg shadow-primary/25 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    Continue <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          ) : (
            <form onSubmit={handleStep2} className="space-y-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-secondary/10 text-secondary flex items-center justify-center">
                  <Briefcase className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold">Create your first Workspace</h2>
                  <p className="text-xs text-muted-foreground">
                    Workspaces group your projects, sprints, and teams.
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <label htmlFor="wsName" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Workspace Name
                </label>
                <input
                  id="wsName"
                  type="text"
                  placeholder="e.g. Engineering, Marketing HQ, Product Roadmap"
                  value={wsName}
                  onChange={(e) => setWsName(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-input bg-background/50 focus:bg-background focus:ring-2 focus:ring-primary focus:outline-none text-sm transition-all shadow-sm"
                  required
                  autoFocus
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="wsDesc" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Description (Optional)
                </label>
                <textarea
                  id="wsDesc"
                  rows={2}
                  placeholder="What will your team work on in this workspace?"
                  value={wsDescription}
                  onChange={(e) => setWsDescription(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-input bg-background/50 focus:bg-background focus:ring-2 focus:ring-primary focus:outline-none text-sm transition-all shadow-sm resize-none"
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting || !wsName.trim()}
                className="w-full py-3.5 px-6 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90 transition-all flex items-center justify-center gap-2 shadow-lg shadow-primary/25 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" /> Enter TaskFlow
                  </>
                )}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
