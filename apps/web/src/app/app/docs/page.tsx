'use client'

import React, { useState, useEffect, useMemo, useRef } from 'react'
import {
  BookOpen,
  FileText,
  Plus,
  Search,
  SlidersHorizontal,
  ArrowUpDown,
  Upload,
  ChevronDown,
  Trash2,
  Star,
  Link as LinkIcon,
  Users,
  Check,
  FilePlus,
  LayoutGrid,
  List,
  Clock,
  Folder,
  Sparkles,
  X,
  Lock,
  Globe,
  Share2,
  ExternalLink,
  Tag,
  Eye,
  Download,
  FileCode,
  FileSpreadsheet,
  Image as ImageIcon,
  Archive,
  Film,
  File,
} from 'lucide-react'
import { useDocStore, DocItem } from '@/stores/doc-store'
import { useAuthStore } from '@/stores/auth-store'
import { useWorkspaceStore } from '@/stores/workspace-store'
import { useProjectStore } from '@/stores/project-store'
import { useTaskStore } from '@/stores/task-store'
import { DocViewerModal } from '@/features/docs/components/DocViewerModal'
import { FileViewerModal, FileToView } from '@/components/file-viewer-modal'
import {
  extractAllWorkspaceProjectFiles,
  ProjectFileItem,
  formatFileSize,
  getFileTypeCategory,
  downloadFile,
} from '@/lib/project-files'

