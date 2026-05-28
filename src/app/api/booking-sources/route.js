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

    const sources = await noco.getBookingSources();
    return NextResponse.json(sources);
  } catch (e) {
    console.error('Fetch booking sources error:', e);
    return NextResponse.json({ error: 'Lỗi tải nguồn đặt phòng.' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const user = await getSessionUser(request);
    if (!user || user.role !== 'Admin') {
      return NextResponse.json({ error: 'Không có quyền truy cập.' }, { status: 403 });
    }

    const data = await request.json();
    if (!data.SourceCode || !data.SourceName) {
      return NextResponse.json({ error: 'Mã nguồn và tên nguồn là bắt buộc.' }, { status: 400 });
    }

    const res = await noco.createBookingSource(data);
    return NextResponse.json(res);
  } catch (e) {
    console.error('Create booking source error:', e);
    return NextResponse.json({ error: 'Lỗi tạo nguồn đặt phòng mới.' }, { status: 500 });
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
      return NextResponse.json({ error: 'Mã định danh là bắt buộc.' }, { status: 400 });
    }

    const res = await noco.updateBookingSource(id, updateData);
    return NextResponse.json(res);
  } catch (e) {
    console.error('Update booking source error:', e);
    return NextResponse.json({ error: 'Lỗi cập nhật nguồn đặt phòng.' }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    const user = await getSessionUser(request);
    if (!user || user.role !== 'Admin') {
      return NextResponse.json({ error: 'Không có quyền truy cập.' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json({ error: 'Mã định danh là bắt buộc.' }, { status: 400 });
    }

    const res = await noco.deleteBookingSource(id);
    return NextResponse.json(res);
  } catch (e) {
    console.error('Delete booking source error:', e);
    return NextResponse.json({ error: 'Lỗi xóa nguồn đặt phòng.' }, { status: 500 });
  }
}
