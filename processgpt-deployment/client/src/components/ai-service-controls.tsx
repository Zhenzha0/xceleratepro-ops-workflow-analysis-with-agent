import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Bot, Cloud, Server, Settings } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export function AIServiceControls() {
  const [currentService, setCurrentService] = useState<'openai' | 'local'>('openai');
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const switchToLocal = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/ai/switch-to-local', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      
      if (response.ok) {
        setCurrentService('local');
        toast({
          title: "Switched to Local AI",
          description: "ProcessGPT is now running on local Gemma 2 model"
        });
      } else {
        throw new Error('Failed to switch to local AI');
      }
    } catch (error) {
      toast({
        title: "Switch Failed",
        description: "Could not switch to local AI. Make sure Ollama is running.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const switchToOpenAI = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/ai/switch-to-openai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      
      if (response.ok) {
        setCurrentService('openai');
        toast({
          title: "Switched to OpenAI",
          description: "ProcessGPT is now using OpenAI GPT-4o model"
        });
      } else {
        throw new Error('Failed to switch to OpenAI');
      }
    } catch (error) {
      toast({
        title: "Switch Failed", 
        description: "Could not switch to OpenAI. Check your API key.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="h-5 w-5" />
          AI Service Configuration
        </CardTitle>
        <CardDescription>
          Choose between cloud-based OpenAI or local Gemma 2 model for ProcessGPT analysis
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="font-medium">Current Service:</span>
            <Badge variant={currentService === 'local' ? 'default' : 'secondary'}>
              {currentService === 'local' ? (
                <>
                  <Server className="h-3 w-3 mr-1" />
                  Local Gemma 2
                </>
              ) : (
                <>
                  <Cloud className="h-3 w-3 mr-1" />
                  OpenAI GPT-4o
                </>
              )}
            </Badge>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <h4 className="font-medium flex items-center gap-2">
              <Cloud className="h-4 w-4" />
              OpenAI GPT-4o
            </h4>
            <p className="text-sm text-muted-foreground">
              Cloud-based model with fast responses and advanced reasoning
            </p>
            <ul className="text-xs text-muted-foreground space-y-1">
              <li>• Requires internet connection</li>
              <li>• API costs per query</li>
              <li>• Fast response times</li>
              <li>• Data sent to OpenAI servers</li>
            </ul>
            <Button 
              onClick={switchToOpenAI} 
              disabled={isLoading || currentService === 'openai'}
              variant={currentService === 'openai' ? 'default' : 'outline'}
              className="w-full"
            >
              {currentService === 'openai' ? 'Currently Active' : 'Switch to OpenAI'}
            </Button>
          </div>

          <div className="space-y-2">
            <h4 className="font-medium flex items-center gap-2">
              <Server className="h-4 w-4" />
              Local Gemma 2
            </h4>
            <p className="text-sm text-muted-foreground">
              Local model running on your machine with complete privacy
            </p>
            <ul className="text-xs text-muted-foreground space-y-1">
              <li>• No internet required</li>
              <li>• No API costs</li>
              <li>• Complete data privacy</li>
              <li>• Requires local hardware</li>
            </ul>
            <Button 
              onClick={switchToLocal} 
              disabled={isLoading || currentService === 'local'}
              variant={currentService === 'local' ? 'default' : 'outline'}
              className="w-full"
            >
              {currentService === 'local' ? 'Currently Active' : 'Switch to Local AI'}
            </Button>
          </div>
        </div>

        <div className="mt-4 p-3 bg-muted rounded-lg">
          <h5 className="font-medium text-sm mb-2">Setup Local AI:</h5>
          <div className="text-xs space-y-1 font-mono">
            <div>1. bash scripts/setup-local-ai.sh</div>
            <div>2. ollama serve</div>
            <div>3. Click "Switch to Local AI" above</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}