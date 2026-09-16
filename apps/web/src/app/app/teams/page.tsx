'use client'

import React, { useState, useEffect, useCallback } from 'react'
import {
  Users2,
  Plus,
  Shield,
  Mail,
  Crown,
  X,
  Trash2,
  CheckCircle2,
  FolderKanban,
  Sparkles,
  Loader2,
  Filter,
  RefreshCw,
  GripVertical,
  Copy,
  Check,
  ExternalLink,
  Clock,
} from 'lucide-react'
import { useAuthStore } from '@/stores/auth-store'
import { useOrgStore } from '@/stores/org-store'
import { useWorkspaceStore } from '@/stores/workspace-store'
import { useProjectStore } from '@/stores/project-store'
import { apiClient } from '@/lib/api-client'
import { Portal } from '@/components/ui/portal'

interface MemberItem {
  id: string
  name: string
  email: string
  avatarUrl?: string
  role: 'Owner' | 'Admin' | 'Manager' | 'Member' | 'Guest'
  status: 'Active' | 'Pending Invitation'
  isOwner: boolean
  isInvitation?: boolean
  invitationToken?: string
  projectId?: string
  projectName?: string
}

export default function TeamsPage() {
  const { user } = useAuthStore()
  const { currentOrg, fetchOrganizations, setCurrentOrg, fetchUserResources } = useOrgStore()
  const { currentWorkspace, fetchWorkspaces, setCurrentWorkspace } = useWorkspaceStore()
  const { projects, loadProjects } = useProjectStore()

  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isInvitesModalOpen, setIsInvitesModalOpen] = useState(false)
  const [copiedToken, setCopiedToken] = useState<string | null>(null)
  const [draggedMemberId, setDraggedMemberId] = useState<string | null>(null)

  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState<MemberItem['role']>('Member')
  const [inviteName, setInviteName] = useState('')
  const [selectedProjectId, setSelectedProjectId] = useState('')
  const [selectedFilterProjectId, setSelectedFilterProjectId] = useState<string>('ALL')

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isLoadingMembers, setIsLoadingMembers] = useState(false)
  const [isAcceptingInvite, setIsAcceptingInvite] = useState(false)
  const [toastMessage, setToastMessage] = useState<string | null>(null)

  const [membersList, setMembersList] = useState<MemberItem[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const cached = sessionStorage.getItem('taskflow_cached_teams_members')
        if (cached) {
          const parsed = JSON.parse(cached)
          if (Array.isArray(parsed) && parsed.length > 0) return parsed
        }
      } catch {}
    }
    const currentUser = useAuthStore.getState().user
    if (currentUser) {
      return [
        {
          id: currentUser.id || 'owner',
          name: currentUser.displayName || `${currentUser.firstName || 'Owner'} ${currentUser.lastName || ''}`.trim() || 'User',
          email: currentUser.email || '',
          avatarUrl: currentUser.avatarUrl,
          role: 'Owner',
          status: 'Active',
          isOwner: true,
        },
      ]
    }
    return []
  })
  const [pendingForMe, setPendingForMe] = useState<any[]>([])

  // Ensure organization and workspace are loaded if user enters page directly
  useEffect(() => {
    if (!currentOrg) {
      fetchOrganizations().then((orgs) => {
        if (orgs && orgs.length > 0) {
          fetchWorkspaces(orgs[0].id)
        }
      })
    }
  }, [currentOrg, fetchOrganizations, fetchWorkspaces])

  // Sync current user's avatar into the members list immediately if updated
  useEffect(() => {
    if (user?.avatarUrl) {
      setMembersList((prev) =>
        prev.map((m) =>
          (user.id && m.id === user.id) || (m.email?.toLowerCase() === user.email?.toLowerCase())
            ? { ...m, avatarUrl: user.avatarUrl, name: user.displayName || m.name }
            : m
        )
      )
    }
  }, [user?.avatarUrl, user?.displayName, user?.email, user?.id])

  // Load workspace projects
  useEffect(() => {
    if (currentWorkspace?.id) {
      loadProjects(currentWorkspace.id)
    }
  }, [currentWorkspace?.id, loadProjects])

  useEffect(() => {
    if (projects.length > 0 && !selectedProjectId) {
      setSelectedProjectId(projects[0].id)
    }
  }, [projects, selectedProjectId])

  // Fetch real persistent members and invitations from DB with instant caching
  const loadData = useCallback(async () => {
    let targetOrgId = currentOrg?.id
    if (!targetOrgId) {
      const orgs = await fetchOrganizations()
      if (orgs && orgs.length > 0) {
        targetOrgId = orgs[0].id
      }
    }
    if (!targetOrgId) return

    setIsLoadingMembers(true)
    try {
      // 1. Fetch DB members, invitations, and pending in parallel
      const [membersRes, invsRes, pendingMeRes] = await Promise.allSettled([
        apiClient.get<any[]>(`/api/v1/organizations/${targetOrgId}/members`),
        apiClient.get<any[]>(`/api/v1/organizations/${targetOrgId}/invitations`),
        apiClient.get<any[]>('/api/v1/invitations/pending-for-me'),
      ])

      const rawMembers = membersRes.status === 'fulfilled' && membersRes.value?.data ? membersRes.value.data : []
      const rawInvs = invsRes.status === 'fulfilled' && invsRes.value?.data ? invsRes.value.data : []
      const myInvs = pendingMeRes.status === 'fulfilled' && pendingMeRes.value?.data ? pendingMeRes.value.data : []

      setPendingForMe(myInvs)

      // Map DB invitations by email to track project and acceptance
      const invByEmail = new Map<string, any>()
      rawInvs.forEach((inv) => {
        if (inv.email) {
          invByEmail.set(inv.email.toLowerCase(), inv)
        }
      })

      const combined: MemberItem[] = []
      const addedEmails = new Set<string>()

      // 1. Add active Organization Members
      rawMembers.forEach((m) => {
        const emailLower = (m.email || '').toLowerCase()
        addedEmails.add(emailLower)

        const isOwner = Boolean(
          m.role === 'OWNER' ||
          (currentOrg?.ownerId && m.userId === currentOrg.ownerId) ||
          (user && m.userId === user.id && currentOrg?.ownerId === user.id)
        )

        const matchedInv = invByEmail.get(emailLower)

        // Capitalize role display
        let roleDisplay: MemberItem['role'] = 'Member'
        if (isOwner) roleDisplay = 'Owner'
        else if (m.role?.toUpperCase() === 'ADMIN') roleDisplay = 'Admin'
        else if (m.role?.toUpperCase() === 'MANAGER') roleDisplay = 'Manager'
        else if (m.role?.toUpperCase() === 'GUEST') roleDisplay = 'Guest'

        const displayName =
          m.name ||
          (m.firstName || m.lastName
            ? `${m.firstName || ''} ${m.lastName || ''}`.trim()
            : emailLower.split('@')[0] || 'User')

        const isCurrentUser = Boolean(user && (m.userId === user.id || (m.email && emailLower === user.email?.toLowerCase())))

        combined.push({
          id: m.id || m.userId || `mem-${Math.random()}`,
          name: displayName,
          email: m.email || '',
          avatarUrl: m.avatarUrl || (isCurrentUser ? user?.avatarUrl : undefined),
          role: roleDisplay,
          status: 'Active',
          isOwner,
          projectId: matchedInv?.projectId,
          projectName: matchedInv?.projectName,
        })
      })

      // Fallback: If current user is logged in and owner but not yet in members list
      if (user && !addedEmails.has(user.email.toLowerCase())) {
        const isOwner = Boolean(currentOrg?.ownerId === user.id || currentOrg?.ownerId == null)
        if (isOwner) {
          addedEmails.add(user.email.toLowerCase())
          combined.unshift({
            id: user.id || 'owner',
            name: user.displayName || `${user.firstName || 'Owner'} ${user.lastName || ''}`.trim(),
            email: user.email,
            avatarUrl: user.avatarUrl,
            role: 'Owner',
            status: 'Active',
            isOwner: true,
          })
        }
      }

      // 2. Add pending invitations from the database
      rawInvs.forEach((inv) => {
        const emailLower = (inv.email || '').toLowerCase()
        if (inv.status === 'PENDING' && !addedEmails.has(emailLower)) {
          addedEmails.add(emailLower)

          let roleDisplay: MemberItem['role'] = 'Member'
          if (inv.role?.toUpperCase() === 'ADMIN') roleDisplay = 'Admin'
          else if (inv.role?.toUpperCase() === 'MANAGER') roleDisplay = 'Manager'
          else if (inv.role?.toUpperCase() === 'GUEST') roleDisplay = 'Guest'

          combined.push({
            id: inv.id || `inv-${inv.token}`,
            name: emailLower.split('@')[0],
            email: inv.email,
            role: roleDisplay,
            status: 'Pending Invitation',
            isOwner: false,
            isInvitation: true,
            invitationToken: inv.token,
            projectId: inv.projectId,
            projectName: inv.projectName,
          })
        }
      })

      setMembersList(combined)
      if (typeof window !== 'undefined' && combined.length > 0) {
        try {
          sessionStorage.setItem('taskflow_cached_teams_members', JSON.stringify(combined))
        } catch {}
      }
    } catch {
      // ignore
    } finally {
      setIsLoadingMembers(false)
    }
  }, [currentOrg?.id, currentOrg?.ownerId, user])

  useEffect(() => {
    loadData()
  }, [loadData])

  const ensureDefaultProject = async (wsId: string): Promise<string | null> => {
    try {
      const res = await apiClient.post<any>(`/api/v1/workspaces/${wsId}/projects`, {
        name: 'General',
        slug: 'general',
        description: 'Default project for tasks and collaboration',
        color: '#6366F1',
        icon: 'folder',
      })
      if (res.data?.id) {
        await loadProjects(wsId)
        return res.data.id
      }
    } catch {
      // ignore
    }
    return null
  }

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!inviteEmail.trim()) return

    setIsSubmitting(true)
    const cleanEmail = inviteEmail.trim().toLowerCase()
    const targetEmail = cleanEmail
    const invitedName = inviteName.trim()
    const selectedRole = inviteRole

    // Close the modal card immediately upon clicking Send Invitation
    setIsModalOpen(false)
    setInviteEmail('')
    setInviteName('')
    setToastMessage(`✉️ Sending invitation to ${targetEmail}...`)
    setIsSubmitting(true)

    try {
      // Always guarantee a valid project ID target
      let targetProjectId = selectedProjectId
      if (!targetProjectId && projects.length > 0) {
        targetProjectId = projects[0].id
      }
      if (!targetProjectId && currentWorkspace?.id) {
        targetProjectId = (await ensureDefaultProject(currentWorkspace.id)) || ''
      }

      if (!targetProjectId) {
        throw new Error('Please select or create a project first before sending an invitation.')
      }

      const res = await apiClient.post<any>(`/api/v1/projects/${targetProjectId}/invitations`, {
        email: targetEmail,
        name: invitedName || undefined,
        role: selectedRole.toUpperCase(),
        roleName: selectedRole,
        organizationId: currentOrg?.id,
        workspaceId: currentWorkspace?.id,
      })

      const targetProj = projects.find((p) => p.id === targetProjectId)
      const newInv = res.data

      // Optimistically add to membersList immediately so it renders instantly
      setMembersList((prev) => [
        {
          id: newInv?.id || `inv-${Date.now()}`,
          name: invitedName || targetEmail.split('@')[0],
          email: targetEmail,
          role: selectedRole,
          status: 'Pending Invitation',
          isOwner: false,
          isInvitation: true,
          invitationToken: newInv?.token,
          projectId: targetProjectId,
          projectName: targetProj?.name || 'Project',
        },
        ...prev.filter((m) => m.email?.toLowerCase() !== targetEmail),
      ])

      // Show clear success message toast
      setToastMessage(`✉️ Invitation email sent successfully to ${targetEmail}!`)
      setTimeout(() => setToastMessage(null), 4500)

      // Reload full DB data to stay completely synchronized
      await loadData()
    } catch (err: any) {
      setToastMessage(err?.response?.data?.message || err?.message || 'Failed to send invitation')
      setTimeout(() => setToastMessage(null), 4500)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleAcceptMyInvite = async (inv: any) => {
    setIsAcceptingInvite(true)
    const identifier = inv.id || inv.token
    try {
      const res = await apiClient.post<any>(`/api/v1/invitations/${identifier}/accept`)
      const acceptData = res.data || inv
      setToastMessage(`Successfully accepted invite for ${acceptData.projectName || inv.projectName || 'project'}!`)
      setPendingForMe((prev) => prev.filter((i) => i.id !== inv.id && i.token !== inv.token))

      // Switch org and workspace to the newly joined team
      const orgs = await fetchOrganizations()
      const targetOrgId = acceptData.organizationId || inv.organizationId
      const targetOrg = orgs.find((o) => o.id === targetOrgId) || orgs[0]
      if (targetOrg) {
        setCurrentOrg(targetOrg)
        const wss = await fetchWorkspaces(targetOrg.id)
        const targetWsId = acceptData.workspaceId || inv.workspaceId
        const targetWs = wss.find((w) => w.id === targetWsId) || wss[0]
        if (targetWs) {
          setCurrentWorkspace(targetWs)
          await loadProjects(targetWs.id)
        }
      }

      await fetchUserResources()

      setTimeout(() => {
        setToastMessage(null)
        if (acceptData.projectId || inv.projectId) {
          window.location.href = `/app/projects/${acceptData.projectId || inv.projectId}`
        } else {
          loadData()
        }
      }, 1000)
    } catch (err: any) {
      setToastMessage(err?.response?.data?.message || err?.message || 'Failed to accept invitation')
      setTimeout(() => setToastMessage(null), 3500)
    } finally {
      setIsAcceptingInvite(false)
    }
  }

  const handleDeclineMyInvite = async (inv: any) => {
    const identifier = typeof inv === 'string' ? inv : (inv?.id || inv?.token)
    if (!identifier) return
    try {
      await apiClient.post(`/api/v1/invitations/${identifier}/decline`)
      setPendingForMe((prev) => prev.filter((i) => i.id !== identifier && i.token !== identifier))
      setToastMessage('Invitation declined.')
      setTimeout(() => setToastMessage(null), 2500)
    } catch {
      setPendingForMe((prev) => prev.filter((i) => i.id !== identifier && i.token !== identifier))
    }
  }

  const handleRoleChange = (id: string, newRole: MemberItem['role']) => {
    setMembersList((prev) => prev.map((m) => (m.id === id ? { ...m, role: newRole } : m)))
  }

  const handleRemoveMember = async (member: MemberItem) => {
    if (member.isInvitation && member.invitationToken) {
      try {
        await apiClient.post(`/api/v1/invitations/${member.invitationToken}/decline`)
      } catch {
        // ignore
      }
    } else if (currentOrg?.id && member.id) {
      try {
        await apiClient.delete(`/api/v1/organizations/${currentOrg.id}/members/${member.id}`)
      } catch {
        // ignore
      }
    }
    setMembersList((prev) => prev.filter((m) => m.id !== member.id))
  }

  // Drag and drop reordering for members
  const handleDragStart = (e: React.DragEvent, id: string) => {
    setDraggedMemberId(id)
    e.dataTransfer.setData('text/plain', id)
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }

  const handleDrop = (e: React.DragEvent, targetId: string) => {
    e.preventDefault()
    const sourceId = draggedMemberId || e.dataTransfer.getData('text/plain')
    if (!sourceId || sourceId === targetId) return

    setMembersList((prev) => {
      const fromIndex = prev.findIndex((m) => m.id === sourceId)
      const toIndex = prev.findIndex((m) => m.id === targetId)
      if (fromIndex === -1 || toIndex === -1) return prev

      const updated = [...prev]
      const [movedItem] = updated.splice(fromIndex, 1)
      updated.splice(toIndex, 0, movedItem)
      return updated
    })
    setDraggedMemberId(null)
  }

  // Filter members list based on selected project
  const filteredMembers = membersList.filter((m) => {
    if (selectedFilterProjectId === 'ALL') return true
    // Owner always has access across all projects
    if (m.isOwner) return true
    return m.projectId === selectedFilterProjectId
  })

  // Pending invitations calculation
  const incomingInvites = pendingForMe
  const outgoingInvites = membersList.filter((m) => m.isInvitation)
  const totalPendingInvites = incomingInvites.length + outgoingInvites.length

  const handleCopyInviteToken = (token?: string) => {
    if (!token) return
    navigator.clipboard.writeText(token)
    setCopiedToken(token)
    setTimeout(() => setCopiedToken(null), 2500)
    setToastMessage('Invitation code copied to clipboard!')
    setTimeout(() => setToastMessage(null), 3000)
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto animate-fade-in pb-12">
      {toastMessage && (
        <div className="fixed top-6 right-6 z-[100] flex items-center gap-2.5 bg-emerald-600/95 border border-emerald-400/40 text-white px-5 py-3.5 rounded-2xl shadow-2xl animate-fade-in text-xs font-bold tracking-wide">
          <CheckCircle2 className="w-4 h-4 text-emerald-200 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Users2 className="w-6 h-6 text-primary" /> Teams & Organization Members
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            Manage granular role permissions and team assignments for {currentOrg?.name || 'your organization'}.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* BOX 1: Button to show number of new invites with badge */}
          <button
            type="button"
            onClick={() => setIsInvitesModalOpen(true)}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl border border-primary/40 bg-gradient-to-r from-primary/15 via-primary/10 to-primary/5 hover:from-primary/25 hover:to-primary/15 text-foreground text-xs font-semibold shadow-xs transition-all active:scale-95 cursor-pointer group"
            title="Inspect all incoming and pending invitations"
          >
            <div className="relative">
              <Mail className="w-4 h-4 text-primary group-hover:scale-110 transition-transform" />
              {totalPendingInvites > 0 && (
                <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-rose-500 animate-ping" />
              )}
            </div>
            <span>New Invites</span>
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold transition-colors ${
                totalPendingInvites > 0
                  ? 'bg-primary text-primary-foreground shadow-xs ring-2 ring-primary/30'
                  : 'bg-muted text-muted-foreground'
              }`}
            >
              {totalPendingInvites}
            </span>
          </button>

          {/* BOX 2: Box for the projects (Header Switcher & Filter) */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-border bg-card shadow-xs hover:border-primary/40 transition-colors">
            <FolderKanban className="w-4 h-4 text-primary shrink-0" />
            <div className="flex items-center gap-1.5 text-xs">
              <span className="text-muted-foreground font-semibold hidden md:inline">Project:</span>
              <select
                value={selectedFilterProjectId}
                onChange={(e) => setSelectedFilterProjectId(e.target.value)}
                className="bg-transparent text-xs font-bold text-foreground focus:outline-none cursor-pointer pr-1"
              >
                <option value="ALL">All Projects ({membersList.length})</option>
                {projects.map((p) => {
                  const count = membersList.filter((m) => m.isOwner || m.projectId === p.id).length
                  return (
                    <option key={p.id} value={p.id}>
                      {p.name} ({count})
                    </option>
                  )
                })}
              </select>
            </div>
          </div>

          <button
            onClick={() => loadData()}
            className="p-2 rounded-xl border border-border bg-card hover:bg-accent text-muted-foreground hover:text-foreground transition-all cursor-pointer"
            title="Refresh members"
          >
            <RefreshCw className={`w-4 h-4 ${isLoadingMembers ? 'animate-spin text-primary' : ''}`} />
          </button>
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 shadow-md shadow-primary/20 transition-all active:scale-95 cursor-pointer"
          >
            <Plus className="w-4 h-4" /> Invite Member
          </button>
        </div>
      </div>

      {/* In-Screen Pending Invitation Notification Banner */}
      {pendingForMe.length > 0 && (
        <div className="space-y-3">
          {pendingForMe.map((inv) => (
            <div
              key={inv.id}
              className="p-4 rounded-2xl border border-primary/40 bg-gradient-to-r from-primary/20 via-primary/10 to-transparent backdrop-blur-md flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xl shadow-primary/10 animate-fade-in"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/25 text-primary flex items-center justify-center shrink-0 shadow-sm">
                  <Mail className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <div className="font-bold text-foreground text-sm flex items-center gap-2 flex-wrap">
                    <span>You have a pending invitation to join</span>
                    <span className="text-primary font-bold underline decoration-primary/50">
                      {inv.projectName || 'Project'}
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/20 text-primary font-bold uppercase">
                      {inv.role || 'Member'}
                    </span>
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    Invited by <strong className="text-foreground">{inv.inviterName || 'Team Admin'}</strong> to organization{' '}
                    <strong className="text-foreground">{inv.orgName || 'Organization'}</strong>.
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 self-end sm:self-center">
                <button
                  onClick={() => handleDeclineMyInvite(inv)}
                  className="px-3 py-1.5 rounded-xl border border-border text-xs font-semibold text-muted-foreground hover:bg-accent transition-all cursor-pointer"
                >
                  Decline
                </button>
                <button
                  onClick={() => handleAcceptMyInvite(inv)}
                  disabled={isAcceptingInvite}
                  className="px-4 py-1.5 rounded-xl bg-primary text-primary-foreground text-xs font-bold hover:bg-primary/90 transition-all shadow-md shadow-primary/20 flex items-center gap-1.5 active:scale-95 disabled:opacity-50 cursor-pointer"
                >
                  {isAcceptingInvite ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  )}
                  Accept &amp; Join Team
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Members Table with Project Filter & Drag-and-Drop Reordering */}
      <div className="bg-card border border-border/80 rounded-2xl overflow-hidden shadow-sm">
        {/* Table Top Toolbar: Count + Project Filter */}
        <div className="p-4 border-b border-border/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-muted/20">
          <div className="flex items-center gap-2">
            <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Members &amp; Invitations ({filteredMembers.length})
            </h2>
            {isLoadingMembers && <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />}
            <span className="text-[10px] text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
              Drag rows to reorder
            </span>
          </div>

          {/* Project Filter */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-semibold">
              <Filter className="w-3.5 h-3.5 text-primary" />
              <span>Project:</span>
            </div>
            <select
              value={selectedFilterProjectId}
              onChange={(e) => setSelectedFilterProjectId(e.target.value)}
              className="px-3 py-1.5 rounded-xl bg-background border border-border text-xs font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-primary cursor-pointer shadow-sm"
            >
              <option value="ALL">All Projects ({membersList.length})</option>
              {projects.map((p) => {
                const count = membersList.filter((m) => m.isOwner || m.projectId === p.id).length
                return (
                  <option key={p.id} value={p.id}>
                    {p.name} ({count})
                  </option>
                )
              })}
            </select>
          </div>
        </div>

        <table className="w-full text-left text-xs">
          <thead className="bg-muted/40 border-b border-border text-muted-foreground text-[10px] font-bold uppercase tracking-wider">
            <tr>
              <th className="p-3 pl-4 sm:pl-6">User</th>
              <th className="p-3">Project</th>
              <th className="p-3">Role</th>
              <th className="p-3">Status</th>
              <th className="p-3 pr-6 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/60">
            {filteredMembers.length === 0 ? (
              <tr>
                <td colSpan={5} className="p-8 text-center text-muted-foreground text-xs">
                  No members found for this filter.
                </td>
              </tr>
            ) : (
              filteredMembers.map((m) => (
                <tr
                  key={m.id}
                  draggable={true}
                  onDragStart={(e) => handleDragStart(e, m.id)}
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, m.id)}
                  onDragEnd={() => setDraggedMemberId(null)}
                  className={`hover:bg-accent/40 transition-all cursor-move select-none ${
                    draggedMemberId === m.id ? 'opacity-40 bg-primary/10 border-primary border-y-2' : ''
                  }`}
                  title="Drag and drop to place at any position"
                >
                  <td className="p-3 pl-4 sm:pl-6">
                    <div className="flex items-center gap-2 sm:gap-3">
                      <div className="text-muted-foreground/40 hover:text-foreground cursor-grab active:cursor-grabbing p-0.5 shrink-0">
                        <GripVertical className="w-4 h-4" />
                      </div>
                      {m.avatarUrl ? (
                        <img
                          src={m.avatarUrl}
                          alt={m.name}
                          className="w-8 h-8 rounded-xl object-cover shadow-sm border border-primary/30 shrink-0"
                        />
                      ) : (
                        <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-primary to-secondary text-white flex items-center justify-center font-bold text-xs shadow-inner shrink-0">
                          {m.name.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div>
                        <div className="font-semibold text-foreground flex items-center gap-1.5">
                          {m.name}
                          {m.isOwner && <Crown className="w-3.5 h-3.5 text-amber-500" />}
                        </div>
                        <div className="text-[11px] text-muted-foreground">{m.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="p-3">
                    {m.isOwner ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-primary/10 text-primary border border-primary/20">
                        <FolderKanban className="w-3 h-3" /> All Projects
                      </span>
                    ) : m.projectName ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-accent border border-border text-foreground">
                        <FolderKanban className="w-3 h-3 text-primary" /> {m.projectName}
                      </span>
                    ) : (
                      <span className="text-[11px] text-muted-foreground">General</span>
                    )}
                  </td>
                  <td className="p-3">
                    {m.isOwner ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400">
                        <Shield className="w-3 h-3" /> Owner
                      </span>
                    ) : (
                      <select
                        value={m.role}
                        onChange={(e) => handleRoleChange(m.id, e.target.value as any)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-primary/10 text-primary border-none cursor-pointer focus:outline-none"
                      >
                        <option value="Admin">Admin</option>
                        <option value="Manager">Manager</option>
                        <option value="Member">Member</option>
                        <option value="Guest">Guest</option>
                      </select>
                    )}
                  </td>
                  <td className="p-3">
                    <span
                      className={`inline-flex items-center gap-1.5 font-medium text-[11px] ${
                        m.status === 'Active'
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : 'text-amber-600 dark:text-amber-400'
                      }`}
                    >
                      <div
                        className={`w-1.5 h-1.5 rounded-full ${
                          m.status === 'Active' ? 'bg-emerald-500' : 'bg-amber-500 animate-pulse'
                        }`}
                      />
                      {m.status}
                    </span>
                  </td>
                  <td className="p-3 pr-6 text-right">
                    {!m.isOwner && (
                      <button
                        onClick={() => handleRemoveMember(m)}
                        className="p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors rounded-lg cursor-pointer"
                        title={m.isInvitation ? 'Cancel invitation' : 'Remove member'}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Dedicated Interactive Modal: Pending Invites Inspector */}
      {isInvitesModalOpen && (
        <Portal>
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
            <div className="bg-card border border-border rounded-3xl p-6 w-full max-w-2xl shadow-2xl space-y-5 animate-scale-in max-h-[85vh] overflow-y-auto custom-scrollbar">
              <div className="flex items-center justify-between pb-3 border-b border-border">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-primary/15 text-primary">
                    <Mail className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-foreground">Invitations &amp; Access Requests</h3>
                    <p className="text-xs text-muted-foreground">
                      Total pending invitations: {totalPendingInvites}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setIsInvitesModalOpen(false)}
                  className="p-1.5 rounded-xl hover:bg-accent text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Section 1: Incoming Invitations Sent to Me */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                    <span>Invitations For You</span>
                    <span className="px-2 py-0.5 rounded-full bg-primary/20 text-primary text-[10px] font-bold">
                      {incomingInvites.length}
                    </span>
                  </h4>
                </div>

                {incomingInvites.length === 0 ? (
                  <div className="p-4 rounded-2xl bg-muted/20 border border-border/50 text-xs text-muted-foreground text-center">
                    No pending invitations waiting for your acceptance.
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {incomingInvites.map((inv) => (
                      <div
                        key={inv.id}
                        className="p-4 rounded-2xl border border-primary/30 bg-primary/5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs"
                      >
                        <div className="space-y-1">
                          <div className="font-bold text-foreground text-xs flex items-center gap-2">
                            <span>{inv.projectName || 'Project Workspace'}</span>
                            <span className="px-2 py-0.5 rounded-full bg-primary/20 text-primary text-[10px] font-bold uppercase">
                              {inv.role || 'Member'}
                            </span>
                          </div>
                          <div className="text-[11px] text-muted-foreground">
                            From organization: <strong className="text-foreground">{inv.orgName || 'Organization'}</strong>
                            {inv.inviterName && <span> by {inv.inviterName}</span>}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 self-end sm:self-center">
                          <button
                            onClick={() => handleDeclineMyInvite(inv)}
                            className="px-3 py-1.5 rounded-xl border border-border text-xs font-semibold text-muted-foreground hover:bg-accent transition-all cursor-pointer"
                          >
                            Decline
                          </button>
                          <button
                            onClick={() => {
                              handleAcceptMyInvite(inv)
                              setIsInvitesModalOpen(false)
                            }}
                            disabled={isAcceptingInvite}
                            className="px-4 py-1.5 rounded-xl bg-primary text-primary-foreground text-xs font-bold hover:bg-primary/90 transition-all shadow-md shadow-primary/20 flex items-center gap-1.5 active:scale-95 disabled:opacity-50 cursor-pointer"
                          >
                            {isAcceptingInvite ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                            Accept &amp; Join
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Section 2: Outgoing Invitations Sent to Team Members */}
              <div className="space-y-3 pt-3 border-t border-border/60">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                    <span>Pending Sent Invitations</span>
                    <span className="px-2 py-0.5 rounded-full bg-muted text-muted-foreground text-[10px] font-bold">
                      {outgoingInvites.length}
                    </span>
                  </h4>
                  <button
                    onClick={() => {
                      setIsInvitesModalOpen(false)
                      setIsModalOpen(true)
                    }}
                    className="text-xs font-bold text-primary hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3 h-3" /> New Invite
                  </button>
                </div>

                {outgoingInvites.length === 0 ? (
                  <div className="p-4 rounded-2xl bg-muted/20 border border-border/50 text-xs text-muted-foreground text-center">
                    No active pending outgoing invitations. All invited members have joined!
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {outgoingInvites.map((inv) => (
                      <div
                        key={inv.id}
                        className="p-3.5 rounded-2xl border border-border bg-card flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
                      >
                        <div className="space-y-0.5">
                          <div className="font-bold text-xs text-foreground flex items-center gap-2">
                            <span>{inv.email}</span>
                            <span className="px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-500 text-[10px] font-bold">
                              {inv.role}
                            </span>
                          </div>
                          <div className="text-[11px] text-muted-foreground">
                            Assigned to: <strong className="text-foreground">{inv.projectName || 'General'}</strong>
                            {inv.invitationToken && (
                              <span className="ml-2 font-mono text-[10px] text-primary">
                                Code: {inv.invitationToken.substring(0, 8)}...
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 self-end sm:self-center">
                          {inv.invitationToken && (
                            <button
                              onClick={() => handleCopyInviteToken(inv.invitationToken)}
                              className="px-2.5 py-1.5 rounded-xl border border-border hover:bg-accent text-[11px] font-semibold text-foreground flex items-center gap-1 cursor-pointer transition-all"
                              title="Copy invitation token"
                            >
                              {copiedToken === inv.invitationToken ? (
                                <>
                                  <Check className="w-3.5 h-3.5 text-emerald-500" />
                                  <span className="text-emerald-500">Copied!</span>
                                </>
                              ) : (
                                <>
                                  <Copy className="w-3.5 h-3.5 text-muted-foreground" />
                                  <span>Copy Token</span>
                                </>
                              )}
                            </button>
                          )}
                          <button
                            onClick={() => handleRemoveMember(inv)}
                            className="px-2.5 py-1.5 rounded-xl border border-destructive/30 hover:bg-destructive/10 text-[11px] font-semibold text-destructive flex items-center gap-1 cursor-pointer transition-all"
                            title="Revoke invitation"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Revoke</span>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex justify-end pt-3 border-t border-border">
                <button
                  type="button"
                  onClick={() => setIsInvitesModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-bold hover:bg-primary/90 transition-all cursor-pointer shadow-sm"
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        </Portal>
      )}

      {/* Interactive Modal: Invite Member */}
      {isModalOpen && (
        <Portal>
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
            <div className="bg-card border border-border rounded-2xl p-6 w-full max-w-md shadow-2xl space-y-4 animate-scale-in">
              <div className="flex items-center justify-between pb-3 border-b border-border">
                <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                  <Mail className="w-4 h-4 text-primary" /> Invite Team Member
                </h3>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleInvite} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">Email Address</label>
                  <input
                    type="email"
                    placeholder="colleague@company.com"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-background border border-border text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                    autoFocus
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">Full Name (Optional)</label>
                  <input
                    type="text"
                    placeholder="e.g. Jordan Miller"
                    value={inviteName}
                    onChange={(e) => setInviteName(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-background border border-border text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">Role Permission</label>
                  <select
                    value={inviteRole}
                    onChange={(e) => setInviteRole(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl bg-background border border-border text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="Admin">Admin (Can manage workspaces &amp; billing)</option>
                    <option value="Manager">Manager (Can manage projects &amp; sprints)</option>
                    <option value="Member">Member (Can edit tasks &amp; comments)</option>
                    <option value="Guest">Guest (Read-only access)</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                    <FolderKanban className="w-3.5 h-3.5 text-primary" /> Assign to Project
                  </label>
                  {projects.length > 0 ? (
                    <select
                      value={selectedProjectId || projects[0]?.id}
                      onChange={(e) => setSelectedProjectId(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-background border border-border text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                    >
                      {projects.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-primary/10 border border-primary/20 text-xs text-primary font-medium">
                      <FolderKanban className="w-3.5 h-3.5 shrink-0" />
                      <span>General Project (will be auto-created in workspace)</span>
                    </div>
                  )}
                </div>

                <div className="p-3 rounded-xl bg-accent/30 border border-border/50 text-[11px] text-muted-foreground leading-relaxed space-y-1">
                  <div className="font-semibold text-foreground flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-primary" /> Automatic Setup Included
                  </div>
                  <p>
                    The recipient will receive an email and an in-app notification to join. The organization, workspace, and project will be automatically attached upon sign in or accepting.
                  </p>
                </div>

                <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-3 py-2 rounded-xl text-xs font-semibold text-muted-foreground hover:bg-accent transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting || !inviteEmail.trim()}
                    className="px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-all shadow-md shadow-primary/20 disabled:opacity-50 flex items-center gap-2"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        Sending...
                      </>
                    ) : (
                      <>Send Invitation Email</>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </Portal>
      )}
    </div>
  )
}
