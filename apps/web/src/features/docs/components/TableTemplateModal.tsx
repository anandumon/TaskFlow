'use client'

import React, { useState } from 'react'
import { X, Table as TableIcon, Check, Plus, Grid, Sparkles, Layers } from 'lucide-react'
import { TABLE_TEMPLATES, TableTemplate } from './DocTemplates'

interface TableTemplateModalProps {
  isOpen: boolean
  onClose: () => void
  onSelectTemplate: (template: TableTemplate) => void
  onInsertCustomGrid: (rows: number, cols: number, colorTheme: string, headers: string[]) => void
}

const COLOR_THEMES = [
  { name: 'Word Corporate Blue', bg: '#1e3a8a', border: '#3b82f6', text: '#ffffff' },
  { name: 'Google Modern Slate', bg: '#334155', border: '#475569', text: '#f8fafc' },
  { name: 'Emerald Finance', bg: '#065f46', border: '#059669', text: '#ffffff' },
  { name: 'Royal Violet Roadmap', bg: '#581c87', border: '#7c3aed', text: '#ffffff' },
  { name: 'Amber Sunset Risk', bg: '#9a3412', border: '#ea580c', text: '#ffffff' },
  { name: 'Crimson Executive', bg: '#881337', border: '#e11d48', text: '#ffffff' },
  { name: 'Dark Minimalist', bg: '#18181b', border: '#3f3f46', text: '#f4f4f5' },
]

