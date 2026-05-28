'use client';

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useBranch } from './BranchContext';
import { Plus, Trash2, Printer, Loader2, CreditCard, Utensils, Calendar as CalendarIcon, Phone, User, FileText, Users } from 'lucide-react';
import { toast } from 'sonner';

export default function BookingModal({ isOpen, onClose, bookingId, initialRoomId, initialDate, onSave }) {
  const { selectedBranch, user, systemSettings } = useBranch();
  const loadedInitialChargeRef = React.useRef(null);
  
  // Data states
  const [rooms, setRooms] = useState([]);
  const [servicesCatalog, setServicesCatalog] = useState([]);
  const [promotions, setPromotions] = useState([]);
  
  // Booking Form states
  const [roomId, setRoomId] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [checkInDate, setCheckInDate] = useState('');
  const [checkOutDate, setCheckOutDate] = useState('');
  const [roomCharge, setRoomCharge] = useState(0);
  const [isCustomPrice, setIsCustomPrice] = useState(false);
  const [status, setStatus] = useState('Pending');
  const [notes, setNotes] = useState('');
  const [bookingSources, setBookingSources] = useState([]);
  const [bookingSourceId, setBookingSourceId] = useState('');
  const [bookingType, setBookingType] = useState('Daily');
  const [checkInTime, setCheckInTime] = useState(systemSettings?.DefaultCheckInTime || '14:00');
  const [checkOutTime, setCheckOutTime] = useState(systemSettings?.DefaultCheckOutTime || '12:00');
  const [guestCount, setGuestCount] = useState(1);
  const [promoCode, setPromoCode] = useState('');
  const [appliedPromo, setAppliedPromo] = useState(null);
  const [discountAmount, setDiscountAmount] = useState(0);

  
  // Services & Payments states
  const [servicesOrdered, setServicesOrdered] = useState([]);
  const [payments, setPayments] = useState([]);
  
  // Add service Form states
  const [selectedServiceId, setSelectedServiceId] = useState('');
  const [serviceQty, setServiceQty] = useState(1);
  const [serviceNotes, setServiceNotes] = useState('');

  // Add payment Form states
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('Bank Transfer');
  const [paymentType, setPaymentType] = useState('Deposit');
  const [paymentNotes, setPaymentNotes] = useState('');

  // UI loading states
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState('services');

  // Busy ranges state for conflict prevention
  const [busyRanges, setBusyRanges] = useState([]);
  const todayStr = new Date().toISOString().split('T')[0];

  const hasConflict = (status !== 'Cancelled' && status !== 'NoShow') && busyRanges.some(
    (r) => checkInDate < r.to && checkOutDate > r.from
  );

  // Load Rooms & Services Catalog
  useEffect(() => {
    if (isOpen) {
      const activeBranch = user?.role === 'Admin' ? selectedBranch : user?.branchId;
      
      // Load rooms for dropdown
      fetch(`/api/rooms?branchId=${activeBranch === 'all' ? '' : activeBranch}`, { cache: 'no-store' })
        .then(res => res.json())
        .then(data => {
          if (Array.isArray(data)) setRooms(data);
        });

      // Load services for dropdown
      fetch(`/api/services?branchId=${activeBranch === 'all' ? '' : activeBranch}`, { cache: 'no-store' })
        .then(res => res.json())
        .then(data => {
          if (Array.isArray(data)) setServicesCatalog(data);
        });

      // Load booking sources for dropdown
      fetch('/api/booking-sources', { cache: 'no-store' })
        .then(res => res.json())
        .then(data => {
          if (Array.isArray(data)) setBookingSources(data);
        });

      // Load promotions
      fetch('/api/promotions', { cache: 'no-store' })
        .then(res => res.json())
        .then(data => {
          if (Array.isArray(data)) setPromotions(data);
        });

      // Reset state for new booking
      if (!bookingId) {
        loadedInitialChargeRef.current = null;
        setRoomId(initialRoomId || '');
        setCustomerName('');
        setCustomerPhone('');
        setCheckInDate(initialDate || '');
        setCheckOutDate('');
        setRoomCharge(0);
        setIsCustomPrice(false);
        setStatus('Pending');
        setNotes('');
        setBookingSourceId('');
        setBookingType('Daily');
        setCheckInTime('14:00');
        setCheckOutTime('12:00');
        setGuestCount(1);
        setPromoCode('');
        setAppliedPromo(null);
        setDiscountAmount(0);
        setServicesOrdered([]);
        setPayments([]);
        setActiveTab('general');
        setBusyRanges([]);
      } else {
        // Load existing booking
        loadBookingDetails(bookingId);
      }
    }
  }, [isOpen, bookingId, initialRoomId, initialDate, selectedBranch, user]);

  // Fetch busy ranges when roomId or bookingId changes
  useEffect(() => {
    if (!roomId) {
      setBusyRanges([]);
      return;
    }
    const excludeParam = bookingId ? `&excludeId=${bookingId}` : '';
    fetch(`/api/bookings/availability?roomId=${roomId}${excludeParam}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.busy) setBusyRanges(data.busy);
      })
      .catch(() => setBusyRanges([]));
  }, [roomId, bookingId]);

  // Compute roomCharge automatically when nights / hours / room changes
  useEffect(() => {
    if (roomId && checkInDate && checkOutDate && !isCustomPrice) {
      const room = rooms.find(r => String(r.Id) === String(roomId));
      if (room) {
        let baseCharge = 0;
        
        if (bookingType === 'Hourly') {
          const start = new Date(`${checkInDate}T${checkInTime || '14:00'}`);
          const end = new Date(`${checkOutDate}T${checkOutTime || '12:00'}`);
          const diffHours = Math.ceil((end - start) / (1000 * 60 * 60));
          if (diffHours > 0) {
            let baseHourly = Number(room.HourlyPrice || room.Price * 0.2); // Fallback to 20% of daily if empty
            let extraHourly = Number(room.ExtraHourPrice || room.Price * 0.05); // Fallback to 5%
            
            if (diffHours <= 2) {
              baseCharge = baseHourly;
            } else {
              baseCharge = baseHourly + (diffHours - 2) * extraHourly;
            }
          }
        } else if (bookingType === 'Overnight') {
          const start = new Date(`${checkInDate}T${checkInTime || '22:00'}`);
          const end = new Date(`${checkOutDate}T${checkOutTime || '10:00'}`);
          const diffTime = end - start;
          const nights = Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
          baseCharge = nights * Number(room.OvernightPrice || room.Price * 0.7); // Fallback 70%
        } else {
          // Daily
          const start = new Date(checkInDate);
          const end = new Date(checkOutDate);
          const diffTime = end - start;
          const nights = Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
          
          baseCharge = nights * Number(room.Price);
          let extraHourly = Number(room.ExtraHourPrice || room.Price * 0.05);

          // Early Check-in logic (Standard IN: 14:00)
          const inHour = parseInt((checkInTime || '14:00').split(':')[0], 10);
          if (inHour < 14) {
            const earlyHours = 14 - inHour;
            if (earlyHours <= 4) {
              baseCharge += earlyHours * extraHourly;
            } else {
              baseCharge += Number(room.Price); // Half or full day rule, default to full day here if > 4h
            }
          }

          // Late Check-out logic (Standard OUT: 12:00)
          const outHour = parseInt((checkOutTime || '12:00').split(':')[0], 10);
          if (outHour > 12) {
            const lateHours = outHour - 12;
            if (lateHours <= 4) {
              baseCharge += lateHours * extraHourly;
            } else {
              baseCharge += Number(room.Price);
            }
          }
        }

        // Compare with loadedInitialCharge if it's the first render after loading
        if (loadedInitialChargeRef.current !== null) {
          if (loadedInitialChargeRef.current !== baseCharge) {
            // Price was customized manually
            setIsCustomPrice(true);
            setRoomCharge(loadedInitialChargeRef.current);
          } else {
            // Price matches standard formula, keep isCustomPrice false
            setRoomCharge(baseCharge);
          }
          loadedInitialChargeRef.current = null; // Clear ref after checking
        } else {
          setRoomCharge(baseCharge);
        }
      }
    }
  }, [roomId, checkInDate, checkOutDate, bookingType, checkInTime, checkOutTime, rooms, isCustomPrice]);

  // Dynamic Service Charge
  const serviceCharge = servicesOrdered.reduce((acc, so) => {
    return acc + (Number(so.UnitPrice) * Number(so.Quantity));
  }, 0);
  
  // Recalculate discount if appliedPromo or totals change
  useEffect(() => {
    if (appliedPromo) {
      const base = appliedPromo.ApplyScope === 'All' ? Number(roomCharge) + serviceCharge : Number(roomCharge);
      let dist = 0;
      if (appliedPromo.Type === 'Percentage') {
        dist = (base * appliedPromo.Value) / 100;
        if (appliedPromo.MaxDiscount) {
          dist = Math.min(dist, appliedPromo.MaxDiscount);
        }
      } else {
        dist = appliedPromo.Value;
      }
      
      // Không được giảm quá số tiền cơ sở
      dist = Math.min(dist, base);
      
      setDiscountAmount(dist);
    } else {
      setDiscountAmount(0);
    }
  }, [appliedPromo, roomCharge, serviceCharge]);

  const grandTotal = Math.max(0, Number(roomCharge) + serviceCharge - discountAmount);

  // Auto-suggest GuestCount from room MaxGuests when room changes (new booking only)
  useEffect(() => {
    if (!bookingId && roomId) {
      const room = rooms.find((r) => String(r.Id) === String(roomId));
      if (room?.MaxGuests) {
        setGuestCount(Number(room.MaxGuests));
      }
    }
  }, [roomId, rooms, bookingId]);

  const loadBookingDetails = async (id) => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/bookings/${id}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setRoomId(data.RoomId);
      setCustomerName(data.CustomerName);
      setCustomerPhone(data.CustomerPhone);
      setCheckInDate(data.CheckInDate);
      setCheckOutDate(data.CheckOutDate);
      
      const svcs = data.servicesOrdered || [];
      setServicesOrdered(svcs);
      const svcTotal = svcs.reduce((sum, item) => sum + (Number(item.UnitPrice) * Number(item.Quantity)), 0);
      const loadedCharge = Number(data.TotalPrice || 0) - svcTotal + Number(data.DiscountAmount || 0);
      setRoomCharge(loadedCharge);
      loadedInitialChargeRef.current = loadedCharge; // Store to compare against auto charge
      setIsCustomPrice(false); // Default to off, let useEffect turn it on if it mismatches auto charge

      setStatus(data.Status);
      setNotes(data.Notes || '');
      setBookingSourceId(data.BookingSourceId ? String(data.BookingSourceId) : '');
      setBookingType(data.BookingType || 'Daily');
      setCheckInTime(data.CheckInTime || '14:00');
      setCheckOutTime(data.CheckOutTime || '12:00');
      setGuestCount(data.GuestCount ? Number(data.GuestCount) : 1);
      setPromoCode(data.PromoCode || '');
      if (data.PromoCode) {
        setAppliedPromo({ Code: data.PromoCode }); // Dummy for UI display
      } else {
        setAppliedPromo(null);
      }
      setDiscountAmount(Number(data.DiscountAmount || 0));
      setPayments(data.payments || []);
    } catch (e) {
      toast.error('Lỗi khi tải chi tiết đơn đặt phòng: ' + e.message);
      onClose();
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveGeneral = async (e) => {
    e.preventDefault();
    if (!roomId || !customerName || !checkInDate || !checkOutDate) {
      toast.error('Vui lòng điền đầy đủ các thông tin bắt buộc.');
      return;
    }

    if (new Date(checkInDate) > new Date(checkOutDate)) {
      toast.error('Ngày nhận phòng không thể lớn hơn ngày trả phòng.');
      return;
    }

    if (hasConflict) {
      toast.error('Khoảng thời gian đặt phòng bị trùng lặp với lịch hiện có. Vui lòng chọn ngày khác.');
      return;
    }

    setIsSubmitting(true);
    try {
      const activeBranch = user?.role === 'Admin' ? selectedBranch : user?.branchId;

      // Soft-block: warn if guestCount exceeds room MaxGuests
      const selectedRoom = rooms.find((r) => String(r.Id) === String(roomId));
      if (selectedRoom?.MaxGuests && guestCount > Number(selectedRoom.MaxGuests)) {
        toast.warning(
          `⚠️ Số khách (${guestCount}) vượt quá sức chứa phòng (tối đa ${selectedRoom.MaxGuests} người). Lễ tân đã xác nhận tiếp tục.`
        );
      }

      const payload = {
        RoomId: roomId,
        BranchId: activeBranch === 'all' ? rooms.find(r => String(r.Id) === String(roomId))?.BranchId : activeBranch,
        CustomerName: customerName,
        CustomerPhone: customerPhone,
        CheckInDate: checkInDate,
        CheckOutDate: checkOutDate,
        BookingType: bookingType,
        CheckInTime: checkInTime,
        CheckOutTime: checkOutTime,
        TotalPrice: grandTotal,
        Status: status,
        Notes: notes,
        GuestCount: Number(guestCount) || 1,
        BookingSourceId: (bookingSourceId && bookingSourceId !== 'none') ? Number(bookingSourceId) : null,
        PromoCode: appliedPromo ? appliedPromo.Code : null,
        DiscountAmount: discountAmount
      };

      const url = bookingId ? `/api/bookings/${bookingId}` : '/api/bookings';
      const method = bookingId ? 'PATCH' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const result = await res.json();

      if (!res.ok) throw new Error(result.error);

      toast.success(bookingId ? 'Cập nhật thành công!' : 'Tạo mới thành công!');
      onSave();
      
      if (!bookingId) {
        onClose();
      } else {
        loadBookingDetails(bookingId);
      }
    } catch (e) {
      toast.error(e.message || 'Lỗi khi lưu thông tin.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleApplyPromo = async () => {
    if (!promoCode.trim()) return;
    try {
      const selectedRoom = rooms.find((r) => String(r.Id) === String(roomId));
      
      let nights = 0;
      if (checkInDate && checkOutDate) {
        const diffTime = new Date(checkOutDate) - new Date(checkInDate);
        nights = Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
      }

      const res = await fetch('/api/promotions/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ Code: promoCode.trim(), RoomType: selectedRoom?.RoomType, Nights: nights })
      });
      const data = await res.json();
      
      if (!res.ok) {
        toast.error(data.error || 'Mã không hợp lệ');
        setAppliedPromo(null);
      } else {
        toast.success('Áp dụng mã khuyến mãi thành công!');
        setAppliedPromo(data);
        
        let newDiscount = 0;
        let baseCharge = roomCharge;

        if (data.ApplyScope === 'RoomOnly') {
          newDiscount = data.Type === 'Percentage' ? baseCharge * (data.Value / 100) : data.Value;
        } else {
          newDiscount = data.Type === 'Percentage' ? grandTotal * (data.Value / 100) : data.Value;
        }

        if (data.MaxDiscount && newDiscount > data.MaxDiscount) {
          newDiscount = data.MaxDiscount;
        }

        setDiscountAmount(Math.round(newDiscount));
        
        // Auto-add free service if exists
        if (data.FreeServiceId && data.FreeServiceId !== 'none') {
          const serviceToFree = servicesCatalog.find(s => String(s.Id) === String(data.FreeServiceId));
          if (serviceToFree) {
            // Check if already has a free promo service to avoid duplicates if they re-apply
            const existingFree = servicesOrdered.find(s => s.Notes === 'Tặng kèm Voucher');
            if (!existingFree && !bookingId) {
               setServicesOrdered([...servicesOrdered, {
                 Id: 'temp_free_' + Date.now(),
                 ServiceId: data.FreeServiceId,
                 Quantity: 1,
                 UnitPrice: 0,
                 TotalPrice: 0,
                 Notes: 'Tặng kèm Voucher'
               }]);
               toast.success(`Đã tự động thêm quà tặng: ${serviceToFree.ServiceName}`);
            }
          }
        }
      }
    } catch (e) {
      toast.error('Lỗi kiểm tra mã khuyến mãi');
    }
  };


  const getPromoWarning = (promo) => {
    if (promo.UsageLimit && promo.UsedCount >= promo.UsageLimit) return "Đã hết lượt sử dụng";
    
    if (promo.ValidFrom && new Date(promo.ValidFrom) > new Date()) return "Chưa đến thời gian áp dụng";
    
    const selectedRoom = rooms.find((r) => String(r.Id) === String(roomId));
    if (promo.RoomTypes && selectedRoom) {
      const allowed = promo.RoomTypes.split(',').map(s => s.trim());
      if (!allowed.includes(selectedRoom.RoomType)) return `Chỉ dành cho phòng: ${promo.RoomTypes}`;
    }

    if (promo.MinNights) {
      let nights = 1;
      if (checkInDate && checkOutDate) {
        const diffTime = new Date(checkOutDate) - new Date(checkInDate);
        nights = Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
      }
      if (nights < promo.MinNights) return `Cần đặt tối thiểu ${promo.MinNights} đêm`;
    }

    return null;
  };

  const handleAddService = async (e) => {
    e.preventDefault();
    if (!selectedServiceId || serviceQty < 1) {
      toast.error('Vui lòng chọn dịch vụ và số lượng.');
      return;
    }

    const catalogItem = servicesCatalog.find(s => String(s.Id) === String(selectedServiceId));
    if (!catalogItem) return;

    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/bookings/${bookingId}/services`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ServiceId: selectedServiceId,
          Quantity: Number(serviceQty),
          UnitPrice: Number(catalogItem.Price),
          Notes: serviceNotes
        })
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error);

      toast.success('Thêm dịch vụ thành công!');
      setSelectedServiceId('');
      setServiceQty(1);
      setServiceNotes('');
      loadBookingDetails(bookingId);
    } catch (e) {
      toast.error(e.message || 'Lỗi thêm dịch vụ.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteService = async (bookingServiceId) => {
    if (!confirm('Bạn có chắc muốn hủy dịch vụ này?')) return;
    try {
      const res = await fetch(`/api/bookings/${bookingId}/services?bookingServiceId=${bookingServiceId}`, {
        method: 'DELETE'
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error);
      }
      toast.success('Hủy dịch vụ thành công!');
      loadBookingDetails(bookingId);
    } catch (e) {
      toast.error(e.message || 'Lỗi hủy dịch vụ.');
    }
  };

  const handleAddPayment = async (e) => {
    e.preventDefault();
    if (!paymentAmount || Number(paymentAmount) <= 0) {
      toast.error('Vui lòng nhập số tiền thanh toán.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/bookings/${bookingId}/payments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          Amount: Number(paymentAmount),
          PaymentMethod: paymentMethod,
          PaymentType: paymentType,
          Notes: paymentNotes
        })
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error);

      toast.success('Ghi nhận thanh toán thành công!');
      setPaymentAmount('');
      setPaymentNotes('');
      loadBookingDetails(bookingId);
    } catch (e) {
      toast.error(e.message || 'Lỗi ghi nhận thanh toán.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeletePayment = async (paymentId) => {
    if (!confirm('Bạn có chắc muốn xóa giao dịch thanh toán này?')) return;
    try {
      const res = await fetch(`/api/bookings/${bookingId}/payments?paymentId=${paymentId}`, {
        method: 'DELETE'
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error);
      }
      toast.success('Xóa giao dịch thành công!');
      loadBookingDetails(bookingId);
    } catch (e) {
      toast.error(e.message || 'Lỗi xóa giao dịch.');
    }
  };

  // Calculations
  const roomCost = Number(roomCharge);
  const servicesCost = serviceCharge;
  const totalCost = grandTotal;
  const totalPaid = payments.reduce((acc, curr) => {
    if (curr.PaymentType === 'Refund') return acc - Number(curr.Amount);
    return acc + Number(curr.Amount);
  }, 0);
  const remainingCost = totalCost - totalPaid;

  const getStatusBadge = (s) => {
    switch (s) {
      case 'Pending': return <Badge className="bg-amber-500/10 text-amber-500 hover:bg-amber-500/20 border-amber-500/30">Chờ xác nhận</Badge>;
      case 'Confirmed': return <Badge className="bg-blue-500/10 text-blue-500 hover:bg-blue-500/20 border-blue-500/30">Đã xác nhận</Badge>;
      case 'CheckedIn': return <Badge className="bg-green-500/10 text-green-500 hover:bg-green-500/20 border-green-500/30">Đang lưu trú</Badge>;
      case 'CheckedOut': return <Badge className="bg-neutral-500/10 text-muted-foreground hover:bg-neutral-500/20 border-neutral-500/30">Đã check-out</Badge>;
      case 'Cancelled': return <Badge className="bg-rose-500/10 text-rose-500 hover:bg-rose-500/20 border-rose-500/30">Đã hủy</Badge>;
      case 'NoShow': return <Badge className="bg-rose-500/10 text-rose-500 hover:bg-rose-500/20 border-rose-500/30">Khách không đến</Badge>;
      default: return null;
    }
  };

  const getDurationText = () => {
    if (!checkInDate || !checkOutDate) return '';
    try {
      if (bookingType === 'Hourly') {
        const start = new Date(`${checkInDate}T${checkInTime || '14:00'}`);
        const end = new Date(`${checkOutDate}T${checkOutTime || '12:00'}`);
        const diffHours = Math.ceil((end - start) / (1000 * 60 * 60));
        return diffHours > 0 ? `(${diffHours} giờ)` : '';
      } else {
        const start = new Date(checkInDate);
        const end = new Date(checkOutDate);
        const diffTime = end - start;
        const nights = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return nights > 0 ? `(${nights} đêm)` : '';
      }
    } catch (e) {
      return '';
    }
  };

  const handlePrint = () => {
    window.print();
  };


  const isRoomLocked = status === 'CheckedIn' || status === 'CheckedOut' || status === 'Cancelled';

  const renderGeneralInfoTab = () => (
    <div className="flex flex-col gap-4">
      <form id="booking-form" onSubmit={handleSaveGeneral} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-5 gap-y-4">
                  <div className="space-y-2">
                    <label className="text-xs text-muted-foreground font-semibold">Tên khách hàng *</label>
                    <div className="relative">
                      <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        value={customerName}
                        onChange={(e) => setCustomerName(e.target.value)}
                        placeholder="Nguyễn Văn A"
                        className="pl-10 bg-background border-border text-foreground"
                        required
                        disabled={isSubmitting}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs text-muted-foreground font-semibold">Số điện thoại</label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        value={customerPhone}
                        onChange={(e) => setCustomerPhone(e.target.value)}
                        placeholder="0901234567"
                        className="pl-10 bg-background border-border text-foreground"
                        disabled={isSubmitting}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs text-muted-foreground font-semibold">Loại đặt phòng *</label>
                    <Select value={bookingType} onValueChange={setBookingType} disabled={isSubmitting || isRoomLocked}>
                      <SelectTrigger className="bg-background border-border text-foreground text-left truncate">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-muted border-border text-foreground">
                        <SelectItem value="Daily">Theo ngày (Daily)</SelectItem>
                        <SelectItem value="Hourly">Theo giờ (Hourly)</SelectItem>
                        <SelectItem value="Overnight">Qua đêm (Overnight)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs text-muted-foreground font-semibold">Nguồn đặt phòng</label>
                    <Select value={bookingSourceId || 'none'} onValueChange={setBookingSourceId} disabled={isSubmitting}>
                      <SelectTrigger className="bg-background border-border text-foreground text-left truncate">
                        <SelectValue placeholder="Chọn nguồn đặt phòng" />
                      </SelectTrigger>
                      <SelectContent className="bg-muted border-border text-foreground">
                        <SelectItem value="none">⚠️ Chưa gán nguồn / Trống</SelectItem>
                        {bookingSources.map((source) => (
                          <SelectItem key={source.Id} value={String(source.Id)}>
                            {source.SourceName} ({source.SourceCode})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2 sm:col-span-2">
                    <label className="text-xs text-muted-foreground font-semibold">Phòng đăng ký *</label>
                    <Select value={String(roomId)} onValueChange={setRoomId} disabled={isSubmitting || isRoomLocked}>
                      <SelectTrigger className="bg-background border-border text-foreground text-left truncate">
                        <SelectValue placeholder="Chọn phòng" />
                      </SelectTrigger>
                      <SelectContent className="bg-muted border-border text-foreground">
                        {rooms.map((room) => {
                          const dailyText = `${Number(room.Price).toLocaleString('vi-VN')}đ/ngày`;
                          const hourlyText = room.HourlyPrice ? ` | ${Number(room.HourlyPrice).toLocaleString('vi-VN')}đ/giờ` : '';
                          const overnightText = room.OvernightPrice ? ` | ${Number(room.OvernightPrice).toLocaleString('vi-VN')}đ/đêm` : '';
                          return (
                            <SelectItem key={room.Id} value={String(room.Id)}>
                              {room.RoomName} ({room.RoomType} - {dailyText}{hourlyText}{overnightText})
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs text-muted-foreground font-semibold">Thời gian nhận phòng (Check-in) *</label>
                    <div className="grid grid-cols-7 gap-2">
                      <div className="relative col-span-4">
                        <CalendarIcon className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        <Input
                          type="date"
                          value={checkInDate}
                          min={!bookingId ? todayStr : undefined}
                          onChange={(e) => setCheckInDate(e.target.value)}
                          className="pl-9 bg-background border-border text-foreground text-xs sm:text-sm"
                          required
                          disabled={isSubmitting || isRoomLocked}
                        />
                      </div>
                      <Input
                        type="time"
                        value={checkInTime}
                        onChange={(e) => setCheckInTime(e.target.value)}
                        className="col-span-3 bg-background border-border text-foreground text-xs sm:text-sm px-2 text-center"
                        required
                        disabled={isSubmitting || isRoomLocked}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs text-muted-foreground font-semibold">Thời gian trả phòng (Check-out) *</label>
                    <div className="grid grid-cols-7 gap-2">
                      <div className="relative col-span-4">
                        <CalendarIcon className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        <Input
                          type="date"
                          value={checkOutDate}
                          min={checkInDate || (!bookingId ? todayStr : undefined)}
                          onChange={(e) => setCheckOutDate(e.target.value)}
                          className="pl-9 bg-background border-border text-foreground text-xs sm:text-sm"
                          required
                          disabled={isSubmitting}
                        />
                      </div>
                      <Input
                        type="time"
                        value={checkOutTime}
                        onChange={(e) => setCheckOutTime(e.target.value)}
                        className="col-span-3 bg-background border-border text-foreground text-xs sm:text-sm px-2 text-center"
                        required
                        disabled={isSubmitting}
                      />
                    </div>
                  </div>

                  {/* Busy ranges banner & Conflict warning */}
                  {roomId && (busyRanges.length > 0 || (hasConflict && checkInDate && checkOutDate)) && (
                    <div className="sm:col-span-2 space-y-2">
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
                      {hasConflict && checkInDate && checkOutDate && (
                        <div className="rounded-lg border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-500 font-semibold">
                          ❌ Khoảng thời gian đã bị trùng với lịch hiện có. Vui lòng chọn ngày khác.
                        </div>
                      )}
                    </div>
                  )}

                  <div className="space-y-2">
                    <label className="text-xs text-muted-foreground font-semibold">Trạng thái đặt phòng *</label>
                    <Select value={status} onValueChange={setStatus} disabled={isSubmitting}>
                      <SelectTrigger className="bg-background border-border text-foreground">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-muted border-border text-foreground">
                        <SelectItem value="Pending">Chờ xác nhận</SelectItem>
                        <SelectItem value="Confirmed">Đã xác nhận</SelectItem>
                        <SelectItem value="CheckedIn">Đang lưu trú</SelectItem>
                        <SelectItem value="CheckedOut">Đã check-out</SelectItem>
                        <SelectItem value="Cancelled">Đã hủy</SelectItem>
                        <SelectItem value="NoShow">Khách không đến (No-Show)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs text-muted-foreground font-semibold flex items-center gap-1.5">
                      <Users className="h-3.5 w-3.5" />
                      Số khách
                      {(() => {
                        const selectedRoom = rooms.find((r) => String(r.Id) === String(roomId));
                        if (selectedRoom?.MaxGuests) {
                          const isOver = guestCount > Number(selectedRoom.MaxGuests);
                          return (
                            <span className={`ml-auto text-[10px] font-mono px-1.5 py-0.5 rounded ${
                              isOver
                                ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                                : 'bg-muted text-muted-foreground'
                            }`}>
                              TĐ: {selectedRoom.MaxGuests} người
                            </span>
                          );
                        }
                        return null;
                      })()}
                    </label>
                    <div className="relative">
                      <Users className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        type="number"
                        min={1}
                        max={99}
                        value={guestCount}
                        onChange={(e) => setGuestCount(Number(e.target.value))}
                        placeholder="Số người lưu trú"
                        className={`pl-10 bg-background border-border text-foreground ${
                          (() => {
                            const selectedRoom = rooms.find((r) => String(r.Id) === String(roomId));
                            return selectedRoom?.MaxGuests && guestCount > Number(selectedRoom.MaxGuests)
                              ? 'border-amber-500/50 focus:ring-amber-500/30'
                              : '';
                          })()
                        }`}
                        disabled={isSubmitting}
                      />
                    </div>
                  </div>

                  <div className="space-y-2 sm:col-span-2">
                    <label className="text-xs text-muted-foreground font-semibold">Ghi chú thêm</label>
                    <Input
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Yêu cầu giường phụ, nhận phòng trễ..."
                      className="bg-background border-border text-foreground"
                      disabled={isSubmitting}
                    />
                  </div>
                </div>

                
              </form>
    </div>
  );

  const renderServicesTab = () => (
    <div className="space-y-6">
      {/* Add service form */}
              <form onSubmit={handleAddService} className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 rounded-xl border border-border bg-muted/50">
                <div className="space-y-1 sm:col-span-3">
                  <span className="text-xs font-bold text-foreground">Thêm phụ thu / Dịch vụ khách gọi</span>
                </div>
                <div>
                  <Select value={selectedServiceId} onValueChange={setSelectedServiceId} disabled={isSubmitting}>
                    <SelectTrigger className="bg-muted border-border text-foreground text-xs">
                      <SelectValue placeholder="Chọn dịch vụ" />
                    </SelectTrigger>
                    <SelectContent className="bg-muted border-border text-foreground">
                      {servicesCatalog.map((s) => (
                        <SelectItem key={s.Id} value={String(s.Id)}>
                          {s.ServiceName} ({Number(s.Price).toLocaleString('vi-VN')}đ)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Input
                    type="number"
                    min="1"
                    value={serviceQty}
                    onChange={(e) => setServiceQty(Number(e.target.value))}
                    placeholder="Số lượng"
                    className="bg-muted border-border text-foreground text-xs"
                    disabled={isSubmitting}
                  />
                </div>
                <div>
                  <Input
                    value={serviceNotes}
                    onChange={(e) => setServiceNotes(e.target.value)}
                    placeholder="Ghi chú dịch vụ"
                    className="bg-muted border-border text-foreground text-xs"
                    disabled={isSubmitting}
                  />
                </div>
                <div className="sm:col-span-3 flex justify-end">
                  <Button type="submit" size="sm" className="bg-primary hover:bg-primary/90 text-primary-foreground text-xs" disabled={isSubmitting}>
                    <Plus className="h-3.5 w-3.5 mr-1" />
                    Thêm dịch vụ
                  </Button>
                </div>
              </form>

              {/* Services ordered list */}
              <div className="border border-border rounded-xl overflow-hidden bg-card">
                <Table>
                  <TableHeader className="bg-background">
                    <TableRow className="border-border">
                      <TableHead className="text-muted-foreground text-xs">Dịch vụ</TableHead>
                      <TableHead className="text-muted-foreground text-xs text-right">Đơn giá</TableHead>
                      <TableHead className="text-muted-foreground text-xs text-center">SL</TableHead>
                      <TableHead className="text-muted-foreground text-xs text-right">Thành tiền</TableHead>
                      <TableHead className="text-muted-foreground text-xs">Ghi chú</TableHead>
                      <TableHead className="w-12"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {servicesOrdered.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan="6" className="text-center py-6 text-xs text-muted-foreground">
                          Chưa đăng ký dịch vụ phụ thu nào.
                        </TableCell>
                      </TableRow>
                    ) : (
                      servicesOrdered.map((so) => {
                        // Find service name in catalog
                        const cat = servicesCatalog.find(s => String(s.Id) === String(so.ServiceId));
                        return (
                          <TableRow key={so.Id} className="border-border hover:bg-muted/30">
                            <TableCell className="text-xs font-medium text-foreground">
                              {cat?.ServiceName || `Dịch vụ #${so.ServiceId}`}
                            </TableCell>
                            <TableCell className="text-xs text-right font-mono">
                              {Number(so.UnitPrice).toLocaleString('vi-VN')}đ
                            </TableCell>
                            <TableCell className="text-xs text-center font-mono">{so.Quantity}</TableCell>
                            <TableCell className="text-xs text-right font-mono font-semibold text-primary">
                              {Number(so.TotalPrice).toLocaleString('vi-VN')}đ
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground">{so.Notes || '-'}</TableCell>
                            <TableCell>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={() => handleDeleteService(so.Id)}
                                className="h-8 w-8 text-muted-foreground hover:text-rose-500 hover:bg-rose-500/10 rounded-md"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </div>

              <div className="flex justify-between items-center bg-background/60 p-4 border border-border rounded-xl">
                <span className="text-sm font-semibold text-foreground">Tổng phụ thu dịch vụ:</span>
                <span className="text-base font-bold text-primary font-mono">
                  {servicesCost.toLocaleString('vi-VN')}đ
                </span>
              </div>
            
    </div>
  );

  const renderPaymentsTab = () => (
    <div className="space-y-6">
      {/* Add payment form */}
              <form onSubmit={handleAddPayment} className="grid grid-cols-1 sm:grid-cols-4 gap-3 p-4 rounded-xl border border-border bg-muted/50">
                <div className="space-y-1 sm:col-span-4">
                  <span className="text-xs font-bold text-foreground">Ghi nhận giao dịch đóng tiền / hoàn tiền</span>
                </div>
                <div>
                  <Input
                    type="number"
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(e.target.value)}
                    placeholder="Số tiền (VND)"
                    className="bg-muted border-border text-foreground text-xs font-mono"
                    disabled={isSubmitting}
                  />
                </div>
                <div>
                  <Select value={paymentMethod} onValueChange={setPaymentMethod} disabled={isSubmitting}>
                    <SelectTrigger className="bg-muted border-border text-foreground text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-muted border-border text-foreground">
                      <SelectItem value="Cash">Tiền mặt</SelectItem>
                      <SelectItem value="Bank Transfer">Chuyển khoản</SelectItem>
                      <SelectItem value="E-Wallet">Ví điện tử</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Select value={paymentType} onValueChange={setPaymentType} disabled={isSubmitting}>
                    <SelectTrigger className="bg-muted border-border text-foreground text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-muted border-border text-foreground">
                      <SelectItem value="Deposit">Đặt cọc</SelectItem>
                      <SelectItem value="Final Payment">Thanh toán nốt</SelectItem>
                      <SelectItem value="Surcharge">Phụ thu</SelectItem>
                      <SelectItem value="Refund">Hoàn trả tiền</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Input
                    value={paymentNotes}
                    onChange={(e) => setPaymentNotes(e.target.value)}
                    placeholder="Ghi chú/Mã giao dịch"
                    className="bg-muted border-border text-foreground text-xs"
                    disabled={isSubmitting}
                  />
                </div>
                <div className="sm:col-span-4 flex justify-end">
                  <Button type="submit" size="sm" className="bg-primary hover:bg-primary/90 text-primary-foreground text-xs" disabled={isSubmitting}>
                    <Plus className="h-3.5 w-3.5 mr-1" />
                    Thêm giao dịch
                  </Button>
                </div>
              </form>

              {/* Payments transactions list */}
              <div className="border border-border rounded-xl overflow-hidden bg-card">
                <Table>
                  <TableHeader className="bg-background">
                    <TableRow className="border-border">
                      <TableHead className="text-muted-foreground text-xs">Thời gian</TableHead>
                      <TableHead className="text-muted-foreground text-xs">Phân loại</TableHead>
                      <TableHead className="text-muted-foreground text-xs">Phương thức</TableHead>
                      <TableHead className="text-muted-foreground text-xs text-right">Số tiền</TableHead>
                      <TableHead className="text-muted-foreground text-xs">Ghi chú</TableHead>
                      <TableHead className="w-12"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {payments.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan="6" className="text-center py-6 text-xs text-muted-foreground">
                          Chưa có lịch sử giao dịch thanh toán.
                        </TableCell>
                      </TableRow>
                    ) : (
                      payments.map((p) => {
                        const date = new Date(p.PaymentDate).toLocaleString('vi-VN', {
                          day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit'
                        });
                        const isRefund = p.PaymentType === 'Refund';
                        return (
                          <TableRow key={p.Id} className="border-border hover:bg-muted/30">
                            <TableCell className="text-xs text-foreground">{date}</TableCell>
                            <TableCell className="text-xs font-semibold">
                              {p.PaymentType === 'Deposit' && <span className="text-amber-500">Đặt cọc</span>}
                              {p.PaymentType === 'Final Payment' && <span className="text-green-500">Thanh toán nốt</span>}
                              {p.PaymentType === 'Surcharge' && <span className="text-blue-500">Phụ thu</span>}
                              {p.PaymentType === 'Refund' && <span className="text-rose-500">Hoàn tiền</span>}
                            </TableCell>
                            <TableCell className="text-xs text-foreground">
                              {p.PaymentMethod === 'Cash' ? 'Tiền mặt' : p.PaymentMethod === 'Bank Transfer' ? 'Chuyển khoản' : 'Ví điện tử'}
                            </TableCell>
                            <TableCell className={`text-xs text-right font-mono font-bold ${isRefund ? 'text-rose-400' : 'text-emerald-400'}`}>
                              {isRefund ? '-' : ''}{Number(p.Amount).toLocaleString('vi-VN')}đ
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground">{p.Notes || '-'}</TableCell>
                            <TableCell>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={() => handleDeletePayment(p.Id)}
                                className="h-8 w-8 text-muted-foreground hover:text-rose-500 hover:bg-rose-500/10 rounded-md"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </div>

              {/* Financial Balance Summary */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-background/60 p-4 border border-border rounded-xl font-mono text-sm">
                <div className="flex flex-col gap-1 border-b sm:border-b-0 sm:border-r border-border pb-3 sm:pb-0">
                  <span className="text-xs text-muted-foreground">Tổng chi phí (Phòng + Dịch vụ):</span>
                  <span className="text-base font-bold text-foreground">
                    {totalCost.toLocaleString('vi-VN')}đ
                  </span>
                </div>
                <div className="flex flex-col gap-1 border-b sm:border-b-0 sm:border-r border-border pb-3 sm:pb-0 sm:pl-3">
                  <span className="text-xs text-muted-foreground">Đã thanh toán:</span>
                  <span className="text-base font-bold text-emerald-400">
                    {totalPaid.toLocaleString('vi-VN')}đ
                  </span>
                </div>
                <div className="flex flex-col gap-1 sm:pl-3">
                  <span className="text-xs text-muted-foreground">Còn lại phải thu:</span>
                  <span className={`text-base font-bold ${remainingCost <= 0 ? 'text-green-400' : 'text-amber-400 animate-pulse'}`}>
                    {remainingCost.toLocaleString('vi-VN')}đ
                  </span>
                </div>
              </div>
            
    </div>
  );

  const renderInvoiceTab = () => (
    <div className="space-y-6">
      {/* Printable Area Wrapper */}
              <div id="invoice-print-area" className="p-6 bg-background text-foreground print:bg-white print:text-black border border-border print:border-neutral-300 rounded-xl space-y-6 max-w-[620px] mx-auto shadow-inner text-sm leading-relaxed">
                {/* Header */}
                <div className="flex justify-between items-start border-b border-border print:border-neutral-200 pb-4">
                  <div>
                    <h2 className="text-lg font-bold uppercase tracking-wide">{systemSettings?.HotelName || 'Smax Homestay'}</h2>
                    <p className="text-xs text-muted-foreground mt-1">Hóa đơn thanh toán / Invoice</p>
                  </div>
                  <div className="text-right text-xs">
                    <p className="font-semibold">Mã hóa đơn: #BS-{bookingId}</p>
                    <p className="text-muted-foreground mt-0.5">Ngày lập: {new Date().toLocaleDateString('vi-VN')}</p>
                  </div>
                </div>

                {/* Customer Details */}
                <div className="grid grid-cols-2 gap-4 text-xs">
                  <div>
                    <p className="text-muted-foreground font-semibold">Thông tin khách hàng:</p>
                    <p className="font-bold text-sm mt-1">{customerName}</p>
                    <p className="text-muted-foreground print:text-neutral-600 mt-0.5">SĐT: {customerPhone || '-'}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-muted-foreground font-semibold">Chi tiết đặt phòng:</p>
                    <p className="font-bold text-sm mt-1">Phòng: {rooms.find(r => String(r.Id) === String(roomId))?.RoomName || roomId}</p>
                    <p className="text-muted-foreground print:text-neutral-600 mt-0.5">Check-in: {checkInDate}</p>
                    <p className="text-muted-foreground print:text-neutral-600 mt-0.5">Check-out: {checkOutDate}</p>
                  </div>
                </div>

                {/* Charges Breakdowns */}
                <div className="space-y-2 mt-6">
                  <p className="text-xs font-bold uppercase border-b border-border print:border-neutral-200 pb-1 text-foreground print:text-neutral-700">Chi tiết dịch vụ:</p>
                  <table className="w-full text-xs text-left border-collapse">
                    <thead>
                      <tr className="border-b border-border print:border-neutral-200 font-semibold text-muted-foreground print:text-neutral-600">
                        <th className="py-1">Mục</th>
                        <th className="py-1 text-right">Đơn giá</th>
                        <th className="py-1 text-center">SL</th>
                        <th className="py-1 text-right">Thành tiền</th>
                      </tr>
                    </thead>
                    <tbody>
                      {/* Room Charge */}
                      <tr className="border-b border-border/50 print:border-neutral-100">
                        <td className="py-2">Tiền phòng (Thuê phòng Homestay)</td>
                        <td className="py-2 text-right">{roomCost.toLocaleString('vi-VN')}đ</td>
                        <td className="py-2 text-center">1</td>
                        <td className="py-2 text-right font-semibold">{roomCost.toLocaleString('vi-VN')}đ</td>
                      </tr>
                      {/* Services Charge */}
                      {servicesOrdered.map((so) => {
                        const cat = servicesCatalog.find(s => String(s.Id) === String(so.ServiceId));
                        return (
                          <tr key={so.Id} className="border-b border-border/50 print:border-neutral-100 text-foreground print:text-neutral-700">
                            <td className="py-2 pl-4 italic">+ {cat?.ServiceName || `Dịch vụ #${so.ServiceId}`}</td>
                            <td className="py-2 text-right">{Number(so.UnitPrice).toLocaleString('vi-VN')}đ</td>
                            <td className="py-2 text-center">{so.Quantity}</td>
                            <td className="py-2 text-right">{Number(so.TotalPrice).toLocaleString('vi-VN')}đ</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Payments Details */}
                <div className="space-y-2">
                  <p className="text-xs font-bold uppercase border-b border-border print:border-neutral-200 pb-1 text-foreground print:text-neutral-700">Lịch sử thanh toán:</p>
                  <table className="w-full text-xs text-left border-collapse">
                    <thead>
                      <tr className="border-b border-border print:border-neutral-200 font-semibold text-muted-foreground print:text-neutral-600">
                        <th className="py-1">Giao dịch</th>
                        <th className="py-1">Phương thức</th>
                        <th className="py-1 text-right">Số tiền</th>
                      </tr>
                    </thead>
                    <tbody>
                      {payments.length === 0 ? (
                        <tr>
                          <td colSpan="3" className="py-2 text-center text-muted-foreground italic">Chưa thanh toán đợt nào.</td>
                        </tr>
                      ) : (
                        payments.map((p) => {
                          const date = new Date(p.PaymentDate).toLocaleDateString('vi-VN');
                          return (
                            <tr key={p.Id} className="border-b border-border/50 print:border-neutral-100 text-foreground print:text-neutral-700">
                              <td className="py-1.5">
                                {p.PaymentType === 'Deposit' ? 'Đặt cọc' : p.PaymentType === 'Final Payment' ? 'Thanh toán nốt' : p.PaymentType === 'Refund' ? 'Hoàn tiền' : 'Phụ thu'} ({date})
                              </td>
                              <td className="py-1.5">{p.PaymentMethod === 'Cash' ? 'Tiền mặt' : 'Chuyển khoản'}</td>
                              <td className={`py-1.5 text-right font-bold ${p.PaymentType === 'Refund' ? 'text-rose-600' : ''}`}>
                                {p.PaymentType === 'Refund' ? '-' : ''}{Number(p.Amount).toLocaleString('vi-VN')}đ
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Totals Summary */}
                <div className="border-t border-border print:border-neutral-300 pt-4 flex flex-col items-end gap-1.5 text-xs text-right">
                  <div className="flex justify-between w-64">
                    <span className="text-muted-foreground">Tổng cộng (A):</span>
                    <span className="font-semibold">{totalCost.toLocaleString('vi-VN')}đ</span>
                  </div>
                  <div className="flex justify-between w-64">
                    <span className="text-muted-foreground">Khách đã trả (B):</span>
                    <span className="font-semibold text-emerald-500 print:text-emerald-600">{totalPaid.toLocaleString('vi-VN')}đ</span>
                  </div>
                  <div className="flex justify-between w-64 border-t border-border print:border-neutral-200 pt-1.5 text-sm font-bold">
                    <span>CẦN THANH TOÁN (A - B):</span>
                    <span className="text-rose-600">{remainingCost.toLocaleString('vi-VN')}đ</span>
                  </div>
                </div>

                {/* VietQR Payment Block */}
                {systemSettings?.BankName && systemSettings?.BankAccountNumber && remainingCost > 0 && (
                  <div className="border border-border print:border-neutral-200 rounded-lg p-3 flex items-center gap-4 bg-muted/50 print:bg-neutral-50">
                    <img
                      src={`https://img.vietqr.io/image/${systemSettings.BankName}-${systemSettings.BankAccountNumber}-compact2.png?amount=${remainingCost}&addInfo=BS-${bookingId} ${customerName}&accountName=${encodeURIComponent(systemSettings.BankAccountName || '')}`}
                      alt="QR Thanh toán"
                      className="h-28 w-28 object-contain print:invert-0 dark:invert rounded"
                    />
                    <div className="text-xs space-y-1">
                      <p className="font-bold text-sm text-foreground print:text-neutral-800">Quét QR để thanh toán</p>
                      <p className="text-muted-foreground">Ngân hàng: <span className="font-medium text-foreground print:text-neutral-800 uppercase">{systemSettings.BankName}</span></p>
                      <p className="text-muted-foreground">STK: <span className="font-medium text-foreground print:text-neutral-800">{systemSettings.BankAccountNumber}</span></p>
                      {systemSettings.BankAccountName && <p className="text-muted-foreground">Tên TK: <span className="font-medium text-foreground print:text-neutral-800">{systemSettings.BankAccountName}</span></p>}
                      <p className="text-muted-foreground">Số tiền: <span className="font-bold text-rose-600">{remainingCost.toLocaleString('vi-VN')}đ</span></p>
                      <p className="text-muted-foreground italic">Nội dung: BS-{bookingId} {customerName}</p>
                    </div>
                  </div>
                )}

                {/* Footer Signatures */}
                <div className="grid grid-cols-2 gap-4 text-center text-xs pt-10">
                  <div>
                    <p className="text-muted-foreground">Người nhận phòng</p>
                    <p className="text-muted-foreground mt-12">(Ký và ghi rõ họ tên)</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Người lập hóa đơn</p>
                    <p className="font-semibold mt-12">{user?.fullName || 'Nhân viên lễ tân'}</p>
                  </div>
                </div>
              </div>

              {/* Invoice print trigger */}
              <div className="flex justify-end gap-3 pt-4 border-t border-border">
                <Button type="button" onClick={handlePrint} className="bg-primary hover:bg-primary/90 text-primary-foreground">
                  <Printer className="h-4 w-4 mr-2" />
                  In hóa đơn
                </Button>
              </div>
            
    </div>
  );


  const selectedPromoObj = promotions.find(p => p.Code === promoCode);

  const getEstimatedDiscountText = (promo) => {
    let base = promo.ApplyScope === 'RoomOnly' ? roomCharge : grandTotal;
    let disc = promo.Type === 'Percentage' ? base * (promo.Value / 100) : promo.Value;
    if (promo.MaxDiscount && disc > promo.MaxDiscount) disc = promo.MaxDiscount;
    return Math.round(disc).toLocaleString('vi-VN') + 'đ';
  };

  const getConditionsText = (promo) => {
    let conditions = [];
    if (promo.ApplyScope === 'RoomOnly') conditions.push('Chỉ áp dụng tiền phòng');
    else conditions.push('Áp dụng tổng hoá đơn');
    
    if (promo.MinNights) conditions.push(`Từ ${promo.MinNights} đêm`);
    if (promo.RoomTypes) conditions.push(`Phòng: ${promo.RoomTypes}`);
    if (promo.MaxDiscount) conditions.push(`Giảm tối đa ${Number(promo.MaxDiscount).toLocaleString('vi-VN')}đ`);
    if (promo.FreeServiceId && promo.FreeServiceId !== 'none') {
      const freeSvc = servicesCatalog.find(s => String(s.Id) === String(promo.FreeServiceId));
      conditions.push(freeSvc ? `Tặng ${freeSvc.ServiceName} (0đ)` : `Tặng kèm dịch vụ`);
    }
    return conditions.join(' • ');
  };

  // Render logic continues below
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[1000px] xl:max-w-[1100px] w-[95vw] bg-muted border-border text-foreground p-6 max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3 text-lg font-bold text-foreground">
            {bookingId ? `Chi tiết đặt phòng #${bookingId}` : 'Tạo mới đơn đặt phòng'}
            {bookingId && getStatusBadge(status)}
          </DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="py-20 flex flex-col items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary mb-2" />
            <p className="text-xs text-muted-foreground">Đang tải thông tin đặt phòng...</p>
          </div>
        ) : (
          <div className="flex flex-col flex-1 min-h-0 relative mt-4">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0">
              <TabsList className="bg-background border border-border p-1 w-full flex overflow-x-auto justify-start mb-4">
                <TabsTrigger value="general" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                  <FileText className="h-4 w-4 mr-1.5 hidden sm:inline" /> Thông tin chung
                </TabsTrigger>
                <TabsTrigger value="services" disabled={!bookingId} className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                  <Utensils className="h-4 w-4 mr-1.5 hidden sm:inline" /> Dịch vụ
                </TabsTrigger>
                <TabsTrigger value="payments" disabled={!bookingId} className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                  <CreditCard className="h-4 w-4 mr-1.5 hidden sm:inline" /> Thanh toán
                </TabsTrigger>
                <TabsTrigger value="invoice" disabled={!bookingId} className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                  <Printer className="h-4 w-4 mr-1.5 hidden sm:inline" /> Hóa đơn
                </TabsTrigger>
              </TabsList>

              <TabsContent value="general" className="flex-1 overflow-y-auto pr-2 outline-none">
                {renderGeneralInfoTab()}
              </TabsContent>
              <TabsContent value="services" className="flex-1 overflow-y-auto pr-2 outline-none">
                {!bookingId ? (
                  <div className="flex flex-col items-center justify-center h-full text-center p-6 border border-dashed border-border rounded-xl bg-card">
                    <p className="text-sm font-semibold text-foreground">Chưa thể thêm Dịch vụ / Thanh toán</p>
                    <p className="text-xs text-muted-foreground mt-1">Vui lòng "Lưu lại" thông tin bên trái để tạo đặt phòng trước.</p>
                  </div>
                ) : renderServicesTab()}
              </TabsContent>
              <TabsContent value="payments" className="flex-1 overflow-y-auto pr-2 outline-none">
                {bookingId && renderPaymentsTab()}
              </TabsContent>
              <TabsContent value="invoice" className="flex-1 overflow-y-auto pr-2 outline-none">
                {bookingId && renderInvoiceTab()}
              </TabsContent>
            </Tabs>

            {/* FIXED BOTTOM: Mini Invoice & Submit */}
              <div className="mt-4 pt-4 border-t border-border">
                {/* Mini Invoice Block */}
                  <div className="bg-muted/50 p-4 rounded-xl border border-border">
                    <div className="flex justify-between items-center mb-3">
                      <span className="text-xs font-bold text-foreground uppercase tracking-wider">Hóa đơn dự tính</span>
                      <span className="text-[10px] text-primary bg-primary/10 px-2 py-0.5 rounded font-mono">{getDurationText()}</span>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      {/* Cột trái (Voucher) */}
                      <div className="space-y-3 flex flex-col pt-1">
                        <div className="space-y-2">
                          <label className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">Mã Khuyến Mãi</label>
                          <div className="flex gap-2">
                            <Select 
                              value={promoCode} 
                              onValueChange={(val) => {
                                if (val === 'CREATE_NEW') {
                                  window.open('/promotions', '_blank');
                                  setPromoCode('');
                                } else {
                                  setPromoCode(val);
                                }
                              }}
                              disabled={isSubmitting || !!appliedPromo}
                            >
                              <SelectTrigger className="h-8 text-xs bg-background border-border text-foreground font-mono flex-1">
                                <SelectValue placeholder="Chọn mã voucher..." />
                              </SelectTrigger>
                              <SelectContent className="bg-muted border-border">
                                {promotions.filter(p => p.Status === 'Active' && (!p.ValidTo || new Date(p.ValidTo) >= new Date())).map(p => {
                                  const warning = getPromoWarning(p);
                                  return (
                                    <SelectItem key={p.Id} value={p.Code} disabled={!!warning}>
                                      <div className="flex flex-col items-start gap-0.5">
                                        <span>{p.Code} - {p.Type === 'Percentage' ? `${p.Value}%` : `${Number(p.Value).toLocaleString('vi-VN')}đ`}</span>
                                        {warning ? (
                                          <span className="text-[9px] text-rose-400 font-medium">{warning}</span>
                                        ) : (
                                          <span className="text-[9px] text-emerald-400 font-medium">Đủ điều kiện áp dụng</span>
                                        )}
                                      </div>
                                    </SelectItem>
                                  );
                                })}
                                <SelectItem value="CREATE_NEW" className="text-primary font-medium border-t border-border/50 mt-1 pt-2">+ Tạo voucher nhanh</SelectItem>
                              </SelectContent>
                            </Select>

                            {appliedPromo ? (
                              <Button type="button" variant="ghost" size="sm" onClick={() => { 
                                setAppliedPromo(null); 
                                setPromoCode(''); 
                                setServicesOrdered(servicesOrdered.filter(s => s.Notes !== 'Tặng kèm Voucher'));
                              }} className="h-8 text-xs text-rose-400 hover:text-rose-300 hover:bg-rose-950/30 px-3">Hủy</Button>
                            ) : (
                              <Button type="button" variant="secondary" size="sm" onClick={handleApplyPromo} className="h-8 text-xs bg-muted hover:bg-muted-foreground/20 text-foreground px-3" disabled={!promoCode}>Áp dụng</Button>
                            )}
                          </div>
                          {!appliedPromo && promoCode && selectedPromoObj && (
                            <div className="text-xs text-foreground bg-muted/30 px-3 py-2 rounded-lg border border-border mt-2 space-y-1.5">
                              <div className="flex justify-between items-center">
                                <span className="font-semibold text-primary">Dự kiến giảm:</span>
                                <span className="font-mono text-primary font-bold">-{getEstimatedDiscountText(selectedPromoObj)}</span>
                              </div>
                              <div className="text-[10px] text-muted-foreground leading-relaxed">
                                {getConditionsText(selectedPromoObj)}
                              </div>
                            </div>
                          )}
                          {appliedPromo && (
                            <div className="flex justify-between items-center text-xs text-emerald-400 bg-emerald-950/20 px-2 py-1.5 rounded border border-emerald-900/30 mt-2">
                              <span>
                                KM ({appliedPromo.Code}):
                                {appliedPromo.ApplyScope === 'RoomOnly' && <span className="text-[9px] text-muted-foreground ml-1">(Phòng)</span>}
                              </span>
                              <span className="font-mono font-semibold">- {discountAmount.toLocaleString('vi-VN')}đ</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Cột phải (Tiền phòng, DV, Tổng) */}
                      <div className="space-y-3 border-l border-border/50 pl-4 flex flex-col justify-between">
                        {/* Room Charge */}
                        <div className="space-y-2 border-b border-border/50 pb-2">
                          <div className="flex justify-between items-center">
                            <label className="text-xs text-muted-foreground font-semibold flex items-center gap-2">
                              Tiền phòng
                            </label>
                            <label className="flex items-center gap-1.5 cursor-pointer bg-muted/50 px-2 py-0.5 rounded-md text-[10px] text-muted-foreground hover:text-foreground transition-colors">
                              <input 
                                type="checkbox" 
                                checked={isCustomPrice} 
                                onChange={(e) => setIsCustomPrice(e.target.checked)}
                                className="rounded bg-muted border-neutral-700 text-primary focus:ring-primary h-3 w-3" 
                              />
                              Tùy chỉnh
                            </label>
                          </div>
                          <div className="relative">
                            <Input
                              type="number"
                              value={roomCharge}
                              onChange={(e) => setRoomCharge(Number(e.target.value))}
                              className={`bg-background border-border text-foreground font-mono text-right pr-8 h-8 text-sm ${!isCustomPrice ? 'opacity-70 cursor-not-allowed' : ''}`}
                              required
                              disabled={isSubmitting || !isCustomPrice}
                            />
                            <span className="absolute right-3 top-2 text-xs text-muted-foreground font-mono">đ</span>
                          </div>
                        </div>

                        {/* Services Charge */}
                        <div className="flex justify-between items-center text-xs text-muted-foreground pb-2 border-b border-border/50">
                          <span>Dịch vụ & Phụ thu:</span>
                          <span className="font-mono text-foreground">{serviceCharge > 0 ? serviceCharge.toLocaleString('vi-VN') : '0'}đ</span>
                        </div>

                        {/* Grand Total */}
                        <div className="flex justify-between items-center pt-1 mt-auto">
                          <span className="text-sm font-bold text-foreground">TỔNG CỘNG:</span>
                          <span className="text-lg font-bold text-primary font-mono">{grandTotal.toLocaleString('vi-VN')}đ</span>
                        </div>
                      </div>
                    </div>
                  </div>
                <div className="flex justify-end gap-3 mt-4">
                  <Button type="button" variant="outline" onClick={onClose} className="border-border hover:bg-muted text-foreground">Hủy</Button>
                  <Button type="submit" form="booking-form" className="bg-primary hover:bg-primary/90 text-primary-foreground" disabled={isSubmitting || hasConflict}>{isSubmitting ? "Đang lưu..." : "Lưu lại"}</Button>
                </div>
              </div>
          </div>
        )}
      </DialogContent>

      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden !important;
          }
          #invoice-print-area, #invoice-print-area * {
            visibility: visible !important;
          }
          #invoice-print-area {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            max-width: 100% !important;
            border: none !important;
            box-shadow: none !important;
            padding: 0 !important;
            margin: 0 !important;
          }
        }
      `}</style>
    </Dialog>
  );
}
