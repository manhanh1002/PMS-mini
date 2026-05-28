import { noco } from '@/lib/nocodb';
import { verifyJWT } from '@/lib/auth';
import { NextResponse } from 'next/server';

async function getSessionUser(request) {
  const cookie = request.cookies.get('pms_session');
  if (!cookie) return null;
  return verifyJWT(cookie.value);
}

export async function GET(request) {
  try {
    const user = await getSessionUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Chưa đăng nhập.' }, { status: 401 });
    }
    
    const branches = await noco.getBranches();
    return NextResponse.json(branches);
  } catch (e) {
    console.error('Fetch branches error:', e);
    return NextResponse.json({ error: 'Lỗi tải danh sách chi nhánh.' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const user = await getSessionUser(request);
    if (!user || user.role !== 'Admin') {
      return NextResponse.json({ error: 'Không có quyền truy cập.' }, { status: 403 });
    }

    const data = await request.json();
    if (!data.BranchName) {
      return NextResponse.json({ error: 'Tên chi nhánh là bắt buộc.' }, { status: 400 });
    }

    const res = await noco.createBranch(data);
    return NextResponse.json(res);
  } catch (e) {
    console.error('Create branch error:', e);
    return NextResponse.json({ error: 'Lỗi tạo chi nhánh mới.' }, { status: 500 });
  }
}

export async function PATCH(request) {
  try {
    const user = await getSessionUser(request);
    if (!user || user.role !== 'Admin') {
      return NextResponse.json({ error: 'Không có quyền truy cập.' }, { status: 403 });
    }

    const data = await request.json();
    const { id, ...updateData } = data;
    if (!id) {
      return NextResponse.json({ error: 'Mã chi nhánh là bắt buộc.' }, { status: 400 });
    }

    const res = await noco.updateBranch(id, updateData);
    return NextResponse.json(res);
  } catch (e) {
    console.error('Update branch error:', e);
    return NextResponse.json({ error: 'Lỗi cập nhật chi nhánh.' }, { status: 500 });
  }
}
