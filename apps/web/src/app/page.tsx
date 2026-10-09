'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/stores/auth-store'
import { TaskFlowLogo } from '@/components/brand/TaskFlowLogo'
import {
  CheckCircle2,
  Sparkles,
  ArrowRight,
  Kanban,
  Table2,
  Calendar as CalendarIcon,
  Users,
  FileText,
  FileSpreadsheet,
  Image as ImageIcon,
  Move,
  MessageSquare,
  ShieldCheck,
  Zap,
  Layers,
  ChevronRight,
  Plus,
  Paperclip,
  Download,
  Clock,
  FolderKanban,
  Check,
  Star,
  GripVertical,
  RotateCcw,
  FileCode,
  Lock,
  Eye,
  Copy,
  UserPlus,
  CheckCheck,
  Mail,
  KeyRound,
  Shield,
  ArrowUpRight,
  Search,
  X,
  ExternalLink,
} from 'lucide-react'

interface ShowcaseTask {
  id: string
  title: string
  priority: 'HIGH' | 'MEDIUM' | 'CRITICAL' | 'FEATURE' | 'DONE'
  priorityColor: string
  progress?: number
  progressColor?: string
  files?: string
  subtasks?: string
  avatar?: string
  completed?: boolean
}

interface ShowcaseColumn {
  id: string
  title: string
  accentColor: string
  dotClass: string
  badgeClass: string
  tasks: ShowcaseTask[]
}

const INITIAL_SHOWCASE_COLUMNS: ShowcaseColumn[] = [
  {
    id: 'col-todo',
    title: 'To Do',
    accentColor: '#94a3b8',
    dotClass: 'w-2 h-2 rounded-full bg-slate-400',
    badgeClass: 'text-slate-400 font-mono border border-[#2B2B2B]',
    tasks: [
      {
        id: 'task-1',
        priority: 'HIGH',
        priorityColor: 'bg-amber-500/15 text-amber-300 border border-amber-500/20',
        progress: 0,
        title: 'Payment Gateway Integration',
        files: '3 files',
        subtasks: '2 subtasks',
      },
      {
        id: 'task-2',
        priority: 'MEDIUM',
        priorityColor: 'bg-[#00638E]/20 text-[#BFD8E3] border border-[#00638E]/40',
        title: 'OAuth Security Audit & Tokens',
        files: 'specs.docx',
      },
    ],
  },
  {
    id: 'col-in-progress',
    title: 'In Progress',
    accentColor: '#00638E',
    dotClass: 'w-2 h-2 rounded-full bg-[#00638E] animate-pulse',
    badgeClass: 'bg-[#00638E]/20 text-[#BFD8E3] font-mono border border-[#00638E]/30',
    tasks: [
      {
        id: 'task-3',
        priority: 'CRITICAL',
        priorityColor: 'bg-rose-500/15 text-rose-300 border border-rose-500/20',
        progress: 75,
        progressColor: 'bg-gradient-to-r from-[#00638E] to-[#8CB9CC]',
        title: 'Multi-Format Document Vault',
        files: 'data.xlsx',
        avatar: 'TF',
      },
      {
        id: 'task-4',
        priority: 'FEATURE',
        priorityColor: 'bg-[#00638E]/20 text-[#BFD8E3] border border-[#00638E]/30',
        progress: 50,
        progressColor: 'bg-[#00638E]',
        title: 'Universal Card Drag & Drop',
      },
    ],
  },
  {
    id: 'col-in-review',
    title: 'In Review',
    accentColor: '#f59e0b',
    dotClass: 'w-2 h-2 rounded-full bg-amber-500',
    badgeClass: 'bg-[#141414] text-slate-400 font-mono border border-[#2B2B2B]',
    tasks: [
      {
        id: 'task-5',
        priority: 'HIGH',
        priorityColor: 'bg-amber-500/15 text-amber-300 border border-amber-500/20',
        progress: 90,
        progressColor: 'bg-amber-400',
        title: 'Subtask Progress Calculation',
      },
    ],
  },
  {
    id: 'col-completed',
    title: 'Completed',
    accentColor: '#10b981',
    dotClass: 'w-2 h-2 rounded-full bg-emerald-500',
    badgeClass: 'bg-emerald-500/10 text-emerald-300 font-mono border border-emerald-500/20',
    tasks: [
      {
        id: 'task-6',
        priority: 'DONE',
        priorityColor: 'bg-emerald-500/20 text-emerald-300',
        progress: 100,
        title: 'Sprint Architecture Setup',
        subtasks: 'All 4 subtasks verified',
        completed: true,
      },
    ],
  },
]

interface ShowcaseDoc {
  id: string
  name: string
  type: 'pdf' | 'sheet' | 'doc' | 'code' | 'figma' | 'env'
  category: 'architecture' | 'data' | 'security' | 'design' | 'config'
  size: string
  updatedAt: string
  author: string
  avatar: string
  linkedTask: string
  badgeText: string
  badgeClass: string
  checksum: string
  description: string
}

const SHOWCASE_DOCS: ShowcaseDoc[] = [
  {
    id: 'doc-1',
    name: 'System_Architecture_v2.pdf',
    type: 'pdf',
    category: 'architecture',
    size: '4.2 MB',
    updatedAt: '2 hours ago',
    author: 'Alex Rivera',
    avatar: 'AR',
    linkedTask: 'Sprint Architecture Setup',
    badgeText: 'PDF BLUEPRINT',
    badgeClass: 'bg-rose-500/15 text-rose-300 border-rose-500/30',
    checksum: 'sha256: 8f4e2...a19c',
    description: 'High-availability microservice topology, event queues, and failover routing specification for TaskFlow 2.0.',
  },
  {
    id: 'doc-2',
    name: 'Q4_Capacity_Planning.xlsx',
    type: 'sheet',
    category: 'data',
    size: '1.8 MB',
    updatedAt: 'Yesterday',
    author: 'Sarah Chen',
    avatar: 'SC',
    linkedTask: 'Multi-Format Document Vault',
    badgeText: 'EXCEL SPREADSHEET',
    badgeClass: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
    checksum: 'sha256: d3b91...7e40',
    description: 'Comprehensive AWS instance sizing, Redis memory allocation, and socket connection capacity modeling.',
  },
  {
    id: 'doc-3',
    name: 'OAuth2_ZeroTrust_Audit.docx',
    type: 'doc',
    category: 'security',
    size: '840 KB',
    updatedAt: '3 days ago',
    author: 'Marcus Vance',
    avatar: 'MV',
    linkedTask: 'OAuth Security Audit & Tokens',
    badgeText: 'SPECIFICATION',
    badgeClass: 'bg-[#00638E]/20 text-[#BFD8E3] border-[#00638E]/40',
    checksum: 'sha256: c19aa...004f',
    description: 'Cryptographic token refresh protocols, PKCE flow compliance, and session revocation security checklist.',
  },
  {
    id: 'doc-4',
    name: 'taskflow_design_system.fig',
    type: 'figma',
    category: 'design',
    size: '12.6 MB',
    updatedAt: '4 days ago',
    author: 'Elena Rostova',
    avatar: 'ER',
    linkedTask: 'Universal Card Drag & Drop',
    badgeText: 'FIGMA ASSET',
    badgeClass: 'bg-purple-500/15 text-purple-300 border-purple-500/30',
    checksum: 'sha256: f018a...e582',
    description: 'Complete component tokens, glassmorphic card styles, dark mode elevation palette, and micro-interaction states.',
  },
  {
    id: 'doc-5',
    name: 'production_pipeline.env',
    type: 'env',
    category: 'config',
    size: '12 KB',
    updatedAt: '5 days ago',
    author: 'Alex Rivera',
    avatar: 'AR',
    linkedTask: 'Payment Gateway Integration',
    badgeText: 'ENCRYPTED SECRETS',
    badgeClass: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
    checksum: 'sha256: 77a10...92b3',
    description: 'AES-256 encrypted production environment variable template with zero-knowledge vault injection.',
  },
  {
    id: 'doc-6',
    name: 'socket_cluster_benchmark.ts',
    type: 'code',
    category: 'architecture',
    size: '45 KB',
    updatedAt: '1 week ago',
    author: 'David Kim',
    avatar: 'DK',
    linkedTask: 'Real-Time Sync Engine',
    badgeText: 'SOURCE CODE',
    badgeClass: 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30',
    checksum: 'sha256: 3b401...8c11',
    description: 'High-concurrency k6 load test harness validating sub-10ms WebSocket broadcast propagation across 10,000 tabs.',
  },
]

