'use client'

import React, { useState, useRef, useEffect } from 'react'
import {
  Plus,
  Sparkles,
  AtSign,
  Paperclip,
  Hash,
  Smile,
  Video,
  CheckSquare,
  FileText,
  Zap,
  Mic,
  Send,
  ChevronDown,
  X,
  Image as ImageIcon,
  FileUp,
  Camera,
  CheckCheck,
  Radio,
  ExternalLink,
  Film,
  Calendar,
  Layers,
  StopCircle,
  FolderOpen,
  UserPlus,
  FilePlus,
  LayoutTemplate,
  Edit2,
} from 'lucide-react'
import { DMContact } from '@/stores/chat-store'
import { useAuthStore } from '@/stores/auth-store'
import { SlashCommandPalette } from './SlashCommandPalette'
import { RichEmojiPicker } from './RichEmojiPicker'
import { ResourceMentionPalette } from './ResourceMentionPalette'

interface ChatInputBarProps {
  targetName: string
  targetType: 'channel' | 'dm'
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
  activeDMUser?: DMContact | null
  isSending: boolean
  onSendMessage: (content: string, attachments?: any[]) => void
}

export function ChatInputBar({
  targetName,
  targetType,
  members,
  tasks = [],
  activeDMUser,
  isSending,
  onSendMessage,
}: ChatInputBarProps) {
  const { user } = useAuthStore()
  const [inputText, setInputText] = useState('')
  const [showWavingBanner, setShowWavingBanner] = useState(true)
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [isAiOpen, setIsAiOpen] = useState(false)
  const [isEmojiPickerOpen, setIsEmojiPickerOpen] = useState(false)
  const [isSlashOpen, setIsSlashOpen] = useState(false)
  const [slashQuery, setSlashQuery] = useState('')
  const [isResourceMentionOpen, setIsResourceMentionOpen] = useState(false)
  const [mentionQuery, setMentionQuery] = useState('')
  const [messageType, setMessageType] = useState<'message' | 'announcement' | 'task_note'>('message')
  const [isTypeDropdownOpen, setIsTypeDropdownOpen] = useState(false)

  // Recording states
  const [isRecordingVideo, setIsRecordingVideo] = useState(false)
  const [videoTimer, setVideoTimer] = useState(0)
  const [isRecordingAudio, setIsRecordingAudio] = useState(false)
  const [audioTimer, setAudioTimer] = useState(0)

  // Attachments staging
  const [stagedAttachments, setStagedAttachments] = useState<any[]>([])

  // Whiteboard inline creation mode (matches Image 2)
  const [isWhiteboardMode, setIsWhiteboardMode] = useState(false)
  const [whiteboardName, setWhiteboardName] = useState('')
  const whiteboardInputRef = useRef<HTMLInputElement>(null)

  // Document / Page inline creation mode (matches Image 1 & 2)
  const [isDocMode, setIsDocMode] = useState(false)
  const [docName, setDocName] = useState('')
  const [isDocConfigured, setIsDocConfigured] = useState(false)
  const [docMessageText, setDocMessageText] = useState('')
  const docInputRef = useRef<HTMLInputElement>(null)
  const docMsgInputRef = useRef<HTMLInputElement>(null)

  const inputRef = useRef<HTMLInputElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  // Auto close popovers when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsMenuOpen(false)
        setIsAiOpen(false)
        setIsEmojiPickerOpen(false)
        setIsSlashOpen(false)
        setIsResourceMentionOpen(false)
        setIsTypeDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Timers for recording simulations
  useEffect(() => {
    let interval: NodeJS.Timeout
    if (isRecordingVideo) {
      interval = setInterval(() => setVideoTimer((t) => t + 1), 1000)
    } else {
      setVideoTimer(0)
    }
    return () => clearInterval(interval)
  }, [isRecordingVideo])

  useEffect(() => {
    let interval: NodeJS.Timeout
    if (isRecordingAudio) {
      interval = setInterval(() => setAudioTimer((t) => t + 1), 1000)
    } else {
      setAudioTimer(0)
    }
    return () => clearInterval(interval)
  }, [isRecordingAudio])

  const handleSend = (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    if (!inputText.trim() && stagedAttachments.length === 0 && !isWhiteboardMode && !isDocMode) return

    let finalAttachments = [...stagedAttachments]
    let content = inputText.trim()

    if (isWhiteboardMode) {
      const boardTitle = whiteboardName.trim() || 'Whiteboard'
      const boardId = `board-${Math.random().toString(36).substring(2, 8)}`
      finalAttachments.push({
        id: crypto.randomUUID(),
        type: 'whiteboard',
        platform: 'whiteboard',
        title: boardTitle,
        boardId,
        link: `/app/whiteboard/${boardId}`,
        createdAt: new Date().toISOString(),
      })
      if (!content) {
        content = `/Create Whiteboard ${boardTitle}`
      }
      setIsWhiteboardMode(false)
      setWhiteboardName('')
    }

    if (isDocMode) {
      const finalDocTitle = docName.trim() || 'demo'
      finalAttachments.push({
        id: crypto.randomUUID(),
        type: 'doc',
        platform: 'Docs',
        title: finalDocTitle,
        docId: finalDocTitle,
        link: `/app/docs/${encodeURIComponent(finalDocTitle)}`,
        createdAt: new Date().toISOString(),
      })
      if (docMessageText.trim()) {
        content = docMessageText.trim()
      } else if (!content) {
        content = ''
      }
      setIsDocMode(false)
      setDocName('')
      setIsDocConfigured(false)
      setDocMessageText('')
    }

    onSendMessage(content, finalAttachments.length > 0 ? finalAttachments : undefined)
    setInputText('')
    setStagedAttachments([])
    setIsSlashOpen(false)
    setIsResourceMentionOpen(false)
    setIsEmojiPickerOpen(false)
    inputRef.current?.focus()
  }

  // Pre-configured Quick Action Generators
  const addZoomMeeting = () => {
    const meetingId = Math.floor(100000000 + Math.random() * 900000000)
    setStagedAttachments((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        type: 'meeting',
        platform: 'Zoom',
        title: `Instant Zoom Sync with ${targetName}`,
        link: `https://zoom.us/j/${meetingId}`,
        meetingId: String(meetingId),
      },
    ])
    setInputText((prev) => (prev ? prev : 'Join my Zoom meeting for a quick sync:'))
    setIsMenuOpen(false)
    inputRef.current?.focus()
  }

  const addGoogleMeet = async () => {
    const hostName = (user as any)?.name || user?.email?.split('@')[0] || 'Meeting Host'
    const hostEmail = user?.email || ''
    const hostId = user?.id || ''

    // Try to create a REAL Google Meet room via Calendar API
    // Fake random codes DON'T work — Google ignores them and creates separate rooms per user
    let meetUrl = ''
    let meetCode = ''

    try {
      const res = await fetch('/api/v1/calendar/meetings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: `Google Meet with ${targetName}`,
          startTime: new Date().toISOString(),
          attendees: [],
        }),
      })
      const data = await res.json()
      if (data?.data?.meetingUrl && data.data.meetingUrl.startsWith('http')) {
        meetUrl = data.data.meetingUrl
        const match = meetUrl.match(/meet\.google\.com\/([a-z]+-[a-z]+-[a-z]+)/i)
        meetCode = match ? match[1] : ''
      }
    } catch (err) {
      console.warn('[addGoogleMeet] Calendar API failed, using paste-link flow:', err)
    }

    setStagedAttachments((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        type: 'meeting',
        platform: 'Google Meet',
        title: `Google Meet with ${targetName}`,
        link: meetUrl,
        meetingId: meetCode,
        ownerId: hostId,
        ownerName: hostName,
        ownerEmail: hostEmail,
        createdAt: new Date().toISOString(),
      },
    ])
    setInputText((prev) => (prev ? prev : "Let's jump on Google Meet:"))
    setIsMenuOpen(false)
    inputRef.current?.focus()
  }

  const addGoogleCalendarEvent = () => {
    const today = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    setStagedAttachments((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        type: 'calendar',
        platform: 'Google Calendar',
        title: `Sprint Review Sync (${today})`,
        time: '3:00 PM - 3:30 PM',
        link: 'https://calendar.google.com',
      },
    ])
    setInputText((prev) => (prev ? prev : 'Scheduled on Google Calendar:'))
    setIsMenuOpen(false)
    inputRef.current?.focus()
  }

  const addGoogleDriveDoc = (doc?: { title: string; url?: string; type?: string }) => {
    setStagedAttachments((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        type: 'gdoc',
        platform: 'Google Drive',
        title: doc?.title || 'Untitled Document',
        link: doc?.url || 'https://docs.google.com',
        size: 'Cloud Doc',
      },
    ])
    setInputText((prev) => (prev ? prev : `Referencing Google Doc "${doc?.title || 'Untitled'}":`))
    setIsMenuOpen(false)
    inputRef.current?.focus()
  }

  const addWhiteboard = () => {
    setIsWhiteboardMode(true)
    setWhiteboardName('')
    setIsDocMode(false)
    setIsMenuOpen(false)
    setIsSlashOpen(false)
    setIsResourceMentionOpen(false)
    setIsEmojiPickerOpen(false)
    setTimeout(() => {
      whiteboardInputRef.current?.focus()
    }, 40)
  }

  const addDoc = (initialName = '') => {
    setIsDocMode(true)
    setDocName(initialName)
    setIsDocConfigured(!!initialName.trim())
    setDocMessageText('')
    setIsWhiteboardMode(false)
    setIsMenuOpen(false)
    setIsSlashOpen(false)
    setIsResourceMentionOpen(false)
    setIsEmojiPickerOpen(false)
    setTimeout(() => {
      if (initialName.trim()) {
        docMsgInputRef.current?.focus()
      } else {
        docInputRef.current?.focus()
      }
    }, 40)
  }

  const addChecklist = () => {
    setStagedAttachments((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        type: 'checklist',
        title: 'Action Item Checklist',
        items: [
          { text: 'Review project requirements', checked: false },
          { text: 'Verify code and unit test suite', checked: false },
        ],
      },
    ])
    setInputText((prev) => (prev ? prev : 'Please check off these items:'))
    setIsMenuOpen(false)
    inputRef.current?.focus()
  }

  const addGif = () => {
    const gifs = [
      'https://media.giphy.com/media/l0MYt5jPR6QX5pnqM/giphy.gif',
      'https://media.giphy.com/media/3o7abKhOpu0NwenH3O/giphy.gif',
      'https://media.giphy.com/media/26u4cqiYI30juCOGY/giphy.gif',
      'https://media.giphy.com/media/xT9IgzoKnwFNmISR8I/giphy.gif',
    ]
    const chosen = gifs[Math.floor(Math.random() * gifs.length)]
    setStagedAttachments((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        type: 'gif',
        name: 'reaction.gif',
        url: chosen,
      },
    ])
    setIsMenuOpen(false)
    inputRef.current?.focus()
  }

  const handleFinishVideoClip = () => {
    setIsRecordingVideo(false)
    setStagedAttachments((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        type: 'video_clip',
        title: `Video Clip (${videoTimer}s)`,
        url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
        duration: `${videoTimer}s`,
      },
    ])
    setVideoTimer(0)
  }

  const handleFinishAudioMemo = () => {
    setIsRecordingAudio(false)
    setStagedAttachments((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        type: 'audio_memo',
        title: `Voice Note (${audioTimer}s)`,
        duration: `${audioTimer}s`,
      },
    ])
    setAudioTimer(0)
  }

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    Array.from(files).forEach((file) => {
      const isImg = file.type.startsWith('image/')
      const isVid = file.type.startsWith('video/')
      const url = URL.createObjectURL(file)

      setStagedAttachments((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          type: isImg ? 'image' : isVid ? 'video' : 'document',
          name: file.name,
          size: `${(file.size / 1024).toFixed(1)} KB`,
          url: url,
        },
      ])
    })
    setIsMenuOpen(false)
  }

  // Formatting callback from SlashCommandPalette
  const handleSelectTextFormat = (prefix: string, suffix = '', defaultText = '') => {
    setInputText((prev) => {
      const stripped = prev.replace(/^\/\S*\s*/, '')
      return `${prefix}${stripped || defaultText}${suffix}`
    })
    setIsSlashOpen(false)
    inputRef.current?.focus()
  }

  return (
    <div className="relative w-full space-y-2 select-none">
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        className="hidden"
        onChange={handleFileUpload}
      />


      {/* STAGED ATTACHMENTS PREVIEW */}
      {stagedAttachments.length > 0 && (
        <div className="mx-2 flex flex-wrap gap-2 p-2 rounded-2xl bg-card border border-border/70 animate-fade-in">
          {stagedAttachments.map((att) => (
            <div
              key={att.id}
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-accent text-xs font-semibold text-foreground border border-border/60 shadow-2xs"
            >
              {att.type === 'meeting' ? (
                <Video className="w-3.5 h-3.5 text-emerald-500" />
              ) : att.type === 'calendar' ? (
                <Calendar className="w-3.5 h-3.5 text-blue-500" />
              ) : att.type === 'gdoc' ? (
                <FileText className="w-3.5 h-3.5 text-blue-500" />
              ) : att.type === 'whiteboard' ? (
                <FileText className="w-3.5 h-3.5 text-indigo-500" />
              ) : att.type === 'checklist' ? (
                <CheckCheck className="w-3.5 h-3.5 text-blue-500" />
              ) : att.type === 'image' || att.type === 'gif' ? (
                <ImageIcon className="w-3.5 h-3.5 text-rose-500" />
              ) : att.type === 'video_clip' ? (
                <Film className="w-3.5 h-3.5 text-purple-500" />
              ) : att.type === 'audio_memo' ? (
                <Mic className="w-3.5 h-3.5 text-amber-500" />
              ) : (
                <Paperclip className="w-3.5 h-3.5 text-primary" />
              )}
              <span className="truncate max-w-[160px]">{att.name || att.title}</span>
              <button
                type="button"
                onClick={() => setStagedAttachments((prev) => prev.filter((a) => a.id !== att.id))}
                className="p-0.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* RECORDING LIVE OVERLAYS */}
      {isRecordingVideo && (
        <div className="mx-2 p-3 rounded-2xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-between text-xs text-purple-400 font-bold animate-pulse">
          <div className="flex items-center gap-2">
            <Radio className="w-4 h-4 text-rose-500 animate-ping" />
            <span>Recording Video Clip... {videoTimer}s</span>
          </div>
          <button
            type="button"
            onClick={handleFinishVideoClip}
            className="px-3 py-1 rounded-xl bg-purple-600 text-white hover:bg-purple-500 cursor-pointer shadow-sm text-xs font-bold"
          >
            Attach Video Clip
          </button>
        </div>
      )}

      {isRecordingAudio && (
        <div className="mx-2 p-3 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between text-xs text-amber-400 font-bold animate-pulse">
          <div className="flex items-center gap-2">
            <Mic className="w-4 h-4 text-amber-500 animate-bounce" />
            <span>Recording Audio Note... {audioTimer}s</span>
          </div>
          <button
            type="button"
            onClick={handleFinishAudioMemo}
            className="px-3 py-1 rounded-xl bg-amber-600 text-white hover:bg-amber-500 cursor-pointer shadow-sm text-xs font-bold"
          >
            Attach Voice Note
          </button>
        </div>
      )}

      {/* ── EXPANSIVE INPUT CARD (Image 1 reference) ── */}
      <div
        ref={menuRef}
        className="relative mx-2 rounded-2xl border border-border/80 bg-background shadow-xs focus-within:ring-2 focus-within:ring-primary/40 focus-within:border-primary/50 transition-all"
      >
        {/* 1. SLASH COMMAND PALETTE (Matching Reference Image 1) */}
        <SlashCommandPalette
          isOpen={isSlashOpen}
          searchQuery={slashQuery}
          onClose={() => setIsSlashOpen(false)}
          onSelectTextFormat={handleSelectTextFormat}
          onOpenMentionPeople={() => {
            setIsSlashOpen(false)
            setIsResourceMentionOpen(true)
          }}
          onOpenMentionTasks={() => {
            setIsSlashOpen(false)
            setIsResourceMentionOpen(true)
          }}
          onOpenMentionDocs={() => {
            setIsSlashOpen(false)
            setIsResourceMentionOpen(true)
          }}
          onOpenWhiteboard={addWhiteboard}
          onStartGoogleMeet={addGoogleMeet}
          onStartGoogleCalendar={addGoogleCalendarEvent}
          onOpenGoogleDrive={() => addGoogleDriveDoc()}
          onStartZoomMeeting={addZoomMeeting}
          onStartRecordVideo={() => setIsRecordingVideo(true)}
          onStartRecordAudio={() => setIsRecordingAudio(true)}
          onAskAi={() => setIsAiOpen(true)}
        />

        {/* 2. RICH EMOJI PICKER (Matching Reference Image 2) */}
        <RichEmojiPicker
          isOpen={isEmojiPickerOpen}
          onClose={() => setIsEmojiPickerOpen(false)}
          onSelectEmoji={(emoji) => {
            setInputText((prev) => `${prev}${emoji}`)
            inputRef.current?.focus()
          }}
        />

        {/* 3. TABBED RESOURCE MENTION PALETTE (Matching Reference Images 1–5) */}
        <ResourceMentionPalette
          isOpen={isResourceMentionOpen}
          searchQuery={mentionQuery}
          members={members}
          tasks={tasks}
          targetType={targetType}
          activeDMUser={activeDMUser}
          currentUserId={user?.id}
          onClose={() => setIsResourceMentionOpen(false)}
          onSelectPerson={(person) => {
            setInputText((prev) => {
              const atIdx = prev.lastIndexOf('@')
              if (atIdx !== -1) {
                return `${prev.substring(0, atIdx)}@${person.name} `
              }
              return `${prev} @${person.name} `
            })
            inputRef.current?.focus()
          }}
          onSelectTask={(task) => {
            setInputText((prev) => `${prev} #${task.title} `)
            inputRef.current?.focus()
          }}
          onSelectDoc={(doc) => {
            addGoogleDriveDoc(doc)
          }}
          onSelectAgent={(agent) => {
            setInputText((prev) => `@${agent.name} `)
            inputRef.current?.focus()
          }}
          onStartGoogleMeet={addGoogleMeet}
          onStartGoogleCalendar={addGoogleCalendarEvent}
          onOpenGoogleDrive={() => addGoogleDriveDoc()}
          onOpenDoc={() => addDoc()}
        />

        {/* TOP: TEXT INPUT FIELD OR INLINE /CREATE WHITEBOARD OR /CREATE DOC CHIP */}
        <div className="px-3 pt-2.5 pb-1 flex items-center min-h-[38px]">
          {isWhiteboardMode ? (
            <div className="flex items-center gap-2 flex-1 w-full animate-fade-in">
              {/* [/Create Whiteboard] Chip matching Image 2 */}
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-zinc-800/90 text-zinc-200 text-xs font-medium border border-zinc-700/60 shadow-xs shrink-0 select-none">
                <span>/Create Whiteboard</span>
                <button
                  type="button"
                  onClick={() => {
                    setIsWhiteboardMode(false)
                    setWhiteboardName('')
                    inputRef.current?.focus()
                  }}
                  className="text-zinc-400 hover:text-zinc-100 p-0.5 rounded cursor-pointer"
                  title="Cancel whiteboard creation"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>

              {/* Input for whiteboard name with placeholder matching Image 2: "Give it a name..." */}
              <input
                ref={whiteboardInputRef}
                type="text"
                placeholder="Give it a name..."
                value={whiteboardName}
                onChange={(e) => setWhiteboardName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Backspace' && whiteboardName === '') {
                    setIsWhiteboardMode(false)
                    inputRef.current?.focus()
                  } else if (e.key === 'Escape') {
                    setIsWhiteboardMode(false)
                    setWhiteboardName('')
                    inputRef.current?.focus()
                  } else if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    handleSend()
                  }
                }}
                className="flex-1 bg-transparent text-foreground placeholder:text-muted-foreground/60 text-xs sm:text-sm focus:outline-none"
                autoFocus
              />
            </div>
          ) : isDocMode ? (
            !isDocConfigured ? (
              <div className="flex items-center gap-2 flex-1 w-full animate-fade-in">
                {/* [/Create Doc] Chip matching Image 1 */}
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-zinc-800/90 text-zinc-200 text-xs font-medium border border-zinc-700/60 shadow-xs shrink-0 select-none">
                  <span>/Create Doc</span>
                  <button
                    type="button"
                    onClick={() => {
                      setIsDocMode(false)
                      setDocName('')
                      setIsDocConfigured(false)
                      inputRef.current?.focus()
                    }}
                    className="text-zinc-400 hover:text-zinc-100 p-0.5 rounded cursor-pointer"
                    title="Cancel document creation"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>

                {/* Input for doc name with placeholder matching Image 1: "Give it a name..." */}
                <input
                  ref={docInputRef}
                  type="text"
                  placeholder="Give it a name..."
                  value={docName}
                  onChange={(e) => setDocName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Backspace' && docName === '') {
                      setIsDocMode(false)
                      inputRef.current?.focus()
                    } else if (e.key === 'Escape') {
                      setIsDocMode(false)
                      setDocName('')
                      inputRef.current?.focus()
                    } else if (e.key === 'Enter' || (e.key === ' ' && docName.trim())) {
                      if (docName.trim()) {
                        e.preventDefault()
                        setIsDocConfigured(true)
                        setTimeout(() => docMsgInputRef.current?.focus(), 40)
                      }
                    }
                  }}
                  className="flex-1 bg-transparent text-foreground placeholder:text-muted-foreground/60 text-xs sm:text-sm focus:outline-none"
                  autoFocus
                />
              </div>
            ) : (
              <div className="flex items-center gap-2 flex-1 w-full animate-fade-in">
                {/* [📄 {docName}] Pill matching Image 2 */}
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg bg-sky-950/70 text-sky-200 border border-sky-500/40 text-xs font-semibold shadow-xs shrink-0 select-none">
                  <span className="text-sky-400">📄</span>
                  <span>{docName || 'demo'}</span>
                  <button
                    type="button"
                    onClick={() => {
                      setIsDocConfigured(false)
                      setTimeout(() => docInputRef.current?.focus(), 40)
                    }}
                    className="text-sky-400/80 hover:text-sky-200 p-0.5 rounded"
                    title="Edit doc name"
                  >
                    <Edit2 className="w-2.5 h-2.5" />
                  </button>
                </div>

                {/* Page label */}
                <span className="text-xs text-muted-foreground font-medium shrink-0">Page</span>

                {/* Accompanying message input with cursor matching Image 2 */}
                <input
                  ref={docMsgInputRef}
                  type="text"
                  placeholder="Type a message or press Enter to create..."
                  value={docMessageText}
                  onChange={(e) => setDocMessageText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Backspace' && docMessageText === '') {
                      setIsDocConfigured(false)
                      setTimeout(() => docInputRef.current?.focus(), 40)
                    } else if (e.key === 'Escape') {
                      setIsDocMode(false)
                      setDocName('')
                      setIsDocConfigured(false)
                      inputRef.current?.focus()
                    } else if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault()
                      handleSend()
                    }
                  }}
                  className="flex-1 bg-transparent text-foreground placeholder:text-muted-foreground/50 text-xs sm:text-sm focus:outline-none"
                  autoFocus
                />
              </div>
            )
          ) : (
            <input
              ref={inputRef}
              type="text"
              placeholder={`Write to ${targetName}, press 'space' for AI, '/' for commands`}
              value={inputText}
              onChange={(e) => {
                const val = e.target.value
                setInputText(val)

                if (val.toLowerCase().startsWith('/create whiteboard') || val.toLowerCase() === '/whiteboard') {
                  setIsWhiteboardMode(true)
                  setWhiteboardName(val.replace(/^\/(create\s+whiteboard|whiteboard)\s*/i, ''))
                  setInputText('')
                  return
                }

                if (
                  val.toLowerCase().startsWith('/create doc') ||
                  val.toLowerCase().startsWith('/create page') ||
                  val.toLowerCase() === '/doc' ||
                  val.toLowerCase() === '/page' ||
                  val.toLowerCase().startsWith('/doc ') ||
                  val.toLowerCase().startsWith('/page ')
                ) {
                  const rawName = val.replace(/^\/(create\s+(doc|page)|doc|page)\s*/i, '')
                  addDoc(rawName)
                  setInputText('')
                  return
                }

                // Detect Slash Command
                if (val.startsWith('/')) {
                  setIsSlashOpen(true)
                  setSlashQuery(val)
                  setIsResourceMentionOpen(false)
                  setIsEmojiPickerOpen(false)
                } else {
                  setIsSlashOpen(false)
                }

                // Detect @ Mention
                const atIndex = val.lastIndexOf('@')
                if (atIndex !== -1 && (atIndex === 0 || val[atIndex - 1] === ' ')) {
                  const queryAfterAt = val.substring(atIndex + 1)
                  if (!queryAfterAt.includes(' ')) {
                    setIsResourceMentionOpen(true)
                    setMentionQuery(queryAfterAt)
                    setIsSlashOpen(false)
                    setIsEmojiPickerOpen(false)
                  } else {
                    setIsResourceMentionOpen(false)
                  }
                } else {
                  setIsResourceMentionOpen(false)
                }
              }}
              onKeyDown={(e) => {
                if (e.key === ' ' && inputText === '') {
                  e.preventDefault()
                  setIsAiOpen(true)
                } else if (e.key === 'Enter' && !e.shiftKey && !isSlashOpen && !isResourceMentionOpen) {
                  e.preventDefault()
                  handleSend()
                } else if (e.key === 'Escape') {
                  setIsSlashOpen(false)
                  setIsResourceMentionOpen(false)
                  setIsEmojiPickerOpen(false)
                }
              }}
              className="w-full text-xs sm:text-sm bg-transparent text-foreground placeholder:text-muted-foreground/70 focus:outline-none"
              autoFocus
            />
          )}
        </div>

        {/* BOTTOM: RICH ACTION TOOLBAR */}
        <div className="px-2 py-1.5 flex items-center justify-between gap-1 border-t border-border/40 mt-1">
          {/* Action icon buttons row */}
          <div className="flex items-center gap-0.5 sm:gap-1 flex-wrap">
            {/* + Main Attachment Action Menu */}
            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  setIsMenuOpen(!isMenuOpen)
                  setIsAiOpen(false)
                  setIsEmojiPickerOpen(false)
                  setIsSlashOpen(false)
                  setIsResourceMentionOpen(false)
                }}
                className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
                title="Add attachment or action"
              >
                <Plus className="w-4 h-4" />
              </button>

              {/* + Dropdown Popover Menu */}
              {isMenuOpen && (
                <div className="absolute bottom-full left-0 mb-2 w-64 bg-card/95 backdrop-blur-xl border border-border/80 rounded-2xl shadow-2xl p-2 z-50 space-y-1 animate-scale-in text-xs">
                  <button
                    type="button"
                    onClick={() => addDoc()}
                    className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-xl hover:bg-muted text-foreground transition-all cursor-pointer text-left"
                  >
                    <FileText className="w-4 h-4 text-sky-400" />
                    <span>Create Doc / Page</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-xl hover:bg-muted text-foreground transition-all cursor-pointer text-left"
                  >
                    <FileUp className="w-4 h-4 text-blue-500" />
                    <span>Upload Document or PDF</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-xl hover:bg-muted text-foreground transition-all cursor-pointer text-left"
                  >
                    <ImageIcon className="w-4 h-4 text-emerald-500" />
                    <span>Image or Video File</span>
                  </button>

                  <button
                    type="button"
                    onClick={addGif}
                    className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-xl hover:bg-muted text-foreground transition-all cursor-pointer text-left"
                  >
                    <Film className="w-4 h-4 text-pink-500" />
                    <span>Insert Animated GIF</span>
                  </button>

                  <div className="my-1 border-t border-border/50" />

                  {/* Google Workspace Actions */}
                  <button
                    type="button"
                    onClick={addGoogleMeet}
                    className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-xl hover:bg-muted text-foreground transition-all cursor-pointer text-left"
                  >
                    <Video className="w-4 h-4 text-emerald-500" />
                    <span>Start Google Meet</span>
                  </button>

                  <button
                    type="button"
                    onClick={addGoogleCalendarEvent}
                    className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-xl hover:bg-muted text-foreground transition-all cursor-pointer text-left"
                  >
                    <Calendar className="w-4 h-4 text-blue-500" />
                    <span>Schedule on Google Calendar</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => addGoogleDriveDoc()}
                    className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-xl hover:bg-muted text-foreground transition-all cursor-pointer text-left"
                  >
                    <FolderOpen className="w-4 h-4 text-amber-500" />
                    <span>Google Drive &amp; Docs</span>
                  </button>

                  <button
                    type="button"
                    onClick={addZoomMeeting}
                    className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-xl hover:bg-muted text-foreground transition-all cursor-pointer text-left"
                  >
                    <Video className="w-4 h-4 text-blue-500" />
                    <span>Start Zoom Meeting</span>
                  </button>

                  <div className="my-1 border-t border-border/50" />

                  <button
                    type="button"
                    onClick={() => {
                      setIsRecordingVideo(true)
                      setIsMenuOpen(false)
                    }}
                    className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-xl hover:bg-muted text-foreground transition-all cursor-pointer text-left"
                  >
                    <Camera className="w-4 h-4 text-purple-500" />
                    <span>Record Video Clip</span>
                  </button>

                  <button
                    type="button"
                    onClick={addWhiteboard}
                    className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-xl hover:bg-muted text-foreground transition-all cursor-pointer text-left"
                  >
                    <Layers className="w-4 h-4 text-indigo-500" />
                    <span>New Whiteboard Canvas</span>
                  </button>

                  <button
                    type="button"
                    onClick={addChecklist}
                    className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-xl hover:bg-muted text-foreground transition-all cursor-pointer text-left"
                  >
                    <CheckCheck className="w-4 h-4 text-emerald-500" />
                    <span>Interactive Checklist</span>
                  </button>
                </div>
              )}
            </div>

            {/* Message Type Selector (Matches Reference Image 1) */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsTypeDropdownOpen(!isTypeDropdownOpen)}
                className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
                title="Message type"
              >
                <span className="capitalize">{messageType === 'task_note' ? 'Task Note' : messageType}</span>
                <ChevronDown className="w-3 h-3 text-muted-foreground" />
              </button>

              {isTypeDropdownOpen && (
                <div className="absolute bottom-full left-0 mb-2 w-36 bg-card border border-border rounded-xl shadow-xl p-1 z-50 text-xs animate-scale-in">
                  {[
                    { id: 'message', label: 'Message' },
                    { id: 'announcement', label: 'Announcement' },
                    { id: 'task_note', label: 'Task Note' },
                  ].map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => {
                        setMessageType(t.id as any)
                        setIsTypeDropdownOpen(false)
                      }}
                      className={`w-full text-left px-2 py-1.5 rounded-lg transition-colors cursor-pointer ${
                        messageType === t.id ? 'bg-primary/15 text-primary font-bold' : 'hover:bg-muted'
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Sparkles / AI Assistant */}
            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  setIsAiOpen(!isAiOpen)
                  setIsMenuOpen(false)
                  setIsEmojiPickerOpen(false)
                  setIsSlashOpen(false)
                  setIsResourceMentionOpen(false)
                }}
                className="w-7 h-7 rounded-lg flex items-center justify-center text-primary hover:bg-primary/10 transition-colors cursor-pointer"
                title="AI Copilot: Ask AI or generate draft"
              >
                <Sparkles className="w-4 h-4 text-amber-500" />
              </button>

              {isAiOpen && (
                <div className="absolute bottom-full left-0 mb-2 w-72 bg-card/95 backdrop-blur-xl border border-border/80 rounded-2xl shadow-2xl p-2.5 z-50 space-y-2 animate-scale-in text-xs">
                  <div className="flex items-center gap-2 text-foreground font-bold text-xs">
                    <Sparkles className="w-4 h-4 text-amber-500" />
                    <span>TaskFlow AI Copilot (Brain²)</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    Choose a quick AI generation prompt:
                  </p>
                  <div className="space-y-1">
                    {[
                      'Summarize today’s sprint blockers',
                      'Draft a friendly greeting to the team',
                      'Create a status report checklist',
                      'Schedule a Google Meet standup',
                    ].map((prompt) => (
                      <button
                        key={prompt}
                        type="button"
                        onClick={() => {
                          setInputText(prompt)
                          setIsAiOpen(false)
                          inputRef.current?.focus()
                        }}
                        className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-primary/10 text-xs text-foreground transition-colors cursor-pointer"
                      >
                        {prompt}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* @ Mention person / resources (Matches Reference Images 1–5) */}
            <button
              type="button"
              onClick={() => {
                setIsResourceMentionOpen(!isResourceMentionOpen)
                setMentionQuery('')
                setIsSlashOpen(false)
                setIsEmojiPickerOpen(false)
                setIsMenuOpen(false)
              }}
              className={`w-7 h-7 rounded-lg flex items-center justify-center transition-colors cursor-pointer ${
                isResourceMentionOpen
                  ? 'bg-primary/15 text-primary'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted'
              }`}
              title="Mention people, tasks, docs, meetings (@)"
            >
              <AtSign className="w-4 h-4 text-indigo-400" />
            </button>

            {/* Paperclip: File attachment */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
              title="Attach documents or files"
            >
              <Paperclip className="w-4 h-4" />
            </button>

            {/* # Mention task shortcut */}
            <button
              type="button"
              onClick={() => {
                setIsResourceMentionOpen(true)
                setMentionQuery('')
                setIsSlashOpen(false)
                setIsEmojiPickerOpen(false)
                setIsMenuOpen(false)
              }}
              className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
              title="Mention a task or deliverable (#)"
            >
              <Hash className="w-4 h-4 text-blue-400" />
            </button>

            {/* User mention shortcut */}
            <button
              type="button"
              onClick={() => {
                setIsResourceMentionOpen(true)
                setMentionQuery('')
                setIsSlashOpen(false)
                setIsEmojiPickerOpen(false)
                setIsMenuOpen(false)
              }}
              className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
              title="Add member / Mention user"
            >
              <UserPlus className="w-4 h-4 text-zinc-400" />
            </button>

            {/* Emoji Picker Button (Matches Reference Image 2) */}
            <button
              type="button"
              onClick={() => {
                setIsEmojiPickerOpen(!isEmojiPickerOpen)
                setIsSlashOpen(false)
                setIsResourceMentionOpen(false)
                setIsMenuOpen(false)
              }}
              className={`w-7 h-7 rounded-lg flex items-center justify-center transition-colors cursor-pointer ${
                isEmojiPickerOpen
                  ? 'bg-amber-500/15 text-amber-500'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted'
              }`}
              title="Insert emoji"
            >
              <Smile className="w-4 h-4 text-amber-400" />
            </button>

            {/* Video / Google Meet shortcut button */}
            <button
              type="button"
              onClick={addGoogleMeet}
              className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
              title="Start Google Meet"
            >
              <Video className="w-4 h-4 text-emerald-400" />
            </button>

            {/* Checklist shortcut button */}
            <button
              type="button"
              onClick={addChecklist}
              className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
              title="Add checklist"
            >
              <CheckCheck className="w-4 h-4 text-blue-400" />
            </button>

            {/* Document / Page shortcut button (matches Image 1 & 2) */}
            <button
              type="button"
              onClick={() => addDoc()}
              className={`w-7 h-7 rounded-lg flex items-center justify-center transition-colors cursor-pointer ${
                isDocMode
                  ? 'bg-sky-500/20 text-sky-400'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted'
              }`}
              title="Create Doc / Page (/Create Doc)"
            >
              <FilePlus className="w-4 h-4 text-sky-400" />
            </button>

            {/* Whiteboard shortcut button (matches Image 2) */}
            <button
              type="button"
              onClick={addWhiteboard}
              className={`w-7 h-7 rounded-lg flex items-center justify-center transition-colors cursor-pointer ${
                isWhiteboardMode
                  ? 'bg-purple-500/20 text-purple-400'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted'
              }`}
              title="Create Collaborative Whiteboard"
            >
              <LayoutTemplate className="w-4 h-4 text-purple-400" />
            </button>

            {/* Slash commands shortcut button */}
            <button
              type="button"
              onClick={() => {
                setIsSlashOpen(!isSlashOpen)
                setSlashQuery('')
                setIsResourceMentionOpen(false)
                setIsEmojiPickerOpen(false)
                setIsMenuOpen(false)
                inputRef.current?.focus()
              }}
              className={`w-7 h-7 rounded-lg flex items-center justify-center transition-colors cursor-pointer ${
                isSlashOpen
                  ? 'bg-amber-500/15 text-amber-500'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted'
              }`}
              title="Slash commands (/)"
            >
              <Zap className="w-4 h-4 text-amber-400" />
            </button>
          </div>

          {/* Right Action Icons: Microphone + Send Button (matching Image 2) */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Microphone: Voice Memo Button */}
            <button
              type="button"
              onClick={() => {
                if (isRecordingAudio) {
                  handleFinishAudioMemo()
                } else {
                  setIsRecordingAudio(true)
                }
              }}
              className={`w-7 h-7 rounded-lg flex items-center justify-center transition-colors cursor-pointer ${
                isRecordingAudio
                  ? 'bg-rose-500 text-white animate-pulse'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted'
              }`}
              title={isRecordingAudio ? 'Stop recording voice note' : 'Record voice note'}
            >
              <Mic className="w-4 h-4" />
            </button>

            {/* Send Button with Dropdown Chevron (Light pill matching Image 2) */}
            <div className="flex items-center shadow-xs">
              <button
                type="button"
                onClick={() => handleSend()}
                disabled={isSending || (!inputText.trim() && stagedAttachments.length === 0 && !isWhiteboardMode && !isDocMode)}
                className="px-3 py-1.5 rounded-l-xl bg-white text-zinc-950 text-xs font-semibold hover:bg-zinc-100 transition-all disabled:opacity-30 disabled:pointer-events-none flex items-center justify-center cursor-pointer active:scale-95"
                title="Send message (Enter)"
              >
                <Send className="w-3.5 h-3.5 fill-zinc-950" />
              </button>
              <button
                type="button"
                onClick={() => handleSend()}
                disabled={isSending || (!inputText.trim() && stagedAttachments.length === 0 && !isWhiteboardMode && !isDocMode)}
                className="px-1.5 py-1.5 rounded-r-xl bg-white hover:bg-zinc-100 text-zinc-800 border-l border-zinc-200/80 text-xs font-bold transition-all disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
                title="Message sending options"
              >
                <ChevronDown className="w-3 h-3 text-zinc-700" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Underneath footer note matching Reference Image 1 & 2 */}
      <div className="text-[11px] text-zinc-400 dark:text-zinc-500 text-right pr-3 select-none">
        Shift + Enter to add a new line
      </div>
    </div>
  )
}
