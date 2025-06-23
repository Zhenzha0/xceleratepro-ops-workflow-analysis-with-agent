import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { AlertTriangle, Clock, CheckCircle, XCircle, ChevronDown, ChevronRight, Table } from "lucide-react";
import { AnomalyAlert } from "@shared/schema";
import { format } from "date-fns";
import { useQuery } from "@tanstack/react-query";

// CaseActivitiesTable Component
interface CaseActivitiesTableProps {
  caseId: string;
  anomalousActivity: string;
}

function CaseActivitiesTable({ caseId, anomalousActivity }: CaseActivitiesTableProps) {
  const { data: activities, isLoading } = useQuery({
    queryKey: ['/api/process/activities', caseId],
    queryFn: async () => {
      const response = await fetch(`/api/process/activities?caseId=${caseId}`);
      if (!response.ok) throw new Error('Failed to fetch activities');
      return response.json();
    },
  });

  if (isLoading) {
    return (
      <div className="animate-pulse">
        <div className="h-32 bg-gray-100 rounded"></div>
      </div>
    );
  }

  if (!activities || activities.length === 0) {
    return (
      <div className="text-center py-4 text-gray-500">
        No activities found for case {caseId}
      </div>
    );
  }

  return (
    <div className="border rounded-lg overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="px-3 py-2 text-left font-medium text-gray-900">Case ID</th>
              <th className="px-3 py-2 text-left font-medium text-gray-900">Activity</th>
              <th className="px-3 py-2 text-left font-medium text-gray-900">Timestamp</th>
              <th className="px-3 py-2 text-left font-medium text-gray-900">Processing Time (s)</th>
              <th className="px-3 py-2 text-left font-medium text-gray-900">Planned (s)</th>
              <th className="px-3 py-2 text-left font-medium text-gray-900">Status</th>
            </tr>
          </thead>
          <tbody>
            {activities.map((activity: any, index: number) => {
              const isAnomalous = activity.activity === anomalousActivity || activity.isAnomaly;
              return (
                <tr 
                  key={index} 
                  className={`border-b hover:bg-gray-50 ${
                    isAnomalous ? 'bg-red-50 border-red-200' : ''
                  }`}
                >
                  <td className="px-3 py-2 font-mono text-xs">{activity.caseId}</td>
                  <td className={`px-3 py-2 ${isAnomalous ? 'font-semibold text-red-800' : ''}`}>
                    {activity.activity}
                  </td>
                  <td className="px-3 py-2 text-gray-600">
                    {activity.startTime ? format(new Date(activity.startTime), 'MMM dd, HH:mm:ss') : 'N/A'}
                  </td>
                  <td className={`px-3 py-2 font-mono ${isAnomalous ? 'text-red-600 font-bold' : ''}`}>
                    {activity.actualDurationS ? activity.actualDurationS.toFixed(2) : 'N/A'}
                  </td>
                  <td className="px-3 py-2 font-mono text-gray-600">
                    {activity.plannedDurationS ? activity.plannedDurationS.toFixed(0) : 'N/A'}
                  </td>
                  <td className="px-3 py-2">
                    <Badge 
                      variant={activity.status === 'success' ? 'default' : 'destructive'}
                      className="text-xs"
                    >
                      {activity.status}
                    </Badge>
                    {isAnomalous && (
                      <Badge variant="destructive" className="ml-1 text-xs">
                        ANOMALY
                      </Badge>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

interface DetailedAnomalyViewProps {
  anomalies: AnomalyAlert[];
  isLoading: boolean;
}

interface AnomalyDetailRow {
  caseId: string;
  activity: string;
  timestamp: Date;
  processingTime: number;
  plannedTime: number;
  status: 'success' | 'failure';
  deviation: number;
  severity: 'high' | 'medium' | 'low';
  currentTask?: string;
}

export default function DetailedAnomalyView({ anomalies, isLoading }: DetailedAnomalyViewProps) {
  const [expandedCases, setExpandedCases] = useState<Set<string>>(new Set());

  const getStatusIcon = (status: string) => {
    return status === 'success' ? (
      <CheckCircle className="h-4 w-4 text-green-500" />
    ) : (
      <XCircle className="h-4 w-4 text-red-500" />
    );
  };

  const getSeverityBadge = (severity: 'high' | 'medium' | 'low') => {
    const variants = {
      high: 'destructive',
      medium: 'secondary', 
      low: 'outline'
    } as const;
    return <Badge variant={variants[severity]}>{severity.toUpperCase()}</Badge>;
  };

  const toggleCaseExpansion = (caseId: string) => {
    const newExpanded = new Set(expandedCases);
    if (newExpanded.has(caseId)) {
      newExpanded.delete(caseId);
    } else {
      newExpanded.add(caseId);
    }
    setExpandedCases(newExpanded);
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-orange-500" />
            Detailed Anomaly Analysis
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-16 bg-gray-100 rounded animate-pulse" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!anomalies || anomalies.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-orange-500" />
            Detailed Anomaly Analysis
            <Badge variant="outline" className="ml-auto">
              0 anomalies detected
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12">
            <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Anomalies Detected</h3>
            <p className="text-gray-500 mb-4">
              All manufacturing activities are operating within expected parameters
            </p>
            <div className="grid grid-cols-3 gap-4 max-w-md mx-auto">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">✓</div>
                <div className="text-sm text-gray-600">Processing Times</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">✓</div>
                <div className="text-sm text-gray-600">Equipment Status</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">✓</div>
                <div className="text-sm text-gray-600">Workflow Flow</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Convert anomalies to detailed rows with processing time calculations
  const anomalyRows: AnomalyDetailRow[] = anomalies.map(anomaly => {
    // Parse anomaly details to extract timing information
    const detailsMatch = anomaly.details.match(/Processing time ([\d.]+)s vs planned ([\d.]+)s \(deviation: ([+-]?[\d.]+)s\)/);
    const processingTime = detailsMatch ? parseFloat(detailsMatch[1]) : 0;
    const plannedTime = detailsMatch ? parseFloat(detailsMatch[2]) : 0;
    const deviation = detailsMatch ? parseFloat(detailsMatch[3]) : 0;
    
    // Extract current_task from anomaly details if available
    const currentTaskMatch = anomaly.details.match(/Current task: ([^,\n]+)/);
    const currentTask = currentTaskMatch ? currentTaskMatch[1] : undefined;
    
    // Extract the full activity name from the description
    const activityNameMatch = anomaly.description?.match(/^(.+?) operation exceeded expected time$/);
    const fullActivityName = activityNameMatch ? activityNameMatch[1] : null;
    
    return {
      caseId: anomaly.caseId || 'Unknown',
      activity: fullActivityName || anomaly.equipment || 'Unknown Activity',
      timestamp: anomaly.timestamp,
      processingTime,
      plannedTime,
      status: deviation > 0 ? 'failure' : 'success',
      deviation: Math.abs(deviation),
      severity: anomaly.severity,
      currentTask
    };
  });

  // Calculate summary statistics
  const highSeverityCount = anomalyRows.filter(row => row.severity === 'high').length;
  const mediumSeverityCount = anomalyRows.filter(row => row.severity === 'medium').length;
  const lowSeverityCount = anomalyRows.filter(row => row.severity === 'low').length;
  const avgDeviation = anomalyRows.length > 0 ? 
    (anomalyRows.reduce((sum, row) => sum + row.deviation, 0) / anomalyRows.length) : 0;

  // Group by activity type for pattern analysis
  const activityPatterns = anomalyRows.reduce((acc, row) => {
    if (!acc[row.activity]) {
      acc[row.activity] = [];
    }
    acc[row.activity].push(row);
    return acc;
  }, {} as Record<string, AnomalyDetailRow[]>);

  // Find most problematic activities
  const problematicActivities = Object.entries(activityPatterns)
    .map(([activity, rows]) => ({
      activity,
      count: rows.length,
      avgDeviation: rows.reduce((sum, row) => sum + row.deviation, 0) / rows.length,
      severity: rows.filter(row => row.severity === 'high').length > 0 ? 'high' as const : 
                rows.filter(row => row.severity === 'medium').length > 0 ? 'medium' as const : 'low' as const
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  return (
    <div className="space-y-6">
      {/* Summary Statistics */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-orange-500" />
            Anomaly Summary
            <Badge variant="outline" className="ml-auto">
              {anomalies.length} total anomalies
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-4 gap-4">
            <div className="text-center p-4 bg-red-50 rounded-lg border border-red-200">
              <div className="text-2xl font-bold text-red-600">{highSeverityCount}</div>
              <div className="text-sm text-red-700">High Severity</div>
            </div>
            <div className="text-center p-4 bg-yellow-50 rounded-lg border border-yellow-200">
              <div className="text-2xl font-bold text-yellow-600">{mediumSeverityCount}</div>
              <div className="text-sm text-yellow-700">Medium Severity</div>
            </div>
            <div className="text-center p-4 bg-blue-50 rounded-lg border border-blue-200">
              <div className="text-2xl font-bold text-blue-600">{lowSeverityCount}</div>
              <div className="text-sm text-blue-700">Low Severity</div>
            </div>
            <div className="text-center p-4 bg-gray-50 rounded-lg border border-gray-200">
              <div className="text-2xl font-bold text-gray-600">{avgDeviation.toFixed(1)}s</div>
              <div className="text-sm text-gray-700">Avg Deviation</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Most Problematic Activities */}
      {problematicActivities.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-orange-500" />
              Most Problematic Activities
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {problematicActivities.map((activity, index) => (
                <div key={activity.activity} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-6 h-6 bg-orange-500 text-white rounded-full flex items-center justify-center text-sm font-bold">
                      {index + 1}
                    </div>
                    <div>
                      <div className="font-medium text-gray-900 truncate max-w-[300px]" title={activity.activity}>
                        {activity.activity}
                      </div>
                      <div className="text-sm text-gray-500">
                        {activity.count} anomalies • Avg deviation: {activity.avgDeviation.toFixed(1)}s
                      </div>
                    </div>
                  </div>
                  {getSeverityBadge(activity.severity)}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Detailed Anomaly Records */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-orange-500" />
            Individual Anomaly Records
          </CardTitle>
          <div className="flex items-center gap-2 mt-2">
            <div className="text-sm text-gray-600">
              Total: {anomalyRows.length} anomalies
            </div>
            <div className="flex items-center gap-1">
              <Clock className="h-4 w-4 text-gray-500" />
              Avg deviation: {avgDeviation.toFixed(1)}s
            </div>
            <div className="flex items-center gap-1">
              <AlertTriangle className="h-4 w-4 text-red-500" />
              High severity: {highSeverityCount}
            </div>
            <Button variant="outline" size="sm" className="ml-auto">
              Export Details
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {anomalyRows.map((row, index) => (
              <div key={index} className="border rounded-lg p-4 hover:bg-gray-50">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      {getStatusIcon(row.status)}
                      <span className="font-medium text-gray-900">{row.activity}</span>
                      {getSeverityBadge(row.severity)}
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-gray-500">Case ID:</span>
                        <span className="ml-2 font-mono">{row.caseId}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">Timestamp:</span>
                        <span className="ml-2">{format(row.timestamp, 'MMM dd, HH:mm:ss')}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">Processing Time:</span>
                        <span className="ml-2 font-mono">{row.processingTime.toFixed(1)}s</span>
                      </div>
                      <div>
                        <span className="text-gray-500">Planned Time:</span>
                        <span className="ml-2 font-mono">{row.plannedTime.toFixed(1)}s</span>
                      </div>
                      {row.currentTask && (
                        <div className="col-span-2 bg-blue-50 p-2 rounded border-l-2 border-blue-400">
                          <span className="text-blue-800 font-semibold">Current Task:</span>
                          <span className="ml-2 text-blue-900 font-medium">{row.currentTask}</span>
                        </div>
                      )}
                    </div>
                    
                    {/* Expandable Case Details Table */}
                    <div className="mt-3 border-t pt-3">
                      <Collapsible open={expandedCases.has(row.caseId)} onOpenChange={() => toggleCaseExpansion(row.caseId)}>
                        <CollapsibleTrigger asChild>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="flex items-center gap-2"
                          >
                            {expandedCases.has(row.caseId) ? (
                              <ChevronDown className="h-4 w-4" />
                            ) : (
                              <ChevronRight className="h-4 w-4" />
                            )}
                            <Table className="h-4 w-4" />
                            View Case Activities
                          </Button>
                        </CollapsibleTrigger>
                        <CollapsibleContent className="mt-3">
                          <CaseActivitiesTable 
                            caseId={row.caseId} 
                            anomalousActivity={row.activity}
                          />
                        </CollapsibleContent>
                      </Collapsible>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-gray-500">Deviation</div>
                    <div className="text-lg font-bold text-red-600">
                      +{row.deviation.toFixed(1)}s
                    </div>
                    <div className="text-xs text-gray-500">
                      {((row.deviation / row.plannedTime) * 100).toFixed(1)}% over
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Analysis Insights */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-blue-500" />
            Analysis Insights
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
              <h4 className="font-medium text-blue-900 mb-2">Detection Method</h4>
              <p className="text-sm text-blue-800">
                Anomalies detected using activity-specific IQR (Interquartile Range) analysis. 
                Each activity type has individual thresholds based on its historical performance data.
              </p>
            </div>
            
            <div className="p-4 bg-orange-50 rounded-lg border border-orange-200">
              <h4 className="font-medium text-orange-900 mb-2">Key Findings</h4>
              <ul className="text-sm text-orange-800 space-y-1">
                <li>• {problematicActivities.length > 0 ? 
                  `"${problematicActivities[0].activity}" shows the most anomalies (${problematicActivities[0].count} occurrences)` : 
                  'No specific activity patterns identified'}</li>
                <li>• {highSeverityCount > 0 ? 
                  `${highSeverityCount} high-severity anomalies require immediate attention` : 
                  'No high-severity anomalies detected'}</li>
                <li>• Average processing time deviation: {avgDeviation.toFixed(1)} seconds</li>
              </ul>
            </div>

            {highSeverityCount > 0 && (
              <div className="p-4 bg-red-50 rounded-lg border border-red-200">
                <h4 className="font-medium text-red-900 mb-2">Recommended Actions</h4>
                <ul className="text-sm text-red-800 space-y-1">
                  <li>• Investigate high-severity anomalies immediately</li>
                  <li>• Review equipment maintenance schedules for problematic activities</li>
                  <li>• Consider adjusting planned processing times based on actual performance</li>
                  <li>• Monitor trending patterns for early anomaly detection</li>
                </ul>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}