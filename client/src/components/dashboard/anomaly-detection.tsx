import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Settings, ArrowRight } from "lucide-react";
import { AnomalyAlert } from "@shared/schema";
import { Skeleton } from "@/components/ui/skeleton";

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
            <CardTitle>Real-time Anomaly Detection</CardTitle>
            <div className="flex items-center space-x-2">
              <Badge variant="destructive">Live</Badge>
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
          <CardTitle>Real-time Anomaly Detection</CardTitle>
          <div className="flex items-center space-x-2">
            <Badge variant="destructive">Live</Badge>
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
                    {anomaly.timestamp ? new Date(anomaly.timestamp).toLocaleTimeString() : 'Just now'}
                  </span>
                  <Button variant="link" size="sm" className="text-primary hover:text-primary/80">
                    Investigate
                  </Button>
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
