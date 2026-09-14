'use client'

import React, { useState, useEffect } from 'react'
import {
  X,
  ChevronLeft,
  ChevronDown,
  Plus,
  GripVertical,
  MoreHorizontal,
  Check,
  Circle,
  CheckCircle2,
  HelpCircle,
  Sparkles,
  Trash2,
  Edit2,
  Sliders,
} from 'lucide-react'
import {
  useStatusStore,
  CustomStatus,
  StatusCategory,
  BUILT_IN_TEMPLATES,
  sortStatusesByStructure,
} from '@/stores/status-store'
import { Portal } from '@/components/ui/portal'

interface EditSpaceStatusesModalProps {
  isOpen: boolean
  onClose: () => void
  workspaceId: string
  spaceName?: string
  onApplied?: () => void
}

const PALETTE = [
  '#87909e', // Slate Gray
  '#0284c7', // Sky Blue
  '#3b82f6', // Indigo Blue
  '#8b5cf6', // Violet
  '#a855f7', // Purple
  '#ec4899', // Pink
  '#f43f5e', // Rose
  '#ef4444', // Red
  '#ea580c', // Orange
  '#f59e0b', // Amber
  '#10b981', // Emerald
  '#14b8a6', // Teal
]

export function EditSpaceStatusesModal({
  isOpen,
  onClose,
  workspaceId,
  spaceName = 'Workspace',
  onApplied,
}: EditSpaceStatusesModalProps) {
  const {
    getStatuses,
    setStatuses,
    addStatus,
    updateStatus,
    deleteStatus,
    applyTemplate,
    selectedTemplate,
    progressIconsEnabled,
    toggleProgressIcons,
  } = useStatusStore()

  const [localStatuses, setLocalStatuses] = useState<CustomStatus[]>([])
  const [templateKey, setTemplateKey] = useState('custom')
  const [addingCategory, setAddingCategory] = useState<StatusCategory | null>(null)
  const [newStatusName, setNewStatusName] = useState('')
  const [newStatusColor, setNewStatusColor] = useState('#0284c7')
  const [colorPickerStatusId, setColorPickerStatusId] = useState<string | null>(null)
  const [activeMenuStatusId, setActiveMenuStatusId] = useState<string | null>(null)
  const [editingNameStatusId, setEditingNameStatusId] = useState<string | null>(null)
  const [tempEditName, setTempEditName] = useState('')
  const [draggedStatusId, setDraggedStatusId] = useState<string | null>(null)
  const [dragOverStatusId, setDragOverStatusId] = useState<string | null>(null)

  useEffect(() => {
    if (isOpen) {
      const current = getStatuses(workspaceId)
      setLocalStatuses([...current])
      setTemplateKey(selectedTemplate[workspaceId] || 'custom')
      setAddingCategory(null)
      setColorPickerStatusId(null)
      setActiveMenuStatusId(null)
      setDraggedStatusId(null)
      setDragOverStatusId(null)
    }
  }, [isOpen, workspaceId, getStatuses, selectedTemplate])

  if (!isOpen) return null

  const handleTemplateChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const key = e.target.value
    setTemplateKey(key)
    if (key !== 'custom' && BUILT_IN_TEMPLATES[key]) {
      const template = BUILT_IN_TEMPLATES[key]
      const newSt: CustomStatus[] = template.statuses.map((s, idx) => ({
        ...s,
        id: s.name.toLowerCase().replace(/[^a-z0-9]/g, '_'),
        order: idx,
      }))
      setLocalStatuses(sortStatusesByStructure(newSt))
    }
  }

  const handleAddStatusToCategory = (cat: StatusCategory) => {
    if (!newStatusName.trim()) return
    const id = newStatusName.toLowerCase().replace(/[^a-z0-9]/g, '_') + '_' + Date.now().toString().slice(-4)
    const newStatus: CustomStatus = {
      id,
      name: newStatusName.toUpperCase().trim(),
      color: newStatusColor,
      category: cat,
      order: 0,
    }
    const combined = sortStatusesByStructure([...localStatuses, newStatus]).map((s, idx) => ({
      ...s,
      order: idx,
    }))
    setLocalStatuses(combined)
    setTemplateKey('custom')
    setNewStatusName('')
    setAddingCategory(null)
  }

  const handleStatusDragStart = (e: React.DragEvent, id: string) => {
    e.dataTransfer.setData('text/plain', id)
    e.dataTransfer.effectAllowed = 'move'
    setDraggedStatusId(id)
  }

  const handleStatusDragOver = (e: React.DragEvent, id: string) => {
    if (draggedStatusId && draggedStatusId !== id) {
      e.preventDefault()
      e.dataTransfer.dropEffect = 'move'
      setDragOverStatusId(id)
    }
  }

  const handleStatusDrop = (e: React.DragEvent, targetId: string, targetCategory: StatusCategory) => {
    e.preventDefault()
    if (!draggedStatusId || draggedStatusId === targetId) {
      setDraggedStatusId(null)
      setDragOverStatusId(null)
      return
    }

    const next = [...localStatuses]
    const fromIndex = next.findIndex((s) => s.id === draggedStatusId)
    const toIndex = next.findIndex((s) => s.id === targetId)

    if (fromIndex !== -1 && toIndex !== -1) {
      const [moved] = next.splice(fromIndex, 1)
      moved.category = targetCategory
      next.splice(toIndex, 0, moved)
      const reindexed = next.map((s, idx) => ({ ...s, order: idx }))
      setLocalStatuses(reindexed)
      setTemplateKey('custom')
    }

    setDraggedStatusId(null)
    setDragOverStatusId(null)
  }

  const handleStatusDragEnd = () => {
    setDraggedStatusId(null)
    setDragOverStatusId(null)
  }

  const handleDeleteStatus = (id: string) => {
    if (localStatuses.length <= 2) return
    setLocalStatuses(localStatuses.filter((s) => s.id !== id))
    setActiveMenuStatusId(null)
  }

  const handleColorChange = (id: string, color: string) => {
    setLocalStatuses(localStatuses.map((s) => (s.id === id ? { ...s, color } : s)))
    setColorPickerStatusId(null)
  }

  const handleApply = () => {
    setStatuses(workspaceId, localStatuses)
    if (onApplied) onApplied()
    onClose()
  }

  const renderStatusProgressIcon = (status: CustomStatus) => {
    switch (status.category) {
      case 'NOT_STARTED':
        return (
          <div
            className="w-4 h-4 rounded-full border-2 border-dashed flex items-center justify-center shrink-0 cursor-pointer"
            style={{ borderColor: status.color }}
            title="Not Started (Click to change color)"
          />
        )
      case 'ACTIVE':
        return (
          <div
            className="w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 cursor-pointer"
            style={{ borderColor: status.color }}
            title="Active (Click to change color)"
          >
            <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: status.color }} />
          </div>
        )
      case 'DONE':
      case 'CLOSED':
        return (
          <div
            className="w-4 h-4 rounded-full flex items-center justify-center text-white shrink-0 cursor-pointer"
            style={{ backgroundColor: status.color }}
            title="Closed / Done (Click to change color)"
          >
            <Check className="w-2.5 h-2.5" />
          </div>
        )
    }
  }

  const categories: { key: StatusCategory; label: string; desc: string }[] = [
    { key: 'NOT_STARTED', label: 'Not started', desc: 'Tasks that have not been initiated yet' },
    { key: 'ACTIVE', label: 'Active', desc: 'Tasks currently in progress, review, or testing' },
    { key: 'DONE', label: 'Done', desc: 'Tasks completed or awaiting sign-off' },
    { key: 'CLOSED', label: 'Closed', desc: 'Finished, deployed, or archived tasks' },
  ]

  return (
    <Portal>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md animate-fade-in">
        <div className="w-full max-w-4xl max-h-[92vh] bg-[#12111A] border border-white/10 rounded-3xl shadow-2xl flex flex-col overflow-hidden text-white">
        {/* Header */}
        <div className="h-14 px-6 border-b border-white/[0.08] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="p-1.5 rounded-xl hover:bg-white/[0.06] text-white/50 hover:text-white transition-colors cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <h2 className="text-base font-bold tracking-tight text-white flex items-center gap-2">
              Edit {spaceName} statuses
            </h2>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-white/[0.06] text-white/50 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body Split View */}
        <div className="flex-1 flex flex-col md:flex-row min-h-0 overflow-hidden">
          {/* Left Panel: Templates & ClickApps */}
          <div className="w-full md:w-72 border-b md:border-b-0 md:border-r border-white/[0.08] p-6 space-y-6 shrink-0 bg-[#0E0D16]">
            {/* Template Selector */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-white/60 block">Status template</label>
              <div className="relative">
                <select
                  value={templateKey}
                  onChange={handleTemplateChange}
                  className="w-full h-10 appearance-none bg-white/[0.05] border border-white/10 rounded-xl px-3 py-2 text-xs font-semibold text-white focus:outline-none focus:ring-2 focus:ring-primary cursor-pointer"
                >
                  <option value="custom" className="bg-[#161028] text-white">
                    Custom
                  </option>
                  <option value="default" className="bg-[#161028] text-white">
                    Normal (To Do, In Progress, Complete)
                  </option>
                  <option value="kanban" className="bg-[#161028] text-white">
                    Kanban / Agile
                  </option>
                  <option value="scrum" className="bg-[#161028] text-white">
                    Scrum / Engineering
                  </option>
                  <option value="marketing" className="bg-[#161028] text-white">
                    Marketing &amp; Content
                  </option>
                </select>
                <ChevronDown className="w-4 h-4 text-white/40 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>

            {/* Status ClickApps Card */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-white/60 block">Status ClickApps</label>
              <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/[0.08] space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full border border-sky-400" />
                    <span className="w-2.5 h-2.5 rounded-full bg-indigo-500" />
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                  </div>
                  <button
                    type="button"
                    onClick={toggleProgressIcons}
                    className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-md transition-all cursor-pointer ${
                      progressIconsEnabled
                        ? 'bg-primary/20 text-primary border border-primary/30'
                        : 'bg-white/10 text-white/50'
                    }`}
                  >
                    {progressIconsEnabled ? 'Enabled' : 'Disabled'}
                  </button>
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white">Progress icons</h4>
                  <p className="text-[11px] text-white/50 leading-relaxed mt-0.5">
                    Build linear workflows with status progress icons on your board.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Right Panel: Categorized Status Columns */}
          <div className="flex-1 p-6 overflow-y-auto space-y-6">
            {categories.map((cat) => {
              const catStatuses = localStatuses.filter((s) => s.category === cat.key)

              return (
                <div key={cat.key} className="space-y-2.5">
                  {/* Category Header */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-white/80">
                      <span>{cat.label}</span>
                      <span className="text-white/30 text-[11px] font-normal" title={cat.desc}>
                        ({catStatuses.length})
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setAddingCategory(cat.key)
                        setNewStatusName('')
                        setNewStatusColor(cat.key === 'CLOSED' ? '#10b981' : '#0284c7')
                      }}
                      className="p-1 rounded-lg text-white/40 hover:text-white hover:bg-white/[0.06] transition-colors cursor-pointer"
                      title={`Add status to ${cat.label}`}
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Status List in this Category */}
                  <div
                    onDragOver={(e) => {
                      if (draggedStatusId) {
                        e.preventDefault()
                      }
                    }}
                    onDrop={(e) => {
                      if (draggedStatusId && !dragOverStatusId) {
                        e.preventDefault()
                        const next = [...localStatuses]
                        const fromIndex = next.findIndex((s) => s.id === draggedStatusId)
                        if (fromIndex !== -1) {
                          const [moved] = next.splice(fromIndex, 1)
                          moved.category = cat.key
                          const lastCatIdx = next.map(s => s.category).lastIndexOf(cat.key)
                          if (lastCatIdx !== -1) {
                            next.splice(lastCatIdx + 1, 0, moved)
                          } else {
                            next.push(moved)
                          }
                          setLocalStatuses(next.map((s, idx) => ({ ...s, order: idx })))
                          setTemplateKey('custom')
                        }
                        setDraggedStatusId(null)
                        setDragOverStatusId(null)
                      }
                    }}
                    className="space-y-1.5 min-h-[36px]"
                  >
                    {catStatuses.map((st) => (
                      <div
                        key={st.id}
                        draggable={true}
                        onDragStart={(e) => handleStatusDragStart(e, st.id)}
                        onDragOver={(e) => handleStatusDragOver(e, st.id)}
                        onDragLeave={() => {
                          if (dragOverStatusId === st.id) setDragOverStatusId(null)
                        }}
                        onDrop={(e) => handleStatusDrop(e, st.id, cat.key)}
                        onDragEnd={handleStatusDragEnd}
                        className={`group flex items-center justify-between p-2.5 rounded-xl border transition-all relative ${
                          draggedStatusId === st.id
                            ? 'opacity-40 border-dashed border-primary bg-primary/10'
                            : dragOverStatusId === st.id
                            ? 'border-primary ring-2 ring-primary/50 bg-white/[0.08] scale-[1.01]'
                            : 'bg-white/[0.03] hover:bg-white/[0.06] border-white/[0.06] hover:border-white/15'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0 flex-1">
                          <GripVertical className="w-3.5 h-3.5 text-white/20 group-hover:text-white/60 shrink-0 cursor-grab active:cursor-grabbing" />

                          {/* Color / Icon trigger */}
                          <div className="relative">
                            <button
                              type="button"
                              onClick={() =>
                                setColorPickerStatusId(colorPickerStatusId === st.id ? null : st.id)
                              }
                              className="focus:outline-none"
                            >
                              {renderStatusProgressIcon(st)}
                            </button>

                            {/* Color Picker Popover */}
                            {colorPickerStatusId === st.id && (
                              <div className="absolute top-full left-0 mt-2 p-2.5 rounded-2xl bg-[#1D182E] border border-white/15 shadow-2xl z-50 grid grid-cols-4 gap-1.5 w-44 animate-scale-in">
                                {PALETTE.map((c) => (
                                  <button
                                    key={c}
                                    type="button"
                                    onClick={() => handleColorChange(st.id, c)}
                                    className="w-7 h-7 rounded-lg transition-transform hover:scale-110 flex items-center justify-center cursor-pointer"
                                    style={{ backgroundColor: c }}
                                  >
                                    {st.color === c && <Check className="w-3.5 h-3.5 text-white" />}
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>

                          {/* Editable Name */}
                          {editingNameStatusId === st.id ? (
                            <input
                              type="text"
                              value={tempEditName}
                              onChange={(e) => setTempEditName(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  if (tempEditName.trim()) {
                                    setLocalStatuses(
                                      localStatuses.map((s) =>
                                        s.id === st.id ? { ...s, name: tempEditName.toUpperCase().trim() } : s
                                      )
                                    )
                                  }
                                  setEditingNameStatusId(null)
                                }
                              }}
                              onBlur={() => {
                                if (tempEditName.trim()) {
                                  setLocalStatuses(
                                    localStatuses.map((s) =>
                                      s.id === st.id ? { ...s, name: tempEditName.toUpperCase().trim() } : s
                                    )
                                  )
                                }
                                setEditingNameStatusId(null)
                              }}
                              autoFocus
                              className="bg-white/10 px-2 py-0.5 rounded text-xs font-bold text-white uppercase focus:outline-none focus:ring-1 focus:ring-primary w-48"
                            />
                          ) : (
                            <span
                              onClick={() => {
                                setEditingNameStatusId(st.id)
                                setTempEditName(st.name)
                              }}
                              className="text-xs font-bold text-white tracking-wide truncate cursor-pointer hover:underline"
                            >
                              {st.name}
                            </span>
                          )}
                        </div>

                        {/* Right Actions */}
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() =>
                              setActiveMenuStatusId(activeMenuStatusId === st.id ? null : st.id)
                            }
                            className="p-1 rounded-lg text-white/40 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                          >
                            <MoreHorizontal className="w-3.5 h-3.5" />
                          </button>

                          {/* Options Menu */}
                          {activeMenuStatusId === st.id && (
                            <div className="absolute right-2 top-full mt-1 w-36 rounded-xl bg-[#1E1930] border border-white/15 p-1 shadow-2xl z-50 space-y-0.5 animate-scale-in">
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingNameStatusId(st.id)
                                  setTempEditName(st.name)
                                  setActiveMenuStatusId(null)
                                }}
                                className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs text-white/80 hover:text-white hover:bg-white/10 cursor-pointer"
                              >
                                <Edit2 className="w-3 h-3" /> Rename
                              </button>
                              {localStatuses.length > 2 && (
                                <button
                                  type="button"
                                  onClick={() => handleDeleteStatus(st.id)}
                                  className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs text-rose-400 hover:bg-rose-500/10 cursor-pointer"
                                >
                                  <Trash2 className="w-3 h-3" /> Delete
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}

                    {/* Inline Add Status Input */}
                    {addingCategory === cat.key ? (
                      <div className="p-2.5 rounded-xl bg-white/[0.05] border border-primary/40 flex items-center gap-2 animate-fade-in">
                        <div
                          className="w-4 h-4 rounded-full shrink-0"
                          style={{ backgroundColor: newStatusColor }}
                        />
                        <input
                          type="text"
                          placeholder="Status name (e.g. BLOCKED, QA, REVIEW)"
                          value={newStatusName}
                          onChange={(e) => setNewStatusName(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleAddStatusToCategory(cat.key)
                            if (e.key === 'Escape') setAddingCategory(null)
                          }}
                          autoFocus
                          className="flex-1 bg-transparent text-xs font-bold text-white uppercase placeholder:normal-case placeholder:text-white/30 focus:outline-none"
                        />
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleAddStatusToCategory(cat.key)}
                            disabled={!newStatusName.trim()}
                            className="px-2.5 py-1 rounded-lg bg-primary text-primary-foreground text-[11px] font-bold hover:bg-primary/90 disabled:opacity-50 cursor-pointer"
                          >
                            Add
                          </button>
                          <button
                            type="button"
                            onClick={() => setAddingCategory(null)}
                            className="px-2 py-1 rounded-lg text-white/50 hover:text-white text-[11px] cursor-pointer"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          setAddingCategory(cat.key)
                          setNewStatusName('')
                          setNewStatusColor(cat.key === 'CLOSED' ? '#10b981' : '#0284c7')
                        }}
                        className="w-full py-2 px-3 rounded-xl border border-dashed border-white/10 hover:border-white/20 hover:bg-white/[0.02] text-xs font-semibold text-white/50 hover:text-white/80 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Add status</span>
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="h-16 px-6 border-t border-white/[0.08] flex items-center justify-between shrink-0 bg-[#0E0D16]">
          <div className="flex items-center gap-2 text-xs text-white/40 hover:text-white/70 transition-colors">
            <HelpCircle className="w-4 h-4" />
            <span>Customize workflow statuses per space or team.</span>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-white/60 hover:text-white hover:bg-white/[0.05] transition-all cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleApply}
              className="px-5 py-2 rounded-xl bg-gradient-to-r from-primary to-indigo-600 text-white text-xs font-bold hover:opacity-95 transition-all shadow-lg shadow-primary/25 cursor-pointer active:scale-95"
            >
              Apply changes
            </button>
          </div>
        </div>
      </div>
    </div>
  </Portal>
)
}
