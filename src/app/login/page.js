'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Eye, EyeOff, KeyRound, User, Hotel } from 'lucide-react';
import { toast, Toaster } from 'sonner';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [branding, setBranding] = useState({ SoftwareName: 'Smax PMS', HotelName: 'Smax Homestay', LogoUrl: '' });
  const router = useRouter();

  useEffect(() => {
    fetch('/api/settings')
      .then((r) => r.json())
      .then((data) => {
        if (data && !data.error) {
          setBranding({
            SoftwareName: data.SoftwareName || 'Smax PMS',
            HotelName: data.HotelName || 'Smax Homestay',
            LogoUrl: data.LogoUrl || '',
          });
        }
      })
      .catch(() => {});
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      toast.error('Vui lòng nhập đầy đủ tên đăng nhập và mật khẩu.');
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });

      const data = await response.json();
      if (!response.ok) {
        toast.error(data.error || 'Đăng nhập thất bại.');
      } else {
        toast.success('Đăng nhập thành công!');
        // Save user info in localStorage for client-side layout headers
        localStorage.setItem('pms_user', JSON.stringify(data.user));
        
        // Wait a brief moment to show success message, then redirect
        setTimeout(() => {
          router.push('/');
          router.refresh();
        }, 800);
      }
    } catch (err) {
      console.error(err);
      toast.error('Không thể kết nối đến máy chủ.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center bg-background overflow-hidden">
      {/* Background gradients using design system primary color */}
      <div className="absolute top-[-20%] left-[-20%] w-[60%] h-[60%] rounded-full bg-primary/10 blur-[150px]" />
      <div className="absolute bottom-[-20%] right-[-20%] w-[60%] h-[60%] rounded-full bg-primary/10 blur-[150px]" />

      <Toaster position="top-center" theme="dark" />

      <div className="relative z-10 w-full max-w-[420px] p-4">
        <div className="flex flex-col items-center mb-8">
          {branding.LogoUrl ? (
            <img src={branding.LogoUrl} alt={branding.SoftwareName} className="h-14 w-auto max-w-[200px] object-contain mb-3" />
          ) : (
            <div className="h-12 w-12 rounded-xl bg-primary/20 border border-primary/30 flex items-center justify-center mb-3">
              <Hotel className="h-6 w-6 text-primary" />
            </div>
          )}
          <h1 className="text-2xl font-bold tracking-tight text-foreground">{branding.HotelName}</h1>
          <p className="text-sm text-muted-foreground mt-1 font-medium">{branding.SoftwareName} — Property Management System</p>
        </div>

        <Card className="border-border bg-card/60 backdrop-blur-xl shadow-2xl">
          <CardHeader className="space-y-1">
            <CardTitle className="text-xl text-foreground">Đăng nhập</CardTitle>
            <CardDescription className="text-muted-foreground">
              Nhập tài khoản để quản lý homestay của bạn
            </CardDescription>
          </CardHeader>
          
          <form onSubmit={handleLogin} className="space-y-6">
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-semibold text-muted-foreground">Tên đăng nhập</label>
                <div className="relative">
                  <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground/60" />
                  <Input
                    type="text"
                    placeholder="Tên đăng nhập"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="pl-10 bg-background/50 border-border text-foreground focus-visible:ring-primary/50 focus-visible:border-primary"
                    disabled={isLoading}
                    required
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <label className="text-xs font-semibold text-muted-foreground">Mật khẩu</label>
                <div className="relative">
                  <KeyRound className="absolute left-3 top-3 h-4 w-4 text-muted-foreground/60" />
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10 pr-10 bg-background/50 border-border text-foreground focus-visible:ring-primary/50 focus-visible:border-primary"
                    disabled={isLoading}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-3 text-muted-foreground/60 hover:text-foreground"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
            </CardContent>

            <CardFooter>
              <Button 
                type="submit" 
                className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold transition-all shadow-md shadow-primary/20"
                disabled={isLoading}
              >
                {isLoading ? 'Đang xử lý...' : 'Đăng nhập'}
              </Button>
            </CardFooter>
          </form>
        </Card>

        <p className="text-center text-xs text-muted-foreground mt-6">
          Mặc định hệ thống tự khởi tạo tài khoản <code className="text-neutral-400">admin</code> mật khẩu <code className="text-neutral-400">admin</code> khi cài đặt lần đầu.
        </p>
      </div>
    </div>
  );
}
