import { noco } from '@/lib/nocodb';
import { verifyJWT } from '@/lib/auth';
import { NextResponse } from 'next/server';
import { checkRoomAvailability } from '@/lib/conflict';


async function getSessionUser(request) {
  const cookie = request.cookies.get('pms_session');
  if (!cookie) return null;
  return verifyJWT(cookie.value);
}

export async function GET(request, { params }) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const phoneParam = searchParams.get('phone');

    const user = await getSessionUser(request);
    
    // Fetch booking details
    const booking = await noco.getBooking(id);
    if (!booking) {
      return NextResponse.json({ error: 'Không tìm thấy thông tin đặt phòng.' }, { status: 404 });
    }

    // Security check: if not logged in, customer must supply their phone number matching the record
    if (!user) {
      if (!phoneParam) {
        return NextResponse.json({ error: 'Cần xác thực số điện thoại để tra cứu.' }, { status: 401 });
      }
      
      // Clean phone formats (remove spaces, symbols) for comparison
      const cleanDBPhone = booking.CustomerPhone?.replace(/\D/g, '');
      const cleanQueryPhone = phoneParam.replace(/\D/g, '');

      if (!cleanDBPhone || cleanDBPhone !== cleanQueryPhone) {
        return NextResponse.json({ error: 'Số điện thoại xác thực không chính xác.' }, { status: 403 });
      }
    } else {
      // Staff members can only view bookings of their assigned branch
      if (user.role !== 'Admin' && booking.BranchId !== user.branchId) {
        return NextResponse.json({ error: 'Không được phép truy cập đơn đặt ở chi nhánh khác.' }, { status: 403 });
      }
    }

    // Gather extra services ordered
    const servicesOrdered = await noco.getBookingServices(id);
    
    // Gather payment history
    const payments = await noco.getPayments(id);

    return NextResponse.json({
      ...booking,
      servicesOrdered,
      payments
    });
  } catch (e) {
    console.error('Fetch booking by ID error:', e);
    return NextResponse.json({ error: 'Lỗi tải chi tiết đơn đặt phòng.' }, { status: 500 });
  }
}

export async function PATCH(request, { params }) {
  try {
    const { id } = await params;
    const user = await getSessionUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Chưa đăng nhập.' }, { status: 401 });
    }

    const data = await request.json();
    
    // Fetch current booking state
    const currentBooking = await noco.getBooking(id);
    if (!currentBooking) {
      return NextResponse.json({ error: 'Không tìm thấy đặt phòng.' }, { status: 404 });
    }

    // Staff access check
    if (user.role !== 'Admin' && currentBooking.BranchId !== user.branchId) {
      return NextResponse.json({ error: 'Bạn không được phép chỉnh sửa đặt phòng của chi nhánh khác.' }, { status: 403 });
    }

    // Conflict check when dates or room change (exclude self to avoid false positive)
    const needsCheck = data.CheckInDate || data.CheckOutDate || data.RoomId;
    if (needsCheck) {
      const checkIn  = data.CheckInDate  || currentBooking.CheckInDate;
      const checkOut = data.CheckOutDate || currentBooking.CheckOutDate;
      const roomId   = data.RoomId       || currentBooking.RoomId;

      const availability = await checkRoomAvailability(noco, roomId, checkIn, checkOut, id);
      if (availability.conflict) {
        return NextResponse.json({ error: availability.message }, { status: 409 });
      }
    }

    const res = await noco.updateBooking(id, data);

    // Dynamic Room Status Changes
    if (data.Status) {
      if (data.Status === 'CheckedIn') {
        // Mark room as occupied
        await noco.updateRoom(currentBooking.RoomId, { Status: 'Occupied' });
      } else if (data.Status === 'CheckedOut') {
        // Mark room as cleaning when checked out
        await noco.updateRoom(currentBooking.RoomId, { Status: 'Cleaning' });
      } else if (data.Status === 'Cancelled' || data.Status === 'NoShow') {
        // Mark room as available if canceled or no-show
        await noco.updateRoom(currentBooking.RoomId, { Status: 'Available' });
      }
    }

    return NextResponse.json(res);
  } catch (e) {
    console.error('Update booking error:', e);
    return NextResponse.json({ error: 'Lỗi cập nhật thông tin đặt phòng.' }, { status: 500 });
  }
}
