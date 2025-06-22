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
  
  const buildUniqueActivityFlow = (activities: ProcessActivity[]) => {
    // Create unique activities and their flow sequence
    const uniqueActivities: {[key: string]: {
      activity: ProcessActivity;
      occurrences: number;
      firstOccurrence: number;
    }} = {};
    
    activities.forEach((activity, index) => {
      const activityName = activity.activity;
      if (!uniqueActivities[activityName]) {
        uniqueActivities[activityName] = {
          activity: activity,
          occurrences: 1,
          firstOccurrence: index
        };
      } else {
        uniqueActivities[activityName].occurrences++;
      }
    });
    
    // Sort by first occurrence to maintain flow order
    const sortedActivities = Object.values(uniqueActivities)
      .sort((a, b) => a.firstOccurrence - b.firstOccurrence);
    
    return sortedActivities;
  };

  const calculateNodePositions = (uniqueActivities: any[]) => {
    const positions: { [key: string]: { x: number; y: number } } = {};
    
    // Left-to-right flow layout
    const startX = 120;
    const endX = 1000;
    const availableWidth = endX - startX;
    const stepX = availableWidth / Math.max(uniqueActivities.length - 1, 1);
    
    // Calculate layers for better vertical distribution
    const layers = Math.ceil(uniqueActivities.length / 8); // Max 8 activities per row
    const layerHeight = 120;
    
    uniqueActivities.forEach((item, index) => {
      const layer = Math.floor(index / 8);
      const posInLayer = index % 8;
      const activitiesInThisLayer = Math.min(8, uniqueActivities.length - layer * 8);
      
      // Center activities in each layer
      const layerStartX = startX + (8 - activitiesInThisLayer) * stepX / 2;
      
      positions[item.activity.activity] = {
        x: layerStartX + (posInLayer * stepX),
        y: 100 + (layer * layerHeight)
      };
    });
    
    return positions;
  };

  const renderProcessFlow = () => {
    if (caseActivities.length === 0) {
      return (
        <div className="flex items-center justify-center h-64 text-gray-500">
          Select a case ID to view its process flow
        </div>
      );
    }

    const uniqueActivities = buildUniqueActivityFlow(caseActivities);
    const nodePositions = calculateNodePositions(uniqueActivities);
    
    // Build connections between unique activities
    const uniqueConnections = [];
    for (let i = 1; i < caseActivities.length; i++) {
      const prevActivity = caseActivities[i - 1];
      const currentActivity = caseActivities[i];
      
      if (prevActivity.completeTime && currentActivity.startTime) {
        const prevEndTime = new Date(prevActivity.completeTime).getTime();
        const currentStartTime = new Date(currentActivity.startTime).getTime();
        const timeDiff = (currentStartTime - prevEndTime) / 1000;
        
        // Only show connections between different activities
        if (prevActivity.activity !== currentActivity.activity && timeDiff >= -5 && timeDiff <= 300) {
          uniqueConnections.push({
            from: prevActivity.activity,
            to: currentActivity.activity,
            timeDiff: timeDiff
          });
        }
      }
    }
    
    const viewBoxWidth = 1200;
    const viewBoxHeight = Math.max(300, Math.ceil(uniqueActivities.length / 8) * 120 + 200);

    return (
      <div className="h-96 bg-gray-50 rounded-lg border p-6 overflow-auto">
        <div className="text-center mb-6">
          <h3 className="text-lg font-semibold">Process Flow Map for Case: {selectedCaseId}</h3>
          <p className="text-sm text-gray-600">{uniqueActivities.length} unique activities ({caseActivities.length} total)</p>
        </div>
        
        <div className="relative">
          <svg width="100%" height="350" viewBox={`0 0 ${viewBoxWidth} ${viewBoxHeight}`}>
            {/* Render flow connections */}
            {uniqueConnections.map((connection, index) => {
              const fromPos = nodePositions[connection.from];
              const toPos = nodePositions[connection.to];
              
              if (!fromPos || !toPos) return null;
              
              const isDirectFlow = connection.timeDiff <= 5;
              const isLoop = fromPos.x > toPos.x; // Backward flow indicates loop
              const strokeColor = isLoop ? "#ef4444" : (isDirectFlow ? "#10b981" : "#f59e0b");
              const strokeWidth = isDirectFlow ? 3 : 2;
              
              return (
                <g key={`connection-${index}`}>
                  {isLoop ? (
                    // Curved line for loops
                    <path
                      d={`M ${fromPos.x} ${fromPos.y} Q ${(fromPos.x + toPos.x) / 2} ${fromPos.y - 50} ${toPos.x} ${toPos.y}`}
                      stroke={strokeColor}
                      strokeWidth={strokeWidth}
                      fill="none"
                      markerEnd="url(#arrowhead)"
                      opacity="0.7"
                    />
                  ) : (
                    // Straight line for forward flow
                    <line
                      x1={fromPos.x + 25}
                      y1={fromPos.y}
                      x2={toPos.x - 25}
                      y2={toPos.y}
                      stroke={strokeColor}
                      strokeWidth={strokeWidth}
                      markerEnd="url(#arrowhead)"
                      opacity="0.7"
                    />
                  )}
                  
                  {/* Connection timing label */}
                  <text
                    x={(fromPos.x + toPos.x) / 2}
                    y={(fromPos.y + toPos.y) / 2 - (isLoop ? 25 : 10)}
                    textAnchor="middle"
                    fontSize="9"
                    fill="#6b7280"
                    fontWeight="500"
                  >
                    {connection.timeDiff > 0 ? `+${Math.round(connection.timeDiff)}s` : `${Math.round(connection.timeDiff)}s`}
                  </text>
                </g>
              );
            })}
            
            {/* START node */}
            <g>
              <rect
                x="20"
                y={viewBoxHeight / 2 - 15}
                width="60"
                height="30"
                rx="15"
                fill="#10b981"
                stroke="#ffffff"
                strokeWidth="2"
              />
              <text
                x="50"
                y={viewBoxHeight / 2 + 5}
                textAnchor="middle"
                fontSize="12"
                fill="white"
                fontWeight="bold"
              >
                START
              </text>
            </g>
            
            {/* Render unique activity nodes */}
            {uniqueActivities.map((item, index) => {
              const pos = nodePositions[item.activity.activity];
              if (!pos) return null;
              
              const activity = item.activity;
              const isAnomaly = activity.status === 'failed' || activity.actualDurationS > 120;
              const hasLoop = item.occurrences > 1;
              
              let nodeColor = "#10b981"; // Normal activity (green)
              if (isAnomaly) nodeColor = "#ef4444"; // Anomaly (red)
              else if (hasLoop) nodeColor = "#8b5cf6"; // Loop activity (purple)
              
              return (
                <g key={activity.activity}>
                  {/* Activity node */}
                  <circle
                    cx={pos.x}
                    cy={pos.y}
                    r="30"
                    fill={nodeColor}
                    stroke="#ffffff"
                    strokeWidth="3"
                  />
                  
                  {/* Activity short name inside circle */}
                  <text
                    x={pos.x}
                    y={pos.y + 3}
                    textAnchor="middle"
                    fontSize="10"
                    fill="white"
                    fontWeight="bold"
                  >
                    {activity.activity.split('/').pop()?.substring(0, 8)}
                  </text>
                  
                  {/* Activity full name above */}
                  <text
                    x={pos.x}
                    y={pos.y - 40}
                    textAnchor="middle"
                    fontSize="11"
                    fontWeight="500"
                    fill="#374151"
                  >
                    {activity.activity.split('/').pop()}
                  </text>
                  
                  {/* Duration and occurrences below */}
                  <text
                    x={pos.x}
                    y={pos.y + 50}
                    textAnchor="middle"
                    fontSize="10"
                    fill="#6b7280"
                    fontWeight="500"
                  >
                    {Math.round(activity.actualDurationS)}s
                  </text>
                  
                  {/* Show loop count if > 1 */}
                  {item.occurrences > 1 && (
                    <text
                      x={pos.x}
                      y={pos.y + 65}
                      textAnchor="middle"
                      fontSize="9"
                      fill="#8b5cf6"
                      fontWeight="bold"
                    >
                      ×{item.occurrences}
                    </text>
                  )}
                  
                  {/* Resource */}
                  <text
                    x={pos.x}
                    y={pos.y + (item.occurrences > 1 ? 80 : 65)}
                    textAnchor="middle"
                    fontSize="9"
                    fill="#9ca3af"
                  >
                    {activity.orgResource}
                  </text>
                </g>
              );
            })}
            
            {/* END node */}
            <g>
              <rect
                x={viewBoxWidth - 80}
                y={viewBoxHeight / 2 - 15}
                width="60"
                height="30"
                rx="15"
                fill="#ef4444"
                stroke="#ffffff"
                strokeWidth="2"
              />
              <text
                x={viewBoxWidth - 50}
                y={viewBoxHeight / 2 + 5}
                textAnchor="middle"
                fontSize="12"
                fill="white"
                fontWeight="bold"
              >
                END
              </text>
            </g>
            
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
            <div className="w-3 h-3 bg-purple-500 rounded-full mr-2"></div>
            <span>Repeated Activity</span>
          </div>
          <div className="flex items-center">
            <div className="w-3 h-3 bg-red-500 rounded-full mr-2"></div>
            <span>Anomaly/Loop</span>
          </div>
          <div className="flex items-center">
            <div className="w-2 h-1 bg-green-500 mr-2"></div>
            <span>Forward Flow</span>
          </div>
          <div className="flex items-center">
            <div className="w-2 h-1 bg-red-500 mr-2"></div>
            <span>Loop/Backward Flow</span>
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
