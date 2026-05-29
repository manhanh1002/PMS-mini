'use client';

import React, { useState, useEffect } from 'react';
import { useBranch } from '@/components/BranchContext';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  ClockAlert, AlarmClock, BrushCleaning, Save, Loader2, Plus, Trash2, CalendarRange, Info, CalendarClock, Pencil
} from 'lucide-react';
import { toast } from 'sonner';

export default function PoliciesPage() {
  const { user, refreshSettings } = useBranch();
  const router = useRouter();
  const [settings, setSettings] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [activeSubTab, setActiveSubTab] = useState('general');

  // Holiday Modal State
  const [isHolidayOpen, setIsHolidayOpen] = useState(false);
  const [holidayEditingIdx, setHolidayEditingIdx] = useState(null);
  const [holidayForm, setHolidayForm] = useState({
    name: '',
    fromDate: '',
    toDate: '',
    type: 'Percentage', // Percentage | Fixed
    value: '',
    applyToHourly: 'false',
    applyToOvernight: 'true'
  });

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
        toast.error('Không tải được cấu hình chính sách vận hành.');
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
      if (!res.ok) {
        toast.error(data.error || 'Lưu thất bại.');
        return;
      }
      toast.success('Đã lưu cấu hình chính sách vận hành!');
      setDirty(false);
      await refreshSettings();
    } catch (e) {
      toast.error('Lỗi kết nối máy chủ.');
    } finally {
      setSaving(false);
    }
  };

  // Helper for Holiday array parsing
  const getHolidays = () => {
    try {
      if (settings.HolidayPolicies) {
        const parsed = JSON.parse(settings.HolidayPolicies);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (e) { /* ignore */ }
    return [];
  };

  const handleOpenAddHoliday = () => {
    setHolidayEditingIdx(null);
    setHolidayForm({
      name: '',
      fromDate: '',
      toDate: '',
      type: 'Percentage',
      value: '',
      applyToHourly: 'false',
      applyToOvernight: 'true'
    });
    setIsHolidayOpen(true);
  };

  const handleOpenEditHoliday = (item, idx) => {
    setHolidayEditingIdx(idx);
    setHolidayForm({
      name: item.name || '',
      fromDate: item.fromDate || '',
      toDate: item.toDate || '',
      type: item.type || 'Percentage',
      value: item.value || '',
      applyToHourly: item.applyToHourly || 'false',
      applyToOvernight: item.applyToOvernight || 'true'
    });
    setIsHolidayOpen(true);
  };

  const handleSaveHoliday = (e) => {
    e.preventDefault();
    if (!holidayForm.name.trim() || !holidayForm.fromDate || !holidayForm.toDate || !holidayForm.value) {
      toast.error('Vui lòng nhập đầy đủ thông tin ngày lễ.');
      return;
    }

    if (new Date(holidayForm.fromDate) > new Date(holidayForm.toDate)) {
      toast.error('Ngày kết thúc không thể trước ngày bắt đầu.');
      return;
    }

    const currentHolidays = getHolidays();
    const newHoliday = {
      name: holidayForm.name.trim(),
      fromDate: holidayForm.fromDate,
      toDate: holidayForm.toDate,
      type: holidayForm.type,
      value: Number(holidayForm.value),
      applyToHourly: holidayForm.applyToHourly,
      applyToOvernight: holidayForm.applyToOvernight
    };

    let updated = [];
    if (holidayEditingIdx !== null) {
      updated = [...currentHolidays];
      updated[holidayEditingIdx] = newHoliday;
    } else {
      updated = [...currentHolidays, newHoliday];
    }

    handleChange('HolidayPolicies', JSON.stringify(updated));
    setIsHolidayOpen(false);
    toast.success(holidayEditingIdx !== null ? 'Cập nhật ngày lễ thành công!' : 'Thêm ngày lễ thành công!');
  };

  const handleDeleteHoliday = (idx) => {
    if (!confirm('Bạn có chắc chắn muốn xóa chính sách ngày lễ này?')) return;
    const currentHolidays = getHolidays();
    const updated = currentHolidays.filter((_, i) => i !== idx);
    handleChange('HolidayPolicies', JSON.stringify(updated));
    toast.success('Đã xóa chính sách ngày lễ.');
  };

  // Day list helper for checkbox mapping
  const DAYS_OF_WEEK = [
    { value: '1', label: 'Thứ 2' },
    { value: '2', label: 'Thứ 3' },
    { value: '3', label: 'Thứ 4' },
    { value: '4', label: 'Thứ 5' },
    { value: '5', label: 'Thứ 6' },
    { value: '6', label: 'Thứ 7' },
    { value: '0', label: 'Chủ Nhật' },
  ];

  const handleToggleDay = (key, dayVal) => {
    const currentStr = settings[key] || '';
    let currentArray = currentStr ? currentStr.split(',') : [];
    if (currentArray.includes(dayVal)) {
      currentArray = currentArray.filter(d => d !== dayVal);
    } else {
      currentArray = [...currentArray, dayVal];
    }
    handleChange(key, currentArray.join(','));
  };

  if (!user || user.role !== 'Admin') return null;

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <ClockAlert className="h-6 w-6 text-primary" />
            Chính sách vận hành
          </h1>
          <p className="text-muted-foreground text-sm mt-1">Cấu hình các khung giờ, phụ thu dọn dẹp, tăng giá cuối tuần/ngày lễ và giảm giá ngày thường.</p>
        </div>
        <div>
          <Button
            onClick={handleSave}
            disabled={saving || !dirty}
            className="w-full sm:w-auto bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-xs h-9 px-4 flex items-center justify-center gap-1.5"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {saving ? 'Đang lưu...' : 'Lưu chính sách'}
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground gap-2">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <span className="text-xs">Đang tải chính sách vận hành...</span>
        </div>
      ) : (
        <Tabs value={activeSubTab} onValueChange={setActiveSubTab} className="w-full">
          <TabsList className="bg-background border border-border p-1 w-full flex overflow-x-auto justify-start mb-6">
            <TabsTrigger value="general" className="text-xs font-semibold">Vận hành chung</TabsTrigger>
            <TabsTrigger value="weekend_weekday" className="text-xs font-semibold">Cuối tuần & Ngày thường</TabsTrigger>
            <TabsTrigger value="holidays" className="text-xs font-semibold">Chính sách Lễ/Tết</TabsTrigger>
          </TabsList>

          {/* General Tab */}
          <TabsContent value="general" className="space-y-6">
            <Card className="bg-card/60 border-border">
              <CardHeader>
                <CardTitle className="text-sm font-semibold flex items-center gap-2"><AlarmClock className="h-4 w-4 text-primary" /> Khung giờ & Phụ thu cơ bản</CardTitle>
                <CardDescription className="text-xs">Thiết lập giờ nhận/trả tiêu chuẩn và mức phạt phụ thu quá giờ.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground font-medium">Giờ check-in mặc định</Label>
                    <Input
                      type="time"
                      value={settings.DefaultCheckInTime || '14:00'}
                      onChange={(e) => handleChange('DefaultCheckInTime', e.target.value)}
                      className="bg-background border-border text-foreground"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground font-medium">Giờ check-out mặc định</Label>
                    <Input
                      type="time"
                      value={settings.DefaultCheckOutTime || '12:00'}
                      onChange={(e) => handleChange('DefaultCheckOutTime', e.target.value)}
                      className="bg-background border-border text-foreground"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground font-medium font-semibold">Phụ thu nhận phòng sớm (VNĐ / giờ)</Label>
                    <Input
                      type="number"
                      min={0}
                      value={settings.SurchargeEarlyCheckIn || '0'}
                      onChange={(e) => handleChange('SurchargeEarlyCheckIn', e.target.value)}
                      placeholder="0"
                      className="bg-background border-border text-foreground"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground font-medium font-semibold">Phụ thu trả phòng muộn (VNĐ / giờ)</Label>
                    <Input
                      type="number"
                      min={0}
                      value={settings.SurchargeLateCheckOut || '0'}
                      onChange={(e) => handleChange('SurchargeLateCheckOut', e.target.value)}
                      placeholder="0"
                      className="bg-background border-border text-foreground"
                    />
                  </div>
                </div>

                <div className="space-y-2 pt-2 border-t border-border/50">
                  <Label className="text-xs text-muted-foreground font-medium block">Tự động chuyển phòng sang &quot;Cần dọn dẹp&quot; sau check-out</Label>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      role="switch"
                      aria-checked={settings.AutoCleanOnCheckOut === 'true'}
                      onClick={() => handleChange('AutoCleanOnCheckOut', settings.AutoCleanOnCheckOut === 'true' ? 'false' : 'true')}
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
                    <span className="text-xs text-muted-foreground flex items-center gap-1.5">
                      <BrushCleaning className="h-4 w-4 text-muted-foreground" />
                      {settings.AutoCleanOnCheckOut === 'true' ? 'Bật — tự động đổi sang trạng thái Cần dọn dẹp' : 'Tắt — giữ nguyên trạng thái cũ'}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Weekend & Weekday Pricing Tab */}
          <TabsContent value="weekend_weekday" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Weekend Section */}
              <Card className="bg-card/60 border-border">
                <CardHeader>
                  <CardTitle className="text-sm font-semibold flex items-center gap-2"><CalendarClock className="h-4 w-4 text-amber-500" /> Tăng giá Cuối tuần (Weekend Surcharge)</CardTitle>
                  <CardDescription className="text-xs">Phụ thu thêm tiền phòng cho các ngày cao điểm cuối tuần.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground font-medium block">Chọn các ngày cuối tuần:</Label>
                    <div className="flex flex-wrap gap-2">
                      {DAYS_OF_WEEK.map(day => {
                        const isChecked = (settings.WeekendDays || '').split(',').includes(day.value);
                        return (
                          <label key={day.value} className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-md border cursor-pointer select-none transition-all ${
                            isChecked ? 'bg-amber-500/10 border-amber-500/30 text-amber-500 font-semibold' : 'bg-background border-border text-muted-foreground hover:bg-muted'
                          }`}>
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => handleToggleDay('WeekendDays', day.value)}
                              className="hidden"
                            />
                            {day.label}
                          </label>
                        );
                      })}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground font-medium">Hình thức phụ thu</Label>
                      <Select
                        value={settings.WeekendSurchargeType || 'None'}
                        onValueChange={(val) => {
                          handleChange('WeekendSurchargeType', val);
                          if (val === 'None') handleChange('WeekendSurchargeValue', '0');
                        }}
                      >
                        <SelectTrigger className="bg-background border-border text-foreground text-xs h-9">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-muted border-border text-foreground">
                          <SelectItem value="None">Không phụ thu</SelectItem>
                          <SelectItem value="Percentage">Theo phần trăm (%)</SelectItem>
                          <SelectItem value="Fixed">Số tiền cố định (đ)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground font-medium">Giá trị tăng thêm</Label>
                      <Input
                        type="number"
                        min={0}
                        disabled={!settings.WeekendSurchargeType || settings.WeekendSurchargeType === 'None'}
                        value={settings.WeekendSurchargeValue || '0'}
                        onChange={(e) => handleChange('WeekendSurchargeValue', e.target.value)}
                        placeholder="0"
                        className="bg-background border-border text-foreground h-9"
                      />
                    </div>
                  </div>

                  <div className="space-y-2 pt-2 border-t border-border/50">
                    <Label className="text-xs text-muted-foreground font-medium block">Hình thức áp dụng khác:</Label>
                    <div className="flex flex-col gap-2">
                      <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={settings.ApplyWeekendToHourly === 'true'}
                          onChange={(e) => handleChange('ApplyWeekendToHourly', e.target.checked ? 'true' : 'false')}
                          className="rounded border-border bg-background text-primary"
                        />
                        Áp dụng phụ thu cuối tuần cho đặt phòng **Theo giờ (Hourly)**
                      </label>
                      <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={settings.ApplyWeekendToOvernight === 'true'}
                          onChange={(e) => handleChange('ApplyWeekendToOvernight', e.target.checked ? 'true' : 'false')}
                          className="rounded border-border bg-background text-primary"
                        />
                        Áp dụng phụ thu cuối tuần cho đặt phòng **Qua đêm (Overnight)**
                      </label>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Weekday Section */}
              <Card className="bg-card/60 border-border">
                <CardHeader>
                  <CardTitle className="text-sm font-semibold flex items-center gap-2"><CalendarClock className="h-4 w-4 text-blue-400" /> Giảm giá Ngày thường (Weekday Discount)</CardTitle>
                  <CardDescription className="text-xs">Giảm bớt tiền phòng cho các ngày thấp điểm giữa tuần.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground font-medium block">Chọn các ngày thường:</Label>
                    <div className="flex flex-wrap gap-2">
                      {DAYS_OF_WEEK.map(day => {
                        const isChecked = (settings.WeekdayDays || '').split(',').includes(day.value);
                        return (
                          <label key={day.value} className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-md border cursor-pointer select-none transition-all ${
                            isChecked ? 'bg-blue-500/10 border-blue-500/30 text-blue-450 font-semibold' : 'bg-background border-border text-muted-foreground hover:bg-muted'
                          }`}>
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => handleToggleDay('WeekdayDays', day.value)}
                              className="hidden"
                            />
                            {day.label}
                          </label>
                        );
                      })}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground font-medium">Hình thức giảm giá</Label>
                      <Select
                        value={settings.WeekdayDiscountType || 'None'}
                        onValueChange={(val) => {
                          handleChange('WeekdayDiscountType', val);
                          if (val === 'None') handleChange('WeekdayDiscountValue', '0');
                        }}
                      >
                        <SelectTrigger className="bg-background border-border text-foreground text-xs h-9">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-muted border-border text-foreground">
                          <SelectItem value="None">Không giảm giá</SelectItem>
                          <SelectItem value="Percentage">Theo phần trăm (%)</SelectItem>
                          <SelectItem value="Fixed">Số tiền cố định (đ)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground font-medium">Giá trị giảm trừ</Label>
                      <Input
                        type="number"
                        min={0}
                        disabled={!settings.WeekdayDiscountType || settings.WeekdayDiscountType === 'None'}
                        value={settings.WeekdayDiscountValue || '0'}
                        onChange={(e) => handleChange('WeekdayDiscountValue', e.target.value)}
                        placeholder="0"
                        className="bg-background border-border text-foreground h-9"
                      />
                    </div>
                  </div>

                  <div className="space-y-2 pt-2 border-t border-border/50">
                    <Label className="text-xs text-muted-foreground font-medium block">Hình thức áp dụng khác:</Label>
                    <div className="flex flex-col gap-2">
                      <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={settings.ApplyWeekdayToHourly === 'true'}
                          onChange={(e) => handleChange('ApplyWeekdayToHourly', e.target.checked ? 'true' : 'false')}
                          className="rounded border-border bg-background text-primary"
                        />
                        Áp dụng giảm giá ngày thường cho đặt phòng **Theo giờ (Hourly)**
                      </label>
                      <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={settings.ApplyWeekdayToOvernight === 'true'}
                          onChange={(e) => handleChange('ApplyWeekdayToOvernight', e.target.checked ? 'true' : 'false')}
                          className="rounded border-border bg-background text-primary"
                        />
                        Áp dụng giảm giá ngày thường cho đặt phòng **Qua đêm (Overnight)**
                      </label>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Holidays Pricing Tab */}
          <TabsContent value="holidays" className="space-y-6">
            <Card className="bg-card/60 border-border">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                <div>
                  <CardTitle className="text-sm font-semibold flex items-center gap-2"><CalendarRange className="h-4 w-4 text-rose-500" /> Chính sách Ngày Lễ/Tết (Holiday Policies)</CardTitle>
                  <CardDescription className="text-xs">Thiết lập chính sách tăng giá phụ thu đặc biệt cho các dịp Lễ/Tết lớn trong năm.</CardDescription>
                </div>
                <Button
                  size="sm"
                  onClick={handleOpenAddHoliday}
                  className="bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-semibold h-8"
                >
                  <Plus className="h-4 w-4 mr-1" /> Thêm ngày lễ
                </Button>
              </CardHeader>
              <CardContent className="p-0 border-t border-border">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/50 border-b border-border text-[11px] font-semibold text-muted-foreground text-left uppercase">
                      <tr>
                        <th className="px-4 py-3">Tên ngày lễ</th>
                        <th className="px-4 py-3">Thời hạn áp dụng</th>
                        <th className="px-4 py-3">Mức phụ thu</th>
                        <th className="px-4 py-3">Theo giờ</th>
                        <th className="px-4 py-3">Qua đêm</th>
                        <th className="px-4 py-3 text-right w-24">Thao tác</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/60">
                      {getHolidays().length === 0 ? (
                        <tr>
                          <td colSpan={6} className="text-center py-12 text-xs text-muted-foreground">
                            Chưa cấu hình chính sách ngày lễ nào. Bấm &quot;Thêm ngày lễ&quot; để thiết lập.
                          </td>
                        </tr>
                      ) : (
                        getHolidays().map((item, idx) => (
                          <tr key={idx} className="hover:bg-muted/30 text-xs">
                            <td className="px-4 py-3 font-semibold text-foreground">{item.name}</td>
                            <td className="px-4 py-3 text-muted-foreground font-mono">
                              {new Date(item.fromDate).toLocaleDateString('vi-VN')} - {new Date(item.toDate).toLocaleDateString('vi-VN')}
                            </td>
                            <td className="px-4 py-3 font-semibold">
                              {item.type === 'Percentage' ? `+${item.value}%` : `+${Number(item.value).toLocaleString('vi-VN')}đ`}
                            </td>
                            <td className="px-4 py-3 text-muted-foreground">
                              {item.applyToHourly === 'true' ? '✅ Có' : '❌ Không'}
                            </td>
                            <td className="px-4 py-3 text-muted-foreground">
                              {item.applyToOvernight === 'true' ? '✅ Có' : '❌ Không'}
                            </td>
                            <td className="px-4 py-3 text-right">
                              <div className="flex justify-end gap-1.5">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleOpenEditHoliday(item, idx)}
                                  className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-muted rounded-md"
                                >
                                  <Pencil className="h-3.5 w-3.5" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleDeleteHoliday(idx)}
                                  className="h-8 w-8 text-rose-500 hover:text-rose-450 hover:bg-rose-950/20 rounded-md"
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

                <div className="p-4 bg-muted/20 border-t border-border flex items-start gap-2.5 text-xs text-muted-foreground rounded-b-xl">
                  <Info className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                  <p>
                    <span className="font-semibold text-foreground">Quy tắc ưu tiên tính giá:</span> Khi một ngày lưu trú vừa là ngày thường/ngày cuối tuần, vừa trùng vào ngày Lễ/Tết đã cấu hình ở đây, hệ thống sẽ ưu tiên tính phụ thu Lễ/Tết trước (Lễ/Tết &gt; Cuối tuần &gt; Ngày thường).
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}

      {/* Holiday Dialog Form */}
      <Dialog open={isHolidayOpen} onOpenChange={setIsHolidayOpen}>
        <DialogContent className="bg-muted border-border text-foreground p-6 sm:max-w-[480px] w-[95vw]">
          <DialogHeader>
            <DialogTitle className="text-base text-foreground flex items-center gap-2">
              <CalendarRange className="h-5 w-5 text-primary" />
              {holidayEditingIdx !== null ? 'Chỉnh sửa chính sách ngày lễ' : 'Thêm ngày lễ mới'}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSaveHoliday} className="space-y-4 mt-2">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground font-semibold">Tên ngày lễ *</Label>
              <Input
                value={holidayForm.name}
                onChange={(e) => setHolidayForm({ ...holidayForm, name: e.target.value })}
                placeholder="Ví dụ: Tết Dương Lịch"
                className="bg-background border-border text-foreground text-xs h-9"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground font-semibold">Từ ngày *</Label>
                <Input
                  type="date"
                  value={holidayForm.fromDate}
                  onChange={(e) => setHolidayForm({ ...holidayForm, fromDate: e.target.value })}
                  className="bg-background border-border text-foreground text-xs h-9"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground font-semibold">Đến ngày *</Label>
                <Input
                  type="date"
                  value={holidayForm.toDate}
                  onChange={(e) => setHolidayForm({ ...holidayForm, toDate: e.target.value })}
                  className="bg-background border-border text-foreground text-xs h-9"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground font-semibold">Loại phụ thu *</Label>
                <Select
                  value={holidayForm.type}
                  onValueChange={(val) => setHolidayForm({ ...holidayForm, type: val })}
                >
                  <SelectTrigger className="bg-background border-border text-foreground text-xs h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-muted border-border text-foreground">
                    <SelectItem value="Percentage">Theo phần trăm (%)</SelectItem>
                    <SelectItem value="Fixed">Số tiền cố định (đ)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground font-semibold">Mức phụ thu tăng thêm *</Label>
                <Input
                  type="number"
                  min={0}
                  value={holidayForm.value}
                  onChange={(e) => setHolidayForm({ ...holidayForm, value: e.target.value })}
                  placeholder={holidayForm.type === 'Percentage' ? '20' : '200000'}
                  className="bg-background border-border text-foreground text-xs h-9"
                  required
                />
              </div>
            </div>

            <div className="space-y-2 pt-2 border-t border-border/50">
              <Label className="text-xs text-muted-foreground font-semibold block">Hình thức áp dụng khác:</Label>
              <div className="flex flex-col gap-2">
                <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={holidayForm.applyToHourly === 'true'}
                    onChange={(e) => setHolidayForm({ ...holidayForm, applyToHourly: e.target.checked ? 'true' : 'false' })}
                    className="rounded border-border bg-background text-primary"
                  />
                  Áp dụng phụ thu lễ tết cho đặt phòng **Theo giờ (Hourly)**
                </label>
                <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={holidayForm.applyToOvernight === 'true'}
                    onChange={(e) => setHolidayForm({ ...holidayForm, applyToOvernight: e.target.checked ? 'true' : 'false' })}
                    className="rounded border-border bg-background text-primary"
                  />
                  Áp dụng phụ thu lễ tết cho đặt phòng **Qua đêm (Overnight)**
                </label>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-border mt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsHolidayOpen(false)}
                className="h-9 border-border text-foreground hover:bg-muted text-xs px-4"
              >
                Hủy
              </Button>
              <Button
                type="submit"
                className="h-9 bg-primary hover:bg-primary/90 text-primary-foreground text-xs px-5 font-semibold"
              >
                Lưu lại
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
