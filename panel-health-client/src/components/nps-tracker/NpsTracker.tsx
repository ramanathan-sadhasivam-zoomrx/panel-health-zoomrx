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

  // Global loading context
  const { setLoadingTracker } = useLoading();

  // Auto-refresh cache function (called when cache expires)
  const refreshCache = async () => {

    try {
      // Clear client-side cache to force fresh fetch
      setCachedCompleteData(null);

    } catch (error) {
      console.error('Error auto-refreshing cache:', error);
    }
  };

  // Auto-refresh timer effect
  useEffect(() => {
    let isMounted = true;
    
    const checkCacheExpiry = () => {
      // Only run if component is still mounted
      if (!isMounted) return;
      
      // Check if we have cached data and if it's been more than 10 minutes
      if (cachedCompleteData) {
        const now = Date.now();
        const cacheAge = now - (cachedCompleteData._cacheTime || 0);
        const cacheExpiry = 10 * 60 * 1000; // 10 minutes
        
        if (cacheAge > cacheExpiry) {

          if (isMounted) {
            refreshCache();
          }
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
    
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [cachedCompleteData]);

  // Filter data based on date range (client-side)
  const filterDataByDateRange = (data: any, dateRange: any) => {
    if (!data || !dateRange) return data;

    let startDate, endDate;

    // Parse date range
    if (dateRange.type === 'custom' && dateRange.from && dateRange.to) {
      // Custom date range
      if (dateRange.from.month && dateRange.from.year && dateRange.to.month && dateRange.to.year) {
        startDate = new Date(dateRange.from.year, dateRange.from.month - 1, 1);
        endDate = new Date(dateRange.to.year, dateRange.to.month, 0); // Last day of the month
        console.log(`🔍 Custom date range: ${startDate.toISOString()} to ${endDate.toISOString()}`);
      } else {

        return data;
      }
    } else if (dateRange.type === 'last12months') {
      // Last 12 months
      const currentDate = new Date();
      startDate = new Date();
      startDate.setMonth(currentDate.getMonth() - 11);
      startDate.setDate(1);
      endDate = currentDate;
      console.log(`🔍 Last 12 months range: ${startDate.toISOString()} to ${endDate.toISOString()}`);
    } else {
      // Default to all data

      return data;
    }

    // Helper function to parse date from different formats
    const parseDate = (item: any, type: string) => {
      if (type === 'completes' || type === 'screenouts') {
        // For completes/screenouts, the date is in "YYYY-MM" format
        if (item.month && typeof item.month === 'string') {
          return new Date(item.month + '-01');
        }
      } else {
        // For other types, use year and month
        if (item.year && item.month) {
          return new Date(item.year, item.month - 1, 1);
        }
      }
      return null;
    };

    // Filter each data type
    const filteredData = {
      overall: data.overall?.filter((item: any) => {
        const itemDate = parseDate(item, 'overall');
        if (!itemDate) return false;
        const isInRange = itemDate >= startDate && itemDate <= endDate;
        console.log(`🔍 Overall item ${item.year}-${item.month}: ${itemDate.toISOString()} - In range: ${isInRange}`);
        return isInRange;
      }) || [],
      dashboard: data.dashboard?.filter((item: any) => {
        const itemDate = parseDate(item, 'dashboard');
        if (!itemDate) return false;
        const isInRange = itemDate >= startDate && itemDate <= endDate;
        console.log(`🔍 Dashboard item ${item.year}-${item.month}: ${itemDate.toISOString()} - In range: ${isInRange}`);
        return isInRange;
      }) || [],
      postSurvey: data.postSurvey?.filter((item: any) => {
        const itemDate = parseDate(item, 'postSurvey');
        if (!itemDate) return false;
        const isInRange = itemDate >= startDate && itemDate <= endDate;
        console.log(`🔍 PostSurvey item ${item.year}-${item.month}: ${itemDate.toISOString()} - In range: ${isInRange}`);
        return isInRange;
      }) || [],
      completes: data.completes?.filter((item: any) => {
        const itemDate = parseDate(item, 'completes');
        if (!itemDate) return false;
        const isInRange = itemDate >= startDate && itemDate <= endDate;
        console.log(`🔍 Completes item ${item.month}: ${itemDate.toISOString()} - In range: ${isInRange}`);
        return isInRange;
      }) || [],
      screenouts: data.screenouts?.filter((item: any) => {
        const itemDate = parseDate(item, 'screenouts');
        if (!itemDate) return false;
        const isInRange = itemDate >= startDate && itemDate <= endDate;
        console.log(`🔍 Screenouts item ${item.month}: ${itemDate.toISOString()} - In range: ${isInRange}`);
        return isInRange;
      }) || []
    };

    return filteredData;
  };

  // Fetch NPS data
  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        setError(null);

        let responseData;

        // Check if we have cached data
        if (cachedCompleteData) {

          responseData = cachedCompleteData;
        } else {

          setLoadingTracker("nps"); // Set global loading state
          
          // Always fetch all data from server (backend will return all available data)

          const timeSeriesResponse = await npsAPI.getTimeSeriesData({ type: 'all' }, 'monthly');

          // Log all available years and months in the response
          if (timeSeriesResponse?.overall) {
            const allYears = [...new Set(timeSeriesResponse.overall.map((item: any) => item.year))].sort();

            const allMonths = timeSeriesResponse.overall.map((item: any) => `${item.year}-${item.month}`).sort();

          }
          
          responseData = timeSeriesResponse || {};
          
          // Cache the complete dataset with timestamp
          const cachedData = {
            ...responseData,
            _cacheTime: Date.now()
          };
          setCachedCompleteData(cachedData);
          console.log('📦 Cached complete dataset (will auto-refresh in 10 minutes)');
        }

        // Filter data based on current date range
        const filteredData = filterDataByDateRange(responseData, dateRange);
        
        // Store filtered data for the detailed table
        setCompleteData(filteredData);
        
        // Use overall data for the main chart
        const chartData = filteredData.overall || [];

        console.log('📈 First few chart data points:', chartData.slice(0, 3));
        console.log('📈 Last few chart data points:', chartData.slice(-3));
        console.log('📈 All chart data dates:', chartData.map((item: NpsDataItem) => `${item.year}-${item.month}`));
        
        setNpsData(chartData);

        // Calculate summary data from the COMPLETE dataset (not filtered)
        // This ensures summary cards always show current, previous, and best NPS regardless of date range
        const completeOverallData = responseData.overall || [];

        // Sort complete data by date (newest first) for summary calculation
        const sortedCompleteData = [...completeOverallData].sort((a: NpsDataItem, b: NpsDataItem) => {
          if (a.year !== b.year) return b.year - a.year; // Newest year first
          return b.month - a.month; // Newest month first
        });
        
        console.log('📊 Sorted complete data (newest first):', sortedCompleteData.slice(0, 5).map(item => `${item.year}-${item.month}: ${item.nps_score}`));
        
        const currentMonth = sortedCompleteData[0]; // Most recent month from complete data
        const previousMonth = sortedCompleteData[1]; // Second most recent month from complete data
        
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

        console.log(`📅 Fiscal year: ${fiscalYearStart}-${fiscalYearEnd} (Oct ${fiscalYearStart} - Sep ${fiscalYearEnd})`);
        
        // Filter data for current fiscal year (using complete data)
        const fiscalYearData = sortedCompleteData.filter((item: NpsDataItem) => {
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

          return isInFiscalYear;
        });

        console.log(`📅 Fiscal year data:`, fiscalYearData.map((item: NpsDataItem) => `${item.year}-${item.month}: ${item.nps_score}`));
        
        // Find best NPS in current fiscal year (from complete data)
        const bestMonth = fiscalYearData.length > 0 
          ? fiscalYearData.reduce((best: NpsDataItem, current: NpsDataItem) => {

              return current.nps_score > best.nps_score ? current : best;
            }, fiscalYearData[0])
          : sortedCompleteData[0] || {} as NpsDataItem;

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
        <div className="flex-shrink-0">
          <NpsDateDropdown dateRange={dateRange} setDateRange={setDateRange} npsData={cachedCompleteData?.overall || []} />
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