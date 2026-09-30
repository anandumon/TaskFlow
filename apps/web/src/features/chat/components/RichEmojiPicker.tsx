'use client'

import React, { useState, useEffect, useRef, useMemo } from 'react'
import {
  Search,
  Clock,
  Smile,
  Dog,
  Pizza,
  Trophy,
  Plane,
  Lightbulb,
  Hash,
  Flag,
  Plus,
  X,
  Sparkles,
} from 'lucide-react'

interface RichEmojiPickerProps {
  isOpen: boolean
  onClose: () => void
  onSelectEmoji: (emoji: string) => void
}

interface EmojiCategory {
  id: string
  name: string
  icon: React.ReactNode
  emojis: string[]
}

const DEFAULT_FREQUENT: string[] = [
  '👍', '✅', '🔥', '😀', '😘', '😍', '😆', '😜', '😅', '😂', '😱', '😞', '😒', '😩', '😭', '😎', '❤️'
]

const EMOJI_CATEGORIES: EmojiCategory[] = [
  {
    id: 'people',
    name: 'Smiles & People',
    icon: <Smile className="w-3.5 h-3.5" />,
    emojis: [
      '😀', '😃', '😄', '😁', '😆', '😅', '😂', '🤣', '🙂', '🙃', '😉', '😊', '😇', '🥰', '😍', '🤩',
      '😘', '😗', '😚', '😙', '😋', '😛', '😜', '🤪', '😝', '🤑', '🤗', '🤭', '🤫', '🤔', '🤐', '🤨',
      '😐', '😑', '😶', '😏', '😒', '🙄', '😬', '🤥', '😌', '😔', '😪', '🤤', '😴', '😷', '🤒', '🤕',
      '🤢', '🤮', '🤧', '🥵', '🥶', '🥴', '😵', '🤯', '🤠', '🥳', '😎', '🤓', '🧐', '😕', '😟', '🙁',
      '😮', '😯', '😲', '😳', '🥺', '😦', '😧', '😨', '😰', '😥', '😢', '😭', '😱', '😖', '😣', '😞',
      '😓', '😩', '😫', '🥱', '😤', '😡', '😠', '🤬', '😈', '👿', '💀', '☠️', '💩', '🤡', '👹', '👺',
      '👻', '👽', '👾', '🤖', '👋', '🤚', '🖐', '✋', '🖖', '👌', '🤌', '🤏', '✌️', '🤞', '🤟', '🤘',
      '🤙', '👈', '👉', '👆', '🖕', '👇', '☝️', '👍', '👎', '✊', '👊', '🤛', '🤜', '👏', '🙌', '👐'
    ],
  },
  {
    id: 'animals',
    name: 'Animals & Nature',
    icon: <Dog className="w-3.5 h-3.5" />,
    emojis: [
      '🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼', '🐨', '🐯', '🦁', '🐮', '🐷', '🐸', '🐵', '🐔',
      '🐧', '🐦', '🦆', '🦅', '🦉', '🦇', '🐺', '🐗', '🐴', '🦄', '🐝', '🐛', '🦋', '🐌', '🐞', '🐜',
      '🦟', '🦗', '🕷', '🦂', '🐢', '🐍', '🦎', '🦖', '🐙', '🦑', '🦐', '🦞', '🦀', '🐡', '🐠', '🐟',
      '🐬', '🐳', '🦈', '🐊', '🐅', '🐆', '🦓', '🦍', '🐘', '🦛', '🦏', '🐪', '🦒', '🦘', '🐕', '🐈',
      '🌲', '🌳', '🌴', '🌱', '🌿', '☘️', '🍀', '🎍', '🪴', '🎋', '🍃', '🍂', '🍁', '🍄', '🌸', '🌹'
    ],
  },
  {
    id: 'food',
    name: 'Food & Drink',
    icon: <Pizza className="w-3.5 h-3.5" />,
    emojis: [
      '🍏', '🍎', '🍐', '🍊', '🍋', '🍌', '🍉', '🍇', '🍓', '🫐', '🍈', '🍒', '🍑', '🥭', '🍍', '🥥',
      '🥝', '🍅', '🍆', '🥑', '🥦', '🥬', '🥒', '🌶', '🌽', '🥕', '🥔', '🍠', '🥐', '🥯', '🍞', '🥖',
      '🥨', '🧀', '🥚', '🍳', '🧈', '🥞', '🧇', '🥓', '🥩', '🍗', '🍖', '🌭', '🍔', '🍟', '🍕', '🥪',
      '🥙', '🌮', '🌯', '🥗', '🥘', '🍝', '🍜', '🍲', '🍛', '🍣', '🍱', '🥟', '🍤', '🍙', '🍚', '🍘',
      '🍰', '🎂', '🧁', '🥧', '🍫', '🍬', '🍭', '🍮', '🍩', '🍪', '☕', '🍵', '🧃', '🥤', '🍺', '🍻'
    ],
  },
  {
    id: 'activity',
    name: 'Activity & Sports',
    icon: <Trophy className="w-3.5 h-3.5" />,
    emojis: [
      '⚽', '🏀', '🏈', '⚾', '🥎', '🎾', '🏐', '🏉', '🥏', '🎱', '🏓', '🏸', '🏒', '🥊', '🥋', '🥅',
      '⛳', '🏹', '🎣', '🤿', '🛹', '🛼', '🛷', '🎿', '🏋️', '🤸', '🧗', '🧘', '🏄', '🏊', '🚴', '🚵',
      '🏆', '🥇', '🥈', '🥉', '🏅', '🎖', '🎫', '🎪', '🎨', '🎬', '🎤', '🎧', '🎼', '🎹', '🥁', '🎸',
      '🎲', '♟', '🎯', '🎳', '🎮', '🎰', '🧩'
    ],
  },
  {
    id: 'travel',
    name: 'Travel & Places',
    icon: <Plane className="w-3.5 h-3.5" />,
    emojis: [
      '🚗', '🚕', '🚙', '🚌', '🏎', '🚓', '🚑', '🚒', '🚚', '🚜', '🚲', '🛵', '🏍', '🚨', '🚔', '🚘',
      '🚂', '🚆', '🚄', '🚅', '✈️', '🛫', '🛬', '🚀', '🛸', '🚁', '🛶', '⛵', '🚤', '🛳', '⚓', '🚦',
      '🗺', '🗿', '🗽', '🗼', '🏰', '🏟', '🏖', '🏝', '🌋', '⛰', '🏔', '🏕', '⛺', '🏠', '🏢', '🏦'
    ],
  },
  {
    id: 'objects',
    name: 'Objects',
    icon: <Lightbulb className="w-3.5 h-3.5" />,
    emojis: [
      '⌚', '📱', '📲', '💻', '⌨️', '🖥', '🖨', '🖱', '📷', '📹', '🎥', '📞', '☎️', '⏱', '⏰', '⏳',
      '📡', '🔋', '🔌', '💡', '🔦', '🕯', '💸', '💵', '💳', '💎', '⚖️', '🧰', '🔧', '🔨', '⛏', '🔩',
      '⚙️', '⛓', '🧲', '🔫', '💣', '🛡', '🔮', '🔭', '🔬', '🩹', '🩺', '💊', '💉', '🧬', '🧹', '🔑',
      '🚪', '🪑', '🛋', '📦', '🏷', '✉️', '📧', '📫', '📋', '📁', '📂', '📄', '📊', '📈', '📌', '📍'
    ],
  },
  {
    id: 'symbols',
    name: 'Symbols',
    icon: <Hash className="w-3.5 h-3.5" />,
    emojis: [
      '❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔', '❣️', '💕', '💞', '💓', '💗', '💖',
      '💘', '💝', '✨', '🌟', '⭐', '💫', '⚡', '💥', '🔥', '🌈', '☀️', '🌤', '⛅', '🌥', '☁️', '🌧',
      '❄️', '☃️', '⛄', '💨', '💧', '💦', '💯', '💢', '♨️', '⚠️', '⛔', '🚫', '✅', '✔️', '❌', '❎',
      '➕', '➖', '➗', '✖️', '♾', '💲', '™️', '©️', '®️', '👁️‍🗨️', '🔴', '🟠', '🟡', '🟢', '🔵', '🟣'
    ],
  },
  {
    id: 'flags',
    name: 'Flags',
    icon: <Flag className="w-3.5 h-3.5" />,
    emojis: [
      '🏁', '🚩', '🎌', '🏴', '🏳️', '🏳️‍🌈', '🏳️‍⚧️', '🏴‍☠️', '🇺🇸', '🇬🇧', '🇨🇦', '🇦🇺', '🇮🇳', '🇩🇪', '🇫🇷', '🇯🇵',
      '🇨🇳', '🇧🇷', '🇲🇽', '🇪🇸', '🇮🇹', '🇰🇷', '🇷🇺', '🇸🇦', '🇦🇪', '🇿🇦', '🇪🇬', '🇳🇬', '🇸🇬', '🇳🇿', '🇨🇭', '🇸🇪'
    ],
  },
]

