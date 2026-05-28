import { NextResponse } from 'next/server';
import { verifyJWT } from '@/lib/auth';

export async function proxy(request) {
  const sessionCookie = request.cookies.get('pms_session');
  
  // 1. If cookie doesn't exist, redirect to login
  if (!sessionCookie) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }

  // 2. Verify token
  const payload = await verifyJWT(sessionCookie.value);
  if (!payload) {
    // If invalid token, clear cookie and redirect to login
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    const response = NextResponse.redirect(url);
    response.cookies.delete('pms_session');
    return response;
  }

  // 3. Authenticated - proceed
  return NextResponse.next();
}

export const config = {
  matcher: [
    // Protect these pages
    '/',
    '/calendar',
    '/bookings',
    '/rooms',
    '/services',
    '/branches',
  ],
};
