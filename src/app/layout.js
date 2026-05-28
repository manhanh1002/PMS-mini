import { Inter, Geist_Mono } from "next/font/google";
import "./globals.css";
import MainLayout from "@/components/MainLayout";
import { ThemeProvider } from "@/components/ThemeProvider";

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin", "vietnamese"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: "Smax PMS - Quản lý Homestay",
  description: "Hệ thống quản lý Homestay và Khách sạn đa chi nhánh",
};

export default function RootLayout({ children }) {
  return (
    <html
      lang="vi"
      className={`${inter.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: `
          try {
            var mode = localStorage.getItem('theme-mode');
            if (!mode) mode = 'dark';
            if (mode === 'dark') {
              document.documentElement.classList.add('dark');
            } else if (mode === 'light') {
              document.documentElement.classList.remove('dark');
            } else if (mode === 'auto') {
              var hour = new Date().getHours();
              if (hour >= 19 || hour < 6) {
                document.documentElement.classList.add('dark');
              } else {
                document.documentElement.classList.remove('dark');
              }
            }
          } catch (e) {}
        `}} />
      </head>
      <body className="min-h-full flex flex-col" suppressHydrationWarning>
        <ThemeProvider>
          <MainLayout>{children}</MainLayout>
        </ThemeProvider>
      </body>
    </html>
  );
}
