import { Button } from "@/components/ui/button";

export function Header({ isSidebarCollapsed }: { isSidebarCollapsed: boolean }) {
  const left = isSidebarCollapsed ? 80 : 256;
  return (
    <header
      className="fixed top-0 h-[60px] bg-black text-white flex items-center justify-center z-40"
      style={{ left, right: 0 }}
    >
      <h1 className="font-['Manrope'] font-bold text-[28px] text-center w-full">
        Panel Health
      </h1>
    </header>
  );
} 