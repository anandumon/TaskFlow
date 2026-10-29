'use client'

import { useState, useEffect, useMemo, useRef } from 'react'
import {
  MessageSquare,
  Copy,
  Check,
  Download,
  Edit2,
  Trash2,
  CheckSquare,
  Square,
  Code2,
  ChevronDown,
  X,
  Send,
  FileText,
  Clock,
  User,
  AlertCircle,
} from 'lucide-react'
import {
  parseNotes,
  serializeNotes,
  formatNotesForDownload,
  downloadNotesFile,
  ParsedNoteItem,
} from './notes-utils'

export interface NotesManagerProps {
  notes?: string
  contextTitle?: string
  contextId?: string
  contextType?: 'Task' | 'Subtask'
  onAddNote: (noteText: string) => Promise<void>
  onUpdateNotes?: (updatedNotes: string) => Promise<void>
  canEdit?: boolean
  placeholder?: string
}

export function NotesManager({
  notes = '',
  contextTitle = 'Task Notes',
  contextId,
  contextType = 'Task',
  onAddNote,
  onUpdateNotes,
  canEdit = true,
  placeholder = 'Add an engineering note or discussion update...',
}: NotesManagerProps) {
  // Parsed note items
  const parsedNotes = useMemo(() => parseNotes(notes), [notes])

  // Selection state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  // Note addition state
  const [newNoteInput, setNewNoteInput] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Note editing state (inline single note)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editBody, setEditBody] = useState('')
  const [editHeader, setEditHeader] = useState('')

  // Raw editor state
  const [isRawEditOpen, setIsRawEditOpen] = useState(false)
  const [rawEditText, setRawEditText] = useState('')

  // Copy feedback state
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [copiedBulk, setCopiedBulk] = useState(false)

  // Download menu state
  const [showDownloadMenu, setShowDownloadMenu] = useState(false)
  const downloadMenuRef = useRef<HTMLDivElement>(null)

  // Deletion confirm state
  const [itemToDelete, setItemToDelete] = useState<string | null>(null)

  // Close download menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (downloadMenuRef.current && !downloadMenuRef.current.contains(e.target as Node)) {
        setShowDownloadMenu(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Prune selection if items change
  useEffect(() => {
    const validIds = new Set(parsedNotes.map((n) => n.id))
    setSelectedIds((prev) => {
      const next = new Set<string>()
      prev.forEach((id) => {
        if (validIds.has(id)) next.add(id)
      })
      return next
    })
  }, [parsedNotes])

  // Toggle selection for one note
  const toggleSelectNote = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  // Toggle select all
  const isAllSelected = parsedNotes.length > 0 && selectedIds.size === parsedNotes.length
  const handleToggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(parsedNotes.map((n) => n.id)))
    }
  }

  // Determine active notes to operate on (either selected or all if none selected)
  const targetNotesForAction = useMemo(() => {
    if (selectedIds.size > 0) {
      return parsedNotes.filter((n) => selectedIds.has(n.id))
    }
    return parsedNotes
  }, [parsedNotes, selectedIds])

  // Copy single note
  const handleCopySingle = async (note: ParsedNoteItem) => {
    const textToCopy = note.header ? `[${note.header}] ${note.content}` : note.content
    try {
      await navigator.clipboard.writeText(textToCopy)
      setCopiedId(note.id)
      setTimeout(() => setCopiedId(null), 2000)
    } catch (err) {
      console.error('Failed to copy to clipboard', err)
    }
  }

  // Copy selected or all notes (aligned)
  const handleCopyBulk = async () => {
    if (targetNotesForAction.length === 0) return
    const formatted = formatNotesForDownload(
      targetNotesForAction,
      { title: contextTitle, id: contextId, type: contextType },
      'txt'
    )
    try {
      await navigator.clipboard.writeText(formatted)
      setCopiedBulk(true)
      setTimeout(() => setCopiedBulk(false), 2000)
    } catch (err) {
      console.error('Failed to copy to clipboard', err)
    }
  }

  // Download handler
  const handleDownload = (format: 'txt' | 'md' = 'txt') => {
    if (targetNotesForAction.length === 0) return
    const content = formatNotesForDownload(
      targetNotesForAction,
      { title: contextTitle, id: contextId, type: contextType },
      format
    )

    const cleanTitle = (contextTitle || 'notes')
      .replace(/[^a-zA-Z0-9_-]+/g, '_')
      .replace(/^_+|_+$/g, '')
      .slice(0, 40)
    const ext = format === 'md' ? 'md' : 'txt'
    const dateStr = new Date().toISOString().slice(0, 10)
    const filename = `${cleanTitle || 'task'}_notes_${dateStr}.${ext}`

    downloadNotesFile(content, filename, format === 'md' ? 'text/markdown;charset=utf-8' : 'text/plain;charset=utf-8')
    setShowDownloadMenu(false)
  }

  // Inline edit note
  const startEditNote = (note: ParsedNoteItem) => {
    setEditingId(note.id)
    setEditBody(note.content)
    setEditHeader(note.header || '')
  }

  const cancelEditNote = () => {
    setEditingId(null)
    setEditBody('')
    setEditHeader('')
  }

  const saveEditNote = async () => {
    if (!editingId || !onUpdateNotes) return
    const trimmed = editBody.trim()
    if (!trimmed) {
      // If content was cleared, delete note
      await handleDeleteNote(editingId)
      cancelEditNote()
      return
    }

    const updated = parsedNotes.map((item) => {
      if (item.id === editingId) {
        return {
          ...item,
          header: editHeader.trim() || item.header,
          content: trimmed,
        }
      }
      return item
    })

    const serialized = serializeNotes(updated)
    await onUpdateNotes(serialized)
    cancelEditNote()
  }

  // Delete note
  const handleDeleteNote = async (id: string) => {
    if (!onUpdateNotes) return
    const updated = parsedNotes.filter((item) => item.id !== id)
    const serialized = serializeNotes(updated)
    await onUpdateNotes(serialized)
    setItemToDelete(null)
  }

  // Raw editor open & save
  const openRawEditor = () => {
    setRawEditText(notes)
    setIsRawEditOpen(true)
  }

  const saveRawEditor = async () => {
    if (!onUpdateNotes) return
    await onUpdateNotes(rawEditText.trim())
    setIsRawEditOpen(false)
  }

  // Add new note
  const handleAddNewNote = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    const textToAdd = newNoteInput.trim()
    if (!textToAdd || isSubmitting) return

    setIsSubmitting(true)
    try {
      await onAddNote(textToAdd)
      setNewNoteInput('')
    } catch (err) {
      console.error('Failed to add note', err)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="space-y-4">
      {/* Top Toolbar (Selection, Copy, Download, Raw Edit) */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 pb-2 border-b border-border/50">
        <div className="flex items-center gap-2">
          {parsedNotes.length > 0 && (
            <button
              type="button"
              onClick={handleToggleSelectAll}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
              title={isAllSelected ? 'Deselect all notes' : 'Select all notes'}
            >
              {isAllSelected ? (
                <CheckSquare className="w-4 h-4 text-primary" />
              ) : selectedIds.size > 0 ? (
                <div className="w-4 h-4 rounded bg-primary/20 border border-primary flex items-center justify-center">
                  <div className="w-2 h-0.5 bg-primary rounded-full" />
                </div>
              ) : (
                <Square className="w-4 h-4 text-muted-foreground/70" />
              )}
              <span>
                {selectedIds.size > 0
                  ? `${selectedIds.size} of ${parsedNotes.length} Selected`
                  : `Select All (${parsedNotes.length})`}
              </span>
            </button>
          )}

          {selectedIds.size > 0 && (
            <button
              type="button"
              onClick={() => setSelectedIds(new Set())}
              className="text-[11px] text-muted-foreground hover:text-foreground underline decoration-dotted"
            >
              Clear
            </button>
          )}
        </div>

        <div className="flex items-center gap-1.5 ml-auto">
          {/* Copy Selected/All Button */}
          {parsedNotes.length > 0 && (
            <button
              type="button"
              onClick={handleCopyBulk}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-background hover:bg-muted border border-border text-xs font-medium text-foreground transition-all shadow-xs"
              title={selectedIds.size > 0 ? `Copy ${selectedIds.size} selected notes` : 'Copy all notes'}
            >
              {copiedBulk ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-500" />
                  <span className="text-emerald-500 font-semibold">Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-muted-foreground" />
                  <span>{selectedIds.size > 0 ? `Copy (${selectedIds.size})` : 'Copy Notes'}</span>
                </>
              )}
            </button>
          )}

          {/* Download Notes with Alignment */}
          {parsedNotes.length > 0 && (
            <div className="relative" ref={downloadMenuRef}>
              <div className="flex items-center rounded-lg border border-border shadow-xs overflow-hidden bg-background">
                <button
                  type="button"
                  onClick={() => handleDownload('txt')}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-muted transition-colors"
                  title="Download selected notes perfectly aligned in a single file"
                >
                  <Download className="w-3.5 h-3.5 text-primary" />
                  <span>
                    {selectedIds.size > 0 ? `Download (${selectedIds.size})` : 'Download Notes'}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowDownloadMenu((v) => !v)}
                  className="px-1.5 py-1.5 border-l border-border hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                  title="Choose export format"
                >
                  <ChevronDown className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Format selection dropdown */}
              {showDownloadMenu && (
                <div className="absolute right-0 mt-1 w-52 rounded-xl bg-card border border-border shadow-lg p-1.5 z-30 space-y-1 animate-fade-in text-xs">
                  <div className="px-2 py-1 text-[10px] font-bold text-muted-foreground uppercase">
                    Export {selectedIds.size > 0 ? `${selectedIds.size} Selected` : `All (${parsedNotes.length})`}
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDownload('txt')}
                    className="w-full flex items-center justify-between px-2.5 py-2 rounded-lg hover:bg-primary/10 hover:text-primary text-foreground text-left transition-colors"
                  >
                    <span className="flex items-center gap-2">
                      <FileText className="w-3.5 h-3.5 text-primary" />
                      <span>Aligned Text File</span>
                    </span>
                    <span className="text-[10px] uppercase font-mono text-muted-foreground">.txt</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDownload('md')}
                    className="w-full flex items-center justify-between px-2.5 py-2 rounded-lg hover:bg-primary/10 hover:text-primary text-foreground text-left transition-colors"
                  >
                    <span className="flex items-center gap-2">
                      <Code2 className="w-3.5 h-3.5 text-primary" />
                      <span>Markdown Report</span>
                    </span>
                    <span className="text-[10px] uppercase font-mono text-muted-foreground">.md</span>
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Raw Edit Toggle */}
          {canEdit && onUpdateNotes && parsedNotes.length > 0 && (
            <button
              type="button"
              onClick={openRawEditor}
              className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted border border-border/60 transition-colors"
              title="Edit full raw notes log"
            >
              <Code2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Raw Edit Mode Modal / Panel */}
      {isRawEditOpen && (
        <div className="p-4 rounded-2xl bg-card border-2 border-primary/30 shadow-md space-y-3 animate-fade-in">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-foreground flex items-center gap-2">
              <Code2 className="w-4 h-4 text-primary" /> Edit Full Notes Log
            </span>
            <button
              type="button"
              onClick={() => setIsRawEditOpen(false)}
              className="p-1 text-muted-foreground hover:text-foreground"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <p className="text-[11px] text-muted-foreground">
            Directly edit the raw notes log. You can add, remove, or modify timestamped entries and formatting.
          </p>
          <textarea
            value={rawEditText}
            onChange={(e) => setRawEditText(e.target.value)}
            rows={8}
            className="w-full p-3 rounded-xl bg-background border border-border text-xs text-foreground font-mono leading-relaxed focus:outline-none focus:ring-1 focus:ring-primary"
            placeholder="[timestamp] Note message..."
          />
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsRawEditOpen(false)}
              className="px-3 py-1.5 rounded-xl border border-border text-xs text-muted-foreground hover:text-foreground"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={saveRawEditor}
              className="px-4 py-1.5 rounded-xl bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90"
            >
              Save Changes
            </button>
          </div>
        </div>
      )}

      {/* Notes List / Empty State */}
      {parsedNotes.length === 0 ? (
        <div className="p-8 rounded-2xl bg-muted/20 border border-dashed border-border/70 text-center space-y-2">
          <MessageSquare className="w-8 h-8 mx-auto text-muted-foreground/40" />
          <p className="text-xs text-muted-foreground">
            No notes logged yet. Leave an engineering note, SQL query, or discussion update below!
          </p>
        </div>
      ) : (
        <div className="space-y-3 max-h-[480px] overflow-y-auto pr-1">
          {parsedNotes.map((note, idx) => {
            const isSelected = selectedIds.has(note.id)
            const isEditing = editingId === note.id

            return (
              <div
                key={note.id}
                className={`group relative p-3.5 sm:p-4 rounded-2xl border transition-all ${
                  isSelected
                    ? 'bg-primary/5 border-primary/40 shadow-xs'
                    : 'bg-muted/30 hover:bg-muted/40 border-border/70'
                }`}
              >
                {/* Note Header: Select Checkbox, Number, Timestamp, Author, and Action Buttons */}
                <div className="flex items-center justify-between gap-2 mb-2 pb-1.5 border-b border-border/40 text-xs">
                  <div className="flex items-center gap-2 flex-wrap">
                    {/* Selection Checkbox */}
                    <button
                      type="button"
                      onClick={() => toggleSelectNote(note.id)}
                      className="text-muted-foreground hover:text-primary transition-colors focus:outline-none"
                    >
                      {isSelected ? (
                        <CheckSquare className="w-4 h-4 text-primary" />
                      ) : (
                        <Square className="w-4 h-4 text-muted-foreground/60 group-hover:text-muted-foreground" />
                      )}
                    </button>

                    {/* Note Sequence Number */}
                    <span className="text-[10px] font-mono font-bold text-muted-foreground/80 px-1.5 py-0.5 rounded bg-background border border-border/50">
                      #{idx + 1}
                    </span>

                    {/* Timestamp Badge */}
                    {note.timestamp && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-mono text-muted-foreground bg-background/80 px-2 py-0.5 rounded-md border border-border/50">
                        <Clock className="w-3 h-3 text-primary/70" />
                        {note.timestamp}
                      </span>
                    )}

                    {/* Author Badge */}
                    {note.author && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-muted-foreground bg-background/80 px-2 py-0.5 rounded-md border border-border/50">
                        <User className="w-3 h-3 text-muted-foreground/70" />
                        {note.author}
                      </span>
                    )}
                  </div>

                  {/* Individual Note Actions */}
                  <div className="flex items-center gap-1">
                    {/* Copy Note */}
                    <button
                      type="button"
                      onClick={() => handleCopySingle(note)}
                      className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-background border border-transparent hover:border-border transition-colors"
                      title="Copy note content"
                    >
                      {copiedId === note.id ? (
                        <Check className="w-3.5 h-3.5 text-emerald-500" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>

                    {/* Edit Note */}
                    {canEdit && onUpdateNotes && !isEditing && (
                      <button
                        type="button"
                        onClick={() => startEditNote(note)}
                        className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-background border border-transparent hover:border-border transition-colors"
                        title="Edit this note"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                    )}

                    {/* Delete Note */}
                    {canEdit && onUpdateNotes && !isEditing && (
                      <button
                        type="button"
                        onClick={() => setItemToDelete(note.id)}
                        className="p-1.5 rounded-lg text-muted-foreground hover:text-rose-500 hover:bg-rose-500/10 border border-transparent hover:border-rose-500/20 transition-colors"
                        title="Delete note"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Delete Confirmation Overlay */}
                {itemToDelete === note.id && (
                  <div className="p-3 mb-2 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-between text-xs animate-fade-in">
                    <span className="text-rose-500 font-medium flex items-center gap-1.5">
                      <AlertCircle className="w-4 h-4 shrink-0" /> Delete this note permanently?
                    </span>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setItemToDelete(null)}
                        className="px-2 py-1 rounded bg-background border border-border text-[11px] text-foreground hover:bg-muted"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteNote(note.id)}
                        className="px-2 py-1 rounded bg-rose-500 text-white text-[11px] font-semibold hover:bg-rose-600"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                )}

                {/* Inline Editing Mode */}
                {isEditing ? (
                  <div className="space-y-2 mt-1 animate-fade-in">
                    <div className="flex gap-2 items-center">
                      <span className="text-[10px] font-bold text-muted-foreground uppercase">Header / Tag:</span>
                      <input
                        type="text"
                        value={editHeader}
                        onChange={(e) => setEditHeader(e.target.value)}
                        placeholder="Timestamp or tag..."
                        className="flex-1 px-2.5 py-1 rounded-lg bg-background border border-border text-xs text-foreground font-mono focus:outline-none focus:ring-1 focus:ring-primary"
                      />
                    </div>
                    <textarea
                      value={editBody}
                      onChange={(e) => setEditBody(e.target.value)}
                      rows={4}
                      className="w-full p-2.5 rounded-xl bg-background border border-primary text-xs text-foreground font-sans leading-relaxed focus:outline-none focus:ring-1 focus:ring-primary"
                      placeholder="Note content..."
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                          e.preventDefault()
                          saveEditNote()
                        } else if (e.key === 'Escape') {
                          cancelEditNote()
                        }
                      }}
                    />
                    <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                      <span>Ctrl+Enter to save, Esc to cancel</span>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={cancelEditNote}
                          className="px-2.5 py-1 rounded-lg border border-border text-xs text-muted-foreground hover:text-foreground"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={saveEditNote}
                          className="flex items-center gap-1 px-3 py-1 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90"
                        >
                          <Check className="w-3.5 h-3.5" /> Save
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  /* Note Content Body */
                  <div className="text-xs text-foreground whitespace-pre-wrap font-sans leading-relaxed break-words pl-0.5">
                    {note.content}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Add New Note Form */}
      {canEdit && (
        <form onSubmit={handleAddNewNote} className="space-y-2 pt-2">
          <div className="flex gap-2">
            <textarea
              placeholder={placeholder}
              value={newNoteInput}
              onChange={(e) => setNewNoteInput(e.target.value)}
              rows={2}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  handleAddNewNote()
                }
              }}
              className="flex-1 p-2.5 rounded-xl bg-background border border-border text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary font-sans leading-relaxed resize-y min-h-[42px]"
            />
            <button
              type="submit"
              disabled={!newNoteInput.trim() || isSubmitting}
              className="px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-all disabled:opacity-50 flex items-center justify-center gap-1.5 shrink-0 self-end h-[42px]"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Post Note</span>
            </button>
          </div>
          <div className="text-[10px] text-muted-foreground pl-1">
            Press Enter to post (Shift+Enter for multi-line)
          </div>
        </form>
      )}
    </div>
  )
}
