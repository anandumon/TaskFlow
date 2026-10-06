'use client'

import React from 'react'
import { useRouter } from 'next/navigation'
import { KryaWhiteboardModal } from '@/features/whiteboard/components/KryaWhiteboardModal'

export default function WhiteboardIndexPage() {
  const router = useRouter()

  return (
    <KryaWhiteboardModal
      isOpen={true}
      boardId="board-main"
      boardTitle="Whiteboard"
      onClose={() => router.push('/app/home')}
    />
  )
}
