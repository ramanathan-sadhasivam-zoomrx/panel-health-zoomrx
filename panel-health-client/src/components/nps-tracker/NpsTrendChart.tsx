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

  const xAxisFormatter = (value: string, index: number) => {
    const item = chartData[index];
    if (!item) return '';
    const monthAbbr = item.month.slice(0, 3);
    const yearShort = String(item.year).slice(-2);
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