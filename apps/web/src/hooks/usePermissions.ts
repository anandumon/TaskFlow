'use client'

import { useMemo } from 'react'
import { useAuthStore } from '@/stores/auth-store'
import { useOrgStore } from '@/stores/org-store'
import { useWorkspaceStore } from '@/stores/workspace-store'

export function usePermissions() {
  const { user } = useAuthStore()
  const { currentOrg, members: orgMembers } = useOrgStore()
  const { currentWorkspace, members: wsMembers } = useWorkspaceStore()

  const isAdmin = useMemo(() => {
    if (!user || !user.id) return false

    const uid = user.id
    const uEmail = (user.email || '').toLowerCase().trim()

    // 1. Organization owner or isAdminOrOwner flag
    if (currentOrg) {
      if (currentOrg.ownerId && currentOrg.ownerId === uid) return true
      if (currentOrg.isOwner === true) return true
      if (currentOrg.isAdminOrOwner === true) return true
      const orgRole = (currentOrg.userRole || '').toUpperCase()
      if (orgRole === 'OWNER' || orgRole === 'ADMIN') return true
    }

    // 2. Organization members list check
    if (Array.isArray(orgMembers) && orgMembers.length > 0) {
      const match = orgMembers.find(
        (m: any) =>
          m.userId === uid ||
          m.id === uid ||
          (m.email && m.email.toLowerCase().trim() === uEmail)
      )
      if (match) {
        const role = (match.role || '').toUpperCase()
        if (role === 'OWNER' || role === 'ADMIN') return true
      }
    }

    // 3. Workspace members list check
    if (Array.isArray(wsMembers) && wsMembers.length > 0) {
      const match = wsMembers.find(
        (m: any) =>
          m.userId === uid ||
          m.id === uid ||
          (m.email && m.email.toLowerCase().trim() === uEmail)
      )
      if (match) {
        const role = (match.role || '').toUpperCase()
        if (role === 'OWNER' || role === 'ADMIN') return true
      }
    }

    // 4. Fallback: if user is the admin@taskflow.dev default superuser
    if (uEmail === 'admin@taskflow.dev') return true

    return false
  }, [user, currentOrg, orgMembers, wsMembers])

  return {
    isAdmin,
    canRemoveUser: isAdmin,
    canDeleteProject: isAdmin,
    canCreateProject: isAdmin,
    canDeleteTask: isAdmin,
  }
}
