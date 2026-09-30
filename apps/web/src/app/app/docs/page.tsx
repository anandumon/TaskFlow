'use client'

import React, { useState, useEffect } from 'react'
import {
  FileText,
  Plus,
  Search,
  Sparkles,
  SlidersHorizontal,
  ArrowUpDown,
  Mic,
  Video,
  Upload,
  ChevronDown,
  Trash2,
  Star,
  Link as LinkIcon,
  Users,
  FolderKanban,
  Check,
  Calendar,
  FilePlus,
} from 'lucide-react'
import { useDocStore, DocItem } from '@/stores/doc-store'
import { useAuthStore } from '@/stores/auth-store'
import { DocViewerModal } from '@/features/docs/components/DocViewerModal'

export default function DocsPage() {
  const { docs, loadDocs, createDoc, deleteDoc, updateDoc } = useDocStore()
  const { user } = useAuthStore()

  const [promptQuery, setPromptQuery] = useState('')
  const [searchFilter, setSearchFilter] = useState('')
  const [selectedDocId, setSelectedDocId] = useState<string | null>(null)
  const [isViewerOpen, setIsViewerOpen] = useState(false)
  const [activeSort, setActiveSort] = useState<'updated' | 'name'>('updated')
  const [toastMessage, setToastMessage] = useState<string | null>(null)

  useEffect(() => {
    loadDocs()
  }, [loadDocs])

  const showToast = (msg: string) => {
    setToastMessage(msg)
    setTimeout(() => setToastMessage(null), 3000)
  }

  const handleCreatePromptDoc = (customTitle?: string, customContent?: string) => {
    const titleToUse = customTitle || promptQuery.trim() || 'Untitled Doc'
    const author = user?.displayName || user?.firstName || 'anandu'
    const newDoc = createDoc(titleToUse, customContent || '', author, 'Team Space')
    setPromptQuery('')
    setSelectedDocId(newDoc.id)
    setIsViewerOpen(true)
    showToast(`Created document "${titleToUse}"`)
  }

  const handleOpenDoc = (docId: string) => {
    setSelectedDocId(docId)
    setIsViewerOpen(true)
  }

  const handleDeleteDoc = (e: React.MouseEvent, docId: string, docTitle: string) => {
    e.stopPropagation()
    deleteDoc(docId)
    showToast(`Deleted "${docTitle}"`)
  }

  const handleToggleStar = (e: React.MouseEvent, doc: DocItem) => {
    e.stopPropagation()
    updateDoc(doc.id, { starred: !doc.starred })
  }

  const handleCopyLink = (e: React.MouseEvent, docId: string) => {
    e.stopPropagation()
    if (typeof window !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(`${window.location.origin}/app/docs/${docId}`)
      showToast('Document link copied to clipboard')
    }
  }

  // Filter docs based on search
  const filteredDocs = docs
    .filter((d) => d.title.toLowerCase().includes(searchFilter.toLowerCase()))
    .sort((a, b) => {
      if (activeSort === 'name') return a.title.localeCompare(b.title)
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    })

  const templates = [
    {
      title: 'Project Brief',
      desc: 'Clarify goals and scope',
      content: `# Project Brief\n\n## 1. Executive Summary\nDefine project objectives, measurable success metrics, and stakeholders.\n\n## 2. Target Audience\nUser personas and core workflow benefits.\n\n## 3. Timeline & Key Milestones\nMilestone phases with target deployment dates.\n`,
    },
    {
      title: 'Workflow Guide',
      desc: 'Document how work flows',
      content: `# Workflow Guide\n\n## Sprint Cadence\n- Planning & grooming every 2 weeks\n- Daily standups & blocker resolution\n- Code reviews and QA approvals\n\n## Git Workflow\nBranching strategies and continuous deployment checklist.\n`,
    },
    {
      title: 'Decision Log',
      desc: 'Keep key choices visible',
      content: `# Decision Log (ADR)\n\n## Decision 001: Architecture Modernisation\n- **Context**: Need real-time sync and low latency\n- **Decision**: Implemented optimistic updates with Zustand and cached resource tree\n- **Consequences**: Instant UI transitions and robust network resilience\n`,
    },
    {
      title: 'Task Standards',
      desc: 'Set clear task expectations',
      content: `# Task Standards\n\n## Definition of Done\n- [ ] Unit & end-to-end tests passing\n- [ ] Accessibility standards verified\n- [ ] Documentation updated\n- [ ] Deployed to staging and verified\n`,
    },
  ]

  const formatDocDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr)
      const now = new Date()
      const isToday = date.toDateString() === now.toDateString()
      if (isToday) {
        return `Today at ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
      }
      const yesterday = new Date()
      yesterday.setDate(now.getDate() - 1)
      if (date.toDateString() === yesterday.toDateString()) {
        return 'Yesterday'
      }
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' })
    } catch {
      return 'Recently'
    }
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

      {/* TOP HEADER (Matching Screenshot 4) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-white/5">
        <div>
          <h1 className="text-xl font-extrabold text-white tracking-tight">All Docs</h1>
        </div>

        {/* Center Search / Action Tools */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-white/5 border border-white/10 text-xs text-zinc-400">
            <Search className="w-3.5 h-3.5 text-zinc-500" />
            <span className="text-zinc-500">Ask, Build</span>
            <Sparkles className="w-3 h-3 text-purple-400" />
          </div>

          <div className="flex items-center gap-1.5 text-zinc-400">
            <button
              type="button"
              className="p-1.5 rounded-lg hover:bg-white/10 hover:text-white transition-colors"
              title="Video meeting"
            >
              <Video className="w-4 h-4" />
            </button>
            <button
              type="button"
              className="p-1.5 rounded-lg hover:bg-white/10 hover:text-white transition-colors"
              title="Voice note"
            >
              <Mic className="w-4 h-4" />
            </button>
            <div className="w-6 h-6 rounded-full bg-emerald-600/30 text-emerald-400 font-bold text-xs flex items-center justify-center border border-emerald-500/30 ml-1">
              {(user?.displayName || user?.firstName || 'A').charAt(0).toUpperCase()}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => showToast('Importing files...')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-semibold text-zinc-300 border border-white/10 transition-colors cursor-pointer"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Import</span>
            </button>

            <button
              type="button"
              onClick={() => handleCreatePromptDoc()}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-white text-zinc-900 hover:bg-zinc-200 text-xs font-bold transition-all shadow-md cursor-pointer"
            >
              <span>New Doc</span>
              <ChevronDown className="w-3.5 h-3.5 text-zinc-600" />
            </button>
          </div>
        </div>
      </div>

      {/* HERO AI PROMPT CREATION BANNER (Matching Screenshot 4) */}
      <div className="relative rounded-3xl p-[1.5px] bg-gradient-to-r from-sky-500/40 via-purple-500/40 to-amber-500/40 shadow-2xl">
        <div className="rounded-[22px] bg-[#14151e] p-4 sm:p-5 flex flex-col justify-between min-h-[110px] gap-3">
          <input
            type="text"
            value={promptQuery}
            onChange={(e) => setPromptQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleCreatePromptDoc()
            }}
            placeholder="Describe what you want to create..."
            className="w-full bg-transparent text-sm sm:text-base text-white placeholder:text-zinc-500 focus:outline-none font-medium"
          />

          <div className="flex items-center justify-between pt-1">
            <button
              type="button"
              onClick={() => handleCreatePromptDoc()}
              className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-all cursor-pointer shadow-xs"
              title="Create document"
            >
              <Plus className="w-4 h-4" />
            </button>

            <button
              type="button"
              className="p-1.5 rounded-full text-zinc-400 hover:text-white hover:bg-white/10 transition-colors"
              title="Voice prompt"
            >
              <Mic className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* QUICK START TEMPLATE CARDS (Matching Screenshot 4) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {templates.map((tmpl) => (
          <div
            key={tmpl.title}
            onClick={() => handleCreatePromptDoc(tmpl.title, tmpl.content)}
            className="p-4 rounded-2xl bg-[#14151f] hover:bg-[#1a1b27] border border-white/5 hover:border-white/15 transition-all cursor-pointer group shadow-sm"
          >
            <h3 className="text-xs font-bold text-white group-hover:text-primary transition-colors">
              {tmpl.title}
            </h3>
            <p className="text-[11px] text-zinc-500 mt-1 leading-snug">{tmpl.desc}</p>
          </div>
        ))}
      </div>

      {/* FILTER & SEARCH BAR (Matching Screenshot 4) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-medium text-zinc-300 border border-white/5 transition-colors cursor-pointer"
          >
            <SlidersHorizontal className="w-3.5 h-3.5 text-zinc-400" />
            <span>Filters</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSort((prev) => (prev === 'updated' ? 'name' : 'updated'))}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-medium text-zinc-300 border border-white/5 transition-colors cursor-pointer"
          >
            <ArrowUpDown className="w-3.5 h-3.5 text-zinc-400" />
            <span>Sort: {activeSort === 'updated' ? 'Date' : 'Name'}</span>
          </button>

          <span className="text-xs text-zinc-500 font-medium ml-1">Tags:</span>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchFilter}
            onChange={(e) => setSearchFilter(e.target.value)}
            placeholder="Search"
            className="bg-white/5 border border-white/10 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder:text-zinc-500 focus:outline-none focus:border-white/20 w-full sm:w-56"
          />
        </div>
      </div>

      {/* DATA TABLE: ONLY CREATED DOCS (Matching Screenshot 4) */}
      <div className="border border-white/10 rounded-2xl overflow-hidden bg-[#111218] shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-white/10 bg-white/[0.02] text-zinc-400 font-medium">
              <tr>
                <th className="py-3 px-4 w-10">
                  <input type="checkbox" className="rounded accent-primary cursor-pointer w-3.5 h-3.5" />
                </th>
                <th className="py-3 px-4 font-semibold text-zinc-300">Name</th>
                <th className="py-3 px-4 font-semibold text-zinc-300">Location</th>
                <th className="py-3 px-4 font-semibold text-zinc-300">Tags</th>
                <th className="py-3 px-4 font-semibold text-zinc-300">Date updated</th>
                <th className="py-3 px-4 font-semibold text-zinc-300">Date viewed</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filteredDocs.length > 0 ? (
                filteredDocs.map((doc) => {
                  const subCount = doc.subpages?.length || 0
                  return (
                    <tr
                      key={doc.id}
                      onClick={() => handleOpenDoc(doc.id)}
                      className="hover:bg-white/[0.04] transition-colors cursor-pointer group"
                    >
                      <td className="py-3 px-4" onClick={(e) => e.stopPropagation()}>
                        <input type="checkbox" className="rounded accent-primary cursor-pointer w-3.5 h-3.5" />
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
                                doc.starred ? 'text-amber-400' : 'text-zinc-400 hover:text-amber-400'
                              }`}
                              title="Star"
                            >
                              <Star className="w-3 h-3 fill-current" />
                            </button>
                            <button
                              type="button"
                              onClick={(e) => handleDeleteDoc(e, doc.id, doc.title)}
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

                      <td className="py-3 px-4 text-zinc-500">
                        {doc.tags && doc.tags.length > 0 ? doc.tags.join(', ') : '—'}
                      </td>

                      <td className="py-3 px-4 text-zinc-400 font-medium">
                        {formatDocDate(doc.updatedAt)}
                      </td>

                      <td className="py-3 px-4 text-zinc-400 font-medium">
                        {doc.viewedAt ? formatDocDate(doc.viewedAt) : '12:02 pm'}
                      </td>
                    </tr>
                  )
                })
              ) : (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-zinc-500 space-y-2">
                    <FileText className="w-8 h-8 text-zinc-600 mx-auto opacity-50" />
                    <p className="text-xs font-semibold text-zinc-400">No created documents found</p>
                    <p className="text-[11px] text-zinc-600 max-w-sm mx-auto">
                      Describe what you want to create in the box above or choose a quick start template to create your first document.
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

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
    </div>
  )
}
