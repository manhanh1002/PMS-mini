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
    if (!user) return NextResponse.json({ error: 'Chưa đăng nhập.' }, { status: 401 });

    const promotions = await noco.getPromotions();
    return NextResponse.json(promotions);
  } catch (e) {
    console.error('Fetch promotions error:', e);
    return NextResponse.json({ error: 'Lỗi tải danh sách khuyến mãi.' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const user = await getSessionUser(request);
    if (!user || user.role !== 'Admin') {
      return NextResponse.json({ error: 'Chỉ Admin mới có quyền tạo khuyến mãi.' }, { status: 403 });
    }

    const data = await request.json();
    if (!data.Code || !data.Type || !data.Value) {
      return NextResponse.json({ error: 'Thiếu thông tin bắt buộc (Mã, Loại, Giá trị).' }, { status: 400 });
    }

    // Check if code exists
    const existing = await noco.getPromotionByCode(data.Code);
    if (existing) {
      return NextResponse.json({ error: 'Mã khuyến mãi đã tồn tại.' }, { status: 400 });
    }

    data.UsedCount = 0;
    const res = await noco.createPromotion(data);
    return NextResponse.json(res);
  } catch (e) {
    console.error('Create promotion error:', e);
    return NextResponse.json({ error: 'Lỗi tạo khuyến mãi.' }, { status: 500 });
  }
}

export async function PATCH(request) {
  try {
    const user = await getSessionUser(request);
    if (!user || user.role !== 'Admin') {
      return NextResponse.json({ error: 'Chỉ Admin mới có quyền sửa khuyến mãi.' }, { status: 403 });
    }

    const data = await request.json();
    const { id, ...updateData } = data;
    if (!id) return NextResponse.json({ error: 'Mã chương trình là bắt buộc.' }, { status: 400 });

    const res = await noco.updatePromotion(id, updateData);
    return NextResponse.json(res);
  } catch (e) {
    console.error('Update promotion error:', e);
    return NextResponse.json({ error: 'Lỗi cập nhật khuyến mãi.' }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    const user = await getSessionUser(request);
    if (!user || user.role !== 'Admin') {
      return NextResponse.json({ error: 'Chỉ Admin mới có quyền xóa khuyến mãi.' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'ID là bắt buộc.' }, { status: 400 });

    const res = await noco.deletePromotion(id);
    return NextResponse.json(res);
  } catch (e) {
    console.error('Delete promotion error:', e);
    return NextResponse.json({ error: 'Lỗi xóa khuyến mãi.' }, { status: 500 });
  }
}
