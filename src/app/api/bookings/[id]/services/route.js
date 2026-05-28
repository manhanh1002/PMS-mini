import { noco } from '@/lib/nocodb';
import { verifyJWT } from '@/lib/auth';
import { NextResponse } from 'next/server';

async function getSessionUser(request) {
  const cookie = request.cookies.get('pms_session');
  if (!cookie) return null;
  return verifyJWT(cookie.value);
}

export async function GET(request, { params }) {
  try {
    const { id } = await params;
    const user = await getSessionUser(request);
    
    // Allow lookup either with auth OR if it is a validated public guest check
    const booking = await noco.getBooking(id);
    if (!booking) {
      return NextResponse.json({ error: 'Không tìm thấy đơn đặt phòng.' }, { status: 404 });
    }

    if (!user) {
      const { searchParams } = new URL(request.url);
      const phoneParam = searchParams.get('phone');
      if (!phoneParam || booking.CustomerPhone?.replace(/\D/g, '') !== phoneParam.replace(/\D/g, '')) {
        return NextResponse.json({ error: 'Không có quyền truy cập.' }, { status: 401 });
      }
    } else {
      if (user.role !== 'Admin' && booking.BranchId !== user.branchId) {
        return NextResponse.json({ error: 'Không có quyền truy cập.' }, { status: 403 });
      }
    }

    const services = await noco.getBookingServices(id);
    return NextResponse.json(services);
  } catch (e) {
    console.error('Fetch booking services error:', e);
    return NextResponse.json({ error: 'Lỗi tải danh sách dịch vụ đã đặt.' }, { status: 500 });
  }
}

export async function POST(request, { params }) {
  try {
    const { id } = await params;
    const user = await getSessionUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Chưa đăng nhập.' }, { status: 401 });
    }

    const booking = await noco.getBooking(id);
    if (!booking) {
      return NextResponse.json({ error: 'Không tìm thấy đơn đặt phòng.' }, { status: 404 });
    }

    if (user.role !== 'Admin' && booking.BranchId !== user.branchId) {
      return NextResponse.json({ error: 'Không có quyền truy cập.' }, { status: 403 });
    }

    const data = await request.json(); // expect { ServiceId, Quantity, UnitPrice, Notes }
    if (!data.ServiceId || !data.Quantity || !data.UnitPrice) {
      return NextResponse.json({ error: 'Thiếu thông tin dịch vụ.' }, { status: 400 });
    }

    const res = await noco.addServiceToBooking({
      BookingId: id,
      ServiceId: data.ServiceId,
      Quantity: data.Quantity,
      UnitPrice: data.UnitPrice,
      TotalPrice: Number(data.Quantity) * Number(data.UnitPrice),
      OrderDate: new Date().toISOString(),
      Notes: data.Notes || ''
    });

    return NextResponse.json(res);
  } catch (e) {
    console.error('Add service to booking error:', e);
    return NextResponse.json({ error: 'Lỗi thêm dịch vụ phụ thu.' }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  try {
    const { id } = await params;
    const user = await getSessionUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Chưa đăng nhập.' }, { status: 401 });
    }

    const booking = await noco.getBooking(id);
    if (!booking) {
      return NextResponse.json({ error: 'Không tìm thấy đơn đặt phòng.' }, { status: 404 });
    }

    if (user.role !== 'Admin' && booking.BranchId !== user.branchId) {
      return NextResponse.json({ error: 'Không có quyền truy cập.' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const bookingServiceId = searchParams.get('bookingServiceId');
    if (!bookingServiceId) {
      return NextResponse.json({ error: 'Mã order dịch vụ là bắt buộc.' }, { status: 400 });
    }

    const res = await noco.removeServiceFromBooking(bookingServiceId);
    return NextResponse.json(res);
  } catch (e) {
    console.error('Delete booking service error:', e);
    return NextResponse.json({ error: 'Lỗi hủy dịch vụ đã đặt.' }, { status: 500 });
  }
}
