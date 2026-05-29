'use client';

import React, { useState, useEffect } from 'react';
import { useBranch } from '@/components/BranchContext';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Settings, Palette, ClockAlert, MessageSquareText,
  Info, Loader2, Save, CheckCircle2, RefreshCw, Hotel, Phone, MapPin,
  Building2, QrCode, AlarmClock, BrushCleaning, DoorOpen, Plus, Trash2, Users,
  Webhook, Copy, Eye, EyeOff, Code, GitBranch, Globe, Pencil, Tag, FileText
} from 'lucide-react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

// ─── Tab definitions ──────────────────────────────────────────────────────────
const SETTING_TABS = [
  { id: 'branding', label: 'Thương hiệu', icon: Palette },
  { id: 'hotel', label: 'Thông tin khách sạn', icon: Hotel },
  { id: 'branches', label: 'Quản lý chi nhánh', icon: GitBranch },
  { id: 'booking_sources', label: 'Nguồn đặt phòng', icon: Globe },
  { id: 'billing', label: 'Thanh toán & QR', icon: QrCode },
  { id: 'room_types', label: 'Loại phòng', icon: DoorOpen },
  { id: 'api_gateway', label: 'Cổng API', icon: Webhook },
  { id: 'templates', label: 'Mẫu tin nhắn', icon: MessageSquareText },
  { id: 'system', label: 'Hệ thống', icon: Info },
];

// ─── Default room types preset ───────────────────────────────────────────────
const DEFAULT_ROOM_TYPES = [
  { code: 'SGL', label: 'Single (Phòng đơn)', defaultMaxGuests: 1, description: '1 giường đơn' },
  { code: 'DBL', label: 'Double (Phòng đôi)', defaultMaxGuests: 2, description: '1 giường đôi lớn' },
  { code: 'TWN', label: 'Twin (Phòng 2 giường)', defaultMaxGuests: 2, description: '2 giường đơn riêng' },
  { code: 'TPL', label: 'Triple (Phòng 3 người)', defaultMaxGuests: 3, description: '3 người / giường phụ' },
  { code: 'FAM', label: 'Family (Phòng gia đình)', defaultMaxGuests: 4, description: '2 phòng ngủ hoặc giường phụ' },
  { code: 'STE', label: 'Suite (Phòng cao cấp)', defaultMaxGuests: 2, description: 'Phòng khách riêng, tiện nghi cao cấp' },
  { code: 'DLX', label: 'Deluxe (Phòng nâng cấp)', defaultMaxGuests: 2, description: 'View đẹp hoặc tiện nghi tốt hơn Standard' },
  { code: 'DORM', label: 'Dormitory (Phòng tập thể)', defaultMaxGuests: 8, description: 'Phòng tập thể / bunk bed' },
];

// ─── Reusable field group ─────────────────────────────────────────────────────
function FieldGroup({ children }) {
  return <div className="space-y-4">{children}</div>;
}

