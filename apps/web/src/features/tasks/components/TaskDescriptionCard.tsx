'use client'

import React, { useState, useRef } from 'react'
import {
  FileText,
  FileSpreadsheet,
  FileCode,
  Key,
  Database,
  Archive,
  Image as ImageIcon,
  File,
  UploadCloud,
  Download,
  Trash2,
  Edit2,
  Check,
  X,
  Paperclip,
  Loader2,
  Shield,
  FileCheck,
} from 'lucide-react'
import { TaskAttachment } from '@/stores/task-store'

interface TaskDescriptionCardProps {
  description?: string
  attachments?: TaskAttachment[]
  canEdit: boolean
  onSaveDescription: (newDesc: string) => Promise<void>
  onSaveAttachments: (updated: TaskAttachment[]) => Promise<void>
  currentUserName?: string
}

export function TaskDescriptionCard({
  description = '',
  attachments = [],
  canEdit,
  onSaveDescription,
  onSaveAttachments,
  currentUserName = 'You',
}: TaskDescriptionCardProps) {
  const [isEditingDesc, setIsEditingDesc] = useState(false)
  const [descInput, setDescInput] = useState(description)
  const [isSavingDesc, setIsSavingDesc] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [isDragOver, setIsDragOver] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Sync state if props change when not actively editing
  React.useEffect(() => {
    if (!isEditingDesc) {
      setDescInput(description)
    }
  }, [description, isEditingDesc])

  const handleSaveDescSubmit = async () => {
    try {
      setIsSavingDesc(true)
      await onSaveDescription(descInput.trim())
      setIsEditingDesc(false)
    } finally {
      setIsSavingDesc(false)
    }
  }

  const formatFileSize = (bytes: number): string => {
    if (!bytes || bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`
  }

  const getFileIconAndBadge = (fileName: string, mimeType?: string) => {
    const ext = fileName?.split('.').pop()?.toLowerCase() || ''

    if (['pem', 'p12', 'crt', 'key', 'cer', 'jks'].includes(ext)) {
      return {
        icon: <Key className="w-5 h-5 text-amber-500 shrink-0" />,
        badgeColor: 'bg-amber-500/15 text-amber-500 border-amber-500/30',
        label: ext.toUpperCase() || 'CERT',
      }
    }
    if (['sql', 'db', 'sqlite'].includes(ext)) {
      return {
        icon: <Database className="w-5 h-5 text-purple-500 shrink-0" />,
        badgeColor: 'bg-purple-500/15 text-purple-500 border-purple-500/30',
        label: 'SQL',
      }
    }
    if (['xls', 'xlsx', 'csv'].includes(ext)) {
      return {
        icon: <FileSpreadsheet className="w-5 h-5 text-emerald-500 shrink-0" />,
        badgeColor: 'bg-emerald-500/15 text-emerald-600 border-emerald-500/30',
        label: ext.toUpperCase(),
      }
    }
    if (['pdf'].includes(ext)) {
      return {
        icon: <FileText className="w-5 h-5 text-rose-500 shrink-0" />,
        badgeColor: 'bg-rose-500/15 text-rose-600 border-rose-500/30',
        label: 'PDF',
      }
    }
    if (['doc', 'docx', 'txt', 'rtf', 'md', 'log'].includes(ext)) {
      return {
        icon: <FileText className="w-5 h-5 text-sky-500 shrink-0" />,
        badgeColor: 'bg-sky-500/15 text-sky-600 border-sky-500/30',
        label: ext.toUpperCase(),
      }
    }
    if (['env', 'json', 'yml', 'yaml', 'xml', 'conf', 'properties'].includes(ext)) {
      return {
        icon: <FileCode className="w-5 h-5 text-orange-500 shrink-0" />,
        badgeColor: 'bg-orange-500/15 text-orange-600 border-orange-500/30',
        label: ext.toUpperCase(),
      }
    }
    if (mimeType?.startsWith('image/') || ['png', 'jpg', 'jpeg', 'webp', 'svg', 'gif'].includes(ext)) {
      return {
        icon: <ImageIcon className="w-5 h-5 text-pink-500 shrink-0" />,
        badgeColor: 'bg-pink-500/15 text-pink-600 border-pink-500/30',
        label: 'IMG',
      }
    }
    if (['zip', 'tar', 'gz', '7z', 'rar'].includes(ext)) {
      return {
        icon: <Archive className="w-5 h-5 text-indigo-500 shrink-0" />,
        badgeColor: 'bg-indigo-500/15 text-indigo-600 border-indigo-500/30',
        label: ext.toUpperCase(),
      }
    }
    return {
      icon: <File className="w-5 h-5 text-muted-foreground shrink-0" />,
      badgeColor: 'bg-muted text-muted-foreground border-border',
      label: ext.toUpperCase() || 'FILE',
    }
  }

  const handleFilesSelected = async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return
    try {
      setIsUploading(true)
      const newItems: TaskAttachment[] = []

      for (let i = 0; i < fileList.length; i++) {
        const file = fileList[i]
        const dataUrl = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader()
          reader.onload = () => resolve(reader.result as string)
          reader.onerror = reject
          reader.readAsDataURL(file)
        })

        newItems.push({
          id: `att_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
          name: file.name,
          size: file.size,
          type: file.type || 'application/octet-stream',
          dataUrl,
          uploadedAt: new Date().toISOString(),
          uploadedBy: currentUserName,
        })
      }

      const updated = [...attachments, ...newItems]
      await onSaveAttachments(updated)
    } finally {
      setIsUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const handleDownload = (att: TaskAttachment) => {
    try {
      const link = document.createElement('a')
      link.href = att.dataUrl
      link.download = att.name
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    } catch (err) {
      console.error('Failed to download file', err)
    }
  }

  const handleDeleteAttachment = async (id: string) => {
    const updated = attachments.filter((a) => a.id !== id)
    await onSaveAttachments(updated)
  }

  return (
    <div className="p-6 rounded-3xl bg-card border border-border/80 shadow-sm space-y-6">
      {/* 1. Description Header & Content */}
      <div className="space-y-3">
        <div className="flex items-center justify-between pb-2 border-b border-border/60">
          <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
            <FileText className="w-4 h-4 text-primary" /> Deliverable Description
          </h3>
          {canEdit && !isEditingDesc && (
            <button
              type="button"
              onClick={() => {
                setDescInput(description)
                setIsEditingDesc(true)
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-muted hover:bg-accent text-xs font-semibold text-foreground transition-all cursor-pointer"
            >
              <Edit2 className="w-3 h-3 text-primary" />
              <span>Edit</span>
            </button>
          )}
        </div>

        {isEditingDesc ? (
          <div className="space-y-3 animate-fade-in">
            <textarea
              value={descInput}
              onChange={(e) => setDescInput(e.target.value)}
              placeholder="Provide a detailed description, acceptance criteria, or engineering specs for this deliverable..."
              rows={5}
              className="w-full px-4 py-3 rounded-2xl bg-background border border-border text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary leading-relaxed"
              autoFocus
            />
            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setIsEditingDesc(false)
                  setDescInput(description)
                }}
                disabled={isSavingDesc}
                className="px-3.5 py-1.5 rounded-xl bg-muted hover:bg-accent text-xs font-semibold text-foreground transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveDescSubmit}
                disabled={isSavingDesc}
                className="px-4 py-1.5 rounded-xl bg-primary text-primary-foreground text-xs font-bold hover:bg-primary/90 transition-all shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {isSavingDesc ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                <span>{isSavingDesc ? 'Saving...' : 'Save Description'}</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="text-xs text-muted-foreground leading-relaxed whitespace-pre-wrap min-h-[48px] p-3.5 rounded-2xl bg-muted/20 border border-border/40">
            {description ? (
              <span className="text-foreground">{description}</span>
            ) : (
              <span className="italic text-muted-foreground/70">
                No description provided yet.{' '}
                {canEdit && (
                  <button
                    type="button"
                    onClick={() => setIsEditingDesc(true)}
                    className="text-primary hover:underline font-semibold not-italic ml-1 inline-flex items-center gap-1 cursor-pointer"
                  >
                    Add a description
                  </button>
                )}
              </span>
            )}
          </div>
        )}
      </div>

      {/* 2. Documents & File Attachments Upload / Download */}
      <div className="space-y-3.5 pt-2 border-t border-border/60">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-2">
              <Paperclip className="w-3.5 h-3.5 text-primary" /> Task Documents & Specifications ({attachments.length})
            </h4>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Upload any documents related to this task (PDF, Excel, Word, SQL, TXT, PEM, P12, keys, configs). Team members can download them anytime.
            </p>
          </div>

          {canEdit && (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-primary text-primary-foreground text-xs font-bold hover:bg-primary/90 transition-all shadow-xs shrink-0 cursor-pointer disabled:opacity-50"
            >
              {isUploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <UploadCloud className="w-3.5 h-3.5" />}
              <span>{isUploading ? 'Uploading...' : 'Upload File'}</span>
            </button>
          )}
        </div>

        {/* Hidden File Input supporting ALL extensions */}
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="*/*"
          onChange={(e) => handleFilesSelected(e.target.files)}
          className="hidden"
        />

        {/* Drag & Drop Upload Zone (Visible if user can edit) */}
        {canEdit && (
          <div
            onDragOver={(e) => {
              e.preventDefault()
              setIsDragOver(true)
            }}
            onDragLeave={() => setIsDragOver(false)}
            onDrop={(e) => {
              e.preventDefault()
              setIsDragOver(false)
              handleFilesSelected(e.dataTransfer.files)
            }}
            onClick={() => fileInputRef.current?.click()}
            className={`p-5 rounded-2xl border-2 border-dashed transition-all text-center cursor-pointer flex flex-col items-center justify-center gap-1.5 ${
              isDragOver
                ? 'border-primary bg-primary/10 scale-[1.01]'
                : 'border-border/80 hover:border-primary/60 bg-muted/20 hover:bg-muted/40'
            }`}
          >
            <div className="p-2.5 rounded-2xl bg-primary/10 text-primary">
              <UploadCloud className="w-5 h-5" />
            </div>
            <p className="text-xs font-bold text-foreground">
              Click to browse or drop any document here
            </p>
            <p className="text-[10px] text-muted-foreground">
              Supports PDF, Excel (.xlsx/.xls), CSV, SQL, Text, Word, PEM, P12, SSL keys, configs & scripts
            </p>
          </div>
        )}

        {/* List of Uploaded Documents */}
        <div className="space-y-2">
          {attachments.length === 0 ? (
            <div className="p-4 text-center text-xs text-muted-foreground bg-muted/10 border border-dashed border-border rounded-2xl">
              No documents attached yet.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {attachments.map((att) => {
                const { icon, badgeColor, label } = getFileIconAndBadge(att.name, att.type)
                const dateStr = att.uploadedAt ? new Date(att.uploadedAt).toLocaleDateString() : 'Recent'

                return (
                  <div
                    key={att.id}
                    className="p-3 rounded-2xl bg-background/90 border border-border/80 hover:border-primary/40 transition-all flex items-center justify-between gap-3 shadow-2xs group"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="p-2 rounded-xl bg-muted/60 shrink-0">
                        {icon}
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span
                            className="font-bold text-xs text-foreground truncate max-w-[170px]"
                            title={att.name}
                          >
                            {att.name}
                          </span>
                          <span className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded border shrink-0 ${badgeColor}`}>
                            {label}
                          </span>
                        </div>

                        <p className="text-[10px] text-muted-foreground mt-0.5">
                          {formatFileSize(att.size)} • {dateStr}
                        </p>
                      </div>
                    </div>

                    {/* Download and Delete Actions */}
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleDownload(att)}
                        className="px-2.5 py-1.5 rounded-xl bg-primary/10 text-primary hover:bg-primary hover:text-primary-foreground transition-all text-xs font-bold flex items-center gap-1 shadow-2xs cursor-pointer"
                        title={`Download ${att.name}`}
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Download</span>
                      </button>

                      {canEdit && (
                        <button
                          type="button"
                          onClick={() => handleDeleteAttachment(att.id)}
                          className="p-1.5 rounded-xl hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors cursor-pointer"
                          title="Remove document"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
