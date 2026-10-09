'use client'

import React, { useState, useEffect, useRef, useMemo } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import {
  Hash,
  Plus,
  MoreHorizontal,
  Send,
  Smile,
  Paperclip,
  Users,
  Search,
  CheckCircle2,
  Loader2,
  Lock,
  Globe,
  FolderKanban,
  Sparkles,
  ChevronDown,
  MessageSquare,
  PanelLeft,
  PanelLeftClose,
  ArrowLeft,
  Video,
  FileText,
  CheckSquare,
  Mic,
  Eye,
  EyeOff,
  FolderOpen,
  Maximize2,
  Copy,
  User,
  Star,
  PhoneCall,
  ExternalLink,
  CornerUpLeft,
  Quote,
  Upload,
  Bookmark,
  Pin,
  PinOff,
  Trash2,
  AlertTriangle,
  Edit3,
  Check,
  AlertCircle,
} from 'lucide-react'
import { useAuthStore } from '@/stores/auth-store'
import { useOrgStore } from '@/stores/org-store'
import { useWorkspaceStore } from '@/stores/workspace-store'
import { useProjectStore } from '@/stores/project-store'
import { useTaskStore } from '@/stores/task-store'
import { useChatStore, ChatChannel, DMContact, ChatMessage } from '@/stores/chat-store'
import { useDocStore } from '@/stores/doc-store'
import { usePresenceStore } from '@/stores/presence-store'
import { useCallStore } from '@/stores/call-store'
import { apiClient } from '@/lib/api-client'
import { Portal } from '@/components/ui/portal'
import { CreateChannelModal } from '@/features/chat/components/CreateChannelModal'
import { NewDirectMessageModal } from '@/features/chat/components/NewDirectMessageModal'
import { ChatInputBar } from '@/features/chat/components/ChatInputBar'
import { KryaWhiteboardModal } from '@/features/whiteboard/components/KryaWhiteboardModal'
import { UserProfilePanel, ProfileTab } from '@/features/chat/components/UserProfilePanel'
import { DocViewerModal } from '@/features/docs/components/DocViewerModal'
import { FileViewerModal, FileToView } from '@/components/file-viewer-modal'

