'use client'

import { useState } from 'react'
import { MessageSquare } from 'lucide-react'

interface TaskDiscussionCardProps {
  notes?: string
  onAddNote: (noteText: string) => Promise<void>
}

export function TaskDiscussionCard({ notes, onAddNote }: TaskDiscussionCardProps) {
  const [noteText, setNoteText] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const textToAdd = noteText.trim()
    if (!textToAdd) return
    setNoteText('')
    try {
      await onAddNote(textToAdd)
    } catch (err) {
      setNoteText(textToAdd)
    }
  }

  return (
    <div className="p-6 rounded-3xl bg-card border border-border/80 shadow-sm space-y-4">
      <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
        <MessageSquare className="w-4 h-4 text-primary" /> Notes & Team Discussion
      </h3>

      <div className="p-4 rounded-2xl bg-muted/40 border border-border/60 text-xs text-foreground whitespace-pre-wrap font-sans leading-relaxed min-h-[80px]">
        {notes || 'No notes logged yet. Leave a note below!'}
      </div>

      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          type="text"
          placeholder="Add a team note or audit comment..."
          value={noteText}
          onChange={(e) => setNoteText(e.target.value)}
          className="flex-1 px-3 py-2 rounded-xl bg-background border border-border text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
        />
        <button
          type="submit"
          className="px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-all"
        >
          Post Note
        </button>
      </form>
    </div>
  )
}
