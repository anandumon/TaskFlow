'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Search,
  LayoutDashboard,
  CheckSquare,
  FolderKanban,
  Users2,
  Settings,
  Plus,
  Moon,
  Sun,
  X,
} from 'lucide-react'
import { useTheme } from 'next-themes'

interface CommandPaletteProps {
  isOpen: boolean
  onClose: () => void
}

export function CommandPalette({ isOpen, onClose }: CommandPaletteProps) {
  const router = useRouter()
  const { theme, setTheme } = useTheme()
  const [query, setQuery] = useState('')

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        if (isOpen) onClose()
        else {
          // Open handled externally
        }
      }
      if (e.key === 'Escape' && isOpen) {
        onClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  if (!isOpen) return null

  const navigationCommands = [
    { label: 'Go to Overview', icon: LayoutDashboard, action: () => router.push('/app/home') },
    { label: 'Go to Tasks', icon: CheckSquare, action: () => router.push('/app/tasks') },
    { label: 'Go to Projects', icon: FolderKanban, action: () => router.push('/app/projects') },
    { label: 'Go to Teams', icon: Users2, action: () => router.push('/app/teams') },
    { label: 'Go to Settings', icon: Settings, action: () => router.push('/app/settings') },
  ]

  const quickActions = [
    {
      label: 'Toggle Theme',
      icon: theme === 'dark' ? Sun : Moon,
      action: () => setTheme(theme === 'dark' ? 'light' : 'dark'),
    },
  ]

  const filteredNav = navigationCommands.filter((c) =>
    c.label.toLowerCase().includes(query.toLowerCase())
  )

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-start justify-center pt-[15vh] p-4 animate-fade-in">
      <div
        className="w-full max-w-xl bg-popover border border-border rounded-2xl shadow-2xl overflow-hidden animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-border/80 bg-background/50">
          <Search className="w-4 h-4 text-muted-foreground shrink-0" />
          <input
            type="text"
            placeholder="Type a command or search..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="flex-1 bg-transparent border-none text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
            autoFocus
          />
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-accent text-muted-foreground"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Results */}
        <div className="max-h-80 overflow-y-auto p-2 space-y-3">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground px-3 py-1">
              Navigation
            </div>
            <div className="space-y-0.5">
              {filteredNav.map((cmd, idx) => {
                const Icon = cmd.icon
                return (
                  <button
                    key={idx}
                    onClick={() => {
                      cmd.action()
                      onClose()
                    }}
                    className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium text-foreground hover:bg-primary/10 hover:text-primary transition-colors text-left"
                  >
                    <Icon className="w-4 h-4 text-muted-foreground" />
                    <span>{cmd.label}</span>
                  </button>
                )
              })}
            </div>
          </div>

          <div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground px-3 py-1">
              Actions
            </div>
            <div className="space-y-0.5">
              {quickActions.map((cmd, idx) => {
                const Icon = cmd.icon
                return (
                  <button
                    key={idx}
                    onClick={() => {
                      cmd.action()
                      onClose()
                    }}
                    className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium text-foreground hover:bg-primary/10 hover:text-primary transition-colors text-left"
                  >
                    <Icon className="w-4 h-4 text-muted-foreground" />
                    <span>{cmd.label}</span>
                  </button>
                )
              })}
            </div>
          </div>
        </div>

        {/* Footer info */}
        <div className="px-4 py-2 bg-muted/40 border-t border-border/50 flex items-center justify-between text-[11px] text-muted-foreground">
          <span>Navigate with arrows</span>
          <span>Esc to close</span>
        </div>
      </div>
    </div>
  )
}
