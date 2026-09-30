'use client'

import React from 'react'
import {
  Users,
  Users2,
  Network,
  BarChart2,
  Plus,
  Sparkles,
  FolderKanban,
  Check,
} from 'lucide-react'
import { ActiveTab, TeamItem } from './types'

interface TeamsSidebarProps {
  activeTab: ActiveTab
  setActiveTab: (tab: ActiveTab) => void
  totalPeopleCount: number
  teams: TeamItem[]
  myTeams: TeamItem[]
  onCreateTeamClick: () => void
  onSelectTeamFilter?: (teamId: string) => void
  activeTeamFilter?: string
}

export function TeamsSidebar({
  activeTab,
  setActiveTab,
  totalPeopleCount,
  teams,
  myTeams,
  onCreateTeamClick,
  onSelectTeamFilter,
  activeTeamFilter,
}: TeamsSidebarProps) {
  return (
    <aside className="w-full lg:w-60 shrink-0 flex flex-col space-y-6">
      {/* Title */}
      <div className="flex items-center justify-between px-1">
        <h2 className="text-sm font-bold text-foreground tracking-tight">Teams</h2>
      </div>

      {/* Main Nav Items */}
      <nav className="space-y-1">
        <button
          type="button"
          onClick={() => setActiveTab('teams')}
          className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
            activeTab === 'teams'
              ? 'bg-primary/15 text-primary font-bold shadow-2xs'
              : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <Users className="w-4 h-4" />
            <span>All Teams</span>
          </div>
          {teams.length > 0 && (
            <span className="text-[11px] font-bold text-muted-foreground">{teams.length}</span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('people')}
          className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
            activeTab === 'people'
              ? 'bg-primary/15 text-primary font-bold shadow-2xs'
              : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <Users2 className="w-4 h-4" />
            <span>All People</span>
          </div>
          <span
            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
              activeTab === 'people'
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground'
            }`}
          >
            {totalPeopleCount}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('org-chart')}
          className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
            activeTab === 'org-chart'
              ? 'bg-primary/15 text-primary font-bold shadow-2xs'
              : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
          }`}
        >
          <Network className="w-4 h-4" />
          <span>Org Chart</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('analytics')}
          className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
            activeTab === 'analytics'
              ? 'bg-primary/15 text-primary font-bold shadow-2xs'
              : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
          }`}
        >
          <BarChart2 className="w-4 h-4" />
          <span>Analytics</span>
        </button>
      </nav>

      {/* Divider */}
      <div className="border-t border-border/70" />

      {/* My Teams Section (Image 1) */}
      <div className="space-y-3 px-1">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-muted-foreground">My Teams</span>
          <button
            type="button"
            onClick={onCreateTeamClick}
            className="p-1 rounded-lg text-primary hover:bg-primary/10 transition-colors cursor-pointer"
            title="Create new team"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
        </div>

        {myTeams.length > 0 ? (
          <div className="space-y-1">
            {myTeams.map((team) => {
              const isFiltered = activeTeamFilter === team.id
              return (
                <button
                  key={team.id}
                  type="button"
                  onClick={() => {
                    if (onSelectTeamFilter) {
                      onSelectTeamFilter(isFiltered ? 'ALL' : team.id)
                    }
                    setActiveTab('people')
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-all text-left cursor-pointer ${
                    isFiltered
                      ? 'bg-primary/15 text-primary font-bold'
                      : 'hover:bg-muted/50 text-foreground'
                  }`}
                >
                  <div className="flex items-center gap-2 truncate">
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0 shadow-xs"
                      style={{ backgroundColor: team.color || '#6366f1' }}
                    />
                    <span className="truncate">{team.name}</span>
                  </div>
                  <span className="text-[11px] text-muted-foreground shrink-0">
                    {team.memberCount}
                  </span>
                </button>
              )
            })}
          </div>
        ) : (
          /* Empty Card State from Demo Image 1 */
          <div className="p-4 rounded-2xl bg-card border border-border/80 shadow-2xs space-y-3 text-center">
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center mx-auto shadow-2xs">
              <Sparkles className="w-4 h-4" />
            </div>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              Once you are added to a Team you will see it here
            </p>
            <button
              type="button"
              onClick={onCreateTeamClick}
              className="w-full py-1.5 px-3 rounded-xl bg-accent hover:bg-accent/80 text-foreground text-[11px] font-semibold transition-all flex items-center justify-center gap-1.5 cursor-pointer border border-border"
            >
              <Plus className="w-3 h-3 text-primary" />
              <span>Create Team</span>
            </button>
          </div>
        )}
      </div>
    </aside>
  )
}
