'use client';

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useBranch } from './BranchContext';
import { Loader2, Calendar as CalendarIcon, FileText, Ban } from 'lucide-react';
import { toast } from 'sonner';

export default function BlockModal({ isOpen, onClose, initialRoomId, initialDate, onSave }) {
  const { selectedBranch, user } = useBranch();
  const todayStr = new Date().toISOString().split('T')[0];
  
  // Data states
  const [rooms, setRooms] = useState([]);
  const [busyRanges, setBusyRanges] = useState([]);
  
  // Form states
  const [roomId, setRoomId] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [blockType, setBlockType] = useState('Maintenance');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Detect client-side conflict
  const hasConflict = busyRanges.some(
    (r) => startDate < r.to && endDate > r.from
  );

  useEffect(() => {
    if (isOpen) {
      const activeBranch = user?.role === 'Admin' ? selectedBranch : user?.branchId;
      
      // Load rooms for dropdown
      fetch(`/api/rooms?branchId=${activeBranch === 'all' ? '' : activeBranch}`)
        .then(res => res.json())
        .then(data => {
          if (Array.isArray(data)) setRooms(data);
        });

      setRoomId(initialRoomId ? String(initialRoomId) : '');
      setStartDate(initialDate || '');
      setEndDate(initialDate || '');
      setBlockType('Maintenance');
      setNotes('');
      setBusyRanges([]);
    }
  }, [isOpen, initialRoomId, initialDate, selectedBranch, user]);

  // Fetch busy ranges when roomId changes
  useEffect(() => {
    if (!roomId) { setBusyRanges([]); return; }
    fetch(`/api/bookings/availability?roomId=${roomId}`)
      .then(res => res.json())
      .then(data => { if (data.busy) setBusyRanges(data.busy); })
      .catch(() => setBusyRanges([]));
  }, [roomId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!roomId || !startDate || !endDate) {
      toast.error('Vui lòng điền đầy đủ các thông tin bắt buộc.');
      return;
    }

    if (new Date(startDate) > new Date(endDate)) {
      toast.error('Ngày bắt đầu không được lớn hơn ngày kết thúc.');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        RoomId: Number(roomId),
        StartDate: startDate,
        EndDate: endDate,
        BlockType: blockType,
        Notes: notes
      };

      const res = await fetch('/api/room-blocks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const result = await res.json();

      if (!res.ok) throw new Error(result.error || 'Lỗi lưu thông tin');

      toast.success('Khóa phòng thành công!');
      onSave();
      onClose();
    } catch (e) {
      toast.error(e.message || 'Lỗi khóa phòng.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="bg-muted border-border text-foreground p-6 max-w-[450px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3 text-lg font-bold text-foreground">
            <Ban className="h-5 w-5 text-rose-500" />
            Khóa phòng / Bảo trì
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="space-y-1.5">
            <label className="text-xs text-muted-foreground font-semibold">Chọn phòng cần khóa *</label>
            <Select value={roomId} onValueChange={setRoomId} disabled={isSubmitting}>
              <SelectTrigger className="bg-background border-border text-foreground text-xs">
                <SelectValue placeholder="Chọn phòng" />
              </SelectTrigger>
              <SelectContent className="bg-muted border-border text-foreground text-xs">
                {rooms.map((room) => (
                  <SelectItem key={room.Id} value={String(room.Id)}>
                    {room.RoomName} ({room.RoomType})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs text-muted-foreground font-semibold">Lý do khóa phòng *</label>
            <Select value={blockType} onValueChange={setBlockType} disabled={isSubmitting}>
              <SelectTrigger className="bg-background border-border text-foreground text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-muted border-border text-foreground text-xs">
                <SelectItem value="Maintenance">🚧 Bảo trì / Sửa chữa</SelectItem>
                <SelectItem value="OwnerUse">🔑 Chủ nhà sử dụng riêng</SelectItem>
                <SelectItem value="Other">❓ Lý do khác</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs text-muted-foreground font-semibold">Từ ngày (Check-in) *</label>
              <div className="relative">
                <CalendarIcon className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  type="date"
                  value={startDate}
                  min={todayStr}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="pl-10 bg-background border-border text-foreground text-xs"
                  required
                  disabled={isSubmitting}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs text-muted-foreground font-semibold">Đến ngày (Check-out) *</label>
              <div className="relative">
                <CalendarIcon className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  type="date"
                  value={endDate}
                  min={startDate || todayStr}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="pl-10 bg-background border-border text-foreground text-xs"
                  required
                  disabled={isSubmitting}
                />
              </div>
            </div>
          </div>

          {/* Busy ranges banner */}
          {busyRanges.length > 0 && (
            <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-600 dark:text-amber-400 space-y-1">
              <p className="font-semibold">⚠️ Phòng này đã có lịch trong các khoảng sau:</p>
              {busyRanges.map((r, i) => (
                <div key={i} className="flex items-center gap-1.5">
                  <span className="font-mono">{r.from} → {r.to}</span>
                  <span className="text-muted-foreground">— {r.label}</span>
                </div>
              ))}
            </div>
          )}

          {/* Conflict warning */}
          {hasConflict && startDate && endDate && (
            <div className="rounded-lg border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-500 font-semibold">
              ❌ Khoảng thời gian đã bị trùng với lịch hiện có. Vui lòng chọn ngày khác.
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-xs text-muted-foreground font-semibold">Ghi chú lý do chi tiết</label>
            <div className="relative">
              <FileText className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Ví dụ: Sơn lại tường, Thay ga trải giường..."
                className="pl-10 bg-background border-border text-foreground text-xs"
                disabled={isSubmitting}
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-border">
            <Button type="button" variant="outline" onClick={onClose} className="border-border text-foreground hover:bg-muted text-xs">
              Hủy
            </Button>
            <Button type="submit" className="bg-rose-600 hover:bg-rose-700 text-foreground text-xs" disabled={isSubmitting || hasConflict}>
              {isSubmitting ? 'Đang thực hiện...' : 'Khóa phòng'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
