import { noco } from '@/lib/nocodb';
import { verifyJWT, hashPassword } from '@/lib/auth';
import { NextResponse } from 'next/server';

async function getSessionUser(request) {
  const cookie = request.cookies.get('pms_session');
  if (!cookie) return null;
  return verifyJWT(cookie.value);
}

// PATCH - self-service profile update (any authenticated user)
export async function PATCH(request) {
  try {
    const sessionUser = await getSessionUser(request);
    if (!sessionUser) {
      return NextResponse.json({ error: 'Chưa đăng nhập.' }, { status: 401 });
    }

    const data = await request.json();
    const updateData = {};

    if (data.FullName !== undefined) updateData.FullName = data.FullName;

    // Password change flow - requires both oldPassword and newPassword
    if (data.NewPassword) {
      if (!data.OldPassword) {
        return NextResponse.json({ error: 'Cần nhập mật khẩu cũ để đổi mật khẩu.' }, { status: 400 });
      }

      // Fetch current user to verify old password
      const userRecord = await noco.getUser(sessionUser.username);
      if (!userRecord) {
        return NextResponse.json({ error: 'Không tìm thấy tài khoản.' }, { status: 404 });
      }

      const oldPasswordHash = await hashPassword(data.OldPassword);
      if (userRecord.PasswordHash !== oldPasswordHash) {
        return NextResponse.json({ error: 'Mật khẩu cũ không chính xác.' }, { status: 403 });
      }

      updateData.PasswordHash = await hashPassword(data.NewPassword);
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: 'Không có thông tin nào được cập nhật.' }, { status: 400 });
    }

    // We need the user's NocoDB row ID - fetch it
    const userRecord = await noco.getUser(sessionUser.username);
    if (!userRecord) {
      return NextResponse.json({ error: 'Không tìm thấy tài khoản.' }, { status: 404 });
    }

    const res = await noco.updateUser(userRecord.Id, updateData);
    return NextResponse.json({ success: true, message: 'Cập nhật thành công!' });
  } catch (e) {
    console.error('Profile update error:', e);
    return NextResponse.json({ error: 'Lỗi cập nhật tài khoản cá nhân.' }, { status: 500 });
  }
}
