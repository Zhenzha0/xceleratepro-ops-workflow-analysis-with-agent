import { useState, useEffect } from "react";
import { Clock, Timer, AlertTriangle, Hourglass } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useDashboardData } from "@/hooks/use-dashboard-data";

interface BottleneckData {
  processingBottlenecks: Array<{
    station: string;
    avgProcessingTime: number;
    maxProcessingTime?: number;
    minProcessingTime?: number;
    count?: number;
    impact: 'high' | 'medium' | 'low';
  }>;
  waitTimeBottlenecks: Array<{
    station: string;
    avgWaitTime: number;
    maxWaitTime?: number;
    count?: number;
    impact: 'high' | 'medium' | 'low';
  }>;
}

interface BottleneckAnalysisDetailedProps {
  filteredData?: {
    activities: any[];
    events: any[];
  };
  filters?: any;
}

export default function BottleneckAnalysisDetailed({ filteredData: propFilteredData, filters }: BottleneckAnalysisDetailedProps) {
  // Use the filtered data passed as prop directly - this comes from the Dashboard's useDashboardData hook
  const filteredData = propFilteredData;

  // Debug filtered data in BottleneckAnalysis
  console.log('BottleneckAnalysis - prop filteredData:', propFilteredData);
  console.log('BottleneckAnalysis - final filteredData:', filteredData);
  console.log('BottleneckAnalysis - activities count:', filteredData?.activities?.length);

  // Calculate bottlenecks from filtered data directly instead of using API
  const [bottlenecks, setBottlenecks] = useState<BottleneckData | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Calculate bottlenecks when filtered data changes
  useEffect(() => {
    if (filteredData?.activities && filteredData.activities.length > 0) {
      setIsLoading(true);
      const calculatedBottlenecks = calculateBottlenecksFromData(filteredData.activities);
      setBottlenecks(calculatedBottlenecks);
      setIsLoading(false);
    }
  }, [filteredData]);

  // Calculate bottlenecks from filtered data if available
  const calculateBottlenecksFromData = (activities: any[]) => {
    if (!activities || activities.length === 0) return null;

    console.log('Calculating bottlenecks from activities:', activities.length);
    console.log('Sample activity:', activities[0]);

    // Group by station/activity and calculate averages using the correct field names
    const stationStats = activities.reduce((acc: any, activity: any) => {
      const station = activity.activity || activity.resource || 'Unknown Station';
      if (!acc[station]) {
        acc[station] = {
          processingTimes: [],
          waitTimes: [],
          count: 0
        };
      }
      
      acc[station].count++;
      
      // Use actualDurationS which exists in your manufacturing data
      if (activity.actualDurationS && activity.actualDurationS > 0) {
        acc[station].processingTimes.push(activity.actualDurationS);
      }
      
      // For wait time, calculate difference between timestamps if available
      if (activity.timestamp && activity.operationEndTime) {
        const startTime = new Date(activity.timestamp).getTime();
        const endTime = new Date(activity.operationEndTime).getTime();
        const duration = (endTime - startTime) / 1000; // Convert to seconds
        if (duration > 0) {
          acc[station].waitTimes.push(duration);
        }
      }
      
      return acc;
    }, {});

    console.log('Station stats:', stationStats);

    // Calculate averages and determine impact for processing bottlenecks
    const processingBottlenecks = Object.entries(stationStats)
      .filter(([station, stats]: [string, any]) => stats.processingTimes.length > 0)
      .map(([station, stats]: [string, any]) => {
        const avgTime = stats.processingTimes.reduce((a: number, b: number) => a + b, 0) / stats.processingTimes.length;
        const maxTime = Math.max(...stats.processingTimes);
        const minTime = Math.min(...stats.processingTimes);
        
        return {
          station: station.replace(/^\//, ''), // Remove leading slash for cleaner display
          avgProcessingTime: Math.round(avgTime * 100) / 100,
          maxProcessingTime: Math.round(maxTime * 100) / 100,
          minProcessingTime: Math.round(minTime * 100) / 100,
          count: stats.count,
          impact: (avgTime > 100 ? 'high' : avgTime > 30 ? 'medium' : 'low') as 'high' | 'medium' | 'low'
        };
      })
      .sort((a, b) => b.avgProcessingTime - a.avgProcessingTime)
      .slice(0, 8); // Show more bottlenecks

    // Calculate wait time bottlenecks
    const waitTimeBottlenecks = Object.entries(stationStats)
      .filter(([station, stats]: [string, any]) => stats.waitTimes.length > 0)
      .map(([station, stats]: [string, any]) => {
        const avgWait = stats.waitTimes.reduce((a: number, b: number) => a + b, 0) / stats.waitTimes.length;
        const maxWait = Math.max(...stats.waitTimes);
        
        return {
          station: station.replace(/^\//, ''), // Remove leading slash for cleaner display
          avgWaitTime: Math.round(avgWait * 100) / 100,
          maxWaitTime: Math.round(maxWait * 100) / 100,
          count: stats.count,
          impact: (avgWait > 60 ? 'high' : avgWait > 20 ? 'medium' : 'low') as 'high' | 'medium' | 'low'
        };
      })
      .sort((a, b) => b.avgWaitTime - a.avgWaitTime)
      .slice(0, 8); // Show more bottlenecks

    console.log('Processing bottlenecks:', processingBottlenecks);
    console.log('Wait time bottlenecks:', waitTimeBottlenecks);

    return {
      processingBottlenecks,
      waitTimeBottlenecks
    };
  };

  // Debug filtered data
  console.log('BottleneckAnalysis - filteredData:', filteredData);
  console.log('BottleneckAnalysis - activities count:', filteredData?.activities?.length);
  
  const displayData = (filteredData && filteredData.activities && filteredData.activities.length > 0) ? calculateBottlenecksFromData(filteredData.activities) : bottlenecks;

  if (isLoading && !filteredData) {
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