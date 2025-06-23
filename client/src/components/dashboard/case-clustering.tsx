import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown, ChevronRight, BarChart3, Clock, AlertTriangle, TrendingUp } from "lucide-react";
import Plot from 'react-plotly.js';
import type { CaseClusterAnalysis, CaseCluster } from "@shared/schema";

interface CaseClusteringProps {
  filters: any;
}

export default function CaseClustering({ filters }: CaseClusteringProps) {
  const [maxClusters, setMaxClusters] = useState(10);
  const [expandedClusters, setExpandedClusters] = useState<Set<number>>(new Set());

  const { data: clusterData, isLoading, refetch } = useQuery<CaseClusterAnalysis>({
    queryKey: ['/api/case-clustering', { 
      mode: filters.scopeType,
      maxClusters,
      start: 0,
      n: filters.scopeType === 'dataset' ? filters.customLimit : 100,
      startTime: filters.timeRange?.start,
      endTime: filters.timeRange?.end
    }],
    enabled: false // Only fetch when analyze button is clicked
  });

  const handleAnalyze = () => {
    refetch();
  };

  const toggleClusterExpansion = (clusterId: number) => {
    const newExpanded = new Set(expandedClusters);
    if (newExpanded.has(clusterId)) {
      newExpanded.delete(clusterId);
    } else {
      newExpanded.add(clusterId);
    }
    setExpandedClusters(newExpanded);
  };

  const getSeverityColor = (anomalyRate: number) => {
    if (anomalyRate > 10) return 'bg-red-100 text-red-800';
    if (anomalyRate > 5) return 'bg-yellow-100 text-yellow-800';
    return 'bg-green-100 text-green-800';
  };

  const getImpactColor = (avgTime: number) => {
    if (avgTime > 300) return 'text-red-600';
    if (avgTime > 120) return 'text-yellow-600';
    return 'text-green-600';
  };

  // Prepare timeline chart data
  const timelineChartData = clusterData?.timelineData ? [{
    x: clusterData.timelineData.map(d => d.timestamp),
    y: clusterData.timelineData.map(d => d.activity),
    mode: 'markers' as const,
    type: 'scatter' as const,
    marker: {
      size: clusterData.timelineData.map(d => Math.max(4, Math.min(20, d.duration / 10))),
      color: clusterData.timelineData.map(d => d.isAnomaly ? '#ef4444' : '#3b82f6'),
      opacity: 0.7
    },
    text: clusterData.timelineData.map(d => 
      `Case: ${d.caseId}<br>Activity: ${d.activity}<br>Duration: ${d.duration.toFixed(1)}s<br>Cluster: ${d.clusterId}${d.isAnomaly ? '<br><b>ANOMALY</b>' : ''}`
    ),
    hovertemplate: '%{text}<extra></extra>'
  }] : [];

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Case Clustering Analysis</h1>
        <p className="text-gray-600 mt-1">
          Group manufacturing cases by workflow patterns to identify process variations and performance insights
        </p>
      </div>

      {/* Controls */}
      <Card>
        <CardHeader>
          <CardTitle>Clustering Parameters</CardTitle>
          <CardDescription>
            Configure clustering analysis settings
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Max Clusters: {maxClusters}</label>
            <Slider
              value={[maxClusters]}
              onValueChange={(value) => setMaxClusters(value[0])}
              max={20}
              min={3}
              step={1}
              className="w-64"
            />
          </div>
          <Button onClick={handleAnalyze} disabled={isLoading}>
            {isLoading ? 'Analyzing...' : 'Analyze Clusters'}
          </Button>
        </CardContent>
      </Card>

      {/* Results Summary */}
      {clusterData && (
        <>
          <div className="grid grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center space-x-2">
                  <BarChart3 className="h-5 w-5 text-blue-600" />
                  <div>
                    <p className="text-2xl font-bold text-blue-600">{clusterData.totalCases}</p>
                    <p className="text-sm text-gray-600">Total Cases</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center space-x-2">
                  <TrendingUp className="h-5 w-5 text-purple-600" />
                  <div>
                    <p className="text-2xl font-bold text-purple-600">{clusterData.totalPatterns}</p>
                    <p className="text-sm text-gray-600">Process Patterns</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center space-x-2">
                  <Clock className="h-5 w-5 text-green-600" />
                  <div>
                    <p className="text-2xl font-bold text-green-600">{clusterData.coverage.toFixed(1)}%</p>
                    <p className="text-sm text-gray-600">Coverage</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center space-x-2">
                  <AlertTriangle className="h-5 w-5 text-orange-600" />
                  <div>
                    <p className="text-2xl font-bold text-orange-600">{clusterData.anomalyRate.toFixed(1)}%</p>
                    <p className="text-sm text-gray-600">Anomaly Rate</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Pattern Clusters */}
          <Card>
            <CardHeader>
              <CardTitle>📊 Process Pattern Analysis Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {clusterData.clusters.map((cluster: CaseCluster, index: number) => (
                  <div key={cluster.clusterId} className="border rounded-lg p-4 bg-gray-50">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h3 className="font-semibold text-lg">Pattern {cluster.clusterId} ({cluster.caseCount} cases)</h3>
                        <div className="flex items-center space-x-4 mt-1">
                          <Badge className={getSeverityColor(cluster.anomalyRate)}>
                            {cluster.anomalyRate.toFixed(1)}% Anomaly Rate
                          </Badge>
                          <span className="text-sm text-gray-600">
                            Coverage: {cluster.coverage.toFixed(1)}%
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="mb-3">
                      <p className="text-sm text-gray-700 font-medium">Process Flow:</p>
                      <p className="text-sm bg-white p-2 rounded border mt-1 font-mono">
                        {cluster.processSignature}
                      </p>
                    </div>

                    <div className="grid grid-cols-4 gap-4 text-sm">
                      <div>
                        <span className="text-gray-500">Avg Processing:</span>
                        <span className="ml-2 font-medium">{cluster.avgProcessingTime.toFixed(1)}s</span>
                      </div>
                      <div>
                        <span className="text-gray-500">Avg Duration:</span>
                        <span className="ml-2 font-medium">{(cluster.avgDuration / 60).toFixed(1)}m</span>
                      </div>
                      <div>
                        <span className="text-gray-500">Anomalies:</span>
                        <span className="ml-2 font-medium">{cluster.anomalyCount}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">Bottleneck:</span>
                        <span className={`ml-2 font-medium ${getImpactColor(cluster.bottleneckAvgTime)}`}>
                          {cluster.bottleneckActivity.split('/').pop() || 'None'}
                        </span>
                      </div>
                    </div>

                    <Collapsible 
                      open={expandedClusters.has(cluster.clusterId)} 
                      onOpenChange={() => toggleClusterExpansion(cluster.clusterId)}
                    >
                      <CollapsibleTrigger asChild>
                        <Button variant="ghost" size="sm" className="mt-3">
                          {expandedClusters.has(cluster.clusterId) ? (
                            <ChevronDown className="h-4 w-4" />
                          ) : (
                            <ChevronRight className="h-4 w-4" />
                          )}
                          <span className="ml-1">View Cases</span>
                        </Button>
                      </CollapsibleTrigger>
                      <CollapsibleContent className="mt-3">
                        <div className="bg-white p-3 rounded border">
                          <p className="text-sm font-medium mb-2">Case IDs:</p>
                          <div className="flex flex-wrap gap-1">
                            {cluster.caseIds.map((caseId: string) => (
                              <Badge key={caseId} variant="outline" className="text-xs">
                                {caseId}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      </CollapsibleContent>
                    </Collapsible>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Timeline Visualization */}
          {timelineChartData.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Activity Timeline</CardTitle>
                <CardDescription>
                  Chronological view of activities across clusters. Red markers indicate anomalies.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-96">
                  <Plot
                    data={timelineChartData}
                    layout={{
                      xaxis: { 
                        title: { text: 'Time' },
                        type: 'date'
                      },
                      yaxis: { 
                        title: { text: 'Activity' },
                        categoryorder: 'category ascending'
                      },
                      showlegend: false,
                      hovermode: 'closest',
                      margin: { l: 150, r: 50, t: 20, b: 60 }
                    }}
                    config={{ 
                      displayModeBar: true,
                      displaylogo: false,
                      modeBarButtonsToRemove: ['pan2d', 'lasso2d', 'select2d']
                    }}
                    style={{ width: '100%', height: '100%' }}
                  />
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}

      {!clusterData && !isLoading && (
        <Card>
          <CardContent className="text-center py-12">
            <p className="text-gray-500">Click "Analyze Clusters" to generate process pattern analysis</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}