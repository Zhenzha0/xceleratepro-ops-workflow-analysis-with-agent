import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { api } from "@/lib/api";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import BottleneckAnalysisDetailed from "./bottleneck-analysis-detailed";
import CaseSpecificSankey from "./case-specific-sankey";
import DetailedAnomalyView from "./detailed-anomaly-view";
import ProcessMap from "./process-map";
import TimelineAnalysis from "./timeline-analysis";

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

  // Fetch anomaly data for detailed analysis
  const { data: anomalies, isLoading: anomaliesLoading } = useQuery({
    queryKey: ['/api/dashboard/anomalies'],
    queryFn: () => api.getAnomalyAlerts(),
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
              <CaseSpecificSankey activities={filteredData.activities} />
            ) : (
              <div className="text-center py-8">
                <p className="text-gray-500">No activity data available for Sankey visualization</p>
                <p className="text-sm text-gray-400 mt-2">Apply filters to load manufacturing data</p>
              </div>
            )}
          </CardContent>
        </TabsContent>
        
        <TabsContent value="timeline" className="mt-0">
          <TimelineAnalysis filteredData={filteredData} />
        </TabsContent>
        
        <TabsContent value="bottlenecks" className="mt-0">
          <BottleneckAnalysisDetailed filteredData={filteredData} />
        </TabsContent>

        <TabsContent value="anomaly-details" className="mt-0">
          <CardContent className="p-6">
            <DetailedAnomalyView 
              anomalies={filteredData?.anomalies || anomalies || []} 
              isLoading={anomaliesLoading} 
            />
          </CardContent>
        </TabsContent>
      </Tabs>
    </Card>
  );
}
