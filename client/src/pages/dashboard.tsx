import { useState } from "react";
import Sidebar from "@/components/dashboard/sidebar";
import TopBar from "@/components/dashboard/top-bar";
import FilterSection from "@/components/dashboard/filter-section";
import KeyMetrics from "@/components/dashboard/key-metrics";
import VisualizationTabs from "@/components/dashboard/visualization-tabs";
import AnomalyDetection from "@/components/dashboard/anomaly-detection";
import CaseComparison from "@/components/dashboard/case-comparison";
import AIAssistant from "@/components/dashboard/ai-assistant";
import { useDashboardData } from "@/hooks/use-dashboard-data";

export default function Dashboard() {
  const [filters, setFilters] = useState({
    datasetSize: 'full' as const,
    timeRange: { start: '', end: '' },
    equipment: 'all',
    status: 'all' as const
  });

  const [activeTab, setActiveTab] = useState('dashboard');
  const { metrics, anomalies, cases, isLoading } = useDashboardData(filters);

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      <Sidebar activeTab={activeTab} onTabChange={setActiveTab} />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        <TopBar />
        
        <main className="flex-1 overflow-x-hidden overflow-y-auto">
          <div className="flex h-full">
            {/* Main Content */}
            <div className="flex-1 p-6">
              <FilterSection 
                filters={filters} 
                onFiltersChange={setFilters}
                metrics={metrics}
              />
              
              <KeyMetrics metrics={metrics} isLoading={isLoading} />
              
              <VisualizationTabs />
              
              <AnomalyDetection anomalies={anomalies} isLoading={isLoading} />
              
              <CaseComparison cases={cases} />
            </div>
            
            {/* AI Assistant Panel */}
            <div className="w-96">
              <AIAssistant />
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
