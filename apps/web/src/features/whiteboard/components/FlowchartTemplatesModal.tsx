'use client'

import React, { useState } from 'react'
import {
  X,
  GitBranch,
  ArrowRight,
  Sparkles,
  Layers,
  Database,
  Diamond,
  Square,
  Circle,
  FileText,
  Workflow,
  Plus,
} from 'lucide-react'
import { CanvasElement } from './KryaWhiteboardModal'

export interface FlowchartTemplateItem {
  id: string
  title: string
  figmaCategory: string
  description: string
  color: string
  generateElements: (startX: number, startY: number) => CanvasElement[]
}

export const FIGMA_FLOWCHART_TEMPLATES: FlowchartTemplateItem[] = [
  {
    id: 'process-flowchart',
    title: 'Process Flowchart (Linear)',
    figmaCategory: 'Process Mapping',
    description: 'Universal step-by-step sequential workflow mapping tasks from Start to End',
    color: '#3b82f6',
    generateElements: (startX, startY) => {
      const now = Date.now()
      return [
        {
          id: `node-start-${now}`,
          type: 'circle',
          x: startX,
          y: startY + 20,
          width: 110,
          height: 60,
          content: 'START',
          color: '#1e3a8a',
          borderColor: '#60a5fa',
          borderStyle: 'solid',
          thickness: 2,
        },
        {
          id: `node-p1-${now}`,
          type: 'rect',
          x: startX + 170,
          y: startY + 10,
          width: 170,
          height: 80,
          content: '1. Ingest Data\nValidate payload schema',
          color: '#1e293b',
          borderColor: '#38bdf8',
          borderStyle: 'solid',
          thickness: 2,
        },
        {
          id: `node-p2-${now}`,
          type: 'rect',
          x: startX + 400,
          y: startY + 10,
          width: 170,
          height: 80,
          content: '2. Process Job\nExecute business logic',
          color: '#1e293b',
          borderColor: '#818cf8',
          borderStyle: 'solid',
          thickness: 2,
        },
        {
          id: `node-end-${now}`,
          type: 'circle',
          x: startX + 630,
          y: startY + 20,
          width: 110,
          height: 60,
          content: 'COMPLETE',
          color: '#064e3b',
          borderColor: '#34d399',
          borderStyle: 'solid',
          thickness: 2,
        },
        // Connecting arrows
        {
          id: `arr-1-${now}`,
          type: 'arrow',
          x: startX + 115,
          y: startY + 45,
          width: 50,
          height: 20,
          content: 'arrow',
          color: '#60a5fa',
        },
        {
          id: `arr-2-${now}`,
          type: 'arrow',
          x: startX + 345,
          y: startY + 45,
          width: 50,
          height: 20,
          content: 'arrow',
          color: '#818cf8',
        },
        {
          id: `arr-3-${now}`,
          type: 'arrow',
          x: startX + 575,
          y: startY + 45,
          width: 50,
          height: 20,
          content: 'arrow',
          color: '#34d399',
        },
      ]
    },
  },
  {
    id: 'swimlane-flowchart',
    title: 'Swimlane Flowchart (Cross-Functional)',
    figmaCategory: 'Team Collaboration',
    description: 'Multi-lane flowchart separating responsibilities across User, Frontend, Backend & DB',
    color: '#8b5cf6',
    generateElements: (startX, startY) => {
      const now = Date.now()
      const lanes = [
        { name: '👤 USER LANE', color: '#172554', border: '#3b82f6' },
        { name: '💻 FRONTEND APP', color: '#2e1065', border: '#8b5cf6' },
        { name: '⚙️ BACKEND & API', color: '#042f2e', border: '#14b8a6' },
      ]

      const elements: CanvasElement[] = []

      // 3 Swimlanes
      lanes.forEach((l, idx) => {
        elements.push({
          id: `lane-${now}-${idx}`,
          type: 'rect',
          x: startX,
          y: startY + idx * 140,
          width: 680,
          height: 125,
          content: l.name,
          color: l.color,
          borderColor: l.border,
          borderStyle: 'dashed',
          thickness: 1.5,
          alignment: 'left',
        })
      })

      // Task nodes within lanes
      elements.push(
        {
          id: `sl-node-1-${now}`,
          type: 'sticky',
          x: startX + 140,
          y: startY + 25,
          width: 140,
          height: 80,
          content: 'Clicks "Send Message" with audio memo',
          color: '#fef08a',
        },
        {
          id: `sl-node-2-${now}`,
          type: 'rect',
          x: startX + 330,
          y: startY + 165,
          width: 150,
          height: 80,
          content: 'Optimistic State UI\nPlays sound waveform',
          color: '#312e81',
          borderColor: '#a78bfa',
          borderStyle: 'solid',
          thickness: 2,
        },
        {
          id: `sl-node-3-${now}`,
          type: 'rect',
          x: startX + 510,
          y: startY + 305,
          width: 150,
          height: 80,
          content: 'PostgreSQL DB Insert\nBroadcasts WebSocket',
          color: '#134e4a',
          borderColor: '#2dd4bf',
          borderStyle: 'solid',
          thickness: 2,
        }
      )

      return elements
    },
  },
  {
    id: 'decision-workflow',
    title: 'Workflow & Decision Tree',
    figmaCategory: 'Business Logic',
    description: 'Decision diamond branching with conditional True / False logic paths',
    color: '#f59e0b',
    generateElements: (startX, startY) => {
      const now = Date.now()
      return [
        {
          id: `wf-start-${now}`,
          type: 'circle',
          x: startX,
          y: startY + 60,
          width: 100,
          height: 55,
          content: 'START',
          color: '#1e3a8a',
          borderColor: '#3b82f6',
          borderStyle: 'solid',
          thickness: 2,
        },
        {
          id: `wf-step1-${now}`,
          type: 'rect',
          x: startX + 140,
          y: startY + 50,
          width: 150,
          height: 75,
          content: 'Validate User Token',
          color: '#1e293b',
          borderColor: '#94a3b8',
          borderStyle: 'solid',
          thickness: 2,
        },
        {
          id: `wf-diamond-${now}`,
          type: 'diamond',
          x: startX + 340,
          y: startY + 45,
          width: 110,
          height: 90,
          content: 'Valid?',
          color: '#78350f',
          borderColor: '#f59e0b',
          borderStyle: 'solid',
          thickness: 2,
        },
        {
          id: `wf-yes-${now}`,
          type: 'rect',
          x: startX + 500,
          y: startY,
          width: 160,
          height: 75,
          content: '✅ Grant Full Access\nRender Dashboard',
          color: '#064e3b',
          borderColor: '#10b981',
          borderStyle: 'solid',
          thickness: 2,
        },
        {
          id: `wf-no-${now}`,
          type: 'rect',
          x: startX + 500,
          y: startY + 120,
          width: 160,
          height: 75,
          content: '❌ Redirect to Login\nShow error toast',
          color: '#7f1d1d',
          borderColor: '#ef4444',
          borderStyle: 'solid',
          thickness: 2,
        },
      ]
    },
  },
  {
    id: 'data-flow-diagram',
    title: 'Data Flow Diagram (DFD)',
    figmaCategory: 'Software Engineering',
    description: 'Input Sources, Processing Nodes, Database Stores, and Output Sinks',
    color: '#06b6d4',
    generateElements: (startX, startY) => {
      const now = Date.now()
      return [
        {
          id: `dfd-src-${now}`,
          type: 'rect',
          x: startX,
          y: startY + 40,
          width: 150,
          height: 80,
          content: '🌐 Client Browser\n(Data Producer)',
          color: '#1e293b',
          borderColor: '#38bdf8',
          borderStyle: 'solid',
          thickness: 2,
        },
        {
          id: `dfd-proc-${now}`,
          type: 'circle',
          x: startX + 210,
          y: startY + 30,
          width: 130,
          height: 100,
          content: '⚡ API Gateway\nRate limiting',
          color: '#0c4a6e',
          borderColor: '#0284c7',
          borderStyle: 'solid',
          thickness: 2,
        },
        {
          id: `dfd-db-${now}`,
          type: 'parallelogram',
          x: startX + 400,
          y: startY + 35,
          width: 160,
          height: 90,
          content: '🗄️ PostgreSQL Store\n(Indexed records)',
          color: '#14532d',
          borderColor: '#22c55e',
          borderStyle: 'solid',
          thickness: 2,
        },
        {
          id: `dfd-out-${now}`,
          type: 'rect',
          x: startX + 610,
          y: startY + 40,
          width: 150,
          height: 80,
          content: '📊 Realtime Feed\nLive updates sink',
          color: '#3b0764',
          borderColor: '#a855f7',
          borderStyle: 'solid',
          thickness: 2,
        },
      ]
    },
  },
  {
    id: 'system-architecture',
    title: 'System Architecture Ecosystem',
    figmaCategory: 'Infrastructure',
    description: 'High-level cloud topology with load balancers, caching, microservices & DB',
    color: '#ec4899',
    generateElements: (startX, startY) => {
      const now = Date.now()
      return [
        {
          id: `sys-lb-${now}`,
          type: 'rect',
          x: startX,
          y: startY + 60,
          width: 150,
          height: 80,
          content: '⚖️ Cloud Load Balancer\nReverse Proxy',
          color: '#1e293b',
          borderColor: '#f43f5e',
          borderStyle: 'solid',
          thickness: 2,
        },
        {
          id: `sys-srv1-${now}`,
          type: 'rect',
          x: startX + 210,
          y: startY,
          width: 170,
          height: 80,
          content: '🚀 Next.js Web App\nSSR & Static Edge',
          color: '#18181b',
          borderColor: '#60a5fa',
          borderStyle: 'solid',
          thickness: 2,
        },
        {
          id: `sys-srv2-${now}`,
          type: 'rect',
          x: startX + 210,
          y: startY + 110,
          width: 170,
          height: 80,
          content: '📡 WebSocket Service\nReal-time Call/Chat',
          color: '#18181b',
          borderColor: '#c084fc',
          borderStyle: 'solid',
          thickness: 2,
        },
        {
          id: `sys-db-${now}`,
          type: 'rect',
          x: startX + 440,
          y: startY + 50,
          width: 180,
          height: 100,
          content: '💾 Primary Database\nRedis Cache & Postgres',
          color: '#064e3b',
          borderColor: '#34d399',
          borderStyle: 'solid',
          thickness: 2,
        },
      ]
    },
  },
  {
    id: 'mind-map',
    title: 'Mind Map & Brainstorming',
    figmaCategory: 'Ideation',
    description: 'Central concept with surrounding colorful exploratory branches',
    color: '#10b981',
    generateElements: (startX, startY) => {
      const now = Date.now()
      return [
        {
          id: `mm-center-${now}`,
          type: 'circle',
          x: startX + 260,
          y: startY + 100,
          width: 160,
          height: 120,
          content: '🎯 CORE VISION\nTaskFlow 2.0',
          color: '#1e1b4b',
          borderColor: '#818cf8',
          borderStyle: 'solid',
          thickness: 3,
        },
        {
          id: `mm-b1-${now}`,
          type: 'sticky',
          x: startX + 50,
          y: startY + 10,
          width: 150,
          height: 90,
          content: '🎨 DESIGN:\nSleek Dark Mode, Figma Flowcharts',
          color: '#fbcfe8',
        },
        {
          id: `mm-b2-${now}`,
          type: 'sticky',
          x: startX + 480,
          y: startY + 10,
          width: 150,
          height: 90,
          content: '⚡ REALTIME:\nWebSocket Audio Notes & Notifications',
          color: '#fef08a',
        },
        {
          id: `mm-b3-${now}`,
          type: 'sticky',
          x: startX + 50,
          y: startY + 220,
          width: 150,
          height: 90,
          content: '📄 DOCS:\nWord & Google Docs Table Templates',
          color: '#bae6fd',
        },
        {
          id: `mm-b4-${now}`,
          type: 'sticky',
          x: startX + 480,
          y: startY + 220,
          width: 150,
          height: 90,
          content: '🖼️ IMAGE STUDIO:\nUpload, Crop & Adjust on Canvas',
          color: '#bbf7d0',
        },
      ]
    },
  },
]

