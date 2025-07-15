import React from "react";
// If ShadCN Tabs is not present, create a fallback or use a local implementation
import { Tabs, TabsList, TabsTrigger, TabsContent } from "../ui/tabs";
import NpsTrendChart from "./NpsTrendChart";
import NpsDetailedTable from "./NpsDetailedTable";
import { BarChart2, Table } from "lucide-react";

interface NpsTabsProps {
  tab: string;
  setTab: (tab: string) => void;
  dateRange: any;
}

const NpsTabs = ({ tab, setTab, dateRange }: NpsTabsProps) => {
  return (
    <Tabs value={tab} onValueChange={setTab} className="w-full">
      <TabsList className="bg-transparent flex gap-2">
        <TabsTrigger value="trend" className="flex items-center gap-2 px-6 py-2 rounded-lg font-bold text-base" style={{ color: tab === 'trend' ? '#fff' : '#1E41EB', background: tab === 'trend' ? '#1E41EB' : '#F6F8FB' }}>
          <BarChart2 className="w-5 h-5" /> NPS Trend
        </TabsTrigger>
        <TabsTrigger value="table" className="flex items-center gap-2 px-6 py-2 rounded-lg font-bold text-base" style={{ color: tab === 'table' ? '#fff' : '#1E41EB', background: tab === 'table' ? '#1E41EB' : '#F6F8FB' }}>
          <Table className="w-5 h-5" /> NPS Detailed Table
        </TabsTrigger>
      </TabsList>
    </Tabs>
  );
};

export default NpsTabs; 