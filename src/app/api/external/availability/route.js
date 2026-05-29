import { noco } from '@/lib/nocodb';
import { checkRoomAvailability } from '@/lib/conflict';
import { NextResponse } from 'next/server';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const branchId = searchParams.get('branchId');
    const roomType = searchParams.get('roomType');
    const checkIn = searchParams.get('checkIn');
    const checkOut = searchParams.get('checkOut');

    // Authenticate via x-api-key header or apiKey query parameter
    const apiKey = request.headers.get('x-api-key') || searchParams.get('apiKey');
    if (!apiKey) {
      return NextResponse.json(
        { success: false, error: 'Missing API Key in header x-api-key or query parameter apiKey' },
        { status: 401 }
      );
    }

    const settings = await noco.getSettings();
    const configuredKey = settings.ExternalApiKey;

    if (!configuredKey || apiKey !== configuredKey) {
      return NextResponse.json(
        { success: false, error: 'Invalid API Key' },
        { status: 401 }
      );
    }

    // Validate parameters
    if (!branchId || !roomType || !checkIn || !checkOut) {
      return NextResponse.json(
        { success: false, error: 'Missing required query parameters: branchId, roomType, checkIn, checkOut' },
        { status: 400 }
      );
    }

    // Query rooms for the specific branch
    const rooms = await noco.getRooms(branchId);
    
    // Filter rooms by roomType and active status (not in maintenance)
    const matchingRooms = rooms.filter(
      (r) =>
        r.RoomType &&
        r.RoomType.toLowerCase() === roomType.toLowerCase() &&
        r.Status !== 'Maintenance'
    );

    // Check availability for each room in the given dates
    const availableRooms = [];
    for (const room of matchingRooms) {
      const availability = await checkRoomAvailability(noco, room.Id, checkIn, checkOut);
      if (!availability.conflict) {
        availableRooms.push({
          Id: room.Id,
          RoomName: room.RoomName,
          Price: room.Price || 0,
          HourlyPrice: room.HourlyPrice || 0,
          OvernightPrice: room.OvernightPrice || 0,
          MaxGuests: room.MaxGuests || 2
        });
      }
    }

    // Return success response with availableRooms attribute containing all available rooms
    return NextResponse.json({
      success: true,
      branchId: Number(branchId) || branchId,
      roomType: roomType.toUpperCase(),
      checkIn,
      checkOut,
      availableRooms
    });

  } catch (e) {
    console.error('JSON Availability Check Error:', e);
    return NextResponse.json(
      { success: false, error: 'Internal Server Error: ' + e.message },
      { status: 500 }
    );
  }
}
