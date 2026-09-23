import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/server/db/postgres'
import { getAppBaseUrl } from '@/server/utils/url'

function formatIcalDate(d: Date): string {
  return d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z'
}

function escapeIcalText(str?: string | null): string {
  if (!str) return ''
  return str
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r?\n/g, '\\n')
}

export async function GET(
  req: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    const rawUserId = params.userId
    const baseUrl = getAppBaseUrl()

    // Determine target user id
    let userRow: any = null
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(rawUserId)

    if (isUuid) {
      const rows = await query(`SELECT id, email, display_name, first_name FROM users WHERE id = $1 LIMIT 1`, [rawUserId])
      userRow = rows[0]
    } else if (rawUserId.includes('@')) {
      const rows = await query(`SELECT id, email, display_name, first_name FROM users WHERE LOWER(email) = LOWER($1) LIMIT 1`, [rawUserId.trim()])
      userRow = rows[0]
    }

    // Find all tasks associated with this user (either assigned, created, or in their workspaces)
    let tasks: any[] = []
    if (userRow?.id) {
      tasks = await query(
        `SELECT t.*, p.name as project_name 
         FROM tasks t
         LEFT JOIN projects p ON t.project_id = p.id
         WHERE (
           t.assignee_id = $1 
           OR t.created_by = $1 
           OR t.workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = $1)
         )
         AND t.due_date IS NOT NULL
         ORDER BY t.due_date ASC
         LIMIT 200`,
        [userRow.id]
      )
    } else {
      // Fallback: return active tasks with due date
      tasks = await query(
        `SELECT t.*, p.name as project_name 
         FROM tasks t
         LEFT JOIN projects p ON t.project_id = p.id
         WHERE t.due_date IS NOT NULL
         ORDER BY t.due_date ASC
         LIMIT 100`
      )
    }

    const userName = userRow?.display_name || userRow?.first_name || userRow?.email || 'TaskFlow User'
    const calName = `TaskFlow - ${userName}'s Schedule`

    const lines: string[] = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//TaskFlow//TaskFlow Calendar Sync 2.0//EN',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      `X-WR-CALNAME:${escapeIcalText(calName)}`,
      'X-WR-TIMEZONE:UTC',
      'X-WR-CALDESC:Live tasks, project milestones and deliverable deadlines from TaskFlow',
      'REFRESH-INTERVAL;VALUE=DURATION:PT15M',
      'X-PUBLISHED-TTL:PT15M',
    ]

    const now = new Date()

    for (const t of tasks) {
      try {
        const dueDate = new Date(t.due_date)
        if (isNaN(dueDate.getTime())) continue

        // Start time defaults to 30 minutes before due time, or all-day
        const startDate = new Date(dueDate.getTime() - 30 * 60 * 1000)
        const isCompleted = ['DONE', 'COMPLETED', 'RELEASE'].includes((t.status || '').toUpperCase())

        const taskUrl = t.project_id
          ? `${baseUrl}/app/projects/${t.project_id}`
          : `${baseUrl}/app/tasks`

        const desc = [
          t.description ? t.description.slice(0, 300) : '',
          '',
          `Status: ${t.status || 'IN_PROGRESS'}`,
          `Priority: ${t.priority || 'MEDIUM'}`,
          t.project_name ? `Project: ${t.project_name}` : '',
          t.assignee_name ? `Assignee: ${t.assignee_name}` : '',
          `Link: ${taskUrl}`,
        ]
          .filter(Boolean)
          .join('\n')

        lines.push('BEGIN:VEVENT')
        lines.push(`UID:taskflow-${t.id}@taskflow.app`)
        lines.push(`DTSTAMP:${formatIcalDate(now)}`)
        lines.push(`DTSTART:${formatIcalDate(startDate)}`)
        lines.push(`DTEND:${formatIcalDate(dueDate)}`)
        lines.push(`SUMMARY:${escapeIcalText(t.title || 'TaskFlow Deliverable')}${t.project_name ? ` [${escapeIcalText(t.project_name)}]` : ''}`)
        lines.push(`DESCRIPTION:${escapeIcalText(desc)}`)
        lines.push(`STATUS:${isCompleted ? 'COMPLETED' : 'CONFIRMED'}`)
        lines.push(`URL:${escapeIcalText(taskUrl)}`)
        lines.push(`CATEGORIES:TaskFlow,${t.status || 'TASK'}`)
        lines.push('END:VEVENT')
      } catch (itemErr) {
        // Skip malformed item
      }
    }

    lines.push('END:VCALENDAR')
    const icalContent = lines.join('\r\n')

    return new NextResponse(icalContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/calendar; charset=utf-8',
        'Cache-Control': 'no-cache, no-store, max-age=0, must-revalidate',
        'Content-Disposition': `inline; filename="taskflow-calendar.ics"`,
      },
    })
  } catch (err: any) {
    return new NextResponse(`Error generating calendar feed: ${err.message}`, { status: 500 })
  }
}
