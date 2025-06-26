import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Search, Download } from "lucide-react";

interface ProcessActivity {
  id: string;
  activity: string;
  startTime: string;
  completeTime: string;
  actualDurationS: number;
  orgResource: string;
  status: string;
  caseId: string;
}

interface FlowConnection {
  from: string;
  to: string;
  count: number;
  timeDiff: number;
}

export default function SankeyDiagram({ filteredData }: { filteredData?: any }) {
  const [selectedCaseId, setSelectedCaseId] = useState<string>("");
  const [caseActivities, setCaseActivities] = useState<ProcessActivity[]>([]);
  const [availableCases, setAvailableCases] = useState<string[]>([]);
  const [flowConnections, setFlowConnections] = useState<FlowConnection[]>([]);

  useEffect(() => {
    if (filteredData?.activities) {
      const cases = Array.from(new Set(filteredData.activities.map((a: any) => a.caseId))) as string[];
      setAvailableCases(cases);
      
      if (cases.length > 0 && !selectedCaseId) {
        setSelectedCaseId(cases[0]);
      }
    }
  }, [filteredData]);

  useEffect(() => {
    if (selectedCaseId && filteredData?.activities) {
      const activities = filteredData.activities
        .filter((a: any) => a.caseId === selectedCaseId)
        .sort((a: any, b: any) => new Date(a.startTime || a.scheduledTime).getTime() - new Date(b.startTime || b.scheduledTime).getTime());
      
      setCaseActivities(activities);
      
      // Build flow connections
      const connections: FlowConnection[] = [];
      for (let i = 1; i < activities.length; i++) {
        const prevActivity = activities[i - 1];
        const currentActivity = activities[i];
        
        if (prevActivity.completeTime && currentActivity.startTime) {
          const prevEndTime = new Date(prevActivity.completeTime).getTime();
          const currentStartTime = new Date(currentActivity.startTime).getTime();
          const timeDiff = (currentStartTime - prevEndTime) / 1000;
          
          // Activities are connected if time difference is reasonable
          if (timeDiff >= -5 && timeDiff <= 300) {
            connections.push({
              from: prevActivity.activity,
              to: currentActivity.activity,
              count: 1,
              timeDiff: timeDiff
            });
          }
        }
      }
      setFlowConnections(connections);
    }
  }, [selectedCaseId, filteredData]);

  const getActivityPosition = (activity: string, index: number) => {
    const totalActivities = caseActivities.length;
    const width = 800;
    const padding = 60;
    const availableWidth = width - (2 * padding);
    
    return {
      x: padding + (index * (availableWidth / Math.max(totalActivities - 1, 1))),
      y: 100 + (Math.sin(index * 0.5) * 30) // Slight vertical variation
    };
  };

  const renderSankeyFlow = () => {
    if (caseActivities.length === 0) {
      return (
        <div className="flex items-center justify-center h-64 text-gray-500">
          Select a case ID to view its process flow
        </div>
      );
    }

    const uniqueActivities = Array.from(new Set(caseActivities.map(a => a.activity)));
    
    return (
      <div className="h-96 bg-gray-50 rounded-lg border p-6 overflow-auto">
        <div className="text-center mb-6">
          <h3 className="text-lg font-semibold">Case-Specific Process Flow</h3>
          <p className="text-sm text-gray-600">Case: {selectedCaseId} ({caseActivities.length} activities)</p>
        </div>
        
        <div className="relative">
          <svg width="100%" height="250" viewBox="0 0 800 250">
            {/* Render flow paths */}
            {flowConnections.map((connection, index) => {
              const fromIndex = caseActivities.findIndex(a => a.activity === connection.from);
              const toIndex = caseActivities.findIndex(a => a.activity === connection.to);
              
              if (fromIndex === -1 || toIndex === -1) return null;
              
              const fromPos = getActivityPosition(connection.from, fromIndex);
              const toPos = getActivityPosition(connection.to, toIndex);
              
              const strokeWidth = Math.max(2, Math.min(12, 8));
              const color = connection.timeDiff <= 5 ? "#10b981" : connection.timeDiff <= 30 ? "#f59e0b" : "#ef4444";
              
              return (
                <g key={`flow-${index}`}>
                  {/* Flow path */}
                  <path
                    d={`M ${fromPos.x + 25} ${fromPos.y} Q ${(fromPos.x + toPos.x) / 2} ${(fromPos.y + toPos.y) / 2 - 20} ${toPos.x - 25} ${toPos.y}`}
                    stroke={color}
                    strokeWidth={strokeWidth}
                    fill="none"
                    opacity="0.7"
                  />
                  
                  {/* Flow timing label */}
                  <text
                    x={(fromPos.x + toPos.x) / 2}
                    y={(fromPos.y + toPos.y) / 2 - 25}
                    textAnchor="middle"
                    fontSize="10"
                    fill="#6b7280"
                    fontWeight="500"
                  >
                    {connection.timeDiff > 0 ? `+${Math.round(connection.timeDiff)}s` : `${Math.round(connection.timeDiff)}s`}
                  </text>
                </g>
              );
            })}
            
            {/* Render activity nodes */}
            {caseActivities.map((activity, index) => {
              const pos = getActivityPosition(activity.activity, index);
              const isAnomaly = activity.status === 'failed' || activity.actualDurationS > 120;
              const nodeColor = isAnomaly ? "#ef4444" : activity.status === 'success' ? "#10b981" : "#f59e0b";
              
              return (
                <g key={activity.id}>
                  {/* Activity node */}
                  <rect
                    x={pos.x - 25}
                    y={pos.y - 15}
                    width="50"
                    height="30"
                    rx="6"
                    fill={nodeColor}
                    stroke="#ffffff"
                    strokeWidth="2"
                  />
                  
                  {/* Activity label */}
                  <text
                    x={pos.x}
                    y={pos.y - 25}
                    textAnchor="middle"
                    fontSize="10"
                    fontWeight="500"
                    fill="#374151"
                  >
                    {activity.activity.split('/').pop()}
                  </text>
                  
                  {/* Duration */}
                  <text
                    x={pos.x}
                    y={pos.y + 5}
                    textAnchor="middle"
                    fontSize="9"
                    fill="white"
                    fontWeight="500"
                  >
                    {Math.round(activity.actualDurationS)}s
                  </text>
                  
                  {/* Resource */}
                  <text
                    x={pos.x}
                    y={pos.y + 35}
                    textAnchor="middle"
                    fontSize="9"
                    fill="#9ca3af"
                  >
                    {activity.orgResource}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>
        
        {/* Flow Legend */}
        <div className="mt-4 flex justify-center space-x-6 text-xs">
          <div className="flex items-center">
            <div className="w-4 h-1 bg-green-500 mr-2"></div>
            <span>Immediate Flow (≤5s)</span>
          </div>
          <div className="flex items-center">
            <div className="w-4 h-1 bg-yellow-500 mr-2"></div>
            <span>Short Wait (≤30s)</span>
          </div>
          <div className="flex items-center">
            <div className="w-4 h-1 bg-red-500 mr-2"></div>
            <span>Long Wait (&gt;30s)</span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Case-Specific Sankey Diagram</CardTitle>
          <div className="flex items-center space-x-2">
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
            <Label htmlFor="sankeyCase">Enter Case ID:</Label>
            <div className="flex space-x-2 mt-1">
              <Input
                id="sankeyCase"
                type="text"
                placeholder="e.g., WF_101_0"
                value={selectedCaseId}
                onChange={(e) => setSelectedCaseId(e.target.value)}
                className="flex-1"
              />
              <Button variant="outline" size="sm">
                <Search size={16} className="mr-1" />
                Show Case Sankey
              </Button>
            </div>
          </div>
          <div className="text-sm text-gray-600">
            Available: {availableCases.length} cases
          </div>
        </div>

        {/* Sankey Visualization */}
        {renderSankeyFlow()}
        
        {/* Process Statistics for Selected Case */}
        {caseActivities.length > 0 && (
          <div className="mt-6 grid grid-cols-4 gap-4 text-sm">
            <div className="text-center p-3 bg-blue-50 rounded">
              <div className="font-semibold text-gray-700">Total Activities</div>
              <div className="text-xl font-bold text-blue-600">{caseActivities.length}</div>
            </div>
            <div className="text-center p-3 bg-green-50 rounded">
              <div className="font-semibold text-gray-700">Total Duration</div>
              <div className="text-xl font-bold text-green-600">
                {Math.round(caseActivities.reduce((sum, a) => sum + a.actualDurationS, 0))}s
              </div>
            </div>
            <div className="text-center p-3 bg-yellow-50 rounded">
              <div className="font-semibold text-gray-700">Flow Connections</div>
              <div className="text-xl font-bold text-yellow-600">{flowConnections.length}</div>
            </div>
            <div className="text-center p-3 bg-red-50 rounded">
              <div className="font-semibold text-gray-700">Anomalies</div>
              <div className="text-xl font-bold text-red-600">
                {caseActivities.filter(a => a.status === 'failed' || a.actualDurationS > 120).length}
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}