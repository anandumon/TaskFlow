'use client'

import React, { useState, useEffect, useMemo, useRef } from 'react'
import {
  Table as TableIcon,
  Plus,
  Trash2,
  CheckSquare,
  Columns3,
  Edit2,
  Check,
  ChevronDown,
  Palette,
  FileText,
  Sliders,
  Code,
  Eye,
  AlertCircle,
  X,
} from 'lucide-react'
import { TableTemplate } from './DocTemplates'

export interface VisualTableBlock {
  type: 'table'
  id: string
  headerBg: string
  borderColor: string
  headers: string[]
  rows: string[][]
}

export interface VisualColumnsBlock {
  type: 'columns'
  id: string
  columns: { title: string; content: string }[]
}

export interface VisualChecklistBlock {
  type: 'checklist'
  id: string
  title: string
  items: { text: string; done: boolean; assignee?: string; status?: string; priority?: string }[]
}

export interface VisualTextBlock {
  type: 'text'
  id: string
  content: string
}

export type VisualDocBlock =
  | VisualTableBlock
  | VisualColumnsBlock
  | VisualChecklistBlock
  | VisualTextBlock

interface DocVisualEditorProps {
  content: string
  onChange: (newContent: string) => void
  onOpenTableModal: () => void
  onOpenColumnsModal: () => void
  onOpenChecklistModal: () => void
}

const PRESET_HEADER_COLORS = [
  { name: 'Word Corporate Blue', color: '#1e3a8a', border: '#3b82f6' },
  { name: 'Google Modern Slate', color: '#334155', border: '#475569' },
  { name: 'Emerald Finance', color: '#065f46', border: '#059669' },
  { name: 'Royal Violet', color: '#581c87', border: '#7c3aed' },
  { name: 'Amber Risk', color: '#9a3412', border: '#ea580c' },
  { name: 'Crimson Executive', color: '#881337', border: '#e11d48' },
  { name: 'Dark Neutral', color: '#18181b', border: '#3f3f46' },
]

