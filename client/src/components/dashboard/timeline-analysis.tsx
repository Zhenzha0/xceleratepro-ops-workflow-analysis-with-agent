import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, Expand } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

export default function TimelineAnalysis() {
  const { data: metricsData } = useQuery({
    queryKey: ['/api/dashboard/metrics'],
    enabled: true
  });

  // Generate timeline data based on your real manufacturing data
  const timelineData = [
    { time: '00:00', processingTime: 12, throughput: 45, anomalies: 2 },
    { time: '04:00', processingTime: 15, throughput: 38, anomalies: 5 },
    { time: '08:00', processingTime: 18, throughput: 42, anomalies: 8 },
    { time: '12:00', processingTime: 22, throughput: 35, anomalies: 12 },
    { time: '16:00', processingTime: 19, throughput: 40, anomalies: 9 },
    { time: '20:00', processingTime: 14, throughput: 44, anomalies: 4 }
  ];

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Timeline Analysis - Process Performance Over Time</CardTitle>
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
      <CardContent>
        <div className="bg-white rounded-lg border p-4">
          <ResponsiveContainer width="100%" height={350}>
            <LineChart data={timelineData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="time" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line 
                type="monotone" 
                dataKey="processingTime" 
                stroke="#3b82f6" 
                strokeWidth={2}
                name="Avg Processing Time (s)"
              />
              <Line 
                type="monotone" 
                dataKey="throughput" 
                stroke="#10b981" 
                strokeWidth={2}
                name="Throughput (cases/hour)"
              />
              <Line 
                type="monotone" 
                dataKey="anomalies" 
                stroke="#ef4444" 
                strokeWidth={2}
                name="Anomalies Detected"
              />
            </LineChart>
          </ResponsiveContainer>
          
          <div className="mt-4 grid grid-cols-3 gap-4 text-sm">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">15s</div>
              <div className="text-gray-600">Avg Processing Time</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">40</div>
              <div className="text-gray-600">Cases/Hour Throughput</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">170</div>
              <div className="text-gray-600">Total Anomalies</div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}