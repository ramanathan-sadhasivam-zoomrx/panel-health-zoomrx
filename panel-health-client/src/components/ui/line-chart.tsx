"use client"

import * as React from "react"
import { ResponsiveContainer, LineChart as RechartsLineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, Area } from "recharts"
import { cn } from "@/lib/utils"

interface LineChartProps {
  data: any[]
  xKey: string
  yKey: string
  title?: string
  className?: string
  height?: number
  showArea?: boolean
  showGrid?: boolean
  color?: string
  strokeWidth?: number
  dotRadius?: number
  activeDotRadius?: number
  xAxisFormatter?: (value: any, index: number) => string
  yAxisFormatter?: (value: any) => string
  tooltipFormatter?: (value: any, name: string) => [string, string]
  tooltipLabelFormatter?: (label: any) => string
}

const CustomTooltip = ({ active, payload, label, labelFormatter }: any) => {
  if (!active || !payload || payload.length === 0) return null;
  // Find the first NPS value
  const npsEntry = payload.find((entry: any) => entry.dataKey === "nps");
  const value = npsEntry ? npsEntry.value : payload[0].value;
  return (
    <div style={{ background: "white", border: "1px solid #E0E7EF", borderRadius: 5, boxShadow: "0 4px 6px -1px rgba(0,0,0,0.1)", padding: 12, fontFamily: 'Manrope, sans-serif', fontSize: 14 }}>
      <div style={{ fontWeight: 700, color: '#222', marginBottom: 6 }}>{labelFormatter ? labelFormatter(label) : label}</div>
      <div style={{ color: '#1E41EB', fontWeight: 600 }}>NPS : {value}</div>
    </div>
  );
};

const LineChartComponent = React.forwardRef<HTMLDivElement, LineChartProps>(
  ({ 
    data, 
    xKey, 
    yKey, 
    title, 
    className, 
    height = 380,
    showArea = true,
    showGrid = true,
    color = "#1E41EB",
    strokeWidth = 2,
    dotRadius = 4,
    activeDotRadius = 6,
    xAxisFormatter,
    yAxisFormatter,
    tooltipFormatter,
    tooltipLabelFormatter,
    ...props 
  }, ref) => {
    // Determine if we need criss-cross labeling (more than 12 data points)
    const needsCrissCross = data.length > 12;
    return (
      <div
        ref={ref}
        className={cn(
          "bg-white rounded-[5px] p-6 shadow border border-[#E0E7EF]",
          className
        )}
        {...props}
      >
        {title && (
          <div 
            className="text-center mb-4 font-bold text-[#1E41EB] text-base"
            style={{ fontFamily: 'Manrope, sans-serif' }}
          >
            {title}
          </div>
        )}
        <ResponsiveContainer width="100%" height={height}>
          <RechartsLineChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: needsCrissCross ? 40 : 20 }}>
            {showGrid && (
              <CartesianGrid 
                strokeDasharray="3 3" 
                vertical={false}
                stroke="#E0E7EF"
                strokeOpacity={0.5}
              />
            )}
            <XAxis 
              dataKey={xKey}
              tickFormatter={xAxisFormatter}
              style={{ 
                fontFamily: 'Manrope, sans-serif', 
                fontSize: needsCrissCross ? 10 : 11,
                color: '#64748b'
              }}
              interval={needsCrissCross ? 1 : 0}
              dy={needsCrissCross ? 20 : 10}
              axisLine={{ stroke: '#E0E7EF' }}
              tickLine={{ stroke: '#E0E7EF' }}
              angle={needsCrissCross ? -45 : 0}
              textAnchor={needsCrissCross ? "end" : "middle"}
            />
            <YAxis 
              tickFormatter={yAxisFormatter}
              style={{ 
                fontFamily: 'Manrope, sans-serif', 
                fontSize: 13,
                color: '#64748b'
              }}
              axisLine={{ stroke: '#E0E7EF' }}
              tickLine={{ stroke: '#E0E7EF' }}
            />
            <Tooltip 
              content={(props) => <CustomTooltip {...props} labelFormatter={tooltipLabelFormatter} />} 
            />
            {showArea && (
              <Area 
                type="monotone" 
                dataKey={yKey} 
                stroke={color} 
                fill={color + "22"} 
                fillOpacity={0.2} 
              />
            )}
            <Line 
              type="monotone" 
              dataKey={yKey} 
              stroke={color} 
              strokeWidth={strokeWidth} 
              dot={{ 
                r: dotRadius, 
                fill: color,
                stroke: 'white',
                strokeWidth: 2
              }} 
              activeDot={{ 
                r: activeDotRadius,
                fill: color,
                stroke: 'white',
                strokeWidth: 2
              }} 
            />
          </RechartsLineChart>
        </ResponsiveContainer>
      </div>
    )
  }
)

LineChartComponent.displayName = "LineChart"

export { LineChartComponent as LineChart } 