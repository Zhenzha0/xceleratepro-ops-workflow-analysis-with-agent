import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { useCaseComparison } from "@/hooks/use-dashboard-data";
import { ProcessCase } from "@shared/schema";
import { useEffect, useState } from "react";
import Plot from 'react-plotly.js';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import ProcessMap from "./process-map";

interface CaseComparisonProps {
  cases?: ProcessCase[];
}

export default function CaseComparison({ cases }: CaseComparisonProps) {
  const [selectedCaseA, setSelectedCaseA] = useState<string>('');
  const [selectedCaseB, setSelectedCaseB] = useState<string>('');
  const [showComparison, setShowComparison] = useState<boolean>(false);

  // Fetch comparison data when both cases are selected
  const { data: comparisonData, isLoading, error } = useCaseComparison(
    showComparison ? selectedCaseA : undefined,
    showComparison ? selectedCaseB : undefined
  );

  const generateComparison = () => {
    if (selectedCaseA && selectedCaseB) {
      setShowComparison(true);
    }
  };

  const calculateCaseMetrics = (caseData: ProcessCase & { activities: any[] }) => {
    const activities = caseData.activities || [];
    const uniqueActivities = new Set(activities.map(a => a.activity)).size;
    const totalActivities = activities.length;
    const duration = caseData.totalDurationS || 0;
    const failures = caseData.failureCount || 0;
    const anomalies = caseData.anomalyCount || 0;

    // Calculate average processing time
    const totalProcessingTime = activities.reduce((sum, activity) => {
      return sum + (activity.actualDurationS || 0);
    }, 0);
    const avgProcessingTime = totalActivities > 0 ? totalProcessingTime / totalActivities : 0;

    return {
      totalActivities,
      uniqueActivities,
      duration,
      failures,
      anomalies,
      avgProcessingTime
    };
  };

  const getCommonAndSpecificActivities = (caseA: any, caseB: any) => {
    const activitiesA = new Set(caseA.activities.map((a: any) => a.activity));
    const activitiesB = new Set(caseB.activities.map((a: any) => a.activity));
    
    const commonActivities = Array.from(activitiesA).filter(activity => activitiesB.has(activity));
    const specificToA = Array.from(activitiesA).filter(activity => !activitiesB.has(activity));
    const specificToB = Array.from(activitiesB).filter(activity => !activitiesA.has(activity));

    return { commonActivities, specificToA, specificToB };
  };

  const renderCasePanel = (caseData: ProcessCase & { activities: any[] }, title: string) => {
    const metrics = calculateCaseMetrics(caseData);
    
    // Get unique activities (remove duplicates like multiple "vgr/pick up and transport")
    const uniqueActivities = Array.from(new Set(caseData.activities.map(a => a.activity)));
    
    return (
      <Card className="bg-blue-50 border-blue-200">
        <CardHeader className="bg-blue-600 text-white">
          <CardTitle className="flex items-center gap-2">
            <span className="text-lg">📊</span>
            {title}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4">
      <div className="space-y-3">
            <div>
              <strong>Total Activities:</strong> {metrics.totalActivities}
            </div>
            <div>
              <strong>Unique Activities:</strong> {metrics.uniqueActivities}
            </div>
            <div>
              <strong>Duration:</strong> {metrics.duration.toFixed(1)} seconds
            </div>
            <div>
              <strong>Failures:</strong> {metrics.failures}
            </div>
            <div>
              <strong>Anomalies:</strong> {metrics.anomalies}
            </div>
          </div>

          <Separator className="my-4" />

          <div>
            <h4 className="font-semibold mb-2">Activities:</h4>
            <div className="max-h-40 overflow-y-auto space-y-1">
              {uniqueActivities.map((activity, index) => (
                <div key={index} className="text-sm">
                  {index + 1}. {activity}
                </div>
              ))}
            </div>
          </div>

          <Separator className="my-4" />

          <div className="bg-green-50 p-3 rounded">
            <h5 className="font-medium mb-1">Processing Info:</h5>
            <div className="text-sm">
              <div>Total: {metrics.duration.toFixed(0)}s | Avg: {metrics.avgProcessingTime.toFixed(1)}s</div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  const renderComparisonSummary = (caseA: any, caseB: any) => {
    const metricsA = calculateCaseMetrics(caseA);
    const metricsB = calculateCaseMetrics(caseB);
    const { commonActivities, specificToA, specificToB } = getCommonAndSpecificActivities(caseA, caseB);

    // Prepare chart data
    const chartData = [
      {
        name: 'Total Activities',
        [caseA.caseId]: metricsA.totalActivities,
        [caseB.caseId]: metricsB.totalActivities
      },
      {
        name: 'Unique Activities', 
        [caseA.caseId]: metricsA.uniqueActivities,
        [caseB.caseId]: metricsB.uniqueActivities
      },
      {
        name: 'Duration (s)',
        [caseA.caseId]: Math.round(metricsA.duration),
        [caseB.caseId]: Math.round(metricsB.duration)
      },
      {
        name: 'Failures',
        [caseA.caseId]: metricsA.failures,
        [caseB.caseId]: metricsB.failures
      },
      {
        name: 'Anomalies',
        [caseA.caseId]: metricsA.anomalies,
        [caseB.caseId]: metricsB.anomalies
      }
    ];

    return (
      <div className="space-y-6">
        <Card className="bg-orange-50 border-orange-200">
          <CardHeader className="bg-orange-600 text-white">
            <CardTitle className="flex items-center gap-2">
              <span className="text-lg">📊</span>
              Comparison Summary
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            <h4 className="font-semibold mb-3">Key Metrics Comparison:</h4>
            
            <div className="overflow-x-auto">
              <table className="w-full border-collapse border border-gray-300">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="border border-gray-300 p-2 text-left">Metric</th>
                    <th className="border border-gray-300 p-2 text-center">{caseA.caseId}</th>
                    <th className="border border-gray-300 p-2 text-center">{caseB.caseId}</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="border border-gray-300 p-2 font-medium">Total Activities</td>
                    <td className="border border-gray-300 p-2 text-center">{metricsA.totalActivities}</td>
                    <td className="border border-gray-300 p-2 text-center">{metricsB.totalActivities}</td>
                  </tr>
                  <tr>
                    <td className="border border-gray-300 p-2 font-medium">Unique Activities</td>
                    <td className="border border-gray-300 p-2 text-center">{metricsA.uniqueActivities}</td>
                    <td className="border border-gray-300 p-2 text-center">{metricsB.uniqueActivities}</td>
                  </tr>
                  <tr>
                    <td className="border border-gray-300 p-2 font-medium">Duration (seconds)</td>
                    <td className="border border-gray-300 p-2 text-center">{metricsA.duration.toFixed(1)}</td>
                    <td className="border border-gray-300 p-2 text-center">{metricsB.duration.toFixed(1)}</td>
                  </tr>
                  <tr>
                    <td className="border border-gray-300 p-2 font-medium">Failures</td>
                    <td className="border border-gray-300 p-2 text-center">{metricsA.failures}</td>
                    <td className="border border-gray-300 p-2 text-center">{metricsB.failures}</td>
                  </tr>
                  <tr>
                    <td className="border border-gray-300 p-2 font-medium">Anomalies</td>
                    <td className="border border-gray-300 p-2 text-center">{metricsA.anomalies}</td>
                    <td className="border border-gray-300 p-2 text-center">{metricsB.anomalies}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="mt-4 space-y-3">
              <div>
                <strong>Common Activities:</strong>
                <p className="text-sm text-gray-600">
                  {commonActivities.join(', ')}
                </p>
              </div>

              <div>
                <strong>Case-Specific Activities:</strong>
                <div className="mt-2 space-y-2">
                  <div>
                    <Badge variant="outline" className="mr-2">{caseA.caseId}:</Badge>
                    <span className="text-sm">{specificToA.join(', ') || 'None'}</span>
                  </div>
                  <div>
                    <Badge variant="outline" className="mr-2">{caseB.caseId}:</Badge>
                    <span className="text-sm">{specificToB.join(', ') || 'None'}</span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="bg-white border rounded-lg p-4">
            <h4 className="font-medium mb-3 text-center">Total Activities Comparison</h4>
            <ResponsiveContainer width="100%" height={150}>
              <BarChart data={[chartData[0]]}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" hide />
                <YAxis />
                <Tooltip />
                <Bar dataKey={caseA.caseId} fill="#8884d8" />
                <Bar dataKey={caseB.caseId} fill="#82ca9d" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-white border rounded-lg p-4">
            <h4 className="font-medium mb-3 text-center">Unique Activities Comparison</h4>
            <ResponsiveContainer width="100%" height={150}>
              <BarChart data={[chartData[1]]}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" hide />
                <YAxis />
                <Tooltip />
                <Bar dataKey={caseA.caseId} fill="#8884d8" />
                <Bar dataKey={caseB.caseId} fill="#82ca9d" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-white border rounded-lg p-4">
            <h4 className="font-medium mb-3 text-center">Duration Comparison</h4>
            <ResponsiveContainer width="100%" height={150}>
              <BarChart data={[chartData[2]]}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" hide />
                <YAxis />
                <Tooltip />
                <Bar dataKey={caseA.caseId} fill="#8884d8" />
                <Bar dataKey={caseB.caseId} fill="#82ca9d" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="bg-white border rounded-lg p-4">
            <h4 className="font-medium mb-3 text-center">Failures Comparison</h4>
            <ResponsiveContainer width="100%" height={150}>
              <BarChart data={[chartData[3]]}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" hide />
                <YAxis />
                <Tooltip />
                <Bar dataKey={caseA.caseId} fill="#8884d8" />
                <Bar dataKey={caseB.caseId} fill="#82ca9d" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-white border rounded-lg p-4">
            <h4 className="font-medium mb-3 text-center">Anomalies Comparison</h4>
            <ResponsiveContainer width="100%" height={150}>
              <BarChart data={[chartData[4]]}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" hide />
                <YAxis />
                <Tooltip />
                <Bar dataKey={caseA.caseId} fill="#8884d8" />
                <Bar dataKey={caseB.caseId} fill="#82ca9d" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    );
  };

  // Simple Sankey component for case comparison
  const SimpleSankey = ({ activities, caseId }: { activities: any[], caseId: string }) => {
    const [plotData, setPlotData] = useState<any>(null);

    useEffect(() => {
      if (!activities || activities.length === 0) {
        setPlotData(null);
        return;
      }

      try {
        // Create nodes and links for Plotly Sankey
        const nodeMap = new Map<string, number>();
        const nodes: string[] = [];
        const links: { source: number; target: number; value: number }[] = [];

        // Deduplicate activities first
        const uniqueActivities = new Map();
        activities.forEach(activity => {
          const key = `${activity.activity}_${activity.startTime}_${activity.orgResource}`;
          if (!uniqueActivities.has(key)) {
            uniqueActivities.set(key, activity);
          }
        });
        
        const deduplicatedActivities = Array.from(uniqueActivities.values())
          .sort((a: any, b: any) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());

        // Add nodes
        deduplicatedActivities.forEach(activity => {
          if (!nodeMap.has(activity.activity)) {
            nodeMap.set(activity.activity, nodes.length);
            nodes.push(activity.activity);
          }
        });

        // Create connections between activities based on timing
        for (let i = 0; i < deduplicatedActivities.length - 1; i++) {
          const currentActivity = deduplicatedActivities[i];
          const nextActivity = deduplicatedActivities[i + 1];
          
          const currentCompleteTime = new Date(currentActivity.completeTime).getTime();
          const nextStartTime = new Date(nextActivity.startTime).getTime();
          const timeDifference = (nextStartTime - currentCompleteTime) / 1000;
          
          // Only link if timing indicates they are connected (allow -5 to +30 seconds)
          if (timeDifference >= -5 && timeDifference <= 30) {
            const sourceIndex = nodeMap.get(currentActivity.activity)!;
            const targetIndex = nodeMap.get(nextActivity.activity)!;
            
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

        // Define colors based on manufacturing stations
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
            pad: 15,
            thickness: 15,
            line: {
              color: 'black',
              width: 1
            },
            label: nodes.map(node => node.replace(/^\//, '')), // Remove leading slash
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
    }, [activities, caseId]);

    const layout = {
      title: {
        text: `${caseId} Sankey Diagram`,
        font: { size: 14 }
      },
      font: { size: 10 },
      plot_bgcolor: 'white',
      paper_bgcolor: 'white',
      margin: { l: 30, r: 30, t: 40, b: 20 }
    };

    const config = {
      displayModeBar: false,
      responsive: true
    } as any;

    return (
      <div className="bg-white rounded border">
        {plotData ? (
          <Plot
            data={[plotData]}
            layout={layout}
            config={config}
            style={{ width: '100%', height: '300px' }}
          />
        ) : (
          <div className="flex items-center justify-center h-64 text-gray-500">
            No Sankey data available for {caseId}
          </div>
        )}
    </div>
  );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Case Comparison Analysis</CardTitle>
        <p className="text-sm text-gray-600">Compare workflow patterns between different manufacturing cases</p>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Case A</label>
            <Select value={selectedCaseA} onValueChange={setSelectedCaseA}>
              <SelectTrigger>
                <SelectValue placeholder="Select case A" />
              </SelectTrigger>
              <SelectContent>
                {cases?.map(processCase => (
                  <SelectItem key={processCase.caseId} value={processCase.caseId}>
                    {processCase.caseId} ({processCase.status})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Case B</label>
            <Select value={selectedCaseB} onValueChange={setSelectedCaseB}>
              <SelectTrigger>
                <SelectValue placeholder="Select case B" />
              </SelectTrigger>
              <SelectContent>
                {cases?.map(processCase => (
                  <SelectItem key={processCase.caseId} value={processCase.caseId}>
                    {processCase.caseId} ({processCase.status})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        
        <div className="flex justify-center mb-6">
          <Button 
            className="bg-primary hover:bg-primary/90"
            disabled={!selectedCaseA || !selectedCaseB || isLoading}
            onClick={generateComparison}
          >
            {isLoading ? "Generating..." : "Generate Detailed Comparison Report"}
          </Button>
        </div>

        {error && (
          <div className="text-red-600 text-center mb-4">
            Error loading comparison data. Please try again.
          </div>
        )}

        {comparisonData && showComparison && (
          <div className="space-y-6">
            {/* Case Panels */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {renderCasePanel(comparisonData.caseA, `Case ${comparisonData.caseA.caseId}`)}
              {renderCasePanel(comparisonData.caseB, `Case ${comparisonData.caseB.caseId}`)}
            </div>

            {/* Comparison Summary */}
            {renderComparisonSummary(comparisonData.caseA, comparisonData.caseB)}

            {/* Sankey Diagrams for Both Cases */}
            <div className="space-y-6">
              <h2 className="text-xl font-bold text-center">Sankey Diagrams Comparison</h2>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-lg font-semibold mb-4 text-center">Case {comparisonData.caseA.caseId} - Process Flow</h3>
                  <SimpleSankey 
                    activities={comparisonData.caseA.activities} 
                    caseId={comparisonData.caseA.caseId}
                  />
                </div>
                <div>
                  <h3 className="text-lg font-semibold mb-4 text-center">Case {comparisonData.caseB.caseId} - Process Flow</h3>
                  <SimpleSankey 
                    activities={comparisonData.caseB.activities} 
                    caseId={comparisonData.caseB.caseId}
                  />
                </div>
              </div>
            </div>

            {/* Process Maps for Both Cases */}
            <div className="space-y-6">
              <h2 className="text-xl font-bold text-center">Process Maps Comparison</h2>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-lg font-semibold mb-4 text-center">Process Map - Case {comparisonData.caseA.caseId}</h3>
                  <ProcessMap 
                    filteredData={{ 
                      activities: comparisonData.caseA.activities.map((a: any) => ({
                        ...a,
                        caseId: comparisonData.caseA.caseId
                      }))
                    }}
                  />
                </div>
                <div>
                  <h3 className="text-lg font-semibold mb-4 text-center">Process Map - Case {comparisonData.caseB.caseId}</h3>
                  <ProcessMap 
                    filteredData={{ 
                      activities: comparisonData.caseB.activities.map((a: any) => ({
                        ...a,
                        caseId: comparisonData.caseB.caseId
                      }))
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
