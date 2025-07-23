import React from "react";
import { LineChart } from "../ui/line-chart";

interface NpsTrendChartProps {
  dateRange: any;
  data: any[];
}

const NpsTrendChart = ({ dateRange, data }: NpsTrendChartProps) => {

  // Transform data to work with the new chart component
  const chartData = data.map(item => {
    // Create date string in YYYY-MM format
    const date = `${item.year}-${item.month.toString().padStart(2, '0')}`;
    
    return {
      date: date,
      nps: item.nps_score, // Backend returns nps_score, not nps
      month: new Date(item.year, item.month - 1).toLocaleString('default', { month: 'short' }),
      year: item.year,
      monthNum: item.month, // Add month number for proper sorting
      quarter: `Q${Math.ceil(item.month / 3)}-${item.year}`,
      total_response_count: item.total_response_count,
      promoter_count: item.promoter_count,
      detractor_count: item.detractor_count,
      passive_count: item.passive_count
    };
  }).sort((a, b) => {
    // Sort in chronological order (oldest first) for the chart
    if (a.year !== b.year) return a.year - b.year;
    return a.monthNum - b.monthNum;
  });

  console.log('📊 Transformed chart data:', chartData.slice(0, 5));

  const xAxisFormatter = (value: string, index: number) => {
    // Check if this is quarterly data (contains 'Q' in the date)
    if (value.includes('Q')) {
      // For quarterly data, format as "Q1-2025"
      return value;
    }
    
    // For monthly data, parse the date value (e.g., "2024-07") to get month and year
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
    
    // Check if this is quarterly data based on frequency
    if (dateRange.frequency === 'quarterly') {
      return item.quarter;
    }
    
    return `${item.month} ${item.year}`;
  };

  // Determine chart title based on frequency
  const chartTitle = dateRange.frequency === 'quarterly' ? 'Quarterly NPS Scores' : 'Monthly NPS Scores';

  return (
    <LineChart
      data={chartData}
      xKey="date"
      yKey="nps"
      title={chartTitle}
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