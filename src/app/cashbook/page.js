'use client';

import React, { useState, useEffect } from 'react';
import { useBranch } from '@/components/BranchContext';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, RefreshCw, Loader2, Trash2, ArrowUpRight, ArrowDownRight, Wallet, Filter, Calendar as CalendarIcon } from 'lucide-react';
import { toast } from 'sonner';

const CATEGORIES = {
  Receipt: [
    { value: 'RoomPayment', label: 'Thu tiền phòng' },
    { value: 'ExtraService', label: 'Thu dịch vụ phụ thu' },
    { value: 'Other', label: 'Thu nhập khác' }
  ],
  Payment: [
    { value: 'Laundry', label: 'Chi giặt là' },
    { value: 'Utilities', label: 'Chi điện, nước, internet' },
    { value: 'CleaningSupplies', label: 'Chi mua đồ dùng dọn dẹp' },
    { value: 'Refund', label: 'Chi hoàn tiền khách' },
    { value: 'Other', label: 'Chi phí khác' }
  ]
};

const ALL_CATEGORY_LABELS = {
  RoomPayment: 'Thu tiền phòng',
  ExtraService: 'Thu dịch vụ phụ thu',
  Laundry: 'Chi giặt là',
  Utilities: 'Chi điện, nước, internet',
  CleaningSupplies: 'Chi mua đồ dọn dẹp',
  Refund: 'Chi hoàn tiền khách',
  Other: 'Khác'
};