interface FlowchartTemplatesModalProps {
  isOpen: boolean
  onClose: () => void
  onInsertDiagram: (elements: CanvasElement[]) => void
  onInsertShape: (shapeType: CanvasElement['type'], title: string) => void
}

export function FlowchartTemplatesModal({
  isOpen,
  onClose,
  onInsertDiagram,
  onInsertShape,
}: FlowchartTemplatesModalProps) {
  const [activeTab, setActiveTab] = useState<'templates' | 'shapes'>('templates')

  if (!isOpen) return null

  const handleApply = (tpl: FlowchartTemplateItem) => {
    const generated = tpl.generateElements(200, 160)
    onInsertDiagram(generated)
    onClose()
  }

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-[100000] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-fade-in select-none"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-3xl rounded-3xl bg-[#14151c] border border-white/15 shadow-2xl overflow-hidden flex flex-col text-zinc-100 animate-scale-in max-h-[90vh]"
      >
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-white/10 flex items-center justify-between shrink-0 bg-[#181924]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-purple-500/15 border border-purple-500/30 text-purple-400 flex items-center justify-center shadow-xs">
              <Workflow className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <span>Flowcharts &amp; Diagrams Studio</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 font-semibold border border-purple-500/30">
                  Figma Flowchart Standards
                </span>
              </h3>
              <p className="text-xs text-zinc-400">
                Process flowcharts, swimlanes, decision workflows, and DFDs based on Figma resource library standards.
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

        {/* Tabs: Flowchart Templates | Flowchart Shapes */}
        <div className="flex items-center px-5 pt-3 border-b border-white/10 gap-4 shrink-0 bg-[#14151c]">
          <button
            type="button"
            onClick={() => setActiveTab('templates')}
            className={`pb-2.5 text-xs font-bold transition-all relative cursor-pointer ${
              activeTab === 'templates'
                ? 'text-white after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-purple-500'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Flowchart Diagrams (Figma Library)
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('shapes')}
            className={`pb-2.5 text-xs font-bold transition-all relative cursor-pointer ${
              activeTab === 'shapes'
                ? 'text-white after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-purple-500'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Flowchart Shape Palette
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5">
          {activeTab === 'templates' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {FIGMA_FLOWCHART_TEMPLATES.map((tpl) => (
                <div
                  key={tpl.id}
                  onClick={() => handleApply(tpl)}
                  className="p-4 rounded-2xl bg-white/[0.03] hover:bg-purple-500/10 border border-white/10 hover:border-purple-400/50 transition-all cursor-pointer flex flex-col justify-between gap-3 group"
                >
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-white group-hover:text-purple-300 transition-colors flex items-center gap-2">
                        <span
                          className="w-2.5 h-2.5 rounded-full"
                          style={{ backgroundColor: tpl.color }}
                        />
                        <span>{tpl.title}</span>
                      </span>
                      <span className="text-[10px] px-2 py-0.5 rounded-md bg-white/5 text-zinc-400 group-hover:text-zinc-200">
                        {tpl.figmaCategory}
                      </span>
                    </div>
                    <p className="text-[11px] text-zinc-400 leading-snug line-clamp-2">
                      {tpl.description}
                    </p>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-white/5 text-[11px] text-purple-400 font-bold group-hover:translate-x-1 transition-transform">
                    <span>Click to place on canvas</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {[
                { type: 'circle' as const, title: 'Terminator (Start/End)', desc: 'Capsule or oval indicating flow boundary' },
                { type: 'rect' as const, title: 'Process Step', desc: 'Standard task or operation rectangle' },
                { type: 'diamond' as const, title: 'Decision Point', desc: 'Branching logic condition (Yes/No)' },
                { type: 'parallelogram' as const, title: 'Data Input / Output', desc: 'Represents external ingestion or export' },
                { type: 'cloud' as const, title: 'Cloud / Network Node', desc: 'External microservice or cloud API' },
                { type: 'star' as const, title: 'Milestone / Event', desc: 'Critical gate or deployment milestone' },
              ].map((s) => (
                <div
                  key={s.title}
                  onClick={() => {
                    onInsertShape(s.type, s.title)
                    onClose()
                  }}
                  className="p-3.5 rounded-2xl bg-white/[0.03] hover:bg-white/[0.08] border border-white/10 hover:border-purple-400/50 transition-all cursor-pointer space-y-2 group"
                >
                  <span className="font-bold text-xs text-white group-hover:text-purple-300 block">
                    {s.title}
                  </span>
                  <p className="text-[11px] text-zinc-400 leading-snug">{s.desc}</p>
                  <div className="text-[10px] text-purple-400 font-bold pt-1">
                    + Add to Canvas
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 sm:p-5 border-t border-white/10 flex items-center justify-between shrink-0 bg-[#181924]">
          <span className="text-xs text-zinc-400">
            Referenced from Figma Flowcharts Resource Library
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-zinc-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