export function TableTemplateModal({
  isOpen,
  onClose,
  onSelectTemplate,
  onInsertCustomGrid,
}: TableTemplateModalProps) {
  const [activeTab, setActiveTab] = useState<'presets' | 'custom'>('presets')
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>(TABLE_TEMPLATES[0].id)
  
  // Custom grid state
  const [customRows, setCustomRows] = useState(3)
  const [customCols, setCustomCols] = useState(4)
  const [selectedColorIdx, setSelectedColorIdx] = useState(0)

  if (!isOpen) return null

  const handleApplyPreset = () => {
    const tpl = TABLE_TEMPLATES.find((t) => t.id === selectedTemplateId) || TABLE_TEMPLATES[0]
    onSelectTemplate(tpl)
    onClose()
  }

  const handleApplyCustom = () => {
    const theme = COLOR_THEMES[selectedColorIdx]
    const defaultHeaders = Array.from({ length: customCols }, (_, i) => `Column ${i + 1}`)
    onInsertCustomGrid(customRows, customCols, theme.bg, defaultHeaders)
    onClose()
  }

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-[100000] flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-fade-in"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-3xl rounded-2xl bg-[#14151c] border border-white/15 shadow-2xl overflow-hidden flex flex-col text-zinc-100 select-none animate-scale-in max-h-[90vh]"
      >
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-white/10 flex items-center justify-between shrink-0 bg-[#181922]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-500/15 border border-blue-500/30 text-blue-400 flex items-center justify-center shadow-xs">
              <TableIcon className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
                <span>Insert Table Template</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 font-semibold border border-blue-500/30">
                  Word &amp; Docs Styles
                </span>
              </h3>
              <p className="text-xs text-zinc-400">
                Choose a pre-styled Microsoft Word or Google Docs table template with colors and fields, or create a custom grid.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tabs: Document Presets | Custom Grid Picker */}
        <div className="flex items-center px-5 pt-3 border-b border-white/10 gap-4 shrink-0 bg-[#14151c]">
          <button
            type="button"
            onClick={() => setActiveTab('presets')}
            className={`pb-2.5 text-xs font-bold transition-all relative cursor-pointer ${
              activeTab === 'presets'
                ? 'text-white after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-blue-500'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Styled Templates (Word &amp; Google Docs)
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('custom')}
            className={`pb-2.5 text-xs font-bold transition-all relative cursor-pointer ${
              activeTab === 'custom'
                ? 'text-white after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-blue-500'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Custom Grid &amp; Color Theme
          </button>
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
          {activeTab === 'presets' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {TABLE_TEMPLATES.map((tpl) => {
                const isSelected = selectedTemplateId === tpl.id
                return (
                  <div
                    key={tpl.id}
                    onClick={() => setSelectedTemplateId(tpl.id)}
                    className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between gap-3 ${
                      isSelected
                        ? 'bg-blue-500/10 border-blue-500 ring-2 ring-blue-500/30 shadow-lg'
                        : 'bg-white/[0.03] border-white/10 hover:border-white/20 hover:bg-white/[0.05]'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-bold text-xs text-white flex items-center gap-2">
                          <span
                            className="w-3 h-3 rounded-full border border-white/30 shrink-0"
                            style={{ backgroundColor: tpl.headerBg }}
                          />
                          <span>{tpl.name}</span>
                        </span>
                        {isSelected && (
                          <span className="w-5 h-5 rounded-full bg-blue-500 text-white flex items-center justify-center shrink-0">
                            <Check className="w-3 h-3 stroke-[3]" />
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-zinc-400 leading-snug line-clamp-1">{tpl.description}</p>
                    </div>

                    {/* Miniature visual table preview */}
                    <div className="rounded-xl overflow-hidden border border-white/10 text-[10px] shadow-inner bg-black/40">
                      <div
                        className="px-2.5 py-1.5 font-bold flex items-center justify-between text-white"
                        style={{ backgroundColor: tpl.headerBg }}
                      >
                        {tpl.headers.slice(0, 3).map((h, hIdx) => (
                          <span key={hIdx} className="truncate flex-1">
                            {h}
                          </span>
                        ))}
                        {tpl.headers.length > 3 && (
                          <span className="opacity-75 shrink-0">+{tpl.headers.length - 3}</span>
                        )}
                      </div>
                      <div className="divide-y divide-white/5">
                        {tpl.rows.slice(0, 2).map((r, rIdx) => (
                          <div
                            key={rIdx}
                            style={{ backgroundColor: rIdx % 2 === 1 ? tpl.stripeBg : undefined }}
                            className="px-2.5 py-1.5 flex items-center justify-between text-zinc-300"
                          >
                            {r.slice(0, 3).map((cell, cIdx) => (
                              <span key={cIdx} className="truncate flex-1 opacity-90">
                                {cell}
                              </span>
                            ))}
                            {r.length > 3 && <span className="opacity-40 shrink-0">...</span>}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="space-y-5 p-2">
              {/* Row & Column Selectors */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-zinc-300">Columns ({customCols})</label>
                  <div className="flex items-center gap-1.5">
                    {[2, 3, 4, 5, 6].map((num) => (
                      <button
                        key={num}
                        type="button"
                        onClick={() => setCustomCols(num)}
                        className={`flex-1 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                          customCols === num
                            ? 'bg-blue-600 text-white border-blue-400 shadow-md'
                            : 'bg-white/5 border-white/10 text-zinc-300 hover:bg-white/10'
                        }`}
                      >
                        {num}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-zinc-300">Rows ({customRows})</label>
                  <div className="flex items-center gap-1.5">
                    {[2, 3, 4, 5, 6].map((num) => (
                      <button
                        key={num}
                        type="button"
                        onClick={() => setCustomRows(num)}
                        className={`flex-1 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                          customRows === num
                            ? 'bg-blue-600 text-white border-blue-400 shadow-md'
                            : 'bg-white/5 border-white/10 text-zinc-300 hover:bg-white/10'
                        }`}
                      >
                        {num}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Color Theme Selector */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-zinc-300">Header Color Theme</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {COLOR_THEMES.map((th, idx) => (
                    <button
                      key={th.name}
                      type="button"
                      onClick={() => setSelectedColorIdx(idx)}
                      className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex items-center gap-2.5 ${
                        selectedColorIdx === idx
                          ? 'bg-white/10 border-blue-400 ring-2 ring-blue-400/30'
                          : 'bg-white/[0.03] border-white/10 hover:bg-white/5'
                      }`}
                    >
                      <div
                        className="w-5 h-5 rounded-lg border border-white/30 shrink-0 shadow-xs"
                        style={{ backgroundColor: th.bg }}
                      />
                      <span className="text-[11px] font-bold text-zinc-200 truncate">{th.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Real-time Preview */}
              <div className="space-y-1.5 pt-2">
                <span className="text-xs font-bold text-zinc-400">Live Grid Preview:</span>
                <div className="rounded-xl overflow-hidden border border-white/10 shadow-lg text-[11px]">
                  <div
                    className="px-3 py-2 font-bold flex gap-2 text-white"
                    style={{ backgroundColor: COLOR_THEMES[selectedColorIdx].bg }}
                  >
                    {Array.from({ length: customCols }).map((_, i) => (
                      <span key={i} className="flex-1 truncate">
                        Column {i + 1}
                      </span>
                    ))}
                  </div>
                  <div className="divide-y divide-white/5 bg-black/40">
                    {Array.from({ length: customRows }).map((_, r) => (
                      <div key={r} className="px-3 py-2 flex gap-2 text-zinc-400">
                        {Array.from({ length: customCols }).map((_, c) => (
                          <span key={c} className="flex-1 truncate">
                            Row {r + 1}, Col {c + 1}
                          </span>
                        ))}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 sm:p-5 border-t border-white/10 flex items-center justify-between shrink-0 bg-[#181922]">
          <span className="text-xs text-zinc-400">
            {activeTab === 'presets' ? 'Includes styled headers & fields' : `${customRows} rows × ${customCols} columns`}
          </span>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-zinc-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={activeTab === 'presets' ? handleApplyPreset : handleApplyCustom}
              className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-md shadow-blue-600/30 flex items-center gap-1.5 transition-all cursor-pointer active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span>Insert Table</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
