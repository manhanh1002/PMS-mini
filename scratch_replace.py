import re

with open('src/app/rooms/page.js', 'r') as f:
    text = f.read()

# Replace 'Giá phòng / đêm *' with 'Giá theo ngày (Daily) *'
text = text.replace('Giá phòng / đêm *', 'Giá cơ bản / ngày (Daily) *')
text = text.replace('Giá phòng / giờ', 'Giá phòng / giờ (Hourly)')
text = text.replace('Giá phòng / qua đêm', 'Giá qua đêm (Overnight)')

with open('src/app/rooms/page.js', 'w') as f:
    f.write(text)
