import React from "react";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "./dropdown-menu";
import { Button } from "./button";
import { ChevronDown } from "lucide-react";

interface DropdownOption {
  value: string;
  label: string;
  onClick?: () => void;
}

interface StandardDropdownProps {
  label: string;
  options: DropdownOption[];
  icon?: React.ReactNode;
  className?: string;
  triggerClassName?: string;
  contentClassName?: string;
}

const StandardDropdown = ({ 
  label, 
  options, 
  icon, 
  className = "",
  triggerClassName = "",
  contentClassName = ""
}: StandardDropdownProps) => {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          className={`text-[#6B7280] font-semibold border border-[#D1D5DB] flex items-center justify-center gap-2 px-6 py-2 rounded-lg shadow-sm bg-white hover:bg-white focus:ring-2 focus:ring-[#D1D5DB] transition-colors w-[220px] text-[14px] ${triggerClassName}`}
          style={{ fontFamily: 'Manrope, sans-serif' }}
        >
          {label}
          <ChevronDown className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent 
        className={`bg-white shadow-lg rounded-lg border border-[#E0E7EF] mt-2 min-w-[220px] z-50 ${contentClassName}`}
        sideOffset={8}
        align="end"
      >
        {options.map((option) => (
          <DropdownMenuItem 
            key={option.value}
            onClick={option.onClick}
            className="px-3 py-2 text-sm font-medium text-[#6B7280] hover:bg-[#F3F4F6] hover:text-[#6B7280] cursor-pointer transition-colors"
            style={{ fontFamily: 'Manrope, sans-serif' }}
          >
            {option.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default StandardDropdown; 