import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  // Middleware desativado temporariamente para debug
  console.log('Middleware - path:', request.nextUrl.pathname);
  return NextResponse.next();
}

export const config = {
  matcher: '/admin/:path*',
};
