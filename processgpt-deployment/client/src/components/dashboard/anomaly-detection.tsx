import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Settings, ArrowRight, Search, Clock, AlertTriangle, Activity } from "lucide-react";
import { AnomalyAlert } from "@shared/schema";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { useState } from "react";

interface AnomalyDetectionProps {
  anomalies?: AnomalyAlert[];
  isLoading: boolean;
}

export default function AnomalyDetection({ anomalies, isLoading }: AnomalyDetectionProps) {
  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high': return 'bg-error';
      case 'medium': return 'bg-warning';
      case 'low': return 'bg-blue-500';
      default: return 'bg-gray-400';
    }
  };

  const getSeverityBgColor = (severity: string) => {
    switch (severity) {
      case 'high': return 'bg-red-50 border-red-200';
      case 'medium': return 'bg-orange-50 border-orange-200';
      case 'low': return 'bg-blue-50 border-blue-200';
      default: return 'bg-gray-50 border-gray-200';
    }
  };

  if (isLoading) {
    return (
      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Historical Anomaly Analysis</CardTitle>
            <div className="flex items-center space-x-2">
              <Badge variant="secondary">IQR Method</Badge>
              <Button variant="ghost" size="sm">
                <Settings size={16} className="mr-1" />
                Configure
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-20 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="mb-6">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Historical Anomaly Analysis</CardTitle>
          <div className="flex items-center space-x-2">
            <Badge variant="secondary">IQR Method</Badge>
            <Button variant="ghost" size="sm">
              <Settings size={16} className="mr-1" />
              Configure
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {anomalies && anomalies.length > 0 ? (
            anomalies.map((anomaly) => (
              <div
                key={anomaly.id}
                className={`flex items-center justify-between p-4 rounded-lg border ${getSeverityBgColor(anomaly.severity)}`}
              >
                <div className="flex items-center space-x-3">
                  <div className={`w-3 h-3 ${getSeverityColor(anomaly.severity)} rounded-full ${anomaly.severity === 'high' ? 'animate-pulse' : ''}`}></div>
                  <div>
                    <p className="font-medium text-gray-900">{anomaly.title}</p>
                    <p className="text-sm text-gray-600">{anomaly.description}</p>
                    <p className="text-xs text-gray-500">{anomaly.details}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-xs text-gray-500">
                    {anomaly.timestamp ? new Date(anomaly.timestamp).toLocaleDateString() + ' ' + new Date(anomaly.timestamp).toLocaleTimeString() : 'Unknown'}
                  </span>
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button variant="link" size="sm" className="text-primary hover:text-primary/80">
                        <Search size={14} className="mr-1" />
                        Investigate
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl" aria-describedby="anomaly-description">
                      <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                          <AlertTriangle className="h-5 w-5 text-orange-500" />
                          Anomaly Investigation: {anomaly.title}
                        </DialogTitle>
                      </DialogHeader>
                      <div className="space-y-6">
                        {/* Anomaly Summary */}
                        <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
                          <div>
                            <label className="text-sm font-medium text-gray-600">Case ID</label>
                            <p className="text-sm font-mono">{anomaly.caseId || 'N/A'}</p>
                          </div>
                          <div>
                            <label className="text-sm font-medium text-gray-600">Equipment/Station</label>
                            <p className="text-sm">{anomaly.equipment || 'N/A'}</p>
                          </div>
                          <div>
                            <label className="text-sm font-medium text-gray-600">Severity</label>
                            <Badge variant={anomaly.severity === 'high' ? 'destructive' : anomaly.severity === 'medium' ? 'secondary' : 'outline'}>
                              {anomaly.severity?.toUpperCase()}
                            </Badge>
                          </div>
                          <div>
                            <label className="text-sm font-medium text-gray-600">Detection Time</label>
                            <p className="text-sm">{format(new Date(anomaly.timestamp), 'PPpp')}</p>
                          </div>
                        </div>

                        {/* Processing Time Analysis */}
                        <div className="space-y-3">
                          <h4 className="font-medium flex items-center gap-2">
                            <Clock className="h-4 w-4" />
                            Processing Time Analysis
                          </h4>
                          <div className="p-4 border rounded-lg">
                            <p className="text-sm text-gray-700 mb-3">{anomaly.description}</p>
                            <div className="grid grid-cols-3 gap-4 text-sm">
                              {anomaly.details.includes('Processing time') && (
                                <>
                                  <div>
                                    <label className="text-xs text-gray-500">Actual Time</label>
                                    <p className="font-mono">{anomaly.details.match(/Processing time ([\d.]+)s/)?.[1] || 'N/A'}s</p>
                                  </div>
                                  <div>
                                    <label className="text-xs text-gray-500">Planned Time</label>
                                    <p className="font-mono">{anomaly.details.match(/planned ([\d.]+)s/)?.[1] || 'N/A'}s</p>
                                  </div>
                                  <div>
                                    <label className="text-xs text-gray-500">Deviation</label>
                                    <p className="font-mono text-red-600">{anomaly.details.match(/deviation: ([+-]?[\d.]+)s/)?.[1] || 'N/A'}s</p>
                                  </div>
                                </>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Why This is an Anomaly */}
                        <div className="space-y-3">
                          <h4 className="font-medium flex items-center gap-2">
                            <Activity className="h-4 w-4" />
                            Why This is an Anomaly
                          </h4>
                          <div className="p-4 border rounded-lg bg-orange-50">
                            <p className="text-sm text-gray-700">{anomaly.details}</p>
                            <div className="mt-3 text-xs text-gray-600">
                              <p><strong>Detection Method:</strong> IQR (Interquartile Range) statistical analysis</p>
                              <p><strong>Threshold:</strong> Activities outside 1.5 × IQR from Q1/Q3 quartiles</p>
                              <p><strong>Comparison:</strong> Against similar activities of the same type</p>
                            </div>
                          </div>
                        </div>

                        {/* Recommendations */}
                        <div className="space-y-3">
                          <h4 className="font-medium">Recommended Actions</h4>
                          <div className="p-4 border rounded-lg bg-blue-50">
                            <ul className="text-sm space-y-1 list-disc list-inside text-gray-700">
                              <li>Review equipment performance for station: {anomaly.equipment}</li>
                              <li>Check if maintenance is required</li>
                              <li>Analyze operator performance and training needs</li>
                              <li>Verify if process parameters were within specification</li>
                              <li>Consider adjusting planned time estimates if pattern persists</li>
                            </ul>
                          </div>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-8 text-gray-500">
              <p>No anomalies detected at this time.</p>
              <p className="text-sm mt-2">System is monitoring processes for unusual patterns.</p>
            </div>
          )}
        </div>
        
        {anomalies && anomalies.length > 0 && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <Button variant="link" className="text-primary hover:text-primary/80">
              View All Anomalies ({anomalies.length})
              <ArrowRight size={16} className="ml-1" />
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
