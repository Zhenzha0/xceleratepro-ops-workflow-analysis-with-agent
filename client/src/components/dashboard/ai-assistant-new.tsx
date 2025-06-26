import React, { useState, useEffect, useRef } from 'react';
import { Send, Bot, User, BarChart3, TrendingUp, AlertTriangle, Zap, Maximize2, Minimize2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, PieChart, Pie, Cell } from 'recharts';
import { analyzeQueryLocal } from '@/utils/local-analysis-engine.js';
import { initializeGemmaModel, isModelReady, getModelStatus } from '@/utils/llm-wrapper.js';

interface Message {
  id: string;
  type: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  analysis_type?: string;
  data?: any;
}

interface Insight {
  id: string;
  title: string;
  chart: React.ReactNode;
  icon: React.ComponentType;
  description: string;
}

export default function AIAssistantNew() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [insights, setInsights] = useState<Insight[]>([]);
  const [expandedChart, setExpandedChart] = useState<string | null>(null);
  const [modelStatus, setModelStatus] = useState<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Initialize Gemma model on component mount
  useEffect(() => {
    const initModel = async () => {
      try {
        console.log('Initializing local Gemma model...');
        await initializeGemmaModel();
        setModelStatus(getModelStatus());
        
        // Add welcome message
        setMessages([{
          id: Date.now().toString(),
          type: 'assistant',
          content: '🤖 **ProcessGPT Local** is ready! I\'m now running completely offline using Gemma-2B-IT model. Ask me anything about your manufacturing data!',
          timestamp: new Date()
        }]);
      } catch (error) {
        console.error('Failed to initialize model:', error);
        setMessages([{
          id: Date.now().toString(),
          type: 'assistant',
          content: '⚠️ **Model Loading Failed** - Please check that the Gemma-2B-IT model is available at `/models/gemma-2b-it.task`',
          timestamp: new Date()
        }]);
      }
    };

    initModel();
  }, []);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content: input.trim(),
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      // Process query using local analysis engine
      const response = await analyzeQueryLocal({
        query: input.trim(),
        sessionId: 'local-session',
        contextData: {},
        filters: {}
      });

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'assistant',
        content: response.response,
        timestamp: new Date(),
        analysis_type: response.analysis_type,
        data: response.data
      };

      setMessages(prev => [...prev, assistantMessage]);

      // Generate visualizations based on analysis type
      if (response.data && response.analysis_type) {
        setTimeout(() => {
          createAutomaticVisualizations(response.analysis_type, response.data);
        }, 500);
      }

    } catch (error: any) {
      console.error('Analysis failed:', error);
      
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'assistant',
        content: `❌ **Analysis Error**: ${error?.message || 'Unknown error'}\n\nPlease ensure the Gemma model is properly loaded and try again.`,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  // Create visualizations based on analysis type
  const createAutomaticVisualizations = (analysisType: string, data: any) => {
    console.log('Creating automatic visualizations for type:', analysisType, data);

    switch (analysisType) {
      case 'temporal_pattern_analysis':
        createTemporalAnalysisCharts(data);
        break;
      case 'activity_failure_analysis':
        createActivityFailureCharts(data);
        break;
      case 'failure_analysis':
        createFailureAnalysisCharts(data);
        break;
      case 'anomaly_analysis':
        createAnomalyAnalysisCharts(data);
        break;
      case 'bottleneck_analysis':
        createBottleneckAnalysisCharts(data);
        break;
    }
  };

  // Create temporal analysis charts
  const createTemporalAnalysisCharts = (data: any) => {
    console.log('Creating temporal charts with full data:', data.temporal_analysis);
    
    const hourlyData = data.temporal_analysis.hour_failure_distribution.map((item: any) => ({
      hour: `${item.hour.toString().padStart(2, '0')}:00`,
      failures: item.count,
      peak: item.count > 0 ? (item.count === Math.max(...data.temporal_analysis.hour_failure_distribution.map((h: any) => h.count))) : false
    }));

    const hourlyChart = (
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={hourlyData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="hour" fontSize={10} />
          <YAxis fontSize={11} label={{ value: 'Failures', angle: -90, position: 'insideLeft' }} />
          <Tooltip formatter={(value: any) => [`${value} failures`, 'Count']} />
          <Bar dataKey="failures" fill="#ef4444" />
        </BarChart>
      </ResponsiveContainer>
    );

    const peakHour = hourlyData.find((item: any) => item.peak)?.hour || 'No failures detected';
    const totalFailures = data.temporal_analysis.total_failures || hourlyData.reduce((sum: number, item: any) => sum + item.failures, 0);
    const analysisTime = data.temporal_analysis.analysis_period || 'Unknown period';

    const newInsight: Insight = {
      id: Date.now().toString(),
      title: 'Temporal Failure Distribution',
      chart: hourlyChart,
      icon: BarChart3,
      description: `Peak Hour: ${peakHour} | Total failures: ${totalFailures} | Period: ${analysisTime} - Local analysis with Gemma-2B-IT`
    };

    setInsights(prev => [...prev, newInsight]);
  };

  // Create activity failure charts
  const createActivityFailureCharts = (data: any) => {
    const activities = data.activities_with_most_failures || [];
    const chartData = activities.slice(0, 10).map((item: any) => ({
      activity: item.activity_name.split('/').pop() || item.activity_name,
      failure_rate: parseFloat(item.failure_rate),
      failures: item.failure_count,
      total: item.total_count
    }));

    const barChart = (
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="activity" fontSize={10} />
          <YAxis fontSize={11} label={{ value: 'Failure Rate (%)', angle: -90, position: 'insideLeft' }} />
          <Tooltip formatter={(value: any) => [`${value}%`, 'Failure Rate']} />
          <Bar dataKey="failure_rate" fill="#f59e0b" />
        </BarChart>
      </ResponsiveContainer>
    );

    const newInsight: Insight = {
      id: Date.now().toString(),
      title: 'Activity Failure Rates',
      chart: barChart,
      icon: TrendingUp,
      description: `Analyzed ${activities.length} activities with local Gemma-2B-IT model`
    };

    setInsights(prev => [...prev, newInsight]);
  };

  // Create failure analysis charts
  const createFailureAnalysisCharts = (data: any) => {
    const categories = data.failure_categories || [];
    const colors = ['#ef4444', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6'];
    
    const pieChart = (
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={categories}
            dataKey="count"
            nameKey="category"
            cx="50%"
            cy="50%"
            outerRadius={60}
            label={false}
          >
            {categories.map((_: any, index: number) => (
              <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
            ))}
          </Pie>
          <Tooltip formatter={(value: any, name: any) => [`${value} failures`, name]} />
        </PieChart>
      </ResponsiveContainer>
    );

    const newInsight: Insight = {
      id: Date.now().toString(),
      title: 'Failure Categories',
      chart: pieChart,
      icon: AlertTriangle,
      description: `Categorized failures using local AI analysis`
    };

    setInsights(prev => [...prev, newInsight]);
  };

  // Create anomaly analysis charts
  const createAnomalyAnalysisCharts = (data: any) => {
    // Implementation for anomaly charts
    console.log('Creating anomaly charts:', data);
  };

  // Create bottleneck analysis charts  
  const createBottleneckAnalysisCharts = (data: any) => {
    // Implementation for bottleneck charts
    console.log('Creating bottleneck charts:', data);
  };

  const toggleChartExpansion = (chartId: string) => {
    setExpandedChart(expandedChart === chartId ? null : chartId);
  };

  return (
    <div className="flex h-full">
      {/* Main Chat Interface */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 p-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center">
              <Bot className="w-4 h-4 text-white" />
            </div>
            <div>
              <h2 className="font-semibold">ProcessGPT Local</h2>
              <p className="text-sm text-muted-foreground">
                {modelStatus ? (
                  `${modelStatus.modelType} • ${modelStatus.runtime} • Offline Ready`
                ) : (
                  'Loading model...'
                )}
              </p>
            </div>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex gap-3 ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {message.type === 'assistant' && (
                <div className="w-8 h-8 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center flex-shrink-0">
                  <Bot className="w-4 h-4 text-white" />
                </div>
              )}
              
              <div className={`max-w-[80%] rounded-lg p-3 ${
                message.type === 'user' 
                  ? 'bg-primary text-primary-foreground ml-auto' 
                  : 'bg-muted'
              }`}>
                <div className="whitespace-pre-wrap text-sm">{message.content}</div>
                <div className="text-xs opacity-70 mt-1">
                  {message.timestamp.toLocaleTimeString()}
                </div>
              </div>

              {message.type === 'user' && (
                <div className="w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center flex-shrink-0">
                  <User className="w-4 h-4 text-gray-600" />
                </div>
              )}
            </div>
          ))}
          
          {isLoading && (
            <div className="flex gap-3 justify-start">
              <div className="w-8 h-8 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center">
                <Bot className="w-4 h-4 text-white" />
              </div>
              <div className="bg-muted rounded-lg p-3">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-current rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-current rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                  <div className="w-2 h-2 bg-current rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                  <span className="text-sm ml-2">Analyzing with local AI...</span>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="border-t p-4">
          <form onSubmit={handleSubmit} className="flex gap-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about your manufacturing data..."
              disabled={isLoading || !isModelReady()}
              className="flex-1"
            />
            <Button type="submit" disabled={isLoading || !isModelReady() || !input.trim()}>
              <Send className="w-4 h-4" />
            </Button>
          </form>
        </div>
      </div>

      {/* Live Insights Panel */}
      <div className="w-96 border-l bg-muted/20 flex flex-col">
        <div className="p-4 border-b">
          <h3 className="font-semibold flex items-center gap-2">
            <Zap className="w-4 h-4" />
            Live Insights
          </h3>
          <p className="text-sm text-muted-foreground">Real-time visualizations</p>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {insights.map((insight) => (
            <Card key={insight.id} className="relative">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <insight.icon className="w-4 h-4" />
                    {insight.title}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => toggleChartExpansion(insight.id)}
                    className="h-6 w-6 p-0"
                  >
                    <Maximize2 className="w-3 h-3" />
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="h-40 mb-2">
                  {insight.chart}
                </div>
                <p className="text-xs text-muted-foreground">{insight.description}</p>
              </CardContent>
            </Card>
          ))}
          
          {insights.length === 0 && (
            <div className="text-center text-muted-foreground py-8">
              <BarChart3 className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">Ask questions to generate insights</p>
            </div>
          )}
        </div>
      </div>

      {/* Expanded Chart Modal */}
      {expandedChart && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setExpandedChart(null)}>
          <div className="bg-background rounded-lg p-6 max-w-4xl max-h-[80vh] w-full mx-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold">Expanded Chart View</h3>
              <Button variant="ghost" size="sm" onClick={() => setExpandedChart(null)}>
                <Minimize2 className="w-4 h-4" />
              </Button>
            </div>
            <div className="h-96">
              {insights.find(i => i.id === expandedChart)?.chart}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}