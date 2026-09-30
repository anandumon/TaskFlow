'use client'

import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import { createPortal } from 'react-dom'
import {
  Sparkles,
  Star,
  Share2,
  Maximize2,
  Minimize2,
  X,
  ArrowLeft,
  Hand,
  CheckSquare,
  Square,
  Circle,
  Triangle,
  Hexagon,
  Cloud,
  Star as StarIcon,
  StickyNote,
  Type,
  Folder,
  Image as ImageIcon,
  GitBranch,
  LayoutTemplate,
  Undo2,
  Redo2,
  ChevronDown,
  Plus,
  Minus,
  Trash2,
  Check,
  Eraser,
  AlignLeft,
  AlignCenter,
  AlignRight,
  MousePointer2,
  ArrowRight,
  Search,
  Tag,
  User as UserIcon,
  SlidersHorizontal,
  HelpCircle,
  FileText,
  Layers,
  CheckCircle2,
  Copy,
} from 'lucide-react'
import { useAuthStore } from '@/stores/auth-store'

export interface KryaWhiteboardModalProps {
  isOpen: boolean
  boardId?: string
  boardTitle?: string
  onClose: () => void
}

type ToolMode =
  | 'select'
  | 'hand'
  | 'task'
  | 'draw'
  | 'rect'
  | 'arrow'
  | 'sticky'
  | 'text'
  | 'folder'
  | 'image'
  | 'diagram'
  | 'templates'

type PenType = 'pen' | 'highlighter' | 'eraser' | 'pointer'

type ShapeType =
  | 'square'
  | 'circle'
  | 'triangle'
  | 'diamond'
  | 'parallelogram'
  | 'trapezoid'
  | 'hexagon'
  | 'cloud'
  | 'star'

type ConnectorType = 'straight' | 'curved' | 'arrow'

interface CanvasElement {
  id: string
  type:
    | 'sticky'
    | 'task'
    | 'text'
    | 'rect'
    | 'circle'
    | 'triangle'
    | 'diamond'
    | 'parallelogram'
    | 'trapezoid'
    | 'hexagon'
    | 'cloud'
    | 'star'
    | 'arrow'
    | 'frame'
  x: number
  y: number
  width: number
  height: number
  content?: string
  title?: string
  color?: string
  borderColor?: string
  borderStyle?: 'solid' | 'dashed' | 'dotted'
  thickness?: number
  fontSize?: string
  alignment?: 'left' | 'center' | 'right'
}

interface DrawStroke {
  color: string
  size: number
  isHighlighter?: boolean
  points: Array<{ x: number; y: number }>
}

// 12 Exact Colors for Pen & Drawing (Image 3)
const PEN_COLORS = [
  '#ef4444', // 1. Red
  '#ec4899', // 2. Hot Pink
  '#f97316', // 3. Orange
  '#facc15', // 4. Yellow
  '#10b981', // 5. Emerald Green
  '#a7f3d0', // 6. Mint / Light Green
  '#3b82f6', // 7. Vivid Blue
  '#93c5fd', // 8. Sky Blue
  '#8b5cf6', // 9. Violet / Purple
  '#c4b5fd', // 10. Lavender / Light Purple
  '#6b7280', // 11. Gray
  '#ffffff', // 12. White
]

// 12 Pastel Colors for Sticky Notes (Image 1)
const STICKY_PASTEL_COLORS = [
  '#fca5a5', // 1. Salmon / Light Red
  '#f472b6', // 2. Light Pink
  '#fdba74', // 3. Soft Orange
  '#fef08a', // 4. Soft Yellow (Selected in Image 1)
  '#86efac', // 5. Mint Green
  '#bbf7d0', // 6. Light Sage
  '#93c5fd', // 7. Sky Blue
  '#bfdbfe', // 8. Pale Blue
  '#c4b5fd', // 9. Soft Purple
  '#e9d5ff', // 10. Pale Lilac
  '#cbd5e1', // 11. Light Gray
  '#ffffff', // 12. White
]

// 12 Text Colors (Image 2)
const TEXT_COLORS = [
  '#ef4444',
  '#ec4899',
  '#f97316',
  '#facc15',
  '#10b981',
  '#a7f3d0',
  '#3b82f6',
  '#93c5fd',
  '#8b5cf6',
  '#c4b5fd',
  '#6b7280',
  '#ffffff', // Selected in Image 2
]

