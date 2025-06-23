import React, { useMemo } from 'react';
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ProcessActivity } from '@shared/schema';
import { format, parseISO } from 'date-fns';

interface TimelineAnalysisProps {
  filteredData?: {
    activities: ProcessActivity[];
    anomalies: Array<{
      id: string;
      type: string;
      title: string;
      description: string;
      caseId?: string;
      equipment?: string;
    }>;
  };
}

interface TimelineDataPoint {
  time: number;
  timeString: string;
  activity: string;
  activityIndex: number;
  type: 'normal' | 'anomaly';
  caseId: string;
  equipment: string;
  duration: number;
  details: string;
}

export default function TimelineAnalysis({ filteredData }: TimelineAnalysisProps) {
  const timelineData = useMemo(() => {
    if (!filteredData?.activities) return { normalData: [], anomalyData: [], activityLabels: [] };

    const activities = filteredData.activities;
    const anomalies = filteredData.anomalies || [];
    
    // Get unique activity names and sort them
    const uniqueActivities = Array.from(new Set(activities.map(a => a.activity))).sort();
    
    // Create activity index mapping
    const activityIndexMap = new Map();
    uniqueActivities.forEach((activity, index) => {
      activityIndexMap.set(activity, index);
    });
    
    // Create anomaly lookup set
    const anomalyLookup = new Set();
    anomalies.forEach(anomaly => {
      if (anomaly.caseId) {
        // Create a key that matches how we'll identify activities
        const key = `${anomaly.caseId}_${anomaly.equipment || 'unknown'}`;
        anomalyLookup.add(key);
      }
    });
    
    // Convert activities to timeline data points
    const dataPoints: TimelineDataPoint[] = activities.map(activity => {
      const startTime = activity.startTime ? new Date(activity.startTime) : new Date();
      const activityKey = `${activity.caseId}_${activity.orgResource || 'unknown'}`;
      const isAnomaly = anomalyLookup.has(activityKey) || 
                       (activity.actualDurationS && activity.plannedDurationS && 
                        Math.abs(activity.actualDurationS - activity.plannedDurationS) > 60);
      
      return {
        time: startTime.getTime(),
        timeString: format(startTime, 'HH:mm:ss MMM dd'),
        activity: activity.activity,
        activityIndex: activityIndexMap.get(activity.activity) || 0,
        type: isAnomaly ? 'anomaly' : 'normal',
        caseId: activity.caseId,
        equipment: activity.orgResource || 'Unknown',
        duration: activity.actualDurationS || 0,
        details: `Case: ${activity.caseId}, Equipment: ${activity.orgResource || 'Unknown'}, Duration: ${activity.actualDurationS || 0}s`
      };
    });
    
    // Separate normal and anomaly data for different scatter series
    const normalData = dataPoints.filter(point => point.type === 'normal');
    const anomalyData = dataPoints.filter(point => point.type === 'anomaly');
    
    return {
      normalData,
      anomalyData,
      activityLabels: uniqueActivities
    };
  }, [filteredData]);

  const customTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length > 0) {
      const data = payload[0].payload;
      return (
        <div className="bg-white p-3 border rounded shadow-lg">
          <p className="font-medium">{data.activity}</p>
          <p className="text-sm text-gray-600">Time: {data.timeString}</p>
          <p className="text-sm text-gray-600">Case: {data.caseId}</p>
          <p className="text-sm text-gray-600">Equipment: {data.equipment}</p>
          <p className="text-sm text-gray-600">Duration: {data.duration}s</p>
          <p className={`text-sm font-medium ${data.type === 'anomaly' ? 'text-red-600' : 'text-blue-600'}`}>
            {data.type === 'anomaly' ? 'Anomalous Activity' : 'Normal Activity'}
          </p>
        </div>
      );
    }
    return null;
  };

  const formatXAxisTime = (tickItem: number) => {
    return format(new Date(tickItem), 'HH:mm');
  };

  const formatYAxisActivity = (tickItem: number) => {
    return timelineData.activityLabels[tickItem] || '';
  };

  if (!filteredData?.activities || filteredData.activities.length === 0) {
    return (
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Activity Timeline Analysis</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-gray-500">
            No activity data available. Please apply filters to see timeline analysis.
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          Activity Timeline Analysis
          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
              <span>Normal Activities</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-red-500 rounded-full"></div>
              <span>Anomalous Activities</span>
            </div>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div style={{ width: '100%', height: '500px' }}>
          <ResponsiveContainer>
            <ScatterChart
              margin={{ top: 20, right: 30, bottom: 60, left: 100 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                type="number"
                dataKey="time"
                domain={['dataMin', 'dataMax']}
                tickFormatter={formatXAxisTime}
                name="Time"
                label={{ value: 'Time', position: 'insideBottom', offset: -10 }}
              />
              <YAxis
                type="number"
                dataKey="activityIndex"
                domain={[0, timelineData.activityLabels.length - 1]}
                tickFormatter={formatYAxisActivity}
                name="Activity"
                label={{ value: 'Activities', angle: -90, position: 'insideLeft' }}
                width={150}
              />
              <Tooltip content={customTooltip} />
              <Legend />
              
              {/* Normal activities - blue dots */}
              <Scatter
                name="Normal Activities"
                data={timelineData.normalData}
                fill="#3b82f6"
                fillOpacity={0.7}
                stroke="#1d4ed8"
                strokeWidth={1}
              />
              
              {/* Anomalous activities - red diamonds */}
              <Scatter
                name="Anomalous Activities"
                data={timelineData.anomalyData}
                fill="#ef4444"
                fillOpacity={0.8}
                stroke="#dc2626"
                strokeWidth={2}
                shape="diamond"
              />
            </ScatterChart>
          </ResponsiveContainer>
        </div>
        
        <div className="mt-4 text-sm text-gray-600">
          <p>
            Showing {timelineData.normalData.length + timelineData.anomalyData.length} activities 
            ({timelineData.normalData.length} normal, {timelineData.anomalyData.length} anomalous)
          </p>
        </div>
      </CardContent>
    </Card>
  );
}