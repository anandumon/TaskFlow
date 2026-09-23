import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(date: string | Date): string {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(date))
}

export function formatRelativeTime(date: string | Date): string {
  const now = new Date()
  const d = new Date(date)
  const diffMs = now.getTime() - d.getTime()
  const diffMin = Math.floor(diffMs / 60000)
  const diffHour = Math.floor(diffMin / 60)
  const diffDay = Math.floor(diffHour / 24)

  if (diffMin < 1) return 'just now'
  if (diffMin < 60) return `${diffMin}m ago`
  if (diffHour < 24) return `${diffHour}h ago`
  if (diffDay < 7) return `${diffDay}d ago`
  return formatDate(date)
}

export function getInitials(name: string): string {
  return name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

export function generateSlug(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export function getFirstName(raw?: string): string {
  if (!raw) return ''
  const trimmed = raw.trim()
  if (!trimmed) return ''
  if (trimmed.toLowerCase() === 'you') return 'You'
  if (trimmed.toLowerCase() === 'lead reviewer') return 'Lead Reviewer'
  if (trimmed.includes('@')) {
    const local = trimmed.split('@')[0]
    const part = local.split(/[._-]/)[0]
    return part.charAt(0).toUpperCase() + part.slice(1)
  }
  const parts = trimmed.split(/\s+/)
  return parts[0]
}
