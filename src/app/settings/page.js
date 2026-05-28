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
  Webhook, Copy, Eye, EyeOff, Code
} from 'lucide-react';
import { toast } from 'sonner';

// ─── Tab definitions ──────────────────────────────────────────────────────────
const SETTING_TABS = [
  { id: 'branding', label: 'Thương hiệu', icon: Palette },
  { id: 'hotel', label: 'Thông tin khách sạn', icon: Hotel },
  { id: 'billing', label: 'Thanh toán & QR', icon: QrCode },
  { id: 'policies', label: 'Chính sách vận hành', icon: ClockAlert },
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

// ─── Operational policies tab ─────────────────────────────────────────────────
function PoliciesTab({ settings, onChange }) {
  return (
    <FieldGroup>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="Giờ check-in mặc định" hint="Giờ vào phòng tiêu chuẩn">
          <div className="relative">
            <AlarmClock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              id="setting-DefaultCheckInTime"
              type="time"
              className="pl-9"
              value={settings.DefaultCheckInTime || '14:00'}
              onChange={(e) => onChange('DefaultCheckInTime', e.target.value)}
            />
          </div>
        </Field>
        <Field label="Giờ check-out mặc định" hint="Giờ trả phòng tiêu chuẩn">
          <div className="relative">
            <AlarmClock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              id="setting-DefaultCheckOutTime"
              type="time"
              className="pl-9"
              value={settings.DefaultCheckOutTime || '12:00'}
              onChange={(e) => onChange('DefaultCheckOutTime', e.target.value)}
            />
          </div>
        </Field>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="Phụ thu nhận phòng sớm (VNĐ)" hint="0 = không tính phụ thu">
          <Input
            id="setting-SurchargeEarlyCheckIn"
            type="number"
            min={0}
            value={settings.SurchargeEarlyCheckIn || '0'}
            onChange={(e) => onChange('SurchargeEarlyCheckIn', e.target.value)}
            placeholder="0"
          />
        </Field>
        <Field label="Phụ thu trả phòng muộn (VNĐ)" hint="0 = không tính phụ thu">
          <Input
            id="setting-SurchargeLateCheckOut"
            type="number"
            min={0}
            value={settings.SurchargeLateCheckOut || '0'}
            onChange={(e) => onChange('SurchargeLateCheckOut', e.target.value)}
            placeholder="0"
          />
        </Field>
      </div>

      <Field label="Tự động chuyển phòng sang &quot;Cần dọn dẹp&quot; sau check-out">
        <div className="flex items-center gap-3">
          <button
            id="setting-AutoCleanOnCheckOut"
            type="button"
            role="switch"
            aria-checked={settings.AutoCleanOnCheckOut === 'true'}
            onClick={() => onChange('AutoCleanOnCheckOut', settings.AutoCleanOnCheckOut === 'true' ? 'false' : 'true')}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
              settings.AutoCleanOnCheckOut === 'true' ? 'bg-primary' : 'bg-muted'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                settings.AutoCleanOnCheckOut === 'true' ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
          <span className="text-sm text-muted-foreground flex items-center gap-1.5">
            <BrushCleaning className="h-4 w-4" />
            {settings.AutoCleanOnCheckOut === 'true' ? 'Bật — tự động đổi trạng thái' : 'Tắt — giữ nguyên trạng thái'}
          </span>
        </div>
      </Field>
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
                {activeTab === 'billing' && <BillingTab settings={settings} onChange={handleChange} />}
                {activeTab === 'policies' && <PoliciesTab settings={settings} onChange={handleChange} />}
                {activeTab === 'room_types' && <RoomTypesTab settings={settings} onChange={handleChange} />}
                {activeTab === 'api_gateway' && <ApiGatewayTab settings={settings} onChange={handleChange} />}
                {activeTab === 'templates' && <TemplatesTab settings={settings} onChange={handleChange} />}
                {activeTab === 'system' && <SystemTab />}
              </CardContent>
            </Card>

            {/* Save button at bottom */}
            {activeTab !== 'system' && activeTab !== 'room_types' && (
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
