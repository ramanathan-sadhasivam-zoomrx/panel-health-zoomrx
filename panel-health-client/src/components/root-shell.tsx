"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { ThemeProvider } from "@/components/theme-provider";
import { Header } from "@/components/header";
import { Sidebar } from "@/components/sidebar";
import { LoadingProvider } from "@/contexts/LoadingContext";
import { useAuth } from "@/components/AuthProvider";

export default function RootShell({ children }: { children: React.ReactNode }) {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const pathname = usePathname();
  const { isAuthenticated, isLoading } = useAuth();

  // Check if current page is auth-related
  const isAuthPage = pathname === '/login' || pathname.startsWith('/auth/');

  const sidebarWidth = isSidebarCollapsed ? 64 : 192;
  const headerHeight = 50;

  // If it's an auth page, render without sidebar and header
  if (isAuthPage) {
    return (
      <ThemeProvider
        attribute="class"
        defaultTheme="light"
        forcedTheme="light"
        enableSystem={false}
        disableTransitionOnChange
      >
        <LoadingProvider>
          {children}
        </LoadingProvider>
      </ThemeProvider>
    );
  }

  // If still loading, show loading state
  if (isLoading) {
    return (
      <ThemeProvider
        attribute="class"
        defaultTheme="light"
        forcedTheme="light"
        enableSystem={false}
        disableTransitionOnChange
      >
        <LoadingProvider>
          <div className="min-h-screen flex items-center justify-center">
            <div className="flex items-center space-x-2">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <span className="text-lg">Loading...</span>
            </div>
          </div>
        </LoadingProvider>
      </ThemeProvider>
    );
  }

  // If not authenticated, redirect to login (this will be handled by ProtectedRoute)
  if (!isAuthenticated) {
    return (
      <ThemeProvider
        attribute="class"
        defaultTheme="light"
        forcedTheme="light"
        enableSystem={false}
        disableTransitionOnChange
      >
        <LoadingProvider>
          {children}
        </LoadingProvider>
      </ThemeProvider>
    );
  }

  // Authenticated user - show full layout with sidebar and header
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="light"
      forcedTheme="light"
      enableSystem={false}
      disableTransitionOnChange
    >
      <LoadingProvider>
        <Sidebar isCollapsed={isSidebarCollapsed} setIsCollapsed={setIsSidebarCollapsed} />
        <Header isSidebarCollapsed={isSidebarCollapsed} />
        <div
          style={{
            marginLeft: sidebarWidth,
            paddingTop: headerHeight,
            minHeight: '100vh',
            background: 'var(--background)',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {children}
        </div>
      </LoadingProvider>
    </ThemeProvider>
  );
} 