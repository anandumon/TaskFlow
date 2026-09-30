'use client'

import React, { useState, useEffect, useRef } from 'react'
import {
  FileText,
  Star,
  Plus,
  Search,
  Sparkles,
  Link as LinkIcon,
  Share2,
  MoreHorizontal,
  X,
  Trash2,
  Check,
  Loader2,
  Table as TableIcon,
  Columns3,
  CheckSquare,
  FilePlus,
  BookOpen,
  Edit3,
  Brain,
  Copy,
  FolderKanban,
  PanelLeftClose,
  PanelLeft,
  Settings,
  ChevronRight,
  Shield,
  Globe,
  Sliders,
  Calendar,
  Layers,
  ListTodo,
  ExternalLink,
  ChevronDown,
  Lock,
} from 'lucide-react'
import { useDocStore, DocItem, SubPageItem } from '@/stores/doc-store'
import { useAuthStore } from '@/stores/auth-store'
import { useWorkspaceStore } from '@/stores/workspace-store'
import { useTaskStore } from '@/stores/task-store'

interface DocViewerModalProps {
  isOpen: boolean
  docId: string
  docTitle?: string
  onClose: () => void
}

export function DocViewerModal({
  isOpen,
  docId,
  docTitle,
  onClose,
}: DocViewerModalProps) {
  const {
    docs,
    getDoc,
    createDoc,
    updateDoc,
    deleteDoc,
    createSubpage,
    updateSubpage,
    deleteSubpage,
    loadDocs,
  } = useDocStore()
  const { user } = useAuthStore()
  const { currentWorkspace } = useWorkspaceStore()
  const { tasks } = useTaskStore()

  const [currentDoc, setCurrentDoc] = useState<DocItem | null>(null)
  const [activeSubpageId, setActiveSubpageId] = useState<string | null>(null)
  const [title, setTitle] = useState(docTitle || 'demo')
  const [content, setContent] = useState('')
  const [isEditingTitle, setIsEditingTitle] = useState(false)
  const [autoSaveStatus, setAutoSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle')

  // UI Panels state (matching Screenshot 5)
  const [isSidebarOpen, setIsSidebarOpen] = useState(true)
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [settingsTab, setSettingsTab] = useState<'entire' | 'page'>('entire')
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false)
  const [toastMessage, setToastMessage] = useState<string | null>(null)

  // Interactive Feature Modals (matching Screenshot 5)
  const [showColumnsPopover, setShowColumnsPopover] = useState(false)
  const [showClickUpListModal, setShowClickUpListModal] = useState(false)
  const [showSlashMenu, setShowSlashMenu] = useState(false)
  const [clickUpTab, setClickUpTab] = useState<'search' | 'browse'>('search')
  const [clickUpSearchQuery, setClickUpSearchQuery] = useState('')

  // Toggles inside settings drawer
  const [isProtected, setIsProtected] = useState(false)
  const [isPublic, setIsPublic] = useState(false)
  const [isWiki, setIsWiki] = useState(false)

  const isDeletingRef = useRef(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const showToast = (msg: string) => {
    setToastMessage(msg)
    setTimeout(() => setToastMessage(null), 3000)
  }

  // Load docs on mount
  useEffect(() => {
    loadDocs()
  }, [loadDocs])

  // Resolve or initialize document
  useEffect(() => {
    if (!isOpen || isDeletingRef.current) return

    let doc = getDoc(docId)
    if (!doc && docTitle) {
      const cleanTitle = (docTitle || '').trim().toLowerCase()
      const found = (docs || []).find(
        (d) => d && (d.id === docId || (typeof d.title === 'string' && d.title.trim().toLowerCase() === cleanTitle))
      )
      if (found) {
        doc = found
      } else {
        const author = user?.displayName || user?.firstName || 'anandu'
        doc = createDoc(docTitle, '', author, 'Team Space', { docId })
      }
    } else if (!doc && !docTitle) {
      const found = (docs || []).find((d) => d && d.id === docId)
      if (found) {
        doc = found
      }
    }

    if (doc) {
      setCurrentDoc(doc)
      setIsProtected(!!doc.isProtected)
      setIsPublic(!!doc.isPublic)
      setIsWiki(!!doc.isWiki)

      if (activeSubpageId && doc.subpages) {
        const sub = doc.subpages.find((s) => s.id === activeSubpageId)
        if (sub) {
          setTitle(sub.title)
          setContent(sub.content || '')
          return
        }
      }

      setTitle(doc.title)
      setContent(doc.content || '')
    }
  }, [isOpen, docId, docTitle, docs, getDoc, createDoc, user, activeSubpageId])

  // Auto-save debounced effect on title or content change
  useEffect(() => {
    if (!currentDoc || isDeletingRef.current) return

    setAutoSaveStatus('saving')
    const timer = setTimeout(() => {
      if (activeSubpageId) {
        updateSubpage(currentDoc.id, activeSubpageId, {
          title: title.trim() || 'Untitled Page',
          content,
        })
      } else {
        updateDoc(currentDoc.id, {
          title: title.trim() || 'Untitled Doc',
          content,
          isProtected,
          isPublic,
          isWiki,
        })
      }
      setAutoSaveStatus('saved')
      setTimeout(() => setAutoSaveStatus('idle'), 2000)
    }, 500)

    return () => clearTimeout(timer)
  }, [title, content, isProtected, isPublic, isWiki, activeSubpageId, currentDoc, updateDoc, updateSubpage])

  if (!isOpen) return null

  const handleStartWriting = () => {
    textareaRef.current?.focus()
  }

  // Insert rich interactive blocks
  const handleInsertColumns = (numCols: number) => {
    setShowColumnsPopover(false)
    let colsMarkdown = `\n\n:::columns-${numCols}\n`
    for (let i = 1; i <= numCols; i++) {
      colsMarkdown += `### Column ${i}\nEnter notes and specifications for column ${i}...\n\n`
    }
    colsMarkdown += `:::\n`
    setContent((prev) => (prev ? prev + colsMarkdown : colsMarkdown.trimStart()))
    showToast(`Inserted ${numCols} columns layout`)
    setTimeout(() => textareaRef.current?.focus(), 50)
  }

  const handleInsertClickUpList = (listTitle: string) => {
    setShowClickUpListModal(false)
    const listBlock = `\n\n:::clickup-list\n### 📋 ${listTitle}\n- [ ] Task 1: Initialize component architecture | Anandu | IN_PROGRESS | High\n- [ ] Task 2: Validate API contract and response schema | Team | TODO | Medium\n- [x] Task 3: Design review and accessibility audit | Anandu | DONE | High\n:::\n`
    setContent((prev) => (prev ? prev + listBlock : listBlock.trimStart()))
    showToast(`Embedded "${listTitle}" task list`)
    setTimeout(() => textareaRef.current?.focus(), 50)
  }

  const handleInsertTable = () => {
    const tableSnippet = `\n\n| Item | Owner | Status | Priority |\n|---|---|---|---|\n| API Integration | Anandu | In Progress | High |\n| Design System Polish | Team | Done | Medium |\n| Testing & QA | Anandu | In Progress | High |\n`
    setContent((prev) => (prev ? prev + tableSnippet : tableSnippet.trimStart()))
    showToast('Added editable Table')
    setTimeout(() => textareaRef.current?.focus(), 50)
  }

  const handleCreateSubpage = () => {
    if (!currentDoc) return
    const newSub = createSubpage(currentDoc.id, 'Untitled', '')
    setActiveSubpageId(newSub.id)
    setTitle(newSub.title)
    setContent(newSub.content)
    showToast('Created new subpage')
    setTimeout(() => textareaRef.current?.focus(), 50)
  }

  const handleDelete = () => {
    if (!currentDoc) return
    isDeletingRef.current = true
    if (activeSubpageId) {
      deleteSubpage(currentDoc.id, activeSubpageId)
      setActiveSubpageId(null)
      setTitle(currentDoc.title)
      setContent(currentDoc.content)
      setIsConfirmingDelete(false)
      showToast('Subpage deleted')
    } else {
      deleteDoc(currentDoc.id, currentWorkspace?.id)
      setIsConfirmingDelete(false)
      showToast(`Document "${title}" deleted successfully`)
      setTimeout(() => {
        onClose()
      }, 200)
    }
  }

  const activeSubpages = currentDoc?.subpages || []

  return (
    <div className="fixed inset-0 z-[120] flex flex-col bg-[#0b0c10] text-[#e1e4ea] animate-fade-in select-none">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-[250] px-4 py-2 rounded-2xl bg-zinc-800 text-white text-xs font-semibold shadow-2xl border border-zinc-700/80 flex items-center gap-2 animate-slide-down">
          <Check className="w-3.5 h-3.5 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* TOP HEADER BAR (Matching Screenshot 5) */}
      <div className="h-12 border-b border-white/10 px-4 flex items-center justify-between shrink-0 bg-[#0e0f14] select-none">
        {/* Left: Sidebar toggle, Breadcrumbs */}
        <div className="flex items-center gap-3 min-w-0">
          <button
            type="button"
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 transition-colors"
            title={isSidebarOpen ? 'Hide doc pages' : 'Show doc pages'}
          >
            {isSidebarOpen ? <PanelLeftClose className="w-4 h-4" /> : <PanelLeft className="w-4 h-4" />}
          </button>

          <div className="flex items-center gap-2 text-xs font-medium text-zinc-400">
            <span className="hover:text-white transition-colors cursor-pointer" onClick={onClose}>
              Docs
            </span>
            <span>/</span>
            <div className="flex items-center gap-1.5 text-white font-semibold truncate">
              <span className="text-sky-400">📄</span>
              <span className="truncate max-w-[200px]">{currentDoc?.title || title || 'demo'}</span>
              {activeSubpageId && (
                <>
                  <span className="text-zinc-600">/</span>
                  <span className="text-purple-300 truncate max-w-[150px]">{title}</span>
                </>
              )}
              <button
                type="button"
                onClick={() => {
                  if (currentDoc) {
                    updateDoc(currentDoc.id, { starred: !currentDoc.starred })
                  }
                }}
                className={`p-0.5 rounded hover:bg-white/10 transition-colors ${
                  currentDoc?.starred ? 'text-amber-400' : 'text-zinc-500 hover:text-amber-400'
                }`}
                title="Star doc"
              >
                <Star className="w-3.5 h-3.5 fill-current" />
              </button>
            </div>
          </div>

          <button
            type="button"
            onClick={handleCreateSubpage}
            className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-zinc-400 hover:text-white hover:bg-white/5 text-xs font-medium transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add page</span>
          </button>
        </div>

        {/* Center: Search & Imagine */}
        <div className="hidden md:flex items-center gap-2">
          <div
            onClick={() => setShowSlashMenu(true)}
            className="flex items-center gap-2 px-3 py-1 rounded-xl bg-white/5 border border-white/10 text-xs text-zinc-400 hover:border-white/20 transition-all cursor-pointer"
          >
            <Search className="w-3.5 h-3.5 text-zinc-500" />
            <span>Search</span>
            <kbd className="px-1.5 py-0.5 rounded bg-white/10 text-[10px] font-mono text-zinc-400">Ctrl K</kbd>
          </div>
          <button
            type="button"
            onClick={() => {
              const aiSnippet = `\n\n### 🤖 AI Summary & Action Plan\n- Analyzed current workspace architecture\n- Generated optimized execution roadmap\n- Aligned deliverables with sprint calendar\n`
              setContent((prev) => (prev ? prev + aiSnippet : aiSnippet.trimStart()))
              showToast('Generated AI insights')
            }}
            className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 border border-purple-500/20 text-xs font-medium transition-all"
          >
            <Sparkles className="w-3.5 h-3.5 text-purple-400 animate-pulse" />
            <span>Imagine</span>
          </button>
        </div>

        {/* Right: Actions, Settings drawer toggle, Close */}
        <div className="flex items-center gap-1.5">
          {autoSaveStatus === 'saving' && (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[10px] font-medium animate-pulse">
              <Loader2 className="w-2.5 h-2.5 animate-spin" /> Saving...
            </span>
          )}
          {autoSaveStatus === 'saved' && (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-medium">
              <Check className="w-2.5 h-2.5" /> Saved
            </span>
          )}

          <button
            type="button"
            onClick={() => {
              if (currentDoc) {
                if (activeSubpageId) {
                  updateSubpage(currentDoc.id, activeSubpageId, {
                    title: title.trim() || 'Untitled Page',
                    content,
                  })
                } else {
                  updateDoc(currentDoc.id, {
                    title: title.trim() || 'Untitled Doc',
                    content,
                  })
                }
                setAutoSaveStatus('saved')
                showToast(`Saved "${title}" to Docs`)
              }
            }}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all shadow-xs cursor-pointer"
            title="Save changes to TaskFlow Docs"
          >
            <Check className="w-3.5 h-3.5" />
            <span>Save to Docs</span>
          </button>

          <button
            type="button"
            onClick={() => {
              if (navigator.clipboard) {
                navigator.clipboard.writeText(window.location.href)
                showToast('Doc link copied to clipboard!')
              }
            }}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-zinc-300 hover:text-white hover:bg-white/10 text-xs font-medium transition-colors"
          >
            <Share2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Share</span>
          </button>

          {/* Settings button opens Settings Flyout Drawer (Screenshot 5 bottom-right) */}
          <button
            type="button"
            onClick={() => setIsSettingsOpen(!isSettingsOpen)}
            className={`p-1.5 rounded-lg transition-colors ${
              isSettingsOpen ? 'bg-primary/20 text-primary' : 'text-zinc-400 hover:text-white hover:bg-white/10'
            }`}
            title="Doc settings"
          >
            <MoreHorizontal className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 transition-colors ml-1"
            title="Close document"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* BODY AREA (With Left Subpage Sidebar & Right Settings Drawer) */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* SUBPAGE LEFT SIDEBAR (Screenshot 5 Bottom-Left) */}
        {isSidebarOpen && (
          <aside className="w-56 border-r border-white/10 bg-[#0f1016] flex flex-col shrink-0 select-none animate-slide-right">
            <div className="p-3 border-b border-white/5 flex items-center justify-between">
              <span className="text-xs font-bold text-zinc-300 truncate max-w-[140px]">
                {currentDoc?.title || 'demo'}
              </span>
            </div>

            <div className="flex-1 overflow-y-auto p-2 space-y-1">
              <div className="px-2 py-1 text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Pages</div>

              {/* Main doc root item */}
              <button
                type="button"
                onClick={() => {
                  if (currentDoc) {
                    setActiveSubpageId(null)
                    setTitle(currentDoc.title)
                    setContent(currentDoc.content)
                  }
                }}
                className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-xl text-xs font-medium transition-all text-left ${
                  activeSubpageId === null
                    ? 'bg-primary/15 text-white font-semibold border border-primary/20'
                    : 'text-zinc-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <FileText className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                <span className="truncate">{currentDoc?.title || 'demo'}</span>
              </button>

              {/* Subpages nested */}
              {activeSubpages.map((sub) => (
                <div key={sub.id} className="pl-3 group flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => {
                      setActiveSubpageId(sub.id)
                      setTitle(sub.title)
                      setContent(sub.content)
                    }}
                    className={`flex-1 flex items-center gap-2 px-2.5 py-1.5 rounded-xl text-xs font-medium transition-all text-left ${
                      activeSubpageId === sub.id
                        ? 'bg-purple-500/20 text-purple-200 font-semibold border border-purple-500/30'
                        : 'text-zinc-400 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    <FilePlus className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                    <span className="truncate">{sub.title}</span>
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      if (currentDoc) deleteSubpage(currentDoc.id, sub.id)
                    }}
                    className="p-1 rounded opacity-0 group-hover:opacity-100 hover:text-rose-400 text-zinc-500 transition-opacity"
                    title="Delete subpage"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              ))}

              <button
                type="button"
                onClick={handleCreateSubpage}
                className="w-full flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-medium text-zinc-500 hover:text-zinc-200 hover:bg-white/5 transition-colors mt-2"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add page</span>
              </button>
            </div>
          </aside>
        )}

        {/* MAIN CANVAS */}
        <div className="flex-1 overflow-y-auto px-6 sm:px-16 md:px-24 py-8 custom-scrollbar max-w-4xl mx-auto w-full space-y-6">
          <div className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-300 cursor-pointer transition-colors w-fit">
            <LinkIcon className="w-3.5 h-3.5" />
            <span>Link task or Doc</span>
          </div>

          {/* Editable Title */}
          <div className="group relative">
            {isEditingTitle ? (
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                onBlur={() => setIsEditingTitle(false)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') setIsEditingTitle(false)
                }}
                className="text-3xl sm:text-4xl font-extrabold text-white bg-transparent border-b border-primary focus:outline-none w-full pb-1"
                autoFocus
              />
            ) : (
              <h1
                onClick={() => setIsEditingTitle(true)}
                className="text-3xl sm:text-4xl font-extrabold text-white hover:opacity-90 cursor-text transition-opacity flex items-center gap-2"
                title="Click to edit title"
              >
                <span>{title || 'Untitled'}</span>
                <Edit3 className="w-4 h-4 text-zinc-600 opacity-0 group-hover:opacity-100 transition-opacity" />
              </h1>
            )}
          </div>

          {/* Subtitle / Author Info */}
          <div className="flex items-center gap-2 text-xs text-zinc-400 pb-3 border-b border-white/5">
            <div className="w-5 h-5 rounded-full bg-emerald-600/30 text-emerald-400 flex items-center justify-center font-bold text-[10px] border border-emerald-500/30">
              {(currentDoc?.authorName || user?.firstName || 'A').charAt(0).toUpperCase()}
            </div>
            <span className="font-semibold text-zinc-300">
              {currentDoc?.authorName || user?.displayName || user?.firstName || 'anandu'}
            </span>
            <span className="text-zinc-600">•</span>
            <span suppressHydrationWarning>
              Last updated Today at{' '}
              {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
            <span className="text-zinc-600">•</span>
            <span className="text-[11px] text-emerald-400 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> Auto-saved to Cloud
            </span>
          </div>

          {/* Quick Action Pills (Start writing | Blank wiki | Write with AI) */}
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={handleStartWriting}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-semibold text-zinc-200 border border-white/10 hover:border-white/20 transition-all cursor-pointer"
            >
              <FileText className="w-3.5 h-3.5 text-sky-400" />
              <span>Start writing</span>
            </button>

            <button
              type="button"
              onClick={() => {
                const wikiSnippet = `\n\n## Overview\nHigh-level summary of the architectural vision and sprint goals.\n\n## Key Requirements\n1. Resilient system architecture\n2. Real-time synchronisation\n`
                setContent((prev) => (prev ? prev + wikiSnippet : wikiSnippet.trimStart()))
                showToast('Inserted Wiki template')
              }}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-semibold text-zinc-200 border border-white/10 hover:border-white/20 transition-all cursor-pointer"
            >
              <BookOpen className="w-3.5 h-3.5 text-emerald-400" />
              <span>Blank wiki</span>
            </button>

            <button
              type="button"
              onClick={() => {
                const aiSnippet = `\n\n### 🤖 AI Summary & Action Plan\n- Refactor legacy endpoints for 3x performance gains\n- Implement automated tests for payment flow\n`
                setContent((prev) => (prev ? prev + aiSnippet : aiSnippet.trimStart()))
                showToast('Inserted AI template')
              }}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-purple-500/10 hover:bg-purple-500/20 text-xs font-semibold text-purple-300 border border-purple-500/20 transition-all cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5 text-purple-400" />
              <span>Write with AI</span>
            </button>
          </div>

          {/* ADD NEW SECTION (Table | Column | ClickUp List | Subpage) (Screenshot 3 & 5) */}
          <div className="space-y-2 pt-1 relative">
            <p className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider">Add new</p>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handleInsertTable}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-medium text-zinc-300 border border-white/10 hover:border-white/20 transition-all cursor-pointer"
              >
                <TableIcon className="w-3.5 h-3.5 text-zinc-400" />
                <span>Table</span>
              </button>

              {/* Column button triggers Popover (Screenshot 5 Top-Center) */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowColumnsPopover(!showColumnsPopover)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-medium text-zinc-300 border border-white/10 hover:border-white/20 transition-all cursor-pointer"
                >
                  <Columns3 className="w-3.5 h-3.5 text-zinc-400" />
                  <span>Column</span>
                </button>

                {showColumnsPopover && (
                  <div className="absolute left-0 top-full mt-2 w-48 rounded-2xl bg-[#181920] border border-white/15 p-2 shadow-2xl z-50 animate-scale-in text-xs space-y-1">
                    <p className="px-2 py-1 text-[10px] font-bold text-zinc-500 uppercase">/Columns</p>
                    {[2, 3, 4, 5].map((cols) => (
                      <button
                        key={cols}
                        type="button"
                        onClick={() => handleInsertColumns(cols)}
                        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-zinc-300 hover:text-white hover:bg-white/10 text-left transition-colors font-medium"
                      >
                        <span className="font-mono text-primary font-bold">[{'|'.repeat(cols)}]</span>
                        <span>{cols} Columns</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* ClickUp List triggers Modal (Screenshot 5 Top-Left) */}
              <button
                type="button"
                onClick={() => setShowClickUpListModal(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-medium text-zinc-300 border border-white/10 hover:border-white/20 transition-all cursor-pointer"
              >
                <CheckSquare className="w-3.5 h-3.5 text-zinc-400" />
                <span>ClickUp List</span>
              </button>

              {/* Subpage button creates nested subpage */}
              <button
                type="button"
                onClick={handleCreateSubpage}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-medium text-zinc-300 border border-white/10 hover:border-white/20 transition-all cursor-pointer"
              >
                <FilePlus className="w-3.5 h-3.5 text-zinc-400" />
                <span>Subpage</span>
              </button>
            </div>
          </div>

          {/* Subpages List on Document Canvas (Screenshot 5 Bottom-Right) */}
          {!activeSubpageId && activeSubpages.length > 0 && (
            <div className="pt-2 pb-2">
              <p className="text-xs font-bold text-zinc-400 mb-2">Subpages ({activeSubpages.length})</p>
              <div className="space-y-1.5">
                {activeSubpages.map((sub) => (
                  <div
                    key={sub.id}
                    onClick={() => {
                      setActiveSubpageId(sub.id)
                      setTitle(sub.title)
                      setContent(sub.content)
                    }}
                    className="flex items-center justify-between p-3 rounded-2xl bg-white/5 hover:bg-white/[0.08] border border-white/5 hover:border-white/15 transition-all cursor-pointer group"
                  >
                    <div className="flex items-center gap-2.5">
                      <FilePlus className="w-4 h-4 text-purple-400" />
                      <span className="text-xs font-semibold text-zinc-200 group-hover:text-primary transition-colors">
                        {sub.title}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-5 h-5 rounded-full bg-purple-500/20 text-purple-300 flex items-center justify-center text-[10px] font-bold">
                        A
                      </div>
                      <ChevronRight className="w-3.5 h-3.5 text-zinc-600 group-hover:text-zinc-300" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Interactive Editable Content Area */}
          <div className="pt-2">
            <textarea
              ref={textareaRef}
              value={content}
              onChange={(e) => {
                setContent(e.target.value)
                if (e.target.value.endsWith('/')) {
                  setShowSlashMenu(true)
                }
              }}
              placeholder="Type '/' for slash commands, or start writing notes, project requirements, architectural diagrams..."
              rows={16}
              className="w-full bg-transparent text-sm leading-relaxed text-zinc-200 placeholder:text-zinc-600 focus:outline-none resize-none font-sans"
            />
          </div>
        </div>

        {/* SETTINGS RIGHT DRAWER (Screenshot 5 Bottom-Right) */}
        {isSettingsOpen && (
          <aside className="w-72 border-l border-white/10 bg-[#12131a] flex flex-col shrink-0 select-none animate-slide-left z-40">
            {/* Header */}
            <div className="p-3 border-b border-white/10 flex items-center justify-between">
              <span className="text-xs font-bold text-white">Settings</span>
              <button
                type="button"
                onClick={() => setIsSettingsOpen(false)}
                className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Tabs: Entire Doc | This page */}
            <div className="p-2 border-b border-white/5">
              <div className="flex items-center p-0.5 rounded-xl bg-white/5">
                <button
                  type="button"
                  onClick={() => setSettingsTab('entire')}
                  className={`flex-1 py-1 text-xs font-semibold rounded-lg transition-all ${
                    settingsTab === 'entire' ? 'bg-primary text-white shadow-xs' : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  Entire Doc
                </button>
                <button
                  type="button"
                  onClick={() => setSettingsTab('page')}
                  className={`flex-1 py-1 text-xs font-semibold rounded-lg transition-all ${
                    settingsTab === 'page' ? 'bg-primary text-white shadow-xs' : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  This page
                </button>
              </div>
            </div>

            {/* Settings Options List */}
            <div className="flex-1 overflow-y-auto p-2 space-y-1 text-xs text-zinc-300">
              <button
                type="button"
                onClick={() => setIsEditingTitle(true)}
                className="w-full flex items-center justify-between px-3 py-2 rounded-xl hover:bg-white/5 text-left transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <Edit3 className="w-3.5 h-3.5 text-zinc-400" />
                  <span>Rename</span>
                </div>
              </button>

              <button
                type="button"
                onClick={() => {
                  if (navigator.clipboard) {
                    navigator.clipboard.writeText(window.location.href)
                    showToast('Link copied to clipboard')
                  }
                }}
                className="w-full flex items-center justify-between px-3 py-2 rounded-xl hover:bg-white/5 text-left transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <Copy className="w-3.5 h-3.5 text-zinc-400" />
                  <span>Copy link</span>
                </div>
              </button>

              <button
                type="button"
                onClick={() => {
                  if (currentDoc) updateDoc(currentDoc.id, { starred: !currentDoc.starred })
                }}
                className="w-full flex items-center justify-between px-3 py-2 rounded-xl hover:bg-white/5 text-left transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <Star className={`w-3.5 h-3.5 ${currentDoc?.starred ? 'text-amber-400 fill-current' : 'text-zinc-400'}`} />
                  <span>Favorite</span>
                </div>
              </button>

              <div className="my-1.5 border-t border-white/5" />

              {/* Toggles */}
              <div className="px-3 py-2 rounded-xl flex items-center justify-between">
                <span className="text-zinc-300">Protect Doc</span>
                <input
                  type="checkbox"
                  checked={isProtected}
                  onChange={(e) => setIsProtected(e.target.checked)}
                  className="rounded accent-primary cursor-pointer w-4 h-4"
                />
              </div>

              <div className="px-3 py-2 rounded-xl flex items-center justify-between">
                <span className="text-zinc-300">Public sharing</span>
                <input
                  type="checkbox"
                  checked={isPublic}
                  onChange={(e) => setIsPublic(e.target.checked)}
                  className="rounded accent-primary cursor-pointer w-4 h-4"
                />
              </div>

              <div className="px-3 py-2 rounded-xl flex items-center justify-between">
                <span className="text-zinc-300">Mark Doc as wiki</span>
                <input
                  type="checkbox"
                  checked={isWiki}
                  onChange={(e) => setIsWiki(e.target.checked)}
                  className="rounded accent-primary cursor-pointer w-4 h-4"
                />
              </div>

              <div className="my-1.5 border-t border-white/5" />

              {/* Danger Actions */}
              <button
                type="button"
                onClick={() => setIsConfirmingDelete(true)}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 text-left transition-colors font-semibold"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete {activeSubpageId ? 'Page' : 'Document'}</span>
              </button>
            </div>
          </aside>
        )}
      </div>

      {/* CLICKUP LIST MODAL (Screenshot 5 Top-Left) */}
      {showClickUpListModal && (
        <div className="fixed inset-0 z-[160] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-[#181920] border border-white/15 rounded-3xl p-5 w-full max-w-md shadow-2xl space-y-4 animate-scale-in">
            <div className="flex items-center justify-between pb-2 border-b border-white/10">
              <div>
                <p className="text-[10px] font-bold text-zinc-500 uppercase">/ClickUp List (List)</p>
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">ADD LIST OF TASKS</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowClickUpListModal(false)}
                className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Tabs: Search | Browse or New List */}
            <div className="flex items-center p-0.5 rounded-xl bg-white/5">
              <button
                type="button"
                onClick={() => setClickUpTab('search')}
                className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                  clickUpTab === 'search' ? 'bg-primary text-white' : 'text-zinc-400 hover:text-white'
                }`}
              >
                Search
              </button>
              <button
                type="button"
                onClick={() => setClickUpTab('browse')}
                className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                  clickUpTab === 'browse' ? 'bg-primary text-white' : 'text-zinc-400 hover:text-white'
                }`}
              >
                Browse or New List
              </button>
            </div>

            {/* Filter Input */}
            <div className="relative">
              <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={clickUpSearchQuery}
                onChange={(e) => setClickUpSearchQuery(e.target.value)}
                placeholder="Filter by name..."
                className="w-full bg-white/5 border border-white/10 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder:text-zinc-500 focus:outline-none focus:border-primary"
              />
            </div>
            <p className="text-[10px] text-zinc-500 italic">Paste URL or search List name</p>

            {/* List candidates */}
            <div className="space-y-1.5 max-h-48 overflow-y-auto">
              {['ChatApp Sprint Tasks', 'Frontend Layer Specs', 'Payment API Requirements', 'Backend Services'].map(
                (name) => (
                  <button
                    key={name}
                    type="button"
                    onClick={() => handleInsertClickUpList(name)}
                    className="w-full flex items-center justify-between p-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-left text-xs font-medium text-zinc-200 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <ListTodo className="w-3.5 h-3.5 text-purple-400" />
                      <span>{name}</span>
                    </div>
                    <span className="text-[10px] text-zinc-500">Insert List</span>
                  </button>
                )
              )}
            </div>
          </div>
        </div>
      )}

      {/* SLASH COMMAND PALETTE (Screenshot 5 Top-Right) */}
      {showSlashMenu && (
        <div className="fixed inset-0 z-[160] flex items-center justify-center bg-black/60 backdrop-blur-xs p-4" onClick={() => setShowSlashMenu(false)}>
          <div
            className="bg-[#181920] border border-white/15 rounded-2xl p-2 w-full max-w-sm shadow-2xl space-y-1 animate-scale-in text-xs max-h-96 overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="px-3 py-1.5 text-[10px] font-bold text-zinc-500 uppercase tracking-wider">/search suggestions</p>
            {[
              { label: 'Write with AI', icon: Sparkles, action: () => setContent((c) => c + '\n\n### 🤖 AI Summary\n') },
              { label: 'Template', icon: BookOpen, action: () => setContent((c) => c + '\n\n## Overview\n') },
              { label: 'ClickUp List (Table)', icon: CheckSquare, action: () => setShowClickUpListModal(true) },
              { label: 'New Subpage', icon: FilePlus, action: handleCreateSubpage },
              { label: 'Columns', icon: Columns3, action: () => setShowColumnsPopover(true) },
              { label: 'Table', icon: TableIcon, action: handleInsertTable },
            ].map((cmd) => (
              <button
                key={cmd.label}
                type="button"
                onClick={() => {
                  setShowSlashMenu(false)
                  cmd.action()
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-zinc-300 hover:text-white hover:bg-white/10 text-left transition-colors"
              >
                <cmd.icon className="w-4 h-4 text-purple-400" />
                <span>{cmd.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal (Guaranteed Deletion) */}
      {isConfirmingDelete && (
        <div className="fixed inset-0 z-[180] flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-fade-in">
          <div className="bg-[#181920] border border-white/15 rounded-3xl p-6 w-full max-w-md shadow-2xl space-y-4 animate-scale-in">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-rose-500/15 text-rose-400 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Delete {activeSubpageId ? 'Subpage' : 'Document'}</h3>
                <p className="text-xs text-zinc-400">Permanent deletion confirmation</p>
              </div>
            </div>

            <p className="text-xs text-zinc-300 leading-relaxed">
              Are you sure you want to delete <strong className="text-white">"{title}"</strong>? This will remove it from your workspace. This action cannot be undone.
            </p>

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-white/10">
              <button
                type="button"
                onClick={() => setIsConfirmingDelete(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-zinc-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDelete}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition-all shadow-md shadow-rose-600/25 cursor-pointer"
              >
                Delete {activeSubpageId ? 'Page' : 'Doc'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