export function DocVisualEditor({
  content,
  onChange,
  onOpenTableModal,
  onOpenColumnsModal,
  onOpenChecklistModal,
}: DocVisualEditorProps) {
  const [editorMode, setEditorMode] = useState<'visual' | 'markdown'>('visual')
  const [activeColorPickerTableId, setActiveColorPickerTableId] = useState<string | null>(null)

  // Parse markdown into blocks
  const blocks = useMemo<VisualDocBlock[]>(() => {
    if (!content || !content.trim()) {
      return [{ type: 'text', id: 'text-initial', content: '' }]
    }

    const result: VisualDocBlock[] = []
    const lines = content.split('\n')
    let textBuffer: string[] = []

    const flushText = () => {
      if (textBuffer.length > 0) {
        result.push({
          type: 'text',
          id: `text-${result.length}-${Date.now()}`,
          content: textBuffer.join('\n'),
        })
        textBuffer = []
      }
    }

    let i = 0
    while (i < lines.length) {
      const line = lines[i]

      // 1. Detect Markdown Table
      if (line.trim().startsWith('|') && line.includes('|')) {
        // Check if next line is table separator
        const nextLine = lines[i + 1] || ''
        if (nextLine.trim().startsWith('|') && nextLine.includes('---')) {
          flushText()
          const rawHeaders = line
            .split('|')
            .map((s) => s.trim())
            .filter((s, idx, arr) => (idx > 0 && idx < arr.length - 1) || Boolean(s))
          const headers = (rawHeaders.length > 0 ? rawHeaders : ['Item / Feature', 'Status', 'Priority', 'Target Date'])
            .map((h, hIdx) => h || (hIdx === 0 ? 'Item / Feature' : `Header ${hIdx + 1}`))

          const rows: string[][] = []
          i += 2 // skip header and separator
          while (i < lines.length && lines[i].trim().startsWith('|')) {
            const rawCells = lines[i]
              .split('|')
              .map((s) => s.trim())
              .filter((s, idx, arr) => idx > 0 && idx < arr.length - 1 || Boolean(s))
            if (rawCells.length > 0) {
              // Ensure row length matches headers
              while (rawCells.length < headers.length) rawCells.push('')
              rows.push(rawCells.slice(0, headers.length))
            }
            i++
          }

          result.push({
            type: 'table',
            id: `tbl-${result.length}-${Date.now()}`,
            headerBg: '#1e3a8a',
            borderColor: '#3b82f6',
            headers,
            rows: rows.length > 0 ? rows : [['', '', '']],
          })
          continue
        }
      }

      // 2. Detect Columns Block :::columns-N
      if (line.trim().startsWith(':::columns-')) {
        flushText()
        const colCount = parseInt(line.replace(':::columns-', '').trim(), 10) || 2
        i++
        const colItems: { title: string; content: string }[] = []
        let curTitle = ''
        let curContent: string[] = []

        while (i < lines.length && !lines[i].trim().startsWith(':::')) {
          const l = lines[i]
          if (l.trim().startsWith('### Column') || l.trim().startsWith('### ')) {
            if (curTitle || curContent.length > 0) {
              colItems.push({ title: curTitle || `Column ${colItems.length + 1}`, content: curContent.join('\n').trim() })
              curContent = []
            }
            curTitle = l.replace(/^###\s*/, '').trim()
          } else {
            curContent.push(l)
          }
          i++
        }
        if (curTitle || curContent.length > 0) {
          colItems.push({ title: curTitle || `Column ${colItems.length + 1}`, content: curContent.join('\n').trim() })
        }
        // Fill up to colCount
        while (colItems.length < colCount) {
          colItems.push({ title: `Column ${colItems.length + 1}`, content: 'Add notes here...' })
        }

        result.push({
          type: 'columns',
          id: `cols-${result.length}-${Date.now()}`,
          columns: colItems,
        })
        i++ // skip closing :::
        continue
      }

      // 3. Detect ClickUp List / Checklist Block :::clickup-list
      if (line.trim().startsWith(':::clickup-list')) {
        flushText()
        i++
        let listTitle = 'Sprint Checklist'
        const items: VisualChecklistBlock['items'] = []

        while (i < lines.length && !lines[i].trim().startsWith(':::')) {
          const l = lines[i]
          if (l.trim().startsWith('###')) {
            listTitle = l.replace(/^###\s*(?:📋\s*)?/, '').trim()
          } else if (l.trim().startsWith('- [') || l.trim().startsWith('* [')) {
            const isDone = l.includes('[x]') || l.includes('[X]')
            const rawRest = l.replace(/^[-*]\s*\[[ xX]\]\s*/, '').trim()
            const parts = rawRest.split('|').map((s) => s.trim())
            items.push({
              text: parts[0] || 'New Task',
              done: isDone,
              assignee: parts[1] || 'Team',
              status: parts[2] || (isDone ? 'DONE' : 'IN_PROGRESS'),
              priority: parts[3] || 'Medium',
            })
          }
          i++
        }

        result.push({
          type: 'checklist',
          id: `chk-${result.length}-${Date.now()}`,
          title: listTitle,
          items:
            items.length > 0
              ? items
              : [
                  { text: 'Design review and verification', done: false, status: 'IN_PROGRESS', priority: 'High' },
                  { text: 'Deploy staging build', done: true, status: 'DONE', priority: 'Medium' },
                ],
        })
        i++ // skip closing :::
        continue
      }

      // Default line: buffer into text
      textBuffer.push(line)
      i++
    }

    flushText()
    return result
  }, [content])

  // Serialize blocks back to Markdown
  const serializeBlocksToMarkdown = (newBlocks: VisualDocBlock[]) => {
    const pieces: string[] = []

    newBlocks.forEach((block) => {
      if (block.type === 'text') {
        if (block.content.trim()) {
          pieces.push(block.content)
        }
      } else if (block.type === 'table') {
        const headerRow = `| ${block.headers.join(' | ')} |`
        const sepRow = `| ${block.headers.map(() => '---').join(' | ')} |`
        const dataRows = block.rows.map((row) => `| ${row.join(' | ')} |`).join('\n')
        pieces.push(`${headerRow}\n${sepRow}\n${dataRows}`)
      } else if (block.type === 'columns') {
        let colMd = `:::columns-${block.columns.length}\n`
        block.columns.forEach((col, idx) => {
          colMd += `### ${col.title || `Column ${idx + 1}`}\n${col.content || ''}\n\n`
        })
        colMd += `:::`
        pieces.push(colMd)
      } else if (block.type === 'checklist') {
        let chkMd = `:::clickup-list\n### 📋 ${block.title}\n`
        block.items.forEach((item) => {
          chkMd += `- [${item.done ? 'x' : ' '}] ${item.text} | ${item.assignee || 'Team'} | ${
            item.status || (item.done ? 'DONE' : 'IN_PROGRESS')
          } | ${item.priority || 'Medium'}\n`
        })
        chkMd += `:::`
        pieces.push(chkMd)
      }
    })

    return pieces.join('\n\n')
  }

  // Table manipulation handlers
  const handleUpdateTableCell = (
    tableId: string,
    rowIndex: number,
    colIndex: number,
    value: string
  ) => {
    const nextBlocks = blocks.map((b) => {
      if (b.type !== 'table' || b.id !== tableId) return b
      const nextRows = b.rows.map((row, rIdx) => {
        if (rIdx !== rowIndex) return row
        const newRow = [...row]
        newRow[colIndex] = value
        return newRow
      })
      return { ...b, rows: nextRows }
    })
    onChange(serializeBlocksToMarkdown(nextBlocks))
  }

  const handleUpdateTableHeader = (tableId: string, colIndex: number, value: string) => {
    const nextBlocks = blocks.map((b) => {
      if (b.type !== 'table' || b.id !== tableId) return b
      const nextHeaders = [...b.headers]
      nextHeaders[colIndex] = value
      return { ...b, headers: nextHeaders }
    })
    onChange(serializeBlocksToMarkdown(nextBlocks))
  }

  const handleCellKeyDown = (
    tableId: string,
    rowIdx: number,
    colIdx: number,
    totalRows: number,
    totalCols: number,
    e: React.KeyboardEvent<HTMLInputElement>
  ) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      if (rowIdx === totalRows - 1) {
        handleAddTableRow(tableId)
        setTimeout(() => {
          const nextInput = document.getElementById(`tbl-cell-${tableId}-${rowIdx + 1}-${colIdx}`)
          nextInput?.focus()
        }, 50)
      } else {
        const nextInput = document.getElementById(`tbl-cell-${tableId}-${rowIdx + 1}-${colIdx}`)
        nextInput?.focus()
      }
    } else if (e.key === 'Tab') {
      if (!e.shiftKey) {
        if (colIdx === totalCols - 1) {
          if (rowIdx === totalRows - 1) {
            e.preventDefault()
            handleAddTableRow(tableId)
            setTimeout(() => {
              const nextInput = document.getElementById(`tbl-cell-${tableId}-${rowIdx + 1}-0`)
              nextInput?.focus()
            }, 50)
          } else {
            e.preventDefault()
            const nextInput = document.getElementById(`tbl-cell-${tableId}-${rowIdx + 1}-0`)
            nextInput?.focus()
          }
        }
      } else {
        if (colIdx === 0 && rowIdx > 0) {
          e.preventDefault()
          const prevInput = document.getElementById(`tbl-cell-${tableId}-${rowIdx - 1}-${totalCols - 1}`)
          prevInput?.focus()
        }
      }
    } else if (e.key === 'ArrowUp') {
      if (rowIdx === 0) {
        e.preventDefault()
        const hdrInput = document.getElementById(`tbl-hdr-${tableId}-${colIdx}`)
        hdrInput?.focus()
      } else {
        e.preventDefault()
        const prevInput = document.getElementById(`tbl-cell-${tableId}-${rowIdx - 1}-${colIdx}`)
        prevInput?.focus()
      }
    } else if (e.key === 'ArrowDown') {
      if (rowIdx < totalRows - 1) {
        e.preventDefault()
        const nextInput = document.getElementById(`tbl-cell-${tableId}-${rowIdx + 1}-${colIdx}`)
        nextInput?.focus()
      }
    }
  }

  const handleHeaderKeyDown = (
    tableId: string,
    colIdx: number,
    totalCols: number,
    e: React.KeyboardEvent<HTMLInputElement>
  ) => {
    if (e.key === 'Enter' || e.key === 'ArrowDown') {
      e.preventDefault()
      const firstCell = document.getElementById(`tbl-cell-${tableId}-0-${colIdx}`)
      firstCell?.focus()
    } else if (e.key === 'Tab' && !e.shiftKey) {
      if (colIdx === totalCols - 1) {
        e.preventDefault()
        const firstCell = document.getElementById(`tbl-cell-${tableId}-0-0`)
        firstCell?.focus()
      }
    }
  }

  const handleAddTableRow = (tableId: string) => {
    const tbl = blocks.find((b) => b.type === 'table' && b.id === tableId) as VisualTableBlock | undefined
    const currentRowCount = tbl?.rows.length || 0
    const nextBlocks = blocks.map((b) => {
      if (b.type !== 'table' || b.id !== tableId) return b
      const emptyRow = Array.from({ length: b.headers.length }, () => '')
      return { ...b, rows: [...b.rows, emptyRow] }
    })
    onChange(serializeBlocksToMarkdown(nextBlocks))
    setTimeout(() => {
      const nextInput = document.getElementById(`tbl-cell-${tableId}-${currentRowCount}-0`)
      nextInput?.focus()
    }, 60)
  }

  const handleAddTableColumn = (tableId: string) => {
    const tbl = blocks.find((b) => b.type === 'table' && b.id === tableId) as VisualTableBlock | undefined
    const currentColCount = tbl?.headers.length || 0
    const nextBlocks = blocks.map((b) => {
      if (b.type !== 'table' || b.id !== tableId) return b
      const nextHeaders = [...b.headers, `Column ${b.headers.length + 1}`]
      const nextRows = b.rows.map((row) => [...row, ''])
      return { ...b, headers: nextHeaders, rows: nextRows }
    })
    onChange(serializeBlocksToMarkdown(nextBlocks))
    setTimeout(() => {
      const nextHdr = document.getElementById(`tbl-hdr-${tableId}-${currentColCount}`)
      nextHdr?.focus()
    }, 60)
  }

  const handleDeleteTableRow = (tableId: string, rowIndex: number) => {
    const nextBlocks = blocks.map((b) => {
      if (b.type !== 'table' || b.id !== tableId) return b
      if (b.rows.length <= 1) return b
      return { ...b, rows: b.rows.filter((_, idx) => idx !== rowIndex) }
    })
    onChange(serializeBlocksToMarkdown(nextBlocks))
  }

  const handleDeleteTableColumn = (tableId: string, colIndex: number) => {
    const nextBlocks = blocks.map((b) => {
      if (b.type !== 'table' || b.id !== tableId) return b
      if (b.headers.length <= 1) return b
      const nextHeaders = b.headers.filter((_, idx) => idx !== colIndex)
      const nextRows = b.rows.map((row) => row.filter((_, idx) => idx !== colIndex))
      return { ...b, headers: nextHeaders, rows: nextRows }
    })
    onChange(serializeBlocksToMarkdown(nextBlocks))
  }

  const handleSetTableHeaderColor = (tableId: string, color: string, border: string) => {
    const nextBlocks = blocks.map((b) => {
      if (b.type !== 'table' || b.id !== tableId) return b
      return { ...b, headerBg: color, borderColor: border }
    })
    setActiveColorPickerTableId(null)
    onChange(serializeBlocksToMarkdown(nextBlocks))
  }

  const handleDeleteBlock = (blockId: string) => {
    const nextBlocks = blocks.filter((b) => b.id !== blockId)
    onChange(serializeBlocksToMarkdown(nextBlocks))
  }

  // Checklist handlers
  const handleToggleChecklistItem = (checklistId: string, itemIndex: number) => {
    const nextBlocks = blocks.map((b) => {
      if (b.type !== 'checklist' || b.id !== checklistId) return b
      const nextItems = b.items.map((item, idx) => {
        if (idx !== itemIndex) return item
        const nextDone = !item.done
        return {
          ...item,
          done: nextDone,
          status: nextDone ? 'DONE' : 'IN_PROGRESS',
        }
      })
      return { ...b, items: nextItems }
    })
    onChange(serializeBlocksToMarkdown(nextBlocks))
  }

  const handleUpdateChecklistText = (checklistId: string, itemIndex: number, text: string) => {
    const nextBlocks = blocks.map((b) => {
      if (b.type !== 'checklist' || b.id !== checklistId) return b
      const nextItems = b.items.map((item, idx) => {
        if (idx !== itemIndex) return item
        return { ...item, text }
      })
      return { ...b, items: nextItems }
    })
    onChange(serializeBlocksToMarkdown(nextBlocks))
  }

  const handleAddChecklistItem = (checklistId: string) => {
    const nextBlocks = blocks.map((b) => {
      if (b.type !== 'checklist' || b.id !== checklistId) return b
      return {
        ...b,
        items: [
          ...b.items,
          { text: 'New Task Item', done: false, status: 'TODO', priority: 'Medium' },
        ],
      }
    })
    onChange(serializeBlocksToMarkdown(nextBlocks))
  }

  // Text block handlers
  const handleUpdateTextBlock = (textId: string, value: string) => {
    const nextBlocks = blocks.map((b) => {
      if (b.type !== 'text' || b.id !== textId) return b
      return { ...b, content: value }
    })
    onChange(serializeBlocksToMarkdown(nextBlocks))
  }

  // Column block handlers
  const handleUpdateColumnTitle = (colsId: string, colIdx: number, title: string) => {
    const nextBlocks = blocks.map((b) => {
      if (b.type !== 'columns' || b.id !== colsId) return b
      const newCols = b.columns.map((c, i) => (i === colIdx ? { ...c, title } : c))
      return { ...b, columns: newCols }
    })
    onChange(serializeBlocksToMarkdown(nextBlocks))
  }

  const handleUpdateColumnContent = (colsId: string, colIdx: number, contentVal: string) => {
    const nextBlocks = blocks.map((b) => {
      if (b.type !== 'columns' || b.id !== colsId) return b
      const newCols = b.columns.map((c, i) => (i === colIdx ? { ...c, content: contentVal } : c))
      return { ...b, columns: newCols }
    })
    onChange(serializeBlocksToMarkdown(nextBlocks))
  }

  return (
    <div className="space-y-4 pt-1">
      {/* Editor Mode Bar: Visual WYSIWYG vs Raw Markdown */}
      <div className="flex items-center justify-between pb-2 border-b border-white/10 text-xs">
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-white/[0.04] border border-white/10">
          <button
            type="button"
            onClick={() => setEditorMode('visual')}
            className={`px-3 py-1 rounded-lg font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
              editorMode === 'visual'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <Eye className="w-3.5 h-3.5" />
            <span>Visual Canvas</span>
          </button>
          <button
            type="button"
            onClick={() => setEditorMode('markdown')}
            className={`px-3 py-1 rounded-lg font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
              editorMode === 'markdown'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <Code className="w-3.5 h-3.5" />
            <span>Markdown View</span>
          </button>
        </div>

        <span className="text-[11px] text-zinc-500 font-medium hidden sm:inline">
          {editorMode === 'visual'
            ? 'Interactive Word & Docs visual elements'
            : 'Raw markdown document view'}
        </span>
      </div>

      {/* RAW MARKDOWN VIEW */}
      {editorMode === 'markdown' ? (
        <textarea
          value={content}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Start writing notes, architectural specifications, or markdown tables..."
          rows={18}
          className="w-full bg-transparent text-sm leading-relaxed text-zinc-200 placeholder:text-zinc-600 focus:outline-none resize-none font-mono p-2 border border-white/10 rounded-xl"
        />
      ) : (
        /* VISUAL CANVAS VIEW */
        <div className="space-y-6">
          {blocks.map((block, bIdx) => {
            // ── 1. RENDER VISUAL TABLE ──
            if (block.type === 'table') {
              return (
                <div
                  key={block.id || bIdx}
                  className="rounded-2xl border border-white/15 overflow-hidden shadow-2xl bg-[#12131a] relative group/tbl animate-fade-in"
                >
                  {/* Table Control Toolbar */}
                  <div className="px-4 py-2 bg-[#181924] border-b border-white/10 flex items-center justify-between gap-2 text-xs">
                    <div className="flex items-center gap-2">
                      <TableIcon className="w-4 h-4 text-blue-400" />
                      <span className="font-bold text-white text-xs">Formatted Table</span>
                      <span className="text-[10px] text-zinc-500 font-mono">
                        ({block.rows.length} rows × {block.headers.length} cols)
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {/* Color Theme Dropdown */}
                      <div className="relative">
                        <button
                          type="button"
                          onClick={() =>
                            setActiveColorPickerTableId(
                              activeColorPickerTableId === block.id ? null : block.id
                            )
                          }
                          className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-zinc-300 text-[11px] font-semibold transition-colors cursor-pointer"
                        >
                          <span
                            className="w-3 h-3 rounded-full border border-white/30 shrink-0"
                            style={{ backgroundColor: block.headerBg }}
                          />
                          <span>Header Theme</span>
                          <ChevronDown className="w-2.5 h-2.5 opacity-60" />
                        </button>

                        {activeColorPickerTableId === block.id && (
                          <div className="absolute right-0 top-full mt-1.5 p-2 rounded-xl bg-[#1e202c] border border-white/20 shadow-2xl z-50 flex flex-col gap-1 w-48 text-xs animate-scale-in">
                            <span className="text-[10px] font-bold text-zinc-500 uppercase px-2 py-0.5">
                              Header Color Preset
                            </span>
                            {PRESET_HEADER_COLORS.map((clr) => (
                              <button
                                key={clr.name}
                                type="button"
                                onClick={() =>
                                  handleSetTableHeaderColor(block.id, clr.color, clr.border)
                                }
                                className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-white/10 text-left transition-colors cursor-pointer text-zinc-300 hover:text-white"
                              >
                                <span
                                  className="w-3.5 h-3.5 rounded-full border border-white/30 shrink-0"
                                  style={{ backgroundColor: clr.color }}
                                />
                                <span className="truncate">{clr.name}</span>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Add Column Button */}
                      <button
                        type="button"
                        onClick={() => handleAddTableColumn(block.id)}
                        className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-zinc-300 text-[11px] font-semibold transition-colors cursor-pointer"
                        title="Add Column to Table"
                      >
                        <Plus className="w-3 h-3 text-blue-400" />
                        <span>Add Col</span>
                      </button>

                      {/* Delete Table Button */}
                      <button
                        type="button"
                        onClick={() => handleDeleteBlock(block.id)}
                        className="p-1 rounded-lg text-zinc-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
                        title="Delete Table"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Scrollable Visual Table Canvas */}
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      {/* Table Headers */}
                      <thead>
                        <tr style={{ backgroundColor: block.headerBg }}>
                          {block.headers.map((h, colIdx) => (
                            <th
                              key={colIdx}
                              className="p-2.5 font-bold text-white border-r border-white/15 last:border-r-0 relative group/col"
                            >
                              <div className="flex items-center justify-between gap-1.5">
                                <input
                                  id={`tbl-hdr-${block.id}-${colIdx}`}
                                  type="text"
                                  value={h}
                                  placeholder={colIdx === 0 ? 'Item / Feature' : `Header ${colIdx + 1}`}
                                  onChange={(e) =>
                                    handleUpdateTableHeader(block.id, colIdx, e.target.value)
                                  }
                                  onKeyDown={(e) =>
                                    handleHeaderKeyDown(block.id, colIdx, block.headers.length, e)
                                  }
                                  className="bg-white/10 hover:bg-white/15 focus:bg-white/20 font-bold text-white placeholder:text-white/50 outline-none w-full border border-white/20 focus:border-white/60 rounded px-2 py-1 text-xs transition-all shadow-xs"
                                />
                                {block.headers.length > 1 && (
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteTableColumn(block.id, colIdx)}
                                    className="opacity-0 group-hover/col:opacity-100 p-0.5 rounded text-white/50 hover:text-rose-300 hover:bg-rose-500/20 transition-all cursor-pointer"
                                    title="Delete this column"
                                  >
                                    <X className="w-3 h-3" />
                                  </button>
                                )}
                              </div>
                            </th>
                          ))}
                          <th className="w-10 p-2 text-center border-l border-white/10 text-white/50 text-[10px]">
                            &times;
                          </th>
                        </tr>
                      </thead>

                      {/* Table Rows */}
                      <tbody className="divide-y divide-white/5">
                        {block.rows.map((row, rowIdx) => (
                          <tr
                            key={rowIdx}
                            className={`group/row transition-colors hover:bg-white/[0.04] ${
                              rowIdx % 2 === 1 ? 'bg-white/[0.02]' : ''
                            }`}
                          >
                            {row.map((cell, colIdx) => (
                              <td
                                key={colIdx}
                                className="p-2 border-r border-white/5 last:border-r-0"
                              >
                                <input
                                  id={`tbl-cell-${block.id}-${rowIdx}-${colIdx}`}
                                  type="text"
                                  value={cell}
                                  placeholder="Click to edit..."
                                  onChange={(e) =>
                                    handleUpdateTableCell(block.id, rowIdx, colIdx, e.target.value)
                                  }
                                  onKeyDown={(e) =>
                                    handleCellKeyDown(
                                      block.id,
                                      rowIdx,
                                      colIdx,
                                      block.rows.length,
                                      block.headers.length,
                                      e
                                    )
                                  }
                                  className="w-full bg-white/[0.04] hover:bg-white/[0.08] focus:bg-white/[0.12] text-zinc-100 placeholder:text-zinc-500/70 outline-none text-xs rounded px-2 py-1.5 border border-white/10 hover:border-white/25 focus:border-blue-400 focus:ring-1 focus:ring-blue-400/30 transition-all cursor-text font-normal"
                                />
                              </td>
                            ))}
                            <td className="w-10 p-2 text-center border-l border-white/5">
                              {block.rows.length > 1 && (
                                <button
                                  type="button"
                                  onClick={() => handleDeleteTableRow(block.id, rowIdx)}
                                  className="opacity-0 group-hover/row:opacity-100 hover:opacity-100 p-1 text-zinc-500 hover:text-rose-400 hover:bg-rose-500/10 rounded transition-all cursor-pointer"
                                  title="Delete this row"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Add Row Button at bottom */}
                  <div className="p-2 bg-[#14151e] border-t border-white/10 flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => handleAddTableRow(block.id)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 hover:text-blue-300 font-bold text-xs transition-all cursor-pointer border border-blue-500/20"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>+ Add Row</span>
                    </button>
                    <span className="text-[10px] text-zinc-500">
                      Editable table &bull; Autosaves to document
                    </span>
                  </div>
                </div>
              )
            }

            // ── 2. RENDER VISUAL COLUMNS ──
            if (block.type === 'columns') {
              return (
                <div
                  key={block.id || bIdx}
                  className="rounded-2xl border border-white/10 p-4 bg-[#12131a] space-y-3 relative group/cols animate-fade-in"
                >
                  <div className="flex items-center justify-between text-xs pb-1 border-b border-white/5">
                    <span className="font-bold text-zinc-300 flex items-center gap-2">
                      <Columns3 className="w-4 h-4 text-purple-400" />
                      <span>{block.columns.length} Columns Layout</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => handleDeleteBlock(block.id)}
                      className="p-1 rounded text-zinc-500 hover:text-rose-400"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div
                    className="grid gap-4"
                    style={{
                      gridTemplateColumns: `repeat(${block.columns.length}, minmax(0, 1fr))`,
                    }}
                  >
                    {block.columns.map((col, cIdx) => (
                      <div
                        key={cIdx}
                        className="rounded-xl border border-white/10 p-3 bg-white/[0.03] space-y-2 flex flex-col"
                      >
                        <input
                          type="text"
                          value={col.title}
                          onChange={(e) =>
                            handleUpdateColumnTitle(block.id, cIdx, e.target.value)
                          }
                          placeholder={`Column ${cIdx + 1} Title`}
                          className="font-bold text-xs text-white bg-transparent outline-none border-b border-white/10 pb-1"
                        />
                        <textarea
                          value={col.content}
                          onChange={(e) =>
                            handleUpdateColumnContent(block.id, cIdx, e.target.value)
                          }
                          placeholder="Column notes or specs..."
                          rows={5}
                          className="w-full bg-transparent text-xs text-zinc-300 outline-none resize-none leading-relaxed flex-1"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )
            }

            // ── 3. RENDER VISUAL CHECKLIST / CLICKUP LIST ──
            if (block.type === 'checklist') {
              const completedCount = block.items.filter((i) => i.done).length
              return (
                <div
                  key={block.id || bIdx}
                  className="rounded-2xl border border-white/15 p-4 bg-[#141520] space-y-3 shadow-xl animate-fade-in"
                >
                  <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
                    <div className="flex items-center gap-2">
                      <CheckSquare className="w-4 h-4 text-sky-400" />
                      <input
                        type="text"
                        value={block.title}
                        onChange={(e) => {
                          const nextBlocks = blocks.map((b) =>
                            b.id === block.id ? { ...b, title: e.target.value } : b
                          )
                          onChange(serializeBlocksToMarkdown(nextBlocks))
                        }}
                        className="font-bold text-sm text-white bg-transparent outline-none"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] px-2 py-0.5 rounded-full bg-sky-500/20 text-sky-300 font-bold border border-sky-500/30">
                        {completedCount} / {block.items.length} Done
                      </span>
                      <button
                        type="button"
                        onClick={() => handleDeleteBlock(block.id)}
                        className="p-1 rounded text-zinc-500 hover:text-rose-400"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    {block.items.map((item, itmIdx) => (
                      <div
                        key={itmIdx}
                        className={`flex items-center gap-3 p-2.5 rounded-xl border transition-all ${
                          item.done
                            ? 'bg-emerald-500/5 border-emerald-500/20 text-zinc-400'
                            : 'bg-white/[0.03] border-white/10 text-zinc-200 hover:border-white/20'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={item.done}
                          onChange={() => handleToggleChecklistItem(block.id, itmIdx)}
                          className="w-4 h-4 rounded accent-sky-500 cursor-pointer shrink-0"
                        />
                        <input
                          type="text"
                          value={item.text}
                          onChange={(e) =>
                            handleUpdateChecklistText(block.id, itmIdx, e.target.value)
                          }
                          className={`flex-1 bg-transparent text-xs font-medium outline-none ${
                            item.done ? 'line-through opacity-60' : ''
                          }`}
                        />
                        {item.priority && (
                          <span
                            className={`text-[10px] px-2 py-0.5 rounded-md font-bold uppercase shrink-0 ${
                              item.priority === 'High' || item.priority === 'Critical'
                                ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                                : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                            }`}
                          >
                            {item.priority}
                          </span>
                        )}
                        {item.assignee && (
                          <span className="text-[10px] px-2 py-0.5 rounded-md bg-white/5 text-zinc-400 border border-white/10 shrink-0">
                            {item.assignee}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>

                  <button
                    type="button"
                    onClick={() => handleAddChecklistItem(block.id)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-sky-500/10 hover:bg-sky-500/20 text-sky-400 font-bold text-xs transition-colors cursor-pointer border border-sky-500/20"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>+ Add Task</span>
                  </button>
                </div>
              )
            }

            // ── 4. RENDER VISUAL TEXT PARAGRAPH ──
            return (
              <div key={block.id || bIdx} className="space-y-1">
                <textarea
                  value={block.content}
                  onChange={(e) => handleUpdateTextBlock(block.id, e.target.value)}
                  placeholder="Start writing notes, specifications, or architectural documentation..."
                  rows={Math.max(4, (block.content.split('\n').length || 1) + 1)}
                  className="w-full bg-transparent text-sm leading-relaxed text-zinc-200 placeholder:text-zinc-600 focus:outline-none resize-none font-sans p-1 focus:bg-white/[0.02] rounded-lg transition-colors"
                />
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