export default function MessagesPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { user } = useAuthStore()
  const { currentOrg } = useOrgStore()
  const { currentWorkspace } = useWorkspaceStore()
  const { projects } = useProjectStore()
  const { tasks, loadTasks } = useTaskStore()
  const { isUserOnline, lastSync, onlineUserIds } = usePresenceStore()

  const [activeWhiteboard, setActiveWhiteboard] = useState<{ id: string; title: string } | null>(null)
  const [activeDocModal, setActiveDocModal] = useState<{ id: string; title: string } | null>(null)
  const [activeFileToView, setActiveFileToView] = useState<FileToView | null>(null)
  const [messageReactions, setMessageReactions] = useState<Record<string, string[]>>({})
  const [isProfilePanelOpen, setIsProfilePanelOpen] = useState(false)
  const [profileInitialTab, setProfileInitialTab] = useState<ProfileTab>('activity')

  const handleToggleReaction = (msgId: string, emoji: string) => {
    setMessageReactions((prev) => {
      const existing = prev[msgId] || []
      if (existing.includes(emoji)) {
        return { ...prev, [msgId]: existing.filter((e) => e !== emoji) }
      } else {
        return { ...prev, [msgId]: [...existing, emoji] }
      }
    })
  }

  const {
    channels,
    activeChannel,
    activeDMUser,
    messages,
    isLoadingChannels,
    isLoadingMessages,
    isSendingMessage,
    fetchChannels,
    createChannel,
    setActiveChannel,
    setActiveDMUser,
    fetchMessages,
    sendMessage,
    editMessage,
    togglePinMessage,
    deleteMessage,
  } = useChatStore()

  const { deleteDoc, createDoc, docs } = useDocStore()

  // Message Editing state
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null)
  const [editingMessageText, setEditingMessageText] = useState('')

  // Message Deletion state (delete for me / delete for everyone)
  const [deletingMessage, setDeletingMessage] = useState<ChatMessage | null>(null)
  const [deleteMode, setDeleteMode] = useState<'everyone' | 'me'>('everyone')

  // Auto-sync docs from chat messages into useDocStore (shows docs from General chat and DMs in Docs page)
  useEffect(() => {
    if (!messages || messages.length === 0) return
    const docStore = useDocStore.getState()
    const activeLoc = activeChannel
      ? `#${activeChannel.name}`
      : activeDMUser
      ? `DM with ${activeDMUser.name}`
      : '#General'

    let deletedDocsSet = new Set<string>()
    if (typeof window !== 'undefined') {
      try {
        const raw = localStorage.getItem('taskflow_deleted_docs')
        if (raw) {
          const parsed = JSON.parse(raw)
          if (Array.isArray(parsed)) deletedDocsSet = new Set(parsed.map((s: string) => String(s).toLowerCase().trim()))
        }
      } catch {}
    }

    messages.forEach((msg) => {
      const atts = msg.attachments || []
      atts.forEach((a: any) => {
        if (a.type === 'doc' || a.type === 'gdoc' || Boolean(a.docId)) {
          const docTitle = a.title || a.docId
          const docId = a.docId || docTitle
          if (docTitle) {
            if (deletedDocsSet.has(docTitle.toLowerCase().trim()) || (docId && deletedDocsSet.has(docId.toLowerCase().trim()))) {
              return
            }
            docStore.createDoc(docTitle, '', msg.senderName || 'User', activeLoc, {
              channelId: activeChannel?.id,
              recipientId: activeDMUser?.id,
              docId,
            })
          }
        }
      })
    })
  }, [messages, activeChannel, activeDMUser])

  // Pinned Messages state
  const [showPinnedFlyout, setShowPinnedFlyout] = useState(false)
  const pinnedMessages = useMemo(() => messages.filter((m) => m.isPinned), [messages])

  const handleStartEditMessage = (msg: ChatMessage) => {
    setEditingMessageId(msg.id)
    setEditingMessageText(msg.content || '')
  }

  const handleSaveEditMessage = async (msgId: string) => {
    if (!currentWorkspace?.id || !editingMessageText.trim()) return
    await editMessage(currentWorkspace.id, msgId, editingMessageText.trim())
    setEditingMessageId(null)
    setEditingMessageText('')
    setToastMessage('Message updated')
    setTimeout(() => setToastMessage(null), 2500)
  }

  const handleTogglePin = async (msg: ChatMessage) => {
    if (!currentWorkspace?.id) return
    const nextPinned = !msg.isPinned
    await togglePinMessage(currentWorkspace.id, msg.id, nextPinned)
    setToastMessage(nextPinned ? 'Message pinned 📌' : 'Message unpinned')
    setTimeout(() => setToastMessage(null), 2500)
  }

  const handleOpenDeleteDialog = (msg: ChatMessage) => {
    const isSender = Boolean(
      user && (
        msg.senderId === user.id ||
        msg.senderId === (user as any)?.sub ||
        (user.email && msg.senderName?.toLowerCase() === user.email.toLowerCase())
      )
    )
    const msgTime = new Date(msg.createdAt).getTime()
    const isWithin24Hours = !isNaN(msgTime) && (Date.now() - msgTime <= 24 * 60 * 60 * 1000)
    const canEveryone = isSender && isWithin24Hours

    setDeletingMessage(msg)
    setDeleteMode(canEveryone ? 'everyone' : 'me')
  }

  const handleConfirmDeleteMessage = async () => {
    if (!deletingMessage || !currentWorkspace?.id) return

    const docAtt = deletingMessage.attachments?.find(
      (a: any) => a && (a.type === 'doc' || a.type === 'gdoc' || Boolean(a.docId))
    )
    const wbAtt = deletingMessage.attachments?.find(
      (a: any) => a && (a.type === 'whiteboard' || Boolean(a.boardId))
    )
    if (docAtt && (docAtt.docId || docAtt.title)) {
      deleteDoc(docAtt.docId || docAtt.title, currentWorkspace.id)
    }
    if (typeof deletingMessage.content === 'string') {
      const docMatch = deletingMessage.content.match(/\/(?:create\s+doc|doc)\s+([^\n]+)/i)
      if (docMatch && docMatch[1]) {
        deleteDoc(docMatch[1].trim(), currentWorkspace.id)
      }
    }
    if (wbAtt && wbAtt.boardId) {
      try {
        localStorage.removeItem(`taskflow_krya_whiteboard_${wbAtt.boardId}`)
      } catch {}
    }

    await deleteMessage(currentWorkspace.id, deletingMessage.id, deleteMode)
    setToastMessage(
      deleteMode === 'everyone'
        ? 'Message deleted for everyone'
        : 'Message deleted for you'
    )
    setTimeout(() => setToastMessage(null), 3000)
    setDeletingMessage(null)
  }

  // Members list for Direct Messages and Channels
  const [workspaceMembers, setWorkspaceMembers] = useState<DMContact[]>([])
  const [channelsCollapsed, setChannelsCollapsed] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('taskflow_messages_hide_channels') === 'true'
    }
    return false
  })
  const [directMessagesCollapsed, setDirectMessagesCollapsed] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('taskflow_messages_hide_dm') === 'true'
    }
    return false
  })

  const toggleChannels = () => {
    setChannelsCollapsed((prev) => {
      const next = !prev
      if (typeof window !== 'undefined') {
        localStorage.setItem('taskflow_messages_hide_channels', String(next))
      }
      return next
    })
  }

  const toggleDirectMessages = () => {
    setDirectMessagesCollapsed((prev) => {
      const next = !prev
      if (typeof window !== 'undefined') {
        localStorage.setItem('taskflow_messages_hide_dm', String(next))
      }
      return next
    })
  }

  const [showSidebar, setShowSidebar] = useState(true)
  const [mobileView, setMobileView] = useState<'sidebar' | 'chat'>('chat')
  const [isCreateChannelOpen, setIsCreateChannelOpen] = useState(false)
  const [isNewDMOpen, setIsNewDMOpen] = useState(false)
  const [inputText, setInputText] = useState('')
  const [toastMessage, setToastMessage] = useState<string | null>(null)

  // Multi-select messages mode state
  const [isMultiSelectMode, setIsMultiSelectMode] = useState(false)
  const [selectedMessageIds, setSelectedMessageIds] = useState<Set<string>>(new Set())
  const [isBulkDeleteModalOpen, setIsBulkDeleteModalOpen] = useState(false)
  const [bulkDeleteMode, setBulkDeleteMode] = useState<'everyone' | 'me'>('everyone')

  const selectedMessages = useMemo(() => {
    return messages.filter((m) => selectedMessageIds.has(m.id))
  }, [messages, selectedMessageIds])

  const canBulkDeleteForEveryone = useMemo(() => {
    if (selectedMessages.length === 0) return false
    return selectedMessages.every((m) => {
      const isSender = Boolean(
        user && (
          m.senderId === user.id ||
          m.senderId === (user as any)?.sub ||
          (user.email && m.senderName?.toLowerCase() === user.email.toLowerCase())
        )
      )
      const mTime = new Date(m.createdAt).getTime()
      const isWithin24Hours = !isNaN(mTime) && Date.now() - mTime <= 24 * 60 * 60 * 1000
      return isSender && isWithin24Hours
    })
  }, [selectedMessages, user])

  const toggleSelectMessage = (id: string) => {
    setSelectedMessageIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const handleSelectAllMessages = () => {
    if (selectedMessageIds.size === messages.length) {
      setSelectedMessageIds(new Set())
    } else {
      setSelectedMessageIds(new Set(messages.map((m) => m.id)))
    }
  }

  const handleConfirmBulkDelete = async () => {
    if (!currentWorkspace?.id || selectedMessageIds.size === 0) return

    const count = selectedMessageIds.size
    const idsToDelete = Array.from(selectedMessageIds)

    for (const msgId of idsToDelete) {
      const msg = messages.find((m) => m.id === msgId)
      if (msg) {
        const docAtt = msg.attachments?.find((a: any) => a && (a.type === 'doc' || a.type === 'gdoc' || Boolean(a.docId)))
        const wbAtt = msg.attachments?.find((a: any) => a && (a.type === 'whiteboard' || Boolean(a.boardId)))
        if (docAtt && (docAtt.docId || docAtt.title)) {
          deleteDoc(docAtt.docId || docAtt.title, currentWorkspace.id)
        }
        if (typeof msg.content === 'string') {
          const docMatch = msg.content.match(/\/(?:create\s+doc|doc)\s+([^\n]+)/i)
          if (docMatch && docMatch[1]) {
            deleteDoc(docMatch[1].trim(), currentWorkspace.id)
          }
        }
        if (wbAtt && wbAtt.boardId) {
          try {
            localStorage.removeItem(`taskflow_krya_whiteboard_${wbAtt.boardId}`)
          } catch {}
        }
      }
      await deleteMessage(currentWorkspace.id, msgId, bulkDeleteMode)
    }

    setToastMessage(`Successfully deleted ${count} message${count > 1 ? 's' : ''}`)
    setTimeout(() => setToastMessage(null), 3000)
    setSelectedMessageIds(new Set())
    setIsMultiSelectMode(false)
    setIsBulkDeleteModalOpen(false)
  }

  const messagesContainerRef = useRef<HTMLDivElement>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // 1. Fetch workspace channels, tasks, and members on mount or workspace change
  useEffect(() => {
    const wsId = currentWorkspace?.id
    const orgId = currentWorkspace?.organizationId || currentOrg?.id

    if (!wsId && !orgId) return

    if (wsId) {
      fetchChannels(wsId)
      loadTasks(wsId)
    }

    const mapMember = (m: any): DMContact => {
      const id = m.userId || m.id
      return {
        id,
        name: m.name || m.displayName || m.email?.split('@')[0] || 'User',
        email: m.email || '',
        avatarUrl: m.avatarUrl || m.avatar_url,
        role: m.role || m.roleName || m.role_name || 'Member',
        isOnline: isUserOnline(id, m.email),
      }
    }

    const fetchAllMembers = async () => {
      try {
        const memberMap = new Map<string, DMContact>()

        // 1. Fetch organization members (all users with org access)
        if (orgId) {
          try {
            const orgRes = await apiClient.get<any>(`/api/v1/organizations/${orgId}/members`)
            const orgList = Array.isArray(orgRes.data)
              ? orgRes.data
              : Array.isArray((orgRes as any)?.data?.data)
              ? (orgRes as any).data.data
              : Array.isArray(orgRes)
              ? orgRes
              : []
            orgList.forEach((raw: any) => {
              const mapped = mapMember(raw)
              const key = mapped.id || mapped.email
              if (key) memberMap.set(key, mapped)
            })
          } catch (e) {
            console.warn('Failed to fetch org members in messages:', e)
          }
        }

        // 2. Fetch workspace members
        if (wsId) {
          try {
            const wsRes = await apiClient.get<any>(`/api/v1/workspaces/${wsId}/members`)
            const wsList = Array.isArray(wsRes.data)
              ? wsRes.data
              : Array.isArray((wsRes as any)?.data?.data)
              ? (wsRes as any).data.data
              : Array.isArray(wsRes)
              ? wsRes
              : []
            wsList.forEach((raw: any) => {
              const mapped = mapMember(raw)
              const key = mapped.id || mapped.email
              if (key && !memberMap.has(key)) {
                memberMap.set(key, mapped)
              }
            })
          } catch (e) {
            console.warn('Failed to fetch ws members in messages:', e)
          }
        }

        setWorkspaceMembers(Array.from(memberMap.values()))
      } catch (err) {
        console.error('Error loading members in messages:', err)
      }
    }

    fetchAllMembers()
  }, [currentWorkspace?.id, currentWorkspace?.organizationId, currentOrg?.id, fetchChannels, loadTasks, user?.id])

  // Track organization / workspace changes to always default to the top channel when switching organizations
  const prevOrgIdRef = useRef<string | undefined>(currentOrg?.id)
  const prevWsIdRef = useRef<string | undefined>(currentWorkspace?.id)

  useEffect(() => {
    const orgSwitched = Boolean(prevOrgIdRef.current && prevOrgIdRef.current !== currentOrg?.id)
    const wsSwitched = Boolean(prevWsIdRef.current && prevWsIdRef.current !== currentWorkspace?.id)

    if (orgSwitched || wsSwitched) {
      // Switched organization or workspace: clear active DM and open the top channel by default
      setActiveDMUser(null)
      if (channels && channels.length > 0) {
        setActiveChannel(channels[0])
      }
      if (typeof window !== 'undefined' && (searchParams.get('dm') || searchParams.get('channel'))) {
        router.replace('/app/messages')
      }
    }

    prevOrgIdRef.current = currentOrg?.id
    prevWsIdRef.current = currentWorkspace?.id
  }, [currentOrg?.id, currentWorkspace?.id, channels, setActiveChannel, setActiveDMUser, router, searchParams])

  // 2. Handle URL Query Params or default to top channel
  useEffect(() => {
    const channelParam = searchParams.get('channel')
    const dmParam = searchParams.get('dm')

    if (channelParam && channels.length > 0) {
      const found = channels.find((c) => c.id === channelParam || c.name.toLowerCase() === channelParam.toLowerCase())
      if (found) {
        setActiveChannel(found)
        setActiveDMUser(null)
        return
      }
    }

    if (dmParam && workspaceMembers.length > 0) {
      const found = workspaceMembers.find((m) => m.id === dmParam || m.email?.toLowerCase() === dmParam.toLowerCase())
      if (found) {
        setActiveDMUser({
          ...found,
          isOnline: isUserOnline(found.id, found.email) || Boolean(found.isOnline),
        })
        setActiveChannel(null)
        return
      }
    }

    // Default: If no active DM and either no activeChannel or activeChannel doesn't belong to current workspace, open top channel!
    if (!activeDMUser && channels.length > 0) {
      const isCurrentValid = activeChannel && channels.some((c) => c.id === activeChannel.id)
      if (!isCurrentValid) {
        setActiveChannel(channels[0])
      }
    }
  }, [searchParams, channels, workspaceMembers, activeChannel, activeDMUser, setActiveChannel, setActiveDMUser])

  // 3. Fetch messages whenever active conversation changes
  useEffect(() => {
    if (!currentWorkspace?.id) return

    if (activeChannel) {
      fetchMessages(currentWorkspace.id, { channelId: activeChannel.id })
    } else if (activeDMUser) {
      fetchMessages(currentWorkspace.id, { recipientId: activeDMUser.id })
    }
  }, [activeChannel, activeDMUser, currentWorkspace?.id, fetchMessages])

  // Scroll messages container directly (prevents parent window/header from jumping)
  useEffect(() => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight
    }
  }, [messages])

  // Send message
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!inputText.trim() || !currentWorkspace?.id || isSendingMessage) return

    const content = inputText.trim()
    setInputText('')

    try {
      if (activeChannel) {
        await sendMessage(currentWorkspace.id, {
          channelId: activeChannel.id,
          content,
        })
      } else if (activeDMUser) {
        await sendMessage(currentWorkspace.id, {
          recipientId: activeDMUser.id,
          content,
        })
      }
      inputRef.current?.focus()
    } catch {
      setToastMessage('Failed to send message. Please try again.')
      setTimeout(() => setToastMessage(null), 3000)
    }
  }

  // Native Live Voice Call
  const handleStartVoiceCall = () => {
    if (useCallStore.getState().activeCall || useCallStore.getState().isPreJoinOpen || useCallStore.getState().isCallStarting) {
      return
    }
    if (activeDMUser) {
      useCallStore.getState().openPreJoin({
        callType: 'ONE_TO_ONE_VOICE',
        recipientId: activeDMUser.id,
        recipientName: activeDMUser.name,
        recipientAvatar: activeDMUser.avatarUrl,
      })
    } else if (activeChannel) {
      useCallStore.getState().openPreJoin({
        callType: 'GROUP_VOICE',
        channelId: activeChannel.id,
        channelName: `#${activeChannel.name}`,
      })
    }
  }

  // Native Live Video Call
  const handleStartVideoCall = () => {
    if (useCallStore.getState().activeCall || useCallStore.getState().isPreJoinOpen || useCallStore.getState().isCallStarting) {
      return
    }
    if (activeDMUser) {
      useCallStore.getState().openPreJoin({
        callType: 'ONE_TO_ONE_VIDEO',
        recipientId: activeDMUser.id,
        recipientName: activeDMUser.name,
        recipientAvatar: activeDMUser.avatarUrl,
      })
    } else if (activeChannel) {
      useCallStore.getState().openPreJoin({
        callType: 'CHANNEL_CALL',
        channelId: activeChannel.id,
        channelName: `#${activeChannel.name}`,
      })
    }
  }

  // Helper: Initials
  const getInitials = (name?: string, email?: string) => {
    const str = (name || email?.split('@')[0] || 'U').trim()
    const parts = str.split(/\s+/).filter(Boolean)
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase()
    return str.substring(0, 1).toUpperCase()
  }

  // Deterministic unique avatar color per user (hash-based with 30 vibrant colors)
  const AVATAR_PALETTE = [
    '#4f46e5', '#0d9488', '#1e293b', '#9333ea', '#e11d48',
    '#0284c7', '#ea580c', '#059669', '#0891b2', '#d97706',
    '#6366f1', '#27272a', '#be185d', '#7c3aed', '#db2777',
    '#2563eb', '#16a34a', '#ca8a04', '#475569', '#dc2626',
    '#0891b2', '#9d174d', '#4338ca', '#0f766e', '#b45309',
    '#6d28d9', '#be123c', '#1d4ed8', '#047857', '#854d0e',
  ]
  const getAvatarColor = (identifier: string): string => {
    if (!identifier) return AVATAR_PALETTE[0]
    let hash = 5381
    for (let i = 0; i < identifier.length; i++) {
      hash = ((hash << 5) + hash) + identifier.charCodeAt(i)
    }
    return AVATAR_PALETTE[Math.abs(hash) % AVATAR_PALETTE.length]
  }

  // Show all org members EXCEPT the current user in the DM list
  const displayedMembers = useMemo(() => {
    if (workspaceMembers.length > 0) {
      return workspaceMembers
        .filter((m) => {
          const isYou = Boolean(
            user &&
              (m.id === user.id ||
                (m as any).userId === user.id ||
                (m.email && user.email && m.email.toLowerCase() === user.email.toLowerCase()))
          )
          return !isYou
        })
        .map((m) => ({
          ...m,
          isOnline: isUserOnline(m.id, m.email),
        }))
    }
    return []
  }, [workspaceMembers, user?.id, user?.email, isUserOnline, lastSync, onlineUserIds])

  return (
    <div className="flex h-full w-full overflow-hidden bg-background animate-fade-in">
      {/* Toast Alert */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-[100] flex items-center gap-2.5 bg-rose-600 text-white px-5 py-3 rounded-2xl shadow-2xl text-xs font-bold animate-fade-in">
          <span>{toastMessage}</span>
        </div>
      )}

      {/* LEFT COLUMN: Channels & Direct Messages Sidebar (Matches Reference Screenshot) */}
      <aside
        className={`${
          mobileView === 'sidebar' ? 'flex' : 'hidden'
        } ${
          showSidebar ? 'md:flex' : 'md:hidden'
        } w-full md:w-64 lg:w-72 bg-sidebar border-r border-border flex-col justify-between shrink-0 select-none h-full`}
      >
        <div className="flex-1 min-h-0 overflow-y-auto p-3 space-y-4 custom-scrollbar">
          {/* SECTION 1: CHANNELS (Header with ▾, ..., and +) */}
          <div className="space-y-1">
            <div className="flex items-center justify-between px-2 py-1 text-xs font-bold text-muted-foreground group">
              <button
                type="button"
                onClick={toggleChannels}
                className="flex items-center gap-1.5 hover:text-foreground transition-colors cursor-pointer"
                title={channelsCollapsed ? "Expand channels" : "Hide channels"}
              >
                <span>Channels</span>
                <ChevronDown
                  className={`w-3.5 h-3.5 transition-transform duration-200 ${
                    channelsCollapsed ? '-rotate-90' : ''
                  }`}
                />
              </button>

              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setIsCreateChannelOpen(true)}
                  className="p-1 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                  title="Channel options"
                >
                  <MoreHorizontal className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setIsCreateChannelOpen(true)}
                  className="p-1 rounded-md hover:bg-primary/10 text-primary transition-colors cursor-pointer"
                  title="Create Channel"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {!channelsCollapsed && (
              <div className="space-y-0.5 pt-0.5">
                {channels.map((channel) => {
                  const isSelected = activeChannel?.id === channel.id
                  return (
                    <button
                      key={channel.id}
                      type="button"
                      onClick={() => {
                        setActiveChannel(channel)
                        setMobileView('chat')
                      }}
                      className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer text-left ${
                        isSelected
                          ? 'bg-accent/80 text-foreground font-bold shadow-2xs'
                          : 'text-muted-foreground hover:bg-accent/40 hover:text-foreground'
                      }`}
                    >
                      <div className="flex items-center gap-2 truncate">
                        {/* Hashtag + Project Badge 'P' */}
                        <div className="flex items-center gap-0.5 shrink-0">
                          <Hash className="w-3.5 h-3.5 text-muted-foreground" />
                          {channel.projectName && (
                            <span className="w-3.5 h-3.5 rounded bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-extrabold text-[9px] flex items-center justify-center">
                              P
                            </span>
                          )}
                        </div>

                        <span className="truncate">
                          {channel.name}
                          {channel.projectName && (
                            <span className="text-muted-foreground font-normal ml-1">
                              - {channel.projectName}
                            </span>
                          )}
                        </span>
                      </div>

                      {channel.isPrivate && (
                        <Lock className="w-3 h-3 text-muted-foreground shrink-0" />
                      )}
                    </button>
                  )
                })}

                {/* + Add Channel Button */}
                <button
                  type="button"
                  onClick={() => setIsCreateChannelOpen(true)}
                  className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-xl text-xs text-muted-foreground hover:text-primary hover:bg-accent/30 transition-all cursor-pointer text-left"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Channel</span>
                </button>
              </div>
            )}
          </div>

          {/* SECTION 2: DIRECT MESSAGES */}
          <div className="space-y-1 pt-1">
            <div className="flex items-center justify-between px-2 py-1 text-xs font-bold text-muted-foreground group">
              <button
                type="button"
                onClick={toggleDirectMessages}
                className="flex items-center gap-1.5 hover:text-foreground transition-colors cursor-pointer"
                title={directMessagesCollapsed ? "Show direct messages (users)" : "Hide direct messages (users)"}
              >
                <span>Direct Messages</span>
                <ChevronDown
                  className={`w-3.5 h-3.5 transition-transform duration-200 ${
                    directMessagesCollapsed ? '-rotate-90' : ''
                  }`}
                />
              </button>

              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={toggleDirectMessages}
                  className={`flex items-center gap-1 px-1.5 py-0.5 rounded-lg text-[10px] font-semibold transition-all cursor-pointer ${
                    directMessagesCollapsed
                      ? 'bg-primary/15 text-primary hover:bg-primary/25 font-bold'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                  }`}
                  title={directMessagesCollapsed ? "Show users list" : "Hide users list"}
                >
                  {directMessagesCollapsed ? (
                    <>
                      <Eye className="w-3 h-3" />
                      <span>Show</span>
                    </>
                  ) : (
                    <>
                      <EyeOff className="w-3 h-3" />
                      <span>Hide</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => setIsNewDMOpen(true)}
                  className="p-1 rounded-md hover:bg-primary/10 text-primary transition-colors cursor-pointer"
                  title="New direct message"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {directMessagesCollapsed ? (
              <div
                onClick={toggleDirectMessages}
                className="mx-1 px-2.5 py-2 rounded-xl bg-card/40 border border-dashed border-border/60 hover:border-primary/50 text-[11px] text-muted-foreground hover:text-foreground transition-all cursor-pointer flex items-center justify-between group"
                title="Click to expand direct messages"
              >
                <div className="flex items-center gap-1.5">
                  <EyeOff className="w-3 h-3 text-muted-foreground group-hover:text-primary transition-colors" />
                  <span>Users hidden</span>
                </div>
                <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-muted font-bold text-muted-foreground group-hover:text-primary transition-colors">
                  {displayedMembers.length}
                </span>
              </div>
            ) : (
              <div className="space-y-0.5">
                {displayedMembers.map((member) => {
                  const isSelected = activeDMUser?.id === member.id
                  const initial = getInitials(member.name, member.email)
                  const bgColor = getAvatarColor(member.email || member.name || member.id)

                  return (
                    <button
                      key={member.id}
                      type="button"
                      onClick={() => {
                        setActiveDMUser({
                          ...member,
                          isOnline: isUserOnline(member.id, member.email) || Boolean(member.isOnline),
                        })
                        setMobileView('chat')
                      }}
                      className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl text-xs transition-all cursor-pointer text-left ${
                        isSelected
                          ? 'bg-accent/80 text-foreground font-bold shadow-2xs'
                          : 'text-muted-foreground hover:bg-accent/40 hover:text-foreground'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 truncate">
                        {/* Avatar with status dot */}
                        <div className="relative shrink-0">
                          <div
                            className="w-5 h-5 rounded-full flex items-center justify-center text-white text-[10px] font-bold"
                            style={{ backgroundColor: bgColor }}
                          >
                            {initial}
                          </div>
                          <span
                            className={`absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full border border-sidebar ${
                              member.isOnline
                                ? 'bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.9)]'
                                : 'border-muted-foreground/60 bg-sidebar'
                            }`}
                          />
                        </div>

                        <span className="truncate">{member.name}</span>
                      </div>
                    </button>
                  )
                })}

                {/* + New message Button */}
                <button
                  type="button"
                  onClick={() => setIsNewDMOpen(true)}
                  className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-xl text-xs text-muted-foreground hover:text-primary hover:bg-accent/30 transition-all cursor-pointer text-left"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>New message</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Bottom Workspace Tag */}
        <div className="p-3 border-t border-border/60 text-[11px] text-muted-foreground flex items-center justify-between shrink-0 bg-sidebar">
          <span className="truncate font-semibold">{currentWorkspace?.name || 'Workspace'}</span>
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted font-medium">Chat Active</span>
        </div>
      </aside>

      {/* RIGHT COLUMN: Active Chat Conversation */}
      <section
        className={`${
          mobileView === 'chat' ? 'flex' : 'hidden'
        } md:flex flex-1 flex-col min-w-0 bg-background/50 h-full overflow-hidden`}
      >
        {/* Chat Header */}
        <div className="h-14 border-b border-border px-3 sm:px-5 flex items-center justify-between gap-3 bg-card/60 backdrop-blur-md shrink-0">
          <div className="flex items-center gap-2.5 truncate">
            {/* Mobile Back Button to Channels/DMs list */}
            <button
              type="button"
              onClick={() => setMobileView('sidebar')}
              className="md:hidden p-1.5 rounded-xl border border-border bg-card hover:bg-accent text-muted-foreground hover:text-foreground transition-all cursor-pointer shrink-0"
              title="Back to channels"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>

            {/* Desktop Toggle Channels Sidebar Button */}
            <button
              type="button"
              onClick={() => setShowSidebar(!showSidebar)}
              className="hidden md:flex p-1.5 rounded-xl border border-border bg-card hover:bg-accent text-muted-foreground hover:text-foreground transition-all cursor-pointer shrink-0"
              title={showSidebar ? "Hide channels panel" : "Show channels panel"}
            >
              {showSidebar ? <PanelLeftClose className="w-4 h-4" /> : <PanelLeft className="w-4 h-4" />}
            </button>

            {activeChannel ? (
              <>
                <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                  <Hash className="w-4 h-4" />
                </div>
                <div className="truncate">
                  <div className="font-bold text-sm text-foreground flex items-center gap-2">
                    <span>#{activeChannel.name}</span>
                    {activeChannel.projectName && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-semibold">
                        {activeChannel.projectName}
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] text-muted-foreground truncate">
                    {activeChannel.description || 'Channel conversation'}
                  </div>
                </div>
              </>
            ) : activeDMUser ? (
              (() => {
                const isYou = Boolean(
                  user &&
                    (activeDMUser.id === user.id ||
                      (activeDMUser.email && user.email && activeDMUser.email.toLowerCase() === user.email.toLowerCase()))
                )
                const isOnline =
                  isYou ||
                  isUserOnline(activeDMUser.id, activeDMUser.email) ||
                  isUserOnline((activeDMUser as any).userId, activeDMUser.email) ||
                  Boolean(activeDMUser.isOnline)

                return (
                  <div
                    onClick={() => {
                      setProfileInitialTab('activity')
                      setIsProfilePanelOpen(true)
                    }}
                    className="flex items-center gap-2.5 truncate cursor-pointer hover:opacity-90 transition-opacity"
                    title="Click to view profile"
                  >
                    <div className="relative shrink-0">
                      <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white flex items-center justify-center font-bold text-xs shadow-2xs">
                        {getInitials(activeDMUser.name, activeDMUser.email)}
                      </div>
                      <span
                        className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-card ${
                          isOnline
                            ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.9)]'
                            : 'border border-muted-foreground/60 bg-muted'
                        }`}
                      />
                    </div>
                    <div className="truncate">
                      <div className="font-bold text-sm text-foreground flex items-center gap-1.5">
                        <span className="truncate">{activeDMUser.name || activeDMUser.email}</span>
                        {isYou && (
                          <span className="text-[10px] text-muted-foreground font-normal">(You)</span>
                        )}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            setProfileInitialTab('activity')
                            setIsProfilePanelOpen(!isProfilePanelOpen)
                          }}
                          className="text-muted-foreground hover:text-foreground p-0.5"
                          title="Profile options"
                        >
                          <MoreHorizontal className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => e.stopPropagation()}
                          className="text-muted-foreground hover:text-amber-400 p-0.5"
                          title="Favorite conversation"
                        >
                          <Star className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <div className="text-[11px] text-muted-foreground truncate flex items-center gap-1.5">
                        <span
                          className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                            isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-muted-foreground/50'
                          }`}
                        />
                        <span className={isOnline ? 'text-emerald-500 font-semibold' : ''}>
                          {isOnline ? 'Active now' : 'Offline'}
                        </span>
                        <span>•</span>
                        <span className="truncate">{activeDMUser.email}</span>
                      </div>
                    </div>
                  </div>
                )
              })()
            ) : (
              <div className="text-xs text-muted-foreground">Select a channel or direct message</div>
            )}
          </div>

          <div className="flex items-center gap-2">
            {/* Multi-Select Messages Toggle */}
            {messages.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  setIsMultiSelectMode(!isMultiSelectMode)
                  setSelectedMessageIds(new Set())
                }}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${
                  isMultiSelectMode
                    ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                    : 'bg-card border-border hover:bg-accent text-muted-foreground hover:text-foreground'
                }`}
                title={isMultiSelectMode ? 'Exit select mode' : 'Select multiple messages'}
              >
                <CheckSquare className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{isMultiSelectMode ? 'Cancel' : 'Select'}</span>
              </button>
            )}

            {activeDMUser && (
              <button
                type="button"
                onClick={() => {
                  setProfileInitialTab('activity')
                  setIsProfilePanelOpen(!isProfilePanelOpen)
                }}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${
                  isProfilePanelOpen
                    ? 'bg-primary/10 text-primary border-primary/30'
                    : 'bg-card border-border hover:bg-accent text-muted-foreground hover:text-foreground'
                }`}
                title="View user profile"
              >
                <User className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Profile</span>
              </button>
            )}
          </div>
        </div>

        {/* Subheader Tabs Bar for Direct Messages (Chat, Calendar, Tasks, + View) */}
        {activeDMUser && (
          <div className="h-10 border-b border-border/70 px-4 sm:px-5 flex items-center justify-between bg-card/20 shrink-0 text-xs">
            <div className="flex items-center gap-1">
              <button
                type="button"
                className="px-3 py-2 font-semibold text-foreground border-b-2 border-primary relative cursor-pointer"
              >
                Chat
              </button>
              <button
                type="button"
                onClick={() => {
                  setProfileInitialTab('tasks')
                  setIsProfilePanelOpen(true)
                }}
                className="px-3 py-2 font-medium text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
              >
                Tasks
              </button>
              <button
                type="button"
                className="px-2 py-2 font-medium text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3 h-3" />
                <span>View</span>
              </button>
            </div>

            <div className="flex items-center gap-1.5 text-muted-foreground">
              <button
                type="button"
                onClick={handleStartVoiceCall}
                className="p-1.5 rounded-lg hover:bg-emerald-500/15 hover:text-emerald-400 text-muted-foreground transition-colors cursor-pointer"
                title="Start Live Voice Call"
              >
                <PhoneCall className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={handleStartVideoCall}
                className="p-1.5 rounded-lg hover:bg-emerald-500/15 hover:text-emerald-400 text-muted-foreground transition-colors cursor-pointer"
                title="Start Live Video Call"
              >
                <Video className="w-3.5 h-3.5" />
              </button>
              <div className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-accent/60 text-[11px] font-medium text-foreground">
                <Sparkles className="w-3 h-3 text-purple-400" />
                <span>Brain²</span>
              </div>
            </div>
          </div>
        )}

        {/* Messages Stream */}
        <div ref={messagesContainerRef} className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-5 space-y-4 custom-scrollbar relative">
          {/* Multi-Select Floating Action Bar */}
          {isMultiSelectMode && (
            <div className="sticky top-0 z-40 mx-auto max-w-lg bg-card/95 backdrop-blur-md border border-primary/40 rounded-2xl p-2.5 shadow-2xl flex items-center justify-between gap-3 animate-in fade-in slide-in-from-top-2 duration-150 mb-2">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-foreground">
                  {selectedMessageIds.size} message{selectedMessageIds.size === 1 ? '' : 's'} selected
                </span>
                <button
                  type="button"
                  onClick={handleSelectAllMessages}
                  className="text-[11px] text-primary hover:underline font-semibold cursor-pointer"
                >
                  {selectedMessageIds.size === messages.length ? 'Deselect all' : 'Select all'}
                </button>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsMultiSelectMode(false)
                    setSelectedMessageIds(new Set())
                  }}
                  className="px-3 py-1.5 rounded-xl border border-border text-xs text-muted-foreground hover:text-foreground hover:bg-muted cursor-pointer transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={selectedMessageIds.size === 0}
                  onClick={() => {
                    setBulkDeleteMode(canBulkDeleteForEveryone ? 'everyone' : 'me')
                    setIsBulkDeleteModalOpen(true)
                  }}
                  className="px-3.5 py-1.5 rounded-xl bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-red-600/20 cursor-pointer transition-all"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete ({selectedMessageIds.size})</span>
                </button>
              </div>
            </div>
          )}

          {isLoadingMessages && messages.length === 0 ? (
            <div className="h-full flex items-center justify-center">
              <Loader2 className="w-6 h-6 text-primary animate-spin" />
            </div>
          ) : (
            <>
              {/* Direct Message Starter Block (matches Images 1-5) */}
              {activeDMUser && (
                <div className="flex flex-col items-center justify-center text-center pt-4 pb-6 px-4 space-y-4 max-w-md mx-auto">
                  <div className="space-y-1">
                    <h3 className="text-base font-bold text-foreground">
                      Chat with {activeDMUser.email || activeDMUser.name}
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      This conversation started on{' '}
                      {new Date().toLocaleDateString('en-US', {
                        month: 'long',
                        day: 'numeric',
                        year: 'numeric',
                      })}.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setProfileInitialTab('activity')
                      setIsProfilePanelOpen(true)
                    }}
                    className="w-full max-w-sm flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-border bg-card/90 hover:bg-accent text-xs font-semibold text-foreground transition-all cursor-pointer shadow-2xs group"
                  >
                    <User className="w-3.5 h-3.5 text-muted-foreground group-hover:text-primary transition-colors" />
                    <span>View Profile</span>
                  </button>
                </div>
              )}

              {/* Channel Empty State */}
              {activeChannel && messages.length === 0 && (
                <div className="h-full flex flex-col items-center justify-center text-center p-8 space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shadow-inner">
                    <Hash className="w-6 h-6" />
                  </div>
                  <div className="space-y-1 max-w-sm">
                    <h3 className="text-sm font-bold text-foreground">
                      Welcome to #{activeChannel.name}!
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      This is the start of this channel. Send a message to start the conversation with your team.
                    </p>
                  </div>
                </div>
              )}

              {messages.map((msg) => {
              const isMe = user && msg.senderId === user.id
              const initials = getInitials(msg.senderName)
              const docAtt = msg.attachments?.find((a: any) => a.type === 'doc')
              const nonDocAttachments = msg.attachments?.filter((a: any) => a.type !== 'doc') || []

              return (
                <div
                  key={msg.id}
                  onClick={() => {
                    if (isMultiSelectMode) {
                      toggleSelectMessage(msg.id)
                    }
                  }}
                  className={`relative flex gap-3 items-start group ${
                    isMultiSelectMode ? 'cursor-pointer hover:bg-accent/30 p-1.5 rounded-2xl transition-colors' : ''
                  } ${isMe ? 'flex-row-reverse' : ''}`}
                >
                  {/* Multi-Select Checkbox */}
                  {isMultiSelectMode && (
                    <div
                      onClick={(e) => {
                        e.stopPropagation()
                        toggleSelectMessage(msg.id)
                      }}
                      className="self-center cursor-pointer p-1 shrink-0"
                    >
                      <div
                        className={`w-5 h-5 rounded-lg border flex items-center justify-center transition-all ${
                          selectedMessageIds.has(msg.id)
                            ? 'bg-primary border-primary text-primary-foreground shadow-xs'
                            : 'border-border/80 hover:border-primary/60 bg-muted/40'
                        }`}
                      >
                        {selectedMessageIds.has(msg.id) && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                      </div>
                    </div>
                  )}

                  {/* Sender Avatar */}
                  <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-primary to-secondary text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-2xs">
                    {initials}
                  </div>

                  {/* Message Content */}
                  <div className={`space-y-1 max-w-[75%] relative ${isMe ? 'items-end text-right' : ''}`}>
                    <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                      <span className="font-bold text-foreground">{msg.senderName}</span>
                      <span>
                        {new Date(msg.createdAt).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                      {msg.isEdited && (
                        <span className="text-[10px] italic text-muted-foreground opacity-80">(edited)</span>
                      )}
                      {msg.isPinned && (
                        <span className="inline-flex items-center gap-0.5 text-[10px] px-1.5 py-0.2 rounded-md bg-amber-500/15 text-amber-400 font-semibold border border-amber-500/30">
                          <Pin className="w-2.5 h-2.5" />
                          Pinned
                        </span>
                      )}
                    </div>

                    <div
                      className={`p-3 rounded-2xl text-xs leading-relaxed space-y-2.5 ${
                        isMe
                          ? 'bg-primary text-primary-foreground font-medium rounded-tr-none shadow-md shadow-primary/20'
                          : 'bg-card border border-border text-foreground rounded-tl-none shadow-2xs'
                      }`}
                    >
                      {/* INLINE EDIT MODE OR REGULAR CONTENT */}
                      {editingMessageId === msg.id ? (
                        <div className="space-y-2 py-1">
                          <textarea
                            value={editingMessageText}
                            onChange={(e) => setEditingMessageText(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault()
                                handleSaveEditMessage(msg.id)
                              } else if (e.key === 'Escape') {
                                setEditingMessageId(null)
                                setEditingMessageText('')
                              }
                            }}
                            rows={2}
                            className="w-full bg-background/90 border border-primary/50 rounded-xl p-2.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary resize-none"
                            autoFocus
                            placeholder="Edit your message... (Enter to save, Esc to cancel)"
                          />
                          <div className="flex items-center justify-end gap-2 text-xs">
                            <button
                              type="button"
                              onClick={() => {
                                setEditingMessageId(null)
                                setEditingMessageText('')
                              }}
                              className="px-2.5 py-1 rounded-lg bg-background/60 hover:bg-background text-foreground/80 hover:text-foreground text-[11px] font-medium cursor-pointer border border-border/60"
                            >
                              Cancel (Esc)
                            </button>
                            <button
                              type="button"
                              onClick={() => handleSaveEditMessage(msg.id)}
                              className="px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-[11px] cursor-pointer shadow-sm"
                            >
                              Save (Enter)
                            </button>
                          </div>
                        </div>
                      ) : docAtt ? (
                        <div className="flex items-center flex-wrap gap-2 text-xs">
                          <button
                            type="button"
                            onClick={() =>
                              setActiveDocModal({
                                id: docAtt.docId || docAtt.title || 'demo',
                                title: docAtt.title || 'demo',
                              })
                            }
                            className={`inline-flex items-center gap-2 px-3 py-1 rounded-xl font-bold transition-all shadow-sm cursor-pointer border ${
                              isMe
                                ? 'bg-zinc-950/90 hover:bg-zinc-900 text-white border-zinc-700/80 shadow-md'
                                : 'bg-zinc-900/90 hover:bg-zinc-800 text-white border-zinc-700 shadow-xs'
                            }`}
                            title={`Open ${docAtt.title || 'Document'}`}
                          >
                            <span className="text-sm">📄</span>
                            <span className="font-extrabold tracking-wide text-white">
                              {docAtt.title || 'demo'}
                            </span>
                            <span className="text-[9px] px-1.5 py-0.5 rounded-md bg-white/20 text-white font-bold uppercase tracking-wider">
                              Doc
                            </span>
                          </button>
                          {msg.content && (
                            <span
                              className={
                                isMe ? 'font-medium text-white/95' : 'font-normal text-foreground'
                              }
                            >
                              {msg.content}
                            </span>
                          )}
                        </div>
                      ) : (
                        msg.content && <p>{msg.content}</p>
                      )}

                      {/* Render attachments if any */}
                      {nonDocAttachments.length > 0 && (
                        <div className="space-y-2 pt-1">
                          {nonDocAttachments.map((att: any, aIdx: number) => {
                            if (att.type === 'gdoc' || att.type === 'doc') {
                              return (
                                <div
                                  key={aIdx}
                                  onClick={() =>
                                    setActiveDocModal({
                                      id: att.docId || att.title || 'Untitled',
                                      title: att.title || 'Untitled',
                                    })
                                  }
                                  className={`p-3 rounded-2xl border flex items-center justify-between gap-3 transition-all cursor-pointer group shadow-sm ${
                                    isMe
                                      ? 'bg-zinc-950/90 hover:bg-zinc-900 border-zinc-700/80 text-white'
                                      : 'bg-card hover:bg-muted/70 border-border text-foreground'
                                  }`}
                                >
                                  <div className="flex items-center gap-3 min-w-0">
                                    <div className="w-9 h-9 rounded-xl bg-sky-500/20 text-sky-400 flex items-center justify-center shrink-0 border border-sky-500/30">
                                      <FileText className="w-4 h-4" />
                                    </div>
                                    <div className="min-w-0 truncate space-y-0.5">
                                      <div className="font-bold text-xs truncate group-hover:text-primary transition-colors text-white">
                                        {att.title || 'Workspace Document'}
                                      </div>
                                      <div className="text-[10px] text-zinc-400 font-medium">
                                        TaskFlow Document • Click to view &amp; edit
                                      </div>
                                    </div>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      setActiveDocModal({
                                        id: att.docId || att.title || 'Untitled',
                                        title: att.title || 'Untitled',
                                      })
                                    }}
                                    className="px-3.5 py-1.5 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs shrink-0 transition-all shadow-xs cursor-pointer flex items-center gap-1"
                                  >
                                    <FileText className="w-3 h-3" />
                                    <span>Open Doc</span>
                                  </button>
                                </div>
                              )
                            }

                            if (att.type === 'whiteboard') {
                              const boardId = att.boardId || 'board-main'
                              // Extract board title: prefer att.title if not generic 'krya', or parse from message content
                              let boardTitle = att.title
                              if (!boardTitle || boardTitle.toLowerCase() === 'krya') {
                                const match = msg.content?.match(/\/create\s+whiteboard\s+(.+)/i)
                                if (match && match[1]) {
                                  boardTitle = match[1].trim()
                                }
                              }
                              if (!boardTitle || boardTitle.toLowerCase() === 'krya') {
                                boardTitle = 'Whiteboard'
                              }

                              return (
                                <div key={aIdx} className="space-y-2 pt-1 max-w-2xl">
                                  {/* Whiteboard Card Frame matching Image 3 & 4 */}
                                  <div
                                    onClick={() => setActiveWhiteboard({ id: boardId, title: boardTitle })}
                                    className="group relative rounded-2xl border border-white/20 hover:border-white/40 bg-[#0d0e12] overflow-hidden shadow-2xl transition-all cursor-pointer select-none"
                                  >
                                    {/* Top-Left Yellow Badge: Shows whiteboard name */}
                                    <div className="absolute top-3 left-3 z-20 flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-400 text-black font-extrabold text-[11px] shadow-lg shadow-amber-400/20">
                                      <Sparkles className="w-3.5 h-3.5 fill-black" />
                                      <span>{boardTitle}</span>
                                    </div>

                                    {/* Canvas Preview Area with dot grid (matching Image 3 & 4) */}
                                    <div className="relative h-44 sm:h-52 w-full bg-[#111217] flex items-center justify-between p-4 sm:p-6 overflow-hidden">
                                      {/* Dot grid pattern */}
                                      <div
                                        className="absolute inset-0 opacity-40 pointer-events-none"
                                        style={{
                                          backgroundImage: 'radial-gradient(circle, #4a4d55 1.2px, transparent 1.2px)',
                                          backgroundSize: '20px 20px',
                                        }}
                                      />

                                      {/* Visual Canvas Elements matching wireframe in Image 3 & 4 */}
                                      <div className="relative w-full h-full flex items-center justify-between pointer-events-none">
                                        {/* Left white panel / wireframe block */}
                                        <div className="w-28 sm:w-36 h-32 sm:h-40 rounded-xl bg-white shadow-xl flex flex-col p-3 space-y-2 border border-zinc-200">
                                          <div className="w-12 h-2 rounded bg-zinc-300" />
                                          <div className="w-full h-1.5 rounded bg-zinc-200" />
                                          <div className="w-4/5 h-1.5 rounded bg-zinc-200" />
                                          <div className="w-20 h-4 rounded bg-sky-100 mt-auto border border-sky-300/40" />
                                        </div>

                                        {/* Center dark workspace canvas with connecting element */}
                                        <div className="flex flex-col items-center justify-center space-y-2">
                                          <div className="px-3 py-1.5 rounded-xl bg-zinc-800/90 border border-zinc-700 text-zinc-300 text-[10px] font-mono shadow-md">
                                            Interactive Canvas
                                          </div>
                                          <div className="w-16 h-0.5 bg-gradient-to-r from-transparent via-amber-400 to-transparent" />
                                        </div>

                                        {/* Right white panel / wireframe block */}
                                        <div className="w-28 sm:w-36 h-32 sm:h-40 rounded-xl bg-white shadow-xl flex flex-col p-3 space-y-2 border border-zinc-200">
                                          <div className="w-14 h-2 rounded bg-zinc-300" />
                                          <div className="w-full h-1.5 rounded bg-zinc-200" />
                                          <div className="w-3/4 h-1.5 rounded bg-zinc-200" />
                                          <div className="w-20 h-4 rounded bg-emerald-100 mt-auto border border-emerald-300/40" />
                                        </div>
                                      </div>

                                      {/* Hover overlay: "Click to open [Whiteboard Name]" */}
                                      <div className="absolute inset-0 bg-black/45 backdrop-blur-2xs opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 text-white font-bold text-xs pointer-events-none">
                                        <Maximize2 className="w-4 h-4 text-amber-400" />
                                        <span>Click to open {boardTitle}</span>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              )
                            }

                            if (att.type === 'checklist') {
                              return (
                                <div
                                  key={aIdx}
                                  className={`p-3 rounded-xl border space-y-1.5 ${
                                    isMe
                                      ? 'bg-white/10 border-white/20 text-white'
                                      : 'bg-muted/50 border-border text-foreground'
                                  }`}
                                >
                                  <div className="font-bold text-[11px] flex items-center gap-1.5">
                                    <CheckSquare className="w-3.5 h-3.5 text-blue-400" />
                                    <span>{att.title || 'Checklist'}</span>
                                  </div>
                                  <div className="space-y-1 pl-1">
                                    {(att.items || []).map((item: any, iIdx: number) => (
                                      <div key={iIdx} className="flex items-center gap-2 text-[11px]">
                                        <input
                                          type="checkbox"
                                          defaultChecked={item.checked}
                                          className="rounded border-border accent-primary cursor-pointer"
                                        />
                                        <span>{item.text}</span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )
                            }

                            if (att.type === 'image' || att.type === 'gif') {
                              return (
                                <div key={aIdx} className="rounded-xl overflow-hidden max-w-sm">
                                  <img
                                    src={att.url}
                                    alt={att.name || 'Attachment'}
                                    className="max-h-60 w-auto rounded-xl object-cover shadow-sm"
                                  />
                                </div>
                              )
                            }

                            if (att.type === 'video' || att.type === 'video_clip') {
                              return (
                                <div key={aIdx} className="rounded-xl overflow-hidden max-w-sm bg-black/40 p-2 space-y-1 border border-border/50">
                                  <div className="flex items-center gap-1.5 text-[11px] font-bold">
                                    <Video className="w-3.5 h-3.5 text-purple-400" />
                                    <span>{att.title || 'Video Clip'}</span>
                                    {att.duration && <span className="opacity-75 font-normal">({att.duration})</span>}
                                  </div>
                                  <video controls src={att.url} className="w-full rounded-lg max-h-48" />
                                </div>
                              )
                            }

                            if (att.type === 'audio_memo') {
                              return (
                                <div key={aIdx} className="p-2.5 rounded-xl border border-border/60 bg-muted/40 flex items-center gap-2">
                                  <Mic className="w-4 h-4 text-amber-500 shrink-0" />
                                  <span className="text-[11px] font-bold truncate">{att.title || 'Voice Memo'}</span>
                                  <span className="text-[10px] text-muted-foreground ml-auto">Audio Note</span>
                                </div>
                              )
                            }

                            const hasPreview = Boolean(att.dataUrl || att.url)
                            return (
                              <div
                                key={aIdx}
                                onClick={() => {
                                  if (hasPreview) {
                                    setActiveFileToView({
                                      name: att.name || 'Document',
                                      dataUrl: att.dataUrl || att.url,
                                      size: typeof att.size === 'number' ? att.size : undefined,
                                      type: att.type,
                                    })
                                  }
                                }}
                                className={`flex items-center justify-between gap-2 px-3 py-2 rounded-xl border border-border/60 bg-muted/30 text-[11px] ${
                                  hasPreview
                                    ? 'hover:bg-muted/70 hover:border-primary/50 cursor-pointer transition-all shadow-2xs group/att'
                                    : ''
                                }`}
                                title={hasPreview ? `Click to view ${att.name || 'document'}` : undefined}
                              >
                                <div className="flex items-center gap-2 min-w-0">
                                  <Paperclip className="w-3.5 h-3.5 text-primary shrink-0" />
                                  <span className="truncate font-semibold">{att.name || 'Document'}</span>
                                  {att.size && (
                                    <span className="opacity-70 text-[10px] shrink-0">
                                      ({typeof att.size === 'number' ? `${Math.round(att.size / 1024)} KB` : att.size})
                                    </span>
                                  )}
                                </div>
                                {hasPreview && (
                                  <span className="text-[10px] text-primary font-bold opacity-80 group-hover/att:opacity-100 shrink-0 flex items-center gap-1">
                                    <Eye className="w-3 h-3" />
                                    <span>View</span>
                                  </span>
                                )}
                              </div>
                            )
                          })}
                        </div>
                      )}
                    </div>

                    {/* Message Reactions */}
                    {messageReactions[msg.id] && messageReactions[msg.id].length > 0 && (
                      <div className={`flex items-center gap-1.5 pt-0.5 flex-wrap ${isMe ? 'justify-end' : 'justify-start'}`}>
                        {Array.from(new Set(messageReactions[msg.id])).map((emoji) => {
                          const count = messageReactions[msg.id].filter((e) => e === emoji).length
                          return (
                            <button
                              key={emoji}
                              type="button"
                              onClick={() => handleToggleReaction(msg.id, emoji)}
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-accent/80 hover:bg-accent border border-border text-[11px] font-semibold text-foreground transition-all cursor-pointer shadow-2xs"
                            >
                              <span>{emoji}</span>
                              <span>{count}</span>
                            </button>
                          )
                        })}
                      </div>
                    )}

                    {/* FLOATING HOVER REACTION & ACTION TOOLBAR (Image 3: Positioned near / on top of message bubble) */}
                    {!isMultiSelectMode && (
                      <div
                        className={`absolute -top-7 ${
                          isMe ? 'right-0' : 'left-0'
                        } z-30 opacity-0 group-hover:opacity-100 pointer-events-none group-hover:pointer-events-auto transition-all duration-150 flex items-center bg-zinc-900/95 border border-zinc-700/80 rounded-xl px-1.5 py-1 shadow-xl backdrop-blur-md gap-0.5 text-xs select-none`}
                      >
                        {/* Quick reaction emojis */}
                        <button
                          type="button"
                          onClick={() => handleToggleReaction(msg.id, '👍')}
                          className="p-1 hover:bg-zinc-800 rounded-lg transition-transform hover:scale-120 text-sm cursor-pointer"
                          title="Thumbs up"
                        >
                          👍
                        </button>
                        <button
                          type="button"
                          onClick={() => handleToggleReaction(msg.id, '✅')}
                          className="p-1 hover:bg-zinc-800 rounded-lg transition-transform hover:scale-120 text-sm cursor-pointer"
                          title="Checkmark"
                        >
                          ✅
                        </button>
                        <button
                          type="button"
                          onClick={() => handleToggleReaction(msg.id, '🔥')}
                          className="p-1 hover:bg-zinc-800 rounded-lg transition-transform hover:scale-120 text-sm cursor-pointer"
                          title="Fire"
                        >
                          🔥
                        </button>
                        <button
                          type="button"
                          onClick={() => handleToggleReaction(msg.id, '🤩')}
                          className="p-1 hover:bg-zinc-800 rounded-lg transition-transform hover:scale-120 text-sm cursor-pointer"
                          title="Star eyes"
                        >
                          🤩
                        </button>

                        <div className="w-px h-3.5 bg-zinc-700/80 mx-0.5" />

                        {/* Pin / Unpin message */}
                        <button
                          type="button"
                          onClick={() => handleTogglePin(msg)}
                          className={`p-1 hover:bg-zinc-800 rounded-lg transition-colors cursor-pointer ${
                            msg.isPinned ? 'text-amber-400' : 'text-zinc-300 hover:text-amber-400'
                          }`}
                          title={msg.isPinned ? 'Unpin message' : 'Pin message'}
                        >
                          {msg.isPinned ? <PinOff className="w-3.5 h-3.5" /> : <Pin className="w-3.5 h-3.5" />}
                        </button>

                        {/* Select message to enter multi-select mode */}
                        <button
                          type="button"
                          onClick={() => {
                            setIsMultiSelectMode(true)
                            toggleSelectMessage(msg.id)
                          }}
                          className="p-1 hover:bg-zinc-800 text-zinc-300 hover:text-white rounded-lg transition-colors cursor-pointer"
                          title="Select message"
                        >
                          <CheckSquare className="w-3.5 h-3.5" />
                        </button>

                        {/* Edit message (only if sender is current user) */}
                        {isMe && (
                          <button
                            type="button"
                            onClick={() => handleStartEditMessage(msg)}
                            className="p-1 hover:bg-zinc-800 text-zinc-300 hover:text-white rounded-lg transition-colors cursor-pointer"
                            title="Edit message"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                        )}

                        {/* Delete message (delete for me / delete for everyone) */}
                        <button
                          type="button"
                          onClick={() => handleOpenDeleteDialog(msg)}
                          className="p-1 hover:bg-red-950/60 text-zinc-400 hover:text-red-400 rounded-lg transition-colors cursor-pointer"
                          title="Delete message"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>

                        <div className="w-px h-3.5 bg-zinc-700/80 mx-0.5" />

                        {/* Reply */}
                        <button
                          type="button"
                          onClick={() => {
                            setToastMessage(`Drafted reply for @${msg.senderName}`)
                            setTimeout(() => setToastMessage(null), 2500)
                          }}
                          className="p-1 hover:bg-zinc-800 text-zinc-300 hover:text-white rounded-lg transition-colors cursor-pointer"
                          title="Reply"
                        >
                          <CornerUpLeft className="w-3.5 h-3.5" />
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            if (navigator.clipboard) {
                              navigator.clipboard.writeText(msg.content || '')
                              setToastMessage('Message copied to clipboard!')
                              setTimeout(() => setToastMessage(null), 2500)
                            }
                          }}
                          className="p-1 hover:bg-zinc-800 text-zinc-300 hover:text-white rounded-lg transition-colors cursor-pointer"
                          title="Copy text"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </>
        )}
        <div ref={messagesEndRef} />
        </div>

        {/* Bottom Input Area */}
        <div className="p-2 sm:p-3 border-t border-border bg-card/70 backdrop-blur-md shrink-0">
          <div className="max-w-5xl mx-auto">
            <ChatInputBar
              targetName={activeChannel ? activeChannel.name : activeDMUser?.name || 'team member'}
              targetType={activeChannel ? 'channel' : 'dm'}
              activeChannel={activeChannel}
              activeDMUser={activeDMUser}
              members={displayedMembers}
              tasks={tasks}
              isSending={isSendingMessage}
              onSendMessage={async (content, attachments) => {
                if (!currentWorkspace?.id) return
                if (activeChannel) {
                  await sendMessage(currentWorkspace.id, {
                    channelId: activeChannel.id,
                    content,
                    attachments,
                  })
                } else if (activeDMUser) {
                  await sendMessage(currentWorkspace.id, {
                    recipientId: activeDMUser.id,
                    content,
                    attachments,
                  })
                }
              }}
            />
          </div>
        </div>
      </section>

      {/* USER PROFILE DRAWER / PANEL (Activity, Tasks, Comments, Org Chart, Calendar) */}
      {activeDMUser && (
        <UserProfilePanel
          isOpen={isProfilePanelOpen}
          initialTab={profileInitialTab}
          onClose={() => setIsProfilePanelOpen(false)}
          user={activeDMUser}
          tasks={tasks}
          currentWorkspaceId={currentWorkspace?.id}
          currentWorkspaceName={currentWorkspace?.name}
          currentOrgId={currentOrg?.id}
          currentOrgName={currentOrg?.name}
          workspaceMembers={workspaceMembers}
        />
      )}

      {/* Modal: Create Channel */}
      <CreateChannelModal
        isOpen={isCreateChannelOpen}
        onClose={() => setIsCreateChannelOpen(false)}
        members={displayedMembers}
        onCreate={async (data) => {
          if (!currentWorkspace?.id) return
          await createChannel(currentWorkspace.id, data)
          setToastMessage(`Channel #${data.name} created!`)
          setTimeout(() => setToastMessage(null), 3000)
        }}
      />

      {/* Modal: New Direct Message */}
      <NewDirectMessageModal
        isOpen={isNewDMOpen}
        onClose={() => setIsNewDMOpen(false)}
        members={displayedMembers}
        currentUserId={user?.id}
        onSelectMember={(m) => {
          setActiveDMUser({
            ...m,
            isOnline: isUserOnline(m.id, m.email) || Boolean(m.isOnline),
          })
        }}
      />

      {/* Modal: Krya Whiteboard */}
      <KryaWhiteboardModal
        isOpen={Boolean(activeWhiteboard)}
        boardId={activeWhiteboard?.id}
        boardTitle={activeWhiteboard?.title || 'Whiteboard'}
        onClose={() => setActiveWhiteboard(null)}
      />

      {/* Modal: Document Viewer / Editor (matching Image 4) */}
      {activeDocModal && (
        <DocViewerModal
          isOpen={Boolean(activeDocModal)}
          docId={activeDocModal.id}
          docTitle={activeDocModal.title}
          onClose={() => setActiveDocModal(null)}
        />
      )}

      {/* Modal: Delete Message Confirmation (Delete for me / Delete for everyone + Document Permission) */}
      {deletingMessage && (() => {
        const isDeletingSender = Boolean(
          user && (
            deletingMessage.senderId === user.id ||
            deletingMessage.senderId === (user as any)?.sub ||
            (user.email && deletingMessage.senderName?.toLowerCase() === user.email.toLowerCase())
          )
        )
        const deletingMsgTime = new Date(deletingMessage.createdAt).getTime()
        const isDeletingWithin24Hours = !isNaN(deletingMsgTime) && (Date.now() - deletingMsgTime <= 24 * 60 * 60 * 1000)
        const canDeleteForEveryone = isDeletingSender && isDeletingWithin24Hours

        let deleteForEveryoneDisabledNotice = ''
        if (!isDeletingSender) {
          deleteForEveryoneDisabledNotice = 'Disabled: Only the sender can delete for everyone'
        } else if (!isDeletingWithin24Hours) {
          deleteForEveryoneDisabledNotice = 'Disabled: Messages older than 24 hours can only be deleted for yourself'
        }

        return (
          <Portal>
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
              <div className="relative w-full max-w-md bg-card border border-border rounded-2xl shadow-2xl overflow-hidden p-6 space-y-5 animate-in fade-in zoom-in-95 duration-150">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-red-500/15 text-red-500 flex items-center justify-center shrink-0 border border-red-500/30">
                    <Trash2 className="w-5 h-5" />
                  </div>
                  <div className="space-y-1 min-w-0">
                    <h3 className="text-base font-bold text-foreground">Delete Message</h3>
                  </div>
                </div>

                {/* Message Snippet Preview */}
                <div className="p-3 rounded-xl bg-muted/40 border border-border/80 text-xs text-foreground/90 italic truncate">
                  "{deletingMessage.content || (deletingMessage.attachments?.[0]?.title ? `[${deletingMessage.attachments[0].title}]` : 'Attachment')}"
                </div>

                {/* Deletion Mode Radio Options */}
                <div className="space-y-2.5">
                  {/* Delete for everyone option */}
                  <div
                    onClick={() => {
                      if (canDeleteForEveryone) {
                        setDeleteMode('everyone')
                      }
                    }}
                    className={`p-3 rounded-xl border transition-all ${
                      !canDeleteForEveryone
                        ? 'opacity-40 cursor-not-allowed bg-muted/20 border-border/50'
                        : deleteMode === 'everyone'
                        ? 'border-red-500/50 bg-red-500/10 text-foreground cursor-pointer'
                        : 'border-border bg-card/60 hover:bg-accent text-muted-foreground hover:text-foreground cursor-pointer'
                    }`}
                  >
                    <label className={`flex items-center gap-3 ${!canDeleteForEveryone ? 'cursor-not-allowed' : 'cursor-pointer'}`}>
                      <input
                        type="radio"
                        name="deleteMode"
                        value="everyone"
                        checked={deleteMode === 'everyone'}
                        disabled={!canDeleteForEveryone}
                        onChange={() => {
                          if (canDeleteForEveryone) setDeleteMode('everyone')
                        }}
                        className="accent-red-500 cursor-pointer w-4 h-4"
                      />
                      <span className={`text-xs font-bold ${!canDeleteForEveryone ? 'text-muted-foreground' : 'text-foreground'}`}>
                        Delete for everyone
                      </span>
                    </label>
                  </div>

                  {/* Delete for me option */}
                  <div
                    onClick={() => setDeleteMode('me')}
                    className={`p-3 rounded-xl border cursor-pointer transition-all ${
                      deleteMode === 'me'
                        ? 'border-primary/50 bg-primary/10 text-foreground'
                        : 'border-border bg-card/60 hover:bg-accent text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="radio"
                        name="deleteMode"
                        value="me"
                        checked={deleteMode === 'me'}
                        onChange={() => setDeleteMode('me')}
                        className="accent-primary cursor-pointer w-4 h-4"
                      />
                      <span className="text-xs font-bold text-foreground">
                        Delete for me
                      </span>
                    </label>
                  </div>
                </div>

                {/* Modal Actions */}
                <div className="flex items-center justify-end gap-2.5 pt-2">
                  <button
                    type="button"
                    onClick={() => setDeletingMessage(null)}
                    className="px-4 py-2 rounded-xl border border-border bg-card hover:bg-accent text-xs font-semibold text-muted-foreground hover:text-foreground transition-all cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmDeleteMessage}
                    className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold transition-all shadow-md shadow-red-600/30 flex items-center gap-1.5 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>
                      {deleteMode === 'everyone' ? 'Delete for Everyone' : 'Delete for Me'}
                    </span>
                  </button>
                </div>
              </div>
            </div>
          </Portal>
        )
      })()}

      {/* Modal: Bulk Delete Messages Confirmation */}
      {isBulkDeleteModalOpen && selectedMessageIds.size > 0 && (
        <Portal>
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
            <div className="relative w-full max-w-md bg-card border border-border rounded-2xl shadow-2xl overflow-hidden p-6 space-y-5 animate-in fade-in zoom-in-95 duration-150">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-red-500/15 text-red-500 flex items-center justify-center shrink-0 border border-red-500/30">
                  <Trash2 className="w-5 h-5" />
                </div>
                <div className="space-y-1 min-w-0">
                  <h3 className="text-base font-bold text-foreground">
                    Delete {selectedMessageIds.size} Message{selectedMessageIds.size === 1 ? '' : 's'}
                  </h3>
                </div>
              </div>

              {/* Deletion Mode Radio Options */}
              <div className="space-y-2.5">
                <div
                  onClick={() => {
                    if (canBulkDeleteForEveryone) {
                      setBulkDeleteMode('everyone')
                    }
                  }}
                  className={`p-3 rounded-xl border transition-all ${
                    !canBulkDeleteForEveryone
                      ? 'opacity-40 cursor-not-allowed bg-muted/20 border-border/50'
                      : bulkDeleteMode === 'everyone'
                      ? 'border-red-500/50 bg-red-500/10 text-foreground cursor-pointer'
                      : 'border-border bg-card/60 hover:bg-accent text-muted-foreground hover:text-foreground cursor-pointer'
                  }`}
                >
                  <label className={`flex items-center gap-3 ${!canBulkDeleteForEveryone ? 'cursor-not-allowed' : 'cursor-pointer'}`}>
                    <input
                      type="radio"
                      name="bulkDeleteMode"
                      value="everyone"
                      checked={bulkDeleteMode === 'everyone'}
                      disabled={!canBulkDeleteForEveryone}
                      onChange={() => {
                        if (canBulkDeleteForEveryone) setBulkDeleteMode('everyone')
                      }}
                      className="accent-red-500 cursor-pointer w-4 h-4"
                    />
                    <span className={`text-xs font-bold ${!canBulkDeleteForEveryone ? 'text-muted-foreground' : 'text-foreground'}`}>
                      Delete for everyone
                    </span>
                  </label>
                </div>

                <div
                  onClick={() => setBulkDeleteMode('me')}
                  className={`p-3 rounded-xl border cursor-pointer transition-all ${
                    bulkDeleteMode === 'me'
                      ? 'border-primary/50 bg-primary/10 text-foreground'
                      : 'border-border bg-card/60 hover:bg-accent text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="radio"
                      name="bulkDeleteMode"
                      value="me"
                      checked={bulkDeleteMode === 'me'}
                      onChange={() => setBulkDeleteMode('me')}
                      className="accent-primary cursor-pointer w-4 h-4"
                    />
                    <span className="text-xs font-bold text-foreground">
                      Delete for me
                    </span>
                  </label>
                </div>
              </div>

              {/* Modal Actions */}
              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setIsBulkDeleteModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-border bg-card hover:bg-accent text-xs font-semibold text-muted-foreground hover:text-foreground transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmBulkDelete}
                  className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold transition-all shadow-md shadow-red-600/30 flex items-center gap-1.5 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>
                    {bulkDeleteMode === 'everyone' ? 'Delete for Everyone' : 'Delete for Me'}
                  </span>
                </button>
              </div>
            </div>
          </div>
        </Portal>
      )}

      {/* Universal File Viewer Modal */}
      <FileViewerModal
        file={activeFileToView}
        isOpen={!!activeFileToView}
        onClose={() => setActiveFileToView(null)}
      />
    </div>
  )
}
