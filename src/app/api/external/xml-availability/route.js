import { noco } from '@/lib/nocodb';
import { checkRoomAvailability } from '@/lib/conflict';
import { NextResponse } from 'next/server';

// Helper to escape XML special characters
function escapeXml(unsafe) {
  if (!unsafe) return '';
  return String(unsafe).replace(/[<>&'"]/g, (c) => {
    switch (c) {
      case '<': return '&lt;';
      case '>': return '&gt;';
      case '&': return '&amp;';
      case '\'': return '&apos;';
      case '"': return '&quot;';
      default: return c;
    }
  });
}

// Helper to render XML error responses
function makeXmlError(status, message) {
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<RoomAvailabilityResponse>
  <Status>Error</Status>
  <Error>
    <Code>${status}</Code>
    <Message>${escapeXml(message)}</Message>
  </Error>
</RoomAvailabilityResponse>`;
  
  return new NextResponse(xml, {
    status,
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
    },
  });
}

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
      return makeXmlError(401, 'Missing API Key in header x-api-key or query parameter apiKey');
    }

    const settings = await noco.getSettings();
    const configuredKey = settings.ExternalApiKey;

    if (!configuredKey || apiKey !== configuredKey) {
      return makeXmlError(401, 'Invalid API Key');
    }

    // Validate parameters
    if (!branchId || !roomType || !checkIn || !checkOut) {
      return makeXmlError(400, 'Missing required query parameters: branchId, roomType, checkIn, checkOut');
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
        availableRooms.push(room);
      }
    }

    // Generate XML response list
    let roomsXml = '';
    for (const r of availableRooms) {
      roomsXml += `    <Room>
      <Id>${r.Id}</Id>
      <RoomName>${escapeXml(r.RoomName)}</RoomName>
      <Price>${r.Price || 0}</Price>
      <HourlyPrice>${r.HourlyPrice || 0}</HourlyPrice>
      <OvernightPrice>${r.OvernightPrice || 0}</OvernightPrice>
      <MaxGuests>${r.MaxGuests || 2}</MaxGuests>
    </Room>\n`;
    }

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<RoomAvailabilityResponse>
  <Status>Success</Status>
  <BranchId>${escapeXml(branchId)}</BranchId>
  <RoomType>${escapeXml(roomType.toUpperCase())}</RoomType>
  <CheckInDate>${escapeXml(checkIn)}</CheckInDate>
  <CheckOutDate>${escapeXml(checkOut)}</CheckOutDate>
  <TotalMatchingRooms>${matchingRooms.length}</TotalMatchingRooms>
  <AvailableRoomsCount>${availableRooms.length}</AvailableRoomsCount>
  <AvailableRooms>
${roomsXml}  </AvailableRooms>
</RoomAvailabilityResponse>`;

    return new NextResponse(xml, {
      status: 200,
      headers: {
        'Content-Type': 'application/xml; charset=utf-8',
      },
    });

  } catch (e) {
    console.error('XML Availability Check Error:', e);
    return makeXmlError(500, 'Internal Server Error: ' + e.message);
  }
}
