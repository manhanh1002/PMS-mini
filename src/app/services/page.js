'use client';

import React, { useState, useEffect } from 'react';
import { useBranch } from '@/components/BranchContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, RefreshCw, Pencil, Trash2, Utensils, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export default function ServicesPage() {
  const { selectedBranch, user, branches } = useBranch();
  
  // Data states
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  // Form states (creates & updates)
  const [editingId, setEditingId] = useState(null);
  const [serviceName, setServiceName] = useState('');
  const [price, setPrice] = useState('');
  const [category, setCategory] = useState('Food');
  const [branchId, setBranchId] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchServices = async () => {
    setIsRefreshing(true);
    try {
      const activeBranch = user?.role === 'Admin' ? selectedBranch : user?.branchId;
      const branchQuery = activeBranch === 'all' ? '' : `?branchId=${activeBranch}`;

      const res = await fetch(`/api/services${branchQuery}`);
      const data = await res.json();
      if (Array.isArray(data)) setServices(data);
    } catch (e) {
      console.error('Failed to load services:', e);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchServices();

    // Listen for branch changes
    const handleBranchChange = () => {
      setLoading(true);
      fetchServices();
    };
    window.addEventListener('branchChanged', handleBranchChange);
    return () => window.removeEventListener('branchChanged', handleBranchChange);
  }, [selectedBranch, user]);

  const handleOpenCreate = () => {
    setEditingId(null);
    setServiceName('');
    setPrice('');
    setCategory('Food');
    const activeBranch = user?.role === 'Admin' ? selectedBranch : user?.branchId;
    setBranchId(activeBranch === 'all' ? '' : String(activeBranch));
    setIsDialogOpen(true);
  };

  const handleOpenEdit = (item) => {
    setEditingId(item.Id);
    setServiceName(item.ServiceName);
    setPrice(item.Price);
    setCategory(item.Category || 'Food');
    setBranchId(item.BranchId ? String(item.BranchId) : '');
    setIsDialogOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!serviceName || !price) {
      toast.error('Vui lòng điền đầy đủ tên dịch vụ và đơn giá.');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        ServiceName: serviceName,
        Price: Number(price),
        Category: category,
        BranchId: branchId ? Number(branchId) : null
      };

      const url = editingId ? '/api/services' : '/api/services';
      const method = editingId ? 'PATCH' : 'POST';
      const body = editingId ? { id: editingId, ...payload } : payload;

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error);

      toast.success(editingId ? 'Cập nhật dịch vụ thành công!' : 'Thêm dịch vụ thành công!');
      setIsDialogOpen(false);
      fetchServices();
    } catch (e) {
      toast.error(e.message || 'Lỗi lưu thông tin dịch vụ.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Bạn có chắc muốn xóa dịch vụ này khỏi danh mục?')) return;
    try {
      const res = await fetch(`/api/services?id=${id}`, {
        method: 'DELETE'
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error);
      }
      toast.success('Xóa dịch vụ thành công!');
      fetchServices();
    } catch (e) {
      toast.error('Lỗi xóa dịch vụ: ' + e.message);
    }
  };

  const getCategoryLabel = (c) => {
    switch (c) {
      case 'Food': return 'Đồ ăn';
      case 'Beverage': return 'Thức uống';
      case 'Vehicle': return 'Cho thuê xe';
      case 'Laundry': return 'Giặt là';
      case 'Other': return 'Dịch vụ khác';
      default: return c;
    }
  };

  if (loading) {
    return (
      <div className="py-20 flex flex-col items-center justify-center text-foreground">
        <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
        <p className="text-xs text-muted-foreground">Đang tải danh mục dịch vụ...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Title Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Quản lý dịch vụ phụ thu</h1>
          <p className="text-sm text-muted-foreground mt-1">Danh mục sản phẩm, đồ uống và dịch vụ đi kèm</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchServices}
            disabled={isRefreshing}
            className="border-border hover:bg-muted text-muted-foreground hover:text-foreground"
          >
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          </Button>

          {user?.role === 'Admin' && (
            <Button size="sm" onClick={handleOpenCreate} className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-xs">
              <Plus className="h-4 w-4 mr-1.5" />
              Thêm dịch vụ
            </Button>
          )}
        </div>
      </div>

      {/* Services Table List */}
      <Card className="border-border bg-card overflow-x-auto rounded-xl">
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow className="border-border">
                <TableHead className="text-muted-foreground text-xs">Tên dịch vụ</TableHead>
                <TableHead className="text-muted-foreground text-xs">Phân loại</TableHead>
                <TableHead className="text-muted-foreground text-xs">Chi nhánh áp dụng</TableHead>
                <TableHead className="text-muted-foreground text-xs text-right">Đơn giá niêm yết</TableHead>
                {user?.role === 'Admin' && (
                  <TableHead className="text-muted-foreground text-xs text-right w-32">Thao tác</TableHead>
                )}
              </TableRow>
            </TableHeader>
            <TableBody>
              {services.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={user?.role === 'Admin' ? 5 : 4} className="text-center py-12 text-xs text-muted-foreground">
                    Chưa có dịch vụ phụ thu nào được đăng ký.
                  </TableCell>
                </TableRow>
              ) : (
                services.map((item) => {
                  const branchName = branches.find(b => b.Id === item.BranchId)?.BranchName || 'Toàn hệ thống (Global)';
                  return (
                    <TableRow key={item.Id} className="border-border hover:bg-muted/50">
                      <TableCell className="text-xs font-semibold text-foreground">
                        {item.ServiceName}
                      </TableCell>
                      <TableCell className="text-xs text-foreground">
                        {getCategoryLabel(item.Category)}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground italic">
                        {branchName}
                      </TableCell>
                      <TableCell className="text-xs text-right font-mono font-bold text-primary">
                        {Number(item.Price).toLocaleString('vi-VN')}đ
                      </TableCell>
                      
                      {user?.role === 'Admin' && (
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleOpenEdit(item)}
                              className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-muted rounded-md"
                              title="Sửa thông tin"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDelete(item.Id)}
                              className="h-8 w-8 text-muted-foreground hover:text-rose-500 hover:bg-rose-500/10 rounded-md"
                              title="Xóa dịch vụ"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
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

      {/* Create / Edit Dialog overlay */}
      {user?.role === 'Admin' && (
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="bg-muted border-border text-foreground p-6 max-w-[450px]">
            <DialogHeader>
              <DialogTitle className="text-base text-foreground">
                {editingId ? 'Chỉnh sửa dịch vụ' : 'Thêm dịch vụ mới'}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4 mt-4">
              <div className="space-y-1.5">
                <label className="text-xs text-muted-foreground font-semibold">Tên dịch vụ *</label>
                <Input
                  value={serviceName}
                  onChange={(e) => setServiceName(e.target.value)}
                  placeholder="Ví dụ: Giặt đồ sấy, Thuê xe tay ga, Nước suối..."
                  className="bg-background border-border text-foreground text-xs"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs text-muted-foreground font-semibold">Phân loại *</label>
                  <Select value={category} onValueChange={setCategory}>
                    <SelectTrigger className="bg-background border-border text-foreground text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-muted border-border text-foreground text-xs">
                      <SelectItem value="Food">Đồ ăn</SelectItem>
                      <SelectItem value="Beverage">Thức uống</SelectItem>
                      <SelectItem value="Vehicle">Cho thuê xe</SelectItem>
                      <SelectItem value="Laundry">Giặt là</SelectItem>
                      <SelectItem value="Other">Dịch vụ khác</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs text-muted-foreground font-semibold">Đơn giá niêm yết *</label>
                  <Input
                    type="number"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    placeholder="VND"
                    className="bg-background border-border text-foreground text-xs font-mono"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs text-muted-foreground font-semibold">Chi nhánh áp dụng</label>
                <Select value={branchId} onValueChange={setBranchId}>
                  <SelectTrigger className="bg-background border-border text-foreground text-xs">
                    <SelectValue placeholder="Toàn bộ hệ thống (Global)" />
                  </SelectTrigger>
                  <SelectContent className="bg-muted border-border text-foreground text-xs">
                    <SelectItem value="global_placeholder">Toàn bộ hệ thống (Global)</SelectItem>
                    {branches.map((b) => (
                      <SelectItem key={b.Id} value={String(b.Id)}>
                        {b.BranchName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-[10px] text-muted-foreground mt-1">
                  Để trống để áp dụng chung cho tất cả các chi nhánh homestay
                </p>
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
      )}
    </div>
  );
}
