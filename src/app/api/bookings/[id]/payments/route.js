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

    const payments = await noco.getPayments(id);
    return NextResponse.json(payments);
  } catch (e) {
    console.error('Fetch booking payments error:', e);
    return NextResponse.json({ error: 'Lỗi tải lịch sử thanh toán.' }, { status: 500 });
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

    const data = await request.json(); // expect { Amount, PaymentMethod, PaymentType, Notes }
    if (!data.Amount || !data.PaymentMethod || !data.PaymentType) {
      return NextResponse.json({ error: 'Thiếu thông tin thanh toán.' }, { status: 400 });
    }

    const res = await noco.addPayment({
      BookingId: id,
      PaymentDate: new Date().toISOString(),
      Amount: Number(data.Amount),
      PaymentMethod: data.PaymentMethod,
      PaymentType: data.PaymentType,
      Notes: data.Notes || ''
    });

    // Sync with CashBook Ledger
    try {
      let category = 'RoomPayment';
      if (data.PaymentType === 'Surcharge') {
        category = 'ExtraService';
      } else if (data.PaymentType === 'Refund') {
        category = 'Refund';
      }

      const voucherType = data.PaymentType === 'Refund' ? 'Payment' : 'Receipt';

      await noco.createCashBookEntry({
        BranchId: Number(booking.BranchId),
        VoucherType: voucherType,
        Amount: Number(data.Amount),
        Category: category,
        VoucherDate: res.PaymentDate || new Date().toISOString(),
        HandlerName: user.fullName || user.username,
        Notes: `[PaymentId:${res.Id}] Khách hàng: ${booking.CustomerName} - Hình thức: ${data.PaymentMethod} - Loại: ${data.PaymentType} ${data.Notes ? `(${data.Notes})` : ''}`,
        BookingId: Number(id)
      });
    } catch (e) {
      console.error('Failed to sync payment to CashBook:', e);
    }

    return NextResponse.json(res);
  } catch (e) {
    console.error('Add payment error:', e);
    return NextResponse.json({ error: 'Lỗi ghi nhận thanh toán.' }, { status: 500 });
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
    const paymentId = searchParams.get('paymentId');
    if (!paymentId) {
      return NextResponse.json({ error: 'Mã thanh toán là bắt buộc.' }, { status: 400 });
    }

    // Sync with CashBook Ledger (delete corresponding voucher)
    try {
      const cashBookList = await noco.getCashBook(booking.BranchId);
      const match = cashBookList.find(entry => entry.Notes && entry.Notes.includes(`[PaymentId:${paymentId}]`));
      if (match) {
        await noco.deleteCashBookEntry(match.Id);
      }
    } catch (e) {
      console.error('Failed to delete sync entry in CashBook:', e);
    }

    const res = await noco.deletePayment(paymentId);
    return NextResponse.json(res);
  } catch (e) {
    console.error('Delete payment error:', e);
    return NextResponse.json({ error: 'Lỗi xóa lịch sử thanh toán.' }, { status: 500 });
  }
}
