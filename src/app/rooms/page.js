'use client';

import React, { useState, useEffect } from 'react';
import { useBranch } from '@/components/BranchContext';
import { Card, CardHeader, CardTitle, CardContent, CardFooter, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, RefreshCw, DoorOpen, Hammer, Sparkles, Check, Loader2, GitBranch, Users } from 'lucide-react';
import { toast } from 'sonner';

// Fallback room types if none configured in Settings
const FALLBACK_ROOM_TYPES = [
  { code: 'SGL', label: 'Single (Phòng đơn)', defaultMaxGuests: 1 },
  { code: 'DBL', label: 'Double (Phòng đôi)', defaultMaxGuests: 2 },
  { code: 'TWN', label: 'Twin (Phòng 2 giường)', defaultMaxGuests: 2 },
  { code: 'TPL', label: 'Triple (Phòng 3 người)', defaultMaxGuests: 3 },
  { code: 'FAM', label: 'Family (Gia đình)', defaultMaxGuests: 4 },
  { code: 'STE', label: 'Suite (Cao cấp)', defaultMaxGuests: 2 },
  { code: 'DLX', label: 'Deluxe (Nâng cấp)', defaultMaxGuests: 2 },
  { code: 'DORM', label: 'Dormitory (Tập thể)', defaultMaxGuests: 8 },
];

