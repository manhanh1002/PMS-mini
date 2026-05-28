import re

with open('src/components/BookingModal.js', 'r') as f:
    text = f.read()

# 1. Remove the orphaned rest of the Mini Invoice from the left column.
# The orphaned part starts with: `{/* Services Charge */}`
# And ends with `</div>` right before `<div className="space-y-2">` (Ghi chú thêm)
orphaned_pattern = r'(\s*\{\/\* Services Charge \*\/\}.*?</div>)'
match = re.search(orphaned_pattern, text, flags=re.DOTALL)
if match:
    orphaned_text = match.group(1)
    text = text.replace(orphaned_text, '')

    # 2. Append the orphaned text to the Mini Invoice Block in the Right Column
    # The right column currently has:
    #                     </div>
    #                 <div className="flex justify-end gap-3 mt-4">
    # We want to insert it right before the gap-3 div.
    
    right_column_insert = r'(                      </div>\n                    </div>)(\n                <div className="flex justify-end gap-3 mt-4">)'
    text = re.sub(right_column_insert, r'\1' + orphaned_text + r'\2', text)

with open('src/components/BookingModal.js', 'w') as f:
    f.write(text)