export function KryaWhiteboardModal({
  isOpen,
  boardId = 'board-main',
  boardTitle = 'Whiteboard',
  onClose,
}: KryaWhiteboardModalProps) {
  const { user } = useAuthStore()
  const cleanInitialTitle = boardTitle && boardTitle.toLowerCase() !== 'krya' ? boardTitle : 'Whiteboard'
  const [title, setTitle] = useState(cleanInitialTitle)

  useEffect(() => {
    if (boardTitle) {
      const clean = boardTitle.toLowerCase() !== 'krya' ? boardTitle : 'Whiteboard'
      setTitle(clean)
    }
  }, [boardTitle])
  const [isStarred, setIsStarred] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [activeTool, setActiveTool] = useState<ToolMode>('select')
  const [currentColor, setCurrentColor] = useState('#ffffff')
  const [zoom, setZoom] = useState(100)
  const [saveToast, setSaveToast] = useState<string | null>(null)

  // Pen Tool Sub-options (Image 3)
  const [penType, setPenType] = useState<PenType>('pen')
  const [strokeThickness, setStrokeThickness] = useState<'thin' | 'medium' | 'thick'>('thin')
  const [isStrokeDropdownOpen, setIsStrokeDropdownOpen] = useState(false)

  // Shape Tool Sub-options (Image 4)
  const [activeShape, setActiveShape] = useState<ShapeType>('square')
  const [shapeColor, setShapeColor] = useState('#ffffff')
  const [shapeBorderStyle, setShapeBorderStyle] = useState<'solid' | 'dashed' | 'dotted'>('solid')
  const [shapeThickness, setShapeThickness] = useState<'Thin' | 'Medium' | 'Bold'>('Medium')
  const [shapeAlignment, setShapeAlignment] = useState<'left' | 'center' | 'right'>('center')
  const [shapeFontSize, setShapeFontSize] = useState<'Small' | 'Medium' | 'Large'>('Medium')
  const [isMoreShapesOpen, setIsMoreShapesOpen] = useState(false)
  const [isShapeColorPickerOpen, setIsShapeColorPickerOpen] = useState(false)
  const [isShapeThicknessOpen, setIsShapeThicknessOpen] = useState(false)

  // Connector / Arrow Tool Sub-options (Image 5)
  const [connectorType, setConnectorType] = useState<ConnectorType>('straight')
  const [connectorColor, setConnectorColor] = useState('#ffffff')
  const [connectorStyle, setConnectorStyle] = useState<'solid' | 'dashed' | 'dotted'>('solid')
  const [isConnectorColorOpen, setIsConnectorColorOpen] = useState(false)

  // Sticky Note Tool Sub-options (Image 1)
  const [stickyColor, setStickyColor] = useState('#fef08a')
  const [stickyFontSize, setStickyFontSize] = useState<'Small' | 'Medium' | 'Large'>('Large')
  const [stickyAlignment, setStickyAlignment] = useState<'left' | 'center' | 'right'>('left')
  const [isStickyFontSizeOpen, setIsStickyFontSizeOpen] = useState(false)

  // Text Tool Sub-options (Image 2)
  const [textColor, setTextColor] = useState('#ffffff')
  const [textFontSize, setTextFontSize] = useState<'Small' | 'Medium' | 'Large'>('Medium')
  const [textAlignment, setTextAlignment] = useState<'left' | 'center' | 'right'>('left')
  const [isTextFontSizeOpen, setIsTextFontSizeOpen] = useState(false)

  // Template Center Modal (Image 4)
  const [isTemplateCenterOpen, setIsTemplateCenterOpen] = useState(false)
  const [templateSearchQuery, setTemplateSearchQuery] = useState('')
  const [selectedTemplateTab, setSelectedTemplateTab] = useState<'featured' | 'workspace' | 'taskflow'>('featured')
  const [selectedTypeFilter, setSelectedTypeFilter] = useState<string>('Whiteboard')

  // Interactive element selection, editing, dragging & resizing state
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null)
  const [editingElementId, setEditingElementId] = useState<string | null>(null)
  const [activeColorPickerId, setActiveColorPickerId] = useState<string | null>(null)

  const [dragState, setDragState] = useState<{
    elementId: string
    startX: number
    startY: number
    initialX: number
    initialY: number
  } | null>(null)

  const [resizeState, setResizeState] = useState<{
    elementId: string
    handle: 'nw' | 'ne' | 'se' | 'sw' | 'e' | 's' | 'w' | 'n'
    startX: number
    startY: number
    initialX: number
    initialY: number
    initialWidth: number
    initialHeight: number
  } | null>(null)

  const [mounted, setMounted] = useState(false)
  useEffect(() => {
    setMounted(true)
  }, [])

  // Global drag and resize tracking
  useEffect(() => {
    if (!dragState && !resizeState) return

    const handleGlobalMouseMove = (e: MouseEvent) => {
      if (dragState) {
        const dx = e.clientX - dragState.startX
        const dy = e.clientY - dragState.startY
        setElements((prev) =>
          prev.map((el) => {
            if (el.id !== dragState.elementId) return el
            return {
              ...el,
              x: Math.round(dragState.initialX + dx),
              y: Math.round(dragState.initialY + dy),
            }
          })
        )
      } else if (resizeState) {
        const dx = e.clientX - resizeState.startX
        const dy = e.clientY - resizeState.startY
        const { elementId, handle, initialX, initialY, initialWidth, initialHeight } = resizeState

        setElements((prev) =>
          prev.map((el) => {
            if (el.id !== elementId) return el

            let newX = initialX
            let newY = initialY
            let newWidth = initialWidth
            let newHeight = initialHeight

            const minW = el.type === 'frame' ? 140 : 60
            const minH = el.type === 'frame' ? 140 : 40

            if (handle.includes('e')) {
              newWidth = Math.max(minW, initialWidth + dx)
            }
            if (handle.includes('s')) {
              newHeight = Math.max(minH, initialHeight + dy)
            }
            if (handle.includes('w')) {
              const possibleW = initialWidth - dx
              if (possibleW >= minW) {
                newWidth = possibleW
                newX = initialX + dx
              }
            }
            if (handle.includes('n')) {
              const possibleH = initialHeight - dy
              if (possibleH >= minH) {
                newHeight = possibleH
                newY = initialY + dy
              }
            }

            return {
              ...el,
              x: Math.round(newX),
              y: Math.round(newY),
              width: Math.round(newWidth),
              height: Math.round(newHeight),
            }
          })
        )
      }
    }

    const handleGlobalMouseUp = () => {
      if (dragState || resizeState) {
        setDragState(null)
        setResizeState(null)
      }
    }

    window.addEventListener('mousemove', handleGlobalMouseMove)
    window.addEventListener('mouseup', handleGlobalMouseUp)
    return () => {
      window.removeEventListener('mousemove', handleGlobalMouseMove)
      window.removeEventListener('mouseup', handleGlobalMouseUp)
    }
  }, [dragState, resizeState])

  // Lock body scroll when whiteboard is open to prevent underlying page from scrolling
  useEffect(() => {
    if (!isOpen) return
    const originalOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = originalOverflow
    }
  }, [isOpen])

  // Canvas drawing state
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [isDrawing, setIsDrawing] = useState(false)

  // Load strokes from localStorage or start clean
  const [strokes, setStrokes] = useState<DrawStroke[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem(`tf_wb_strokes_${boardId}`)
        if (saved) return JSON.parse(saved)
      } catch {}
    }
    return []
  })
  const [redoStrokes, setRedoStrokes] = useState<DrawStroke[]>([])
  const currentStrokeRef = useRef<{
    color: string
    size: number
    isHighlighter?: boolean
    points: Array<{ x: number; y: number }>
  } | null>(null)

  // Save strokes to localStorage
  useEffect(() => {
    if (typeof window !== 'undefined' && boardId) {
      try {
        localStorage.setItem(`tf_wb_strokes_${boardId}`, JSON.stringify(strokes))
      } catch {}
    }
  }, [strokes, boardId])

  // Pan canvas state
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 })
  const [isPanning, setIsPanning] = useState(false)
  const panStartRef = useRef({ x: 0, y: 0 })

  // Floating canvas elements (sticky notes, task cards, text, shapes, frames)
  // Clean default or loaded from localStorage
  const [elements, setElements] = useState<CanvasElement[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem(`tf_wb_elements_${boardId}`)
        if (saved) return JSON.parse(saved)
      } catch {}
    }
    return []
  })

  // Save elements to localStorage
  useEffect(() => {
    if (typeof window !== 'undefined' && boardId) {
      try {
        localStorage.setItem(`tf_wb_elements_${boardId}`, JSON.stringify(elements))
      } catch {}
    }
  }, [elements, boardId])

  // Repaint canvas when strokes change
  const redrawCanvas = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.clearRect(0, 0, canvas.width, canvas.height)

    // Draw all completed strokes
    strokes.forEach((stroke) => {
      if (stroke.points.length < 2) return
      ctx.save()
      ctx.beginPath()

      if (stroke.isHighlighter) {
        ctx.globalAlpha = 0.45
        ctx.strokeStyle = stroke.color
        ctx.lineWidth = 15
        ctx.lineCap = 'square'
        ctx.lineJoin = 'miter'
      } else {
        ctx.globalAlpha = 1.0
        ctx.strokeStyle = stroke.color
        ctx.lineWidth = stroke.size
        ctx.lineCap = 'round'
        ctx.lineJoin = 'round'
      }

      ctx.moveTo(stroke.points[0].x, stroke.points[0].y)
      for (let i = 1; i < stroke.points.length; i++) {
        ctx.lineTo(stroke.points[i].x, stroke.points[i].y)
      }
      ctx.stroke()
      ctx.restore()
    })
  }, [strokes])

  // Resize canvas to match container size
  useEffect(() => {
    if (!isOpen) return
    const updateCanvasSize = () => {
      if (canvasRef.current && containerRef.current) {
        canvasRef.current.width = containerRef.current.clientWidth
        canvasRef.current.height = containerRef.current.clientHeight
        redrawCanvas()
      }
    }
    updateCanvasSize()
    window.addEventListener('resize', updateCanvasSize)
    return () => window.removeEventListener('resize', updateCanvasSize)
  }, [isOpen, redrawCanvas])

  useEffect(() => {
    redrawCanvas()
  }, [strokes, redrawCanvas])

  // Keyboard Shortcuts (Matches Reference: V, H, D, R, A, N, T, F, Shift+T, Ctrl+Z, Ctrl+Y, Delete)
  useEffect(() => {
    if (!isOpen) return
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeEl = document.activeElement as HTMLElement | null
      const isTyping =
        editingElementId !== null ||
        activeEl?.tagName === 'INPUT' ||
        activeEl?.tagName === 'TEXTAREA' ||
        activeEl?.isContentEditable ||
        Boolean(activeEl?.closest('[contenteditable="true"]')) ||
        Boolean(activeEl?.closest('textarea')) ||
        Boolean(activeEl?.closest('input'))

      if (isTyping) {
        return
      }

      // Handle Delete & Backspace for selected element
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedElementId) {
        e.preventDefault()
        setElements((prev) => prev.filter((item) => item.id !== selectedElementId))
        setSelectedElementId(null)
        setSaveToast('Element deleted')
        setTimeout(() => setSaveToast(null), 1500)
        return
      }

      if (e.key === 'v' || e.key === 'V') {
        setActiveTool('select')
      } else if (e.key === 'h' || e.key === 'H') {
        setActiveTool('hand')
      } else if (e.key === 'd' || e.key === 'D') {
        setActiveTool('draw')
      } else if (e.key === 'r' || e.key === 'R') {
        setActiveTool('rect')
      } else if (e.key === 'a' || e.key === 'A') {
        setActiveTool('arrow')
      } else if (e.key === 'n' || e.key === 'N') {
        setActiveTool('sticky')
      } else if (e.key === 't' || e.key === 'T') {
        setActiveTool('text')
      } else if (e.key === 'f' || e.key === 'F') {
        setActiveTool('folder')
      } else if (e.shiftKey && (e.key === 'T' || e.key === 't')) {
        handleAddTaskCard()
      } else if ((e.ctrlKey || e.metaKey) && (e.key === 'z' || e.key === 'Z')) {
        e.preventDefault()
        if (e.shiftKey) {
          handleRedo()
        } else {
          handleUndo()
        }
      } else if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || e.key === 'Y')) {
        e.preventDefault()
        handleRedo()
      } else if (e.key === 'Escape') {
        if (editingElementId) {
          setEditingElementId(null)
        } else if (selectedElementId) {
          setSelectedElementId(null)
        } else if (isTemplateCenterOpen) {
          setIsTemplateCenterOpen(false)
        } else {
          onClose()
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, isTemplateCenterOpen, onClose, selectedElementId, editingElementId])

  // Mouse handlers for drawing & panning
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    setSelectedElementId(null)
    setEditingElementId(null)
    setActiveColorPickerId(null)

    const rect = canvasRef.current?.getBoundingClientRect()
    if (!rect) return
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top

    if (activeTool === 'hand') {
      setIsPanning(true)
      panStartRef.current = { x: e.clientX - panOffset.x, y: e.clientY - panOffset.y }
      return
    }

    if (activeTool === 'draw') {
      if (penType === 'eraser') {
        eraseStrokesNear(x, y)
        setIsDrawing(true)
        return
      }

      setIsDrawing(true)
      const strokeSize =
        penType === 'highlighter'
          ? 16
          : strokeThickness === 'thin'
          ? 2.5
          : strokeThickness === 'medium'
          ? 5
          : 9

      const newStroke = {
        color: currentColor,
        size: strokeSize,
        isHighlighter: penType === 'highlighter',
        points: [{ x, y }],
      }
      currentStrokeRef.current = newStroke

      const ctx = canvasRef.current?.getContext('2d')
      if (ctx) {
        ctx.save()
        ctx.beginPath()
        if (newStroke.isHighlighter) {
          ctx.globalAlpha = 0.45
          ctx.strokeStyle = currentColor
          ctx.lineWidth = 15
          ctx.lineCap = 'square'
        } else {
          ctx.globalAlpha = 1.0
          ctx.strokeStyle = currentColor
          ctx.lineWidth = strokeSize
          ctx.lineCap = 'round'
        }
        ctx.moveTo(x, y)
      }
      return
    }

    if (activeTool === 'rect') {
      handleAddShape(x - 60, y - 50, activeShape)
      setActiveTool('select')
      return
    }

    if (activeTool === 'arrow') {
      handleAddConnector(x - 50, y - 20, connectorType)
      setActiveTool('select')
      return
    }

    if (activeTool === 'sticky') {
      handleAddStickyNoteAt(x - 90, y - 70)
      setActiveTool('select')
      return
    }

    if (activeTool === 'text') {
      handleAddTextAt(x, y)
      setActiveTool('select')
      return
    }

    if (activeTool === 'folder') {
      // Place Frame artboard matching Image 3
      handleAddFrameAt(x - 140, y - 80)
      setActiveTool('select')
      return
    }
  }

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (isPanning && activeTool === 'hand') {
      setPanOffset({
        x: e.clientX - panStartRef.current.x,
        y: e.clientY - panStartRef.current.y,
      })
      return
    }

    if (!isDrawing || activeTool !== 'draw') return
    const rect = canvasRef.current?.getBoundingClientRect()
    if (!rect) return
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top

    if (penType === 'eraser') {
      eraseStrokesNear(x, y)
      return
    }

    if (!currentStrokeRef.current) return
    currentStrokeRef.current.points.push({ x, y })

    const ctx = canvasRef.current?.getContext('2d')
    if (ctx) {
      ctx.lineTo(x, y)
      ctx.stroke()
    }
  }

  const handleMouseUp = () => {
    if (isPanning) {
      setIsPanning(false)
      return
    }

    if (!isDrawing) return
    setIsDrawing(false)

    if (currentStrokeRef.current) {
      const finished = currentStrokeRef.current
      setStrokes((prev) => [...prev, finished])
      setRedoStrokes([])
      currentStrokeRef.current = null
      redrawCanvas()
    }
  }

  const eraseStrokesNear = (x: number, y: number) => {
    setStrokes((prev) =>
      prev.filter((stroke) => {
        return !stroke.points.some((p) => {
          const dx = p.x - x
          const dy = p.y - y
          return Math.sqrt(dx * dx + dy * dy) < 22
        })
      })
    )
  }

  const handleUndo = () => {
    if (strokes.length === 0) return
    const last = strokes[strokes.length - 1]
    setRedoStrokes((prev) => [...prev, last])
    setStrokes((prev) => prev.slice(0, prev.length - 1))
  }

  const handleRedo = () => {
    if (redoStrokes.length === 0) return
    const next = redoStrokes[redoStrokes.length - 1]
    setRedoStrokes((prev) => prev.slice(0, prev.length - 1))
    setStrokes((prev) => [...prev, next])
  }

  const handleElementMouseDown = (e: React.MouseEvent, el: CanvasElement) => {
    e.stopPropagation()
    setActiveTool('select')
    setSelectedElementId(el.id)

    const target = e.target as HTMLElement
    if (
      target.tagName === 'INPUT' ||
      target.tagName === 'TEXTAREA' ||
      target.closest('button') ||
      target.classList.contains('resize-handle')
    ) {
      return
    }

    setDragState({
      elementId: el.id,
      startX: e.clientX,
      startY: e.clientY,
      initialX: el.x,
      initialY: el.y,
    })
  }

  const handleResizeStart = (
    e: React.MouseEvent,
    el: CanvasElement,
    handle: 'nw' | 'ne' | 'se' | 'sw' | 'e' | 's' | 'w' | 'n'
  ) => {
    e.stopPropagation()
    setResizeState({
      elementId: el.id,
      handle,
      startX: e.clientX,
      startY: e.clientY,
      initialX: el.x,
      initialY: el.y,
      initialWidth: el.width,
      initialHeight: el.height,
    })
  }

  const updateElementContent = (id: string, content: string) => {
    setElements((prev) =>
      prev.map((el) => (el.id === id ? { ...el, content } : el))
    )
  }

  const updateElementTitle = (id: string, title: string) => {
    setElements((prev) =>
      prev.map((el) => (el.id === id ? { ...el, title } : el))
    )
  }

  const updateElementColor = (id: string, color: string) => {
    setElements((prev) =>
      prev.map((el) => (el.id === id ? { ...el, color } : el))
    )
    setSaveToast('Color updated')
    setTimeout(() => setSaveToast(null), 1500)
  }

  const duplicateElement = (id: string) => {
    const el = elements.find((item) => item.id === id)
    if (!el) return
    const newEl: CanvasElement = {
      ...el,
      id: `${el.type}-${Date.now()}`,
      x: el.x + 24,
      y: el.y + 24,
    }
    setElements((prev) => [...prev, newEl])
    setSelectedElementId(newEl.id)
    setSaveToast('Element duplicated')
    setTimeout(() => setSaveToast(null), 1500)
  }

  const deleteElement = (id: string) => {
    setElements((prev) => prev.filter((item) => item.id !== id))
    if (selectedElementId === id) setSelectedElementId(null)
    if (editingElementId === id) setEditingElementId(null)
    setSaveToast('Element removed')
    setTimeout(() => setSaveToast(null), 1500)
  }

  const bringToFront = (id: string) => {
    setElements((prev) => {
      const el = prev.find((item) => item.id === id)
      if (!el) return prev
      return [...prev.filter((item) => item.id !== id), el]
    })
  }

  const sendToBack = (id: string) => {
    setElements((prev) => {
      const el = prev.find((item) => item.id === id)
      if (!el) return prev
      return [el, ...prev.filter((item) => item.id !== id)]
    })
  }

  const getContrastTextColor = (hex?: string) => {
    if (!hex || hex === 'transparent') return '#ffffff'
    const clean = hex.replace('#', '')
    if (clean.length === 6) {
      const r = parseInt(clean.substring(0, 2), 16)
      const g = parseInt(clean.substring(2, 4), 16)
      const b = parseInt(clean.substring(4, 6), 16)
      const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255
      return lum > 0.65 ? '#18181b' : '#ffffff'
    }
    return '#ffffff'
  }

  const handleAddStickyNoteAt = (x: number, y: number) => {
    const id = `sticky-${Date.now()}`
    setElements((prev) => [
      ...prev,
      {
        id,
        type: 'sticky',
        x,
        y,
        width: 190,
        height: 150,
        content: 'New Idea Note',
        color: stickyColor,
        fontSize: stickyFontSize,
        alignment: stickyAlignment,
      },
    ])
    setSelectedElementId(id)
    setEditingElementId(id)
    setActiveTool('select')
  }

  const handleAddTextAt = (x: number, y: number) => {
    const id = `text-${Date.now()}`
    setElements((prev) => [
      ...prev,
      {
        id,
        type: 'text',
        x,
        y,
        width: 180,
        height: 60,
        content: 'Add text here...',
        color: textColor,
        fontSize: textFontSize,
        alignment: textAlignment,
      },
    ])
    setSelectedElementId(id)
    setEditingElementId(id)
    setActiveTool('select')
  }

  const handleAddFrameAt = (x: number, y: number) => {
    const id = `frame-${Date.now()}`
    setElements((prev) => [
      ...prev,
      {
        id,
        type: 'frame',
        title: 'Frame',
        x,
        y,
        width: 320,
        height: 520,
        color: '#ffffff',
      },
    ])
    setSelectedElementId(id)
    setActiveTool('select')
  }

  const handleAddTaskCard = () => {
    const id = `task-${Date.now()}`
    setElements((prev) => [
      ...prev,
      {
        id,
        type: 'task',
        x: 350 + Math.random() * 80,
        y: 220 + Math.random() * 60,
        width: 240,
        height: 130,
        content: 'Task: Review Sprint Deliverables & Architecture',
        color: '#38bdf8',
      },
    ])
    setSelectedElementId(id)
    setActiveTool('select')
  }

  const handleAddShape = (x: number, y: number, shape: ShapeType) => {
    const id = `shape-${Date.now()}`
    setElements((prev) => [
      ...prev,
      {
        id,
        type: shape as any,
        x,
        y,
        width: shape === 'parallelogram' || shape === 'trapezoid' ? 160 : 130,
        height: 110,
        content: '',
        color: 'transparent',
        borderColor: shapeColor,
        borderStyle: shapeBorderStyle,
        thickness: shapeThickness === 'Thin' ? 1.5 : shapeThickness === 'Medium' ? 2.5 : 4,
        fontSize: shapeFontSize,
        alignment: shapeAlignment,
      },
    ])
    setSelectedElementId(id)
    setActiveTool('select')
  }

  const handleAddConnector = (x: number, y: number, connType: ConnectorType) => {
    const id = `conn-${Date.now()}`
    setElements((prev) => [
      ...prev,
      {
        id,
        type: 'arrow',
        x,
        y,
        width: 160,
        height: 50,
        content: connType,
        color: connectorColor,
        borderStyle: connectorStyle,
      },
    ])
  }

  const handleClearCanvas = () => {
    setStrokes([])
    setRedoStrokes([])
    setElements([])
    if (typeof window !== 'undefined' && boardId) {
      try {
        localStorage.removeItem(`tf_wb_elements_${boardId}`)
        localStorage.removeItem(`tf_wb_strokes_${boardId}`)
      } catch {}
    }
  }

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen?.().catch(() => {})
      setIsFullscreen(true)
    } else {
      document.exitFullscreen?.().catch(() => {})
      setIsFullscreen(false)
    }
  }

  // Template Center - Inject Real Template on Whiteboard
  const handleApplyTemplate = (templateKey: string) => {
    const newItems: CanvasElement[] = []
    const now = Date.now()

    if (templateKey === 'customer-journey-map') {
      const phases = [
        { title: '1. Awareness', color: '#ffedd5', border: '#fb923c', note: 'Discovers TaskFlow via social & dev forum' },
        { title: '2. Consideration', color: '#fce7f3', border: '#f472b6', note: 'Compares real-time whiteboard & team chat' },
        { title: '3. Purchase / Onboard', color: '#e0f2fe', border: '#38bdf8', note: 'Invites workspace team and sets up sprints' },
        { title: '4. Retention', color: '#dcfce7', border: '#4ade80', note: 'Daily standups & Google Meet collaboration' },
      ]

      phases.forEach((p, idx) => {
        newItems.push({
          id: `cjm-col-${now}-${idx}`,
          type: 'rect',
          x: 100 + idx * 240,
          y: 120,
          width: 220,
          height: 380,
          content: p.title,
          color: p.color,
          borderColor: p.border,
          borderStyle: 'solid',
          thickness: 2,
          alignment: 'center',
        })
        newItems.push({
          id: `cjm-note-${now}-${idx}`,
          type: 'sticky',
          x: 120 + idx * 240,
          y: 200,
          width: 180,
          height: 140,
          content: p.note,
          color: '#fef08a',
        })
      })
    } else if (templateKey === 'eisenhower-matrix') {
      newItems.push(
        {
          id: `em-1-${now}`,
          type: 'rect',
          x: 140,
          y: 120,
          width: 320,
          height: 220,
          content: 'DO FIRST\n(Urgent & Important)\n\n• Fix critical payment API bug\n• Deploy security patch',
          color: '#fef2f2',
          borderColor: '#ef4444',
          borderStyle: 'solid',
          thickness: 2.5,
        },
        {
          id: `em-2-${now}`,
          type: 'rect',
          x: 480,
          y: 120,
          width: 320,
          height: 220,
          content: 'SCHEDULE\n(Not Urgent & Important)\n\n• Q4 System Architecture roadmap\n• Team 1-on-1 mentoring',
          color: '#f0fdf4',
          borderColor: '#22c55e',
          borderStyle: 'solid',
          thickness: 2.5,
        },
        {
          id: `em-3-${now}`,
          type: 'rect',
          x: 140,
          y: 360,
          width: 320,
          height: 220,
          content: 'DELEGATE\n(Urgent & Not Important)\n\n• Routine daily status reports\n• Minor UI copy adjustments',
          color: '#fff7ed',
          borderColor: '#f97316',
          borderStyle: 'solid',
          thickness: 2.5,
        },
        {
          id: `em-4-${now}`,
          type: 'rect',
          x: 480,
          y: 360,
          width: 320,
          height: 220,
          content: "DON'T DO / ELIMINATE\n(Not Urgent & Not Important)\n\n• Unnecessary ad-hoc meetings\n• Legacy tool maintenance",
          color: '#f8fafc',
          borderColor: '#64748b',
          borderStyle: 'solid',
          thickness: 2.5,
        }
      )
    } else if (templateKey === 'bcg-matrix') {
      newItems.push(
        {
          id: `bcg-1-${now}`,
          type: 'rect',
          x: 180,
          y: 140,
          width: 300,
          height: 220,
          content: 'STARS ⭐\nHigh Growth, High Share\n\n• AI Copilot Workspace Engine',
          color: '#eff6ff',
          borderColor: '#3b82f6',
        },
        {
          id: `bcg-2-${now}`,
          type: 'rect',
          x: 500,
          y: 140,
          width: 300,
          height: 220,
          content: 'QUESTION MARKS ❓\nHigh Growth, Low Share\n\n• New Marketplace Integration',
          color: '#fffbeb',
          borderColor: '#f59e0b',
        },
        {
          id: `bcg-3-${now}`,
          type: 'rect',
          x: 180,
          y: 380,
          width: 300,
          height: 220,
          content: 'CASH COWS 🐄\nLow Growth, High Share\n\n• Core Task & Project Tracking',
          color: '#f0fdf4',
          borderColor: '#10b981',
        },
        {
          id: `bcg-4-${now}`,
          type: 'rect',
          x: 500,
          y: 380,
          width: 300,
          height: 220,
          content: 'DOGS 🐕\nLow Growth, Low Share\n\n• Legacy Export Plugin',
          color: '#fef2f2',
          borderColor: '#ef4444',
        }
      )
    } else if (templateKey === 'benchmark-analysis') {
      newItems.push({
        id: `bm-table-${now}`,
        type: 'rect',
        x: 160,
        y: 140,
        width: 680,
        height: 380,
        content: 'BENCHMARK ANALYSIS TABLE\n\nFeature | TaskFlow | Competitor A | Competitor B\n---------------------------------------------\nRealtime Whiteboard | ✓ Built-in (Krya) | $ Third-party | ✗ None\nChat & DM Tasks | ✓ Unified | Separate | Separate\nGoogle Meet Auto-Sync | ✓ Included | Plugin | ✗ None\nKanban & Sprints | ✓ Full Suite | Partial | Limited',
        color: '#181920',
        borderColor: '#6366f1',
      })
    } else if (templateKey === 'brand-guidelines') {
      newItems.push(
        {
          id: `bg-frame-${now}`,
          type: 'frame',
          title: 'Brand Guidelines Artboard',
          x: 160,
          y: 100,
          width: 680,
          height: 480,
        },
        {
          id: `bg-sticky-1-${now}`,
          type: 'sticky',
          x: 190,
          y: 160,
          width: 200,
          height: 140,
          content: 'Typography:\nInter & Outfit\nWeights: 400, 600, 800',
          color: '#fef08a',
        },
        {
          id: `bg-sticky-2-${now}`,
          type: 'sticky',
          x: 420,
          y: 160,
          width: 200,
          height: 140,
          content: 'Color Palette:\n• Primary: #6366f1 (Indigo)\n• Dark: #0d0e12 (Obsidian)\n• Accent: #f59e0b (Amber)',
          color: '#e0e7ff',
        }
      )
    }

    setElements((prev) => [...prev, ...newItems])
    setIsTemplateCenterOpen(false)
    setSaveToast(`Template applied to whiteboard!`)
    setTimeout(() => setSaveToast(null), 2500)
  }

  // Template Search Filter
  const templatesList = useMemo(() => {
    const list = [
      {
        id: 'customer-journey-map',
        title: 'Customer Journey Map',
        category: 'Featured',
        tag: 'Product',
        isFeatured: true,
        previewType: 'journey',
      },
      {
        id: 'eisenhower-matrix',
        title: 'Eisenhower Matrix',
        category: 'Featured',
        tag: 'Prioritization',
        isFeatured: true,
        previewType: 'matrix',
      },
      {
        id: 'bcg-matrix',
        title: 'BCG Matrix',
        category: 'Marketing',
        tag: 'Strategy',
        isFeatured: false,
        previewType: 'bcg',
      },
      {
        id: 'benchmark-analysis',
        title: 'Benchmark Analysis',
        category: 'Marketing',
        tag: 'Competitive',
        isFeatured: false,
        previewType: 'benchmark',
      },
      {
        id: 'brand-guidelines',
        title: 'Brand Guidelines',
        category: 'Marketing',
        tag: 'Design',
        isFeatured: false,
        previewType: 'brand',
      },
    ]

    if (!templateSearchQuery.trim()) return list
    const q = templateSearchQuery.toLowerCase()
    return list.filter((t) => t.title.toLowerCase().includes(q) || t.category.toLowerCase().includes(q) || t.tag.toLowerCase().includes(q))
  }, [templateSearchQuery])

  if (!isOpen || !mounted) return null

  const userInitial = ((user as any)?.name || user?.email?.split('@')[0] || 'A')[0].toUpperCase()

  return createPortal(
    <div className="fixed inset-0 z-[99999] w-screen h-screen bg-[#0d0e12] flex flex-col overflow-hidden text-zinc-100 font-sans select-none animate-fade-in">
      <div
        ref={containerRef}
        className="relative w-full h-full bg-[#0d0e12] flex flex-col overflow-hidden text-zinc-100 font-sans"
      >
        {/* ── TOP HEADER (Back Arrow, Yellow krya pill, Title Input, Star, Saved Badge, Share, Fullscreen, Close) ── */}
        <header className="h-13 px-4 flex items-center justify-between border-b border-zinc-800 bg-[#121318] z-30 shrink-0 select-none">
          {/* Left: Back Arrow + Yellow krya pill + Star + Title + Saved */}
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors cursor-pointer mr-0.5"
              title="Exit Whiteboard (Esc)"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>

            {/* Yellow pill displaying the whiteboard name (e.g. 'demo') */}
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-amber-400 text-black font-extrabold text-xs shadow-md shadow-amber-400/20 select-none">
              <Sparkles className="w-3.5 h-3.5 fill-black shrink-0" />
              <input
                type="text"
                value={title}
                size={Math.max((title || '').length, 3)}
                onChange={(e) => setTitle(e.target.value)}
                className="bg-transparent font-extrabold text-xs text-black border-none outline-none tracking-tight p-0"
                title="Click to rename whiteboard"
                placeholder="Whiteboard"
              />
            </div>

            <button
              type="button"
              onClick={() => setIsStarred(!isStarred)}
              className={`p-1.5 rounded-lg hover:bg-zinc-800 transition-colors cursor-pointer ${
                isStarred ? 'text-amber-400 fill-amber-400' : 'text-zinc-500 hover:text-zinc-300'
              }`}
              title={isStarred ? 'Unstar whiteboard' : 'Star whiteboard'}
            >
              <Star className={`w-4 h-4 ${isStarred ? 'fill-amber-400 text-amber-400' : ''}`} />
            </button>

            <div className="hidden sm:flex items-center gap-1 text-[11px] text-zinc-500 font-medium ml-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
              <span>Saved</span>
            </div>
          </div>

          {/* Right: Collaborator Avatar, Share, Clear, Fullscreen, Close */}
          <div className="flex items-center gap-2">
            <div className="flex items-center -space-x-1.5 mr-1" title={`${(user as any)?.name || user?.email || 'You'} (Active now)`}>
              <div className="relative">
                <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-amber-500 to-amber-300 text-black border-2 border-[#121318] flex items-center justify-center text-xs font-extrabold shadow-xs">
                  {userInitial}
                </div>
                <span className="absolute bottom-0 right-0 w-2 h-2 rounded-full bg-emerald-500 border border-[#121318]" />
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                if (navigator.clipboard) {
                  navigator.clipboard.writeText(window.location.href)
                  setSaveToast('Whiteboard link copied!')
                  setTimeout(() => setSaveToast(null), 2500)
                }
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 border border-zinc-700/60 text-xs font-semibold text-zinc-200 transition-all cursor-pointer shadow-xs"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>Share</span>
            </button>

            <button
              type="button"
              onClick={handleClearCanvas}
              className="p-1.5 rounded-xl text-zinc-400 hover:text-rose-400 hover:bg-rose-500/10 border border-transparent hover:border-rose-500/20 transition-colors cursor-pointer"
              title="Clear Canvas"
            >
              <Trash2 className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={toggleFullscreen}
              className="p-1.5 rounded-xl text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition-colors cursor-pointer"
              title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>

            <button
              type="button"
              onClick={onClose}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-800/80 hover:bg-rose-500/20 text-zinc-300 hover:text-rose-300 border border-zinc-700/50 hover:border-rose-500/30 text-xs font-semibold transition-all cursor-pointer ml-1"
              title="Close Whiteboard (Esc)"
            >
              <X className="w-4 h-4" />
              <span>Close</span>
            </button>
          </div>
        </header>

        {/* ── CANVAS AREA (Dot grid background matching Reference Images) ── */}
        <div className="relative flex-1 w-full h-full overflow-hidden bg-[#0d0e12]">
          {/* Subtle dot-grid pattern background */}
          <div
            className="absolute inset-0 pointer-events-none opacity-40"
            style={{
              backgroundImage: 'radial-gradient(circle, #45474e 1.2px, transparent 1.2px)',
              backgroundSize: '24px 24px',
            }}
          />

          {/* Interactive HTML5 drawing canvas */}
          <canvas
            ref={canvasRef}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            className={`absolute inset-0 w-full h-full z-10 ${
              activeTool === 'draw'
                ? penType === 'eraser'
                  ? 'cursor-cell'
                  : 'cursor-crosshair'
                : activeTool === 'hand'
                ? isPanning
                  ? 'cursor-grabbing'
                  : 'cursor-grab'
                : activeTool === 'rect' || activeTool === 'arrow' || activeTool === 'sticky' || activeTool === 'folder'
                ? 'cursor-crosshair'
                : 'cursor-default'
            }`}
          />

          {/* Movable & Editable Canvas Elements */}
          <div className="absolute inset-0 pointer-events-none z-20">
            {elements.map((el) => {
              const isSelected = selectedElementId === el.id
              const isEditing = editingElementId === el.id

              const renderResizeHandles = () => (
                <>
                  <div
                    onMouseDown={(e) => handleResizeStart(e, el, 'nw')}
                    className="absolute -top-1.5 -left-1.5 w-3 h-3 bg-white border-2 border-sky-500 rounded-[2px] shadow-md cursor-nwse-resize resize-handle z-30 pointer-events-auto hover:scale-125 transition-transform"
                    title="Resize Top-Left"
                  />
                  <div
                    onMouseDown={(e) => handleResizeStart(e, el, 'ne')}
                    className="absolute -top-1.5 -right-1.5 w-3 h-3 bg-white border-2 border-sky-500 rounded-[2px] shadow-md cursor-nesw-resize resize-handle z-30 pointer-events-auto hover:scale-125 transition-transform"
                    title="Resize Top-Right"
                  />
                  <div
                    onMouseDown={(e) => handleResizeStart(e, el, 'se')}
                    className="absolute -bottom-1.5 -right-1.5 w-3 h-3 bg-white border-2 border-sky-500 rounded-[2px] shadow-md cursor-nwse-resize resize-handle z-30 pointer-events-auto hover:scale-125 transition-transform"
                    title="Resize Bottom-Right"
                  />
                  <div
                    onMouseDown={(e) => handleResizeStart(e, el, 'sw')}
                    className="absolute -bottom-1.5 -left-1.5 w-3 h-3 bg-white border-2 border-sky-500 rounded-[2px] shadow-md cursor-nesw-resize resize-handle z-30 pointer-events-auto hover:scale-125 transition-transform"
                    title="Resize Bottom-Left"
                  />
                  <div
                    onMouseDown={(e) => handleResizeStart(e, el, 'n')}
                    className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-white border-2 border-sky-500 rounded-[2px] shadow-md cursor-ns-resize resize-handle z-30 pointer-events-auto hover:scale-125 transition-transform"
                    title="Resize Height"
                  />
                  <div
                    onMouseDown={(e) => handleResizeStart(e, el, 's')}
                    className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-white border-2 border-sky-500 rounded-[2px] shadow-md cursor-ns-resize resize-handle z-30 pointer-events-auto hover:scale-125 transition-transform"
                    title="Resize Height"
                  />
                  <div
                    onMouseDown={(e) => handleResizeStart(e, el, 'w')}
                    className="absolute top-1/2 -left-1.5 -translate-y-1/2 w-3 h-3 bg-white border-2 border-sky-500 rounded-[2px] shadow-md cursor-ew-resize resize-handle z-30 pointer-events-auto hover:scale-125 transition-transform"
                    title="Resize Width"
                  />
                  <div
                    onMouseDown={(e) => handleResizeStart(e, el, 'e')}
                    className="absolute top-1/2 -right-1.5 -translate-y-1/2 w-3 h-3 bg-white border-2 border-sky-500 rounded-[2px] shadow-md cursor-ew-resize resize-handle z-30 pointer-events-auto hover:scale-125 transition-transform"
                    title="Resize Width"
                  />
                </>
              )

              const renderFloatingToolbar = () => (
                <div
                  className={`absolute ${el.y < 65 ? 'top-full mt-2' : '-top-12'} left-1/2 -translate-x-1/2 flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-[#14151a]/95 backdrop-blur-2xl border border-white/20 shadow-2xl z-40 select-none pointer-events-auto animate-fade-in`}
                  onClick={(e) => e.stopPropagation()}
                  onMouseDown={(e) => e.stopPropagation()}
                >
                  {/* Edit text button */}
                  {el.type !== 'arrow' && (
                    <button
                      type="button"
                      onClick={() => setEditingElementId(el.id)}
                      className="flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-white/10 text-zinc-300 hover:text-white text-xs font-medium transition-colors cursor-pointer"
                      title="Edit Text"
                    >
                      <Type className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Edit</span>
                    </button>
                  )}

                  {/* Duplicate */}
                  <button
                    type="button"
                    onClick={() => duplicateElement(el.id)}
                    className="p-1.5 rounded-lg hover:bg-white/10 text-zinc-300 hover:text-white transition-colors cursor-pointer"
                    title="Duplicate"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>

                  {/* Color picker dropdown */}
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setActiveColorPickerId(activeColorPickerId === el.id ? null : el.id)}
                      className="p-1.5 rounded-lg hover:bg-white/10 text-zinc-300 hover:text-white transition-colors cursor-pointer flex items-center gap-1"
                      title="Change Color"
                    >
                      <div
                        className="w-3.5 h-3.5 rounded-full border border-white/40 shadow-xs"
                        style={{ backgroundColor: el.color || '#38bdf8' }}
                      />
                    </button>

                    {activeColorPickerId === el.id && (
                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 p-2 rounded-2xl bg-zinc-900/98 backdrop-blur-2xl border border-zinc-700 shadow-2xl flex items-center gap-1.5 z-50 animate-scale-in">
                        {(el.type === 'sticky' ? STICKY_PASTEL_COLORS : el.type === 'text' ? TEXT_COLORS : PEN_COLORS).map((c) => (
                          <button
                            key={c}
                            type="button"
                            onClick={() => {
                              updateElementColor(el.id, c)
                              setActiveColorPickerId(null)
                            }}
                            style={{ backgroundColor: c }}
                            className="w-4 h-4 rounded-full border border-black/30 hover:scale-130 transition-transform cursor-pointer"
                          />
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="w-[1px] h-4 bg-white/15 mx-0.5" />

                  {/* Bring to Front */}
                  <button
                    type="button"
                    onClick={() => bringToFront(el.id)}
                    className="p-1.5 rounded-lg hover:bg-white/10 text-zinc-300 hover:text-white transition-colors cursor-pointer"
                    title="Bring to Front"
                  >
                    <Layers className="w-3.5 h-3.5" />
                  </button>

                  <div className="w-[1px] h-4 bg-white/15 mx-0.5" />

                  {/* Delete button */}
                  <button
                    type="button"
                    onClick={() => deleteElement(el.id)}
                    className="p-1.5 rounded-lg hover:bg-rose-500/20 text-zinc-400 hover:text-rose-400 transition-colors cursor-pointer"
                    title="Delete Element (Backspace/Delete)"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              )

              if (el.type === 'frame') {
                return (
                  <div
                    key={el.id}
                    onMouseDown={(e) => handleElementMouseDown(e, el)}
                    onClick={(e) => {
                      e.stopPropagation()
                      setSelectedElementId(el.id)
                    }}
                    style={{
                      left: el.x,
                      top: el.y,
                      width: el.width,
                      height: el.height,
                    }}
                    className={`absolute pointer-events-auto bg-white rounded-xl shadow-2xl border transition-all cursor-move select-none group ${
                      isSelected ? 'border-sky-500 ring-2 ring-sky-500/60 shadow-sky-500/10' : 'border-zinc-200 hover:border-zinc-400'
                    }`}
                  >
                    {/* Frame Tab Label on Top Left */}
                    <div className="absolute -top-7 left-0 px-2.5 py-1 rounded-t-md bg-white text-zinc-900 font-bold text-[11px] shadow-xs border-t border-l border-r border-zinc-200 flex items-center gap-1 cursor-text select-text">
                      <input
                        value={el.title || 'Frame'}
                        onChange={(e) => updateElementTitle(el.id, e.target.value)}
                        onClick={(e) => e.stopPropagation()}
                        onMouseDown={(e) => e.stopPropagation()}
                        className="bg-transparent border-none outline-none font-bold text-[11px] text-zinc-900 w-24 hover:bg-zinc-100/80 focus:bg-zinc-100 rounded px-0.5"
                        placeholder="Frame name"
                      />
                    </div>

                    {/* Floating toolbar when selected */}
                    {isSelected && renderFloatingToolbar()}

                    {/* 8 Resize handles when selected */}
                    {isSelected && renderResizeHandles()}

                    {/* Hover / selection delete button */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        deleteElement(el.id)
                      }}
                      className="absolute -top-3 -right-3 w-5 h-5 rounded-full bg-zinc-800 border border-zinc-600 text-zinc-400 hover:text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer shadow-md z-30"
                      title="Remove Frame"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                )
              }

              return (
                <div
                  key={el.id}
                  onMouseDown={(e) => handleElementMouseDown(e, el)}
                  onClick={(e) => {
                    e.stopPropagation()
                    setSelectedElementId(el.id)
                    if (el.type === 'text') {
                      setEditingElementId(el.id)
                    }
                  }}
                  onDoubleClick={(e) => {
                    e.stopPropagation()
                    setSelectedElementId(el.id)
                    setEditingElementId(el.id)
                  }}
                  style={{
                    left: el.x,
                    top: el.y,
                    width: el.width,
                    minHeight: el.height,
                    height: el.height,
                    backgroundColor: el.color || undefined,
                    borderColor: el.borderColor || undefined,
                  }}
                  className={`absolute pointer-events-auto p-3.5 rounded-2xl shadow-2xl transition-all border group flex flex-col ${
                    dragState?.elementId === el.id ? 'cursor-grabbing' : 'cursor-move'
                  } ${
                    isSelected ? 'ring-2 ring-sky-500 shadow-sky-500/20 shadow-xl' : ''
                  } ${
                    el.type === 'sticky'
                      ? 'text-zinc-900 border-black/10 rotate-[-1deg]'
                      : el.type === 'task'
                      ? 'bg-zinc-900/90 border-sky-500/40 text-zinc-100 backdrop-blur-md'
                      : el.type === 'rect'
                      ? 'border text-white rounded-xl'
                      : el.type === 'circle'
                      ? 'bg-zinc-900/40 border border-white/80 text-white rounded-full flex items-center justify-center'
                      : el.type === 'triangle'
                      ? 'bg-zinc-900/40 border border-white/80 text-white clip-triangle'
                      : el.type === 'diamond'
                      ? 'bg-zinc-900/40 border border-white/80 text-white rotate-45 flex items-center justify-center'
                      : el.type === 'star'
                      ? 'bg-zinc-900/40 border border-amber-400 text-white rounded-xl'
                      : el.type === 'cloud'
                      ? 'bg-zinc-900/40 border border-sky-400 text-white rounded-3xl'
                      : el.type === 'arrow'
                      ? 'bg-zinc-900/80 border border-white/60 text-white flex items-center justify-center gap-2'
                      : 'bg-zinc-800/90 text-white border-zinc-700'
                  }`}
                >
                  {/* Floating toolbar when selected */}
                  {isSelected && renderFloatingToolbar()}

                  {/* 8 Resize handles when selected */}
                  {isSelected && renderResizeHandles()}

                  {/* Delete button on hover */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      deleteElement(el.id)
                    }}
                    className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-zinc-800 border border-zinc-600 text-zinc-400 hover:text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer shadow-md z-30"
                    title="Remove Element"
                  >
                    <X className="w-3 h-3" />
                  </button>

                  {el.type === 'task' && (
                    <div className="flex items-center gap-1.5 text-[10px] font-bold text-sky-400 mb-2 uppercase tracking-wider select-none shrink-0">
                      <CheckSquare className="w-3.5 h-3.5" />
                      <span>Task Card</span>
                    </div>
                  )}

                  {el.type === 'arrow' && (
                    <div className="flex items-center gap-2 text-xs font-semibold text-zinc-300 select-none">
                      <div className="w-12 h-0.5 bg-white" />
                      <ArrowRight className="w-4 h-4 text-white" />
                      <span>Connector</span>
                    </div>
                  )}

                  {el.type !== 'arrow' && (
                    <div className="w-full flex-1 flex flex-col justify-center min-h-[30px]">
                      {isEditing ? (
                        <textarea
                          autoFocus
                          value={el.content || ''}
                          onChange={(e) => updateElementContent(el.id, e.target.value)}
                          onBlur={() => setEditingElementId(null)}
                          onKeyDown={(e) => {
                            if (e.key === 'Escape') {
                              setEditingElementId(null)
                            }
                            e.stopPropagation()
                          }}
                          onClick={(e) => e.stopPropagation()}
                          onMouseDown={(e) => e.stopPropagation()}
                          className="w-full h-full min-h-[40px] bg-transparent resize-none outline-none border-none leading-relaxed font-medium select-text cursor-text p-0.5"
                          style={{
                            color: getContrastTextColor(el.color),
                            textAlign: el.alignment || 'left',
                            fontSize: el.fontSize === 'Large' ? '15px' : el.fontSize === 'Small' ? '11px' : '13px',
                          }}
                          placeholder="Add text here..."
                        />
                      ) : (
                        <div
                          onDoubleClick={(e) => {
                            e.stopPropagation()
                            setActiveTool('select')
                            setSelectedElementId(el.id)
                            setEditingElementId(el.id)
                          }}
                          onClick={(e) => {
                            e.stopPropagation()
                            setActiveTool('select')
                            setSelectedElementId(el.id)
                            if (isSelected || el.type === 'text') {
                              setEditingElementId(el.id)
                            }
                          }}
                          className={`w-full h-full leading-relaxed outline-none font-medium cursor-text select-text ${
                            el.fontSize === 'Large' ? 'text-sm' : el.fontSize === 'Small' ? 'text-[11px]' : 'text-xs'
                          } ${
                            el.alignment === 'center' ? 'text-center' : el.alignment === 'right' ? 'text-right' : 'text-left'
                          }`}
                          style={{
                            color: getContrastTextColor(el.color),
                          }}
                        >
                          {el.content ? (
                            el.content
                          ) : (
                            <span className="opacity-40 italic select-none">
                              {el.type === 'text' ? 'Add text here...' : 'Click to add text...'}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {/* Toast Notification */}
          {saveToast && (
            <div className="absolute bottom-6 right-6 z-40 flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 text-white text-xs font-bold shadow-xl animate-scale-in">
              <Check className="w-4 h-4" />
              <span>{saveToast}</span>
            </div>
          )}
        </div>

        {/* ── 2-TIER FLOATING DOCK TOOLBAR (Matches Reference Images 1, 2, 3, 4, 5) ── */}
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-40 flex flex-col items-center gap-2 select-none pointer-events-auto">
          {/* ══════════════════════════════════════════════════════════════
              TIER 1: CONTEXTUAL SUB-TOOLBAR
              ══════════════════════════════════════════════════════════════ */}

          {/* MODE 1: PEN / DRAW CONTEXTUAL BAR (Image 3) */}
          {activeTool === 'draw' && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-2xl bg-[#14151a]/95 backdrop-blur-2xl border border-white/10 shadow-2xl animate-fade-in text-xs">
              <button
                type="button"
                onClick={() => setPenType('pen')}
                className={`flex items-center gap-1 px-2 py-1.5 rounded-xl transition-all cursor-pointer ${
                  penType === 'pen'
                    ? 'bg-zinc-700/80 text-white border border-white/20 shadow-xs'
                    : 'text-zinc-400 hover:text-white hover:bg-zinc-800/60'
                }`}
                title="Fine Pen Tip"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none">
                  <path d="M12 2L9 8H15L12 2Z" fill="#ffffff" stroke="#ffffff" strokeWidth="1.5" />
                  <rect x="9" y="8" width="6" height="12" rx="1" fill="#3f3f46" stroke="#52525b" />
                </svg>
                <ChevronDown className="w-2.5 h-2.5 opacity-70" />
              </button>

              <button
                type="button"
                onClick={() => setPenType('highlighter')}
                className={`flex items-center gap-1 px-2 py-1.5 rounded-xl transition-all cursor-pointer ${
                  penType === 'highlighter'
                    ? 'bg-zinc-700/80 text-white border border-white/20 shadow-xs'
                    : 'text-zinc-400 hover:text-white hover:bg-zinc-800/60'
                }`}
                title="Chisel Highlighter Tip"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none">
                  <path d="M8 3L14 3L16 8L8 8Z" fill="#eab308" />
                  <rect x="8" y="8" width="8" height="12" rx="1" fill="#3f3f46" stroke="#52525b" />
                </svg>
                <ChevronDown className="w-2.5 h-2.5 opacity-70" />
              </button>

              <button
                type="button"
                onClick={() => setPenType('eraser')}
                className={`p-1.5 rounded-xl transition-all cursor-pointer ${
                  penType === 'eraser'
                    ? 'bg-zinc-700/80 text-white border border-white/20 shadow-xs'
                    : 'text-zinc-400 hover:text-white hover:bg-zinc-800/60'
                }`}
                title="Eraser"
              >
                <Eraser className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={() => setPenType('pointer')}
                className={`p-1.5 rounded-xl transition-all cursor-pointer ${
                  penType === 'pointer'
                    ? 'bg-zinc-700/80 text-white border border-white/20 shadow-xs'
                    : 'text-zinc-400 hover:text-white hover:bg-zinc-800/60'
                }`}
                title="Laser Pointer"
              >
                <div className="w-3.5 h-3.5 rounded-full border border-dashed border-zinc-400 flex items-center justify-center">
                  <div className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-ping" />
                </div>
              </button>

              <div className="w-[1px] h-5 bg-white/10 mx-1" />

              {/* 12 Color Dots Palette */}
              <div className="flex items-center gap-1.5">
                {PEN_COLORS.map((color) => {
                  const isSelected = currentColor.toLowerCase() === color.toLowerCase()
                  return (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setCurrentColor(color)}
                      style={{ backgroundColor: color }}
                      className={`w-5 h-5 rounded-full cursor-pointer transition-all hover:scale-125 ${
                        isSelected
                          ? 'ring-2 ring-white ring-offset-2 ring-offset-[#14151a] scale-110 shadow-lg'
                          : 'border border-black/40'
                      }`}
                      title={color}
                    />
                  )
                })}
              </div>

              <div className="w-[1px] h-5 bg-white/10 mx-1" />

              <div className="relative">
                <button
                  type="button"
                  onClick={() => setIsStrokeDropdownOpen(!isStrokeDropdownOpen)}
                  className="flex items-center gap-1 p-1.5 rounded-xl hover:bg-zinc-800/60 text-zinc-300 transition-colors cursor-pointer"
                  title="Line Thickness"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none">
                    <line
                      x1="4"
                      y1="20"
                      x2="20"
                      y2="4"
                      stroke="currentColor"
                      strokeWidth={strokeThickness === 'thin' ? 2 : strokeThickness === 'medium' ? 3.5 : 5}
                      strokeLinecap="round"
                    />
                  </svg>
                  <ChevronDown className="w-2.5 h-2.5 opacity-70" />
                </button>

                {isStrokeDropdownOpen && (
                  <div className="absolute bottom-full right-0 mb-2 p-1.5 rounded-xl bg-zinc-900 border border-zinc-700 shadow-2xl flex flex-col gap-1 z-50 text-xs">
                    {(['thin', 'medium', 'thick'] as const).map((t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => {
                          setStrokeThickness(t)
                          setIsStrokeDropdownOpen(false)
                        }}
                        className={`px-3 py-1.5 rounded-lg text-left capitalize cursor-pointer transition-colors ${
                          strokeThickness === t ? 'bg-zinc-700 text-white font-bold' : 'text-zinc-300 hover:bg-zinc-800'
                        }`}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* MODE 2: SHAPES CONTEXTUAL BAR (Image 4) */}
          {activeTool === 'rect' && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-2xl bg-[#14151a]/95 backdrop-blur-2xl border border-white/10 shadow-2xl animate-fade-in text-xs">
              <button
                type="button"
                onClick={() => setActiveShape('square')}
                className={`p-1.5 rounded-xl transition-all cursor-pointer ${
                  activeShape === 'square' ? 'bg-zinc-700/80 text-white border border-white/20' : 'text-zinc-400 hover:text-white hover:bg-zinc-800/60'
                }`}
                title="Rectangle / Square"
              >
                <Square className="w-4 h-4 text-white" />
              </button>

              <button
                type="button"
                onClick={() => setActiveShape('circle')}
                className={`p-1.5 rounded-xl transition-all cursor-pointer ${
                  activeShape === 'circle' ? 'bg-zinc-700/80 text-white border border-white/20' : 'text-zinc-400 hover:text-white hover:bg-zinc-800/60'
                }`}
                title="Circle"
              >
                <Circle className="w-4 h-4 text-white" />
              </button>

              <button
                type="button"
                onClick={() => setActiveShape('triangle')}
                className={`p-1.5 rounded-xl transition-all cursor-pointer ${
                  activeShape === 'triangle' ? 'bg-zinc-700/80 text-white border border-white/20' : 'text-zinc-400 hover:text-white hover:bg-zinc-800/60'
                }`}
                title="Triangle"
              >
                <Triangle className="w-4 h-4 text-white" />
              </button>

              <button
                type="button"
                onClick={() => setActiveShape('diamond')}
                className={`p-1.5 rounded-xl transition-all cursor-pointer ${
                  activeShape === 'diamond' ? 'bg-zinc-700/80 text-white border border-white/20' : 'text-zinc-400 hover:text-white hover:bg-zinc-800/60'
                }`}
                title="Diamond"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none">
                  <polygon points="12,2 22,12 12,22 2,12" fill="none" stroke="currentColor" strokeWidth="2" />
                </svg>
              </button>

              <button
                type="button"
                onClick={() => setActiveShape('parallelogram')}
                className={`p-1.5 rounded-xl transition-all cursor-pointer ${
                  activeShape === 'parallelogram' ? 'bg-zinc-700/80 text-white border border-white/20' : 'text-zinc-400 hover:text-white hover:bg-zinc-800/60'
                }`}
                title="Parallelogram"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none">
                  <polygon points="6,4 22,4 18,20 2,20" fill="none" stroke="currentColor" strokeWidth="2" />
                </svg>
              </button>

              <button
                type="button"
                onClick={() => setActiveShape('trapezoid')}
                className={`p-1.5 rounded-xl transition-all cursor-pointer ${
                  activeShape === 'trapezoid' ? 'bg-zinc-700/80 text-white border border-white/20' : 'text-zinc-400 hover:text-white hover:bg-zinc-800/60'
                }`}
                title="Trapezoid"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none">
                  <polygon points="7,4 17,4 22,20 2,20" fill="none" stroke="currentColor" strokeWidth="2" />
                </svg>
              </button>

              <button
                type="button"
                onClick={() => setActiveShape('hexagon')}
                className={`p-1.5 rounded-xl transition-all cursor-pointer ${
                  activeShape === 'hexagon' ? 'bg-zinc-700/80 text-white border border-white/20' : 'text-zinc-400 hover:text-white hover:bg-zinc-800/60'
                }`}
                title="Hexagon"
              >
                <Hexagon className="w-4 h-4 text-white" />
              </button>

              <button
                type="button"
                onClick={() => setActiveShape('cloud')}
                className={`p-1.5 rounded-xl transition-all cursor-pointer ${
                  activeShape === 'cloud' ? 'bg-zinc-700/80 text-white border border-white/20' : 'text-zinc-400 hover:text-white hover:bg-zinc-800/60'
                }`}
                title="Cloud"
              >
                <Cloud className="w-4 h-4 text-white" />
              </button>

              <button
                type="button"
                onClick={() => setActiveShape('star')}
                className={`p-1.5 rounded-xl transition-all cursor-pointer ${
                  activeShape === 'star' ? 'bg-zinc-700/80 text-white border border-white/20' : 'text-zinc-400 hover:text-white hover:bg-zinc-800/60'
                }`}
                title="Star"
              >
                <StarIcon className="w-4 h-4 text-white" />
              </button>

              <div className="w-[1px] h-5 bg-white/10 mx-1" />

              {/* Color swatch */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setIsShapeColorPickerOpen(!isShapeColorPickerOpen)}
                  className="flex items-center gap-1 p-1 rounded-xl hover:bg-zinc-800/60 transition-colors cursor-pointer"
                >
                  <div className="w-4 h-4 rounded-full border border-zinc-400 shadow-xs" style={{ backgroundColor: shapeColor }} />
                  <ChevronDown className="w-2.5 h-2.5 opacity-70" />
                </button>

                {isShapeColorPickerOpen && (
                  <div className="absolute bottom-full right-0 mb-2 p-2 rounded-2xl bg-zinc-900 border border-zinc-700 shadow-2xl flex gap-1.5 z-50">
                    {PEN_COLORS.map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => {
                          setShapeColor(c)
                          setIsShapeColorPickerOpen(false)
                        }}
                        style={{ backgroundColor: c }}
                        className="w-5 h-5 rounded-full border border-zinc-700 hover:scale-125 transition-transform"
                      />
                    ))}
                  </div>
                )}
              </div>

              {/* Border style */}
              <button
                type="button"
                onClick={() => setShapeBorderStyle((prev) => (prev === 'solid' ? 'dashed' : prev === 'dashed' ? 'dotted' : 'solid'))}
                className="flex items-center gap-1 p-1.5 rounded-xl hover:bg-zinc-800/60 text-zinc-300 transition-colors cursor-pointer"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none">
                  <line
                    x1="4"
                    y1="20"
                    x2="20"
                    y2="4"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeDasharray={shapeBorderStyle === 'dashed' ? '4 3' : shapeBorderStyle === 'dotted' ? '1 3' : undefined}
                  />
                </svg>
                <ChevronDown className="w-2.5 h-2.5 opacity-70" />
              </button>

              <button
                type="button"
                onClick={() => setShapeFontSize((prev) => (prev === 'Small' ? 'Medium' : prev === 'Medium' ? 'Large' : 'Small'))}
                className="flex items-center gap-1 px-1.5 py-1 rounded-xl hover:bg-zinc-800/60 text-zinc-300 font-semibold transition-colors cursor-pointer"
              >
                <span>Aa</span>
                <ChevronDown className="w-2.5 h-2.5 opacity-70" />
              </button>

              <div className="relative">
                <button
                  type="button"
                  onClick={() => setIsShapeThicknessOpen(!isShapeThicknessOpen)}
                  className="flex items-center gap-1 px-2 py-1 rounded-xl text-zinc-300 hover:bg-zinc-800/60 transition-colors cursor-pointer font-medium"
                >
                  <span>{shapeThickness}</span>
                  <ChevronDown className="w-2.5 h-2.5 opacity-70" />
                </button>

                {isShapeThicknessOpen && (
                  <div className="absolute bottom-full right-0 mb-2 p-1.5 rounded-xl bg-zinc-900 border border-zinc-700 shadow-2xl flex flex-col gap-1 z-50 text-xs">
                    {(['Thin', 'Medium', 'Bold'] as const).map((t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => {
                          setShapeThickness(t)
                          setIsShapeThicknessOpen(false)
                        }}
                        className={`px-3 py-1.5 rounded-lg text-left cursor-pointer transition-colors ${
                          shapeThickness === t ? 'bg-zinc-700 text-white font-bold' : 'text-zinc-300 hover:bg-zinc-800'
                        }`}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <button
                type="button"
                onClick={() => setShapeAlignment((prev) => (prev === 'left' ? 'center' : prev === 'center' ? 'right' : 'left'))}
                className="flex items-center gap-1 p-1.5 rounded-xl hover:bg-zinc-800/60 text-zinc-300 transition-colors cursor-pointer"
              >
                {shapeAlignment === 'left' ? <AlignLeft className="w-4 h-4" /> : shapeAlignment === 'center' ? <AlignCenter className="w-4 h-4" /> : <AlignRight className="w-4 h-4" />}
                <ChevronDown className="w-2.5 h-2.5 opacity-70" />
              </button>
            </div>
          )}

          {/* MODE 3: CONNECTOR / ARROW CONTEXTUAL BAR (Image 5) */}
          {activeTool === 'arrow' && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-2xl bg-[#14151a]/95 backdrop-blur-2xl border border-white/10 shadow-2xl animate-fade-in text-xs">
              <button
                type="button"
                onClick={() => setConnectorType('straight')}
                className={`flex items-center gap-1 px-2 py-1.5 rounded-xl transition-all cursor-pointer ${
                  connectorType === 'straight' ? 'bg-zinc-700/80 text-white border border-white/20' : 'text-zinc-400 hover:text-white hover:bg-zinc-800/60'
                }`}
                title="Straight Line"
              >
                <Minus className="w-4 h-4 text-white" />
                <ChevronDown className="w-2.5 h-2.5 opacity-70" />
              </button>

              <button
                type="button"
                onClick={() => setConnectorType('curved')}
                className={`flex items-center gap-1 px-2 py-1.5 rounded-xl transition-all cursor-pointer ${
                  connectorType === 'curved' ? 'bg-zinc-700/80 text-white border border-white/20' : 'text-zinc-400 hover:text-white hover:bg-zinc-800/60'
                }`}
                title="Curved / Spline Line"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none">
                  <path d="M4 18 C 10 18, 10 6, 20 6" stroke="currentColor" strokeWidth="2" fill="none" />
                </svg>
                <ChevronDown className="w-2.5 h-2.5 opacity-70" />
              </button>

              <button
                type="button"
                onClick={() => setConnectorType('arrow')}
                className={`flex items-center gap-1 px-2 py-1.5 rounded-xl transition-all cursor-pointer ${
                  connectorType === 'arrow' ? 'bg-zinc-700/80 text-white border border-white/20' : 'text-zinc-400 hover:text-white hover:bg-zinc-800/60'
                }`}
                title="Arrow"
              >
                <ArrowRight className="w-4 h-4 text-white" />
                <ChevronDown className="w-2.5 h-2.5 opacity-70" />
              </button>

              <div className="w-[1px] h-5 bg-white/10 mx-1" />

              <div className="relative">
                <button
                  type="button"
                  onClick={() => setIsConnectorColorOpen(!isConnectorColorOpen)}
                  className="flex items-center gap-1 p-1 rounded-xl hover:bg-zinc-800/60 transition-colors cursor-pointer"
                >
                  <div className="w-4 h-4 rounded-full border border-zinc-400 shadow-xs" style={{ backgroundColor: connectorColor }} />
                  <ChevronDown className="w-2.5 h-2.5 opacity-70" />
                </button>

                {isConnectorColorOpen && (
                  <div className="absolute bottom-full right-0 mb-2 p-2 rounded-2xl bg-zinc-900 border border-zinc-700 shadow-2xl flex gap-1.5 z-50">
                    {PEN_COLORS.map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => {
                          setConnectorColor(c)
                          setIsConnectorColorOpen(false)
                        }}
                        style={{ backgroundColor: c }}
                        className="w-5 h-5 rounded-full border border-zinc-700 hover:scale-125 transition-transform"
                      />
                    ))}
                  </div>
                )}
              </div>

              <button
                type="button"
                onClick={() => setConnectorStyle((prev) => (prev === 'solid' ? 'dashed' : prev === 'dashed' ? 'dotted' : 'solid'))}
                className="flex items-center gap-1 p-1.5 rounded-xl hover:bg-zinc-800/60 text-zinc-300 transition-colors cursor-pointer"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none">
                  <line
                    x1="4"
                    y1="20"
                    x2="20"
                    y2="4"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeDasharray={connectorStyle === 'dashed' ? '4 3' : connectorStyle === 'dotted' ? '1 3' : undefined}
                  />
                </svg>
                <ChevronDown className="w-2.5 h-2.5 opacity-70" />
              </button>

              <button
                type="button"
                className="flex items-center gap-1 px-1.5 py-1 rounded-xl hover:bg-zinc-800/60 text-zinc-300 font-semibold transition-colors cursor-pointer"
              >
                <span>Aa</span>
                <ChevronDown className="w-2.5 h-2.5 opacity-70" />
              </button>
            </div>
          )}

          {/* MODE 4: STICKY NOTE CONTEXTUAL BAR (New Image 1) */}
          {activeTool === 'sticky' && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-2xl bg-[#14151a]/95 backdrop-blur-2xl border border-white/10 shadow-2xl animate-fade-in text-xs">
              {/* 12 Pastel Colors matching Image 1 */}
              <div className="flex items-center gap-1.5">
                {STICKY_PASTEL_COLORS.map((color) => {
                  const isSelected = stickyColor.toLowerCase() === color.toLowerCase()
                  return (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setStickyColor(color)}
                      style={{ backgroundColor: color }}
                      className={`w-5 h-5 rounded-full cursor-pointer transition-all hover:scale-125 ${
                        isSelected
                          ? 'ring-2 ring-amber-400 ring-offset-2 ring-offset-[#14151a] scale-110 shadow-lg'
                          : 'border border-black/30'
                      }`}
                      title={color}
                    />
                  )
                })}
              </div>

              <div className="w-[1px] h-5 bg-white/10 mx-1" />

              {/* Font Aa */}
              <button
                type="button"
                className="flex items-center gap-1 px-1.5 py-1 rounded-xl hover:bg-zinc-800/60 text-zinc-300 font-semibold transition-colors cursor-pointer"
              >
                <span>Aa</span>
                <ChevronDown className="w-2.5 h-2.5 opacity-70" />
              </button>

              {/* Font Size (Large ▾ matching Image 1) */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setIsStickyFontSizeOpen(!isStickyFontSizeOpen)}
                  className="flex items-center gap-1 px-2 py-1 rounded-xl text-zinc-300 hover:bg-zinc-800/60 transition-colors cursor-pointer font-medium"
                >
                  <span>{stickyFontSize}</span>
                  <ChevronDown className="w-2.5 h-2.5 opacity-70" />
                </button>

                {isStickyFontSizeOpen && (
                  <div className="absolute bottom-full right-0 mb-2 p-1.5 rounded-xl bg-zinc-900 border border-zinc-700 shadow-2xl flex flex-col gap-1 z-50 text-xs">
                    {(['Small', 'Medium', 'Large'] as const).map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => {
                          setStickyFontSize(s)
                          setIsStickyFontSizeOpen(false)
                        }}
                        className={`px-3 py-1.5 rounded-lg text-left cursor-pointer transition-colors ${
                          stickyFontSize === s ? 'bg-zinc-700 text-white font-bold' : 'text-zinc-300 hover:bg-zinc-800'
                        }`}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Alignment */}
              <button
                type="button"
                onClick={() => setStickyAlignment((prev) => (prev === 'left' ? 'center' : prev === 'center' ? 'right' : 'left'))}
                className="flex items-center gap-1 p-1.5 rounded-xl hover:bg-zinc-800/60 text-zinc-300 transition-colors cursor-pointer"
              >
                {stickyAlignment === 'left' ? <AlignLeft className="w-4 h-4" /> : stickyAlignment === 'center' ? <AlignCenter className="w-4 h-4" /> : <AlignRight className="w-4 h-4" />}
                <ChevronDown className="w-2.5 h-2.5 opacity-70" />
              </button>
            </div>
          )}

          {/* MODE 5: TEXT TOOL CONTEXTUAL BAR (New Image 2) */}
          {activeTool === 'text' && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-2xl bg-[#14151a]/95 backdrop-blur-2xl border border-white/10 shadow-2xl animate-fade-in text-xs">
              {/* 12 Colors matching Image 2 */}
              <div className="flex items-center gap-1.5">
                {TEXT_COLORS.map((color) => {
                  const isSelected = textColor.toLowerCase() === color.toLowerCase()
                  return (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setTextColor(color)}
                      style={{ backgroundColor: color }}
                      className={`w-5 h-5 rounded-full cursor-pointer transition-all hover:scale-125 ${
                        isSelected
                          ? 'ring-2 ring-white ring-offset-2 ring-offset-[#14151a] scale-110 shadow-lg'
                          : 'border border-black/30'
                      }`}
                      title={color}
                    />
                  )
                })}
              </div>

              <div className="w-[1px] h-5 bg-white/10 mx-1" />

              {/* Font Aa */}
              <button
                type="button"
                className="flex items-center gap-1 px-1.5 py-1 rounded-xl hover:bg-zinc-800/60 text-zinc-300 font-semibold transition-colors cursor-pointer"
              >
                <span>Aa</span>
                <ChevronDown className="w-2.5 h-2.5 opacity-70" />
              </button>

              {/* Font Size (Medium ▾ matching Image 2) */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setIsTextFontSizeOpen(!isTextFontSizeOpen)}
                  className="flex items-center gap-1 px-2 py-1 rounded-xl text-zinc-300 hover:bg-zinc-800/60 transition-colors cursor-pointer font-medium"
                >
                  <span>{textFontSize}</span>
                  <ChevronDown className="w-2.5 h-2.5 opacity-70" />
                </button>

                {isTextFontSizeOpen && (
                  <div className="absolute bottom-full right-0 mb-2 p-1.5 rounded-xl bg-zinc-900 border border-zinc-700 shadow-2xl flex flex-col gap-1 z-50 text-xs">
                    {(['Small', 'Medium', 'Large'] as const).map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => {
                          setTextFontSize(s)
                          setIsTextFontSizeOpen(false)
                        }}
                        className={`px-3 py-1.5 rounded-lg text-left cursor-pointer transition-colors ${
                          textFontSize === s ? 'bg-zinc-700 text-white font-bold' : 'text-zinc-300 hover:bg-zinc-800'
                        }`}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Alignment */}
              <button
                type="button"
                onClick={() => setTextAlignment((prev) => (prev === 'left' ? 'center' : prev === 'center' ? 'right' : 'left'))}
                className="flex items-center gap-1 p-1.5 rounded-xl hover:bg-zinc-800/60 text-zinc-300 transition-colors cursor-pointer"
              >
                {textAlignment === 'left' ? <AlignLeft className="w-4 h-4" /> : textAlignment === 'center' ? <AlignCenter className="w-4 h-4" /> : <AlignRight className="w-4 h-4" />}
                <ChevronDown className="w-2.5 h-2.5 opacity-70" />
              </button>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════════
              TIER 2: MAIN FLOATING DOCK BAR
              ══════════════════════════════════════════════════════════════ */}
          <div className="flex items-center gap-1 px-3 py-1.5 rounded-2xl bg-[#121316]/95 backdrop-blur-2xl border border-white/10 shadow-2xl select-none">
            {/* 1. V: Selection Tool */}
            <button
              type="button"
              onClick={() => setActiveTool('select')}
              className={`flex flex-col items-center gap-0.5 px-2.5 py-1.5 rounded-xl transition-all cursor-pointer ${
                activeTool === 'select'
                  ? 'bg-zinc-700/80 text-white shadow-xs border border-white/20'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60'
              }`}
              title="Select (V)"
            >
              <span className="text-[10px] font-semibold text-zinc-400">V</span>
              <MousePointer2 className="w-4 h-4" />
            </button>

            {/* 2. H: Hand Tool */}
            <button
              type="button"
              onClick={() => setActiveTool('hand')}
              className={`flex flex-col items-center gap-0.5 px-2.5 py-1.5 rounded-xl transition-all cursor-pointer ${
                activeTool === 'hand'
                  ? 'bg-zinc-700/80 text-white shadow-xs border border-white/20'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60'
              }`}
              title="Hand / Pan (H)"
            >
              <span className="text-[10px] font-semibold text-zinc-400">H</span>
              <Hand className="w-4 h-4" />
            </button>

            {/* 3. ⇧T: Task Card Stack */}
            <button
              type="button"
              onClick={handleAddTaskCard}
              className={`flex flex-col items-center gap-0.5 px-2.5 py-1.5 rounded-xl transition-all cursor-pointer ${
                activeTool === 'task'
                  ? 'bg-zinc-700/80 text-white shadow-xs border border-white/20'
                  : 'text-zinc-400 hover:text-sky-400 hover:bg-zinc-800/60'
              }`}
              title="Insert Task Card (⇧T)"
            >
              <span className="text-[10px] font-semibold text-zinc-400">⇧T</span>
              <div className="relative w-4 h-4 flex items-center justify-center">
                <div className="w-3.5 h-3.5 rounded bg-zinc-800 border border-zinc-600 flex items-center justify-center">
                  <Check className="w-2.5 h-2.5 text-sky-400" />
                </div>
              </div>
            </button>

            {/* 4. D: Pen / Drawing Tool */}
            <button
              type="button"
              onClick={() => setActiveTool('draw')}
              className={`flex flex-col items-center gap-0.5 px-2.5 py-1.5 rounded-xl transition-all cursor-pointer ${
                activeTool === 'draw'
                  ? 'bg-gradient-to-b from-zinc-700/90 to-zinc-800/90 text-white border border-white/30 shadow-inner'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60'
              }`}
              title="Drawing Pen (D)"
            >
              <span className="text-[10px] font-semibold text-zinc-400">{activeTool === 'draw' ? '' : 'D'}</span>
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none">
                <path d="M12 2L8 8H16L12 2Z" fill="#ffffff" />
                <rect x="8" y="8" width="8" height="12" rx="1" fill="#3f3f46" stroke="#52525b" />
              </svg>
            </button>

            {/* 5. R: Shape / Rectangle Tool */}
            <button
              type="button"
              onClick={() => setActiveTool('rect')}
              className={`flex flex-col items-center gap-0.5 px-2.5 py-1.5 rounded-xl transition-all cursor-pointer ${
                activeTool === 'rect'
                  ? 'bg-gradient-to-b from-zinc-700/90 to-zinc-800/90 text-white border border-white/30 shadow-inner'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60'
              }`}
              title="Shapes (R)"
            >
              <span className="text-[10px] font-semibold text-zinc-400">R</span>
              <div className="w-4 h-4 rounded-md bg-white border border-white shadow-xs" />
            </button>

            {/* 6. A: Arrow / Connector Tool */}
            <button
              type="button"
              onClick={() => setActiveTool('arrow')}
              className={`flex flex-col items-center gap-0.5 px-2.5 py-1.5 rounded-xl transition-all cursor-pointer ${
                activeTool === 'arrow'
                  ? 'bg-gradient-to-b from-zinc-700/90 to-zinc-800/90 text-white border border-white/30 shadow-inner'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60'
              }`}
              title="Arrow / Connector (A)"
            >
              <span className="text-[10px] font-semibold text-zinc-400">A</span>
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none">
                <path d="M12 20V4M12 4L6 10M12 4L18 10" stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>

            {/* 7. N: Sticky Note Tool (glowing active capsule in Image 1) */}
            <button
              type="button"
              onClick={() => setActiveTool('sticky')}
              className={`flex flex-col items-center gap-0.5 px-2.5 py-1.5 rounded-xl transition-all cursor-pointer ${
                activeTool === 'sticky'
                  ? 'bg-gradient-to-b from-zinc-700/90 to-zinc-800/90 text-white border border-white/30 shadow-inner'
                  : 'text-zinc-400 hover:text-amber-300 hover:bg-zinc-800/60'
              }`}
              title="Sticky Note (N)"
            >
              <span className="text-[10px] font-semibold text-zinc-400">N</span>
              <div className="w-4 h-4 rounded bg-amber-300 shadow-xs relative overflow-hidden">
                <div className="absolute bottom-0 right-0 w-1.5 h-1.5 bg-amber-400 rounded-tl" />
              </div>
            </button>

            {/* 8. T: Text Tool (glowing active capsule in Image 2) */}
            <button
              type="button"
              onClick={() => setActiveTool('text')}
              className={`flex flex-col items-center gap-0.5 px-2.5 py-1.5 rounded-xl transition-all cursor-pointer ${
                activeTool === 'text'
                  ? 'bg-gradient-to-b from-zinc-700/90 to-zinc-800/90 text-white border border-white/30 shadow-inner'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60'
              }`}
              title="Text (T)"
            >
              <span className="text-[10px] font-semibold text-zinc-400">T</span>
              <div className="w-4 h-4 rounded-md bg-zinc-800 border border-zinc-600 flex items-center justify-center font-serif font-black text-xs text-white">
                T
              </div>
            </button>

            {/* 9. F: Frame Tool (glowing active capsule in Image 3) */}
            <button
              type="button"
              onClick={() => setActiveTool('folder')}
              className={`flex flex-col items-center gap-0.5 px-2.5 py-1.5 rounded-xl transition-all cursor-pointer ${
                activeTool === 'folder'
                  ? 'bg-gradient-to-b from-zinc-700/90 to-zinc-800/90 text-white border border-white/30 shadow-inner'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60'
              }`}
              title="Frame (F)"
            >
              <span className="text-[10px] font-semibold text-zinc-400">F</span>
              <div className="relative w-4 h-4">
                <div className="absolute top-0 left-0 w-3 h-3 rounded border border-zinc-400 bg-zinc-800/80" />
                <div className="absolute bottom-0 right-0 w-3 h-3 rounded border border-zinc-300 bg-zinc-700/80" />
              </div>
            </button>

            {/* 10. Image Upload Tool */}
            <button
              type="button"
              onClick={() => {
                const url = prompt(
                  'Enter image URL or choose default mock image:',
                  'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=500'
                )
                if (url) {
                  setElements((prev) => [
                    ...prev,
                    {
                      id: `img-${Date.now()}`,
                      type: 'rect',
                      x: 320,
                      y: 220,
                      width: 220,
                      height: 140,
                      content: url,
                    },
                  ])
                }
              }}
              className="p-2 rounded-xl text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60 transition-colors cursor-pointer"
              title="Insert Image"
            >
              <div className="w-5 h-4 rounded bg-gradient-to-b from-sky-400 to-sky-600 p-0.5 flex flex-col justify-between relative overflow-hidden border border-zinc-600">
                <div className="w-1.5 h-1.5 rounded-full bg-amber-300 self-end" />
                <div className="w-full h-1.5 bg-emerald-600 rounded-t" />
              </div>
            </button>

            {/* 11. Diagram / Flowchart Tool */}
            <button
              type="button"
              onClick={() => {
                setElements((prev) => [
                  ...prev,
                  {
                    id: `flow-${Date.now()}`,
                    type: 'rect',
                    x: 300,
                    y: 200,
                    width: 260,
                    height: 140,
                    content: 'Flowchart: [API Gateway] ➔ [Auth Service] ➔ [Database]',
                    color: '#8b5cf6',
                  },
                ])
              }}
              className="p-2 rounded-xl text-zinc-400 hover:text-purple-400 hover:bg-zinc-800/60 transition-colors cursor-pointer"
              title="Flowchart & Diagrams"
            >
              <div className="w-5 h-4 rounded bg-zinc-800 border border-zinc-600 p-0.5 flex items-center justify-between">
                <div className="w-1.5 h-1.5 rounded-full bg-purple-400" />
                <div className="w-1.5 h-0.5 bg-zinc-400" />
                <div className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
              </div>
            </button>

            {/* 12. Krya AI / Templates Tool (Image 4 Template Center Trigger) */}
            <button
              type="button"
              onClick={() => setIsTemplateCenterOpen(true)}
              className="p-2 rounded-xl text-zinc-400 hover:text-pink-400 hover:bg-zinc-800/60 transition-colors cursor-pointer"
              title="Template Center (Templates & Frameworks)"
            >
              <div className="relative w-5 h-4 flex items-center justify-center">
                <div className="w-3.5 h-3.5 rounded bg-gradient-to-tr from-pink-500 via-purple-500 to-amber-400 shadow-xs" />
              </div>
            </button>

            <div className="w-[1px] h-6 bg-white/10 mx-1" />

            {/* Undo */}
            <button
              type="button"
              onClick={handleUndo}
              disabled={strokes.length === 0}
              className="p-2 rounded-xl text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60 disabled:opacity-30 disabled:pointer-events-none transition-colors cursor-pointer"
              title="Undo (Ctrl+Z)"
            >
              <Undo2 className="w-4 h-4" />
            </button>

            {/* Redo */}
            <button
              type="button"
              onClick={handleRedo}
              disabled={redoStrokes.length === 0}
              className="p-2 rounded-xl text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60 disabled:opacity-30 disabled:pointer-events-none transition-colors cursor-pointer"
              title="Redo (Ctrl+Y)"
            >
              <Redo2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* ── BOTTOM LEFT ZOOM CONTROLS (-, 100%, +) ── */}
        <div className="absolute bottom-6 left-6 z-30 flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#14151a]/95 backdrop-blur-xl border border-white/10 shadow-2xl text-xs font-mono text-zinc-300">
          <button
            type="button"
            onClick={() => setZoom((z) => Math.max(25, z - 10))}
            className="p-1 rounded-lg hover:bg-zinc-700/60 text-zinc-400 hover:text-zinc-100 transition-colors cursor-pointer"
            title="Zoom Out"
          >
            <Minus className="w-3.5 h-3.5" />
          </button>

          <span className="w-12 text-center font-bold text-xs">{zoom}%</span>

          <button
            type="button"
            onClick={() => setZoom((z) => Math.min(200, z + 10))}
            className="p-1 rounded-lg hover:bg-zinc-700/60 text-zinc-400 hover:text-zinc-100 transition-colors cursor-pointer"
            title="Zoom In"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* ══════════════════════════════════════════════════════════════════
            TEMPLATE CENTER MODAL DIALOG (Matches Reference Image 4)
            ══════════════════════════════════════════════════════════════════ */}
        {isTemplateCenterOpen && (
          <div className="fixed inset-0 z-[150] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 select-none animate-fade-in">
            <div className="relative w-full max-w-5xl h-[670px] bg-[#14151a] border border-zinc-700/80 rounded-2xl shadow-2xl flex flex-col overflow-hidden text-zinc-100">
              {/* Header */}
              <div className="px-6 py-3.5 border-b border-zinc-800 flex items-center justify-between bg-[#16171d]">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded bg-gradient-to-tr from-pink-500 via-purple-500 to-amber-400" />
                  <h2 className="text-sm font-bold text-white tracking-tight">Template Center</h2>
                </div>

                <button
                  type="button"
                  onClick={() => setIsTemplateCenterOpen(false)}
                  className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Body: Left Sidebar + Right Content */}
              <div className="flex-1 flex overflow-hidden">
                {/* Left Sidebar */}
                <div className="w-60 border-r border-zinc-800/80 p-4 flex flex-col justify-between bg-[#101115]/60 shrink-0 text-xs">
                  <div className="space-y-6">
                    {/* Navigation Links */}
                    <div className="space-y-1">
                      <button
                        type="button"
                        onClick={() => setSelectedTemplateTab('featured')}
                        className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-left transition-colors cursor-pointer ${
                          selectedTemplateTab === 'featured'
                            ? 'bg-zinc-800 text-white font-bold shadow-xs'
                            : 'text-zinc-400 hover:text-white hover:bg-zinc-800/50'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                          <span>Featured</span>
                        </div>
                        <span className="text-[10px] text-zinc-500 font-mono">2</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setSelectedTemplateTab('workspace')}
                        className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-left transition-colors cursor-pointer ${
                          selectedTemplateTab === 'workspace'
                            ? 'bg-zinc-800 text-white font-bold shadow-xs'
                            : 'text-zinc-400 hover:text-white hover:bg-zinc-800/50'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <div className="w-3.5 h-3.5 rounded bg-emerald-600 flex items-center justify-center text-[9px] font-bold text-white">
                            A
                          </div>
                          <span>Workspace Templates</span>
                        </div>
                        <span className="text-[10px] text-zinc-500 font-mono">0</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setSelectedTemplateTab('taskflow')}
                        className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-left transition-colors cursor-pointer ${
                          selectedTemplateTab === 'taskflow'
                            ? 'bg-zinc-800 text-white font-bold shadow-xs'
                            : 'text-zinc-400 hover:text-white hover:bg-zinc-800/50'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <Layers className="w-3.5 h-3.5 text-indigo-400" />
                          <span>ClickUp Templates</span>
                        </div>
                        <span className="text-[10px] text-zinc-500 font-mono">171</span>
                      </button>
                    </div>

                    {/* Section: Template Types */}
                    <div className="space-y-2">
                      <div className="text-[11px] font-bold text-zinc-400 tracking-wider">Template Types</div>
                      <div className="space-y-1.5 pl-0.5 text-zinc-400">
                        {['Super Agent', 'Space', 'Folder', 'List', 'Task', 'Doc', 'View'].map((item) => (
                          <label key={item} className="flex items-center gap-2 cursor-pointer hover:text-zinc-200">
                            <input
                              type="checkbox"
                              className="rounded border-zinc-700 bg-zinc-800 text-indigo-500 focus:ring-0 w-3.5 h-3.5"
                            />
                            <span>{item}</span>
                          </label>
                        ))}
                        {/* Whiteboard Checked matching Image 4 */}
                        <label className="flex items-center gap-2 cursor-pointer text-white font-semibold">
                          <input
                            type="checkbox"
                            defaultChecked
                            className="rounded border-indigo-600 bg-indigo-600 text-white focus:ring-0 w-3.5 h-3.5"
                          />
                          <span>Whiteboard</span>
                        </label>
                      </div>
                    </div>

                    {/* Section: Complexity */}
                    <div className="space-y-2">
                      <div className="text-[11px] font-bold text-zinc-400 tracking-wider">Complexity</div>
                      <div className="space-y-1.5 pl-0.5 text-zinc-400">
                        {['Beginner', 'Intermediate', 'Advanced'].map((c) => (
                          <label key={c} className="flex items-center gap-2 cursor-pointer hover:text-zinc-200">
                            <input
                              type="checkbox"
                              className="rounded border-zinc-700 bg-zinc-800 text-indigo-500 focus:ring-0 w-3.5 h-3.5"
                            />
                            <span>{c}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Footer Links */}
                  <div className="space-y-1 pt-4 border-t border-zinc-800/80 text-zinc-400 text-xs">
                    <button type="button" className="flex items-center gap-2 hover:text-white cursor-pointer py-1">
                      <HelpCircle className="w-3.5 h-3.5" />
                      <span>Learn</span>
                    </button>
                    <button type="button" className="flex items-center gap-2 hover:text-white cursor-pointer py-1">
                      <FileText className="w-3.5 h-3.5" />
                      <span>Audit Log</span>
                    </button>
                  </div>
                </div>

                {/* Right Content Area */}
                <div className="flex-1 p-6 flex flex-col gap-5 overflow-y-auto bg-[#14151a]">
                  {/* Search and Filters Bar */}
                  <div className="flex items-center gap-3">
                    <div className="relative flex-1">
                      <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        placeholder="Search templates..."
                        value={templateSearchQuery}
                        onChange={(e) => setTemplateSearchQuery(e.target.value)}
                        className="w-full bg-[#1c1d24] border border-zinc-700/70 rounded-xl pl-9 pr-8 py-2 text-xs text-white placeholder:text-zinc-500 focus:outline-none focus:border-zinc-500 transition-colors"
                      />
                      {templateSearchQuery && (
                        <button
                          type="button"
                          onClick={() => setTemplateSearchQuery('')}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>

                    {/* Filter Pills on Right matching Image 4 */}
                    <button
                      type="button"
                      className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#1c1d24] border border-zinc-700/70 text-xs text-zinc-300 hover:text-white hover:bg-zinc-800 transition-colors cursor-pointer"
                    >
                      <Layers className="w-3.5 h-3.5 text-zinc-400" />
                      <span>Use Cases</span>
                    </button>

                    <button
                      type="button"
                      className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#1c1d24] border border-zinc-700/70 text-xs text-zinc-300 hover:text-white hover:bg-zinc-800 transition-colors cursor-pointer"
                    >
                      <Tag className="w-3.5 h-3.5 text-zinc-400" />
                      <span>Tags</span>
                    </button>

                    <button
                      type="button"
                      className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#1c1d24] border border-zinc-700/70 text-xs text-zinc-300 hover:text-white hover:bg-zinc-800 transition-colors cursor-pointer"
                    >
                      <UserIcon className="w-3.5 h-3.5 text-zinc-400" />
                      <span>Created by</span>
                    </button>
                  </div>

                  {/* Purple Banner matching Image 4 */}
                  <div className="bg-gradient-to-r from-indigo-950/80 via-purple-950/60 to-indigo-950/80 border border-indigo-500/30 rounded-xl px-4 py-3 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2.5 text-zinc-200">
                      <Sparkles className="w-4 h-4 text-purple-400" />
                      <span>Create your first template and eliminate repetitive work!</span>
                    </div>
                    <button
                      type="button"
                      className="px-3 py-1 rounded-lg bg-indigo-900/60 hover:bg-indigo-800/80 border border-indigo-500/40 text-xs font-semibold text-indigo-200 transition-colors cursor-pointer"
                    >
                      Learn more
                    </button>
                  </div>

                  {/* Section 1: Featured Templates (2 Cards matching Image 4) */}
                  <div>
                    <h3 className="text-xs font-bold text-white mb-3">Featured Templates</h3>
                    <div className="grid grid-cols-2 gap-4">
                      {/* 1. Customer Journey Map */}
                      <div
                        onClick={() => handleApplyTemplate('customer-journey-map')}
                        className="group relative rounded-xl border border-zinc-800 bg-[#191a21] hover:border-zinc-600 transition-all overflow-hidden cursor-pointer flex flex-col shadow-sm"
                      >
                        <div className="h-32 bg-[#121318] p-3 flex flex-col justify-between relative overflow-hidden border-b border-zinc-800">
                          {/* Star Badge */}
                          <div className="w-4 h-4 rounded-full bg-amber-400/20 flex items-center justify-center">
                            <Star className="w-2.5 h-2.5 text-amber-400 fill-amber-400" />
                          </div>

                          {/* Graphical preview of 4 journey columns */}
                          <div className="grid grid-cols-4 gap-1.5 h-20 items-stretch opacity-90">
                            <div className="rounded bg-orange-200/90 flex flex-col p-1 gap-1">
                              <div className="w-6 h-1 bg-orange-400 rounded" />
                              <div className="w-full h-2 bg-orange-100 rounded" />
                            </div>
                            <div className="rounded bg-pink-200/90 flex flex-col p-1 gap-1">
                              <div className="w-6 h-1 bg-pink-400 rounded" />
                              <div className="w-full h-2 bg-pink-100 rounded" />
                            </div>
                            <div className="rounded bg-sky-200/90 flex flex-col p-1 gap-1">
                              <div className="w-6 h-1 bg-sky-400 rounded" />
                              <div className="w-full h-2 bg-sky-100 rounded" />
                            </div>
                            <div className="rounded bg-emerald-200/90 flex flex-col p-1 gap-1">
                              <div className="w-6 h-1 bg-emerald-400 rounded" />
                              <div className="w-full h-2 bg-emerald-100 rounded" />
                            </div>
                          </div>

                          {/* Hover Overlay: "Use Template" */}
                          <div className="absolute inset-0 bg-black/60 backdrop-blur-2xs opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <span className="px-3 py-1.5 rounded-lg bg-indigo-600 text-white font-bold text-xs shadow-md">
                              Use Template
                            </span>
                          </div>
                        </div>

                        {/* Card Footer */}
                        <div className="px-3.5 py-2.5 flex items-center gap-2 text-xs font-semibold text-zinc-200 bg-[#16171d]">
                          <div className="w-4 h-4 rounded bg-orange-500/20 border border-orange-500/40 flex items-center justify-center">
                            <LayoutTemplate className="w-2.5 h-2.5 text-orange-400" />
                          </div>
                          <span>Customer Journey Map</span>
                        </div>
                      </div>

                      {/* 2. Eisenhower Matrix */}
                      <div
                        onClick={() => handleApplyTemplate('eisenhower-matrix')}
                        className="group relative rounded-xl border border-zinc-800 bg-[#191a21] hover:border-zinc-600 transition-all overflow-hidden cursor-pointer flex flex-col shadow-sm"
                      >
                        <div className="h-32 bg-[#121318] p-3 flex flex-col justify-between relative overflow-hidden border-b border-zinc-800">
                          <div className="w-4 h-4 rounded-full bg-amber-400/20 flex items-center justify-center">
                            <Star className="w-2.5 h-2.5 text-amber-400 fill-amber-400" />
                          </div>

                          {/* Graphical preview of 4 quadrants */}
                          <div className="grid grid-cols-2 grid-rows-2 gap-1.5 h-20 items-stretch opacity-90">
                            <div className="rounded bg-red-200/90 border border-red-300 p-1">
                              <div className="w-8 h-1 bg-red-500 rounded" />
                            </div>
                            <div className="rounded bg-green-200/90 border border-green-300 p-1">
                              <div className="w-8 h-1 bg-green-500 rounded" />
                            </div>
                            <div className="rounded bg-orange-200/90 border border-orange-300 p-1">
                              <div className="w-8 h-1 bg-orange-500 rounded" />
                            </div>
                            <div className="rounded bg-blue-200/90 border border-blue-300 p-1">
                              <div className="w-8 h-1 bg-blue-500 rounded" />
                            </div>
                          </div>

                          <div className="absolute inset-0 bg-black/60 backdrop-blur-2xs opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <span className="px-3 py-1.5 rounded-lg bg-indigo-600 text-white font-bold text-xs shadow-md">
                              Use Template
                            </span>
                          </div>
                        </div>

                        <div className="px-3.5 py-2.5 flex items-center gap-2 text-xs font-semibold text-zinc-200 bg-[#16171d]">
                          <div className="w-4 h-4 rounded bg-orange-500/20 border border-orange-500/40 flex items-center justify-center">
                            <LayoutTemplate className="w-2.5 h-2.5 text-orange-400" />
                          </div>
                          <span>Eisenhower Matrix</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Section 2: Templates by TaskFlow / ClickUp (Image 4) */}
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <div className="text-xs font-bold text-zinc-300">Marketing</div>
                      <button type="button" className="text-xs text-zinc-400 hover:text-zinc-200 cursor-pointer">
                        See 7 more
                      </button>
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                      {/* 1. BCG Matrix */}
                      <div
                        onClick={() => handleApplyTemplate('bcg-matrix')}
                        className="group relative rounded-xl border border-zinc-800 bg-[#191a21] hover:border-zinc-600 transition-all overflow-hidden cursor-pointer flex flex-col shadow-sm"
                      >
                        <div className="h-28 bg-[#121318] p-2.5 flex items-center justify-center relative overflow-hidden border-b border-zinc-800">
                          {/* 2x2 colored boxes */}
                          <div className="grid grid-cols-2 gap-1 w-28 h-20">
                            <div className="rounded bg-blue-200/90 border border-blue-400" />
                            <div className="rounded bg-amber-200/90 border border-amber-400" />
                            <div className="rounded bg-emerald-200/90 border border-emerald-400" />
                            <div className="rounded bg-rose-200/90 border border-rose-400" />
                          </div>

                          <div className="absolute inset-0 bg-black/60 backdrop-blur-2xs opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <span className="px-2.5 py-1 rounded-lg bg-indigo-600 text-white font-bold text-[11px]">
                              Use Template
                            </span>
                          </div>
                        </div>

                        <div className="px-3 py-2 flex items-center gap-2 text-xs font-semibold text-zinc-200 bg-[#16171d]">
                          <div className="w-4 h-4 rounded bg-orange-500/20 border border-orange-500/40 flex items-center justify-center">
                            <LayoutTemplate className="w-2.5 h-2.5 text-orange-400" />
                          </div>
                          <span>BCG Matrix</span>
                        </div>
                      </div>

                      {/* 2. Benchmark Analysis */}
                      <div
                        onClick={() => handleApplyTemplate('benchmark-analysis')}
                        className="group relative rounded-xl border border-zinc-800 bg-[#191a21] hover:border-zinc-600 transition-all overflow-hidden cursor-pointer flex flex-col shadow-sm"
                      >
                        <div className="h-28 bg-[#121318] p-2.5 flex items-center justify-center relative overflow-hidden border-b border-zinc-800">
                          {/* Table rows preview */}
                          <div className="w-32 flex flex-col gap-1">
                            <div className="w-full h-2 rounded bg-purple-200" />
                            <div className="w-full h-1.5 rounded bg-zinc-700" />
                            <div className="w-full h-1.5 rounded bg-zinc-700" />
                            <div className="w-full h-1.5 rounded bg-zinc-700" />
                          </div>

                          <div className="absolute inset-0 bg-black/60 backdrop-blur-2xs opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <span className="px-2.5 py-1 rounded-lg bg-indigo-600 text-white font-bold text-[11px]">
                              Use Template
                            </span>
                          </div>
                        </div>

                        <div className="px-3 py-2 flex items-center gap-2 text-xs font-semibold text-zinc-200 bg-[#16171d]">
                          <div className="w-4 h-4 rounded bg-orange-500/20 border border-orange-500/40 flex items-center justify-center">
                            <LayoutTemplate className="w-2.5 h-2.5 text-orange-400" />
                          </div>
                          <span>Benchmark Analysis</span>
                        </div>
                      </div>

                      {/* 3. Brand Guidelines */}
                      <div
                        onClick={() => handleApplyTemplate('brand-guidelines')}
                        className="group relative rounded-xl border border-zinc-800 bg-[#191a21] hover:border-zinc-600 transition-all overflow-hidden cursor-pointer flex flex-col shadow-sm"
                      >
                        <div className="h-28 bg-[#121318] p-2.5 flex items-center justify-center relative overflow-hidden border-b border-zinc-800">
                          {/* Color dots and typography card preview */}
                          <div className="w-32 flex flex-col gap-1.5">
                            <div className="flex gap-1">
                              <div className="w-3 h-3 rounded-full bg-pink-400" />
                              <div className="w-3 h-3 rounded-full bg-indigo-400" />
                              <div className="w-3 h-3 rounded-full bg-amber-400" />
                            </div>
                            <div className="w-full h-3 rounded bg-zinc-800 border border-zinc-700" />
                            <div className="w-3/4 h-2 rounded bg-zinc-800" />
                          </div>

                          <div className="absolute inset-0 bg-black/60 backdrop-blur-2xs opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <span className="px-2.5 py-1 rounded-lg bg-indigo-600 text-white font-bold text-[11px]">
                              Use Template
                            </span>
                          </div>
                        </div>

                        <div className="px-3 py-2 flex items-center gap-2 text-xs font-semibold text-zinc-200 bg-[#16171d]">
                          <div className="w-4 h-4 rounded bg-orange-500/20 border border-orange-500/40 flex items-center justify-center">
                            <LayoutTemplate className="w-2.5 h-2.5 text-orange-400" />
                          </div>
                          <span>Brand Guidelines</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>,
    document.body
  )
}
