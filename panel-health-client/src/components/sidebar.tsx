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
        isCollapsed ? "w-20" : "w-64"
      )}
    >
      {/* Top: Hamburger and Logo in 60px section */}
      <div className="flex items-center w-full h-[60px] px-3 border-b border-white/10">
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
            <Image src="/Logo.svg" alt="ZoomRx Logo" width={100} height={40} style={{ width: 100, height: 40 }} />
          </div>
        )}
      </div>
      {/* Menu items */}
      <nav className="flex-1 w-full mt-8 flex flex-col gap-2 justify-start items-start">
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
                "flex gap-4 px-6 py-3 text-[16px] font-medium transition-colors hover:bg-white/10 active:bg-white/20 w-full relative",
                isCollapsed ? "justify-center items-center px-0" : "justify-start items-start",
                pathname === item.key ? "bg-white/20 text-blue-300" : "",
                isDisabled ? "opacity-50 cursor-not-allowed hover:bg-transparent" : ""
              )}
              title={isCollapsed ? item.label : undefined}
            >
              <item.icon className="h-6 w-6" />
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