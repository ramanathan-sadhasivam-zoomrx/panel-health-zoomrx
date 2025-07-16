import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogTitle } from "../ui/dialog";
import { Button } from "../ui/button";
import StandardDropdown from "../ui/StandardDropdown";

const months = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

const quarters = [
  "Q1", "Q2", "Q3", "Q4"
];

interface NpsCustomDateModalProps {
  open: boolean;
  setOpen: (open: boolean) => void;
  dateRange: any;
  setDateRange: (range: any) => void;
  npsData?: any[]; // Add NPS data prop
}

const NpsCustomDateModal = ({ open, setOpen, dateRange, setDateRange, npsData = [] }: NpsCustomDateModalProps) => {
  const [frequency, setFrequency] = useState(dateRange.frequency || "monthly");
  const [fromPeriod, setFromPeriod] = useState("");
  const [fromYear, setFromYear] = useState("");
  const [toPeriod, setToPeriod] = useState("");
  const [toYear, setToYear] = useState("");
  const [availableYears, setAvailableYears] = useState<number[]>([]);

  // Extract unique years from NPS data
  useEffect(() => {
    if (npsData && npsData.length > 0) {
      const years = [...new Set(npsData.map(item => item.year))].sort();
      setAvailableYears(years);
      console.log('📅 Available years from data:', years);
    } else {
      // Fallback to current year and previous year if no data
      const currentYear = new Date().getFullYear();
      setAvailableYears([currentYear - 1, currentYear]);
    }
  }, [npsData]);

  const handleSubmit = () => {
    // Validate that all required fields are filled
    if (!fromPeriod || !fromYear || !toPeriod || !toYear) {
      alert("Please fill in all required fields (From and To dates)");
      return;
    }

    let newDateRange;

    if (frequency === "quarterly") {
      // For quarterly, convert quarter to month range
      const quarterToMonths = {
        "Q1": { start: 1, end: 3 },   // Jan-Mar
        "Q2": { start: 4, end: 6 },   // Apr-Jun
        "Q3": { start: 7, end: 9 },   // Jul-Sep
        "Q4": { start: 10, end: 12 }  // Oct-Dec
      };

      const fromQuarter = quarterToMonths[fromPeriod as keyof typeof quarterToMonths];
      const toQuarter = quarterToMonths[toPeriod as keyof typeof quarterToMonths];

      newDateRange = {
        type: "custom",
        frequency,
        from: { 
          month: fromQuarter.start, 
          year: parseInt(fromYear) 
        },
        to: { 
          month: toQuarter.end, 
          year: parseInt(toYear) 
        },
      };
    } else {
      // For monthly, convert month names to numbers
      const monthToNumber = (monthName: string) => {
        const monthIndex = months.indexOf(monthName);
        return monthIndex + 1; // Convert to 1-based month number
      };

      newDateRange = {
        type: "custom",
        frequency,
        from: { 
          month: monthToNumber(fromPeriod), 
          year: parseInt(fromYear) 
        },
        to: { 
          month: monthToNumber(toPeriod), 
          year: parseInt(toYear) 
        },
      };
    }

    console.log('🔄 Setting date range with frequency:', frequency);
    console.log('📅 New date range:', newDateRange);
    
    setDateRange(newDateRange);
    setOpen(false);
  };

  // Check if form is valid
  const isFormValid = fromPeriod && fromYear && toPeriod && toYear;

  const handleFrequencyChange = (newFrequency: string) => {
    console.log('🔄 Frequency changed from', frequency, 'to', newFrequency);
    setFrequency(newFrequency);
    // Reset period selections when frequency changes
    setFromPeriod("");
    setToPeriod("");
  };

  // Determine which options to show based on frequency
  const periodOptions = frequency === "quarterly" ? quarters : months;
  const fromPeriodLabel = frequency === "quarterly" ? (fromPeriod || "Select quarter") : (fromPeriod || "Select month");
  const toPeriodLabel = frequency === "quarterly" ? (toPeriod || "Select quarter") : (toPeriod || "Select month");

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-xl rounded-[5px] shadow-lg border border-[#E0E7EF] p-8 bg-white" style={{ fontFamily: 'Manrope, sans-serif' }}>
        <DialogTitle className="text-xl font-bold mb-6 text-center text-black">Custom Data</DialogTitle>
        <div className="mb-6 flex gap-6 items-start justify-start">
          <span className="font-medium text-base min-w-[140px] text-left">Select frequency: *</span>
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input 
                type="radio" 
                checked={frequency === "monthly"} 
                onChange={() => handleFrequencyChange("monthly")} 
                className="accent-[#1E41EB]" 
              /> 
              <span>Monthly</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input 
                type="radio" 
                checked={frequency === "quarterly"} 
                onChange={() => handleFrequencyChange("quarterly")} 
                className="accent-[#1E41EB]" 
              /> 
              <span>Quarterly</span>
            </label>
          </div>
        </div>
        <div className="mb-4 text-sm text-gray-600">
          Current frequency: <strong>{frequency}</strong>
        </div>
        <div className="flex gap-6 mb-6 justify-center">
          <div className="flex flex-col gap-2 flex-1 min-w-[140px]">
            <span className="font-medium">From: *</span>
            <StandardDropdown
              label={fromPeriodLabel}
              options={periodOptions.map(p => ({ value: p, label: p, onClick: () => setFromPeriod(p) }))}
              triggerClassName="w-full"
            />
            <StandardDropdown
              label={fromYear || "Select year"}
              options={availableYears.map(y => ({ value: y.toString(), label: y.toString(), onClick: () => setFromYear(y.toString()) }))}
              triggerClassName="w-full"
            />
          </div>
          <div className="flex flex-col gap-2 flex-1 min-w-[140px]">
            <span className="font-medium">To: *</span>
            <StandardDropdown
              label={toPeriodLabel}
              options={periodOptions.map(p => ({ value: p, label: p, onClick: () => setToPeriod(p) }))}
              triggerClassName="w-full"
            />
            <StandardDropdown
              label={toYear || "Select year"}
              options={availableYears.map(y => ({ value: y.toString(), label: y.toString(), onClick: () => setToYear(y.toString()) }))}
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