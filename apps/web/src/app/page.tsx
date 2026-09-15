'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/stores/auth-store'
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
} from 'lucide-react'

export default function LandingPage() {
  const router = useRouter()
  const { user, isAuthenticated, loadUser } = useAuthStore()
  const [hasCheckedAuth, setHasCheckedAuth] = useState(false)
  const [activeTab, setActiveTab] = useState<'kanban' | 'grid' | 'calendar' | 'teams'>('kanban')

  useEffect(() => {
    loadUser().finally(() => {
      setHasCheckedAuth(true)
    })
  }, [loadUser])

  return (
    <div className="min-h-screen bg-[#07090e] text-slate-100 flex flex-col selection:bg-indigo-500/30 selection:text-indigo-200 overflow-x-hidden font-sans">
      {/* Ambient background glow meshes */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-gradient-to-tr from-indigo-600/15 via-violet-600/20 to-cyan-500/10 rounded-full blur-[130px] opacity-70" />
        <div className="absolute top-[600px] -left-60 w-[600px] h-[600px] bg-indigo-900/10 rounded-full blur-[140px] opacity-50" />
        <div className="absolute top-[1200px] -right-60 w-[600px] h-[600px] bg-violet-900/10 rounded-full blur-[140px] opacity-50" />
      </div>

      {/* Top Navbar */}
      <header className="sticky top-0 z-50 w-full border-b border-white/5 bg-[#07090e]/80 backdrop-blur-xl transition-all">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-3 group cursor-pointer">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 via-indigo-600 to-violet-700 p-0.5 shadow-lg shadow-indigo-500/25 group-hover:shadow-indigo-500/40 transition-all duration-300">
              <div className="w-full h-full bg-[#0b0f19] rounded-[10px] flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-indigo-400 group-hover:scale-110 transition-transform" />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-lg tracking-tight bg-gradient-to-r from-white via-slate-100 to-slate-400 bg-clip-text text-transparent">
                TaskFlow
              </span>
              <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded-md bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                v2.0
              </span>
            </div>
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

          {/* Auth Actions */}
          <div className="flex items-center gap-2.5">
            {isAuthenticated ? (
              <Link
                href="/app/home"
                prefetch={true}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white shadow-lg shadow-indigo-600/30 hover:shadow-indigo-600/50 transition-all active:scale-95 cursor-pointer"
              >
                <span>Enter Workspace</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            ) : (
              <>
                <Link
                  href="/login"
                  prefetch={true}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-200 hover:text-white hover:bg-white/10 border border-white/10 transition-all cursor-pointer"
                >
                  Sign In
                </Link>

                <Link
                  href="/register"
                  prefetch={true}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-indigo-600 via-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white shadow-lg shadow-indigo-600/25 hover:shadow-indigo-600/45 transition-all active:scale-95 cursor-pointer"
                >
                  <span>Sign Up</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative z-10 pt-16 pb-20 md:pt-24 md:pb-28 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center flex flex-col items-center">
        {/* Announcement Pill */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs font-medium mb-8 hover:bg-indigo-500/15 transition-all cursor-pointer">
          <span className="flex h-2 w-2 rounded-full bg-indigo-400 animate-ping" />
          <span className="font-semibold text-indigo-300">TaskFlow 2.0 Enterprise Release</span>
          <span className="text-indigo-400/60">•</span>
          <span>Next-gen agile execution & pipeline tracking</span>
          <ChevronRight className="w-3 h-3 text-indigo-400" />
        </div>

        {/* Hero Title */}
        <h1 className="max-w-4xl text-4xl sm:text-6xl md:text-7xl font-extrabold tracking-tight leading-[1.08] mb-6">
          High-Velocity Project Execution.{' '}
          <span className="bg-gradient-to-r from-indigo-400 via-violet-400 to-sky-300 bg-clip-text text-transparent">
            Engineered for Modern Teams.
          </span>
        </h1>

        {/* Hero Subtitle */}
        <p className="max-w-2xl text-base sm:text-lg text-slate-300 font-normal leading-relaxed mb-10">
          Streamline complex engineering workflows with zero friction. Plan multi-environment deliverables,
          track sprint progress with subtask precision, attach mission-critical assets, and coordinate in real time.
        </p>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row items-center gap-4 w-full max-w-md justify-center mb-10">
          <Link
            href="/register"
            prefetch={true}
            className="w-full sm:w-auto h-12 px-8 rounded-xl bg-gradient-to-r from-indigo-600 via-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-bold text-xs transition-all flex items-center justify-center gap-2 shadow-xl shadow-indigo-600/30 hover:shadow-indigo-600/50 active:scale-98 cursor-pointer"
          >
            <span>Sign Up Free</span>
            <ArrowRight className="w-4 h-4" />
          </Link>

          <Link
            href="/login"
            prefetch={true}
            className="w-full sm:w-auto h-12 px-7 rounded-xl border border-white/20 bg-white/5 hover:bg-white/10 active:bg-white/15 text-white font-semibold text-xs transition-all flex items-center justify-center gap-2 shadow-sm hover:border-white/40 active:scale-98 cursor-pointer"
          >
            <span>Sign In</span>
          </Link>
        </div>

        {/* Feature Badges */}
        <div className="flex flex-wrap items-center justify-center gap-6 text-xs text-slate-400 font-medium">
          <span className="flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            No credit card required
          </span>
          <span className="flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-indigo-400" />
            Instant team onboarding
          </span>
          <span className="flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-sky-400" />
            Sub-millisecond reactivity
          </span>
        </div>
      </section>

      {/* Interactive Product Showcase */}
      <section id="views" className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pb-24">
        {/* Showcase Frame */}
        <div className="rounded-3xl border border-white/10 bg-[#0d121f]/90 backdrop-blur-2xl shadow-2xl shadow-indigo-950/40 p-4 sm:p-6 overflow-hidden">
          {/* Top Bar with View Switchers */}
          <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-white/5">
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-rose-500/80" />
                <span className="w-3 h-3 rounded-full bg-amber-500/80" />
                <span className="w-3 h-3 rounded-full bg-emerald-500/80" />
              </div>
              <span className="ml-3 text-xs font-semibold text-slate-400">TaskFlow Workspace</span>
            </div>

            {/* Interactive Tab Switcher */}
            <div className="flex items-center p-1 rounded-xl bg-white/5 border border-white/5 text-xs font-semibold">
              <button
                onClick={() => setActiveTab('kanban')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  activeTab === 'kanban'
                    ? 'bg-indigo-600 text-white shadow-sm'
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
                    ? 'bg-indigo-600 text-white shadow-sm'
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
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <CalendarIcon className="w-3.5 h-3.5" />
                <span>Sprint Calendar</span>
              </button>
              <button
                onClick={() => setActiveTab('teams')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  activeTab === 'teams'
                    ? 'bg-indigo-600 text-white shadow-sm'
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
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Column 1: To Do */}
                <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-3 flex flex-col gap-2.5">
                  <div className="flex items-center justify-between pb-1">
                    <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-slate-400" />
                      To Do
                    </span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/5 text-slate-400 font-mono">
                      2
                    </span>
                  </div>

                  <div className="p-3 rounded-xl border border-white/10 bg-white/5 hover:border-indigo-500/40 transition-all space-y-2 cursor-grab">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/20">
                        HIGH
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono">0%</span>
                    </div>
                    <p className="text-xs font-semibold text-slate-200">Payment Gateway Integration</p>
                    <div className="flex items-center gap-2 text-[10px] text-slate-400">
                      <span className="flex items-center gap-1">
                        <Paperclip className="w-3 h-3" /> 3 files
                      </span>
                      <span className="flex items-center gap-1">
                        <Layers className="w-3 h-3" /> 2 subtasks
                      </span>
                    </div>
                  </div>

                  <div className="p-3 rounded-xl border border-white/10 bg-white/5 hover:border-indigo-500/40 transition-all space-y-2 cursor-grab">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-500/15 text-blue-300 border border-blue-500/20">
                      MEDIUM
                    </span>
                    <p className="text-xs font-semibold text-slate-200">OAuth Security Audit & Tokens</p>
                    <div className="flex items-center gap-2 text-[10px] text-slate-400">
                      <span className="flex items-center gap-1">
                        <FileText className="w-3 h-3" /> specs.docx
                      </span>
                    </div>
                  </div>
                </div>

                {/* Column 2: In Progress */}
                <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-3 flex flex-col gap-2.5">
                  <div className="flex items-center justify-between pb-1">
                    <span className="text-xs font-bold text-indigo-400 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
                      In Progress
                    </span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-500/10 text-indigo-300 font-mono">
                      2
                    </span>
                  </div>

                  <div className="p-3 rounded-xl border border-indigo-500/30 bg-indigo-500/10 space-y-2.5 cursor-grab">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-500/15 text-rose-300 border border-rose-500/20">
                        CRITICAL
                      </span>
                      <span className="text-[10px] text-indigo-300 font-bold font-mono">75%</span>
                    </div>
                    <p className="text-xs font-semibold text-white">Multi-Format Document Vault</p>
                    <div className="w-full h-1.5 rounded-full bg-white/10 overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-indigo-500 to-cyan-400 rounded-full w-3/4" />
                    </div>
                    <div className="flex items-center justify-between text-[10px] text-slate-300 pt-1">
                      <span className="flex items-center gap-1 text-emerald-400">
                        <FileSpreadsheet className="w-3 h-3" /> data.xlsx
                      </span>
                      <span className="w-5 h-5 rounded-full bg-indigo-600 flex items-center justify-center text-[10px] font-bold">
                        TF
                      </span>
                    </div>
                  </div>

                  <div className="p-3 rounded-xl border border-white/10 bg-white/5 hover:border-indigo-500/40 transition-all space-y-2 cursor-grab">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-500/15 text-indigo-300 border border-indigo-500/20">
                      FEATURE
                    </span>
                    <p className="text-xs font-semibold text-slate-200">Universal Card Drag & Drop</p>
                    <div className="w-full h-1.5 rounded-full bg-white/10 overflow-hidden">
                      <div className="h-full bg-indigo-500 rounded-full w-1/2" />
                    </div>
                  </div>
                </div>

                {/* Column 3: In Review */}
                <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-3 flex flex-col gap-2.5">
                  <div className="flex items-center justify-between pb-1">
                    <span className="text-xs font-bold text-amber-400 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-amber-500" />
                      In Review
                    </span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/5 text-slate-400 font-mono">
                      1
                    </span>
                  </div>

                  <div className="p-3 rounded-xl border border-white/10 bg-white/5 hover:border-indigo-500/40 transition-all space-y-2 cursor-grab">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/20">
                        HIGH
                      </span>
                      <span className="text-[10px] text-amber-300 font-bold font-mono">90%</span>
                    </div>
                    <p className="text-xs font-semibold text-slate-200">Subtask Progress Calculation</p>
                    <div className="w-full h-1.5 rounded-full bg-white/10 overflow-hidden">
                      <div className="h-full bg-amber-400 rounded-full w-[90%]" />
                    </div>
                  </div>
                </div>

                {/* Column 4: Done */}
                <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-3 flex flex-col gap-2.5">
                  <div className="flex items-center justify-between pb-1">
                    <span className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-500" />
                      Completed
                    </span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-300 font-mono">
                      3
                    </span>
                  </div>

                  <div className="p-3 rounded-xl border border-emerald-500/20 bg-emerald-500/5 space-y-2 cursor-grab">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300">
                        DONE
                      </span>
                      <span className="text-[10px] text-emerald-400 font-bold font-mono">100%</span>
                    </div>
                    <p className="text-xs font-semibold text-slate-200 line-through opacity-80">
                      Sprint Architecture Setup
                    </p>
                    <p className="text-[10px] text-slate-400 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3 text-emerald-400" /> All 4 subtasks verified
                    </p>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'grid' && (
              <div className="overflow-x-auto rounded-xl border border-white/5 bg-white/[0.01]">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-white/5 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                    <tr>
                      <th className="p-3">Task / Subtask</th>
                      <th className="p-3">Status</th>
                      <th className="p-3">Priority</th>
                      <th className="p-3">Progress</th>
                      <th className="p-3">Attachments</th>
                      <th className="p-3">Assignee</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 text-slate-300">
                    <tr className="hover:bg-white/[0.02] font-semibold">
                      <td className="p-3 flex items-center gap-2">
                        <Move className="w-3 h-3 text-slate-500" />
                        <span className="text-white">API Gateway & Rate Limiter</span>
                      </td>
                      <td className="p-3">
                        <span className="px-2 py-0.5 rounded-md bg-indigo-500/20 text-indigo-300 font-bold text-[10px]">
                          IN PROGRESS
                        </span>
                      </td>
                      <td className="p-3 text-rose-400 font-bold text-[10px]">CRITICAL</td>
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          <div className="w-20 h-1.5 rounded-full bg-white/10 overflow-hidden">
                            <div className="h-full bg-indigo-500 rounded-full w-[80%]" />
                          </div>
                          <span className="font-mono text-[10px] text-indigo-300">80%</span>
                        </div>
                      </td>
                      <td className="p-3 text-[10px] text-slate-400">config.env, architecture.pdf</td>
                      <td className="p-3">Alex Rivera</td>
                    </tr>
                    <tr className="hover:bg-white/[0.02] bg-white/[0.01]">
                      <td className="p-3 pl-8 flex items-center gap-2 text-slate-300">
                        <span className="text-indigo-400">↳</span>
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
                      <td className="p-3">Sarah Chen</td>
                    </tr>
                    <tr className="hover:bg-white/[0.02] bg-white/[0.01]">
                      <td className="p-3 pl-8 flex items-center gap-2 text-slate-300">
                        <span className="text-indigo-400">↳</span>
                        <span>Redis Cluster Deployment</span>
                      </td>
                      <td className="p-3">
                        <span className="px-2 py-0.5 rounded-md bg-indigo-500/20 text-indigo-300 font-bold text-[10px]">
                          IN PROGRESS
                        </span>
                      </td>
                      <td className="p-3 text-blue-400 font-bold text-[10px]">MEDIUM</td>
                      <td className="p-3 font-mono text-[10px] text-indigo-300">60%</td>
                      <td className="p-3 text-[10px] text-slate-400">compose.yaml</td>
                      <td className="p-3">Alex Rivera</td>
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
                      className="rounded-xl border border-white/5 bg-white/[0.02] p-3 flex flex-col gap-2 min-h-[160px]"
                    >
                      <span className="font-bold text-slate-400 text-[11px]">{day}</span>
                      {i === 1 && (
                        <div className="p-2 rounded-lg bg-indigo-500/20 border border-indigo-500/30 text-left text-[11px] font-semibold text-indigo-200">
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

            {activeTab === 'teams' && (
              <div className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-xl bg-white/5 border border-white/10">
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-bold text-white">Teams & Projects Overview</span>
                    <span className="px-2.5 py-1 rounded-lg bg-indigo-500/20 text-indigo-300 text-xs font-bold flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5" /> New Invitations (2)
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <span className="px-3 py-1 rounded-lg bg-white/10 text-slate-200 font-semibold flex items-center gap-1.5">
                      <FolderKanban className="w-3.5 h-3.5 text-indigo-400" /> Project: Core Engine
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  <div className="p-3.5 rounded-xl border border-white/5 bg-white/[0.02] flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center font-bold text-white">
                        AR
                      </div>
                      <div>
                        <p className="font-bold text-white">Alex Rivera</p>
                        <p className="text-[10px] text-slate-400">alex@taskflow.dev</p>
                      </div>
                    </div>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 font-bold">
                      OWNER
                    </span>
                  </div>

                  <div className="p-3.5 rounded-xl border border-white/5 bg-white/[0.02] flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-violet-600 flex items-center justify-center font-bold text-white">
                        SC
                      </div>
                      <div>
                        <p className="font-bold text-white">Sarah Chen</p>
                        <p className="text-[10px] text-slate-400">sarah@taskflow.dev</p>
                      </div>
                    </div>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-white/10 text-slate-300 font-bold">
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
                    <span className="text-[10px] px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 font-bold">
                      INVITED
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Core Features Grid */}
      <section id="features" className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 border-t border-white/5">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-xs font-bold uppercase tracking-widest text-indigo-400 mb-3">
            Engineered for Modern Teams
          </h2>
          <p className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
            Built from the ground up for speed, depth, and precision.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Card 1: Document Vault */}
          <div className="p-6 rounded-2xl border border-white/10 bg-[#0d121f]/70 backdrop-blur-xl hover:border-indigo-500/40 transition-all space-y-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center border border-indigo-500/20">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-white">Universal Document Vault</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Attach screenshots, PNGs, PDFs, Word docs, Excel sheets, .env files, and code. Download and inspect anytime directly from tasks and subtasks.
            </p>
          </div>

          {/* Card 2: Universal Drag & Drop */}
          <div className="p-6 rounded-2xl border border-white/10 bg-[#0d121f]/70 backdrop-blur-xl hover:border-indigo-500/40 transition-all space-y-3">
            <div className="w-10 h-10 rounded-xl bg-violet-500/10 text-violet-400 flex items-center justify-center border border-violet-500/20">
              <Move className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-white">Universal Drag & Drop</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Rearrange task cards, project pipelines, team members, calendar timelines, and analytics KPI widgets effortlessly across your workspace.
            </p>
          </div>

          {/* Card 3: Hierarchical Subtasks */}
          <div className="p-6 rounded-2xl border border-white/10 bg-[#0d121f]/70 backdrop-blur-xl hover:border-indigo-500/40 transition-all space-y-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center border border-emerald-500/20">
              <Layers className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-white">Subtask Percentage Tracking</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Break large goals into nested subtasks with dynamic percentage completion bars, status progression, and granular priority indicators.
            </p>
          </div>

          {/* Card 4: Discussion & Comment History */}
          <div className="p-6 rounded-2xl border border-white/10 bg-[#0d121f]/70 backdrop-blur-xl hover:border-indigo-500/40 transition-all space-y-3">
            <div className="w-10 h-10 rounded-xl bg-sky-500/10 text-sky-400 flex items-center justify-center border border-sky-500/20">
              <MessageSquare className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-white">Task Discussion & History</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Keep context where work happens. Leave rich comments, track edit histories, and maintain full visibility across team contributions.
            </p>
          </div>

          {/* Card 5: Team Invites & Roles */}
          <div className="p-6 rounded-2xl border border-white/10 bg-[#0d121f]/70 backdrop-blur-xl hover:border-indigo-500/40 transition-all space-y-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center border border-amber-500/20">
              <Users className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-white">Invite Queues & RBAC</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Invite colleagues via secure tokens, inspect pending invitations, filter team members by project, and manage granular permissions.
            </p>
          </div>

          {/* Card 6: Enterprise Security */}
          <div className="p-6 rounded-2xl border border-white/10 bg-[#0d121f]/70 backdrop-blur-xl hover:border-indigo-500/40 transition-all space-y-3">
            <div className="w-10 h-10 rounded-xl bg-rose-500/10 text-rose-400 flex items-center justify-center border border-rose-500/20">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-white">OAuth & Zero-Trust Security</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              1-click Google OAuth authentication, JWT access & refresh tokens, email verification guards, and multi-tenant isolation.
            </p>
          </div>
        </div>
      </section>

      {/* Call to Action Banner */}
      <section className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
        <div className="rounded-3xl border border-indigo-500/30 bg-gradient-to-b from-indigo-950/40 to-[#0b0f19] p-8 sm:p-12 shadow-2xl relative overflow-hidden">
          <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_top,_var(--tw-gradient-stops))] from-indigo-500/10 via-transparent to-transparent" />
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight mb-4">
            Ready to streamline your entire workspace?
          </h2>
          <p className="text-sm text-slate-400 max-w-xl mx-auto mb-8">
            Experience the clarity of organized tasks, interactive sprint timelines, and seamless team collaboration.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/register"
              prefetch={true}
              className="w-full sm:w-auto h-11 px-8 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-bold text-xs transition-all flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/30 cursor-pointer"
            >
              <span>Create Free Account</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>

            <Link
              href="/login"
              prefetch={true}
              className="w-full sm:w-auto h-11 px-7 rounded-xl border border-white/20 bg-white/5 hover:bg-white/10 text-white font-semibold text-xs transition-all flex items-center justify-center cursor-pointer"
            >
              <span>Sign In</span>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-white/5 bg-[#05070a] py-8 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 font-bold text-slate-300">
            <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
            <span>TaskFlow</span>
            <span className="text-slate-600 font-normal">© 2026 TaskFlow Inc. All rights reserved.</span>
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