export default function CashBookPage() {
  const { selectedBranch, user, branches } = useBranch();

  // Data states
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  // Filter states
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');

  // Form states
  const [voucherType, setVoucherType] = useState('Receipt');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('');
  const [notes, setNotes] = useState('');
  const [branchId, setBranchId] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchCashBook = async () => {
    setIsRefreshing(true);
    try {
      const activeBranch = user?.role === 'Admin' ? selectedBranch : user?.branchId;
      let url = `/api/cashbook?branchId=${activeBranch === 'all' ? '' : activeBranch}`;
      
      if (startDate) url += `&startDate=${startDate}`;
      if (endDate) url += `&endDate=${endDate}`;

      const res = await fetch(url);
      const data = await res.json();
      if (Array.isArray(data)) {
        setEntries(data);
      }
    } catch (e) {
      console.error('Failed to load cashbook:', e);
      toast.error('Lỗi khi tải dữ liệu sổ quỹ.');
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchCashBook();

    const handleBranchChange = () => {
      setLoading(true);
      fetchCashBook();
    };
    window.addEventListener('branchChanged', handleBranchChange);
    return () => window.removeEventListener('branchChanged', handleBranchChange);
  }, [selectedBranch, user, startDate, endDate]);

  // Set default form values when opening dialog
  useEffect(() => {
    if (isDialogOpen) {
      const activeBranch = user?.role === 'Admin' ? selectedBranch : user?.branchId;
      setBranchId(activeBranch === 'all' ? '' : String(activeBranch));
      setVoucherType('Receipt');
      setAmount('');
      setCategory('');
      setNotes('');
    }
  }, [isDialogOpen, selectedBranch, user]);

  // Update default category when voucher type changes
  useEffect(() => {
    if (voucherType) {
      setCategory(CATEGORIES[voucherType][0].value);
    }
  }, [voucherType]);

  const handleCreateEntry = async (e) => {
    e.preventDefault();
    if (!branchId || !amount || !category) {
      toast.error('Vui lòng nhập đầy đủ thông tin bắt buộc.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/cashbook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          BranchId: Number(branchId),
          VoucherType: voucherType,
          Amount: Number(amount),
          Category: category,
          Notes: notes
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      toast.success('Ghi nhận phiếu thu chi thành công!');
      setIsDialogOpen(false);
      fetchCashBook();
    } catch (e) {
      toast.error(e.message || 'Lỗi thêm phiếu thu chi.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteEntry = async (id) => {
    if (!confirm('Bạn có chắc muốn xóa phiếu thu chi này? Thao tác này không thể hoàn tác.')) return;

    try {
      const res = await fetch(`/api/cashbook?id=${id}`, {
        method: 'DELETE'
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      toast.success('Xóa phiếu thu chi thành công!');
      fetchCashBook();
    } catch (e) {
      toast.error(e.message || 'Lỗi xóa phiếu thu chi.');
    }
  };

  // Calculations
  const filteredEntries = entries.filter(item => {
    const matchesType = typeFilter === 'all' || item.VoucherType === typeFilter;
    const matchesCategory = categoryFilter === 'all' || item.Category === categoryFilter;
    return matchesType && matchesCategory;
  });

  const totalReceipts = filteredEntries
    .filter(item => item.VoucherType === 'Receipt')
    .reduce((sum, item) => sum + Number(item.Amount), 0);

  const totalPayments = filteredEntries
    .filter(item => item.VoucherType === 'Payment')
    .reduce((sum, item) => sum + Number(item.Amount), 0);

  const netBalance = totalReceipts - totalPayments;

  if (loading) {
    return (
      <div className="py-20 flex flex-col items-center justify-center text-foreground">
        <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
        <p className="text-xs text-muted-foreground">Đang tải sổ quỹ thu chi...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Title Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Sổ quỹ Thu Chi</h1>
          <p className="text-sm text-muted-foreground mt-1">Quản lý dòng tiền mặt, các khoản thu phí khách hàng & chi phí vận hành</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchCashBook}
            disabled={isRefreshing}
            className="border-border hover:bg-muted text-muted-foreground hover:text-foreground"
          >
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          </Button>

          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-xs">
                <Plus className="h-4 w-4 mr-1.5" />
                Lập phiếu Thu / Chi
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-muted border-border text-foreground p-6 max-w-[450px]">
              <DialogHeader>
                <DialogTitle className="text-base text-foreground font-bold flex items-center gap-2">
                  <Wallet className="h-5 w-5 text-primary" />
                  Lập phiếu Thu / Chi mới
                </DialogTitle>
              </DialogHeader>

              <form onSubmit={handleCreateEntry} className="space-y-4 mt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs text-muted-foreground font-semibold">Loại phiếu *</label>
                    <Select value={voucherType} onValueChange={setVoucherType}>
                      <SelectTrigger className="bg-background border-border text-foreground text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-muted border-border text-foreground text-xs">
                        <SelectItem value="Receipt">📈 Phiếu Thu (Thu tiền)</SelectItem>
                        <SelectItem value="Payment">📉 Phiếu Chi (Chi tiền)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs text-muted-foreground font-semibold">Nhóm danh mục *</label>
                    <Select value={category} onValueChange={setCategory}>
                      <SelectTrigger className="bg-background border-border text-foreground text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-muted border-border text-foreground text-xs">
                        {CATEGORIES[voucherType]?.map((cat) => (
                          <SelectItem key={cat.value} value={cat.value}>
                            {cat.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs text-muted-foreground font-semibold">Số tiền (VND) *</label>
                    <Input
                      type="number"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      placeholder="Nhập số tiền"
                      className="bg-background border-border text-foreground text-xs font-mono"
                      required
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs text-muted-foreground font-semibold">Chi nhánh *</label>
                    <Select value={branchId} onValueChange={setBranchId} disabled={user?.role !== 'Admin'}>
                      <SelectTrigger className="bg-background border-border text-foreground text-xs">
                        <SelectValue placeholder="Chọn chi nhánh" />
                      </SelectTrigger>
                      <SelectContent className="bg-muted border-border text-foreground text-xs">
                        {branches.map((b) => (
                          <SelectItem key={b.Id} value={String(b.Id)}>
                            {b.BranchName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs text-muted-foreground font-semibold">Ghi chú phiếu *</label>
                  <Input
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Ví dụ: Mua nước lau sàn Bungalow A, Thu dọn phụ phí xe máy..."
                    className="bg-background border-border text-foreground text-xs"
                    required
                  />
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-border">
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)} className="border-border text-foreground hover:bg-muted text-xs">
                    Hủy
                  </Button>
                  <Button type="submit" className="bg-primary hover:bg-primary/90 text-primary-foreground text-xs" disabled={isSubmitting}>
                    {isSubmitting ? 'Đang lưu...' : 'Lưu phiếu'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Financial Summaries Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border-emerald-500/10 bg-emerald-950/10 backdrop-blur-sm shadow-md">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold text-emerald-400 uppercase tracking-wide flex justify-between items-center">
              <span>Tổng thu (Receipts)</span>
              <ArrowUpRight className="h-4 w-4 text-emerald-400" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-mono font-bold text-foreground">
              +{totalReceipts.toLocaleString('vi-VN')}đ
            </div>
            <p className="text-[10px] text-muted-foreground mt-1">Dòng tiền thực thu trong kỳ</p>
          </CardContent>
        </Card>

        <Card className="border-rose-500/10 bg-rose-950/10 backdrop-blur-sm shadow-md">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold text-rose-400 uppercase tracking-wide flex justify-between items-center">
              <span>Tổng chi (Payments)</span>
              <ArrowDownRight className="h-4 w-4 text-rose-400" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-mono font-bold text-foreground">
              -{totalPayments.toLocaleString('vi-VN')}đ
            </div>
            <p className="text-[10px] text-muted-foreground mt-1">Dòng tiền chi trả, hoàn tiền vận hành</p>
          </CardContent>
        </Card>

        <Card className="border-primary/10 bg-primary/5 backdrop-blur-sm shadow-md">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold text-primary uppercase tracking-wide flex justify-between items-center">
              <span>Tồn quỹ quỹ mặt (Net Balance)</span>
              <Wallet className="h-4 w-4 text-primary" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-mono font-bold ${netBalance >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
              {netBalance >= 0 ? '+' : ''}{netBalance.toLocaleString('vi-VN')}đ
            </div>
            <p className="text-[10px] text-muted-foreground mt-1">Tiền mặt tồn trong két sắt dự kiến</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters Search & Date picker */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 bg-card p-4 rounded-xl border border-border">
        <div className="space-y-1">
          <label className="text-[10px] text-muted-foreground font-semibold flex items-center gap-1">
            <CalendarIcon className="h-3 w-3" />
            Từ ngày
          </label>
          <Input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="bg-background border-border text-foreground text-xs h-9"
          />
        </div>

        <div className="space-y-1">
          <label className="text-[10px] text-muted-foreground font-semibold flex items-center gap-1">
            <CalendarIcon className="h-3 w-3" />
            Đến ngày
          </label>
          <Input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="bg-background border-border text-foreground text-xs h-9"
          />
        </div>

        <div className="space-y-1">
          <label className="text-[10px] text-muted-foreground font-semibold flex items-center gap-1">
            <Filter className="h-3 w-3" />
            Loại phiếu
          </label>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="bg-background border-border text-foreground text-xs h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-muted border-border text-foreground text-xs">
              <SelectItem value="all">Tất cả loại phiếu</SelectItem>
              <SelectItem value="Receipt">📈 Phiếu thu (Thu tiền)</SelectItem>
              <SelectItem value="Payment">📉 Phiếu chi (Chi tiền)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1">
          <label className="text-[10px] text-muted-foreground font-semibold flex items-center gap-1">
            <Filter className="h-3 w-3" />
            Danh mục thu chi
          </label>
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="bg-background border-border text-foreground text-xs h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-muted border-border text-foreground text-xs">
              <SelectItem value="all">Tất cả danh mục</SelectItem>
              <SelectItem value="RoomPayment">Thu tiền phòng</SelectItem>
              <SelectItem value="ExtraService">Thu dịch vụ phụ thu</SelectItem>
              <SelectItem value="Laundry">Chi giặt là</SelectItem>
              <SelectItem value="Utilities">Chi điện, nước, internet</SelectItem>
              <SelectItem value="CleaningSupplies">Chi mua đồ dọn dẹp</SelectItem>
              <SelectItem value="Refund">Chi hoàn tiền khách</SelectItem>
              <SelectItem value="Other">Danh mục khác</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Ledger Table logs */}
      <Card className="border-border bg-card overflow-x-auto rounded-xl">
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow className="border-border">
                <TableHead className="text-muted-foreground text-xs">Mã phiếu</TableHead>
                <TableHead className="text-muted-foreground text-xs">Thời gian lập</TableHead>
                <TableHead className="text-muted-foreground text-xs">Phân loại</TableHead>
                <TableHead className="text-muted-foreground text-xs">Danh mục</TableHead>
                <TableHead className="text-muted-foreground text-xs text-right">Số tiền</TableHead>
                <TableHead className="text-muted-foreground text-xs">Người thực hiện</TableHead>
                <TableHead className="text-muted-foreground text-xs">Ghi chú lý do</TableHead>
                {user?.role === 'Admin' && (
                  <TableHead className="text-muted-foreground text-xs text-right w-16">Thao tác</TableHead>
                )}
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredEntries.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={user?.role === 'Admin' ? 8 : 7} className="text-center py-12 text-xs text-muted-foreground">
                    Không có phiếu thu chi nào được ghi nhận trong thời gian này.
                  </TableCell>
                </TableRow>
              ) : (
                filteredEntries.map((item) => {
                  const isReceipt = item.VoucherType === 'Receipt';
                  const dateFormatted = new Date(item.VoucherDate).toLocaleString('vi-VN', {
                    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
                  });
                  return (
                    <TableRow key={item.Id} className="border-border hover:bg-muted/50">
                      <TableCell className="font-mono text-xs text-muted-foreground font-semibold">
                        #{item.Id}
                      </TableCell>
                      <TableCell className="text-xs text-foreground font-mono">
                        {dateFormatted}
                      </TableCell>
                      <TableCell>
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded ${
                          isReceipt 
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                            : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                        }`}>
                          {isReceipt ? '📈 Phiếu Thu' : '📉 Phiếu Chi'}
                        </span>
                      </TableCell>
                      <TableCell className="text-xs text-foreground font-medium">
                        {ALL_CATEGORY_LABELS[item.Category] || item.Category}
                      </TableCell>
                      <TableCell className={`text-xs text-right font-mono font-bold ${
                        isReceipt ? 'text-emerald-400' : 'text-rose-400'
                      }`}>
                        {isReceipt ? '+' : '-'}{Number(item.Amount).toLocaleString('vi-VN')}đ
                      </TableCell>
                      <TableCell className="text-xs text-foreground">
                        {item.HandlerName}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground italic max-w-xs truncate" title={item.Notes}>
                        {item.Notes}
                      </TableCell>
                      {user?.role === 'Admin' && (
                        <TableCell className="text-right">
                          {/* Sync payments should ideally not be deleted directly, but let's allow Admin to purge if necessary */}
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteEntry(item.Id)}
                            className="h-8 w-8 text-muted-foreground hover:text-rose-500 hover:bg-rose-500/10 rounded-md"
                            title="Xóa phiếu thu chi"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </TableCell>
                      )}
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
