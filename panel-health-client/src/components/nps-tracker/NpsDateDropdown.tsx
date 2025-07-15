import React, { useState } from "react";
import StandardDropdown from "../ui/StandardDropdown";
import NpsCustomDateModal from "./NpsCustomDateModal";

interface NpsDateDropdownProps {
  dateRange: any;
  setDateRange: (range: any) => void;
}

const NpsDateDropdown = ({ dateRange, setDateRange }: NpsDateDropdownProps) => {
  const [modalOpen, setModalOpen] = useState(false);

  const dropdownOptions = [
    {
      value: "last12months",
      label: "Last 12 months (Monthly)",
      onClick: () => setDateRange({ ...dateRange, type: "last12months" })
    },
    {
      value: "custom",
      label: "Custom data",
      onClick: () => setModalOpen(true)
    }
  ];

  const currentLabel = dateRange.type === "last12months" 
    ? "Last 12 months (Monthly)" 
    : "Custom data";

  return (
    <>
      <StandardDropdown
        label={currentLabel}
        options={dropdownOptions}
        triggerClassName="px-6 py-2"
      />
      <NpsCustomDateModal 
        open={modalOpen} 
        setOpen={setModalOpen} 
        dateRange={dateRange} 
        setDateRange={setDateRange} 
      />
    </>
  );
};

export default NpsDateDropdown; 