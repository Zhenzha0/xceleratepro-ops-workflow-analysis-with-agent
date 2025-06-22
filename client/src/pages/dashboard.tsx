import { useState } from "react";
import Sidebar from "@/components/dashboard/sidebar";
import TopBar from "@/components/dashboard/top-bar";
import FilterSection from "@/components/dashboard/filter-section";
import KeyMetrics from "@/components/dashboard/key-metrics";
import VisualizationTabs from "@/components/dashboard/visualization-tabs";
import AnomalyDetection from "@/components/dashboard/anomaly-detection";
import CaseComparison from "@/components/dashboard/case-comparison";
import AIAssistant from "@/components/dashboard/ai-assistant";
import BottleneckAnalysisDetailed from "@/components/dashboard/bottleneck-analysis-detailed";
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
              {activeTab === 'dashboard' && (
                <>
                  <FilterSection 
                    filters={filters} 
                    onFiltersChange={setFilters}
                    metrics={metrics}
                  />
                  
                  <KeyMetrics metrics={metrics} isLoading={isLoading} />
                  
                  <div className="mb-6">
                    <BottleneckAnalysisDetailed />
                  </div>
                  
                  <VisualizationTabs />
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
                  <VisualizationTabs />
                </div>
              )}
              
              {activeTab === 'semantic-search' && (
                <div className="bg-white rounded-lg shadow p-6">
                  <h2 className="text-2xl font-bold mb-4">Semantic Search</h2>
                  <p className="text-gray-600 mb-4">Search through process failure descriptions and activities using natural language.</p>
                  <div className="space-y-4">
                    <input 
                      type="text" 
                      placeholder="Search for process issues, equipment failures, or activities..."
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    <button className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors">
                      Search Processes
                    </button>
                  </div>
                </div>
              )}
              
              {activeTab === 'timeline-analysis' && (
                <div className="bg-white rounded-lg shadow p-6">
                  <h2 className="text-2xl font-bold mb-4">Timeline Analysis</h2>
                  <p className="text-gray-600 mb-4">Analyze process execution patterns over time.</p>
                  <div className="h-64 bg-gray-100 rounded-lg flex items-center justify-center">
                    <p className="text-gray-500">Timeline visualization will appear here</p>
                  </div>
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
                  <h2 className="text-2xl font-bold mb-4">AI Process Analyst</h2>
                  <p className="text-gray-600 mb-4">Ask questions about your manufacturing processes in plain English.</p>
                  <AIAssistant />
                </div>
              )}
            </div>
            
            {/* AI Assistant Panel - only show when on dashboard */}
            {activeTab === 'dashboard' && (
              <div className="w-96">
                <AIAssistant />
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
