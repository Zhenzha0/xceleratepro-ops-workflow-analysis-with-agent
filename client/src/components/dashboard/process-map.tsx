import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Expand, Download, Search } from "lucide-react";

interface ProcessActivity {
  id: string;
  activity: string;
  startTime: string;
  completeTime: string;
  actualDurationS: number;
  orgResource: string;
  status: string;
}

export default function ProcessMap({ filteredData }: { filteredData?: any }) {
  const [selectedCaseId, setSelectedCaseId] = useState<string>("");
  const [caseActivities, setCaseActivities] = useState<ProcessActivity[]>([]);
  const [availableCases, setAvailableCases] = useState<string[]>([]);

  useEffect(() => {
    if (filteredData?.activities) {
      // Get unique case IDs from filtered data
      const cases = Array.from(new Set(filteredData.activities.map((a: any) => a.caseId))) as string[];
      setAvailableCases(cases);
      
      // Set first case as default if none selected
      if (cases.length > 0 && !selectedCaseId) {
        setSelectedCaseId(cases[0]);
      }
    }
  }, [filteredData]);

  useEffect(() => {
    if (selectedCaseId && filteredData?.activities) {
      // Get activities for selected case
      const activities = filteredData.activities
        .filter((a: any) => a.caseId === selectedCaseId)
        .sort((a: any, b: any) => new Date(a.startTime || a.scheduledTime).getTime() - new Date(b.startTime || b.scheduledTime).getTime());
      
      setCaseActivities(activities);
    }
  }, [selectedCaseId, filteredData]);

  const buildFlowConnections = (activities: ProcessActivity[]) => {
    const connections = [];
    for (let i = 1; i < activities.length; i++) {
      const prevActivity = activities[i - 1];
      const currentActivity = activities[i];
      
      if (prevActivity.completeTime && currentActivity.startTime) {
        const prevEndTime = new Date(prevActivity.completeTime).getTime();
        const currentStartTime = new Date(currentActivity.startTime).getTime();
        const timeDiff = (currentStartTime - prevEndTime) / 1000; // seconds
        
        // Activities are connected if time difference is small (within 60 seconds)
        if (timeDiff >= -5 && timeDiff <= 60) {
          connections.push({
            from: prevActivity.activity,
            to: currentActivity.activity,
            timeDiff: timeDiff
          });
        }
      }
    }
    return connections;
  };

  const connections = buildFlowConnections(caseActivities);
  
  const renderProcessFlow = () => {
    if (caseActivities.length === 0) {
      return (
        <div className="flex items-center justify-center h-64 text-gray-500">
          Select a case ID to view its process flow
        </div>
      );
    }

    return (
      <div className="h-96 bg-gray-50 rounded-lg border p-6 overflow-auto">
        <div className="text-center mb-6">
          <h3 className="text-lg font-semibold">Process Flow Map for Case: {selectedCaseId}</h3>
          <p className="text-sm text-gray-600">{caseActivities.length} activities</p>
        </div>
        
        <div className="relative">
          <svg width="100%" height="300" viewBox="0 0 1200 300">
            {/* Render activities as nodes */}
            {caseActivities.map((activity, index) => {
              const x = 100 + (index * 150);
              const y = 150;
              const isAnomaly = activity.status === 'failed' || activity.actualDurationS > 120;
              
              return (
                <g key={activity.id}>
                  {/* Activity node */}
                  <circle
                    cx={x}
                    cy={y}
                    r="25"
                    fill={isAnomaly ? "#ef4444" : activity.status === 'success' ? "#10b981" : "#f59e0b"}
                    stroke="#ffffff"
                    strokeWidth="3"
                  />
                  
                  {/* Activity label */}
                  <text
                    x={x}
                    y={y - 35}
                    textAnchor="middle"
                    fontSize="11"
                    fontWeight="500"
                    fill="#374151"
                  >
                    {activity.activity.split('/').pop()}
                  </text>
                  
                  {/* Duration */}
                  <text
                    x={x}
                    y={y + 45}
                    textAnchor="middle"
                    fontSize="10"
                    fill="#6b7280"
                  >
                    {Math.round(activity.actualDurationS)}s
                  </text>
                  
                  {/* Resource */}
                  <text
                    x={x}
                    y={y + 60}
                    textAnchor="middle"
                    fontSize="9"
                    fill="#9ca3af"
                  >
                    {activity.orgResource}
                  </text>
                  
                  {/* Connection to next activity */}
                  {index < caseActivities.length - 1 && (
                    <line
                      x1={x + 25}
                      y1={y}
                      x2={x + 125}
                      y2={y}
                      stroke="#6b7280"
                      strokeWidth="2"
                      markerEnd="url(#arrowhead)"
                    />
                  )}
                </g>
              );
            })}
            
            {/* Arrow marker definition */}
            <defs>
              <marker
                id="arrowhead"
                markerWidth="10"
                markerHeight="7"
                refX="9"
                refY="3.5"
                orient="auto"
              >
                <polygon
                  points="0 0, 10 3.5, 0 7"
                  fill="#6b7280"
                />
              </marker>
            </defs>
          </svg>
        </div>
        
        {/* Legend */}
        <div className="mt-4 flex justify-center space-x-6 text-xs">
          <div className="flex items-center">
            <div className="w-3 h-3 bg-green-500 rounded-full mr-2"></div>
            <span>Normal Activity</span>
          </div>
          <div className="flex items-center">
            <div className="w-3 h-3 bg-yellow-500 rounded-full mr-2"></div>
            <span>In Progress</span>
          </div>
          <div className="flex items-center">
            <div className="w-3 h-3 bg-red-500 rounded-full mr-2"></div>
            <span>Anomaly/Failed</span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Case-Specific Process Flow</CardTitle>
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
        {/* Case Selection */}
        <div className="mb-6 flex items-center space-x-4">
          <div className="flex-1">
            <Label htmlFor="caseId">Enter Case ID:</Label>
            <div className="flex space-x-2 mt-1">
              <Input
                id="caseId"
                type="text"
                placeholder="e.g., WF_101_0"
                value={selectedCaseId}
                onChange={(e) => setSelectedCaseId(e.target.value)}
                className="flex-1"
              />
              <Button variant="outline" size="sm">
                <Search size={16} className="mr-1" />
                Search
              </Button>
            </div>
          </div>
          <div className="text-sm text-gray-600">
            Available cases: {availableCases.length}
          </div>
        </div>

        {/* Process Flow Visualization */}
        {renderProcessFlow()}
      </CardContent>
    </Card>
  );
}
