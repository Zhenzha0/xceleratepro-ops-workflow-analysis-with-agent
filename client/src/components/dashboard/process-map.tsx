import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Expand, Download, Search, ZoomIn, ZoomOut } from "lucide-react";

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
  const [zoomLevel, setZoomLevel] = useState<number>(1);

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
      // Get activities for selected case and deduplicate (each activity should only be counted once)
      const activities = filteredData.activities
        .filter((a: any) => a.caseId === selectedCaseId);
      
      // Deduplicate activities - group by activity name, startTime, and resource
      const uniqueActivities = new Map();
      activities.forEach((activity: any) => {
        const key = `${activity.activity}_${activity.startTime}_${activity.orgResource}`;
        if (!uniqueActivities.has(key)) {
          uniqueActivities.set(key, activity);
        }
      });
      
      const deduplicatedActivities = Array.from(uniqueActivities.values())
        .sort((a: any, b: any) => new Date(a.startTime || a.scheduledTime).getTime() - new Date(b.startTime || b.scheduledTime).getTime());
      
      setCaseActivities(deduplicatedActivities);
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
        
        // Activities are connected only if timing indicates they are truly linked
        // Allow small negative (up to -5 seconds) or positive gaps (up to 30 seconds)
        // Large negative differences indicate they are NOT linked
        if (timeDiff >= -5 && timeDiff <= 30) {
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
    
    // Calculate optimal spacing to center the content
    const maxNodesPerRow = 4;
    const nodeSpacing = 220;
    const rowHeight = 180;
    const totalRows = Math.ceil(uniqueActivities.length / maxNodesPerRow);
    
    // Calculate the total width needed and center it
    const maxRowWidth = maxNodesPerRow * nodeSpacing;
    const startX = (1400 - maxRowWidth) / 2 + nodeSpacing / 2; // Center within viewBox
    
    uniqueActivities.forEach((item, index) => {
      const row = Math.floor(index / maxNodesPerRow);
      const col = index % maxNodesPerRow;
      
      // Center nodes in each row
      const nodesInThisRow = Math.min(maxNodesPerRow, uniqueActivities.length - row * maxNodesPerRow);
      const rowStartX = startX + (maxNodesPerRow - nodesInThisRow) * nodeSpacing / 2;
      
      positions[item.activity.activity] = {
        x: rowStartX + (col * nodeSpacing),
        y: 100 + (row * rowHeight)
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
    
    // Find first and last activities by time for START/END positioning
    const firstActivity = caseActivities.reduce((earliest, current) => 
      new Date(current.startTime) < new Date(earliest.startTime) ? current : earliest
    );
    const lastActivity = caseActivities.reduce((latest, current) => 
      new Date(current.completeTime || current.startTime) > new Date(latest.completeTime || latest.startTime) ? current : latest
    );
    
    const firstActivityPos = nodePositions[firstActivity.activity];
    const lastActivityPos = nodePositions[lastActivity.activity];

    const totalRows = Math.ceil(uniqueActivities.length / 4);
    const viewBoxWidth = 1400; // Fixed width for better centering
    const viewBoxHeight = Math.max(400, totalRows * 180 + 200);

    return (
      <div className="space-y-6">
        {/* Process Map Container */}
        <div className="bg-gray-50 rounded-lg border p-6">
          <div className="flex justify-between items-center mb-6">
            <div className="text-center flex-1">
              <h3 className="text-lg font-semibold">Process Flow Map for Case: {selectedCaseId}</h3>
              <p className="text-sm text-gray-600">{uniqueActivities.length} unique activities ({caseActivities.length} total)</p>
            </div>
            
            {/* Zoom Controls */}
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setZoomLevel(Math.min(2, zoomLevel + 0.2))}
                disabled={zoomLevel >= 2}
              >
                <ZoomIn className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setZoomLevel(Math.max(0.5, zoomLevel - 0.2))}
                disabled={zoomLevel <= 0.5}
              >
                <ZoomOut className="h-4 w-4" />
              </Button>
              <span className="text-sm text-gray-600 px-2 py-1">
                {Math.round(zoomLevel * 100)}%
              </span>
            </div>
          </div>
          
          <div className="relative overflow-auto h-[600px] border rounded bg-white">
            <div 
              className="w-full h-full flex justify-center items-start pt-8"
              style={{ 
                transform: `scale(${zoomLevel})`,
                transformOrigin: 'center top',
                minWidth: `${100 / zoomLevel}%`,
                minHeight: `${100 / zoomLevel}%`
              }}
            >
              <svg 
                width="100%"
                height="580" 
                viewBox={`0 0 ${viewBoxWidth} ${viewBoxHeight}`}
                preserveAspectRatio="xMidYMid meet"
                style={{ 
                  maxWidth: '1400px',
                  display: 'block'
                }}
              >
            {/* Render flow connections with better routing */}
            {uniqueConnections.map((connection, index) => {
              const fromPos = nodePositions[connection.from];
              const toPos = nodePositions[connection.to];
              
              if (!fromPos || !toPos) return null;
              
              const isDirectFlow = connection.timeDiff <= 5;
              const isLoop = fromPos.x > toPos.x;
              const strokeColor = isLoop ? "#ef4444" : (isDirectFlow ? "#10b981" : "#f59e0b");
              const strokeWidth = 2;
              
              // Calculate connection points to avoid overlapping with nodes
              const dx = toPos.x - fromPos.x;
              const dy = toPos.y - fromPos.y;
              const distance = Math.sqrt(dx * dx + dy * dy);
              const nodeRadius = 35;
              
              const fromX = fromPos.x + (dx / distance) * nodeRadius;
              const fromY = fromPos.y + (dy / distance) * nodeRadius;
              const toX = toPos.x - (dx / distance) * nodeRadius;
              const toY = toPos.y - (dy / distance) * nodeRadius;
              
              return (
                <g key={`connection-${index}`}>
                  {isLoop ? (
                    // Curved path for loops to avoid overlaps
                    <path
                      d={`M ${fromX} ${fromY} Q ${(fromX + toX) / 2} ${Math.min(fromY, toY) - 60} ${toX} ${toY}`}
                      stroke={strokeColor}
                      strokeWidth={strokeWidth}
                      fill="none"
                      markerEnd="url(#arrowhead)"
                      opacity="0.8"
                    />
                  ) : (
                    // Smooth curved path for better visual flow
                    <path
                      d={`M ${fromX} ${fromY} Q ${(fromX + toX) / 2} ${(fromY + toY) / 2} ${toX} ${toY}`}
                      stroke={strokeColor}
                      strokeWidth={strokeWidth}
                      fill="none"
                      markerEnd="url(#arrowhead)"
                      opacity="0.8"
                    />
                  )}
                  
                  {/* Connection timing label positioned better */}
                  <text
                    x={(fromX + toX) / 2}
                    y={(fromY + toY) / 2 - (isLoop ? 30 : 15)}
                    textAnchor="middle"
                    fontSize="8"
                    fill="#6b7280"
                    fontWeight="500"
                  >
                    {Math.round(connection.timeDiff)}s
                  </text>
                </g>
              );
            })}
            
            {/* START node - positioned next to first activity */}
            {firstActivityPos && (
              <g>
                <rect
                  x={firstActivityPos.x - 120}
                  y={firstActivityPos.y - 15}
                  width="70"
                  height="30"
                  rx="15"
                  fill="#10b981"
                  stroke="#ffffff"
                  strokeWidth="2"
                />
                <text
                  x={firstActivityPos.x - 85}
                  y={firstActivityPos.y + 5}
                  textAnchor="middle"
                  fontSize="12"
                  fill="white"
                  fontWeight="bold"
                >
                  START
                </text>
                {/* Connection from START to first activity */}
                <line
                  x1={firstActivityPos.x - 50}
                  y1={firstActivityPos.y}
                  x2={firstActivityPos.x - 35}
                  y2={firstActivityPos.y}
                  stroke="#10b981"
                  strokeWidth="3"
                  markerEnd="url(#arrowhead)"
                />
              </g>
            )}
            
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
              
              // Extract activity parts for better display
              const activityParts = activity.activity.split('/');
              const prefix = activityParts[1] || activityParts[0]; // Get the station part (hbw, vgr, etc.)
              const action = activityParts.slice(2).join('_') || activityParts.slice(1).join('_'); // Get the action part
              
              return (
                <g key={activity.activity}>
                  {/* Activity node - larger circle */}
                  <circle
                    cx={pos.x}
                    cy={pos.y}
                    r="35"
                    fill={nodeColor}
                    stroke="#ffffff"
                    strokeWidth="3"
                  />
                  
                  {/* Station prefix inside circle */}
                  <text
                    x={pos.x}
                    y={pos.y - 5}
                    textAnchor="middle"
                    fontSize="12"
                    fill="white"
                    fontWeight="bold"
                  >
                    {prefix}
                  </text>
                  
                  {/* Action name below in circle */}
                  <text
                    x={pos.x}
                    y={pos.y + 8}
                    textAnchor="middle"
                    fontSize="9"
                    fill="white"
                    fontWeight="500"
                  >
                    {action?.substring(0, 12)}
                  </text>
                  
                  {/* Full activity name above node */}
                  <text
                    x={pos.x}
                    y={pos.y - 50}
                    textAnchor="middle"
                    fontSize="11"
                    fontWeight="500"
                    fill="#374151"
                  >
                    {activity.activity.substring(1)} {/* Remove leading slash */}
                  </text>
                  
                  {/* Duration below */}
                  <text
                    x={pos.x}
                    y={pos.y + 55}
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
                      y={pos.y + 70}
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
                    y={pos.y + (item.occurrences > 1 ? 85 : 70)}
                    textAnchor="middle"
                    fontSize="9"
                    fill="#9ca3af"
                  >
                    {activity.orgResource}
                  </text>
                </g>
              );
            })}
            
            {/* END node - positioned next to last activity */}
            {lastActivityPos && (
              <g>
                <rect
                  x={lastActivityPos.x + 50}
                  y={lastActivityPos.y - 15}
                  width="60"
                  height="30"
                  rx="15"
                  fill="#ef4444"
                  stroke="#ffffff"
                  strokeWidth="2"
                />
                <text
                  x={lastActivityPos.x + 80}
                  y={lastActivityPos.y + 5}
                  textAnchor="middle"
                  fontSize="12"
                  fill="white"
                  fontWeight="bold"
                >
                  END
                </text>
                {/* Connection from last activity to END */}
                <line
                  x1={lastActivityPos.x + 35}
                  y1={lastActivityPos.y}
                  x2={lastActivityPos.x + 50}
                  y2={lastActivityPos.y}
                  stroke="#ef4444"
                  strokeWidth="3"
                  markerEnd="url(#arrowhead)"
                />
              </g>
            )}
            
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
        
        {/* Process Summary Analysis Table */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">📊 Process Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 lg:grid-cols-6 gap-4 mb-6">
              <div className="bg-blue-50 p-3 rounded-lg">
                <div className="text-sm font-medium text-blue-700">Total Activities</div>
                <div className="text-lg font-bold text-blue-900">{caseActivities.length}</div>
              </div>
              <div className="bg-green-50 p-3 rounded-lg">
                <div className="text-sm font-medium text-green-700">Processing Time</div>
                <div className="text-lg font-bold text-green-900">
                  {Math.round(caseActivities.reduce((sum, a) => sum + a.actualDurationS, 0))}s
                </div>
              </div>
              <div className="bg-purple-50 p-3 rounded-lg">
                <div className="text-sm font-medium text-purple-700">Lead Time</div>
                <div className="text-lg font-bold text-purple-900">
                  {caseActivities.length > 0 ? Math.round(
                    (new Date(caseActivities[caseActivities.length - 1]?.completeTime).getTime() - 
                     new Date(caseActivities[0]?.startTime).getTime()) / 1000
                  ) : 0}s
                </div>
              </div>
              <div className="bg-red-50 p-3 rounded-lg">
                <div className="text-sm font-medium text-red-700">Anomalous Activities</div>
                <div className="text-lg font-bold text-red-900">
                  {caseActivities.filter(a => a.status === 'failed' || a.actualDurationS > 120).length}
                </div>
              </div>
              <div className="bg-orange-50 p-3 rounded-lg">
                <div className="text-sm font-medium text-orange-700">Loops Detected</div>
                <div className="text-lg font-bold text-orange-900">
                  {uniqueActivities.filter(a => a.occurrences > 1).length}
                </div>
              </div>
              <div className="bg-gray-50 p-3 rounded-lg">
                <div className="text-sm font-medium text-gray-700">Valid Transitions</div>
                <div className="text-lg font-bold text-gray-900">{uniqueConnections.length}</div>
              </div>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="bg-green-50 p-3 rounded-lg">
                <div className="text-sm font-medium text-green-700 mb-1">Start</div>
                <div className="text-sm text-green-900">
                  {firstActivity ? `${firstActivity.activity.substring(1)} (${new Date(firstActivity.startTime).toLocaleTimeString()})` : 'N/A'}
                </div>
              </div>
              <div className="bg-red-50 p-3 rounded-lg">
                <div className="text-sm font-medium text-red-700 mb-1">End</div>
                <div className="text-sm text-red-900">
                  {lastActivity ? `${lastActivity.activity.substring(1)} (${new Date(lastActivity.completeTime || lastActivity.startTime).toLocaleTimeString()})` : 'N/A'}
                </div>
              </div>
            </div>
            
            <div className="mt-4">
              <div className="text-sm font-medium text-gray-700 mb-2">Activities in Process Flow:</div>
              <div className="flex flex-wrap gap-2">
                {uniqueActivities.map((item, index) => (
                  <span
                    key={index}
                    className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full"
                  >
                    {item.activity.activity.substring(1)}
                  </span>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
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
