import re

with open('src/components/BookingModal.js', 'r') as f:
    text = f.read()

# 1. Replace TabsList with Grid start
text = re.sub(
    r'<Tabs value=\{activeTab\} onValueChange=\{setActiveTab\} className="mt-4">.*?\{\/\* TAB 1: GENERAL INFO \*\/\}\s*<TabsContent value="general">',
    '''<div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mt-4 relative">
            {/* LEFT COLUMN: GENERAL INFO */}
            <div className="lg:col-span-7 flex flex-col gap-4 lg:border-r lg:border-neutral-800 lg:pr-6">''',
    text,
    flags=re.DOTALL
)

# 2. Add form ID
text = text.replace(
    '<form onSubmit={handleSaveGeneral} className="space-y-4">',
    '<form id="booking-form" onSubmit={handleSaveGeneral} className="space-y-4">'
)

# 3. Extract Mini Invoice Block
mini_invoice_pattern = r'({\s*/\*\s*Mini Invoice Block\s*\*/\s*}.*?</div>\s*</div>)'
match = re.search(mini_invoice_pattern, text, flags=re.DOTALL)
if match:
    mini_invoice_block = match.group(1)
    text = text.replace(mini_invoice_block, '')

# 4. Remove old Save Buttons
save_buttons_pattern = r'<div className="flex justify-end gap-3 pt-4 border-t border-neutral-800">.*?</div>'
match_save = re.search(save_buttons_pattern, text, flags=re.DOTALL)
if match_save:
    text = text.replace(match_save.group(0), '', 1)

# 5. End of Left column, start right column
text = text.replace(
    '</form>\n            </TabsContent>',
    '''</form>
            </div>

            {/* RIGHT COLUMN */}
            <div className="lg:col-span-5 flex flex-col h-[calc(85vh-150px)]">
              <div className="flex-1 overflow-y-auto pr-2">
                <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
                  <TabsList className="bg-neutral-950 border border-neutral-800 p-1 w-full flex overflow-x-auto justify-start mb-4">
                    <TabsTrigger value="general" className="hidden">General</TabsTrigger>
                    <TabsTrigger value="services" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                      <Utensils className="h-4 w-4 mr-1.5 hidden sm:inline" /> Dịch vụ
                    </TabsTrigger>
                    <TabsTrigger value="payments" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                      <CreditCard className="h-4 w-4 mr-1.5 hidden sm:inline" /> Thanh toán
                    </TabsTrigger>
                    <TabsTrigger value="invoice" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                      <Printer className="h-4 w-4 mr-1.5 hidden sm:inline" /> Hóa đơn
                    </TabsTrigger>
                  </TabsList>'''
)

# 6. End of Right Column (insert mini invoice)
text = text.replace(
    '</Tabs>\n        )}',
    '</Tabs>\n              </div>\n              {/* FIXED BOTTOM: Mini Invoice & Submit */}\n              <div className="mt-4 pt-4 border-t border-neutral-800">\n                ' + mini_invoice_block + '\n                <div className="flex justify-end gap-3 mt-4">\n                  <Button type="button" variant="outline" onClick={onClose} className="border-neutral-800 hover:bg-neutral-800 text-white">Hủy</Button>\n                  <Button type="submit" form="booking-form" className="bg-primary hover:bg-primary/90 text-primary-foreground" disabled={isSubmitting}>{isSubmitting ? "Đang lưu..." : "Lưu lại"}</Button>\n                </div>\n              </div>\n            </div>\n          </div>\n        )}'
)

with open('src/components/BookingModal.js', 'w') as f:
    f.write(text)

