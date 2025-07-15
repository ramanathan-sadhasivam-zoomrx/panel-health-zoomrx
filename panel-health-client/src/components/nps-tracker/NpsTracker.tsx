import React, { useState, useEffect } from "react";
import NpsHeaderMetrics from "./NpsHeaderMetrics";
import NpsTabs from "./NpsTabs";
import NpsDateDropdown from "./NpsDateDropdown";
import NpsTrendChart from "./NpsTrendChart";
import NpsDetailedTable from "./NpsDetailedTable";
import { npsAPI } from "@/lib/api";
import { Loader2 } from "lucide-react";
import { useLoading } from "@/contexts/LoadingContext";

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
  const [npsData, setNpsData] = useState([]);
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

  // Fetch NPS data
  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        setError(null);
        setLoadingTracker("nps"); // Set global loading state

        // Fetch time series data
        const timeSeriesResponse = await npsAPI.getTimeSeriesData(dateRange, dateRange.frequency);
        setNpsData((timeSeriesResponse as any).data || []);

        // Fetch summary metrics
        const summaryResponse = await npsAPI.getSummaryMetrics();
        setSummaryData((summaryResponse as any).data || {
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
          <NpsDateDropdown dateRange={dateRange} setDateRange={setDateRange} />
        </div>
      </div>
      {/* Chart or table below */}
      {tab === "trend" ? (
        <NpsTrendChart dateRange={dateRange} data={npsData} />
      ) : (
        <NpsDetailedTable dateRange={dateRange} data={npsData} />
      )}
    </div>
  );
};

export default NpsTracker; 