export default function RoomsPage() {
  const { selectedBranch, user, branches, systemSettings } = useBranch();
  
  // Data states
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  // New room Form states
  const [newRoomName, setNewRoomName] = useState('');
  const [newRoomType, setNewRoomType] = useState('');
  const [newPrice, setNewPrice] = useState('');
  const [newHourlyPrice, setNewHourlyPrice] = useState('');
  const [newExtraHourPrice, setNewExtraHourPrice] = useState('');
  const [newOvernightPrice, setNewOvernightPrice] = useState('');
  const [newMaxGuests, setNewMaxGuests] = useState(2);
  const [newBranchId, setNewBranchId] = useState('');
  const [newNotes, setNewNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Edit room Form states
  const [editingRoom, setEditingRoom] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [isEditSubmitting, setIsEditSubmitting] = useState(false);

  const openEditDialog = (room) => {
    setEditForm({
      RoomName: room.RoomName,
      RoomType: room.RoomType,
      Price: room.Price ? Number(room.Price).toLocaleString('vi-VN') : '',
      HourlyPrice: room.HourlyPrice ? Number(room.HourlyPrice).toLocaleString('vi-VN') : '',
      ExtraHourPrice: room.ExtraHourPrice ? Number(room.ExtraHourPrice).toLocaleString('vi-VN') : '',
      OvernightPrice: room.OvernightPrice ? Number(room.OvernightPrice).toLocaleString('vi-VN') : '',
      MaxGuests: room.MaxGuests || 2,
      BranchId: room.BranchId,
      Status: room.Status,
      Notes: room.Notes || ''
    });
    setEditingRoom(room);
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!editForm.RoomName || !editForm.Price || !editForm.BranchId) {
      toast.error('Vui lòng điền đầy đủ thông tin bắt buộc.');
      return;
    }

    setIsEditSubmitting(true);
    try {
      const res = await fetch('/api/rooms', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingRoom.Id,
          RoomName: editForm.RoomName,
          RoomType: editForm.RoomType,
          Price: Number(String(editForm.Price).replace(/\\./g, '')),
          HourlyPrice: editForm.HourlyPrice ? Number(String(editForm.HourlyPrice).replace(/\\./g, '')) : null,
          ExtraHourPrice: editForm.ExtraHourPrice ? Number(String(editForm.ExtraHourPrice).replace(/\\./g, '')) : null,
          OvernightPrice: editForm.OvernightPrice ? Number(String(editForm.OvernightPrice).replace(/\\./g, '')) : null,
          MaxGuests: Number(editForm.MaxGuests) || 2,
          BranchId: editForm.BranchId,
          Status: editForm.Status,
          Notes: editForm.Notes
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      toast.success('Cập nhật phòng thành công!');
      setEditingRoom(null);
      fetchRooms();
    } catch (e) {
      toast.error(e.message || 'Lỗi cập nhật phòng.');
    } finally {
      setIsEditSubmitting(false);
    }
  };

  // Derived: available room types from settings or fallback
  const roomTypeOptions = (() => {
    try {
      if (systemSettings?.RoomTypes) {
        const parsed = JSON.parse(systemSettings.RoomTypes);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) { /* ignore */ }
    return FALLBACK_ROOM_TYPES;
  })();

  // Filter state
  const [statusFilter, setStatusFilter] = useState('all');

  const fetchRooms = async () => {
    setIsRefreshing(true);
    try {
      const activeBranch = user?.role === 'Admin' ? selectedBranch : user?.branchId;
      const branchQuery = activeBranch === 'all' ? '' : `?branchId=${activeBranch}`;

      const res = await fetch(`/api/rooms${branchQuery}`);
      const data = await res.json();
      if (Array.isArray(data)) setRooms(data);
    } catch (e) {
      console.error('Failed to load rooms:', e);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchRooms();

    // Listen for branch changes
    const handleBranchChange = () => {
      setLoading(true);
      fetchRooms();
    };
    window.addEventListener('branchChanged', handleBranchChange);
    const formatCurrencyInput = (setter) => (e) => {
    const rawValue = e.target.value.replace(/\D/g, '');
    if (rawValue === '') {
      setter('');
    } else {
      setter(Number(rawValue).toLocaleString('vi-VN'));
    }
  };

  return () => window.removeEventListener('branchChanged', handleBranchChange);
  }, [selectedBranch, user]);

  // Set default branch & room type on dialog open
  useEffect(() => {
    if (isDialogOpen) {
      const activeBranch = user?.role === 'Admin' ? selectedBranch : user?.branchId;
      setNewBranchId(activeBranch === 'all' ? '' : String(activeBranch));
      setNewRoomName('');
      setNewPrice('');
      setNewHourlyPrice('');
      setNewExtraHourPrice('');
      setNewOvernightPrice('');
      setNewNotes('');
      // Default to first room type in list
      const firstType = roomTypeOptions[0];
      setNewRoomType(firstType?.code || 'DBL');
      setNewMaxGuests(firstType?.defaultMaxGuests ?? 2);
    }
  }, [isDialogOpen, selectedBranch, user]);

  const handleCreateRoom = async (e) => {
    e.preventDefault();
    if (!newRoomName || !newPrice || !newBranchId) {
      toast.error('Vui lòng điền đầy đủ thông tin phòng.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/rooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          RoomName: newRoomName,
          RoomType: newRoomType,
          Price: Number(String(newPrice).replace(/\./g, '')),
          HourlyPrice: newHourlyPrice ? Number(String(newHourlyPrice).replace(/\./g, '')) : null,
          ExtraHourPrice: newExtraHourPrice ? Number(String(newExtraHourPrice).replace(/\./g, '')) : null,
          OvernightPrice: newOvernightPrice ? Number(String(newOvernightPrice).replace(/\./g, '')) : null,
          MaxGuests: Number(newMaxGuests) || 2,
          BranchId: newBranchId,
          Status: 'Available',
          Notes: newNotes
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      toast.success('Thêm phòng mới thành công!');
      setIsDialogOpen(false);
      fetchRooms();
    } catch (e) {
      toast.error(e.message || 'Lỗi thêm phòng.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateStatus = async (roomId, newStatus) => {
    try {
      const res = await fetch('/api/rooms', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: roomId, Status: newStatus })
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error);
      }
      toast.success(`Cập nhật trạng thái phòng thành công!`);
      fetchRooms();
    } catch (e) {
      toast.error('Lỗi: ' + e.message);
    }
  };

  const getStatusDetails = (s) => {
    switch (s) {
      case 'Available':
        return {
          label: 'Sẵn sàng',
          badgeClass: 'bg-green-500/10 text-green-400 border-green-500/20',
          cardBorder: 'border-green-500/10 hover:border-green-500/30',
          iconColor: 'text-green-400'
        };
      case 'Occupied':
        return {
          label: 'Đang có khách',
          badgeClass: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
          cardBorder: 'border-blue-500/10 hover:border-blue-500/30',
          iconColor: 'text-blue-400'
        };
      case 'Cleaning':
        return {
          label: 'Đang dọn dẹp',
          badgeClass: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
          cardBorder: 'border-amber-500/10 hover:border-amber-500/30',
          iconColor: 'text-amber-400'
        };
      case 'Maintenance':
        return {
          label: 'Bảo trì',
          badgeClass: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
          cardBorder: 'border-rose-500/10 hover:border-rose-500/30',
          iconColor: 'text-rose-400'
        };
      default:
        return {
          label: 'Không rõ',
          badgeClass: 'bg-neutral-500/10 text-muted-foreground border-neutral-500/20',
          cardBorder: 'border-border',
          iconColor: 'text-muted-foreground'
        };
    }
  };

  const filteredRooms = rooms.filter(r => statusFilter === 'all' || r.Status === statusFilter);

  if (loading) {
    const formatCurrencyInput = (setter) => (e) => {
    const rawValue = e.target.value.replace(/\D/g, '');
    if (rawValue === '') {
      setter('');
    } else {
      setter(Number(rawValue).toLocaleString('vi-VN'));
    }
  };

  return (
      <div className="py-20 flex flex-col items-center justify-center text-foreground">
        <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
        <p className="text-xs text-muted-foreground">Đang tải danh sách phòng...</p>
      </div>
    );
  }

  const formatCurrencyInput = (setter) => (e) => {
    const rawValue = e.target.value.replace(/\D/g, '');
    if (rawValue === '') {
      setter('');
    } else {
      setter(Number(rawValue).toLocaleString('vi-VN'));
    }
  };

  return (
    <div className="space-y-6">
      {/* Title Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Quản lý phòng</h1>
          <p className="text-sm text-muted-foreground mt-1">Danh sách phòng và trạng thái dọn dẹp / bảo trì</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchRooms}
            disabled={isRefreshing}
            className="border-border hover:bg-muted text-muted-foreground hover:text-foreground"
          >
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          </Button>

          {user?.role === 'Admin' && (
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-xs">
                  <Plus className="h-4 w-4 mr-1.5" />
                  Thêm phòng
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-muted border-border text-foreground p-6 max-w-[450px]">
                <DialogHeader>
                  <DialogTitle className="text-base text-foreground">Thêm phòng mới</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleCreateRoom} className="space-y-4 mt-4">
                  <div className="space-y-1.5">
                    <label className="text-xs text-muted-foreground font-semibold">Tên phòng *</label>
                    <Input
                      value={newRoomName}
                      onChange={(e) => setNewRoomName(e.target.value)}
                      placeholder="Ví dụ: Phòng 101, Bungalow A"
                      className="bg-background border-border text-foreground text-xs"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs text-muted-foreground font-semibold">Loại phòng *</label>
                      <Select
                        value={newRoomType}
                        onValueChange={(val) => {
                          setNewRoomType(val);
                          const found = roomTypeOptions.find((rt) => rt.code === val);
                          if (found) setNewMaxGuests(found.defaultMaxGuests ?? 2);
                        }}
                      >
                        <SelectTrigger className="bg-background border-border text-foreground text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-muted border-border text-foreground text-xs">
                          {roomTypeOptions.map((rt) => (
                            <SelectItem key={rt.code} value={rt.code}>
                              {rt.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs text-muted-foreground font-semibold">Giá cơ bản / ngày (Daily) *</label>
                      <Input
                        type="text"
                        value={newPrice}
                        onChange={formatCurrencyInput(setNewPrice)}
                        placeholder="Giá theo ngày"
                        className="bg-background border-border text-foreground text-xs font-mono"
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs text-muted-foreground font-semibold">Sức chứa tối đa (người)</label>
                      <div className="relative">
                        <Users className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                        <Input
                          type="number"
                          min={1}
                          max={50}
                          value={newMaxGuests}
                          onChange={(e) => setNewMaxGuests(Number(e.target.value))}
                          placeholder="Số người tối đa"
                          className="pl-9 bg-background border-border text-foreground text-xs font-mono"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div className="space-y-1.5">
                      <label className="text-xs text-muted-foreground font-semibold truncate">Giá phòng / giờ</label>
                      <Input
                        type="text"
                        value={newHourlyPrice}
                        onChange={formatCurrencyInput(setNewHourlyPrice)}
                        placeholder="VND"
                        className="bg-background border-border text-foreground text-xs font-mono"
                      />
                    </div>
                    
                    <div className="space-y-1.5">
                      <label className="text-xs text-muted-foreground font-semibold truncate">Phụ thu thêm giờ</label>
                      <Input
                        type="text"
                        value={newExtraHourPrice}
                        onChange={formatCurrencyInput(setNewExtraHourPrice)}
                        placeholder="VND"
                        className="bg-background border-border text-foreground text-xs font-mono"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs text-muted-foreground font-semibold truncate">Giá qua đêm</label>
                      <Input
                        type="text"
                        value={newOvernightPrice}
                        onChange={formatCurrencyInput(setNewOvernightPrice)}
                        placeholder="VND"
                        className="bg-background border-border text-foreground text-xs font-mono"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs text-muted-foreground font-semibold">Chi nhánh *</label>
                    <Select value={newBranchId} onValueChange={setNewBranchId}>
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

                  <div className="space-y-1.5">
                    <label className="text-xs text-muted-foreground font-semibold">Ghi chú phòng</label>
                    <Input
                      value={newNotes}
                      onChange={(e) => setNewNotes(e.target.value)}
                      placeholder="Mô tả giường, hướng cửa sổ..."
                      className="bg-background border-border text-foreground text-xs"
                    />
                  </div>

                  <div className="flex justify-end gap-3 pt-4 border-t border-border">
                    <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)} className="border-border text-foreground hover:bg-muted text-xs">
                      Hủy
                    </Button>
                    <Button type="submit" className="bg-primary hover:bg-primary/90 text-primary-foreground text-xs" disabled={isSubmitting}>
                      {isSubmitting ? 'Đang tạo...' : 'Tạo phòng'}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      {/* Filter Status Selector */}
      <div className="flex justify-start gap-1 overflow-x-auto pb-2 scrollbar-none">
        <Button
          variant={statusFilter === 'all' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setStatusFilter('all')}
          className={`text-xs h-8 rounded-lg ${statusFilter === 'all' ? 'bg-primary hover:bg-primary/90 text-primary-foreground' : 'border-border hover:bg-muted text-muted-foreground hover:text-foreground'}`}
        >
          Tất cả phòng ({rooms.length})
        </Button>
        <Button
          variant={statusFilter === 'Available' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setStatusFilter('Available')}
          className={`text-xs h-8 rounded-lg ${statusFilter === 'Available' ? 'bg-green-600 hover:bg-green-700 text-foreground' : 'border-border hover:bg-muted text-muted-foreground hover:text-foreground'}`}
        >
          Sẵn sàng ({rooms.filter(r => r.Status === 'Available').length})
        </Button>
        <Button
          variant={statusFilter === 'Occupied' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setStatusFilter('Occupied')}
          className={`text-xs h-8 rounded-lg ${statusFilter === 'Occupied' ? 'bg-blue-600 hover:bg-blue-700 text-foreground' : 'border-border hover:bg-muted text-muted-foreground hover:text-foreground'}`}
        >
          Có khách ({rooms.filter(r => r.Status === 'Occupied').length})
        </Button>
        <Button
          variant={statusFilter === 'Cleaning' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setStatusFilter('Cleaning')}
          className={`text-xs h-8 rounded-lg ${statusFilter === 'Cleaning' ? 'bg-amber-600 hover:bg-amber-700 text-foreground' : 'border-border hover:bg-muted text-muted-foreground hover:text-foreground'}`}
        >
          Đang dọn ({rooms.filter(r => r.Status === 'Cleaning').length})
        </Button>
        <Button
          variant={statusFilter === 'Maintenance' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setStatusFilter('Maintenance')}
          className={`text-xs h-8 rounded-lg ${statusFilter === 'Maintenance' ? 'bg-rose-600 hover:bg-rose-700 text-foreground' : 'border-border hover:bg-muted text-muted-foreground hover:text-foreground'}`}
        >
          Bảo trì ({rooms.filter(r => r.Status === 'Maintenance').length})
        </Button>
      </div>

      {/* Rooms Grid list */}
      {filteredRooms.length === 0 ? (
        <div className="text-center py-20 text-xs text-muted-foreground border border-border border-dashed rounded-xl">
          Không tìm thấy phòng nào ở trạng thái này.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filteredRooms.map((room) => {
            const statusConfig = getStatusDetails(room.Status);
            const branchName = branches.find(b => b.Id === room.BranchId)?.BranchName || 'Bàn giao';
            const formatCurrencyInput = (setter) => (e) => {
    const rawValue = e.target.value.replace(/\D/g, '');
    if (rawValue === '') {
      setter('');
    } else {
      setter(Number(rawValue).toLocaleString('vi-VN'));
    }
  };

  return (
              <Card 
                key={room.Id} 
                className={`border bg-muted/50 backdrop-blur-sm shadow-md transition-all relative overflow-hidden group ${statusConfig.cardBorder} hover:border-primary/50`}
              >
                {/* Status bar top */}
                <div className={`h-1 w-full absolute top-0 left-0 bg-${statusConfig.color}-500/50`} />
                
                <CardHeader className="pb-3 pt-5 flex flex-col space-y-2">
                  <div className="flex justify-between items-start gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[10px] font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                          ID: {room.Id}
                        </span>
                        <Badge className={`text-[10px] whitespace-nowrap ${statusConfig.badgeClass}`}>
                          {statusConfig.label}
                        </Badge>
                      </div>
                      <CardTitle className="text-base font-bold text-foreground tracking-wide break-words leading-tight" title={room.RoomName}>
                        {room.RoomName}
                      </CardTitle>
                      <span className="text-[11px] text-muted-foreground capitalize flex items-center gap-1 mt-1">
                        <DoorOpen className="h-3 w-3" />
                        {room.RoomType}
                      </span>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="pb-4 space-y-3">
                  <div className="space-y-1 bg-muted/30 rounded-lg p-2.5 border border-border/50">
                    <div className="flex justify-between items-baseline text-xs border-b border-border/50 pb-1.5">
                      <span className="text-[10px] text-muted-foreground">Ngày:</span>
                      <span className="font-bold text-foreground font-mono">
                        {Number(room.Price).toLocaleString('vi-VN')}đ
                      </span>
                    </div>
                    <div className="flex justify-between items-baseline text-xs border-b border-border/50 py-1.5">
                      <span className="text-[10px] text-muted-foreground">Giờ:</span>
                      <span className="font-bold text-primary/80 font-mono">
                        {room.HourlyPrice ? `${Number(room.HourlyPrice).toLocaleString('vi-VN')}đ` : '---'}
                      </span>
                    </div>
                    <div className="flex justify-between items-baseline text-xs border-b border-border/50 py-1.5">
                      <span className="text-[10px] text-muted-foreground">Qua đêm:</span>
                      <span className="font-bold text-emerald-400/80 font-mono">
                        {room.OvernightPrice ? `${Number(room.OvernightPrice).toLocaleString('vi-VN')}đ` : '---'}
                      </span>
                    </div>
                    <div className="flex justify-between items-baseline text-xs pt-1.5">
                      <span className="text-[10px] text-muted-foreground flex items-center gap-1"><Users className="h-3 w-3" />Sức chứa:</span>
                      <span className="font-bold text-foreground font-mono">
                        {room.MaxGuests ? `${room.MaxGuests} người` : '---'}
                      </span>
                    </div>
                  </div>
                  
                  {user?.role === 'Admin' && selectedBranch === 'all' && (
                    <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground pt-1">
                      <GitBranch className="h-3 w-3 text-muted-foreground" />
                      <span className="truncate bg-muted px-1.5 py-0.5 rounded">{branchName}</span>
                    </div>
                  )}

                  {room.Notes && (
                    <div className="pt-2 text-[10px] text-muted-foreground italic line-clamp-2 border-t border-border/50">
                      "{room.Notes}"
                    </div>
                  )}
                  
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-[1px] z-10">
                    <Button variant="secondary" size="sm" onClick={() => openEditDialog(room)} className="shadow-xl pointer-events-auto">
                      Xem chi tiết / Sửa
                    </Button>
                  </div>
                </CardContent>
                
                <CardFooter className="pt-2 border-t border-border flex justify-end gap-1.5 z-20 relative">
                  {/* Clean status actions */}
                  {room.Status === 'Cleaning' && (
                    <Button 
                      size="icon" 
                      onClick={() => handleUpdateStatus(room.Id, 'Available')}
                      className="bg-green-600 hover:bg-green-700 text-foreground h-7 w-7 rounded-md"
                      title="Hoàn thành dọn phòng -> Sẵn sàng đón khách"
                    >
                      <Check className="h-3.5 w-3.5" />
                    </Button>
                  )}

                  {room.Status === 'Available' && (
                    <>
                      <Button 
                        size="icon" 
                        variant="outline"
                        onClick={() => handleUpdateStatus(room.Id, 'Cleaning')}
                        className="border-border text-amber-400 hover:text-amber-300 hover:bg-muted h-7 w-7 rounded-md"
                        title="Đánh dấu cần dọn dẹp"
                      >
                        <Sparkles className="h-3.5 w-3.5" />
                      </Button>
                      <Button 
                        size="icon" 
                        variant="outline"
                        onClick={() => handleUpdateStatus(room.Id, 'Maintenance')}
                        className="border-border text-rose-400 hover:text-rose-300 hover:bg-muted h-7 w-7 rounded-md"
                        title="Đánh dấu cần bảo trì"
                      >
                        <Hammer className="h-3.5 w-3.5" />
                      </Button>
                    </>
                  )}

                  {room.Status === 'Maintenance' && (
                    <Button 
                      size="icon" 
                      onClick={() => handleUpdateStatus(room.Id, 'Cleaning')}
                      className="bg-amber-600 hover:bg-amber-700 text-foreground h-7 w-7 rounded-md"
                      title="Bảo trì xong -> Chuyển sang dọn dẹp"
                    >
                      <Check className="h-3.5 w-3.5" />
                    </Button>
                  )}

                  {room.Status === 'Occupied' && (
                    <span className="text-[10px] text-neutral-600 font-semibold italic pr-1">Đang khóa phòng</span>
                  )}
                </CardFooter>
              </Card>
            );
          })}
        </div>
      )}

      {/* Edit Room Dialog */}
      <Dialog open={!!editingRoom} onOpenChange={(open) => !open && setEditingRoom(null)}>
        <DialogContent className="bg-muted border-border text-foreground p-6 max-w-[450px]">
          <DialogHeader>
            <DialogTitle className="text-base text-foreground">Chi tiết & Sửa phòng</DialogTitle>
          </DialogHeader>
          {editingRoom && (
            <form onSubmit={handleEditSubmit} className="space-y-4 mt-4">
              <div className="space-y-1.5">
                <label className="text-xs text-muted-foreground font-semibold">Tên phòng *</label>
                <Input
                  value={editForm.RoomName}
                  onChange={(e) => setEditForm({...editForm, RoomName: e.target.value})}
                  className="bg-background border-border text-foreground text-xs"
                  required
                  disabled={user?.role !== 'Admin' || editingRoom?.Status === 'Occupied'}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs text-muted-foreground font-semibold">Loại phòng *</label>
                  <Select
                    value={editForm.RoomType}
                    onValueChange={(val) => setEditForm({...editForm, RoomType: val})}
                    disabled={user?.role !== 'Admin' || editingRoom?.Status === 'Occupied'}
                  >
                    <SelectTrigger className="bg-background border-border text-foreground text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-muted border-border text-foreground text-xs">
                      {roomTypeOptions.map((rt) => (
                        <SelectItem key={rt.code} value={rt.code}>{rt.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs text-muted-foreground font-semibold">Giá cơ bản / ngày *</label>
                  <Input
                    type="text"
                    value={editForm.Price}
                    onChange={(e) => {
                      const raw = e.target.value.replace(/\\D/g, '');
                      setEditForm({...editForm, Price: raw ? Number(raw).toLocaleString('vi-VN') : ''});
                    }}
                    className="bg-background border-border text-foreground text-xs font-mono"
                    required
                    disabled={user?.role !== 'Admin' || editingRoom?.Status === 'Occupied'}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs text-muted-foreground font-semibold">Sức chứa tối đa (người)</label>
                  <div className="relative">
                    <Users className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                    <Input
                      type="number"
                      min={1}
                      max={50}
                      value={editForm.MaxGuests}
                      onChange={(e) => setEditForm({...editForm, MaxGuests: Number(e.target.value)})}
                      className="pl-9 bg-background border-border text-foreground text-xs font-mono"
                      disabled={user?.role !== 'Admin' || editingRoom?.Status === 'Occupied'}
                    />
                  </div>
                </div>
                
                <div className="space-y-1.5">
                  <label className="text-xs text-muted-foreground font-semibold">Trạng thái phòng</label>
                  {['Available', 'Cleaning', 'Maintenance'].includes(editingRoom.Status) ? (
                    <Select 
                      value={editForm.Status} 
                      onValueChange={(val) => setEditForm({...editForm, Status: val})}
                    >
                      <SelectTrigger className="bg-background border-border text-foreground text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-muted border-border text-foreground text-xs">
                        <SelectItem value="Available">Sẵn sàng</SelectItem>
                        <SelectItem value="Cleaning">Đang dọn dẹp</SelectItem>
                        <SelectItem value="Maintenance">Bảo trì</SelectItem>
                      </SelectContent>
                    </Select>
                  ) : (
                    <div className="px-3 py-2 bg-background border border-border text-muted-foreground text-xs rounded-md">
                      {getStatusDetails(editingRoom.Status).label}
                    </div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs text-muted-foreground font-semibold truncate">Giá phòng / giờ</label>
                  <Input
                    type="text"
                    value={editForm.HourlyPrice}
                    onChange={(e) => {
                      const raw = e.target.value.replace(/\\D/g, '');
                      setEditForm({...editForm, HourlyPrice: raw ? Number(raw).toLocaleString('vi-VN') : ''});
                    }}
                    className="bg-background border-border text-foreground text-xs font-mono"
                    disabled={user?.role !== 'Admin' || editingRoom?.Status === 'Occupied'}
                  />
                </div>
                
                <div className="space-y-1.5">
                  <label className="text-xs text-muted-foreground font-semibold truncate">Phụ thu thêm giờ</label>
                  <Input
                    type="text"
                    value={editForm.ExtraHourPrice}
                    onChange={(e) => {
                      const raw = e.target.value.replace(/\\D/g, '');
                      setEditForm({...editForm, ExtraHourPrice: raw ? Number(raw).toLocaleString('vi-VN') : ''});
                    }}
                    className="bg-background border-border text-foreground text-xs font-mono"
                    disabled={user?.role !== 'Admin' || editingRoom?.Status === 'Occupied'}
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs text-muted-foreground font-semibold truncate">Giá qua đêm</label>
                  <Input
                    type="text"
                    value={editForm.OvernightPrice}
                    onChange={(e) => {
                      const raw = e.target.value.replace(/\\D/g, '');
                      setEditForm({...editForm, OvernightPrice: raw ? Number(raw).toLocaleString('vi-VN') : ''});
                    }}
                    className="bg-background border-border text-foreground text-xs font-mono"
                    disabled={user?.role !== 'Admin' || editingRoom?.Status === 'Occupied'}
                  />
                </div>
              </div>

              {user?.role === 'Admin' && (
                <div className="space-y-1.5">
                  <label className="text-xs text-muted-foreground font-semibold">Chi nhánh *</label>
                  <Select value={String(editForm.BranchId)} onValueChange={(val) => setEditForm({...editForm, BranchId: val})} disabled={editingRoom?.Status === 'Occupied'}>
                    <SelectTrigger className="bg-background border-border text-foreground text-xs">
                      <SelectValue placeholder="Chọn chi nhánh" />
                    </SelectTrigger>
                    <SelectContent className="bg-muted border-border text-foreground text-xs">
                      {branches.map((b) => (
                        <SelectItem key={b.Id} value={String(b.Id)}>{b.BranchName}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-xs text-muted-foreground font-semibold">Mô tả / Ghi chú phòng</label>
                <Input
                  value={editForm.Notes}
                  onChange={(e) => setEditForm({...editForm, Notes: e.target.value})}
                  placeholder="Mô tả giường, hướng cửa sổ..."
                  className="bg-background border-border text-foreground text-xs"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-border">
                <Button type="button" variant="outline" onClick={() => setEditingRoom(null)} className="border-border text-foreground hover:bg-muted text-xs">
                  Hủy
                </Button>
                <Button type="submit" className="bg-primary hover:bg-primary/90 text-primary-foreground text-xs" disabled={isEditSubmitting}>
                  {isEditSubmitting ? 'Đang lưu...' : 'Lưu thay đổi'}
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
