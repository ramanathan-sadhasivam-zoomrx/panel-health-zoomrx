import React, { useState, useEffect } from "react";
import NpsHeaderMetrics from "./NpsHeaderMetrics";
import NpsTabs from "./NpsTabs";
import NpsDateDropdown from "./NpsDateDropdown";
import NpsTrendChart from "./NpsTrendChart";
import NpsDetailedTable from "./NpsDetailedTable";
import { npsAPI } from "@/lib/api";
import { Loader2 } from "lucide-react";
import { useLoading } from "@/contexts/LoadingContext";

// Type definitions
interface NpsDataItem {
  year: number;
  month: number;
  total_response_count: number;
  promoter_count: number;
  detractor_count: number;
  passive_count: number;
  nps_score: number;
}

const NpsTracker = () => {
  // State for selected tab, date range, and frequency
  const [tab, setTab] = useState("trend");
  const [dateRange, setDateRange] = useState({
    type: "last12months",
    from: null,
    to: null,
    frequency: "monthly",
  });

  // State for data and loading
  const [npsData, setNpsData] = useState<NpsDataItem[]>([]);
  const [completeData, setCompleteData] = useState<any>({});
  const [cachedCompleteData, setCachedCompleteData] = useState<any>(null);
  const [summaryData, setSummaryData] = useState({
    current: {
      month: "Jan",
      year: 2024,
      date: "2024-01",
      nps: 0
    },
    previous: {
      month: "Dec",
      year: 2023,
      date: "2023-12", 
      nps: 0
    },
    best: {
      month: "Jan",
      year: 2024,
      date: "2024-01",
      nps: 0
    }
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [cacheStatus, setCacheStatus] = useState('fresh'); // 'fresh' or 'cached'

  // Global loading context
  const { setLoadingTracker } = useLoading();

  // Auto-refresh cache function (called when cache expires)
  const refreshCache = async () => {
    console.log('🔄 Auto-refreshing cache');
    try {
      // Clear client-side cache to force fresh fetch
      setCachedCompleteData(null);
      setCacheStatus('fresh');
      console.log('🔄 Client cache cleared for auto-refresh');
    } catch (error) {
      console.error('Error auto-refreshing cache:', error);
    }
  };

  // Auto-refresh timer effect
  useEffect(() => {
    const checkCacheExpiry = () => {
      // Check if we have cached data and if it's been more than 10 minutes
      if (cachedCompleteData) {
        const now = Date.now();
        const cacheAge = now - (cachedCompleteData._cacheTime || 0);
        const cacheExpiry = 10 * 60 * 1000; // 10 minutes
        
        if (cacheAge > cacheExpiry) {
          console.log('⏰ Cache expired, triggering auto-refresh');
          refreshCache();
        } else {
          const timeLeft = Math.round((cacheExpiry - cacheAge) / 1000 / 60);
          console.log(`⏰ Cache still valid (${timeLeft} minutes left)`);
        }
      }
    };

    // Check every minute
    const interval = setInterval(checkCacheExpiry, 60 * 1000);
    
    // Initial check
    checkCacheExpiry();
    
    return () => clearInterval(interval);
  }, [cachedCompleteData]);

  // Filter data based on date range (client-side)
  const filterDataByDateRange = (data: any, dateRange: any) => {
    if (!data || !dateRange) return data;

    console.log('🔍 Client-side filtering for date range:', dateRange);

    let startDate, endDate;

    if (dateRange.type === 'custom' && dateRange.from && dateRange.to) {
      // Custom date range
      if (dateRange.from.month && dateRange.from.year && 
          dateRange.to.month && dateRange.to.year) {
        startDate = new Date(dateRange.from.year, dateRange.from.month - 1, 1);
        endDate = new Date(dateRange.to.year, dateRange.to.month, 0); // Last day of the month
      } else {
        console.log('🔍 Invalid custom date range format');
        return data;
      }
    } else {
      // Last 12 months
      const currentDate = new Date();
      startDate = new Date();
      startDate.setMonth(currentDate.getMonth() - 11);
      startDate.setDate(1);
      endDate = currentDate;
    }

    console.log(`🔍 Filtering from ${startDate.toISOString()} to ${endDate.toISOString()}`);

    // Filter each data type
    const filteredData = {
      overall: data.overall?.filter((item: any) => {
        const itemDate = new Date(item.year, item.month - 1);
        return itemDate >= startDate && itemDate <= endDate;
      }) || [],
      dashboard: data.dashboard?.filter((item: any) => {
        const itemDate = new Date(item.year, item.month - 1);
        return itemDate >= startDate && itemDate <= endDate;
      }) || [],
      postSurvey: data.postSurvey?.filter((item: any) => {
        const itemDate = new Date(item.year, item.month - 1);
        return itemDate >= startDate && itemDate <= endDate;
      }) || [],
      completes: data.completes?.filter((item: any) => {
        const itemDate = new Date(item.month + '-01');
        return itemDate >= startDate && itemDate <= endDate;
      }) || [],
      screenouts: data.screenouts?.filter((item: any) => {
        const itemDate = new Date(item.month + '-01');
        return itemDate >= startDate && itemDate <= endDate;
      }) || []
    };

    console.log('🔍 Filtered data counts:', {
      overall: filteredData.overall.length,
      dashboard: filteredData.dashboard.length,
      postSurvey: filteredData.postSurvey.length,
      completes: filteredData.completes.length,
      screenouts: filteredData.screenouts.length
    });

    return filteredData;
  };

  // Fetch NPS data
  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        setError(null);

        console.log('🔄 Processing NPS data with dateRange:', dateRange);
        console.log('📊 Frequency:', dateRange.frequency);

        let responseData;

        // Check if we have cached data
        if (cachedCompleteData) {
          console.log('📦 Using cached data for client-side filtering');
          responseData = cachedCompleteData;
          setCacheStatus('cached');
        } else {
          console.log('📦 No cached data, fetching from server');
          setLoadingTracker("nps"); // Set global loading state
          setCacheStatus('fresh');
          
          // Fetch time series data (without date filtering - get all data)
          const timeSeriesResponse = await npsAPI.getTimeSeriesData({ type: 'all' }, dateRange.frequency);
          console.log('📈 Raw response:', timeSeriesResponse);
          
          responseData = timeSeriesResponse || {};
          
          // Cache the complete dataset with timestamp
          const cachedData = {
            ...responseData,
            _cacheTime: Date.now()
          };
          setCachedCompleteData(cachedData);
          console.log('📦 Cached complete dataset (will auto-refresh in 10 minutes)');
        }
        
        console.log('📈 Response structure:', {
          overall: responseData.overall?.length || 0,
          dashboard: responseData.dashboard?.length || 0,
          postSurvey: responseData.postSurvey?.length || 0,
          completes: responseData.completes?.length || 0,
          screenouts: responseData.screenouts?.length || 0
        });
        
        // Filter data based on current date range
        const filteredData = filterDataByDateRange(responseData, dateRange);
        
        // Store filtered data for the detailed table
        setCompleteData(filteredData);
        
        // Use overall data for the main chart
        const chartData = filteredData.overall || [];
        console.log('📈 Chart data length:', chartData.length);
        console.log('📈 First few chart data points:', chartData.slice(0, 3));
        console.log('📈 Last few chart data points:', chartData.slice(-3));
        console.log('📈 All chart data dates:', chartData.map((item: NpsDataItem) => `${item.year}-${item.month}`));
        
        setNpsData(chartData);

        // Calculate summary data from the filtered time series data
        const currentMonth = chartData[0]; // Most recent month
        const previousMonth = chartData[1]; // Second most recent month
        
        // Calculate current fiscal year (Oct 2024 - Sep 2025)
        const currentDate = new Date();
        const currentYear = currentDate.getFullYear();
        const currentMonthNum = currentDate.getMonth() + 1; // 1-12
        
        // Fiscal year starts in October (month 10)
        let fiscalYearStart = currentYear;
        if (currentMonthNum < 10) {
          fiscalYearStart = currentYear - 1; // If we're before October, fiscal year started last year
        }
        const fiscalYearEnd = fiscalYearStart + 1;
        
        console.log(`📅 Current date: ${currentDate.toISOString()}`);
        console.log(`📅 Current month: ${currentMonthNum}`);
        console.log(`📅 Fiscal year: ${fiscalYearStart}-${fiscalYearEnd} (Oct ${fiscalYearStart} - Sep ${fiscalYearEnd})`);
        
        // Filter data for current fiscal year
        const fiscalYearData = chartData.filter((item: NpsDataItem) => {
          const itemDate = new Date(item.year, item.month - 1);
          const itemYear = itemDate.getFullYear();
          const itemMonth = itemDate.getMonth() + 1;
          
          // Check if item is in current fiscal year
          let itemFiscalYear;
          if (itemMonth >= 10) {
            // October onwards belongs to next calendar year's fiscal year
            itemFiscalYear = itemYear + 1;
          } else {
            // January to September belongs to current calendar year's fiscal year
            itemFiscalYear = itemYear;
          }
          
          const isInFiscalYear = itemFiscalYear === fiscalYearEnd;
          console.log(`📅 Item ${item.year}-${item.month}: fiscal year ${itemFiscalYear}, in current fiscal year: ${isInFiscalYear}`);
          return isInFiscalYear;
        });
        
        console.log(`📅 Fiscal year data points: ${fiscalYearData.length}`);
        console.log(`📅 Fiscal year data:`, fiscalYearData.map((item: NpsDataItem) => `${item.year}-${item.month}: ${item.nps_score}`));
        
        // Find best NPS in current fiscal year
        const bestMonth = fiscalYearData.length > 0 
          ? fiscalYearData.reduce((best: NpsDataItem, current: NpsDataItem) => {
              console.log(`📅 Comparing ${current.year}-${current.month}: ${current.nps_score} vs ${best.year}-${best.month}: ${best.nps_score}`);
              return current.nps_score > best.nps_score ? current : best;
            }, fiscalYearData[0])
          : chartData[0] || {} as NpsDataItem;
        
        console.log(`📅 Best month selected: ${bestMonth.year}-${bestMonth.month}: ${bestMonth.nps_score}`);
        
        const processedSummaryData = {
          current: {
            month: currentMonth ? new Date(currentMonth.year, currentMonth.month - 1).toLocaleString('default', { month: 'short' }) : "Jan",
            year: currentMonth?.year || 2024,
            date: currentMonth ? `${currentMonth.year}-${currentMonth.month.toString().padStart(2, '0')}` : "2024-01",
            nps: currentMonth?.nps_score || 0
          },
          previous: {
            month: previousMonth ? new Date(previousMonth.year, previousMonth.month - 1).toLocaleString('default', { month: 'short' }) : "Dec",
            year: previousMonth?.year || 2023,
            date: previousMonth ? `${previousMonth.year}-${previousMonth.month.toString().padStart(2, '0')}` : "2023-12",
            nps: previousMonth?.nps_score || 0
          },
          best: {
            month: bestMonth ? new Date(bestMonth.year, bestMonth.month - 1).toLocaleString('default', { month: 'short' }) : "Jan",
            year: bestMonth?.year || 2024,
            date: bestMonth ? `${bestMonth.year}-${bestMonth.month.toString().padStart(2, '0')}` : "2024-01",
            nps: bestMonth?.nps_score || 0
          }
        };
        
        console.log('📊 Processed summary data:', processedSummaryData);
        setSummaryData(processedSummaryData);
      } catch (err: any) {
        console.error('Error fetching NPS data:', err);
        setError(err.message || 'An error occurred');
      } finally {
        setIsLoading(false);
        setLoadingTracker(null); // Clear global loading state
      }
    };

    fetchData();
  }, [dateRange, setLoadingTracker]);

  if (isLoading) {
    return (
      <div className="flex flex-col gap-6 p-4 bg-[#F6F8FB] min-h-screen font-manrope">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col gap-6 p-4 bg-[#F6F8FB] min-h-screen font-manrope">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <h3 className="text-lg font-semibold text-red-600 mb-2">Error Loading Data</h3>
            <p className="text-gray-600">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 p-4 bg-[#F6F8FB] min-h-screen font-manrope">
      {/* Top row: summary cards only */}
      <div className="w-full flex flex-row gap-6 mb-2">
        <NpsHeaderMetrics
          currentMonth={summaryData.current}
          previousMonth={summaryData.previous}
          bestMonth={summaryData.best}
        />
      </div>
      {/* Tabs and dropdown in the same row */}
      <div className="w-full flex flex-row items-center justify-between mb-4 gap-2">
        <div className="flex-1">
          <NpsTabs tab={tab} setTab={setTab} dateRange={dateRange} />
        </div>
        <div className="flex-shrink-0 flex items-center gap-2">
          <div className="text-xs text-gray-500 flex items-center gap-1">
            <div className={`w-2 h-2 rounded-full ${cacheStatus === 'fresh' ? 'bg-green-500' : 'bg-blue-500'}`}></div>
            {cacheStatus === 'fresh' ? 'Live data' : 'Cached data'}
          </div>
          <NpsDateDropdown dateRange={dateRange} setDateRange={setDateRange} npsData={npsData} />
        </div>
      </div>
      {/* Chart or table below */}
      {tab === "trend" ? (
        <NpsTrendChart dateRange={dateRange} data={npsData} />
      ) : (
        <NpsDetailedTable dateRange={dateRange} data={completeData} />
      )}
    </div>
  );
};

export default NpsTracker; 