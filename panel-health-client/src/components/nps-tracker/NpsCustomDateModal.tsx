import React, { useState } from "react";
import { Dialog, DialogContent } from "../ui/dialog";
import { Button } from "../ui/button";
import StandardDropdown from "../ui/StandardDropdown";

const months = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];
const years = [2024, 2025];

interface NpsCustomDateModalProps {
  open: boolean;
  setOpen: (open: boolean) => void;
  dateRange: any;
  setDateRange: (range: any) => void;
}

const NpsCustomDateModal = ({ open, setOpen, dateRange, setDateRange }: NpsCustomDateModalProps) => {
  const [frequency, setFrequency] = useState(dateRange.frequency || "monthly");
  const [fromMonth, setFromMonth] = useState("");
  const [fromYear, setFromYear] = useState("");
  const [toMonth, setToMonth] = useState("");
  const [toYear, setToYear] = useState("");

  const handleSubmit = () => {
    // Validate that all required fields are filled
    if (!fromMonth || !fromYear || !toMonth || !toYear) {
      alert("Please fill in all required fields (From and To dates)");
      return;
    }

    // Convert month names to numbers for proper date handling
    const monthToNumber = (monthName: string) => {
      const monthIndex = months.indexOf(monthName);
      return monthIndex + 1; // Convert to 1-based month number
    };

    setDateRange({
      type: "custom",
      frequency,
      from: { 
        month: monthToNumber(fromMonth), 
        year: parseInt(fromYear) 
      },
      to: { 
        month: monthToNumber(toMonth), 
        year: parseInt(toYear) 
      },
    });
    setOpen(false);
  };

  // Check if form is valid
  const isFormValid = fromMonth && fromYear && toMonth && toYear;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-xl rounded-[5px] shadow-lg border border-[#E0E7EF] p-8 bg-white" style={{ fontFamily: 'Manrope, sans-serif' }}>
        <div className="text-xl font-bold mb-6 text-center text-black">Custom Data</div>
        <div className="mb-6 flex gap-6 items-start justify-start">
          <span className="font-medium text-base min-w-[140px] text-left">Select frequency: *</span>
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="radio" checked={frequency === "monthly"} onChange={() => setFrequency("monthly")} className="accent-[#1E41EB]" /> <span>Monthly</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="radio" checked={frequency === "quarterly"} onChange={() => setFrequency("quarterly")} className="accent-[#1E41EB]" /> <span>Quarterly</span>
            </label>
          </div>
        </div>
        <div className="flex gap-6 mb-6 justify-center">
          <div className="flex flex-col gap-2 flex-1 min-w-[140px]">
            <span className="font-medium">From: *</span>
            <StandardDropdown
              label={fromMonth || "Select month"}
              options={months.map(m => ({ value: m, label: m, onClick: () => setFromMonth(m) }))}
              triggerClassName="w-full"
            />
            <StandardDropdown
              label={fromYear || "Select year"}
              options={years.map(y => ({ value: y.toString(), label: y.toString(), onClick: () => setFromYear(y.toString()) }))}
              triggerClassName="w-full"
            />
          </div>
          <div className="flex flex-col gap-2 flex-1 min-w-[140px]">
            <span className="font-medium">To: *</span>
            <StandardDropdown
              label={toMonth || "Select month"}
              options={months.map(m => ({ value: m, label: m, onClick: () => setToMonth(m) }))}
              triggerClassName="w-full"
            />
            <StandardDropdown
              label={toYear || "Select year"}
              options={years.map(y => ({ value: y.toString(), label: y.toString(), onClick: () => setToYear(y.toString()) }))}
              triggerClassName="w-full"
            />
          </div>
        </div>
        <Button 
          onClick={handleSubmit}
          disabled={!isFormValid}
          className={`w-full mt-2 font-bold rounded-lg py-3 text-[16px] shadow transition ${
            isFormValid 
              ? 'bg-[#1E41EB] text-white hover:bg-[#1633b8]' 
              : 'bg-gray-300 text-gray-500 cursor-not-allowed'
          }`}
        >
          SUBMIT
        </Button>
      </DialogContent>
    </Dialog>
  );
};

export default NpsCustomDateModal; 