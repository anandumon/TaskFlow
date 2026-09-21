'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { createPortal } from 'react-dom'
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
  Palette,
  FolderKanban,
  AlertTriangle,
  Pencil,
  ExternalLink,
} from 'lucide-react'
import { useSearchParams } from 'next/navigation'
import { CalendarIntegrationPanel } from '@/features/calendar/components/CalendarIntegrationPanel'
import { ThemeSettingsView } from '@/features/theme/components/ThemeSettingsView'
import { useProjectStore, Project } from '@/stores/project-store'
import { useTaskStore } from '@/stores/task-store'
import { SettingsSkeleton } from '@/components/loading'

export default function SettingsPage() {
  const searchParams = useSearchParams()
  const { user, updateUserAvatar } = useAuthStore()
  const { organizations, currentOrg, setCurrentOrg, updateOrg, deleteOrganization, fetchOrganizations, createOrganization, isLoading: isOrgLoading } = useOrgStore()
  const { workspaces, currentWorkspace, setCurrentWorkspace, updateWorkspace, deleteWorkspace, fetchWorkspaces, teams } = useWorkspaceStore()
  const { projects, loadProjects, createProject, updateProject, deleteProject, isLoading: isProjectsLoading } = useProjectStore()

  const isOrgAdminOrOwner = Boolean(
    currentOrg &&
    (currentOrg.ownerId === user?.id ||
      (currentOrg as any)?.isOwner === true ||
      currentOrg.isAdminOrOwner === true ||
      currentOrg.userRole === 'OWNER' ||
      currentOrg.userRole === 'ADMIN' ||
      (currentOrg as any)?.role === 'OWNER' ||
      (currentOrg as any)?.role === 'ADMIN')
  )

  const [activeTab, setActiveTab] = useState<'profile' | 'appearance' | 'organization' | 'workspace' | 'calendar'>('profile')

  useEffect(() => {
    const tab = searchParams.get('tab')
    if (tab === 'calendar') {
      setActiveTab('calendar')
    } else if (tab === 'appearance' || tab === 'theme') {
      setActiveTab('appearance')
    } else if (tab === 'organization' || tab === 'org') {
      setActiveTab('organization')
    } else if (tab === 'workspace') {
      setActiveTab('workspace')
    }
  }, [searchParams])

  useEffect(() => {
    fetchOrganizations()
  }, [])

  useEffect(() => {
    if (currentOrg?.id) {
      fetchWorkspaces(currentOrg.id)
    }
  }, [currentOrg?.id])

  // Profile state
  const [firstName, setFirstName] = useState(user?.firstName || 'Admin')
  const [lastName, setLastName] = useState(user?.lastName || 'User')
  const [jobTitle, setJobTitle] = useState('Chief System Architect')
  const [timezone, setTimezone] = useState('UTC (GMT+0:00)')
  const [avatarPreview, setAvatarPreview] = useState<string | null>(user?.avatarUrl || null)
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false)

  // Mounted check for React Portal
  const [mounted, setMounted] = useState(false)
  useEffect(() => {
    setMounted(true)
  }, [])

  // Filter organizations strictly for the logged-in user:
  // Show ONLY organizations where the user is the creator/owner (o.ownerId === user.id)
  // OR where the user has admin privileges (o.isAdminOrOwner === true, o.userRole === 'OWNER' / 'ADMIN')
  const visibleOrganizations = useMemo(() => {
    const unique = new Map<string, typeof organizations[0]>()
    for (const org of organizations) {
      if (org.id === 'b0000000-0000-0000-0000-000000000001' && user?.email !== 'admin@taskflow.dev') {
        continue
      }
      const isCreator = (org.ownerId && org.ownerId === user?.id) || (org as any).isOwner === true
      const isAdmin =
        org.isAdminOrOwner === true ||
        org.userRole === 'OWNER' ||
        org.userRole === 'ADMIN' ||
        (org as any).role === 'OWNER' ||
        (org as any).role === 'ADMIN'

      if (isCreator || isAdmin) {
        if (!unique.has(org.id)) {
          unique.set(org.id, org)
        }
      }
    }
    return Array.from(unique.values())
  }, [organizations, user?.id, user?.email])

  // If user has cached an organization where they are not creator/admin, auto-switch to their first valid organization
  useEffect(() => {
    if (visibleOrganizations.length > 0) {
      const isCurrentValid = visibleOrganizations.some((o) => o.id === currentOrg?.id)
      if (!isCurrentValid) {
        setCurrentOrg(visibleOrganizations[0])
      }
    }
  }, [visibleOrganizations, currentOrg?.id, setCurrentOrg])

  useEffect(() => {
    if (user?.avatarUrl) {
      setAvatarPreview(user.avatarUrl)
    }
    if (user?.firstName) setFirstName(user.firstName)
    if (user?.lastName) setLastName(user.lastName)
  }, [user])

  // Mandatory Org & Workspace creation state when no orgs exist
  const [mandatoryOrgName, setMandatoryOrgName] = useState('')
  const [mandatoryWsName, setMandatoryWsName] = useState('')
  const [mandatoryWsColor, setMandatoryWsColor] = useState('#3B82F6')
  const [isCreatingMandatoryOrg, setIsCreatingMandatoryOrg] = useState(false)

  // Optional "+ New Organization" modal state
  const [isCreateOrgModalOpen, setIsCreateOrgModalOpen] = useState(false)
  const [newOrgModalName, setNewOrgModalName] = useState('')
  const [newOrgModalWsName, setNewOrgModalWsName] = useState('')
  const [newOrgModalWsColor, setNewOrgModalWsColor] = useState('#3B82F6')
  const [isCreatingNewOrgModal, setIsCreatingNewOrgModal] = useState(false)

  // Org state
  const [orgName, setOrgName] = useState(currentOrg?.name || '')
  const [orgLogoPreview, setOrgLogoPreview] = useState<string | null>(currentOrg?.logoUrl || null)
  const [isUploadingOrgLogo, setIsUploadingOrgLogo] = useState(false)
  const [isDeleteOrgModalOpen, setIsDeleteOrgModalOpen] = useState(false)
  const [deleteOrgConfirmText, setDeleteOrgConfirmText] = useState('')
  const [isDeletingOrg, setIsDeletingOrg] = useState(false)

  // Sync org form fields when active organization switches
  useEffect(() => {
    if (currentOrg) {
      setOrgName(currentOrg.name)
      setOrgLogoPreview(currentOrg.logoUrl || null)
    } else {
      setOrgName('')
      setOrgLogoPreview(null)
    }
  }, [currentOrg?.id, currentOrg?.name, currentOrg?.logoUrl])

  // Workspace state
  const [wsName, setWsName] = useState(currentWorkspace?.name || '')
  const [wsColor, setWsColor] = useState(currentWorkspace?.color || '#6366F1')
  const [isDeleteWsModalOpen, setIsDeleteWsModalOpen] = useState(false)
  const [isDeletingWs, setIsDeletingWs] = useState(false)

  // Sync workspace form fields when active workspace switches
  useEffect(() => {
    if (currentWorkspace) {
      setWsName(currentWorkspace.name)
      setWsColor(currentWorkspace.color || '#6366F1')
    } else {
      setWsName('')
      setWsColor('#6366F1')
    }
  }, [currentWorkspace?.id, currentWorkspace?.name, currentWorkspace?.color])

  // Projects state
  const [selectedWsId, setSelectedWsId] = useState<string>('')
  const [isCreateProjModalOpen, setIsCreateProjModalOpen] = useState(false)
  const [newProjName, setNewProjName] = useState('')
  const [newProjDesc, setNewProjDesc] = useState('')
  const [newProjStatus, setNewProjStatus] = useState<Project['status']>('ACTIVE')
  const [newProjColor, setNewProjColor] = useState('#3B82F6')
  const [isCreatingProj, setIsCreatingProj] = useState(false)

  const [editingProject, setEditingProject] = useState<Project | null>(null)
  const [editProjName, setEditProjName] = useState('')
  const [editProjDesc, setEditProjDesc] = useState('')
  const [editProjStatus, setEditProjStatus] = useState<Project['status']>('ACTIVE')
  const [editProjColor, setEditProjColor] = useState('#3B82F6')
  const [isUpdatingProj, setIsUpdatingProj] = useState(false)

  const [deletingProject, setDeletingProject] = useState<Project | null>(null)
  const [isDeletingProj, setIsDeletingProj] = useState(false)

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
    if (file.size > 5 * 1024 * 1024) {
      showToast('Avatar image must be under 5MB')
      return
    }
    const reader = new FileReader()
    reader.onload = async (event) => {
      const rawDataUrl = event.target?.result as string
      // Auto-compress high-res uploads to an optimal 600px square for instant load and DB storage
      const img = new Image()
      img.onload = async () => {
        let finalDataUrl = rawDataUrl
        const maxDim = 600
        if (img.width > maxDim || img.height > maxDim) {
          const canvas = document.createElement('canvas')
          let width = img.width
          let height = img.height
          if (width > height) {
            height = Math.round((height * maxDim) / width)
            width = maxDim
          } else {
            width = Math.round((width * maxDim) / height)
            height = maxDim
          }
          canvas.width = width
          canvas.height = height
          const ctx = canvas.getContext('2d')
          if (ctx) {
            ctx.drawImage(img, 0, 0, width, height)
            finalDataUrl = canvas.toDataURL('image/jpeg', 0.88)
          }
        }
        setAvatarPreview(finalDataUrl)
        try {
          setIsUploadingAvatar(true)
          await updateUserAvatar(finalDataUrl)
          showToast('Profile avatar uploaded and saved to database!')
        } catch (err: any) {
          showToast(err?.message || 'Failed to update avatar')
        } finally {
          setIsUploadingAvatar(false)
        }
      }
      img.onerror = async () => {
        setAvatarPreview(rawDataUrl)
        try {
          setIsUploadingAvatar(true)
          await updateUserAvatar(rawDataUrl)
          showToast('Profile avatar uploaded and saved!')
        } catch (err: any) {
          showToast(err?.message || 'Failed to update avatar')
        } finally {
          setIsUploadingAvatar(false)
        }
      }
      img.src = rawDataUrl
    }
    reader.readAsDataURL(file)
  }

  const handleRemoveAvatar = async () => {
    try {
      setIsUploadingAvatar(true)
      await updateUserAvatar('')
      setAvatarPreview(null)
      showToast('Profile avatar removed from profile and database')
    } catch (err: any) {
      showToast('Failed to remove avatar')
    } finally {
      setIsUploadingAvatar(false)
    }
  }

  const handleOrgLogoFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !currentOrg) return
    if (file.size > 5 * 1024 * 1024) {
      showToast('Logo file size must be under 5MB')
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
      const targetAvatar = avatarPreview !== undefined ? avatarPreview : (user?.avatarUrl || null)
      await apiClient.patch('/api/v1/auth/me', {
        firstName,
        lastName,
        displayName: `${firstName} ${lastName}`.trim(),
        avatarUrl: targetAvatar,
      })
      useAuthStore.setState((state) => ({
        user: state.user
          ? {
              ...state.user,
              firstName,
              lastName,
              displayName: `${firstName} ${lastName}`.trim(),
              avatarUrl: targetAvatar || undefined,
            }
          : null,
      }))
      showToast('Profile settings and avatar saved successfully!')
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

  const handleSaveWorkspace = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!wsName.trim()) {
      showToast('Workspace name cannot be empty')
      return
    }
    if (currentWorkspace && currentOrg) {
      try {
        await updateWorkspace(currentOrg.id, currentWorkspace.id, { name: wsName.trim(), color: wsColor })
        showToast('Workspace branding updated!')
      } catch (err: any) {
        showToast(err?.message || 'Failed to update workspace')
      }
    }
  }

  const handleCreateOrgAndWs = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!mandatoryOrgName.trim()) {
      showToast('Organization name is required')
      return
    }
    if (!mandatoryWsName.trim()) {
      showToast('Initial workspace name is required')
      return
    }
    try {
      setIsCreatingMandatoryOrg(true)
      const newOrg = await createOrganization(mandatoryOrgName.trim(), mandatoryWsName.trim(), mandatoryWsColor)
      showToast('Organization and workspace created successfully!')
      setMandatoryOrgName('')
      setMandatoryWsName('')
      await fetchOrganizations()
    } catch (err: any) {
      showToast(err?.message || 'Failed to create organization')
    } finally {
      setIsCreatingMandatoryOrg(false)
    }
  }

  const handleCreateNewOrgModal = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newOrgModalName.trim()) {
      showToast('Organization name is required')
      return
    }
    try {
      setIsCreatingNewOrgModal(true)
      const newOrg = await createOrganization(
        newOrgModalName.trim(),
        newOrgModalWsName.trim() || 'Main Workspace',
        newOrgModalWsColor
      )
      showToast(`Created organization "${newOrg.name}"!`)
      setIsCreateOrgModalOpen(false)
      setNewOrgModalName('')
      setNewOrgModalWsName('')
      await fetchOrganizations()
    } catch (err: any) {
      showToast(err?.message || 'Failed to create organization')
    } finally {
      setIsCreatingNewOrgModal(false)
    }
  }

  const handleDeleteOrg = async () => {
    if (isDeletingOrg) return
    if (!currentOrg) return
    if (deleteOrgConfirmText.trim().toLowerCase() !== currentOrg.name.trim().toLowerCase()) {
      showToast('Organization name does not match confirmation text')
      return
    }
    try {
      setIsDeletingOrg(true)
      const orgToDeleteId = currentOrg.id
      // Keep modal open while request is in-flight so user sees feedback and button is disabled
      await deleteOrganization(orgToDeleteId)

      // Immediately purge any cached tasks or projects from memory
      useTaskStore.setState({ tasks: [] })
      useProjectStore.setState({ projects: [] })

      showToast('Organization deleted successfully')

      // Ensure store and active organization are updated to the next available organization
      const freshOrgs = await fetchOrganizations()
      const remaining = freshOrgs.filter(
        (o) =>
          o.id !== orgToDeleteId &&
          (o.id !== 'b0000000-0000-0000-0000-000000000001' || user?.email === 'admin@taskflow.dev') &&
          ((o.ownerId && o.ownerId === user?.id) || (o as any).isOwner === true || o.isAdminOrOwner === true || o.userRole === 'OWNER' || o.userRole === 'ADMIN')
      )
      if (remaining.length > 0) {
        setCurrentOrg(remaining[0])
        const wss = await fetchWorkspaces(remaining[0].id)
        if (wss && wss.length > 0) {
          setCurrentWorkspace(wss[0])
        } else {
          setCurrentWorkspace(null)
        }
      } else {
        setCurrentOrg(null)
        setCurrentWorkspace(null)
      }

      // Close modal card only after organization has been deleted
      setIsDeleteOrgModalOpen(false)
      setDeleteOrgConfirmText('')
    } catch (err: any) {
      showToast(err?.message || 'Failed to delete organization')
    } finally {
      setIsDeletingOrg(false)
    }
  }

  const handleDeleteWorkspace = async () => {
    if (isDeletingWs) return
    if (!currentWorkspace || !currentOrg) return
    if (workspaces.length <= 1) {
      showToast('Cannot delete the only workspace in this organization')
      return
    }
    try {
      setIsDeletingWs(true)
      const wsToDeleteId = currentWorkspace.id
      // Keep modal open while deletion is in progress
      await deleteWorkspace(currentOrg.id, wsToDeleteId)

      // Purge in-memory tasks & projects
      useTaskStore.setState({ tasks: [] })
      useProjectStore.setState({ projects: [] })

      showToast('Workspace deleted successfully')
      const remainingWs = workspaces.filter((w) => w.id !== wsToDeleteId)
      if (remainingWs.length > 0) {
        setCurrentWorkspace(remainingWs[0])
      } else {
        setCurrentWorkspace(null)
      }

      // Close modal card only after workspace has been deleted
      setIsDeleteWsModalOpen(false)
    } catch (err: any) {
      showToast(err?.message || 'Failed to delete workspace')
    } finally {
      setIsDeletingWs(false)
    }
  }

  const handleWsSelect = (wsId: string) => {
    setSelectedWsId(wsId)
    loadProjects(wsId)
  }

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault()
    if (isCreatingProj) return
    const targetWsId = selectedWsId || currentWorkspace?.id
    if (!targetWsId) {
      showToast('Please select a workspace first')
      return
    }
    if (!newProjName.trim()) {
      showToast('Project name is required')
      return
    }
    try {
      setIsCreatingProj(true)
      await createProject(targetWsId, {
        name: newProjName.trim(),
        description: newProjDesc.trim(),
        status: newProjStatus,
        color: newProjColor,
      })
      showToast(`Project '${newProjName.trim()}' created!`)
      setNewProjName('')
      setNewProjDesc('')
      setNewProjStatus('ACTIVE')
      setNewProjColor('#3B82F6')
      setIsCreateProjModalOpen(false)
    } catch (err: any) {
      showToast(err?.message || 'Failed to create project')
    } finally {
      setIsCreatingProj(false)
    }
  }

  const handleUpdateProject = async (e: React.FormEvent) => {
    e.preventDefault()
    if (isUpdatingProj || !editingProject) return
    if (!editProjName.trim()) {
      showToast('Project name is required')
      return
    }
    try {
      setIsUpdatingProj(true)
      await updateProject(editingProject.id, {
        name: editProjName.trim(),
        description: editProjDesc.trim(),
        status: editProjStatus,
        color: editProjColor,
      })
      showToast(`Project '${editProjName.trim()}' updated!`)
      setEditingProject(null)
    } catch (err: any) {
      showToast(err?.message || 'Failed to update project')
    } finally {
      setIsUpdatingProj(false)
    }
  }

  const handleDeleteProject = async () => {
    if (isDeletingProj || !deletingProject) return
    const targetProj = deletingProject
    try {
      setIsDeletingProj(true)
      setDeletingProject(null) // Close modal immediately
      await deleteProject(targetProj.id)
      showToast(`Project '${targetProj.name}' deleted!`)
    } catch (err: any) {
      showToast(err?.message || 'Failed to delete project')
    } finally {
      setIsDeletingProj(false)
    }
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
    { id: 'appearance', label: 'Appearance & Theme', icon: Palette },
    { id: 'organization', label: 'Organization', icon: Building2 },
    { id: 'workspace', label: 'Workspace', icon: Briefcase },
    { id: 'calendar', label: 'Calendar & Sync', icon: Calendar },
  ]

  // Show skeleton only on initial load (no org data cached yet)
  if (isOrgLoading && organizations.length === 0) {
    return <SettingsSkeleton />
  }

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
              <div className="flex flex-wrap items-center gap-2 mt-2">
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
                <span className="text-[10px] text-muted-foreground bg-muted/50 px-2 py-0.5 rounded-md border border-border/40">
                  Max 5MB (JPG, PNG, WebP)
                </span>
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

      {/* Appearance & Theme Tab */}
      {activeTab === 'appearance' && (
        <ThemeSettingsView onShowToast={showToast} />
      )}

      {/* Organization Tab - Mandatory Creation if No Orgs Exist */}
      {activeTab === 'organization' && visibleOrganizations.length === 0 && (
        <div className="space-y-6 max-w-2xl bg-card/90 backdrop-blur-xl border border-primary/40 p-7 rounded-3xl shadow-xl animate-fade-in">
          <div className="flex items-center gap-3.5 pb-5 border-b border-border/60">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-primary to-indigo-500 text-white flex items-center justify-center shadow-lg shadow-primary/25">
              <Building2 className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-foreground tracking-tight">Create Organization & Workspace</h3>
                <span className="text-[10px] uppercase font-extrabold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-500 border border-amber-500/30">
                  Mandatory
                </span>
              </div>
              <p className="text-xs text-muted-foreground">You currently have no active organization. Create one to continue collaborating.</p>
            </div>
          </div>

          <form onSubmit={handleCreateOrgAndWs} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-foreground">Organization Name *</label>
              <input
                type="text"
                placeholder="e.g. Acme Corporation"
                value={mandatoryOrgName}
                onChange={(e) => setMandatoryOrgName(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-background border border-border text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary shadow-xs"
                required
                autoFocus
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-foreground">Initial Workspace Name *</label>
              <input
                type="text"
                placeholder="e.g. Engineering & Product"
                value={mandatoryWsName}
                onChange={(e) => setMandatoryWsName(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-background border border-border text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary shadow-xs"
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-foreground">Workspace Theme Color</label>
              <div className="flex items-center gap-2 pt-1">
                {['#3B82F6', '#8B5CF6', '#EC4899', '#10B981', '#F59E0B', '#06B6D4'].map((c) => (
                  <button
                    type="button"
                    key={c}
                    onClick={() => setMandatoryWsColor(c)}
                    className={`w-7 h-7 rounded-xl transition-transform cursor-pointer ${
                      mandatoryWsColor === c ? 'scale-125 ring-2 ring-foreground shadow-md' : 'hover:scale-110'
                    }`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </div>

            <div className="pt-3 border-t border-border/60">
              <button
                type="submit"
                disabled={isCreatingMandatoryOrg || !mandatoryOrgName.trim() || !mandatoryWsName.trim()}
                className="w-full py-2.5 rounded-xl bg-primary text-primary-foreground text-xs font-bold hover:bg-primary/90 transition-all shadow-md shadow-primary/20 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isCreatingMandatoryOrg ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                <span>Create Organization & Workspace</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Organization Tab - Existing Organizations */}
      {activeTab === 'organization' && visibleOrganizations.length > 0 && (
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

          {/* Organizations Directory & Switcher */}
          <div className="space-y-3 pt-6 border-t border-border/60">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Your Organizations</h4>
                <p className="text-[11px] text-muted-foreground mt-0.5">Switch between organizations or review your accounts.</p>
              </div>
              <button
                type="button"
                onClick={() => setIsCreateOrgModalOpen(true)}
                className="px-3 py-1.5 rounded-xl bg-primary/10 border border-primary/20 text-primary hover:bg-primary/20 transition-all text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>New Organization</span>
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {visibleOrganizations.map((org) => {
                const isCurrent = org.id === currentOrg?.id
                return (
                  <div
                    key={org.id}
                    onClick={() => !isCurrent && setCurrentOrg(org)}
                    className={`p-3.5 rounded-2xl border transition-all flex items-center justify-between ${
                      isCurrent
                        ? 'bg-primary/5 border-primary/40 shadow-sm'
                        : 'bg-card/60 border-border/70 hover:border-primary/30 cursor-pointer'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      {org.logoUrl ? (
                        <img src={org.logoUrl} alt={org.name} className="w-8 h-8 rounded-xl object-cover" />
                      ) : (
                        <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-primary to-indigo-500 text-white flex items-center justify-center font-bold text-xs shrink-0">
                          {org.name?.charAt(0)?.toUpperCase() || 'O'}
                        </div>
                      )}
                      <div className="truncate">
                        <p className="text-xs font-bold text-foreground truncate">{org.name}</p>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <p className="text-[10px] text-muted-foreground capitalize">{org.plan || 'Free'} Plan</p>
                          <span className="text-[9px] font-bold px-1.5 py-0.2 rounded-md bg-primary/10 text-primary border border-primary/20">
                            {org.ownerId === user?.id || (org as any).isOwner ? 'Creator' : 'Admin'}
                          </span>
                        </div>
                      </div>
                    </div>
                    {isCurrent ? (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20 shrink-0">
                        Active
                      </span>
                    ) : (
                      <span className="text-[10px] text-muted-foreground font-semibold hover:text-foreground shrink-0">
                        Switch
                      </span>
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          {/* Danger Zone: Delete Organization (Only visible if creator or admin) */}
          {isOrgAdminOrOwner && (
            <div className="p-5 rounded-2xl border border-rose-500/30 bg-rose-500/5 space-y-3 pt-5 mt-6">
              <div className="flex items-center gap-2 text-rose-500 font-bold text-xs uppercase tracking-wider">
                <AlertTriangle className="w-4 h-4" />
                <span>Danger Zone</span>
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-bold text-foreground">Delete Organization</p>
                  <p className="text-[11px] text-muted-foreground">
                    Permanently delete '{currentOrg?.name || 'this organization'}', including all its workspaces, projects, teams, tasks, and data.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setDeleteOrgConfirmText('')
                    setIsDeleteOrgModalOpen(true)
                  }}
                  className="px-3.5 py-2 rounded-xl bg-rose-600 text-white text-xs font-bold hover:bg-rose-700 transition-all shrink-0 cursor-pointer shadow-sm shadow-rose-600/20 active:scale-95 flex items-center gap-1.5"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete Organization</span>
                </button>
              </div>
            </div>
          )}
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

          {/* Workspaces Directory in this Org */}
          {workspaces.length > 0 && (
            <div className="space-y-3 pt-6 border-t border-border/60">
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Workspaces in {currentOrg?.name || 'Organization'}</h4>
                <p className="text-[11px] text-muted-foreground mt-0.5">Switch active workspace or manage your team environments.</p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {workspaces.map((ws) => {
                  const isCurrent = ws.id === currentWorkspace?.id
                  return (
                    <div
                      key={ws.id}
                      onClick={() => !isCurrent && setCurrentWorkspace(ws)}
                      className={`p-3.5 rounded-2xl border transition-all flex items-center justify-between ${
                        isCurrent
                          ? 'bg-primary/5 border-primary/40 shadow-sm'
                          : 'bg-card/60 border-border/70 hover:border-primary/30 cursor-pointer'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className="w-8 h-8 rounded-xl flex items-center justify-center text-white font-bold text-xs shrink-0 shadow-xs"
                          style={{ backgroundColor: ws.color || '#6366F1' }}
                        >
                          <Briefcase className="w-4 h-4" />
                        </div>
                        <div className="truncate">
                          <p className="text-xs font-bold text-foreground truncate">{ws.name}</p>
                          <p className="text-[10px] text-muted-foreground truncate font-mono">/{ws.slug}</p>
                        </div>
                      </div>
                      {isCurrent ? (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20 shrink-0">
                          Active
                        </span>
                      ) : (
                        <span className="text-[10px] text-muted-foreground font-semibold hover:text-foreground shrink-0">
                          Switch
                        </span>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Danger Zone: Delete Workspace */}
          <div className="p-5 rounded-2xl border border-rose-500/30 bg-rose-500/5 space-y-3 pt-5 mt-6">
            <div className="flex items-center gap-2 text-rose-500 font-bold text-xs uppercase tracking-wider">
              <AlertTriangle className="w-4 h-4" />
              <span>Danger Zone</span>
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <p className="text-xs font-bold text-foreground">Delete Workspace</p>
                <p className="text-[11px] text-muted-foreground">
                  Permanently remove '{currentWorkspace?.name || 'this workspace'}' along with its projects, tasks, and team assignments.
                </p>
              </div>
              <button
                type="button"
                disabled={workspaces.length <= 1}
                onClick={() => setIsDeleteWsModalOpen(true)}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 ${
                  workspaces.length <= 1
                    ? 'bg-muted text-muted-foreground cursor-not-allowed border border-border'
                    : 'bg-rose-600 text-white hover:bg-rose-700 cursor-pointer shadow-sm shadow-rose-600/20 active:scale-95'
                }`}
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete Workspace</span>
              </button>
            </div>
            {workspaces.length <= 1 && (
              <p className="text-[11px] text-amber-500 font-medium">
                Note: You cannot delete the only workspace in this organization. Create another workspace first.
              </p>
            )}
          </div>
        </form>
      )}

      {/* Calendar Tab */}
      {activeTab === 'calendar' && (
        <div className="max-w-4xl space-y-6">
          <CalendarIntegrationPanel onSuccess={showToast} />
        </div>
      )}



      {/* Modal: Delete Workspace Confirmation */}
      {mounted && isDeleteWsModalOpen && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-fade-in">
          <div className="bg-card border border-rose-500/30 rounded-3xl p-6 w-full max-w-md shadow-2xl space-y-4 animate-scale-in">
            <div className="flex items-center gap-3 text-rose-500">
              <div className="w-10 h-10 rounded-2xl bg-rose-500/10 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-foreground">Delete Workspace</h3>
                <p className="text-xs text-muted-foreground">Permanent deletion of workspace data.</p>
              </div>
            </div>

            <p className="text-xs text-foreground/90 leading-relaxed">
              Are you sure you want to delete workspace <span className="font-bold text-foreground">"{currentWorkspace?.name}"</span>? All projects, tasks, and teams assigned to this workspace will be deleted.
            </p>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-border">
              <button
                type="button"
                disabled={isDeletingWs}
                onClick={() => setIsDeleteWsModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-muted-foreground hover:bg-muted transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeletingWs}
                onClick={handleDeleteWorkspace}
                className="px-4 py-2 rounded-xl bg-rose-600 text-white text-xs font-bold hover:bg-rose-700 transition-all shadow-md shadow-rose-600/20 flex items-center gap-1.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isDeletingWs ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                <span>{isDeletingWs ? 'Deleting Workspace...' : 'Delete Workspace'}</span>
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Modal: Delete Organization Confirmation */}
      {mounted && isDeleteOrgModalOpen && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-fade-in">
          <div className="bg-card border border-rose-500/30 rounded-3xl p-6 w-full max-w-md shadow-2xl space-y-4 animate-scale-in">
            <div className="flex items-center gap-3 text-rose-500">
              <div className="w-10 h-10 rounded-2xl bg-rose-500/10 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-foreground">Delete Organization</h3>
                <p className="text-xs text-muted-foreground">Irreversible account destruction.</p>
              </div>
            </div>

            <p className="text-xs text-foreground/90 leading-relaxed">
              This will permanently delete <span className="font-bold text-foreground">"{currentOrg?.name}"</span>, including all workspaces, projects, tasks, teams, and invites.
            </p>

            <div className="space-y-1.5 pt-1">
              <label className="text-xs font-medium text-muted-foreground">
                To confirm, type <span className="font-bold text-foreground font-mono select-all">{currentOrg?.name}</span> below:
              </label>
              <input
                type="text"
                disabled={isDeletingOrg}
                placeholder={currentOrg?.name}
                value={deleteOrgConfirmText}
                onChange={(e) => setDeleteOrgConfirmText(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-background border border-border text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-rose-500 shadow-xs disabled:opacity-50 disabled:cursor-not-allowed"
                autoFocus
              />
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-border">
              <button
                type="button"
                disabled={isDeletingOrg}
                onClick={() => {
                  setIsDeleteOrgModalOpen(false)
                  setDeleteOrgConfirmText('')
                }}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-muted-foreground hover:bg-muted transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={
                  isDeletingOrg ||
                  deleteOrgConfirmText.trim().toLowerCase() !== currentOrg?.name?.trim()?.toLowerCase()
                }
                onClick={handleDeleteOrg}
                className="px-4 py-2 rounded-xl bg-rose-600 text-white text-xs font-bold hover:bg-rose-700 transition-all shadow-md shadow-rose-600/20 flex items-center gap-1.5 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {isDeletingOrg ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                <span>{isDeletingOrg ? 'Deleting Organization...' : 'Delete Organization'}</span>
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
      {/* Modal: New Organization Modal */}
      {mounted && isCreateOrgModalOpen && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-fade-in">
          <div className="bg-card border border-border rounded-3xl p-6 w-full max-w-lg shadow-2xl space-y-5 animate-scale-in">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                <Building2 className="w-5 h-5 text-primary" /> Create New Organization
              </h3>
              <button
                onClick={() => setIsCreateOrgModalOpen(false)}
                className="p-1.5 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateNewOrgModal} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-foreground">Organization Name *</label>
                <input
                  type="text"
                  placeholder="e.g. Acme Corporation"
                  value={newOrgModalName}
                  onChange={(e) => setNewOrgModalName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-background border border-border text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary shadow-xs"
                  autoFocus
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-foreground">Initial Workspace Name</label>
                <input
                  type="text"
                  placeholder="e.g. Main Workspace"
                  value={newOrgModalWsName}
                  onChange={(e) => setNewOrgModalWsName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-background border border-border text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary shadow-xs"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-foreground">Workspace Theme Color</label>
                <div className="flex items-center gap-2 pt-1">
                  {['#3B82F6', '#8B5CF6', '#EC4899', '#10B981', '#F59E0B', '#06B6D4'].map((c) => (
                    <button
                      type="button"
                      key={c}
                      onClick={() => setNewOrgModalWsColor(c)}
                      className={`w-7 h-7 rounded-xl transition-transform cursor-pointer ${
                        newOrgModalWsColor === c ? 'scale-125 ring-2 ring-foreground shadow-md' : 'hover:scale-110'
                      }`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-border">
                <button
                  type="button"
                  onClick={() => setIsCreateOrgModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-muted-foreground hover:bg-muted transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreatingNewOrgModal || !newOrgModalName.trim()}
                  className="px-5 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-bold hover:bg-primary/90 transition-all shadow-md shadow-primary/20 flex items-center gap-1.5 cursor-pointer disabled:opacity-60"
                >
                  {isCreatingNewOrgModal ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                  <span>Create Organization</span>
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}
    </div>
  )
}


