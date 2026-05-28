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

    const { searchParams } = new URL(request.url);
    let branchId = searchParams.get('branchId');

    if (user.role !== 'Admin') {
      branchId = user.branchId;
    }

    const services = await noco.getExtraServices(branchId);
    return NextResponse.json(services);
  } catch (e) {
    console.error('Fetch services catalog error:', e);
    return NextResponse.json({ error: 'Lỗi tải danh mục dịch vụ.' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const user = await getSessionUser(request);
    if (!user || user.role !== 'Admin') {
      return NextResponse.json({ error: 'Không có quyền truy cập.' }, { status: 403 });
    }

    const data = await request.json();
    if (!data.ServiceName || !data.Price) {
      return NextResponse.json({ error: 'Tên dịch vụ và giá là bắt buộc.' }, { status: 400 });
    }

    const res = await noco.createExtraService(data);
    return NextResponse.json(res);
  } catch (e) {
    console.error('Create service error:', e);
    return NextResponse.json({ error: 'Lỗi tạo dịch vụ mới.' }, { status: 500 });
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
      return NextResponse.json({ error: 'Mã dịch vụ là bắt buộc.' }, { status: 400 });
    }

    const res = await noco.updateExtraService(id, updateData);
    return NextResponse.json(res);
  } catch (e) {
    console.error('Update service error:', e);
    return NextResponse.json({ error: 'Lỗi cập nhật dịch vụ.' }, { status: 500 });
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
      return NextResponse.json({ error: 'Mã dịch vụ là bắt buộc.' }, { status: 400 });
    }

    const res = await noco.deleteExtraService(id);
    return NextResponse.json(res);
  } catch (e) {
    console.error('Delete service error:', e);
    return NextResponse.json({ error: 'Lỗi xóa dịch vụ.' }, { status: 500 });
  }
}
