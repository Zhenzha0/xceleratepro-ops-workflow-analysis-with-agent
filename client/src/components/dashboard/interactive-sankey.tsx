import { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import * as d3Sankey from 'd3-sankey';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

interface ProcessActivity {
  id: string;
  activity: string;
  startTime: string;
  completeTime: string;
  actualDurationS: number;
  orgResource: string;
  status: string;
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

interface InteractiveSankeyProps {
  activities: ProcessActivity[];
  caseId: string;
}

export default function InteractiveSankey({ activities, caseId }: InteractiveSankeyProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [selectedNode, setSelectedNode] = useState<SankeyNode | null>(null);
  const [selectedLink, setSelectedLink] = useState<SankeyLink | null>(null);
  const [tooltip, setTooltip] = useState<{ x: number; y: number; content: string } | null>(null);

  const buildSankeyData = (activities: ProcessActivity[]) => {
    if (!activities || activities.length === 0) return { nodes: [], links: [] };

    // Sort activities by start time
    const sortedActivities = [...activities].sort((a, b) => 
      new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
    );

    // Create nodes from unique activities
    const activityGroups = new Map<string, ProcessActivity[]>();
    sortedActivities.forEach(activity => {
      const key = activity.activity;
      if (!activityGroups.has(key)) {
        activityGroups.set(key, []);
      }
      activityGroups.get(key)!.push(activity);
    });

    const nodes: SankeyNode[] = Array.from(activityGroups.entries()).map(([activityName, activityList]) => {
      const avgDuration = activityList.reduce((sum, a) => sum + a.actualDurationS, 0) / activityList.length;
      return {
        id: activityName,
        name: activityName.replace(/^\//, ''), // Remove leading slash
        category: activityName.split('/')[1] || 'unknown',
        activities: activityList,
        avgDuration,
        totalOccurrences: activityList.length,
        value: activityList.length
      };
    });

    // Create links based on temporal sequence
    const links: SankeyLink[] = [];
    const linkMap = new Map<string, { activities: ProcessActivity[], times: number[] }>();

    for (let i = 0; i < sortedActivities.length - 1; i++) {
      const current = sortedActivities[i];
      const next = sortedActivities[i + 1];
      
      const linkKey = `${current.activity}->${next.activity}`;
      const transitionTime = new Date(next.startTime).getTime() - new Date(current.completeTime).getTime();
      
      if (!linkMap.has(linkKey)) {
        linkMap.set(linkKey, { activities: [], times: [] });
      }
      
      linkMap.get(linkKey)!.activities.push(current);
      linkMap.get(linkKey)!.times.push(transitionTime / 1000); // Convert to seconds
    }

    linkMap.forEach((data, key) => {
      const [sourceName, targetName] = key.split('->');
      const sourceIndex = nodes.findIndex(n => n.id === sourceName);
      const targetIndex = nodes.findIndex(n => n.id === targetName);
      
      if (sourceIndex !== -1 && targetIndex !== -1) {
        const avgTransitionTime = data.times.reduce((sum, t) => sum + t, 0) / data.times.length;
        
        links.push({
          source: sourceIndex,
          target: targetIndex,
          value: data.activities.length,
          avgTransitionTime,
          occurrences: data.activities.length,
          activities: data.activities
        });
      }
    });

    return { nodes, links };
  };

  useEffect(() => {
    if (!svgRef.current || !activities.length) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const margin = { top: 20, right: 20, bottom: 40, left: 20 };
    const width = 1200 - margin.left - margin.right;
    const height = 400 - margin.top - margin.bottom;

    const { nodes, links } = buildSankeyData(activities);
    if (!nodes.length) return;

    // Create sankey generator
    const sankeyGenerator = d3Sankey.sankey<SankeyNode, SankeyLink>()
      .nodeWidth(180)
      .nodePadding(20)
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
      .attr("stroke-opacity", 0.4)
      .attr("stroke-width", (d: any) => Math.max(1, d.width))
      .attr("fill", "none")
      .on("mouseover", function(event: any, d: any) {
        d3.select(this as any).attr("stroke-opacity", 0.7);
        const content = `
          <div class="font-semibold">${(d.source as SankeyNode).name} → ${(d.target as SankeyNode).name}</div>
          <div class="text-sm">Occurrences: ${d.occurrences}</div>
          <div class="text-sm">Avg Transition Time: ${d.avgTransitionTime.toFixed(2)}s</div>
        `;
        setTooltip({ x: event.pageX, y: event.pageY, content });
      })
      .on("mouseout", function(event: any, d: any) {
        d3.select(this as any).attr("stroke-opacity", 0.4);
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
      .attr("height", (d: any) => d.y1 - d.y0)
      .attr("width", sankeyGenerator.nodeWidth())
      .attr("fill", (d: any) => colorScale(d.category))
      .attr("stroke", "#fff")
      .attr("stroke-width", 2)
      .attr("rx", 4)
      .on("mouseover", function(event: any, d: any) {
        d3.select(this as any).attr("stroke-width", 3);
        const content = `
          <div class="font-semibold">${d.name}</div>
          <div class="text-sm">Occurrences: ${d.totalOccurrences}</div>
          <div class="text-sm">Avg Duration: ${d.avgDuration.toFixed(2)}s</div>
          <div class="text-sm">Category: ${d.category}</div>
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
      .attr("y", (d: any) => (d.y1 - d.y0) / 2)
      .attr("dy", "0.35em")
      .attr("text-anchor", "middle")
      .style("font-size", "12px")
      .style("font-weight", "500")
      .style("fill", "white")
      .style("pointer-events", "none")
      .text((d: any) => d.name.length > 15 ? d.name.substring(0, 15) + '...' : d.name);

    // Add flow counts on links
    links_g.append("text")
      .attr("x", (d: any) => ((d.source as SankeyNode).x1! + (d.target as SankeyNode).x0!) / 2)
      .attr("y", (d: any) => (d.y0! + d.y1!) / 2)
      .attr("dy", "0.35em")
      .attr("text-anchor", "middle")
      .style("font-size", "10px")
      .style("font-weight", "bold")
      .style("fill", "#374151")
      .style("pointer-events", "none")
      .text((d: any) => d.value > 1 ? d.value : '');

  }, [activities]);

  const formatDuration = (seconds: number) => {
    if (seconds < 60) return `${seconds.toFixed(1)}s`;
    if (seconds < 3600) return `${(seconds / 60).toFixed(1)}m`;
    return `${(seconds / 3600).toFixed(1)}h`;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Process Flow - Case: {caseId}</h3>
        <div className="text-sm text-gray-600">
          {activities.length} activities • Click nodes/links for details
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
                  <span className="text-gray-600">Total Occurrences:</span>
                  <div className="font-medium">{selectedNode.totalOccurrences}</div>
                </div>
                <div>
                  <span className="text-gray-600">Avg Duration:</span>
                  <div className="font-medium">{formatDuration(selectedNode.avgDuration)}</div>
                </div>
                <div>
                  <span className="text-gray-600">Category:</span>
                  <div className="font-medium">{selectedNode.category}</div>
                </div>
                <div>
                  <span className="text-gray-600">Connections:</span>
                  <div className="font-medium">
                    {(selectedNode.sourceLinks?.length || 0) + (selectedNode.targetLinks?.length || 0)}
                  </div>
                </div>
              </div>

              <Separator />
              
              <div>
                <span className="text-sm text-gray-600">Recent Activities:</span>
                <div className="mt-2 space-y-1 max-h-32 overflow-y-auto">
                  {selectedNode.activities.slice(0, 5).map((activity, idx) => (
                    <div key={idx} className="text-xs bg-gray-50 p-2 rounded">
                      <div className="flex justify-between">
                        <span>{formatDuration(activity.actualDurationS)}</span>
                        <Badge variant={activity.status === 'success' ? 'default' : 'destructive'} className="text-xs">
                          {activity.status}
                        </Badge>
                      </div>
                      <div className="text-gray-500 mt-1">
                        {new Date(activity.startTime).toLocaleString()}
                      </div>
                    </div>
                  ))}
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
                  <span className="text-gray-600">Occurrences:</span>
                  <div className="font-medium">{selectedLink.occurrences}</div>
                </div>
                <div>
                  <span className="text-gray-600">Avg Transition:</span>
                  <div className="font-medium">{formatDuration(selectedLink.avgTransitionTime)}</div>
                </div>
                <div>
                  <span className="text-gray-600">Flow Weight:</span>
                  <div className="font-medium">{selectedLink.value}</div>
                </div>
                <div>
                  <span className="text-gray-600">Type:</span>
                  <div className="font-medium">Sequential</div>
                </div>
              </div>

              <Separator />
              
              <div>
                <span className="text-sm text-gray-600">Recent Transitions:</span>
                <div className="mt-2 space-y-1 max-h-32 overflow-y-auto">
                  {selectedLink.activities.slice(0, 5).map((activity, idx) => (
                    <div key={idx} className="text-xs bg-gray-50 p-2 rounded">
                      <div className="flex justify-between">
                        <span>Activity {activity.id}</span>
                        <span className="text-gray-500">
                          {formatDuration(activity.actualDurationS)}
                        </span>
                      </div>
                      <div className="text-gray-500 mt-1">
                        {new Date(activity.startTime).toLocaleString()}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </Card>
        )}
      </div>

      {/* Legend */}
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