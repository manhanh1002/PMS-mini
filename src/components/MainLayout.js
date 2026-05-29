'use client';

import React, { useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { BranchProvider, useBranch } from './BranchContext';
import { useTheme } from './ThemeProvider';
import {
  Hotel, LayoutDashboard, Calendar, FileSpreadsheet, DoorOpen,
  BadgePlus, GitBranch, LogOut, Loader2, User, Globe, Wallet,
  Settings, UsersRound, ChevronLeft, ChevronRight, Tag,
  Sun, Moon, Monitor, ClockAlert
} from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Toaster } from '@/components/ui/sonner';

function LayoutContent({ children }) {
  const pathname = usePathname();
  const router = useRouter();
  const { branches, selectedBranch, setSelectedBranch, user, logout, loading, systemSettings } = useBranch();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const { mode, changeMode, mounted } = useTheme();

  // Public/login routes do not get layout styling
  const isPublicPage = pathname === '/login' || pathname.startsWith('/lookup');

  if (isPublicPage) {
    return <>{children}</>;
  }

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background text-foreground">
        <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
        <p className="text-sm text-muted-foreground font-medium">Đang tải cấu hình hệ thống...</p>
      </div>
    );
  }

  const softwareName = systemSettings?.SoftwareName || 'Smax PMS';
  const logoUrl = systemSettings?.LogoUrl || '';

  const navItems = [
    { name: 'Dashboard', path: '/', icon: LayoutDashboard },
    { name: 'Lịch đặt phòng', path: '/calendar', icon: Calendar },
    { name: 'Đặt phòng', path: '/bookings', icon: FileSpreadsheet },
    { name: 'Quản lý phòng', path: '/rooms', icon: DoorOpen },
    { name: 'Dịch vụ phụ thu', path: '/services', icon: BadgePlus },
    { name: 'Sổ quỹ Thu Chi', path: '/cashbook', icon: Wallet },
  ];

  // Only Admin can manage branches, sources, users, policies & settings
  if (user?.role === 'Admin') {
    navItems.push({ name: 'Chi nhánh', path: '/branches', icon: GitBranch });
    navItems.push({ name: 'Nguồn đặt phòng', path: '/sources', icon: Globe });
    navItems.push({ name: 'Khuyến mãi', path: '/promotions', icon: Tag });
    navItems.push({ name: 'Quản lý nhân viên', path: '/users', icon: UsersRound });
    navItems.push({ name: 'Chính sách vận hành', path: '/policies', icon: ClockAlert });
    navItems.push({ name: 'Cài đặt hệ thống', path: '/settings', icon: Settings });
  }

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      {/* Glow overlays */}
      <div className="absolute top-0 right-0 w-[40%] h-[30%] rounded-full bg-primary/5 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[40%] h-[30%] rounded-full bg-primary/5 blur-[120px] pointer-events-none" />

      {/* Top Header */}
      <header className="sticky top-0 z-40 w-full border-b border-border bg-card/85 backdrop-blur-md">
        <div className="max-w-[1400px] mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link href="/" className="flex items-center gap-2">
              {logoUrl ? (
                <img src={logoUrl} alt={softwareName} className="h-8 w-auto max-w-[120px] object-contain" />
              ) : (
                <div className="h-9 w-9 rounded-lg bg-primary/20 border border-primary/30 flex items-center justify-center">
                  <Hotel className="h-5 w-5 text-primary" />
                </div>
              )}
              <span className="font-bold tracking-tight text-foreground hidden sm:inline">{softwareName}</span>
            </Link>

            {/* Branch Selector Dropdown */}
            {user && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground hidden md:inline">Chi nhánh:</span>
                <Select
                  value={selectedBranch}
                  onValueChange={(val) => setSelectedBranch(val)}
                  disabled={user.role !== 'Admin'} // Staff cannot switch branch
                >
                  <SelectTrigger className="w-[180px] sm:w-[220px] h-9 bg-background border-border text-foreground focus:ring-primary/50">
                    <SelectValue placeholder="Chọn chi nhánh" />
                  </SelectTrigger>
                  <SelectContent className="bg-card border-border text-foreground">
                    {user.role === 'Admin' && (
                      <SelectItem value="all">Tất cả chi nhánh</SelectItem>
                    )}
                    {branches.map((b) => (
                      <SelectItem key={b.Id} value={String(b.Id)}>
                        {b.BranchName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          {/* User Profile, Theme & Logout */}
          {user && (
            <div className="flex items-center gap-3">
              {mounted && (
                <Select value={mode} onValueChange={changeMode}>
                  <SelectTrigger className="w-[120px] h-9 bg-background border-border text-foreground focus:ring-primary/50">
                    <SelectValue placeholder="Giao diện" />
                  </SelectTrigger>
                  <SelectContent className="bg-card border-border text-foreground">
                    <SelectItem value="light">
                      <div className="flex items-center gap-2">
                        <Sun className="h-4 w-4" />
                        <span>Sáng</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="dark">
                      <div className="flex items-center gap-2">
                        <Moon className="h-4 w-4" />
                        <span>Tối</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="auto">
                      <div className="flex items-center gap-2">
                        <Monitor className="h-4 w-4" />
                        <span>Tự động</span>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              )}
              <div className="hidden md:flex flex-col items-end text-right">
                <span className="text-sm font-medium text-foreground">{user.fullName}</span>
                <span className="text-xs text-muted-foreground capitalize font-medium">{user.role}</span>
              </div>
              <Link
                href="/users"
                title="Tài khoản của tôi"
                className="h-8 w-8 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center text-primary font-semibold text-sm hover:bg-primary/30 transition-colors"
              >
                <User className="h-4 w-4" />
              </Link>
              <Button
                variant="ghost"
                size="icon"
                onClick={logout}
                className="text-muted-foreground hover:text-foreground hover:bg-muted h-9 w-9 rounded-lg"
                title="Đăng xuất"
              >
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      </header>

      {/* Main Body */}
      <div className="flex-1 flex max-w-[1400px] w-full mx-auto px-4 py-6 gap-6 relative">
        {/* Navigation Sidebar */}
        <aside className={`shrink-0 hidden lg:flex flex-col transition-all duration-300 z-20 ${isCollapsed ? 'w-16' : 'w-64'}`}>
          <nav className="sticky top-24 flex flex-col space-y-1 w-full">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.path;
              return (
                <Link
                  key={item.path}
                  href={item.path}
                  className={`group relative flex items-center ${isCollapsed ? 'justify-center px-0' : 'gap-3 px-4'} h-10 rounded-lg text-sm font-medium transition-all ${
                    isActive
                      ? 'bg-primary/10 text-primary border border-primary/20 font-semibold shadow-md shadow-primary/5'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted border border-transparent'
                  }`}
                >
                  <Icon className={`h-4 w-4 shrink-0 ${isActive ? 'text-primary' : 'text-muted-foreground'}`} />
                  {!isCollapsed && <span className="truncate">{item.name}</span>}
                  
                  {isCollapsed && (
                    <div className="absolute left-full top-1/2 -translate-y-1/2 ml-3 px-2 py-1 bg-card text-card-foreground text-xs font-medium rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-50 border border-border shadow-md">
                      {item.name}
                    </div>
                  )}
                </Link>
              );
            })}

            <div className="pt-4 mt-4 border-t border-border/50 flex justify-center">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsCollapsed(!isCollapsed)}
                className="w-full flex justify-center text-muted-foreground hover:text-foreground hover:bg-muted"
                title={isCollapsed ? "Mở rộng" : "Thu gọn"}
              >
                {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
              </Button>
            </div>
          </nav>
        </aside>

        {/* Content Area */}
        <main className="flex-1 min-w-0 bg-card/40 border border-border/60 rounded-xl p-4 sm:p-6 backdrop-blur-sm">
          {/* Mobile Navigation bar */}
          <div className="lg:hidden flex items-center gap-1 overflow-x-auto pb-4 mb-4 border-b border-border scrollbar-none">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.path;
              return (
                <Link
                  key={item.path}
                  href={item.path}
                  className={`flex items-center gap-1.5 px-3 h-8 rounded-lg text-xs whitespace-nowrap transition-all shrink-0 ${
                    isActive
                      ? 'bg-primary/10 text-primary border border-primary/20 font-semibold'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {item.name}
                </Link>
              );
            })}
          </div>

          {children}
        </main>
      </div>

      <footer className="w-full py-4 text-center text-xs text-muted-foreground border-t border-border mt-12 bg-card/30">
        &copy; {new Date().getFullYear()} {softwareName}. Homestay &amp; Hotel Property Management System.
      </footer>
    </div>
  );
}

export default function MainLayout({ children }) {
  return (
    <BranchProvider>
      <LayoutContent>{children}</LayoutContent>
      <Toaster position="top-right" theme="dark" closeButton />
    </BranchProvider>
  );
}
