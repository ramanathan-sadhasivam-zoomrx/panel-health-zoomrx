import { Button } from "@/components/ui/button";

export function Header({ isSidebarCollapsed }: { isSidebarCollapsed: boolean }) {
  const left = isSidebarCollapsed ? 64 : 192;
  return (
    <header
      className="fixed top-0 h-[50px] bg-black text-white flex items-center justify-center z-40"
      style={{ left, right: 0 }}
    >
      <h1 className="font-['Manrope'] font-bold text-center w-full px-2 text-lg sm:text-xl md:text-2xl lg:text-[28px] truncate">
        Panel Health
      </h1>
    </header>
  );
} 