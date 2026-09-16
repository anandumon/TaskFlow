import { NextRequest, NextResponse } from 'next/server'
import { getAppBaseUrl } from '@/server/utils/url'

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token') || ''
  const baseUrl = getAppBaseUrl()
  const redirectUrl = new URL('/invite', baseUrl)
  if (token) {
    redirectUrl.searchParams.set('token', token)
  }
  return NextResponse.redirect(redirectUrl)
}
