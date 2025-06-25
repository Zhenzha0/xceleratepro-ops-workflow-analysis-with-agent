import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { Bot, Cloud, Server, AlertCircle, CheckCircle, Settings } from 'lucide-react';
import { AIServiceControls } from '@/components/ai-service-controls';

interface AIServiceStatus {
  useLocalAI: boolean;
  currentService: string;
}

export function LocalAIStatus() {
  const [aiStatus, setAiStatus] = useState<AIServiceStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showControls, setShowControls] = useState(false);

  const fetchAIStatus = async () => {
    try {
      const response = await fetch('/api/health');
      const data = await response.json();
      setAiStatus(data.aiService);
    } catch (error) {
      console.error('Failed to fetch AI status:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAIStatus();
    // Refresh status every 30 seconds
    const interval = setInterval(fetchAIStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center space-x-2">
            <div className="animate-spin h-4 w-4 border-2 border-primary border-t-transparent rounded-full"></div>
            <span className="text-sm">Checking AI service status...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  const isLocal = aiStatus?.useLocalAI || false;
  const serviceName = aiStatus?.currentService || 'Unknown';

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center justify-between text-base">
            <div className="flex items-center gap-2">
              <Bot className="h-4 w-4" />
              ProcessGPT AI Service
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowControls(!showControls)}
            >
              <Settings className="h-4 w-4" />
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Current Service:</span>
            <Badge variant={isLocal ? 'default' : 'secondary'} className="flex items-center gap-1">
              {isLocal ? (
                <>
                  <Server className="h-3 w-3" />
                  Local AI
                </>
              ) : (
                <>
                  <Cloud className="h-3 w-3" />
                  Cloud AI
                </>
              )}
            </Badge>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Model:</span>
            <span className="text-sm text-muted-foreground">{serviceName}</span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Status:</span>
            <div className="flex items-center gap-1">
              <CheckCircle className="h-3 w-3 text-green-500" />
              <span className="text-sm text-green-600">Active</span>
            </div>
          </div>

          {isLocal && (
            <Alert>
              <Server className="h-4 w-4" />
              <AlertDescription className="text-sm">
                Running locally with complete data privacy. No external API calls.
              </AlertDescription>
            </Alert>
          )}

          {!isLocal && (
            <Alert>
              <Cloud className="h-4 w-4" />
              <AlertDescription className="text-sm">
                Using cloud-based OpenAI service. Data is sent to external servers.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {showControls && (
        <div className="space-y-4">
          <Separator />
          <AIServiceControls />
        </div>
      )}

      {!isLocal && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-amber-500" />
              Want Complete Privacy?
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Set up local AI to keep your manufacturing data completely private.
            </p>
            
            <div className="space-y-2">
              <h5 className="text-sm font-medium">Quick Setup Options:</h5>
              <ul className="text-xs space-y-1 ml-4">
                <li>• <strong>Local Machine:</strong> Install Ollama + Gemma 2</li>
                <li>• <strong>Google Colab:</strong> Free cloud setup</li>
                <li>• <strong>Docker:</strong> Container-based deployment</li>
              </ul>
            </div>

            <Button variant="outline" size="sm" className="w-full">
              <Server className="h-3 w-3 mr-1" />
              View Setup Guide
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}