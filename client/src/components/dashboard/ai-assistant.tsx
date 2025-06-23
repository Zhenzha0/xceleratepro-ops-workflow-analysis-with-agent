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
      content: "👋 Hello! I'm ProcessGPT, your intelligent manufacturing analyst. I can help you understand production patterns, diagnose workflow issues, and optimize your processes. Ask me anything about your manufacturing data!",
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
    <div className="w-96 bg-white shadow-lg border-l border-gray-200 flex flex-col h-full">
      {/* AI Assistant Section */}
      <div className="flex-1 flex flex-col">
        <CardHeader className="p-6 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-purple-50">
          <CardTitle className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
              <Bot className="text-white" size={18} />
            </div>
            <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent font-bold">ProcessGPT</span>
          </CardTitle>
          <p className="text-sm text-gray-600">Your intelligent manufacturing analyst powered by AI</p>
        </CardHeader>
        
        {/* Chat Messages */}
        <ScrollArea className="flex-1 p-6" ref={scrollAreaRef}>
          <div className="space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex items-start space-x-3 ${
                  message.role === 'user' ? 'justify-end' : ''
                }`}
              >
                {message.role === 'assistant' && (
                  <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center flex-shrink-0">
                    <Bot className="text-white" size={16} />
                  </div>
                )}
                
                <div className={`max-w-xs ${
                  message.role === 'user' 
                    ? 'bg-primary text-white' 
                    : 'bg-gray-100 text-gray-900'
                } rounded-lg p-3`}>
                  <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                  
                  {message.suggestedActions && message.suggestedActions.length > 0 && (
                    <div className="mt-2 pt-2 border-t border-gray-200">
                      <p className="text-xs text-gray-600 mb-1">Suggested actions:</p>
                      <ul className="text-xs space-y-1">
                        {message.suggestedActions.map((action, index) => (
                          <li key={index} className="text-gray-700">• {action}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
                
                {message.role === 'user' && (
                  <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center flex-shrink-0">
                    <User className="text-gray-600" size={16} />
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
        <div className="p-6 border-t border-gray-200">
          <div className="flex space-x-2">
            <Input
              value={currentQuery}
              onChange={(e) => setCurrentQuery(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Ask about processes, failures, or comparisons..."
              className="flex-1"
              disabled={aiAnalysisMutation.isPending}
            />
            <Button 
              onClick={handleSendMessage}
              disabled={!currentQuery.trim() || aiAnalysisMutation.isPending}
              className="bg-primary hover:bg-primary/90"
            >
              <Send size={16} />
            </Button>
          </div>
          
          {/* Quick Queries */}
          <div className="mt-3">
            <p className="text-xs text-gray-500 mb-2">Quick queries:</p>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                className="text-xs"
                onClick={() => handleQuickQuery("Find anomalies in the last 24 hours")}
              >
                <AlertCircle size={12} className="mr-1" />
                Find anomalies
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="text-xs"
                onClick={() => handleQuickQuery("Show equipment efficiency trends")}
              >
                <TrendingUp size={12} className="mr-1" />
                Equipment efficiency
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="text-xs"
                onClick={() => handleQuickQuery("Analyze failure patterns by equipment")}
              >
                <Search size={12} className="mr-1" />
                Failure patterns
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
