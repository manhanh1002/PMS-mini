import re

with open('src/components/BookingModal.js', 'r') as f:
    lines = f.readlines()

stack = []
for i, line in enumerate(lines):
    if '<form id="booking-form"' in line:
        stack.append(('form', i+1))
    
    # Simple count of <div> and </div>
    open_divs = len(re.findall(r'<div\b[^>]*>', line))
    # Check for self-closing divs, though rare
    self_closing = len(re.findall(r'<div\b[^>]*/>', line))
    open_divs -= self_closing
    
    close_divs = len(re.findall(r'</div>', line))
    
    for _ in range(open_divs):
        stack.append(('div', i+1))
        
    for _ in range(close_divs):
        if stack and stack[-1][0] == 'div':
            stack.pop()
        elif stack and stack[-1][0] == 'form':
            print(f"Error at line {i+1}: expected </form> but got </div>. Stack: {stack}")
            break
