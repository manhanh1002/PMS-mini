'use client';

import React, { useState, useEffect } from 'react';
import { useBranch } from '@/components/BranchContext';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Search, RefreshCw, Pencil, Trash, Play, CheckCircle, Ban, Loader2, ArrowRight } from 'lucide-react';
import BookingModal from '@/components/BookingModal';
import { toast } from 'sonner';

export default function BookingsPage() {
  const { selectedBranch, user } = useBranch();
  
  // Data states
  const [bookings, setBookings] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [bookingSources, setBookingSources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Filters state
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sourceFilter, setSourceFilter] = useState('all');

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedBookingId, setSelectedBookingId] = useState(null);

  const fetchBookingsData = async () => {
    setIsRefreshing(true);
    try {
      const activeBranch = user?.role === 'Admin' ? selectedBranch : user?.branchId;
      const branchQuery = activeBranch === 'all' ? '' : `?branchId=${activeBranch}`;

      const [bookingsRes, roomsRes, sourcesRes] = await Promise.all([
        fetch(`/api/bookings${branchQuery}`),
        fetch(`/api/rooms${branchQuery}`),
        fetch('/api/booking-sources')
      ]);

      const bookingsData = await bookingsRes.json();
      const roomsData = await roomsRes.json();
      const sourcesData = await sourcesRes.json();

      if (Array.isArray(bookingsData)) setBookings(bookingsData);
      if (Array.isArray(roomsData)) setRooms(roomsData);
      if (Array.isArray(sourcesData)) setBookingSources(sourcesData);
    } catch (e) {
      console.error('Failed to load bookings list:', e);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchBookingsData();

    // Listen for branch changes
    const handleBranchChange = () => {
      setLoading(true);
      fetchBookingsData();
    };
    window.addEventListener('branchChanged', handleBranchChange);
    return () => window.removeEventListener('branchChanged', handleBranchChange);
  }, [selectedBranch, user]);

  const handleStatusChange = async (id, newStatus) => {
    try {
      const res = await fetch(`/api/bookings/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ Status: newStatus })
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error);
      }
      toast.success('Cập nhật trạng thái đặt phòng thành công!');
      fetchBookingsData();
    } catch (e) {
      toast.error('Lỗi: ' + e.message);
    }
  };

  const handleOpenNewBooking = () => {
    setSelectedBookingId(null);
    setIsModalOpen(true);
  };

  const handleOpenExistingBooking = (bookingId) => {
    setSelectedBookingId(bookingId);
    setIsModalOpen(true);
  };

  // Filter bookings list
  const filteredBookings = bookings.filter((b) => {
    const matchesSearch = 
      b.CustomerName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.CustomerPhone?.includes(searchQuery) ||
      String(b.Id).includes(searchQuery);
    
    const matchesStatus = statusFilter === 'all' || b.Status === statusFilter;
    
    const matchesSource = 
      sourceFilter === 'all' || 
      (sourceFilter === 'none' && (!b.BookingSourceId || b.BookingSourceId === null)) || 
      String(b.BookingSourceId) === String(sourceFilter);
    
    return matchesSearch && matchesStatus && matchesSource;
  });

  const getSourceBadge = (b) => {
    if (!b.BookingSourceId) {
      return (
        <button
          onClick={() => handleOpenExistingBooking(b.Id)}
          className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/10 text-rose-400 border border-rose-500/30 animate-pulse hover:bg-rose-500/20 transition-all cursor-pointer"
          title="Nhấp để gán nguồn đặt phòng"
        >
          ⚠️ Chưa gán nguồn
        </button>
      );
    }
    const source = bookingSources.find(s => String(s.Id) === String(b.BookingSourceId));
    if (!source) {
      return <Badge variant="outline" className="text-[10px] text-neutral-400 border-neutral-800 bg-neutral-950/30 font-medium">Lỗi liên kết (#{b.BookingSourceId})</Badge>;
    }
    return (
      <Badge className="bg-primary/10 text-primary hover:bg-primary/20 border-primary/30 text-[10px] font-medium font-mono">
        {source.SourceName}
      </Badge>
    );
  };

  const getStatusBadge = (s) => {
    switch (s) {
      case 'Pending': return <Badge className="bg-amber-500/10 text-amber-500 hover:bg-amber-500/20 border-amber-500/30">Chờ nhận phòng</Badge>;
      case 'Confirmed': return <Badge className="bg-blue-500/10 text-blue-500 hover:bg-blue-500/20 border-blue-500/30">Đã xác nhận</Badge>;
      case 'CheckedIn': return <Badge className="bg-green-500/10 text-green-500 hover:bg-green-500/20 border-green-500/30">Đang lưu trú</Badge>;
      case 'CheckedOut': return <Badge className="bg-neutral-500/10 text-neutral-400 hover:bg-neutral-500/20 border-neutral-500/30">Đã check-out</Badge>;
      case 'Cancelled': return <Badge className="bg-rose-500/10 text-rose-500 hover:bg-rose-500/20 border-rose-500/30">Đã hủy</Badge>;
      case 'NoShow': return <Badge className="bg-rose-500/10 text-rose-500 hover:bg-rose-500/20 border-rose-500/30">Khách không đến</Badge>;
      default: return null;
    }
  };

  if (loading) {
    return (
      <div className="py-20 flex flex-col items-center justify-center text-foreground">
        <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
        <p className="text-xs text-muted-foreground">Đang tải danh sách đơn đặt phòng...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Title Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Quản lý đặt phòng</h1>
          <p className="text-sm text-muted-foreground mt-1">Danh sách chi tiết và các giao dịch đặt phòng</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchBookingsData}
            disabled={isRefreshing}
            className="border-border hover:bg-muted text-muted-foreground hover:text-foreground"
          >
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          </Button>
          <Button
            size="sm"
            onClick={handleOpenNewBooking}
            className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-xs"
          >
            <Plus className="h-4 w-4 mr-1.5" />
            Tạo đơn đặt
          </Button>
        </div>
      </div>

      {/* Filters Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Tìm theo tên khách, số điện thoại hoặc mã đơn..."
            className="pl-10 bg-background border-border text-foreground text-xs"
          />
        </div>
        <div className="w-[180px]">
          <Select value={sourceFilter} onValueChange={setSourceFilter}>
            <SelectTrigger className="bg-background border-border text-foreground text-xs">
              <SelectValue placeholder="Kênh / Nguồn đặt" />
            </SelectTrigger>
            <SelectContent className="bg-card border-border text-foreground text-xs">
              <SelectItem value="all">Tất cả nguồn</SelectItem>
              <SelectItem value="none">⚠️ Chưa gán nguồn</SelectItem>
              {bookingSources.map((s) => (
                <SelectItem key={s.Id} value={String(s.Id)}>
                  {s.SourceName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="w-[180px]">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="bg-background border-border text-foreground text-xs">
              <SelectValue placeholder="Trạng thái" />
            </SelectTrigger>
            <SelectContent className="bg-card border-border text-foreground text-xs">
              <SelectItem value="all">Tất cả trạng thái</SelectItem>
              <SelectItem value="Pending">Chờ nhận phòng</SelectItem>
              <SelectItem value="Confirmed">Đã xác nhận</SelectItem>
              <SelectItem value="CheckedIn">Đang lưu trú</SelectItem>
              <SelectItem value="CheckedOut">Đã check-out</SelectItem>
              <SelectItem value="Cancelled">Đã hủy</SelectItem>
              <SelectItem value="NoShow">Khách không đến</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Bookings List Table */}
      <Card className="border-border bg-card overflow-x-auto rounded-xl">
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-muted/50 border-b border-border">
              <TableRow className="border-border hover:bg-transparent">
                <TableHead className="text-muted-foreground text-xs">Mã đơn</TableHead>
                <TableHead className="text-muted-foreground text-xs">Khách hàng</TableHead>
                <TableHead className="text-muted-foreground text-xs">Phòng</TableHead>
                <TableHead className="text-muted-foreground text-xs">Nguồn đặt</TableHead>
                <TableHead className="text-muted-foreground text-xs">Thời gian lưu trú</TableHead>
                <TableHead className="text-muted-foreground text-xs text-right">Tổng tiền phòng</TableHead>
                <TableHead className="text-muted-foreground text-xs">Trạng thái</TableHead>
                <TableHead className="text-muted-foreground text-xs text-right w-44">Thao tác nhanh</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredBookings.length === 0 ? (
                <TableRow>
                  <TableCell colSpan="8" className="text-center py-12 text-xs text-muted-foreground">
                    Không tìm thấy thông tin đơn đặt phòng trùng khớp.
                  </TableCell>
                </TableRow>
              ) : (
                filteredBookings.map((b) => {
                  const room = rooms.find(r => String(r.Id) === String(b.RoomId));
                  return (
                    <TableRow key={b.Id} className="border-border hover:bg-muted/50">
                      <TableCell className="font-mono text-xs text-muted-foreground font-semibold">
                        #{b.Id}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="text-xs font-semibold text-foreground">{b.CustomerName}</span>
                          <span className="text-[10px] text-muted-foreground">{b.CustomerPhone || 'Không có SĐT'}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-xs font-semibold text-foreground">
                        {room?.RoomName || `Phòng #${b.RoomId}`}
                      </TableCell>
                      <TableCell>
                        {getSourceBadge(b)}
                      </TableCell>
                      <TableCell className="text-xs text-foreground font-mono">
                        {b.CheckInDate} → {b.CheckOutDate}
                      </TableCell>
                      <TableCell className="text-xs text-right font-mono font-semibold text-foreground">
                        {Number(b.TotalPrice).toLocaleString('vi-VN')}đ
                      </TableCell>
                      <TableCell>{getStatusBadge(b.Status)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          {/* Quick check-in action */}
                          {['Pending', 'Confirmed'].includes(b.Status) && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleStatusChange(b.Id, 'CheckedIn')}
                              className="h-8 w-8 text-neutral-500 hover:text-green-500 hover:bg-green-500/10 rounded-md"
                              title="Check-in"
                            >
                              <Play className="h-3.5 w-3.5" />
                            </Button>
                          )}
                          
                          {/* Quick check-out action */}
                          {b.Status === 'CheckedIn' && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleOpenExistingBooking(b.Id)} // open detail to view final bill before check-out
                              className="h-8 w-8 text-neutral-500 hover:text-green-500 hover:bg-green-500/10 rounded-md"
                              title="Thanh toán & Check-out"
                            >
                              <CheckCircle className="h-3.5 w-3.5 text-green-500" />
                            </Button>
                          )}

                          {/* Quick cancel action */}
                          {['Pending', 'Confirmed'].includes(b.Status) && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleStatusChange(b.Id, 'Cancelled')}
                              className="h-8 w-8 text-neutral-500 hover:text-rose-500 hover:bg-rose-500/10 rounded-md"
                              title="Hủy phòng"
                            >
                              <Ban className="h-3.5 w-3.5" />
                            </Button>
                          )}

                          {/* Detail Edit action */}
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleOpenExistingBooking(b.Id)}
                            className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-muted rounded-md"
                            title="Chỉnh sửa chi tiết"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Booking Form overlay */}
      <BookingModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        bookingId={selectedBookingId}
        onSave={fetchBookingsData}
      />
    </div>
  );
}
