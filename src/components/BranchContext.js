'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';

const BranchContext = createContext(null);

export function BranchProvider({ children }) {
  const [branches, setBranches] = useState([]);
  const [selectedBranch, setSelectedBranch] = useState('all');
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [systemSettings, setSystemSettings] = useState({
    SoftwareName: 'Smax PMS',
    LogoUrl: '',
    FaviconUrl: '',
    DefaultCheckInTime: '14:00',
    DefaultCheckOutTime: '12:00',
    HotelName: 'Smax Homestay',
  });
  const router = useRouter();
  const pathname = usePathname();

  // Load user and branches on mount
  useEffect(() => {
    // Skip loading user info if on login page
    if (pathname === '/login') {
      setLoading(false);
      return;
    }

    const savedUser = localStorage.getItem('pms_user');
    if (savedUser) {
      const parsedUser = JSON.parse(savedUser);
      setUser(parsedUser);

      // Fetch branches list + settings in parallel
      Promise.all([
        fetch('/api/branches').then((res) => {
          if (res.status === 401) {
            localStorage.removeItem('pms_user');
            router.push('/login');
            return [];
          }
          return res.json();
        }),
        fetch('/api/settings').then((res) => res.json()).catch(() => ({})),
      ])
        .then(([branchData, settingsData]) => {
          if (Array.isArray(branchData)) {
            setBranches(branchData);

            // Determine initial selected branch
            const savedBranch = sessionStorage.getItem('pms_selected_branch');
            if (savedBranch) {
              setSelectedBranch(savedBranch);
            } else {
              const initialBranch = parsedUser.role === 'Admin' ? 'all' : parsedUser.branchId;
              setSelectedBranch(initialBranch);
              sessionStorage.setItem('pms_selected_branch', initialBranch);
            }
          }

          if (settingsData && typeof settingsData === 'object' && !settingsData.error) {
            setSystemSettings((prev) => ({ ...prev, ...settingsData }));

            // Apply dynamic favicon if set
            if (settingsData.FaviconUrl) {
              const link = document.querySelector("link[rel~='icon']");
              if (link) link.href = settingsData.FaviconUrl;
            }
          }
        })
        .catch((e) => console.error('Failed to load initial data:', e))
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
      // If not logged in and not on public pages, redirect to login
      if (pathname !== '/login' && !pathname.startsWith('/lookup')) {
        router.push('/login');
      }
    }
  }, [pathname, router]);

  const changeBranch = (branchId) => {
    setSelectedBranch(branchId);
    sessionStorage.setItem('pms_selected_branch', branchId);
    // Dispatch custom event so listeners know branch changed
    window.dispatchEvent(new Event('branchChanged'));
  };

  const logout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      localStorage.removeItem('pms_user');
      sessionStorage.removeItem('pms_selected_branch');
      setUser(null);
      router.push('/login');
    } catch (e) {
      console.error('Logout error:', e);
    }
  };

  const refreshSettings = async () => {
    try {
      const res = await fetch('/api/settings');
      const data = await res.json();
      if (data && typeof data === 'object' && !data.error) {
        setSystemSettings((prev) => ({ ...prev, ...data }));
        if (data.FaviconUrl) {
          const link = document.querySelector("link[rel~='icon']");
          if (link) link.href = data.FaviconUrl;
        }
      }
    } catch (e) {
      console.error('Failed to refresh settings:', e);
    }
  };

  return (
    <BranchContext.Provider
      value={{
        branches,
        selectedBranch,
        setSelectedBranch: changeBranch,
        user,
        setUser,
        logout,
        loading,
        systemSettings,
        refreshSettings,
        refreshBranches: async () => {
          const res = await fetch('/api/branches');
          const data = await res.json();
          if (Array.isArray(data)) setBranches(data);
        }
      }}
    >
      {children}
    </BranchContext.Provider>
  );
}

export function useBranch() {
  const context = useContext(BranchContext);
  if (!context) {
    throw new Error('useBranch must be used within a BranchProvider');
  }
  return context;
}
