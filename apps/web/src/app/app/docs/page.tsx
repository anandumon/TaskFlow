'use client'

import React from 'react'
import { useRouter } from 'next/navigation'
import { DocViewerModal } from '@/features/docs/components/DocViewerModal'

export default function DocsIndexPage() {
  const router = useRouter()

  return (
    <DocViewerModal
      isOpen={true}
      docId="demo"
      docTitle="demo"
      onClose={() => router.push('/app/home')}
    />
  )
}
