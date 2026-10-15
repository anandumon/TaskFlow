'use client'

import React, { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
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
  AlertTriangle,
  Download,
  FileDown,
} from 'lucide-react'
import { useDocStore, DocItem, SubPageItem } from '@/stores/doc-store'
import { useAuthStore } from '@/stores/auth-store'
import { useWorkspaceStore } from '@/stores/workspace-store'
import { useTaskStore } from '@/stores/task-store'
import { TableTemplateModal } from './TableTemplateModal'
import { DocVisualEditor } from './DocVisualEditor'
import { TableTemplate } from './DocTemplates'

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
  const [isMounted, setIsMounted] = useState(false)

  // Track initial/saved values to detect unsaved changes accurately
  const initialTitleRef = useRef<string>(docTitle || 'demo')
  const initialContentRef = useRef<string>('')
  const initialProtectedRef = useRef<boolean>(false)
  const initialPublicRef = useRef<boolean>(false)
  const initialWikiRef = useRef<boolean>(false)

  // Modals state for user prompt
  const [showClosePrompt, setShowClosePrompt] = useState(false)
  const [duplicateWarning, setDuplicateWarning] = useState<string | null>(null)
  const [renameInput, setRenameInput] = useState('')
  const [showShareModal, setShowShareModal] = useState(false)

  // UI Panels state (matching Screenshot 5)
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)

  // Initialize sidebar based on screen width
  useEffect(() => {
    if (typeof window !== 'undefined') {
      setIsSidebarOpen(window.innerWidth >= 768)
    }
  }, [])
  const [settingsTab, setSettingsTab] = useState<'entire' | 'page'>('entire')
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false)
  const [toastMessage, setToastMessage] = useState<string | null>(null)
  const [isSavingDoc, setIsSavingDoc] = useState(false)

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
  const [isTableModalOpen, setIsTableModalOpen] = useState(false)

  const isDeletingRef = useRef(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    setIsMounted(true)
  }, [])

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
          initialTitleRef.current = sub.title
          initialContentRef.current = sub.content || ''
          return
        }
      }

      setTitle(doc.title)
      setContent(doc.content || '')
      initialTitleRef.current = doc.title
      initialContentRef.current = doc.content || ''
      initialProtectedRef.current = !!doc.isProtected
      initialPublicRef.current = !!doc.isPublic
      initialWikiRef.current = !!doc.isWiki
    }
  }, [isOpen, docId, docTitle, docs, getDoc, createDoc, user, activeSubpageId])

  // Detect whether current form has unsaved modifications
  const hasUnsavedChanges =
    title.trim() !== (initialTitleRef.current || '').trim() ||
    content !== initialContentRef.current ||
    isProtected !== initialProtectedRef.current ||
    isPublic !== initialPublicRef.current ||
    isWiki !== initialWikiRef.current

  // Check if a document with the candidate title exists in local store or remote DB
  const checkDuplicateTitle = async (candidateTitle: string): Promise<boolean> => {
    const clean = candidateTitle.trim().toLowerCase()
    if (!clean) return false

    // 1. Check local docs in store
    const allDocs = useDocStore.getState().docs || []
    const hasLocal = allDocs.some(
      (d) =>
        d &&
        d.id !== (currentDoc?.id || docId) &&
        (d.title || '').trim().toLowerCase() === clean
    )
    if (hasLocal) return true

    // 2. Check remote database for current workspace
    const wsId = currentWorkspace?.id
    if (wsId && typeof window !== 'undefined') {
      try {
        const token =
          localStorage.getItem('accessToken') ||
          localStorage.getItem('token') ||
          localStorage.getItem('taskflow_token')
        const res = await fetch(`/api/v1/workspaces/${wsId}/docs`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        })
        if (res.ok) {
          const json = await res.json()
          const sDocs = json?.data || []
          const hasServer = sDocs.some(
            (d: any) =>
              d &&
              d.id !== (currentDoc?.id || docId) &&
              (d.title || '').trim().toLowerCase() === clean
          )
          if (hasServer) return true
        }
      } catch (err) {
        console.warn('[DocViewer] remote dup check failed:', err)
      }
    }

    return false
  }

  // Explicit Save to Docs
  const handleSaveToDocs = async (overrideTitle?: string): Promise<boolean> => {
    if (isSavingDoc) return false
    setIsSavingDoc(true)
    const finalTitle = (overrideTitle || title).trim() || 'Untitled Doc'

    // Check duplicate name in DB/Store
    const isDup = await checkDuplicateTitle(finalTitle)
    if (isDup) {
      setRenameInput(`${finalTitle} (Copy)`)
      setDuplicateWarning(
        `A document named "${finalTitle}" already exists in this workspace. Please choose a unique name.`
      )
      setIsSavingDoc(false)
      return false
    }

    setAutoSaveStatus('saving')
    try {
      if (activeSubpageId && currentDoc) {
        updateSubpage(currentDoc.id, activeSubpageId, {
          title: finalTitle,
          content,
        })
      } else if (currentDoc) {
        updateDoc(currentDoc.id, {
          title: finalTitle,
          content,
          isProtected,
          isPublic,
          isWiki,
        })
      } else {
        const author = user?.displayName || user?.firstName || 'User'
        const created = createDoc(finalTitle, content, author, 'Team Space', { docId })
        setCurrentDoc(created)
      }

      initialTitleRef.current = finalTitle
      initialContentRef.current = content
      initialProtectedRef.current = isProtected
      initialPublicRef.current = isPublic
      initialWikiRef.current = isWiki

      setAutoSaveStatus('saved')
      showToast(`Saved "${finalTitle}" to Docs successfully!`)
      setTimeout(() => setAutoSaveStatus('idle'), 2500)
      return true
    } catch {
      setAutoSaveStatus('idle')
      showToast('Failed to save document.')
      return false
    } finally {
      setTimeout(() => setIsSavingDoc(false), 500)
    }
  }

  const handleAttemptClose = () => {
    if (hasUnsavedChanges) {
      setShowClosePrompt(true)
    } else {
      onClose()
    }
  }

  const handleShareDoc = async () => {
    const success = await handleSaveToDocs()
    if (!success) return

    if (currentDoc) {
      updateDoc(currentDoc.id, { isPublic: true })
      setIsPublic(true)
    }

    const shareUrl = typeof window !== 'undefined'
      ? `${window.location.origin}/app/docs/${encodeURIComponent(currentDoc?.id || docId)}`
      : ''

    if (navigator.clipboard) {
      navigator.clipboard.writeText(shareUrl)
    }
    showToast('Document saved & share link copied to clipboard!')
    setShowShareModal(true)
  }

  const handleDownloadDoc = (format: 'md' | 'txt' | 'html' = 'md') => {
    try {
      const safeTitle = (title || 'Document').trim().replace(/[^a-zA-Z0-9_\-\s]/g, '').replace(/\s+/g, '_')
      let fileContent = content || ''
      let mimeType = 'text/markdown;charset=utf-8'
      let extension = 'md'

      if (format === 'txt') {
        mimeType = 'text/plain;charset=utf-8'
        extension = 'txt'
        fileContent = `${title}\n\n` + (content || '')
          .replace(/#{1,6}\s+/g, '')
          .replace(/(\*\*|__)(.*?)\1/g, '$2')
          .replace(/(\*|_)(.*?)\1/g, '$2')
          .replace(/`{1,3}(.*?)`{1,3}/g, '$1')
      } else if (format === 'html') {
        mimeType = 'text/html;charset=utf-8'
        extension = 'html'
        fileContent = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${title || 'TaskFlow Document'}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; max-width: 820px; margin: 40px auto; padding: 0 24px; line-height: 1.7; color: #1e293b; background: #fff; }
    h1 { font-size: 2rem; border-bottom: 2px solid #e2e8f0; padding-bottom: 12px; margin-bottom: 24px; }
    p { margin-bottom: 16px; white-space: pre-wrap; }
  </style>
</head>
<body>
  <h1>${title || 'Untitled Document'}</h1>
  <div>${(content || '').replace(/\n/g, '<br/>')}</div>
</body>
</html>`
      } else {
        fileContent = `# ${title || 'Document'}\n\n${content || ''}`
      }

      const blob = new Blob([fileContent], { type: mimeType })
      const downloadUrl = URL.createObjectURL(blob)
      const anchor = document.createElement('a')
      anchor.href = downloadUrl
      anchor.download = `${safeTitle}.${extension}`
      document.body.appendChild(anchor)
      anchor.click()
      document.body.removeChild(anchor)
      URL.revokeObjectURL(downloadUrl)
      showToast(`Document downloaded as .${extension}`)
    } catch (err) {
      console.error('Download failed', err)
      showToast('Failed to download document')
    }
  }

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
    setIsTableModalOpen(true)
  }

  const handleSelectTableTemplate = (tpl: TableTemplate) => {
    const headerLine = `| ${tpl.headers.join(' | ')} |`
    const sepLine = `| ${tpl.headers.map(() => '---').join(' | ')} |`
    const dataLines = tpl.rows.map((row) => `| ${row.join(' | ')} |`).join('\n')
    const tableSnippet = `\n\n${headerLine}\n${sepLine}\n${dataLines}\n`
    setContent((prev) => (prev ? prev + tableSnippet : tableSnippet.trimStart()))
    showToast(`Added ${tpl.name} table template`)
  }

  const handleInsertCustomGrid = (rows: number, cols: number, colorTheme: string, headers: string[]) => {
    const headerLine = `| ${headers.join(' | ')} |`
    const sepLine = `| ${headers.map(() => '---').join(' | ')} |`
    const dataRows: string[] = []
    for (let r = 1; r <= rows; r++) {
      const cells = Array.from({ length: cols }, (_, c) => `R${r}C${c + 1}`)
      dataRows.push(`| ${cells.join(' | ')} |`)
    }
    const tableSnippet = `\n\n${headerLine}\n${sepLine}\n${dataRows.join('\n')}\n`
    setContent((prev) => (prev ? prev + tableSnippet : tableSnippet.trimStart()))
    showToast(`Added ${rows}x${cols} custom table`)
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

  if (!isOpen) return null
  if (!isMounted || typeof document === 'undefined') return null

  const modalContent = (
    <div className="fixed inset-0 top-0 left-0 w-full h-full max-w-full z-[99999] flex flex-col bg-background text-foreground animate-fade-in select-none overflow-hidden">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-[250] px-4 py-2 rounded-2xl bg-card text-foreground text-xs font-semibold shadow-2xl border border-border flex items-center gap-2 animate-slide-down">
          <Check className="w-3.5 h-3.5 text-emerald-500" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* TOP HEADER BAR */}
      <div className="h-14 border-b border-border px-3 sm:px-6 flex items-center justify-between shrink-0 bg-card select-none shadow-xs gap-2">
        {/* Left: Sidebar toggle, Breadcrumbs */}
        <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
          <button
            type="button"
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer shrink-0"
            title={isSidebarOpen ? 'Hide doc pages' : 'Show doc pages'}
          >
            {isSidebarOpen ? <PanelLeftClose className="w-4 h-4" /> : <PanelLeft className="w-4 h-4" />}
          </button>

          <div className="flex items-center gap-1.5 sm:gap-2 text-xs font-medium text-muted-foreground min-w-0">
            <span className="hover:text-foreground transition-colors cursor-pointer shrink-0" onClick={handleAttemptClose}>
              Docs
            </span>
            <span className="shrink-0">/</span>
            <div className="flex items-center gap-1.5 text-foreground font-semibold truncate min-w-0">
              <span className="text-sky-500 shrink-0">📄</span>
              <span className="truncate max-w-[110px] sm:max-w-[200px]">{currentDoc?.title || title || 'demo'}</span>
              {activeSubpageId && (
                <>
                  <span className="text-muted-foreground shrink-0">/</span>
                  <span className="text-primary truncate max-w-[80px] sm:max-w-[150px]">{title}</span>
                </>
              )}
              <button
                type="button"
                onClick={() => {
                  if (currentDoc) {
                    updateDoc(currentDoc.id, { starred: !currentDoc.starred })
                  }
                }}
                className={`p-0.5 rounded hover:bg-muted transition-colors shrink-0 ${
                  currentDoc?.starred ? 'text-amber-500' : 'text-muted-foreground hover:text-amber-500'
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
            className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted text-xs font-medium transition-colors cursor-pointer shrink-0"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add page</span>
          </button>
        </div>

        {/* Center: Search & Imagine */}
        <div className="hidden lg:flex items-center gap-2 shrink-0">
          <div
            onClick={() => setShowSlashMenu(true)}
            className="flex items-center gap-2 px-3 py-1 rounded-xl bg-muted/60 border border-border text-xs text-muted-foreground hover:text-foreground transition-all cursor-pointer"
          >
            <Search className="w-3.5 h-3.5 text-muted-foreground" />
            <span>Search</span>
            <kbd className="px-1.5 py-0.5 rounded bg-muted text-[10px] font-mono text-muted-foreground">Ctrl K</kbd>
          </div>
          <button
            type="button"
            onClick={() => {
              const aiSnippet = `\n\n### 🤖 AI Summary & Action Plan\n- Analyzed current workspace architecture\n- Generated optimized execution roadmap\n- Aligned deliverables with sprint calendar\n`
              setContent((prev) => (prev ? prev + aiSnippet : aiSnippet.trimStart()))
              showToast('Generated AI insights')
            }}
            className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-purple-500/10 hover:bg-purple-500/20 text-purple-600 dark:text-purple-300 border border-purple-500/20 text-xs font-medium transition-all cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5 text-purple-500 animate-pulse" />
            <span>Imagine</span>
          </button>
        </div>

        {/* Right: Actions, Settings drawer toggle, Close */}
        <div className="flex items-center gap-1 sm:gap-2 shrink-0">
          {autoSaveStatus === 'saving' && (
            <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-500 text-[10px] font-medium animate-pulse">
              <Loader2 className="w-2.5 h-2.5 animate-spin" /> Saving...
            </span>
          )}
          {autoSaveStatus === 'saved' && (
            <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 text-[10px] font-medium">
              <Check className="w-2.5 h-2.5" /> Saved
            </span>
          )}

          {/* Save to Docs Button */}
          <button
            type="button"
            disabled={isSavingDoc}
            onClick={() => handleSaveToDocs()}
            className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all shadow-xs cursor-pointer disabled:opacity-50 disabled:pointer-events-none whitespace-nowrap shrink-0"
            title="Save changes to TaskFlow Docs"
          >
            {isSavingDoc ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Check className="w-3.5 h-3.5" />
            )}
            <span>Save</span>
            <span className="hidden sm:inline">to Docs</span>
          </button>

          {/* Share Button */}
          <button
            type="button"
            onClick={handleShareDoc}
            className="flex items-center gap-1.5 px-2 sm:px-2.5 py-1.5 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted text-xs font-medium transition-colors cursor-pointer shrink-0"
            title="Save changes and share document"
          >
            <Share2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Share</span>
          </button>

          {/* Download Button */}
          <button
            type="button"
            onClick={() => handleDownloadDoc('md')}
            className="flex items-center gap-1.5 px-2 sm:px-2.5 py-1.5 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted text-xs font-medium transition-colors cursor-pointer shrink-0"
            title="Download document (.md)"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Download</span>
          </button>

          {/* Settings button */}
          <button
            type="button"
            onClick={() => setIsSettingsOpen(!isSettingsOpen)}
            className={`p-1.5 rounded-lg transition-colors cursor-pointer shrink-0 ${
              isSettingsOpen ? 'bg-primary/20 text-primary' : 'text-muted-foreground hover:text-foreground hover:bg-muted'
            }`}
            title="Doc settings"
          >
            <MoreHorizontal className="w-4 h-4" />
          </button>

          {/* Close button */}
          <button
            type="button"
            onClick={handleAttemptClose}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer shrink-0 ml-0.5"
            title="Close document"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* BODY AREA (With Left Subpage Sidebar & Right Settings Drawer) */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Mobile Backdrop for Subpage Sidebar */}
        {isSidebarOpen && (
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-xs z-40 md:hidden animate-fade-in"
            onClick={() => setIsSidebarOpen(false)}
          />
        )}

        {/* SUBPAGE LEFT SIDEBAR */}
        {isSidebarOpen && (
          <aside className="fixed md:static inset-y-0 left-0 z-50 md:z-auto w-64 md:w-60 border-r border-border bg-card flex flex-col shrink-0 select-none shadow-2xl md:shadow-none animate-slide-right">
            <div className="p-3 border-b border-border flex items-center justify-between">
              <span className="text-xs font-bold text-foreground truncate max-w-[150px]">
                {currentDoc?.title || 'demo'}
              </span>
              <button
                type="button"
                onClick={() => setIsSidebarOpen(false)}
                className="md:hidden p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted"
                title="Close sidebar"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar">
              <div className="px-2 py-1 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Pages</div>

              {/* Main doc root item */}
              <button
                type="button"
                onClick={() => {
                  if (currentDoc) {
                    setActiveSubpageId(null)
                    setTitle(currentDoc.title)
                    setContent(currentDoc.content)
                  }
                  if (typeof window !== 'undefined' && window.innerWidth < 768) {
                    setIsSidebarOpen(false)
                  }
                }}
                className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-xl text-xs font-medium transition-all text-left ${
                  activeSubpageId === null
                    ? 'bg-primary/15 text-primary font-bold border border-primary/20'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                }`}
              >
                <FileText className="w-3.5 h-3.5 text-sky-500 shrink-0" />
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
                      if (typeof window !== 'undefined' && window.innerWidth < 768) {
                        setIsSidebarOpen(false)
                      }
                    }}
                    className={`flex-1 flex items-center gap-2 px-2.5 py-1.5 rounded-xl text-xs font-medium transition-all text-left ${
                      activeSubpageId === sub.id
                        ? 'bg-purple-500/15 text-purple-600 dark:text-purple-300 font-bold border border-purple-500/30'
                        : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                    }`}
                  >
                    <FilePlus className="w-3.5 h-3.5 text-purple-500 shrink-0" />
                    <span className="truncate">{sub.title}</span>
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      if (currentDoc) deleteSubpage(currentDoc.id, sub.id)
                    }}
                    className="p-1 rounded opacity-0 group-hover:opacity-100 hover:text-rose-500 text-muted-foreground transition-opacity"
                    title="Delete subpage"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              ))}

              <button
                type="button"
                onClick={handleCreateSubpage}
                className="w-full flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors mt-2"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add page</span>
              </button>
            </div>
          </aside>
        )}

        {/* MAIN CANVAS */}
        <div className="flex-1 overflow-y-auto px-4 sm:px-10 md:px-16 lg:px-24 py-6 max-w-4xl mx-auto w-full space-y-6 bg-background text-foreground custom-scrollbar">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground cursor-pointer transition-colors w-fit">
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
                className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-foreground bg-transparent border-b border-primary focus:outline-none w-full pb-1"
                autoFocus
              />
            ) : (
              <h1
                onClick={() => setIsEditingTitle(true)}
                className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-foreground hover:opacity-90 cursor-text transition-opacity flex items-center gap-2"
                title="Click to edit title"
              >
                <span>{title || 'Untitled'}</span>
                <Edit3 className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
              </h1>
            )}
          </div>

          {/* Subtitle / Author Info */}
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground pb-3 border-b border-border">
            <div className="w-5 h-5 rounded-full bg-primary/15 text-primary flex items-center justify-center font-bold text-[10px]">
              {(currentDoc?.authorName || user?.firstName || 'A').charAt(0).toUpperCase()}
            </div>
            <span className="font-semibold text-foreground">
              {currentDoc?.authorName || user?.displayName || user?.firstName || 'anandu'}
            </span>
            <span>•</span>
            <span suppressHydrationWarning>
              Last updated Today at{' '}
              {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
            <span>•</span>
            <span className="text-[11px] text-emerald-500 font-medium flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> Auto-saved to Cloud
            </span>
          </div>

          {/* Quick Action Pills (Start writing | Blank wiki | Write with AI) */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleStartWriting}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-card hover:bg-muted text-xs font-semibold text-foreground border border-border transition-all cursor-pointer shadow-2xs"
            >
              <FileText className="w-3.5 h-3.5 text-sky-500" />
              <span>Start writing</span>
            </button>

            <button
              type="button"
              onClick={() => {
                const wikiSnippet = `\n\n## Overview\nHigh-level summary of the architectural vision and sprint goals.\n\n## Key Requirements\n1. Resilient system architecture\n2. Real-time synchronisation\n`
                setContent((prev) => (prev ? prev + wikiSnippet : wikiSnippet.trimStart()))
                showToast('Inserted Wiki template')
              }}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-card hover:bg-muted text-xs font-semibold text-foreground border border-border transition-all cursor-pointer shadow-2xs"
            >
              <BookOpen className="w-3.5 h-3.5 text-emerald-500" />
              <span>Blank wiki</span>
            </button>

            <button
              type="button"
              onClick={() => {
                const aiSnippet = `\n\n### 🤖 AI Summary & Action Plan\n- Refactor legacy endpoints for 3x performance gains\n- Implement automated tests for payment flow\n`
                setContent((prev) => (prev ? prev + aiSnippet : aiSnippet.trimStart()))
                showToast('Inserted AI template')
              }}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-purple-500/10 hover:bg-purple-500/20 text-xs font-semibold text-purple-600 dark:text-purple-300 border border-purple-500/20 transition-all cursor-pointer shadow-2xs"
            >
              <Sparkles className="w-3.5 h-3.5 text-purple-500" />
              <span>Write with AI</span>
            </button>
          </div>

          {/* ADD NEW SECTION (Table | Column | ClickUp List | Subpage) */}
          <div className="space-y-2 pt-1 relative">
            <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Add new</p>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handleInsertTable}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-card hover:bg-muted text-xs font-medium text-foreground border border-border transition-all cursor-pointer shadow-2xs"
              >
                <TableIcon className="w-3.5 h-3.5 text-muted-foreground" />
                <span>Table</span>
              </button>

              {/* Column button triggers Popover */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowColumnsPopover(!showColumnsPopover)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-card hover:bg-muted text-xs font-medium text-foreground border border-border transition-all cursor-pointer shadow-2xs"
                >
                  <Columns3 className="w-3.5 h-3.5 text-muted-foreground" />
                  <span>Column</span>
                </button>

                {showColumnsPopover && (
                  <div className="absolute left-0 top-full mt-2 w-48 rounded-2xl bg-card border border-border p-2 shadow-2xl z-50 animate-scale-in text-xs space-y-1">
                    <p className="px-2 py-1 text-[10px] font-bold text-muted-foreground uppercase">/Columns</p>
                    {[2, 3, 4, 5].map((cols) => (
                      <button
                        key={cols}
                        type="button"
                        onClick={() => handleInsertColumns(cols)}
                        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-foreground hover:bg-muted text-left transition-colors font-medium cursor-pointer"
                      >
                        <span className="font-mono text-primary font-bold">[{'|'.repeat(cols)}]</span>
                        <span>{cols} Columns</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* ClickUp List triggers Modal */}
              <button
                type="button"
                onClick={() => setShowClickUpListModal(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-card hover:bg-muted text-xs font-medium text-foreground border border-border transition-all cursor-pointer shadow-2xs"
              >
                <CheckSquare className="w-3.5 h-3.5 text-muted-foreground" />
                <span>ClickUp List</span>
              </button>

              {/* Subpage button */}
              <button
                type="button"
                onClick={handleCreateSubpage}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-card hover:bg-muted text-xs font-medium text-foreground border border-border transition-all cursor-pointer shadow-2xs"
              >
                <FilePlus className="w-3.5 h-3.5 text-muted-foreground" />
                <span>Subpage</span>
              </button>
            </div>
          </div>

          {/* Subpages List on Document Canvas */}
          {!activeSubpageId && activeSubpages.length > 0 && (
            <div className="pt-2 pb-2">
              <p className="text-xs font-bold text-muted-foreground mb-2">Subpages ({activeSubpages.length})</p>
              <div className="space-y-1.5">
                {activeSubpages.map((sub) => (
                  <div
                    key={sub.id}
                    onClick={() => {
                      setActiveSubpageId(sub.id)
                      setTitle(sub.title)
                      setContent(sub.content)
                    }}
                    className="flex items-center justify-between p-3 rounded-2xl bg-card hover:bg-muted/50 border border-border transition-all cursor-pointer group shadow-2xs"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <FilePlus className="w-4 h-4 text-purple-500 shrink-0" />
                      <span className="text-xs font-semibold text-foreground group-hover:text-primary transition-colors truncate">
                        {sub.title}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <div className="w-5 h-5 rounded-full bg-purple-500/20 text-purple-600 dark:text-purple-300 flex items-center justify-center text-[10px] font-bold">
                        A
                      </div>
                      <ChevronRight className="w-3.5 h-3.5 text-muted-foreground group-hover:text-foreground" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Interactive Editable Content Area with Word & Docs Visual Tables, Columns, Checklists */}
          <div className="pt-2">
            <DocVisualEditor
              content={content}
              onChange={(newVal) => setContent(newVal)}
              onOpenTableModal={() => setIsTableModalOpen(true)}
              onOpenColumnsModal={() => setShowColumnsPopover(true)}
              onOpenChecklistModal={() => setShowClickUpListModal(true)}
            />
          </div>
        </div>

        {/* Mobile Backdrop for Settings Drawer */}
        {isSettingsOpen && (
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-xs z-40 md:hidden animate-fade-in"
            onClick={() => setIsSettingsOpen(false)}
          />
        )}

        {/* SETTINGS RIGHT DRAWER */}
        {isSettingsOpen && (
          <aside className="fixed md:static inset-y-0 right-0 z-50 md:z-auto w-72 border-l border-border bg-card flex flex-col shrink-0 select-none shadow-2xl md:shadow-none animate-slide-left">
            {/* Header */}
            <div className="p-3 border-b border-border flex items-center justify-between">
              <span className="text-xs font-bold text-foreground">Settings</span>
              <button
                type="button"
                onClick={() => setIsSettingsOpen(false)}
                className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Tabs: Entire Doc | This page */}
            <div className="p-2 border-b border-border">
              <div className="flex items-center p-0.5 rounded-xl bg-muted">
                <button
                  type="button"
                  onClick={() => setSettingsTab('entire')}
                  className={`flex-1 py-1 text-xs font-semibold rounded-lg transition-all ${
                    settingsTab === 'entire' ? 'bg-primary text-primary-foreground shadow-xs' : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  Entire Doc
                </button>
                <button
                  type="button"
                  onClick={() => setSettingsTab('page')}
                  className={`flex-1 py-1 text-xs font-semibold rounded-lg transition-all ${
                    settingsTab === 'page' ? 'bg-primary text-primary-foreground shadow-xs' : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  This page
                </button>
              </div>
            </div>

            {/* Settings Options List */}
            <div className="flex-1 overflow-y-auto p-2 space-y-1 text-xs text-foreground">
              <button
                type="button"
                onClick={() => setIsEditingTitle(true)}
                className="w-full flex items-center justify-between px-3 py-2 rounded-xl hover:bg-muted text-left transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-2.5">
                  <Edit3 className="w-3.5 h-3.5 text-muted-foreground" />
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
                className="w-full flex items-center justify-between px-3 py-2 rounded-xl hover:bg-muted text-left transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-2.5">
                  <Copy className="w-3.5 h-3.5 text-muted-foreground" />
                  <span>Copy link</span>
                </div>
              </button>

              <button
                type="button"
                onClick={() => {
                  if (currentDoc) updateDoc(currentDoc.id, { starred: !currentDoc.starred })
                }}
                className="w-full flex items-center justify-between px-3 py-2 rounded-xl hover:bg-muted text-left transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-2.5">
                  <Star className={`w-3.5 h-3.5 ${currentDoc?.starred ? 'text-amber-500 fill-current' : 'text-muted-foreground'}`} />
                  <span>Favorite</span>
                </div>
              </button>

              <div className="my-1.5 border-t border-border" />

              {/* Toggles */}
              <div className="px-3 py-2 rounded-xl flex items-center justify-between">
                <span className="text-foreground">Protect Doc</span>
                <input
                  type="checkbox"
                  checked={isProtected}
                  onChange={(e) => setIsProtected(e.target.checked)}
                  className="rounded accent-primary cursor-pointer w-4 h-4"
                />
              </div>

              <div className="px-3 py-2 rounded-xl flex items-center justify-between">
                <span className="text-foreground">Public sharing</span>
                <input
                  type="checkbox"
                  checked={isPublic}
                  onChange={(e) => setIsPublic(e.target.checked)}
                  className="rounded accent-primary cursor-pointer w-4 h-4"
                />
              </div>

              <div className="px-3 py-2 rounded-xl flex items-center justify-between">
                <span className="text-foreground">Mark Doc as wiki</span>
                <input
                  type="checkbox"
                  checked={isWiki}
                  onChange={(e) => setIsWiki(e.target.checked)}
                  className="rounded accent-primary cursor-pointer w-4 h-4"
                />
              </div>

              <div className="my-1.5 border-t border-border" />

              {/* Danger Actions */}
              <button
                type="button"
                onClick={() => setIsConfirmingDelete(true)}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-rose-500 hover:text-rose-600 hover:bg-rose-500/10 text-left transition-colors font-semibold cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete {activeSubpageId ? 'Page' : 'Document'}</span>
              </button>
            </div>
          </aside>
        )}
      </div>

      {/* CLICKUP LIST MODAL */}
      {showClickUpListModal && (
        <div className="fixed inset-0 z-[160] flex items-center justify-center bg-black/70 backdrop-blur-xs p-4 animate-fade-in" onClick={() => setShowClickUpListModal(false)}>
          <div className="bg-card border border-border rounded-3xl p-5 w-full max-w-md shadow-2xl space-y-4 animate-scale-in text-foreground" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between pb-2 border-b border-border">
              <div>
                <p className="text-[10px] font-bold text-muted-foreground uppercase">/ClickUp List (List)</p>
                <h3 className="text-sm font-bold text-foreground uppercase tracking-wider">ADD LIST OF TASKS</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowClickUpListModal(false)}
                className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Tabs: Search | Browse or New List */}
            <div className="flex items-center p-0.5 rounded-xl bg-muted">
              <button
                type="button"
                onClick={() => setClickUpTab('search')}
                className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                  clickUpTab === 'search' ? 'bg-primary text-primary-foreground shadow-xs' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Search
              </button>
              <button
                type="button"
                onClick={() => setClickUpTab('browse')}
                className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                  clickUpTab === 'browse' ? 'bg-primary text-primary-foreground shadow-xs' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Browse or New List
              </button>
            </div>

            {/* Filter Input */}
            <div className="relative">
              <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={clickUpSearchQuery}
                onChange={(e) => setClickUpSearchQuery(e.target.value)}
                placeholder="Filter by name..."
                className="w-full bg-muted/50 border border-border rounded-xl pl-9 pr-3 py-2 text-xs text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/30"
              />
            </div>
            <p className="text-[10px] text-muted-foreground italic">Paste URL or search List name</p>

            {/* List candidates */}
            <div className="space-y-1.5 max-h-48 overflow-y-auto custom-scrollbar">
              {['ChatApp Sprint Tasks', 'Frontend Layer Specs', 'Payment API Requirements', 'Backend Services'].map(
                (name) => (
                  <button
                    key={name}
                    type="button"
                    onClick={() => handleInsertClickUpList(name)}
                    className="w-full flex items-center justify-between p-2.5 rounded-xl bg-muted/40 hover:bg-muted text-left text-xs font-medium text-foreground transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-2">
                      <ListTodo className="w-3.5 h-3.5 text-primary" />
                      <span>{name}</span>
                    </div>
                    <span className="text-[10px] text-muted-foreground">Insert List</span>
                  </button>
                )
              )}
            </div>
          </div>
        </div>
      )}

      {/* SLASH COMMAND PALETTE */}
      {showSlashMenu && (
        <div className="fixed inset-0 z-[160] flex items-center justify-center bg-black/60 backdrop-blur-xs p-4" onClick={() => setShowSlashMenu(false)}>
          <div
            className="bg-card border border-border rounded-2xl p-2 w-full max-w-sm shadow-2xl space-y-1 animate-scale-in text-xs max-h-96 overflow-y-auto custom-scrollbar text-foreground"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="px-3 py-1.5 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">/search suggestions</p>
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
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-foreground hover:bg-muted text-left transition-colors cursor-pointer"
              >
                <cmd.icon className="w-4 h-4 text-primary" />
                <span>{cmd.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {isConfirmingDelete && (
        <div className="fixed inset-0 z-[180] flex items-center justify-center bg-black/80 backdrop-blur-xs p-4 animate-fade-in" onClick={() => setIsConfirmingDelete(false)}>
          <div className="bg-card border border-border rounded-3xl p-6 w-full max-w-md shadow-2xl space-y-4 animate-scale-in text-foreground" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-rose-500/15 text-rose-500 flex items-center justify-center shrink-0 border border-rose-500/30">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-foreground">Delete {activeSubpageId ? 'Subpage' : 'Document'}</h3>
                <p className="text-xs text-muted-foreground">Permanent deletion confirmation</p>
              </div>
            </div>

            <p className="text-xs text-muted-foreground leading-relaxed">
              Are you sure you want to delete <strong className="text-foreground">&quot;{title}&quot;</strong>? This will remove it from your workspace. This action cannot be undone.
            </p>

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-border">
              <button
                type="button"
                onClick={() => setIsConfirmingDelete(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDelete}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition-all shadow-xs cursor-pointer"
              >
                Delete {activeSubpageId ? 'Page' : 'Doc'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Unsaved Changes Close Confirmation Modal */}
      {showClosePrompt && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-xs p-4 animate-fade-in" onClick={() => setShowClosePrompt(false)}>
          <div className="bg-card border border-border rounded-3xl p-6 w-full max-w-md shadow-2xl space-y-4 animate-scale-in text-foreground" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-500/15 text-amber-500 flex items-center justify-center shrink-0 border border-amber-500/30">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-foreground">Save Changes?</h3>
                <p className="text-xs text-muted-foreground">Unsaved document modifications</p>
              </div>
            </div>

            <p className="text-xs text-muted-foreground leading-relaxed">
              You have unsaved changes in <strong className="text-foreground">&quot;{title || 'Untitled Doc'}&quot;</strong>. Do you want to save them before closing?
            </p>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
              <button
                type="button"
                onClick={() => setShowClosePrompt(false)}
                className="px-3.5 py-2 rounded-xl text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowClosePrompt(false)
                  onClose()
                }}
                className="px-3.5 py-2 rounded-xl text-xs font-semibold text-rose-500 hover:bg-rose-500/10 transition-colors cursor-pointer"
              >
                Discard & Close
              </button>
              <button
                type="button"
                onClick={async () => {
                  const success = await handleSaveToDocs()
                  if (success) {
                    setShowClosePrompt(false)
                    onClose()
                  }
                }}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all shadow-xs cursor-pointer flex items-center gap-1.5"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Save & Close</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Duplicate Document Name Warning Modal */}
      {duplicateWarning && (
        <div className="fixed inset-0 z-[210] flex items-center justify-center bg-black/80 backdrop-blur-xs p-4 animate-fade-in" onClick={() => setDuplicateWarning(null)}>
          <div className="bg-card border border-amber-500/40 rounded-3xl p-6 w-full max-w-md shadow-2xl space-y-4 animate-scale-in text-foreground" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-500/15 text-amber-500 flex items-center justify-center shrink-0 border border-amber-500/30">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-foreground">Document Name Already Exists</h3>
                <p className="text-xs text-amber-500 font-medium">Please enter a unique name</p>
              </div>
            </div>

            <p className="text-xs text-muted-foreground leading-relaxed">
              A document with the name <strong className="text-foreground">&quot;{title}&quot;</strong> already exists in this workspace. Please enter a different name for your document to save:
            </p>

            <div className="space-y-1.5">
              <input
                type="text"
                value={renameInput}
                onChange={(e) => setRenameInput(e.target.value)}
                placeholder="Enter new document name..."
                className="w-full px-3.5 py-2.5 rounded-xl bg-muted/50 border border-border text-xs text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/30"
                autoFocus
              />
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-border">
              <button
                type="button"
                onClick={() => setDuplicateWarning(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!renameInput.trim() || renameInput.trim().toLowerCase() === title.trim().toLowerCase()}
                onClick={async () => {
                  const newT = renameInput.trim()
                  setTitle(newT)
                  setDuplicateWarning(null)
                  setTimeout(() => {
                    handleSaveToDocs(newT)
                  }, 50)
                }}
                className="px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-bold hover:bg-primary/90 transition-all shadow-xs disabled:opacity-50 cursor-pointer"
              >
                Rename & Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Share Document Modal */}
      {showShareModal && (
        <div className="fixed inset-0 z-[190] flex items-center justify-center bg-black/80 backdrop-blur-xs p-4 animate-fade-in" onClick={() => setShowShareModal(false)}>
          <div className="bg-card border border-border rounded-3xl p-6 w-full max-w-md shadow-2xl space-y-4 animate-scale-in text-foreground" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-sky-500/15 text-sky-500 flex items-center justify-center shrink-0 border border-sky-500/30">
                  <Share2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-foreground">Share Document</h3>
                  <p className="text-xs text-muted-foreground">&quot;{title || 'Untitled Doc'}&quot;</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowShareModal(false)}
                className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-muted-foreground">
              Your document has been saved with the latest changes. Share the link or download a copy below.
            </p>

            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1.5">
                <LinkIcon className="w-3.5 h-3.5 text-sky-500" />
                <span>Document Share Link</span>
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={typeof window !== 'undefined' ? `${window.location.origin}/app/docs/${encodeURIComponent(currentDoc?.id || docId)}` : ''}
                  className="w-full px-3 py-2 rounded-xl bg-muted/50 border border-border text-xs text-foreground select-all focus:outline-none font-mono"
                />
                <button
                  type="button"
                  onClick={() => {
                    const url = `${window.location.origin}/app/docs/${encodeURIComponent(currentDoc?.id || docId)}`
                    navigator.clipboard?.writeText(url)
                    showToast('Link copied to clipboard!')
                  }}
                  className="px-3.5 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-bold hover:bg-primary/90 transition-all shrink-0 flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy</span>
                </button>
              </div>
            </div>

            {/* Download Document options */}
            <div className="space-y-2 pt-2 border-t border-border">
              <label className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1.5">
                <Download className="w-3.5 h-3.5 text-emerald-500" />
                <span>Download Document</span>
              </label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => handleDownloadDoc('md')}
                  className="flex flex-col items-center justify-center p-2.5 rounded-xl bg-muted/40 hover:bg-muted border border-border text-foreground transition-all text-center group cursor-pointer"
                  title="Download as Markdown"
                >
                  <span className="text-xs font-bold text-sky-500 group-hover:scale-105 transition-transform">Markdown</span>
                  <span className="text-[10px] text-muted-foreground">.md</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleDownloadDoc('txt')}
                  className="flex flex-col items-center justify-center p-2.5 rounded-xl bg-muted/40 hover:bg-muted border border-border text-foreground transition-all text-center group cursor-pointer"
                  title="Download as Plain Text"
                >
                  <span className="text-xs font-bold text-amber-500 group-hover:scale-105 transition-transform">Plain Text</span>
                  <span className="text-[10px] text-muted-foreground">.txt</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleDownloadDoc('html')}
                  className="flex flex-col items-center justify-center p-2.5 rounded-xl bg-muted/40 hover:bg-muted border border-border text-foreground transition-all text-center group cursor-pointer"
                  title="Download as Web HTML"
                >
                  <span className="text-xs font-bold text-emerald-500 group-hover:scale-105 transition-transform">HTML Doc</span>
                  <span className="text-[10px] text-muted-foreground">.html</span>
                </button>
              </div>
            </div>

            <div className="flex items-center justify-end pt-2 border-t border-border">
              <button
                type="button"
                onClick={() => setShowShareModal(false)}
                className="px-4 py-1.5 rounded-xl bg-muted hover:bg-muted/80 text-foreground text-xs font-semibold cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TABLE TEMPLATE SELECTOR MODAL (Word & Google Docs styles) */}
      <TableTemplateModal
        isOpen={isTableModalOpen}
        onClose={() => setIsTableModalOpen(false)}
        onSelectTemplate={handleSelectTableTemplate}
        onInsertCustomGrid={handleInsertCustomGrid}
      />
    </div>
  )

  return createPortal(modalContent, document.body)
}
