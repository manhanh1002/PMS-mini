'use client';

import React, { useState, useEffect } from 'react';
import { useBranch } from '@/components/BranchContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, RefreshCw, Pencil, Trash2, Loader2, Tag, Percent, Banknote, Calendar, CheckCircle2, XCircle } from 'lucide-react';
import { toast } from 'sonner';

export default function PromotionsPage() {
  const { user } = useBranch();
  
  // Data states
  const [promotions, setPromotions] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  // Form states
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({
    Code: '', Name: '', Type: 'Percentage', Value: '', MaxDiscount: '', 
    MinNights: '', RoomTypes: [], ValidFrom: '', ValidTo: '', UsageLimit: '', Status: 'Active',
    ApplyScope: 'RoomOnly', FreeServiceId: 'none'
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchPromotions = async (showRefreshIndicator = false) => {
    if (showRefreshIndicator) {
      setIsRefreshing(true);
    } else {
      setLoading(true);
    }
    try {
      const [promoRes, roomRes, serviceRes] = await Promise.all([
        fetch('/api/promotions'),
        fetch('/api/rooms'),
        fetch('/api/services')
      ]);

      if (!promoRes.ok) throw new Error('Không thể lấy danh sách khuyến mãi');
      
      const [promoData, roomData, serviceData] = await Promise.all([
        promoRes.json(),
        roomRes.ok ? roomRes.json() : Promise.resolve([]),
        serviceRes.ok ? serviceRes.json() : Promise.resolve([])
      ]);

      setPromotions(promoData);
      setRooms(Array.isArray(roomData) ? roomData : []);
      setServices(Array.isArray(serviceData) ? serviceData : []);
    } catch (e) {
      toast.error(e.message || 'Lỗi tải danh sách khuyến mãi.');
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    if (user?.role === 'Admin') {
      fetchPromotions();
    }
  }, [user]);

  const handleOpenCreate = () => {
    setEditingId(null);
    setEditForm({
      Code: '', Name: '', Type: 'Percentage', Value: '', MaxDiscount: '', 
      MinNights: '', RoomTypes: [], ValidFrom: '', ValidTo: '', UsageLimit: '', Status: 'Active',
      ApplyScope: 'RoomOnly', FreeServiceId: 'none'
    });
    setIsDialogOpen(true);
  };

  const handleOpenEdit = (item) => {
    setEditingId(item.Id);
    setEditForm({
      Code: item.Code, Name: item.Name, Type: item.Type, 
      Value: item.Value || '', MaxDiscount: item.MaxDiscount || '', 
      MinNights: item.MinNights || '', RoomTypes: item.RoomTypes ? item.RoomTypes.split(',').map(r => r.trim()) : [], 
      ValidFrom: item.ValidFrom ? item.ValidFrom.split(' ')[0] : '', 
      ValidTo: item.ValidTo ? item.ValidTo.split(' ')[0] : '', 
      UsageLimit: item.UsageLimit || '', Status: item.Status || 'Active',
      ApplyScope: item.ApplyScope || 'RoomOnly',
      FreeServiceId: item.FreeServiceId ? String(item.FreeServiceId) : 'none'
    });
    setIsDialogOpen(true);
  };

  const handleGenerateCode = () => {
    const randomCode = Math.random().toString(36).substring(2, 10).toUpperCase();
    setEditForm({ ...editForm, Code: randomCode });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!editForm.Code.trim() || !editForm.Name.trim() || !editForm.Value) {
      toast.error('Vui lòng nhập đầy đủ mã, tên và mức giảm.');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        Code: editForm.Code.trim().toUpperCase(),
        Name: editForm.Name.trim(),
        Type: editForm.Type,
        Value: Number(editForm.Value),
        MaxDiscount: editForm.MaxDiscount ? Number(editForm.MaxDiscount) : null,
        MinNights: editForm.MinNights ? Number(editForm.MinNights) : null,
        RoomTypes: editForm.RoomTypes.length > 0 ? editForm.RoomTypes.join(',') : null,
        ValidFrom: editForm.ValidFrom ? new Date(editForm.ValidFrom).toISOString() : null,
        ValidTo: editForm.ValidTo ? new Date(editForm.ValidTo).toISOString() : null,
        UsageLimit: editForm.UsageLimit ? Number(editForm.UsageLimit) : null,
        Status: editForm.Status,
        ApplyScope: editForm.ApplyScope,
        FreeServiceId: editForm.FreeServiceId !== 'none' ? Number(editForm.FreeServiceId) : null
      };

      const method = editingId ? 'PATCH' : 'POST';
      const body = editingId ? { id: editingId, ...payload } : payload;

      const response = await fetch('/api/promotions', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Lỗi lưu thông tin');

      toast.success(editingId ? 'Cập nhật khuyến mãi thành công!' : 'Tạo khuyến mãi thành công!');
      setIsDialogOpen(false);
      fetchPromotions();
    } catch (e) {
      toast.error(e.message || 'Lỗi lưu khuyến mãi.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa mã khuyến mãi này?')) return;
    try {
      const response = await fetch(`/api/promotions?id=${id}`, {
        method: 'DELETE',
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Lỗi xóa mã');
      toast.success('Xóa khuyến mãi thành công!');
      fetchPromotions();
    } catch (e) {
      toast.error(e.message || 'Không thể xóa khuyến mãi.');
    }
  };

  if (user && user.role !== 'Admin') {
    return (
      <div className="py-12 text-center text-rose-400 font-semibold">
        Không có quyền truy cập. Chỉ quản trị viên mới được quản lý khuyến mãi.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Tag className="h-6 w-6 text-primary" />
            Quản lý Khuyến mãi / Voucher
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Phát hành mã giảm giá, voucher áp dụng khi đặt phòng.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => fetchPromotions(true)} disabled={isRefreshing || loading} className="border-border hover:bg-muted text-muted-foreground hover:text-foreground">
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          </Button>
          <Button size="sm" onClick={handleOpenCreate} className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-xs">
            <Plus className="h-4 w-4 mr-1.5" /> Thêm Mã Khuyến Mãi
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground gap-2">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <span className="text-xs">Đang tải danh sách khuyến mãi...</span>
        </div>
      ) : (
        <Card className="border-border bg-card overflow-x-auto rounded-xl">
          <CardContent className="p-0">
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow className="border-border hover:bg-transparent">
                  <TableHead className="text-muted-foreground text-xs w-24">Mã Code</TableHead>
                  <TableHead className="text-muted-foreground text-xs">Tên CTKM</TableHead>
                  <TableHead className="text-muted-foreground text-xs">Giảm giá</TableHead>
                  <TableHead className="text-muted-foreground text-xs">Thời hạn</TableHead>
                  <TableHead className="text-muted-foreground text-xs">Lượt dùng</TableHead>
                  <TableHead className="text-muted-foreground text-xs text-center">Trạng thái</TableHead>
                  <TableHead className="text-muted-foreground text-xs text-right w-24">Thao tác</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {promotions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-12 text-xs text-muted-foreground">
                      Chưa có mã khuyến mãi nào.
                    </TableCell>
                  </TableRow>
                ) : (
                  promotions.map((item) => (
                    <TableRow key={item.Id} className="border-border hover:bg-muted/50">
                      <TableCell className="text-xs font-mono font-bold text-primary">
                        <span className="px-2 py-0.5 rounded bg-primary/10 border border-primary/20">{item.Code}</span>
                      </TableCell>
                      <TableCell className="text-xs font-semibold text-foreground">{item.Name}</TableCell>
                      <TableCell className="text-xs text-foreground">
                        {item.Type === 'Percentage' ? `${item.Value}%` : `${Number(item.Value).toLocaleString('vi-VN')}đ`}
                        {item.Type === 'Percentage' && item.MaxDiscount && <span className="text-muted-foreground text-[10px] block">Tối đa: {Number(item.MaxDiscount).toLocaleString('vi-VN')}đ</span>}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {item.ValidFrom ? new Date(item.ValidFrom).toLocaleDateString('vi-VN') : '---'} - {item.ValidTo ? new Date(item.ValidTo).toLocaleDateString('vi-VN') : '---'}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {item.UsedCount || 0} / {item.UsageLimit || '∞'}
                      </TableCell>
                      <TableCell className="text-center">
                        {item.Status === 'Active' ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-medium text-emerald-400 bg-emerald-400/10 px-2 py-1 rounded-full"><CheckCircle2 className="w-3 h-3"/> Đang mở</span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10px] font-medium text-rose-400 bg-rose-400/10 px-2 py-1 rounded-full"><XCircle className="w-3 h-3"/> Đã đóng</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1.5">
                          <Button variant="ghost" size="icon" onClick={() => handleOpenEdit(item)} className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-muted rounded-md"><Pencil className="h-3.5 w-3.5" /></Button>
                          <Button variant="ghost" size="icon" onClick={() => handleDelete(item.Id)} className="h-8 w-8 text-rose-500 hover:text-rose-400 hover:bg-rose-950/20 rounded-md"><Trash2 className="h-3.5 w-3.5" /></Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="bg-muted border-border text-foreground p-6 sm:max-w-[850px] w-[95vw] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base text-foreground">{editingId ? 'Chỉnh sửa mã khuyến mãi' : 'Tạo mã khuyến mãi mới'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 mt-2">
            <div className="grid grid-cols-12 gap-4">
              <div className="col-span-4 space-y-1.5">
                <label className="text-xs text-muted-foreground font-semibold flex justify-between">Mã Voucher *
                  {!editingId && <button type="button" onClick={handleGenerateCode} className="text-primary hover:underline">Tạo ngẫu nhiên</button>}
                </label>
                <Input value={editForm.Code} onChange={(e) => setEditForm({...editForm, Code: e.target.value})} placeholder="SUMMER26" className="bg-background border-border text-foreground text-xs font-mono uppercase h-8" required disabled={!!editingId} />
              </div>
              <div className="col-span-8 space-y-1.5">
                <label className="text-xs text-muted-foreground font-semibold">Tên chương trình *</label>
                <Input value={editForm.Name} onChange={(e) => setEditForm({...editForm, Name: e.target.value})} placeholder="VD: Khuyến mãi Hè" className="bg-background border-border text-foreground text-xs h-8" required />
              </div>
            </div>

            <div className="grid grid-cols-12 gap-4">
              <div className="col-span-4 space-y-1.5">
                <label className="text-xs text-muted-foreground font-semibold">Loại giảm giá *</label>
                <Select value={editForm.Type} onValueChange={(v) => setEditForm({...editForm, Type: v, Value: '', MaxDiscount: ''})}>
                  <SelectTrigger className="bg-background border-border text-foreground text-xs h-8"><SelectValue/></SelectTrigger>
                  <SelectContent className="bg-muted border-border text-foreground">
                    <SelectItem value="Percentage">Theo phần trăm (%)</SelectItem>
                    <SelectItem value="FixedAmount">Tiền mặt (VND)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-4 space-y-1.5">
                <label className="text-xs text-muted-foreground font-semibold">Mức giảm *</label>
                <div className="relative">
                  {editForm.Type === 'Percentage' ? <Percent className="absolute left-2.5 top-2 h-3.5 w-3.5 text-muted-foreground" /> : <Banknote className="absolute left-2.5 top-2 h-3.5 w-3.5 text-muted-foreground" />}
                  <Input 
                    type="text" 
                    value={editForm.Value ? editForm.Value.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".") : ""} 
                    onChange={(e) => {
                      const val = e.target.value.replace(/\./g, '').replace(/[^0-9]/g, '');
                      setEditForm({...editForm, Value: val});
                    }} 
                    placeholder={editForm.Type === 'Percentage' ? "10" : "50.000"} 
                    className="pl-8 bg-background border-border text-foreground text-xs h-8" 
                    required 
                  />
                </div>
              </div>
              <div className="col-span-4 space-y-1.5">
                {editForm.Type === 'Percentage' && (
                  <>
                    <label className="text-xs text-muted-foreground font-semibold">Giảm tối đa (VND)</label>
                    <Input 
                      type="text" 
                      value={editForm.MaxDiscount ? editForm.MaxDiscount.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".") : ""} 
                      onChange={(e) => {
                        const val = e.target.value.replace(/\./g, '').replace(/[^0-9]/g, '');
                        setEditForm({...editForm, MaxDiscount: val});
                      }} 
                      placeholder="Không giới hạn" 
                      className="bg-background border-border text-foreground text-xs h-8" 
                    />
                  </>
                )}
              </div>
            </div>

            <div className="grid grid-cols-4 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs text-muted-foreground font-semibold">Từ ngày</label>
                <Input type="date" value={editForm.ValidFrom} onChange={(e) => setEditForm({...editForm, ValidFrom: e.target.value})} className="bg-background border-border text-foreground text-xs h-8" />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs text-muted-foreground font-semibold">Đến ngày</label>
                <Input type="date" value={editForm.ValidTo} onChange={(e) => setEditForm({...editForm, ValidTo: e.target.value})} className="bg-background border-border text-foreground text-xs h-8" />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs text-muted-foreground font-semibold">Tối thiểu (Đêm)</label>
                <Input type="number" value={editForm.MinNights} onChange={(e) => setEditForm({...editForm, MinNights: e.target.value})} placeholder="1, 2..." className="bg-background border-border text-foreground text-xs h-8" />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs text-muted-foreground font-semibold">Giới hạn lượt</label>
                <Input type="number" value={editForm.UsageLimit} onChange={(e) => setEditForm({...editForm, UsageLimit: e.target.value})} placeholder="100" className="bg-background border-border text-foreground text-xs h-8" />
              </div>
            </div>

            <div className="grid grid-cols-12 gap-4 pt-3 border-t border-border mt-2">
              <div className="col-span-4 space-y-1.5">
                <label className="text-xs text-muted-foreground font-semibold">Trạng thái</label>
                <Select value={editForm.Status} onValueChange={(v) => setEditForm({...editForm, Status: v})}>
                  <SelectTrigger className="bg-background border-border text-foreground text-xs h-8"><SelectValue/></SelectTrigger>
                  <SelectContent className="bg-muted border-border text-foreground">
                    <SelectItem value="Active">Đang mở (Active)</SelectItem>
                    <SelectItem value="Expired">Đã đóng / Hết hạn</SelectItem>
                    <SelectItem value="Disabled">Tạm ngưng (Disabled)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-4 space-y-1.5">
                <label className="text-xs text-muted-foreground font-semibold">Phạm vi giảm giá</label>
                <Select value={editForm.ApplyScope} onValueChange={(v) => setEditForm({...editForm, ApplyScope: v})}>
                  <SelectTrigger className="bg-background border-border text-foreground text-xs w-full [&>span]:truncate h-8"><SelectValue/></SelectTrigger>
                  <SelectContent className="bg-muted border-border text-foreground text-xs">
                    <SelectItem value="RoomOnly">Chỉ giảm tiền phòng</SelectItem>
                    <SelectItem value="All">Giảm tổng hóa đơn (Gồm Dịch vụ)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-4 space-y-1.5">
                <label className="text-xs text-muted-foreground font-semibold">Tặng kèm dịch vụ (0đ)</label>
                <Select value={editForm.FreeServiceId} onValueChange={(v) => setEditForm({...editForm, FreeServiceId: v})}>
                  <SelectTrigger className="bg-background border-border text-foreground text-xs w-full [&>span]:truncate h-8"><SelectValue/></SelectTrigger>
                  <SelectContent className="bg-muted border-border text-foreground text-xs">
                    <SelectItem value="none">-- Không tặng kèm --</SelectItem>
                    {services.map(s => (
                      <SelectItem key={s.Id} value={String(s.Id)}>{s.ServiceName}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5 border-t border-border pt-3 mt-2">
              <label className="text-xs text-muted-foreground font-semibold mb-1 block">Áp dụng cho các loại phòng (để trống áp dụng tất cả)</label>
              <div className="flex flex-wrap gap-2">
                {[...new Set(rooms.map(r => r.RoomType))].filter(Boolean).map(type => (
                  <label key={type} className="flex items-center gap-1.5 text-xs bg-background px-2 py-1 rounded border border-border hover:bg-muted cursor-pointer">
                    <input 
                      type="checkbox" 
                      className="rounded border-neutral-700 bg-muted text-primary"
                      checked={editForm.RoomTypes.includes(type)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setEditForm({...editForm, RoomTypes: [...editForm.RoomTypes, type]});
                        } else {
                          setEditForm({...editForm, RoomTypes: editForm.RoomTypes.filter(t => t !== type)});
                        }
                      }}
                    />
                    {type}
                  </label>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-border mt-2">
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)} className="h-8 border-border text-foreground hover:bg-muted text-xs">Hủy</Button>
              <Button type="submit" className="h-8 bg-primary hover:bg-primary/90 text-primary-foreground text-xs px-4" disabled={isSubmitting}>{isSubmitting ? 'Đang lưu...' : 'Lưu lại'}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
