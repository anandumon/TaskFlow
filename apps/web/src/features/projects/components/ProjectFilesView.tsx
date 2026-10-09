'use client'

import React, { useState, useMemo, useRef } from 'react'
import {
  FileText,
  FileCode,
  FileSpreadsheet,
  Image as ImageIcon,
  Archive,
  Film,
  File,
  Download,
  Eye,
  Edit2,
  Trash2,
  Upload,
  Search,
  Plus,
  Lock,
  ShieldAlert,
  AlertTriangle,
  X,
  Check,
  FolderOpen,
  Calendar,
  User,
  LayoutGrid,
  List,
  Sparkles,
  Info,
  ExternalLink,
  ChevronRight,
  HardDrive,
} from 'lucide-react'
import {
  ProjectFileItem,
  formatFileSize,
  getFileTypeCategory,
  downloadFile,
  addDirectProjectFile,
  updateProjectFile,
  deleteProjectFile,
} from '@/lib/project-files'
import { FileViewerModal, FileToView } from '@/components/file-viewer-modal'
import { Task } from '@/stores/task-store'
import { Project } from '@/types'

interface ProjectFilesViewProps {
  project: Project
  files: ProjectFileItem[]
  tasks: Task[]
  canManageFiles: boolean
  onUpdateTask: (id: string, updates: Partial<Task>) => Promise<any>
  onFilesChanged?: () => void
  onNavigateToTask?: (taskId: string) => void
}

