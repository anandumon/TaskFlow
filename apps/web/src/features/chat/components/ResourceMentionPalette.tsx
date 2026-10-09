'use client'

import React, { useState, useEffect, useRef, useMemo } from 'react'
import {
  Users,
  CheckCircle2,
  FileText,
  Bot,
  FolderOpen,
  Video,
  Sparkles,
  Plus,
  ArrowUpRight,
  Search,
  ExternalLink,
  Layers,
  ChevronRight,
  Hash,
  Radio,
} from 'lucide-react'
import { DMContact, useChatStore } from '@/stores/chat-store'
import { useDocStore } from '@/stores/doc-store'
import { usePresenceStore } from '@/stores/presence-store'

export interface ResourceMentionPaletteProps {
  isOpen: boolean
  searchQuery: string
  members: DMContact[]
  tasks?: Array<{
    id: string
    title: string
    status?: string
    category?: string
    branchName?: string
    subtasks?: string
    assigneeId?: string
    assigneeName?: string
    assignees?: string
    tag?: string
  }>
  targetType?: 'channel' | 'dm'
  activeDMUser?: DMContact | null
  currentUserId?: string
  onClose: () => void
  onSelectPerson: (person: DMContact) => void
  onSelectTask: (task: { id: string; title: string }) => void
  onSelectDoc: (doc: { id: string; title: string; url?: string; type?: string }) => void
  onSelectAgent: (agent: { id: string; name: string; description: string }) => void
  onOpenGoogleDrive: () => void
  onOpenDoc?: () => void
}

type TabKey = 'all' | 'tasks' | 'docs' | 'agents' | 'people' | 'teams' | 'drive'

interface ServiceGroupItem {
  id: string
  serviceName: string
  taskCount: number
  tasks: Array<{ id: string; title: string; status?: string }>
  isReceiverService: boolean
  firstTaskId: string
}

// Helper: Extract all service names associated with a task
function extractServicesFromTask(task: any): string[] {
  const services: string[] = []

  // 1. Try branchName JSON array (TaskFlow multi-service structure)
  if (task.branchName) {
    try {
      const parsed = JSON.parse(task.branchName)
      if (Array.isArray(parsed)) {
        for (const item of parsed) {
          if (item?.serviceName && typeof item.serviceName === 'string') {
            const trimmed = item.serviceName.trim()
            if (trimmed && !services.includes(trimmed)) {
              services.push(trimmed)
            }
          }
        }
      }
    } catch {}
  }

  // 2. Try subtasks JSON array
  if (task.subtasks) {
    try {
      const parsed = JSON.parse(task.subtasks)
      if (Array.isArray(parsed)) {
        for (const item of parsed) {
          if (item?.serviceName && typeof item.serviceName === 'string') {
            const trimmed = item.serviceName.trim()
            if (trimmed && !services.includes(trimmed)) {
              services.push(trimmed)
            }
          }
        }
      }
    } catch {}
  }

  // 3. Fallback: If branchName is plain string and not JSON
  if (services.length === 0 && task.branchName && typeof task.branchName === 'string' && !task.branchName.startsWith('[')) {
    const trimmed = task.branchName.trim()
    if (trimmed) services.push(trimmed)
  }

  // 4. Fallback to tag or title
  if (services.length === 0) {
    if (task.tag && !['Feature', 'Task', 'Frontend', 'Backend', 'Bug'].includes(task.tag)) {
      services.push(task.tag)
    } else {
      services.push(task.title || 'service')
    }
  }

  return services
}

