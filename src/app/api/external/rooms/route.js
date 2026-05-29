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

    // Query rooms and branches in parallel
    const [rooms, branches] = await Promise.all([
      noco.getRooms(branchId || null),
      noco.getBranches()
    ]);

    // Create a map of BranchId -> BranchName
    const branchMap = {};
    branches.forEach((b) => {
      branchMap[b.Id] = b.BranchName;
    });

    // Return a cleaned up version of the rooms for external use
    const cleanRooms = rooms.map((r) => ({
      Id: r.Id,
      BranchId: r.BranchId,
      BranchName: branchMap[r.BranchId] || '',
      RoomName: r.RoomName,
      RoomType: r.RoomType,
      Price: r.Price,
      HourlyPrice: r.HourlyPrice,
      ExtraHourPrice: r.ExtraHourPrice,
      OvernightPrice: r.OvernightPrice,
      MaxGuests: r.MaxGuests,
      Status: r.Status,
      CleanStatus: r.CleanStatus,
      Description: r.Notes || r.Description || '',
    }));

    return NextResponse.json(cleanRooms);
  } catch (e) {
    console.error('External API - Fetch rooms error:', e);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
