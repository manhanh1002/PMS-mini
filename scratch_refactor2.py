import re

with open('src/components/BookingModal.js', 'r') as f:
    text = f.read()

# Replace the start of the Tabs
text = text.replace(
    '<Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">',
    '''{!bookingId ? (
                  <div className="flex flex-col items-center justify-center h-full text-center p-6 border border-dashed border-neutral-800 rounded-xl bg-neutral-950/30">
                    <p className="text-sm font-semibold text-neutral-300">Chưa thể thêm Dịch vụ / Thanh toán</p>
                    <p className="text-xs text-neutral-500 mt-1">Vui lòng "Lưu lại" thông tin bên trái để tạo đặt phòng trước.</p>
                  </div>
                ) : (
                  <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">'''
)

# Find the end of the Tabs
text = text.replace(
    '</Tabs>\n              </div>\n              {/* FIXED BOTTOM: Mini Invoice & Submit */}',
    '</Tabs>\n                )}\n              </div>\n              {/* FIXED BOTTOM: Mini Invoice & Submit */}'
)

with open('src/components/BookingModal.js', 'w') as f:
    f.write(text)

