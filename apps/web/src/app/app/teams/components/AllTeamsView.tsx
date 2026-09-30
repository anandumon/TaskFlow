'use client'

import React, { useState } from 'react'
import {
  Plus,
  Users,
  ArrowRight,
  Shield,
  FolderKanban,
  BarChart2,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Layers,
  Activity,
  CheckCircle2,
} from 'lucide-react'
import { TeamItem, MemberItem } from './types'

interface AllTeamsViewProps {
  teams: TeamItem[]
  members: MemberItem[]
  onCreateTeamClick: () => void
  onSelectTeam: (teamId: string) => void
  onBrowsePeopleClick?: () => void
}

export function AllTeamsView({
  teams,
  members,
  onCreateTeamClick,
  onSelectTeam,
  onBrowsePeopleClick,
}: AllTeamsViewProps) {
  const [activeSlide, setActiveSlide] = useState(0)

  const carouselCards = [
    {
      id: 'teams-hub',
      title: 'Teams Hub',
      description:
        'A central hub providing an overview of all activity and customizable views that let you dig into the details for each team.',
      badge: 'Analytics',
      badgeColor: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20',
      mockupWelcome:
        'Welcome to the Analytics team hub! Here, you can explore our innovative tools and resources designed to help you make data-driven decisions.',
      feedItem: '4.0 Designs & Metrics',
    },
    {
      id: 'members-hub',
      title: 'Members Directory',
      description:
        'Easily browse members, coordinate squads, assign managers, and understand who works on what across projects.',
      badge: 'Product & Design',
      badgeColor: 'text-indigo-500 bg-indigo-500/10 border-indigo-500/20',
      mockupWelcome:
        'Browse cross-functional teams, view real-time availability, and coordinate project responsibilities seamlessly.',
      feedItem: 'Sprint 24 Delivery squad',
    },
    {
      id: 'capacity-hub',
      title: 'Capacity & Workload',
      description:
        'Track team bandwidth, sprint velocity, and cross-functional deliverables in real-time.',
      badge: 'Engineering Squad',
      badgeColor: 'text-blue-500 bg-blue-500/10 border-blue-500/20',
      mockupWelcome:
        'Balance workloads, unblock engineering bottlenecks, and celebrate shipping milestones together.',
      feedItem: 'API v2 Gateway Migration',
    },
  ]

  const currentCard = carouselCards[activeSlide]

  const handlePrevSlide = () => {
    setActiveSlide((prev) => (prev === 0 ? carouselCards.length - 1 : prev - 1))
  }

  const handleNextSlide = () => {
    setActiveSlide((prev) => (prev === carouselCards.length - 1 ? 0 : prev + 1))
  }

  return (
    <div className="space-y-8 animate-fade-in">
      {/* SECTION 1: HERO HEADER & SHOWCASE CAROUSEL (Image 2 Reference) */}
      <div className="relative rounded-3xl bg-card/60 border border-border/80 p-6 sm:p-10 overflow-hidden shadow-sm backdrop-blur-md">
        {/* Subtle Ambient Glow */}
        <div className="absolute -top-24 -left-24 w-96 h-96 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          {/* Left Column: Headline, Description & Action Buttons */}
          <div className="lg:col-span-7 space-y-6">
            <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
              All Teams
            </div>

            <div className="space-y-3">
              <h1 className="text-3xl sm:text-5xl font-extrabold text-foreground tracking-tight leading-[1.15]">
                Align teams <br />
                and visualize <br />
                their work!
              </h1>
              <p className="text-sm sm:text-base text-muted-foreground max-w-lg leading-relaxed">
                Use Teams Hub to coordinate teams, organize priorities, and understand the details
                of their work.
              </p>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={onBrowsePeopleClick}
                className="px-5 py-2.5 rounded-xl bg-[#6366f1] hover:bg-[#5255e2] text-white font-bold text-xs shadow-md shadow-[#6366f1]/25 transition-all cursor-pointer active:scale-95 flex items-center gap-2"
              >
                <span>Browse People</span>
              </button>
              <button
                type="button"
                onClick={onCreateTeamClick}
                className="px-5 py-2.5 rounded-xl bg-muted/80 hover:bg-muted text-foreground font-semibold text-xs border border-border/70 transition-all cursor-pointer active:scale-95 flex items-center gap-2"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Create Team</span>
              </button>
            </div>
          </div>

          {/* Right Column: Visual Carousel Showcase Card (Image 2 Reference) */}
          <div className="lg:col-span-5 flex flex-col items-center">
            <div className="w-full max-w-sm rounded-3xl bg-background border border-border/90 shadow-xl overflow-hidden p-5 space-y-4 transition-all duration-300">
              {/* Mockup Top Window Header */}
              <div className="rounded-2xl border border-border/70 bg-card/70 p-4 space-y-3 shadow-inner">
                {/* Team Tag inside Mockup */}
                <div className="flex items-center gap-2">
                  <div
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold border ${currentCard.badgeColor}`}
                  >
                    <BarChart2 className="w-3.5 h-3.5" />
                    <span>{currentCard.badge}</span>
                  </div>
                </div>

                {/* Subtitle intro */}
                <p className="text-[11px] text-muted-foreground leading-snug">
                  {currentCard.mockupWelcome}
                </p>

                {/* Mockup Content Grid */}
                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-border/50 text-[10px]">
                  <div className="p-2 rounded-xl bg-muted/50 space-y-1">
                    <span className="text-muted-foreground uppercase font-bold text-[9px]">Feed</span>
                    <div className="font-semibold text-foreground truncate">{currentCard.feedItem}</div>
                  </div>
                  <div className="p-2 rounded-xl bg-muted/50 space-y-1">
                    <span className="text-muted-foreground uppercase font-bold text-[9px]">Members online</span>
                    <div className="flex items-end gap-1 h-4 pt-1">
                      <div className="w-1.5 h-2 bg-emerald-500 rounded-sm" />
                      <div className="w-1.5 h-3.5 bg-emerald-500 rounded-sm" />
                      <div className="w-1.5 h-2.5 bg-emerald-500 rounded-sm" />
                      <div className="w-1.5 h-4 bg-emerald-500 rounded-sm" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Card Footer Text */}
              <div className="space-y-1 pt-1">
                <h3 className="text-sm font-bold text-foreground">{currentCard.title}</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {currentCard.description}
                </p>
              </div>
            </div>

            {/* Carousel Navigation Arrow Controls */}
            <div className="flex items-center gap-2 mt-4">
              <button
                type="button"
                onClick={handlePrevSlide}
                className="w-8 h-8 rounded-full border border-border/80 bg-card hover:bg-muted text-muted-foreground hover:text-foreground flex items-center justify-center transition-colors cursor-pointer shadow-xs"
                title="Previous slide"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <div className="flex items-center gap-1.5 px-2">
                {carouselCards.map((_, idx) => (
                  <span
                    key={idx}
                    className={`h-1.5 rounded-full transition-all ${
                      idx === activeSlide ? 'w-4 bg-primary' : 'w-1.5 bg-muted-foreground/40'
                    }`}
                  />
                ))}
              </div>

              <button
                type="button"
                onClick={handleNextSlide}
                className="w-8 h-8 rounded-full border border-border/80 bg-card hover:bg-muted text-muted-foreground hover:text-foreground flex items-center justify-center transition-colors cursor-pointer shadow-xs"
                title="Next slide"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* SECTION 2: TEAMS DIRECTORY & SQUADS GRID */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-foreground">Workspace Teams ({teams.length})</h2>
            <p className="text-xs text-muted-foreground">
              Functional squads, departments, and focus units across this workspace.
            </p>
          </div>
          <button
            type="button"
            onClick={onCreateTeamClick}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-primary/10 text-primary hover:bg-primary/20 text-xs font-bold transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Team</span>
          </button>
        </div>

        {teams.length === 0 ? (
          /* Empty or Placeholder Cards as shown in Image 2 */
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map((placeholder) => (
              <div
                key={placeholder}
                className="rounded-3xl border border-dashed border-border/80 bg-card/30 p-6 flex flex-col justify-between space-y-4 hover:border-primary/40 transition-colors"
              >
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-muted/60 flex items-center justify-center text-muted-foreground font-bold">
                      <Users className="w-5 h-5 opacity-40" />
                    </div>
                    <div className="space-y-1 flex-1">
                      <div className="h-3.5 w-24 bg-muted/60 rounded" />
                      <div className="h-2.5 w-16 bg-muted/40 rounded" />
                    </div>
                  </div>
                  <div className="space-y-1.5 pt-2">
                    <div className="h-2.5 w-full bg-muted/30 rounded" />
                    <div className="h-2.5 w-3/4 bg-muted/30 rounded" />
                  </div>
                </div>

                <div className="pt-4 border-t border-border/40 flex items-center justify-between">
                  <div className="flex -space-x-1.5">
                    <div className="w-6 h-6 rounded-full bg-muted/60 border-2 border-card" />
                    <div className="w-6 h-6 rounded-full bg-muted/40 border-2 border-card" />
                  </div>
                  <button
                    type="button"
                    onClick={onCreateTeamClick}
                    className="text-[11px] font-semibold text-primary hover:underline cursor-pointer"
                  >
                    + Create squad
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {teams.map((t) => {
              const teamMembers = members.filter(
                (m) => m.teamId === t.id || m.teamName === t.name
              )
              const count = teamMembers.length || t.memberCount || 0

              return (
                <div
                  key={t.id}
                  className="group flex flex-col justify-between bg-card border border-border/80 hover:border-primary/50 rounded-3xl p-5 shadow-xs hover:shadow-xl transition-all duration-200"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div
                          className="w-10 h-10 rounded-2xl flex items-center justify-center text-white shadow-2xs font-bold text-sm"
                          style={{ backgroundColor: t.color || '#6366f1' }}
                        >
                          <Users className="w-5 h-5" />
                        </div>
                        <div>
                          <h3 className="text-sm font-bold text-foreground group-hover:text-primary transition-colors">
                            {t.name}
                          </h3>
                          <span className="text-[11px] text-muted-foreground font-medium">
                            {count} {count === 1 ? 'member' : 'members'}
                          </span>
                        </div>
                      </div>
                    </div>

                    <p className="text-xs text-muted-foreground line-clamp-2 min-h-[32px]">
                      {t.description || 'General organizational functional group.'}
                    </p>
                  </div>

                  {/* Team Members Avatar Stack */}
                  <div className="pt-4 border-t border-border/60 mt-4 flex items-center justify-between">
                    <div className="flex -space-x-2 overflow-hidden">
                      {teamMembers.slice(0, 4).map((m) => (
                        <div
                          key={m.id}
                          className="inline-block h-7 w-7 rounded-full ring-2 ring-card bg-primary/20 text-primary text-[10px] font-bold flex items-center justify-center overflow-hidden"
                          title={m.name}
                        >
                          {m.avatarUrl ? (
                            <img src={m.avatarUrl} alt={m.name} className="h-full w-full object-cover" />
                          ) : (
                            m.name.charAt(0).toUpperCase()
                          )}
                        </div>
                      ))}
                      {teamMembers.length > 4 && (
                        <div className="inline-block h-7 w-7 rounded-full ring-2 ring-card bg-muted text-muted-foreground text-[10px] font-bold flex items-center justify-center">
                          +{teamMembers.length - 4}
                        </div>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => onSelectTeam(t.id)}
                      className="flex items-center gap-1 text-xs font-semibold text-primary hover:underline cursor-pointer"
                    >
                      <span>View People</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