function Field({ label, hint, children }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {children}
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

// ─── Branding tab ─────────────────────────────────────────────────────────────
function BrandingTab({ settings, onChange }) {
  return (
    <FieldGroup>
      <Field label="Tên phần mềm / Thương hiệu" hint="Hiển thị trên header, footer và tab trình duyệt">
        <Input
          id="setting-SoftwareName"
          value={settings.SoftwareName || ''}
          onChange={(e) => onChange('SoftwareName', e.target.value)}
          placeholder="Smax PMS"
        />
      </Field>

      <Field label="URL Logo" hint="Dán URL hình ảnh logo (PNG/SVG, nền trong suốt, chiều cao ~40px). Để trống để dùng icon mặc định.">
        <Input
          id="setting-LogoUrl"
          value={settings.LogoUrl || ''}
          onChange={(e) => onChange('LogoUrl', e.target.value)}
          placeholder="https://example.com/logo.png"
        />
        {settings.LogoUrl && (
          <div className="mt-2 p-3 rounded-lg border border-border bg-muted/30 inline-flex items-center gap-3">
            <img src={settings.LogoUrl} alt="Logo preview" className="h-10 w-auto max-w-[180px] object-contain" />
            <span className="text-xs text-muted-foreground">Xem trước logo</span>
          </div>
        )}
      </Field>

      <Field label="URL Favicon" hint="URL ảnh favicon (ICO, PNG 32×32). Áp dụng khi tải lại trang.">
        <Input
          id="setting-FaviconUrl"
          value={settings.FaviconUrl || ''}
          onChange={(e) => onChange('FaviconUrl', e.target.value)}
          placeholder="https://example.com/favicon.ico"
        />
        {settings.FaviconUrl && (
          <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
            <img src={settings.FaviconUrl} alt="Favicon preview" className="h-5 w-5 object-contain" />
            Xem trước favicon
          </div>
        )}
      </Field>
    </FieldGroup>
  );
}

// ─── Hotel info tab ───────────────────────────────────────────────────────────
function HotelTab({ settings, onChange }) {
  return (
    <FieldGroup>
      <Field label="Tên khách sạn / Homestay">
        <div className="relative">
          <Hotel className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            id="setting-HotelName"
            className="pl-9"
            value={settings.HotelName || ''}
            onChange={(e) => onChange('HotelName', e.target.value)}
            placeholder="Tên cơ sở lưu trú"
          />
        </div>
      </Field>
      <Field label="Địa chỉ">
        <div className="relative">
          <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            id="setting-HotelAddress"
            className="pl-9"
            value={settings.HotelAddress || ''}
            onChange={(e) => onChange('HotelAddress', e.target.value)}
            placeholder="Số nhà, đường, phường, tỉnh/thành"
          />
        </div>
      </Field>
      <Field label="Số điện thoại liên hệ">
        <div className="relative">
          <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            id="setting-HotelPhone"
            className="pl-9"
            value={settings.HotelPhone || ''}
            onChange={(e) => onChange('HotelPhone', e.target.value)}
            placeholder="0901 234 567"
          />
        </div>
      </Field>
    </FieldGroup>
  );
}

// ─── Billing / QR tab ─────────────────────────────────────────────────────────
function BillingTab({ settings, onChange }) {
  const bank = settings.BankName || '';
  const acc = settings.BankAccountNumber || '';
  const name = settings.BankAccountName || '';
  const qrUrl = bank && acc
    ? `https://img.vietqr.io/image/${bank}-${acc}-compact2.png?addInfo=Thanh+toan+dich+vu&accountName=${encodeURIComponent(name)}`
    : null;

  return (
    <FieldGroup>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="Tên ngân hàng (mã BIN)" hint="VD: vietcombank, tpbank, mbbank...">
          <div className="relative">
            <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              id="setting-BankName"
              className="pl-9"
              value={bank}
              onChange={(e) => onChange('BankName', e.target.value)}
              placeholder="tpbank"
            />
          </div>
        </Field>
        <Field label="Số tài khoản">
          <Input
            id="setting-BankAccountNumber"
            value={acc}
            onChange={(e) => onChange('BankAccountNumber', e.target.value)}
            placeholder="0123456789"
          />
        </Field>
      </div>
      <Field label="Tên chủ tài khoản">
        <Input
          id="setting-BankAccountName"
          value={name}
          onChange={(e) => onChange('BankAccountName', e.target.value)}
          placeholder="NGUYEN VAN A"
        />
      </Field>

      {qrUrl && (
        <div className="p-4 rounded-xl border border-border bg-muted/20 flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <img src={qrUrl} alt="VietQR Preview" className="h-32 w-32 rounded-lg border border-border" />
          <div className="text-sm space-y-1">
            <p className="font-semibold text-foreground">Xem trước mã QR thanh toán</p>
            <p className="text-muted-foreground">Ngân hàng: <span className="font-medium text-foreground uppercase">{bank}</span></p>
            <p className="text-muted-foreground">STK: <span className="font-medium text-foreground">{acc}</span></p>
            <p className="text-muted-foreground">Tên TK: <span className="font-medium text-foreground">{name}</span></p>
            <p className="text-xs text-amber-500 mt-1">Powered by VietQR.io</p>
          </div>
        </div>
      )}
    </FieldGroup>
  );
}


// ─── Message templates tab ────────────────────────────────────────────────────
const TEMPLATE_VARS = '{GuestName} {HotelName} {RoomName} {CheckInDate} {CheckOutDate} {TotalAmount} {PaidAmount} {RemainingAmount} {BookingId} {BankAccountNumber} {BankName}';

function TemplatesTab({ settings, onChange }) {
  return (
    <FieldGroup>
      <div className="p-3 rounded-lg bg-muted/30 border border-border text-xs text-muted-foreground">
        <span className="font-medium text-foreground">Biến có thể dùng:</span>{' '}
        {TEMPLATE_VARS.split(' ').map((v) => (
          <code key={v} className="mx-0.5 px-1 py-0.5 rounded bg-muted text-primary font-mono text-[11px]">{v}</code>
        ))}
      </div>

      <Field label="Tin nhắn check-in" hint="Gửi cho khách khi nhận phòng">
        <Textarea
          id="setting-TemplateCheckIn"
          rows={4}
          value={settings.TemplateCheckIn || ''}
          onChange={(e) => onChange('TemplateCheckIn', e.target.value)}
          className="font-mono text-sm resize-y"
        />
      </Field>

      <Field label="Tin nhắn check-out / thanh toán" hint="Gửi hóa đơn khi trả phòng">
        <Textarea
          id="setting-TemplateCheckOut"
          rows={6}
          value={settings.TemplateCheckOut || ''}
          onChange={(e) => onChange('TemplateCheckOut', e.target.value)}
          className="font-mono text-sm resize-y"
        />
      </Field>

      <Field label="Tin nhắn nhắc thanh toán">
        <Textarea
          id="setting-TemplatePayment"
          rows={5}
          value={settings.TemplatePayment || ''}
          onChange={(e) => onChange('TemplatePayment', e.target.value)}
          className="font-mono text-sm resize-y"
        />
      </Field>
    </FieldGroup>
  );
}

// ─── Room Types tab ───────────────────────────────────────────────────────────
function RoomTypesTab({ settings, onChange }) {
  // Parse RoomTypes from settings JSON, fallback to defaults
  const getRoomTypes = () => {
    try {
      if (settings.RoomTypes) {
        const parsed = JSON.parse(settings.RoomTypes);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) { /* ignore */ }
    return [];
  };

  const roomTypes = getRoomTypes();

  // New row state
  const [newCode, setNewCode] = React.useState('');
  const [newLabel, setNewLabel] = React.useState('');
  const [newMaxGuests, setNewMaxGuests] = React.useState(2);
  const [newDescription, setNewDescription] = React.useState('');

  const updateTypes = (updatedList) => {
    onChange('RoomTypes', JSON.stringify(updatedList));
  };

  const handleAdd = (e) => {
    e.preventDefault();
    if (!newCode.trim() || !newLabel.trim()) return;
    // Prevent duplicate codes
    if (roomTypes.some(rt => rt.code.toUpperCase() === newCode.trim().toUpperCase())) {
      alert('Mã loại phòng đã tồn tại!');
      return;
    }
    const updated = [
      ...roomTypes,
      {
        code: newCode.trim().toUpperCase(),
        label: newLabel.trim(),
        defaultMaxGuests: Number(newMaxGuests) || 2,
        description: newDescription.trim(),
      },
    ];
    updateTypes(updated);
    setNewCode('');
    setNewLabel('');
    setNewMaxGuests(2);
    setNewDescription('');
  };

  const handleDelete = (code) => {
    updateTypes(roomTypes.filter((rt) => rt.code !== code));
  };

  const handleLoadPreset = () => {
    if (roomTypes.length > 0 && !confirm('Việc tải preset sẽ GỘP với danh sách hiện tại (bỏ qua trùng mã). Tiếp tục?')) return;
    const existing = new Set(roomTypes.map(rt => rt.code));
    const toAdd = DEFAULT_ROOM_TYPES.filter(rt => !existing.has(rt.code));
    updateTypes([...roomTypes, ...toAdd]);
  };

  return (
    <div className="space-y-6">
      {/* Header info */}
      <div className="p-3 rounded-lg bg-muted/30 border border-border text-xs text-muted-foreground">
        <span className="font-semibold text-foreground">Loại phòng</span> được dùng trong form tạo phòng và hiển thị trên card phòng.
        Mỗi loại có <code className="px-1 py-0.5 rounded bg-muted text-primary font-mono text-[11px]">Sức chứa mặc định</code> — được tự động điền khi tạo phòng mới.
      </div>

      {/* Load preset button */}
      {roomTypes.length === 0 && (
        <div className="flex flex-col items-center gap-3 py-6 border border-dashed border-border rounded-xl text-center">
          <DoorOpen className="h-8 w-8 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Chưa có loại phòng nào. Tải danh mục mặc định hoặc tự thêm.</p>
          <button
            type="button"
            onClick={handleLoadPreset}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary/10 text-primary border border-primary/20 text-sm font-medium hover:bg-primary/20 transition-colors"
          >
            <Plus className="h-4 w-4" />
            Tải 8 loại phòng phổ biến
          </button>
        </div>
      )}

      {/* Existing room types table */}
      {roomTypes.length > 0 && (
        <div className="border border-border rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr className="border-b border-border">
                <th className="text-left px-3 py-2.5 text-xs font-semibold text-muted-foreground">Mã</th>
                <th className="text-left px-3 py-2.5 text-xs font-semibold text-muted-foreground">Tên hiển thị</th>
                <th className="text-center px-3 py-2.5 text-xs font-semibold text-muted-foreground">SC tối đa</th>
                <th className="text-left px-3 py-2.5 text-xs font-semibold text-muted-foreground hidden sm:table-cell">Mô tả</th>
                <th className="w-10"></th>
              </tr>
            </thead>
            <tbody>
              {roomTypes.map((rt, idx) => (
                <tr key={rt.code} className={`border-b border-border last:border-0 ${idx % 2 === 0 ? '' : 'bg-muted/20'}`}>
                  <td className="px-3 py-2">
                    <span className="px-2 py-0.5 rounded text-[11px] font-mono bg-primary/10 text-primary border border-primary/20">
                      {rt.code}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-sm font-medium text-foreground">{rt.label}</td>
                  <td className="px-3 py-2 text-center">
                    <span className="inline-flex items-center gap-1 text-xs text-muted-foreground font-mono">
                      <Users className="h-3 w-3" />{rt.defaultMaxGuests}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-xs text-muted-foreground hidden sm:table-cell">{rt.description || '—'}</td>
                  <td className="px-3 py-2">
                    <button
                      type="button"
                      onClick={() => handleDelete(rt.code)}
                      className="h-7 w-7 flex items-center justify-center rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                      title="Xóa loại phòng"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add new row form */}
      <form onSubmit={handleAdd} className="space-y-3 p-4 rounded-xl border border-border bg-muted/20">
        <p className="text-xs font-semibold text-foreground">Thêm loại phòng mới</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Mã *</label>
            <input
              value={newCode}
              onChange={(e) => setNewCode(e.target.value.toUpperCase())}
              placeholder="VD: STE"
              maxLength={8}
              required
              className="w-full px-3 py-2 text-xs rounded-md border border-border bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary font-mono uppercase"
            />
          </div>
          <div className="space-y-1 sm:col-span-2">
            <label className="text-xs text-muted-foreground">Tên hiển thị *</label>
            <input
              value={newLabel}
              onChange={(e) => setNewLabel(e.target.value)}
              placeholder="VD: Suite (Phòng cao cấp)"
              required
              className="w-full px-3 py-2 text-xs rounded-md border border-border bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Sức chứa TĐ</label>
            <input
              type="number"
              min={1}
              max={50}
              value={newMaxGuests}
              onChange={(e) => setNewMaxGuests(Number(e.target.value))}
              className="w-full px-3 py-2 text-xs rounded-md border border-border bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary font-mono"
            />
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
          <div className="space-y-1 sm:col-span-2">
            <label className="text-xs text-muted-foreground">Mô tả (tùy chọn)</label>
            <input
              value={newDescription}
              onChange={(e) => setNewDescription(e.target.value)}
              placeholder="VD: Phòng có phòng khách riêng"
              className="w-full px-3 py-2 text-xs rounded-md border border-border bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
          <div className="flex gap-2">
            <button
              type="submit"
              className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-colors"
            >
              <Plus className="h-3.5 w-3.5" />
              Thêm
            </button>
            {roomTypes.length > 0 && (
              <button
                type="button"
                onClick={handleLoadPreset}
                className="px-3 py-2 rounded-lg border border-border text-xs text-muted-foreground hover:text-foreground hover:bg-muted transition-colors whitespace-nowrap"
                title="Gộp thêm các loại phòng phổ biến còn thiếu"
              >
                + Preset
              </button>
            )}
          </div>
        </div>
      </form>
    </div>
  );
}

// ─── API Gateway tab ──────────────────────────────────────────────────────────
function ApiGatewayTab({ settings, onChange }) {
  const [showKey, setShowKey] = useState(false);
  const apiKey = settings.ExternalApiKey || '';

  const generateKey = () => {
    if (apiKey && !confirm('CẢNH BÁO: Đổi Key sẽ làm các kết nối API hiện tại bị lỗi (OTA, Website...). Bạn có chắc chắn muốn tạo mới?')) return;
    const newKey = 'pms_' + crypto.randomUUID().replace(/-/g, '') + Math.random().toString(36).substring(2, 10);
    onChange('ExternalApiKey', newKey);
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    toast.success('Đã copy!');
  };

  return (
    <div className="space-y-6">
      {/* API Key Manager */}
      <div className="p-4 rounded-xl border border-border bg-card">
        <h3 className="text-sm font-semibold mb-2 flex items-center gap-2"><Webhook className="h-4 w-4" /> API Authentication Key</h3>
        <p className="text-xs text-muted-foreground mb-4">Sử dụng API Key này truyền vào Header <code>x-api-key</code> để xác thực khi gọi các API từ hệ thống bên thứ 3 (Website, OTA).</p>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Input 
              type={showKey ? 'text' : 'password'} 
              value={apiKey} 
              readOnly 
              placeholder="Chưa có API Key. Hãy tạo mới để bắt đầu sử dụng." 
              className="pr-10 bg-muted/50 font-mono text-sm"
            />
            {apiKey && (
              <button type="button" onClick={() => setShowKey(!showKey)} className="absolute right-3 top-2.5 text-muted-foreground hover:text-foreground">
                {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            )}
          </div>
          {apiKey && (
            <Button type="button" variant="outline" onClick={() => copyToClipboard(apiKey)} title="Copy Key">
              <Copy className="h-4 w-4" />
            </Button>
          )}
          <Button type="button" onClick={generateKey} variant={apiKey ? "outline" : "default"} className={apiKey ? "border-destructive/30 text-destructive hover:bg-destructive/10" : ""}>
            {apiKey ? 'Tạo lại Key' : 'Tạo Key mới'}
          </Button>
        </div>
      </div>

      {/* Documentation */}
      <div className="space-y-4">
        <h3 className="text-sm font-semibold border-b border-border pb-2 flex items-center gap-2"><Code className="h-4 w-4" /> API Endpoints Documentation</h3>
        
        {/* GET Rooms Endpoint */}
        <div className="p-4 rounded-xl border border-border bg-muted/10 space-y-3">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-500/20 text-blue-500">GET</span>
            <code className="text-xs font-mono font-semibold">/api/external/rooms</code>
          </div>
          <p className="text-xs text-muted-foreground">Lấy danh sách tất cả các phòng kèm thông tin sức chứa và giá. Có thể lọc theo <code>branchId</code>. AI bên ngoài gọi API này để lấy danh sách phòng, kết hợp với booking để tính phòng trống.</p>
          <div className="relative group">
            <pre className="bg-background p-3 rounded-lg text-[11px] font-mono text-foreground overflow-x-auto">
{`curl -X GET "https://<your-domain>/api/external/rooms?branchId=1" \\
  -H "x-api-key: ${apiKey || 'YOUR_API_KEY'}"`}
            </pre>
            <button onClick={() => copyToClipboard(`curl -X GET "https://<your-domain>/api/external/rooms?branchId=1" -H "x-api-key: ${apiKey || 'YOUR_API_KEY'}"`)} className="absolute top-2 right-2 p-1.5 rounded bg-muted text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity hover:text-foreground">
              <Copy className="h-3 w-3" />
            </button>
          </div>
        </div>

        {/* GET Endpoint */}
        <div className="p-4 rounded-xl border border-border bg-muted/10 space-y-3">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-500/20 text-blue-500">GET</span>
            <code className="text-xs font-mono font-semibold">/api/external/bookings</code>
          </div>
          <p className="text-xs text-muted-foreground">Lấy danh sách booking. Có thể lọc theo <code>branchId</code>, <code>dateFrom</code>, <code>dateTo</code> qua query params.</p>
          <div className="relative group">
            <pre className="bg-background p-3 rounded-lg text-[11px] font-mono text-foreground overflow-x-auto">
{`curl -X GET "https://<your-domain>/api/external/bookings?branchId=1" \\
  -H "x-api-key: ${apiKey || 'YOUR_API_KEY'}"`}
            </pre>
            <button onClick={() => copyToClipboard(`curl -X GET "https://<your-domain>/api/external/bookings?branchId=1" -H "x-api-key: ${apiKey || 'YOUR_API_KEY'}"`)} className="absolute top-2 right-2 p-1.5 rounded bg-muted text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity hover:text-foreground">
              <Copy className="h-3 w-3" />
            </button>
          </div>
        </div>

        {/* GET XML Availability Endpoint */}
        <div className="p-4 rounded-xl border border-border bg-muted/10 space-y-3">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-500/20 text-blue-500">GET</span>
            <code className="text-xs font-mono font-semibold">/api/external/xml-availability</code>
          </div>
          <p className="text-xs text-muted-foreground">Lấy danh sách các phòng còn trống dưới dạng XML cho một chi nhánh, loại phòng và khung thời gian cụ thể. Hỗ trợ xác thực qua Header <code>x-api-key</code> hoặc tham số <code>apiKey</code> trên URL (thuận tiện cho việc hiển thị dạng trang liên kết trên trình duyệt).</p>
          <div className="relative group">
            <pre className="bg-background p-3 rounded-lg text-[11px] font-mono text-foreground overflow-x-auto">
{`curl -X GET "https://<your-domain>/api/external/xml-availability?branchId=1&roomType=DELUXE&checkIn=2026-06-01&checkOut=2026-06-03" \\
  -H "x-api-key: ${apiKey || 'YOUR_API_KEY'}"

# Hoặc mở trực tiếp trên trình duyệt bằng link:
https://<your-domain>/api/external/xml-availability?branchId=1&roomType=DELUXE&checkIn=2026-06-01&checkOut=2026-06-03&apiKey=${apiKey || 'YOUR_API_KEY'}`}
            </pre>
            <button onClick={() => copyToClipboard(`https://<your-domain>/api/external/xml-availability?branchId=1&roomType=DELUXE&checkIn=2026-06-01&checkOut=2026-06-03&apiKey=${apiKey || 'YOUR_API_KEY'}`)} className="absolute top-2 right-2 p-1.5 rounded bg-muted text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity hover:text-foreground" title="Copy Link trình duyệt">
              <Copy className="h-3 w-3" />
            </button>
          </div>
        </div>

        {/* POST Endpoint */}
        <div className="p-4 rounded-xl border border-border bg-muted/10 space-y-3">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-green-500/20 text-green-500">POST</span>
            <code className="text-xs font-mono font-semibold">/api/external/bookings</code>
          </div>
          <p className="text-xs text-muted-foreground">Tạo một đặt phòng mới từ bên ngoài. Yêu cầu truyền Payload dạng JSON.</p>
          <div className="relative group">
            <pre className="bg-background p-3 rounded-lg text-[11px] font-mono text-foreground overflow-x-auto">
{`curl -X POST "https://<your-domain>/api/external/bookings" \\
  -H "Content-Type: application/json" \\
  -H "x-api-key: ${apiKey || 'YOUR_API_KEY'}" \\
  -d '{
    "RoomId": 12,
    "BranchId": 1,
    "CustomerName": "Nguyen Van A",
    "CustomerPhone": "0901234567",
    "BookingType": "Daily",
    "CheckInDate": "2024-12-01",
    "CheckInTime": "14:00",
    "CheckOutDate": "2024-12-03",
    "CheckOutTime": "12:00",
    "GuestCount": 2,
    "BookingSourceId": 2,
    "PromoCode": "SUMMER2024",
    "DiscountAmount": 100000,
    "TotalPrice": 1400000,
    "Status": "Confirmed",
    "Notes": "Booking from OTA"
  }'`}
            </pre>
            <button onClick={() => copyToClipboard(`curl -X POST "https://<your-domain>/api/external/bookings" -H "Content-Type: application/json" -H "x-api-key: ${apiKey || 'YOUR_API_KEY'}" -d '{"RoomId":12,"BranchId":1,"CustomerName":"Nguyen Van A","BookingType":"Daily","CheckInDate":"2024-12-01","CheckInTime":"14:00","CheckOutDate":"2024-12-03","CheckOutTime":"12:00","GuestCount":2,"BookingSourceId":2,"PromoCode":"SUMMER2024","DiscountAmount":100000,"TotalPrice":1400000,"Status":"Confirmed"}'`)} className="absolute top-2 right-2 p-1.5 rounded bg-muted text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity hover:text-foreground">
              <Copy className="h-3 w-3" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── System diagnostics tab ───────────────────────────────────────────────────
function SystemTab() {
  const [dbStatus, setDbStatus] = useState(null);
  const [checking, setChecking] = useState(false);

  const checkDB = async () => {
    setChecking(true);
    try {
      const start = Date.now();
      const res = await fetch('/api/branches');
      const ms = Date.now() - start;
      setDbStatus({ ok: res.ok, ms, status: res.status });
    } catch (e) {
      setDbStatus({ ok: false, ms: 0, error: e.message });
    } finally {
      setChecking(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card className="bg-card/60 border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Info className="h-4 w-4 text-primary" />Thông tin phiên bản
          </CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
            <dt className="text-muted-foreground">Phần mềm</dt><dd className="font-medium">Smax PMS</dd>
            <dt className="text-muted-foreground">Backend</dt><dd className="font-medium">NocoDB (Self-hosted)</dd>
            <dt className="text-muted-foreground">Framework</dt><dd className="font-medium">Next.js 15 (App Router)</dd>
            <dt className="text-muted-foreground">Môi trường</dt><dd className="font-medium capitalize">{process.env.NODE_ENV || 'production'}</dd>
          </dl>
        </CardContent>
      </Card>

      <Card className="bg-card/60 border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <RefreshCw className="h-4 w-4 text-primary" />Kiểm tra kết nối NocoDB
          </CardTitle>
          <CardDescription className="text-muted-foreground text-xs">
            Kiểm tra kết nối tới cơ sở dữ liệu NocoDB
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button onClick={checkDB} disabled={checking} variant="outline" className="gap-2 border-border">
            {checking ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            Kiểm tra ngay
          </Button>
          {dbStatus && (
            <div className={`flex items-center gap-2 text-sm font-medium ${dbStatus.ok ? 'text-emerald-500' : 'text-destructive'}`}>
              <div className={`h-2 w-2 rounded-full ${dbStatus.ok ? 'bg-emerald-500' : 'bg-destructive'}`} />
              {dbStatus.ok
                ? `✅ Kết nối thành công (${dbStatus.ms}ms)`
                : `❌ Kết nối thất bại — ${dbStatus.error || `HTTP ${dbStatus.status}`}`
              }
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Branches Tab ────────────────────────────────────────────────────────────
function BranchesTab() {
  const { user, branches, refreshBranches } = useBranch();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  // Form states
  const [editingId, setEditingId] = useState(null);
  const [branchName, setBranchName] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchBranchesData = async () => {
    setIsRefreshing(true);
    try {
      await refreshBranches();
    } catch (e) {
      console.error('Failed to load branches:', e);
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleOpenCreate = () => {
    setEditingId(null);
    setBranchName('');
    setAddress('');
    setPhone('');
    setNotes('');
    setIsDialogOpen(true);
  };

  const handleOpenEdit = (item) => {
    setEditingId(item.Id);
    setBranchName(item.BranchName);
    setAddress(item.Address || '');
    setPhone(item.Phone || '');
    setNotes(item.Notes || '');
    setIsDialogOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!branchName) {
      toast.error('Vui lòng điền tên chi nhánh.');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        BranchName: branchName,
        Address: address,
        Phone: phone,
        Notes: notes
      };

      const method = editingId ? 'PATCH' : 'POST';
      const body = editingId ? { id: editingId, ...payload } : payload;

      const response = await fetch('/api/branches', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      const data = await response.json();

      if (!response.ok) throw new Error(data.error);

      toast.success(editingId ? 'Cập nhật chi nhánh thành công!' : 'Thêm chi nhánh thành công!');
      setIsDialogOpen(false);
      fetchBranchesData();
      
      // Force reload to update the Branch Selector dropdown in the layout header
      window.location.reload();
    } catch (e) {
      toast.error(e.message || 'Lỗi lưu thông tin chi nhánh.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Title Header */}
      <div className="flex justify-between items-center border-b border-border pb-4">
        <div>
          <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <GitBranch className="h-5 w-5 text-primary" />
            Quản lý chi nhánh Homestay
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">Quản lý danh sách các cơ sở vận hành</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchBranchesData}
            disabled={isRefreshing}
            className="border-border hover:bg-muted text-muted-foreground hover:text-foreground h-8"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
          </Button>

          <Button size="sm" onClick={handleOpenCreate} className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-xs h-8">
            <Plus className="h-3.5 w-3.5 mr-1" />
            Thêm chi nhánh
          </Button>
        </div>
      </div>

      {/* Branches Table List */}
      <div className="border border-border bg-card overflow-x-auto rounded-xl">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr className="border-b border-border">
              <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground w-16">ID</th>
              <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground">Tên chi nhánh</th>
              <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground">Địa chỉ</th>
              <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground">Điện thoại</th>
              <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground">Ghi chú ngân hàng/QR</th>
              <th className="text-right px-4 py-2.5 text-xs font-semibold text-muted-foreground w-20">Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {branches.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center py-12 text-xs text-muted-foreground">
                  Chưa đăng ký chi nhánh nào.
                </td>
              </tr>
            ) : (
              branches.map((item, idx) => (
                <tr key={item.Id} className={`border-b border-border last:border-0 hover:bg-muted/35 ${idx % 2 === 0 ? '' : 'bg-muted/10'}`}>
                  <td className="px-4 py-2.5 font-mono text-xs text-muted-foreground">#{item.Id}</td>
                  <td className="px-4 py-2.5 text-xs font-semibold text-foreground">{item.BranchName}</td>
                  <td className="px-4 py-2.5 text-xs text-foreground">
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3 w-3 text-muted-foreground shrink-0" />
                      <span className="truncate max-w-[200px]">{item.Address || '-'}</span>
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-xs text-foreground font-mono">
                    <span className="flex items-center gap-1">
                      <Phone className="h-3 w-3 text-muted-foreground shrink-0" />
                      {item.Phone || '-'}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-xs text-muted-foreground italic max-w-[200px] truncate" title={item.Notes}>
                    {item.Notes || '-'}
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleOpenEdit(item)}
                      className="h-7 w-7 text-muted-foreground hover:text-foreground hover:bg-muted rounded-md"
                      title="Chỉnh sửa"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="bg-muted border-border text-foreground p-6 max-w-[450px]">
          <DialogHeader>
            <DialogTitle className="text-base text-foreground font-semibold">
              {editingId ? 'Chỉnh sửa chi nhánh' : 'Thêm chi nhánh mới'}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 mt-4">
            <div className="space-y-1.5">
              <label className="text-xs text-muted-foreground font-semibold">Tên chi nhánh *</label>
              <Input
                value={branchName}
                onChange={(e) => setBranchName(e.target.value)}
                placeholder="Ví dụ: Chi nhánh Đà Lạt, Homestay Vũng Tàu..."
                className="bg-background border-border text-foreground text-xs"
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs text-muted-foreground font-semibold">Địa chỉ chi nhánh</label>
              <div className="relative">
                <MapPin className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Số 10, Lý Tự Trọng, Đà Lạt"
                  className="pl-10 bg-background border-border text-foreground text-xs"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs text-muted-foreground font-semibold">Số điện thoại liên hệ</label>
              <div className="relative">
                <Phone className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="02633xxxxxx"
                  className="pl-10 bg-background border-border text-foreground text-xs font-mono"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs text-muted-foreground font-semibold">Ghi chú thanh toán (Ngân hàng / Số tài khoản)</label>
              <div className="relative">
                <FileText className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Techcombank: 190333xxxx - Nguyễn Văn A"
                  className="pl-10 bg-background border-border text-foreground text-xs"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-border">
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)} className="border-border text-foreground hover:bg-muted text-xs">
                Hủy
              </Button>
              <Button type="submit" className="bg-primary hover:bg-primary/90 text-primary-foreground text-xs" disabled={isSubmitting}>
                {isSubmitting ? 'Đang lưu...' : 'Lưu lại'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Booking Sources Tab ─────────────────────────────────────────────────────
function BookingSourcesTab() {
  const [sources, setSources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  // Form states
  const [editingId, setEditingId] = useState(null);
  const [sourceCode, setSourceCode] = useState('');
  const [sourceName, setSourceName] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchSources = async (showRefreshIndicator = false) => {
    if (showRefreshIndicator) {
      setIsRefreshing(true);
    } else {
      setLoading(true);
    }
    try {
      const response = await fetch('/api/booking-sources');
      if (!response.ok) {
        throw new Error('Không thể lấy danh sách nguồn đặt phòng');
      }
      const data = await response.json();
      setSources(data);
    } catch (e) {
      toast.error(e.message || 'Lỗi tải danh sách nguồn đặt phòng.');
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchSources();
  }, []);

  const handleOpenCreate = () => {
    setEditingId(null);
    setSourceCode('');
    setSourceName('');
    setNotes('');
    setIsDialogOpen(true);
  };

  const handleOpenEdit = (item) => {
    setEditingId(item.Id);
    setSourceCode(item.SourceCode);
    setSourceName(item.SourceName);
    setNotes(item.Notes || '');
    setIsDialogOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!sourceCode.trim() || !sourceName.trim()) {
      toast.error('Vui lòng nhập đầy đủ mã và tên nguồn.');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        SourceCode: sourceCode.trim().toUpperCase(),
        SourceName: sourceName.trim(),
        Notes: notes.trim(),
      };

      const method = editingId ? 'PATCH' : 'POST';
      const body = editingId ? { id: editingId, ...payload } : payload;

      const response = await fetch('/api/booking-sources', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Lỗi lưu thông tin');

      toast.success(editingId ? 'Cập nhật nguồn đặt thành công!' : 'Thêm nguồn đặt thành công!');
      setIsDialogOpen(false);
      fetchSources();
    } catch (e) {
      toast.error(e.message || 'Lỗi lưu thông tin nguồn đặt phòng.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa nguồn đặt phòng này?')) return;

    try {
      const response = await fetch(`/api/booking-sources?id=${id}`, {
        method: 'DELETE',
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Lỗi xóa nguồn');

      toast.success('Xóa nguồn đặt phòng thành công!');
      fetchSources();
    } catch (e) {
      toast.error(e.message || 'Không thể xóa nguồn đặt phòng.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Title Header */}
      <div className="flex justify-between items-center border-b border-border pb-4">
        <div>
          <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <Globe className="h-5 w-5 text-primary" />
            Quản lý nguồn đặt phòng
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">Quản lý các kênh bán hàng (Direct, OTA, OTA Agents, Social networks...)</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchSources(true)}
            disabled={isRefreshing || loading}
            className="border-border hover:bg-muted text-muted-foreground hover:text-foreground h-8"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
          </Button>

          <Button size="sm" onClick={handleOpenCreate} className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-xs h-8">
            <Plus className="h-3.5 w-3.5 mr-1" />
            Thêm nguồn đặt
          </Button>
        </div>
      </div>

      {/* List Table */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-2">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
          <span className="text-xs">Đang tải danh sách nguồn đặt phòng...</span>
        </div>
      ) : (
        <div className="border border-border bg-card overflow-x-auto rounded-xl">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr className="border-b border-border">
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground w-16">ID</th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground w-32">Mã nguồn</th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground">Tên nguồn đặt phòng</th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground">Ghi chú</th>
                <th className="text-right px-4 py-2.5 text-xs font-semibold text-muted-foreground w-24">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {sources.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-12 text-xs text-muted-foreground">
                    Chưa đăng ký nguồn đặt phòng nào.
                  </td>
                </tr>
              ) : (
                sources.map((item, idx) => (
                  <tr key={item.Id} className={`border-b border-border last:border-0 hover:bg-muted/35 ${idx % 2 === 0 ? '' : 'bg-muted/10'}`}>
                    <td className="px-4 py-2.5 font-mono text-xs text-muted-foreground">#{item.Id}</td>
                    <td className="px-4 py-2.5 text-xs font-mono font-bold text-primary">
                      <span className="px-2 py-0.5 rounded bg-primary/10 border border-primary/20">
                        {item.SourceCode}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-xs font-semibold text-foreground">{item.SourceName}</td>
                    <td className="px-4 py-2.5 text-xs text-muted-foreground italic max-w-[250px] truncate" title={item.Notes}>
                      {item.Notes || '-'}
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <div className="flex justify-end gap-1.5">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleOpenEdit(item)}
                          className="h-7 w-7 text-muted-foreground hover:text-foreground hover:bg-muted rounded-md"
                          title="Chỉnh sửa"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(item.Id)}
                          className="h-7 w-7 text-rose-500 hover:text-rose-400 hover:bg-rose-950/20 rounded-md"
                          title="Xóa"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Add / Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="bg-muted border-border text-foreground p-6 max-w-[450px]">
          <DialogHeader>
            <DialogTitle className="text-base text-foreground font-semibold">
              {editingId ? 'Chỉnh sửa nguồn đặt phòng' : 'Thêm nguồn đặt phòng mới'}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 mt-4">
            <div className="space-y-1.5">
              <label className="text-xs text-muted-foreground font-semibold">Mã nguồn (chữ in hoa) *</label>
              <div className="relative">
                <Tag className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  value={sourceCode}
                  onChange={(e) => setSourceCode(e.target.value)}
                  placeholder="Ví dụ: DIRECT, AGODA, FACEBOOK, WALK_IN"
                  className="pl-10 bg-background border-border text-foreground text-xs font-mono"
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs text-muted-foreground font-semibold">Tên nguồn đặt phòng *</label>
              <Input
                value={sourceName}
                onChange={(e) => setSourceName(e.target.value)}
                placeholder="Ví dụ: Trực tiếp / Walk-in, Agoda OTA, Trang Facebook..."
                className="bg-background border-border text-foreground text-xs"
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs text-muted-foreground font-semibold">Ghi chú / Mô tả</label>
              <div className="relative">
                <FileText className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Ghi chú thêm về kênh đặt phòng này..."
                  className="pl-10 bg-background border-border text-foreground text-xs"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-border">
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)} className="border-border text-foreground hover:bg-muted text-xs">
                Hủy
              </Button>
              <Button type="submit" className="bg-primary hover:bg-primary/90 text-primary-foreground text-xs" disabled={isSubmitting}>
                {isSubmitting ? 'Đang lưu...' : 'Lưu lại'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Main Settings Page ───────────────────────────────────────────────────────
export default function SettingsPage() {
  const { user, refreshSettings } = useBranch();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('branding');
  const [settings, setSettings] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  // Redirect non-admin
  useEffect(() => {
    if (user && user.role !== 'Admin') {
      router.push('/');
    }
  }, [user, router]);

  // Load settings
  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch('/api/settings');
        const data = await res.json();
        if (!data.error) setSettings(data);
      } catch (e) {
        toast.error('Không tải được cấu hình hệ thống.');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const handleChange = (key, value) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
    setDirty(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error || 'Lưu thất bại.'); return; }
      toast.success('Đã lưu cấu hình hệ thống!');
      setDirty(false);
      // Refresh settings in BranchContext so header updates immediately
      await refreshSettings();
    } catch (e) {
      toast.error('Lỗi kết nối máy chủ.');
    } finally {
      setSaving(false);
    }
  };

  if (!user || user.role !== 'Admin') return null;

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Settings className="h-6 w-6 text-primary" />
            Cài đặt hệ thống
          </h1>
          <p className="text-muted-foreground text-sm mt-1">Cấu hình thương hiệu, chính sách và các thông số hoạt động của phần mềm</p>
        </div>
        {dirty && (
          <Button onClick={handleSave} disabled={saving} className="gap-2 shrink-0">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Lưu thay đổi
          </Button>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
      ) : (
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Sidebar tabs */}
          <aside className="lg:w-52 shrink-0">
            <nav className="flex lg:flex-col gap-1 overflow-x-auto lg:overflow-visible pb-2 lg:pb-0">
              {SETTING_TABS.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center gap-2.5 px-3 h-9 rounded-lg text-sm font-medium whitespace-nowrap transition-all w-full text-left ${
                      isActive
                        ? 'bg-primary/10 text-primary border border-primary/20'
                        : 'text-muted-foreground hover:text-foreground hover:bg-muted border border-transparent'
                    }`}
                  >
                    <Icon className={`h-4 w-4 shrink-0 ${isActive ? 'text-primary' : 'text-muted-foreground'}`} />
                    {tab.label}
                  </button>
                );
              })}
            </nav>
          </aside>

          {/* Tab content */}
          <div className="flex-1 min-w-0">
            <Card className="bg-card/60 border-border">
              <CardContent className="pt-6 pb-6">
                {activeTab === 'branding' && <BrandingTab settings={settings} onChange={handleChange} />}
                {activeTab === 'hotel' && <HotelTab settings={settings} onChange={handleChange} />}
                {activeTab === 'branches' && <BranchesTab />}
                {activeTab === 'booking_sources' && <BookingSourcesTab />}
                {activeTab === 'billing' && <BillingTab settings={settings} onChange={handleChange} />}

                {activeTab === 'room_types' && <RoomTypesTab settings={settings} onChange={handleChange} />}
                {activeTab === 'api_gateway' && <ApiGatewayTab settings={settings} onChange={handleChange} />}
                {activeTab === 'templates' && <TemplatesTab settings={settings} onChange={handleChange} />}
                {activeTab === 'system' && <SystemTab />}
              </CardContent>
            </Card>

            {/* Save button at bottom */}
            {activeTab !== 'system' && activeTab !== 'room_types' && activeTab !== 'branches' && activeTab !== 'booking_sources' && (
              <div className="mt-4 flex items-center gap-3">
                <Button onClick={handleSave} disabled={saving || !dirty} className="gap-2">
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  Lưu thay đổi
                </Button>
                {!dirty && !saving && (
                  <span className="flex items-center gap-1.5 text-xs text-emerald-500">
                    <CheckCircle2 className="h-3.5 w-3.5" />Đã lưu
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
