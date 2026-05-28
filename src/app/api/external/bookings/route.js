import { noco } from '@/lib/nocodb';
import { NextResponse } from 'next/server';
import { checkRoomAvailability, findAvailableRoom } from '@/lib/conflict';


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
    if ((!data.RoomId && !data.RoomType) || !data.BranchId || !data.CustomerName || !data.CheckInDate || !data.CheckOutDate) {
      return NextResponse.json({ error: 'Thiếu thông tin đặt phòng bắt buộc (RoomId hoặc RoomType, BranchId, CustomerName, CheckInDate, CheckOutDate)' }, { status: 400 });
    }

    // Check if branch exists
    const branches = await noco.getBranches();
    if (!branches.find(b => String(b.Id) === String(data.BranchId))) {
      return NextResponse.json({ error: 'BranchId không tồn tại' }, { status: 404 });
    }

    // Resolve room auto-allocation if RoomId is not provided
    let room;
    if (!data.RoomId) {
      const findResult = await findAvailableRoom(noco, data.BranchId, data.RoomType, data.CheckInDate, data.CheckOutDate);
      if (findResult.error) {
        return NextResponse.json({ error: findResult.error }, { status: 409 });
      }
      data.RoomId = findResult.room.Id;
      room = findResult.room;
    } else {
      // Validate provided RoomId
      const rooms = await noco.getRooms(data.BranchId); // Fixed query string bug
      room = rooms.find(r => String(r.Id) === String(data.RoomId));
      if (!room) {
        return NextResponse.json({ error: 'RoomId không tồn tại trong chi nhánh này' }, { status: 404 });
      }
    }

    // Overlap / conflict check (no past-date enforcement for OTA external bookings)
    const availability = await checkRoomAvailability(noco, data.RoomId, data.CheckInDate, data.CheckOutDate);
    if (availability.conflict) {
      return NextResponse.json({ error: availability.message }, { status: 409 });
    }

    // Calculate default price if not provided
    let finalTotalPrice = 0;
    if (data.TotalPrice !== undefined && data.TotalPrice !== null && data.TotalPrice !== '') {
      finalTotalPrice = Number(data.TotalPrice);
    } else if (room) {
      const bookingType = data.BookingType || 'Daily';
      const checkInTime = data.CheckInTime || '14:00';
      const checkOutTime = data.CheckOutTime || '12:00';
      
      if (bookingType === 'Hourly') {
        const start = new Date(`${data.CheckInDate}T${checkInTime}`);
        const end = new Date(`${data.CheckOutDate}T${checkOutTime}`);
        const diffHours = Math.ceil((end - start) / (1000 * 60 * 60));
        if (diffHours > 0) {
          const baseHourly = Number(room.HourlyPrice || room.Price * 0.2);
          const extraHourly = Number(room.ExtraHourPrice || room.Price * 0.05);
          if (diffHours <= 2) {
            finalTotalPrice = baseHourly;
          } else {
            finalTotalPrice = baseHourly + (diffHours - 2) * extraHourly;
          }
        }
      } else if (bookingType === 'Overnight') {
        const start = new Date(`${data.CheckInDate}T${data.CheckInTime || '22:00'}`);
        const end = new Date(`${data.CheckOutDate}T${data.CheckOutTime || '10:00'}`);
        const diffTime = end - start;
        const nights = Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
        finalTotalPrice = nights * Number(room.OvernightPrice || room.Price * 0.7);
      } else {
        // Daily
        const start = new Date(data.CheckInDate);
        const end = new Date(data.CheckOutDate);
        const diffTime = end - start;
        const nights = Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
        
        finalTotalPrice = nights * Number(room.Price || 0);
        
        const extraHourly = Number(room.ExtraHourPrice || room.Price * 0.05);
        const inHour = parseInt(checkInTime.split(':')[0], 10);
        if (inHour < 14) {
          const earlyHours = 14 - inHour;
          if (earlyHours <= 4) {
            finalTotalPrice += earlyHours * extraHourly;
          } else {
            finalTotalPrice += Number(room.Price || 0);
          }
        }
        const outHour = parseInt(checkOutTime.split(':')[0], 10);
        if (outHour > 12) {
          const lateHours = outHour - 12;
          if (lateHours <= 4) {
            finalTotalPrice += lateHours * extraHourly;
          } else {
            finalTotalPrice += Number(room.Price || 0);
          }
        }
      }
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
      TotalPrice: finalTotalPrice,
      Status: data.Status || 'Pending',
      Notes: data.Notes || 'Booking from External API',
      GuestCount: Number(data.GuestCount) || 1,
      BookingSourceId: data.BookingSourceId ? Number(data.BookingSourceId) : null,
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