interface ShowcaseMember {
  id: string
  name: string
  email: string
  role: 'OWNER' | 'ADMIN' | 'MEMBER'
  roleBadgeClass: string
  status: 'ONLINE' | 'IN_MEETING' | 'AWAY'
  statusClass: string
  avatar: string
  avatarBg: string
  projects: string[]
  joinedDate: string
}

const SHOWCASE_MEMBERS: ShowcaseMember[] = [
  {
    id: 'mem-1',
    name: 'Alex Rivera',
    email: 'alex@taskflow.dev',
    role: 'OWNER',
    roleBadgeClass: 'bg-[#00638E]/25 text-[#BFD8E3] border-[#00638E]/50',
    status: 'ONLINE',
    statusClass: 'bg-emerald-400',
    avatar: 'AR',
    avatarBg: 'bg-[#00638E]',
    projects: ['Core Engine', 'Sprint 24', 'Security'],
    joinedDate: 'Workspace Founder',
  },
  {
    id: 'mem-2',
    name: 'Sarah Chen',
    email: 'sarah@taskflow.dev',
    role: 'ADMIN',
    roleBadgeClass: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40',
    status: 'ONLINE',
    statusClass: 'bg-emerald-400',
    avatar: 'SC',
    avatarBg: 'bg-[#004A6B]',
    projects: ['Document Vault', 'Security Audit'],
    joinedDate: 'Joined 6 months ago',
  },
  {
    id: 'mem-3',
    name: 'Marcus Vance',
    email: 'marcus@taskflow.dev',
    role: 'MEMBER',
    roleBadgeClass: 'bg-white/10 text-slate-300 border-white/15',
    status: 'IN_MEETING',
    statusClass: 'bg-amber-400',
    avatar: 'MV',
    avatarBg: 'bg-purple-600',
    projects: ['Frontend UI', 'Kanban Board'],
    joinedDate: 'Joined 3 months ago',
  },
  {
    id: 'mem-4',
    name: 'Elena Rostova',
    email: 'elena@taskflow.dev',
    role: 'MEMBER',
    roleBadgeClass: 'bg-white/10 text-slate-300 border-white/15',
    status: 'AWAY',
    statusClass: 'bg-slate-400',
    avatar: 'ER',
    avatarBg: 'bg-pink-600',
    projects: ['Design Tokens', 'Mobile App'],
    joinedDate: 'Joined 1 month ago',
  },
]

interface ShowcaseInvite {
  id: string
  email: string
  role: 'ADMIN' | 'MEMBER' | 'VIEWER'
  expiresIn: string
  sentAt: string
}

const INITIAL_INVITES: ShowcaseInvite[] = [
  {
    id: 'inv-1',
    email: 'max.kowalski@enterprise.com',
    role: 'MEMBER',
    expiresIn: 'Expires in 46 hours',
    sentAt: 'Yesterday',
  },
  {
    id: 'inv-2',
    email: 'jessica.wu@fintech.io',
    role: 'VIEWER',
    expiresIn: 'Expires in 71 hours',
    sentAt: '2 hours ago',
  },
]

