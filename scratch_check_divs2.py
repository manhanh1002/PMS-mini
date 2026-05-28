import re

with open('src/components/BookingModal.js', 'r') as f:
    lines = f.readlines()

stack = []
for i, line in enumerate(lines):
    if i < 450:
        continue
    if i > 675:
        break
    
    if '<form id="booking-form"' in line:
        stack.append(('form', i+1))
    
    open_divs = len(re.findall(r'<div\b[^>]*>', line))
    self_closing = len(re.findall(r'<div\b[^>]*/>', line))
    open_divs -= self_closing
    
    close_divs = len(re.findall(r'</div>', line))
    
    for _ in range(open_divs):
        stack.append(('div', i+1))
        
    for _ in range(close_divs):
        if stack and stack[-1][0] == 'div':
            stack.pop()
        else:
            print(f"Mismatch at line {i+1}: popped {stack[-1] if stack else 'empty'}")
            stack.pop()
            
    if close_divs > open_divs:
        print(f"Line {i+1}: -{close_divs - open_divs} divs. Stack size: {len(stack)}")
