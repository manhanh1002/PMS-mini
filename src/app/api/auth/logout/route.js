import { NextResponse } from 'next/server';

export async function POST() {
  try {
    const response = NextResponse.json({ success: true });
    
    // Clear cookie by setting maxAge to 0
    response.cookies.set({
      name: 'pms_session',
      value: '',
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 0,
      path: '/'
    });

    return response;
  } catch (e) {
    console.error('Logout error:', e);
    return NextResponse.json({ error: 'Đã xảy ra lỗi hệ thống khi đăng xuất.' }, { status: 500 });
  }
}
export async function GET() {
  // Support both GET and POST for logout
  return POST();
}
