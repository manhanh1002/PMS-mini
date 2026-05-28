import { noco } from '@/lib/nocodb';
import { NextResponse } from 'next/server';

// Helper to authenticate via x-api-key
async function authenticate(request) {
  const apiKey = request.headers.get('x-api-key');
  if (!apiKey) {
    return { error: 'Missing x-api-key header', status: 401 };
  }

  const settings = await noco.getSettings();
  const configuredKey = settings.ExternalApiKey;

  if (!configuredKey || apiKey !== configuredKey) {
    return { error: 'Invalid API Key', status: 401 };
  }

  return { authenticated: true };
}

export async function GET(request) {
  try {
    const auth = await authenticate(request);
    if (auth.error) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const { searchParams } = new URL(request.url);
    const branchId = searchParams.get('branchId');
    const dateFrom = searchParams.get('dateFrom');
    const dateTo = searchParams.get('dateTo');

    let bookings = await noco.getBookings(branchId || null);

    // Filter by date if provided
    if (dateFrom || dateTo) {
      bookings = bookings.filter((b) => {
        const checkIn = new Date(b.CheckInDate);
        if (dateFrom && checkIn < new Date(dateFrom)) return false;
        if (dateTo && checkIn > new Date(dateTo)) return false;
        return true;
      });
    }

    // Return a cleaned up version of the bookings for external use
    const cleanBookings = bookings.map((b) => ({
      Id: b.Id,
      RoomId: b.RoomId,
      BranchId: b.BranchId,
      CustomerName: b.CustomerName,
      CustomerPhone: b.CustomerPhone,
      CheckInDate: b.CheckInDate,
      CheckOutDate: b.CheckOutDate,
      GuestCount: b.GuestCount,
      Status: b.Status,
      BookingType: b.BookingType,
      TotalPrice: b.TotalPrice,
      Notes: b.Notes,
      CreatedAt: b.created_at,
    }));

    return NextResponse.json(cleanBookings);
  } catch (e) {
    console.error('External API - Fetch bookings error:', e);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const auth = await authenticate(request);
    if (auth.error) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    let data;
    try {
      data = await request.json();
    } catch (e) {
      return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400 });
    }

    // Validations
    if (!data.RoomId || !data.BranchId || !data.CustomerName || !data.CheckInDate || !data.CheckOutDate) {
      return NextResponse.json({ error: 'Thiếu thông tin đặt phòng bắt buộc (RoomId, BranchId, CustomerName, CheckInDate, CheckOutDate)' }, { status: 400 });
    }

    // Check if branch and room exist
    const branches = await noco.getBranches();
    const rooms = await noco.getRooms(`?branchId=${data.BranchId}`);
    
    if (!branches.find(b => String(b.Id) === String(data.BranchId))) {
      return NextResponse.json({ error: 'BranchId không tồn tại' }, { status: 404 });
    }
    
    const room = rooms.find(r => String(r.Id) === String(data.RoomId));
    if (!room) {
      return NextResponse.json({ error: 'RoomId không tồn tại trong chi nhánh này' }, { status: 404 });
    }

    // Prepare payload
    const payload = {
      RoomId: data.RoomId,
      BranchId: data.BranchId,
      CustomerName: data.CustomerName,
      CustomerPhone: data.CustomerPhone || null,
      CheckInDate: data.CheckInDate,
      CheckOutDate: data.CheckOutDate,
      BookingType: data.BookingType || 'Daily',
      CheckInTime: data.CheckInTime || '14:00',
      CheckOutTime: data.CheckOutTime || '12:00',
      TotalPrice: Number(data.TotalPrice) || 0,
      Status: data.Status || 'Pending',
      Notes: data.Notes || 'Booking from External API',
      GuestCount: Number(data.GuestCount) || 1,
    };

    const res = await noco.createBooking(payload);
    
    // Optionally update room status to Occupied if check-in is today
    const todayStr = new Date().toISOString().split('T')[0];
    if (payload.Status === 'CheckedIn' || (payload.CheckInDate === todayStr && payload.Status === 'Confirmed')) {
      await noco.updateRoom(payload.RoomId, { Status: 'Occupied' });
    }

    return NextResponse.json({ success: true, booking: res }, { status: 201 });
  } catch (e) {
    console.error('External API - Create booking error:', e);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
