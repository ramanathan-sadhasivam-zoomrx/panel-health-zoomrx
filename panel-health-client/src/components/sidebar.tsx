"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart2, Star, Menu, ChevronRight, ChevronLeft, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLoading } from "@/contexts/LoadingContext";

const menuItems = [
  { icon: BarChart2, label: "NPS Tracker", key: "/nps-tracker" },
  { icon: Star, label: "Survey Experience Tracker", key: "/" },
];

export function Sidebar({ isCollapsed, setIsCollapsed }: {
  isCollapsed: boolean;
  setIsCollapsed: (collapsed: boolean) => void;
}) {
  const pathname = usePathname();
  const { loadingTracker } = useLoading();

  return (
    <aside
      className={cn(
        "bg-black text-white h-screen transition-all duration-300 flex flex-col items-center z-50 fixed top-0 left-0",
        isCollapsed ? "w-16" : "w-48"
      )}
    >
      {/* Top: Hamburger and Logo in 50px section */}
      <div className="flex items-center w-full h-[50px] px-2 border-b border-white/10">
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="p-2 mr-2 rounded hover:bg-white/10 focus:outline-none"
          aria-label={isCollapsed ? "Expand menu" : "Collapse menu"}
        >
          {isCollapsed ? (
            <ChevronRight className="h-6 w-6" />
          ) : (
            <ChevronLeft className="h-6 w-6" />
          )}
        </button>
        {!isCollapsed && (
          <div className="flex-1 flex items-center justify-center">
            <Image src="/Logo.svg" alt="ZoomRx Logo" width={80} height={32} style={{ width: 80, height: 32 }} />
          </div>
        )}
      </div>
      {/* Menu items */}
      <nav className="flex-1 w-full mt-4 flex flex-col gap-1 justify-start items-start">
        {menuItems.map((item) => {
          const isCurrentPage = pathname === item.key;
          const isDisabled = loadingTracker && !isCurrentPage;
          
          return (
            <Link
              key={item.key}
              href={isDisabled ? "#" : item.key}
              onClick={(e) => {
                if (isDisabled) {
                  e.preventDefault();
                }
              }}
              className={cn(
                "flex gap-3 px-4 py-2 text-[14px] font-medium transition-colors hover:bg-white/10 active:bg-white/20 w-full relative",
                isCollapsed ? "justify-center items-center px-0" : "justify-start items-start",
                pathname === item.key ? "bg-white/20 text-blue-300" : "",
                isDisabled ? "opacity-50 cursor-not-allowed hover:bg-transparent" : ""
              )}
              title={isCollapsed ? item.label : undefined}
            >
              <item.icon className="h-5 w-5" />
              {!isCollapsed && <span className="text-left w-full block">{item.label}</span>}
              {isDisabled && (
                <div className="absolute right-2 top-1/2 transform -translate-y-1/2">
                  <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
                </div>
              )}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
} 