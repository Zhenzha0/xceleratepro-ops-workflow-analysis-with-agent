import { Clock, AlertTriangle, Hourglass, CheckCircle, TrendingDown, TrendingUp, Minus } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { DashboardMetrics } from "@shared/schema";

interface KeyMetricsProps {
  metrics?: DashboardMetrics;
  isLoading: boolean;
}

export default function KeyMetrics({ metrics, isLoading }: KeyMetricsProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
        {[...Array(4)].map((_, i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <Skeleton className="h-20 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const metricCards = [
    {
      title: "Avg Processing Time",
      value: `${(metrics?.avgProcessingTime || 0).toFixed(2)}s`,
      icon: Clock,
      iconBg: "bg-blue-100",
      iconColor: "text-primary"
    },
    {
      title: "Anomalies Detected",
      value: metrics?.anomaliesDetected || 0,
      icon: AlertTriangle,
      iconBg: "bg-orange-100",
      iconColor: "text-accent"
    },
    {
      title: "Bottlenecks Found",
      value: metrics?.bottlenecksFound || 0,
      icon: Hourglass,
      iconBg: "bg-red-100",
      iconColor: "text-error"
    },
    {
      title: "Success Rate",
      value: `${(metrics?.successRate || 0).toFixed(2)}%`,
      icon: CheckCircle,
      iconBg: "bg-green-100",
      iconColor: "text-success"
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
      {metricCards.map((metric, index) => {
        const Icon = metric.icon;
        const TrendIcon = metric.trendIcon;
        
        return (
          <Card key={index}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">{metric.title}</p>
                  <p className="text-2xl font-bold text-gray-900">{metric.value}</p>
                </div>
                <div className={`w-12 h-12 ${metric.iconBg} rounded-lg flex items-center justify-center`}>
                  <Icon className={`${metric.iconColor}`} size={20} />
                </div>
              </div>

            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
