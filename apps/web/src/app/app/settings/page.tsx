'use client'

import React, { useState, useEffect } from 'react'
import { useAuthStore } from '@/stores/auth-store'
import { useOrgStore } from '@/stores/org-store'
import { useWorkspaceStore } from '@/stores/workspace-store'
import {
  Building2,
  Briefcase,
  User,
  ShieldCheck,
  Save,
  Trash2,
  Plus,
  Users,
  Check,
  CheckCircle2,
  Bell,
  Lock,
  KeyRound,
  X,
  Calendar,
  Upload,
  Camera,
  Loader2,
} from 'lucide-react'
import { useSearchParams } from 'next/navigation'
import { CalendarIntegrationPanel } from '@/features/calendar/components/CalendarIntegrationPanel'

export default function SettingsPage() {
  const searchParams = useSearchParams()
  const { user, updateUserAvatar } = useAuthStore()
  const { currentOrg, setCurrentOrg, updateOrg } = useOrgStore()
  const { currentWorkspace, setCurrentWorkspace, teams } = useWorkspaceStore()

  const isOrgAdminOrOwner =
    !currentOrg ||
    currentOrg?.ownerId === user?.id ||
    (currentOrg as any)?.role === 'OWNER' ||
    (currentOrg as any)?.role === 'ADMIN' ||
    (currentOrg as any)?.isOwner === true

  const [activeTab, setActiveTab] = useState<'profile' | 'organization' | 'workspace' | 'teams' | 'security' | 'calendar'>('profile')

  useEffect(() => {
    const tab = searchParams.get('tab')
    if (tab === 'calendar') {
      setActiveTab('calendar')
    } else if (tab === 'security' && isOrgAdminOrOwner) {
      setActiveTab('security')
    }
  }, [searchParams, isOrgAdminOrOwner])

  useEffect(() => {
    if (!isOrgAdminOrOwner && activeTab === 'security') {
      setActiveTab('profile')
    }
  }, [isOrgAdminOrOwner, activeTab])

  // Profile state
  const [firstName, setFirstName] = useState(user?.firstName || 'Admin')
  const [lastName, setLastName] = useState(user?.lastName || 'User')
  const [jobTitle, setJobTitle] = useState('Chief System Architect')
  const [timezone, setTimezone] = useState('UTC (GMT+0:00)')
  const [avatarPreview, setAvatarPreview] = useState<string | null>(user?.avatarUrl || null)
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false)

  useEffect(() => {
    if (user?.avatarUrl) {
      setAvatarPreview(user.avatarUrl)
    }
    if (user?.firstName) setFirstName(user.firstName)
    if (user?.lastName) setLastName(user.lastName)
  }, [user])

  // Org state
  const [orgName, setOrgName] = useState(currentOrg?.name || '')
  const [orgLogoPreview, setOrgLogoPreview] = useState<string | null>(currentOrg?.logoUrl || null)
  const [isUploadingOrgLogo, setIsUploadingOrgLogo] = useState(false)

  // Workspace state
  const [wsName, setWsName] = useState(currentWorkspace?.name || '')
  const [wsColor, setWsColor] = useState(currentWorkspace?.color || '#6366F1')

  // Sync with store when currentOrg or currentWorkspace loads
  React.useEffect(() => {
    if (currentOrg?.name) setOrgName(currentOrg.name)
    if (currentOrg?.logoUrl) setOrgLogoPreview(currentOrg.logoUrl)
  }, [currentOrg?.name, currentOrg?.logoUrl])

  React.useEffect(() => {
    if (currentWorkspace?.name) setWsName(currentWorkspace.name)
    if (currentWorkspace?.color) setWsColor(currentWorkspace.color)
  }, [currentWorkspace?.name, currentWorkspace?.color])

  // Teams state
  const [customTeams, setCustomTeams] = useState([
    { id: '1', name: 'Core Infrastructure', memberCount: 4, color: '#6366F1' },
    { id: '2', name: 'Design & Frontend Guild', memberCount: 3, color: '#EC4899' },
    { id: '3', name: 'Product & Growth', memberCount: 2, color: '#8B5CF6' },
  ])
  const [isTeamModalOpen, setIsTeamModalOpen] = useState(false)
  const [newTeamName, setNewTeamName] = useState('')
  const [newTeamColor, setNewTeamColor] = useState('#10B981')

  // Toast
  const [toastMessage, setToastMessage] = useState<string | null>(null)

  const showToast = (msg: string) => {
    setToastMessage(msg)
    setTimeout(() => setToastMessage(null), 3000)
  }

  const handleAvatarFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 2 * 1024 * 1024) {
      showToast('File size must be under 2MB')
      return
    }
    const reader = new FileReader()
    reader.onload = async (event) => {
      const dataUrl = event.target?.result as string
      setAvatarPreview(dataUrl)
      try {
        setIsUploadingAvatar(true)
        await updateUserAvatar(dataUrl)
        showToast('Profile avatar uploaded successfully!')
      } catch (err: any) {
        showToast(err?.message || 'Failed to update avatar')
      } finally {
        setIsUploadingAvatar(false)
      }
    }
    reader.readAsDataURL(file)
  }

  const handleRemoveAvatar = async () => {
    try {
      setIsUploadingAvatar(true)
      await updateUserAvatar('')
      setAvatarPreview(null)
      showToast('Profile avatar removed')
    } catch (err: any) {
      showToast('Failed to remove avatar')
    } finally {
      setIsUploadingAvatar(false)
    }
  }

  const handleOrgLogoFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !currentOrg) return
    if (file.size > 2 * 1024 * 1024) {
      showToast('Logo file size must be under 2MB')
      return
    }
    const reader = new FileReader()
    reader.onload = async (event) => {
      const dataUrl = event.target?.result as string
      setOrgLogoPreview(dataUrl)
      try {
        setIsUploadingOrgLogo(true)
        await updateOrg(currentOrg.id, { logoUrl: dataUrl, name: orgName })
        showToast('Organization logo uploaded successfully!')
      } catch (err: any) {
        showToast(err?.message || 'Failed to update logo')
      } finally {
        setIsUploadingOrgLogo(false)
      }
    }
    reader.readAsDataURL(file)
  }

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const { apiClient } = await import('@/lib/api-client')
      await apiClient.patch('/api/v1/auth/me', {
        firstName,
        lastName,
        displayName: `${firstName} ${lastName}`.trim(),
      })
      useAuthStore.setState((state) => ({
        user: state.user
          ? {
              ...state.user,
              firstName,
              lastName,
              displayName: `${firstName} ${lastName}`.trim(),
            }
          : null,
      }))
      showToast('Profile settings saved successfully!')
    } catch (err: any) {
      showToast(err?.message || 'Failed to update profile')
    }
  }

  const handleSaveOrg = async (e: React.FormEvent) => {
    e.preventDefault()
    if (currentOrg) {
      try {
        await updateOrg(currentOrg.id, { name: orgName })
        showToast('Organization settings updated!')
      } catch (err: any) {
        showToast(err?.message || 'Failed to update organization')
      }
    }
  }

  const handleSaveWorkspace = (e: React.FormEvent) => {
    e.preventDefault()
    if (currentWorkspace) {
      setCurrentWorkspace({ ...currentWorkspace, name: wsName, color: wsColor })
    }
    showToast('Workspace branding updated!')
  }

  const handleCreateTeam = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newTeamName.trim()) return
    setCustomTeams((prev) => [
      ...prev,
      {
        id: Date.now().toString(),
        name: newTeamName.trim(),
        memberCount: 1,
        color: newTeamColor,
      },
    ])
    setNewTeamName('')
    setIsTeamModalOpen(false)
    showToast(`Team '${newTeamName}' created!`)
  }

  const tabs = [
    { id: 'profile', label: 'My Profile', icon: User },
    { id: 'organization', label: 'Organization', icon: Building2 },
    { id: 'workspace', label: 'Workspace', icon: Briefcase },
    { id: 'teams', label: 'Teams & Units', icon: Users },
    { id: 'calendar', label: 'Calendar & Sync', icon: Calendar },
    ...(isOrgAdminOrOwner ? [{ id: 'security', label: 'Security & Keys', icon: ShieldCheck }] : []),
  ]

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-fade-in">
      {toastMessage && (
        <div className="fixed top-6 right-6 z-50 flex items-center gap-2 bg-emerald-600 text-white px-4 py-3 rounded-2xl shadow-xl animate-fade-in text-xs font-semibold">
          <CheckCircle2 className="w-4 h-4" />
          <span>{toastMessage}</span>
        </div>
      )}

      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Settings & Preferences</h1>
        <p className="text-xs text-muted-foreground mt-1">
          Manage your personal account, organization policies, workspace branding, and security credentials.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border/80 gap-6 overflow-x-auto">
        {tabs.map((tab) => {
          const Icon = tab.icon
          const isActive = activeTab === tab.id
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 pb-3 text-xs font-semibold border-b-2 transition-all whitespace-nowrap ${isActive
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          )
        })}
      </div>

      {/* Profile Tab */}
      {activeTab === 'profile' && (
        <form onSubmit={handleSaveProfile} className="space-y-6 max-w-2xl bg-card border border-border/80 p-6 rounded-2xl shadow-sm">
          <div className="flex items-center gap-4">
            <div className="relative group">
              {avatarPreview ? (
                <img
                  src={avatarPreview}
                  alt="Avatar"
                  className="w-16 h-16 rounded-2xl object-cover shadow-md border-2 border-primary/30"
                />
              ) : (
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-primary to-secondary text-white flex items-center justify-center text-xl font-bold shadow-md">
                  {firstName.charAt(0) || 'A'}
                </div>
              )}
              <label
                htmlFor="avatar-upload-input"
                className="absolute inset-0 bg-black/60 rounded-2xl flex flex-col items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer text-[10px] font-bold"
              >
                <Camera className="w-4 h-4 mb-0.5" />
                <span>Change</span>
              </label>
              <input
                id="avatar-upload-input"
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleAvatarFileChange}
              />
            </div>
            <div>
              <h3 className="text-sm font-bold text-foreground">Profile Avatar & Bio</h3>
              <p className="text-xs text-muted-foreground">Personalize your identity across boards, sprint calendar, and member views.</p>
              <div className="flex items-center gap-2 mt-2">
                <label
                  htmlFor="avatar-upload-input"
                  className="px-2.5 py-1 rounded-lg bg-card border border-border text-foreground text-xs font-semibold hover:bg-muted/80 transition-all cursor-pointer inline-flex items-center gap-1.5 shadow-xs"
                >
                  {isUploadingAvatar ? <Loader2 className="w-3 h-3 animate-spin" /> : <Upload className="w-3 h-3" />}
                  <span>Upload Photo</span>
                </label>
                {avatarPreview && (
                  <button
                    type="button"
                    onClick={handleRemoveAvatar}
                    disabled={isUploadingAvatar}
                    className="px-2.5 py-1 rounded-lg bg-card border border-rose-500/30 text-rose-400 text-xs font-semibold hover:bg-rose-500/10 transition-all cursor-pointer inline-flex items-center gap-1 shadow-xs"
                  >
                    <Trash2 className="w-3 h-3" />
                    <span>Remove</span>
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                First Name
              </label>
              <input
                type="text"
                value={firstName}
                onChange={e => setFirstName(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-input bg-background text-xs focus:ring-2 focus:ring-primary focus:outline-none"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Last Name
              </label>
              <input
                type="text"
                value={lastName}
                onChange={e => setLastName(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-input bg-background text-xs focus:ring-2 focus:ring-primary focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Job Title
              </label>
              <input
                type="text"
                value={jobTitle}
                onChange={e => setJobTitle(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-input bg-background text-xs focus:ring-2 focus:ring-primary focus:outline-none"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Timezone
              </label>
              <input
                type="text"
                value={timezone}
                onChange={e => setTimezone(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-input bg-background text-xs focus:ring-2 focus:ring-primary focus:outline-none"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Email Address
            </label>
            <input
              type="email"
              disabled
              value={user?.email || 'admin@taskflow.dev'}
              className="w-full px-3 py-2 rounded-xl border border-input bg-muted text-muted-foreground text-xs cursor-not-allowed"
            />
          </div>

          <div className="pt-4 flex justify-end border-t border-border">
            <button
              type="submit"
              className="px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-all flex items-center gap-2 shadow-sm shadow-primary/20 active:scale-95"
            >
              <Save className="w-3.5 h-3.5" /> Save Changes
            </button>
          </div>
        </form>
      )}

      {/* Organization Tab */}
      {activeTab === 'organization' && (
        <form onSubmit={handleSaveOrg} className="space-y-6 max-w-2xl bg-card/70 backdrop-blur-xl border border-border/80 p-7 rounded-3xl shadow-xl animate-fade-in">
          <div className="flex items-center justify-between gap-4 pb-5 border-b border-border/60">
            <div className="flex items-center gap-3.5">
              <div className="relative group shrink-0">
                {orgLogoPreview ? (
                  <img
                    src={orgLogoPreview}
                    alt="Org Logo"
                    className="w-14 h-14 rounded-2xl object-cover shadow-md border-2 border-primary/30"
                  />
                ) : (
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-primary to-indigo-500 text-white flex items-center justify-center shadow-md shadow-primary/25 font-bold text-lg">
                    {currentOrg?.name?.charAt(0)?.toUpperCase() || <Building2 className="w-6 h-6" />}
                  </div>
                )}
                <label
                  htmlFor="org-logo-upload-input"
                  className="absolute inset-0 bg-black/60 rounded-2xl flex flex-col items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer text-[9px] font-bold"
                >
                  <Camera className="w-4 h-4 mb-0.5" />
                  <span>Change</span>
                </label>
                <input
                  id="org-logo-upload-input"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleOrgLogoFileChange}
                />
              </div>
              <div>
                <h3 className="text-base font-bold text-foreground tracking-tight">Organization Profile & Brand</h3>
                <p className="text-xs text-muted-foreground">Upload organization logo, manage billing plan, and workspace scope.</p>
                <div className="flex items-center gap-2 mt-1.5">
                  <label
                    htmlFor="org-logo-upload-input"
                    className="px-2.5 py-1 rounded-lg bg-card border border-border text-foreground text-[11px] font-semibold hover:bg-muted/80 transition-all cursor-pointer inline-flex items-center gap-1 shadow-xs"
                  >
                    {isUploadingOrgLogo ? <Loader2 className="w-3 h-3 animate-spin" /> : <Upload className="w-3 h-3" />}
                    <span>Upload Logo</span>
                  </label>
                </div>
              </div>
            </div>
            <span className="px-3 py-1 rounded-full text-[11px] font-bold tracking-wider uppercase bg-primary/10 text-primary border border-primary/20 shrink-0">
              {currentOrg?.plan || 'Free'} Plan
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                Organization Name
              </label>
              <input
                type="text"
                value={orgName}
                onChange={e => setOrgName(e.target.value)}
                placeholder="Acme Corporation"
                className="w-full px-3.5 py-2.5 rounded-xl border border-input bg-background/80 text-xs text-foreground focus:ring-2 focus:ring-primary focus:outline-none transition-all shadow-xs"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                Organization Slug
              </label>
              <input
                type="text"
                disabled
                value={currentOrg?.slug || 'my-org'}
                className="w-full px-3.5 py-2.5 rounded-xl border border-input bg-muted/60 text-muted-foreground text-xs font-mono cursor-not-allowed"
              />
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-muted/30 border border-border/50 flex items-center justify-between text-xs text-muted-foreground">
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-primary" />
              <span>Multi-tenant Isolation</span>
            </div>
            <span className="text-[11px] font-medium text-foreground">Active & Secure</span>
          </div>

          <div className="pt-4 flex justify-end border-t border-border/60">
            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-xs font-bold hover:bg-primary/90 transition-all flex items-center gap-2 shadow-md shadow-primary/20 active:scale-98 cursor-pointer"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Save Organization</span>
            </button>
          </div>
        </form>
      )}

      {/* Workspace Tab */}
      {activeTab === 'workspace' && (
        <form onSubmit={handleSaveWorkspace} className="space-y-6 max-w-2xl bg-card/70 backdrop-blur-xl border border-border/80 p-7 rounded-3xl shadow-xl animate-fade-in">
          <div className="flex items-center justify-between gap-4 pb-5 border-b border-border/60">
            <div className="flex items-center gap-3.5">
              <div
                className="w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-md transition-all shrink-0"
                style={{
                  backgroundColor: wsColor,
                  boxShadow: `0 4px 14px ${wsColor}50`,
                }}
              >
                <Briefcase className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-base font-bold text-foreground tracking-tight">Workspace Configuration</h3>
                <p className="text-xs text-muted-foreground">Customise active environment branding, workflows, and theme color.</p>
              </div>
            </div>
            <div
              className="px-3 py-1 rounded-full text-[11px] font-semibold text-foreground border border-border flex items-center gap-1.5 shrink-0"
            >
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: wsColor }} />
              <span>{wsColor}</span>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              Workspace Name
            </label>
            <input
              type="text"
              value={wsName}
              onChange={e => setWsName(e.target.value)}
              placeholder="e.g. Engineering, Marketing, Core"
              className="w-full px-3.5 py-2.5 rounded-xl border border-input bg-background/80 text-xs text-foreground focus:ring-2 focus:ring-primary focus:outline-none transition-all shadow-xs"
            />
          </div>

          <div className="space-y-2.5">
            <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              Workspace Brand Accent Color
            </label>
            <div className="flex flex-wrap items-center gap-3 pt-1">
              {['#6366F1', '#8B5CF6', '#EC4899', '#10B981', '#F59E0B', '#06B6D4', '#3B82F6'].map((c) => {
                const isActive = wsColor.toLowerCase() === c.toLowerCase()
                return (
                  <button
                    type="button"
                    key={c}
                    onClick={() => setWsColor(c)}
                    className={`w-9 h-9 rounded-2xl transition-all duration-200 flex items-center justify-center cursor-pointer ${
                      isActive ? 'scale-110 ring-2 ring-foreground ring-offset-2 ring-offset-background shadow-lg' : 'hover:scale-105 opacity-80 hover:opacity-100'
                    }`}
                    style={{
                      backgroundColor: c,
                      boxShadow: isActive ? `0 4px 12px ${c}60` : undefined,
                    }}
                    title={c}
                  >
                    {isActive && <Check className="w-4 h-4 text-white drop-shadow-sm" />}
                  </button>
                )
              })}
            </div>
          </div>

          <div className="pt-4 flex justify-end border-t border-border/60">
            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-xs font-bold hover:bg-primary/90 transition-all flex items-center gap-2 shadow-md shadow-primary/20 active:scale-98 cursor-pointer"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Save Workspace</span>
            </button>
          </div>
        </form>
      )}

      {/* Teams Tab */}
      {activeTab === 'teams' && (
        <div className="space-y-6 max-w-3xl">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-foreground">Functional Teams & Guilds</h3>
              <p className="text-xs text-muted-foreground">Organize your coworkers into functional units.</p>
            </div>
            <button
              onClick={() => setIsTeamModalOpen(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 shadow-sm shadow-primary/20 active:scale-95 transition-all"
            >
              <Plus className="w-3.5 h-3.5" /> Add Team
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {customTeams.map((team) => (
              <div
                key={team.id}
                className="p-4 rounded-2xl bg-card border border-border/80 shadow-sm flex items-center justify-between hover:border-primary/40 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold"
                    style={{ backgroundColor: team.color }}
                  >
                    <Users className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-foreground">{team.name}</h4>
                    <p className="text-[11px] text-muted-foreground">{team.memberCount} members</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Interactive Modal: Add Team */}
          {isTeamModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
              <div className="bg-card border border-border rounded-2xl p-6 w-full max-w-md shadow-2xl space-y-4 animate-scale-in">
                <div className="flex items-center justify-between pb-3 border-b border-border">
                  <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                    <Users className="w-4 h-4 text-primary" /> Create New Team
                  </h3>
                  <button
                    onClick={() => setIsTeamModalOpen(false)}
                    className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <form onSubmit={handleCreateTeam} className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-foreground">Team Name</label>
                    <input
                      type="text"
                      placeholder="e.g. Mobile Engineering"
                      value={newTeamName}
                      onChange={e => setNewTeamName(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-background border border-border text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                      autoFocus
                      required
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-foreground">Color</label>
                    <div className="flex items-center gap-3">
                      {['#6366F1', '#8B5CF6', '#EC4899', '#10B981', '#F59E0B', '#3B82F6'].map((c) => (
                        <button
                          type="button"
                          key={c}
                          onClick={() => setNewTeamColor(c)}
                          className={`w-7 h-7 rounded-xl transition-transform ${newTeamColor === c ? 'scale-125 ring-2 ring-foreground' : 'hover:scale-110'
                            }`}
                          style={{ backgroundColor: c }}
                        />
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
                    <button
                      type="button"
                      onClick={() => setIsTeamModalOpen(false)}
                      className="px-3 py-2 rounded-xl text-xs font-semibold text-muted-foreground hover:bg-accent transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-all shadow-md shadow-primary/20"
                    >
                      Create Team
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Security Tab */}
      {activeTab === 'security' && (
        <div className="space-y-6 max-w-2xl bg-card border border-border/80 p-6 rounded-2xl shadow-sm">
          <div>
            <h3 className="text-base font-bold text-foreground">Security & API Tokens</h3>
            <p className="text-xs text-muted-foreground">Manage your JWT authentication sessions and security keys.</p>
          </div>

          <div className="p-4 rounded-xl bg-muted/50 border border-border space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-bold text-foreground">
                <KeyRound className="w-4 h-4 text-primary" /> API Access Key
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 font-semibold">Active</span>
            </div>
            <div className="font-mono text-[11px] bg-background p-2 rounded-lg border border-border text-muted-foreground truncate">
              tf_live_9a4b37cd16b1347519a2e7cb68377d328
            </div>
          </div>

          <div className="pt-4 flex justify-end border-t border-border">
            <button
              onClick={() => showToast('API Token regenerated!')}
              className="px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-all active:scale-95"
            >
              Rotate Key
            </button>
          </div>
        </div>
      )}

      {/* Calendar Tab */}
      {activeTab === 'calendar' && (
        <div className="max-w-4xl space-y-6">
          <CalendarIntegrationPanel onSuccess={showToast} />
        </div>
      )}
    </div>
  )
}
