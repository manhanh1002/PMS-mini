const fs = require('fs');
const file = '/Users/mac/Documents/Code-projects/PMS-smax/src/components/BookingModal.js';
let content = fs.readFileSync(file, 'utf8');

// Boundaries
const idxHandlePrint = content.indexOf('  const handlePrint = () => {');
const idxReturn = content.indexOf('  return (', idxHandlePrint);

const idxLeftCol = content.indexOf('{/* LEFT COLUMN: GENERAL INFO */}');
const idxFormStart = content.indexOf('<form id="booking-form"', idxLeftCol);
const idxFormEnd = content.indexOf('</form>', idxFormStart) + '</form>'.length;

const idxServicesStart = content.indexOf('{/* Add service form */}');
const idxServicesEnd = content.indexOf('</TabsContent>', idxServicesStart);

const idxPaymentsStart = content.indexOf('{/* Add payment form */}');
const idxPaymentsEnd = content.indexOf('</TabsContent>', idxPaymentsStart);

const idxInvoiceStart = content.indexOf('{/* Printable Area Wrapper */}');
const idxInvoiceEnd = content.indexOf('</TabsContent>', idxInvoiceStart);

const idxBottomStart = content.indexOf('{/* FIXED BOTTOM: Mini Invoice & Submit */}');
const idxBottomEnd = content.indexOf('</div>\n            </div>\n          </div>', idxBottomStart);

const idxStyle = content.indexOf('      <style jsx global>{');

if ([idxHandlePrint, idxReturn, idxLeftCol, idxFormStart, idxFormEnd, idxServicesStart, idxServicesEnd, idxPaymentsStart, idxPaymentsEnd, idxInvoiceStart, idxInvoiceEnd, idxBottomStart, idxBottomEnd, idxStyle].includes(-1)) {
  console.log('Error finding boundaries');
  process.exit(1);
}

// Extract pieces
const topPart = content.substring(0, idxReturn);
let formContent = content.substring(idxFormStart, idxFormEnd);
let servicesContent = content.substring(idxServicesStart, idxServicesEnd);
let paymentsContent = content.substring(idxPaymentsStart, idxPaymentsEnd);
let invoiceContent = content.substring(idxInvoiceStart, idxInvoiceEnd);
let bottomContent = content.substring(idxBottomStart, idxBottomEnd);
const styleContent = content.substring(idxStyle);

// Modify formContent to lock fields
formContent = formContent.replace(
  /<Select value={bookingType}/,
  '<Select value={bookingType} onValueChange={setBookingType} disabled={isSubmitting || isRoomLocked}>'
);
formContent = formContent.replace(
  /<Select value={String\(roomId\)}/,
  '<Select value={String(roomId)} onValueChange={setRoomId} disabled={isSubmitting || isRoomLocked}>'
);
// Modify Check-in Date
formContent = formContent.replace(
  /value={checkInDate}\s+onChange={\(e\) => setCheckInDate\(e.target.value\)}[\s\S]*?disabled={isSubmitting}/,
  (match) => match.replace('disabled={isSubmitting}', 'disabled={isSubmitting || isRoomLocked}')
);
// Modify Check-in Time
formContent = formContent.replace(
  /value={checkInTime}\s+onChange={\(e\) => setCheckInTime\(e.target.value\)}[\s\S]*?disabled={isSubmitting}/,
  (match) => match.replace('disabled={isSubmitting}', 'disabled={isSubmitting || isRoomLocked}')
);

// We keep Check-out open as requested

// Build new component end
const newReturn = `
  const isRoomLocked = status === 'CheckedIn' || status === 'CheckedOut' || status === 'Cancelled';

  const renderGeneralInfoTab = () => (
    <div className="flex flex-col gap-4">
      ${formContent}
    </div>
  );

  const renderServicesTab = () => (
    <div className="space-y-6">
      ${servicesContent}
    </div>
  );

  const renderPaymentsTab = () => (
    <div className="space-y-6">
      ${paymentsContent}
    </div>
  );

  const renderInvoiceTab = () => (
    <div className="space-y-6">
      ${invoiceContent}
    </div>
  );

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[1000px] xl:max-w-[1100px] w-[95vw] bg-neutral-900 border-neutral-800 text-white p-6 max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3 text-lg font-bold text-white">
            {bookingId ? \`Chi tiết đặt phòng #\${bookingId}\` : 'Tạo mới đơn đặt phòng'}
            {bookingId && getStatusBadge(status)}
          </DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="py-20 flex flex-col items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary mb-2" />
            <p className="text-xs text-neutral-400">Đang tải thông tin đặt phòng...</p>
          </div>
        ) : (
          <div className="flex flex-col flex-1 min-h-0 relative mt-4">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0">
              <TabsList className="bg-neutral-950 border border-neutral-800 p-1 w-full flex overflow-x-auto justify-start mb-4">
                <TabsTrigger value="general" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                  <FileText className="h-4 w-4 mr-1.5 hidden sm:inline" /> Thông tin chung
                </TabsTrigger>
                <TabsTrigger value="services" disabled={!bookingId} className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                  <Utensils className="h-4 w-4 mr-1.5 hidden sm:inline" /> Dịch vụ
                </TabsTrigger>
                <TabsTrigger value="payments" disabled={!bookingId} className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                  <CreditCard className="h-4 w-4 mr-1.5 hidden sm:inline" /> Thanh toán
                </TabsTrigger>
                <TabsTrigger value="invoice" disabled={!bookingId} className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                  <Printer className="h-4 w-4 mr-1.5 hidden sm:inline" /> Hóa đơn
                </TabsTrigger>
              </TabsList>

              <TabsContent value="general" className="flex-1 overflow-y-auto pr-2 outline-none">
                {renderGeneralInfoTab()}
              </TabsContent>
              <TabsContent value="services" className="flex-1 overflow-y-auto pr-2 outline-none">
                {!bookingId ? (
                  <div className="flex flex-col items-center justify-center h-full text-center p-6 border border-dashed border-neutral-800 rounded-xl bg-neutral-950/30">
                    <p className="text-sm font-semibold text-neutral-300">Chưa thể thêm Dịch vụ / Thanh toán</p>
                    <p className="text-xs text-neutral-500 mt-1">Vui lòng "Lưu lại" thông tin bên trái để tạo đặt phòng trước.</p>
                  </div>
                ) : renderServicesTab()}
              </TabsContent>
              <TabsContent value="payments" className="flex-1 overflow-y-auto pr-2 outline-none">
                {bookingId && renderPaymentsTab()}
              </TabsContent>
              <TabsContent value="invoice" className="flex-1 overflow-y-auto pr-2 outline-none">
                {bookingId && renderInvoiceTab()}
              </TabsContent>
            </Tabs>

            ${bottomContent}
          </div>
        )}
      </DialogContent>

${styleContent}`;

fs.writeFileSync(file, topPart + newReturn);
console.log('Successfully refactored BookingModal.js');
