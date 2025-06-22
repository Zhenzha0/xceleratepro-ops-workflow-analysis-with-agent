import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Clock, CheckCircle, XCircle } from "lucide-react";
import { AnomalyAlert } from "@shared/schema";
import { format } from "date-fns";

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
}

export default function DetailedAnomalyView({ anomalies, isLoading }: DetailedAnomalyViewProps) {
  // Convert anomalies to detailed rows with processing time calculations
  const anomalyRows: AnomalyDetailRow[] = anomalies.map(anomaly => {
    // Parse anomaly details to extract timing information
    const detailsMatch = anomaly.details.match(/Processing time ([\d.]+)s vs planned ([\d.]+)s \(deviation: ([+-]?[\d.]+)s\)/);
    const processingTime = detailsMatch ? parseFloat(detailsMatch[1]) : 0;
    const plannedTime = detailsMatch ? parseFloat(detailsMatch[2]) : 0;
    const deviation = detailsMatch ? parseFloat(detailsMatch[3]) : 0;
    
    return {
      caseId: anomaly.caseId || 'Unknown',
      activity: anomaly.equipment || 'Unknown Activity',
      timestamp: anomaly.timestamp,
      processingTime,
      plannedTime,
      status: deviation > 0 ? 'failure' : 'success',
      deviation: Math.abs(deviation),
      severity: anomaly.severity
    };
  });

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

    return (
      <Badge variant={variants[severity]} className="text-xs">
        {severity.toUpperCase()}
      </Badge>
    );
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
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-orange-500" />
          Detailed Anomaly Analysis
          <Badge variant="outline" className="ml-auto">
            {anomalyRows.length} anomalies detected
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {anomalyRows.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            No anomalies detected in the current data scope
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b bg-gray-50">
                  <th className="text-left p-3 font-medium text-sm">Case ID</th>
                  <th className="text-left p-3 font-medium text-sm">Activity</th>
                  <th className="text-left p-3 font-medium text-sm">Timestamp</th>
                  <th className="text-right p-3 font-medium text-sm">Processing Time (s)</th>
                  <th className="text-right p-3 font-medium text-sm">Planned (s)</th>
                  <th className="text-center p-3 font-medium text-sm">Status</th>
                  <th className="text-center p-3 font-medium text-sm">Severity</th>
                </tr>
              </thead>
              <tbody>
                {anomalyRows.map((row, index) => (
                  <tr key={index} className="border-b hover:bg-gray-50">
                    <td className="p-3 text-sm font-mono">{row.caseId}</td>
                    <td className="p-3 text-sm">{row.activity}</td>
                    <td className="p-3 text-sm">
                      {format(row.timestamp, 'M/d/yyyy, h:mm:ss a')}
                    </td>
                    <td className="p-3 text-sm text-right font-mono">
                      {row.processingTime.toFixed(2)}
                    </td>
                    <td className="p-3 text-sm text-right font-mono">
                      {row.plannedTime.toFixed(0)}
                    </td>
                    <td className="p-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        {getStatusIcon(row.status)}
                        <span className="text-xs capitalize">{row.status}</span>
                      </div>
                    </td>
                    <td className="p-3 text-center">
                      {getSeverityBadge(row.severity)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        
        {anomalyRows.length > 0 && (
          <div className="mt-4 flex items-center justify-between text-sm text-gray-600">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1">
                <Clock className="h-4 w-4" />
                Avg deviation: {(anomalyRows.reduce((sum, row) => sum + row.deviation, 0) / anomalyRows.length).toFixed(1)}s
              </div>
              <div className="flex items-center gap-1">
                <AlertTriangle className="h-4 w-4 text-red-500" />
                High severity: {anomalyRows.filter(row => row.severity === 'high').length}
              </div>
            </div>
            <Button variant="outline" size="sm">
              Export Details
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}