with open('src/components/BookingModal.js', 'r') as f:
    content = f.read()

helpers = """
  const selectedPromoObj = promotions.find(p => p.Code === promoCode);

  const getEstimatedDiscountText = (promo) => {
    let base = promo.ApplyScope === 'RoomOnly' ? roomCharge : grandTotal;
    let disc = promo.Type === 'Percentage' ? base * (promo.Value / 100) : promo.Value;
    if (promo.MaxDiscount && disc > promo.MaxDiscount) disc = promo.MaxDiscount;
    return Math.round(disc).toLocaleString('vi-VN') + 'đ';
  };

  const getConditionsText = (promo) => {
    let conditions = [];
    if (promo.ApplyScope === 'RoomOnly') conditions.push('Chỉ áp dụng tiền phòng');
    else conditions.push('Áp dụng tổng hoá đơn');
    
    if (promo.MinNights) conditions.push(`Từ ${promo.MinNights} đêm`);
    if (promo.RoomTypes) conditions.push(`Phòng: ${promo.RoomTypes}`);
    if (promo.MaxDiscount) conditions.push(`Giảm tối đa ${Number(promo.MaxDiscount).toLocaleString('vi-VN')}đ`);
    if (promo.FreeServiceId && promo.FreeServiceId !== 'none') conditions.push(`Tặng kèm dịch vụ`);
    return conditions.join(' • ');
  };

  // Render logic continues below
"""

if "const selectedPromoObj =" not in content:
    content = content.replace("  return (\n    <Dialog", helpers + "  return (\n    <Dialog")


ui_block_old = """                          {appliedPromo && (
                            <div className="flex justify-between items-center text-xs text-emerald-400 bg-emerald-950/20 px-2 py-1.5 rounded border border-emerald-900/30 mt-2">"""

ui_block_new = """                          {!appliedPromo && promoCode && selectedPromoObj && (
                            <div className="text-xs text-neutral-300 bg-neutral-800/30 px-3 py-2 rounded-lg border border-neutral-800 mt-2 space-y-1.5">
                              <div className="flex justify-between items-center">
                                <span className="font-semibold text-primary">Dự kiến giảm:</span>
                                <span className="font-mono text-primary font-bold">-{getEstimatedDiscountText(selectedPromoObj)}</span>
                              </div>
                              <div className="text-[10px] text-neutral-400 leading-relaxed">
                                {getConditionsText(selectedPromoObj)}
                              </div>
                            </div>
                          )}
                          {appliedPromo && (
                            <div className="flex justify-between items-center text-xs text-emerald-400 bg-emerald-950/20 px-2 py-1.5 rounded border border-emerald-900/30 mt-2">"""

if ui_block_old in content:
    content = content.replace(ui_block_old, ui_block_new)
    print("Added UI block")

with open('src/components/BookingModal.js', 'w') as f:
    f.write(content)

