'use client'

import React from 'react'
import {
  Zap,
  CheckSquare2,
  Sparkles,
  Calendar,
  Users2,
  FolderKanban,
  Target,
  ArrowUpRight,
} from 'lucide-react'

interface AuthMarketingPanelProps {
  variant?: 'signup' | 'signin'
}

export function AuthMarketingPanel({ variant = 'signup' }: AuthMarketingPanelProps) {
  const isSignUp = variant === 'signup'

  const signupCards = [
    {
      icon: CheckSquare2,
      tag: 'ORGANIZED',
      title: 'Tasks, Projects & Plans',
      desc: 'Keep everything you need to do organized and easy to find.',
      color: 'text-primary',
      bg: 'bg-primary/10',
      borderHover: 'hover:border-primary/40',
    },
    {
      icon: Sparkles,
      tag: 'FLEXIBLE',
      title: 'Work Your Way',
      desc: 'Build workflows that fit your personal life, projects, or team.',
      color: 'text-amber-400',
      bg: 'bg-amber-400/10',
      borderHover: 'hover:border-amber-400/40',
    },
    {
      icon: Calendar,
      tag: 'CONNECTED',
      title: 'Calendars & Integrations',
      desc: 'Bring your tools, calendars, and work together.',
      color: 'text-sky-400',
      bg: 'bg-sky-400/10',
      borderHover: 'hover:border-sky-400/40',
    },
    {
      icon: Users2,
      tag: 'COLLABORATIVE',
      title: 'Work Together',
      desc: 'Share projects, assign tasks, and collaborate effortlessly.',
      color: 'text-emerald-400',
      bg: 'bg-emerald-500/10',
      borderHover: 'hover:border-emerald-500/40',
    },
  ]

  const signinCards = [
    {
      icon: FolderKanban,
      tag: 'YOUR WORK',
      title: 'Everything in one place',
      desc: 'Access your active boards, lists, and task roadmaps instantly.',
      color: 'text-primary',
      bg: 'bg-primary/10',
      borderHover: 'hover:border-primary/40',
    },
    {
      icon: Target,
      tag: 'YOUR MOMENTUM',
      title: 'Stay focused and keep moving',
      desc: 'Pick up where you left off and hit your milestones faster.',
      color: 'text-emerald-400',
      bg: 'bg-emerald-500/10',
      borderHover: 'hover:border-emerald-500/40',
    },
    {
      icon: Calendar,
      tag: 'YOUR CONNECTIONS',
      title: 'Tasks, teams, & calendars together',
      desc: 'Unified 2-way sync with your Google and Outlook schedules.',
      color: 'text-sky-400',
      bg: 'bg-sky-400/10',
      borderHover: 'hover:border-sky-400/40',
    },
  ]

  return (
    <aside
      aria-label="Product Highlights"
      className="hidden lg:flex lg:w-1/2 h-screen max-h-screen bg-gradient-to-br from-[#000000] via-[#002638] to-[#141414] p-6 xl:p-10 flex-col justify-between relative overflow-hidden border-r border-[#2B2B2B] shrink-0 select-none"
    >
      {/* Subtle background ambient glows */}
      <div className="absolute -top-32 -left-32 w-96 h-96 bg-[#00638E]/25 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-[#004A6B]/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(0,99,142,0.18),transparent)]" />

      {/* Top Header */}
      <header className="relative z-10 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-primary to-secondary flex items-center justify-center shadow-lg shadow-primary/30">
            <Zap className="w-4 h-4 text-white" aria-hidden="true" />
          </div>
          <span className="text-xl font-black tracking-tight text-white">TaskFlow</span>
        </div>
        <span className="text-[10px] uppercase font-bold tracking-widest px-2.5 py-0.5 rounded-full bg-primary/15 text-primary border border-primary/25">
          {isSignUp ? 'One account. Everything organized.' : 'Welcome back'}
        </span>
      </header>

      {/* Center Hero & Benefits */}
      <section className="relative z-10 space-y-4 xl:space-y-5 max-w-lg my-auto py-2">
        <div className="space-y-2">
          <h1 className="text-2xl xl:text-3xl font-extrabold tracking-tight text-white leading-tight">
            {isSignUp ? (
              <>
                Everything you need.<br />
                All in one place.
              </>
            ) : (
              <>
                Pick up where<br />
                you left off.
              </>
            )}
          </h1>
          <p className="text-white/70 text-xs xl:text-sm leading-relaxed">
            {isSignUp
              ? 'Organize your tasks, projects, goals, and everyday plans in one flexible workspace built around the way you work.'
              : 'Your tasks, projects, plans, and goals are right where you left them. Sign in and keep moving forward.'}
          </p>
        </div>

        {/* Dynamic Feature Cards */}
        {isSignUp ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
            {signupCards.map((card) => {
              const Icon = card.icon
              return (
                <div
                  key={card.tag}
                  className={`p-3 rounded-2xl bg-[#141414]/80 border border-[#2B2B2B] backdrop-blur-md space-y-1 hover:border-[#00638E]/50 transition-all duration-150 shadow-sm`}
                >
                  <div className={`flex items-center gap-1.5 ${card.color} font-bold text-[10px] uppercase tracking-wider`}>
                    <Icon className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                    <span>{card.tag}</span>
                  </div>
                  <h3 className="text-xs font-bold text-white leading-snug">{card.title}</h3>
                  <p className="text-[11px] text-white/60 font-normal leading-relaxed">{card.desc}</p>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="space-y-2.5 pt-1">
            {signinCards.map((card) => {
              const Icon = card.icon
              return (
                <div
                  key={card.tag}
                  className={`p-3 rounded-2xl bg-[#141414]/80 border border-[#2B2B2B] backdrop-blur-md flex items-start gap-3 hover:border-[#00638E]/50 transition-all duration-150 shadow-sm`}
                >
                  <div className={`w-8 h-8 rounded-xl ${card.bg} ${card.color} flex items-center justify-center shrink-0 mt-0.5`}>
                    <Icon className="w-4 h-4" aria-hidden="true" />
                  </div>
                  <div className="space-y-0.5 flex-1">
                    <div className="flex items-center justify-between">
                      <span className={`text-[10px] font-bold uppercase tracking-wider ${card.color}`}>
                        {card.tag}
                      </span>
                      <ArrowUpRight className="w-3 h-3 text-white/30" />
                    </div>
                    <h3 className="text-xs font-bold text-white">{card.title}</h3>
                    <p className="text-[11px] text-white/60 leading-relaxed">{card.desc}</p>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </section>

      {/* Footer Ribbon */}
      <footer className="relative z-10 pt-4 border-t border-white/[0.08] flex items-center justify-between text-[11px] text-white/50 font-medium shrink-0">
        <span>
          {isSignUp
            ? 'Start free • Work your way • Built for everyone'
            : 'Welcome back • Everything in one place'}
        </span>
        <span>&copy; 2026 TaskFlow Inc.</span>
      </footer>
    </aside>
  )
}
