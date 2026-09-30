'use client'

import React, { useState, useEffect, useRef, useMemo } from 'react'
import {
  Type,
  Heading1,
  Heading2,
  Heading3,
  Heading4,
  CheckSquare,
  List,
  ListOrdered,
  ChevronRight,
  Bookmark,
  Code,
  Quote,
  User,
  CheckCircle2,
  FileText,
  PenTool,
  Video,
  Calendar,
  FolderOpen,
  Camera,
  Mic,
  Sparkles,
  LayoutTemplate,
} from 'lucide-react'

export interface SlashCommand {
  id: string
  title: string
  subtitle?: string
  category: 'TEXT' | 'INLINE' | 'GOOGLE & MEETINGS' | 'TOOLS'
  iconText?: string
  icon?: React.ReactNode
  action: () => void
  keywords?: string[]
}

interface SlashCommandPaletteProps {
  isOpen: boolean
  searchQuery: string
  onClose: () => void
  onSelectTextFormat: (prefix: string, suffix?: string, defaultText?: string) => void
  onOpenMentionPeople: () => void
  onOpenMentionTasks: () => void
  onOpenMentionDocs: () => void
  onOpenDoc?: () => void
  onOpenWhiteboard: () => void
  onStartGoogleMeet: () => void
  onStartGoogleCalendar: () => void
  onOpenGoogleDrive: () => void
  onStartZoomMeeting: () => void
  onStartRecordVideo: () => void
  onStartRecordAudio: () => void
  onAskAi: () => void
}