export default function LandingPage() {
  const router = useRouter()
  const { user, isAuthenticated, loadUser } = useAuthStore()
  const [hasCheckedAuth, setHasCheckedAuth] = useState(false)
  const [activeTab, setActiveTab] = useState<'kanban' | 'grid' | 'calendar' | 'vault' | 'teams'>('kanban')

  // Document Vault Display State
  const [docCategory, setDocCategory] = useState<'all' | 'architecture' | 'data' | 'security' | 'design' | 'config'>('all')
  const [docSearch, setDocSearch] = useState('')

  // Team & Invites Showcase State
  const [teamTab, setTeamTab] = useState<'roster' | 'invites' | 'rbac'>('roster')
  const [inviteRole, setInviteRole] = useState<'ADMIN' | 'MEMBER' | 'VIEWER'>('MEMBER')
  const teamInvites = INITIAL_INVITES

  // Drag and Drop State for Showcase Workspace
  const [columns, setColumns] = useState<ShowcaseColumn[]>(INITIAL_SHOWCASE_COLUMNS)
  const [draggedTask, setDraggedTask] = useState<{ taskId: string; sourceColId: string } | null>(null)
  const [dragOverTarget, setDragOverTarget] = useState<{ colId: string; index: number } | null>(null)
  const [draggedColumnId, setDraggedColumnId] = useState<string | null>(null)
  const [dragOverColumnId, setDragOverColumnId] = useState<string | null>(null)

  const handleTaskDragStart = (e: React.DragEvent, taskId: string, sourceColId: string) => {
    e.stopPropagation()
    setDraggedTask({ taskId, sourceColId })
    setDraggedColumnId(null)
    e.dataTransfer.setData('text/plain', JSON.stringify({ type: 'task', taskId, sourceColId }))
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleTaskDragOver = (e: React.DragEvent, colId: string, index: number) => {
    e.preventDefault()
    e.stopPropagation()
    e.dataTransfer.dropEffect = 'move'
    if (!draggedTask) return

    const rect = e.currentTarget.getBoundingClientRect()
    const offset = e.clientY - rect.top
    const isBottomHalf = offset > rect.height / 2
    const targetIndex = isBottomHalf ? index + 1 : index

    setDragOverTarget({ colId, index: targetIndex })
  }

  const handleColumnDragStart = (e: React.DragEvent, colId: string) => {
    if (draggedTask) return
    setDraggedColumnId(colId)
    e.dataTransfer.setData('text/plain', JSON.stringify({ type: 'column', colId }))
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleColumnContainerDragOver = (e: React.DragEvent, colId: string) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    if (draggedColumnId) {
      if (draggedColumnId !== colId) {
        setDragOverColumnId(colId)
      }
      return
    }
    if (!draggedTask) return
    const col = columns.find((c) => c.id === colId)
    if (col && (!dragOverTarget || dragOverTarget.colId !== colId)) {
      setDragOverTarget({ colId, index: col.tasks.length })
    }
  }

  const handleDrop = (e: React.DragEvent, targetColId: string) => {
    e.preventDefault()
    e.stopPropagation()

    // 1. Column drop
    if (draggedColumnId) {
      if (draggedColumnId !== targetColId) {
        setColumns((prev) => {
          const fromIdx = prev.findIndex((c) => c.id === draggedColumnId)
          const toIdx = prev.findIndex((c) => c.id === targetColId)
          if (fromIdx === -1 || toIdx === -1) return prev
          const updated = [...prev]
          const [movedCol] = updated.splice(fromIdx, 1)
          updated.splice(toIdx, 0, movedCol)
          return updated
        })
      }
      setDraggedColumnId(null)
      setDragOverColumnId(null)
      return
    }

    // 2. Task drop
    if (!draggedTask) return

    const { taskId, sourceColId } = draggedTask
    const destIndex = dragOverTarget?.index ?? 0

    setColumns((prev) => {
      const newColumns = prev.map((col) => ({
        ...col,
        tasks: [...col.tasks],
      }))

      const sourceCol = newColumns.find((c) => c.id === sourceColId)
      const targetCol = newColumns.find((c) => c.id === targetColId)
      if (!sourceCol || !targetCol) return prev

      const taskIndex = sourceCol.tasks.findIndex((t) => t.id === taskId)
      if (taskIndex === -1) return prev

      const [movedTask] = sourceCol.tasks.splice(taskIndex, 1)

      let insertIdx = destIndex
      if (sourceColId === targetColId && taskIndex < destIndex) {
        insertIdx = Math.max(0, destIndex - 1)
      }
      insertIdx = Math.min(insertIdx, targetCol.tasks.length)

      if (targetColId === 'col-completed') {
        movedTask.completed = true
      } else {
        movedTask.completed = false
      }

      targetCol.tasks.splice(insertIdx, 0, movedTask)
      return newColumns
    })

    setDraggedTask(null)
    setDragOverTarget(null)
  }

  const handleDragEnd = () => {
    setDraggedTask(null)
    setDragOverTarget(null)
    setDraggedColumnId(null)
    setDragOverColumnId(null)
  }

  useEffect(() => {
    loadUser().finally(() => {
      setHasCheckedAuth(true)
    })
  }, [loadUser])

  return (
    <div className="min-h-screen bg-[#000000] text-slate-100 flex flex-col selection:bg-[#00638E]/40 selection:text-[#BFD8E3] overflow-x-hidden font-sans pt-16">
      {/* Ambient background glow meshes */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[850px] h-[520px] bg-gradient-to-tr from-[#004A6B]/30 via-[#00638E]/25 to-[#8CB9CC]/15 rounded-full blur-[140px] opacity-70" />
        <div className="absolute top-[600px] -left-60 w-[600px] h-[600px] bg-[#00638E]/12 rounded-full blur-[150px] opacity-50" />
        <div className="absolute top-[1200px] -right-60 w-[600px] h-[600px] bg-[#004A6B]/15 rounded-full blur-[150px] opacity-50" />
      </div>

      {/* Top Navbar: Fixed Header that stays while content scrolls */}
      <header className="fixed top-0 left-0 right-0 z-50 w-full border-b border-[#2B2B2B]/70 bg-[#000000]/90 backdrop-blur-xl transition-all shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-3 group cursor-pointer">
            <TaskFlowLogo variant="full" size="md" colorScheme="dark" textClassName="text-white text-xl" animated={true} />
            <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded-md bg-[#00638E]/20 text-[#BFD8E3] border border-[#00638E]/40 ml-1">
              v2.0
            </span>
          </Link>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center gap-8 text-xs font-semibold text-slate-300">
            <a href="#features" className="hover:text-white transition-colors">
              Features
            </a>
            <a href="#views" className="hover:text-white transition-colors">
              Workspace Views
            </a>
            <a href="#documents" className="hover:text-white transition-colors">
              Document Vault
            </a>
            <a href="#collaboration" className="hover:text-white transition-colors">
              Team & Invites
            </a>
          </nav>

          {/* Auth Actions: Always ask Sign In & Sign Up */}
          <div className="flex items-center gap-2.5">
            <Link
              href="/login"
              prefetch={true}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-200 hover:text-white bg-[#141414] hover:bg-[#2B2B2B] border border-[#2B2B2B] transition-all cursor-pointer shadow-sm"
            >
              Sign In
            </Link>

            <Link
              href="/register"
              prefetch={true}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-[#004A6B] via-[#00638E] to-[#00638E] hover:brightness-110 text-white shadow-lg shadow-[#00638E]/30 hover:shadow-[#00638E]/50 transition-all active:scale-95 cursor-pointer"
            >
              <span>Sign Up</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section (Dedicated First Screen) */}
      <section className="relative z-10 min-h-[calc(100vh-4rem)] max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center flex flex-col justify-between items-center py-10 sm:py-16 select-none">
        <div /> {/* Top spacer for balanced vertical centering */}

        <div className="flex flex-col items-center max-w-5xl">
          {/* Announcement Pill */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#00638E]/15 border border-[#00638E]/30 text-[#BFD8E3] text-xs font-medium mb-8 hover:bg-[#00638E]/25 transition-all cursor-pointer shadow-sm">
            <span className="flex h-2 w-2 rounded-full bg-[#00638E] animate-ping" />
            <span className="font-semibold text-[#BFD8E3]">TaskFlow 2.0 Enterprise Release</span>
            <span className="text-[#BFD8E3]/60">•</span>
            <span>Next-gen agile execution & pipeline tracking</span>
            <ChevronRight className="w-3.5 h-3.5 text-[#BFD8E3]" />
          </div>

          {/* Hero Title */}
          <h1 className="max-w-4xl text-4xl sm:text-6xl md:text-7xl font-extrabold tracking-tight leading-[1.08] mb-6">
            High-Velocity Project Execution.{' '}
            <span className="bg-gradient-to-r from-white via-[#BFD8E3] to-[#8CB9CC] bg-clip-text text-transparent">
              Engineered for Modern Teams.
            </span>
          </h1>

          {/* Hero Subtitle */}
          <p className="max-w-2xl text-base sm:text-lg text-slate-300 font-normal leading-relaxed mb-8">
            Streamline complex engineering workflows with zero friction. Plan multi-environment deliverables,
            track sprint progress with subtask precision, attach mission-critical assets, and coordinate in real time.
          </p>

          {/* Call to Actions: Sign Up & Sign In to Continue Flow */}
          <div className="flex flex-col sm:flex-row items-center gap-3.5 mb-8 w-full sm:w-auto">
            <Link
              href="/register"
              prefetch={true}
              className="flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-xs sm:text-sm font-bold bg-gradient-to-r from-[#004A6B] via-[#00638E] to-[#00638E] hover:brightness-110 text-white shadow-xl shadow-[#00638E]/35 hover:shadow-[#00638E]/50 transition-all active:scale-95 cursor-pointer w-full sm:w-auto"
            >
              <span>Get Started & Sign Up</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/login"
              prefetch={true}
              className="flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-xs sm:text-sm font-semibold text-slate-200 hover:text-white bg-[#141414] hover:bg-[#232323] border border-[#2B2B2B] hover:border-slate-600 transition-all cursor-pointer shadow-sm w-full sm:w-auto"
            >
              <span>Sign In to Your Account</span>
            </Link>
          </div>

          {/* Feature Badges */}
          <div className="flex flex-wrap items-center justify-center gap-6 text-xs text-slate-400 font-medium">
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-[#BFD8E3]" />
              No credit card required
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-[#00638E]" />
              Instant team onboarding
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-[#8CB9CC]" />
              Sub-millisecond reactivity
            </span>
          </div>
        </div>

        {/* Fun, Elegant Animated Scroll Down Indicator */}
        <a
          href="#views"
          className="mt-6 flex flex-col items-center gap-2 text-xs font-semibold text-slate-400 hover:text-white transition-all group cursor-pointer"
        >
          <span className="text-[11px] uppercase tracking-widest text-[#8CB9CC] group-hover:text-white transition-colors flex items-center gap-1.5 font-bold">
            <Sparkles className="w-3.5 h-3.5 text-[#00638E] animate-pulse" />
            Explore Interactive Workspace
          </span>
          <div className="w-5 h-8 rounded-full border border-slate-700/80 group-hover:border-[#00638E] flex items-start justify-center p-1 transition-colors">
            <div className="w-1.5 h-2 rounded-full bg-[#00638E] animate-bounce" />
          </div>
        </a>
      </section>

      {/* Interactive Product Showcase (Dedicated Separate Screen with Sticky Scrollable & Premium Animations) */}
      <section id="views" className="relative z-10 min-h-screen max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 flex flex-col justify-center">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-10 space-y-3">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#00638E]/15 border border-[#00638E]/30 text-[#BFD8E3] text-xs font-semibold">
            <Layers className="w-3.5 h-3.5 text-[#00638E]" />
            <span>Multi-Dimensional Workspace Engine</span>
          </div>
          <h2 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight">
            Fluid Agile Execution.{' '}
            <span className="bg-gradient-to-r from-white via-[#BFD8E3] to-[#8CB9CC] bg-clip-text text-transparent">
              Live In-Browser.
            </span>
          </h2>
          <p className="text-sm sm:text-base text-slate-400 leading-relaxed">
            Drag cards across swimlanes, reorder columns, inspect tree hierarchies, and monitor sprint schedules with
            zero reload delay.
          </p>
        </div>

        {/* Sticky Showcase Container with Glowing Gradient Border & Fun Micro-Animations */}
        <div className="sticky top-20 z-20 group/showcase">
          <div className="relative rounded-3xl p-[1px] bg-gradient-to-b from-[#00638E]/60 via-[#2B2B2B] to-[#004A6B]/30 shadow-[0_0_50px_-10px_rgba(0,99,142,0.35)] transition-all duration-500 hover:shadow-[0_0_70px_-10px_rgba(0,99,142,0.5)]">
            <div className="rounded-[23px] bg-[#0c0d12]/95 backdrop-blur-2xl shadow-2xl p-4 sm:p-6 overflow-hidden">
          {/* Top Bar with View Switchers */}
          <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-[#2B2B2B]/60">
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-rose-500/80" />
                <span className="w-3 h-3 rounded-full bg-amber-500/80" />
                <span className="w-3 h-3 rounded-full bg-emerald-500/80" />
              </div>
              <span className="ml-3 text-xs font-semibold text-slate-400">TaskFlow Workspace</span>
            </div>

            {/* Interactive Tab Switcher */}
            <div className="flex items-center p-1 rounded-xl bg-[#000000]/80 border border-[#2B2B2B] text-xs font-semibold">
              <button
                onClick={() => setActiveTab('kanban')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  activeTab === 'kanban'
                    ? 'bg-[#00638E] text-white shadow-sm shadow-[#00638E]/40'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Kanban className="w-3.5 h-3.5" />
                <span>Task Board</span>
              </button>
              <button
                onClick={() => setActiveTab('grid')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  activeTab === 'grid'
                    ? 'bg-[#00638E] text-white shadow-sm shadow-[#00638E]/40'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Table2 className="w-3.5 h-3.5" />
                <span>Grid & Tree</span>
              </button>
              <button
                onClick={() => setActiveTab('calendar')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  activeTab === 'calendar'
                    ? 'bg-[#00638E] text-white shadow-sm shadow-[#00638E]/40'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <CalendarIcon className="w-3.5 h-3.5" />
                <span>Sprint Calendar</span>
              </button>
              <button
                onClick={() => setActiveTab('vault')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  activeTab === 'vault'
                    ? 'bg-[#00638E] text-white shadow-sm shadow-[#00638E]/40'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                <span>Document Vault</span>
              </button>
              <button
                onClick={() => setActiveTab('teams')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  activeTab === 'teams'
                    ? 'bg-[#00638E] text-white shadow-sm shadow-[#00638E]/40'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                <span>Team & Invites</span>
              </button>
            </div>
          </div>

          {/* Interactive Tab Content */}
          <div className="pt-6 min-h-[380px]">
            {activeTab === 'kanban' && (
              <div className="space-y-3">
                {/* Drag-and-drop status & reset bar */}
                <div className="flex flex-wrap items-center justify-between gap-2 pb-1 text-xs text-slate-400">
                  <div className="flex items-center gap-2">
                    <span className="flex h-2 w-2 rounded-full bg-[#00638E] animate-pulse" />
                    <span className="text-[11px] font-medium text-slate-300">
                      Drag task cards to any position or column • Drag column cards to reorder
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setColumns(INITIAL_SHOWCASE_COLUMNS)
                      setDraggedTask(null)
                      setDragOverTarget(null)
                      setDraggedColumnId(null)
                      setDragOverColumnId(null)
                    }}
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-medium bg-[#141414] hover:bg-[#202020] border border-[#2B2B2B] text-slate-300 hover:text-white transition-all cursor-pointer shadow-sm active:scale-95"
                    title="Reset to default arrangement"
                  >
                    <RotateCcw className="w-3 h-3 text-[#BFD8E3]" />
                    <span>Reset Board</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {columns.map((col, colIdx) => {
                    const isColumnBeingDragged = draggedColumnId === col.id
                    const isColumnDropTarget = dragOverColumnId === col.id

                    return (
                      <div
                        key={col.id}
                        draggable={!draggedTask}
                        onDragStart={(e) => handleColumnDragStart(e, col.id)}
                        onDragOver={(e) => handleColumnContainerDragOver(e, col.id)}
                        onDrop={(e) => handleDrop(e, col.id)}
                        onDragEnd={handleDragEnd}
                        className={`rounded-2xl border transition-all flex flex-col gap-2.5 p-3 min-h-[340px] select-none ${
                          isColumnBeingDragged
                            ? 'opacity-35 scale-[0.98] border-[#00638E] ring-2 ring-[#00638E]/50'
                            : isColumnDropTarget
                            ? 'border-[#00638E] bg-[#00638E]/10 shadow-lg shadow-[#00638E]/20'
                            : 'border-[#2B2B2B] bg-[#000000]/60 hover:border-[#2B2B2B]/90'
                        }`}
                      >
                        {/* Column Header: Draggable */}
                        <div
                          className="flex items-center justify-between pb-1 cursor-grab active:cursor-grabbing group/header"
                          title="Drag to reorder column position"
                        >
                          <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                            <GripVertical className="w-3.5 h-3.5 text-slate-500 opacity-40 group-hover/header:opacity-100 transition-opacity" />
                            <span className={col.dotClass} />
                            <span
                              className={
                                col.id === 'col-in-progress'
                                  ? 'text-[#BFD8E3]'
                                  : col.id === 'col-in-review'
                                  ? 'text-amber-400'
                                  : col.id === 'col-completed'
                                  ? 'text-emerald-400'
                                  : 'text-slate-300'
                              }
                            >
                              {col.title}
                            </span>
                          </span>
                          <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${col.badgeClass}`}>
                            {col.tasks.length}
                          </span>
                        </div>

                        {/* Task List with Drag and Drop */}
                        <div className="flex-1 flex flex-col gap-2.5">
                          {col.tasks.map((task, taskIdx) => {
                            const isBeingDragged = draggedTask?.taskId === task.id
                            const isDropTargetTop =
                              dragOverTarget?.colId === col.id && dragOverTarget?.index === taskIdx
                            const isDropTargetBottom =
                              dragOverTarget?.colId === col.id &&
                              dragOverTarget?.index === taskIdx + 1 &&
                              taskIdx === col.tasks.length - 1

                            return (
                              <React.Fragment key={task.id}>
                                {/* Drop indicator insertion line before card */}
                                {isDropTargetTop && (
                                  <div className="h-1.5 w-full bg-gradient-to-r from-[#00638E] via-[#8CB9CC] to-[#00638E] rounded-full shadow-lg shadow-[#00638E]/60 animate-pulse my-0.5 transition-all" />
                                )}

                                {/* Task Card */}
                                <div
                                  draggable={true}
                                  onDragStart={(e) => handleTaskDragStart(e, task.id, col.id)}
                                  onDragOver={(e) => handleTaskDragOver(e, col.id, taskIdx)}
                                  onDrop={(e) => handleDrop(e, col.id)}
                                  onDragEnd={handleDragEnd}
                                  className={`group p-3 rounded-xl border transition-all cursor-grab active:cursor-grabbing ${
                                    isBeingDragged
                                      ? 'opacity-30 scale-[0.97] border-[#00638E] ring-2 ring-[#00638E]/50 shadow-2xl bg-[#00638E]/10'
                                      : col.id === 'col-in-progress' && task.id === 'task-3'
                                      ? 'border-[#00638E]/40 bg-[#00638E]/10 hover:border-[#00638E]/80 hover:shadow-md'
                                      : col.id === 'col-completed' || task.completed
                                      ? 'border-emerald-500/20 bg-emerald-500/5 hover:border-emerald-500/40 hover:shadow-md'
                                      : 'border-[#2B2B2B] bg-[#141414] hover:border-[#00638E]/50 hover:shadow-md'
                                  }`}
                                >
                                  {/* Top row: Priority badge + Progress or Grip */}
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-1.5">
                                      <span
                                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${task.priorityColor}`}
                                      >
                                        {task.priority}
                                      </span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      {task.progress !== undefined && (
                                        <span
                                          className={`text-[10px] font-mono ${
                                            col.id === 'col-completed' || task.completed
                                              ? 'text-emerald-400 font-bold'
                                              : task.priority === 'CRITICAL'
                                              ? 'text-[#BFD8E3] font-bold'
                                              : task.priority === 'HIGH' && task.progress > 0
                                              ? 'text-amber-300 font-bold'
                                              : 'text-slate-400'
                                          }`}
                                        >
                                          {task.progress}%
                                        </span>
                                      )}
                                      <GripVertical className="w-3 h-3 text-slate-500 opacity-30 group-hover:opacity-100 transition-opacity shrink-0" />
                                    </div>
                                  </div>

                                  {/* Task Title */}
                                  <p
                                    className={`text-xs font-semibold pt-1 ${
                                      col.id === 'col-completed' || task.completed
                                        ? 'text-slate-200 line-through opacity-80'
                                        : col.id === 'col-in-progress' && task.id === 'task-3'
                                        ? 'text-white'
                                        : 'text-slate-200'
                                    }`}
                                  >
                                    {task.title}
                                  </p>

                                  {/* Progress bar */}
                                  {task.progress !== undefined && task.progress > 0 && !task.completed && (
                                    <div className="w-full h-1.5 rounded-full bg-white/10 overflow-hidden my-1">
                                      <div
                                        className={`h-full rounded-full ${
                                          task.progressColor || 'bg-[#00638E]'
                                        }`}
                                        style={{ width: `${task.progress}%` }}
                                      />
                                    </div>
                                  )}

                                  {/* Metadata row */}
                                  {(task.files || task.subtasks || task.avatar) && (
                                    <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1">
                                      <div className="flex items-center gap-2">
                                        {task.files && (
                                          <span className="flex items-center gap-1 text-slate-400">
                                            {task.files.includes('xlsx') ? (
                                              <FileSpreadsheet className="w-3 h-3 text-[#8CB9CC]" />
                                            ) : task.files.includes('docx') ? (
                                              <FileText className="w-3 h-3 text-[#BFD8E3]" />
                                            ) : (
                                              <Paperclip className="w-3 h-3 text-[#BFD8E3]" />
                                            )}
                                            <span>{task.files}</span>
                                          </span>
                                        )}
                                        {task.subtasks && (
                                          <span className="flex items-center gap-1 text-slate-400">
                                            {col.id === 'col-completed' || task.completed ? (
                                              <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                                            ) : (
                                              <Layers className="w-3 h-3 text-[#00638E]" />
                                            )}
                                            <span>{task.subtasks}</span>
                                          </span>
                                        )}
                                      </div>
                                      {task.avatar && (
                                        <span className="w-5 h-5 rounded-full bg-[#00638E] flex items-center justify-center text-[10px] font-bold text-white shadow-sm">
                                          {task.avatar}
                                        </span>
                                      )}
                                    </div>
                                  )}
                                </div>

                                {/* Drop indicator insertion line after last card */}
                                {isDropTargetBottom && (
                                  <div className="h-1.5 w-full bg-gradient-to-r from-[#00638E] via-[#8CB9CC] to-[#00638E] rounded-full shadow-lg shadow-[#00638E]/60 animate-pulse my-0.5 transition-all" />
                                )}
                              </React.Fragment>
                            )
                          })}

                          {/* Empty column placeholder / drop area */}
                          {col.tasks.length === 0 && (
                            <div
                              onDragOver={(e) => {
                                e.preventDefault()
                                setDragOverTarget({ colId: col.id, index: 0 })
                              }}
                              className={`flex-1 min-h-[140px] rounded-xl border border-dashed transition-all flex flex-col items-center justify-center gap-2 p-4 text-xs ${
                                dragOverTarget?.colId === col.id
                                  ? 'border-[#00638E] bg-[#00638E]/10 text-[#BFD8E3]'
                                  : 'border-[#2B2B2B] text-slate-500 hover:border-slate-600'
                              }`}
                            >
                              <Layers className="w-4 h-4 opacity-40" />
                              <span className="font-medium">Drop tasks here</span>
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {activeTab === 'grid' && (
              <div className="overflow-x-auto rounded-xl border border-[#2B2B2B] bg-[#000000]/40">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-[#2B2B2B] text-slate-400 font-bold uppercase tracking-wider text-[10px] bg-[#141414]">
                    <tr>
                      <th className="p-3">Task / Subtask</th>
                      <th className="p-3">Status</th>
                      <th className="p-3">Priority</th>
                      <th className="p-3">Progress</th>
                      <th className="p-3">Attachments</th>
                      <th className="p-3">Assignee</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#2B2B2B] text-slate-300">
                    <tr className="hover:bg-[#141414] font-semibold">
                      <td className="p-3 flex items-center gap-2">
                        <Move className="w-3 h-3 text-[#8CB9CC]" />
                        <span className="text-white">API Gateway & Rate Limiter</span>
                      </td>
                      <td className="p-3">
                        <span className="px-2 py-0.5 rounded-md bg-[#00638E]/20 text-[#BFD8E3] border border-[#00638E]/40 font-bold text-[10px]">
                          IN PROGRESS
                        </span>
                      </td>
                      <td className="p-3 text-rose-400 font-bold text-[10px]">CRITICAL</td>
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          <div className="w-20 h-1.5 rounded-full bg-white/10 overflow-hidden">
                            <div className="h-full bg-gradient-to-r from-[#00638E] to-[#8CB9CC] rounded-full w-[80%]" />
                          </div>
                          <span className="font-mono text-[10px] text-[#BFD8E3]">80%</span>
                        </div>
                      </td>
                      <td className="p-3 text-[10px] text-slate-400">config.env, architecture.pdf</td>
                      <td className="p-3 text-[#BFD8E3]">Alex Rivera</td>
                    </tr>
                    <tr className="hover:bg-[#141414] bg-[#000000]/20">
                      <td className="p-3 pl-8 flex items-center gap-2 text-slate-300">
                        <span className="text-[#00638E]">↳</span>
                        <span>Token Bucket Algorithm Implementation</span>
                      </td>
                      <td className="p-3">
                        <span className="px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 font-bold text-[10px]">
                          DONE
                        </span>
                      </td>
                      <td className="p-3 text-amber-400 font-bold text-[10px]">HIGH</td>
                      <td className="p-3 font-mono text-[10px] text-emerald-400">100%</td>
                      <td className="p-3 text-[10px] text-slate-400">tests.py</td>
                      <td className="p-3 text-[#BFD8E3]">Sarah Chen</td>
                    </tr>
                    <tr className="hover:bg-[#141414] bg-[#000000]/20">
                      <td className="p-3 pl-8 flex items-center gap-2 text-slate-300">
                        <span className="text-[#00638E]">↳</span>
                        <span>Redis Cluster Deployment</span>
                      </td>
                      <td className="p-3">
                        <span className="px-2 py-0.5 rounded-md bg-[#00638E]/20 text-[#BFD8E3] border border-[#00638E]/30 font-bold text-[10px]">
                          IN PROGRESS
                        </span>
                      </td>
                      <td className="p-3 text-[#8CB9CC] font-bold text-[10px]">MEDIUM</td>
                      <td className="p-3 font-mono text-[10px] text-[#BFD8E3]">60%</td>
                      <td className="p-3 text-[10px] text-slate-400">compose.yaml</td>
                      <td className="p-3 text-[#BFD8E3]">Alex Rivera</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}

            {activeTab === 'calendar' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span className="font-bold text-white">Sprint 24 • September 2026</span>
                  <span>Drag tasks to change schedule</span>
                </div>
                <div className="grid grid-cols-5 gap-2 text-center text-xs">
                  {['Mon 14', 'Tue 15', 'Wed 16', 'Thu 17', 'Fri 18'].map((day, i) => (
                    <div
                      key={day}
                      className="rounded-xl border border-[#2B2B2B] bg-[#000000]/50 p-3 flex flex-col gap-2 min-h-[160px]"
                    >
                      <span className="font-bold text-slate-400 text-[11px]">{day}</span>
                      {i === 1 && (
                        <div className="p-2 rounded-lg bg-[#00638E]/20 border border-[#00638E]/40 text-left text-[11px] font-semibold text-[#BFD8E3]">
                          Sprint Planning
                        </div>
                      )}
                      {i === 2 && (
                        <div className="p-2 rounded-lg bg-amber-500/20 border border-amber-500/30 text-left text-[11px] font-semibold text-amber-200">
                          UI Review & Feedback
                        </div>
                      )}
                      {i === 4 && (
                        <div className="p-2 rounded-lg bg-emerald-500/20 border border-emerald-500/30 text-left text-[11px] font-semibold text-emerald-200">
                          Release v2.0
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'vault' && (
              <div className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-xl bg-[#000000]/60 border border-[#2B2B2B]">
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-bold text-white">Task-Linked Asset Vault</span>
                    <span className="px-2.5 py-1 rounded-lg bg-[#00638E]/20 border border-[#00638E]/40 text-[#BFD8E3] text-xs font-bold flex items-center gap-1.5">
                      <Lock className="w-3.5 h-3.5" /> AES-256 Encrypted
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <a
                      href="#documents"
                      className="px-3 py-1 rounded-lg bg-[#141414] hover:bg-[#202020] border border-[#2B2B2B] text-slate-200 hover:text-white font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <FileSpreadsheet className="w-3.5 h-3.5 text-[#BFD8E3]" />
                      <span>Universal Vault Explorer ↓</span>
                    </a>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
                  {SHOWCASE_DOCS.slice(0, 3).map((doc) => (
                    <div
                      key={doc.id}
                      className="p-3.5 rounded-xl border border-[#2B2B2B] bg-[#141414] hover:border-[#00638E]/50 transition-all space-y-2.5 flex flex-col justify-between"
                    >
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${doc.badgeClass}`}>
                            {doc.badgeText}
                          </span>
                          <span className="text-[10px] font-mono text-slate-400">{doc.size}</span>
                        </div>
                        <p className="font-bold text-white text-xs truncate">{doc.name}</p>
                        <p className="text-[10px] text-slate-400 line-clamp-1">{doc.description}</p>
                      </div>

                      <div className="pt-2 border-t border-[#2B2B2B]/40 flex items-center justify-between gap-2 text-[10px]">
                        <span className="text-[9px] text-[#8CB9CC] truncate max-w-[140px] flex items-center gap-1 font-medium">
                          <Paperclip className="w-2.5 h-2.5" />
                          <span>{doc.linkedTask}</span>
                        </span>
                        <span className="font-mono text-slate-500 text-[9px]">{doc.checksum.slice(0, 12)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'teams' && (
              <div className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-xl bg-[#000000]/60 border border-[#2B2B2B]">
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-bold text-white">Teams & Projects Overview</span>
                    <span className="px-2.5 py-1 rounded-lg bg-[#00638E]/20 border border-[#00638E]/40 text-[#BFD8E3] text-xs font-bold flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5" /> {teamInvites.length} Pending Invitations
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <a
                      href="#collaboration"
                      className="px-3 py-1 rounded-lg bg-[#141414] hover:bg-[#202020] border border-[#2B2B2B] text-slate-200 hover:text-white font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <UserPlus className="w-3.5 h-3.5 text-[#BFD8E3]" />
                      <span>Full Governance & RBAC Console ↓</span>
                    </a>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  <div className="p-3.5 rounded-xl border border-[#2B2B2B] bg-[#141414] flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-[#00638E] flex items-center justify-center font-bold text-white shadow-sm">
                        AR
                      </div>
                      <div>
                        <p className="font-bold text-white">Alex Rivera</p>
                        <p className="text-[10px] text-slate-400">alex@taskflow.dev</p>
                      </div>
                    </div>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-[#00638E]/20 text-[#BFD8E3] border border-[#00638E]/30 font-bold">
                      OWNER
                    </span>
                  </div>

                  <div className="p-3.5 rounded-xl border border-[#2B2B2B] bg-[#141414] flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-[#004A6B] flex items-center justify-center font-bold text-white shadow-sm">
                        SC
                      </div>
                      <div>
                        <p className="font-bold text-white">Sarah Chen</p>
                        <p className="text-[10px] text-slate-400">sarah@taskflow.dev</p>
                      </div>
                    </div>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-white/10 text-slate-300 font-bold border border-white/5">
                      ADMIN
                    </span>
                  </div>

                  <div className="p-3.5 rounded-xl border border-amber-500/20 bg-amber-500/5 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-amber-600/30 text-amber-300 flex items-center justify-center font-bold">
                        MK
                      </div>
                      <div>
                        <p className="font-bold text-white">Max Kowalski</p>
                        <p className="text-[10px] text-amber-300">Invitation Pending</p>
                      </div>
                    </div>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 font-bold border border-amber-500/20">
                      INVITED
                    </span>
                  </div>
                </div>
              </div>
            )}
            </div>
          </div>
        </div>
      </div>
    </section>

      {/* Universal Document Vault Section */}
      <section id="documents" className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 border-t border-[#2B2B2B]/60">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#00638E]/15 border border-[#00638E]/30 text-[#BFD8E3] text-xs font-semibold mb-3">
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>Universal Document Vault</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
              Mission-Critical Assets.{' '}
              <span className="bg-gradient-to-r from-white via-[#BFD8E3] to-[#8CB9CC] bg-clip-text text-transparent">
                Directly in Context.
              </span>
            </h2>
            <p className="text-sm text-slate-400 max-w-2xl mt-3 leading-relaxed">
              Eliminate third-party cloud drive sprawl. Attach specifications, architecture schemas, financial models,
              design tokens, and encrypted credentials directly to tasks with sub-millisecond in-browser preview.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 text-xs">
            <span className="px-3 py-1.5 rounded-xl bg-[#141414] border border-[#2B2B2B] text-slate-300 flex items-center gap-1.5 font-medium shadow-sm">
              <Lock className="w-3.5 h-3.5 text-[#00638E]" /> AES-256 Encrypted
            </span>
            <span className="px-3 py-1.5 rounded-xl bg-[#141414] border border-[#2B2B2B] text-slate-300 flex items-center gap-1.5 font-medium shadow-sm">
              <Zap className="w-3.5 h-3.5 text-amber-400" /> Sub-10ms Stream
            </span>
            <span className="px-3 py-1.5 rounded-xl bg-[#141414] border border-[#2B2B2B] text-slate-300 flex items-center gap-1.5 font-medium shadow-sm">
              <Layers className="w-3.5 h-3.5 text-emerald-400" /> 40+ Formats Parsed
            </span>
          </div>
        </div>

        {/* Vault Explorer Card */}
        <div className="rounded-3xl border border-[#2B2B2B] bg-[#141414]/90 backdrop-blur-2xl shadow-2xl p-6 sm:p-8 space-y-6">
          {/* Top Filter and Search Bar */}
          <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4 pb-4 border-b border-[#2B2B2B]/60">
            {/* Category Pills */}
            <div className="flex flex-wrap items-center gap-2">
              {[
                { id: 'all', label: 'All Files', count: SHOWCASE_DOCS.length },
                { id: 'architecture', label: 'Architecture & Code', count: 2 },
                { id: 'data', label: 'Data & Sheets', count: 1 },
                { id: 'security', label: 'Security & Specs', count: 1 },
                { id: 'design', label: 'Design Tokens', count: 1 },
                { id: 'config', label: 'Encrypted Secrets', count: 1 },
              ].map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setDocCategory(cat.id as any)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                    docCategory === cat.id
                      ? 'bg-[#00638E] text-white shadow-sm shadow-[#00638E]/40'
                      : 'bg-[#1c1c1c] text-slate-400 hover:text-white hover:bg-[#252525] border border-[#2B2B2B]'
                  }`}
                >
                  <span>{cat.label}</span>
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                    docCategory === cat.id ? 'bg-white/20 text-white' : 'bg-black/30 text-slate-500'
                  }`}>
                    {cat.count}
                  </span>
                </button>
              ))}
            </div>

            {/* Search Input */}
            <div className="relative min-w-[240px]">
              <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={docSearch}
                onChange={(e) => setDocSearch(e.target.value)}
                placeholder="Search documents or checksums..."
                className="w-full pl-9 pr-4 py-2 rounded-xl text-xs bg-[#0c0d12] border border-[#2B2B2B] text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-[#00638E] transition-all"
              />
              {docSearch && (
                <button
                  onClick={() => setDocSearch('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Document Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {SHOWCASE_DOCS.filter((doc) => {
              const matchesCategory = docCategory === 'all' || doc.category === docCategory
              const matchesSearch =
                !docSearch ||
                doc.name.toLowerCase().includes(docSearch.toLowerCase()) ||
                doc.linkedTask.toLowerCase().includes(docSearch.toLowerCase()) ||
                doc.description.toLowerCase().includes(docSearch.toLowerCase())
              return matchesCategory && matchesSearch
            }).map((doc) => (
              <div
                key={doc.id}
                className="p-4 rounded-2xl border border-[#2B2B2B] bg-[#0c0d12]/80 hover:border-[#00638E]/50 hover:bg-[#10121a] transition-all space-y-3 group flex flex-col justify-between"
              >
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${doc.badgeClass}`}>
                      {doc.badgeText}
                    </span>
                    <span className="text-[10px] font-mono text-slate-400">{doc.size}</span>
                  </div>

                  <div className="flex items-start gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-[#141414] border border-[#2B2B2B] flex items-center justify-center shrink-0 group-hover:border-[#00638E]/50 transition-colors">
                      {doc.type === 'sheet' ? (
                        <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
                      ) : doc.type === 'code' ? (
                        <FileCode className="w-4 h-4 text-indigo-400" />
                      ) : doc.type === 'figma' ? (
                        <ImageIcon className="w-4 h-4 text-purple-400" />
                      ) : doc.type === 'env' ? (
                        <Lock className="w-4 h-4 text-amber-400" />
                      ) : (
                        <FileText className="w-4 h-4 text-[#BFD8E3]" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-white truncate group-hover:text-[#BFD8E3] transition-colors">
                        {doc.name}
                      </p>
                      <p className="text-[10px] text-slate-400">
                        Uploaded by <span className="text-slate-300 font-medium">{doc.author}</span> • {doc.updatedAt}
                      </p>
                    </div>
                  </div>

                  <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed">
                    {doc.description}
                  </p>
                </div>

                <div className="pt-2 border-t border-[#2B2B2B]/40 flex items-center justify-between text-[10px] text-slate-400">
                  <span className="flex items-center gap-1.5 text-[#8CB9CC] font-medium">
                    <Paperclip className="w-3.5 h-3.5" />
                    <span className="truncate max-w-[170px]">{doc.linkedTask}</span>
                  </span>
                  <span className="font-mono text-slate-500 text-[10px] flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-400/80" />
                    <span>{doc.checksum.slice(0, 14)}</span>
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Quick Feature Badges Footer */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t border-[#2B2B2B]/60 text-xs text-slate-400">
            <div className="flex items-center gap-2.5">
              <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Immutable cryptographic tamper checksums on all assets</span>
            </div>
            <div className="flex items-center gap-2.5">
              <Zap className="w-4 h-4 text-amber-400 shrink-0" />
              <span>Native parsers for Markdown, Code, PDF, and Sheets</span>
            </div>
            <div className="flex items-center gap-2.5">
              <Layers className="w-4 h-4 text-[#BFD8E3] shrink-0" />
              <span>Direct bidirectional linking to task cards & subtasks</span>
            </div>
          </div>
        </div>
      </section>

      {/* Team & Invites Management Section */}
      <section id="collaboration" className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 border-t border-[#2B2B2B]/60">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#00638E]/15 border border-[#00638E]/30 text-[#BFD8E3] text-xs font-semibold mb-3">
              <Users className="w-3.5 h-3.5" />
              <span>Frictionless Team Governance</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
              Instant Team Onboarding.{' '}
              <span className="bg-gradient-to-r from-white via-[#BFD8E3] to-[#8CB9CC] bg-clip-text text-transparent">
                Zero Governance Friction.
              </span>
            </h2>
            <p className="text-sm text-slate-400 max-w-2xl mt-3 leading-relaxed">
              Invite teammates via cryptographically signed tokens, manage granular role permissions, and track active
              contributors across workspaces and sprint pipelines with zero delay.
            </p>
          </div>

          <div className="flex items-center gap-4 text-xs font-semibold">
            <div className="px-3.5 py-2 rounded-xl bg-[#141414] border border-[#2B2B2B] text-slate-300 flex items-center gap-2 shadow-sm">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>4 Active Contributors</span>
            </div>
            <div className="px-3.5 py-2 rounded-xl bg-[#141414] border border-[#2B2B2B] text-slate-300 flex items-center gap-2 shadow-sm">
              <span className="w-2 h-2 rounded-full bg-amber-400" />
              <span>{teamInvites.length} Pending Invites</span>
            </div>
          </div>
        </div>

        {/* Interactive Team Console Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column: Live Invite Dispatcher */}
          <div className="lg:col-span-1 rounded-3xl border border-[#2B2B2B] bg-[#141414]/90 backdrop-blur-2xl shadow-2xl p-6 sm:p-7 space-y-6 flex flex-col justify-between">
            <div className="space-y-5">
              <div className="flex items-center justify-between pb-3 border-b border-[#2B2B2B]">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-[#00638E]/20 text-[#BFD8E3] flex items-center justify-center border border-[#00638E]/30">
                    <UserPlus className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-white">Invite Teammate</h3>
                    <p className="text-[10px] text-slate-400">Generate secure signup tokens</p>
                  </div>
                </div>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 font-bold border border-emerald-500/20">
                  LIVE
                </span>
              </div>

              <form onSubmit={(e) => e.preventDefault()} className="space-y-4">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1.5">
                    Colleague Work Email
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="email"
                      placeholder="e.g. dev@yourcompany.com"
                      className="w-full pl-9 pr-3 py-2 rounded-xl text-xs bg-[#0c0d12] border border-[#2B2B2B] text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-[#00638E] transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1.5">
                    Workspace Role Permission
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {(['MEMBER', 'ADMIN', 'VIEWER'] as const).map((r) => (
                      <button
                        key={r}
                        type="button"
                        onClick={() => setInviteRole(r)}
                        className={`py-1.5 rounded-xl text-[11px] font-bold transition-all cursor-pointer border ${
                          inviteRole === r
                            ? 'bg-[#00638E] border-[#00638E] text-white shadow-sm shadow-[#00638E]/40'
                            : 'bg-[#0c0d12] border-[#2B2B2B] text-slate-400 hover:text-white'
                        }`}
                      >
                        {r}
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  type="button"
                  className="w-full py-2.5 rounded-xl bg-gradient-to-r from-[#004A6B] via-[#00638E] to-[#00638E] hover:brightness-110 text-white font-bold text-xs transition-all flex items-center justify-center gap-2 shadow-lg shadow-[#00638E]/30 active:scale-95 cursor-pointer"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>Send Workspace Invitation</span>
                </button>
              </form>
            </div>

            {/* Quick Share Link Box */}
            <div className="pt-4 border-t border-[#2B2B2B]/60 space-y-2">
              <div className="flex items-center justify-between text-[11px] text-slate-400">
                <span className="font-semibold text-slate-300">Universal Referral Link</span>
                <span className="text-[10px] text-slate-500">Auto-joins default space</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex-1 py-1.5 px-3 rounded-xl bg-[#0c0d12] border border-[#2B2B2B] text-[10px] font-mono text-slate-400 truncate">
                  taskflow.dev/invite/join?token=tf_sec_9948a
                </div>
                <button
                  type="button"
                  className="px-3 py-1.5 rounded-xl bg-[#1c1c1c] hover:bg-[#252525] border border-[#2B2B2B] text-slate-200 hover:text-white text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer shrink-0"
                >
                  <Copy className="w-3.5 h-3.5 text-slate-400" />
                  <span>Copy</span>
                </button>
              </div>
            </div>
          </div>

          {/* Right Column: Member Roster & RBAC Matrix Tabs */}
          <div className="lg:col-span-2 rounded-3xl border border-[#2B2B2B] bg-[#141414]/90 backdrop-blur-2xl shadow-2xl p-6 sm:p-7 space-y-6">
            {/* Tab Navigation */}
            <div className="flex items-center justify-between pb-4 border-b border-[#2B2B2B]/60">
              <div className="flex items-center p-1 rounded-xl bg-[#000000]/80 border border-[#2B2B2B] text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => setTeamTab('roster')}
                  className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                    teamTab === 'roster'
                      ? 'bg-[#00638E] text-white shadow-sm shadow-[#00638E]/40'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Users className="w-3.5 h-3.5" />
                  <span>Active Roster ({SHOWCASE_MEMBERS.length})</span>
                </button>
                <button
                  type="button"
                  onClick={() => setTeamTab('invites')}
                  className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                    teamTab === 'invites'
                      ? 'bg-[#00638E] text-white shadow-sm shadow-[#00638E]/40'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Mail className="w-3.5 h-3.5" />
                  <span>Pending Invites ({teamInvites.length})</span>
                </button>
                <button
                  type="button"
                  onClick={() => setTeamTab('rbac')}
                  className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                    teamTab === 'rbac'
                      ? 'bg-[#00638E] text-white shadow-sm shadow-[#00638E]/40'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <KeyRound className="w-3.5 h-3.5" />
                  <span>RBAC Matrix</span>
                </button>
              </div>

              <span className="hidden sm:inline-block text-[11px] font-mono text-slate-500">
                Tenant: Core Engineering Space
              </span>
            </div>

            {/* Tab 1: Active Roster */}
            {teamTab === 'roster' && (
              <div className="space-y-3">
                {SHOWCASE_MEMBERS.map((mem) => (
                  <div
                    key={mem.id}
                    className="p-3.5 rounded-2xl border border-[#2B2B2B] bg-[#0c0d12] hover:border-[#00638E]/40 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <div
                          className={`w-10 h-10 rounded-xl ${mem.avatarBg} text-white flex items-center justify-center font-bold text-xs shadow-sm`}
                        >
                          {mem.avatar}
                        </div>
                        <span
                          className={`w-2.5 h-2.5 rounded-full ${mem.statusClass} absolute -bottom-0.5 -right-0.5 ring-2 ring-[#0c0d12]`}
                        />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-bold text-white text-xs">{mem.name}</p>
                          <span
                            className={`text-[9px] font-bold px-2 py-0.2 rounded-full border ${mem.roleBadgeClass}`}
                          >
                            {mem.role}
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-400">{mem.email} • {mem.joinedDate}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                      {mem.projects.map((proj) => (
                        <span
                          key={proj}
                          className="px-2 py-0.5 rounded-md bg-[#161616] border border-[#2B2B2B] text-[10px] font-medium text-slate-300"
                        >
                          {proj}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Tab 2: Pending Invitations */}
            {teamTab === 'invites' && (
              <div className="space-y-3">
                {teamInvites.length === 0 ? (
                  <div className="p-8 rounded-2xl border border-dashed border-[#2B2B2B] text-center space-y-2 text-slate-500">
                    <Mail className="w-6 h-6 mx-auto opacity-40" />
                    <p className="text-xs font-semibold text-slate-400">No pending invitations</p>
                    <p className="text-[11px]">Dispatch new invites using the form on the left.</p>
                  </div>
                ) : (
                  teamInvites.map((inv) => (
                    <div
                      key={inv.id}
                      className="p-3.5 rounded-2xl border border-amber-500/20 bg-amber-500/5 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-300 flex items-center justify-center font-bold text-xs border border-amber-500/30">
                          <Mail className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-bold text-white text-xs">{inv.email}</p>
                            <span className="text-[9px] font-bold px-2 py-0.2 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                              {inv.role}
                            </span>
                          </div>
                          <p className="text-[10px] text-amber-300/80">{inv.expiresIn} • Sent {inv.sentAt}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="px-2.5 py-1 rounded-lg text-[10px] font-mono text-slate-400 bg-[#161616] border border-[#2B2B2B]">
                          Token: tf_sec_...
                        </span>
                        <span className="px-2.5 py-1 rounded-lg text-[10px] font-semibold text-amber-300/80 bg-amber-500/10 border border-amber-500/20">
                          Awaiting Accept
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* Tab 3: RBAC Matrix */}
            {teamTab === 'rbac' && (
              <div className="overflow-x-auto rounded-xl border border-[#2B2B2B] bg-[#0c0d12]">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-[#2B2B2B] text-slate-400 font-bold uppercase tracking-wider text-[10px] bg-[#141414]">
                    <tr>
                      <th className="p-3">Capability / Permission</th>
                      <th className="p-3 text-center">Owner</th>
                      <th className="p-3 text-center">Admin</th>
                      <th className="p-3 text-center">Member</th>
                      <th className="p-3 text-center">Viewer</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#2B2B2B]/60 text-slate-300">
                    {[
                      { cap: 'Create & Assign Task Cards', owner: true, admin: true, member: true, viewer: false },
                      { cap: 'Drag & Drop Kanban Board', owner: true, admin: true, member: true, viewer: false },
                      { cap: 'Upload & Manage Vault Documents', owner: true, admin: true, member: true, viewer: false },
                      { cap: 'Dispatch Teammate Invitations', owner: true, admin: true, member: false, viewer: false },
                      { cap: 'Manage API Keys & Webhooks', owner: true, admin: true, member: false, viewer: false },
                      { cap: 'Workspace Billing & Organization Delete', owner: true, admin: false, member: false, viewer: false },
                    ].map((row, idx) => (
                      <tr key={idx} className="hover:bg-[#161616] text-[11px]">
                        <td className="p-3 font-medium text-white">{row.cap}</td>
                        <td className="p-3 text-center">
                          {row.owner ? <Check className="w-4 h-4 text-emerald-400 mx-auto" /> : <X className="w-4 h-4 text-slate-600 mx-auto" />}
                        </td>
                        <td className="p-3 text-center">
                          {row.admin ? <Check className="w-4 h-4 text-emerald-400 mx-auto" /> : <X className="w-4 h-4 text-slate-600 mx-auto" />}
                        </td>
                        <td className="p-3 text-center">
                          {row.member ? <Check className="w-4 h-4 text-emerald-400 mx-auto" /> : <X className="w-4 h-4 text-slate-600 mx-auto" />}
                        </td>
                        <td className="p-3 text-center">
                          {row.viewer ? <Check className="w-4 h-4 text-emerald-400 mx-auto" /> : <X className="w-4 h-4 text-slate-600 mx-auto" />}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Core Features Grid */}
      <section id="features" className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 border-t border-[#2B2B2B]/60">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-xs font-bold uppercase tracking-widest text-[#BFD8E3] mb-3">
            Engineered for Modern Teams
          </h2>
          <p className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
            Built from the ground up for speed, depth, and precision.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Card 1: Document Vault */}
          <div className="p-6 rounded-2xl border border-[#2B2B2B] bg-[#141414]/90 backdrop-blur-xl hover:border-[#00638E]/60 hover:shadow-xl hover:shadow-[#00638E]/10 transition-all space-y-3 group">
            <div className="w-10 h-10 rounded-xl bg-[#00638E]/15 text-[#BFD8E3] flex items-center justify-center border border-[#00638E]/30 group-hover:scale-105 transition-transform">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-white">Universal Document Vault</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Attach screenshots, PNGs, PDFs, Word docs, Excel sheets, .env files, and code. Download and inspect anytime directly from tasks and subtasks.
            </p>
          </div>

          {/* Card 2: Universal Drag & Drop */}
          <div className="p-6 rounded-2xl border border-[#2B2B2B] bg-[#141414]/90 backdrop-blur-xl hover:border-[#00638E]/60 hover:shadow-xl hover:shadow-[#00638E]/10 transition-all space-y-3 group">
            <div className="w-10 h-10 rounded-xl bg-[#00638E]/15 text-[#BFD8E3] flex items-center justify-center border border-[#00638E]/30 group-hover:scale-105 transition-transform">
              <Move className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-white">Universal Drag & Drop</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Rearrange task cards, project pipelines, team members, calendar timelines, and analytics KPI widgets effortlessly across your workspace.
            </p>
          </div>

          {/* Card 3: Hierarchical Subtasks */}
          <div className="p-6 rounded-2xl border border-[#2B2B2B] bg-[#141414]/90 backdrop-blur-xl hover:border-[#00638E]/60 hover:shadow-xl hover:shadow-[#00638E]/10 transition-all space-y-3 group">
            <div className="w-10 h-10 rounded-xl bg-[#00638E]/15 text-[#BFD8E3] flex items-center justify-center border border-[#00638E]/30 group-hover:scale-105 transition-transform">
              <Layers className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-white">Subtask Percentage Tracking</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Break large goals into nested subtasks with dynamic percentage completion bars, status progression, and granular priority indicators.
            </p>
          </div>

          {/* Card 4: Discussion & Comment History */}
          <div className="p-6 rounded-2xl border border-[#2B2B2B] bg-[#141414]/90 backdrop-blur-xl hover:border-[#00638E]/60 hover:shadow-xl hover:shadow-[#00638E]/10 transition-all space-y-3 group">
            <div className="w-10 h-10 rounded-xl bg-[#00638E]/15 text-[#BFD8E3] flex items-center justify-center border border-[#00638E]/30 group-hover:scale-105 transition-transform">
              <MessageSquare className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-white">Task Discussion & History</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Keep context where work happens. Leave rich comments, track edit histories, and maintain full visibility across team contributions.
            </p>
          </div>

          {/* Card 5: Team Invites & Roles */}
          <div className="p-6 rounded-2xl border border-[#2B2B2B] bg-[#141414]/90 backdrop-blur-xl hover:border-[#00638E]/60 hover:shadow-xl hover:shadow-[#00638E]/10 transition-all space-y-3 group">
            <div className="w-10 h-10 rounded-xl bg-[#00638E]/15 text-[#BFD8E3] flex items-center justify-center border border-[#00638E]/30 group-hover:scale-105 transition-transform">
              <Users className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-white">Invite Queues & RBAC</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Invite colleagues via secure tokens, inspect pending invitations, filter team members by project, and manage granular permissions.
            </p>
          </div>

          {/* Card 6: Enterprise Security */}
          <div className="p-6 rounded-2xl border border-[#2B2B2B] bg-[#141414]/90 backdrop-blur-xl hover:border-[#00638E]/60 hover:shadow-xl hover:shadow-[#00638E]/10 transition-all space-y-3 group">
            <div className="w-10 h-10 rounded-xl bg-[#00638E]/15 text-[#BFD8E3] flex items-center justify-center border border-[#00638E]/30 group-hover:scale-105 transition-transform">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-white">OAuth & Zero-Trust Security</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              1-click Google OAuth authentication, JWT access & refresh tokens, email verification guards, and multi-tenant isolation.
            </p>
          </div>
        </div>
      </section>


      {/* Footer */}
      <footer className="relative z-10 border-t border-[#2B2B2B]/70 bg-[#000000] py-8 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <TaskFlowLogo variant="full" size="sm" colorScheme="dark" textClassName="text-white text-sm" animated={true} />
            <span className="text-slate-600 font-normal ml-2">© 2026 TaskFlow Inc. All rights reserved.</span>
          </div>

          <div className="flex items-center gap-6 font-medium text-slate-400">
            <Link href="/login" className="hover:text-white transition-colors">
              Sign In
            </Link>
            <Link href="/register" className="hover:text-white transition-colors">
              Sign Up
            </Link>
            <a href="#views" className="hover:text-white transition-colors">
              Preview Views
            </a>
          </div>
        </div>
      </footer>
    </div>
  )
}
