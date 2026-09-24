'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/stores/auth-store'
import { useOrgStore } from '@/stores/org-store'
import { useWorkspaceStore } from '@/stores/workspace-store'
import { apiClient } from '@/lib/api-client'
import {
  Zap,
  Building2,
  Briefcase,
  ArrowRight,
  ArrowLeft,
  Check,
  Loader2,
  Sparkles,
  Layers,
  FolderKanban,
  CheckCircle2,
  Ticket,
  KeyRound,
  Users,
} from 'lucide-react'

interface OnboardingWizardModalProps {
  onComplete?: () => void
}

const PRESET_WORKSPACE_COLORS = [
  { value: '#6366F1', label: 'Indigo' },
  { value: '#8B5CF6', label: 'Purple' },
  { value: '#EC4899', label: 'Pink' },
  { value: '#10B981', label: 'Emerald' },
  { value: '#F59E0B', label: 'Amber' },
  { value: '#06B6D4', label: 'Cyan' },
]

export function OnboardingWizardModal({ onComplete }: OnboardingWizardModalProps) {
  const router = useRouter()
  const { user } = useAuthStore()
  const { createOrganization, setCurrentOrg } = useOrgStore()
  const { fetchWorkspaces, setCurrentWorkspace } = useWorkspaceStore()

  // Navigation mode: 'invite' (enter code or accept pending) | 'create' (create new org & workspace)
  const [mode, setMode] = useState<'invite' | 'create'>('create')
  const [referralCode, setReferralCode] = useState('')
  const [isRedeemingCode, setIsRedeemingCode] = useState(false)
  const [pendingInvites, setPendingInvites] = useState<any[]>([])
  const [isLoadingPending, setIsLoadingPending] = useState(false)
  const [inviteSuccessMessage, setInviteSuccessMessage] = useState<string | null>(null)

  const [step, setStep] = useState<1 | 2>(1)
  const [orgName, setOrgName] = useState('')
  const [workspaceName, setWorkspaceName] = useState('')
  const [workspaceColor, setWorkspaceColor] = useState('#6366F1')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // 1. Fetch pending invites for user's email & pre-fill stored invite token if any
  useEffect(() => {
    let isMounted = true
    const checkPendingInvites = async () => {
      try {
        setIsLoadingPending(true)
        const storedToken = typeof window !== 'undefined' ? localStorage.getItem('tf_invite_token') : null
        const storedReferralCode = typeof window !== 'undefined' ? localStorage.getItem('tf_referral_code') : null
        if (storedReferralCode || storedToken) {
          setMode('invite')
          const codeCandidate = storedReferralCode || storedToken
          if (codeCandidate && (codeCandidate.startsWith('TF-') || codeCandidate.length <= 16)) {
            setReferralCode(codeCandidate)
          }
        }

        const res = await apiClient.get<any[]>('/api/v1/invitations/pending-for-me')
        if (isMounted && res.data && res.data.length > 0) {
          setPendingInvites(res.data)
          // Default to invite mode if there is an active pending invite for this user
          setMode('invite')
        }
      } catch (err) {
        // Silently catch in background
      } finally {
        if (isMounted) setIsLoadingPending(false)
      }
    }
    checkPendingInvites()
    return () => {
      isMounted = false
    }
  }, [])

  // Pre-fill sensible defaults based on user's identity
  useEffect(() => {
    if (user?.firstName) {
      const first = user.firstName.trim()
      setOrgName(`${first}'s Organization`)
      setWorkspaceName(`${first}'s Workspace`)
    } else {
      setOrgName('My Organization')
      setWorkspaceName('Main Workspace')
    }
  }, [user])

  const handleRedeemCode = async (codeToRedeem?: string) => {
    const targetCode = (codeToRedeem || referralCode).trim()
    if (!targetCode) {
      setError('Please enter a referral or invitation code.')
      return
    }

    setIsRedeemingCode(true)
    setError(null)

    try {
      const res = await apiClient.post<any>(`/api/v1/invitations/${encodeURIComponent(targetCode)}/accept`, {})
      const inv = res.data

      if (inv.organizationId) {
        setCurrentOrg({
          id: inv.organizationId,
          name: inv.organizationName || inv.orgName || 'Organization',
          slug: '',
          plan: 'PRO',
          ownerId: '',
          createdAt: new Date().toISOString(),
        } as any)
      }

      if (inv.workspaceId) {
        setCurrentWorkspace({
          id: inv.workspaceId,
          organizationId: inv.organizationId,
          name: inv.workspaceName || 'Workspace',
          slug: '',
          color: '#6366F1',
          icon: 'folder',
          createdAt: new Date().toISOString(),
        } as any)
      }

      if (user?.id) {
        localStorage.setItem(`taskflow_onboarding_completed_${user.id}`, 'true')
      }
      localStorage.setItem('taskflow_onboarding_completed', 'true')
      if (typeof window !== 'undefined') {
        localStorage.removeItem('tf_invite_token')
        localStorage.removeItem('tf_referral_code')
        localStorage.removeItem('taskflow_is_new_user')
      }

      setInviteSuccessMessage(`Success! Joined ${inv.projectName || inv.workspaceName || 'Workspace'}! Redirecting...`)

      setTimeout(() => {
        if (inv.projectId) {
          window.location.href = `/app/projects/${inv.projectId}`
        } else {
          window.location.href = '/app/home'
        }
      }, 700)
    } catch (err: any) {
      console.error('Redeem invite error:', err)
      const msg = err?.response?.data?.message || err?.message || 'Invalid or expired invitation code.'
      setError(msg)
    } finally {
      setIsRedeemingCode(false)
    }
  }

  const handleNextStep = (e: React.FormEvent) => {
    e.preventDefault()
    if (!orgName.trim()) {
      setError('Please enter an organization name.')
      return
    }
    setError(null)
    setStep(2)
  }

  const handleFinish = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!orgName.trim() || !workspaceName.trim()) {
      setError('Please provide both organization and workspace names.')
      return
    }

    setIsSubmitting(true)
    setError(null)

    try {
      // 1. Create the new Organization with custom Workspace
      const org = await createOrganization(orgName.trim(), workspaceName.trim(), workspaceColor)
      setCurrentOrg(org)

      // 2. Fetch the created workspace under this Organization
      const workspaces = await fetchWorkspaces(org.id)
      if (workspaces.length > 0) {
        setCurrentWorkspace(workspaces[0])
      }

      // 3. Mark onboarding as completed
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
      console.error('Onboarding setup failed:', err)
      setError(
        err?.response?.data?.error?.message ||
          err?.response?.data?.message ||
          err?.message ||
          'Failed to setup organization and workspace. Please try again.'
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 sm:p-6 animate-fade-in">
      {/* Modal Card */}
      <div className="relative w-full max-w-lg rounded-3xl bg-[#0f1015]/95 border border-white/[0.08] shadow-[0_24px_60px_rgba(0,0,0,0.8)] backdrop-blur-2xl flex flex-col justify-between overflow-hidden">
        
        {/* Subtle Ambient Radial Glow */}
        <div className="absolute -top-12 left-1/3 w-80 h-40 bg-primary/20 rounded-full blur-3xl pointer-events-none" />

        {/* Modal Header */}
        <div className="p-6 sm:p-7 pb-0 z-10 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-primary to-indigo-500 flex items-center justify-center text-white shadow-md shadow-primary/25">
                <Zap className="w-4 h-4 fill-white" />
              </div>
              <span className="text-base font-black tracking-tight text-white">TaskFlow</span>
            </div>

            {/* Stepper Pill Indicator (Only shown in create mode) */}
            {mode === 'create' ? (
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/[0.04] border border-white/[0.08] text-[11px] font-medium text-white/70">
                <span className="flex items-center gap-1.5">
                  <span className={`w-2 h-2 rounded-full transition-all ${step === 1 ? 'bg-primary ring-2 ring-primary/30' : 'bg-emerald-500'}`} />
                  <span className="text-white font-semibold">{step}</span> of 2
                </span>
                <span className="text-white/30">•</span>
                <span className="text-primary font-semibold">
                  {step === 1 ? 'Organization' : 'Workspace'}
                </span>
              </div>
            ) : (
              <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/25 text-[11px] font-semibold text-primary">
                <Ticket className="w-3.5 h-3.5" />
                <span>Join Existing Team</span>
              </div>
            )}
          </div>

          {/* Mode Switcher Tabs: Enter Code vs Create Organization */}
          <div className="grid grid-cols-2 p-1 rounded-2xl bg-white/[0.04] border border-white/[0.08]">
            <button
              type="button"
              onClick={() => {
                setMode('invite')
                setError(null)
              }}
              className={`py-2 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                mode === 'invite'
                  ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/20'
                  : 'text-white/60 hover:text-white hover:bg-white/[0.04]'
              }`}
            >
              <Ticket className="w-3.5 h-3.5" />
              <span>Invitation Code</span>
              {pendingInvites.length > 0 && (
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              )}
            </button>

            <button
              type="button"
              onClick={() => {
                setMode('create')
                setError(null)
              }}
              className={`py-2 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                mode === 'create'
                  ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/20'
                  : 'text-white/60 hover:text-white hover:bg-white/[0.04]'
              }`}
            >
              <Building2 className="w-3.5 h-3.5" />
              <span>Create New Org</span>
            </button>
          </div>

          {/* Stepper Progress Line for Create Mode */}
          {mode === 'create' && (
            <div className="w-full h-1 rounded-full bg-white/[0.06] overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-primary to-indigo-500 transition-all duration-300 ease-out"
                style={{ width: step === 1 ? '50%' : '100%' }}
              />
            </div>
          )}
        </div>

        {/* Modal Body */}
        <div className="p-6 sm:p-7 z-10">

          {/* INVITATION / REFERRAL CODE MODE */}
          {mode === 'invite' && (
            <div className="space-y-5 animate-scale-in">
              <div className="space-y-1.5">
                <h1 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">
                  Enter your Invitation Code
                </h1>
                <p className="text-xs text-white/60 leading-relaxed">
                  Enter the unique referral or invitation code sent to your email to automatically join your team's workspace and project.
                </p>
              </div>

              {/* Pending Invites Auto-Detection Card */}
              {pendingInvites.length > 0 && (
                <div className="space-y-2">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Invitations Found for Your Email</span>
                  </div>
                  {pendingInvites.map((inv) => (
                    <div
                      key={inv.id}
                      className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-between gap-3 shadow-lg shadow-emerald-950/20"
                    >
                      <div className="space-y-1 min-w-0">
                        <div className="text-xs font-bold text-white flex items-center gap-1.5 truncate">
                          <FolderKanban className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                          <span className="truncate">{inv.projectName || 'Project'}</span>
                        </div>
                        <div className="text-[11px] text-white/60 flex items-center gap-1.5 truncate">
                          <span>{inv.workspaceName || 'Workspace'}</span>
                          <span>•</span>
                          <span className="font-mono text-emerald-300/80">{inv.referralCode || 'Invite'}</span>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleRedeemCode(inv.referralCode || inv.token || inv.id)}
                        disabled={isRedeemingCode}
                        className="px-3.5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold text-xs shrink-0 transition-all flex items-center gap-1.5 shadow-md shadow-emerald-500/20 cursor-pointer disabled:opacity-50 active:scale-[0.98]"
                      >
                        {isRedeemingCode ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <>
                            <span>Accept &amp; Join</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </>
                        )}
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Code Input Form */}
              <form
                onSubmit={(e) => {
                  e.preventDefault()
                  handleRedeemCode()
                }}
                className="space-y-4"
              >
                <div className="space-y-1.5">
                  <label htmlFor="refCode" className="text-xs font-semibold text-white/90 flex items-center justify-between">
                    <span>Referral / Invitation Code</span>
                    <span className="text-[10px] text-white/40 font-mono">e.g. TF-XXXX-XXXX</span>
                  </label>
                  <div className="relative">
                    <KeyRound className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                    <input
                      id="refCode"
                      type="text"
                      value={referralCode}
                      onChange={(e) => {
                        setReferralCode(e.target.value.toUpperCase())
                        setError(null)
                      }}
                      placeholder="TF-XXXX-XXXX"
                      className="w-full h-11 rounded-xl bg-white/[0.04] border border-white/10 hover:border-white/20 focus:border-primary focus:ring-2 focus:ring-primary/20 pl-10 pr-3.5 text-xs font-mono font-bold text-white placeholder:text-white/20 tracking-wider transition-all outline-none"
                      autoFocus
                    />
                  </div>
                </div>

                {inviteSuccessMessage && (
                  <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium flex items-center gap-2 animate-fade-in">
                    <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                    <span>{inviteSuccessMessage}</span>
                  </div>
                )}

                {error && (
                  <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-medium animate-fade-in">
                    {error}
                  </div>
                )}

                <div className="pt-1">
                  <button
                    type="submit"
                    disabled={isRedeemingCode || !referralCode.trim()}
                    className="w-full h-11 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs shadow-md shadow-blue-500/20 disabled:opacity-50 transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-[0.99]"
                  >
                    {isRedeemingCode ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Validating Code...</span>
                      </>
                    ) : (
                      <>
                        <span>Validate &amp; Join Team</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </div>
              </form>

              {/* Helper footnote */}
              <div className="pt-2 text-center">
                <button
                  type="button"
                  onClick={() => {
                    setMode('create')
                    setError(null)
                  }}
                  className="text-xs text-white/50 hover:text-white transition-colors cursor-pointer"
                >
                  Don't have an invitation code? <span className="text-primary font-semibold underline underline-offset-2">Create a new Organization</span>
                </button>
              </div>
            </div>
          )}

          {/* STEP 1: CREATE ORGANIZATION */}
          {mode === 'create' && step === 1 && (
            <form onSubmit={handleNextStep} className="space-y-5 animate-scale-in">
              <div className="space-y-1.5">
                <h1 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">
                  Name your Organization
                </h1>
                <p className="text-xs text-white/60 leading-relaxed">
                  Organizations represent your company, agency, or team entity. Workspaces live inside your organization.
                </p>
              </div>

              {/* Minimal Architecture Structure Preview Card */}
              <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/[0.06] space-y-2.5">
                <div className="flex items-center justify-between text-[11px] font-semibold text-white/70">
                  <span className="flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5 text-primary" />
                    <span>Hierarchy Overview</span>
                  </span>
                  <span className="text-[10px] text-white/40 font-mono">2-Tier Setup</span>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-1">
                  <div className="p-2.5 rounded-xl bg-primary/10 border border-primary/20 space-y-0.5">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-primary">Parent Entity</div>
                    <div className="text-xs font-semibold text-white truncate">{orgName || 'Organization'}</div>
                  </div>
                  <div className="p-2.5 rounded-xl bg-white/[0.04] border border-white/[0.06] space-y-0.5">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-white/50">Next Step</div>
                    <div className="text-xs font-semibold text-white/80 truncate">Workspace & Projects</div>
                  </div>
                </div>
              </div>

              {/* Input Field */}
              <div className="space-y-1.5">
                <label htmlFor="orgName" className="text-xs font-semibold text-white/90 flex items-center justify-between">
                  <span>Organization Name</span>
                  <span className="text-[10px] text-white/40 font-normal">e.g. Acme Corp or Studio Labs</span>
                </label>
                <div className="relative">
                  <input
                    id="orgName"
                    type="text"
                    value={orgName}
                    onChange={(e) => setOrgName(e.target.value)}
                    placeholder="e.g. Acme Corporation"
                    className="w-full h-11 rounded-xl bg-white/[0.04] border border-white/10 hover:border-white/20 focus:border-primary focus:ring-2 focus:ring-primary/20 px-3.5 text-xs font-medium text-white placeholder:text-white/30 transition-all outline-none"
                    autoFocus
                    required
                  />
                </div>
              </div>

              {error && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-medium animate-fade-in">
                  {error}
                </div>
              )}

              {/* Submit Action */}
              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full h-11 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs shadow-md shadow-blue-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-[0.99]"
                >
                  <span>Continue to Workspace Setup</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </form>
          )}

          {/* STEP 2: CREATE WORKSPACE */}
          {mode === 'create' && step === 2 && (
            <form onSubmit={handleFinish} className="space-y-5 animate-scale-in">
              <div className="space-y-1.5">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-primary/10 text-primary text-[11px] font-medium border border-primary/20 mb-1">
                  <Building2 className="w-3 h-3" />
                  <span>In: <strong className="font-semibold text-white">{orgName}</strong></span>
                </div>
                <h1 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">
                  Create your first Workspace
                </h1>
                <p className="text-xs text-white/60 leading-relaxed">
                  Workspaces contain your projects, tasks, sprints, and team members within {orgName}.
                </p>
              </div>

              {/* Workspace Input */}
              <div className="space-y-1.5">
                <label htmlFor="wsName" className="text-xs font-semibold text-white/90 flex items-center justify-between">
                  <span>Workspace Name</span>
                  <span className="text-[10px] text-white/40 font-normal">e.g. Core App, Operations, Sprints</span>
                </label>
                <div className="relative">
                  <input
                    id="wsName"
                    type="text"
                    value={workspaceName}
                    onChange={(e) => setWorkspaceName(e.target.value)}
                    placeholder="e.g. Main Workspace"
                    className="w-full h-11 rounded-xl bg-white/[0.04] border border-white/10 hover:border-white/20 focus:border-primary focus:ring-2 focus:ring-primary/20 px-3.5 text-xs font-medium text-white placeholder:text-white/30 transition-all outline-none"
                    autoFocus
                    required
                  />
                </div>
              </div>

              {/* Workspace Brand Accent Color Picker */}
              <div className="space-y-2 pt-0.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-white/90">Workspace Brand Color</span>
                  <span
                    className="text-[10px] font-semibold px-2 py-0.5 rounded-full border border-white/10 flex items-center gap-1.5"
                    style={{ color: workspaceColor }}
                  >
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: workspaceColor }} />
                    <span>{PRESET_WORKSPACE_COLORS.find(c => c.value === workspaceColor)?.label || 'Custom'}</span>
                  </span>
                </div>
                <div className="flex items-center gap-2.5">
                  {PRESET_WORKSPACE_COLORS.map((c) => {
                    const isSelected = workspaceColor === c.value
                    return (
                      <button
                        key={c.value}
                        type="button"
                        onClick={() => setWorkspaceColor(c.value)}
                        className={`w-8 h-8 rounded-xl transition-all duration-200 flex items-center justify-center cursor-pointer ${
                          isSelected ? 'scale-110 ring-2 ring-white ring-offset-2 ring-offset-[#0f1015] shadow-lg' : 'hover:scale-105 opacity-80 hover:opacity-100'
                        }`}
                        style={{
                          backgroundColor: c.value,
                          boxShadow: isSelected ? `0 2px 10px ${c.value}80` : undefined,
                        }}
                        title={c.label}
                      >
                        {isSelected && <Check className="w-3.5 h-3.5 text-white drop-shadow" />}
                      </button>
                    )
                  })}
                </div>
              </div>

              {error && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-medium animate-fade-in">
                  {error}
                </div>
              )}

              {/* Symmetrical Aligned Actions */}
              <div className="flex items-center gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  disabled={isSubmitting}
                  className="h-11 px-4 rounded-xl border border-white/10 hover:bg-white/[0.06] text-white/70 hover:text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Back</span>
                </button>

                <button
                  type="submit"
                  disabled={isSubmitting || !workspaceName.trim()}
                  className="flex-1 h-11 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs shadow-md shadow-blue-500/20 disabled:opacity-50 transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-[0.99]"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Setting up Workspace...</span>
                    </>
                  ) : (
                    <>
                      <span>Complete Setup &amp; Launch</span>
                      <CheckCircle2 className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
