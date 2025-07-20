"use client";

import { usePathname } from "next/navigation";
import RootShell from "./root-shell";

interface ConditionalRootShellProps {
  children: React.ReactNode;
}

export default function ConditionalRootShell({ children }: ConditionalRootShellProps) {
  const pathname = usePathname();
  
  // Pages that should NOT have the sidebar and header
  const authPages = [
    '/login',
    '/auth/callback'
  ];
  
  // Check if current page is an auth page
  const isAuthPage = authPages.some(page => pathname?.startsWith(page));
  
  // If it's an auth page, render children directly without RootShell
  if (isAuthPage) {
    return <>{children}</>;
  }
  
  // For all other pages, use RootShell with sidebar and header
  return <RootShell>{children}</RootShell>;
} 