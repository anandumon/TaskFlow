'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/stores/auth-store'
import { useOrgStore } from '@/stores/org-store'
import { useWorkspaceStore } from '@/stores/workspace-store'
import {
  Zap,
  Building2,
  Briefcase,
  Layers,
  ArrowRight,
  ArrowLeft,
  Check,
  Loader2,
  Sparkles,
  FolderGit2,
  Users,
  Target,
  Rocket,
} from 'lucide-react'

interface OnboardingWizardModalProps {
  onComplete?: () => void
}

const WORKSPACE_TYPES = [
  {
    id: 'product',
    label: 'Product / Software',
    desc: 'Roadmaps, sprints, releases, and feature tracking',
    icon: Rocket,
  },
  {
    id: 'team',
    label: 'Team / Department',
    desc: 'Daily workflows for engineering, marketing, or ops',
    icon: Users,
  },
  {
    id: 'client',
    label: 'Client / Agency Work',
    desc: 'Client deliverables, external projects, and timelines',
    icon: Briefcase,
  },
  {
    id: 'personal',
    label: 'Personal Projects',
    desc: 'Side ventures, everyday tasks, and goal planning',
    icon: Target,
  },
]

export function OnboardingWizardModal({ onComplete }: OnboardingWizardModalProps) {
  const router = useRouter()
  const { user } = useAuthStore()
  const { createOrganization, setCurrentOrg } = useOrgStore()
  const { createWorkspace, setCurrentWorkspace } = useWorkspaceStore()

  // Step 1: Organisation Name -> Step 2: Workspace / Product Name
  const [step, setStep] = useState<1 | 2>(1)
  const [orgName, setOrgName] = useState('')
  const [workspaceName, setWorkspaceName] = useState('')
  const [workspaceType, setWorkspaceType] = useState('product')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Pre-fill sensible defaults based on user's identity
  useEffect(() => {
    if (user?.firstName) {
      setOrgName(`${user.firstName.trim()}'s Organization`)
      setWorkspaceName(`${user.firstName.trim()}'s Workspace`)
    } else {
      setOrgName('My Organization')
      setWorkspaceName('Main Workspace')
    }
  }, [user])

  const handleNextStep = (e: React.FormEvent) => {
    e.preventDefault()
    if (!orgName.trim()) {
      setError('Please enter your organisation name')
      return
    }
    setError(null)
    setStep(2)
  }

  const handleFinish = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!orgName.trim() || !workspaceName.trim()) {
      setError('Please fill in both organisation and workspace names')
      return
    }

    setIsSubmitting(true)
    setError(null)

    try {
      // 1. Create the new Organisation
      const org = await createOrganization(orgName.trim())
      setCurrentOrg(org)

      // 2. Create the first Workspace / Product under this Organisation
      const typeObj = WORKSPACE_TYPES.find((t) => t.id === workspaceType)
      const ws = await createWorkspace(org.id, {
        name: workspaceName.trim(),
        description: typeObj ? `${typeObj.label} • ${typeObj.desc}` : 'Primary workspace',
        color: '#6366f1',
        icon: 'folder',
      })
      setCurrentWorkspace(ws)

      // 3. Mark onboarding as completed for this user
      if (user?.id) {
        localStorage.setItem(`taskflow_onboarding_completed_${user.id}`, 'true')
      }
      localStorage.setItem('taskflow_onboarding_completed', 'true')

      if (onComplete) {
        onComplete()
      } else {
        router.push('/app/home')
      }
    } catch (err: any) {
      console.error('Onboarding creation failed:', err)
      setError(
        err?.response?.data?.error?.message ||
          err?.response?.data?.message ||
          err?.message ||
          'Failed to setup organisation and workspace. Please try again.'
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 sm:p-6 animate-fade-in">
      {/* Modal Card */}
      <div className="relative w-full max-w-xl min-h-[500px] rounded-3xl bg-[#121217]/95 border border-white/10 shadow-2xl shadow-black/80 flex flex-col justify-between overflow-hidden backdrop-blur-2xl">
        
        {/* Subtle Ambient Radial Glow */}
        <div className="absolute -top-10 left-1/4 w-96 h-48 bg-primary/20 rounded-full blur-3xl pointer-events-none" />

        {/* Top Header */}
        <div className="pt-6 px-7 flex items-center justify-between z-10">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-primary to-indigo-500 flex items-center justify-center text-white shadow-md shadow-primary/30">
              <Zap className="w-4 h-4 fill-white" />
            </div>
            <span className="text-lg font-black tracking-tight text-white">TaskFlow</span>
          </div>

          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-[11px] font-semibold text-white/70">
            <span>Step {step} of 2</span>
            <span>&bull;</span>
            <span className="text-primary font-bold">
              {step === 1 ? 'Organisation' : 'Workspace / Product'}
            </span>
          </div>
        </div>

        {/* Form Body */}
        <div className="px-7 py-6 flex-1 flex flex-col justify-center z-10">
          
          {/* STEP 1: CREATE ORGANISATION */}
          {step === 1 && (
            <form onSubmit={handleNextStep} className="space-y-5 animate-scale-in">
              <div className="space-y-1.5">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-primary/10 text-primary text-[11px] font-semibold border border-primary/20">
                  <Building2 className="w-3.5 h-3.5" /> Top-Level Entity
                </div>
                <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                  Name your Organisation
                </h1>
                <p className="text-xs text-white/60 leading-relaxed max-w-lg">
                  An <strong>organisation</strong> represents your overall company, enterprise, or parent team.
                  Inside it, you can create and organize multiple separate <strong>workspaces or products</strong>.
                </p>
              </div>

              {/* Intuitive Architecture Explainer Card */}
              <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 space-y-2 text-xs">
                <div className="text-white/80 font-semibold flex items-center gap-1.5">
                  <Building2 className="w-4 h-4 text-primary" />
                  <span>How TaskFlow is structured:</span>
                </div>
                <div className="space-y-1 pl-5 border-l-2 border-primary/40 font-mono text-[11px] text-white/60">
                  <div className="text-white font-semibold flex items-center gap-1">
                    🏢 {orgName || 'Your Organisation'}
                  </div>
                  <div className="text-white/70 pl-3 flex items-center gap-1">
                    ├── 🚀 Workspace or Product 1 (e.g. Mobile App)
                  </div>
                  <div className="text-white/70 pl-3 flex items-center gap-1">
                    ├── 📦 Workspace or Product 2 (e.g. Web Platform)
                  </div>
                  <div className="text-white/70 pl-3 flex items-center gap-1">
                    └── 📊 Workspace or Product 3 (e.g. Operations)
                  </div>
                </div>
              </div>

              {/* Organisation Name Input */}
              <div className="space-y-1.5">
                <label htmlFor="orgName" className="text-xs font-semibold text-white/90">
                  Organisation Name
                </label>
                <input
                  id="orgName"
                  type="text"
                  value={orgName}
                  onChange={(e) => setOrgName(e.target.value)}
                  placeholder="e.g. Acme Corporation or Anandu Technologies"
                  className="w-full h-12 rounded-2xl bg-white/5 border border-white/15 px-4 text-sm font-semibold text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-primary shadow-inner"
                  autoFocus
                  required
                />
              </div>

              {error && (
                <div className="p-2.5 rounded-xl bg-destructive/15 border border-destructive/30 text-destructive text-xs font-medium">
                  {error}
                </div>
              )}

              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full h-11 rounded-2xl bg-primary text-primary-foreground font-bold text-xs hover:bg-primary/90 transition-all flex items-center justify-center gap-2 shadow-lg shadow-primary/25 cursor-pointer active:scale-98"
                >
                  Continue to Workspace &amp; Product Setup <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </form>
          )}

          {/* STEP 2: CREATE WORKSPACE OR PRODUCT */}
          {step === 2 && (
            <form onSubmit={handleFinish} className="space-y-5 animate-scale-in">
              <div className="space-y-1.5">
                {/* Visual Parent Organisation Badge */}
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/15 border border-primary/25 text-xs font-semibold text-primary">
                  <Building2 className="w-3.5 h-3.5 shrink-0" />
                  <span>Organisation: <strong>{orgName}</strong></span>
                </div>
                <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                  Create your first Workspace or Product
                </h1>
                <p className="text-xs text-white/60 leading-relaxed max-w-lg">
                  Each workspace or product keeps its tasks, boards, docs, and sprints neatly isolated
                  under <strong>{orgName}</strong>. You can add more at any time.
                </p>
              </div>

              {/* Workspace / Product Name Input */}
              <div className="space-y-1.5">
                <label htmlFor="wsName" className="text-xs font-semibold text-white/90">
                  Workspace or Product Name
                </label>
                <input
                  id="wsName"
                  type="text"
                  value={workspaceName}
                  onChange={(e) => setWorkspaceName(e.target.value)}
                  placeholder="e.g. Core SaaS Product, Client Deliverables, Mobile App"
                  className="w-full h-12 rounded-2xl bg-white/5 border border-white/15 px-4 text-sm font-semibold text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-primary shadow-inner"
                  autoFocus
                  required
                />
              </div>

              {/* Workspace Type Selector */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-white/80">
                  Select primary focus / type:
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {WORKSPACE_TYPES.map((type) => {
                    const Icon = type.icon
                    const isSelected = workspaceType === type.id
                    return (
                      <button
                        key={type.id}
                        type="button"
                        onClick={() => setWorkspaceType(type.id)}
                        className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex items-start gap-2.5 ${
                          isSelected
                            ? 'bg-primary/20 border-primary shadow-sm shadow-primary/20 text-white'
                            : 'bg-white/5 hover:bg-white/10 border-white/10 text-white/75'
                        }`}
                      >
                        <div
                          className={`w-7 h-7 rounded-xl flex items-center justify-center shrink-0 ${
                            isSelected ? 'bg-primary text-white' : 'bg-white/10 text-white/70'
                          }`}
                        >
                          <Icon className="w-3.5 h-3.5" />
                        </div>
                        <div className="min-w-0">
                          <div className="text-xs font-bold text-white truncate">{type.label}</div>
                          <div className="text-[11px] text-white/50 leading-tight line-clamp-1">
                            {type.desc}
                          </div>
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>

              {error && (
                <div className="p-2.5 rounded-xl bg-destructive/15 border border-destructive/30 text-destructive text-xs font-medium">
                  {error}
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  disabled={isSubmitting}
                  className="px-4 h-11 rounded-2xl text-xs font-semibold text-white/70 hover:text-white hover:bg-white/5 flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  <ArrowLeft className="w-4 h-4" /> Back
                </button>

                <button
                  type="submit"
                  disabled={isSubmitting || !workspaceName.trim()}
                  className="flex-1 h-11 rounded-2xl bg-primary text-primary-foreground font-bold text-xs hover:bg-primary/90 disabled:opacity-50 transition-all flex items-center justify-center gap-2 shadow-lg shadow-primary/25 cursor-pointer active:scale-98"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Creating Organisation &amp; Workspace...
                    </>
                  ) : (
                    <>
                      Complete Setup &amp; Launch Dashboard <Check className="w-4 h-4 stroke-[2.5]" />
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Bottom Progress Indicator */}
        <div className="px-7 pb-5">
          <div className="w-full h-1.5 rounded-full bg-white/10 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-primary via-indigo-500 to-white transition-all duration-300"
              style={{ width: step === 1 ? '50%' : '100%' }}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
