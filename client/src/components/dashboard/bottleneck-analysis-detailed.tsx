import { Clock, Timer, AlertTriangle, Hourglass } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

interface BottleneckData {
  processingBottlenecks: Array<{
    station: string;
    avgProcessingTime: number;
    impact: 'high' | 'medium' | 'low';
  }>;
  waitTimeBottlenecks: Array<{
    station: string;
    avgWaitTime: number;
    impact: 'high' | 'medium' | 'low';
  }>;
}

export default function BottleneckAnalysisDetailed() {
  const { data: bottlenecks, isLoading } = useQuery({
    queryKey: ['/api/bottlenecks'],
    queryFn: () => api.getBottleneckAnalysis() as Promise<BottleneckData>
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Bottleneck Analysis</CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-64 w-full" />
        </CardContent>
      </Card>
    );
  }

  const getSeverityColor = (impact: string) => {
    switch (impact) {
      case 'high': return 'bg-red-100 text-red-800';
      case 'medium': return 'bg-orange-100 text-orange-800';
      case 'low': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Hourglass className="h-5 w-5" />
          Bottleneck Analysis
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="processing" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="processing" className="flex items-center gap-2">
              <Clock size={16} />
              Processing Time Bottlenecks
            </TabsTrigger>
            <TabsTrigger value="waiting" className="flex items-center gap-2">
              <Timer size={16} />
              Wait Time Bottlenecks
            </TabsTrigger>
          </TabsList>

          <TabsContent value="processing" className="mt-6">
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-4">
                <AlertTriangle className="h-4 w-4 text-orange-500" />
                <span className="text-sm text-gray-600">
                  Stations with longest average processing times
                </span>
              </div>
              
              {bottlenecks?.processingBottlenecks && bottlenecks.processingBottlenecks.length > 0 ? (
                bottlenecks.processingBottlenecks.map((bottleneck, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-4 border rounded-lg bg-gray-50"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                        <span className="text-sm font-medium text-blue-600">
                          {index + 1}
                        </span>
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">
                          {bottleneck.station || 'Unknown Station'}
                        </p>
                        <p className="text-sm text-gray-600">
                          Manufacturing Station
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <p className="text-lg font-bold text-gray-900">
                          {Number(bottleneck.avgProcessingTime || 0).toFixed(1)}s
                        </p>
                        <p className="text-xs text-gray-500">Avg Processing</p>
                      </div>
                      <Badge variant="outline" className={getSeverityColor(bottleneck.impact)}>
                        {bottleneck.impact.toUpperCase()}
                      </Badge>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <Clock className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p>No significant processing time bottlenecks detected</p>
                  <p className="text-sm mt-2">All stations operating within expected parameters</p>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="waiting" className="mt-6">
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-4">
                <Timer className="h-4 w-4 text-blue-500" />
                <span className="text-sm text-gray-600">
                  Stations with longest waiting times (start time - scheduled time)
                </span>
              </div>
              
              {bottlenecks?.waitTimeBottlenecks && bottlenecks.waitTimeBottlenecks.length > 0 ? (
                bottlenecks.waitTimeBottlenecks.map((bottleneck, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-4 border rounded-lg bg-gray-50"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center">
                        <span className="text-sm font-medium text-orange-600">
                          {index + 1}
                        </span>
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">
                          {bottleneck.station || 'Unknown Station'}
                        </p>
                        <p className="text-sm text-gray-600">
                          Manufacturing Station
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <p className="text-lg font-bold text-gray-900">
                          {Number(bottleneck.avgWaitTime || 0).toFixed(1)}s
                        </p>
                        <p className="text-xs text-gray-500">Avg Wait Time</p>
                      </div>
                      <Badge variant="outline" className={getSeverityColor(bottleneck.impact)}>
                        {bottleneck.impact.toUpperCase()}
                      </Badge>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <Timer className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p>No significant wait time bottlenecks detected</p>
                  <p className="text-sm mt-2">Scheduling and execution well synchronized</p>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}