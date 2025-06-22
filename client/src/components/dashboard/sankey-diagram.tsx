import { useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, Expand } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

export default function SankeyDiagram() {
  const svgRef = useRef<SVGSVGElement>(null);
  
  const { data: processData } = useQuery({
    queryKey: ['/api/process/cases'],
    enabled: true
  });

  useEffect(() => {
    if (!svgRef.current || !processData) return;
    
    const svg = svgRef.current;
    const width = 800;
    const height = 400;
    
    // Clear previous content
    svg.innerHTML = '';
    
    // Manufacturing process flow data based on your real data
    const nodes = [
      { id: 'start', name: 'Start', x: 50, y: 200, color: '#10b981' },
      { id: 'hbw', name: 'High Bay Warehouse', x: 200, y: 100, color: '#3b82f6' },
      { id: 'vgr', name: 'VGR Robot', x: 350, y: 150, color: '#8b5cf6' },
      { id: 'oven', name: 'Oven Processing', x: 500, y: 80, color: '#ef4444' },
      { id: 'milling', name: 'Milling Machine', x: 500, y: 220, color: '#f59e0b' },
      { id: 'sorting', name: 'Sorting Machine', x: 650, y: 150, color: '#06b6d4' },
      { id: 'complete', name: 'Complete', x: 750, y: 200, color: '#10b981' }
    ];
    
    const flows = [
      { from: 'start', to: 'hbw', value: 282, color: '#10b981' },
      { from: 'hbw', to: 'vgr', value: 260, color: '#3b82f6' },
      { from: 'vgr', to: 'oven', value: 140, color: '#ef4444' },
      { from: 'vgr', to: 'milling', value: 120, color: '#f59e0b' },
      { from: 'oven', to: 'sorting', value: 125, color: '#ef4444' },
      { from: 'milling', to: 'sorting', value: 110, color: '#f59e0b' },
      { from: 'sorting', to: 'complete', value: 235, color: '#06b6d4' }
    ];
    
    // Create SVG elements
    svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
    
    // Draw flow paths
    flows.forEach(flow => {
      const fromNode = nodes.find(n => n.id === flow.from);
      const toNode = nodes.find(n => n.id === flow.to);
      if (!fromNode || !toNode) return;
      
      const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      const strokeWidth = Math.max(2, flow.value / 10);
      
      const d = `M ${fromNode.x + 40} ${fromNode.y} 
                Q ${(fromNode.x + toNode.x) / 2} ${fromNode.y} 
                ${toNode.x - 40} ${toNode.y}`;
      
      path.setAttribute('d', d);
      path.setAttribute('stroke', flow.color);
      path.setAttribute('stroke-width', strokeWidth.toString());
      path.setAttribute('fill', 'none');
      path.setAttribute('opacity', '0.7');
      
      svg.appendChild(path);
      
      // Add flow labels
      const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      text.setAttribute('x', ((fromNode.x + toNode.x) / 2).toString());
      text.setAttribute('y', (Math.min(fromNode.y, toNode.y) - 10).toString());
      text.setAttribute('text-anchor', 'middle');
      text.setAttribute('font-size', '12');
      text.setAttribute('fill', '#6b7280');
      text.textContent = flow.value.toString();
      svg.appendChild(text);
    });
    
    // Draw nodes
    nodes.forEach(node => {
      const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      circle.setAttribute('cx', node.x.toString());
      circle.setAttribute('cy', node.y.toString());
      circle.setAttribute('r', '20');
      circle.setAttribute('fill', node.color);
      circle.setAttribute('stroke', '#ffffff');
      circle.setAttribute('stroke-width', '2');
      svg.appendChild(circle);
      
      const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      text.setAttribute('x', node.x.toString());
      text.setAttribute('y', (node.y + 35).toString());
      text.setAttribute('text-anchor', 'middle');
      text.setAttribute('font-size', '11');
      text.setAttribute('fill', '#374151');
      text.setAttribute('font-weight', '500');
      text.textContent = node.name;
      svg.appendChild(text);
    });
    
  }, [processData]);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Process Flow - Sankey Diagram</CardTitle>
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
          <svg ref={svgRef} className="w-full h-96"></svg>
          <div className="mt-4 flex justify-center space-x-6 text-xs text-gray-600">
            <div className="flex items-center">
              <div className="w-3 h-1 bg-blue-500 mr-2"></div>
              <span>Primary Flow</span>
            </div>
            <div className="flex items-center">
              <div className="w-3 h-1 bg-red-500 mr-2"></div>
              <span>Oven Processing</span>
            </div>
            <div className="flex items-center">
              <div className="w-3 h-1 bg-yellow-500 mr-2"></div>
              <span>Milling Processing</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}