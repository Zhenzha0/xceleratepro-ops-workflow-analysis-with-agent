import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Search, Download, ZoomIn, ZoomOut } from "lucide-react";
import * as d3 from "d3";
import * as d3Sankey from "d3-sankey";

interface ProcessActivity {
  id: string;
  activity: string;
  startTime: string;
  completeTime: string;
  actualDurationS: number;
  orgResource: string;
  status: string;
  caseId?: string;
  caseConceptName?: string;
  case?: string;
}

interface SankeyNode {
  id: string;
  name: string;
  category: string;
  x0?: number;
  x1?: number;
  y0?: number;
  y1?: number;
  value?: number;
  sourceLinks?: SankeyLink[];
  targetLinks?: SankeyLink[];
  activities: ProcessActivity[];
  avgDuration: number;
  totalOccurrences: number;
}

interface SankeyLink {
  source: number | SankeyNode;
  target: number | SankeyNode;
  value: number;
  width?: number;
  y0?: number;
  y1?: number;
  avgTransitionTime: number;
  occurrences: number;
  activities: ProcessActivity[];
}

interface CaseSpecificSankeyProps {
  activities: ProcessActivity[];
}

export default function CaseSpecificSankey({ activities }: CaseSpecificSankeyProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [selectedCaseId, setSelectedCaseId] = useState<string>("");
  const [caseActivities, setCaseActivities] = useState<ProcessActivity[]>([]);
  const [availableCases, setAvailableCases] = useState<string[]>([]);
  const [tooltip, setTooltip] = useState<{ x: number; y: number; content: string } | null>(null);
  const [selectedNode, setSelectedNode] = useState<SankeyNode | null>(null);
  const [selectedLink, setSelectedLink] = useState<SankeyLink | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [zoomLevel, setZoomLevel] = useState(1);

  // Get available cases from activities
  useEffect(() => {
    if (activities && activities.length > 0) {
      const cases = Array.from(new Set(
        activities
          .map(a => a.caseId || a.caseConceptName || a.case)
          .filter(Boolean)
      )) as string[];
      
      setAvailableCases(cases);
      
      if (cases.length > 0 && !selectedCaseId) {
        setSelectedCaseId(cases[0]);
      }
    }
  }, [activities]);

  // Get activities for selected case
  useEffect(() => {
    if (selectedCaseId && activities) {
      const filteredActivities = activities
        .filter(a => 
          a.caseId === selectedCaseId || 
          a.caseConceptName === selectedCaseId || 
          a.case === selectedCaseId
        )
        .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
      
      setCaseActivities(filteredActivities);
    } else {
      setCaseActivities([]);
    }
  }, [selectedCaseId, activities]);

  const buildCaseSankeyData = (caseActivities: ProcessActivity[]) => {
    if (!caseActivities || caseActivities.length === 0) return { nodes: [], links: [] };

    try {
      // Sort activities by start time
      const sortedActivities = [...caseActivities].sort((a, b) => 
        new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
      );

      // Build flow connections based on timing (same as process map)
      const connections = [];
      for (let i = 1; i < sortedActivities.length; i++) {
        const prevActivity = sortedActivities[i - 1];
        const currentActivity = sortedActivities[i];
        
        if (prevActivity.completeTime && currentActivity.startTime) {
          const prevEndTime = new Date(prevActivity.completeTime).getTime();
          const currentStartTime = new Date(currentActivity.startTime).getTime();
          const timeDiff = (currentStartTime - prevEndTime) / 1000; // seconds
          
          // Activities are connected if time difference is small (within 60 seconds)
          if (timeDiff >= -5 && timeDiff <= 60) {
            connections.push({
              from: prevActivity.activity,
              to: currentActivity.activity,
              timeDiff: timeDiff,
              fromActivity: prevActivity,
              toActivity: currentActivity
            });
          }
        }
      }

      // Create unique activity nodes
      const activityCounts = new Map<string, number>();
      const activityData = new Map<string, ProcessActivity[]>();
      
      sortedActivities.forEach(activity => {
        const count = activityCounts.get(activity.activity) || 0;
        activityCounts.set(activity.activity, count + 1);
        
        if (!activityData.has(activity.activity)) {
          activityData.set(activity.activity, []);
        }
        activityData.get(activity.activity)!.push(activity);
      });

      // Create nodes from unique activities
      const nodes: SankeyNode[] = [];
      const nodeMap = new Map<string, number>();
      
      Array.from(activityCounts.entries()).forEach(([activityName, count], index) => {
        const activities = activityData.get(activityName)!;
        const totalDuration = activities.reduce((sum, a) => sum + a.actualDurationS, 0);
        const avgDuration = totalDuration / activities.length;
        
        nodes.push({
          id: activityName,
          name: activityName.replace(/^\//, ''),
          category: activityName.split('/')[1] || 'unknown',
          activities: activities,
          avgDuration: avgDuration,
          totalOccurrences: count,
          value: count
        });
        
        nodeMap.set(activityName, index);
      });

      // Create links based on actual flow connections
      const linkMap = new Map<string, {
        sourceIndex: number;
        targetIndex: number;
        transitions: number[];
        activities: ProcessActivity[];
      }>();

      connections.forEach(connection => {
        const sourceIndex = nodeMap.get(connection.from);
        const targetIndex = nodeMap.get(connection.to);
        
        if (sourceIndex !== undefined && targetIndex !== undefined) {
          const linkKey = `${sourceIndex}-${targetIndex}`;
          
          if (!linkMap.has(linkKey)) {
            linkMap.set(linkKey, {
              sourceIndex,
              targetIndex,
              transitions: [],
              activities: []
            });
          }
          
          const linkData = linkMap.get(linkKey)!;
          linkData.transitions.push(Math.max(0, connection.timeDiff));
          linkData.activities.push(connection.fromActivity);
        }
      });

      // Convert to links array
      const links: SankeyLink[] = [];
      Array.from(linkMap.values()).forEach(linkData => {
        const avgTransitionTime = linkData.transitions.reduce((sum, t) => sum + t, 0) / linkData.transitions.length;
        
        links.push({
          source: linkData.sourceIndex,
          target: linkData.targetIndex,
          value: linkData.transitions.length,
          avgTransitionTime,
          occurrences: linkData.transitions.length,
          activities: linkData.activities
        });
      });

      return { nodes, links };
    } catch (error) {
      console.error('Error building case Sankey data:', error);
      return { nodes: [], links: [] };
    }
  };

  const renderSankey = () => {
    if (!svgRef.current || !caseActivities.length) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const width = 1000;
    const height = 500;
    const margin = { top: 40, right: 200, bottom: 40, left: 60 };

    const { nodes, links } = buildCaseSankeyData(caseActivities);
    if (!nodes.length) return;

    // Calculate proper Sankey layout with node heights based on flow
    const nodeWidth = 20;
    const minNodeHeight = 30;
    const maxNodeHeight = 80;
    const horizontalSpacing = 200;
    const verticalPadding = 10;
    
    // Calculate flow values for each node
    const nodeFlowIn = new Map<number, number>();
    const nodeFlowOut = new Map<number, number>();
    
    nodes.forEach((node, index) => {
      nodeFlowIn.set(index, 0);
      nodeFlowOut.set(index, 0);
    });
    
    // Calculate incoming and outgoing flows
    links.forEach(link => {
      const sourceIndex = typeof link.source === 'number' ? link.source : 0;
      const targetIndex = typeof link.target === 'number' ? link.target : 0;
      const flow = link.value;
      
      nodeFlowOut.set(sourceIndex, (nodeFlowOut.get(sourceIndex) || 0) + flow);
      nodeFlowIn.set(targetIndex, (nodeFlowIn.get(targetIndex) || 0) + flow);
    });
    
    // Calculate node heights based on max flow (in or out)
    const maxFlow = Math.max(...nodes.map((_, index) => 
      Math.max(nodeFlowIn.get(index) || 0, nodeFlowOut.get(index) || 0)
    ));
    
    // Group nodes by station type for horizontal positioning
    const stationGroups = new Map<string, number[]>();
    nodes.forEach((node, index) => {
      const category = node.category;
      if (!stationGroups.has(category)) {
        stationGroups.set(category, []);
      }
      stationGroups.get(category)!.push(index);
    });
    
    // Calculate layout
    const stationGroupArray = Array.from(stationGroups.entries());
    let layoutNodes = nodes.map((node, index) => {
      // Find which station group this node belongs to
      let groupIndex = 0;
      
      for (let i = 0; i < stationGroupArray.length; i++) {
        const [category, nodeIndices] = stationGroupArray[i];
        if (nodeIndices.includes(index)) {
          groupIndex = i;
          break;
        }
      }
      
      // Calculate node height based on flow
      const maxNodeFlow = Math.max(nodeFlowIn.get(index) || 0, nodeFlowOut.get(index) || 0);
      const heightRatio = maxFlow > 0 ? maxNodeFlow / maxFlow : 0;
      const nodeHeight = minNodeHeight + (maxNodeHeight - minNodeHeight) * heightRatio;
      
      const x = margin.left + groupIndex * horizontalSpacing;
      
      return {
        ...node,
        x0: x,
        x1: x + nodeWidth,
        y0: 0, // Will be calculated below
        y1: nodeHeight,
        nodeHeight,
        groupIndex,
        flowIn: nodeFlowIn.get(index) || 0,
        flowOut: nodeFlowOut.get(index) || 0
      };
    });
    
    // Position nodes vertically within each group to center them
    stationGroupArray.forEach(([category, nodeIndices], groupIndex) => {
      const groupNodes = nodeIndices.map(i => layoutNodes[i]);
      const totalHeight = groupNodes.reduce((sum, node) => sum + node.nodeHeight + verticalPadding, -verticalPadding);
      const availableHeight = height - margin.top - margin.bottom;
      const startY = margin.top + (availableHeight - totalHeight) / 2;
      
      let currentY = Math.max(margin.top, startY);
      groupNodes.forEach((node, i) => {
        const nodeIndex = nodeIndices[i];
        layoutNodes[nodeIndex] = {
          ...layoutNodes[nodeIndex],
          y0: currentY,
          y1: currentY + node.nodeHeight
        };
        currentY += node.nodeHeight + verticalPadding;
      });
    });

    const g = svg.append("g");

    // Color scale for different station categories
    const colorScale = d3.scaleOrdinal<string>()
      .domain(['hbw', 'vgr', 'ov', 'wt', 'pm', 'dm', 'mm', 'unknown'])
      .range(['#06b6d4', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444', '#6366f1', '#ec4899', '#6b7280']);

    // Calculate link positions for proper Sankey flow
    const calculateLinkPositions = () => {
      // Track vertical positions for each node's links
      const nodeSourceY = new Map<number, number>();
      const nodeTargetY = new Map<number, number>();
      
      layoutNodes.forEach((node, index) => {
        nodeSourceY.set(index, node.y0!);
        nodeTargetY.set(index, node.y0!);
      });
      
      return links.map(link => {
        const sourceIndex = typeof link.source === 'number' ? link.source : 0;
        const targetIndex = typeof link.target === 'number' ? link.target : 0;
        const sourceNode = layoutNodes[sourceIndex];
        const targetNode = layoutNodes[targetIndex];
        
        if (!sourceNode || !targetNode) return null;
        
        // Calculate link thickness based on flow value
        const linkHeight = Math.max(8, link.value * 15);
        
        // Get current positions and update for next link
        const sourceY = nodeSourceY.get(sourceIndex)!;
        const targetY = nodeTargetY.get(targetIndex)!;
        
        nodeSourceY.set(sourceIndex, sourceY + linkHeight + 2);
        nodeTargetY.set(targetIndex, targetY + linkHeight + 2);
        
        return {
          ...link,
          sourceIndex,
          targetIndex,
          x0: sourceNode.x1,
          y0: sourceY,
          x1: targetNode.x0,
          y1: targetY,
          linkHeight
        };
      }).filter(Boolean);
    };
    
    const linkPositions = calculateLinkPositions();

    // Draw links as filled paths (proper Sankey style)
    const link = g.append("g")
      .selectAll(".link")
      .data(linkPositions)
      .enter().append("path")
      .attr("class", "link")
      .attr("d", (d: any) => {
        if (!d) return "";
        
        const x0 = d.x0;
        const y0 = d.y0;
        const x1 = d.x1;
        const y1 = d.y1;
        const thickness = d.linkHeight;
        
        // Create proper Sankey curve that fills the thickness
        const curvature = 0.5;
        const xi = d3.interpolateNumber(x0, x1);
        const x2 = xi(curvature);
        const x3 = xi(1 - curvature);
        
        // Create the path for the filled area
        return `
          M${x0},${y0}
          C${x2},${y0} ${x3},${y1} ${x1},${y1}
          L${x1},${y1 + thickness}
          C${x3},${y1 + thickness} ${x2},${y0 + thickness} ${x0},${y0 + thickness}
          Z
        `;
      })
      .style("fill", "#94a3b8")
      .style("fill-opacity", 0.6)
      .style("stroke", "none")
      .on("mouseover", function(event: any, d: any) {
        d3.select(this).style("fill-opacity", 0.8);
        const sourceNode = layoutNodes[d.sourceIndex];
        const targetNode = layoutNodes[d.targetIndex];
        
        setTooltip({
          x: event.pageX,
          y: event.pageY,
          content: `${sourceNode?.name} → ${targetNode?.name}\nTransitions: ${d.occurrences}\nAvg Time: ${d.avgTransitionTime.toFixed(1)}s`
        });
      })
      .on("mouseout", function(event: any, d: any) {
        d3.select(this).style("fill-opacity", 0.6);
        setTooltip(null);
      })
      .on("click", function(event: any, d: any) {
        setSelectedLink(d);
        setSelectedNode(null);
      });

    // Draw nodes
    const node = g.append("g")
      .selectAll(".node")
      .data(layoutNodes)
      .enter().append("g")
      .attr("class", "node");

    node.append("rect")
      .attr("x", (d: any) => d.x0)
      .attr("y", (d: any) => d.y0)
      .attr("height", (d: any) => d.y1 - d.y0)
      .attr("width", (d: any) => d.x1 - d.x0)
      .style("fill", (d: any) => colorScale(d.category))
      .style("stroke", "#000")
      .style("stroke-width", 1)
      .on("mouseover", function(event: any, d: any) {
        d3.select(this).style("fill", d3.color(colorScale(d.category))!.darker(0.3).toString());
        setTooltip({
          x: event.pageX,
          y: event.pageY,
          content: `${d.name}\nOccurrences: ${d.totalOccurrences}\nAvg Duration: ${d.avgDuration.toFixed(1)}s\nCategory: ${d.category}`
        });
      })
      .on("mouseout", function(event: any, d: any) {
        d3.select(this).style("fill", colorScale(d.category));
        setTooltip(null);
      })
      .on("click", function(event: any, d: any) {
        setSelectedNode(d);
        setSelectedLink(null);
      });

    // Add labels to nodes (positioned to the right)
    node.append("text")
      .attr("x", (d: any) => d.x1 + 8)
      .attr("y", (d: any) => (d.y0 + d.y1) / 2)
      .attr("dy", "0.35em")
      .attr("text-anchor", "start")
      .style("font-size", "12px")
      .style("fill", "#374151")
      .style("font-weight", "600")
      .style("font-family", "system-ui, -apple-system, sans-serif")
      .text((d: any) => {
        const name = d.name.replace(/^\//, '');
        return name.length > 20 ? name.substring(0, 17) + "..." : name;
      });
    
    // Add smaller category labels below the main label
    node.append("text")
      .attr("x", (d: any) => d.x1 + 8)
      .attr("y", (d: any) => (d.y0 + d.y1) / 2 + 14)
      .attr("text-anchor", "start")
      .style("font-size", "10px")
      .style("fill", "#6b7280")
      .style("font-weight", "400")
      .text((d: any) => `${d.category} (${d.totalOccurrences}×)`);
  };

  useEffect(() => {
    renderSankey();
  }, [caseActivities]);

  const filteredCases = availableCases.filter(caseId =>
    caseId.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Case-Specific Process Flow</span>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setZoomLevel(Math.max(0.5, zoomLevel - 0.1))}
            >
              <ZoomOut className="h-4 w-4" />
            </Button>
            <span className="text-sm text-muted-foreground">
              {Math.round(zoomLevel * 100)}%
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setZoomLevel(Math.min(2, zoomLevel + 0.1))}
            >
              <ZoomIn className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm">
              <Download className="h-4 w-4" />
            </Button>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Case Selection */}
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <Label htmlFor="case-search">Search Cases</Label>
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  id="case-search"
                  placeholder="Search case IDs..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="case-select">Selected Case</Label>
              <select
                id="case-select"
                value={selectedCaseId}
                onChange={(e) => setSelectedCaseId(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
              >
                <option value="">Select a case...</option>
                {filteredCases.map((caseId) => (
                  <option key={caseId} value={caseId}>
                    {caseId}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Sankey Diagram */}
          <div className="relative">
            <svg
              ref={svgRef}
              width="100%"
              height="500"
              viewBox="0 0 1000 500"
              style={{ transform: `scale(${zoomLevel})` }}
              className="border rounded"
            />
            
            {/* Tooltip */}
            {tooltip && (
              <div
                className="absolute z-50 px-2 py-1 text-sm bg-black text-white rounded shadow-lg pointer-events-none"
                style={{
                  left: tooltip.x - 500,
                  top: tooltip.y - 200,
                  whiteSpace: 'pre-line'
                }}
              >
                {tooltip.content}
              </div>
            )}
          </div>

          {/* Case Information */}
          {selectedCaseId && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              <div className="p-4 bg-muted rounded">
                <h4 className="font-semibold mb-2">Case Summary</h4>
                <p><strong>Case ID:</strong> {selectedCaseId}</p>
                <p><strong>Total Activities:</strong> {caseActivities.length}</p>
                <p><strong>Total Duration:</strong> {caseActivities.reduce((sum, a) => sum + a.actualDurationS, 0).toFixed(1)}s</p>
                <p><strong>Unique Stations:</strong> {Array.from(new Set(caseActivities.map(a => a.activity.split('/')[1]))).length}</p>
              </div>
              
              {(selectedNode || selectedLink) && (
                <div className="p-4 bg-muted rounded">
                  <h4 className="font-semibold mb-2">
                    {selectedNode ? 'Activity Details' : 'Transition Details'}
                  </h4>
                  {selectedNode && (
                    <>
                      <p><strong>Activity:</strong> {selectedNode.name}</p>
                      <p><strong>Category:</strong> {selectedNode.category}</p>
                      <p><strong>Occurrences:</strong> {selectedNode.totalOccurrences}</p>
                      <p><strong>Avg Duration:</strong> {selectedNode.avgDuration.toFixed(1)}s</p>
                    </>
                  )}
                  {selectedLink && (
                    <>
                      <p><strong>Transitions:</strong> {selectedLink.occurrences}</p>
                      <p><strong>Avg Transition Time:</strong> {selectedLink.avgTransitionTime.toFixed(1)}s</p>
                    </>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}