import { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Bot, User, Send, TrendingUp, AlertCircle, Search } from "lucide-react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import SemanticSearch from "./semantic-search";

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  queryType?: string;
  suggestedActions?: string[];
}

interface AIAssistantProps {
  appliedFilters?: any;
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

  // Format assistant messages with better HTML styling
  const formatAssistantMessage = (content: string): string => {
    return content
      // Headers
      .replace(/## (.*?)$/gm, '<h3 class="text-base font-semibold text-gray-900 dark:text-gray-100 mb-2 mt-4 first:mt-0">$1</h3>')
      .replace(/### (.*?)$/gm, '<h4 class="text-sm font-medium text-gray-800 dark:text-gray-200 mb-1 mt-3">$1</h4>')
      
      // Bold text
      .replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold text-gray-900 dark:text-gray-100">$1</strong>')
      
      // Bullet points
      .replace(/^• (.*?)$/gm, '<div class="flex items-start space-x-2 mb-1"><div class="w-1.5 h-1.5 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div><span>$1</span></div>')
      
      // Numbers/metrics highlighting
      .replace(/(\d+(?:\.\d+)?%?)/g, '<span class="font-medium text-blue-600 dark:text-blue-400">$1</span>')
      
      // Equipment/activity names (starting with /)
      .replace(/(\/\w+(?:\/\w+)*)/g, '<code class="px-1 py-0.5 bg-gray-100 dark:bg-gray-700 rounded text-xs font-mono">$1</code>')
      
      // Case IDs (WF_xxx format)
      .replace(/(WF_\d+(?:_\d+)?)/g, '<span class="px-1.5 py-0.5 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded text-xs font-medium">$1</span>')
      
      // Line breaks
      .replace(/\n\n/g, '<br><br>')
      .replace(/\n/g, '<br>');
  };

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
    <div className="w-[600px] bg-white dark:bg-gray-900 shadow-lg border-l border-gray-200 dark:border-gray-700 flex flex-col h-full">
      {/* AI Assistant Section */}
      <div className="flex-1 flex flex-col">
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
                      <div 
                        className="text-sm leading-relaxed whitespace-pre-wrap"
                        dangerouslySetInnerHTML={{
                          __html: formatAssistantMessage(message.content)
                        }}
                      />
                    ) : (
                      <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>
                    )}
                  </div>
                  
                  {message.suggestedActions && message.suggestedActions.length > 0 && (
                    <div className="mt-4 pt-3 border-t border-gray-200 dark:border-gray-600">
                      <p className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">💡 Suggested next steps:</p>
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
      
      {/* Semantic Search Section */}
      <div className="border-t border-gray-200">
        <SemanticSearch />
      </div>
    </div>
  );
}
