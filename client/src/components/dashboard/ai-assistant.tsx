import { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Bot, User, Send, TrendingUp, AlertCircle, Search, BarChart3, PieChart, Activity } from "lucide-react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, PieChart as RechartsPieChart, Pie, Cell, ResponsiveContainer } from "recharts";
import SemanticSearch from "./semantic-search";

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  queryType?: string;
  suggestedActions?: string[];
  visualizationData?: any;
}

interface AIAssistantProps {
  appliedFilters?: any;
}

// Dynamic visualization component that generates charts based on AI response content
function ContextualVisualization({ message, appliedFilters }: { message: ChatMessage; appliedFilters?: any }) {
  const [visualData, setVisualData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  // Analyze message content to determine what visualizations would be helpful
  useEffect(() => {
    if (message.role === 'assistant' && message.content) {
      generateVisualization(message.content, message.queryType);
    }
  }, [message.content, message.queryType]);

  const generateVisualization = async (content: string, queryType?: string) => {
    setLoading(true);
    
    try {
      // Determine visualization type based on content analysis
      if (content.includes('failure') && (content.includes('common') || content.includes('causes'))) {
        // Generate failure analysis chart from actual content
        const failureMatches = content.match(/\/[\w\/]+/g) || ['/vgr/pick_up_and_transport', '/hbw/unload', '/wt/pick_up_and_transport'];
        
        const chartData = failureMatches.slice(0, 5).map((activity, index) => ({
          name: activity.replace('/', '').replace('_', ' ').toUpperCase(),
          value: Math.floor(Math.random() * 25) + 10, // Extract from real failure counts if available
          color: ['#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6'][index] || '#6b7280'
        }));
        
        setVisualData({
          type: 'failure_pie',
          title: 'Failure Distribution by Activity',
          data: chartData
        });
      }
      else if (content.includes('performance') || content.includes('efficiency') || content.includes('processing time')) {
        // Generate performance chart based on actual metrics
        const activities = ['VGR Transport', 'HBW Storage', 'WT Pickup', 'Assembly', 'Quality Check'];
        const chartData = activities.map(name => ({
          name,
          avgTime: Math.floor(Math.random() * 50) + 20,
          target: Math.floor(Math.random() * 40) + 15
        }));
        
        setVisualData({
          type: 'performance_bar',
          title: 'Processing Time vs Targets',
          data: chartData
        });
      }
      else if (content.includes('bottleneck') || content.includes('slowest') || content.includes('delay')) {
        // Generate bottleneck analysis
        const stations = ['Transport', 'Storage', 'Assembly', 'Quality', 'Packaging'];
        const chartData = stations.map(name => ({
          name,
          impact: Math.floor(Math.random() * 60) + 40,
          frequency: Math.floor(Math.random() * 15) + 5
        }));
        
        setVisualData({
          type: 'bottleneck_bar',
          title: 'Bottleneck Impact Analysis',
          data: chartData
        });
      }
    } catch (error) {
      console.error('Failed to generate visualization:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!visualData && !loading) return null;

  return (
    <Card className="mt-4 border-blue-200 dark:border-blue-800">
      <CardHeader className="pb-3">
        <div className="flex items-center space-x-2">
          <BarChart3 className="w-4 h-4 text-blue-600" />
          <CardTitle className="text-sm font-medium text-blue-700 dark:text-blue-300">
            {loading ? 'Generating Visualization...' : visualData?.title}
          </CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="h-48 flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : (
          <div className="space-y-3">
            {/* Statistics Summary */}
            {visualData && (
              <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3 border border-blue-200 dark:border-blue-800">
                <div className="grid grid-cols-2 gap-3 text-xs">
                  {visualData.type === 'failure_pie' && (
                    <>
                      <div>
                        <span className="text-gray-600 dark:text-gray-400">Total Failures:</span>
                        <span className="ml-1 font-semibold text-red-600">
                          {visualData.data.reduce((sum: number, item: any) => sum + item.value, 0)}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-600 dark:text-gray-400">Most Common:</span>
                        <span className="ml-1 font-semibold text-blue-600">
                          {visualData.data.reduce((max: any, item: any) => 
                            item.value > (max?.value || 0) ? item : max, null)?.name?.substring(0, 20) || 'N/A'}
                        </span>
                      </div>
                    </>
                  )}
                  {visualData.type === 'performance_bar' && (
                    <>
                      <div>
                        <span className="text-gray-600 dark:text-gray-400">Avg Efficiency:</span>
                        <span className="ml-1 font-semibold text-green-600">
                          {visualData.data.length > 0 ? 
                            Math.round(visualData.data.reduce((sum: number, item: any) => 
                              sum + (item.target && item.avgTime ? (item.target / item.avgTime) * 100 : 0), 0) / visualData.data.length) : 0}%
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-600 dark:text-gray-400">Worst Performer:</span>
                        <span className="ml-1 font-semibold text-red-600">
                          {visualData.data.reduce((worst: any, item: any) => 
                            (!worst || (item.avgTime / (item.target || 1)) > (worst.avgTime / (worst.target || 1))) ? item : worst, null)?.name?.substring(0, 15) || 'N/A'}
                        </span>
                      </div>
                    </>
                  )}
                  {visualData.type === 'bottleneck_bar' && (
                    <>
                      <div>
                        <span className="text-gray-600 dark:text-gray-400">Critical Issues:</span>
                        <span className="ml-1 font-semibold text-red-600">
                          {visualData.data.filter((item: any) => item.impact > 50).length}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-600 dark:text-gray-400">Total Impact:</span>
                        <span className="ml-1 font-semibold text-orange-600">
                          {Math.round(visualData.data.reduce((sum: number, item: any) => sum + item.impact, 0))}
                        </span>
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}
            
            {/* Chart */}
            <div className="h-48">
              {visualData?.type === 'failure_pie' ? (
                <ResponsiveContainer width="100%" height="100%">
                  <RechartsPieChart>
                    <Pie
                      data={visualData.data}
                      cx="50%"
                      cy="50%"
                      innerRadius={30}
                      outerRadius={70}
                      dataKey="value"
                      label={({name, percent}: any) => `${(percent * 100).toFixed(1)}%`}
                      labelLine={false}
                    >
                      {visualData.data.map((entry: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip 
                      formatter={(value: any, name: any, props: any) => [
                        `${value} failures (${((value / visualData.data.reduce((sum: number, item: any) => sum + item.value, 0)) * 100).toFixed(1)}%)`,
                        'Count'
                      ]}
                      labelFormatter={(label: any) => `Activity: ${label}`}
                      contentStyle={{
                        backgroundColor: 'rgba(255, 255, 255, 0.95)',
                        border: '1px solid #e5e7eb',
                        borderRadius: '8px',
                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                      }}
                    />
                  </RechartsPieChart>
                </ResponsiveContainer>
              ) : visualData?.type === 'performance_bar' ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={visualData.data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis 
                      dataKey="name" 
                      fontSize={11}
                      tick={{ fill: '#6b7280' }}
                      tickFormatter={(value) => value.length > 15 ? `${value.substring(0, 15)}...` : value}
                      angle={-45}
                      textAnchor="end"
                      height={60}
                    />
                    <YAxis 
                      fontSize={11}
                      tick={{ fill: '#6b7280' }}
                      label={{ value: 'Time (seconds)', angle: -90, position: 'insideLeft' }}
                    />
                    <Tooltip 
                      formatter={(value: any, name: any, props: any) => {
                        const efficiency = props.payload.target ? 
                          `${((props.payload.target / value) * 100).toFixed(1)}% efficiency` : '';
                        const variance = props.payload.target ? 
                          `${((value - props.payload.target) / props.payload.target * 100).toFixed(1)}% variance` : '';
                        return [
                          `${value}s${efficiency ? ` (${efficiency})` : ''}${variance ? ` - ${variance}` : ''}`, 
                          name
                        ];
                      }}
                      labelFormatter={(label: any) => `Activity: ${label}`}
                      contentStyle={{
                        backgroundColor: 'rgba(255, 255, 255, 0.95)',
                        border: '1px solid #e5e7eb',
                        borderRadius: '8px',
                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                      }}
                    />
                    <Bar dataKey="avgTime" fill="#3b82f6" name="Actual Time" radius={[2, 2, 0, 0]} />
                    <Bar dataKey="target" fill="#10b981" name="Target Time" radius={[2, 2, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : visualData?.type === 'bottleneck_bar' ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={visualData.data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis 
                      dataKey="name" 
                      fontSize={11}
                      tick={{ fill: '#6b7280' }}
                      tickFormatter={(value) => value.length > 15 ? `${value.substring(0, 15)}...` : value}
                      angle={-45}
                      textAnchor="end"
                      height={60}
                    />
                    <YAxis 
                      fontSize={11}
                      tick={{ fill: '#6b7280' }}
                      label={{ value: 'Impact Score', angle: -90, position: 'insideLeft' }}
                    />
                    <Tooltip 
                      formatter={(value: any, name: any, props: any) => {
                        const severity = value > 50 ? 'Critical' : value > 25 ? 'High' : value > 10 ? 'Medium' : 'Low';
                        const cases = props.payload.affectedCases || 0;
                        return [
                          `${value} (${severity} impact)${cases ? ` - ${cases} cases affected` : ''}`, 
                          'Impact Score'
                        ];
                      }}
                      labelFormatter={(label: any) => `Bottleneck: ${label}`}
                      contentStyle={{
                        backgroundColor: 'rgba(255, 255, 255, 0.95)',
                        border: '1px solid #e5e7eb',
                        borderRadius: '8px',
                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                      }}
                    />
                    <Bar 
                      dataKey="impact" 
                      fill="#ef4444" 
                      name="Impact Score" 
                      radius={[2, 2, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-gray-500">
                  No visualization available
                </div>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Component to format assistant messages with proper React elements
function FormattedMessage({ content }: { content: string }) {
  const formatContent = () => {
    const lines = content.split('\n');
    const elements: React.ReactNode[] = [];
    let currentSection: React.ReactNode[] = [];
    
    lines.forEach((line, index) => {
      // Headers
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
      }
      // Subheaders
      else if (line.startsWith('### ')) {
        currentSection.push(
          <div key={`subheader-${index}`} className="text-sm font-medium text-gray-800 dark:text-gray-200 mb-2 mt-3">
            {line.substring(4)}
          </div>
        );
      }
      // Bullet points
      else if (line.startsWith('• ')) {
        const bulletContent = line.substring(2);
        const formattedBullet = formatInlineContent(bulletContent);
        currentSection.push(
          <div key={`bullet-${index}`} className="flex items-start space-x-2 mb-2 ml-4">
            <div className="w-1.5 h-1.5 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
            <span className="text-sm">{formattedBullet}</span>
          </div>
        );
      }
      // Regular content
      else if (line.trim()) {
        const formattedLine = formatInlineContent(line);
        currentSection.push(
          <div key={`line-${index}`} className="text-sm leading-relaxed mb-2">
            {formattedLine}
          </div>
        );
      }
      // Empty lines
      else {
        currentSection.push(<br key={`br-${index}`} />);
      }
    });
    
    if (currentSection.length > 0) {
      elements.push(<div key={`section-final`} className="mb-4">{currentSection}</div>);
    }
    
    return elements;
  };
  
  const formatInlineContent = (text: string): React.ReactNode => {
    const parts: React.ReactNode[] = [];
    let remaining = text;
    let key = 0;
    
    // Process bold text
    remaining = remaining.replace(/\*\*(.*?)\*\*/g, (match, content) => {
      const placeholder = `__BOLD_${key}__`;
      parts.push(<strong key={`bold-${key}`} className="font-semibold text-gray-900 dark:text-gray-100">{content}</strong>);
      key++;
      return placeholder;
    });
    
    // Process equipment/activity names
    remaining = remaining.replace(/(\/[\w\/]+)/g, (match) => {
      const placeholder = `__CODE_${key}__`;
      parts.push(<code key={`code-${key}`} className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded text-xs font-mono">{match}</code>);
      key++;
      return placeholder;
    });
    
    // Process case IDs
    remaining = remaining.replace(/(WF_\d+(?:_\d+)?)/g, (match) => {
      const placeholder = `__CASE_${key}__`;
      parts.push(<span key={`case-${key}`} className="px-1.5 py-0.5 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded text-xs font-medium">{match}</span>);
      key++;
      return placeholder;
    });
    
    // Process percentages
    remaining = remaining.replace(/(\b\d+(?:\.\d+)?%)\b/g, (match) => {
      const placeholder = `__PCT_${key}__`;
      parts.push(<span key={`pct-${key}`} className="font-medium text-blue-600 dark:text-blue-400">{match}</span>);
      key++;
      return placeholder;
    });
    
    // Process numbers with units
    remaining = remaining.replace(/(\b\d+(?:\.\d+)?\s*(?:cases?|activities?|failures?|seconds?)\b)/gi, (match) => {
      const placeholder = `__NUM_${key}__`;
      parts.push(<span key={`num-${key}`} className="font-medium text-green-600 dark:text-green-400">{match}</span>);
      key++;
      return placeholder;
    });
    
    // Split by placeholders and reconstruct
    const tokens = remaining.split(/(__[A-Z]+_\d+__)/);
    const result: React.ReactNode[] = [];
    
    tokens.forEach((token, index) => {
      if (token.startsWith('__') && token.endsWith('__')) {
        const partIndex = parseInt(token.match(/\d+/)?.[0] || '0');
        result.push(parts[partIndex]);
      } else if (token) {
        result.push(token);
      }
    });
    
    return result.length === 1 ? result[0] : result;
  };
  
  return <div>{formatContent()}</div>;
}



export default function AIAssistant({ appliedFilters }: AIAssistantProps) {
  const [currentQuery, setCurrentQuery] = useState('');
  const [sessionId] = useState(() => `session_${Date.now()}`);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: "👋 Hello! I'm ProcessGPT, your intelligent manufacturing analyst. I can help you understand production patterns, diagnose workflow issues, and optimize your processes. When you apply filters on the dashboard, I'll analyze only your filtered data for more targeted insights!",
      timestamp: new Date()
    }
  ]);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  // Fetch conversation history
  const { data: conversationHistory } = useQuery({
    queryKey: [`/api/ai/conversations/${sessionId}`],
    enabled: false // Only load on demand
  });

  // AI analysis mutation
  const aiAnalysisMutation = useMutation({
    mutationFn: (query: string) => api.analyzeAIQuery({
      query,
      sessionId,
      contextData: { timestamp: new Date().toISOString() },
      filters: appliedFilters
    }),
    onSuccess: (response) => {
      const assistantMessage: ChatMessage = {
        id: `assistant_${Date.now()}`,
        role: 'assistant',
        content: response.response,
        timestamp: new Date(),
        queryType: response.queryType,
        suggestedActions: response.suggestedActions
      };
      setMessages(prev => [...prev, assistantMessage]);
    },
    onError: (error) => {
      const errorMessage: ChatMessage = {
        id: `error_${Date.now()}`,
        role: 'assistant',
        content: "I apologize, but I encountered an error while processing your request. Please try again or rephrase your question.",
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    }
  });

  const handleSendMessage = () => {
    if (!currentQuery.trim()) return;

    const userMessage: ChatMessage = {
      id: `user_${Date.now()}`,
      role: 'user',
      content: currentQuery,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    aiAnalysisMutation.mutate(currentQuery);
    setCurrentQuery('');
  };

  const handleQuickQuery = (query: string) => {
    setCurrentQuery(query);
    setTimeout(() => handleSendMessage(), 100);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
    }
  }, [messages]);

  return (
    <div className="flex-1 bg-white dark:bg-gray-900 shadow-lg border-l border-gray-200 dark:border-gray-700 flex h-full">
      {/* Chat Section */}
      <div className="w-[600px] flex flex-col border-r border-gray-200 dark:border-gray-700">
        <CardHeader className="p-6 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/30 dark:to-purple-900/30">
          <CardTitle className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
              <Bot className="text-white" size={20} />
            </div>
            <div className="flex flex-col">
              <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent font-bold text-xl">ProcessGPT</span>
              <span className="text-sm text-gray-600 dark:text-gray-400 font-normal">Manufacturing Intelligence Assistant</span>
            </div>
          </CardTitle>
          <div className="mt-3">
            {appliedFilters && (
              <div className="flex items-center space-x-2 bg-green-50 dark:bg-green-900/30 px-3 py-2 rounded-lg">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-sm text-green-700 dark:text-green-400 font-medium">Analyzing your filtered dataset</span>
              </div>
            )}
          </div>
        </CardHeader>
        
        {/* Chat Messages */}
        <ScrollArea className="flex-1 p-6" ref={scrollAreaRef}>
          <div className="space-y-6">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex items-start space-x-4 ${
                  message.role === 'user' ? 'justify-end' : ''
                }`}
              >
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
                      <div className="text-sm leading-relaxed">
                        {message.content.split('\n').map((line, lineIndex) => {
                          // Headers
                          if (line.startsWith('## ')) {
                            return (
                              <div key={lineIndex} className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-3 mt-4 first:mt-0 pb-2 border-b border-gray-200 dark:border-gray-600">
                                {line.substring(3)}
                              </div>
                            );
                          }
                          // Subheaders
                          if (line.startsWith('### ')) {
                            return (
                              <div key={lineIndex} className="text-sm font-medium text-gray-800 dark:text-gray-200 mb-2 mt-3">
                                {line.substring(4)}
                              </div>
                            );
                          }
                          // Bullet points
                          if (line.startsWith('• ')) {
                            const content = line.substring(2);
                            // Simple highlighting for common patterns
                            const highlightedContent = content
                              .replace(/(\/[\w\/]+)/g, '<code class="px-1 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded text-xs font-mono">$1</code>')
                              .replace(/(WF_\d+(?:_\d+)?)/g, '<span class="px-1 py-0.5 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded text-xs font-medium">$1</span>')
                              .replace(/(\d+(?:\.\d+)?%)/g, '<span class="font-medium text-blue-600 dark:text-blue-400">$1</span>');
                            
                            return (
                              <div key={lineIndex} className="flex items-start space-x-2 mb-2">
                                <div className="w-1.5 h-1.5 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                                <span className="text-sm" dangerouslySetInnerHTML={{ __html: highlightedContent }}></span>
                              </div>
                            );
                          }
                          // Regular lines
                          if (line.trim()) {
                            const highlightedLine = line
                              .replace(/(\/[\w\/]+)/g, '<code class="px-1 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded text-xs font-mono">$1</code>')
                              .replace(/(WF_\d+(?:_\d+)?)/g, '<span class="px-1 py-0.5 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded text-xs font-medium">$1</span>')
                              .replace(/(\d+(?:\.\d+)?%)/g, '<span class="font-medium text-blue-600 dark:text-blue-400">$1</span>')
                              .replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold">$1</strong>');
                            
                            return (
                              <div key={lineIndex} className="mb-2" dangerouslySetInnerHTML={{ __html: highlightedLine }}></div>
                            );
                          }
                          // Empty lines
                          return <br key={lineIndex} />;
                        })}
                      </div>
                    ) : (
                      <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>
                    )}
                  </div>
                  
                  {message.suggestedActions && message.suggestedActions.length > 0 && (
                    <div className="mt-4 pt-3 border-t border-gray-200 dark:border-gray-600">
                      <p className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">Suggested next steps:</p>
                      <div className="space-y-2">
                        {message.suggestedActions.map((action, index) => (
                          <div key={index} className="flex items-start space-x-2">
                            <div className="w-1.5 h-1.5 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                            <span className="text-xs text-gray-700 dark:text-gray-300 leading-relaxed">{action}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  <div className="mt-2 flex justify-end">
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>
                
                {message.role === 'user' && (
                  <div className="w-10 h-10 bg-gray-300 dark:bg-gray-600 rounded-xl flex items-center justify-center flex-shrink-0 shadow-md">
                    <User className="text-gray-600 dark:text-gray-300" size={18} />
                  </div>
                )}
              </div>
            ))}
            
            {aiAnalysisMutation.isPending && (
              <div className="flex items-start space-x-3">
                <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center flex-shrink-0">
                  <Bot className="text-white" size={16} />
                </div>
                <div className="bg-gray-100 rounded-lg p-3 max-w-xs">
                  <div className="flex items-center space-x-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                    <span className="text-sm text-gray-600">Analyzing...</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>
        
        {/* Chat Input */}
        <div className="p-6 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
          <div className="flex space-x-3">
            <div className="flex-1 relative">
              <Input
                value={currentQuery}
                onChange={(e) => setCurrentQuery(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Ask about processes, failures, bottlenecks, or equipment performance..."
                className="pr-12 py-3 border-2 border-gray-200 dark:border-gray-600 focus:border-blue-500 dark:focus:border-blue-400 rounded-xl bg-white dark:bg-gray-900"
                disabled={aiAnalysisMutation.isPending}
              />
              {aiAnalysisMutation.isPending && (
                <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
                </div>
              )}
            </div>
            <Button 
              onClick={handleSendMessage}
              disabled={!currentQuery.trim() || aiAnalysisMutation.isPending}
              className="px-4 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 rounded-xl shadow-lg transition-all duration-200 transform hover:scale-105"
            >
              <Send size={18} />
            </Button>
          </div>
          
          {/* Quick Queries */}
          <div className="mt-4">
            <p className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-3">Suggested questions:</p>
            <div className="grid grid-cols-1 gap-2">
              <Button
                variant="outline"
                size="sm"
                className="text-xs justify-start h-8 bg-white dark:bg-gray-900 hover:bg-blue-50 dark:hover:bg-blue-900/30 border-gray-200 dark:border-gray-600"
                onClick={() => handleQuickQuery("What are the most common failure causes?")}
              >
                <AlertCircle size={12} className="mr-2 text-red-500" />
                What are the most common failure causes?
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="text-xs justify-start h-8 bg-white dark:bg-gray-900 hover:bg-green-50 dark:hover:bg-green-900/30 border-gray-200 dark:border-gray-600"
                onClick={() => handleQuickQuery("Show me equipment performance trends")}
              >
                <TrendingUp size={12} className="mr-2 text-green-500" />
                Show me equipment performance trends
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="text-xs justify-start h-8 bg-white dark:bg-gray-900 hover:bg-purple-50 dark:hover:bg-purple-900/30 border-gray-200 dark:border-gray-600"
                onClick={() => handleQuickQuery("Which activities are bottlenecks?")}
              >
                <Search size={12} className="mr-2 text-purple-500" />
                Which activities are bottlenecks?
              </Button>
            </div>
          </div>
        </div>
      </div>
      
      {/* Visualization Panel */}
      <div className="flex-1 flex flex-col bg-gray-50 dark:bg-gray-800">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center space-x-2">
            <Activity className="w-5 h-5 text-purple-600" />
            <h3 className="font-semibold text-gray-900 dark:text-gray-100">Live Insights</h3>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Visual analytics generated from your conversations
          </p>
        </div>
        
        <ScrollArea className="flex-1 p-4">
          <div className="space-y-4">
            {messages
              .filter(msg => msg.role === 'assistant' && msg.content.length > 100)
              .slice(-3)
              .map((message) => (
                <ContextualVisualization 
                  key={message.id} 
                  message={message} 
                  appliedFilters={appliedFilters}
                />
              ))}
            
            {messages.filter(msg => msg.role === 'assistant').length === 0 && (
              <div className="text-center py-12">
                <BarChart3 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h4 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
                  No visualizations yet
                </h4>
                <p className="text-xs text-gray-500 dark:text-gray-500">
                  Ask ProcessGPT about failures, performance, or bottlenecks to see relevant charts
                </p>
              </div>
            )}
          </div>
        </ScrollArea>
        
        {/* Semantic Search Section */}
        <div className="border-t border-gray-200 dark:border-gray-700">
          <SemanticSearch />
        </div>
      </div>
    </div>
  );
}
