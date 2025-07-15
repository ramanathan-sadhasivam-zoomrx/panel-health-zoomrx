"use client";

import { useState } from "react";
import { ThemeProvider } from "@/components/theme-provider";
import { Header } from "@/components/header";
import { Sidebar } from "@/components/sidebar";
import { LoadingProvider } from "@/contexts/LoadingContext";

export default function RootShell({ children }: { children: React.ReactNode }) {
  const [selected, setSelected] = useState("nps");
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  const sidebarWidth = isSidebarCollapsed ? 80 : 256;
  const headerHeight = 60;

  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="light"
      forcedTheme="light"
      enableSystem={false}
      disableTransitionOnChange
    >
      <LoadingProvider>
        <Sidebar selected={selected} onSelect={setSelected} isCollapsed={isSidebarCollapsed} setIsCollapsed={setIsSidebarCollapsed} />
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