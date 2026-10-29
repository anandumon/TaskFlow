'use client'

import { MessageSquare } from 'lucide-react'
import { NotesManager } from './NotesManager'

interface TaskDiscussionCardProps {
  notes?: string
  taskTitle?: string
  taskId?: string
  onAddNote: (noteText: string) => Promise<void>
  onUpdateNotes?: (updatedNotes: string) => Promise<void>
  canEdit?: boolean
}

export function TaskDiscussionCard({
  notes,
  taskTitle = 'Task Notes',
  taskId,
  onAddNote,
  onUpdateNotes,
  canEdit = true,
}: TaskDiscussionCardProps) {
  return (
    <div className="p-4 sm:p-6 rounded-2xl sm:rounded-3xl bg-card border border-border/80 shadow-sm space-y-4 max-w-full w-full overflow-hidden">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-primary shrink-0" /> Notes & Team Discussion
        </h3>
      </div>

      <NotesManager
        notes={notes}
        contextTitle={taskTitle}
        contextId={taskId}
        contextType="Task"
        onAddNote={onAddNote}
        onUpdateNotes={onUpdateNotes}
        canEdit={canEdit}
        placeholder="Add a team note or audit comment..."
      />
    </div>
  )
}
