with open('src/components/BookingModal.js', 'r') as f:
    content = f.read()

old_str = "if (promo.FreeServiceId && promo.FreeServiceId !== 'none') conditions.push(`Tặng kèm dịch vụ`);"
new_str = """if (promo.FreeServiceId && promo.FreeServiceId !== 'none') {
      const freeSvc = servicesCatalog.find(s => String(s.Id) === String(promo.FreeServiceId));
      conditions.push(freeSvc ? `Tặng ${freeSvc.ServiceName} (0đ)` : `Tặng kèm dịch vụ`);
    }"""

if old_str in content:
    content = content.replace(old_str, new_str)
    with open('src/components/BookingModal.js', 'w') as f:
        f.write(content)
    print("Patched successfully")
else:
    print("String not found")

