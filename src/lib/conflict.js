/**
 * conflict.js — Room availability conflict checker
 *
 * Logic: CONFLICT when newIn < existingOut AND newOut > existingIn  (open interval)
 * Same-day checkout/checkin is ALLOWED: A out 28/5, B in 28/5 → OK
 * Extend block: A cannot extend checkout if it overlaps B's checkin range → CONFLICT
 */

/**
 * Check if a date range conflicts with existing bookings or room blocks for a room.
 *
 * @param {object} noco - nocodb instance
 * @param {number|string} roomId
 * @param {string} newIn  - "YYYY-MM-DD"
 * @param {string} newOut - "YYYY-MM-DD"
 * @param {number|string|null} excludeBookingId - exclude this booking ID when editing (avoid false positive)
 * @returns {Promise<{ conflict: boolean, message?: string }>}
 */
export async function checkRoomAvailability(noco, roomId, newIn, newOut, excludeBookingId = null) {
  const [bookings, blocks] = await Promise.all([
    noco.getBookingsByRoom(roomId),
    noco.getRoomBlocksByRoom(roomId),
  ]);

  // Check against existing bookings
  for (const b of bookings) {
    if (excludeBookingId && String(b.Id) === String(excludeBookingId)) continue;
    // Open interval: conflict only if newIn < existingOut AND newOut > existingIn
    if (newIn < b.CheckOutDate && newOut > b.CheckInDate) {
      return {
        conflict: true,
        message: `Phòng đã có đặt phòng từ ${b.CheckInDate} đến ${b.CheckOutDate} (Khách: ${b.CustomerName}). Vui lòng chọn ngày khác.`,
      };
    }
  }

  // Check against room blocks (maintenance, owner-use, etc.)
  for (const bl of blocks) {
    if (newIn < bl.EndDate && newOut > bl.StartDate) {
      return {
        conflict: true,
        message: `Phòng đang bị khóa/bảo trì từ ${bl.StartDate} đến ${bl.EndDate}. Không thể đặt phòng trong khoảng này.`,
      };
    }
  }

  return { conflict: false };
}

/**
 * Find a random available room of a specific RoomType in a branch for given dates.
 *
 * @param {object} noco - nocodb instance
 * @param {number|string} branchId
 * @param {string} roomType
 * @param {string} checkInDate - "YYYY-MM-DD"
 * @param {string} checkOutDate - "YYYY-MM-DD"
 * @returns {Promise<{ room?: object, error?: string }>}
 */
export async function findAvailableRoom(noco, branchId, roomType, checkInDate, checkOutDate) {
  const rooms = await noco.getRooms(branchId);
  
  // Filter rooms matching the requested RoomType and not in permanent maintenance
  const matchingRooms = rooms.filter(
    (r) =>
      r.RoomType &&
      r.RoomType.toLowerCase() === roomType.toLowerCase() &&
      r.Status !== 'Maintenance'
  );

  if (matchingRooms.length === 0) {
    return { error: `Không tìm thấy phòng nào thuộc loại "${roomType}" ở chi nhánh này.` };
  }

  // Shuffle rooms for random selection
  const shuffledRooms = [...matchingRooms].sort(() => Math.random() - 0.5);

  for (const room of shuffledRooms) {
    const availability = await checkRoomAvailability(noco, room.Id, checkInDate, checkOutDate);
    if (!availability.conflict) {
      return { room };
    }
  }

  return { error: `Hết phòng trống thuộc loại "${roomType}" trong khoảng thời gian từ ${checkInDate} đến ${checkOutDate}.` };
}

