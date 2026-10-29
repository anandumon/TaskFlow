export interface ParsedNoteItem {
  id: string
  header?: string
  timestamp?: string
  author?: string
  content: string
  raw: string
}

/**
 * Parses raw notes string into structured note items.
 * Handles timestamps in format [timestamp] or [timestamp - author]: content,
 * as well as multi-line notes, SQL statements, and plain text notes.
 */
export function parseNotes(rawNotes?: string): ParsedNoteItem[] {
  if (!rawNotes || !rawNotes.trim()) return []

  const trimmedNotes = rawNotes.trim()

  // Support JSON array format if notes were saved or cached as JSON
  if (trimmedNotes.startsWith('[') && trimmedNotes.endsWith(']')) {
    try {
      const parsedJson = JSON.parse(trimmedNotes)
      if (Array.isArray(parsedJson) && parsedJson.length > 0 && typeof parsedJson[0] === 'object') {
        return parsedJson.map((item, idx) => {
          const timestamp = item.timestamp || item.createdAt || item.date
          const author = item.author || item.authorName || item.user
          const header = item.header || (timestamp ? (author ? `${timestamp} - ${author}` : timestamp) : undefined)
          const content = (item.content || item.text || item.message || JSON.stringify(item)).trim()
          return {
            id: item.id || `note-${idx}-${Math.random().toString(36).slice(2, 8)}`,
            header,
            timestamp,
            author,
            content,
            raw: header ? `[${header}] ${content}` : content,
          }
        })
      }
    } catch {
      // not JSON array, continue with standard text parser
    }
  }

  const lines = rawNotes.split(/\r?\n/)
  const items: ParsedNoteItem[] = []
  let currentHeader: string | undefined = undefined
  let currentContentLines: string[] = []

  const finalizeItem = () => {
    if (currentHeader !== undefined || currentContentLines.length > 0) {
      const content = currentContentLines.join('\n').trim()
      if (currentHeader || content) {
        let timestamp: string | undefined = undefined
        let author: string | undefined = undefined
        if (currentHeader) {
          if (currentHeader.includes(' - ')) {
            const parts = currentHeader.split(' - ')
            timestamp = parts[0]?.trim()
            author = parts.slice(1).join(' - ').trim()
          } else {
            timestamp = currentHeader.trim()
          }
        }
        items.push({
          id: `note-${items.length}-${Math.random().toString(36).slice(2, 8)}`,
          header: currentHeader,
          timestamp,
          author,
          content,
          raw: currentHeader ? `[${currentHeader}] ${content}` : content,
        })
      }
      currentHeader = undefined
      currentContentLines = []
    }
  }

  // Detect lines with [timestamp...] or [header...]
  const hasBrackets = lines.some((l) => /^\[[^\]\r\n]{3,45}\]/.test(l.trim()))

  if (hasBrackets) {
    for (const line of lines) {
      const match = line.match(/^\[([^\]\r\n]{3,45})\](?:\s*:\s*|\s+|$)(.*)$/)
      // Check if bracket content looks like a timestamp/header
      if (match && (match[1].includes('/') || match[1].includes(':') || match[1].includes('-') || match[1].includes(',') || /\d/.test(match[1]))) {
        finalizeItem()
        currentHeader = match[1]
        if (match[2]) {
          currentContentLines.push(match[2])
        }
      } else {
        currentContentLines.push(line)
      }
    }
    finalizeItem()
  } else {
    // Plain text: split by blank lines
    const blocks = rawNotes.split(/\n\s*\n/)
    for (const block of blocks) {
      const trimmed = block.trim()
      if (trimmed) {
        items.push({
          id: `note-${items.length}-${Math.random().toString(36).slice(2, 8)}`,
          content: trimmed,
          raw: trimmed,
        })
      }
    }
  }

  return items
}

/**
 * Re-serializes parsed notes back into the standard format for database storage.
 */
export function serializeNotes(items: ParsedNoteItem[]): string {
  return items
    .map((item) => {
      const text = item.content.trim()
      if (!text) return ''
      if (item.header) {
        // If header had colon separator or author format:
        if (item.author) {
          return `[${item.timestamp || item.header} - ${item.author}]: ${text}`
        }
        return `[${item.header}] ${text}`
      }
      return text
    })
    .filter(Boolean)
    .join('\n\n')
}

/**
 * Formats selected notes into an aligned export file (text or markdown).
 */
export function formatNotesForDownload(
  notes: ParsedNoteItem[],
  context: {
    title?: string
    id?: string
    type?: 'Task' | 'Subtask'
  },
  format: 'txt' | 'md' = 'txt'
): string {
  const divider = '='.repeat(84)
  const thinDivider = '-'.repeat(84)
  const now = new Date()
  const dateStr = now.toLocaleDateString(undefined, {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
  const timeStr = now.toLocaleTimeString()

  if (format === 'md') {
    let out = `# ${context.type || 'Task'} Notes & Discussion Log\n\n`
    out += `| Parameter | Details |\n`
    out += `|:---|:---|\n`
    out += `| **Context** | ${context.title || 'Untitled'} |\n`
    if (context.id) {
      out += `| **ID** | \`${context.id}\` |\n`
    }
    out += `| **Export Date** | ${dateStr} at ${timeStr} |\n`
    out += `| **Total Notes** | ${notes.length} note(s) |\n\n`
    out += `---\n\n`

    notes.forEach((note, idx) => {
      out += `### Note #${idx + 1}`
      if (note.timestamp) out += ` · ${note.timestamp}`
      if (note.author) out += ` · (${note.author})`
      out += `\n\n`
      out += `${note.content}\n\n`
      out += `---\n\n`
    })

    out += `*Generated by TaskFlow Notes Manager*\n`
    return out
  }

  // Perfectly aligned plain text report
  let out = ''
  out += `${divider}\n`
  out += `TASKFLOW - NOTES & DISCUSSION REPORT\n`
  out += `${divider}\n`
  out += `Target      : [${context.type || 'Task'}] ${context.title || 'Untitled'}\n`
  if (context.id) {
    out += `ID          : ${context.id}\n`
  }
  out += `Export Date : ${dateStr} at ${timeStr}\n`
  out += `Note Count  : ${notes.length} note(s) included\n`
  out += `${divider}\n\n`

  notes.forEach((note, idx) => {
    out += `${thinDivider}\n`
    const noteNum = `[NOTE #${idx + 1}]`
    const headerDetails: string[] = []
    if (note.timestamp) headerDetails.push(`Timestamp: ${note.timestamp}`)
    if (note.author) headerDetails.push(`Author: ${note.author}`)
    const detailsStr = headerDetails.length > 0 ? ` | ${headerDetails.join(' | ')}` : ''
    out += `${noteNum}${detailsStr}\n`
    out += `${thinDivider}\n`
    out += `${note.content}\n\n`
  })

  out += `${divider}\n`
  out += `[END OF REPORT - TASKFLOW]\n`
  out += `${divider}\n`

  return out
}

/**
 * Triggers a client-side file download.
 */
export function downloadNotesFile(content: string, filename: string, mimeType = 'text/plain;charset=utf-8') {
  const blob = new Blob([content], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