export function ProjectFilesView({
  project,
  files,
  tasks,
  canManageFiles,
  onUpdateTask,
  onFilesChanged,
  onNavigateToTask,
}: ProjectFilesViewProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [viewStyle, setViewStyle] = useState<'grid' | 'table'>('grid')

  // Modal states
  const [activeFileToView, setActiveFileToView] = useState<FileToView | null>(null)
  const [editingFile, setEditingFile] = useState<ProjectFileItem | null>(null)
  const [editFileName, setEditFileName] = useState('')
  const [editFileNotes, setEditFileNotes] = useState('')
  const [isSavingEdit, setIsSavingEdit] = useState(false)

  const [deletingFile, setDeletingFile] = useState<ProjectFileItem | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const [permissionDeniedAction, setPermissionDeniedAction] = useState<'edit' | 'delete' | null>(null)

  // Direct upload modal
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false)
  const [uploadFileQueue, setUploadFileQueue] = useState<{
    name: string
    size: number
    type: string
    dataUrl: string
    notes?: string
  }[]>([])
  const [isUploading, setIsUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Toast feedback
  const [toastMsg, setToastMsg] = useState<string | null>(null)
  const showToast = (msg: string) => {
    setToastMsg(msg)
    setTimeout(() => setToastMsg(null), 3000)
  }

  // Filtered files
  const filteredFiles = useMemo(() => {
    return files.filter((file) => {
      // Search
      const q = searchQuery.toLowerCase().trim()
      if (q) {
        const matchesName = file.name.toLowerCase().includes(q)
        const matchesTask = (file.taskTitle || '').toLowerCase().includes(q)
        const matchesSubtask = (file.subtaskTitle || '').toLowerCase().includes(q)
        const matchesUploader = (file.uploadedBy || '').toLowerCase().includes(q)
        const matchesNotes = (file.notes || '').toLowerCase().includes(q)
        if (!matchesName && !matchesTask && !matchesSubtask && !matchesUploader && !matchesNotes) {
          return false
        }
      }

      // Category
      if (selectedCategory !== 'all') {
        const cat = getFileTypeCategory(file.name, file.type)
        if (selectedCategory === 'doc' && cat !== 'doc') return false
        if (selectedCategory === 'code' && cat !== 'code') return false
        if (selectedCategory === 'sheet' && cat !== 'sheet') return false
        if (selectedCategory === 'media' && cat !== 'media' && cat !== 'image') return false
        if (selectedCategory === 'archive' && cat !== 'archive') return false
      }

      return true
    })
  }, [files, searchQuery, selectedCategory])

  // Statistics
  const stats = useMemo(() => {
    const totalSize = files.reduce((acc, f) => acc + (f.size || 0), 0)
    const taskAttachedCount = files.filter((f) => f.sourceType !== 'project_file').length
    const projectDirectCount = files.filter((f) => f.sourceType === 'project_file').length
    return {
      totalCount: files.length,
      totalSize: formatFileSize(totalSize),
      taskAttachedCount,
      projectDirectCount,
    }
  }, [files])

  // Icon selector based on file category
  const renderFileIcon = (file: ProjectFileItem, sizeCls = 'w-5 h-5') => {
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

  // Handle Edit Click with Permission Check
  const handleInitiateEdit = (file: ProjectFileItem, e?: React.MouseEvent) => {
    e?.stopPropagation()
    if (!canManageFiles) {
      setPermissionDeniedAction('edit')
      return
    }
    setEditingFile(file)
    setEditFileName(file.name)
    setEditFileNotes(file.notes || '')
  }

  // Handle Delete Click with Permission Check
  const handleInitiateDelete = (file: ProjectFileItem, e?: React.MouseEvent) => {
    e?.stopPropagation()
    if (!canManageFiles) {
      setPermissionDeniedAction('delete')
      return
    }
    setDeletingFile(file)
  }

  // Confirm and Save Edit
  const handleSaveEdit = async () => {
    if (!editingFile) return
    if (!editFileName.trim()) {
      showToast('File name cannot be empty')
      return
    }

    try {
      setIsSavingEdit(true)
      await updateProjectFile(
        editingFile,
        {
          name: editFileName.trim(),
          notes: editFileNotes.trim(),
        },
        tasks,
        onUpdateTask
      )
      showToast(`Updated "${editFileName.trim()}" successfully`)
      setEditingFile(null)
      onFilesChanged?.()
    } catch (err: any) {
      showToast(err?.message || 'Failed to update file')
    } finally {
      setIsSavingEdit(false)
    }
  }

  // Confirm Delete
  const handleConfirmDelete = async () => {
    if (!deletingFile) return

    try {
      setIsDeleting(true)
      await deleteProjectFile(deletingFile, tasks, onUpdateTask)
      showToast(`Deleted "${deletingFile.name}" successfully`)
      setDeletingFile(null)
      onFilesChanged?.()
    } catch (err: any) {
      showToast(err?.message || 'Failed to delete file')
    } finally {
      setIsDeleting(false)
    }
  }

  // Handle File Input Selection
  const handleFilesChosen = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files
    if (!selected || selected.length === 0) return

    const readPromises: Promise<any>[] = []
    for (let i = 0; i < selected.length; i++) {
      const file = selected[i]
      readPromises.push(
        new Promise((resolve) => {
          const reader = new FileReader()
          reader.onload = (event) => {
            resolve({
              name: file.name,
              size: file.size,
              type: file.type || 'application/octet-stream',
              dataUrl: (event.target?.result as string) || '',
            })
          }
          reader.readAsDataURL(file)
        })
      )
    }

    Promise.all(readPromises).then((loaded) => {
      setUploadFileQueue((prev) => [...prev, ...loaded])
      setIsUploadModalOpen(true)
      if (fileInputRef.current) fileInputRef.current.value = ''
    })
  }

  // Submit Uploaded Files
  const handleSaveUploads = () => {
    if (uploadFileQueue.length === 0) return
    setIsUploading(true)

    try {
      for (const item of uploadFileQueue) {
        addDirectProjectFile(project.id, project.name, project.color, {
          name: item.name,
          size: item.size,
          type: item.type,
          dataUrl: item.dataUrl,
          uploadedBy: 'You',
          notes: item.notes,
        })
      }
      showToast(`Uploaded ${uploadFileQueue.length} file(s) to project`)
      setUploadFileQueue([])
      setIsUploadModalOpen(false)
      onFilesChanged?.()
    } catch (err: any) {
      showToast(err?.message || 'Failed to upload files')
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toastMsg && (
        <div className="fixed bottom-6 right-6 z-50 bg-zinc-900 border border-primary/40 text-white text-xs px-4 py-2.5 rounded-xl shadow-2xl flex items-center gap-2 animate-in fade-in slide-in-from-bottom-2">
          <Sparkles className="w-4 h-4 text-primary" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* TOP STATS & QUICK BANNER */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="bg-card/70 backdrop-blur-md border border-border/80 rounded-2xl p-4 flex items-center justify-between shadow-xs">
          <div>
            <div className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
              Total Project Files
            </div>
            <div className="text-2xl font-black text-foreground mt-1">{stats.totalCount}</div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
            <FolderOpen className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-card/70 backdrop-blur-md border border-border/80 rounded-2xl p-4 flex items-center justify-between shadow-xs">
          <div>
            <div className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
              Total Storage Used
            </div>
            <div className="text-2xl font-black text-foreground mt-1">{stats.totalSize}</div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400">
            <HardDrive className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-card/70 backdrop-blur-md border border-border/80 rounded-2xl p-4 flex items-center justify-between shadow-xs">
          <div>
            <div className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
              From Deliverables
            </div>
            <div className="text-2xl font-black text-emerald-400 mt-1">{stats.taskAttachedCount}</div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <FileSpreadsheet className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-card/70 backdrop-blur-md border border-border/80 rounded-2xl p-4 flex items-center justify-between shadow-xs">
          <div>
            <div className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
              Project Vault Files
            </div>
            <div className="text-2xl font-black text-purple-400 mt-1">{stats.projectDirectCount}</div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
            <Sparkles className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* CONTROLS BAR: SEARCH, CATEGORIES, UPLOAD, AND VIEW TOGGLE */}
      <div className="bg-card/80 backdrop-blur-md border border-border/80 rounded-2xl p-3.5 flex flex-col md:flex-row items-center justify-between gap-3 shadow-sm">
        {/* Search */}
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-muted-foreground absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search documents, code, deliverables..."
            className="w-full pl-9 pr-8 py-2 bg-background/80 border border-border rounded-xl text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-all font-medium"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Categories Chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto pb-1 md:pb-0 scrollbar-none">
          {[
            { id: 'all', label: 'All Files' },
            { id: 'doc', label: 'Docs & PDFs' },
            { id: 'code', label: 'Code & Data' },
            { id: 'sheet', label: 'Spreadsheets' },
            { id: 'media', label: 'Images & Media' },
            { id: 'archive', label: 'Archives' },
          ].map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                selectedCategory === cat.id
                  ? 'bg-primary text-white shadow-xs'
                  : 'bg-background/60 hover:bg-background border border-border text-muted-foreground hover:text-foreground'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Right side: View Toggle & Upload Button */}
        <div className="flex items-center gap-2.5 self-end md:self-auto shrink-0">
          <div className="flex items-center p-1 bg-background/80 rounded-xl border border-border">
            <button
              type="button"
              onClick={() => setViewStyle('grid')}
              className={`p-1.5 rounded-lg text-xs transition-all ${
                viewStyle === 'grid'
                  ? 'bg-card text-foreground shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
              title="Grid Cards View"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setViewStyle('table')}
              className={`p-1.5 rounded-lg text-xs transition-all ${
                viewStyle === 'table'
                  ? 'bg-card text-foreground shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
              title="Table List View"
            >
              <List className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Upload Button */}
          <div>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              className="hidden"
              onChange={handleFilesChosen}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-primary to-indigo-600 hover:brightness-110 text-white text-xs font-bold shadow-md transition-all active:scale-95 cursor-pointer whitespace-nowrap"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Upload Files</span>
            </button>
          </div>
        </div>
      </div>

      {/* MAIN FILES CONTENT: GRID OR TABLE */}
      {filteredFiles.length === 0 ? (
        <div className="bg-card/40 border border-dashed border-border rounded-2xl p-12 text-center flex flex-col items-center justify-center">
          <div className="w-14 h-14 rounded-2xl bg-muted/30 border border-border flex items-center justify-center text-muted-foreground mb-3">
            <FolderOpen className="w-7 h-7" />
          </div>
          <h3 className="text-base font-bold text-foreground">No documents or files found</h3>
          <p className="text-xs text-muted-foreground mt-1 max-w-md">
            {searchQuery
              ? `No files matching "${searchQuery}". Try adjusting your search or filters.`
              : `Upload project documents or attach files to deliverables in this project to see them here.`}
          </p>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary text-white text-xs font-bold hover:brightness-110 shadow-sm cursor-pointer"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Upload Document Now</span>
          </button>
        </div>
      ) : viewStyle === 'grid' ? (
        /* GRID VIEW */
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredFiles.map((file) => {
            const ext = (file.name.split('.').pop() || '').toUpperCase()

            return (
              <div
                key={file.id}
                onClick={() =>
                  setActiveFileToView({
                    name: file.name,
                    size: file.size,
                    type: file.type,
                    dataUrl: file.dataUrl,
                    uploadedAt: file.uploadedAt,
                    uploadedBy: file.uploadedBy,
                  })
                }
                className="group relative bg-card/70 hover:bg-card border border-border/80 hover:border-primary/50 rounded-2xl p-4 transition-all duration-200 hover:shadow-xl flex flex-col justify-between cursor-pointer"
              >
                <div>
                  {/* Card Header: Icon, Ext Badge, and Action Buttons */}
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div className="w-10 h-10 rounded-xl bg-background/80 border border-border/80 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                      {renderFileIcon(file, 'w-5 h-5')}
                    </div>

                    <div className="flex items-center gap-1 opacity-90 group-hover:opacity-100 transition-opacity">
                      {/* View / Open */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          setActiveFileToView({
                            name: file.name,
                            size: file.size,
                            type: file.type,
                            dataUrl: file.dataUrl,
                            uploadedAt: file.uploadedAt,
                            uploadedBy: file.uploadedBy,
                          })
                        }}
                        className="p-1.5 rounded-lg bg-background/80 hover:bg-primary/20 text-muted-foreground hover:text-primary border border-border hover:border-primary/40 transition-colors"
                        title="Open & View File Contents"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>

                      {/* Download */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          downloadFile(file.name, file.dataUrl)
                          showToast(`Downloading "${file.name}"`)
                        }}
                        className="p-1.5 rounded-lg bg-background/80 hover:bg-emerald-500/20 text-muted-foreground hover:text-emerald-400 border border-border hover:border-emerald-500/40 transition-colors"
                        title="Download File"
                      >
                        <Download className="w-3.5 h-3.5" />
                      </button>

                      {/* Edit */}
                      <button
                        type="button"
                        onClick={(e) => handleInitiateEdit(file, e)}
                        className={`p-1.5 rounded-lg border transition-colors ${
                          canManageFiles
                            ? 'bg-background/80 hover:bg-amber-500/20 text-muted-foreground hover:text-amber-400 border-border hover:border-amber-500/40'
                            : 'bg-background/40 text-muted-foreground/40 border-border/40 hover:bg-rose-500/10 hover:text-rose-400'
                        }`}
                        title={
                          canManageFiles
                            ? 'Edit / Rename Document'
                            : 'Permission Required: Only project editors can edit files'
                        }
                      >
                        {canManageFiles ? <Edit2 className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
                      </button>

                      {/* Delete */}
                      <button
                        type="button"
                        onClick={(e) => handleInitiateDelete(file, e)}
                        className={`p-1.5 rounded-lg border transition-colors ${
                          canManageFiles
                            ? 'bg-background/80 hover:bg-rose-500/20 text-muted-foreground hover:text-rose-400 border-border hover:border-rose-500/40'
                            : 'bg-background/40 text-muted-foreground/40 border-border/40 hover:bg-rose-500/10 hover:text-rose-400'
                        }`}
                        title={
                          canManageFiles
                            ? 'Delete Document'
                            : 'Permission Required: Only project editors can delete files'
                        }
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* File Name */}
                  <div className="font-bold text-sm text-foreground truncate group-hover:text-primary transition-colors" title={file.name}>
                    {file.name}
                  </div>

                  {/* Size & Extension badge */}
                  <div className="flex items-center gap-2 mt-1.5 text-[11px] text-muted-foreground">
                    <span className="font-semibold text-foreground/80">{formatFileSize(file.size)}</span>
                    <span>•</span>
                    <span className="px-1.5 py-0.2 rounded bg-muted/60 text-[10px] font-bold text-muted-foreground uppercase border border-border">
                      {ext || 'FILE'}
                    </span>
                  </div>

                  {/* Origin Badge */}
                  <div className="mt-3">
                    {file.sourceType === 'task_attachment' && file.taskId ? (
                      <div
                        onClick={(e) => {
                          e.stopPropagation()
                          onNavigateToTask?.(file.taskId!)
                        }}
                        className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg bg-primary/10 border border-primary/20 text-primary text-[10px] font-semibold max-w-full truncate hover:bg-primary/20 transition-colors"
                        title={`Attached to deliverable: ${file.taskTitle}`}
                      >
                        <span className="truncate">Deliverable: {file.taskTitle}</span>
                        <ChevronRight className="w-2.5 h-2.5 shrink-0" />
                      </div>
                    ) : file.sourceType === 'subtask_attachment' && file.taskId ? (
                      <div
                        onClick={(e) => {
                          e.stopPropagation()
                          onNavigateToTask?.(file.taskId!)
                        }}
                        className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-[10px] font-semibold max-w-full truncate hover:bg-indigo-500/20 transition-colors"
                        title={`Attached to subtask: ${file.subtaskTitle}`}
                      >
                        <span className="truncate">Subtask: {file.subtaskTitle}</span>
                        <ChevronRight className="w-2.5 h-2.5 shrink-0" />
                      </div>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-purple-500/10 border border-purple-500/20 text-purple-400 text-[10px] font-semibold">
                        <Sparkles className="w-2.5 h-2.5" /> Project Vault
                      </span>
                    )}
                  </div>

                  {/* Notes / Description preview */}
                  {file.notes && (
                    <p className="mt-2 text-[11px] text-muted-foreground line-clamp-2 italic bg-background/40 p-1.5 rounded-lg border border-border/40">
                      &quot;{file.notes}&quot;
                    </p>
                  )}
                </div>

                {/* Footer: Date & Uploader */}
                <div className="mt-4 pt-3 border-t border-border/60 flex items-center justify-between text-[11px] text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    <span>{new Date(file.uploadedAt).toLocaleDateString()}</span>
                  </div>
                  {file.uploadedBy && (
                    <div className="flex items-center gap-1 truncate max-w-[100px]" title={file.uploadedBy}>
                      <User className="w-3 h-3" />
                      <span className="truncate">{file.uploadedBy}</span>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        /* TABLE / LIST VIEW */
        <div className="bg-card/70 border border-border/80 rounded-2xl overflow-hidden shadow-lg">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-border bg-background/50 text-muted-foreground font-semibold">
                <tr>
                  <th className="py-3 px-4">Document / File Name</th>
                  <th className="py-3 px-4">Origin / Deliverable</th>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4">Size</th>
                  <th className="py-3 px-4">Uploaded</th>
                  <th className="py-3 px-4">Author</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {filteredFiles.map((file) => {
                  const ext = (file.name.split('.').pop() || '').toUpperCase()

                  return (
                    <tr
                      key={file.id}
                      onClick={() =>
                        setActiveFileToView({
                          name: file.name,
                          size: file.size,
                          type: file.type,
                          dataUrl: file.dataUrl,
                          uploadedAt: file.uploadedAt,
                          uploadedBy: file.uploadedBy,
                        })
                      }
                      className="hover:bg-accent/40 transition-colors cursor-pointer group"
                    >
                      {/* Name & Icon */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-background/80 border border-border flex items-center justify-center shrink-0">
                            {renderFileIcon(file, 'w-4 h-4')}
                          </div>
                          <div className="max-w-xs md:max-w-sm truncate">
                            <div className="font-semibold text-foreground group-hover:text-primary transition-colors truncate">
                              {file.name}
                            </div>
                            {file.notes && (
                              <div className="text-[10px] text-muted-foreground truncate">{file.notes}</div>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Origin */}
                      <td className="py-3 px-4">
                        {file.sourceType === 'task_attachment' && file.taskId ? (
                          <span
                            onClick={(e) => {
                              e.stopPropagation()
                              onNavigateToTask?.(file.taskId!)
                            }}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-primary/10 border border-primary/20 text-primary text-[11px] font-semibold hover:bg-primary/20 transition-colors"
                          >
                            <span>{file.taskTitle || 'Deliverable'}</span>
                          </span>
                        ) : file.sourceType === 'subtask_attachment' ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-[11px] font-semibold">
                            <span>Subtask: {file.subtaskTitle}</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-purple-500/10 border border-purple-500/20 text-purple-400 text-[11px] font-semibold">
                            Project Vault
                          </span>
                        )}
                      </td>

                      {/* Type Badge */}
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded bg-muted/60 border border-border text-[10px] font-bold text-muted-foreground uppercase">
                          {ext || 'FILE'}
                        </span>
                      </td>

                      {/* Size */}
                      <td className="py-3 px-4 font-medium text-foreground/80">
                        {formatFileSize(file.size)}
                      </td>

                      {/* Uploaded */}
                      <td className="py-3 px-4 text-muted-foreground">
                        {new Date(file.uploadedAt).toLocaleDateString()}
                      </td>

                      {/* Author */}
                      <td className="py-3 px-4 text-muted-foreground truncate max-w-[120px]">
                        {file.uploadedBy || 'Member'}
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
                          <button
                            type="button"
                            onClick={() =>
                              setActiveFileToView({
                                name: file.name,
                                size: file.size,
                                type: file.type,
                                dataUrl: file.dataUrl,
                                uploadedAt: file.uploadedAt,
                                uploadedBy: file.uploadedBy,
                              })
                            }
                            className="p-1.5 rounded-lg hover:bg-primary/20 text-muted-foreground hover:text-primary transition-colors"
                            title="Open & View File"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              downloadFile(file.name, file.dataUrl)
                              showToast(`Downloading "${file.name}"`)
                            }}
                            className="p-1.5 rounded-lg hover:bg-emerald-500/20 text-muted-foreground hover:text-emerald-400 transition-colors"
                            title="Download"
                          >
                            <Download className="w-3.5 h-3.5" />
                          </button>

                          <button
                            type="button"
                            onClick={(e) => handleInitiateEdit(file, e)}
                            className={`p-1.5 rounded-lg transition-colors ${
                              canManageFiles
                                ? 'hover:bg-amber-500/20 text-muted-foreground hover:text-amber-400'
                                : 'text-muted-foreground/40 hover:text-rose-400'
                            }`}
                            title={
                              canManageFiles
                                ? 'Edit / Rename'
                                : 'Permission Required to Edit'
                            }
                          >
                            {canManageFiles ? <Edit2 className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
                          </button>

                          <button
                            type="button"
                            onClick={(e) => handleInitiateDelete(file, e)}
                            className={`p-1.5 rounded-lg transition-colors ${
                              canManageFiles
                                ? 'hover:bg-rose-500/20 text-muted-foreground hover:text-rose-400'
                                : 'text-muted-foreground/40 hover:text-rose-400'
                            }`}
                            title={
                              canManageFiles
                                ? 'Delete'
                                : 'Permission Required to Delete'
                            }
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL 1: UNIVERSAL FILE VIEWER */}
      <FileViewerModal
        isOpen={Boolean(activeFileToView)}
        file={activeFileToView}
        onClose={() => setActiveFileToView(null)}
      />

      {/* MODAL 2: PERMISSION DENIED DIALOG */}
      {permissionDeniedAction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in">
          <div className="bg-card border border-rose-500/40 rounded-2xl p-6 max-w-md w-full shadow-2xl relative">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400 mb-4 mx-auto">
              <ShieldAlert className="w-6 h-6" />
            </div>

            <h3 className="text-lg font-bold text-center text-foreground">
              Permission Required
            </h3>
            <p className="text-xs text-muted-foreground text-center mt-2 leading-relaxed">
              You do not have permission to {permissionDeniedAction} files in this project. Only users with edit
              access to this project (Project Owner, Workspace Admin, or Editor) can modify or delete files.
            </p>

            <div className="mt-6 flex justify-center">
              <button
                type="button"
                onClick={() => setPermissionDeniedAction(null)}
                className="px-5 py-2.5 rounded-xl bg-card border border-border hover:bg-accent text-xs font-bold text-foreground transition-all cursor-pointer shadow-sm"
              >
                Understood
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: EDIT FILE MODAL */}
      {editingFile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in">
          <div className="bg-card border border-border rounded-2xl p-6 max-w-lg w-full shadow-2xl relative">
            <button
              type="button"
              onClick={() => setEditingFile(null)}
              className="absolute right-4 top-4 p-1.5 rounded-xl text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
                <Edit2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-foreground">Edit Document Details</h3>
                <p className="text-xs text-muted-foreground">
                  Update file name and metadata for this project document.
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1.5">
                  File Name
                </label>
                <input
                  type="text"
                  value={editFileName}
                  onChange={(e) => setEditFileName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-background border border-border rounded-xl text-xs text-foreground focus:outline-none focus:border-primary font-medium transition-all"
                  placeholder="e.g. Project_Specification.pdf"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1.5">
                  Notes / Description (Optional)
                </label>
                <textarea
                  rows={3}
                  value={editFileNotes}
                  onChange={(e) => setEditFileNotes(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-background border border-border rounded-xl text-xs text-foreground focus:outline-none focus:border-primary font-medium transition-all resize-none"
                  placeholder="Add details, release notes, or version info..."
                />
              </div>

              <div className="p-3 rounded-xl bg-background/60 border border-border/60 flex items-center justify-between text-xs text-muted-foreground">
                <span>File Size: <b className="text-foreground">{formatFileSize(editingFile.size)}</b></span>
                <span>Origin: <b className="text-foreground">{editingFile.taskTitle || 'Project Vault'}</b></span>
              </div>
            </div>

            <div className="mt-6 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setEditingFile(null)}
                className="px-4 py-2 rounded-xl border border-border text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-accent transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveEdit}
                disabled={isSavingEdit}
                className="px-5 py-2 rounded-xl bg-primary hover:brightness-110 text-white text-xs font-bold transition-all shadow-md active:scale-95 disabled:opacity-50 cursor-pointer"
              >
                {isSavingEdit ? 'Saving Changes...' : 'Confirm & Save'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 4: DELETE FILE CONFIRMATION MODAL */}
      {deletingFile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in">
          <div className="bg-card border border-rose-500/40 rounded-2xl p-6 max-w-md w-full shadow-2xl relative">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400 mb-4 mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>

            <h3 className="text-base font-bold text-center text-foreground">
              Delete Document Confirmation
            </h3>

            <p className="text-xs text-muted-foreground text-center mt-2 leading-relaxed">
              Are you sure you want to permanently delete <b className="text-foreground">&quot;{deletingFile.name}&quot;</b>?
            </p>

            {deletingFile.taskTitle && (
              <div className="mt-3 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
                <span>
                  This file is attached to deliverable <b>{deletingFile.taskTitle}</b>. Deleting it will also remove it from that deliverable.
                </span>
              </div>
            )}

            <p className="text-[11px] text-muted-foreground/80 text-center mt-3">
              This action cannot be undone.
            </p>

            <div className="mt-6 flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => setDeletingFile(null)}
                className="px-4 py-2 rounded-xl border border-border text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-accent transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={isDeleting}
                className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition-all shadow-md active:scale-95 disabled:opacity-50 cursor-pointer"
              >
                {isDeleting ? 'Deleting...' : 'Permanently Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 5: UPLOAD QUEUE MODAL */}
      {isUploadModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in">
          <div className="bg-card border border-border rounded-2xl p-6 max-w-lg w-full shadow-2xl relative">
            <button
              type="button"
              onClick={() => {
                setIsUploadModalOpen(false)
                setUploadFileQueue([])
              }}
              className="absolute right-4 top-4 p-1.5 rounded-xl text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
                <Upload className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-foreground">Upload to Project Vault</h3>
                <p className="text-xs text-muted-foreground">
                  Confirm the files to upload to project <b>{project.name}</b>.
                </p>
              </div>
            </div>

            {/* List of files in queue */}
            <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1">
              {uploadFileQueue.map((item, index) => (
                <div
                  key={index}
                  className="p-3 rounded-xl bg-background border border-border flex items-center justify-between gap-3 text-xs"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <FileText className="w-4 h-4 text-primary shrink-0" />
                    <div className="truncate">
                      <div className="font-semibold text-foreground truncate">{item.name}</div>
                      <div className="text-[10px] text-muted-foreground">{formatFileSize(item.size)}</div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      setUploadFileQueue((prev) => prev.filter((_, i) => i !== index))
                    }
                    className="p-1 rounded text-muted-foreground hover:text-rose-400"
                    title="Remove from upload queue"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>

            <div className="mt-5 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => {
                  setIsUploadModalOpen(false)
                  setUploadFileQueue([])
                }}
                className="px-4 py-2 rounded-xl border border-border text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-accent transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveUploads}
                disabled={isUploading || uploadFileQueue.length === 0}
                className="px-5 py-2 rounded-xl bg-primary hover:brightness-110 text-white text-xs font-bold transition-all shadow-md active:scale-95 disabled:opacity-50 cursor-pointer"
              >
                {isUploading ? 'Uploading...' : `Upload ${uploadFileQueue.length} File(s)`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
