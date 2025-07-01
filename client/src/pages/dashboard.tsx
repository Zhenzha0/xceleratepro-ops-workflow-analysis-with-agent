import AIAssistant from "@/components/dashboard/ai-assistant";
import AnomalyDetection from "@/components/dashboard/anomaly-detection";
import CaseClustering from "@/components/dashboard/case-clustering";
import CaseComparison from "@/components/dashboard/case-comparison";
import FilterSection from "@/components/dashboard/filter-section";
import KeyMetrics from "@/components/dashboard/key-metrics";
import SemanticSearch from "@/components/dashboard/semantic-search";
import Sidebar from "@/components/dashboard/sidebar";
import TimelineAnalysis from "@/components/dashboard/timeline-analysis";
import TopBar from "@/components/dashboard/top-bar";
import VisualizationTabs from "@/components/dashboard/visualization-tabs";
import { useState } from "react";

import { AIServiceControls } from "@/components/ai-service-controls";
import { useDashboardData } from "@/hooks/use-dashboard-data";

export default function Dashboard() {
  const [filters, setFilters] = useState({
    scopeType: 'dataset' as 'dataset' | 'timerange',
    datasetSize: 'full',
    datasetOrder: 'first' as 'first' | 'last',
    customLimit: 1000,
    activityRange: { start: 1, end: 100 },
    timeRange: { start: '', end: '' },
    equipment: 'all',
    status: 'all',
    caseIds: [] as string[]
  });

  // Separate state for actually applied filters
  const [appliedFilters, setAppliedFilters] = useState<typeof filters | undefined>(undefined);

  const [activeTab, setActiveTab] = useState('dashboard');
  const { metrics, anomalies, cases, activities, filteredData, isLoading, applyFilters } = useDashboardData(filters, appliedFilters);

  // Handle apply filters button click
  const handleApplyFilters = () => {
    setAppliedFilters(filters);
    applyFilters(filters);
  };
  
  // Debug filtered data in dashboard
  console.log('Dashboard - filteredData:', filteredData);
  console.log('Dashboard - filters:', filters);

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      <Sidebar activeTab={activeTab} onTabChange={setActiveTab} />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        <TopBar />
        
        <main className="flex-1 overflow-x-hidden overflow-y-auto">
          <div className="flex h-full">
            {/* Main Content */}
            <div className="flex-1 p-6">
              {activeTab === 'dashboard' && (
                <>
                  <FilterSection 
                    filters={filters} 
                    onFiltersChange={setFilters}
                    onApplyFilters={handleApplyFilters}
                    metrics={metrics}
                  />
                  
                  <KeyMetrics metrics={metrics} isLoading={isLoading} />
                  
                  <VisualizationTabs filteredData={filteredData} />
                </>
              )}
              
              {activeTab === 'anomaly-detection' && (
                <AnomalyDetection anomalies={anomalies} isLoading={isLoading} />
              )}
              
              {activeTab === 'case-comparison' && (
                <CaseComparison cases={cases} />
              )}
              
              {activeTab === 'process-maps' && (
                <div className="bg-white rounded-lg shadow p-6">
                  <h2 className="text-2xl font-bold mb-4">Process Maps</h2>
                  <VisualizationTabs filteredData={filteredData} />
                </div>
              )}
              
              {activeTab === 'case-clustering' && (
                <CaseClustering filters={filters} />
              )}
              
              {activeTab === 'semantic-search' && (
                <SemanticSearch />
              )}
              
              {activeTab === 'timeline-analysis' && (
                <div className="space-y-6">
                  <div className="bg-white rounded-lg shadow p-6">
                    <h2 className="text-2xl font-bold mb-4">Timeline Analysis</h2>
                    <p className="text-gray-600 mb-4">Analyze process execution patterns over time.</p>
                  </div>
                  <TimelineAnalysis filteredData={filteredData} />
                </div>
              )}
              
              {activeTab === 'data-filters' && (
                <div className="bg-white rounded-lg shadow p-6">
                  <h2 className="text-2xl font-bold mb-4">Data Filters</h2>
                  <FilterSection 
                    filters={filters} 
                    onFiltersChange={setFilters}
                    metrics={metrics}
                  />
                </div>
              )}
              
              {activeTab === 'export-data' && (
                <div className="bg-white rounded-lg shadow p-6">
                  <h2 className="text-2xl font-bold mb-4">Export Data</h2>
                  <p className="text-gray-600 mb-4">Export your process mining results and analysis.</p>
                  <div className="space-y-4">
                    <button className="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition-colors">
                      Export to CSV
                    </button>
                    <button className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors ml-4">
                      Export Report (PDF)
                    </button>
                  </div>
                </div>
              )}
              
              {activeTab === 'ai-assistant' && (
                <div className="bg-white rounded-lg shadow p-6">
                  <h2 className="text-2xl font-bold mb-4">ProcessGPT</h2>
                  <p className="text-gray-600 mb-4">Ask questions about your manufacturing processes in plain English.</p>
                  
                  <AIServiceControls />
                  
                  <AIAssistant />
                </div>
              )}
            </div>
            
            {/* AI Assistant Panel - only show when on dashboard */}
            {activeTab === 'dashboard' && (
              <div className="w-96">
                <AIAssistant appliedFilters={appliedFilters} />
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