// Helper: Check whether a task is assigned to a specific user
function isTaskAssignedToUser(task: any, targetUser?: DMContact | null): boolean {
  if (!targetUser) return false
  const targetId = String(targetUser.id || '').trim()
  const targetEmail = (targetUser.email || '').toLowerCase().trim()
  const targetName = (targetUser.name || '').toLowerCase().trim()
  const emailPrefix = targetEmail.split('@')[0]

  // Match by ID
  if (task.assigneeId && (String(task.assigneeId) === targetId || targetId.includes(String(task.assigneeId)))) {
    return true
  }

  // Match by assigneeName
  if (task.assigneeName) {
    const aName = task.assigneeName.toLowerCase().trim()
    if (
      (targetName && (aName.includes(targetName) || targetName.includes(aName))) ||
      (emailPrefix && (aName.includes(emailPrefix) || emailPrefix.includes(aName)))
    ) {
      return true
    }
  }

  // Match by assignees
  if (task.assignees) {
    const aList = task.assignees.toLowerCase().trim()
    if (
      (targetName && aList.includes(targetName)) ||
      (emailPrefix && aList.includes(emailPrefix))
    ) {
      return true
    }
  }

  return false
}

export function ResourceMentionPalette({
  isOpen,
  searchQuery,
  members,
  tasks = [],
  targetType = 'channel',
  activeDMUser,
  currentUserId,
  onClose,
  onSelectPerson,
  onSelectTask,
  onSelectDoc,
  onSelectAgent,
  onOpenGoogleDrive,
  onOpenDoc,
}: ResourceMentionPaletteProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [activeTab, setActiveTab] = useState<TabKey>('all')
  const { isUserOnline } = usePresenceStore()
  const { docs } = useDocStore()
  const { messages, activeChannel } = useChatStore()

  // AI Agents
  const defaultAgents = useMemo(
    () => [
      {
        id: 'agent-brain',
        name: 'Brain²',
        badge: 'Payment Hub AI',
        description: 'Ask, Build, Create',
      },
      {
        id: 'agent-qa',
        name: 'Bug Hunter AI',
        badge: 'QA Automator',
        description: 'Analyze bugs & reproduce triage logs',
      },
    ],
    []
  )

  // Teams & Squads
  const sampleTeams = useMemo(
    () => [
      { id: 'team-eng', name: 'Engineering Squad', membersCount: 6 },
      { id: 'team-des', name: 'Product & Design', membersCount: 3 },
      { id: 'team-sec', name: 'Security & DevOps', membersCount: 2 },
    ],
    []
  )

  // Click outside listener
  useEffect(() => {
    if (!isOpen) return
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        onClose()
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isOpen, onClose])

  const cleanQuery = searchQuery.replace(/^@/, '').toLowerCase().trim()

  // Filtered members with real-time online status
  const filteredMembers = useMemo(() => {
    const list = members.map((m) => ({
      ...m,
      isOnline: isUserOnline(m.id, m.email),
    }))
    if (!cleanQuery) return list
    return list.filter(
      (m) =>
        m.name.toLowerCase().includes(cleanQuery) ||
        m.email.toLowerCase().includes(cleanQuery)
    )
  }, [members, cleanQuery, isUserOnline])

  /**
   * Task processing:
   * When in personal chat (targetType === 'dm' and activeDMUser is present):
   * 1. Extract tasks assigned to the receiver (activeDMUser), NOT the sender.
   * 2. Show service name instead of task name from DB.
   * 3. Show count of number of tasks assigned to receiver for each service.
   * 4. Display receiver services at the top.
   * In general chat / channels:
   * Keep standard workspace task listing without receiver-specific sorting.
   */
  const { processedTasks, isPersonalDmMode } = useMemo(() => {
    const isPersonalDm = targetType === 'dm' && Boolean(activeDMUser)

    if (isPersonalDm && activeDMUser) {
      // 1. Find all tasks assigned to the receiver
      const receiverTasks = tasks.filter((t) => isTaskAssignedToUser(t, activeDMUser))
      const otherTasks = tasks.filter((t) => !isTaskAssignedToUser(t, activeDMUser))

      // 2. Group receiver tasks by service name and count them
      const receiverServiceMap = new Map<string, { serviceName: string; taskCount: number; tasks: any[] }>()

      receiverTasks.forEach((t) => {
        const services = extractServicesFromTask(t)
        services.forEach((srv) => {
          const existing = receiverServiceMap.get(srv) || {
            serviceName: srv,
            taskCount: 0,
            tasks: [],
          }
          existing.taskCount += 1
          existing.tasks.push(t)
          receiverServiceMap.set(srv, existing)
        })
      })

      // Convert to items list sorted by taskCount descending
      const receiverItems: ServiceGroupItem[] = Array.from(receiverServiceMap.values())
        .sort((a, b) => b.taskCount - a.taskCount)
        .map((group, idx) => ({
          id: `srv-rec-${idx}-${group.serviceName}`,
          serviceName: group.serviceName,
          taskCount: group.taskCount,
          tasks: group.tasks,
          isReceiverService: true,
          firstTaskId: group.tasks[0]?.id || `task-${idx}`,
        }))

      // Remaining tasks not assigned to receiver
      const otherItems: ServiceGroupItem[] = otherTasks.map((t, idx) => {
        const srvs = extractServicesFromTask(t)
        const primaryService = srvs[0] || t.title
        return {
          id: `srv-oth-${t.id || idx}`,
          serviceName: primaryService !== t.title ? primaryService : t.title,
          taskCount: 1,
          tasks: [t],
          isReceiverService: false,
          firstTaskId: t.id,
        }
      })

      // Receiver services AT THE VERY TOP
      const allCombined = [...receiverItems, ...otherItems]

      // Filter by search query if any
      const filtered = cleanQuery
        ? allCombined.filter(
            (item) =>
              item.serviceName.toLowerCase().includes(cleanQuery) ||
              item.tasks.some((t) => t.title.toLowerCase().includes(cleanQuery))
          )
        : allCombined

      return { processedTasks: filtered, isPersonalDmMode: true }
    }

    // ── GENERAL CHAT / CHANNELS (Standard view, no receiver grouping) ──
    const standardList: ServiceGroupItem[] = tasks.map((t, idx) => ({
      id: t.id || `task-${idx}`,
      serviceName: t.title,
      taskCount: 1,
      tasks: [t],
      isReceiverService: false,
      firstTaskId: t.id,
    }))

    const filtered = cleanQuery
      ? standardList.filter((item) => item.serviceName.toLowerCase().includes(cleanQuery))
      : standardList

    return { processedTasks: filtered, isPersonalDmMode: false }
  }, [tasks, targetType, activeDMUser, cleanQuery])

  // Filter docs: show only docs that actually exist in the active chat (General channel or DM)
  const chatDocs = useMemo(() => {
    const list: Array<{ id: string; title: string; location?: string; authorName?: string; updatedAt?: string }> = []
    const seen = new Set<string>()

    // 1. Scan messages in the current chat for docs
    const currentMessages = messages || []
    currentMessages.forEach((msg) => {
      const isCurrentChat =
        targetType === 'channel'
          ? !msg.recipientId || (activeChannel?.id && msg.channelId === activeChannel.id)
          : activeDMUser && (msg.recipientId === activeDMUser.id || msg.senderId === activeDMUser.id)

      if (isCurrentChat && msg.attachments) {
        msg.attachments.forEach((att: any) => {
          if (att.type === 'doc' || att.type === 'gdoc' || Boolean(att.docId)) {
            const docTitle = att.title || att.docId
            if (docTitle && !seen.has(docTitle.toLowerCase())) {
              seen.add(docTitle.toLowerCase())
              list.push({
                id: att.docId || docTitle,
                title: docTitle,
                location:
                  targetType === 'channel'
                    ? activeChannel?.name
                      ? `#${activeChannel.name}`
                      : '#General'
                    : `DM with ${activeDMUser?.name || 'User'}`,
                authorName: msg.senderName,
                updatedAt: msg.createdAt,
              })
            }
          }
        })
      }
    })

    // 2. Also include docs from useDocStore associated with this channel or DM
    docs.forEach((d) => {
      const lowerTitle = d.title.toLowerCase()
      const lowerId = d.id.toLowerCase()
      if (seen.has(lowerTitle) || seen.has(lowerId)) return

      let matches = false
      if (targetType === 'channel') {
        const channelName = activeChannel?.name?.toLowerCase() || 'general'
        const docLoc = (d.location || '').toLowerCase()
        if (
          d.channelId === activeChannel?.id ||
          docLoc.includes(channelName) ||
          docLoc === '#general' ||
          docLoc === 'general chat'
        ) {
          matches = true
        }
      } else if (targetType === 'dm' && activeDMUser) {
        const dmName = activeDMUser.name.toLowerCase()
        const docLoc = (d.location || '').toLowerCase()
        if (d.recipientId === activeDMUser.id || docLoc.includes(dmName)) {
          matches = true
        }
      }

      if (matches) {
        seen.add(lowerTitle)
        seen.add(lowerId)
        list.push({
          id: d.id,
          title: d.title,
          location: d.location,
          authorName: d.authorName,
          updatedAt: d.updatedAt,
        })
      }
    })

    return list
  }, [messages, docs, targetType, activeChannel, activeDMUser])

  const filteredDocs = useMemo(() => {
    if (!cleanQuery) return chatDocs
    return chatDocs.filter((d) => d.title.toLowerCase().includes(cleanQuery))
  }, [chatDocs, cleanQuery])

  if (!isOpen) return null

  return (
    <div
      ref={containerRef}
      className="absolute bottom-full left-2 mb-2 w-84 sm:w-96 max-h-[460px] bg-card/95 backdrop-blur-xl border border-border/80 rounded-3xl shadow-2xl overflow-hidden flex flex-col z-50 animate-scale-in select-none text-xs"
    >
      {/* ── TOP TAB NAVIGATION BAR (All | Tasks | Docs | Agents | People | Teams | Drive) ── */}
      <div className="px-2 pt-2 pb-1.5 border-b border-border/60 flex items-center justify-between gap-1 overflow-x-auto no-scrollbar shrink-0 bg-muted/20">
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setActiveTab('all')}
            className={`px-2.5 py-1 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'all'
                ? 'bg-background text-foreground shadow-2xs font-bold border border-border/60'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
            }`}
          >
            All
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('tasks')}
            className={`px-2.5 py-1 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'tasks'
                ? 'bg-background text-foreground shadow-2xs font-bold border border-border/60'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
            }`}
          >
            Tasks
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('docs')}
            className={`px-2.5 py-1 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'docs'
                ? 'bg-background text-foreground shadow-2xs font-bold border border-border/60'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
            }`}
          >
            Docs
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('agents')}
            className={`px-2.5 py-1 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'agents'
                ? 'bg-background text-foreground shadow-2xs font-bold border border-border/60'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
            }`}
          >
            Agents
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('people')}
            className={`px-2.5 py-1 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'people'
                ? 'bg-background text-foreground shadow-2xs font-bold border border-border/60'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
            }`}
          >
            People
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('teams')}
            className={`px-2.5 py-1 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'teams'
                ? 'bg-background text-foreground shadow-2xs font-bold border border-border/60'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
            }`}
          >
            Teams
          </button>
        </div>

        {/* Quick Google & Cloud Action Icons */}
        <div className="flex items-center gap-0.5 border-l border-border/60 pl-1 shrink-0">
          <button
            type="button"
            onClick={() => {
              onOpenGoogleDrive()
              onClose()
            }}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-amber-500 hover:bg-amber-500/10 transition-colors cursor-pointer"
            title="Google Drive Files"
          >
            <FolderOpen className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* ── TAB CONTENT BODY ── */}
      <div className="p-2 space-y-3 overflow-y-auto max-h-[400px] custom-scrollbar">
        {/* TAB 1: ALL */}
        {activeTab === 'all' && (
          <div className="space-y-3">
            {/* People Preview */}
            <div className="space-y-1">
              <div className="px-2 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                Recent People
              </div>
              <div className="space-y-0.5">
                {filteredMembers.slice(0, 3).map((member) => (
                  <button
                    key={member.id}
                    type="button"
                    onClick={() => {
                      onSelectPerson(member)
                      onClose()
                    }}
                    className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl hover:bg-muted text-foreground transition-all cursor-pointer text-left group"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="relative shrink-0">
                        <div className="w-6 h-6 rounded-full bg-rose-500 text-white flex items-center justify-center text-[10px] font-bold">
                          {member.name.charAt(0).toUpperCase()}
                        </div>
                        <span
                          className={`absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full border border-card ${
                            member.isOnline ? 'bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.9)]' : 'bg-muted-foreground/40'
                          }`}
                        />
                      </div>
                      <span className="truncate font-semibold text-xs text-foreground">
                        {member.name}
                      </span>
                    </div>
                    <span className="text-[10px] text-muted-foreground">
                      {member.isOnline ? 'Online' : 'Member'}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Agents Preview */}
            <div className="space-y-1">
              <div className="px-2 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                Agents
              </div>
              <div className="space-y-0.5">
                {defaultAgents.map((agent) => (
                  <button
                    key={agent.id}
                    type="button"
                    onClick={() => {
                      onSelectAgent(agent)
                      onClose()
                    }}
                    className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl hover:bg-muted text-foreground transition-all cursor-pointer text-left group"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-6 h-6 rounded-lg bg-gradient-to-tr from-primary to-purple-600 text-white flex items-center justify-center shrink-0">
                        <Sparkles className="w-3.5 h-3.5" />
                      </div>
                      <div className="min-w-0 truncate">
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-xs text-foreground">{agent.name}</span>
                          <span className="text-[9px] px-1.5 py-0.2 rounded-md bg-purple-500/15 text-purple-400 font-bold border border-purple-500/30">
                            {agent.badge}
                          </span>
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Tasks Section Preview */}
            <div className="space-y-1">
              <div className="px-2 text-[10px] font-bold text-muted-foreground uppercase tracking-wider flex items-center justify-between">
                <span>{isPersonalDmMode ? `Tasks (${activeDMUser?.name || 'Receiver'})` : 'Recent Tasks'}</span>
                {isPersonalDmMode && (
                  <span className="text-[9px] text-rose-500 font-extrabold uppercase">Services at top</span>
                )}
              </div>
              <div className="space-y-0.5">
                {processedTasks.slice(0, 4).map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      onSelectTask({ id: item.firstTaskId, title: item.serviceName })
                      onClose()
                    }}
                    className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl hover:bg-muted text-foreground transition-all cursor-pointer text-left group"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-4 h-4 rounded-full border-2 border-primary/60 flex items-center justify-center shrink-0">
                        <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                      </div>
                      <span className="truncate font-semibold text-xs">{item.serviceName}</span>
                    </div>
                    {isPersonalDmMode && item.isReceiverService ? (
                      <span className="min-w-[18px] h-4.5 px-1 rounded-full bg-rose-500 text-white font-bold text-[9px] flex items-center justify-center shrink-0 shadow-2xs">
                        {item.taskCount}
                      </span>
                    ) : (
                      <span className="text-[10px] text-muted-foreground">Task</span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: TASKS (Matches Reference Image 1) */}
        {activeTab === 'tasks' && (
          <div className="space-y-1">
            <div className="px-2 text-[10px] font-bold text-muted-foreground uppercase tracking-wider flex items-center justify-between">
              <span>{isPersonalDmMode ? `Tasks Assigned to ${activeDMUser?.name || 'User'}` : 'Recent Tasks'}</span>
              {isPersonalDmMode && (
                <span className="text-[9px] text-rose-500 font-extrabold">BY SERVICE (AT TOP)</span>
              )}
            </div>

            {processedTasks.length === 0 ? (
              <div className="py-6 text-center text-muted-foreground space-y-1">
                <Search className="w-5 h-5 mx-auto opacity-50" />
                <p className="font-semibold text-xs text-foreground">No tasks found</p>
                <p className="text-[10px]">No matching services or tasks in this workspace</p>
              </div>
            ) : (
              <div className="space-y-0.5">
                {processedTasks.map((item) => {
                  const firstTaskTitle = item.tasks[0]?.title || ''
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        onSelectTask({ id: item.firstTaskId, title: item.serviceName })
                        onClose()
                      }}
                      className="w-full flex items-center justify-between px-2.5 py-2 rounded-xl hover:bg-muted text-foreground transition-all cursor-pointer text-left group border border-transparent hover:border-border/40"
                    >
                      <div className="flex items-center gap-2.5 min-w-0 pr-2">
                        {/* Target / Radio bullet matching Image 1 */}
                        <div className="w-4 h-4 rounded-full border-2 border-muted-foreground/60 group-hover:border-primary flex items-center justify-center shrink-0 transition-colors">
                          <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground/60 group-hover:bg-primary transition-colors" />
                        </div>

                        <div className="min-w-0 truncate">
                          {/* Service Name as Primary */}
                          <div className="truncate font-semibold text-xs text-foreground group-hover:text-primary transition-colors">
                            {item.serviceName}
                          </div>
                          {/* Task title as Subtitle from DB */}
                          {firstTaskTitle && firstTaskTitle !== item.serviceName && (
                            <div className="text-[10px] text-muted-foreground truncate opacity-85">
                              {item.taskCount > 1
                                ? `${item.taskCount} tasks • e.g. ${firstTaskTitle}`
                                : firstTaskTitle}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Right Badge: Shows COUNT of tasks assigned to receiver for this service */}
                      {isPersonalDmMode && item.isReceiverService ? (
                        <span
                          className="min-w-[20px] h-5 px-1.5 rounded-full bg-rose-500 text-white font-bold text-[10px] flex items-center justify-center shrink-0 shadow-2xs"
                          title={`${item.taskCount} task${item.taskCount > 1 ? 's' : ''} assigned to ${activeDMUser?.name || 'receiver'} for ${item.serviceName}`}
                        >
                          {item.taskCount}
                        </span>
                      ) : (
                        <span className="w-5 h-5 rounded-full bg-muted text-muted-foreground font-semibold text-[10px] flex items-center justify-center shrink-0">
                          {item.taskCount}
                        </span>
                      )}
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB 3: DOCS IN THIS CHAT */}
        {activeTab === 'docs' && (
          <div className="space-y-2">
            <div className="px-2 text-[10px] font-bold text-muted-foreground uppercase tracking-wider flex items-center justify-between">
              <span>
                {targetType === 'channel'
                  ? `Docs in #${activeChannel?.name || 'General'}`
                  : `Docs in Chat`}
              </span>
              {onOpenDoc && (
                <button
                  type="button"
                  onClick={() => {
                    onOpenDoc()
                    onClose()
                  }}
                  className="text-[10px] text-primary hover:underline font-semibold flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3 h-3" />
                  <span>Create Doc</span>
                </button>
              )}
            </div>

            {filteredDocs.length === 0 ? (
              <div className="py-6 px-4 text-center space-y-2">
                <FileText className="w-7 h-7 mx-auto text-muted-foreground/40" />
                <p className="text-xs font-semibold text-foreground">
                  {targetType === 'channel'
                    ? `No docs shared in #${activeChannel?.name || 'General'} yet`
                    : `No docs shared in this chat yet`}
                </p>
                <p className="text-[10px] text-muted-foreground">
                  Use /Create Doc in chat to create and reference a document
                </p>
                {onOpenDoc && (
                  <button
                    type="button"
                    onClick={() => {
                      onOpenDoc()
                      onClose()
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-primary text-primary-foreground font-bold text-xs shadow-xs hover:opacity-95 transition-all cursor-pointer mt-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Create Doc</span>
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-0.5 max-h-56 overflow-y-auto">
                {filteredDocs.map((doc) => (
                  <button
                    key={doc.id}
                    type="button"
                    onClick={() => {
                      onSelectDoc(doc)
                      onClose()
                    }}
                    className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl hover:bg-muted text-foreground transition-all cursor-pointer text-left group"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <FileText className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                      <div className="min-w-0 truncate">
                        <span className="truncate font-medium text-xs text-foreground group-hover:text-primary transition-colors block">
                          {doc.title}
                        </span>
                        {doc.location && (
                          <span className="text-[10px] text-muted-foreground truncate block">
                            {doc.location}
                          </span>
                        )}
                      </div>
                    </div>
                    <span className="text-[10px] font-semibold text-muted-foreground group-hover:text-primary transition-colors shrink-0">
                      Attach
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 4: AGENTS */}
        {activeTab === 'agents' && (
          <div className="space-y-2">
            <div className="px-2 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
              Workspace Agents
            </div>
            <div className="space-y-1">
              {defaultAgents.map((agent) => (
                <button
                  key={agent.id}
                  type="button"
                  onClick={() => {
                    onSelectAgent(agent)
                    onClose()
                  }}
                  className="w-full flex items-center justify-between p-2.5 rounded-xl hover:bg-muted text-foreground transition-all cursor-pointer text-left border border-border/50 group"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-7 h-7 rounded-xl bg-gradient-to-tr from-primary to-purple-600 text-white flex items-center justify-center shrink-0 shadow-sm">
                      <Bot className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="font-bold text-xs text-foreground flex items-center gap-1.5">
                        <span>{agent.name}</span>
                        <span className="text-[9px] px-1.5 py-0.2 rounded bg-primary/10 text-primary font-bold">
                          {agent.badge}
                        </span>
                      </div>
                      <div className="text-[10px] text-muted-foreground">{agent.description}</div>
                    </div>
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 text-muted-foreground group-hover:text-foreground shrink-0" />
                </button>
              ))}
            </div>
          </div>
        )}

        {/* TAB 5: PEOPLE */}
        {activeTab === 'people' && (
          <div className="space-y-1">
            <div className="px-2 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
              Recent People
            </div>
            <div className="space-y-0.5">
              {filteredMembers.map((member) => {
                const initial = member.name.charAt(0).toUpperCase()
                return (
                  <button
                    key={member.id}
                    type="button"
                    onClick={() => {
                      onSelectPerson(member)
                      onClose()
                    }}
                    className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl hover:bg-muted text-foreground transition-all cursor-pointer text-left group"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="relative shrink-0">
                        <div className="w-6 h-6 rounded-full bg-rose-500 text-white flex items-center justify-center text-[10px] font-bold">
                          {initial}
                        </div>
                        <span
                          className={`absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full border border-card ${
                            member.isOnline
                              ? 'bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.9)]'
                              : 'bg-muted-foreground/40'
                          }`}
                        />
                      </div>
                      <span className="truncate font-semibold text-xs text-foreground">
                        {member.name}
                      </span>
                    </div>
                    <span className="text-[10px] text-muted-foreground">
                      {member.isOnline ? 'Online' : 'Member'}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* TAB 6: TEAMS */}
        {activeTab === 'teams' && (
          <div className="space-y-2">
            <div className="px-2 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
              Squads &amp; Departments
            </div>
            <div className="space-y-1">
              {sampleTeams.map((team) => (
                <button
                  key={team.id}
                  type="button"
                  onClick={() => {
                    onSelectPerson({
                      id: team.id,
                      name: team.name,
                      email: `${team.id}@taskflow.dev`,
                      role: 'Squad',
                      isOnline: true,
                    })
                    onClose()
                  }}
                  className="w-full flex items-center justify-between px-2.5 py-2 rounded-xl hover:bg-muted text-foreground transition-all cursor-pointer text-left group"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-6 h-6 rounded-lg bg-primary/15 text-primary flex items-center justify-center shrink-0">
                      <Users className="w-3.5 h-3.5" />
                    </div>
                    <span className="truncate font-semibold text-xs text-foreground group-hover:text-primary transition-colors">
                      {team.name}
                    </span>
                  </div>
                  <span className="text-[10px] text-muted-foreground px-1.5 py-0.5 rounded bg-muted">
                    {team.membersCount} members
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
