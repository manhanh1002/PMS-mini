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

    // Enforce branch limit for Staff
    if (user.role !== 'Admin') {
      branchId = user.branchId;
    }

    const rooms = await noco.getRooms(branchId);
    return NextResponse.json(rooms);
  } catch (e) {
    console.error('Fetch rooms error:', e);
    return NextResponse.json({ error: 'Lỗi tải danh sách phòng.' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const user = await getSessionUser(request);
    if (!user || user.role !== 'Admin') {
      return NextResponse.json({ error: 'Không có quyền truy cập.' }, { status: 403 });
    }

    const data = await request.json();
    if (!data.RoomName || !data.BranchId) {
      return NextResponse.json({ error: 'Tên phòng và chi nhánh là bắt buộc.' }, { status: 400 });
    }

    const res = await noco.createRoom(data);
    return NextResponse.json(res);
  } catch (e) {
    console.error('Create room error:', e);
    return NextResponse.json({ error: 'Lỗi tạo phòng mới.' }, { status: 500 });
  }
}

export async function PATCH(request) {
  // Support quick room updates (e.g. clean status)
  try {
    const user = await getSessionUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Chưa đăng nhập.' }, { status: 401 });
    }

    const data = await request.json();
    const { id, ...updateData } = data;
    if (!id) {
      return NextResponse.json({ error: 'Mã phòng là bắt buộc.' }, { status: 400 });
    }

    // Verify if room is Occupied
    const currentRoom = await noco.getRoom(id);
    if (currentRoom && currentRoom.Status === 'Occupied') {
      const restrictedFields = [
        'RoomName', 'RoomType', 'Price', 'HourlyPrice', 
        'ExtraHourPrice', 'OvernightPrice', 'MaxGuests', 'BranchId'
      ];
      for (const field of restrictedFields) {
        delete updateData[field];
      }
      
      // If nothing left to update (e.g. they only sent restricted fields), just return early
      if (Object.keys(updateData).length === 0) {
        return NextResponse.json({ error: 'Không được phép cập nhật các trường này khi phòng đang có khách.' }, { status: 403 });
      }
    }

    const res = await noco.updateRoom(id, updateData);
    return NextResponse.json(res);
  } catch (e) {
    console.error('Update room error:', e);
    return NextResponse.json({ error: 'Lỗi cập nhật phòng.' }, { status: 500 });
  }
}
