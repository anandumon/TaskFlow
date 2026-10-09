'use client'

import React, { useState, useEffect, useMemo } from 'react'
import {
  X,
  Download,
  Copy,
  Check,
  ExternalLink,
  Eye,
  FileText,
  FileCode,
  FileSpreadsheet,
  Image as ImageIcon,
  Key,
  Database,
  Search,
  WrapText,
  Maximize2,
  Minimize2,
  Table,
  Code2,
  File as FileIcon,
  Loader2,
  AlertCircle,
} from 'lucide-react'

export interface FileToView {
  name: string
  size?: number
  type?: string
  dataUrl: string
  uploadedAt?: string
  uploadedBy?: string
}

interface FileViewerModalProps {
  file: FileToView | null
  isOpen: boolean
  onClose: () => void
}

export function FileViewerModal({ file, isOpen, onClose }: FileViewerModalProps) {
  const [textContent, setTextContent] = useState<string | null>(null)
  const [isLoadingContent, setIsLoadingContent] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [isCopied, setIsCopied] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [isWrapText, setIsWrapText] = useState(true)
  const [viewMode, setViewMode] = useState<'table' | 'raw'>('table')
  const [isFullscreen, setIsFullscreen] = useState(false)

  // Determine file kind from extension & mime type
  const { ext, fileCategory } = useMemo(() => {
    if (!file) return { ext: '', fileCategory: 'unknown' }
    const extension = file.name.split('.').pop()?.toLowerCase() || ''
    const mime = (file.type || '').toLowerCase()

    if (
      mime.startsWith('image/') ||
      ['png', 'jpg', 'jpeg', 'gif', 'svg', 'webp', 'ico', 'bmp'].includes(extension)
    ) {
      return { ext: extension, fileCategory: 'image' }
    }

    if (mime === 'application/pdf' || extension === 'pdf') {
      return { ext: extension, fileCategory: 'pdf' }
    }

    if (
      mime.startsWith('audio/') ||
      ['mp3', 'wav', 'ogg', 'm4a', 'aac', 'flac'].includes(extension)
    ) {
      return { ext: extension, fileCategory: 'audio' }
    }

    if (
      mime.startsWith('video/') ||
      ['mp4', 'webm', 'mov', 'avi', 'mkv'].includes(extension)
    ) {
      return { ext: extension, fileCategory: 'video' }
    }

    if (['csv', 'tsv'].includes(extension) || mime.includes('csv')) {
      return { ext: extension, fileCategory: 'csv' }
    }

    if (
      mime.startsWith('text/') ||
      mime.includes('json') ||
      mime.includes('javascript') ||
      mime.includes('typescript') ||
      mime.includes('xml') ||
      [
        'txt', 'md', 'json', 'sql', 'js', 'jsx', 'ts', 'tsx', 'html', 'css',
        'scss', 'yaml', 'yml', 'xml', 'env', 'sh', 'bash', 'zsh', 'bat', 'ps1',
        'py', 'rs', 'go', 'java', 'c', 'cpp', 'h', 'hpp', 'php', 'rb', 'lua',
        'pem', 'key', 'crt', 'cer', 'p12', 'conf', 'config', 'ini', 'log',
        'gitignore', 'dockerfile', 'makefile', 'lock',
      ].includes(extension)
    ) {
      return { ext: extension, fileCategory: 'text' }
    }

    return { ext: extension, fileCategory: 'binary' }
  }, [file])

  // Fetch or decode text content when applicable
  useEffect(() => {
    if (!isOpen || !file) {
      setTextContent(null)
      setIsLoadingContent(false)
      setLoadError(null)
      setSearchQuery('')
      return
    }

    if (fileCategory === 'text' || fileCategory === 'csv') {
      setIsLoadingContent(true)
      setLoadError(null)

      const loadData = async () => {
        try {
          if (file.dataUrl.startsWith('data:')) {
            // Fetch handles both base64 and url-encoded data URIs with proper charset
            const res = await fetch(file.dataUrl)
            const text = await res.text()
            setTextContent(text)
          } else if (file.dataUrl.startsWith('http') || file.dataUrl.startsWith('/')) {
            const res = await fetch(file.dataUrl)
            if (!res.ok) throw new Error(`HTTP ${res.status}`)
            const text = await res.text()
            setTextContent(text)
          } else {
            setTextContent(file.dataUrl)
          }
        } catch (err: any) {
          console.warn('Failed to load text content:', err)
          // Fallback: direct base64 atob decoding
          try {
            const base64Part = file.dataUrl.split(',')[1]
            if (base64Part) {
              const decoded = decodeURIComponent(
                Array.prototype.map
                  .call(atob(base64Part), (c: string) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
                  .join('')
              )
              setTextContent(decoded)
            } else {
              setLoadError('Unable to preview this file.')
            }
          } catch {
            setLoadError('Could not decode text file.')
          }
        } finally {
          setIsLoadingContent(false)
        }
      }

      loadData()
    } else {
      setTextContent(null)
      setIsLoadingContent(false)
      setLoadError(null)
    }
  }, [isOpen, file, fileCategory])

  // Keyboard navigation: Escape to close
  useEffect(() => {
    if (!isOpen) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        onClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  // Copy text content
  const handleCopy = () => {
    if (!textContent) return
    navigator.clipboard.writeText(textContent)
    setIsCopied(true)
    setTimeout(() => setIsCopied(false), 2000)
  }

  // Download file
  const handleDownload = () => {
    if (!file) return
    try {
      const link = document.createElement('a')
      link.href = file.dataUrl
      link.download = file.name
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    } catch (err) {
      console.error('Download error:', err)
    }
  }

  // Open in new browser tab
  const handleOpenNewTab = () => {
    if (!file) return
    if (file.dataUrl.startsWith('data:')) {
      // Create blob URL for safe opening in new tab
      try {
        const byteCharacters = atob(file.dataUrl.split(',')[1] || '')
        const byteNumbers = new Array(byteCharacters.length)
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i)
        }
        const byteArray = new Uint8Array(byteNumbers)
        const blob = new Blob([byteArray], { type: file.type || 'application/octet-stream' })
        const blobUrl = URL.createObjectURL(blob)
        window.open(blobUrl, '_blank')
      } catch {
        window.open(file.dataUrl, '_blank')
      }
    } else {
      window.open(file.dataUrl, '_blank')
    }
  }

  // Format file size
  const formatSize = (bytes?: number) => {
    if (!bytes) return ''
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`
  }

  // Parse CSV for table view
  const parsedCsv = useMemo(() => {
    if (fileCategory !== 'csv' || !textContent) return null
    try {
      const lines = textContent.split(/\r?\n/).filter((l) => l.trim().length > 0)
      if (lines.length === 0) return null

      const parseLine = (line: string): string[] => {
        const result: string[] = []
        let current = ''
        let inQuotes = false

        for (let i = 0; i < line.length; i++) {
          const char = line[i]
          if (char === '"') {
            inQuotes = !inQuotes
          } else if ((char === ',' || char === '\t') && !inQuotes) {
            result.push(current.trim())
            current = ''
          } else {
            current += char
          }
        }
        result.push(current.trim())
        return result
      }

      const headers = parseLine(lines[0])
      const rows = lines.slice(1).map(parseLine)

      return { headers, rows }
    } catch {
      return null
    }
  }, [fileCategory, textContent])

  // Filtered lines for text search
  const textLines = useMemo(() => {
    if (!textContent) return []
    return textContent.split(/\r?\n/)
  }, [textContent])

  const filteredLineIndices = useMemo(() => {
    if (!searchQuery.trim()) return null
    const q = searchQuery.toLowerCase()
    const matches = new Set<number>()
    textLines.forEach((line, idx) => {
      if (line.toLowerCase().includes(q)) {
        matches.add(idx)
      }
    })
    return matches
  }, [searchQuery, textLines])

  if (!isOpen || !file) return null

  return (
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center bg-black/80 backdrop-blur-md p-2 sm:p-4 md:p-6 animate-fade-in select-text"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={`relative flex flex-col bg-card border border-border/80 shadow-2xl rounded-3xl overflow-hidden transition-all duration-200 ${
          isFullscreen
            ? 'w-full h-full rounded-none'
            : 'w-full max-w-5xl h-[88vh] max-h-[920px]'
        }`}
      >
        {/* ── TOP HEADER ── */}
        <div className="px-5 py-3.5 border-b border-border/70 bg-card/95 backdrop-blur-md flex items-center justify-between gap-3 shrink-0">
          {/* File details & badge */}
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-2 rounded-2xl bg-primary/10 text-primary shrink-0">
              {fileCategory === 'image' && <ImageIcon className="w-5 h-5 text-indigo-400" />}
              {fileCategory === 'pdf' && <FileText className="w-5 h-5 text-rose-500" />}
              {fileCategory === 'csv' && <FileSpreadsheet className="w-5 h-5 text-emerald-500" />}
              {fileCategory === 'text' && <FileCode className="w-5 h-5 text-sky-400" />}
              {fileCategory === 'binary' && <FileIcon className="w-5 h-5 text-amber-500" />}
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-foreground truncate max-w-[280px] sm:max-w-md md:max-w-lg" title={file.name}>
                  {file.name}
                </h2>
                <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md bg-muted border border-border text-foreground/80 shrink-0">
                  {ext || 'FILE'}
                </span>
              </div>
              <div className="text-[11px] text-muted-foreground flex items-center gap-2 mt-0.5">
                {file.size ? <span>{formatSize(file.size)}</span> : null}
                {file.uploadedAt && (
                  <>
                    <span>•</span>
                    <span>Uploaded on {new Date(file.uploadedAt).toLocaleDateString()}</span>
                  </>
                )}
                {file.uploadedBy && (
                  <>
                    <span>•</span>
                    <span>by {file.uploadedBy}</span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Action toolbar buttons */}
          <div className="flex items-center gap-1.5 shrink-0">
            {/* Search inside text/code */}
            {(fileCategory === 'text' || fileCategory === 'csv') && (
              <div className="relative hidden md:flex items-center">
                <Search className="w-3.5 h-3.5 text-muted-foreground absolute left-2.5 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Find in file..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-36 lg:w-48 pl-8 pr-3 py-1.5 rounded-xl bg-muted/60 border border-border/70 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2 text-muted-foreground hover:text-foreground text-xs"
                  >
                    ×
                  </button>
                )}
              </div>
            )}

            {/* CSV: Toggle Table / Raw Code */}
            {fileCategory === 'csv' && (
              <div className="flex items-center rounded-xl bg-muted/60 p-0.5 border border-border/60">
                <button
                  type="button"
                  onClick={() => setViewMode('table')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all flex items-center gap-1 ${
                    viewMode === 'table'
                      ? 'bg-background text-foreground shadow-2xs font-bold'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                  title="Table grid view"
                >
                  <Table className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Table</span>
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('raw')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all flex items-center gap-1 ${
                    viewMode === 'raw'
                      ? 'bg-background text-foreground shadow-2xs font-bold'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                  title="Raw text view"
                >
                  <Code2 className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Raw</span>
                </button>
              </div>
            )}

            {/* Wrap text toggle for code/text */}
            {fileCategory === 'text' && (
              <button
                type="button"
                onClick={() => setIsWrapText(!isWrapText)}
                className={`p-2 rounded-xl border border-border/70 text-xs transition-colors cursor-pointer ${
                  isWrapText
                    ? 'bg-primary/10 text-primary border-primary/30'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                }`}
                title={isWrapText ? 'Disable line wrap' : 'Enable line wrap'}
              >
                <WrapText className="w-4 h-4" />
              </button>
            )}

            {/* Copy content button (for text/code) */}
            {textContent && (
              <button
                type="button"
                onClick={handleCopy}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-border/70 bg-card hover:bg-muted text-xs font-semibold text-foreground transition-all cursor-pointer shadow-2xs"
                title="Copy all file content"
              >
                {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                <span className="hidden sm:inline">{isCopied ? 'Copied!' : 'Copy'}</span>
              </button>
            )}

            {/* Open in new window / tab */}
            <button
              type="button"
              onClick={handleOpenNewTab}
              className="p-2 rounded-xl border border-border/70 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer shadow-2xs"
              title="Open raw file in new tab"
            >
              <ExternalLink className="w-4 h-4" />
            </button>

            {/* Download */}
            <button
              type="button"
              onClick={handleDownload}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 text-xs font-bold transition-all shadow-xs cursor-pointer"
              title={`Download ${file.name}`}
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Download</span>
            </button>

            {/* Toggle Fullscreen */}
            <button
              type="button"
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="p-2 rounded-xl border border-border/70 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer hidden md:flex"
              title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>

            {/* Close */}
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl border border-border/70 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
              title="Close viewer (Esc)"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* ── MAIN CONTENT VIEWER AREA ── */}
        <div className="flex-1 min-h-0 bg-background/50 overflow-auto custom-scrollbar relative">
          {isLoadingContent ? (
            <div className="h-full flex flex-col items-center justify-center p-8 space-y-3">
              <Loader2 className="w-8 h-8 text-primary animate-spin" />
              <p className="text-xs text-muted-foreground font-semibold">Reading and decoding file...</p>
            </div>
          ) : loadError ? (
            <div className="h-full flex flex-col items-center justify-center p-8 space-y-3 text-center">
              <AlertCircle className="w-10 h-10 text-amber-500" />
              <div className="space-y-1">
                <p className="text-sm font-bold text-foreground">Preview Unavailable</p>
                <p className="text-xs text-muted-foreground">{loadError}</p>
              </div>
              <button
                type="button"
                onClick={handleDownload}
                className="mt-2 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground font-bold text-xs shadow-xs"
              >
                <Download className="w-4 h-4" />
                <span>Download to view locally</span>
              </button>
            </div>
          ) : fileCategory === 'image' ? (
            /* 1. IMAGE VIEWER */
            <div className="h-full w-full flex items-center justify-center p-6 overflow-auto">
              <div className="relative max-w-full max-h-full rounded-2xl overflow-hidden border border-border shadow-2xl p-2 bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] dark:bg-[radial-gradient(#27272a_1px,transparent_1px)] [background-size:16px_16px]">
                <img
                  src={file.dataUrl}
                  alt={file.name}
                  className="max-h-[75vh] w-auto object-contain rounded-xl mx-auto shadow-md"
                />
              </div>
            </div>
          ) : fileCategory === 'pdf' ? (
            /* 2. PDF VIEWER */
            <div className="h-full w-full flex flex-col">
              <iframe
                src={file.dataUrl}
                title={file.name}
                className="w-full h-full min-h-[500px] border-none"
              />
            </div>
          ) : fileCategory === 'audio' ? (
            /* 3. AUDIO VIEWER */
            <div className="h-full flex flex-col items-center justify-center p-8 space-y-6">
              <div className="w-20 h-20 rounded-3xl bg-amber-500/15 text-amber-500 flex items-center justify-center shadow-xl border border-amber-500/30">
                <FileText className="w-10 h-10" />
              </div>
              <div className="text-center space-y-1">
                <h3 className="text-base font-bold text-foreground">{file.name}</h3>
                <p className="text-xs text-muted-foreground">Audio Recording • {formatSize(file.size)}</p>
              </div>
              <audio controls src={file.dataUrl} className="w-full max-w-md shadow-lg rounded-2xl" />
            </div>
          ) : fileCategory === 'video' ? (
            /* 4. VIDEO VIEWER */
            <div className="h-full flex items-center justify-center p-6">
              <video
                controls
                src={file.dataUrl}
                className="max-h-[75vh] w-auto max-w-full rounded-2xl shadow-2xl border border-border"
              />
            </div>
          ) : fileCategory === 'csv' && viewMode === 'table' && parsedCsv ? (
            /* 5. CSV INTERACTIVE TABLE VIEW */
            <div className="h-full overflow-auto custom-scrollbar p-4">
              <table className="w-full border-collapse text-left text-xs">
                <thead>
                  <tr className="border-b border-border bg-muted/80 sticky top-0 z-10 backdrop-blur-md">
                    <th className="py-2.5 px-3 text-[10px] font-bold text-muted-foreground uppercase tracking-wider w-12 text-center border-r border-border/50">
                      #
                    </th>
                    {parsedCsv.headers.map((h, i) => (
                      <th
                        key={i}
                        className="py-2.5 px-3.5 font-bold text-foreground uppercase tracking-wider text-[11px] border-r border-border/50 last:border-r-0"
                      >
                        {h || `Column ${i + 1}`}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60 font-mono text-[11px]">
                  {parsedCsv.rows.map((row, rIdx) => {
                    const rowMatch =
                      !searchQuery.trim() ||
                      row.some((cell) => cell.toLowerCase().includes(searchQuery.toLowerCase()))

                    if (!rowMatch) return null

                    return (
                      <tr key={rIdx} className="hover:bg-muted/40 transition-colors">
                        <td className="py-2 px-3 text-muted-foreground/60 text-center font-sans border-r border-border/50 text-[10px]">
                          {rIdx + 1}
                        </td>
                        {parsedCsv.headers.map((_, cIdx) => (
                          <td
                            key={cIdx}
                            className="py-2 px-3.5 text-foreground/90 whitespace-pre border-r border-border/50 last:border-r-0"
                          >
                            {row[cIdx] || ''}
                          </td>
                        ))}
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          ) : textContent !== null ? (
            /* 6. CODE & TEXT VIEWER (WITH LINE NUMBERS & SYNTAX FORMATTING) */
            <div className="h-full flex flex-col font-mono text-xs overflow-auto custom-scrollbar">
              <div className="min-w-full flex">
                {/* Line numbers gutter */}
                <div className="py-4 px-3 bg-muted/30 border-r border-border/60 text-right select-none text-muted-foreground/50 shrink-0 font-mono text-[11px] leading-6">
                  {textLines.map((_, idx) => (
                    <div
                      key={idx}
                      className={
                        filteredLineIndices && filteredLineIndices.has(idx)
                          ? 'text-primary font-bold'
                          : ''
                      }
                    >
                      {idx + 1}
                    </div>
                  ))}
                </div>

                {/* Code & text body */}
                <pre
                  className={`py-4 px-4 flex-1 text-foreground/90 leading-6 font-mono text-xs ${
                    isWrapText ? 'whitespace-pre-wrap break-all' : 'whitespace-pre overflow-x-auto'
                  }`}
                >
                  {textLines.map((line, idx) => {
                    const isMatch = filteredLineIndices && filteredLineIndices.has(idx)
                    return (
                      <div
                        key={idx}
                        className={isMatch ? 'bg-primary/20 -mx-4 px-4 font-semibold text-primary' : ''}
                      >
                        {line || ' '}
                      </div>
                    )
                  })}
                </pre>
              </div>
            </div>
          ) : (
            /* 7. BINARY / GENERIC DOCUMENT CARD */
            <div className="h-full flex flex-col items-center justify-center p-8 space-y-5 text-center max-w-md mx-auto">
              <div className="w-20 h-20 rounded-3xl bg-primary/10 text-primary flex items-center justify-center shadow-xl border border-primary/20">
                <FileIcon className="w-10 h-10" />
              </div>

              <div className="space-y-1.5">
                <h3 className="text-base font-bold text-foreground">{file.name}</h3>
                <p className="text-xs text-muted-foreground">
                  Binary Document • {formatSize(file.size)} • {file.type || 'Unknown format'}
                </p>
                <p className="text-[11px] text-muted-foreground/80 pt-1">
                  This document format is best viewed with an external application or specialized desktop software.
                </p>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleDownload}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-primary text-primary-foreground font-bold text-xs shadow-md shadow-primary/20 hover:scale-[1.02] transition-all cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  <span>Download File</span>
                </button>
                <button
                  type="button"
                  onClick={handleOpenNewTab}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl border border-border bg-card hover:bg-muted text-xs font-semibold text-foreground transition-all cursor-pointer"
                >
                  <ExternalLink className="w-4 h-4" />
                  <span>Open in Tab</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* ── FOOTER STATUS BAR ── */}
        <div className="px-5 py-2 border-t border-border/60 bg-muted/20 flex items-center justify-between text-[11px] text-muted-foreground shrink-0 select-none">
          <div className="flex items-center gap-3">
            <span>{fileCategory.toUpperCase()} PREVIEW</span>
            {textLines.length > 0 && (
              <>
                <span>•</span>
                <span>{textLines.length} lines</span>
                <span>•</span>
                <span>{textContent?.length || 0} characters</span>
              </>
            )}
            {searchQuery && filteredLineIndices && (
              <>
                <span>•</span>
                <span className="text-primary font-semibold">
                  {filteredLineIndices.size} match{filteredLineIndices.size === 1 ? '' : 'es'} found
                </span>
              </>
            )}
          </div>
          <div>
            <span>Press <kbd className="px-1.5 py-0.5 rounded bg-muted border border-border/80 font-mono text-[10px]">Esc</kbd> to close</span>
          </div>
        </div>
      </div>
    </div>
  )
}
