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
      const rule = getApplicablePricingRule(checkInDate, settings);
      let adjustedHourlyPrice = hourlyPrice;
      let adjustedExtraHourPrice = extraHourPrice;

      const shouldApply = 
        (rule.isHoliday && rule.applyToHourly) ||
        (rule.isWeekend && rule.applyToHourly) ||
        (rule.isWeekday && rule.applyToHourly);

      if (shouldApply && rule.type !== 'None' && rule.value) {
        if (rule.type === 'Percentage') {
          if (rule.isHoliday || rule.isWeekend) {
            adjustedHourlyPrice += (hourlyPrice * rule.value) / 100;
            adjustedExtraHourPrice += (extraHourPrice * rule.value) / 100;
          } else if (rule.isWeekday) {
            adjustedHourlyPrice = Math.max(0, hourlyPrice - (hourlyPrice * rule.value) / 100);
            adjustedExtraHourPrice = Math.max(0, extraHourPrice - (extraHourPrice * rule.value) / 100);
          }
        } else if (rule.type === 'Fixed') {
          if (rule.isHoliday || rule.isWeekend) {
            adjustedHourlyPrice += rule.value;
          } else if (rule.isWeekday) {
            adjustedHourlyPrice = Math.max(0, adjustedHourlyPrice - rule.value);
          }
        }
      }

      if (diffHours <= 2) {
        baseCharge = adjustedHourlyPrice;
      } else {
        baseCharge = adjustedHourlyPrice + (diffHours - 2) * adjustedExtraHourPrice;
      }

      // Price Cap for Hourly bookings
      if (checkInDate !== checkOutDate) {
        // Capped at Overnight Price if booking spans across dates
        let overnightCap = overnightPrice;
        if (shouldApply && rule.type !== 'None' && rule.value) {
          if (rule.type === 'Percentage') {
            if (rule.isHoliday || rule.isWeekend) overnightCap += (overnightPrice * rule.value) / 100;
            else if (rule.isWeekday) overnightCap = Math.max(0, overnightCap - (overnightPrice * rule.value) / 100);
          } else if (rule.type === 'Fixed') {
            if (rule.isHoliday || rule.isWeekend) overnightCap += rule.value;
            else if (rule.isWeekday) overnightCap = Math.max(0, overnightCap - rule.value);
          }
        }
        baseCharge = Math.min(baseCharge, overnightCap);
      } else {
        // Capped at Daily Price if booking is within the same date
        const dailyCap = getAdjustedRoomPrice(price, checkInDate, settings);
        baseCharge = Math.min(baseCharge, dailyCap);
      }
    }
  } else if (bookingType === 'Overnight') {
    const start = new Date(`${checkInDate}T${checkInTime || overnightStart}`);
    const end = new Date(`${checkOutDate}T${checkOutTime || overnightEnd}`);
    const diffTime = end - start;
    const nights = Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
    
    // Base overnight charge with day-by-day weekday/weekend/holiday adjustment
    baseCharge = 0;
    for (let i = 0; i < nights; i++) {
      const currentDate = new Date(checkInDate);
      currentDate.setDate(currentDate.getDate() + i);
      const yyyy = currentDate.getFullYear();
      const mm = String(currentDate.getMonth() + 1).padStart(2, '0');
      const dd = String(currentDate.getDate()).padStart(2, '0');
      const dateStr = `${yyyy}-${mm}-${dd}`;

      const rule = getApplicablePricingRule(dateStr, settings);
      let adjustedOvernightPrice = overnightPrice;

      const shouldApply = 
        (rule.isHoliday && rule.applyToOvernight) ||
        (rule.isWeekend && rule.applyToOvernight) ||
        (rule.isWeekday && rule.applyToOvernight);

      if (shouldApply && rule.type !== 'None' && rule.value) {
        if (rule.type === 'Percentage') {
          if (rule.isHoliday || rule.isWeekend) {
            adjustedOvernightPrice += (overnightPrice * rule.value) / 100;
          } else if (rule.isWeekday) {
            adjustedOvernightPrice = Math.max(0, overnightPrice - (overnightPrice * rule.value) / 100);
          }
        } else if (rule.type === 'Fixed') {
          if (rule.isHoliday || rule.isWeekend) {
            adjustedOvernightPrice += rule.value;
          } else if (rule.isWeekday) {
            adjustedOvernightPrice = Math.max(0, overnightPrice - rule.value);
          }
        }
      }
      baseCharge += adjustedOvernightPrice;
    }

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
    let adjustedDailyCost = 0;
    for (let i = 0; i < nights; i++) {
      const currentDate = new Date(checkInDate);
      currentDate.setDate(currentDate.getDate() + i);
      const yyyy = currentDate.getFullYear();
      const mm = String(currentDate.getMonth() + 1).padStart(2, '0');
      const dd = String(currentDate.getDate()).padStart(2, '0');
      const dateStr = `${yyyy}-${mm}-${dd}`;
      adjustedDailyCost += getAdjustedRoomPrice(price, dateStr, settings);
    }

    if (baseCharge + extraCharge > adjustedDailyCost) {
      baseCharge = adjustedDailyCost;
    } else {
      baseCharge += extraCharge;
    }
  } else {
    // Daily standard pricing
    const start = new Date(checkInDate);
    const end = new Date(checkOutDate);
    const diffTime = end - start;
    const nights = Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
    
    baseCharge = 0;
    for (let i = 0; i < nights; i++) {
      const currentDate = new Date(start);
      currentDate.setDate(start.getDate() + i);
      const yyyy = currentDate.getFullYear();
      const mm = String(currentDate.getMonth() + 1).padStart(2, '0');
      const dd = String(currentDate.getDate()).padStart(2, '0');
      const dateStr = `${yyyy}-${mm}-${dd}`;

      baseCharge += getAdjustedRoomPrice(price, dateStr, settings);
    }

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

// Check rules: Holiday > Weekend > Weekday
export function getApplicablePricingRule(dateStr, settings = {}) {
  // 1. Holiday Check
  try {
    if (settings.HolidayPolicies) {
      const holidays = JSON.parse(settings.HolidayPolicies);
      if (Array.isArray(holidays)) {
        const currentDate = new Date(dateStr);
        currentDate.setHours(0, 0, 0, 0);

        for (const holiday of holidays) {
          if (holiday.fromDate && holiday.toDate) {
            const from = new Date(holiday.fromDate);
            from.setHours(0, 0, 0, 0);
            const to = new Date(holiday.toDate);
            to.setHours(23, 59, 59, 999);

            if (currentDate >= from && currentDate <= to) {
              return {
                type: holiday.type, // 'Percentage' | 'Fixed'
                value: Number(holiday.value || 0),
                isHoliday: true,
                applyToHourly: holiday.applyToHourly === 'true',
                applyToOvernight: holiday.applyToOvernight === 'true'
              };
            }
          }
        }
      }
    }
  } catch (e) {
    console.error('Error parsing HolidayPolicies in pricing:', e);
  }

  const date = new Date(dateStr);
  const dayOfWeek = String(date.getDay()); // '0' = Sunday, '1' = Monday, etc.

  // 2. Weekend Check
  const weekendDays = settings.WeekendDays ? settings.WeekendDays.split(',') : [];
  if (weekendDays.includes(dayOfWeek)) {
    return {
      type: settings.WeekendSurchargeType || 'None',
      value: Number(settings.WeekendSurchargeValue || 0),
      isWeekend: true,
      applyToHourly: settings.ApplyWeekendToHourly === 'true',
      applyToOvernight: settings.ApplyWeekendToOvernight === 'true'
    };
  }

  // 3. Weekday Check
  const weekdayDays = settings.WeekdayDays ? settings.WeekdayDays.split(',') : [];
  if (weekdayDays.includes(dayOfWeek)) {
    return {
      type: settings.WeekdayDiscountType || 'None',
      value: Number(settings.WeekdayDiscountValue || 0),
      isWeekday: true,
      applyToHourly: settings.ApplyWeekdayToHourly === 'true',
      applyToOvernight: settings.ApplyWeekdayToOvernight === 'true'
    };
  }

  return { type: 'None', value: 0 };
}

export function getAdjustedRoomPrice(basePrice, dateStr, settings) {
  const rule = getApplicablePricingRule(dateStr, settings);
  if (rule.type === 'None' || !rule.value) return basePrice;

  if (rule.type === 'Percentage') {
    if (rule.isHoliday || rule.isWeekend) {
      return basePrice + (basePrice * rule.value) / 100;
    } else if (rule.isWeekday) {
      return Math.max(0, basePrice - (basePrice * rule.value) / 100);
    }
  } else if (rule.type === 'Fixed') {
    if (rule.isHoliday || rule.isWeekend) {
      return basePrice + rule.value;
    } else if (rule.isWeekday) {
      return Math.max(0, basePrice - rule.value);
    }
  }
  return basePrice;
}
