import { noco } from '@/lib/nocodb';
import { verifyJWT } from '@/lib/auth';
import { NextResponse } from 'next/server';
import { checkRoomAvailability } from '@/lib/conflict';


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

    const blocks = await noco.getRoomBlocks();
    return NextResponse.json(blocks);
  } catch (e) {
    console.error('Fetch room blocks error:', e);
    return NextResponse.json({ error: 'Lỗi tải danh sách khóa phòng.' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const user = await getSessionUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Chưa đăng nhập.' }, { status: 401 });
    }

    const data = await request.json();
    if (!data.RoomId || !data.StartDate || !data.EndDate) {
      return NextResponse.json({ error: 'Thiếu thông tin bắt buộc (RoomId, StartDate, EndDate).' }, { status: 400 });
    }

    // Past-date check
    const todayStr = new Date().toISOString().split('T')[0];
    if (data.StartDate < todayStr) {
      return NextResponse.json({ error: 'Không thể khóa phòng với ngày trong quá khứ.' }, { status: 400 });
    }

    // Overlap / conflict check
    const availability = await checkRoomAvailability(noco, data.RoomId, data.StartDate, data.EndDate);
    if (availability.conflict) {
      return NextResponse.json({ error: availability.message }, { status: 409 });
    }

    const res = await noco.createRoomBlock(data);
    return NextResponse.json(res);
  } catch (e) {
    console.error('Create room block error:', e);
    return NextResponse.json({ error: 'Lỗi khóa phòng.' }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    const user = await getSessionUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Chưa đăng nhập.' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json({ error: 'Mã định danh là bắt buộc.' }, { status: 400 });
    }

    const res = await noco.deleteRoomBlock(id);
    return NextResponse.json(res);
  } catch (e) {
    console.error('Delete room block error:', e);
    return NextResponse.json({ error: 'Lỗi hủy khóa phòng.' }, { status: 500 });
  }
}