export function SlashCommandPalette({
  isOpen,
  searchQuery,
  onClose,
  onSelectTextFormat,
  onOpenMentionPeople,
  onOpenMentionTasks,
  onOpenMentionDocs,
  onOpenDoc,
  onOpenWhiteboard,
  onStartGoogleMeet,
  onStartGoogleCalendar,
  onOpenGoogleDrive,
  onStartZoomMeeting,
  onStartRecordVideo,
  onStartRecordAudio,
  onAskAi,
}: SlashCommandPaletteProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [selectedIndex, setSelectedIndex] = useState(0)

  // 1. Column 1 of TEXT (Matches Reference Image 1)
  const textCol1: SlashCommand[] = useMemo(
    () => [
      {
        id: 'normal-text',
        title: 'Normal text',
        category: 'TEXT',
        iconText: 'T',
        action: () => onSelectTextFormat('', '', ''),
        keywords: ['normal', 'p', 'paragraph', 'text', 'plain'],
      },
      {
        id: 'heading-1',
        title: 'Heading 1',
        category: 'TEXT',
        iconText: 'H1',
        action: () => onSelectTextFormat('# ', '', 'Heading 1'),
        keywords: ['h1', 'title', 'heading', 'large'],
      },
      {
        id: 'heading-2',
        title: 'Heading 2',
        category: 'TEXT',
        iconText: 'H2',
        action: () => onSelectTextFormat('## ', '', 'Heading 2'),
        keywords: ['h2', 'subheading', 'heading'],
      },
      {
        id: 'heading-3',
        title: 'Heading 3',
        category: 'TEXT',
        iconText: 'H3',
        action: () => onSelectTextFormat('### ', '', 'Heading 3'),
        keywords: ['h3', 'section', 'heading'],
      },
      {
        id: 'heading-4',
        title: 'Heading 4',
        category: 'TEXT',
        iconText: 'H4',
        action: () => onSelectTextFormat('#### ', '', 'Heading 4'),
        keywords: ['h4', 'small heading'],
      },
      {
        id: 'checklist',
        title: 'Checklist',
        category: 'TEXT',
        icon: <CheckSquare className="w-3.5 h-3.5 text-zinc-500 dark:text-zinc-400" />,
        action: () => onSelectTextFormat('- [ ] ', '', 'Task item'),
        keywords: ['todo', 'task', 'checklist', 'checkbox', 'done'],
      },
      {
        id: 'bulleted-list',
        title: 'Bulleted list',
        category: 'TEXT',
        icon: <List className="w-3.5 h-3.5 text-zinc-500 dark:text-zinc-400" />,
        action: () => onSelectTextFormat('- ', '', 'List item'),
        keywords: ['bullet', 'list', 'points', 'unordered'],
      },
    ],
    [onSelectTextFormat]
  )

  // 2. Column 2 of TEXT (Matches Reference Image 1)
  const textCol2: SlashCommand[] = useMemo(
    () => [
      {
        id: 'numbered-list',
        title: 'Numbered list',
        category: 'TEXT',
        iconText: '1=',
        action: () => onSelectTextFormat('1. ', '', 'Step one'),
        keywords: ['number', 'ordered', 'step', 'list'],
      },
      {
        id: 'toggle-list',
        title: 'Toggle list',
        category: 'TEXT',
        icon: <ChevronRight className="w-3.5 h-3.5 text-zinc-500 dark:text-zinc-400" />,
        action: () => onSelectTextFormat('> ▶ ', '', 'Expandable details'),
        keywords: ['toggle', 'collapse', 'accordion', 'details'],
      },
      {
        id: 'banners',
        title: 'Banners',
        category: 'TEXT',
        icon: <Bookmark className="w-3.5 h-3.5 text-zinc-500 dark:text-zinc-400" />,
        action: () => onSelectTextFormat('> [!NOTE]\n> ', '', 'Important workspace announcement'),
        keywords: ['banner', 'callout', 'alert', 'note', 'warning', 'info'],
      },
      {
        id: 'code-block',
        title: 'Code block',
        category: 'TEXT',
        icon: <Code className="w-3.5 h-3.5 text-zinc-500 dark:text-zinc-400" />,
        action: () => onSelectTextFormat('```typescript\n', '\n```', '// code snippet'),
        keywords: ['code', 'snippet', 'syntax', 'programming', 'pre'],
      },
      {
        id: 'block-quote',
        title: 'Block quote',
        category: 'TEXT',
        iconText: '99',
        action: () => onSelectTextFormat('> ', '', 'Quote text'),
        keywords: ['quote', 'blockquote', 'cite'],
      },
      {
        id: 'pull-quote',
        title: 'Pull quote',
        category: 'TEXT',
        iconText: '99',
        action: () => onSelectTextFormat('> "', '"\n> — Reference', 'Inspiring quote'),
        keywords: ['pull quote', 'highlight', 'quote'],
      },
    ],
    [onSelectTextFormat]
  )

  // 3. Column 1 & 2 of INLINE (Matches Reference Image 1)
  const inlineCol1: SlashCommand[] = useMemo(
    () => [
      {
        id: 'mention-person',
        title: 'Mention a Person',
        category: 'INLINE',
        icon: <User className="w-3.5 h-3.5 text-zinc-500 dark:text-zinc-400" />,
        action: onOpenMentionPeople,
        keywords: ['person', 'people', 'user', 'member', 'team', '@'],
      },
      {
        id: 'mention-task',
        title: 'Mention a Task',
        category: 'INLINE',
        icon: <CheckCircle2 className="w-3.5 h-3.5 text-zinc-500 dark:text-zinc-400" />,
        action: onOpenMentionTasks,
        keywords: ['task', 'bug', 'issue', 'ticket', '#'],
      },
    ],
    [onOpenMentionPeople, onOpenMentionTasks]
  )

  const inlineCol2: SlashCommand[] = useMemo(
    () => [
      {
        id: 'create-doc',
        title: 'Create Doc',
        subtitle: 'Start collaborative document / page',
        category: 'INLINE',
        icon: <FileText className="w-3.5 h-3.5 text-sky-400" />,
        action: onOpenDoc || onOpenMentionDocs,
        keywords: ['create doc', 'doc', 'page', 'create page', 'document', 'wiki'],
      },
      {
        id: 'mention-page',
        title: 'Mention a Page',
        category: 'INLINE',
        icon: <FileText className="w-3.5 h-3.5 text-zinc-500 dark:text-zinc-400" />,
        action: onOpenMentionDocs,
        keywords: ['page', 'doc', 'document', 'spec', 'wiki'],
      },
      {
        id: 'create-whiteboard',
        title: 'Create Whiteboard',
        subtitle: 'Start collaborative whiteboard canvas',
        category: 'INLINE',
        icon: <LayoutTemplate className="w-3.5 h-3.5 text-purple-400" />,
        action: onOpenWhiteboard,
        keywords: ['create whiteboard', 'whiteboard', 'canvas', 'sketch', 'draw', 'diagram', 'krya'],
      },
      {
        id: 'mention-whiteboard',
        title: 'Mention a Whiteboard',
        category: 'INLINE',
        icon: <PenTool className="w-3.5 h-3.5 text-zinc-500 dark:text-zinc-400" />,
        action: onOpenWhiteboard,
        keywords: ['whiteboard', 'canvas', 'sketch', 'draw', 'diagram'],
      },
    ],
    [onOpenDoc, onOpenMentionDocs, onOpenWhiteboard]
  )

  // 4. GOOGLE & MEETINGS
  const googleCommands: SlashCommand[] = useMemo(
    () => [
      {
        id: 'google-meet',
        title: 'Google Meet',
        subtitle: 'Start instant or scheduled video sync',
        category: 'GOOGLE & MEETINGS',
        icon: <Video className="w-3.5 h-3.5 text-emerald-500" />,
        action: onStartGoogleMeet,
        keywords: ['google meet', 'meet', 'video', 'call', 'conference', 'hangouts'],
      },
      {
        id: 'google-calendar',
        title: 'Google Calendar',
        subtitle: 'Schedule a sprint event with team',
        category: 'GOOGLE & MEETINGS',
        icon: <Calendar className="w-3.5 h-3.5 text-blue-500" />,
        action: onStartGoogleCalendar,
        keywords: ['calendar', 'google calendar', 'event', 'schedule', 'invite'],
      },
      {
        id: 'google-drive',
        title: 'Google Drive & Docs',
        subtitle: 'Attach Google Doc, Sheet, or Slide',
        category: 'GOOGLE & MEETINGS',
        icon: <FolderOpen className="w-3.5 h-3.5 text-amber-500" />,
        action: onOpenGoogleDrive,
        keywords: ['drive', 'google drive', 'docs', 'sheets', 'slides', 'cloud'],
      },
      {
        id: 'zoom',
        title: 'Zoom Meeting',
        subtitle: 'Start instant Zoom conference',
        category: 'GOOGLE & MEETINGS',
        icon: <Video className="w-3.5 h-3.5 text-blue-500" />,
        action: onStartZoomMeeting,
        keywords: ['zoom', 'call', 'video'],
      },
    ],
    [onStartGoogleMeet, onStartGoogleCalendar, onOpenGoogleDrive, onStartZoomMeeting]
  )

  // 5. TOOLS & AI
  const toolCommands: SlashCommand[] = useMemo(
    () => [
      {
        id: 'record-video',
        title: 'Record Video Clip',
        subtitle: 'Screen or camera recording',
        category: 'TOOLS',
        icon: <Camera className="w-3.5 h-3.5 text-purple-400" />,
        action: onStartRecordVideo,
        keywords: ['record', 'video', 'clip', 'screen', 'loom'],
      },
      {
        id: 'record-audio',
        title: 'Record Voice Memo',
        subtitle: 'Send audio note to team',
        category: 'TOOLS',
        icon: <Mic className="w-3.5 h-3.5 text-amber-400" />,
        action: onStartRecordAudio,
        keywords: ['voice', 'audio', 'mic', 'note', 'memo'],
      },
      {
        id: 'ask-ai',
        title: 'TaskFlow AI (Brain²)',
        subtitle: 'Ask, Build, Create',
        category: 'TOOLS',
        icon: <Sparkles className="w-3.5 h-3.5 text-primary" />,
        action: onAskAi,
        keywords: ['ai', 'brain', 'ask', 'generate', 'summarize'],
      },
    ],
    [onStartRecordVideo, onStartRecordAudio, onAskAi]
  )

  // All commands flat
  const allCommands = useMemo(
    () => [...textCol1, ...textCol2, ...inlineCol1, ...inlineCol2, ...googleCommands, ...toolCommands],
    [textCol1, textCol2, inlineCol1, inlineCol2, googleCommands, toolCommands]
  )

  const cleanQuery = searchQuery.replace(/^\//, '').toLowerCase().trim()

  const filteredCommands = useMemo(() => {
    if (!cleanQuery) return allCommands
    return allCommands.filter((cmd) => {
      if (cmd.title.toLowerCase().includes(cleanQuery)) return true
      if (cmd.subtitle?.toLowerCase().includes(cleanQuery)) return true
      if (cmd.keywords?.some((k) => k.toLowerCase().includes(cleanQuery))) return true
      return false
    })
  }, [allCommands, cleanQuery])

  // Keyboard navigation
  useEffect(() => {
    setSelectedIndex(0)
  }, [cleanQuery])

  useEffect(() => {
    if (!isOpen) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setSelectedIndex((prev) => (prev + 1) % Math.max(1, filteredCommands.length))
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setSelectedIndex((prev) => (prev - 1 + filteredCommands.length) % Math.max(1, filteredCommands.length))
      } else if (e.key === 'Enter') {
        e.preventDefault()
        if (filteredCommands[selectedIndex]) {
          filteredCommands[selectedIndex].action()
          onClose()
        }
      } else if (e.key === 'Escape') {
        e.preventDefault()
        onClose()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, filteredCommands, selectedIndex, onClose])

  if (!isOpen) return null

  const renderCommandItem = (cmd: SlashCommand, index: number) => {
    const isSelected = index === selectedIndex
    return (
      <button
        key={cmd.id}
        type="button"
        onClick={() => {
          cmd.action()
          onClose()
        }}
        onMouseEnter={() => setSelectedIndex(index)}
        className={`w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-left transition-all cursor-pointer ${
          isSelected
            ? 'bg-zinc-100 dark:bg-zinc-800 text-foreground font-medium shadow-2xs'
            : 'hover:bg-zinc-100/70 dark:hover:bg-zinc-800/60 text-zinc-700 dark:text-zinc-200'
        }`}
      >
        {/* Grey rounded-square icon badge matching reference image */}
        <div className="w-6 h-6 rounded-md bg-zinc-100 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700/60 flex items-center justify-center shrink-0">
          {cmd.icon ? (
            cmd.icon
          ) : (
            <span className="text-[11px] font-bold text-zinc-600 dark:text-zinc-300 font-mono">
              {cmd.iconText || '•'}
            </span>
          )}
        </div>

        <div className="min-w-0 flex-1 truncate">
          <div className="truncate text-xs font-medium text-foreground">{cmd.title}</div>
          {cmd.subtitle && (
            <div className="truncate text-[10px] text-muted-foreground font-normal">{cmd.subtitle}</div>
          )}
        </div>
      </button>
    )
  }

  // Linear index counter
  let linearIndex = 0

  return (
    <div
      ref={containerRef}
      className="absolute bottom-full left-2 mb-2 w-96 max-w-[calc(100vw-2rem)] max-h-96 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-xl overflow-hidden flex flex-col z-50 animate-scale-in select-none text-xs"
    >
      {/* Top Banner / Suggestions label */}
      <div className="px-4 py-2 border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50 flex items-center justify-between shrink-0">
        <span className="text-[11px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">
          SUGGESTIONS
        </span>
        {cleanQuery && (
          <span className="text-[11px] text-primary font-semibold">
            &quot;{cleanQuery}&quot;
          </span>
        )}
      </div>

      {/* Commands List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-4 custom-scrollbar max-h-80">
        {cleanQuery ? (
          // Filtered view
          <div className="space-y-1">
            {filteredCommands.length === 0 ? (
              <div className="p-6 text-center text-muted-foreground">
                <p className="font-semibold text-xs text-foreground">No commands found</p>
                <p className="text-[11px] mt-0.5">Try typing /h1, /checklist, /meet, or /code</p>
              </div>
            ) : (
              filteredCommands.map((cmd, idx) => renderCommandItem(cmd, idx))
            )}
          </div>
        ) : (
          // Default layout matching reference image
          <>
            {/* 1. TEXT SECTION */}
            <div className="space-y-1.5">
              <div className="px-1 text-[11px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">
                TEXT
              </div>
              <div className="flex gap-2">
                {/* Column 1 */}
                <div className="flex-1 space-y-1">
                  {textCol1.map((cmd) => renderCommandItem(cmd, linearIndex++))}
                </div>
                {/* Column 2 */}
                <div className="flex-1 space-y-1">
                  {textCol2.map((cmd) => renderCommandItem(cmd, linearIndex++))}
                </div>
              </div>
            </div>

            {/* 2. INLINE SECTION */}
            <div className="space-y-1.5">
              <div className="px-1 text-[11px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">
                INLINE
              </div>
              <div className="flex gap-2">
                {/* Column 1 */}
                <div className="flex-1 space-y-1">
                  {inlineCol1.map((cmd) => renderCommandItem(cmd, linearIndex++))}
                </div>
                {/* Column 2 */}
                <div className="flex-1 space-y-1">
                  {inlineCol2.map((cmd) => renderCommandItem(cmd, linearIndex++))}
                </div>
              </div>
            </div>

            {/* 3. GOOGLE & MEETINGS SECTION */}
            <div className="space-y-1.5">
              <div className="px-1 text-[11px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">
                GOOGLE &amp; MEETINGS
              </div>
              <div className="grid grid-cols-2 gap-1">
                {googleCommands.map((cmd) => renderCommandItem(cmd, linearIndex++))}
              </div>
            </div>

            {/* 4. TOOLS & AI SECTION */}
            <div className="space-y-1.5">
              <div className="px-1 text-[11px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">
                TOOLS &amp; AI
              </div>
              <div className="grid grid-cols-2 gap-1">
                {toolCommands.map((cmd) => renderCommandItem(cmd, linearIndex++))}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

