'use client'

import React from 'react'
import { useRouter, useParams } from 'next/navigation'
import { KryaWhiteboardModal } from '@/features/whiteboard/components/KryaWhiteboardModal'

export default function WhiteboardPage() {
  const router = useRouter()
  const params = useParams()
  const boardId = (params?.id as string) || 'board-main'
  const boardTitle =
    boardId && boardId !== 'board-main' && boardId !== 'krya-main' && !boardId.startsWith('board-') && !boardId.startsWith('krya-')
      ? decodeURIComponent(boardId)
      : 'Whiteboard'

  return (
    <KryaWhiteboardModal
      isOpen={true}
      boardId={boardId}
      boardTitle={boardTitle}
      onClose={() => router.back()}
    />
  )
}
