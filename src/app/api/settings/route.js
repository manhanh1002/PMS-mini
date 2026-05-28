import { noco } from '@/lib/nocodb';
import { verifyJWT } from '@/lib/auth';
import { NextResponse } from 'next/server';

async function getSessionUser(request) {
  const cookie = request.cookies.get('pms_session');
  if (!cookie) return null;
  return verifyJWT(cookie.value);
}

// GET is public - login page & guest lookup needs settings (logo, name, etc.)
export async function GET(request) {
  try {
    const settings = await noco.getSettings();
    return NextResponse.json(settings);
  } catch (e) {
    console.error('Fetch settings error:', e);
    return NextResponse.json({ error: 'Lỗi tải cấu hình hệ thống.' }, { status: 500 });
  }
}

// POST - update one or many settings (Admin only)
export async function POST(request) {
  try {
    const user = await getSessionUser(request);
    if (!user || user.role !== 'Admin') {
      return NextResponse.json({ error: 'Chỉ Admin mới được thay đổi cấu hình.' }, { status: 403 });
    }

    const data = await request.json();
    // data should be an object { key: value, ... } pairs
    const results = [];
    for (const [key, value] of Object.entries(data)) {
      const res = await noco.upsertSetting(key, value);
      results.push({ key, ok: true });
    }

    return NextResponse.json({ updated: results.length, results });
  } catch (e) {
    console.error('Update settings error:', e);
    return NextResponse.json({ error: 'Lỗi cập nhật cấu hình.' }, { status: 500 });
  }
}
