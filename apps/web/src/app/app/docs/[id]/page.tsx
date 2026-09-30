'use client'

import React from 'react'
import { useRouter, useParams } from 'next/navigation'
import { DocViewerModal } from '@/features/docs/components/DocViewerModal'

export default function DocDetailPage() {
  const router = useRouter()
  const params = useParams()
  const docId = (params?.id as string) || 'demo'
  const docTitle = docId ? decodeURIComponent(docId) : 'demo'

  return (
    <DocViewerModal
      isOpen={true}
      docId={docId}
      docTitle={docTitle}
      onClose={() => router.push('/app/docs')}
    />
  )
}
