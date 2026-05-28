with open('src/components/BookingModal.js', 'r') as f:
    content = f.read()

# Fix block 1
block1_old = """      setRoomCharge(loadedCharge);
      loadedInitialChargeRef.current = loadedCharge; // Store to compare against auto charge
      setIsCustomPrice(false); // Default to off, let useEffect turn it on if it mismatches auto charge
    } catch (e) {

      toast.error('Lỗi khi tải chi tiết đơn đặt phòng: ' + e.message);"""

block1_new = """      setRoomCharge(loadedCharge);
      loadedInitialChargeRef.current = loadedCharge; // Store to compare against auto charge
      setIsCustomPrice(false); // Default to off, let useEffect turn it on if it mismatches auto charge

      setStatus(data.Status);
      setNotes(data.Notes || '');
      setBookingSourceId(data.BookingSourceId ? String(data.BookingSourceId) : '');
      setBookingType(data.BookingType || 'Daily');
      setCheckInTime(data.CheckInTime || '14:00');
      setCheckOutTime(data.CheckOutTime || '12:00');
      setGuestCount(data.GuestCount ? Number(data.GuestCount) : 1);
      setPromoCode(data.PromoCode || '');
      if (data.PromoCode && data.DiscountAmount) {
        setAppliedPromo({ Code: data.PromoCode }); // Dummy for UI display
        setDiscountAmount(Number(data.DiscountAmount));
      } else {
        setAppliedPromo(null);
        setDiscountAmount(0);
      }
      setPayments(data.payments || []);
    } catch (e) {
      toast.error('Lỗi khi tải chi tiết đơn đặt phòng: ' + e.message);"""

if block1_old in content:
    content = content.replace(block1_old, block1_new)
    print("Fixed block 1")
else:
    print("Block 1 not found")

# Fix block 2
block2_old = """        toast.success('Áp dụng mã khuyến mãi thành công!');
        setAppliedPromo(data);
        
            const existingFree = servicesOrdered.find(s => s.Notes === 'Tặng kèm Voucher');"""

block2_new = """        toast.success('Áp dụng mã khuyến mãi thành công!');
        setAppliedPromo(data);
        
        let newDiscount = 0;
        let baseCharge = roomCharge;

        if (data.ApplyScope === 'RoomOnly') {
          newDiscount = data.Type === 'Percentage' ? baseCharge * (data.Value / 100) : data.Value;
        } else {
          newDiscount = data.Type === 'Percentage' ? grandTotal * (data.Value / 100) : data.Value;
        }

        if (data.MaxDiscount && newDiscount > data.MaxDiscount) {
          newDiscount = data.MaxDiscount;
        }

        setDiscountAmount(Math.round(newDiscount));
        
        // Auto-add free service if exists
        if (data.FreeServiceId && data.FreeServiceId !== 'none') {
          const serviceToFree = servicesCatalog.find(s => String(s.Id) === String(data.FreeServiceId));
          if (serviceToFree) {
            // Check if already has a free promo service to avoid duplicates if they re-apply
            const existingFree = servicesOrdered.find(s => s.Notes === 'Tặng kèm Voucher');"""

if block2_old in content:
    content = content.replace(block2_old, block2_new)
    print("Fixed block 2")
else:
    print("Block 2 not found")


# We also need to add getPromoWarning function!
# The multi_replace failed to add it!
# Wait, let's see if getPromoWarning exists.

if "const getPromoWarning" not in content:
    # insert before handleAddService
    func = """
  const getPromoWarning = (promo) => {
    if (promo.UsageLimit && promo.UsedCount >= promo.UsageLimit) return "Đã hết lượt sử dụng";
    
    if (promo.ValidFrom && new Date(promo.ValidFrom) > new Date()) return "Chưa đến thời gian áp dụng";
    
    const selectedRoom = rooms.find((r) => String(r.Id) === String(roomId));
    if (promo.RoomTypes && selectedRoom) {
      const allowed = promo.RoomTypes.split(',').map(s => s.trim());
      if (!allowed.includes(selectedRoom.RoomType)) return `Chỉ dành cho phòng: ${promo.RoomTypes}`;
    }

    if (promo.MinNights) {
      let nights = 1;
      if (checkInDate && checkOutDate) {
        const diffTime = new Date(checkOutDate) - new Date(checkInDate);
        nights = Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
      }
      if (nights < promo.MinNights) return `Cần đặt tối thiểu ${promo.MinNights} đêm`;
    }

    return null;
  };
"""
    content = content.replace("  const handleAddService =", func + "\n  const handleAddService =")
    print("Added getPromoWarning")

with open('src/components/BookingModal.js', 'w') as f:
    f.write(content)

