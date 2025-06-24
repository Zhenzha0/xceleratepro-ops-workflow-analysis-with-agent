import React, { useState, useRef, useEffect } from 'react';
import { useMutation } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Send, Bot, User, BarChart3, Maximize2, Minimize2, Filter, Settings } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  queryType?: string;
  visualizationData?: any;
}

interface VisualizationItem {
  id: string;
  type: string;
  title: string;
  chart: React.ReactNode;
  data?: any;
}

interface AIAssistantProps {
  appliedFilters?: any;
}

interface ProcessGPTFilters {
  scopeType: 'dataset' | 'timerange';
  datasetSize: 'full' | 'range';
  datasetOrder: 'first' | 'last';
  customLimit: number;
  activityRange: { start: number; end: number };
  timeRange: { start: string; end: string };
  equipment: string;
  status: string;
  caseIds: string[];
}

export function AIAssistant({ appliedFilters }: AIAssistantProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [visualizations, setVisualizations] = useState<VisualizationItem[]>([]);
  const [expandedModal, setExpandedModal] = useState<VisualizationItem | null>(null);
  const [showFilters, setShowFilters] = useState(true); // Show filters by default
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const sessionId = useRef(`session_${Date.now()}`);
  
  // ProcessGPT-specific filters (independent of dashboard filters)
  const [processGPTFilters, setProcessGPTFilters] = useState<ProcessGPTFilters>({
    scopeType: 'dataset',
    datasetSize: 'range',
    datasetOrder: 'first',
    customLimit: 1000,
    activityRange: { start: 1, end: 100 },
    timeRange: { start: '', end: '' },
    equipment: 'all',
    status: 'all',
    caseIds: []
  });
  
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const analyzeMutation = useMutation({
    mutationFn: async (data: { query: string; sessionId: string; filters: any }) => {
      const response = await fetch('/api/ai/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data)
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      return await response.json();
    },
    onSuccess: (data) => {
      const assistantMessage: ChatMessage = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: data.response,
        timestamp: new Date(),
        queryType: data.queryType,
        visualizationData: data.data
      };
      
      setMessages(prev => [...prev, assistantMessage]);
      
      // Automatic visualization creation with 500ms delay (following your previous project pattern)
      if (data.data && data.analysis_type) {
        console.log('Scheduling automatic visualization creation:', data.analysis_type, data.data);
        setTimeout(() => {
          createAutomaticVisualizations(data.data, data.analysis_type);
        }, 500);
      } else {
        console.log('No structured data available for visualization. Full response data:', JSON.stringify(data, null, 2));
      }
    },
    onError: (error) => {
      console.error('Analysis error:', error);
      setMessages(prev => [...prev, {
        id: `error-${Date.now()}`,
        role: 'assistant',
        content: 'I apologize, but I encountered an error while analyzing your data. Please try rephrasing your question or contact support if the issue persists.',
        timestamp: new Date()
      }]);
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() || analyzeMutation.isPending) return;

    const currentQuery = inputValue.trim();
    setInputValue('');

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: currentQuery,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    
    // Analyze with ProcessGPT-specific filters (not dashboard filters)
    console.log('AI Assistant: Sending ProcessGPT filters to backend:', processGPTFilters);
    analyzeMutation.mutate({
      query: currentQuery,
      sessionId: sessionId.current,
      filters: processGPTFilters
    });
  };

  // Create automatic visualizations based on analysis type
  const createAutomaticVisualizations = (data: any, analysisType: string) => {
    console.log('Creating automatic visualizations for type:', analysisType, data);
    
    if (analysisType === 'activity_failure_rate_analysis' && data.activityFailureRates) {
      createActivityFailureCharts(data.activityFailureRates.activities_with_most_failures || []);
    } else if (analysisType === 'failure_analysis' && data.actualFailures) {
      createFailureAnalysisCharts(data.actualFailures.commonPatterns || []);
    } else if (analysisType === 'temporal_analysis' && data.temporal_analysis) {
      createTemporalAnalysisCharts(data.temporal_analysis);
    } else if (analysisType === 'temporal_pattern_analysis' && data.temporal_analysis) {
      createTemporalAnalysisCharts(data.temporal_analysis);
    } else if (analysisType === 'anomaly_detection' && data.anomalyAnalysis) {
      createAnomalyAnalysisCharts(data.anomalyAnalysis);
    } else if (analysisType === 'bottleneck_analysis' && data.bottleneckAnalysis) {
      createBottleneckAnalysisCharts(data.bottleneckAnalysis);
    }
  };

  const createActivityFailureCharts = (activityData: any[]) => {
    console.log('Creating activity failure charts with data:', activityData);
    
    if (!activityData || activityData.length === 0) {
      console.log('No activity failure data available for charts');
      return;
    }

    const chartData = activityData.slice(0, 7).map(item => ({
      activity: item.activity.replace(/^\//, '').replace(/\//g, '/'),
      failure_rate: parseFloat(item.failure_rate) || 0,
      failed_count: item.failed_count || 0,
      total_count: item.total_count || 0
    }));

    const barChart = (
      <ResponsiveContainer width="100%" height={160}>
        <BarChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis 
            dataKey="activity" 
            tick={{ fontSize: 10 }}
            angle={-45}
            textAnchor="end"
            height={60}
          />
          <YAxis tick={{ fontSize: 10 }} />
          <Tooltip 
            formatter={(value: any, name: string) => [
              name === 'failure_rate' ? `${value}%` : value,
              name === 'failure_rate' ? 'Failure Rate' : 'Failed Count'
            ]}
            labelFormatter={(label) => `Activity: ${label}`}
          />
          <Bar dataKey="failure_rate" fill="#dc2626" name="Failure Rate %" />
        </BarChart>
      </ResponsiveContainer>
    );

    const newVisualization: VisualizationItem = {
      id: `activity-failure-${Date.now()}`,
      type: 'activity_failure_analysis',
      title: 'Activity Failure Rates Analysis',
      chart: barChart,
      data: activityData
    };

    setVisualizations(prev => [newVisualization, ...prev.slice(0, 4)]);
  };

  const createFailureAnalysisCharts = (failurePatterns: any[]) => {
    if (!failurePatterns || failurePatterns.length === 0) return;

    const chartData = failurePatterns.slice(0, 5).map(pattern => ({
      cause: pattern.description.slice(0, 30) + '...',
      count: pattern.count,
      percentage: pattern.percentage
    }));

    const pieChart = (
      <ResponsiveContainer width="100%" height={160}>
        <PieChart>
          <Pie
            data={chartData}
            dataKey="count"
            nameKey="cause"
            cx="50%"
            cy="50%"
            outerRadius={60}
            label={({ percentage }) => `${percentage.toFixed(1)}%`}
          >
            {chartData.map((_, index) => (
              <Cell key={`cell-${index}`} fill={`hsl(${index * 72}, 70%, 50%)`} />
            ))}
          </Pie>
          <Tooltip />
        </PieChart>
      </ResponsiveContainer>
    );

    const newVisualization: VisualizationItem = {
      id: `failure-causes-${Date.now()}`,
      type: 'failure_causes',
      title: 'Root Cause Analysis',
      chart: pieChart,
      data: failurePatterns
    };

    setVisualizations(prev => [newVisualization, ...prev.slice(0, 4)]);
  };

  const createTemporalAnalysisCharts = (temporalData: any) => {
    console.log('Creating temporal analysis charts with data:', temporalData);
    
    if (!temporalData || !temporalData.hour_failure_distribution) return;

    const chartData = temporalData.hour_failure_distribution.filter((h: any) => h.count > 0);

    if (chartData.length === 0) {
      console.log('No temporal failure data to visualize');
      return;
    }

    const lineChart = (
      <ResponsiveContainer width="100%" height={160}>
        <BarChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="hour" tick={{ fontSize: 10 }} />
          <YAxis tick={{ fontSize: 10 }} />
          <Tooltip 
            formatter={(value: any) => [value, 'Failures']}
            labelFormatter={(hour) => `Hour: ${hour}:00`}
          />
          <Bar dataKey="count" fill="#f59e0b" />
        </BarChart>
      </ResponsiveContainer>
    );

    const newVisualization: VisualizationItem = {
      id: `temporal-failure-${Date.now()}`,
      type: 'temporal_failure_distribution',
      title: 'Temporal Failure Distribution',
      chart: lineChart,
      data: temporalData
    };

    setVisualizations(prev => [newVisualization, ...prev.slice(0, 4)]);
  };

  const createAnomalyAnalysisCharts = (anomalyData: any) => {
    // Implement anomaly visualization
  };

  const createBottleneckAnalysisCharts = (bottleneckData: any) => {
    // Implement bottleneck visualization  
  };

  // Filter panel component
  const FilterPanel = () => (
    <Card className="mb-4 border-blue-200 bg-blue-50/50">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <Settings className="h-4 w-4" />
          ProcessGPT Analysis Scope
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label className="text-xs">Dataset Size</Label>
            <Select 
              value={processGPTFilters.datasetSize} 
              onValueChange={(value: 'full' | 'range') => 
                setProcessGPTFilters(prev => ({ ...prev, datasetSize: value }))
              }
            >
              <SelectTrigger className="h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="full">Full Dataset (3,157 activities)</SelectItem>
                <SelectItem value="range">Activity Range</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          {processGPTFilters.datasetSize === 'range' && (
            <div>
              <Label className="text-xs">Activity Range</Label>
              <div className="flex gap-1">
                <Input
                  type="number"
                  placeholder="Start"
                  value={processGPTFilters.activityRange.start}
                  onChange={(e) => setProcessGPTFilters(prev => ({
                    ...prev,
                    activityRange: { ...prev.activityRange, start: parseInt(e.target.value) || 1 }
                  }))}
                  className="h-8 text-xs"
                />
                <Input
                  type="number"
                  placeholder="End"
                  value={processGPTFilters.activityRange.end}
                  onChange={(e) => setProcessGPTFilters(prev => ({
                    ...prev,
                    activityRange: { ...prev.activityRange, end: parseInt(e.target.value) || 100 }
                  }))}
                  className="h-8 text-xs"
                />
              </div>
            </div>
          )}
        </div>
        
        <div className="flex justify-between items-center">
          <Badge variant="outline" className="text-xs">
            {processGPTFilters.datasetSize === 'range' 
              ? `Analyzing activities ${processGPTFilters.activityRange.start}-${processGPTFilters.activityRange.end}`
              : 'Analyzing full dataset'
            }
          </Badge>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setShowFilters(!showFilters)}
            className="h-6 text-xs"
          >
            {showFilters ? 'Hide' : 'Show'} Filters
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="flex flex-col h-full">
      <div className="mb-4">
        <h2 className="text-2xl font-bold mb-2 flex items-center gap-2">
          <Bot className="h-6 w-6" />
          AI Process Analyst
        </h2>
        <p className="text-muted-foreground">
          Ask questions about your manufacturing processes in plain English.
        </p>
      </div>
      
      {/* ProcessGPT-specific filters */}
      {showFilters && <FilterPanel />}

      <div className="flex flex-1 gap-4">
        {/* Chat Panel */}
        <div className="flex-1 flex flex-col">
          <ScrollArea className="flex-1 border rounded-lg">
            <div className="p-4 space-y-4">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex gap-3 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`flex gap-2 max-w-[80%] ${message.role === 'user' ? 'flex-row-reverse' : ''}`}>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                      message.role === 'user' ? 'bg-blue-600' : 'bg-green-600'
                    }`}>
                      {message.role === 'user' ? (
                        <User className="w-4 h-4 text-white" />
                      ) : (
                        <Bot className="w-4 h-4 text-white" />
                      )}
                    </div>
                    <div className={`rounded-lg p-3 ${
                      message.role === 'user' 
                        ? 'bg-blue-600 text-white' 
                        : 'bg-gray-100 text-gray-900'
                    }`}>
                      <div className="whitespace-pre-wrap text-sm">{message.content}</div>
                      <div className="text-xs opacity-70 mt-1">
                        {message.timestamp.toLocaleTimeString()}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
          </ScrollArea>

          <div className="border-t p-4 bg-muted/50">
            <Card className="bg-blue-50 border-blue-200">
              <CardContent className="p-3">
                <div className="flex justify-between items-start">
                  <p className="text-sm text-blue-800 flex-1">
                    <Bot className="inline h-4 w-4 mr-1" />
                    Hello! I'm ProcessGPT, your intelligent manufacturing analyst. I can help you understand production 
                    patterns, diagnose workflow issues, and optimize your processes. Use the filters above to focus my analysis 
                    on specific data subsets for more targeted insights!
                  </p>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setShowFilters(!showFilters)}
                    className="ml-2 h-6 w-6 p-0"
                  >
                    <Filter className="h-3 w-3" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          <form onSubmit={handleSubmit} className="p-4">
            <div className="flex gap-2">
              <Input
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="Ask me about your manufacturing data... (e.g., 'What activities have the highest failure rates?')"
                disabled={analyzeMutation.isPending}
                className="flex-1"
              />
              <Button 
                type="submit" 
                disabled={!inputValue.trim() || analyzeMutation.isPending}
                size="icon"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </form>
        </div>

        {/* Live Insights Panel */}
        {visualizations.length > 0 && (
          <div className="w-96">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <BarChart3 className="h-4 w-4" />
                  Live Insights
                  <Badge variant="secondary" className="ml-auto text-xs">
                    Auto-generated visualizations ({visualizations.length})
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {visualizations.map((viz) => (
                  <Card key={viz.id} className="border-blue-200">
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-xs text-blue-600">{viz.title}</CardTitle>
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button size="sm" variant="outline" className="h-6 w-6 p-0">
                              <Maximize2 className="h-3 w-3" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-4xl">
                            <DialogHeader>
                              <DialogTitle>{viz.title}</DialogTitle>
                            </DialogHeader>
                            <div className="h-96">
                              {viz.chart}
                            </div>
                          </DialogContent>
                        </Dialog>
                      </div>
                    </CardHeader>
                    <CardContent className="p-2">
                      <div className="h-40">
                        {viz.chart}
                      </div>
                      <div className="mt-2 text-xs text-muted-foreground">
                        {viz.type === 'activity_failure_analysis' && 'Analyzed failure rates across all manufacturing activities to identify most problematic processes'}
                        {viz.type === 'failure_causes' && 'Root cause analysis showing distribution of actual failure types'}
                        {viz.type === 'temporal_failure_distribution' && 'Analyzed temporal patterns of failures across different hours to identify peak occurrence times'}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}

export default AIAssistant;