import React from "react";
import { LineChart } from "../ui/line-chart";

interface NpsTrendChartProps {
  dateRange: any;
  data: any[];
}

const NpsTrendChart = ({ dateRange, data }: NpsTrendChartProps) => {
  // Transform data to work with the new chart component
  const chartData = data.map(item => ({
    date: item.date,
    nps: item.nps,
    month: item.month,
    year: item.year
  }));

  const xAxisFormatter = (value: string) => {
    // Parse the date value (e.g., "2024-07") to get month and year
    const [year, month] = value.split('-');
    const monthNum = parseInt(month, 10);
    const yearNum = parseInt(year, 10);
    
    // Get month abbreviation
    const monthNames = [
      "Jan", "Feb", "Mar", "Apr", "May", "Jun",
      "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
    ];
    const monthAbbr = monthNames[monthNum - 1];
    
    // Get last 2 digits of year
    const yearShort = String(yearNum).slice(-2);
    
    return `${monthAbbr}'${yearShort}`;
  };

  const tooltipLabelFormatter = (label: string) => {
    const item = chartData.find(d => d.date === label);
    if (!item) return label;
    return `${item.month} ${item.year}`;
  };

  return (
    <LineChart
      data={chartData}
      xKey="date"
      yKey="nps"
      title="Monthly NPS Scores"
      height={380}
      showArea={true}
      showGrid={true}
      color="#1E41EB"
      strokeWidth={2}
      dotRadius={4}
      activeDotRadius={6}
      xAxisFormatter={xAxisFormatter}
      tooltipLabelFormatter={tooltipLabelFormatter}
      className="mt-2"
    />
  );
};

export default NpsTrendChart; 