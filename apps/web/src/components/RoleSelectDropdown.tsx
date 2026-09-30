'use client'

import React, { useState, useRef, useEffect } from 'react'
import {
  ChevronDown,
  Check,
  Plus,
  Shield,
  User,
  Users,
  Eye,
  UserCheck,
  Sparkles,
} from 'lucide-react'

export interface RoleOption {
  id: string
  name: string
  description: string
  badge?: string
  isCustom?: boolean
}

export const DEFAULT_WORKSPACE_ROLES: RoleOption[] = [
  {
    id: 'Member',
    name: 'Member',
    description: 'Can access all public items in your Workspace.',
  },
  {
    id: 'Limited Member',
    name: 'Limited Member',
    badge: 'Chat Collaborator',
    description: 'Can only access items shared with them.',
  },
  {
    id: 'Guest',
    name: 'Guest',
    description: "Can't use all features or be added to Spaces. Can only access items shared with them.",
  },
  {
    id: 'Admin',
    name: 'Admin',
    description: 'Can manage Spaces, People, Billing and other Workspace settings.',
  },
]

export const DEFAULT_PROJECT_ROLES: RoleOption[] = [
  {
    id: 'Member',
    name: 'Member',
    description: 'Can access all public tasks, boards, and channels in this Project.',
  },
  {
    id: 'Limited Member',
    name: 'Limited Member',
    badge: 'Chat Collaborator',
    description: 'Can only access tasks and chat channels specifically assigned to them.',
  },
  {
    id: 'Guest',
    name: 'Guest',
    description: 'Read-only access. Can view project boards, sprint calendar, and leave comments.',
  },
  {
    id: 'Admin',
    name: 'Admin',
    description: 'Can manage project settings, workflows, team members, tasks, and sprints.',
  },
]

interface RoleSelectDropdownProps {
  value: string
  onChange: (roleName: string) => void
  roles?: RoleOption[]
  label?: string
  isProjectScope?: boolean
}

export function RoleSelectDropdown({
  value,
  onChange,
  roles = DEFAULT_WORKSPACE_ROLES,
  label = 'Invite as',
  isProjectScope = false,
}: RoleSelectDropdownProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [customRoles, setCustomRoles] = useState<RoleOption[]>([])
  const [isAddingCustom, setIsAddingCustom] = useState(false)
  const [customRoleInput, setCustomRoleInput] = useState('')
  const containerRef = useRef<HTMLDivElement>(null)

  const allRoles = [...(isProjectScope ? DEFAULT_PROJECT_ROLES : roles), ...customRoles]
  const selectedRole = allRoles.find((r) => r.name.toLowerCase() === value.toLowerCase()) || allRoles[0]

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false)
        setIsAddingCustom(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleAddCustomRole = () => {
    const trimmed = customRoleInput.trim()
    if (!trimmed) return
    const newRole: RoleOption = {
      id: trimmed,
      name: trimmed,
      description: 'Custom team role with tailored permissions.',
      isCustom: true,
    }
    setCustomRoles((prev) => [...prev, newRole])
    onChange(trimmed)
    setCustomRoleInput('')
    setIsAddingCustom(false)
    setIsOpen(false)
  }

  const getRoleIcon = (name: string) => {
    switch (name.toLowerCase()) {
      case 'admin':
        return <Shield className="w-4 h-4 text-emerald-500 shrink-0" />
      case 'limited member':
        return <UserCheck className="w-4 h-4 text-indigo-500 shrink-0" />
      case 'guest':
        return <Eye className="w-4 h-4 text-amber-500 shrink-0" />
      default:
        return <User className="w-4 h-4 text-primary shrink-0" />
    }
  }

  return (
    <div ref={containerRef} className="space-y-1.5 relative select-none">
      {label && <label className="text-xs font-semibold text-foreground">{label}</label>}

      {/* Main Role Card Selector */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-3 rounded-2xl bg-background hover:bg-muted/40 border border-border focus:border-primary/50 text-left transition-all shadow-2xs group cursor-pointer"
      >
        <div className="flex items-start gap-3 min-w-0 pr-2">
          <div className="w-8 h-8 rounded-xl bg-muted flex items-center justify-center shrink-0 mt-0.5 group-hover:scale-105 transition-transform">
            {getRoleIcon(selectedRole.name)}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-foreground truncate">{selectedRole.name}</span>
              {selectedRole.badge && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/15 text-indigo-600 dark:text-indigo-400">
                  {selectedRole.badge}
                </span>
              )}
            </div>
            <p className="text-[11px] text-muted-foreground leading-snug line-clamp-1 mt-0.5">
              {selectedRole.description}
            </p>
          </div>
        </div>

        <ChevronDown
          className={`w-4 h-4 text-muted-foreground shrink-0 transition-transform duration-200 ${
            isOpen ? 'rotate-180 text-foreground' : ''
          }`}
        />
      </button>

      {/* Dropdown Options List */}
      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-1.5 z-50 bg-card border border-border/80 rounded-2xl shadow-2xl p-1.5 space-y-1 animate-scale-in">
          <div className="max-h-64 overflow-y-auto space-y-1 custom-scrollbar pr-0.5">
            {allRoles.map((role) => {
              const isSelected = selectedRole.name.toLowerCase() === role.name.toLowerCase()
              return (
                <button
                  key={role.id}
                  type="button"
                  onClick={() => {
                    onChange(role.name)
                    setIsOpen(false)
                  }}
                  className={`w-full flex items-start justify-between p-2.5 rounded-xl text-left transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-primary/10 text-foreground shadow-2xs border border-primary/20'
                      : 'hover:bg-muted text-foreground'
                  }`}
                >
                  <div className="flex items-start gap-2.5 min-w-0 pr-2">
                    <div className="mt-0.5">{getRoleIcon(role.name)}</div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={`text-xs ${isSelected ? 'font-bold text-primary' : 'font-semibold text-foreground'}`}>
                          {role.name}
                        </span>
                        {role.badge && (
                          <span className="px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-indigo-500/15 text-indigo-600 dark:text-indigo-400">
                            {role.badge}
                          </span>
                        )}
                        {role.isCustom && (
                          <span className="px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-muted text-muted-foreground">
                            Custom
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-muted-foreground leading-snug mt-0.5">
                        {role.description}
                      </p>
                    </div>
                  </div>

                  {isSelected && <Check className="w-4 h-4 text-primary shrink-0 mt-1" />}
                </button>
              )
            })}
          </div>

          {/* Add custom role footer */}
          <div className="pt-1.5 border-t border-border/60">
            {isAddingCustom ? (
              <div className="p-1 space-y-2">
                <input
                  type="text"
                  placeholder="Enter role title (e.g. Lead Developer)..."
                  value={customRoleInput}
                  onChange={(e) => setCustomRoleInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      handleAddCustomRole()
                    }
                  }}
                  autoFocus
                  className="w-full px-2.5 py-1.5 text-xs rounded-lg bg-background border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                />
                <div className="flex items-center justify-end gap-1.5">
                  <button
                    type="button"
                    onClick={() => setIsAddingCustom(false)}
                    className="px-2.5 py-1 text-[11px] rounded-lg text-muted-foreground hover:bg-muted"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleAddCustomRole}
                    disabled={!customRoleInput.trim()}
                    className="px-3 py-1 text-[11px] font-bold rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                  >
                    Save Role
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setIsAddingCustom(true)}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add custom role</span>
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
