import { noco } from '@/lib/nocodb';
import { verifyJWT } from '@/lib/auth';
import { NextResponse } from 'next/server';

async function getSessionUser(request) {
  const cookie = request.cookies.get('pms_session');
  if (!cookie) return null;
  return verifyJWT(cookie.value);
}

/**
 * GET /api/bookings/availability?roomId=12&excludeId=5
 * Returns all busy date ranges for a given room (for frontend UX hint)
 */
export async function GET(request) {
  try {
    const user = await getSessionUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Chưa đăng nhập.' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const roomId = searchParams.get('roomId');
    const excludeId = searchParams.get('excludeId');

    if (!roomId) {
      return NextResponse.json({ error: 'roomId là bắt buộc.' }, { status: 400 });
    }

    const [bookings, blocks] = await Promise.all([
      noco.getBookingsByRoom(roomId),
      noco.getRoomBlocksByRoom(roomId),
    ]);

    const busy = [];

    for (const b of bookings) {
      if (excludeId && String(b.Id) === String(excludeId)) continue;
      busy.push({
        from: b.CheckInDate,
        to: b.CheckOutDate,
        label: `${b.CustomerName}`,
        type: 'booking',
      });
    }

    for (const bl of blocks) {
      busy.push({
        from: bl.StartDate,
        to: bl.EndDate,
        label: bl.Notes ? `🚧 ${bl.Notes}` : '🚧 Bảo trì / Khóa phòng',
        type: 'block',
      });
    }

    // Sort by date
    busy.sort((a, b) => a.from.localeCompare(b.from));

    return NextResponse.json({ busy });
  } catch (e) {
    console.error('Availability check error:', e);
    return NextResponse.json({ error: 'Lỗi kiểm tra lịch phòng.' }, { status: 500 });
  }
}
