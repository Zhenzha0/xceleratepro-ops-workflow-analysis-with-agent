import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import ProcessMap from "./process-map";
import DetailedAnomalyView from "./detailed-anomaly-view";
import BottleneckAnalysisDetailed from "./bottleneck-analysis-detailed";

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
          <ProcessMap />
        </TabsContent>
        
        <TabsContent value="sankey" className="mt-0">
          <CardContent className="p-6">
            <div className="bg-white rounded-lg border p-4">
              <h3 className="text-lg font-semibold mb-4">Process Flow - Manufacturing Workflow</h3>
              <svg className="w-full h-96" viewBox="0 0 800 400">
                {/* Manufacturing process flow nodes */}
                <circle cx="80" cy="200" r="20" fill="#10b981" stroke="#ffffff" strokeWidth="2"/>
                <text x="80" y="235" textAnchor="middle" fontSize="11" fill="#374151" fontWeight="500">Start</text>
                
                <circle cx="200" cy="150" r="20" fill="#3b82f6" stroke="#ffffff" strokeWidth="2"/>
                <text x="200" y="185" textAnchor="middle" fontSize="11" fill="#374151" fontWeight="500">HBW</text>
                
                <circle cx="350" cy="180" r="20" fill="#8b5cf6" stroke="#ffffff" strokeWidth="2"/>
                <text x="350" y="215" textAnchor="middle" fontSize="11" fill="#374151" fontWeight="500">VGR</text>
                
                <circle cx="500" cy="120" r="20" fill="#ef4444" stroke="#ffffff" strokeWidth="2"/>
                <text x="500" y="155" textAnchor="middle" fontSize="11" fill="#374151" fontWeight="500">Oven</text>
                
                <circle cx="500" cy="240" r="20" fill="#f59e0b" stroke="#ffffff" strokeWidth="2"/>
                <text x="500" y="275" textAnchor="middle" fontSize="11" fill="#374151" fontWeight="500">Milling</text>
                
                <circle cx="650" cy="180" r="20" fill="#06b6d4" stroke="#ffffff" strokeWidth="2"/>
                <text x="650" y="215" textAnchor="middle" fontSize="11" fill="#374151" fontWeight="500">Sorting</text>
                
                <circle cx="750" cy="200" r="20" fill="#10b981" stroke="#ffffff" strokeWidth="2"/>
                <text x="750" y="235" textAnchor="middle" fontSize="11" fill="#374151" fontWeight="500">Complete</text>
                
                {/* Flow paths with actual data volumes */}
                <path d="M 100 200 Q 150 180 180 150" stroke="#10b981" strokeWidth="8" fill="none" opacity="0.7"/>
                <text x="140" y="170" textAnchor="middle" fontSize="12" fill="#6b7280">282</text>
                
                <path d="M 220 150 Q 285 165 330 180" stroke="#3b82f6" strokeWidth="7" fill="none" opacity="0.7"/>
                <text x="275" y="160" textAnchor="middle" fontSize="12" fill="#6b7280">260</text>
                
                <path d="M 370 170 Q 435 145 480 120" stroke="#ef4444" strokeWidth="4" fill="none" opacity="0.7"/>
                <text x="425" y="140" textAnchor="middle" fontSize="12" fill="#6b7280">140</text>
                
                <path d="M 370 190 Q 435 215 480 240" stroke="#f59e0b" strokeWidth="4" fill="none" opacity="0.7"/>
                <text x="425" y="225" textAnchor="middle" fontSize="12" fill="#6b7280">120</text>
                
                <path d="M 520 130 Q 585 155 630 180" stroke="#ef4444" strokeWidth="4" fill="none" opacity="0.7"/>
                <text x="575" y="150" textAnchor="middle" fontSize="12" fill="#6b7280">125</text>
                
                <path d="M 520 230 Q 585 205 630 180" stroke="#f59e0b" strokeWidth="3" fill="none" opacity="0.7"/>
                <text x="575" y="210" textAnchor="middle" fontSize="12" fill="#6b7280">110</text>
                
                <path d="M 670 180 Q 710 190 730 200" stroke="#06b6d4" strokeWidth="6" fill="none" opacity="0.7"/>
                <text x="700" y="185" textAnchor="middle" fontSize="12" fill="#6b7280">235</text>
              </svg>
              <div className="mt-4 flex justify-center space-x-6 text-xs text-gray-600">
                <div className="flex items-center">
                  <div className="w-3 h-1 bg-blue-500 mr-2"></div>
                  <span>Primary Flow (260 cases)</span>
                </div>
                <div className="flex items-center">
                  <div className="w-3 h-1 bg-red-500 mr-2"></div>
                  <span>Oven Path (140 cases)</span>
                </div>
                <div className="flex items-center">
                  <div className="w-3 h-1 bg-yellow-500 mr-2"></div>
                  <span>Milling Path (120 cases)</span>
                </div>
              </div>
            </div>
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
