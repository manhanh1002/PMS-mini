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

    const bookings = await noco.getBookings(branchId);
    return NextResponse.json(bookings);
  } catch (e) {
    console.error('Fetch bookings error:', e);
    return NextResponse.json({ error: 'Lỗi tải danh sách lịch đặt.' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const user = await getSessionUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Chưa đăng nhập.' }, { status: 401 });
    }

    const data = await request.json();
    
    // Validations
    if (!data.RoomId || !data.BranchId || !data.CustomerName || !data.CheckInDate || !data.CheckOutDate) {
      return NextResponse.json({ error: 'Thiếu thông tin đặt phòng bắt buộc.' }, { status: 400 });
    }

    // Force staff to book only in their assigned branch
    if (user.role !== 'Admin' && data.BranchId !== user.branchId) {
      return NextResponse.json({ error: 'Bạn không được phép đặt phòng ở chi nhánh khác.' }, { status: 403 });
    }

    const res = await noco.createBooking(data);
    
    // If a promo code was applied, increment its UsedCount
    if (data.PromoCode) {
      const promo = await noco.getPromotionByCode(data.PromoCode);
      if (promo) {
        await noco.updatePromotion(promo.Id, { UsedCount: (promo.UsedCount || 0) + 1 });
      }
    }

    // Optionally update room status to Occupied if check-in is today
    const todayStr = new Date().toISOString().split('T')[0];
    if (data.Status === 'CheckedIn' || (data.CheckInDate === todayStr && data.Status === 'Confirmed')) {
      await noco.updateRoom(data.RoomId, { Status: 'Occupied' });
    }

    return NextResponse.json(res);
  } catch (e) {
    console.error('Create booking error:', e);
    return NextResponse.json({ error: 'Lỗi tạo đơn đặt phòng mới.' }, { status: 500 });
  }
}
