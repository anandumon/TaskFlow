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
  Download,
  Copy,
} from 'lucide-react'
import { useDocStore, DocItem } from '@/stores/doc-store'
import { useAuthStore } from '@/stores/auth-store'

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
  const { docs, getDoc, createDoc, updateDoc, deleteDoc, loadDocs } = useDocStore()
  const { user } = useAuthStore()

  const [currentDoc, setCurrentDoc] = useState<DocItem | null>(null)
  const [title, setTitle] = useState(docTitle || 'demo')
  const [content, setContent] = useState('')
  const [isEditingTitle, setIsEditingTitle] = useState(false)
  const [autoSaveStatus, setAutoSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle')
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false)
  const [toastMessage, setToastMessage] = useState<string | null>(null)
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
    if (!isOpen) return

    let doc = getDoc(docId)
    if (!doc && docTitle) {
      // Find by title or create new
      const found = docs.find((d) => d.title.toLowerCase() === docTitle.toLowerCase())
      if (found) {
        doc = found
      } else {
        const author = user?.displayName || user?.firstName || 'anandu'
        doc = createDoc(docTitle, '', author)
      }
    } else if (!doc && !docTitle) {
      const author = user?.displayName || user?.firstName || 'anandu'
      doc = createDoc(docId || 'demo', '', author)
    }

    if (doc) {
      setCurrentDoc(doc)
      setTitle(doc.title)
      setContent(doc.content || '')
    }
  }, [isOpen, docId, docTitle, docs, getDoc, createDoc, user])

  // Auto-save debounced effect on title or content change
  const initialLoadRef = useRef(true)
  useEffect(() => {
    if (!currentDoc) return

    if (initialLoadRef.current) {
      initialLoadRef.current = false
      return
    }

    if (title === currentDoc.title && content === currentDoc.content) {
      return
    }

    setAutoSaveStatus('saving')
    const timer = setTimeout(() => {
      updateDoc(currentDoc.id, {
        title: title.trim() || 'Untitled Doc',
        content,
      })
      setAutoSaveStatus('saved')
      setTimeout(() => setAutoSaveStatus('idle'), 2500)
    }, 600)

    return () => clearTimeout(timer)
  }, [title, content, currentDoc, updateDoc])

  if (!isOpen) return null

  const handleStartWriting = () => {
    textareaRef.current?.focus()
  }

  const handleInsertTemplate = (type: 'wiki' | 'ai' | 'table' | 'column' | 'list' | 'subpage') => {
    let snippet = ''
    switch (type) {
      case 'wiki':
        snippet = `\n\n## Overview\nHigh-level summary of the architectural vision and sprint goals.\n\n## Key Requirements\n1. Resilient system architecture\n2. Real-time synchronisation\n3. Zero downtime deployments\n`
        break
      case 'ai':
        snippet = `\n\n### 🤖 AI Summary & Action Plan\nBased on your workspace context, here are recommended action items:\n- Refactor legacy endpoints for 3x performance gains\n- Implement automated tests for payment flow\n- Update sprint board with milestone estimates\n`
        break
      case 'table':
        snippet = `\n\n| Item | Owner | Status | Priority |\n|---|---|---|---|\n| API Integration | Anandu | In Progress | High |\n| Design System Polish | Team | Done | Medium |\n`
        break
      case 'column':
        snippet = `\n\n:::columns\n### Column A\nNotes and specifications for the frontend layer.\n\n### Column B\nDatabase schema notes and migration checklist.\n:::\n`
        break
      case 'list':
        snippet = `\n\n### Action Checklist\n- [ ] Design verification complete\n- [ ] End-to-end unit tests passing\n- [ ] Ready for deployment\n`
        break
      case 'subpage':
        snippet = `\n\n📄 [Linked Subpage: Technical Architecture Specs](/app/docs/technical-specs)\n`
        break
    }
    setContent((prev) => (prev ? prev + snippet : snippet.trimStart()))
    showToast(`Added ${type} template to document`)
    setTimeout(() => textareaRef.current?.focus(), 50)
  }

  const handleDelete = () => {
    if (!currentDoc) return
    deleteDoc(currentDoc.id)
    setIsConfirmingDelete(false)
    showToast(`Document "${title}" deleted successfully`)
    setTimeout(() => {
      onClose()
    }, 400)
  }

  const formattedDate = currentDoc
    ? new Date(currentDoc.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : '12:07 pm'

  return (
    <div className="fixed inset-0 z-[120] flex flex-col bg-[#0f1015] text-[#e1e4ea] animate-fade-in select-none">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-[200] px-4 py-2 rounded-2xl bg-zinc-800 text-white text-xs font-semibold shadow-2xl border border-zinc-700/80 flex items-center gap-2 animate-slide-down">
          <Check className="w-3.5 h-3.5 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* TOP HEADER BAR (Matching Image 4) */}
      <div className="h-12 border-b border-white/10 px-4 flex items-center justify-between shrink-0 bg-[#0f1015] select-none">
        {/* Left: Breadcrumbs & Add Page */}
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex items-center gap-2 text-xs font-medium text-zinc-400">
            <span className="hover:text-white transition-colors cursor-pointer" onClick={onClose}>
              Docs
            </span>
            <span>/</span>
            <div className="flex items-center gap-1.5 text-white font-semibold truncate">
              <span className="text-sky-400">📄</span>
              <span className="truncate max-w-[200px]">{title || 'demo'}</span>
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
            onClick={() => {
              const newTitle = prompt('New Page Title:', 'Untitled Page')
              if (newTitle) {
                createDoc(newTitle, '', user?.firstName || 'anandu')
                showToast(`Created page "${newTitle}"`)
              }
            }}
            className="hidden sm:inline-flex items-center gap-1 px-2 py-1 rounded-lg text-zinc-400 hover:text-white hover:bg-white/5 text-xs font-medium transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add page</span>
          </button>
        </div>

        {/* Center: Search & Imagine */}
        <div className="hidden md:flex items-center gap-2">
          <div className="flex items-center gap-2 px-3 py-1 rounded-xl bg-white/5 border border-white/10 text-xs text-zinc-400 hover:border-white/20 transition-all cursor-pointer">
            <Search className="w-3.5 h-3.5 text-zinc-500" />
            <span>Search</span>
            <kbd className="px-1.5 py-0.5 rounded bg-white/10 text-[10px] font-mono text-zinc-400">Ctrl K</kbd>
          </div>
          <button
            type="button"
            onClick={() => handleInsertTemplate('ai')}
            className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 border border-purple-500/20 text-xs font-medium transition-all"
          >
            <Sparkles className="w-3.5 h-3.5 text-purple-400 animate-pulse" />
            <span>Imagine</span>
          </button>
        </div>

        {/* Right: Actions & Options */}
        <div className="flex items-center gap-1.5">
          {/* Auto-save Status Pill */}
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
            onClick={() => handleInsertTemplate('ai')}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 transition-colors"
            title="Brain AI Assistant"
          >
            <Brain className="w-4 h-4 text-purple-400" />
          </button>

          <button
            type="button"
            onClick={() => {
              if (navigator.clipboard) {
                navigator.clipboard.writeText(window.location.href)
                showToast('Link copied to clipboard!')
              }
            }}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-zinc-300 hover:text-white hover:bg-white/10 text-xs font-medium transition-colors"
          >
            <Share2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Share</span>
          </button>

          {/* More options menu (includes Delete Doc) */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 transition-colors"
              title="More options"
            >
              <MoreHorizontal className="w-4 h-4" />
            </button>

            {isMenuOpen && (
              <div className="absolute right-0 top-full mt-1.5 w-48 rounded-2xl bg-[#181920] border border-white/10 p-1.5 shadow-2xl z-50 animate-scale-in text-xs">
                <button
                  type="button"
                  onClick={() => {
                    handleInsertTemplate('wiki')
                    setIsMenuOpen(false)
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-zinc-300 hover:text-white hover:bg-white/10 text-left transition-colors"
                >
                  <BookOpen className="w-3.5 h-3.5" />
                  <span>Insert Wiki Template</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (navigator.clipboard) {
                      navigator.clipboard.writeText(content)
                      showToast('Document text copied to clipboard!')
                    }
                    setIsMenuOpen(false)
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-zinc-300 hover:text-white hover:bg-white/10 text-left transition-colors"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy Markdown</span>
                </button>
                <div className="my-1 border-t border-white/10" />
                <button
                  type="button"
                  onClick={() => {
                    setIsMenuOpen(false)
                    setIsConfirmingDelete(true)
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 text-left transition-colors font-semibold"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete Document</span>
                </button>
              </div>
            )}
          </div>

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

      {/* MAIN DOCUMENT CANVAS AREA */}
      <div className="flex-1 overflow-y-auto px-6 sm:px-16 md:px-28 py-8 custom-scrollbar max-w-4xl mx-auto w-full space-y-6">
        {/* Link task or Doc link */}
        <div className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-300 cursor-pointer transition-colors w-fit">
          <LinkIcon className="w-3.5 h-3.5" />
          <span>Link task or Doc</span>
        </div>

        {/* Large Editable Title (Matching Image 4) */}
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
              <span>{title || 'demo'}</span>
              <Edit3 className="w-4 h-4 text-zinc-600 opacity-0 group-hover:opacity-100 transition-opacity" />
            </h1>
          )}
        </div>

        {/* Subtitle / Author & Last updated info (Matching Image 4) */}
        <div className="flex items-center gap-2 text-xs text-zinc-400 pb-3 border-b border-white/5">
          <div className="w-5 h-5 rounded-full bg-emerald-600/30 text-emerald-400 flex items-center justify-center font-bold text-[10px] border border-emerald-500/30">
            {(currentDoc?.authorName || user?.firstName || 'A').charAt(0).toUpperCase()}
          </div>
          <span className="font-semibold text-zinc-300">
            {currentDoc?.authorName || user?.displayName || user?.firstName || 'anandu'}
          </span>
          <span className="text-zinc-600">•</span>
          <span>Last updated Today at {formattedDate}</span>
          <span className="text-zinc-600">•</span>
          <span className="text-[11px] text-emerald-400 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> Auto-saved to Cloud
          </span>
        </div>

        {/* Quick Action Pills (Start writing | Blank wiki | Write with AI) */}
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={handleStartWriting}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-semibold text-zinc-200 border border-white/10 hover:border-white/20 transition-all cursor-pointer shadow-xs"
            >
              <FileText className="w-3.5 h-3.5 text-sky-400" />
              <span>Start writing</span>
            </button>

            <button
              type="button"
              onClick={() => handleInsertTemplate('wiki')}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-semibold text-zinc-200 border border-white/10 hover:border-white/20 transition-all cursor-pointer shadow-xs"
            >
              <BookOpen className="w-3.5 h-3.5 text-emerald-400" />
              <span>Blank wiki</span>
            </button>

            <button
              type="button"
              onClick={() => handleInsertTemplate('ai')}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-purple-500/10 hover:bg-purple-500/20 text-xs font-semibold text-purple-300 border border-purple-500/20 transition-all cursor-pointer shadow-xs"
            >
              <Sparkles className="w-3.5 h-3.5 text-purple-400" />
              <span>Write with AI</span>
            </button>
          </div>
        </div>

        {/* Section: Add New (Table | Column | ClickUp List | Subpage) (Matching Image 4) */}
        <div className="space-y-2 pt-1">
          <p className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider">Add new</p>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => handleInsertTemplate('table')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-medium text-zinc-300 border border-white/10 hover:border-white/20 transition-all cursor-pointer"
            >
              <TableIcon className="w-3.5 h-3.5 text-zinc-400" />
              <span>Table</span>
            </button>

            <button
              type="button"
              onClick={() => handleInsertTemplate('column')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-medium text-zinc-300 border border-white/10 hover:border-white/20 transition-all cursor-pointer"
            >
              <Columns3 className="w-3.5 h-3.5 text-zinc-400" />
              <span>Column</span>
            </button>

            <button
              type="button"
              onClick={() => handleInsertTemplate('list')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-medium text-zinc-300 border border-white/10 hover:border-white/20 transition-all cursor-pointer"
            >
              <CheckSquare className="w-3.5 h-3.5 text-zinc-400" />
              <span>ClickUp List</span>
            </button>

            <button
              type="button"
              onClick={() => handleInsertTemplate('subpage')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-medium text-zinc-300 border border-white/10 hover:border-white/20 transition-all cursor-pointer"
            >
              <FilePlus className="w-3.5 h-3.5 text-zinc-400" />
              <span>Subpage</span>
            </button>
          </div>
        </div>

        {/* Content Writing Canvas - Editable & Auto-saving */}
        <div className="pt-2">
          <textarea
            ref={textareaRef}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Type '/' for commands, or start typing your document notes and specifications..."
            rows={14}
            className="w-full bg-transparent text-sm leading-relaxed text-zinc-200 placeholder:text-zinc-600 focus:outline-none resize-none font-sans"
          />
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {isConfirmingDelete && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-fade-in">
          <div className="bg-[#181920] border border-white/15 rounded-3xl p-6 w-full max-w-md shadow-2xl space-y-4 animate-scale-in">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-rose-500/15 text-rose-400 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Delete Document</h3>
                <p className="text-xs text-zinc-400">Permanent deletion confirmation</p>
              </div>
            </div>

            <p className="text-xs text-zinc-300 leading-relaxed">
              Are you sure you want to delete <strong className="text-white">"{title}"</strong>? This will remove the document from your workspace. This action cannot be undone.
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
                Delete Doc
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
