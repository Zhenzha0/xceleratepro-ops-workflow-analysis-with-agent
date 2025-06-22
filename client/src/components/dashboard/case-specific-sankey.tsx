import { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import * as d3Sankey from 'd3-sankey';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Search } from 'lucide-react';

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
  const [availableCases, setAvailableCases] = useState<string[]>([]);
  const [caseActivities, setCaseActivities] = useState<ProcessActivity[]>([]);
  const [selectedNode, setSelectedNode] = useState<SankeyNode | null>(null);
  const [selectedLink, setSelectedLink] = useState<SankeyLink | null>(null);
  const [tooltip, setTooltip] = useState<{ x: number; y: number; content: string } | null>(null);

  // Extract available cases and set default selection
  useEffect(() => {
    if (activities && activities.length > 0) {
      // Extract caseId from each activity - handle any possible property name
      const cases = Array.from(new Set(
        activities.map((a: any) => a.caseId || a.caseConceptName || a.case || 'Unknown')
      )).filter(c => c !== 'Unknown').sort();
      
      setAvailableCases(cases);
      
      if (cases.length > 0 && !selectedCaseId) {
        setSelectedCaseId(cases[0]);
      }
    }
  }, [activities]);

  // Filter activities for selected case
  useEffect(() => {
    if (selectedCaseId && activities) {
      const filtered = activities.filter((a: any) => 
        a.caseId === selectedCaseId || 
        a.caseConceptName === selectedCaseId || 
        a.case === selectedCaseId
      );
      setCaseActivities(filtered);
    } else {
      setCaseActivities([]);
    }
  }, [selectedCaseId, activities]);

  const buildCaseSankeyData = (caseActivities: ProcessActivity[]) => {
    if (!caseActivities || caseActivities.length === 0) return { nodes: [], links: [] };

    try {
      // Sort activities by start time for this specific case
      const sortedActivities = [...caseActivities].sort((a, b) => 
        new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
      );

      // Create nodes from the activities in this case (each activity instance becomes a node)
      const nodes: SankeyNode[] = sortedActivities.map((activity, index) => ({
        id: `${activity.activity}_${index}`,
        name: activity.activity.replace(/^\//, ''),
        category: activity.activity.split('/')[1] || 'unknown',
        activities: [activity],
        avgDuration: activity.actualDurationS,
        totalOccurrences: 1,
        value: 1
      }));

      // Create links between consecutive activities
      const links: SankeyLink[] = [];
      for (let i = 0; i < sortedActivities.length - 1; i++) {
        const current = sortedActivities[i];
        const next = sortedActivities[i + 1];
        
        const transitionTime = new Date(next.startTime).getTime() - new Date(current.completeTime).getTime();
        
        links.push({
          source: i,
          target: i + 1,
          value: 1,
          avgTransitionTime: Math.max(0, transitionTime / 1000),
          occurrences: 1,
          activities: [current]
        });
      }

      return { nodes, links };
    } catch (error) {
      console.error('Error building case Sankey data:', error);
      return { nodes: [], links: [] };
    }
  };

  useEffect(() => {
    if (!svgRef.current || !caseActivities.length) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const margin = { top: 20, right: 20, bottom: 40, left: 20 };
    const width = 1200 - margin.left - margin.right;
    const height = 400 - margin.top - margin.bottom;

    const { nodes, links } = buildCaseSankeyData(caseActivities);
    if (!nodes.length) return;

    // Create sankey generator
    const sankeyGenerator = d3Sankey.sankey<SankeyNode, SankeyLink>()
      .nodeWidth(120)
      .nodePadding(15)
      .extent([[margin.left, margin.top], [width - margin.right, height - margin.bottom]]);

    const graph = sankeyGenerator({ nodes, links });

    const g = svg.append("g");

    // Color scale for different station categories
    const colorScale = d3.scaleOrdinal<string>()
      .domain(['hbw', 'vgr', 'ov', 'wt', 'pm', 'dm', 'mm', 'unknown'])
      .range(['#06b6d4', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444', '#6366f1', '#ec4899', '#6b7280']);

    // Draw links
    const links_g = g.selectAll(".link")
      .data(graph.links)
      .enter().append("g")
      .attr("class", "link")
      .style("cursor", "pointer");

    links_g.append("path")
      .attr("d", (d: any) => {
        return `M${d.source.x1},${d.y0}C${(d.source.x1 + d.target.x0) / 2},${d.y0} ${(d.source.x1 + d.target.x0) / 2},${d.y1} ${d.target.x0},${d.y1}`;
      })
      .attr("stroke", "#94a3b8")
      .attr("stroke-opacity", 0.6)
      .attr("stroke-width", (d: any) => Math.max(3, d.width))
      .attr("fill", "none")
      .on("mouseover", function(event: any, d: any) {
        d3.select(this as any).attr("stroke-opacity", 0.8);
        const content = `
          <div class="font-semibold">${(d.source as SankeyNode).name} → ${(d.target as SankeyNode).name}</div>
          <div class="text-sm">Transition Time: ${d.avgTransitionTime.toFixed(2)}s</div>
          <div class="text-sm">Sequential Flow</div>
        `;
        setTooltip({ x: event.pageX, y: event.pageY, content });
      })
      .on("mouseout", function(event: any, d: any) {
        d3.select(this as any).attr("stroke-opacity", 0.6);
        setTooltip(null);
      })
      .on("click", function(event: any, d: any) {
        setSelectedLink(d);
        setSelectedNode(null);
      });

    // Draw nodes
    const nodes_g = g.selectAll(".node")
      .data(graph.nodes)
      .enter().append("g")
      .attr("class", "node")
      .attr("transform", (d: any) => `translate(${d.x0},${d.y0})`)
      .style("cursor", "pointer");

    // Node rectangles
    nodes_g.append("rect")
      .attr("height", (d: any) => Math.max(20, d.y1 - d.y0))
      .attr("width", sankeyGenerator.nodeWidth())
      .attr("fill", (d: any) => colorScale(d.category))
      .attr("stroke", "#fff")
      .attr("stroke-width", 2)
      .attr("rx", 4)
      .on("mouseover", function(event: any, d: any) {
        d3.select(this as any).attr("stroke-width", 3);
        const activity = d.activities[0];
        const content = `
          <div class="font-semibold">${d.name}</div>
          <div class="text-sm">Duration: ${activity.actualDurationS.toFixed(2)}s</div>
          <div class="text-sm">Status: ${activity.status}</div>
          <div class="text-sm">Resource: ${activity.orgResource}</div>
        `;
        setTooltip({ x: event.pageX, y: event.pageY, content });
      })
      .on("mouseout", function(event: any, d: any) {
        d3.select(this as any).attr("stroke-width", 2);
        setTooltip(null);
      })
      .on("click", function(event: any, d: any) {
        setSelectedNode(d);
        setSelectedLink(null);
      });

    // Node labels
    nodes_g.append("text")
      .attr("x", sankeyGenerator.nodeWidth() / 2)
      .attr("y", (d: any) => Math.max(10, (d.y1 - d.y0) / 2))
      .attr("dy", "0.35em")
      .attr("text-anchor", "middle")
      .style("font-size", "10px")
      .style("font-weight", "500")
      .style("fill", "white")
      .style("pointer-events", "none")
      .text((d: any) => {
        const shortName = d.name.length > 12 ? d.name.substring(0, 12) + '...' : d.name;
        return shortName;
      });

    // Add sequence numbers
    nodes_g.append("text")
      .attr("x", sankeyGenerator.nodeWidth() / 2)
      .attr("y", -5)
      .attr("text-anchor", "middle")
      .style("font-size", "10px")
      .style("font-weight", "bold")
      .style("fill", "#374151")
      .style("pointer-events", "none")
      .text((d: any, i: number) => i + 1);

  }, [caseActivities]);

  const formatDuration = (seconds: number) => {
    if (seconds < 60) return `${seconds.toFixed(1)}s`;
    if (seconds < 3600) return `${(seconds / 60).toFixed(1)}m`;
    return `${(seconds / 3600).toFixed(1)}h`;
  };

  const formatDateTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleString();
  };

  return (
    <div className="space-y-4">
      {/* Case Selection */}
      <Card className="p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Case-Specific Process Flow</h3>
          <div className="text-sm text-gray-600">
            {availableCases.length} cases available
          </div>
        </div>
        
        <div className="flex items-center space-x-4">
          <div className="flex-1">
            <Label htmlFor="caseSelect">Select Case ID:</Label>
            <div className="flex space-x-2 mt-1">
              <Input
                id="caseSelect"
                type="text"
                placeholder="e.g., WF_101_0"
                value={selectedCaseId}
                onChange={(e) => setSelectedCaseId(e.target.value)}
                className="flex-1"
                list="cases"
              />
              <datalist id="cases">
                {availableCases.map(caseId => (
                  <option key={caseId} value={caseId} />
                ))}
              </datalist>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => {
                  if (availableCases.includes(selectedCaseId)) {
                    // Case is already selected, force refresh
                    const filtered = activities.filter(a => a.caseId === selectedCaseId);
                    setCaseActivities(filtered);
                  }
                }}
              >
                <Search size={16} className="mr-1" />
                Show Flow
              </Button>
            </div>
          </div>
        </div>
      </Card>

      {/* Sankey Diagram */}
      {caseActivities.length > 0 && (
        <Card className="p-4">
          <div className="flex items-center justify-between mb-4">
            <h4 className="font-semibold">Process Flow for Case: {selectedCaseId}</h4>
            <div className="text-sm text-gray-600">
              {caseActivities.length} sequential activities
            </div>
          </div>
          
          <div className="relative">
            <svg 
              ref={svgRef} 
              width="1200" 
              height="440"
              className="border rounded-lg bg-white shadow-sm"
            />
            
            {tooltip && (
              <div 
                className="absolute z-10 bg-black text-white p-2 rounded text-xs max-w-xs"
                style={{ left: tooltip.x - 400, top: tooltip.y - 100 }}
                dangerouslySetInnerHTML={{ __html: tooltip.content }}
              />
            )}
          </div>
        </Card>
      )}

      {/* Activity Details */}
      {caseActivities.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {selectedNode && (
            <Card className="p-4">
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <div 
                    className="w-4 h-4 rounded"
                    style={{ backgroundColor: d3.scaleOrdinal<string>()
                      .domain(['hbw', 'vgr', 'ov', 'wt', 'pm', 'dm', 'mm', 'unknown'])
                      .range(['#06b6d4', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444', '#6366f1', '#ec4899', '#6b7280'])
                      (selectedNode.category) }}
                  />
                  <h4 className="font-semibold">{selectedNode.name}</h4>
                </div>
                
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">Duration:</span>
                    <div className="font-medium">{formatDuration(selectedNode.avgDuration)}</div>
                  </div>
                  <div>
                    <span className="text-gray-600">Status:</span>
                    <div className="font-medium">
                      <Badge variant={selectedNode.activities[0].status === 'success' ? 'default' : 'destructive'}>
                        {selectedNode.activities[0].status}
                      </Badge>
                    </div>
                  </div>
                  <div>
                    <span className="text-gray-600">Resource:</span>
                    <div className="font-medium">{selectedNode.activities[0].orgResource}</div>
                  </div>
                  <div>
                    <span className="text-gray-600">Category:</span>
                    <div className="font-medium">{selectedNode.category}</div>
                  </div>
                </div>

                <Separator />
                
                <div>
                  <span className="text-sm text-gray-600">Timing Details:</span>
                  <div className="mt-2 space-y-1 text-xs">
                    <div>Started: {formatDateTime(selectedNode.activities[0].startTime)}</div>
                    <div>Completed: {formatDateTime(selectedNode.activities[0].completeTime)}</div>
                  </div>
                </div>
              </div>
            </Card>
          )}

          {selectedLink && (
            <Card className="p-4">
              <div className="space-y-3">
                <div>
                  <h4 className="font-semibold">
                    {(selectedLink.source as SankeyNode).name} → {(selectedLink.target as SankeyNode).name}
                  </h4>
                </div>
                
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">Transition Time:</span>
                    <div className="font-medium">{formatDuration(selectedLink.avgTransitionTime)}</div>
                  </div>
                  <div>
                    <span className="text-gray-600">Flow Type:</span>
                    <div className="font-medium">Sequential</div>
                  </div>
                </div>

                <Separator />
                
                <div>
                  <span className="text-sm text-gray-600">Transition Details:</span>
                  <div className="mt-2 text-xs">
                    This represents the time between completing the first activity and starting the next activity in the sequence.
                  </div>
                </div>
              </div>
            </Card>
          )}
        </div>
      )}

      {/* Case Summary */}
      {caseActivities.length > 0 && (
        <Card className="p-4">
          <h4 className="font-semibold mb-3">Case Summary: {selectedCaseId}</h4>
          <div className="grid grid-cols-4 gap-4 text-sm">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{caseActivities.length}</div>
              <div className="text-gray-600">Total Activities</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {formatDuration(caseActivities.reduce((sum, a) => sum + a.actualDurationS, 0))}
              </div>
              <div className="text-gray-600">Total Processing Time</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">
                {new Set(caseActivities.map(a => a.activity)).size}
              </div>
              <div className="text-gray-600">Unique Stations</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">
                {caseActivities.filter(a => a.status !== 'success').length}
              </div>
              <div className="text-gray-600">Issues/Anomalies</div>
            </div>
          </div>
        </Card>
      )}

      {/* Station Legend */}
      <Card className="p-4">
        <h4 className="font-semibold mb-3">Station Categories</h4>
        <div className="flex flex-wrap gap-3">
          {[
            { category: 'hbw', name: 'Handling/Buffering', color: '#06b6d4' },
            { category: 'vgr', name: 'Transport/VGR', color: '#8b5cf6' },
            { category: 'ov', name: 'Oven/Processing', color: '#10b981' },
            { category: 'wt', name: 'Workstation', color: '#f59e0b' },
            { category: 'pm', name: 'Punching/Machining', color: '#ef4444' },
            { category: 'dm', name: 'Drilling/Machining', color: '#6366f1' },
            { category: 'mm', name: 'Milling/Machining', color: '#ec4899' }
          ].map(({ category, name, color }) => (
            <div key={category} className="flex items-center gap-2">
              <div className="w-4 h-4 rounded" style={{ backgroundColor: color }} />
              <span className="text-sm">{name}</span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}