import React from "react";

interface NpsDetailedTableProps {
  dateRange: any;
  data: any[];
}

const tableContainer = "overflow-x-auto bg-white rounded-[5px] shadow border border-[#E0E7EF] p-4 mt-2";
const thStyle = "p-2 border-b text-center bg-[#F6F8FB] font-bold text-[#1E41EB] text-xs whitespace-nowrap";
const thLeft = "p-2 border-b text-left bg-[#F6F8FB] font-bold text-[#1E41EB] text-xs whitespace-nowrap";
const tdStyle = "p-2 text-center text-xs font-medium whitespace-nowrap";
const tdLeft = "p-2 text-left text-xs font-medium whitespace-nowrap";
const NpsTag = ({ value }: { value: number }) => (
  <span className={`px-2 py-1 rounded text-white text-xs font-bold ${value >= 0 ? "bg-green-600" : "bg-red-600"}`}>{value}</span>
);

const NpsDetailedTable = ({ dateRange, data }: NpsDetailedTableProps) => {
  return (
    <div className={tableContainer} style={{ fontFamily: 'Manrope, sans-serif' }}>
      <table className="w-full text-sm">
        <thead className="sticky top-0 z-10">
          <tr>
            <th className={thLeft} style={{ width: '8%' }}>Month</th>
            <th className={thStyle} style={{ width: '6%' }}>Year</th>
            <th className={thStyle} colSpan={4} style={{ width: '28%' }}>Completes</th>
            <th className={thStyle} colSpan={4} style={{ width: '28%' }}>Screenouts</th>
            <th className={thStyle} colSpan={3} style={{ width: '30%' }}>NPS Metrics</th>
          </tr>
          <tr>
            <th className={thLeft}></th>
            <th className={thStyle}></th>
            <th className={thStyle}>Count</th>
            <th className={thStyle}>Prom</th>
            <th className={thStyle}>Det</th>
            <th className={thStyle}>NPS</th>
            <th className={thStyle}>Count</th>
            <th className={thStyle}>Prom</th>
            <th className={thStyle}>Det</th>
            <th className={thStyle}>NPS</th>
            <th className={thStyle}>Dashboard</th>
            <th className={thStyle}>Post Survey</th>
            <th className={thStyle}>Overall</th>
          </tr>
        </thead>
        <tbody>
          {data.map((row, idx) => (
            <tr key={row.date} className={idx % 2 === 0 ? "bg-[#F6F8FB]" : "bg-white"}>
              <td className={tdLeft}>{row.month}</td>
              <td className={tdStyle}>{row.year}</td>
              {/* Completes */}
              <td className={tdStyle}>{row.count}</td>
              <td className={tdStyle}>{row.promoters}</td>
              <td className={tdStyle}>{row.detractors}</td>
              <td className={tdStyle}><NpsTag value={row.nps} /></td>
              {/* Screenouts */}
              <td className={tdStyle}>{row.screenouts.count}</td>
              <td className={tdStyle}>{row.screenouts.promoters}</td>
              <td className={tdStyle}>{row.screenouts.detractors}</td>
              <td className={tdStyle}><NpsTag value={row.screenouts.nps} /></td>
              {/* NPS Metrics */}
              <td className={tdStyle}><NpsTag value={row.dashboard} /></td>
              <td className={tdStyle}><NpsTag value={row.postSurvey} /></td>
              <td className={tdStyle}><NpsTag value={row.overall} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default NpsDetailedTable; 