"use client";

import { useState } from "react";
import { ThemeProvider } from "@/components/theme-provider";
import { Header } from "@/components/header";
import { Sidebar } from "@/components/sidebar";

export default function RootShell({ children }: { children: React.ReactNode }) {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  const sidebarWidth = isSidebarCollapsed ? 64 : 192;
  const headerHeight = 50;

  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="light"
      forcedTheme="light"
      enableSystem={false}
      disableTransitionOnChange
    >
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
    </ThemeProvider>
  );
} 