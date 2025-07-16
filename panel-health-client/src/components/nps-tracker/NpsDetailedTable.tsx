import React from "react";

interface NpsDetailedTableProps {
  dateRange: any;
  data: any;
}

const tableContainer = "bg-white rounded-[5px] shadow border border-[#E0E7EF] p-2 mt-2";
const thStyle = "p-1 border-b text-center bg-[#F6F8FB] font-bold text-[#1E41EB] text-[5px] sm:text-[6px] md:text-[7px] lg:text-[8px] xl:text-[10px] leading-tight";
const thLeft = "p-1 border-b text-left bg-[#F6F8FB] font-bold text-[#1E41EB] text-[5px] sm:text-[6px] md:text-[7px] lg:text-[8px] xl:text-[10px] leading-tight";
const tdStyle = "p-1 text-center text-[5px] sm:text-[6px] md:text-[7px] lg:text-[8px] xl:text-[10px] font-medium whitespace-nowrap";
const tdLeft = "p-1 text-left text-[5px] sm:text-[6px] md:text-[7px] lg:text-[8px] xl:text-[10px] font-medium whitespace-nowrap";

const NpsTag = ({ value }: { value: number }) => (
  <span className={`px-1 py-0.5 rounded text-white text-[5px] sm:text-[6px] md:text-[7px] lg:text-[8px] xl:text-[10px] font-bold inline-block text-center min-w-[2rem] ${value >= 0 ? "bg-green-600" : "bg-red-600"}`}>{value}</span>
);

const NpsDetailedTable = ({ dateRange, data }: NpsDetailedTableProps) => {
  console.log('📋 Table received data:', data);
  
  const isQuarterly = dateRange.frequency === 'quarterly';
  const periodLabel = isQuarterly ? 'Quarter' : 'Month';
  
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
      if (a.year !== b.year) return b.year - a.year;
      return b.month - a.month;
    });

  console.log('📋 Transformed table data:', tableData.slice(0, 3));
  
  return (
    <div className={tableContainer} style={{ fontFamily: 'Manrope, sans-serif' }}>
      <table className="w-full text-[5px] sm:text-[6px] md:text-[7px] lg:text-[8px] xl:text-[10px] table-fixed">
        <thead className="sticky top-0 z-10">
          <tr>
            <th className={thLeft} rowSpan={2} style={{ width: '7%' }}>{periodLabel}</th>
            <th className={thStyle} rowSpan={2} style={{ width: '5%' }}>Year</th>
            <th className={thStyle} colSpan={5} style={{ width: '32%' }}>
              <div className="flex flex-col">
                <span>Completes</span>
                <span>(Post Survey)</span>
              </div>
            </th>
            <th className={thStyle} colSpan={5} style={{ width: '32%' }}>
              <div className="flex flex-col">
                <span>Screenouts</span>
                <span>(Post Survey)</span>
              </div>
            </th>
            <th className={thStyle} rowSpan={2} style={{ width: '10%' }}>
              <div className="flex flex-col">
                <span>NPS</span>
                <span>Dashboard</span>
              </div>
            </th>
            <th className={thStyle} rowSpan={2} style={{ width: '10%' }}>
              <div className="flex flex-col">
                <span>NPS Post</span>
                <span>Survey</span>
              </div>
            </th>
            <th className={thStyle} rowSpan={2} style={{ width: '10%' }}>
              <div className="flex flex-col">
                <span>NPS</span>
                <span>Overall</span>
              </div>
            </th>
          </tr>
          <tr>
            <th className={thStyle} style={{ width: '6.4%' }}>Count</th>
            <th className={thStyle} style={{ width: '6.4%' }}>Promoters</th>
            <th className={thStyle} style={{ width: '6.4%' }}>Detractors</th>
            <th className={thStyle} style={{ width: '6.4%' }}>NPS</th>
            <th className={thStyle} style={{ width: '6.4%' }}>Avg Rating</th>
            <th className={thStyle} style={{ width: '6.4%' }}>Count</th>
            <th className={thStyle} style={{ width: '6.4%' }}>Promoters</th>
            <th className={thStyle} style={{ width: '6.4%' }}>Detractors</th>
            <th className={thStyle} style={{ width: '6.4%' }}>NPS</th>
            <th className={thStyle} style={{ width: '6.4%' }}>Avg Rating</th>
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
                <td className={tdStyle}>
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