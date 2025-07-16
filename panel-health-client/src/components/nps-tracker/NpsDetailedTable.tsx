import React from "react";

interface NpsDetailedTableProps {
  dateRange: any;
  data: any;
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
  console.log('📋 Table received data:', data);
  
  const isQuarterly = dateRange.frequency === 'quarterly';
  const periodLabel = isQuarterly ? 'Quarter' : 'Month Number';
  
  // Extract data from the response
  const { completes = [], screenouts = [], dashboard = [], postSurvey = [], overall = [] } = data;
  
  // Create a map of data by month for easy lookup
  const dataByMonth: { [key: string]: any } = {};
  
  // Process completes data
  completes.forEach((item: any) => {
    const monthKey = item.month; // Format: "2025-01"
    if (!dataByMonth[monthKey]) {
      dataByMonth[monthKey] = {};
    }
    dataByMonth[monthKey].completes = item;
  });
  
  // Process screenouts data
  screenouts.forEach((item: any) => {
    const monthKey = item.month; // Format: "2025-01"
    if (!dataByMonth[monthKey]) {
      dataByMonth[monthKey] = {};
    }
    dataByMonth[monthKey].screenouts = item;
  });
  
  // Process dashboard NPS data
  dashboard.forEach((item: any) => {
    const monthKey = `${item.year}-${item.month.toString().padStart(2, '0')}`;
    if (!dataByMonth[monthKey]) {
      dataByMonth[monthKey] = {};
    }
    dataByMonth[monthKey].dashboard = item;
  });
  
  // Process post survey NPS data
  postSurvey.forEach((item: any) => {
    const monthKey = `${item.year}-${item.month.toString().padStart(2, '0')}`;
    if (!dataByMonth[monthKey]) {
      dataByMonth[monthKey] = {};
    }
    dataByMonth[monthKey].postSurvey = item;
  });
  
  // Process overall NPS data
  overall.forEach((item: any) => {
    const monthKey = `${item.year}-${item.month.toString().padStart(2, '0')}`;
    if (!dataByMonth[monthKey]) {
      dataByMonth[monthKey] = {};
    }
    dataByMonth[monthKey].overall = item;
  });
  
  // Convert to array and sort by date
  const tableData = Object.entries(dataByMonth)
    .map(([monthKey, monthData]) => {
      const [year, month] = monthKey.split('-');
      const monthName = new Date(parseInt(year), parseInt(month) - 1).toLocaleString('default', { month: 'short' });
      const quarter = `Q${Math.ceil(parseInt(month) / 3)}-${year}`;
      
      return {
        monthKey,
        monthName,
        quarter,
        year: parseInt(year),
        month: parseInt(month),
        ...monthData
      };
    })
    .sort((a, b) => {
      if (a.year !== b.year) return a.year - b.year;
      return a.month - b.month;
    });

  console.log('📋 Transformed table data:', tableData.slice(0, 3));
  
  return (
    <div className={tableContainer} style={{ fontFamily: 'Manrope, sans-serif' }}>
      <table className="w-full text-sm">
        <thead className="sticky top-0 z-10">
          <tr>
            <th className={thLeft} rowSpan={2}>{periodLabel}</th>
            <th className={thStyle} rowSpan={2}>Year</th>
            <th className={thStyle} colSpan={5}>Completes (Post Survey)</th>
            <th className={thStyle} colSpan={5}>Screenouts (Post Survey)</th>
            <th className={thStyle} rowSpan={2}>NPS Dashboard</th>
            <th className={thStyle} rowSpan={2}>NPS Post Survey</th>
            <th className={thStyle} rowSpan={2} style={{ backgroundColor: '#1E41EB', color: 'white' }}>NPS Overall</th>
          </tr>
          <tr>
            <th className={thStyle}>Count</th>
            <th className={thStyle}>Promoters</th>
            <th className={thStyle}>Detractors</th>
            <th className={thStyle}>NPS</th>
            <th className={thStyle}>Average NPS Rating</th>
            <th className={thStyle}>Count</th>
            <th className={thStyle}>Promoters</th>
            <th className={thStyle}>Detractors</th>
            <th className={thStyle}>NPS</th>
            <th className={thStyle}>Average NPS Rating</th>
          </tr>
        </thead>
        <tbody>
          {tableData.map((row, idx) => {
            // Extract data for each section
            const completes = row.completes || {};
            const screenouts = row.screenouts || {};
            const dashboard = row.dashboard || {};
            const postSurvey = row.postSurvey || {};
            const overall = row.overall || {};
            
            // Calculate NPS for completes
            const completesNPS = completes.response_count > 0 
              ? Math.round(((completes.promoter_count - completes.detractor_count) / completes.response_count) * 100)
              : 0;
            
            // Calculate NPS for screenouts
            const screenoutsNPS = screenouts.response_count > 0 
              ? Math.round(((screenouts.promoter_count - screenouts.detractor_count) / screenouts.response_count) * 100)
              : 0;
            
            return (
              <tr key={row.monthKey} className={idx % 2 === 0 ? "bg-[#F6F8FB]" : "bg-white"}>
                <td className={tdLeft}>
                  {isQuarterly ? row.quarter : row.monthName}
                </td>
                <td className={tdStyle}>{row.year}</td>
                
                {/* Completes (Post Survey) */}
                <td className={tdStyle}>{completes.response_count || 0}</td>
                <td className={tdStyle}>{completes.promoter_count || 0}</td>
                <td className={tdStyle}>{completes.detractor_count || 0}</td>
                <td className={tdStyle}>
                  <NpsTag value={completesNPS} />
                </td>
                <td className={tdStyle}>{completes.average_nps ? completes.average_nps.toFixed(2) : '0.00'}</td>
                
                {/* Screenouts (Post Survey) */}
                <td className={tdStyle}>{screenouts.response_count || 0}</td>
                <td className={tdStyle}>{screenouts.promoter_count || 0}</td>
                <td className={tdStyle}>{screenouts.detractor_count || 0}</td>
                <td className={tdStyle}>
                  <NpsTag value={screenoutsNPS} />
                </td>
                <td className={tdStyle}>{screenouts.average_nps ? screenouts.average_nps.toFixed(2) : '0.00'}</td>
                
                {/* NPS Dashboard */}
                <td className={tdStyle}>
                  <NpsTag value={dashboard.nps_score || 0} />
                </td>
                
                {/* NPS Post Survey */}
                <td className={tdStyle}>
                  <NpsTag value={postSurvey.nps_score || 0} />
                </td>
                
                {/* NPS Overall */}
                <td className={tdStyle} style={{ backgroundColor: '#F0F4FF', fontWeight: 'bold' }}>
                  <NpsTag value={overall.nps_score || 0} />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

export default NpsDetailedTable; 