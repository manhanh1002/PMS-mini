import { noco } from '@/lib/nocodb';
import { hashPassword, signJWT } from '@/lib/auth';
import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const { username, password } = await request.json();
    if (!username || !password) {
      return NextResponse.json({ error: 'Vui lòng điền đầy đủ tên đăng nhập và mật khẩu.' }, { status: 400 });
    }

    const inputHash = await hashPassword(password);
    const user = await noco.getUser(username);
    
    if (!user || user.PasswordHash !== inputHash) {
      return NextResponse.json({ error: 'Tên đăng nhập hoặc mật khẩu không chính xác.' }, { status: 401 });
    }

    const payload = {
      userId: user.Id,
      username: user.Username,
      role: user.Role,
      branchId: user.BranchId,
      fullName: user.FullName
    };

    const token = await signJWT(payload, 7 * 24 * 3600); // 7 days session

    const response = NextResponse.json({
      success: true,
      user: {
        username: user.Username,
        role: user.Role,
        fullName: user.FullName,
        branchId: user.BranchId,
      }
    });

    response.cookies.set({
      name: 'pms_session',
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 3600, // 7 days
      path: '/'
    });

    return response;
  } catch (e) {
    console.error('Login error:', e);
    return NextResponse.json({ error: 'Đã xảy ra lỗi hệ thống khi đăng nhập.' }, { status: 500 });
  }
}
