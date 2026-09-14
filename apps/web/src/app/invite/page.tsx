'use client'

import React, { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import {
  FolderKanban,
  Building2,
  Layers,
  User,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Lock,
  Mail,
  Zap,
} from 'lucide-react'
import { apiClient } from '@/lib/api-client'
import { supabase } from '@/lib/supabase/client'
import { useAuthStore } from '@/stores/auth-store'
import { useOrgStore } from '@/stores/org-store'
import { useWorkspaceStore } from '@/stores/workspace-store'

interface InvitationData {
  id: string
  projectId: string
  workspaceId: string
  organizationId: string
  email: string
  projectName: string
  workspaceName: string
  orgName: string
  inviterName: string
  status: string
  role: string
  token: string
  expiresAt: string
}

function InviteContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get('token')
  const autoAccept = searchParams.get('auto_accept') === 'true'

  const { user, isAuthenticated, login, register } = useAuthStore()
  const { setCurrentOrg } = useOrgStore()
  const { setCurrentWorkspace } = useWorkspaceStore()

  const [invitation, setInvitation] = useState<InvitationData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [accepting, setAccepting] = useState(false)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  // Auth tab: 'register' | 'login'
  const [authMode, setAuthMode] = useState<'register' | 'login'>('register')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [authEmail, setAuthEmail] = useState('')
  const [password, setPassword] = useState('')
  const [authSubmitting, setAuthSubmitting] = useState(false)
  const [authError, setAuthError] = useState<string | null>(null)
  const [isGoogleLoading, setIsGoogleLoading] = useState(false)

  const handleGoogleAuth = (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault()
      e.stopPropagation()
    }
    if (isGoogleLoading) return

    try {
      setIsGoogleLoading(true)
      setAuthError(null)

      if (token && typeof window !== 'undefined') {
        localStorage.setItem('tf_invite_token', token)
        localStorage.setItem('tf_auth_mode', authMode === 'register' ? 'signup' : 'signin')
      }

      const redirectOrigin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000'
      const mode = authMode === 'register' ? 'signup' : 'signin'

      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://dxrcfczdfstnymbeicmq.supabase.co'
      const callbackUrl = `${redirectOrigin}/auth/callback?mode=${mode}&invite_token=${encodeURIComponent(token || '')}`

      // Instant 0ms browser navigation - direct to Supabase OAuth authorizer
      const authUrl = new URL(`${supabaseUrl}/auth/v1/authorize`)
      authUrl.searchParams.set('provider', 'google')
      authUrl.searchParams.set('redirect_to', callbackUrl)
      authUrl.searchParams.set('access_type', 'offline')
      authUrl.searchParams.set('prompt', 'consent')
      if (authEmail && authEmail.trim()) {
        authUrl.searchParams.set('login_hint', authEmail.trim())
      }

      window.location.assign(authUrl.toString())
    } catch (err: any) {
      setAuthError(err?.message || 'Failed to initiate Google authentication.')
      setIsGoogleLoading(false)
    }
  }

  useEffect(() => {
    if (!token) {
      setError('Invalid or missing invitation link.')
      setLoading(false)
      return
    }

    const fetchInvitation = async () => {
      try {
        const res = await apiClient.get<InvitationData>(`/api/v1/invitations/${token}`)
        setInvitation(res.data)
        if (res.data.email) {
          setAuthEmail(res.data.email)
        }
      } catch (err: any) {
        setError(
          err?.response?.data?.error?.message ||
            err?.response?.data?.message ||
            'This invitation is invalid or has expired.'
        )
      } finally {
        setLoading(false)
      }
    }

    fetchInvitation()
  }, [token])

  const handleAccept = async () => {
    if (!token) return
    setAccepting(true)
    setError(null)

    try {
      const res = await apiClient.post<any>(`/api/v1/invitations/${token}/accept`, {})
      const acceptData = res.data

      // Automatic bypass of onboarding: mark completed in localStorage
      if (user?.id) {
        localStorage.setItem(`taskflow_onboarding_completed_${user.id}`, 'true')
      }
      localStorage.setItem('taskflow_onboarding_completed', 'true')

      // Set current organization and workspace so the user immediately lands inside
      if (acceptData.organizationId) {
        setCurrentOrg({
          id: acceptData.organizationId,
          name: acceptData.organizationName || invitation?.orgName || 'Organization',
          slug: '',
          plan: 'PRO',
          ownerId: '',
          createdAt: new Date().toISOString(),
        } as any)
      }
      if (acceptData.workspaceId) {
        setCurrentWorkspace({
          id: acceptData.workspaceId,
          organizationId: acceptData.organizationId,
          name: acceptData.workspaceName || invitation?.workspaceName || 'Workspace',
          slug: '',
          color: '#6366F1',
          icon: 'folder',
          createdAt: new Date().toISOString(),
        } as any)
      }

      setSuccessMessage(`Welcome to ${acceptData.projectName || invitation?.projectName}! Redirecting...`)
      setTimeout(() => {
        router.push(acceptData.projectId ? `/app/projects/${acceptData.projectId}` : '/app/tasks')
      }, 1200)
    } catch (err: any) {
      setError(
        err?.response?.data?.error?.message ||
          err?.response?.data?.message ||
          'Failed to accept invitation. Please try again.'
      )
    } finally {
      setAccepting(false)
    }
  }

  // Handle automatic acceptance if redirected from Google OAuth callback
  useEffect(() => {
    if (isAuthenticated && autoAccept && token && !accepting && !successMessage) {
      handleAccept()
    }
  }, [isAuthenticated, autoAccept, token])

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setAuthSubmitting(true)
    setAuthError(null)

    try {
      if (authMode === 'register') {
        // Register user account
        await register({
          firstName: firstName.trim() || 'Team',
          lastName: lastName.trim() || 'Member',
          email: authEmail.trim().toLowerCase(),
          password,
        })
        // Attempt automatic login after registration
        try {
          await login(authEmail.trim().toLowerCase(), password)
        } catch {
          // If requires verification or auto login failed, let user sign in
        }
      } else {
        // Login existing user
        await login(authEmail.trim().toLowerCase(), password)
      }

      // Once authenticated, accept invitation immediately
      if (token) {
        const res = await apiClient.post<any>(`/api/v1/invitations/${token}/accept`, {})
        const acceptData = res.data

        const currentUser = useAuthStore.getState().user
        if (currentUser?.id) {
          localStorage.setItem(`taskflow_onboarding_completed_${currentUser.id}`, 'true')
        }
        localStorage.setItem('taskflow_onboarding_completed', 'true')

        if (acceptData.organizationId) {
          setCurrentOrg({
            id: acceptData.organizationId,
            name: acceptData.organizationName || invitation?.orgName || 'Organization',
            slug: '',
            plan: 'PRO',
            ownerId: '',
            createdAt: new Date().toISOString(),
          } as any)
        }
        if (acceptData.workspaceId) {
          setCurrentWorkspace({
            id: acceptData.workspaceId,
            organizationId: acceptData.organizationId,
            name: acceptData.workspaceName || invitation?.workspaceName || 'Workspace',
            slug: '',
            color: '#6366F1',
            icon: 'folder',
            createdAt: new Date().toISOString(),
          } as any)
        }

        setSuccessMessage(`Account setup complete! Redirecting to ${acceptData.projectName || 'project'}...`)
        setTimeout(() => {
          router.push(acceptData.projectId ? `/app/projects/${acceptData.projectId}` : '/app/tasks')
        }, 1200)
      }
    } catch (err: any) {
      setAuthError(
        err?.response?.data?.error?.message ||
          err?.response?.data?.message ||
          err?.message ||
          'Authentication failed. Please check your credentials.'
      )
    } finally {
      setAuthSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0c0817] flex flex-col items-center justify-center p-4">
        <Loader2 className="w-8 h-8 text-primary animate-spin mb-4" />
        <p className="text-xs text-white/60 font-medium">Validating invitation link...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0c0817] text-white flex flex-col items-center justify-center p-4 sm:p-6 relative overflow-hidden">
      {/* Background ambient lighting */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-primary/20 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-lg rounded-3xl bg-[#161129]/95 border border-white/10 shadow-2xl p-6 sm:p-8 space-y-6 relative z-10 backdrop-blur-xl animate-fade-in">
        {/* Brand Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/10">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-primary to-indigo-500 flex items-center justify-center text-white shadow-md shadow-primary/30">
              <Zap className="w-4 h-4 fill-white" />
            </div>
            <span className="text-lg font-black tracking-tight text-white">TaskFlow</span>
          </div>

          <span className="text-[11px] font-bold px-3 py-1 rounded-full bg-primary/15 border border-primary/30 text-primary uppercase tracking-wider">
            Project Invite
          </span>
        </div>

        {error && (
          <div className="p-4 rounded-2xl bg-destructive/15 border border-destructive/30 text-destructive text-xs space-y-1">
            <div className="flex items-center gap-2 font-bold">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>Invitation Unavailable</span>
            </div>
            <p className="text-white/70 pl-6">{error}</p>
          </div>
        )}

        {successMessage && (
          <div className="p-4 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs flex items-center gap-2 font-bold animate-fade-in">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}

        {invitation && (
          <div className="space-y-5">
            {/* Invitation Details Summary */}
            <div className="space-y-2">
              <p className="text-xs text-white/60">You have been invited by</p>
              <h2 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">
                {invitation.inviterName}
              </h2>
              <p className="text-xs text-white/75 leading-relaxed">
                Join and collaborate on <strong>{invitation.projectName}</strong>. The organization and workspace will be automatically connected to your account.
              </p>
            </div>

            {/* Target Details Card */}
            <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-2.5 text-xs">
              <div className="flex items-center justify-between py-1 border-b border-white/5">
                <span className="text-white/50 flex items-center gap-1.5">
                  <FolderKanban className="w-3.5 h-3.5 text-primary" /> Project
                </span>
                <span className="font-bold text-white">{invitation.projectName}</span>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-white/5">
                <span className="text-white/50 flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-purple-400" /> Workspace
                </span>
                <span className="font-semibold text-white/90">{invitation.workspaceName}</span>
              </div>
              <div className="flex items-center justify-between py-1">
                <span className="text-white/50 flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5 text-emerald-400" /> Organization
                </span>
                <span className="font-semibold text-white/90">{invitation.orgName}</span>
              </div>
            </div>

            {/* Flow 1: Already Logged In */}
            {isAuthenticated ? (
              <div className="space-y-4 pt-2">
                <div className="p-3 rounded-xl bg-white/5 border border-white/10 text-xs text-white/70 flex items-center justify-between">
                  <span>Signed in as: <strong className="text-white">{user?.email}</strong></span>
                  <button
                    onClick={() => useAuthStore.getState().logout()}
                    className="text-[11px] text-primary hover:underline font-medium"
                  >
                    Switch account
                  </button>
                </div>

                <button
                  onClick={handleAccept}
                  disabled={accepting || !!successMessage}
                  className="w-full h-12 rounded-2xl bg-primary text-primary-foreground font-bold text-xs hover:bg-primary/90 disabled:opacity-50 transition-all flex items-center justify-center gap-2 shadow-lg shadow-primary/25 cursor-pointer active:scale-98"
                >
                  {accepting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Connecting Project &amp; Workspaces...
                    </>
                  ) : (
                    <>
                      Accept Invitation &amp; Open Project <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            ) : (
              /* Flow 2: Not Logged In -> Clean Signup / Signin Tab */
              <div className="space-y-4 pt-2">
                <div className="flex rounded-2xl bg-white/5 p-1 border border-white/10 text-xs">
                  <button
                    type="button"
                    onClick={() => setAuthMode('register')}
                    className={`flex-1 py-2 rounded-xl font-bold transition-all text-center ${
                      authMode === 'register'
                        ? 'bg-primary text-white shadow-sm shadow-primary/30'
                        : 'text-white/60 hover:text-white'
                    }`}
                  >
                    Create Account &amp; Join
                  </button>
                  <button
                    type="button"
                    onClick={() => setAuthMode('login')}
                    className={`flex-1 py-2 rounded-xl font-bold transition-all text-center ${
                      authMode === 'login'
                        ? 'bg-primary text-white shadow-sm shadow-primary/30'
                        : 'text-white/60 hover:text-white'
                    }`}
                  >
                    Sign In to Existing
                  </button>
                </div>

                {authError && (
                  <div className="p-3 rounded-xl bg-destructive/15 border border-destructive/30 text-destructive text-xs font-medium">
                    {authError}
                  </div>
                )}

                {/* Social Auth: Google Button for Creation & Sign In */}
                <div className="space-y-3 pt-1">
                  <button
                    type="button"
                    onClick={handleGoogleAuth}
                    disabled={isGoogleLoading || !!successMessage}
                    className="w-full h-11 rounded-2xl border border-white/15 bg-white/5 hover:bg-white/10 text-white font-bold text-xs transition-all flex items-center justify-center gap-2.5 shadow-md hover:shadow-lg cursor-pointer active:scale-98 disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {isGoogleLoading ? (
                      <Loader2 className="w-4 h-4 animate-spin text-white/70" />
                    ) : (
                      <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                        <path
                          fill="#4285F4"
                          d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                        />
                        <path
                          fill="#34A853"
                          d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                        />
                        <path
                          fill="#FBBC05"
                          d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                        />
                        <path
                          fill="#EA4335"
                          d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                        />
                      </svg>
                    )}
                    <span>
                      {isGoogleLoading
                        ? 'Connecting to Google...'
                        : authMode === 'register'
                        ? 'Sign up with Google & Join'
                        : 'Sign in with Google & Join'}
                    </span>
                  </button>

                  <div className="relative my-2">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-white/10" />
                    </div>
                    <div className="relative flex justify-center text-[10px] uppercase">
                      <span className="bg-[#161129] px-3 text-white/40 font-semibold tracking-wider">
                        Or continue with email
                      </span>
                    </div>
                  </div>
                </div>

                <form onSubmit={handleAuthSubmit} className="space-y-3">
                  {authMode === 'register' && (
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <label className="text-[11px] font-semibold text-white/80">First Name</label>
                        <input
                          type="text"
                          required
                          value={firstName}
                          onChange={(e) => setFirstName(e.target.value)}
                          placeholder="Jane"
                          className="w-full h-10 rounded-xl bg-white/5 border border-white/10 px-3 text-xs text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-primary"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[11px] font-semibold text-white/80">Last Name</label>
                        <input
                          type="text"
                          required
                          value={lastName}
                          onChange={(e) => setLastName(e.target.value)}
                          placeholder="Doe"
                          className="w-full h-10 rounded-xl bg-white/5 border border-white/10 px-3 text-xs text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-primary"
                        />
                      </div>
                    </div>
                  )}

                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-white/80">Email Address</label>
                    <div className="relative">
                      <Mail className="w-3.5 h-3.5 text-white/40 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="email"
                        required
                        value={authEmail}
                        onChange={(e) => setAuthEmail(e.target.value)}
                        placeholder="you@company.com"
                        className="w-full h-10 rounded-xl bg-white/5 border border-white/10 pl-9 pr-3 text-xs text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-white/80">Password</label>
                    <div className="relative">
                      <Lock className="w-3.5 h-3.5 text-white/40 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="password"
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full h-10 rounded-xl bg-white/5 border border-white/10 pl-9 pr-3 text-xs text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                    </div>
                  </div>

                  <p className="text-[11px] text-white/50 leading-tight pt-1">
                    By accepting this invite, your account will be automatically associated with <strong>{invitation.orgName}</strong> and <strong>{invitation.workspaceName}</strong>.
                  </p>

                  <button
                    type="submit"
                    disabled={authSubmitting || !!successMessage}
                    className="w-full h-11 rounded-2xl bg-primary text-primary-foreground font-bold text-xs hover:bg-primary/90 disabled:opacity-50 transition-all flex items-center justify-center gap-2 shadow-lg shadow-primary/25 cursor-pointer active:scale-98 mt-2"
                  >
                    {authSubmitting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Setting up account &amp; project...
                      </>
                    ) : (
                      <>
                        {authMode === 'register' ? 'Create Account & Join Project' : 'Sign In & Join Project'}
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </form>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default function InvitePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#0c0817] flex items-center justify-center">
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
        </div>
      }
    >
      <InviteContent />
    </Suspense>
  )
}
