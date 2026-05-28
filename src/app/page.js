'use client';

import React, { useState, useEffect } from 'react';
import { useBranch } from '@/components/BranchContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { CalendarDays, DollarSign, DoorOpen, Users, ArrowUpRight, ArrowDownRight, RefreshCw, Loader2, ArrowRight } from 'lucide-react';
import BookingModal from '@/components/BookingModal';
import Link from 'next/link';

export default function DashboardPage() {
  const { selectedBranch, user } = useBranch();
  
  // Dashboard states
  const [rooms, setRooms] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [bookingSources, setBookingSources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedBookingId, setSelectedBookingId] = useState(null);

  const fetchDashboardData = async () => {
    setIsRefreshing(true);
    try {
      const activeBranch = user?.role === 'Admin' ? selectedBranch : user?.branchId;
      const branchQuery = activeBranch === 'all' ? '' : `?branchId=${activeBranch}`;

      const [roomsRes, bookingsRes, sourcesRes] = await Promise.all([
        fetch(`/api/rooms${branchQuery}`),
        fetch(`/api/bookings${branchQuery}`),
        fetch('/api/booking-sources')
      ]);

      const roomsData = await roomsRes.json();
      const bookingsData = await bookingsRes.json();
      const sourcesData = await sourcesRes.json();

      if (Array.isArray(roomsData)) setRooms(roomsData);
      if (Array.isArray(bookingsData)) setBookings(bookingsData);
      if (Array.isArray(sourcesData)) setBookingSources(sourcesData);
    } catch (e) {
      console.error('Failed to load dashboard data:', e);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
    
    // Listen for branch changes
    const handleBranchChange = () => {
      setLoading(true);
      fetchDashboardData();
    };
    window.addEventListener('branchChanged', handleBranchChange);
    return () => window.removeEventListener('branchChanged', handleBranchChange);
  }, [selectedBranch, user]);

  // Statistics calculations
  const totalRooms = rooms.length;
  const occupiedRooms = rooms.filter(r => r.Status === 'Occupied').length;
  const occupancyRate = totalRooms > 0 ? Math.round((occupiedRooms / totalRooms) * 100) : 0;

  // Today's date in YYYY-MM-DD
  const todayStr = new Date().toISOString().split('T')[0];

  const todayArrivals = bookings.filter(b => b.CheckInDate === todayStr && b.Status !== 'Cancelled');
  const todayDepartures = bookings.filter(b => b.CheckOutDate === todayStr && b.Status !== 'Cancelled');
  
  // Financial summaries
  const totalBookingsCount = bookings.filter(b => b.Status !== 'Cancelled').length;
  
  // Revenue calculation: Sum of all room costs of confirmed/checkedIn/checkedOut bookings
  const roomRevenue = bookings
    .filter(b => ['Confirmed', 'CheckedIn', 'CheckedOut'].includes(b.Status))
    .reduce((acc, curr) => acc + Number(curr.TotalPrice), 0);

  // Channel Revenue calculation
  const activeBookings = bookings.filter(b => ['Confirmed', 'CheckedIn', 'CheckedOut'].includes(b.Status));
  
  const channelRevenueData = bookingSources.map(source => {
    const revenue = activeBookings
      .filter(b => String(b.BookingSourceId) === String(source.Id))
      .reduce((acc, curr) => acc + Number(curr.TotalPrice), 0);
    return {
      name: source.SourceName,
      code: source.SourceCode,
      revenue,
      percentage: roomRevenue > 0 ? Math.round((revenue / roomRevenue) * 100) : 0
    };
  });

  // Add source-less bookings
  const sourcelessRevenue = activeBookings
    .filter(b => !b.BookingSourceId)
    .reduce((acc, curr) => acc + Number(curr.TotalPrice), 0);

  if (sourcelessRevenue > 0 || activeBookings.some(b => !b.BookingSourceId)) {
    channelRevenueData.push({
      name: '⚠️ Chưa gán nguồn / Lỗi',
      code: 'UNKNOWN',
      revenue: sourcelessRevenue,
      percentage: roomRevenue > 0 ? Math.round((sourcelessRevenue / roomRevenue) * 100) : 0
    });
  }

  // Sort channels by revenue descending
  channelRevenueData.sort((a, b) => b.revenue - a.revenue);

  // We can show total earnings and bookings summaries
  const getStatusText = (status) => {
    switch (status) {
      case 'Pending': return <span className="text-amber-500 font-medium text-xs">Chờ nhận phòng</span>;
      case 'Confirmed': return <span className="text-blue-500 font-medium text-xs">Đã xác nhận</span>;
      case 'CheckedIn': return <span className="text-green-400 font-medium text-xs">Đang lưu trú</span>;
      case 'CheckedOut': return <span className="text-muted-foreground font-medium text-xs">Đã trả phòng</span>;
      default: return <span className="text-muted-foreground text-xs">Không rõ</span>;
    }
  };

  const handleOpenBooking = (bookingId) => {
    setSelectedBookingId(bookingId);
    setIsModalOpen(true);
  };

  if (loading) {
    return (
      <div className="py-20 flex flex-col items-center justify-center text-foreground">
        <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
        <p className="text-xs text-muted-foreground">Đang tải số liệu thống kê...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Title Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Tổng quan</h1>
          <p className="text-sm text-muted-foreground mt-1">Số liệu thống kê và lịch trình hôm nay</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={fetchDashboardData}
          disabled={isRefreshing}
          className="border-border hover:bg-muted text-muted-foreground hover:text-foreground"
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
          Làm mới
        </Button>
      </div>

      {/* Grid Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Occupancy Rate */}
        <Card className="border-border bg-muted/50 backdrop-blur-sm">
          <CardContent className="p-6 flex items-center justify-between">
            <div className="space-y-2">
              <span className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">Tỷ lệ lấp đầy</span>
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-bold text-foreground font-mono">{occupancyRate}%</span>
                <span className="text-xs text-muted-foreground">({occupiedRooms}/{totalRooms} phòng)</span>
              </div>
            </div>
            {/* Circular Indicator */}
            <div className="relative h-14 w-14 flex items-center justify-center">
              <svg className="absolute transform -rotate-90 w-full h-full">
                <circle cx="28" cy="28" r="22" className="stroke-neutral-800 fill-none" strokeWidth="4" />
                <circle
                  cx="28"
                  cy="28"
                  r="22"
                  className="stroke-primary fill-none transition-all duration-500"
                  strokeWidth="4"
                  strokeDasharray="138"
                  strokeDashoffset={138 - (138 * occupancyRate) / 100}
                />
              </svg>
              <DoorOpen className="h-5 w-5 text-primary" />
            </div>
          </CardContent>
        </Card>

        {/* Total Bookings */}
        <Card className="border-border bg-muted/50 backdrop-blur-sm">
          <CardContent className="p-6 flex items-center justify-between">
            <div className="space-y-2">
              <span className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">Đơn đặt phòng</span>
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-bold text-foreground font-mono">{totalBookingsCount}</span>
                <span className="text-xs text-muted-foreground">đơn active</span>
              </div>
            </div>
            <div className="h-12 w-12 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
              <CalendarDays className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        {/* Room Revenue */}
        <Card className="border-border bg-muted/50 backdrop-blur-sm">
          <CardContent className="p-6 flex items-center justify-between">
            <div className="space-y-2">
              <span className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">Doanh thu phòng</span>
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-bold text-foreground font-mono">{roomRevenue.toLocaleString('vi-VN')}đ</span>
              </div>
            </div>
            <div className="h-12 w-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <DollarSign className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        {/* Total Guests */}
        <Card className="border-border bg-muted/50 backdrop-blur-sm">
          <CardContent className="p-6 flex items-center justify-between">
            <div className="space-y-2">
              <span className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">Đón/Trả hôm nay</span>
              <div className="flex items-baseline gap-1.5 font-mono text-sm font-semibold">
                <span className="text-emerald-400 flex items-center gap-0.5">
                  <ArrowUpRight className="h-4 w-4" /> {todayArrivals.length} đến
                </span>
                <span className="text-rose-400 flex items-center gap-0.5 pl-1 border-l border-border">
                  <ArrowDownRight className="h-4 w-4" /> {todayDepartures.length} đi
                </span>
              </div>
            </div>
            <div className="h-12 w-12 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <Users className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Channel Revenue & Distribution Status */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Doanh thu theo kênh bán */}
        <Card className="border-border bg-card">
          <CardHeader className="border-b border-border/60 pb-3">
            <CardTitle className="text-sm font-bold text-primary flex items-center gap-2">
              Doanh thu theo nguồn đặt phòng
            </CardTitle>
            <CardDescription className="text-muted-foreground text-xs">
              Tỷ lệ phân chia doanh thu phòng từ các kênh phân phối
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6 space-y-4">
            {roomRevenue === 0 ? (
              <div className="text-center py-6 text-xs text-muted-foreground">
                Chưa phát sinh doanh thu phòng để thống kê.
              </div>
            ) : (
              channelRevenueData.map((channel, idx) => {
                const isUnknown = channel.code === 'UNKNOWN';
                return (
                  <div key={idx} className="space-y-1.5">
                    <div className="flex justify-between text-xs">
                      <span className={`font-medium ${isUnknown ? 'text-rose-400 font-semibold' : 'text-foreground'}`}>
                        {channel.name} {channel.code && `(${channel.code})`}
                      </span>
                      <span className="font-mono text-foreground">
                        {channel.revenue.toLocaleString('vi-VN')}đ ({channel.percentage}%)
                      </span>
                    </div>
                    {/* Progress Bar Container */}
                    <div className="w-full h-2 rounded-full bg-muted overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          isUnknown ? 'bg-rose-500' : 'bg-primary'
                        }`}
                        style={{ width: `${channel.percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>

        {/* Trạng thái nguồn phân phối */}
        <Card className="border-border bg-card">
          <CardHeader className="border-b border-border/60 pb-3">
            <CardTitle className="text-sm font-bold text-foreground flex items-center gap-2">
              Thống kê lượng đặt phòng theo kênh
            </CardTitle>
            <CardDescription className="text-muted-foreground text-xs">
              Số lượng đơn đặt phát sinh từ các nguồn đặt phòng
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="border-border hover:bg-transparent">
                  <TableHead className="text-muted-foreground text-xs">Mã nguồn</TableHead>
                  <TableHead className="text-muted-foreground text-xs">Kênh bán</TableHead>
                  <TableHead className="text-muted-foreground text-xs text-right">Tổng đơn đặt</TableHead>
                  <TableHead className="text-muted-foreground text-xs text-right">Tỷ lệ đơn</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {bookingSources.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan="4" className="text-center py-6 text-xs text-muted-foreground">
                      Chưa có cấu hình nguồn đặt phòng.
                    </TableCell>
                  </TableRow>
                ) : (
                  [
                    ...bookingSources.map(source => {
                      const count = bookings.filter(b => String(b.BookingSourceId) === String(source.Id)).length;
                      const percentage = bookings.length > 0 ? Math.round((count / bookings.length) * 100) : 0;
                      return { code: source.SourceCode, name: source.SourceName, count, percentage, isUnknown: false };
                    }),
                    // add unknown
                    {
                      code: 'UNKNOWN',
                      name: '⚠️ Chưa gán nguồn / Trống',
                      count: bookings.filter(b => !b.BookingSourceId).length,
                      percentage: bookings.length > 0 ? Math.round((bookings.filter(b => !b.BookingSourceId).length / bookings.length) * 100) : 0,
                      isUnknown: true
                    }
                  ]
                    .filter(item => item.count > 0 || !item.isUnknown) // only show Unknown row if there are actual source-less bookings
                    .sort((a, b) => b.count - a.count)
                    .map((item, idx) => (
                      <TableRow key={idx} className="border-border hover:bg-muted/50">
                        <TableCell className="font-mono text-xs py-2.5">
                          <span className={`px-1.5 py-0.5 rounded text-[10px] ${
                            item.isUnknown ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' : 'bg-primary/10 text-primary border border-primary/20'
                          }`}>
                            {item.code}
                          </span>
                        </TableCell>
                        <TableCell className={`text-xs py-2.5 ${item.isUnknown ? 'text-rose-400 font-semibold' : 'text-foreground'}`}>
                          {item.name}
                        </TableCell>
                        <TableCell className="text-xs text-right font-mono font-semibold text-foreground py-2.5">
                          {item.count} đơn
                        </TableCell>
                        <TableCell className="text-xs text-right font-mono text-muted-foreground py-2.5">
                          {item.percentage}%
                        </TableCell>
                      </TableRow>
                    ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {/* Main schedule layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Today's Arrivals */}
        <Card className="border-border bg-card">
          <CardHeader className="border-b border-border/60 pb-3">
            <CardTitle className="text-sm font-bold text-emerald-400 flex items-center gap-2">
              Khách Check-in Hôm Nay ({todayArrivals.length})
            </CardTitle>
            <CardDescription className="text-muted-foreground text-xs">
              Khách hàng chuẩn bị nhận phòng trong ngày
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="border-border hover:bg-transparent">
                  <TableHead className="text-muted-foreground text-xs">Khách hàng</TableHead>
                  <TableHead className="text-muted-foreground text-xs">Phòng</TableHead>
                  <TableHead className="text-muted-foreground text-xs">Trạng thái</TableHead>
                  <TableHead className="w-16"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {todayArrivals.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan="4" className="text-center py-8 text-xs text-muted-foreground">
                      Hôm nay không có lịch check-in mới.
                    </TableCell>
                  </TableRow>
                ) : (
                  todayArrivals.map((b) => {
                    const room = rooms.find(r => String(r.Id) === String(b.RoomId));
                    return (
                      <TableRow key={b.Id} className="border-border hover:bg-muted/50">
                        <TableCell className="py-3">
                          <div className="flex flex-col">
                            <span className="text-xs font-semibold text-foreground">{b.CustomerName}</span>
                            <span className="text-[10px] text-muted-foreground">{b.CustomerPhone || 'Không có SĐT'}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-xs text-foreground font-medium">
                          {room?.RoomName || `Phòng #${b.RoomId}`}
                        </TableCell>
                        <TableCell>{getStatusText(b.Status)}</TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleOpenBooking(b.Id)}
                            className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-muted rounded-md"
                          >
                            <ArrowRight className="h-3.5 w-3.5" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Today's Departures */}
        <Card className="border-border bg-card">
          <CardHeader className="border-b border-border/60 pb-3">
            <CardTitle className="text-sm font-bold text-rose-400 flex items-center gap-2">
              Khách Check-out Hôm Nay ({todayDepartures.length})
            </CardTitle>
            <CardDescription className="text-muted-foreground text-xs">
              Khách hàng chuẩn bị trả phòng trong ngày
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="border-border hover:bg-transparent">
                  <TableHead className="text-muted-foreground text-xs">Khách hàng</TableHead>
                  <TableHead className="text-muted-foreground text-xs">Phòng</TableHead>
                  <TableHead className="text-muted-foreground text-xs">Trạng thái</TableHead>
                  <TableHead className="w-16"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {todayDepartures.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan="4" className="text-center py-8 text-xs text-muted-foreground">
                      Hôm nay không có lịch trả phòng.
                    </TableCell>
                  </TableRow>
                ) : (
                  todayDepartures.map((b) => {
                    const room = rooms.find(r => String(r.Id) === String(b.RoomId));
                    return (
                      <TableRow key={b.Id} className="border-border hover:bg-muted/50">
                        <TableCell className="py-3">
                          <div className="flex flex-col">
                            <span className="text-xs font-semibold text-foreground">{b.CustomerName}</span>
                            <span className="text-[10px] text-muted-foreground">{b.CustomerPhone || 'Không có SĐT'}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-xs text-foreground font-medium">
                          {room?.RoomName || `Phòng #${b.RoomId}`}
                        </TableCell>
                        <TableCell>{getStatusText(b.Status)}</TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleOpenBooking(b.Id)}
                            className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-muted rounded-md"
                          >
                            <ArrowRight className="h-3.5 w-3.5" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {/* Booking Dialog Modal overlay */}
      <BookingModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        bookingId={selectedBookingId}
        onSave={fetchDashboardData}
      />
    </div>
  );
}
