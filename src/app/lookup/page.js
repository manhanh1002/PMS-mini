'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Printer, Loader2, Search, ArrowLeft, Phone, KeyRound, Hotel } from 'lucide-react';
import Link from 'next/link';

function LookupContent() {
  const searchParams = useSearchParams();
  const urlBookingId = searchParams.get('booking_id') || '';
  const urlPhone = searchParams.get('phone') || '';

  // Form inputs
  const [bookingId, setBookingId] = useState(urlBookingId);
  const [phone, setPhone] = useState(urlPhone);

  // States
  const [isLoading, setIsLoading] = useState(false);
  const [booking, setBooking] = useState(null);
  const [error, setError] = useState('');
  const [settings, setSettings] = useState({});

  // Load public settings for branding
  useEffect(() => {
    fetch('/api/settings')
      .then((r) => r.json())
      .then((data) => { if (data && !data.error) setSettings(data); })
      .catch(() => {});
  }, []);

  // Automatically fetch if URL contains query params
  useEffect(() => {
    if (urlBookingId && urlPhone) {
      handleSearch(urlBookingId, urlPhone);
    }
  }, [urlBookingId, urlPhone]);

  const handleFormSubmit = (e) => {
    e.preventDefault();
    if (!bookingId.trim() || !phone.trim()) {
      setError('Vui lòng điền mã đặt phòng và số điện thoại đăng ký.');
      return;
    }
    handleSearch(bookingId.trim(), phone.trim());
  };

  const handleSearch = async (id, phoneNum) => {
    setIsLoading(true);
    setError('');
    setBooking(null);

    try {
      const res = await fetch(`/api/bookings/${id}?phone=${encodeURIComponent(phoneNum)}`);
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || 'Truy xuất thông tin thất bại.');
      }
      
      setBooking(data);
    } catch (e) {
      setError(e.message);
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusBadge = (s) => {
    switch (s) {
      case 'Pending': return <Badge className="bg-amber-500/10 text-amber-500 hover:bg-amber-500/20 border-amber-500/30">Chờ nhận phòng</Badge>;
      case 'Confirmed': return <Badge className="bg-blue-500/10 text-blue-500 hover:bg-blue-500/20 border-blue-500/30">Đã xác nhận</Badge>;
      case 'CheckedIn': return <Badge className="bg-green-500/10 text-green-500 hover:bg-green-500/20 border-green-500/30">Đang lưu trú</Badge>;
      case 'CheckedOut': return <Badge className="bg-neutral-500/10 text-muted-foreground hover:bg-neutral-500/20 border-neutral-500/30">Đã check-out</Badge>;
      case 'Cancelled': return <Badge className="bg-rose-500/10 text-rose-500 hover:bg-rose-500/20 border-rose-500/30">Đã hủy</Badge>;
      default: return null;
    }
  };

  // Calculations
  const roomCost = booking ? Number(booking.TotalPrice) : 0;
  const servicesCost = booking?.servicesOrdered?.reduce((acc, curr) => acc + Number(curr.TotalPrice), 0) || 0;
  const totalCost = roomCost + servicesCost;
  const totalPaid = booking?.payments?.reduce((acc, curr) => {
    if (curr.PaymentType === 'Refund') return acc - Number(curr.Amount);
    return acc + Number(curr.Amount);
  }, 0) || 0;
  const remainingCost = totalCost - totalPaid;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="relative min-h-screen bg-[#0a0a0c] text-neutral-100 flex flex-col items-center py-10 px-4">
      {/* Background gradients */}
      <div className="absolute top-[-20%] left-[-20%] w-[60%] h-[60%] rounded-full bg-primary/5 blur-[150px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-20%] w-[60%] h-[60%] rounded-full bg-indigo-600/5 blur-[150px] pointer-events-none" />

      {/* Header title */}
      <div className="flex flex-col items-center mb-8 relative z-10">
        <Link href="/" className="flex items-center gap-2 mb-2">
          {settings.LogoUrl ? (
            <img src={settings.LogoUrl} alt={settings.SoftwareName || 'PMS'} className="h-12 w-auto max-w-[180px] object-contain mb-2" />
          ) : (
            <div className="h-10 w-10 rounded-xl bg-primary/20 border border-primary/30 flex items-center justify-center">
              <Hotel className="h-5 w-5 text-primary" />
            </div>
          )}
          <span className="text-xl font-bold tracking-tight text-foreground">{settings.HotelName || 'Smax Homestay'}</span>
        </Link>
        <p className="text-xs text-muted-foreground">Tra cứu thông tin hóa đơn & Đặt phòng</p>
      </div>

      <div className="w-full max-w-[650px] space-y-6 relative z-10">
        {/* Lookup form */}
        <Card className="border-border bg-muted/60 backdrop-blur-xl shadow-xl">
          <CardHeader className="pb-4">
            <CardTitle className="text-base text-foreground">Tra cứu hóa đơn</CardTitle>
            <CardDescription className="text-muted-foreground text-xs">
              Nhập mã đặt phòng và số điện thoại để xem chi tiết tiền phòng và dịch vụ phụ thu
            </CardDescription>
          </CardHeader>
          <form onSubmit={handleFormSubmit} className="space-y-6">
            <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4 pb-4">
              <div className="space-y-1.5">
                <label className="text-xs text-muted-foreground font-semibold">Mã đặt phòng (Booking ID)</label>
                <div className="relative">
                  <KeyRound className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="text"
                    placeholder="Ví dụ: 12"
                    value={bookingId}
                    onChange={(e) => setBookingId(e.target.value)}
                    className="pl-10 h-9 bg-background border-border text-foreground text-xs font-mono"
                    disabled={isLoading}
                    required
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs text-muted-foreground font-semibold">Số điện thoại đăng ký</label>
                <div className="relative">
                  <Phone className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="tel"
                    placeholder="Ví dụ: 0901234567"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="pl-10 h-9 bg-background border-border text-foreground text-xs"
                    disabled={isLoading}
                    required
                  />
                </div>
              </div>
              {error && (
                <div className="sm:col-span-2 text-rose-500 text-xs mt-1 bg-rose-500/10 p-2.5 rounded-lg border border-rose-500/20">
                  {error}
                </div>
              )}
            </CardContent>
            <CardFooter className="flex justify-between items-center border-t border-border/60 pt-4">
              <Link href="/" className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-all">
                <ArrowLeft className="h-3 w-3" />
                Về quản trị
              </Link>
              <Button type="submit" size="sm" className="bg-primary hover:bg-primary/90 text-primary-foreground text-xs" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                    Đang tra cứu...
                  </>
                ) : (
                  <>
                    <Search className="h-3.5 w-3.5 mr-1.5" />
                    Tra cứu
                  </>
                )}
              </Button>
            </CardFooter>
          </form>
        </Card>

        {/* Search details results */}
        {booking && (
          <div className="space-y-6">
            <div id="invoice-print-area" className="p-6 bg-white text-black border border-neutral-300 rounded-xl space-y-6 shadow-2xl text-sm leading-relaxed max-w-[620px] mx-auto">
              {/* Header */}
              <div className="flex justify-between items-start border-b border-neutral-200 pb-4">
                <div>
                  <h2 className="text-lg font-bold uppercase tracking-wide">{settings.HotelName || 'Smax Homestay'}</h2>
                  <p className="text-xs text-muted-foreground mt-1">Thông tin đặt phòng / Booking Confirmation</p>
                </div>
                <div className="text-right text-xs">
                  <p className="font-semibold">Mã hóa đơn: #BS-{booking.Id}</p>
                  <p className="text-muted-foreground mt-0.5">Trạng thái: {booking.Status === 'CheckedIn' ? 'Đang lưu trú' : booking.Status === 'CheckedOut' ? 'Đã check-out' : booking.Status === 'Confirmed' ? 'Đã xác nhận' : 'Chờ xử lý'}</p>
                </div>
              </div>

              {/* Customer Details */}
              <div className="grid grid-cols-2 gap-4 text-xs">
                <div>
                  <p className="text-muted-foreground font-semibold">Khách hàng:</p>
                  <p className="font-bold text-sm mt-1">{booking.CustomerName}</p>
                  <p className="text-neutral-600 mt-0.5">SĐT: {booking.CustomerPhone || '-'}</p>
                </div>
                <div className="text-right">
                  <p className="text-muted-foreground font-semibold">Đặt phòng:</p>
                  <p className="font-bold text-sm mt-1">Mã phòng: {booking.RoomId}</p>
                  <p className="text-neutral-600 mt-0.5">Check-in: {booking.CheckInDate}</p>
                  <p className="text-neutral-600 mt-0.5">Check-out: {booking.CheckOutDate}</p>
                </div>
              </div>

              {/* Charges Breakdowns */}
              <div className="space-y-2 mt-6">
                <p className="text-xs font-bold uppercase border-b border-neutral-200 pb-1 text-neutral-700">Chi tiết thanh toán:</p>
                <table className="w-full text-xs text-left border-collapse">
                  <thead>
                    <tr className="border-b border-neutral-200 font-semibold text-neutral-600">
                      <th className="py-1">Mục</th>
                      <th className="py-1 text-right">Đơn giá</th>
                      <th className="py-1 text-center">SL</th>
                      <th className="py-1 text-right">Thành tiền</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-neutral-100">
                      <td className="py-2">Tiền phòng (Thuê phòng Homestay)</td>
                      <td className="py-2 text-right">{roomCost.toLocaleString('vi-VN')}đ</td>
                      <td className="py-2 text-center">1</td>
                      <td className="py-2 text-right font-semibold">{roomCost.toLocaleString('vi-VN')}đ</td>
                    </tr>
                    {booking.servicesOrdered?.map((so) => (
                      <tr key={so.Id} className="border-b border-neutral-100 text-neutral-700">
                        <td className="py-2 pl-4 italic">+ Phụ thu dịch vụ</td>
                        <td className="py-2 text-right">{Number(so.UnitPrice).toLocaleString('vi-VN')}đ</td>
                        <td className="py-2 text-center">{so.Quantity}</td>
                        <td className="py-2 text-right">{Number(so.TotalPrice).toLocaleString('vi-VN')}đ</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Payments Details */}
              <div className="space-y-2">
                <table className="w-full text-xs text-left border-collapse">
                  <thead>
                    <tr className="border-b border-neutral-200 font-semibold text-neutral-600">
                      <th className="py-1">Lịch sử thanh toán/đặt cọc</th>
                      <th className="py-1">Phương thức</th>
                      <th className="py-1 text-right">Số tiền</th>
                    </tr>
                  </thead>
                  <tbody>
                    {booking.payments?.length === 0 ? (
                      <tr>
                        <td colSpan="3" className="py-2 text-center text-muted-foreground italic">Chưa thanh toán đợt nào.</td>
                      </tr>
                    ) : (
                      booking.payments?.map((p) => {
                        const date = new Date(p.PaymentDate).toLocaleDateString('vi-VN');
                        return (
                          <tr key={p.Id} className="border-b border-neutral-100 text-neutral-700">
                            <td className="py-1.5">
                              {p.PaymentType === 'Deposit' ? 'Đặt cọc' : p.PaymentType === 'Final Payment' ? 'Thanh toán nốt' : p.PaymentType === 'Refund' ? 'Hoàn tiền' : 'Phụ thu'} ({date})
                            </td>
                            <td className="py-1.5">{p.PaymentMethod === 'Cash' ? 'Tiền mặt' : 'Chuyển khoản'}</td>
                            <td className="py-1.5 text-right font-bold">
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
              <div className="border-t border-neutral-300 pt-4 flex flex-col items-end gap-1.5 text-xs text-right">
                <div className="flex justify-between w-64">
                  <span className="text-muted-foreground">Tổng cộng (A):</span>
                  <span className="font-semibold">{totalCost.toLocaleString('vi-VN')}đ</span>
                </div>
                <div className="flex justify-between w-64">
                  <span className="text-muted-foreground">Đã thanh toán (B):</span>
                  <span className="font-semibold text-emerald-600">{totalPaid.toLocaleString('vi-VN')}đ</span>
                </div>
                <div className="flex justify-between w-64 border-t border-neutral-200 pt-1.5 text-sm font-bold">
                  <span>CẦN THANH TOÁN (A - B):</span>
                  <span className="text-rose-600">{remainingCost.toLocaleString('vi-VN')}đ</span>
                </div>
              </div>

              {/* VietQR Payment Block */}
              {settings.BankName && settings.BankAccountNumber && remainingCost > 0 && (
                <div className="border border-neutral-200 rounded-lg p-3 flex items-center gap-4 bg-neutral-50">
                  <img
                    src={`https://img.vietqr.io/image/${settings.BankName}-${settings.BankAccountNumber}-compact2.png?amount=${remainingCost}&addInfo=BS-${booking.Id} ${booking.CustomerName}&accountName=${encodeURIComponent(settings.BankAccountName || '')}`}
                    alt="QR Thanh toán"
                    className="h-28 w-28 object-contain"
                  />
                  <div className="text-xs space-y-1">
                    <p className="font-bold text-sm text-neutral-800">Quét QR để thanh toán</p>
                    <p className="text-muted-foreground">Ngân hàng: <span className="font-medium text-neutral-800 uppercase">{settings.BankName}</span></p>
                    <p className="text-muted-foreground">STK: <span className="font-medium text-neutral-800">{settings.BankAccountNumber}</span></p>
                    {settings.BankAccountName && <p className="text-muted-foreground">Tên TK: <span className="font-medium text-neutral-800">{settings.BankAccountName}</span></p>}
                    <p className="text-muted-foreground">Số tiền: <span className="font-bold text-rose-600">{remainingCost.toLocaleString('vi-VN')}đ</span></p>
                    <p className="text-muted-foreground italic">Nội dung: BS-{booking.Id} {booking.CustomerName}</p>
                  </div>
                </div>
              )}
            </div>

            {/* Print action trigger */}
            <div className="flex justify-center">
              <Button type="button" onClick={handlePrint} className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold">
                <Printer className="h-4 w-4 mr-2" />
                In / Lưu hóa đơn này
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Styled Printable Frame */}
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
            background: white !important;
            color: black !important;
          }
        }
      `}</style>
    </div>
  );
}

export default function BookingLookupPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-[#0a0a0c] text-foreground">
        <Loader2 className="h-8 w-8 animate-spin text-primary mr-2" />
        Loading...
      </div>
    }>
      <LookupContent />
    </Suspense>
  );
}
