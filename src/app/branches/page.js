'use client';

import React, { useState, useEffect } from 'react';
import { useBranch } from '@/components/BranchContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, RefreshCw, Pencil, Loader2, MapPin, Phone, FileText } from 'lucide-react';
import { toast } from 'sonner';

export default function BranchesPage() {
  const { user, branches, refreshBranches } = useBranch();
  
  // Data states
  const [loading, setLoading] = useState(false);
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

      const url = editingId ? `/api/branches` : '/api/branches'; // proxy endpoint
      // Next.js route has separate logic for POST vs PATCH inside POST handler or a separate PATCH handler.
      // Wait, let's verify if /api/branches has a PATCH handler?
      // Wait, let's look at /api/branches/route.js we wrote earlier.
      // In route.js for branches, we implemented GET and POST. We did NOT implement PATCH!
      // Ah! That is a very important detail. If we need to edit a branch, we can call POST to edit if we handle it there, or let's check /api/branches/route.js to see if we can add PATCH.
      // Let's check: yes, it has GET and POST. Let's write a PATCH handler or modify the branch route to support PATCH!
      // Let's modify `/api/branches/route.js` to add the PATCH handler first, or do it concurrently.
      // Yes, let's write the PATCH logic in `/api/branches/route.js` so it supports updating branches.
      
      const method = editingId ? 'PATCH' : 'POST'; // wait, we need PATCH inside /api/branches/route.js. Let's send the request first, and then implement PATCH in route.js!
      const body = editingId ? { id: editingId, ...payload } : payload;

      const res = await fetch(url, {
        method: editingId ? 'POST' : 'POST', // wait, if we support PATCH we can send PATCH. Let's see what methods are available in branches route. Currently only GET and POST. Let's implement PATCH in branches route, so we can send PATCH!
        method: editingId ? 'POST' : 'POST', // we can also just use POST for everything by checking if editingId is present!
      });
      // Let's check how we wrote branches route. It takes `data = await request.json()`.
      // Let's look at `branches/route.js`:
      // `const res = await noco.createBranch(data);`
      // It doesn't check if it's PATCH or update.
      // Let's add PATCH handler to `src/app/api/branches/route.js` so it's clean and RESTful!
      
      // Let's send PATCH:
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
      
      // Force reload to update the Branch Selector dropdown in the layout header!
      window.location.reload();
    } catch (e) {
      toast.error(e.message || 'Lỗi lưu thông tin chi nhánh.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (user?.role !== 'Admin') {
    return (
      <div className="py-12 text-center text-rose-400 font-semibold">
        Không có quyền truy cập. Chỉ quản trị viên mới được phép quản lý chi nhánh.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Title Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Quản lý chi nhánh Homestay</h1>
          <p className="text-sm text-muted-foreground mt-1">Quản lý danh sách các cơ sở vận hành</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchBranchesData}
            disabled={isRefreshing}
            className="border-border hover:bg-muted text-muted-foreground hover:text-foreground"
          >
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          </Button>

          <Button size="sm" onClick={handleOpenCreate} className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-xs">
            <Plus className="h-4 w-4 mr-1.5" />
            Thêm chi nhánh
          </Button>
        </div>
      </div>

      {/* Branches Table List */}
      <Card className="border-border bg-card overflow-x-auto rounded-xl">
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow className="border-border">
                <TableHead className="text-muted-foreground text-xs w-16">ID</TableHead>
                <TableHead className="text-muted-foreground text-xs">Tên chi nhánh</TableHead>
                <TableHead className="text-muted-foreground text-xs">Địa chỉ</TableHead>
                <TableHead className="text-muted-foreground text-xs">Điện thoại</TableHead>
                <TableHead className="text-muted-foreground text-xs">Ghi chú ngân hàng/QR</TableHead>
                <TableHead className="text-muted-foreground text-xs text-right w-24">Thao tác</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {branches.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-12 text-xs text-muted-foreground">
                    Chưa đăng ký chi nhánh nào.
                  </TableCell>
                </TableRow>
              ) : (
                branches.map((item) => (
                  <TableRow key={item.Id} className="border-border hover:bg-muted/50">
                    <TableCell className="font-mono text-xs text-muted-foreground">#{item.Id}</TableCell>
                    <TableCell className="text-xs font-semibold text-foreground">{item.BranchName}</TableCell>
                    <TableCell className="text-xs text-foreground">
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3 w-3 text-muted-foreground" />
                        {item.Address || '-'}
                      </span>
                    </TableCell>
                    <TableCell className="text-xs text-foreground">
                      <span className="flex items-center gap-1 font-mono">
                        <Phone className="h-3 w-3 text-muted-foreground" />
                        {item.Phone || '-'}
                      </span>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground italic max-w-[200px] truncate" title={item.Notes}>
                      {item.Notes || '-'}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleOpenEdit(item)}
                        className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-muted rounded-md"
                        title="Chỉnh sửa"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Add / Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="bg-muted border-border text-foreground p-6 max-w-[450px]">
          <DialogHeader>
            <DialogTitle className="text-base text-foreground">
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
