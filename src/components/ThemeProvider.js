'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';

const ThemeContext = createContext({
  mode: 'dark',
  changeMode: () => {},
});

export function ThemeProvider({ children }) {
  const [mode, setMode] = useState('dark'); // 'light', 'dark', 'auto'
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const savedMode = localStorage.getItem('theme-mode') || 'dark';
    setMode(savedMode);
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;

    if (mode === 'auto') {
      const checkTime = () => {
        const hour = new Date().getHours();
        if (hour >= 19 || hour < 6) {
          document.documentElement.classList.add('dark');
        } else {
          document.documentElement.classList.remove('dark');
        }
      };
      
      checkTime();
      const interval = setInterval(checkTime, 60000); // Check every minute
      return () => clearInterval(interval);
    } else {
      if (mode === 'dark') {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    }
  }, [mode, mounted]);

  const changeMode = (newMode) => {
    setMode(newMode);
    localStorage.setItem('theme-mode', newMode);
  };

  return (
    <ThemeContext.Provider value={{ mode, changeMode, mounted }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);
