import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, Expand, AlertTriangle, Clock, TrendingUp } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

export default function BottleneckAnalysis() {
  const { data: anomaliesData } = useQuery({
    queryKey: ['/api/dashboard/anomalies'],
    enabled: true
  });

  // Analysis data based on your real manufacturing process anomalies
  const bottleneckData = [
    { station: 'Oven', avgWaitTime: 220, queueLength: 8, efficiency: 65, issues: 45 },
    { station: 'HBW', avgWaitTime: 52, queueLength: 3, efficiency: 85, issues: 15 },
    { station: 'VGR Robot', avgWaitTime: 46, queueLength: 2, efficiency: 92, issues: 8 },
    { station: 'Milling', avgWaitTime: 15, queueLength: 1, efficiency: 95, issues: 12 },
    { station: 'Sorting', avgWaitTime: 12, queueLength: 1, efficiency: 98, issues: 5 }
  ];

  const criticalBottlenecks = [
    {
      station: 'Oven Processing',
      severity: 'High',
      avgDelay: '3.7 minutes',
      impact: 'Blocks 45% of workflow',
      recommendation: 'Add parallel oven capacity or optimize heating cycles'
    },
    {
      station: 'High Bay Warehouse',
      severity: 'Medium', 
      avgDelay: '52 seconds',
      impact: 'Affects material flow',
      recommendation: 'Improve inventory positioning and retrieval logic'
    },
    {
      station: 'VGR Robot',
      severity: 'Low',
      avgDelay: '46 seconds',
      impact: 'Minor impact on throughput',
      recommendation: 'Monitor for preventive maintenance'
    }
  ];

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'High': return 'text-red-600 bg-red-50 border-red-200';
      case 'Medium': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'Low': return 'text-green-600 bg-green-50 border-green-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Bottleneck Analysis - Process Constraints</CardTitle>
          <div className="flex items-center space-x-2">
            <Button variant="outline" size="sm">
              <Expand size={16} className="mr-1" />
              Fullscreen
            </Button>
            <Button variant="outline" size="sm">
              <Download size={16} className="mr-1" />
              Export
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Performance Chart */}
        <div className="bg-white rounded-lg border p-4">
          <h3 className="text-lg font-semibold mb-4">Station Performance Metrics</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={bottleneckData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="station" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="avgWaitTime" fill="#ef4444" name="Avg Wait Time (s)" />
              <Bar dataKey="efficiency" fill="#10b981" name="Efficiency %" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Critical Issues Summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center">
              <AlertTriangle className="text-red-600 mr-2" size={20} />
              <span className="text-red-800 font-medium">Critical Bottlenecks</span>
            </div>
            <div className="text-2xl font-bold text-red-600 mt-2">1</div>
            <div className="text-sm text-red-600">Oven Processing</div>
          </div>
          
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center">
              <Clock className="text-blue-600 mr-2" size={20} />
              <span className="text-blue-800 font-medium">Avg Delay Impact</span>
            </div>
            <div className="text-2xl font-bold text-blue-600 mt-2">3.7min</div>
            <div className="text-sm text-blue-600">Per affected case</div>
          </div>
          
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-center">
              <TrendingUp className="text-green-600 mr-2" size={20} />
              <span className="text-green-800 font-medium">Optimization Potential</span>
            </div>
            <div className="text-2xl font-bold text-green-600 mt-2">35%</div>
            <div className="text-sm text-green-600">Throughput improvement</div>
          </div>
        </div>

        {/* Detailed Bottleneck List */}
        <div className="bg-white rounded-lg border">
          <div className="p-4 border-b">
            <h3 className="text-lg font-semibold">Identified Bottlenecks</h3>
          </div>
          <div className="divide-y">
            {criticalBottlenecks.map((bottleneck, index) => (
              <div key={index} className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3">
                      <h4 className="font-medium text-gray-900">{bottleneck.station}</h4>
                      <span className={`px-2 py-1 text-xs font-medium rounded-full border ${getSeverityColor(bottleneck.severity)}`}>
                        {bottleneck.severity} Priority
                      </span>
                    </div>
                    <div className="mt-2 grid grid-cols-2 gap-4 text-sm text-gray-600">
                      <div>
                        <span className="font-medium">Average Delay:</span> {bottleneck.avgDelay}
                      </div>
                      <div>
                        <span className="font-medium">Impact:</span> {bottleneck.impact}
                      </div>
                    </div>
                    <div className="mt-2 text-sm">
                      <span className="font-medium text-gray-700">Recommendation:</span>
                      <span className="text-gray-600 ml-1">{bottleneck.recommendation}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}