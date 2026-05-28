import re

with open('src/app/rooms/page.js', 'r') as f:
    text = f.read()

# 1. Add newExtraHourPrice state
text = text.replace(
    "const [newHourlyPrice, setNewHourlyPrice] = useState('');",
    "const [newHourlyPrice, setNewHourlyPrice] = useState('');\n  const [newExtraHourPrice, setNewExtraHourPrice] = useState('');"
)

# 2. Reset newExtraHourPrice in useEffect
text = text.replace(
    "setNewHourlyPrice('');",
    "setNewHourlyPrice('');\n      setNewExtraHourPrice('');"
)

# 3. Handle currency parse in API call
text = text.replace(
    "Price: Number(newPrice),",
    "Price: Number(String(newPrice).replace(/\\./g, '')),"
)
text = text.replace(
    "HourlyPrice: newHourlyPrice ? Number(newHourlyPrice) : null,",
    "HourlyPrice: newHourlyPrice ? Number(String(newHourlyPrice).replace(/\\./g, '')) : null,\n          ExtraHourPrice: newExtraHourPrice ? Number(String(newExtraHourPrice).replace(/\\./g, '')) : null,"
)
text = text.replace(
    "OvernightPrice: newOvernightPrice ? Number(newOvernightPrice) : null,",
    "OvernightPrice: newOvernightPrice ? Number(String(newOvernightPrice).replace(/\\./g, '')) : null,"
)

# 4. Create helper format function right before return
text = text.replace(
    "return (",
    """const formatCurrencyInput = (setter) => (e) => {
    const rawValue = e.target.value.replace(/\\D/g, '');
    if (rawValue === '') {
      setter('');
    } else {
      setter(Number(rawValue).toLocaleString('vi-VN'));
    }
  };

  return ("""
)

# 5. Update the inputs
# newPrice
text = text.replace(
    '''type="number"
                        value={newPrice}
                        onChange={(e) => setNewPrice(e.target.value)}''',
    '''type="text"
                        value={newPrice}
                        onChange={formatCurrencyInput(setNewPrice)}'''
)
# newHourlyPrice
text = text.replace(
    '''type="number"
                        value={newHourlyPrice}
                        onChange={(e) => setNewHourlyPrice(e.target.value)}''',
    '''type="text"
                        value={newHourlyPrice}
                        onChange={formatCurrencyInput(setNewHourlyPrice)}'''
)
# newOvernightPrice
text = text.replace(
    '''type="number"
                        value={newOvernightPrice}
                        onChange={(e) => setNewOvernightPrice(e.target.value)}''',
    '''type="text"
                        value={newOvernightPrice}
                        onChange={formatCurrencyInput(setNewOvernightPrice)}'''
)

# 6. Add ExtraHourPrice input to the grid
# The grid has:
# <div className="grid grid-cols-2 gap-4">
# Hourly and Overnight. Let's make it grid-cols-3 and add ExtraHourPrice.
grid_target = """<div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs text-neutral-400 font-semibold">Giá phòng / giờ (Hourly)</label>
                      <Input
                        type="text"
                        value={newHourlyPrice}
                        onChange={formatCurrencyInput(setNewHourlyPrice)}
                        placeholder="Giá theo giờ"
                        className="bg-neutral-950/50 border-neutral-800 text-white text-xs font-mono"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs text-neutral-400 font-semibold">Giá qua đêm (Overnight)</label>
                      <Input
                        type="text"
                        value={newOvernightPrice}
                        onChange={formatCurrencyInput(setNewOvernightPrice)}
                        placeholder="Giá qua đêm"
                        className="bg-neutral-950/50 border-neutral-800 text-white text-xs font-mono"
                      />
                    </div>
                  </div>"""

new_grid = """<div className="grid grid-cols-3 gap-3">
                    <div className="space-y-1.5">
                      <label className="text-xs text-neutral-400 font-semibold truncate">Giá phòng / giờ</label>
                      <Input
                        type="text"
                        value={newHourlyPrice}
                        onChange={formatCurrencyInput(setNewHourlyPrice)}
                        placeholder="VND"
                        className="bg-neutral-950/50 border-neutral-800 text-white text-xs font-mono"
                      />
                    </div>
                    
                    <div className="space-y-1.5">
                      <label className="text-xs text-neutral-400 font-semibold truncate">Phụ thu thêm giờ</label>
                      <Input
                        type="text"
                        value={newExtraHourPrice}
                        onChange={formatCurrencyInput(setNewExtraHourPrice)}
                        placeholder="VND"
                        className="bg-neutral-950/50 border-neutral-800 text-white text-xs font-mono"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs text-neutral-400 font-semibold truncate">Giá qua đêm</label>
                      <Input
                        type="text"
                        value={newOvernightPrice}
                        onChange={formatCurrencyInput(setNewOvernightPrice)}
                        placeholder="VND"
                        className="bg-neutral-950/50 border-neutral-800 text-white text-xs font-mono"
                      />
                    </div>
                  </div>"""

text = text.replace(grid_target, new_grid)

with open('src/app/rooms/page.js', 'w') as f:
    f.write(text)

