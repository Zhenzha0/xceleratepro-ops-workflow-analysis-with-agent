import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, CheckCircle, Loader2, Settings, Zap } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

interface AIStatus {
  useLocalAI: boolean;
  useGemini: boolean;
  ollamaHost?: string;
  serviceStatus: string;
  connectionTest?: {
    success: boolean;
    status?: number;
    error?: string;
    url?: string;
  };
  currentService: string;
}

export function AIServiceControl() {
  const [ollamaHost, setOllamaHost] = useState('');
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Get current AI service status
  const { data: aiStatus, isLoading, refetch } = useQuery<AIStatus>({
    queryKey: ['/api/ai/status'],
    refetchInterval: 10000 // Check every 10 seconds
  });

  useEffect(() => {
    if (aiStatus?.ollamaHost) {
      setOllamaHost(aiStatus.ollamaHost);
    }
  }, [aiStatus]);

  // Switch to local AI
  const switchToLocalMutation = useMutation({
    mutationFn: async (host: string) => {
      const response = await fetch('/api/ai/switch-to-local', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ollamaHost: host })
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to switch to local AI');
      }
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Switched to Local AI",
        description: "ProcessGPT now uses your private Gemma 2 model",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/ai/status'] });
      refetch();
    },
    onError: (error: Error) => {
      toast({
        title: "Switch Failed",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  // Switch to OpenAI
  const switchToOpenAIMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/ai/switch-to-openai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to switch to OpenAI');
      }
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Switched to OpenAI",
        description: "ProcessGPT now uses OpenAI GPT-4o",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/ai/status'] });
      refetch();
    },
    onError: (error: Error) => {
      toast({
        title: "Switch Failed",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  const handleSwitchToLocal = () => {
    if (!ollamaHost.trim()) {
      toast({
        title: "Host Required",
        description: "Please enter your Google Colab tunnel URL",
        variant: "destructive",
      });
      return;
    }
    switchToLocalMutation.mutate(ollamaHost);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'connected': return 'success';
      case 'disconnected': return 'destructive';
      case 'openai': return 'default';
      default: return 'secondary';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'connected': return <CheckCircle className="h-4 w-4" />;
      case 'disconnected': return <AlertCircle className="h-4 w-4" />;
      case 'openai': return <Zap className="h-4 w-4" />;
      default: return <Settings className="h-4 w-4" />;
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin" />
            <span className="ml-2">Loading AI service status...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="h-5 w-5" />
          AI Service Configuration
        </CardTitle>
        <CardDescription>
          Switch between OpenAI and your private local AI service
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Current Status */}
        <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
          <div>
            <div className="font-medium">Current Service</div>
            <div className="text-sm text-muted-foreground">{aiStatus?.currentService}</div>
          </div>
          <Badge variant={getStatusColor(aiStatus?.serviceStatus || 'unknown')}>
            {getStatusIcon(aiStatus?.serviceStatus || 'unknown')}
            <span className="ml-1 capitalize">{aiStatus?.serviceStatus}</span>
          </Badge>
        </div>

        {/* Connection Test Results */}
        {aiStatus?.connectionTest && (
          <div className="p-4 border rounded-lg">
            <div className="font-medium mb-2">Connection Test</div>
            <div className="text-sm space-y-1">
              <div>URL: {aiStatus.connectionTest.url}</div>
              <div>Status: {aiStatus.connectionTest.success ? 'Connected' : 'Failed'}</div>
              {aiStatus.connectionTest.error && (
                <div className="text-red-600">Error: {aiStatus.connectionTest.error}</div>
              )}
            </div>
          </div>
        )}

        {/* Local AI Configuration */}
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium">Google Colab Tunnel URL</label>
            <div className="mt-1">
              <Input
                placeholder="https://your-tunnel.loca.lt"
                value={ollamaHost}
                onChange={(e) => setOllamaHost(e.target.value)}
              />
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              Enter the public URL from your Google Colab LocalTunnel setup
            </div>
          </div>

          <div className="flex gap-2">
            <Button 
              onClick={handleSwitchToLocal}
              disabled={switchToLocalMutation.isPending}
              variant={aiStatus?.useLocalAI ? "default" : "outline"}
            >
              {switchToLocalMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Use Local AI (Gemma 2)
            </Button>
            
            <Button 
              onClick={() => switchToOpenAIMutation.mutate()}
              disabled={switchToOpenAIMutation.isPending}
              variant={!aiStatus?.useLocalAI ? "default" : "outline"}
            >
              {switchToOpenAIMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Use OpenAI (GPT-4o)
            </Button>
          </div>
        </div>

        {/* Instructions */}
        <div className="p-4 bg-blue-50 dark:bg-blue-950 rounded-lg">
          <div className="font-medium text-blue-900 dark:text-blue-100 mb-2">
            Setup Instructions
          </div>
          <div className="text-sm text-blue-700 dark:text-blue-200 space-y-2">
            <div>1. Run the Google Colab setup to get your tunnel URL</div>
            <div>2. Copy the tunnel URL (https://something.loca.lt)</div>
            <div>3. Paste it above and click "Use Local AI"</div>
            <div>4. Your ProcessGPT will now use private Gemma 2</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}