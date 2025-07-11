import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Search, Download } from "lucide-react";
import Plot from 'react-plotly.js';

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

interface CaseSpecificSankeyProps {
  activities: ProcessActivity[];
}

export default function CaseSpecificSankey({ activities }: CaseSpecificSankeyProps) {
  const [selectedCaseId, setSelectedCaseId] = useState<string>("");
  const [caseActivities, setCaseActivities] = useState<ProcessActivity[]>([]);
  const [availableCases, setAvailableCases] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [plotData, setPlotData] = useState<any>(null);

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

  // Get activities for selected case (deduplicated - each activity should only be counted once)
  useEffect(() => {
    if (selectedCaseId && activities) {
      const filteredActivities = activities
        .filter(a => 
          a.caseId === selectedCaseId || 
          a.caseConceptName === selectedCaseId || 
          a.case === selectedCaseId
        );
      
      // Deduplicate activities - group by activity name and timestamp, keep only one per unique activity
      const uniqueActivities = new Map();
      filteredActivities.forEach(activity => {
        const key = `${activity.activity}_${activity.startTime}_${activity.orgResource}`;
        if (!uniqueActivities.has(key)) {
          uniqueActivities.set(key, activity);
        }
      });
      
      const deduplicatedActivities = Array.from(uniqueActivities.values())
        .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
      
      setCaseActivities(deduplicatedActivities);
    } else {
      setCaseActivities([]);
    }
  }, [selectedCaseId, activities]);

  // Filter cases based on search term
  const filteredCases = availableCases.filter(caseId =>
    caseId.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Auto-select first filtered case if current selection is not in filtered results
  useEffect(() => {
    if (searchTerm && filteredCases.length > 0 && !filteredCases.includes(selectedCaseId)) {
      setSelectedCaseId(filteredCases[0]);
    }
  }, [searchTerm, filteredCases, selectedCaseId]);

  // Build Plotly Sankey data
  useEffect(() => {
    if (!caseActivities || caseActivities.length === 0) {
      setPlotData(null);
      return;
    }

    try {
      // Create nodes and links for Plotly Sankey
      const nodeMap = new Map<string, number>();
      const nodes: string[] = [];
      const links: { source: number; target: number; value: number }[] = [];

      // Add nodes
      caseActivities.forEach(activity => {
        if (!nodeMap.has(activity.activity)) {
          nodeMap.set(activity.activity, nodes.length);
          nodes.push(activity.activity);
        }
      });

      // Create connections between activities only when they are truly linked based on timing
      for (let i = 0; i < caseActivities.length - 1; i++) {
        const currentActivity = caseActivities[i];
        const nextActivity = caseActivities[i + 1];
        
        // Check if activities are linked based on timing rules:
        // - nextActivity.scheduledTime - currentActivity.completeTime should be small negative, zero, or small positive  
        const currentCompleteTime = new Date(currentActivity.completeTime).getTime();
        const nextStartTime = new Date(nextActivity.startTime).getTime();
        const timeDifference = (nextStartTime - currentCompleteTime) / 1000; // Convert to seconds
        
        // Only link if timing difference indicates they are related
        // Allow small negative (up to -5 seconds for processing overlaps) or positive gaps (up to 30 seconds for realistic transitions)
        // Large negative differences (like -39 seconds) indicate they are NOT linked
        if (timeDifference >= -5 && timeDifference <= 30) {
          const sourceIndex = nodeMap.get(currentActivity.activity)!;
          const targetIndex = nodeMap.get(nextActivity.activity)!;
          
          // Find existing link or create new one
          let existingLink = links.find(l => l.source === sourceIndex && l.target === targetIndex);
          if (existingLink) {
            existingLink.value += 1;
          } else {
            links.push({
              source: sourceIndex,
              target: targetIndex,
              value: 1
            });
          }
        }
      }

      // Define colors based on common manufacturing stations
      const getNodeColor = (activity: string) => {
        const activityLower = activity.toLowerCase();
        if (activityLower.includes('unload') || activityLower.includes('upload')) return '#17a2b8'; // cyan
        if (activityLower.includes('store') || activityLower.includes('empty')) return '#17a2b8'; // cyan
        if (activityLower.includes('pick') || activityLower.includes('temper')) return '#28a745'; // green
        if (activityLower.includes('burn') || activityLower.includes('mill')) return '#ffc107'; // yellow/orange
        if (activityLower.includes('sort') || activityLower.includes('review')) return '#6f42c1'; // purple
        if (activityLower.includes('debur')) return '#e83e8c'; // pink
        return '#6c757d'; // gray
      };

      const nodeColors = nodes.map(node => getNodeColor(node));
      const linkColors = links.map(() => 'rgba(0,0,255,0.2)');

      const plotlyData = {
        type: 'sankey',
        orientation: 'h',
        arrangement: 'snap',
        node: {
          pad: 40,
          thickness: 20,
          line: {
            color: 'black',
            width: 1
          },
          label: nodes,
          color: nodeColors
        },
        link: {
          source: links.map(l => l.source),
          target: links.map(l => l.target),
          value: links.map(l => l.value),
          color: linkColors
        }
      };

      setPlotData(plotlyData);
    } catch (error) {
      console.error("Error building Sankey data:", error);
      setPlotData(null);
    }
  }, [caseActivities]);

  const layout = {
    title: {
      text: `Process Flow for Case: ${selectedCaseId}`,
      font: { size: 16 }
    },
    font: { size: 12 },
    plot_bgcolor: 'white',
    paper_bgcolor: 'white',
    margin: { l: 50, r: 50, t: 50, b: 50 }
  };

  const config = {
    displayModeBar: true,
    displaylogo: false,
    responsive: true
  } as any;

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Case-Specific Process Flow (Sankey Diagram)</span>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm">
              <Download className="h-4 w-4" />
            </Button>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Case Selection */}
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <Label htmlFor="case-search">Search Cases ({filteredCases.length} of {availableCases.length} cases)</Label>
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                id="case-search"
                placeholder="Type to filter case IDs (e.g., WF_101, WF_102)..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8"
              />
            </div>
            {searchTerm && filteredCases.length === 0 && (
              <p className="text-sm text-muted-foreground mt-1">No cases found matching "{searchTerm}"</p>
            )}
          </div>
          <div className="min-w-[200px]">
            <Label htmlFor="case-select">Selected Case</Label>
            <select
              id="case-select"
              value={selectedCaseId}
              onChange={(e) => setSelectedCaseId(e.target.value)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
            >
              <option value="">Select a case...</option>
              {filteredCases.slice(0, 50).map((caseId) => (
                <option key={caseId} value={caseId}>
                  {caseId}
                </option>
              ))}
              {filteredCases.length > 50 && (
                <option disabled>... and {filteredCases.length - 50} more cases</option>
              )}
            </select>
          </div>
        </div>

        {/* Sankey Diagram */}
        <div className="relative overflow-hidden bg-white rounded border">
          {plotData ? (
            <Plot
              data={[plotData]}
              layout={layout}
              config={config}
              style={{ width: '100%', height: '600px' }}
            />
          ) : (
            <div className="flex items-center justify-center h-96 text-muted-foreground">
              {selectedCaseId ? "No data available for this case" : "Please select a case to view the process flow"}
            </div>
          )}
        </div>

        {/* Case Summary */}
        {caseActivities.length > 0 && (
          <div className="mt-4 p-4 bg-muted rounded-lg">
            <h4 className="font-semibold mb-2">Case Summary: {selectedCaseId}</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <span className="font-medium">Total Activities:</span>
                <div>{caseActivities.length}</div>
              </div>
              <div>
                <span className="font-medium">Unique Stations:</span>
                <div>{new Set(caseActivities.map(a => a.activity)).size}</div>
              </div>
              <div>
                <span className="font-medium">Total Duration:</span>
                <div>{Math.round(caseActivities.reduce((sum, a) => sum + a.actualDurationS, 0) / 60)} min</div>
              </div>
              <div>
                <span className="font-medium">Status:</span>
                <div className="capitalize">{caseActivities[caseActivities.length - 1]?.status || 'Unknown'}</div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}