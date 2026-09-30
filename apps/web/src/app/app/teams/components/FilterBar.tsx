'use client'

import React, { useState, useRef, useEffect, useMemo } from 'react'
import {
  ChevronDown,
  Check,
  Search,
  LayoutGrid,
  List,
  X,
  User,
  Users,
} from 'lucide-react'
import {
  MemberItem,
  TeamItem,
  StatusFilter,
  AccountTypeFilter,
  SortOption,
  ViewMode,
} from './types'

interface FilterBarProps {
  members: MemberItem[]
  teams: TeamItem[]
  currentUserId?: string
  statusFilter: StatusFilter
  setStatusFilter: (status: StatusFilter) => void
  teamFilter: string
  setTeamFilter: (teamId: string) => void
  accountTypeFilter: AccountTypeFilter
  setAccountTypeFilter: (role: AccountTypeFilter) => void
  managerFilter: string
  setManagerFilter: (managerId: string) => void
  sortOption: SortOption
  setSortOption: (sort: SortOption) => void
  searchQuery: string
  setSearchQuery: (query: string) => void
  viewMode: ViewMode
  setViewMode: (mode: ViewMode) => void
}

export function FilterBar({
  members,
  teams,
  currentUserId,
  statusFilter,
  setStatusFilter,
  teamFilter,
  setTeamFilter,
  accountTypeFilter,
  setAccountTypeFilter,
  managerFilter,
  setManagerFilter,
  sortOption,
  setSortOption,
  searchQuery,
  setSearchQuery,
  viewMode,
  setViewMode,
}: FilterBarProps) {
  // Dropdown open states
  const [openDropdown, setOpenDropdown] = useState<
    'status' | 'team' | 'accountType' | 'manager' | 'sort' | null
  >(null)

  // Manager search inside manager dropdown
  const [managerSearch, setManagerSearch] = useState('')

  const barRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (barRef.current && !barRef.current.contains(e.target as Node)) {
        setOpenDropdown(null)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  // Calculate counts for filters
  const counts = useMemo(() => {
    const total = members.length
    const online = members.filter((m) => m.isOnline).length
    const offline = total - online

    const admin = members.filter((m) => m.role === 'Admin').length
    const member = members.filter((m) => m.role === 'Member').length
    const guest = members.filter((m) => m.role === 'Guest').length
    const pending = members.filter((m) => m.isInvitation || m.status === 'Pending Invitation').length
    const owner = members.filter((m) => m.isOwner || m.role === 'Owner').length
    const manager = members.filter((m) => m.role === 'Manager').length

    return {
      total,
      online,
      offline,
      admin,
      member,
      guest,
      pending,
      owner,
      manager,
    }
  }, [members])

  // Managers list for the Manager dropdown
  const managers = useMemo(() => {
    const map = new Map<string, MemberItem>()
    members.forEach((m) => {
      if (m.isOwner || m.role === 'Admin' || m.role === 'Manager') {
        map.set(m.id, m)
      }
    })
    return Array.from(map.values())
  }, [members])

  const filteredManagers = useMemo(() => {
    if (!managerSearch.trim()) return managers
    const q = managerSearch.toLowerCase()
    return managers.filter(
      (m) =>
        m.name.toLowerCase().includes(q) || (m.email && m.email.toLowerCase().includes(q))
    )
  }, [managers, managerSearch])

  const toggleDropdown = (key: 'status' | 'team' | 'accountType' | 'manager' | 'sort') => {
    setOpenDropdown((prev) => (prev === key ? null : key))
  }

  // Get active labels for buttons
  const statusLabel =
    statusFilter === 'ALL'
      ? 'Status'
      : statusFilter === 'ONLINE'
      ? 'Status: Online'
      : 'Status: Offline'

  const activeTeam = teams.find((t) => t.id === teamFilter)
  const teamLabel = teamFilter === 'ALL' ? 'Team' : `Team: ${activeTeam?.name || 'Selected'}`

  const accountTypeLabel =
    accountTypeFilter === 'ALL' ? 'Account type' : `Account: ${accountTypeFilter}`

  const activeManager = managers.find((m) => m.id === managerFilter)
  const isMeManager = currentUserId && managerFilter === currentUserId
  const managerLabel =
    managerFilter === 'ALL'
      ? 'Manager'
      : isMeManager
      ? 'Manager: Me'
      : `Manager: ${activeManager?.name?.split(' ')[0] || 'Selected'}`

  const sortLabels: Record<SortOption, string> = {
    DEFAULT: 'Sort',
    A_Z: 'Sort: A - Z',
    Z_A: 'Sort: Z - A',
    LAST_JOINED: 'Sort: Last Joined',
    FIRST_JOINED: 'Sort: First Joined',
  }

  return (
    <div
      ref={barRef}
      className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 pt-1 pb-4"
    >
      {/* Left Filter Buttons Group */}
      <div className="flex items-center gap-2 flex-wrap">
        {/* 1. Status Dropdown (Image 2) */}
        <div className="relative">
          <button
            type="button"
            onClick={() => toggleDropdown('status')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-medium border transition-all cursor-pointer shadow-2xs select-none active:scale-95 ${
              statusFilter !== 'ALL'
                ? 'bg-primary/10 border-primary text-primary font-semibold'
                : 'bg-card hover:bg-accent border-border text-foreground hover:border-primary/40'
            }`}
          >
            <span>{statusLabel}</span>
            <ChevronDown className="w-3.5 h-3.5 opacity-60" />
          </button>

          {openDropdown === 'status' && (
            <div className="absolute left-0 top-full mt-2 w-48 bg-popover/95 backdrop-blur-md border border-border rounded-2xl p-1.5 shadow-2xl z-50 animate-scale-in text-xs space-y-0.5">
              <button
                type="button"
                onClick={() => {
                  setStatusFilter('ALL')
                  setOpenDropdown(null)
                }}
                className="w-full flex items-center justify-between px-3 py-2 rounded-xl hover:bg-accent text-foreground transition-colors cursor-pointer text-left"
              >
                <div className="flex items-center gap-2 font-medium">
                  {statusFilter === 'ALL' ? (
                    <Check className="w-4 h-4 text-primary" />
                  ) : (
                    <span className="w-4" />
                  )}
                  <span className={statusFilter === 'ALL' ? 'text-primary font-bold' : ''}>
                    All
                  </span>
                </div>
                <span className="text-muted-foreground text-[11px] font-semibold">
                  {counts.total}
                </span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setStatusFilter('ONLINE')
                  setOpenDropdown(null)
                }}
                className="w-full flex items-center justify-between px-3 py-2 rounded-xl hover:bg-accent text-foreground transition-colors cursor-pointer text-left"
              >
                <div className="flex items-center gap-2 font-medium">
                  {statusFilter === 'ONLINE' ? (
                    <Check className="w-4 h-4 text-primary" />
                  ) : (
                    <span className="w-4" />
                  )}
                  <span className={statusFilter === 'ONLINE' ? 'text-primary font-bold' : ''}>
                    Online
                  </span>
                </div>
                <span className="text-muted-foreground text-[11px] font-semibold">
                  {counts.online}
                </span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setStatusFilter('OFFLINE')
                  setOpenDropdown(null)
                }}
                className="w-full flex items-center justify-between px-3 py-2 rounded-xl hover:bg-accent text-foreground transition-colors cursor-pointer text-left"
              >
                <div className="flex items-center gap-2 font-medium">
                  {statusFilter === 'OFFLINE' ? (
                    <Check className="w-4 h-4 text-primary" />
                  ) : (
                    <span className="w-4" />
                  )}
                  <span className={statusFilter === 'OFFLINE' ? 'text-primary font-bold' : ''}>
                    Offline
                  </span>
                </div>
                <span className="text-muted-foreground text-[11px] font-semibold">
                  {counts.offline}
                </span>
              </button>
            </div>
          )}
        </div>

        {/* 2. Team Dropdown (Only shown if teams are created) */}
        {teams.length > 0 && (
          <div className="relative">
          <button
            type="button"
            onClick={() => toggleDropdown('team')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-medium border transition-all cursor-pointer shadow-2xs select-none active:scale-95 ${
              teamFilter !== 'ALL'
                ? 'bg-primary/10 border-primary text-primary font-semibold'
                : 'bg-card hover:bg-accent border-border text-foreground hover:border-primary/40'
            }`}
          >
            <span>{teamLabel}</span>
            <ChevronDown className="w-3.5 h-3.5 opacity-60" />
          </button>

          {openDropdown === 'team' && (
            <div className="absolute left-0 top-full mt-2 w-56 bg-popover/95 backdrop-blur-md border border-border rounded-2xl p-1.5 shadow-2xl z-50 animate-scale-in text-xs space-y-0.5 max-h-64 overflow-y-auto">
              <button
                type="button"
                onClick={() => {
                  setTeamFilter('ALL')
                  setOpenDropdown(null)
                }}
                className="w-full flex items-center justify-between px-3 py-2 rounded-xl hover:bg-accent text-foreground transition-colors cursor-pointer text-left"
              >
                <div className="flex items-center gap-2 font-medium">
                  {teamFilter === 'ALL' ? (
                    <Check className="w-4 h-4 text-primary" />
                  ) : (
                    <span className="w-4" />
                  )}
                  <span className={teamFilter === 'ALL' ? 'text-primary font-bold' : ''}>
                    All Teams
                  </span>
                </div>
                <span className="text-muted-foreground text-[11px] font-semibold">
                  {counts.total}
                </span>
              </button>

              {teams.map((t) => {
                const teamMemberCount = members.filter(
                  (m) => m.teamId === t.id || m.teamName === t.name
                ).length
                const isSelected = teamFilter === t.id
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => {
                      setTeamFilter(t.id)
                      setOpenDropdown(null)
                    }}
                    className="w-full flex items-center justify-between px-3 py-2 rounded-xl hover:bg-accent text-foreground transition-colors cursor-pointer text-left"
                  >
                    <div className="flex items-center gap-2 font-medium truncate">
                      {isSelected ? (
                        <Check className="w-4 h-4 text-primary shrink-0" />
                      ) : (
                        <span
                          className="w-2.5 h-2.5 rounded-full shrink-0 shadow-xs"
                          style={{ backgroundColor: t.color || '#6366f1' }}
                        />
                      )}
                      <span className={`truncate ${isSelected ? 'text-primary font-bold' : ''}`}>
                        {t.name}
                      </span>
                    </div>
                    <span className="text-muted-foreground text-[11px] font-semibold shrink-0">
                      {teamMemberCount}
                    </span>
                  </button>
                )
              })}
              </div>
            )}
          </div>
        )}

        {/* 3. Account Type Dropdown (Image 3) */}
        <div className="relative">
          <button
            type="button"
            onClick={() => toggleDropdown('accountType')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-medium border transition-all cursor-pointer shadow-2xs select-none active:scale-95 ${
              accountTypeFilter !== 'ALL'
                ? 'bg-primary/10 border-primary text-primary font-semibold'
                : 'bg-card hover:bg-accent border-border text-foreground hover:border-primary/40'
            }`}
          >
            <span>{accountTypeLabel}</span>
            <ChevronDown className="w-3.5 h-3.5 opacity-60" />
          </button>

          {openDropdown === 'accountType' && (
            <div className="absolute left-0 top-full mt-2 w-52 bg-popover/95 backdrop-blur-md border border-border rounded-2xl p-1.5 shadow-2xl z-50 animate-scale-in text-xs space-y-0.5">
              <button
                type="button"
                onClick={() => {
                  setAccountTypeFilter('ALL')
                  setOpenDropdown(null)
                }}
                className="w-full flex items-center justify-between px-3 py-2 rounded-xl hover:bg-accent text-foreground transition-colors cursor-pointer text-left"
              >
                <div className="flex items-center gap-2 font-medium">
                  {accountTypeFilter === 'ALL' ? (
                    <Check className="w-4 h-4 text-primary" />
                  ) : (
                    <span className="w-4" />
                  )}
                  <span className={accountTypeFilter === 'ALL' ? 'text-primary font-bold' : ''}>
                    All
                  </span>
                </div>
                <span className="text-muted-foreground text-[11px] font-semibold">
                  {counts.total}
                </span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setAccountTypeFilter('Admin')
                  setOpenDropdown(null)
                }}
                className="w-full flex items-center justify-between px-3 py-2 rounded-xl hover:bg-accent text-foreground transition-colors cursor-pointer text-left"
              >
                <div className="flex items-center gap-2 font-medium">
                  {accountTypeFilter === 'Admin' ? (
                    <Check className="w-4 h-4 text-primary" />
                  ) : (
                    <span className="w-4" />
                  )}
                  <span className={accountTypeFilter === 'Admin' ? 'text-primary font-bold' : ''}>
                    Admin
                  </span>
                </div>
                <span className="text-muted-foreground text-[11px] font-semibold">
                  {counts.admin}
                </span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setAccountTypeFilter('Member')
                  setOpenDropdown(null)
                }}
                className="w-full flex items-center justify-between px-3 py-2 rounded-xl hover:bg-accent text-foreground transition-colors cursor-pointer text-left"
              >
                <div className="flex items-center gap-2 font-medium">
                  {accountTypeFilter === 'Member' ? (
                    <Check className="w-4 h-4 text-primary" />
                  ) : (
                    <span className="w-4" />
                  )}
                  <span className={accountTypeFilter === 'Member' ? 'text-primary font-bold' : ''}>
                    Member
                  </span>
                </div>
                <span className="text-muted-foreground text-[11px] font-semibold">
                  {counts.member}
                </span>
              </button>

              <div className="my-1 border-t border-border/60" />

              <button
                type="button"
                onClick={() => {
                  setAccountTypeFilter('Guest')
                  setOpenDropdown(null)
                }}
                className="w-full flex items-center justify-between px-3 py-2 rounded-xl hover:bg-accent text-foreground transition-colors cursor-pointer text-left"
              >
                <div className="flex items-center gap-2 font-medium">
                  {accountTypeFilter === 'Guest' ? (
                    <Check className="w-4 h-4 text-primary" />
                  ) : (
                    <span className="w-4" />
                  )}
                  <span className={accountTypeFilter === 'Guest' ? 'text-primary font-bold' : ''}>
                    Guest
                  </span>
                </div>
                <span className="text-muted-foreground text-[11px] font-semibold">
                  {counts.guest}
                </span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setAccountTypeFilter('Pending')
                  setOpenDropdown(null)
                }}
                className="w-full flex items-center justify-between px-3 py-2 rounded-xl hover:bg-accent text-foreground transition-colors cursor-pointer text-left"
              >
                <div className="flex items-center gap-2 font-medium">
                  {accountTypeFilter === 'Pending' ? (
                    <Check className="w-4 h-4 text-primary" />
                  ) : (
                    <span className="w-4" />
                  )}
                  <span className={accountTypeFilter === 'Pending' ? 'text-primary font-bold' : ''}>
                    Pending
                  </span>
                </div>
                <span className="text-muted-foreground text-[11px] font-semibold">
                  {counts.pending}
                </span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setAccountTypeFilter('Owner')
                  setOpenDropdown(null)
                }}
                className="w-full flex items-center justify-between px-3 py-2 rounded-xl hover:bg-accent text-foreground transition-colors cursor-pointer text-left"
              >
                <div className="flex items-center gap-2 font-medium">
                  {accountTypeFilter === 'Owner' ? (
                    <Check className="w-4 h-4 text-primary" />
                  ) : (
                    <span className="w-4" />
                  )}
                  <span className={accountTypeFilter === 'Owner' ? 'text-primary font-bold' : ''}>
                    Owner
                  </span>
                </div>
                <span className="text-muted-foreground text-[11px] font-semibold">
                  {counts.owner}
                </span>
              </button>
            </div>
          )}
        </div>

        {/* 4. Manager Dropdown (Image 4) */}
        <div className="relative">
          <button
            type="button"
            onClick={() => toggleDropdown('manager')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-medium border transition-all cursor-pointer shadow-2xs select-none active:scale-95 ${
              managerFilter !== 'ALL'
                ? 'bg-primary/10 border-primary text-primary font-semibold'
                : 'bg-card hover:bg-accent border-border text-foreground hover:border-primary/40'
            }`}
          >
            <span>{managerLabel}</span>
            <ChevronDown className="w-3.5 h-3.5 opacity-60" />
          </button>

          {openDropdown === 'manager' && (
            <div className="absolute left-0 top-full mt-2 w-64 bg-popover/95 backdrop-blur-md border border-border rounded-2xl p-2 shadow-2xl z-50 animate-scale-in text-xs space-y-2">
              {/* Search or enter email input */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search or enter email..."
                  value={managerSearch}
                  onChange={(e) => setManagerSearch(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-background border border-border text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  autoFocus
                />
              </div>

              <div className="max-h-52 overflow-y-auto space-y-0.5 custom-scrollbar pr-0.5">
                <button
                  type="button"
                  onClick={() => {
                    setManagerFilter('ALL')
                    setOpenDropdown(null)
                  }}
                  className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-left transition-colors cursor-pointer ${
                    managerFilter === 'ALL' ? 'bg-primary/15 text-primary font-bold' : 'hover:bg-accent text-foreground'
                  }`}
                >
                  <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center text-[10px] font-bold text-muted-foreground shrink-0">
                    <Users className="w-3.5 h-3.5" />
                  </div>
                  <span>All Managers</span>
                </button>

                {currentUserId && (
                  <button
                    type="button"
                    onClick={() => {
                      setManagerFilter(currentUserId)
                      setOpenDropdown(null)
                    }}
                    className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-left transition-colors cursor-pointer ${
                      managerFilter === currentUserId ? 'bg-primary/15 text-primary font-bold' : 'hover:bg-accent text-foreground'
                    }`}
                  >
                    <div className="w-6 h-6 rounded-full bg-rose-500 text-white flex items-center justify-center text-[10px] font-bold shrink-0 shadow-2xs">
                      Me
                    </div>
                    <span className="font-semibold">Me</span>
                  </button>
                )}

                {filteredManagers.map((m) => {
                  const isSelected = managerFilter === m.id
                  const initials = m.name?.substring(0, 2).toUpperCase() || 'MG'
                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => {
                        setManagerFilter(m.id)
                        setOpenDropdown(null)
                      }}
                      className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-left transition-colors cursor-pointer ${
                        isSelected ? 'bg-primary/15 text-primary font-bold' : 'hover:bg-accent text-foreground'
                      }`}
                    >
                      <div className="w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center text-[10px] font-bold shrink-0">
                        {initials}
                      </div>
                      <div className="truncate flex-1">
                        <div className="truncate font-medium">{m.name}</div>
                        <div className="text-[10px] text-muted-foreground truncate">{m.email}</div>
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>
          )}
        </div>

        {/* Separator */}
        <div className="h-5 w-px bg-border/80 hidden sm:block mx-0.5" />

        {/* 5. Sort Dropdown (Image 5) */}
        <div className="relative">
          <button
            type="button"
            onClick={() => toggleDropdown('sort')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-medium border transition-all cursor-pointer shadow-2xs select-none active:scale-95 ${
              sortOption !== 'DEFAULT'
                ? 'bg-primary/10 border-primary text-primary font-semibold'
                : 'bg-card hover:bg-accent border-border text-foreground hover:border-primary/40'
            }`}
          >
            <span>{sortLabels[sortOption]}</span>
            <ChevronDown className="w-3.5 h-3.5 opacity-60" />
          </button>

          {openDropdown === 'sort' && (
            <div className="absolute left-0 top-full mt-2 w-44 bg-popover/95 backdrop-blur-md border border-border rounded-2xl p-1.5 shadow-2xl z-50 animate-scale-in text-xs space-y-0.5">
              {(
                [
                  { key: 'DEFAULT', label: 'Default' },
                  { key: 'A_Z', label: 'A - Z' },
                  { key: 'Z_A', label: 'Z - A' },
                  { key: 'LAST_JOINED', label: 'Last Joined' },
                  { key: 'FIRST_JOINED', label: 'First Joined' },
                ] as const
              ).map(({ key, label }) => {
                const isSelected = sortOption === key
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => {
                      setSortOption(key)
                      setOpenDropdown(null)
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-accent text-foreground transition-colors cursor-pointer text-left"
                  >
                    {isSelected ? (
                      <Check className="w-4 h-4 text-primary" />
                    ) : (
                      <span className="w-4" />
                    )}
                    <span className={isSelected ? 'text-primary font-bold' : ''}>
                      {label}
                    </span>
                  </button>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Right Group: Search Box + View Switcher (Image 1) */}
      <div className="flex items-center gap-2">
        {/* Search Input */}
        <div className="relative flex-1 sm:w-56">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-7 py-1.5 rounded-full bg-card hover:bg-accent/40 border border-border text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary shadow-2xs transition-colors"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>

        {/* View Switcher: List vs Grid */}
        <div className="flex items-center p-0.5 rounded-full border border-border bg-card shadow-2xs">
          <button
            type="button"
            onClick={() => setViewMode('table')}
            className={`p-1.5 rounded-full transition-all cursor-pointer ${
              viewMode === 'table'
                ? 'bg-primary text-primary-foreground shadow-xs'
                : 'text-muted-foreground hover:text-foreground hover:bg-accent'
            }`}
            title="List / Table View"
          >
            <List className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => setViewMode('grid')}
            className={`p-1.5 rounded-full transition-all cursor-pointer ${
              viewMode === 'grid'
                ? 'bg-primary text-primary-foreground shadow-xs'
                : 'text-muted-foreground hover:text-foreground hover:bg-accent'
            }`}
            title="Grid / Cards View"
          >
            <LayoutGrid className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  )
}
