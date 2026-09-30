export interface RoleOption {
  id: string
  name: 'Admin' | 'Member' | 'Limited Member' | 'Guest' | string
  description: string
  badge?: string
  isCustom?: boolean
}

export interface MemberItem {
  id: string
  name: string
  email: string
  avatarUrl?: string
  role: 'Owner' | 'Admin' | 'Manager' | 'Member' | 'Limited Member' | 'Guest' | string
  status: 'Active' | 'Pending Invitation'
  isOwner: boolean
  isInvitation?: boolean
  invitationToken?: string
  projectId?: string
  projectName?: string
  teamId?: string
  teamName?: string
  managerName?: string
  managerEmail?: string
  isOnline?: boolean
  joinedAt?: string
}

export interface TeamItem {
  id: string
  name: string
  description?: string
  color: string
  icon?: string
  leadName?: string
  leadEmail?: string
  memberCount: number
  memberIds?: string[]
}

export type ActiveTab = 'people' | 'teams' | 'org-chart' | 'analytics'
export type StatusFilter = 'ALL' | 'ONLINE' | 'OFFLINE'
export type AccountTypeFilter = 'ALL' | 'Owner' | 'Admin' | 'Manager' | 'Member' | 'Guest' | 'Pending' | 'Limited Member'
export type SortOption = 'DEFAULT' | 'A_Z' | 'Z_A' | 'LAST_JOINED' | 'FIRST_JOINED'
export type ViewMode = 'grid' | 'table'
