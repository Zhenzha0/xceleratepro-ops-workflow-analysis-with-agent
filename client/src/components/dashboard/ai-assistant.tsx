import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useMutation } from '@tanstack/react-query';
import { BarChart3, Bot, Cloud, Cpu, Filter, Maximize2, Send, TrendingUp, User, Zap } from 'lucide-react';
import React, { useEffect, useRef, useState } from 'react';
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart as RechartsPieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  queryType?: string;
  suggestedActions?: string[];
  visualizationData?: any;
}

interface Insight {
  id: string;
  title: string;
  chart: React.ReactNode;
  icon: React.ComponentType<any>;
  description?: string;
}

interface AIAssistantProps {
  appliedFilters?: any;
}

interface AIServiceStatus {
  useLocalAI: boolean;
  currentService: string;
  localAIReady: boolean;
}

export default function AIAssistant({ appliedFilters }: AIAssistantProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: "Hello! I'm ProcessGPT, your intelligent manufacturing analyst. I can help you understand production patterns, diagnose workflow issues, and optimize your processes. When you apply filters on the dashboard, I'll analyze only your filtered data for more targeted insights!",
      timestamp: new Date()
    }
  ]);
  const [currentQuery, setCurrentQuery] = useState('');
  const sessionId = useRef(Date.now().toString());
  const [insights, setInsights] = useState<Insight[]>([]);
  const [expandedInsight, setExpandedInsight] = useState<Insight | null>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  // Add state for AI service status
  const [aiServiceStatus, setAiServiceStatus] = useState<AIServiceStatus>({
    useLocalAI: false,
    currentService: 'OpenAI GPT-4o',
    localAIReady: false
  });

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollAreaRef.current) {
      const scrollContainer = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight;
      }
    }
  }, [messages]);

  // Create failure analysis charts
  const createFailureAnalysisCharts = (data: any) => {
    const chartData = data.failure_categories.map((category: any, index: number) => ({
      name: category.cause,
      value: parseInt(category.count),
      percentage: category.percentage
    }));

    const colors = ['#dc2626', '#ea580c', '#d97706', '#65a30d', '#3b82f6'];

    const pieChart = (
      <ResponsiveContainer width="100%" height="100%">
        <RechartsPieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            innerRadius={40}
            outerRadius={80}
            paddingAngle={5}
            dataKey="value"
            label={({ name, percentage }) => `${name}: ${percentage}%`}
          >
            {chartData.map((entry: any, index: number) => (
              <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
            ))}
          </Pie>
          <Tooltip formatter={(value: any, name: any) => [`${value} failures`, name]} />
        </RechartsPieChart>
      </ResponsiveContainer>
    );

    const newInsight: Insight = {
      id: Date.now().toString(),
      title: 'Failure Root Causes Analysis',
      chart: pieChart,
      icon: BarChart3,
      description: `Primary Cause: ${chartData[0]?.name} (${chartData[0]?.percentage}%) - Analyzed failure descriptions in unsatisfied_condition_description to categorize root causes`
    };

    setInsights(prev => [...prev, newInsight]);
  };

  // Create activity failure charts
  const createActivityFailureCharts = (data: any) => {
    const chartData = data.activities_with_most_failures.slice(0, 5).map((activity: any, index: number) => ({
      name: activity.activity_name || activity.activity,
      value: parseFloat(activity.failure_rate || activity.rate || 0),
      failures: activity.failure_count || activity.failures || 0,
      total: activity.total_count || activity.total || 0
    }));

    const colors = ['#dc2626', '#ea580c', '#d97706', '#65a30d', '#3b82f6'];

    const barChart = (
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="name" fontSize={10} angle={-45} textAnchor="end" height={40} />
          <YAxis fontSize={11} label={{ value: 'Failure Rate %', angle: -90, position: 'insideLeft' }} />
          <Tooltip formatter={(value: any, name: any, props: any) => [`${value}% (${props.payload.failures}/${props.payload.total})`, 'Failure Rate']} />
          <Bar dataKey="value" radius={[2, 2, 0, 0]}>
            {chartData.map((entry: any, index: number) => (
              <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    );

    const newInsight: Insight = {
      id: Date.now().toString(),
      title: 'Activity Failure Rates Analysis',
      chart: barChart,
      icon: BarChart3,
      description: `Highest Rate: ${chartData[0]?.name} (${chartData[0]?.value}%) - Analyzed failure rates across all manufacturing activities to identify most problematic processes`
    };

    setInsights(prev => [...prev, newInsight]);
  };

  // Create anomaly analysis charts
  const createAnomalyAnalysisCharts = (data: any) => {
    const chartData = data.activities_with_most_anomalies.map((item: any) => ({
      hour: `${item.hour.toString().padStart(2, '0')}:00`,
      anomalies: item.count
    }));

    const barChart = (
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="hour" fontSize={10} />
          <YAxis fontSize={11} label={{ value: 'Anomalies', angle: -90, position: 'insideLeft' }} />
          <Tooltip />
          <Bar dataKey="anomalies" fill="#ef4444" />
        </BarChart>
      </ResponsiveContainer>
    );

    const newInsight: Insight = {
      id: Date.now().toString(),
      title: 'Anomaly Concentration by Hour',
      chart: barChart,
      icon: BarChart3,
      description: 'Analyzed temporal patterns of anomalous activities to identify peak occurrence times'
    };

    setInsights(prev => [...prev, newInsight]);
  };

  // Create temporal analysis charts
  const createTemporalAnalysisCharts = (data: any) => {
    const chartData = data.temporal_analysis.hour_failure_distribution.map((item: any) => ({
      hour: `${item.hour.toString().padStart(2, '0')}:00`,
      failures: item.count
    }));

    const lineChart = (
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="hour" fontSize={10} />
          <YAxis fontSize={11} label={{ value: 'Failures', angle: -90, position: 'insideLeft' }} />
          <Tooltip />
          <Bar dataKey="failures" fill="#3b82f6" />
        </BarChart>
      </ResponsiveContainer>
    );

    const newInsight: Insight = {
      id: Date.now().toString(),
      title: 'Temporal Failure Distribution',
      chart: lineChart,
      icon: BarChart3,
      description: 'Analyzed temporal patterns of failures across different hours to identify peak occurrence times'
    };

    setInsights(prev => [...prev, newInsight]);
  };

  // Create bottleneck analysis charts
  const createBottleneckAnalysisCharts = (data: any) => {
    // Implementation for bottleneck analysis charts
  };

  // Automatic visualization creation function (following your previous project architecture)
  const createAutomaticVisualizations = (data: any, analysisType: string) => {
    console.log(`Creating automatic visualizations for type: ${analysisType}`, data);
    
    // Map analysis types to visualization functions (match backend analysis_type values)
    if ((analysisType === "failure_analysis" || analysisType === "failure_cause_analysis") && data.failure_categories) {
      console.log('Creating failure analysis charts with data:', data.failure_categories);
      createFailureAnalysisCharts(data);
    } else if ((analysisType === "activity_failure_analysis" || analysisType === "activity_failure_rate_analysis") && data.activities_with_most_failures) {
      console.log('Creating activity failure charts with data:', data.activities_with_most_failures);
      createActivityFailureCharts(data);
    } else if ((analysisType === "anomaly_detection" || analysisType === "anomaly_analysis") && data.activities_with_most_anomalies) {
      console.log('Creating anomaly analysis charts with data:', data.activities_with_most_anomalies);
      createAnomalyAnalysisCharts(data);
    } else if ((analysisType === "temporal_analysis" || analysisType === "temporal_pattern_analysis") && data.temporal_analysis) {
      console.log('Creating temporal analysis charts with data:', data.temporal_analysis);
      createTemporalAnalysisCharts(data);
    } else if (analysisType === "bottleneck_analysis" && data.bottleneck_activities) {
      console.log('Creating bottleneck analysis charts with data:', data.bottleneck_activities);
      createBottleneckAnalysisCharts(data);
    } else {
      console.log('No matching visualization type found for:', analysisType);
      console.log('Available data keys:', Object.keys(data || {}));
      console.log('Full data structure:', JSON.stringify(data, null, 2));
    }
  };

  // Check if local AI is available
  const getLocalAIService = () => {
    return (window as any).localAIService;
  };

  // Local AI analysis function
  const analyzeWithLocalAI = async (query: string, filters: any) => {
    const localAI = getLocalAIService();
    if (!localAI || !localAI.isReady) {
      throw new Error('Local AI service not initialized');
    }

    const prompt = `You are ProcessGPT, an intelligent manufacturing process analyst.

Query: "${query}"

Applied Filters: ${JSON.stringify(filters, null, 2)}

Please provide a comprehensive analysis that includes:
1. **Executive Summary**: A brief overview of your findings
2. **Key Metrics**: Relevant performance indicators and statistics  
3. **Critical Issues**: Any problems or anomalies identified
4. **Recommendations**: Specific, actionable suggestions for improvement

Focus on practical insights for manufacturing optimization with specific data points when possible.`;

    const response = await localAI.llmInference.generateResponse(prompt);
    
    return {
      response,
      queryType: 'general_analysis',
      suggestedActions: ['Review findings', 'Implement recommendations', 'Monitor key metrics'],
      data: {},
      analysis_type: 'general_analysis'
    };
  };

  const analyzeMutation = useMutation({
    mutationFn: async ({ query, sessionId, filters }: { query: string; sessionId: string; filters: any }) => {
      // Check AI service status first
      try {
        const statusResponse = await fetch('/api/ai/status');
        const status = statusResponse.ok ? await statusResponse.json() : { useLocalAI: false };

        if (status.useLocalAI) {
          // Try local AI first
          try {
            console.log('Using local MediaPipe AI for analysis...');
            return await analyzeWithLocalAI(query, filters);
          } catch (error) {
            console.warn('Local AI failed, falling back to server analysis:', error);
            // Fall back to server-side analysis
          }
        }
      } catch (error) {
        console.warn('Could not check AI status, using server analysis:', error);
      }

      // Use server-side analysis (OpenAI or fallback)
      const response = await fetch('/api/ai/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, sessionId, filters })
      });
      if (!response.ok) throw new Error('Analysis failed');
      return response.json();
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
    if (!currentQuery.trim() || analyzeMutation.isPending) return;

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: currentQuery,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    
    // Analyze with applied filters
    analyzeMutation.mutate({
      query: currentQuery,
      sessionId: sessionId.current,
      filters: appliedFilters || {}
    });

    setCurrentQuery('');
  };

  // Fetch AI service status
  const fetchAIServiceStatus = async () => {
    try {
      const response = await fetch('/api/ai/status');
      if (response.ok) {
        const data = await response.json();
        setAiServiceStatus(data);
      }
    } catch (error) {
      console.error('Failed to fetch AI service status:', error);
    }
  };

  // Fetch status on component mount and periodically
  useEffect(() => {
    fetchAIServiceStatus();
    const interval = setInterval(fetchAIServiceStatus, 10000); // Check every 10 seconds
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex h-full">
      {/* Chat Section */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* AI Service Status Indicator */}
        <div className={`px-4 py-2 border-b border-gray-200 dark:border-gray-700 ${
          aiServiceStatus.useLocalAI 
            ? 'bg-green-50 dark:bg-green-900/20' 
            : 'bg-blue-50 dark:bg-blue-900/20'
        }`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {aiServiceStatus.useLocalAI ? (
                <>
                  <Cpu className="h-4 w-4 text-green-600" />
                  <span className="text-sm font-medium text-green-800 dark:text-green-300">
                    🤖 Local AI Active
                  </span>
                </>
              ) : (
                <>
                  <Cloud className="h-4 w-4 text-blue-600" />
                  <span className="text-sm font-medium text-blue-800 dark:text-blue-300">
                    ☁️ OpenAI Active
                  </span>
                </>
              )}
              <Badge 
                variant="secondary"
                className={`text-xs ${
                  aiServiceStatus.useLocalAI 
                    ? 'bg-green-600 text-white' 
                    : 'bg-blue-600 text-white'
                }`}
              >
                {aiServiceStatus.useLocalAI ? 'OFFLINE' : 'ONLINE'}
              </Badge>
            </div>
            <div className="flex items-center gap-2">
              {aiServiceStatus.useLocalAI && (
                <div className="flex items-center gap-1">
                  <Zap className="h-3 w-3 text-green-600" />
                  <span className="text-xs text-green-700 dark:text-green-400">
                    Private & Fast
                  </span>
                </div>
              )}
              <div className={`w-2 h-2 rounded-full ${
                aiServiceStatus.localAIReady ? 'bg-green-500' : 'bg-yellow-500'
              }`}></div>
            </div>
          </div>
        </div>
        
        {/* Chat messages */}
        <ScrollArea ref={scrollAreaRef} className="flex-1 p-4">
          <div className="space-y-6">
            {messages.map((message, index) => (
              <div key={message.id} className={`flex gap-3 ${
                message.role === 'user' ? 'justify-end' : ''
              }`}>
                {message.role === 'assistant' && (
                  <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl flex items-center justify-center flex-shrink-0 shadow-md">
                    <Bot className="text-white" size={18} />
                  </div>
                )}
                
                <div className={`max-w-[85%] ${
                  message.role === 'user' 
                    ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg' 
                    : 'bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 shadow-md border border-gray-200 dark:border-gray-700'
                } rounded-2xl p-4`}>
                  <div className="prose prose-sm max-w-none dark:prose-invert">
                    {message.role === 'assistant' ? (
                      <FormattedMessage content={message.content} />
                    ) : (
                      <p className="text-sm leading-relaxed">{message.content}</p>
                    )}
                  </div>
                  
                  {/* Inline visualization for assistant messages */}
                  {message.role === 'assistant' && message.visualizationData && (
                    <div className="mt-4 border-t border-gray-200 dark:border-gray-700 pt-4">
                      <div className="h-64 w-full">
                        <InlineVisualization data={message.visualizationData} />
                      </div>
                    </div>
                  )}
                </div>

                {message.role === 'user' && (
                  <div className="w-10 h-10 bg-gray-300 dark:bg-gray-600 rounded-xl flex items-center justify-center flex-shrink-0">
                    <User className="text-gray-600 dark:text-gray-300" size={18} />
                  </div>
                )}
              </div>
            ))}
            
            {analyzeMutation.isPending && (
              <div className="flex gap-3">
                <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl flex items-center justify-center flex-shrink-0 shadow-md">
                  <Bot className="text-white" size={18} />
                </div>
                <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-4 shadow-md">
                  <div className="flex items-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                    <span className="text-sm text-gray-600 dark:text-gray-400">Analyzing your manufacturing data...</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Input form */}
        <div className="border-t border-gray-200 dark:border-gray-700 p-4">
          <form onSubmit={handleSubmit} className="flex gap-3">
            <div className="flex-1 relative">
              <Input
                value={currentQuery}
                onChange={(e) => setCurrentQuery(e.target.value)}
                placeholder="Ask me about your manufacturing data... (e.g., 'What activities have the highest failure rates?')"
                disabled={analyzeMutation.isPending}
                className="pr-12 py-3 text-sm bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600"
              />
              <Button
                type="submit"
                size="sm"
                disabled={!currentQuery.trim() || analyzeMutation.isPending}
                className="absolute right-1 top-1/2 transform -translate-y-1/2 h-8 w-8 p-0 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
              >
                <Send size={14} />
              </Button>
            </div>
          </form>
          
          {appliedFilters && Object.keys(appliedFilters).length > 0 && (
            <div className="flex items-center gap-2 mt-2 text-xs text-gray-600 dark:text-gray-400">
              <Filter size={12} />
              <span>Analyzing filtered data subset</span>
            </div>
          )}
        </div>
      </div>

      {/* Live Insights Panel - Automatic Visualization System */}
      {insights.length > 0 && (
        <div className="w-96 border-l border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 flex flex-col">
          <div className="p-4 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-purple-500" />
              <h3 className="font-semibold text-gray-900 dark:text-gray-100">Live Insights</h3>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Auto-generated visualizations ({insights.length})
            </p>
          </div>
          
          <div className="flex-1 p-4 overflow-y-auto">
            <div className="space-y-6">
              {insights.map((insight, index) => (
                <div key={insight.id || index} className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <insight.icon className="h-4 w-4 text-blue-500" />
                      <h4 className="font-medium text-sm text-gray-900 dark:text-gray-100">{insight.title}</h4>
                    </div>
                    <button 
                      className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 p-1"
                      onClick={() => {
                        setExpandedInsight(insight);
                      }}
                    >
                      <Maximize2 className="h-3 w-3" />
                    </button>
                  </div>
                  
                  <div className="h-48 mb-4">
                    {insight.chart}
                  </div>
                  
                  {insight.description && (
                    <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3">
                      <div className="text-xs text-blue-700 dark:text-blue-300 font-medium">
                        {insight.description}
                      </div>
                    </div>
                  )}
                </div>
              ))}
              
              {insights.length === 0 && (
                <div className="text-center text-gray-500 py-8">
                  <BarChart3 className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">Ask ProcessGPT about your data to generate insights</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Expanded Modal */}
      {expandedInsight && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setExpandedInsight(null)}>
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg max-w-6xl w-full max-h-[90vh] overflow-auto m-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">{expandedInsight.title}</h2>
              <button 
                onClick={() => setExpandedInsight(null)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 p-2"
              >
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="h-96 w-full mb-4">
              {expandedInsight.chart}
            </div>
            {expandedInsight.description && (
              <div className="p-4 bg-gray-100 dark:bg-gray-700 rounded-lg">
                <p className="text-sm text-gray-600 dark:text-gray-400">{expandedInsight.description}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// Component to format assistant messages with proper React elements
function FormattedMessage({ content }: { content: string }) {
  const formatContent = () => {
    const lines = content.split('\n');
    const elements: React.ReactNode[] = [];
    let currentSection: React.ReactNode[] = [];
    
    lines.forEach((line, index) => {
      if (line.startsWith('## ')) {
        if (currentSection.length > 0) {
          elements.push(<div key={`section-${elements.length}`} className="mb-4">{currentSection}</div>);
          currentSection = [];
        }
        elements.push(
          <div key={`header-${index}`} className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-3 mt-4 first:mt-0 pb-2 border-b border-gray-200 dark:border-gray-600">
            {line.substring(3)}
          </div>
        );
      } else if (line.startsWith('### ')) {
        currentSection.push(
          <div key={`subheader-${index}`} className="text-sm font-medium text-gray-800 dark:text-gray-200 mb-2 mt-3">
            {line.substring(4)}
          </div>
        );
      } else if (line.trim() === '') {
        currentSection.push(<br key={`br-${index}`} />);
      } else {
        currentSection.push(
          <div key={`text-${index}`} className="text-sm leading-relaxed mb-2">
            <FormattedText text={line} />
          </div>
        );
      }
    });
    
    if (currentSection.length > 0) {
      elements.push(<div key={`section-${elements.length}`} className="mb-4">{currentSection}</div>);
    }
    
    return elements;
  };

  return <div className="space-y-2">{formatContent()}</div>;
}

// Helper component to format individual text lines with bold, inline code, etc.
function FormattedText({ text }: { text: string }) {
  const formatText = (str: string) => {
    // Split by bold markers
    const parts = str.split(/(\*\*[^*]+\*\*)/g);
    
    return parts.map((part, index) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={index} className="font-semibold text-gray-900 dark:text-gray-100">{part.slice(2, -2)}</strong>;
      }
      
      // Handle inline code
      if (part.includes('`')) {
        const codeParts = part.split(/(`[^`]+`)/g);
        return codeParts.map((codePart, codeIndex) => {
          if (codePart.startsWith('`') && codePart.endsWith('`')) {
            return <code key={`${index}-${codeIndex}`} className="bg-gray-100 dark:bg-gray-700 px-1 py-0.5 rounded text-xs font-mono">{codePart.slice(1, -1)}</code>;
          }
          return codePart;
        });
      }
      
      return part;
    });
  };

  return <>{formatText(text)}</>;
}

// Inline visualization component for chat messages
function InlineVisualization({ data }: { data: any }) {
  if (!data) return null;

  // Failure analysis
  if (data.failure_categories) {
    const chartData = data.failure_categories.map((category: any, index: number) => ({
      name: category.cause,
      value: parseInt(category.count),
      percentage: category.percentage
    }));
    const colors = ['#dc2626', '#ea580c', '#d97706', '#65a30d', '#3b82f6'];

    return (
      <ResponsiveContainer width="100%" height="100%">
        <RechartsPieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            innerRadius={40}
            outerRadius={80}
            paddingAngle={5}
            dataKey="value"
            label={({ name, percentage }) => `${name}: ${percentage}%`}
          >
            {chartData.map((entry: any, index: number) => (
              <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
            ))}
          </Pie>
          <Tooltip formatter={(value: any, name: any) => [`${value} failures`, name]} />
        </RechartsPieChart>
      </ResponsiveContainer>
    );
  }

  // Activity failure analysis
  if (data.activities_with_most_failures) {
    const chartData = data.activities_with_most_failures.slice(0, 5).map((activity: any, index: number) => ({
      name: activity.activity.split('/').pop() || activity.activity,
      value: parseFloat(activity.failure_rate.replace('%', '')),
      failures: activity.failed_count,
      total: activity.total_count
    }));
    const colors = ['#dc2626', '#ea580c', '#d97706', '#65a30d', '#3b82f6'];

    return (
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="name" fontSize={10} angle={-45} textAnchor="end" height={40} />
          <YAxis fontSize={11} label={{ value: 'Failure Rate %', angle: -90, position: 'insideLeft' }} />
          <Tooltip formatter={(value: any, name: any, props: any) => [`${value}% (${props.payload.failures}/${props.payload.total})`, 'Failure Rate']} />
          <Bar dataKey="value" radius={[2, 2, 0, 0]}>
            {chartData.map((entry: any, index: number) => (
              <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    );
  }

  // Temporal analysis
  if (data.temporal_analysis) {
    const chartData = data.temporal_analysis.hour_failure_distribution.map((item: any) => ({
      hour: `${item.hour.toString().padStart(2, '0')}:00`,
      failures: item.count
    }));

    return (
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="hour" fontSize={10} />
          <YAxis fontSize={11} label={{ value: 'Failures', angle: -90, position: 'insideLeft' }} />
          <Tooltip />
          <Bar dataKey="failures" fill="#3b82f6" />
        </BarChart>
      </ResponsiveContainer>
    );
  }

  // Anomaly analysis
  if (data.activities_with_most_anomalies) {
    const chartData = data.activities_with_most_anomalies.map((item: any) => ({
      hour: `${item.hour.toString().padStart(2, '0')}:00`,
      anomalies: item.count
    }));

    return (
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="hour" fontSize={10} />
          <YAxis fontSize={11} label={{ value: 'Anomalies', angle: -90, position: 'insideLeft' }} />
          <Tooltip />
          <Bar dataKey="anomalies" fill="#ef4444" />
        </BarChart>
      </ResponsiveContainer>
    );
  }

  return null;
}