'use client';

import React, { useState, useEffect } from 'react';
import { useBranch } from '@/components/BranchContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ChevronLeft, ChevronRight, Plus, RefreshCw, CalendarDays, Loader2, Users } from 'lucide-react';
import BookingModal from '@/components/BookingModal';
import BlockModal from '@/components/BlockModal';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';

export default function CalendarPage() {
  const { selectedBranch, user } = useBranch();
  
  // Date state (defaults to 2 days ago so we see currently active bookings)
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 2);
    return d;
  });

  const [rooms, setRooms] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [roomBlocks, setRoomBlocks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedBookingId, setSelectedBookingId] = useState(null);
  const [initialRoomId, setInitialRoomId] = useState('');
  const [initialDate, setInitialDate] = useState('');

  // Choice dialog states
  const [isChoiceOpen, setIsChoiceOpen] = useState(false);
  const [choiceRoomId, setChoiceRoomId] = useState('');
  const [choiceDate, setChoiceDate] = useState('');
  
  // Block Modal states
  const [isBlockModalOpen, setIsBlockModalOpen] = useState(false);

  // Timeline config
  const [numDays, setNumDays] = useState(14);
  const daysArray = Array.from({ length: numDays }, (_, i) => {
    const d = new Date(startDate);
    d.setDate(d.getDate() + i);
    return d;
  });

  const fetchCalendarData = async () => {
    setIsRefreshing(true);
    try {
      const activeBranch = user?.role === 'Admin' ? selectedBranch : user?.branchId;
      const branchQuery = activeBranch === 'all' ? '' : `?branchId=${activeBranch}`;

      const [roomsRes, bookingsRes, blocksRes] = await Promise.all([
        fetch(`/api/rooms${branchQuery}`),
        fetch(`/api/bookings${branchQuery}`),
        fetch('/api/room-blocks')
      ]);

      const roomsData = await roomsRes.json();
      const bookingsData = await bookingsRes.json();
      const blocksData = await blocksRes.json();

      if (Array.isArray(roomsData)) setRooms(roomsData);
      if (Array.isArray(bookingsData)) setBookings(bookingsData);
      if (Array.isArray(blocksData)) setRoomBlocks(blocksData);
    } catch (e) {
      console.error('Failed to fetch calendar data:', e);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchCalendarData();
    
    // Listen for branch changes
    const handleBranchChange = () => {
      setLoading(true);
      fetchCalendarData();
    };
    window.addEventListener('branchChanged', handleBranchChange);
    return () => window.removeEventListener('branchChanged', handleBranchChange);
  }, [selectedBranch, user]);

  const handlePrevWeek = () => {
    const newStart = new Date(startDate);
    newStart.setDate(newStart.getDate() - 7);
    setStartDate(newStart);
  };

  const handleNextWeek = () => {
    const newStart = new Date(startDate);
    newStart.setDate(newStart.getDate() + 7);
    setStartDate(newStart);
  };

  const handleToday = () => {
    const d = new Date();
    d.setDate(d.getDate() - 2); // Show 2 days before today by default
    setStartDate(d);
  };

  const handleDateChange = (e) => {
    if (e.target.value) {
      setStartDate(new Date(e.target.value));
    }
  };

  const formatDateForInput = (d) => {
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  };

  // Helper: check if two dates are the same day (ignoring hours)
  const isSameDay = (d1, d2) => {
    return d1.getFullYear() === d2.getFullYear() &&
           d1.getMonth() === d2.getMonth() &&
           d1.getDate() === d2.getDate();
  };

  // Helper: check if a date is within the timeline boundaries
  const isDateBetween = (date, start, end) => {
    const d = new Date(date);
    d.setHours(0,0,0,0);
    const s = new Date(start);
    s.setHours(0,0,0,0);
    const e = new Date(end);
    e.setHours(23,59,59,999);
    return d >= s && d <= e;
  };

  const getDayDiff = (d1, d2) => {
    const date1 = new Date(d1);
    date1.setHours(0,0,0,0);
    const date2 = new Date(d2);
    date2.setHours(0,0,0,0);
    const diffTime = date1 - date2;
    return Math.round(diffTime / (1000 * 60 * 60 * 24));
  };

  const handleOpenNewBooking = (roomId = '', date = '') => {
    if (roomId && date) {
      setChoiceRoomId(roomId);
      setChoiceDate(date);
      setIsChoiceOpen(true);
    } else {
      setSelectedBookingId(null);
      setInitialRoomId('');
      setInitialDate('');
      setIsModalOpen(true);
    }
  };

  const handleOpenExistingBooking = (bookingId) => {
    setSelectedBookingId(bookingId);
    setIsModalOpen(true);
  };

  const handleOpenExistingBlock = (block) => {
    if (confirm(`Bạn có chắc muốn xóa lịch khóa phòng này từ ngày ${block.StartDate} đến ngày ${block.EndDate}?`)) {
      fetch(`/api/room-blocks?id=${block.Id}`, {
        method: 'DELETE'
      })
        .then(res => res.json())
        .then(data => {
          if (data.error) {
            toast.error(data.error);
          } else {
            toast.success('Hủy khóa phòng thành công!');
            fetchCalendarData();
          }
        })
        .catch(err => {
          toast.error('Lỗi khi hủy khóa phòng: ' + err.message);
        });
    }
  };

  const getBookingColor = (status) => {
    switch (status) {
      case 'Pending': return 'bg-amber-100 dark:bg-amber-500/20 border-amber-300 dark:border-amber-500/50 text-amber-700 dark:text-amber-300';
      case 'Confirmed': return 'bg-blue-100 dark:bg-blue-500/20 border-blue-300 dark:border-blue-500/50 text-blue-700 dark:text-blue-300';
      case 'CheckedIn': return 'bg-green-100 dark:bg-green-500/25 border-green-300 dark:border-green-500/50 text-green-700 dark:text-green-300';
      case 'CheckedOut': return 'bg-neutral-100 dark:bg-neutral-500/10 border-neutral-300 dark:border-neutral-800 text-neutral-600 dark:text-neutral-400';
      default: return 'bg-muted border-border text-muted-foreground';
    }
  };

  if (loading) {
    return (
      <div className="py-20 flex flex-col items-center justify-center text-foreground">
        <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
        <p className="text-xs text-muted-foreground">Đang tải sơ đồ lịch đặt phòng...</p>
      </div>
    );
  }

  const endDate = daysArray[numDays - 1];

  // Room grouping logic
  const groupedRooms = rooms.reduce((acc, room) => {
    const type = room.RoomType || 'Chưa phân loại';
    if (!acc[type]) acc[type] = [];
    acc[type].push(room);
    return acc;
  }, {});

  const displayRows = [];
  Object.entries(groupedRooms).forEach(([type, rArr]) => {
    displayRows.push({ isHeader: true, type, count: rArr.length });
    rArr.forEach(r => displayRows.push(r));
  });

  return (
    <div className="space-y-6">
      {/* Title Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Lịch đặt phòng</h1>
          <p className="text-sm text-muted-foreground mt-1">Quản lý đặt phòng trực quan theo sơ đồ thời gian</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {/* View Mode Selector */}
          <Select value={String(numDays)} onValueChange={(v) => setNumDays(Number(v))}>
            <SelectTrigger className="w-28 h-8 text-xs bg-background border-border text-foreground">
              <SelectValue placeholder="Số ngày" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">7 ngày</SelectItem>
              <SelectItem value="14">14 ngày</SelectItem>
              <SelectItem value="30">30 ngày</SelectItem>
            </SelectContent>
          </Select>

          {/* Date Controls */}
          <div className="flex items-center bg-background border border-border rounded-md p-0.5">
            <Button
              variant="ghost"
              size="sm"
              onClick={handlePrevWeek}
              className="h-7 px-2 hover:bg-muted text-muted-foreground hover:text-foreground"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleToday}
              className="h-7 px-3 hover:bg-muted text-foreground hover:text-foreground text-xs font-medium"
            >
              Hôm nay
            </Button>
            <Input 
              type="date" 
              value={formatDateForInput(startDate)} 
              onChange={handleDateChange} 
              className="h-7 w-[120px] px-2 text-xs bg-transparent border-none text-foreground focus-visible:ring-0 dark:[&::-webkit-calendar-picker-indicator]:invert"
            />
            <Button
              variant="ghost"
              size="sm"
              onClick={handleNextWeek}
              className="h-7 px-2 hover:bg-muted text-muted-foreground hover:text-foreground"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          
          <Button
            variant="outline"
            size="sm"
            onClick={fetchCalendarData}
            disabled={isRefreshing}
            className="border-border hover:bg-muted text-muted-foreground hover:text-foreground"
          >
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          </Button>

          <Button
            size="sm"
            onClick={() => handleOpenNewBooking()}
            className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-xs"
          >
            <Plus className="h-4 w-4 mr-1.5" />
            Đặt phòng
          </Button>
        </div>
      </div>

      {/* Grid Timeline Scheduler */}
      <Card className="border-border bg-card overflow-x-auto select-none rounded-xl">
        <CardContent className="p-4 min-w-[900px]">
          {/* Grid Layout definition */}
          <div 
            className="grid gap-y-[3px]"
            style={{
              gridTemplateColumns: `180px repeat(${numDays}, 1fr)`,
            }}
          >
            {/* Header dates row */}
            <div className="h-14 flex items-center pr-3 font-semibold text-xs text-muted-foreground border-b border-border">
              Phòng / Ngày
            </div>
            {daysArray.map((day, idx) => {
              const isToday = isSameDay(day, new Date());
              return (
                <div 
                  key={idx} 
                  className={`h-14 flex flex-col items-center justify-center border-b border-border text-center font-mono ${
                    isToday ? 'bg-primary/5 text-primary font-bold border-x border-primary/10' : 'text-muted-foreground'
                  }`}
                >
                  <span className="text-[10px] uppercase font-semibold text-muted-foreground">
                    {day.toLocaleDateString('vi-VN', { weekday: 'short' })}
                  </span>
                  <span className="text-sm mt-0.5">{day.getDate()}</span>
                </div>
              );
            })}

            {/* Rooms Rows */}
            {rooms.length === 0 ? (
              <div 
                className="py-12 text-center text-xs text-muted-foreground" 
                style={{ gridColumn: `1 / span ${numDays + 1}` }}
              >
                Chưa có phòng nào được tạo ở chi nhánh này. Vui lòng thêm phòng trong phần Quản lý phòng.
              </div>
            ) : (
              displayRows.map((row, rowIdx) => {
                const gridRow = rowIdx + 2;

                if (row.isHeader) {
                  return (
                    <React.Fragment key={`header-${row.type}`}>
                      {/* Group Header Y-Axis */}
                      <div 
                        className="h-12 flex items-center pr-3 border-r border-border bg-muted/50 pl-2 shadow-inner"
                        style={{ gridColumn: 1, gridRow: gridRow }}
                      >
                        <span className="text-xs font-bold text-foreground uppercase tracking-wider">{row.type}</span>
                        <span className="ml-2 text-[10px] text-muted-foreground bg-background border border-border px-1.5 py-0.5 rounded-full">{row.count}</span>
                      </div>
                      
                      {/* Empty cells for Header row */}
                      {daysArray.map((day, colIdx) => (
                        <div 
                          key={`empty-header-${rowIdx}-${colIdx}`}
                          className="h-[42px] border-b border-r border-border bg-muted/30"
                          style={{ gridColumn: colIdx + 2, gridRow: gridRow }}
                        />
                      ))}
                    </React.Fragment>
                  );
                }

                // Normal Room Row
                const room = row;
                
                // Find bookings that belong to this room and cross the active interval
                const roomBookings = bookings.filter(b => 
                  String(b.RoomId) === String(room.Id) &&
                  b.Status !== 'Cancelled' &&
                  b.Status !== 'NoShow' &&
                  (isDateBetween(b.CheckInDate, startDate, endDate) ||
                   isDateBetween(b.CheckOutDate, startDate, endDate) ||
                   (new Date(b.CheckInDate) <= startDate && new Date(b.CheckOutDate) >= endDate))
                );

                // Find room blocks that belong to this room and cross the active interval
                const roomBlocksList = roomBlocks.filter(block => 
                  String(block.RoomId) === String(room.Id) &&
                  (isDateBetween(block.StartDate, startDate, endDate) ||
                   isDateBetween(block.EndDate, startDate, endDate) ||
                   (new Date(block.StartDate) <= startDate && new Date(block.EndDate) >= endDate))
                );

                return (
                  <React.Fragment key={room.Id}>
                    {/* Room title block */}
                    <div 
                      className="h-12 flex items-center pr-3 border-r border-border bg-card overflow-hidden"
                      style={{ gridColumn: 1, gridRow: gridRow }}
                    >
                      <div className="flex flex-col pl-4">
                        <span className="text-xs font-bold text-foreground tracking-wide truncate max-w-[150px]">
                          {room.RoomName}
                        </span>
                        <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground font-medium truncate mt-0.5">
                          <span className="font-mono">ID: {room.Id}</span>
                          {room.MaxGuests && (
                            <span className="flex items-center gap-0.5" title="Sức chứa tối đa"><Users className="h-2.5 w-2.5" />{room.MaxGuests}</span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Day cells grid background */}
                    {daysArray.map((day, colIdx) => {
                      const dateStr = day.toISOString().split('T')[0];
                      const isWeekend = day.getDay() === 0 || day.getDay() === 6;
                      
                      // Check if this cell's date is blocked
                      const isCellBlocked = roomBlocksList.some(block => {
                        const blockStart = new Date(block.StartDate);
                        blockStart.setHours(0,0,0,0);
                        const blockEnd = new Date(block.EndDate);
                        blockEnd.setHours(23,59,59,999);
                        const current = new Date(day);
                        return current >= blockStart && current <= blockEnd;
                      });

                      return (
                        <div 
                          key={colIdx}
                          style={{ gridColumn: colIdx + 2, gridRow: gridRow }}
                          onClick={isCellBlocked ? null : () => handleOpenNewBooking(room.Id, dateStr)}
                          className={`h-12 border-b border-r border-border/60 relative transition-all ${
                            isCellBlocked 
                              ? 'cursor-not-allowed bg-rose-500/10' 
                              : `cursor-pointer hover:bg-muted/60 group/cell ${isWeekend ? 'bg-muted/30' : ''}`
                          }`}
                        >
                          {!isCellBlocked && (
                            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover/cell:opacity-100 transition-opacity pointer-events-none">
                              <Plus className="h-4 w-4 text-muted-foreground" />
                            </div>
                          )}
                        </div>
                      );
                    })}

                    {/* Render Room Blocks Overlay Card */}
                    {roomBlocksList.map((block) => {
                      const start = new Date(block.StartDate);
                      const end = new Date(block.EndDate);

                      let startCol = getDayDiff(start, startDate);
                      let endCol = getDayDiff(end, startDate);

                      const isLeftOut = startCol < 0;
                      const isRightOut = endCol > numDays;

                      startCol = Math.max(0, startCol) + 2; 
                      endCol = Math.min(numDays, endCol) + 2; 

                      const colSpan = Math.max(1, endCol - startCol + 1);

                      return (
                        <div
                          key={`block-${block.Id}`}
                          onClick={() => handleOpenExistingBlock(block)}
                          style={{
                            gridColumn: `${startCol} / span ${colSpan}`,
                            gridRow: gridRow,
                          }}
                          className="mx-[2px] my-[3px] h-[36px] flex flex-col justify-center rounded-lg border px-2.5 shadow-md cursor-pointer transition-all z-10 hover:shadow-lg hover:scale-[1.01] text-left border-dashed bg-rose-50 dark:bg-neutral-900/90 border-rose-300 dark:border-rose-950/50 text-rose-600 dark:text-neutral-400"
                          title={`🚧 BẢO TRÌ: ${block.Notes || 'Khóa phòng'}`}
                        >
                          <div className="text-[10px] font-bold truncate leading-tight flex items-center gap-1">
                            <span>🚧</span>
                            <span className="text-rose-400">
                              {block.BlockType === 'Maintenance' ? 'BẢO TRÌ' : block.BlockType === 'OwnerUse' ? 'CHỦ SỬ DỤNG' : 'ĐANG KHÓA'}
                            </span>
                            {block.Notes && <span className="text-neutral-500 font-normal">({block.Notes})</span>}
                          </div>
                        </div>
                      );
                    })}

                    {/* Render Booking Span Overlay Card */}
                    {roomBookings.map((b) => {
                      const checkIn = new Date(b.CheckInDate);
                      const checkOut = new Date(b.CheckOutDate);

                      // Calculate grid columns span
                      // Grid starts at column 2 (day 0) and ends at column 16 (day 13)
                      let startCol = getDayDiff(checkIn, startDate);
                      let endCol = getDayDiff(checkOut, startDate);

                      // Clamp values to fit active grid viewport [0, 14]
                      const isLeftOut = startCol < 0;
                      const isRightOut = endCol > numDays;

                      startCol = Math.max(0, startCol) + 2; 
                      endCol = Math.min(numDays, endCol) + 2; 

                      // Span must be at least 1
                      const colSpan = Math.max(1, endCol - startCol);

                      return (
                        <div
                          key={b.Id}
                          onClick={() => handleOpenExistingBooking(b.Id)}
                          style={{
                            gridColumn: `${startCol} / span ${colSpan}`,
                            gridRow: gridRow,
                          }}
                          className={`mx-[2px] my-[3px] h-[36px] flex flex-col justify-center rounded-lg border px-2.5 shadow-md cursor-pointer transition-all z-10 hover:shadow-lg hover:scale-[1.01] group/booking relative ${getBookingColor(b.Status)}`}
                        >
                          {/* Rich Tooltip (CSS Hover) */}
                          <div className="absolute hidden group-hover/booking:flex flex-col bottom-full left-1/2 -translate-x-1/2 mb-2 w-56 bg-popover border border-border shadow-xl rounded-xl p-3 z-50 text-popover-foreground pointer-events-none">
                            <div className="font-bold text-sm mb-1">{b.CustomerName}</div>
                            <div className="text-xs text-muted-foreground mb-2 flex items-center gap-1">📞 {b.CustomerPhone || 'Không có SĐT'}</div>
                            
                            <div className="grid grid-cols-2 gap-2 text-xs mb-2 bg-muted/60 p-2 rounded-lg">
                              <div>
                                <div className="text-[9px] text-muted-foreground uppercase">IN</div>
                                <div className="text-foreground font-semibold">{checkIn.getDate()}/{checkIn.getMonth() + 1}</div>
                              </div>
                              <div>
                                <div className="text-[9px] text-muted-foreground uppercase">OUT</div>
                                <div className="text-foreground font-semibold">{checkOut.getDate()}/{checkOut.getMonth() + 1}</div>
                              </div>
                            </div>

                            <div className="flex justify-between items-center text-xs mt-1">
                              <span className="text-muted-foreground">Khách: {b.GuestCount || 1} 👥</span>
                              <span className="font-bold text-primary">{Number(b.TotalPrice || 0).toLocaleString('vi-VN')}đ</span>
                            </div>
                            
                            {/* Triangle pointer */}
                            <div className="absolute top-full left-1/2 -translate-x-1/2 border-8 border-transparent border-t-border" />
                          </div>

                          <div className="text-[10px] font-bold truncate leading-tight flex items-center gap-1">
                            {b.BookingType === 'Hourly' && <span className="text-[9px] text-amber-400 font-normal flex items-center gap-0.5">🕒 {b.CheckInTime}-{b.CheckOutTime}</span>}
                            {b.BookingType === 'Overnight' && <span className="text-[9px] text-emerald-400 font-semibold">Qua đêm</span>}
                            <span>{b.CustomerName}</span>
                            {Number(b.TotalPrice) === 0 && <span title="Chưa có giá" className="text-[8px]">⚠️</span>}
                          </div>
                          <div className="text-[8px] opacity-75 font-mono truncate leading-none mt-0.5">
                            {isLeftOut ? '« ' : ''}
                            {checkIn.getDate()}/{checkIn.getMonth() + 1} - {checkOut.getDate()}/{checkOut.getMonth() + 1}
                            {isRightOut ? ' »' : ''}
                          </div>
                        </div>
                      );
                    })}
                  </React.Fragment>
                );
              })
            )}
          </div>
        </CardContent>
      </Card>

      {/* Legend list */}
      <div className="flex flex-wrap gap-4 items-center justify-start text-xs text-muted-foreground p-2 font-medium">
        <span className="font-semibold">Trạng thái:</span>
        <div className="flex items-center gap-1.5">
          <div className="h-3 w-3 rounded bg-amber-100 dark:bg-amber-500/20 border border-amber-300 dark:border-amber-500/50" />
          <span>Chờ nhận phòng</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="h-3 w-3 rounded bg-blue-100 dark:bg-blue-500/20 border border-blue-300 dark:border-blue-500/50" />
          <span>Đã xác nhận</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="h-3 w-3 rounded bg-green-100 dark:bg-green-500/25 border border-green-300 dark:border-green-500/50" />
          <span>Đang lưu trú</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="h-3 w-3 rounded bg-neutral-100 dark:bg-neutral-500/10 border border-neutral-300 dark:border-neutral-800" />
          <span>Đã check-out</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="h-3 w-3 rounded border border-dashed bg-rose-50 dark:bg-neutral-900/90 border-rose-300 dark:border-rose-950/50" />
          <span>🚧 Đang khóa phòng / Bảo trì</span>
        </div>
      </div>

      {/* Booking Form overlay */}
      <BookingModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        bookingId={selectedBookingId}
        initialRoomId={initialRoomId}
        initialDate={initialDate}
        onSave={fetchCalendarData}
      />

      {/* Choice Dialog */}
      <Dialog open={isChoiceOpen} onOpenChange={setIsChoiceOpen}>
        <DialogContent className="bg-card border-border text-card-foreground p-6 max-w-[360px]">
          <DialogHeader>
            <DialogTitle className="text-base text-foreground font-bold text-center">Lựa chọn thao tác</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-3 mt-4">
            <Button 
              className="bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-semibold h-10 w-full"
              onClick={() => {
                setIsChoiceOpen(false);
                setSelectedBookingId(null);
                setInitialRoomId(choiceRoomId);
                setInitialDate(choiceDate);
                setIsModalOpen(true);
              }}
            >
              Tạo đặt phòng mới
            </Button>
            <Button 
              variant="outline" 
              className="border-border hover:bg-muted text-foreground text-xs font-semibold h-10 w-full"
              onClick={() => {
                setIsChoiceOpen(false);
                setInitialRoomId(choiceRoomId);
                setInitialDate(choiceDate);
                setIsBlockModalOpen(true);
              }}
            >
              Khoá phòng / Bảo trì
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Block Form overlay */}
      <BlockModal
        isOpen={isBlockModalOpen}
        onClose={() => setIsBlockModalOpen(false)}
        initialRoomId={initialRoomId}
        initialDate={initialDate}
        onSave={fetchCalendarData}
      />
    </div>
  );
}
