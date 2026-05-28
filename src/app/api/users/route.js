import { noco } from '@/lib/nocodb';
import { verifyJWT, hashPassword } from '@/lib/auth';
import { NextResponse } from 'next/server';

async function getSessionUser(request) {
  const cookie = request.cookies.get('pms_session');
  if (!cookie) return null;
  return verifyJWT(cookie.value);
}

// GET - list all users (Admin only)
export async function GET(request) {
  try {
    const user = await getSessionUser(request);
    if (!user || user.role !== 'Admin') {
      return NextResponse.json({ error: 'Chỉ Admin mới được xem danh sách nhân viên.' }, { status: 403 });
    }

    const users = await noco.getUsers();
    return NextResponse.json(users);
  } catch (e) {
    console.error('Fetch users error:', e);
    return NextResponse.json({ error: 'Lỗi tải danh sách nhân viên.' }, { status: 500 });
  }
}

// POST - create new user (Admin only)
export async function POST(request) {
  try {
    const user = await getSessionUser(request);
    if (!user || user.role !== 'Admin') {
      return NextResponse.json({ error: 'Chỉ Admin mới được tạo nhân viên.' }, { status: 403 });
    }

    const data = await request.json();
    if (!data.Username || !data.Password || !data.FullName || !data.Role) {
      return NextResponse.json({ error: 'Thiếu thông tin bắt buộc: Username, Password, FullName, Role.' }, { status: 400 });
    }

    // Hash password before storing
    const passwordHash = await hashPassword(data.Password);

    const newUser = await noco.createUser({
      Username: data.Username.toLowerCase().trim(),
      PasswordHash: passwordHash,
      FullName: data.FullName,
      Role: data.Role,
      BranchId: data.BranchId ? String(data.BranchId) : null,
    });

    const { PasswordHash, ...safeUser } = newUser;
    return NextResponse.json(safeUser);
  } catch (e) {
    console.error('Create user error:', e);
    return NextResponse.json({ error: 'Lỗi tạo tài khoản nhân viên.' }, { status: 500 });
  }
}

// PATCH - update user (Admin only)
export async function PATCH(request) {
  try {
    const user = await getSessionUser(request);
    if (!user || user.role !== 'Admin') {
      return NextResponse.json({ error: 'Chỉ Admin mới được chỉnh sửa nhân viên.' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json({ error: 'Mã nhân viên là bắt buộc.' }, { status: 400 });
    }

    const data = await request.json();
    const updateData = {};

    if (data.FullName !== undefined) updateData.FullName = data.FullName;
    if (data.Role !== undefined) updateData.Role = data.Role;
    if (data.BranchId !== undefined) updateData.BranchId = data.BranchId ? String(data.BranchId) : null;

    // If new password is provided, hash it
    if (data.Password) {
      updateData.PasswordHash = await hashPassword(data.Password);
    }

    const res = await noco.updateUser(id, updateData);
    return NextResponse.json(res);
  } catch (e) {
    console.error('Update user error:', e);
    return NextResponse.json({ error: 'Lỗi cập nhật thông tin nhân viên.' }, { status: 500 });
  }
}

// DELETE - remove user (Admin only, cannot delete self)
export async function DELETE(request) {
  try {
    const user = await getSessionUser(request);
    if (!user || user.role !== 'Admin') {
      return NextResponse.json({ error: 'Chỉ Admin mới được xóa nhân viên.' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json({ error: 'Mã nhân viên là bắt buộc.' }, { status: 400 });
    }

    // Prevent deleting self
    if (String(id) === String(user.id)) {
      return NextResponse.json({ error: 'Không thể xóa tài khoản của chính mình.' }, { status: 400 });
    }

    const res = await noco.deleteUser(id);
    return NextResponse.json(res);
  } catch (e) {
    console.error('Delete user error:', e);
    return NextResponse.json({ error: 'Lỗi xóa tài khoản nhân viên.' }, { status: 500 });
  }
}
