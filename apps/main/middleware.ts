import { type NextRequest, NextResponse } from 'next/server'
import { updateSession } from './supabase/middleware'
import { LOCAL_MODE } from '@/lib/local-mode'

export async function middleware(request: NextRequest) {
  if (LOCAL_MODE) {
    return NextResponse.next({ request })
  }

  return await updateSession(request)
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
