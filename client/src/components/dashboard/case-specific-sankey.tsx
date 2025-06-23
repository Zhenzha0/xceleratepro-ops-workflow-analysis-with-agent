import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Search, Download, ZoomIn, ZoomOut } from "lucide-react";
import * as d3 from "d3";

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
  x: number;
  y: number;
  width: number;
  height: number;
  activities: ProcessActivity[];
  totalOccurrences: number;
  inflowTotal: number;
  outflowTotal: number;
}

interface SankeyLink {
  source: number;
  target: number;
  value: number;
  sourceY: number;
  targetY: number;
  height: number;
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
  const [searchTerm, setSearchTerm] = useState("");

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

  const buildProperSankeyData = (caseActivities: ProcessActivity[]) => {
    if (!caseActivities || caseActivities.length === 0) {
      return { nodes: [], links: [] };
    }

    try {
      // Sort activities by start time
      const sortedActivities = [...caseActivities].sort((a, b) => 
        new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
      );

      // Build flow connections based on timing
      const connections: Array<{
        from: string;
        to: string;
        fromActivity: ProcessActivity;
        toActivity: ProcessActivity;
      }> = [];
      
      for (let i = 1; i < sortedActivities.length; i++) {
        const prevActivity = sortedActivities[i - 1];
        const currentActivity = sortedActivities[i];
        
        if (prevActivity.completeTime && currentActivity.startTime) {
          const prevEndTime = new Date(prevActivity.completeTime).getTime();
          const currentStartTime = new Date(currentActivity.startTime).getTime();
          const timeDiff = (currentStartTime - prevEndTime) / 1000;
          
          if (timeDiff >= -5 && timeDiff <= 60) {
            connections.push({
              from: prevActivity.activity,
              to: currentActivity.activity,
              fromActivity: prevActivity,
              toActivity: currentActivity
            });
          }
        }
      }

      // Create unique activities and count occurrences
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

      // Create nodes with proper positioning
      const uniqueActivities = Array.from(activityCounts.keys());
      const nodeMap = new Map<string, number>();
      
      const nodes: SankeyNode[] = uniqueActivities.map((activity, index) => {
        const activities = activityData.get(activity)!;
        const count = activityCounts.get(activity)!;
        
        nodeMap.set(activity, index);
        
        return {
          id: activity,
          name: activity.replace(/^\//, ''),
          category: activity.split('/')[1] || 'unknown',
          x: 0, // Will be calculated
          y: 0, // Will be calculated
          width: 20,
          height: 0, // Will be calculated based on flow
          activities: activities,
          totalOccurrences: count,
          inflowTotal: 0,
          outflowTotal: 0
        };
      });

      // Count connections for links
      const linkMap = new Map<string, number>();
      connections.forEach(conn => {
        const key = `${conn.from}->${conn.to}`;
        linkMap.set(key, (linkMap.get(key) || 0) + 1);
      });

      // Create links with proper typing
      const links: SankeyLink[] = [];
      linkMap.forEach((value, key) => {
        const [fromActivity, toActivity] = key.split('->');
        const sourceIndex = nodeMap.get(fromActivity);
        const targetIndex = nodeMap.get(toActivity);
        
        if (sourceIndex !== undefined && targetIndex !== undefined) {
          const sourceActivities = connections
            .filter(c => c.from === fromActivity && c.to === toActivity)
            .map(c => c.fromActivity);
          
          links.push({
            source: sourceIndex,
            target: targetIndex,
            value: value,
            sourceY: 0,
            targetY: 0,
            height: 0,
            activities: sourceActivities
          });
          
          // Update node flow totals
          nodes[sourceIndex].outflowTotal += value;
          nodes[targetIndex].inflowTotal += value;
        }
      });

      return { nodes, links };
    } catch (error) {
      console.error('Error building Sankey data:', error);
      return { nodes: [], links: [] };
    }
  };

  const renderProperSankey = () => {
    if (!svgRef.current || !caseActivities.length) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const width = 1200;
    const height = 600;
    const margin = { top: 40, right: 200, bottom: 40, left: 80 };

    const { nodes, links } = buildProperSankeyData(caseActivities);
    if (!nodes.length) return;

    // Calculate node dimensions based on max flow
    const maxFlow = Math.max(...nodes.map(n => Math.max(n.inflowTotal, n.outflowTotal, 1)));
    const minNodeHeight = 30;
    const maxNodeHeight = 80;
    const nodeWidth = 120;
    
    nodes.forEach(node => {
      const flowRatio = Math.max(node.inflowTotal, node.outflowTotal, 1) / maxFlow;
      node.height = minNodeHeight + (maxNodeHeight - minNodeHeight) * flowRatio;
      node.width = nodeWidth;
    });

    // Position nodes horizontally by category with much more vertical spacing
    const categories = Array.from(new Set(nodes.map(n => n.category)));
    const availableWidth = width - margin.left - margin.right;
    const xSpacing = categories.length > 1 ? availableWidth / (categories.length - 1) : 0;
    
    categories.forEach((category, catIndex) => {
      const categoryNodes = nodes.filter(n => n.category === category);
      const availableHeight = height - margin.top - margin.bottom;
      const minSpacing = 60; // Much larger spacing between nodes
      const totalNodeHeight = categoryNodes.reduce((sum, n) => sum + n.height, 0);
      const totalSpacing = (categoryNodes.length - 1) * minSpacing;
      const totalRequired = totalNodeHeight + totalSpacing;
      
      // If we need more space, spread nodes evenly
      const actualSpacing = totalRequired > availableHeight ? 
        Math.max(20, (availableHeight - totalNodeHeight) / Math.max(1, categoryNodes.length - 1)) : 
        minSpacing;
      
      const startY = margin.top + (availableHeight - totalNodeHeight - (categoryNodes.length - 1) * actualSpacing) / 2;
      
      let currentY = Math.max(margin.top, startY);
      categoryNodes.forEach((node, nodeIndex) => {
        node.x = margin.left + catIndex * xSpacing;
        node.y = currentY;
        currentY += node.height + (nodeIndex < categoryNodes.length - 1 ? actualSpacing : 0);
      });
    });

    // Sort links to prevent overlaps
    links.sort((a, b) => {
      if (a.source !== b.source) return a.source - b.source;
      return a.target - b.target;
    });

    // Calculate link heights to properly fill node heights
    const nodeOutflowLinks = new Map<number, SankeyLink[]>();
    const nodeInflowLinks = new Map<number, SankeyLink[]>();
    
    // Group links by source and target nodes
    links.forEach(link => {
      if (!nodeOutflowLinks.has(link.source)) {
        nodeOutflowLinks.set(link.source, []);
      }
      if (!nodeInflowLinks.has(link.target)) {
        nodeInflowLinks.set(link.target, []);
      }
      nodeOutflowLinks.get(link.source)!.push(link);
      nodeInflowLinks.get(link.target)!.push(link);
    });

    // Calculate link positions to fill entire node heights (both source and target)
    nodes.forEach((node, nodeIndex) => {
      const outLinks = nodeOutflowLinks.get(nodeIndex) || [];
      const inLinks = nodeInflowLinks.get(nodeIndex) || [];
      
      // For outgoing links - each link fills proportional height of source node
      if (outLinks.length > 0) {
        const totalOutValue = outLinks.reduce((sum, link) => sum + link.value, 0);
        let currentSourceY = node.y;
        
        outLinks.forEach((link) => {
          const proportion = link.value / totalOutValue;
          const linkHeight = node.height * proportion;
          
          link.sourceY = currentSourceY;
          link.height = linkHeight;
          currentSourceY += linkHeight;
        });
      }
      
      // For incoming links - each link fills proportional height of target node
      if (inLinks.length > 0) {
        const totalInValue = inLinks.reduce((sum, link) => sum + link.value, 0);
        let currentTargetY = node.y;
        
        inLinks.forEach((link) => {
          const proportion = link.value / totalInValue;
          const targetHeight = node.height * proportion;
          
          link.targetY = currentTargetY;
          // Ensure link height matches both source and target proportions
          currentTargetY += targetHeight;
        });
      }
    });

    const g = svg.append("g");

    // Color scale
    const colorScale = d3.scaleOrdinal<string>()
      .domain(['hbw', 'vgr', 'ov', 'wt', 'pm', 'dm', 'mm', 'unknown'])
      .range(['#06b6d4', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444', '#6366f1', '#ec4899', '#6b7280']);

    // Draw links as filled paths
    const linkGroup = g.append("g").attr("class", "links");
    
    linkGroup.selectAll("path")
      .data(links)
      .enter().append("path")
      .attr("d", (d: SankeyLink) => {
        const sourceNode = nodes[d.source];
        const targetNode = nodes[d.target];
        
        // Connect from right edge of source to left edge of target
        const x0 = sourceNode.x + sourceNode.width;  // Right edge of source
        const x1 = targetNode.x;                     // Left edge of target
        const y0 = d.sourceY || sourceNode.y;        // Top of link on source
        const y1 = d.targetY || targetNode.y;        // Top of link on target
        const height = d.height || 10;               // Height of the link
        
        // Create curved path that fills the entire height
        const curvature = 0.5;
        const controlX = x0 + (x1 - x0) * curvature;
        
        return `
          M${x0},${y0}
          C${controlX},${y0} ${controlX},${y1} ${x1},${y1}
          L${x1},${y1 + height}
          C${controlX},${y1 + height} ${controlX},${y0 + height} ${x0},${y0 + height}
          Z
        `;
      })
      .style("fill", (d: SankeyLink) => {
        const sourceNode = nodes[d.source];
        const baseColor = colorScale(sourceNode.category);
        return baseColor + '80'; // Add transparency
      })
      .style("stroke", "none")
      .on("mouseover", function(event: any, d: SankeyLink) {
        const sourceNode = nodes[d.source];
        const targetNode = nodes[d.target];
        
        setTooltip({
          x: event.pageX,
          y: event.pageY,
          content: `${sourceNode.name} → ${targetNode.name}\nTransitions: ${d.value}`
        });
        
        d3.select(this).style("fill-opacity", 0.8);
      })
      .on("mouseout", function() {
        setTooltip(null);
        d3.select(this).style("fill-opacity", 1);
      });

    // Draw nodes
    const nodeGroup = g.append("g").attr("class", "nodes");
    
    const nodeElements = nodeGroup.selectAll("g")
      .data(nodes)
      .enter().append("g")
      .attr("class", "node");

    nodeElements.append("rect")
      .attr("x", (d: SankeyNode) => d.x)
      .attr("y", (d: SankeyNode) => d.y)
      .attr("width", nodeWidth)
      .attr("height", (d: SankeyNode) => d.height)
      .style("fill", (d: SankeyNode) => colorScale(d.category))
      .style("stroke", "#000")
      .style("stroke-width", 1)
      .on("mouseover", function(event: any, d: SankeyNode) {
        setTooltip({
          x: event.pageX,
          y: event.pageY,
          content: `${d.name}\nCategory: ${d.category}\nOccurrences: ${d.totalOccurrences}`
        });
        
        d3.select(this).style("fill", d3.color(colorScale(d.category))!.darker(0.3).toString());
      })
      .on("mouseout", function(event: any, d: SankeyNode) {
        setTooltip(null);
        d3.select(this).style("fill", colorScale(d.category));
      })
      .on("click", function(event: any, d: SankeyNode) {
        setSelectedNode(d);
      });

    // Add labels outside nodes using fixed node width
    nodeElements.append("text")
      .attr("x", (d: SankeyNode) => d.x + nodeWidth + 8)
      .attr("y", (d: SankeyNode) => d.y + d.height / 2)
      .attr("dy", "0.35em")
      .style("font-size", "12px")
      .style("font-weight", "600")
      .style("fill", "#374151")
      .text((d: SankeyNode) => {
        const name = d.name;
        return name.length > 18 ? name.substring(0, 15) + "..." : name;
      });

    // Add smaller category labels
    nodeElements.append("text")
      .attr("x", (d: SankeyNode) => d.x + nodeWidth + 8)
      .attr("y", (d: SankeyNode) => d.y + d.height / 2 + 14)
      .style("font-size", "10px")
      .style("fill", "#6b7280")
      .text((d: SankeyNode) => `${d.category} (${d.totalOccurrences}×)`);
  };

  useEffect(() => {
    renderProperSankey();
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
          <div className="relative overflow-hidden">
            <svg
              ref={svgRef}
              width="100%"
              height="600"
              viewBox="0 0 1200 600"
              className="border rounded"
            />
            
            {/* Tooltip */}
            {tooltip && (
              <div
                className="absolute z-50 px-2 py-1 text-sm bg-black text-white rounded shadow-lg pointer-events-none"
                style={{
                  left: tooltip.x - 450,
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
              
              {selectedNode && (
                <div className="p-4 bg-muted rounded">
                  <h4 className="font-semibold mb-2">Selected Activity</h4>
                  <p><strong>Activity:</strong> {selectedNode.name}</p>
                  <p><strong>Category:</strong> {selectedNode.category}</p>
                  <p><strong>Occurrences:</strong> {selectedNode.totalOccurrences}</p>
                  <p><strong>Inflow:</strong> {selectedNode.inflowTotal} connections</p>
                  <p><strong>Outflow:</strong> {selectedNode.outflowTotal} connections</p>
                </div>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}