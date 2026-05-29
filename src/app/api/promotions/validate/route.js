import { noco } from '@/lib/nocodb';
import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const data = await request.json();
    const { Code, RoomType, Nights, BookingType } = data;

    if (!Code) {
      return NextResponse.json({ error: 'Mã khuyến mãi là bắt buộc.' }, { status: 400 });
    }

    const promo = await noco.getPromotionByCode(Code);
    if (!promo) {
      return NextResponse.json({ error: 'Mã khuyến mãi không tồn tại.' }, { status: 404 });
    }

    if (promo.Status !== 'Active') {
      return NextResponse.json({ error: 'Mã khuyến mãi không còn hiệu lực.' }, { status: 400 });
    }

    const now = new Date();
    if (promo.ValidFrom && new Date(promo.ValidFrom) > now) {
      return NextResponse.json({ error: 'Mã khuyến mãi chưa đến ngày bắt đầu áp dụng.' }, { status: 400 });
    }
    
    // Add 1 day to ValidTo to include the entire end date (if it's just YYYY-MM-DD 00:00:00)
    if (promo.ValidTo) {
      const validToDate = new Date(promo.ValidTo);
      validToDate.setHours(23, 59, 59, 999);
      if (validToDate < now) {
        return NextResponse.json({ error: 'Mã khuyến mãi đã hết hạn.' }, { status: 400 });
      }
    }

    if (promo.UsageLimit && promo.UsageLimit > 0 && promo.UsedCount >= promo.UsageLimit) {
      return NextResponse.json({ error: 'Mã khuyến mãi đã hết lượt sử dụng.' }, { status: 400 });
    }

    // Validate BookingType
    if (BookingType) {
      const allowedBookingTypesStr = promo.BookingTypes || 'Daily';
      const allowedBookingTypes = allowedBookingTypesStr.split(',').map(t => t.trim().toLowerCase());
      if (!allowedBookingTypes.includes(BookingType.toLowerCase())) {
        let label = 'này';
        if (BookingType === 'Hourly') label = 'theo giờ (Hourly)';
        else if (BookingType === 'Overnight') label = 'qua đêm (Overnight)';
        else if (BookingType === 'Daily') label = 'theo ngày (Daily)';
        return NextResponse.json({ error: `Mã khuyến mãi không áp dụng cho hình thức đặt phòng ${label}.` }, { status: 400 });
      }
    }

    if (promo.MinNights && Nights < promo.MinNights) {
      return NextResponse.json({ error: `Cần lưu trú tối thiểu ${promo.MinNights} đêm để áp dụng mã này.` }, { status: 400 });
    }

    if (promo.RoomTypes && RoomType) {
      const allowedTypes = promo.RoomTypes.split(',').map(t => t.trim());
      if (!allowedTypes.includes(RoomType)) {
        return NextResponse.json({ error: 'Mã khuyến mãi không áp dụng cho loại phòng này.' }, { status: 400 });
      }
    }

    return NextResponse.json(promo);
  } catch (e) {
    console.error('Validate promotion error:', e);
    return NextResponse.json({ error: 'Lỗi kiểm tra mã khuyến mãi.' }, { status: 500 });
  }
}
