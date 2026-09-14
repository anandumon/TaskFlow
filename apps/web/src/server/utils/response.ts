import { NextResponse } from 'next/server'

export interface ApiErrorPayload {
  status: number
  code: string
  message: string
  details?: Array<{ field: string; message: string }>
}

export function apiSuccess<T>(data: T, status = 200) {
  return NextResponse.json(
    {
      success: true,
      data,
      timestamp: new Date().toISOString(),
    },
    { status }
  )
}

export function apiError(
  message: string,
  status = 400,
  code = 'BAD_REQUEST',
  details?: Array<{ field: string; message: string }>
) {
  return NextResponse.json(
    {
      success: false,
      data: null,
      error: {
        status,
        code,
        message,
        details,
      },
      timestamp: new Date().toISOString(),
    },
    { status }
  )
}
