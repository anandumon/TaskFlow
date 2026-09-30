'use client'

import React, { useState, useMemo } from 'react'
import {
  X,
  MessageSquare,
  Calendar,
  CheckSquare,
  Mail,
  Plus,
  ChevronDown,
  ChevronRight,
  Search,
  SlidersHorizontal,
  Check,
  ExternalLink,
  Clock,
  AlertCircle,
  Network,
  UserCheck,
  Info,
  CalendarDays,
  Shield,
  Activity as ActivityIcon,
  RotateCcw,
} from 'lucide-react'
import { usePresenceStore } from '@/stores/presence-store'
import Link from 'next/link'

export interface UserProfilePanelProps {
  isOpen: boolean
  onClose: () => void
  initialTab?: ProfileTab
  user: {
    id: string
    name: string
    email: string
    avatarUrl?: string
    role?: string
    isOnline?: boolean
  } | null
  tasks?: any[]
  currentWorkspaceId?: string
  currentWorkspaceName?: string
  currentOrgId?: string
  currentOrgName?: string
  workspaceMembers?: any[]
  onOpenCalendar?: () => void
  onStartSyncUp?: () => void
}

export type ProfileTab = 'activity' | 'tasks' | 'comments' | 'org_chart' | 'calendar'

export function UserProfilePanel({
  isOpen,
  onClose,
  initialTab = 'activity',
  user,
  tasks = [],
  currentWorkspaceId,
  currentWorkspaceName,
  currentOrgId,
  currentOrgName,
  workspaceMembers = [],
  onOpenCalendar,
  onStartSyncUp,
}: UserProfilePanelProps) {
  const [activeTab, setActiveTab] = useState<ProfileTab>(initialTab)

  React.useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab)
    }
  }, [initialTab, isOpen])
  const [description, setDescription] = useState('')
  const [isEditingDesc, setIsEditingDesc] = useState(false)
  const [selectedManager, setSelectedManager] = useState<string | null>(null)
  const [managerDropdownOpen, setManagerDropdownOpen] = useState(false)
  const [timeOffSuccess, setTimeOffSuccess] = useState(false)

  // Tasks accordion expand states
  const [openAccordions, setOpenAccordions] = useState<Record<string, boolean>>({
    today: true,
    overdue: false,
    next: false,
    unscheduled: false,
    done: false,
    delegated: false,
  })

  // Comments search & filter
  const [commentSearch, setCommentSearch] = useState('')
  const [showResolvedComments, setShowResolvedComments] = useState(false)

  // Calendar connected states
  const [googleConnected, setGoogleConnected] = useState(false)
  const [outlookConnected, setOutlookConnected] = useState(false)

  const { isUserOnline } = usePresenceStore()

  // Filter tasks assigned to this user (called unconditionally before early return)
  const userTasks = useMemo(() => {
    if (!user) return []
    const targetId = String(user.id || '').trim().toLowerCase()
    const targetEmail = (user.email || '').toLowerCase().trim()
    const targetName = (user.name || '').toLowerCase().trim()
    const emailPrefix = targetEmail.split('@')[0]

    return tasks.filter((t) => {
      // Must belong to current workspace if currentWorkspaceId is provided
      if (currentWorkspaceId && t.workspaceId && String(t.workspaceId) !== String(currentWorkspaceId)) {
        return false
      }

      if (t.assigneeId && String(t.assigneeId).toLowerCase().includes(targetId)) return true
      if (t.assigneeName) {
        const aName = t.assigneeName.toLowerCase()
        if (targetName && (aName.includes(targetName) || targetName.includes(aName))) return true
        if (emailPrefix && (aName.includes(emailPrefix) || emailPrefix.includes(aName))) return true
      }
      if (t.assignees) {
        const aList = t.assignees.toLowerCase()
        if (targetName && aList.includes(targetName)) return true
        if (emailPrefix && aList.includes(emailPrefix)) return true
      }
      return false
    })
  }, [tasks, user, currentWorkspaceId])

  if (!isOpen || !user) return null

  const isOnline = isUserOnline(user.id, user.email) || Boolean(user.isOnline)
  const userInitials = (user.name || user.email || 'U')
    .slice(0, 2)
    .toUpperCase()

  const toggleAccordion = (key: string) => {
    setOpenAccordions((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  // Categorize user tasks
  const todayTasks = userTasks.filter((t) => t.status === 'IN_PROGRESS' || t.status === 'REVIEW')
  const overdueTasks = userTasks.filter((t) => {
    if (!t.dueDate) return false
    return new Date(t.dueDate).getTime() < Date.now() && t.status !== 'DONE'
  })
  const nextTasks = userTasks.filter((t) => t.status === 'TODO' || t.status === 'BACKLOG')
  const unscheduledTasks = userTasks.filter((t) => !t.dueDate && t.status !== 'DONE')
  const doneTasks = userTasks.filter((t) => t.status === 'DONE' || t.status === 'COMPLETED')
  const delegatedTasks = userTasks.filter((t) => t.reviewerName || t.status === 'REVIEW')

  const totalTasksCount = userTasks.length
  const commentsCount = 0

  const managerObj = workspaceMembers.find((m) => m.id === selectedManager || m.email === selectedManager)

  return (
    <aside className="w-full md:w-[380px] lg:w-[410px] shrink-0 border-l border-border bg-sidebar/95 backdrop-blur-xl flex flex-col h-full z-20 shadow-2xl transition-all duration-300">
      {/* ── TOP HEADER / USER AVATAR & BASIC DETAILS ── */}
      <div className="p-4 sm:p-5 border-b border-border/70 space-y-3.5 shrink-0 bg-card/40">
        <div className="flex items-start justify-between gap-3">
          {/* Large Square Avatar (Purple Gradient) */}
          <div className="relative shrink-0">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white flex items-center justify-center font-bold text-2xl shadow-md shadow-indigo-500/20">
              {userInitials}
            </div>
            <span
              className={`absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full border-2 border-card ${
                isOnline
                  ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]'
                  : 'bg-muted-foreground/60'
              }`}
            />
          </div>

          {/* User Name/Email & Actions */}
          <div className="flex-1 min-w-0 pt-0.5">
            <div className="flex items-center justify-between gap-1">
              <h2 className="font-bold text-sm text-foreground truncate flex items-center gap-1.5" title={user.email || user.name}>
                <span>{user.name || user.email?.split('@')[0]}</span>
                <ChevronDown className="w-3.5 h-3.5 text-muted-foreground shrink-0 cursor-pointer" />
              </h2>
              <button
                type="button"
                onClick={onClose}
                className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-all cursor-pointer"
                title="Close profile panel"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Editable Description */}
            <div className="mt-1">
              {isEditingDesc ? (
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  onBlur={() => setIsEditingDesc(false)}
                  onKeyDown={(e) => e.key === 'Enter' && setIsEditingDesc(false)}
                  autoFocus
                  placeholder="Add description..."
                  className="w-full text-xs bg-accent/60 border border-primary/40 rounded px-1.5 py-0.5 text-foreground outline-none"
                />
              ) : (
                <p
                  onClick={() => setIsEditingDesc(true)}
                  className="text-xs text-muted-foreground hover:text-foreground cursor-pointer truncate"
                  title="Click to edit description"
                >
                  {description || 'Add description...'}
                </p>
              )}
            </div>

            {/* Status indicator pill */}
            <div className="flex items-center gap-2 mt-1.5">
              <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-muted-foreground/60'
                  }`}
                />
                <span className={isOnline ? 'text-emerald-500 font-medium' : ''}>
                  {isOnline ? 'Active now' : 'Offline'}
                </span>
              </span>
            </div>
          </div>
        </div>

        {/* Action button row */}
        <div className="flex items-center gap-2 pt-1">
          <button
            type="button"
            className="p-1.5 rounded-lg border border-border bg-background hover:bg-accent text-muted-foreground hover:text-foreground transition-all cursor-pointer"
            title="Send direct message"
          >
            <MessageSquare className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* ── TABS NAVIGATION (Activity, Tasks, Comments, Org Chart, Calendar) ── */}
      <div className="flex items-center border-b border-border px-3 bg-muted/20 shrink-0 overflow-x-auto no-scrollbar text-xs">
        <button
          type="button"
          onClick={() => setActiveTab('activity')}
          className={`px-3 py-2.5 font-medium whitespace-nowrap transition-colors relative cursor-pointer ${
            activeTab === 'activity'
              ? 'text-foreground font-semibold after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-foreground'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          Activity
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('tasks')}
          className={`px-3 py-2.5 font-medium whitespace-nowrap transition-colors relative cursor-pointer ${
            activeTab === 'tasks'
              ? 'text-foreground font-semibold after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-foreground'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          Tasks ({totalTasksCount})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('comments')}
          className={`px-3 py-2.5 font-medium whitespace-nowrap transition-colors relative cursor-pointer ${
            activeTab === 'comments'
              ? 'text-foreground font-semibold after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-foreground'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          Comments ({commentsCount})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('org_chart')}
          className={`px-3 py-2.5 font-medium whitespace-nowrap transition-colors relative cursor-pointer ${
            activeTab === 'org_chart'
              ? 'text-foreground font-semibold after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-foreground'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          Org Chart
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('calendar')}
          className={`px-3 py-2.5 font-medium whitespace-nowrap transition-colors relative cursor-pointer ${
            activeTab === 'calendar'
              ? 'text-foreground font-semibold after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-foreground'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          Calendar
        </button>
      </div>

      {/* ── TAB CONTENT BODY ── */}
      <div className="flex-1 overflow-y-auto p-4 custom-scrollbar space-y-4">
        {/* ══════════════ TAB 1: ACTIVITY ══════════════ */}
        {activeTab === 'activity' && (
          <div className="space-y-4">
            {/* Add time off */}
            <button
              type="button"
              onClick={() => {
                setTimeOffSuccess(true)
                setTimeout(() => setTimeOffSuccess(false), 3000)
              }}
              className="flex items-center gap-2 text-xs font-medium text-foreground hover:text-primary transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add time off</span>
            </button>
            {timeOffSuccess && (
              <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-center gap-1.5 animate-fadeIn">
                <Check className="w-3.5 h-3.5" />
                <span>Time off scheduled successfully.</span>
              </div>
            )}

            {/* Email Row */}
            <div className="flex items-center gap-2.5 text-xs text-foreground py-1">
              <Mail className="w-4 h-4 text-muted-foreground shrink-0" />
              <span className="truncate">{user.email || 'No email provided'}</span>
            </div>

            {/* Select Manager Dropdown */}
            <div className="relative">
              <div
                onClick={() => setManagerDropdownOpen(!managerDropdownOpen)}
                className="flex items-center gap-2.5 text-xs text-muted-foreground hover:text-foreground py-1 cursor-pointer transition-colors"
              >
                <UserCheck className="w-4 h-4 shrink-0" />
                <span className="truncate">
                  {managerObj ? managerObj.name || managerObj.email : 'Select manager'}
                </span>
                <ChevronDown className="w-3.5 h-3.5 ml-auto" />
              </div>

              {managerDropdownOpen && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-popover border border-border rounded-xl shadow-xl z-30 p-1 space-y-0.5">
                  <div
                    onClick={() => {
                      setSelectedManager(null)
                      setManagerDropdownOpen(false)
                    }}
                    className="px-2.5 py-1.5 rounded-lg text-xs hover:bg-accent text-muted-foreground cursor-pointer"
                  >
                    No manager
                  </div>
                  {workspaceMembers
                    .filter((m) => m.id !== user.id)
                    .map((m) => (
                      <div
                        key={m.id}
                        onClick={() => {
                          setSelectedManager(m.id)
                          setManagerDropdownOpen(false)
                        }}
                        className="px-2.5 py-1.5 rounded-lg text-xs hover:bg-accent text-foreground flex items-center justify-between cursor-pointer"
                      >
                        <span className="truncate">{m.name || m.email}</span>
                        {selectedManager === m.id && <Check className="w-3 h-3 text-primary" />}
                      </div>
                    ))}
                </div>
              )}
            </div>

            <div className="border-t border-border/60 pt-4 space-y-3">
              <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">Activity</h3>

              {/* Activity empty card matching Image 1 */}
              <div className="p-6 rounded-2xl border border-border/50 bg-card/30 flex flex-col items-center justify-center text-center space-y-3">
                <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center">
                  <ActivityIcon className="w-5 h-5 animate-pulse" />
                </div>
                <p className="text-xs text-muted-foreground max-w-[240px] leading-relaxed">
                  Activity will appear here once this user joins the Workspace
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ══════════════ TAB 2: TASKS ══════════════ */}
        {activeTab === 'tasks' && (
          <div className="space-y-3">
            {(currentWorkspaceName || currentOrgName) && (
              <div className="px-3 py-2 rounded-xl bg-card/60 border border-border/60 flex items-center justify-between text-[11px]">
                <span className="text-muted-foreground font-medium">Workspace Scope</span>
                <span className="font-semibold text-foreground truncate max-w-[210px]">
                  {currentOrgName ? `${currentOrgName} • ` : ''}{currentWorkspaceName || 'Workspace'}
                </span>
              </div>
            )}
            {/* Accordion 1: Today */}
            <div className="rounded-xl border border-border/60 overflow-hidden bg-card/40">
              <button
                type="button"
                onClick={() => toggleAccordion('today')}
                className="w-full flex items-center justify-between p-3 text-xs font-semibold text-foreground hover:bg-accent/50 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <span>Today</span>
                  <span className="text-muted-foreground font-normal">{todayTasks.length}</span>
                </div>
                {openAccordions.today ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
              </button>

              {openAccordions.today && (
                <div className="px-3 pb-3 pt-1 border-t border-border/40">
                  {todayTasks.length === 0 ? (
                    <p className="text-[11px] text-muted-foreground py-2 text-center">
                      Tasks and reminders assigned will show here.
                    </p>
                  ) : (
                    <div className="space-y-1.5">
                      {todayTasks.map((t) => (
                        <div
                          key={t.id}
                          className="p-2 rounded-lg bg-background/60 hover:bg-accent border border-border/40 text-xs flex items-center justify-between gap-2 transition-all cursor-pointer"
                        >
                          <div className="flex items-center gap-2 truncate">
                            <CheckSquare className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                            <span className="truncate text-foreground font-medium">{t.title}</span>
                          </div>
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400 font-semibold shrink-0">
                            {t.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Accordion 2: Overdue */}
            <div className="rounded-xl border border-border/60 overflow-hidden bg-card/40">
              <button
                type="button"
                onClick={() => toggleAccordion('overdue')}
                className="w-full flex items-center justify-between p-3 text-xs font-semibold text-foreground hover:bg-accent/50 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <span>Overdue</span>
                  <span className="text-muted-foreground font-normal">{overdueTasks.length}</span>
                </div>
                {openAccordions.overdue ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
              </button>
              {openAccordions.overdue && (
                <div className="px-3 pb-3 pt-1 border-t border-border/40 space-y-1.5">
                  {overdueTasks.length === 0 ? (
                    <p className="text-[11px] text-muted-foreground py-2 text-center">No overdue tasks.</p>
                  ) : (
                    overdueTasks.map((t) => (
                      <div
                        key={t.id}
                        className="p-2 rounded-lg bg-background/60 hover:bg-accent border border-rose-500/20 text-xs flex items-center justify-between gap-2 transition-all cursor-pointer"
                      >
                        <div className="flex items-center gap-2 truncate">
                          <AlertCircle className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                          <span className="truncate text-foreground font-medium">{t.title}</span>
                        </div>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-rose-500/10 text-rose-400 font-semibold shrink-0">
                          Overdue
                        </span>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>

            {/* Accordion 3: Next */}
            <div className="rounded-xl border border-border/60 overflow-hidden bg-card/40">
              <button
                type="button"
                onClick={() => toggleAccordion('next')}
                className="w-full flex items-center justify-between p-3 text-xs font-semibold text-foreground hover:bg-accent/50 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <span>Next</span>
                  <span className="text-muted-foreground font-normal">{nextTasks.length}</span>
                </div>
                {openAccordions.next ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
              </button>
              {openAccordions.next && (
                <div className="px-3 pb-3 pt-1 border-t border-border/40 space-y-1.5">
                  {nextTasks.length === 0 ? (
                    <p className="text-[11px] text-muted-foreground py-2 text-center">No upcoming tasks.</p>
                  ) : (
                    nextTasks.map((t) => (
                      <div
                        key={t.id}
                        className="p-2 rounded-lg bg-background/60 hover:bg-accent border border-border/40 text-xs flex items-center justify-between gap-2 transition-all cursor-pointer"
                      >
                        <div className="flex items-center gap-2 truncate">
                          <CheckSquare className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                          <span className="truncate text-foreground font-medium">{t.title}</span>
                        </div>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground font-semibold shrink-0">
                          {t.status}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>

            {/* Accordion 4: Unscheduled */}
            <div className="rounded-xl border border-border/60 overflow-hidden bg-card/40">
              <button
                type="button"
                onClick={() => toggleAccordion('unscheduled')}
                className="w-full flex items-center justify-between p-3 text-xs font-semibold text-foreground hover:bg-accent/50 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <span>Unscheduled</span>
                  <span className="text-muted-foreground font-normal">{unscheduledTasks.length}</span>
                </div>
                {openAccordions.unscheduled ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
              </button>
              {openAccordions.unscheduled && (
                <div className="px-3 pb-3 pt-1 border-t border-border/40 space-y-1.5">
                  {unscheduledTasks.length === 0 ? (
                    <p className="text-[11px] text-muted-foreground py-2 text-center">No unscheduled tasks.</p>
                  ) : (
                    unscheduledTasks.slice(0, 10).map((t) => (
                      <div
                        key={t.id}
                        className="p-2 rounded-lg bg-background/60 hover:bg-accent border border-border/40 text-xs flex items-center justify-between gap-2 transition-all cursor-pointer"
                      >
                        <div className="flex items-center gap-2 truncate">
                          <CheckSquare className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                          <span className="truncate text-foreground font-medium">{t.title}</span>
                        </div>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-400 font-semibold shrink-0">
                          {t.tag || 'Task'}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>

            {/* Accordion 5: Done */}
            <div className="rounded-xl border border-border/60 overflow-hidden bg-card/40">
              <button
                type="button"
                onClick={() => toggleAccordion('done')}
                className="w-full flex items-center justify-between p-3 text-xs font-semibold text-foreground hover:bg-accent/50 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <span>Done</span>
                  <span className="text-muted-foreground font-normal">{doneTasks.length}</span>
                </div>
                {openAccordions.done ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
              </button>
              {openAccordions.done && (
                <div className="px-3 pb-3 pt-1 border-t border-border/40 space-y-1.5">
                  {doneTasks.length === 0 ? (
                    <p className="text-[11px] text-muted-foreground py-2 text-center">No completed tasks yet.</p>
                  ) : (
                    doneTasks.map((t) => (
                      <div
                        key={t.id}
                        className="p-2 rounded-lg bg-background/60 hover:bg-accent border border-emerald-500/20 text-xs flex items-center justify-between gap-2 line-through text-muted-foreground"
                      >
                        <div className="flex items-center gap-2 truncate">
                          <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                          <span className="truncate">{t.title}</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>

            {/* Accordion 6: Delegated */}
            <div className="rounded-xl border border-border/60 overflow-hidden bg-card/40">
              <button
                type="button"
                onClick={() => toggleAccordion('delegated')}
                className="w-full flex items-center justify-between p-3 text-xs font-semibold text-foreground hover:bg-accent/50 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <span>Delegated</span>
                  <span className="text-muted-foreground font-normal">{delegatedTasks.length}</span>
                </div>
                {openAccordions.delegated ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>
        )}

        {/* ══════════════ TAB 3: COMMENTS ══════════════ */}
        {activeTab === 'comments' && (
          <div className="space-y-4">
            {/* Filter Sub-bar matching Image 3 */}
            <div className="flex items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-border bg-background hover:bg-accent text-foreground transition-all cursor-pointer"
                >
                  <SlidersHorizontal className="w-3 h-3 text-muted-foreground" />
                  <span>Filter</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowResolvedComments(!showResolvedComments)}
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border transition-all cursor-pointer ${
                    showResolvedComments
                      ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-400 font-medium'
                      : 'border-border bg-background hover:bg-accent text-foreground'
                  }`}
                >
                  <Check className="w-3 h-3" />
                  <span>Resolved</span>
                </button>
              </div>

              <div className="relative">
                <Search className="w-3 h-3 absolute left-2 top-2 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search"
                  value={commentSearch}
                  onChange={(e) => setCommentSearch(e.target.value)}
                  className="w-24 focus:w-32 transition-all pl-6 pr-2 py-1 text-xs bg-background border border-border rounded-lg outline-none text-foreground placeholder:text-muted-foreground"
                />
              </div>
            </div>

            {/* Empty state matching Image 3 */}
            <div className="p-8 rounded-2xl flex flex-col items-center justify-center text-center space-y-3.5">
              <div className="w-14 h-14 rounded-2xl bg-muted/30 border border-border/50 text-muted-foreground flex items-center justify-center">
                <RotateCcw className="w-6 h-6 stroke-[1.5]" />
              </div>
              <div className="space-y-1">
                <h4 className="text-sm font-semibold text-foreground">No results found</h4>
              </div>
              <button
                type="button"
                onClick={() => {
                  setCommentSearch('')
                  setShowResolvedComments(false)
                }}
                className="px-3 py-1.5 rounded-lg border border-border bg-card hover:bg-accent text-xs font-medium text-foreground transition-all cursor-pointer"
              >
                Clear filters
              </button>
            </div>
          </div>
        )}

        {/* ══════════════ TAB 4: ORG CHART ══════════════ */}
        {activeTab === 'org_chart' && (
          <div className="space-y-6 pt-2">
            {/* Tree Hierarchy matching Image 4 */}
            <div className="flex flex-col items-center">
              {/* Top Box: Manager */}
              <div className="px-5 py-2 rounded-xl bg-indigo-600/20 border border-indigo-500/30 text-indigo-400 font-medium text-xs shadow-sm">
                {managerObj ? managerObj.name || managerObj.email : 'No manager'}
              </div>

              {/* Dashed connector line with downward arrow */}
              <div className="w-px h-10 border-l-2 border-dashed border-muted-foreground/30 relative my-1">
                <ChevronDown className="w-3.5 h-3.5 text-muted-foreground/60 absolute -bottom-2 -left-[7px]" />
              </div>

              {/* Current User Card */}
              <div className="w-full max-w-[280px] p-3 rounded-2xl border border-border bg-card/70 backdrop-blur-md shadow-md flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white flex items-center justify-center font-bold text-xs shrink-0">
                  {userInitials}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="font-bold text-xs text-foreground truncate" title={user.email}>
                    {user.email || user.name}
                  </div>
                  <div
                    onClick={() => {
                      setActiveTab('activity')
                      setManagerDropdownOpen(true)
                    }}
                    className="text-[11px] text-muted-foreground hover:text-primary flex items-center gap-1 cursor-pointer transition-colors"
                  >
                    <span>{managerObj ? managerObj.name : 'Select manager'}</span>
                    <ChevronDown className="w-3 h-3" />
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Banner Card matching Image 4 */}
            <div className="p-4 rounded-2xl border border-border/60 bg-card/40 flex items-center justify-between gap-3 shadow-sm">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                  <Network className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <h4 className="text-xs font-bold text-foreground truncate">Explore the full org chart</h4>
                  <p className="text-[11px] text-muted-foreground truncate">
                    {workspaceMembers.length || 1} people in this organization
                  </p>
                </div>
              </div>
              <Link
                href="/app/teams"
                className="px-3 py-1.5 rounded-xl border border-border bg-background hover:bg-accent text-xs font-semibold text-foreground flex items-center gap-1 shrink-0 transition-all cursor-pointer"
              >
                <span>Explore</span>
                <ExternalLink className="w-3 h-3" />
              </Link>
            </div>
          </div>
        )}

        {/* ══════════════ TAB 5: CALENDAR ══════════════ */}
        {activeTab === 'calendar' && (
          <div className="space-y-5">
            {/* Header: No upcoming time off & Add time off */}
            <div className="flex items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <span>No upcoming time off</span>
                <Info className="w-3.5 h-3.5" />
              </div>
              <button
                type="button"
                onClick={() => {
                  setTimeOffSuccess(true)
                  setTimeout(() => setTimeOffSuccess(false), 3000)
                }}
                className="flex items-center gap-1 font-semibold text-foreground hover:text-primary transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add time off</span>
              </button>
            </div>

            {/* Empty state illustration with dark calendar icon */}
            <div className="p-6 rounded-2xl flex flex-col items-center justify-center text-center space-y-3">
              <div className="w-16 h-16 rounded-2xl bg-muted/30 border border-border/50 flex items-center justify-center text-muted-foreground relative">
                <CalendarDays className="w-8 h-8 stroke-[1.5]" />
                <Search className="w-3.5 h-3.5 text-muted-foreground absolute -bottom-1 -right-1 bg-card rounded-full p-0.5" />
              </div>
              <p className="text-xs text-muted-foreground max-w-[260px] leading-relaxed">
                Connect your calendar to view upcoming events and join your next call
              </p>
            </div>

            {/* Calendar Integration Connect Buttons matching Image 5 */}
            <div className="space-y-2.5">
              {/* Google Calendar */}
              <div className="p-3 rounded-2xl border border-border/60 bg-card/40 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-6 h-6 rounded-md flex items-center justify-center">
                    <svg className="w-5 h-5" viewBox="0 0 24 24">
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
                  </div>
                  <span className="text-xs font-semibold text-foreground">Google Calendar</span>
                </div>
                <button
                  type="button"
                  onClick={() => setGoogleConnected(!googleConnected)}
                  className={`px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${
                    googleConnected
                      ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-400'
                      : 'border-border bg-background hover:bg-accent text-foreground'
                  }`}
                >
                  {googleConnected ? 'Connected' : 'Connect'}
                </button>
              </div>

              {/* Microsoft Outlook */}
              <div className="p-3 rounded-2xl border border-border/60 bg-card/40 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-6 h-6 rounded-md flex items-center justify-center bg-[#0078D4] text-white font-bold text-xs">
                    O
                  </div>
                  <span className="text-xs font-semibold text-foreground">Microsoft Outlook</span>
                </div>
                <button
                  type="button"
                  onClick={() => setOutlookConnected(!outlookConnected)}
                  className={`px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${
                    outlookConnected
                      ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-400'
                      : 'border-border bg-background hover:bg-accent text-foreground'
                  }`}
                >
                  {outlookConnected ? 'Connected' : 'Connect'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </aside>
  )
}
