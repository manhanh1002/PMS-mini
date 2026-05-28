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
    const startDate = searchParams.get('startDate'); // YYYY-MM-DD
    const endDate = searchParams.get('endDate'); // YYYY-MM-DD

    // Enforce branch limit for Staff
    if (user.role !== 'Admin') {
      branchId = user.branchId;
    }

    let list = await noco.getCashBook(branchId);

    // Apply date filters in JS for robustness
    if (startDate) {
      list = list.filter(item => {
        const itemDate = item.VoucherDate?.split('T')[0] || item.VoucherDate?.split(' ')[0];
        return itemDate >= startDate;
      });
    }
    if (endDate) {
      list = list.filter(item => {
        const itemDate = item.VoucherDate?.split('T')[0] || item.VoucherDate?.split(' ')[0];
        return itemDate <= endDate;
      });
    }

    return NextResponse.json(list);
  } catch (e) {
    console.error('Fetch cashbook error:', e);
    return NextResponse.json({ error: 'Lỗi tải sổ quỹ thu chi.' }, { status: 500 });
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
    if (!data.VoucherType || !data.Amount || !data.Category || !data.BranchId) {
      return NextResponse.json({ error: 'Thiếu thông tin bắt buộc (VoucherType, Amount, Category, BranchId).' }, { status: 400 });
    }

    // Force staff to log cash book only in their assigned branch
    if (user.role !== 'Admin' && Number(data.BranchId) !== Number(user.branchId)) {
      return NextResponse.json({ error: 'Bạn không được phép thêm phiếu thu chi cho chi nhánh khác.' }, { status: 403 });
    }

    const payload = {
      BranchId: Number(data.BranchId),
      VoucherType: data.VoucherType, // 'Receipt' or 'Payment'
      Amount: Math.abs(Number(data.Amount)),
      Category: data.Category,
      Notes: data.Notes || '',
      VoucherDate: new Date().toISOString(),
      HandlerName: user.fullName || user.username,
      BookingId: data.BookingId ? Number(data.BookingId) : null
    };

    const res = await noco.createCashBookEntry(payload);
    return NextResponse.json(res);
  } catch (e) {
    console.error('Create cashbook entry error:', e);
    return NextResponse.json({ error: 'Lỗi ghi nhận phiếu thu chi.' }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    const user = await getSessionUser(request);
    if (!user || user.role !== 'Admin') {
      return NextResponse.json({ error: 'Không có quyền truy cập.' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json({ error: 'Mã phiếu là bắt buộc.' }, { status: 400 });
    }

    const res = await noco.deleteCashBookEntry(id);
    return NextResponse.json(res);
  } catch (e) {
    console.error('Delete cashbook entry error:', e);
    return NextResponse.json({ error: 'Lỗi xóa phiếu thu chi.' }, { status: 500 });
  }
}
