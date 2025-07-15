import React from "react";
import { Card } from "../ui/card";

interface NpsMonth {
  month: string;
  year: number;
  date: string;
  nps: number;
  [key: string]: any;
}

interface NpsHeaderMetricsProps {
  currentMonth: NpsMonth;
  previousMonth: NpsMonth;
  bestMonth: NpsMonth;
}

const boxStyle = "flex-1 min-w-[220px] bg-white rounded-[5px] p-6 flex flex-col items-start shadow border border-[#E0E7EF] gap-2";
const labelStyle = "text-sm text-gray-600 font-medium mb-1";
const valueStyle = "text-5xl font-extrabold text-gray-900 leading-tight tracking-tight";
const bestMonthLabelStyle = "text-sm text-gray-600 font-semibold mb-1";
const bestMonthHighlightStyle = "bg-black text-white font-bold px-3 py-2 rounded-lg text-base";

const NpsHeaderMetrics = ({ currentMonth, previousMonth, bestMonth }: NpsHeaderMetricsProps) => (
  <div className="flex gap-6 w-full mb-4">
    <Card className={boxStyle}>
      <span className={labelStyle}>NPS Score {currentMonth.month} {currentMonth.year}</span>
      <span className={valueStyle}>{currentMonth.nps}</span>
    </Card>
    <Card className={boxStyle}>
      <span className={labelStyle}>NPS Score {previousMonth.month} {previousMonth.year}</span>
      <span className={valueStyle}>{previousMonth.nps}</span>
    </Card>
    <Card className={boxStyle}>
      <span className={bestMonthLabelStyle}>Best NPS Score Month {bestMonth.year}</span>
      <span className={bestMonthHighlightStyle}>{bestMonth.month} | NPS Score: {bestMonth.nps}</span>
    </Card>
  </div>
);

export default NpsHeaderMetrics; 