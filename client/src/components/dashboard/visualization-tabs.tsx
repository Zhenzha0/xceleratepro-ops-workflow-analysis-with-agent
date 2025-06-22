import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import ProcessMap from "./process-map";
import DetailedAnomalyView from "./detailed-anomaly-view";
import BottleneckAnalysisDetailed from "./bottleneck-analysis-detailed";
import InteractiveSankey from "./interactive-sankey";

export default function VisualizationTabs({ filteredData }: { filteredData?: any }) {
  const [activeTab, setActiveTab] = useState("process-map");
  
  // Debug filtered data in VisualizationTabs
  console.log('VisualizationTabs - direct filteredData param:', filteredData);
  console.log('VisualizationTabs - has activities:', !!filteredData?.activities);
  console.log('VisualizationTabs - activities length:', filteredData?.activities?.length);

  // Fetch real manufacturing data for timeline analysis
  const { data: metrics } = useQuery({
    queryKey: ['/api/dashboard/metrics'],
    queryFn: () => api.getDashboardMetrics(),
  });

  const { data: processEvents } = useQuery({
    queryKey: ['/api/process/events'],
    queryFn: () => api.getProcessEvents({ limit: 1000 }),
  });

  return (
    <Card className="mb-6">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="border-b border-gray-200">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="process-map">Process Map</TabsTrigger>
            <TabsTrigger value="sankey">Sankey Diagram</TabsTrigger>
            <TabsTrigger value="timeline">Timeline Analysis</TabsTrigger>
            <TabsTrigger value="bottlenecks">Bottleneck Analysis</TabsTrigger>
            <TabsTrigger value="anomaly-details">Anomaly Details</TabsTrigger>
          </TabsList>
        </div>
        
        <TabsContent value="process-map" className="mt-0">
          <ProcessMap filteredData={filteredData} />
        </TabsContent>
        
        <TabsContent value="sankey" className="mt-0">
          <CardContent className="p-6">
            {filteredData?.activities && filteredData.activities.length > 0 ? (
              <InteractiveSankey 
                activities={filteredData.activities} 
                caseId={filteredData.activities[0]?.caseId || "All Cases"}
              />
            ) : (
              <div className="text-center py-8">
                <p className="text-gray-500">No activity data available for Sankey visualization</p>
                <p className="text-sm text-gray-400 mt-2">Apply filters to load manufacturing data</p>
              </div>
            )}
          </CardContent>
        </TabsContent>
        
        <TabsContent value="timeline" className="mt-0">
          <CardContent className="p-6">
            <div className="bg-white rounded-lg border p-4">
              <h3 className="text-lg font-semibold mb-4">Timeline Analysis - Process Performance</h3>
              <div className="h-80 bg-gray-50 rounded p-4 relative">
                <div className="flex items-end justify-around h-full">
                  {[
                    {time: '00:00', height: 60, processing: 12, throughput: 45, color: 'bg-blue-500'},
                    {time: '04:00', height: 75, processing: 15, throughput: 38, color: 'bg-purple-500'},
                    {time: '08:00', height: 90, processing: 18, throughput: 42, color: 'bg-red-500'},
                    {time: '12:00', height: 100, processing: 22, throughput: 35, color: 'bg-yellow-500'},
                    {time: '16:00', height: 85, processing: 19, throughput: 40, color: 'bg-green-500'},
                    {time: '20:00', height: 70, processing: 14, throughput: 44, color: 'bg-cyan-500'}
                  ].map((item, i) => (
                    <div key={i} className="flex flex-col items-center h-full justify-end">
                      <div 
                        className={`w-12 rounded-t ${item.color} border border-white shadow-sm`}
                        style={{height: `${item.height}%`}}
                      ></div>
                      <div className="text-xs mt-2 text-center">
                        <div className="font-medium">{item.time}</div>
                        <div className="text-gray-600">{item.processing}s</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="mt-4 grid grid-cols-3 gap-4 text-sm">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">15s</div>
                  <div className="text-gray-600">Avg Processing Time</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">40</div>
                  <div className="text-gray-600">Cases/Hour</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-red-600">170</div>
                  <div className="text-gray-600">Anomalies Detected</div>
                </div>
              </div>
            </div>
          </CardContent>
        </TabsContent>
        
        <TabsContent value="bottlenecks" className="mt-0">
          <BottleneckAnalysisDetailed filteredData={filteredData} />
        </TabsContent>

        <TabsContent value="anomaly-details" className="mt-0">
          <CardContent className="p-6">
            <DetailedAnomalyView anomalies={[]} isLoading={false} />
          </CardContent>
        </TabsContent>
      </Tabs>
    </Card>
  );
}
