'use client';

import React, { useState, useEffect } from 'react';
import { useBranch } from '@/components/BranchContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Plus, RefreshCw, Pencil, Trash2, Loader2, Tag, FileText, Globe } from 'lucide-react';
import { toast } from 'sonner';

export default function BookingSourcesPage() {
  const { user } = useBranch();
  
  // Data states
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
    if (user?.role === 'Admin') {
      fetchSources();
    }
  }, [user]);

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

  if (user && user.role !== 'Admin') {
    return (
      <div className="py-12 text-center text-rose-400 font-semibold">
        Không có quyền truy cập. Chỉ quản trị viên mới được phép quản lý nguồn đặt phòng.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Title Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Globe className="h-6 w-6 text-primary" />
            Quản lý nguồn đặt phòng
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Quản lý các kênh bán hàng (Direct, OTA, OTA Agents, Social networks...)</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchSources(true)}
            disabled={isRefreshing || loading}
            className="border-border hover:bg-muted text-muted-foreground hover:text-foreground"
          >
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          </Button>

          <Button size="sm" onClick={handleOpenCreate} className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-xs">
            <Plus className="h-4 w-4 mr-1.5" />
            Thêm nguồn đặt
          </Button>
        </div>
      </div>

      {/* List Table */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground gap-2">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <span className="text-xs">Đang tải danh sách nguồn đặt phòng...</span>
        </div>
      ) : (
        <Card className="border-border bg-card overflow-x-auto rounded-xl">
          <CardContent className="p-0">
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow className="border-border hover:bg-transparent">
                  <TableHead className="text-muted-foreground text-xs w-16">ID</TableHead>
                  <TableHead className="text-muted-foreground text-xs w-32">Mã nguồn</TableHead>
                  <TableHead className="text-muted-foreground text-xs">Tên nguồn đặt phòng</TableHead>
                  <TableHead className="text-muted-foreground text-xs">Ghi chú</TableHead>
                  <TableHead className="text-muted-foreground text-xs text-right w-32">Thao tác</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sources.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-12 text-xs text-muted-foreground">
                      Chưa đăng ký nguồn đặt phòng nào.
                    </TableCell>
                  </TableRow>
                ) : (
                  sources.map((item) => (
                    <TableRow key={item.Id} className="border-border hover:bg-muted/50">
                      <TableCell className="font-mono text-xs text-muted-foreground">#{item.Id}</TableCell>
                      <TableCell className="text-xs font-mono font-bold text-primary">
                        <span className="px-2 py-0.5 rounded bg-primary/10 border border-primary/20">
                          {item.SourceCode}
                        </span>
                      </TableCell>
                      <TableCell className="text-xs font-semibold text-foreground">{item.SourceName}</TableCell>
                      <TableCell className="text-xs text-muted-foreground italic max-w-[300px] truncate" title={item.Notes}>
                        {item.Notes || '-'}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1.5">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleOpenEdit(item)}
                            className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-muted rounded-md"
                            title="Chỉnh sửa"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(item.Id)}
                            className="h-8 w-8 text-rose-500 hover:text-rose-400 hover:bg-rose-950/20 rounded-md"
                            title="Xóa"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
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

      {/* Add / Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="bg-muted border-border text-foreground p-6 max-w-[450px]">
          <DialogHeader>
            <DialogTitle className="text-base text-foreground">
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
