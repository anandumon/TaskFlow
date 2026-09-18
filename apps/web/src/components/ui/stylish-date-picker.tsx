'use client'

import React, { useState, useRef, useEffect } from 'react'
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Sparkles } from 'lucide-react'

interface StylishDatePickerProps {
  value: string // 'YYYY-MM-DD'
  onChange: (date: string) => void
  minDate?: string // 'YYYY-MM-DD'
  placeholder?: string
  className?: string
}

export function StylishDatePicker({
  value,
  onChange,
  minDate,
  placeholder = 'Select due date',
  className = '',
}: StylishDatePickerProps) {
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  // Current system date
  const now = new Date()
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
  const effectiveMinDate = minDate || todayStr

  // Parse current value or fallback to today
  const parseYMD = (ymd: string) => {
    if (!ymd || !ymd.includes('-')) return new Date()
    const [y, m, d] = ymd.split('-').map(Number)
    return new Date(y, m - 1, d)
  }

  const selectedDate = value ? parseYMD(value) : null
  const minDateObj = parseYMD(effectiveMinDate)
  minDateObj.setHours(0, 0, 0, 0)

  // Calendar view year and month
  const [viewYear, setViewYear] = useState(selectedDate ? selectedDate.getFullYear() : now.getFullYear())
  const [viewMonth, setViewMonth] = useState(selectedDate ? selectedDate.getMonth() : now.getMonth())

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  // Month navigation guards
  const isPrevMonthDisabled = () => {
    const prevMonthDate = new Date(viewYear, viewMonth, 1)
    const minMonthDate = new Date(minDateObj.getFullYear(), minDateObj.getMonth(), 1)
    return prevMonthDate <= minMonthDate
  }

  const handlePrevMonth = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (isPrevMonthDisabled()) return
    if (viewMonth === 0) {
      setViewMonth(11)
      setViewYear((y) => y - 1)
    } else {
      setViewMonth((m) => m - 1)
    }
  }

  const handleNextMonth = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (viewMonth === 11) {
      setViewMonth(0)
      setViewYear((y) => y + 1)
    } else {
      setViewMonth((m) => m + 1)
    }
  }

  // Days in month calculation
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate()
  const firstDayIndex = new Date(viewYear, viewMonth, 1).getDay() // 0 = Sun

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ]

  const formatDisplay = (ymd: string) => {
    if (!ymd) return placeholder
    const [y, m, d] = ymd.split('-').map(Number)
    const dt = new Date(y, m - 1, d)
    const isToday = ymd === todayStr
    const isTomorrow = (() => {
      const tom = new Date()
      tom.setDate(tom.getDate() + 1)
      const tomStr = `${tom.getFullYear()}-${String(tom.getMonth() + 1).padStart(2, '0')}-${String(tom.getDate()).padStart(2, '0')}`
      return ymd === tomStr
    })()

    const label = dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    if (isToday) return `${label} (Today)`
    if (isTomorrow) return `${label} (Tomorrow)`
    return label
  }

  const selectDate = (year: number, month: number, day: number) => {
    const formatted = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    onChange(formatted)
    setIsOpen(false)
  }

  // Quick chips: Today, Tomorrow, +1 Week
  const setQuickDate = (daysAhead: number, e: React.MouseEvent) => {
    e.stopPropagation()
    const target = new Date()
    target.setDate(target.getDate() + daysAhead)
    const formatted = `${target.getFullYear()}-${String(target.getMonth() + 1).padStart(2, '0')}-${String(target.getDate()).padStart(2, '0')}`
    onChange(formatted)
    setViewYear(target.getFullYear())
    setViewMonth(target.getMonth())
    setIsOpen(false)
  }

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => {
          if (!isOpen && value) {
            const dt = parseYMD(value)
            setViewYear(dt.getFullYear())
            setViewMonth(dt.getMonth())
          }
          setIsOpen((prev) => !prev)
        }}
        className={`w-full px-3.5 py-2.5 rounded-xl border text-xs text-foreground flex items-center justify-between transition-all cursor-pointer shadow-xs ${
          isOpen
            ? 'bg-background border-primary ring-2 ring-primary/20'
            : 'bg-background border-border hover:border-primary/50'
        }`}
      >
        <div className="flex items-center gap-2 truncate">
          <CalendarIcon className="w-3.5 h-3.5 text-primary shrink-0" />
          <span className={`truncate font-medium ${value ? 'text-foreground' : 'text-muted-foreground'}`}>
            {formatDisplay(value)}
          </span>
        </div>
        <span className="text-[10px] text-primary/80 font-bold px-1.5 py-0.5 rounded bg-primary/10 shrink-0">
          Due
        </span>
      </button>

      {/* Floating Stylish Calendar Popover */}
      {isOpen && (
        <div className="absolute left-0 bottom-full mb-2 z-[110] w-72 rounded-2xl bg-[#0D1520] border border-primary/30 p-3.5 shadow-2xl shadow-black/80 animate-scale-in backdrop-blur-xl">
          {/* Quick Selector Pills */}
          <div className="flex items-center justify-between gap-1 pb-2.5 mb-2.5 border-b border-border/40">
            <button
              type="button"
              onClick={(e) => setQuickDate(0, e)}
              className="flex-1 py-1 text-[10px] font-bold rounded-lg bg-primary/15 hover:bg-primary/25 text-primary border border-primary/30 transition-all cursor-pointer text-center"
            >
              Today
            </button>
            <button
              type="button"
              onClick={(e) => setQuickDate(1, e)}
              className="flex-1 py-1 text-[10px] font-bold rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10 transition-all cursor-pointer text-center"
            >
              Tomorrow
            </button>
            <button
              type="button"
              onClick={(e) => setQuickDate(7, e)}
              className="flex-1 py-1 text-[10px] font-bold rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10 transition-all cursor-pointer text-center"
            >
              +1 Week
            </button>
          </div>

          {/* Month & Year Navigation */}
          <div className="flex items-center justify-between mb-3 px-0.5">
            <button
              type="button"
              onClick={handlePrevMonth}
              disabled={isPrevMonthDisabled()}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 disabled:opacity-20 disabled:cursor-not-allowed transition-colors cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <span className="text-xs font-bold text-white tracking-wide">
              {monthNames[viewMonth]} {viewYear}
            </span>

            <button
              type="button"
              onClick={handleNextMonth}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Day of week headers */}
          <div className="grid grid-cols-7 gap-1 text-center mb-1 text-[10px] font-bold text-slate-400">
            <span>Su</span>
            <span>Mo</span>
            <span>Tu</span>
            <span>We</span>
            <span>Th</span>
            <span>Fr</span>
            <span>Sa</span>
          </div>

          {/* Calendar Day Grid */}
          <div className="grid grid-cols-7 gap-1 text-center">
            {/* Blank leading days */}
            {Array.from({ length: firstDayIndex }).map((_, i) => (
              <div key={`empty-${i}`} className="w-8 h-8" />
            ))}

            {/* Days in Month */}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1
              const cellDate = new Date(viewYear, viewMonth, day)
              cellDate.setHours(0, 0, 0, 0)

              const cellDateStr = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
              const isPast = cellDate < minDateObj
              const isSelected = value === cellDateStr
              const isToday = cellDateStr === todayStr

              if (isPast) {
                return (
                  <div
                    key={`day-${day}`}
                    className="w-8 h-8 flex items-center justify-center text-[11px] font-medium text-slate-600 cursor-not-allowed opacity-30 select-none"
                    title="Past dates cannot be selected"
                  >
                    {day}
                  </div>
                )
              }

              return (
                <button
                  key={`day-${day}`}
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    selectDate(viewYear, viewMonth, day)
                  }}
                  className={`w-8 h-8 rounded-xl flex items-center justify-center text-[11px] font-bold transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-primary text-white shadow-md shadow-primary/40 ring-2 ring-primary/40 scale-105'
                      : isToday
                      ? 'bg-primary/20 text-primary border border-primary/40 hover:bg-primary/30'
                      : 'text-slate-200 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  {day}
                </button>
              )
            })}
          </div>

          {/* Footer note */}
          <div className="mt-2.5 pt-2 border-t border-border/40 flex items-center justify-between text-[10px] text-slate-400 px-0.5">
            <span className="flex items-center gap-1 text-primary">
              <Sparkles className="w-3 h-3" /> Future dates only
            </span>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="hover:text-white transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
