// Unified Pricing Engine for PMS Bookings

export function calculateRoomCharge({
  room,
  bookingType,
  checkInDate,
  checkInTime,
  checkOutDate,
  checkOutTime,
  settings = {},
}) {
  if (!room) return 0;

  const price = Number(room.Price || 0);
  const hourlyPrice = Number(room.HourlyPrice || price * 0.2);
  const extraHourPrice = Number(room.ExtraHourPrice || price * 0.05);
  const overnightPrice = Number(room.OvernightPrice || price * 0.7);

  const overnightStart = settings.OvernightStart || '21:00';
  const overnightEnd = settings.OvernightEnd || '10:00';

  let baseCharge = 0;

  if (bookingType === 'Hourly') {
    const start = new Date(`${checkInDate}T${checkInTime || '14:00'}`);
    const end = new Date(`${checkOutDate}T${checkOutTime || '12:00'}`);
    const diffHours = Math.ceil((end - start) / (1000 * 60 * 60));
    if (diffHours > 0) {
      if (diffHours <= 2) {
        baseCharge = hourlyPrice;
      } else {
        baseCharge = hourlyPrice + (diffHours - 2) * extraHourPrice;
      }

      // Price Cap for Hourly bookings
      if (checkInDate !== checkOutDate) {
        // Capped at Overnight Price if booking spans across dates
        baseCharge = Math.min(baseCharge, overnightPrice);
      } else {
        // Capped at Daily Price if booking is within the same date
        baseCharge = Math.min(baseCharge, price);
      }
    }
  } else if (bookingType === 'Overnight') {
    const start = new Date(`${checkInDate}T${checkInTime || overnightStart}`);
    const end = new Date(`${checkOutDate}T${checkOutTime || overnightEnd}`);
    const diffTime = end - start;
    const nights = Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
    
    // Base overnight charge
    baseCharge = nights * overnightPrice;

    // Overnight extra hours logic
    const startHourLimit = parseTimeToDecimal(overnightStart);
    const endHourLimit = parseTimeToDecimal(overnightEnd);
    const inHour = parseTimeToDecimal(checkInTime || overnightStart);
    const outHour = parseTimeToDecimal(checkOutTime || overnightEnd);

    let extraCharge = 0;

    // Early Check-in fee before OvernightStart
    if (inHour < startHourLimit) {
      const earlyHours = startHourLimit - inHour;
      extraCharge += earlyHours * extraHourPrice;
    }

    // Late Check-out fee after OvernightEnd
    if (outHour > endHourLimit) {
      const lateHours = outHour - endHourLimit;
      extraCharge += lateHours * extraHourPrice;
    }

    // Cap the extra charge so total price doesn't exceed standard daily price for those nights
    const dailyCost = nights * price;
    if (baseCharge + extraCharge > dailyCost) {
      baseCharge = dailyCost;
    } else {
      baseCharge += extraCharge;
    }
  } else {
    // Daily standard pricing
    const start = new Date(checkInDate);
    const end = new Date(checkOutDate);
    const diffTime = end - start;
    const nights = Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
    
    baseCharge = nights * price;

    // Early Check-in logic (Standard IN: 14:00)
    const inHour = parseTimeToDecimal(checkInTime || '14:00');
    if (inHour < 14) {
      const earlyHours = 14 - inHour;
      if (earlyHours <= 4) {
        baseCharge += earlyHours * extraHourPrice;
      } else {
        baseCharge += price;
      }
    }

    // Late Check-out logic (Standard OUT: 12:00)
    const outHour = parseTimeToDecimal(checkOutTime || '12:00');
    if (outHour > 12) {
      const lateHours = outHour - 12;
      if (lateHours <= 4) {
        baseCharge += lateHours * extraHourPrice;
      } else {
        baseCharge += price;
      }
    }
  }

  return baseCharge;
}

function parseTimeToDecimal(timeStr) {
  if (!timeStr) return 0;
  const parts = timeStr.split(':');
  const hours = parseInt(parts[0], 10) || 0;
  const minutes = parseInt(parts[1], 10) || 0;
  return hours + minutes / 60;
}
