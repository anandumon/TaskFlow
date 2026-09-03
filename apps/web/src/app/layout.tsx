import './globals.css'
import type { Metadata } from 'next'
import { Providers } from './providers'

export const metadata: Metadata = {
  title: {
    default: 'TaskFlow — Project Management & Productivity Platform',
    template: '%s | TaskFlow',
  },
  description:
    'Premium all-in-one project management, task tracking, and team collaboration platform for modern teams.',
  keywords: [
    'project management',
    'task management',
    'team collaboration',
    'productivity',
    'kanban',
    'agile',
  ],
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen bg-background antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