export function RichEmojiPicker({ isOpen, onClose, onSelectEmoji }: RichEmojiPickerProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const [search, setSearch] = useState('')
  const [activeCategory, setActiveCategory] = useState<string>('recent')
  const [frequentEmojis, setFrequentEmojis] = useState<string[]>(DEFAULT_FREQUENT)
  const [skinToneIndex, setSkinToneIndex] = useState(0)

  const skinTones = ['✋', '✋🏻', '✋🏼', '✋🏽', '✋🏾', '✋🏿']

  // Load frequent from localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('taskflow_frequent_emojis')
        if (saved) {
          const parsed = JSON.parse(saved)
          if (Array.isArray(parsed) && parsed.length > 0) {
            setFrequentEmojis(parsed)
          }
        }
      } catch {}
    }
  }, [])

  // Auto close on outside click
  useEffect(() => {
    if (!isOpen) return
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        onClose()
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isOpen, onClose])

  const handlePickEmoji = (emoji: string) => {
    onSelectEmoji(emoji)

    // Save to frequent emojis
    setFrequentEmojis((prev) => {
      const updated = [emoji, ...prev.filter((e) => e !== emoji)].slice(0, 18)
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem('taskflow_frequent_emojis', JSON.stringify(updated))
        } catch {}
      }
      return updated
    })
  }

  // Filter emojis based on query
  const searchResults = useMemo(() => {
    if (!search.trim()) return null
    const q = search.toLowerCase().trim()
    const all = EMOJI_CATEGORIES.flatMap((c) => c.emojis)
    return all.filter((e) => e.includes(q))
  }, [search])

  const scrollToCategory = (catId: string) => {
    setActiveCategory(catId)
    const element = document.getElementById(`emoji-cat-${catId}`)
    if (element && scrollContainerRef.current) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }

  if (!isOpen) return null

  return (
    <div
      ref={containerRef}
      className="absolute bottom-full left-2 mb-2 w-96 max-w-[calc(100vw-2rem)] bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col z-50 animate-scale-in select-none text-xs"
    >
      {/* ── TOP SEARCH & SKIN TONE BAR (Matches Reference Image 2) ── */}
      <div className="p-3 border-b border-zinc-100 dark:border-zinc-800 flex items-center gap-2 bg-zinc-50/50 dark:bg-zinc-900/50">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-zinc-400 dark:text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            autoFocus
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search..."
            className="w-full pl-9 pr-7 py-2 rounded-xl bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 text-xs text-foreground placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 shadow-2xs transition-all"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Hand tone selector */}
        <button
          type="button"
          onClick={() => setSkinToneIndex((prev) => (prev + 1) % skinTones.length)}
          className="w-9 h-9 rounded-xl bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-700 flex items-center justify-center text-sm cursor-pointer shadow-2xs transition-colors shrink-0"
          title="Cycle skin tone"
        >
          <span>{skinTones[skinToneIndex]}</span>
        </button>

        {/* Purple plus button matching Reference Image 2 */}
        <button
          type="button"
          onClick={() => handlePickEmoji('✨')}
          className="w-9 h-9 rounded-xl bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-700 flex items-center justify-center cursor-pointer shadow-2xs transition-colors shrink-0"
          title="Custom emoji reaction"
        >
          <div className="w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center shadow-xs">
            <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
          </div>
        </button>
      </div>

      {/* ── EMOJI GRID BODY (10-column layout matching reference image) ── */}
      <div
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto p-3.5 space-y-4 custom-scrollbar max-h-80"
      >
        {searchResults ? (
          <div>
            <div className="text-[11px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider mb-2">
              Search Results ({searchResults.length})
            </div>
            {searchResults.length === 0 ? (
              <div className="py-10 text-center text-zinc-400 text-xs">
                No matching emojis found
              </div>
            ) : (
              <div className="grid grid-cols-10 gap-1">
                {searchResults.map((emoji, idx) => (
                  <button
                    key={`${emoji}-${idx}`}
                    type="button"
                    onClick={() => handlePickEmoji(emoji)}
                    className="w-8 h-8 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 flex items-center justify-center text-lg transition-transform hover:scale-125 cursor-pointer active:scale-95"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : (
          <>
            {/* Frequently Used (2 rows of 10-column grid matching Reference Image 2) */}
            <div id="emoji-cat-recent" className="space-y-1.5">
              <div className="text-xs font-semibold text-zinc-600 dark:text-zinc-300">
                Frequently Used
              </div>
              <div className="grid grid-cols-10 gap-1">
                {frequentEmojis.map((emoji, idx) => (
                  <button
                    key={`freq-${emoji}-${idx}`}
                    type="button"
                    onClick={() => handlePickEmoji(emoji)}
                    className="w-8 h-8 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 flex items-center justify-center text-lg transition-transform hover:scale-125 cursor-pointer active:scale-95"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>

            {/* Standard Categories */}
            {EMOJI_CATEGORIES.map((cat) => (
              <div key={cat.id} id={`emoji-cat-${cat.id}`} className="space-y-1.5">
                <div className="text-xs font-semibold text-zinc-600 dark:text-zinc-300">
                  {cat.name}
                </div>
                <div className="grid grid-cols-10 gap-1">
                  {cat.emojis.map((emoji, idx) => (
                    <button
                      key={`${cat.id}-${emoji}-${idx}`}
                      type="button"
                      onClick={() => handlePickEmoji(emoji)}
                      className="w-8 h-8 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 flex items-center justify-center text-lg transition-transform hover:scale-125 cursor-pointer active:scale-95"
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </>
        )}
      </div>

      {/* ── BOTTOM CATEGORY NAVIGATION BAR (Matches Reference Image 2) ── */}
      <div className="px-2 py-1.5 border-t border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50 flex items-center justify-between shrink-0">
        <button
          type="button"
          onClick={() => scrollToCategory('recent')}
          className={`p-1.5 rounded-xl transition-colors cursor-pointer ${
            activeCategory === 'recent'
              ? 'bg-indigo-100 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 font-bold'
              : 'text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800'
          }`}
          title="Frequently Used"
        >
          <Clock className="w-4 h-4" />
        </button>

        {EMOJI_CATEGORIES.map((cat) => {
          const isActive = activeCategory === cat.id
          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => scrollToCategory(cat.id)}
              className={`p-1.5 rounded-xl transition-colors cursor-pointer ${
                isActive
                  ? 'bg-indigo-100 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 font-bold'
                  : 'text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800'
              }`}
              title={cat.name}
            >
              {cat.icon}
            </button>
          )
        })}

        <button
          type="button"
          onClick={() => handlePickEmoji('🚀')}
          className="p-1.5 rounded-xl text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
          title="Rocket!"
        >
          <Sparkles className="w-4 h-4 text-amber-500" />
        </button>
      </div>
    </div>
  )
}