export default function DocsPage() {
  const { docs, loadDocs, createDoc, deleteDoc, updateDoc } = useDocStore()
  const { projects, loadProjects } = useProjectStore()
  const { tasks, loadTasks } = useTaskStore()
  const { user } = useAuthStore()
  const { currentWorkspace } = useWorkspaceStore()

  const [isMounted, setIsMounted] = useState(false)
  const [searchFilter, setSearchFilter] = useState('')
  const [selectedDocId, setSelectedDocId] = useState<string | null>(null)
  const [isViewerOpen, setIsViewerOpen] = useState(false)
  const [activeProjectFileToView, setActiveProjectFileToView] = useState<FileToView | null>(null)
  const [activeTab, setActiveTab] = useState<'all' | 'docs' | 'projects' | 'starred' | 'recent'>('all')
  const [selectedSpace, setSelectedSpace] = useState<string>('ALL')
  const [activeSort, setActiveSort] = useState<'updated' | 'created' | 'name'>('updated')
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table')
  const [toastMessage, setToastMessage] = useState<string | null>(null)
  const [docToDelete, setDocToDelete] = useState<{ id: string; title: string } | null>(null)
  const [selectedDocIds, setSelectedDocIds] = useState<string[]>([])
  const [isBulkDeleting, setIsBulkDeleting] = useState(false)
  const [isNewDocMenuOpen, setIsNewDocMenuOpen] = useState(false)
  const headerCheckboxRef = useRef<HTMLInputElement>(null)
  const newDocMenuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setIsMounted(true)
  }, [])

  useEffect(() => {
    if (currentWorkspace?.id) {
      loadDocs(currentWorkspace.id)
      loadProjects(currentWorkspace.id)
      loadTasks(currentWorkspace.id)
    } else {
      loadDocs()
    }
  }, [loadDocs, loadProjects, loadTasks, currentWorkspace?.id])

  // Project files sync listener
  const [projectFilesVersion, setProjectFilesVersion] = useState(0)
  useEffect(() => {
    const handleUpdate = () => setProjectFilesVersion((v) => v + 1)
    window.addEventListener('taskflow_project_files_updated', handleUpdate)
    return () => window.removeEventListener('taskflow_project_files_updated', handleUpdate)
  }, [])

  const workspaceProjectFiles: ProjectFileItem[] = useMemo(() => {
    if (!projects || projects.length === 0) return []
    return extractAllWorkspaceProjectFiles(projects, tasks)
  }, [projects, tasks, projectFilesVersion])

  const renderFileIcon = (file: ProjectFileItem, sizeCls = 'w-4 h-4') => {
    const cat = getFileTypeCategory(file.name, file.type)
    switch (cat) {
      case 'code':
        return <FileCode className={`${sizeCls} text-cyan-400`} />
      case 'sheet':
        return <FileSpreadsheet className={`${sizeCls} text-emerald-400`} />
      case 'doc':
        return <FileText className={`${sizeCls} text-rose-400`} />
      case 'image':
        return <ImageIcon className={`${sizeCls} text-purple-400`} />
      case 'media':
        return <Film className={`${sizeCls} text-sky-400`} />
      case 'archive':
        return <Archive className={`${sizeCls} text-amber-400`} />
      default:
        return <File className={`${sizeCls} text-zinc-400`} />
    }
  }

  // Close new doc menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (newDocMenuRef.current && !newDocMenuRef.current.contains(e.target as Node)) {
        setIsNewDocMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const showToast = (msg: string) => {
    setToastMessage(msg)
    setTimeout(() => setToastMessage(null), 3000)
  }

  // Create new document
  const handleCreateNewDoc = (customTitle?: string, customContent?: string, space?: string) => {
    const titleToUse = (customTitle || '').trim() || 'Untitled Doc'
    const author = user?.displayName || user?.firstName || 'anandu'
    const location = space || (selectedSpace !== 'ALL' ? selectedSpace : 'Team Space')
    const newDoc = createDoc(titleToUse, customContent || '', author, location)
    setSelectedDocId(newDoc.id)
    setIsViewerOpen(true)
    setIsNewDocMenuOpen(false)
    showToast(`Created document "${titleToUse}"`)
  }

  const handleOpenDoc = (docId: string) => {
    setSelectedDocId(docId)
    setIsViewerOpen(true)
  }

  const handleRequestDeleteDoc = (e: React.MouseEvent, docId: string, docTitle: string) => {
    e.stopPropagation()
    setDocToDelete({ id: docId, title: docTitle })
  }

  const handleConfirmDeleteDoc = () => {
    if (!docToDelete) return
    deleteDoc(docToDelete.id, currentWorkspace?.id)
    setSelectedDocIds((prev) => prev.filter((id) => id !== docToDelete.id))
    showToast(`Deleted "${docToDelete.title}"`)
    setDocToDelete(null)
  }

  const handleToggleStar = (e: React.MouseEvent, doc: DocItem) => {
    e.stopPropagation()
    updateDoc(doc.id, { starred: !doc.starred })
    showToast(doc.starred ? 'Removed from favorites' : 'Added to favorites')
  }

  const handleCopyLink = (e: React.MouseEvent, docId: string) => {
    e.stopPropagation()
    if (typeof window !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(`${window.location.origin}/app/docs/${docId}`)
      showToast('Document link copied to clipboard')
    }
  }

  // Available unique spaces & project sources
  const availableSpaces = useMemo(() => {
    const spaces = new Set<string>()
    ;(docs || []).forEach((d) => {
      if (d && d.location) spaces.add(d.location)
    })
    ;(workspaceProjectFiles || []).forEach((f) => {
      if (f && f.projectName) spaces.add(`Project: ${f.projectName}`)
    })
    return Array.from(spaces)
  }, [docs, workspaceProjectFiles])

  // Summary statistics
  const stats = useMemo(() => {
    const all = docs || []
    const starred = all.filter((d) => d?.starred).length
    const spacesCount = new Set(all.map((d) => d?.location || 'Team Space')).size
    const lastUpdated = all.slice().sort((a, b) => {
      const bTime = b?.updatedAt ? new Date(b.updatedAt).getTime() : 0
      const aTime = a?.updatedAt ? new Date(a.updatedAt).getTime() : 0
      return (isNaN(bTime) ? 0 : bTime) - (isNaN(aTime) ? 0 : aTime)
    })[0]

    return {
      total: all.length + workspaceProjectFiles.length,
      docCount: all.length,
      projectFilesCount: workspaceProjectFiles.length,
      starred,
      spacesCount,
      lastUpdatedTitle: lastUpdated?.title || 'None',
      lastUpdatedAt: lastUpdated?.updatedAt,
    }
  }, [docs, workspaceProjectFiles])

  // Filtered & sorted docs
  const filteredDocs = useMemo(() => {
    if (activeTab === 'projects') return []

    return (docs || [])
      .filter((d) => {
        if (!d || typeof d !== 'object' || !d.id || typeof d.title !== 'string') return false

        // Tab filter
        if (activeTab === 'starred' && !d.starred) return false
        if (activeTab === 'recent') {
          const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000
          const time = d.updatedAt ? new Date(d.updatedAt).getTime() : 0
          if (!isNaN(time) && time < sevenDaysAgo) return false
        }

        // Space filter
        if (selectedSpace !== 'ALL') {
          if (selectedSpace.startsWith('Project: ')) return false
          if (d.location !== selectedSpace) return false
        }

        // Search query
        if (searchFilter.trim()) {
          const q = searchFilter.trim().toLowerCase()
          const matchTitle = d.title.toLowerCase().includes(q)
          const matchLocation = (d.location || '').toLowerCase().includes(q)
          const matchTags = (d.tags || []).some((t) => t.toLowerCase().includes(q))
          const matchContent = (d.content || '').toLowerCase().includes(q)
          if (!matchTitle && !matchLocation && !matchTags && !matchContent) return false
        }

        return true
      })
      .sort((a, b) => {
        if (activeSort === 'name') {
          return (a.title || '').localeCompare(b.title || '')
        }
        if (activeSort === 'created') {
          const bTime = b?.createdAt ? new Date(b.createdAt).getTime() : 0
          const aTime = a?.createdAt ? new Date(a.createdAt).getTime() : 0
          return (isNaN(bTime) ? 0 : bTime) - (isNaN(aTime) ? 0 : aTime)
        }
        const bTime = b?.updatedAt ? new Date(b.updatedAt).getTime() : 0
        const aTime = a?.updatedAt ? new Date(a.updatedAt).getTime() : 0
        return (isNaN(bTime) ? 0 : bTime) - (isNaN(aTime) ? 0 : aTime)
      })
  }, [docs, activeTab, selectedSpace, searchFilter, activeSort])

  // Filtered & sorted project files (view-only on docs screen)
  const filteredProjectFiles = useMemo(() => {
    if (activeTab === 'docs') return []
    if (activeTab === 'starred') return []

    return (workspaceProjectFiles || [])
      .filter((f) => {
        if (activeTab === 'recent') {
          const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000
          const time = f.uploadedAt ? new Date(f.uploadedAt).getTime() : 0
          if (!isNaN(time) && time < sevenDaysAgo) return false
        }

        // Space filter
        if (selectedSpace !== 'ALL') {
          if (selectedSpace.startsWith('Project: ')) {
            const pName = selectedSpace.replace('Project: ', '')
            if (f.projectName !== pName) return false
          } else if (f.projectName !== selectedSpace) {
            return false
          }
        }

        // Search query
        if (searchFilter.trim()) {
          const q = searchFilter.trim().toLowerCase()
          const matchName = f.name.toLowerCase().includes(q)
          const matchProject = f.projectName.toLowerCase().includes(q)
          const matchTask = (f.taskTitle || '').toLowerCase().includes(q)
          const matchNotes = (f.notes || '').toLowerCase().includes(q)
          if (!matchName && !matchProject && !matchTask && !matchNotes) return false
        }

        return true
      })
      .sort((a, b) => {
        if (activeSort === 'name') {
          return (a.name || '').localeCompare(b.name || '')
        }
        const bTime = new Date(b.uploadedAt).getTime() || 0
        const aTime = new Date(a.uploadedAt).getTime() || 0
        return bTime - aTime
      })
  }, [workspaceProjectFiles, activeTab, selectedSpace, searchFilter, activeSort])

  // Multi-select management
  const isAllSelected = filteredDocs.length > 0 && selectedDocIds.length === filteredDocs.length
  const isIndeterminate = selectedDocIds.length > 0 && selectedDocIds.length < filteredDocs.length

  useEffect(() => {
    if (headerCheckboxRef.current) {
      headerCheckboxRef.current.indeterminate = isIndeterminate
    }
  }, [isIndeterminate])

  const handleToggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedDocIds([])
    } else {
      setSelectedDocIds(filteredDocs.map((d) => d.id))
    }
  }

  const handleToggleSelectDoc = (docId: string, e?: React.MouseEvent | React.ChangeEvent) => {
    if (e) e.stopPropagation()
    setSelectedDocIds((prev) =>
      prev.includes(docId) ? prev.filter((id) => id !== docId) : [...prev, docId]
    )
  }

  const handleConfirmBulkDelete = () => {
    if (selectedDocIds.length === 0) return
    selectedDocIds.forEach((id) => {
      deleteDoc(id, currentWorkspace?.id)
    })
    showToast(`Deleted ${selectedDocIds.length} document${selectedDocIds.length > 1 ? 's' : ''}`)
    setSelectedDocIds([])
    setIsBulkDeleting(false)
  }

  const handleBulkStar = () => {
    selectedDocIds.forEach((id) => {
      updateDoc(id, { starred: true })
    })
    showToast(`Marked ${selectedDocIds.length} document${selectedDocIds.length > 1 ? 's' : ''} as favorite`)
  }

  const formatDocDate = (dateStr?: string) => {
    if (!dateStr) return 'Recently'
    try {
      const date = new Date(dateStr)
      if (isNaN(date.getTime())) return 'Recently'
      if (!isMounted) return 'Today'
      const now = new Date()
      const isToday = date.toDateString() === now.toDateString()
      if (isToday) {
        let hours = date.getHours()
        const minutes = date.getMinutes().toString().padStart(2, '0')
        const ampm = hours >= 12 ? 'PM' : 'AM'
        hours = hours % 12
        hours = hours ? hours : 12
        return `Today at ${hours.toString().padStart(2, '0')}:${minutes} ${ampm}`
      }
      const yesterday = new Date()
      yesterday.setDate(now.getDate() - 1)
      if (date.toDateString() === yesterday.toDateString()) {
        return 'Yesterday'
      }
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    } catch {
      return 'Recently'
    }
  }

  const cleanPreviewText = (markdownContent?: string) => {
    if (!markdownContent) return 'Empty document. Click to start writing notes, specs, or guidelines...'
    return (
      markdownContent
        .replace(/#+\s+/g, '')
        .replace(/[*_`~[\]]/g, '')
        .trim()
        .slice(0, 140) + '...'
    )
  }

  return (
    <div className="flex-1 flex flex-col min-h-screen bg-[#0e0f14] text-[#e1e4ea] select-none p-6 lg:p-8 space-y-6 max-w-7xl mx-auto w-full">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-[250] px-4 py-2 rounded-2xl bg-zinc-800 text-white text-xs font-semibold shadow-2xl border border-zinc-700/80 flex items-center gap-2 animate-slide-down">
          <Check className="w-3.5 h-3.5 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* TOP HEADER SECTION */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-white/5">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500/20 to-sky-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shadow-sm">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">Docs</h1>
                <span className="px-2 py-0.5 rounded-full bg-white/10 text-zinc-300 text-[11px] font-semibold border border-white/10">
                  {docs.length}
                </span>
              </div>
            </div>
          </div>
          <p className="text-xs text-zinc-400 pl-11">
            Knowledge base, technical specifications, and team documentation
          </p>
        </div>

        {/* Header Right Actions */}
        <div className="flex items-center gap-2.5 self-start sm:self-auto">
          {/* View Toggle */}
          <div className="flex items-center p-0.5 rounded-xl bg-white/5 border border-white/10">
            <button
              type="button"
              onClick={() => setViewMode('table')}
              className={`p-1.5 rounded-lg text-xs font-medium transition-all ${
                viewMode === 'table'
                  ? 'bg-white/15 text-white shadow-xs'
                  : 'text-zinc-400 hover:text-white'
              }`}
              title="Table View"
            >
              <List className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-lg text-xs font-medium transition-all ${
                viewMode === 'grid'
                  ? 'bg-white/15 text-white shadow-xs'
                  : 'text-zinc-400 hover:text-white'
              }`}
              title="Card Grid View"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
          </div>

          {/* Import Button */}
          <button
            type="button"
            onClick={() => showToast('Import feature: select markdown or PDF files')}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-semibold text-zinc-300 border border-white/10 transition-colors cursor-pointer"
          >
            <Upload className="w-3.5 h-3.5 text-zinc-400" />
            <span>Import</span>
          </button>

          {/* New Doc Button with Dropdown */}
          <div className="relative" ref={newDocMenuRef}>
            <div className="inline-flex rounded-xl shadow-lg shadow-primary/20 overflow-hidden">
              <button
                type="button"
                onClick={() => handleCreateNewDoc()}
                className="inline-flex items-center gap-2 px-3.5 py-2 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-zinc-950 text-xs font-bold transition-all cursor-pointer"
              >
                <Plus className="w-4 h-4 text-zinc-950 stroke-[2.5]" />
                <span>New Doc</span>
              </button>
              <button
                type="button"
                onClick={() => setIsNewDocMenuOpen((prev) => !prev)}
                className="px-2 py-2 bg-emerald-600 hover:bg-emerald-500 text-zinc-950 transition-colors border-l border-emerald-400/30 cursor-pointer flex items-center justify-center"
                title="Templates & Presets"
              >
                <ChevronDown className="w-3.5 h-3.5 text-zinc-950" />
              </button>
            </div>

            {/* New Doc Preset Menu */}
            {isNewDocMenuOpen && (
              <div className="absolute right-0 mt-2 w-56 rounded-2xl bg-[#181922] border border-white/15 shadow-2xl p-2 z-[100] space-y-1 animate-scale-in">
                <button
                  type="button"
                  onClick={() => handleCreateNewDoc('Untitled Doc')}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-left text-xs font-semibold text-zinc-200 hover:bg-white/10 hover:text-white transition-colors cursor-pointer"
                >
                  <FileText className="w-4 h-4 text-emerald-400" />
                  <span>Blank Document</span>
                </button>
                <button
                  type="button"
                  onClick={() =>
                    handleCreateNewDoc(
                      'Technical Architecture Spec',
                      '# Technical Architecture Spec\n\n## Overview\nHigh-level system design and architecture goals.\n\n## Components\n- Core API Layer\n- State Management\n- Database Schemas\n',
                      'Engineering Space'
                    )
                  }
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-left text-xs font-semibold text-zinc-200 hover:bg-white/10 hover:text-white transition-colors cursor-pointer"
                >
                  <Sparkles className="w-4 h-4 text-purple-400" />
                  <span>Architecture Spec</span>
                </button>
                <button
                  type="button"
                  onClick={() =>
                    handleCreateNewDoc(
                      'Product Deliverables & Roadmap',
                      '# Product Deliverables & Roadmap\n\n## Sprint Goals\nKey deliverables for this cycle.\n\n## Milestones\n1. Alpha Testing\n2. Staging Validation\n3. Production Rollout\n',
                      'Product Roadmap'
                    )
                  }
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-left text-xs font-semibold text-zinc-200 hover:bg-white/10 hover:text-white transition-colors cursor-pointer"
                >
                  <Folder className="w-4 h-4 text-sky-400" />
                  <span>Product Roadmap</span>
                </button>
                <button
                  type="button"
                  onClick={() =>
                    handleCreateNewDoc(
                      'Architecture Decision Record (ADR)',
                      '# Architecture Decision Record (ADR)\n\n## Context\nBackground problem description.\n\n## Decision\nChosen technology or approach.\n\n## Consequences\nExpected benefits and tradeoffs.\n',
                      'Engineering Space'
                    )
                  }
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-left text-xs font-semibold text-zinc-200 hover:bg-white/10 hover:text-white transition-colors cursor-pointer"
                >
                  <BookOpen className="w-4 h-4 text-amber-400" />
                  <span>Decision Record (ADR)</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* METRICS SUMMARY STRIP */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div className="p-3.5 rounded-2xl bg-[#13141c] border border-white/5 flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center shrink-0">
            <FileText className="w-4 h-4" />
          </div>
          <div>
            <p className="text-[11px] font-medium text-zinc-400">Total All Docs</p>
            <p className="text-base font-bold text-white">{stats.total}</p>
          </div>
        </div>

        <div className="p-3.5 rounded-2xl bg-[#13141c] border border-white/5 flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center justify-center shrink-0">
            <Folder className="w-4 h-4" />
          </div>
          <div>
            <p className="text-[11px] font-medium text-zinc-400">Project Files</p>
            <p className="text-base font-bold text-purple-400">{stats.projectFilesCount}</p>
          </div>
        </div>

        <div className="p-3.5 rounded-2xl bg-[#13141c] border border-white/5 flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
            <Star className="w-4 h-4 fill-current" />
          </div>
          <div>
            <p className="text-[11px] font-medium text-zinc-400">Favorites</p>
            <p className="text-base font-bold text-white">{stats.starred}</p>
          </div>
        </div>

        <div className="p-3.5 rounded-2xl bg-[#13141c] border border-white/5 flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-sky-500/10 border border-sky-500/20 text-sky-400 flex items-center justify-center shrink-0">
            <Folder className="w-4 h-4" />
          </div>
          <div>
            <p className="text-[11px] font-medium text-zinc-400">Team Spaces</p>
            <p className="text-base font-bold text-white">{stats.spacesCount}</p>
          </div>
        </div>

        <div className="p-3.5 rounded-2xl bg-[#13141c] border border-white/5 flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
            <Clock className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <p className="text-[11px] font-medium text-zinc-400">Latest Update</p>
            <p className="text-xs font-bold text-white truncate max-w-[120px] sm:max-w-[150px]">
              {stats.lastUpdatedTitle}
            </p>
          </div>
        </div>
      </div>

      {/* TOOLBAR: TABS, FILTERS & SEARCH */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pt-1">
        {/* Left Side: Segmented Filter Tabs & Space Filter */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Segmented View Tabs */}
          <div className="flex items-center p-1 rounded-xl bg-white/5 border border-white/10 text-xs">
            <button
              type="button"
              onClick={() => setActiveTab('all')}
              className={`px-3 py-1 rounded-lg font-semibold transition-all ${
                activeTab === 'all'
                  ? 'bg-white/15 text-white shadow-xs'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              All ({stats.total})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('docs')}
              className={`px-3 py-1 rounded-lg font-semibold transition-all ${
                activeTab === 'docs'
                  ? 'bg-white/15 text-white shadow-xs'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              Team Docs ({stats.docCount})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('projects')}
              className={`px-3 py-1 rounded-lg font-semibold flex items-center gap-1.5 transition-all ${
                activeTab === 'projects'
                  ? 'bg-white/15 text-white shadow-xs'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <Folder className="w-3 h-3 text-purple-400" />
              <span>Project Files</span>
              {stats.projectFilesCount > 0 && (
                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-purple-400/20 text-purple-300 font-bold">
                  {stats.projectFilesCount}
                </span>
              )}
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('starred')}
              className={`px-3 py-1 rounded-lg font-semibold flex items-center gap-1.5 transition-all ${
                activeTab === 'starred'
                  ? 'bg-white/15 text-white shadow-xs'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <Star className="w-3 h-3 text-amber-400 fill-current" />
              <span>Favorites</span>
              {stats.starred > 0 && (
                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-amber-400/20 text-amber-300 font-bold">
                  {stats.starred}
                </span>
              )}
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('recent')}
              className={`px-3 py-1 rounded-lg font-semibold transition-all ${
                activeTab === 'recent'
                  ? 'bg-white/15 text-white shadow-xs'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              Recent
            </button>
          </div>

          {/* Space Filter Dropdown */}
          {availableSpaces.length > 0 && (
            <div className="relative">
              <select
                value={selectedSpace}
                onChange={(e) => setSelectedSpace(e.target.value)}
                className="appearance-none bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl pl-3 pr-8 py-1.5 text-xs text-zinc-300 focus:outline-none focus:border-white/20 font-medium cursor-pointer"
              >
                <option value="ALL" className="bg-[#181922] text-zinc-200">
                  All Spaces
                </option>
                {availableSpaces.map((space) => (
                  <option key={space} value={space} className="bg-[#181922] text-zinc-200">
                    {space}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-zinc-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          )}

          {/* Sort Dropdown */}
          <div className="relative">
            <select
              value={activeSort}
              onChange={(e) => setActiveSort(e.target.value as any)}
              className="appearance-none bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl pl-3 pr-8 py-1.5 text-xs text-zinc-300 focus:outline-none focus:border-white/20 font-medium cursor-pointer"
            >
              <option value="updated" className="bg-[#181922] text-zinc-200">
                Sort: Last Updated
              </option>
              <option value="created" className="bg-[#181922] text-zinc-200">
                Sort: Date Created
              </option>
              <option value="name" className="bg-[#181922] text-zinc-200">
                Sort: Title (A-Z)
              </option>
            </select>
            <ArrowUpDown className="w-3 h-3 text-zinc-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>

        {/* Right Side: Search Input */}
        <div className="relative w-full md:w-72">
          <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchFilter}
            onChange={(e) => setSearchFilter(e.target.value)}
            placeholder="Search docs by title, space, or tag..."
            className="bg-white/5 border border-white/10 rounded-xl pl-9 pr-8 py-1.5 text-xs text-white placeholder:text-zinc-500 focus:outline-none focus:border-white/25 w-full transition-all"
          />
          {searchFilter && (
            <button
              type="button"
              onClick={() => setSearchFilter('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 rounded text-zinc-400 hover:text-white"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>

      {/* BULK ACTION BAR (Floating when items selected) */}
      {selectedDocIds.length > 0 && (
        <div className="p-2.5 px-4 rounded-2xl bg-[#161722] border border-indigo-500/30 shadow-xl flex items-center justify-between gap-3 animate-fade-in">
          <div className="flex items-center gap-2 text-xs font-semibold text-zinc-200">
            <span className="w-5 h-5 rounded-full bg-indigo-500/20 text-indigo-400 flex items-center justify-center text-[11px] font-bold">
              {selectedDocIds.length}
            </span>
            <span>of {filteredDocs.length} documents selected</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleBulkStar}
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-semibold text-zinc-300 transition-colors cursor-pointer"
            >
              <Star className="w-3.5 h-3.5 text-amber-400" />
              <span>Star</span>
            </button>

            <button
              type="button"
              onClick={() => setIsBulkDeleting(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 text-rose-400 border border-rose-500/30 text-xs font-semibold transition-all cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Delete ({selectedDocIds.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setSelectedDocIds([])}
              className="p-1 rounded-lg text-zinc-400 hover:text-white transition-colors"
              title="Clear selection"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* VIEW 1: DATA TABLE VIEW */}
      {viewMode === 'table' && (
        <div className="border border-white/10 rounded-2xl overflow-hidden bg-[#111218] shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-white/10 bg-white/[0.02] text-zinc-400 font-medium">
                <tr>
                  <th className="py-3 px-4 w-10">
                    <input
                      ref={headerCheckboxRef}
                      type="checkbox"
                      checked={isAllSelected}
                      onChange={handleToggleSelectAll}
                      className="rounded accent-primary cursor-pointer w-3.5 h-3.5"
                      title={isAllSelected ? 'Deselect all' : 'Select all'}
                    />
                  </th>
                  <th className="py-3 px-4 font-semibold text-zinc-300">Name</th>
                  <th className="py-3 px-4 font-semibold text-zinc-300">Space</th>
                  <th className="py-3 px-4 font-semibold text-zinc-300">Tags</th>
                  <th className="py-3 px-4 font-semibold text-zinc-300">Author</th>
                  <th className="py-3 px-4 font-semibold text-zinc-300">Date updated</th>
                  <th className="py-3 px-4 font-semibold text-zinc-300">Date viewed</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filteredDocs.length > 0 || filteredProjectFiles.length > 0 ? (
                  <>
                    {/* 1. Regular Team Docs */}
                    {filteredDocs.map((doc) => {
                      const subCount = doc.subpages?.length || 0
                      const isSelected = selectedDocIds.includes(doc.id)

                      return (
                        <tr
                          key={doc.id}
                          onClick={() => handleOpenDoc(doc.id)}
                          className={`hover:bg-white/[0.04] transition-colors cursor-pointer group ${
                            isSelected ? 'bg-primary/5' : ''
                          }`}
                        >
                          <td className="py-3 px-4" onClick={(e) => handleToggleSelectDoc(doc.id, e)}>
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={(e) => handleToggleSelectDoc(doc.id, e)}
                              className="rounded accent-primary cursor-pointer w-3.5 h-3.5"
                            />
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2.5">
                              <span className="text-sky-400 text-sm">📄</span>
                              <span className="font-semibold text-white group-hover:text-primary transition-colors">
                                {doc.title}
                              </span>

                              {subCount > 0 && (
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-purple-500/15 border border-purple-500/30 text-purple-300 text-[10px] font-bold">
                                  <FilePlus className="w-2.5 h-2.5" />
                                  {subCount}
                                </span>
                              )}

                              {doc.isProtected && (
                                <span
                                  className="text-amber-400"
                                  title="Protected document"
                                >
                                  <Lock className="w-3 h-3" />
                                </span>
                              )}

                              {doc.isWiki && (
                                <span className="px-1.5 py-0.2 rounded bg-indigo-500/20 text-indigo-300 text-[9px] font-bold border border-indigo-500/30">
                                  WIKI
                                </span>
                              )}

                              {/* Quick Action Icons on Row Hover */}
                              <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1.5 ml-2 transition-opacity">
                                <button
                                  type="button"
                                  onClick={(e) => handleCopyLink(e, doc.id)}
                                  className="p-1 rounded hover:bg-white/10 text-zinc-400 hover:text-white"
                                  title="Copy link"
                                >
                                  <LinkIcon className="w-3 h-3" />
                                </button>
                                <button
                                  type="button"
                                  onClick={(e) => handleToggleStar(e, doc)}
                                  className={`p-1 rounded hover:bg-white/10 ${
                                    doc.starred
                                      ? 'text-amber-400'
                                      : 'text-zinc-400 hover:text-amber-400'
                                  }`}
                                  title={doc.starred ? 'Remove favorite' : 'Add favorite'}
                                >
                                  <Star
                                    className={`w-3 h-3 ${doc.starred ? 'fill-current' : ''}`}
                                  />
                                </button>
                                <button
                                  type="button"
                                  onClick={(e) => handleRequestDeleteDoc(e, doc.id, doc.title)}
                                  className="p-1 rounded hover:bg-rose-500/20 text-zinc-400 hover:text-rose-400"
                                  title="Delete document"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              </div>
                            </div>
                          </td>

                          <td className="py-3 px-4">
                            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-sky-500/10 border border-sky-500/20 text-sky-300 text-[11px] font-medium">
                              <Users className="w-3 h-3" />
                              <span>{doc.location || 'Team Space'}</span>
                            </span>
                          </td>

                          <td className="py-3 px-4">
                            {doc.tags && doc.tags.length > 0 ? (
                              <div className="flex flex-wrap gap-1">
                                {doc.tags.map((tag) => (
                                  <span
                                    key={tag}
                                    className="px-1.5 py-0.5 rounded bg-white/5 border border-white/5 text-[10px] text-zinc-400 font-medium"
                                  >
                                    #{tag}
                                  </span>
                                ))}
                              </div>
                            ) : (
                              <span className="text-zinc-600">—</span>
                            )}
                          </td>

                          <td className="py-3 px-4 text-zinc-400">
                            <div className="flex items-center gap-1.5">
                              <div className="w-4 h-4 rounded-full bg-emerald-600/30 text-emerald-400 font-bold text-[9px] flex items-center justify-center border border-emerald-500/30">
                                {(doc.authorName || 'A').charAt(0).toUpperCase()}
                              </div>
                              <span className="text-xs text-zinc-300">{doc.authorName || 'Team'}</span>
                            </div>
                          </td>

                          <td className="py-3 px-4 text-zinc-400 font-medium" suppressHydrationWarning>
                            {formatDocDate(doc.updatedAt)}
                          </td>

                          <td className="py-3 px-4 text-zinc-400 font-medium" suppressHydrationWarning>
                            {doc.viewedAt ? formatDocDate(doc.viewedAt) : 'Today'}
                          </td>
                        </tr>
                      )
                    })}

                    {/* 2. Project Documents (View-Only from Docs Screen, clearly tagged with Project origin) */}
                    {filteredProjectFiles.map((file) => (
                      <tr
                        key={file.id}
                        onClick={() =>
                          setActiveProjectFileToView({
                            name: file.name,
                            size: file.size,
                            type: file.type,
                            dataUrl: file.dataUrl,
                            uploadedAt: file.uploadedAt,
                            uploadedBy: file.uploadedBy,
                          })
                        }
                        className="hover:bg-white/[0.04] transition-colors cursor-pointer group bg-purple-500/[0.02]"
                      >
                        <td className="py-3 px-4" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            disabled
                            className="rounded opacity-25 cursor-not-allowed w-3.5 h-3.5"
                            title="Project documents are view-only on the Docs screen"
                          />
                        </td>

                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2.5">
                            <div className="w-6 h-6 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center shrink-0">
                              {renderFileIcon(file, 'w-3.5 h-3.5')}
                            </div>
                            <span className="font-semibold text-white group-hover:text-primary transition-colors truncate max-w-xs md:max-w-sm" title={file.name}>
                              {file.name}
                            </span>

                            {/* Project Origin Badge */}
                            <span
                              className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] font-bold border shrink-0"
                              style={{
                                backgroundColor: `${file.projectColor || '#6366F1'}15`,
                                borderColor: `${file.projectColor || '#6366F1'}35`,
                                color: file.projectColor || '#818CF8',
                              }}
                            >
                              <span
                                className="w-1.5 h-1.5 rounded-full shrink-0"
                                style={{ backgroundColor: file.projectColor || '#6366F1' }}
                              />
                              <span>Project: {file.projectName}</span>
                            </span>

                            {/* View-Only Badge */}
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded bg-zinc-800 border border-zinc-700/80 text-zinc-400 text-[9px] font-bold shrink-0">
                              <Eye className="w-2.5 h-2.5 text-sky-400" />
                              <span>VIEW ONLY</span>
                            </span>

                            {/* Actions on hover: Open / View and Download only (No edit or delete) */}
                            <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1.5 ml-2 transition-opacity">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  setActiveProjectFileToView({
                                    name: file.name,
                                    size: file.size,
                                    type: file.type,
                                    dataUrl: file.dataUrl,
                                    uploadedAt: file.uploadedAt,
                                    uploadedBy: file.uploadedBy,
                                  })
                                }}
                                className="p-1 rounded hover:bg-white/10 text-zinc-400 hover:text-white"
                                title="Open & view document contents"
                              >
                                <Eye className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  downloadFile(file.name, file.dataUrl)
                                  showToast(`Downloading "${file.name}"`)
                                }}
                                className="p-1 rounded hover:bg-white/10 text-zinc-400 hover:text-emerald-400"
                                title="Download file"
                              >
                                <Download className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        </td>

                        <td className="py-3 px-4">
                          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-purple-500/10 border border-purple-500/20 text-purple-300 text-[11px] font-medium">
                            <Folder className="w-3 h-3" />
                            <span>{file.taskTitle ? `Deliverable: ${file.taskTitle}` : 'Project Vault'}</span>
                          </span>
                        </td>

                        <td className="py-3 px-4">
                          <span className="px-1.5 py-0.5 rounded bg-white/5 border border-white/5 text-[10px] text-zinc-400 font-bold uppercase">
                            {file.name.split('.').pop() || 'FILE'}
                          </span>
                        </td>

                        <td className="py-3 px-4 text-zinc-400">
                          <div className="flex items-center gap-1.5">
                            <div className="w-4 h-4 rounded-full bg-purple-600/30 text-purple-400 font-bold text-[9px] flex items-center justify-center border border-purple-500/30">
                              {(file.uploadedBy || 'M').charAt(0).toUpperCase()}
                            </div>
                            <span className="text-xs text-zinc-300 truncate max-w-[120px]">
                              {file.uploadedBy || 'Team'}
                            </span>
                          </div>
                        </td>

                        <td className="py-3 px-4 text-zinc-400 font-medium" suppressHydrationWarning>
                          {formatDocDate(file.uploadedAt)}
                        </td>

                        <td className="py-3 px-4 text-zinc-400 font-medium">
                          {formatFileSize(file.size)}
                        </td>
                      </tr>
                    ))}
                  </>
                ) : (
                  <tr>
                    <td colSpan={7} className="py-16 text-center text-zinc-500 space-y-3">
                      <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mx-auto text-zinc-500">
                        <BookOpen className="w-6 h-6" />
                      </div>
                      <div className="space-y-1">
                        <p className="text-sm font-bold text-white">No documents found</p>
                        <p className="text-xs text-zinc-500 max-w-sm mx-auto">
                          {searchFilter
                            ? `No docs matched "${searchFilter}". Try another search or filter.`
                            : 'Start by creating your first technical document, specification, or meeting notes.'}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleCreateNewDoc()}
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white text-zinc-950 font-bold text-xs hover:bg-zinc-200 transition-colors shadow-md cursor-pointer mt-2"
                      >
                        <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                        <span>Create New Doc</span>
                      </button>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* VIEW 2: CARD GRID VIEW */}
      {viewMode === 'grid' && (
        <div>
          {filteredDocs.length > 0 || filteredProjectFiles.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredDocs.map((doc) => {
                const subCount = doc.subpages?.length || 0
                const isSelected = selectedDocIds.includes(doc.id)

                return (
                  <div
                    key={doc.id}
                    onClick={() => handleOpenDoc(doc.id)}
                    className={`p-5 rounded-2xl bg-[#12131b] hover:bg-[#161722] border transition-all cursor-pointer group flex flex-col justify-between space-y-4 shadow-lg ${
                      isSelected
                        ? 'border-primary/50 shadow-primary/10'
                        : 'border-white/10 hover:border-white/20'
                    }`}
                  >
                    {/* Card Header */}
                    <div className="space-y-2">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span className="text-xl">📄</span>
                          <h3 className="text-sm font-bold text-white group-hover:text-primary transition-colors truncate">
                            {doc.title}
                          </h3>
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={(e) => handleToggleStar(e, doc)}
                            className={`p-1 rounded-lg hover:bg-white/10 transition-colors ${
                              doc.starred
                                ? 'text-amber-400'
                                : 'text-zinc-500 hover:text-amber-400'
                            }`}
                            title="Favorite"
                          >
                            <Star
                              className={`w-3.5 h-3.5 ${doc.starred ? 'fill-current' : ''}`}
                            />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => handleRequestDeleteDoc(e, doc.id, doc.title)}
                            className="p-1 rounded-lg hover:bg-rose-500/20 text-zinc-500 hover:text-rose-400 transition-colors"
                            title="Delete"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Content Excerpt Preview */}
                      <p className="text-xs text-zinc-400 leading-relaxed line-clamp-2">
                        {cleanPreviewText(doc.content)}
                      </p>
                    </div>

                    {/* Card Space & Tags */}
                    <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-white/5">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-sky-500/10 border border-sky-500/20 text-sky-300 text-[10px] font-medium">
                        <Users className="w-2.5 h-2.5" />
                        <span>{doc.location || 'Team Space'}</span>
                      </span>

                      {subCount > 0 && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-purple-500/15 border border-purple-500/30 text-purple-300 text-[10px] font-bold">
                          <FilePlus className="w-2.5 h-2.5" />
                          <span>{subCount} subpages</span>
                        </span>
                      )}

                      {doc.tags?.slice(0, 2).map((t) => (
                        <span
                          key={t}
                          className="px-2 py-0.5 rounded-lg bg-white/5 text-[10px] text-zinc-400 font-medium"
                        >
                          #{t}
                        </span>
                      ))}
                    </div>

                    {/* Card Footer */}
                    <div className="flex items-center justify-between text-[11px] text-zinc-500 pt-1">
                      <div className="flex items-center gap-1.5">
                        <div className="w-4 h-4 rounded-full bg-emerald-600/30 text-emerald-400 font-bold text-[9px] flex items-center justify-center border border-emerald-500/30">
                          {(doc.authorName || 'A').charAt(0).toUpperCase()}
                        </div>
                        <span className="text-zinc-300">{doc.authorName || 'Team'}</span>
                      </div>
                      <span suppressHydrationWarning>{formatDocDate(doc.updatedAt)}</span>
                    </div>
                  </div>
                )
              })}

              {/* Project Documents (View-Only with Project Badges) */}
              {filteredProjectFiles.map((file) => (
                <div
                  key={file.id}
                  onClick={() =>
                    setActiveProjectFileToView({
                      name: file.name,
                      size: file.size,
                      type: file.type,
                      dataUrl: file.dataUrl,
                      uploadedAt: file.uploadedAt,
                      uploadedBy: file.uploadedBy,
                    })
                  }
                  className="p-5 rounded-2xl bg-[#12131b] hover:bg-[#161722] border border-white/10 hover:border-primary/40 transition-all cursor-pointer group flex flex-col justify-between space-y-4 shadow-lg"
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-8 h-8 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center shrink-0">
                          {renderFileIcon(file, 'w-4 h-4')}
                        </div>
                        <div className="min-w-0">
                          <h3 className="text-sm font-bold text-white group-hover:text-primary transition-colors truncate" title={file.name}>
                            {file.name}
                          </h3>
                          <span className="text-[10px] text-zinc-400 font-medium">
                            {formatFileSize(file.size)}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            setActiveProjectFileToView({
                              name: file.name,
                              size: file.size,
                              type: file.type,
                              dataUrl: file.dataUrl,
                              uploadedAt: file.uploadedAt,
                              uploadedBy: file.uploadedBy,
                            })
                          }}
                          className="p-1 rounded-lg hover:bg-white/10 text-zinc-400 hover:text-white transition-colors"
                          title="Open & view document"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            downloadFile(file.name, file.dataUrl)
                            showToast(`Downloading "${file.name}"`)
                          }}
                          className="p-1 rounded-lg hover:bg-white/10 text-zinc-400 hover:text-emerald-400 transition-colors"
                          title="Download document"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Project Origin & View Only Badges */}
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold border"
                        style={{
                          backgroundColor: `${file.projectColor || '#6366F1'}15`,
                          borderColor: `${file.projectColor || '#6366F1'}35`,
                          color: file.projectColor || '#818CF8',
                        }}
                      >
                        <span
                          className="w-2 h-2 rounded-full shrink-0"
                          style={{ backgroundColor: file.projectColor || '#6366F1' }}
                        />
                        <span>Project: {file.projectName}</span>
                      </span>

                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-zinc-800 border border-zinc-700 text-zinc-400 text-[10px] font-bold">
                        <Eye className="w-2.5 h-2.5 text-sky-400" /> View Only
                      </span>
                    </div>

                    {/* Origin / Deliverable Info */}
                    <div className="text-[11px] text-zinc-400 truncate">
                      {file.taskTitle ? (
                        <span>From Deliverable: <b className="text-zinc-200">{file.taskTitle}</b></span>
                      ) : (
                        <span>Project Vault Document</span>
                      )}
                    </div>
                  </div>

                  <div className="pt-3 border-t border-white/5 flex items-center justify-between text-[11px] text-zinc-500">
                    <span>By {file.uploadedBy || 'Team'}</span>
                    <span suppressHydrationWarning>{formatDocDate(file.uploadedAt)}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-16 text-center text-zinc-500 space-y-3 border border-white/10 rounded-2xl bg-[#111218]">
              <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mx-auto text-zinc-500">
                <BookOpen className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-bold text-white">No documents found</p>
                <p className="text-xs text-zinc-500 max-w-sm mx-auto">
                  {searchFilter
                    ? `No docs matched "${searchFilter}". Try another search or filter.`
                    : 'Start by creating your first technical document, specification, or meeting notes.'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => handleCreateNewDoc()}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white text-zinc-950 font-bold text-xs hover:bg-zinc-200 transition-colors shadow-md cursor-pointer mt-2"
              >
                <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                <span>Create New Doc</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* SINGLE DOC DELETE CONFIRMATION MODAL */}
      {docToDelete && (
        <div
          className="fixed inset-0 z-[220] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in"
          onClick={() => setDocToDelete(null)}
        >
          <div
            className="bg-[#181920] border border-white/15 rounded-3xl p-6 w-full max-w-md shadow-2xl space-y-4 animate-scale-in select-none"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-rose-500/15 text-rose-400 flex items-center justify-center shrink-0 border border-rose-500/30">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Delete Document</h3>
                <p className="text-xs text-zinc-400">Confirmation & Permission</p>
              </div>
            </div>

            <p className="text-xs text-zinc-300 leading-relaxed">
              Are you sure you want to delete <strong className="text-white">"{docToDelete.title}"</strong>? This will permanently remove the document from your workspace and database. This action cannot be undone.
            </p>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-white/10">
              <button
                type="button"
                onClick={() => setDocToDelete(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-zinc-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteDoc}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition-all shadow-md shadow-rose-600/30 cursor-pointer flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete Document</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* BULK DELETE CONFIRMATION MODAL */}
      {isBulkDeleting && (
        <div
          className="fixed inset-0 z-[220] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in"
          onClick={() => setIsBulkDeleting(false)}
        >
          <div
            className="bg-[#181920] border border-white/15 rounded-3xl p-6 w-full max-w-md shadow-2xl space-y-4 animate-scale-in select-none"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-rose-500/15 text-rose-400 flex items-center justify-center shrink-0 border border-rose-500/30">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Delete Selected Documents</h3>
                <p className="text-xs text-zinc-400">{selectedDocIds.length} items selected</p>
              </div>
            </div>

            <p className="text-xs text-zinc-300 leading-relaxed">
              Are you sure you want to delete <strong className="text-white">{selectedDocIds.length} document{selectedDocIds.length > 1 ? 's' : ''}</strong>? This will permanently remove them from your workspace and database. This action cannot be undone.
            </p>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-white/10">
              <button
                type="button"
                onClick={() => setIsBulkDeleting(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-zinc-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmBulkDelete}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition-all shadow-md shadow-rose-600/30 cursor-pointer flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete All Selected</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* FULL DOCUMENT VIEWER / MODAL */}
      {isViewerOpen && selectedDocId && (
        <DocViewerModal
          isOpen={isViewerOpen}
          docId={selectedDocId}
          onClose={() => {
            setIsViewerOpen(false)
            setSelectedDocId(null)
          }}
        />
      )}

      {/* UNIVERSAL FILE VIEWER MODAL FOR PROJECT DOCUMENTS */}
      <FileViewerModal
        isOpen={Boolean(activeProjectFileToView)}
        file={activeProjectFileToView}
        onClose={() => setActiveProjectFileToView(null)}
      />
    </div>
  )
}
