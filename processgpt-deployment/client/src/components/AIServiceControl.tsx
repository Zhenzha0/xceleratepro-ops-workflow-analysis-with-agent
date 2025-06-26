import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Smartphone, Cpu, Cloud, Database, Zap, Wifi, WifiOff } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

interface ConnectionStatus {
  success: boolean;
  error?: string;
  modelInfo?: {
    model: string;
    device: string;
    type: string;
  };
}

export function AIServiceControl() {
  const [currentService, setCurrentService] = useState<string>("openai");
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus | null>(null);
  const { toast } = useToast();

  const switchToAndroidDirect = async () => {
    setIsConnecting(true);
    try {
      const response = await fetch("/api/ai/switch-to-android-direct", {
        method: "POST",
        headers: { "Content-Type": "application/json" }
      });
      
      const data = await response.json();
      
      if (data.status === "success") {
        setCurrentService("android_direct");
        setConnectionStatus(data.connectionTest);
        toast({
          title: "Android Direct AI Connected",
          description: "ProcessGPT now using direct AI Edge Gallery connection"
        });
      } else {
        throw new Error(data.message);
      }
    } catch (error: any) {
      toast({
        title: "Connection Failed",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setIsConnecting(false);
    }
  };

  const switchToOpenAI = async () => {
    setIsConnecting(true);
    try {
      const response = await fetch("/api/ai/switch-to-openai", {
        method: "POST",
        headers: { "Content-Type": "application/json" }
      });
      
      const data = await response.json();
      
      if (data.status === "success") {
        setCurrentService("openai");
        setConnectionStatus(null);
        toast({
          title: "OpenAI Connected",
          description: "ProcessGPT now using OpenAI GPT-4o"
        });
      }
    } catch (error: any) {
      toast({
        title: "Connection Failed",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setIsConnecting(false);
    }
  };

  const getServiceIcon = (service: string) => {
    switch (service) {
      case "android_direct": return <Smartphone className="h-4 w-4" />;
      case "openai": return <Cloud className="h-4 w-4" />;
      default: return <Cpu className="h-4 w-4" />;
    }
  };

  const getServiceBadge = (service: string) => {
    const isActive = currentService === service;
    const variant = isActive ? "default" : "outline";
    
    switch (service) {
      case "android_direct":
        return (
          <Badge variant={variant} className="gap-2">
            <Smartphone className="h-3 w-3" />
            Android Direct
            {connectionStatus?.success ? (
              <Wifi className="h-3 w-3 text-green-500" />
            ) : (
              <WifiOff className="h-3 w-3 text-red-500" />
            )}
          </Badge>
        );
      case "openai":
        return (
          <Badge variant={variant} className="gap-2">
            <Cloud className="h-3 w-3" />
            OpenAI Cloud
          </Badge>
        );
      default:
        return null;
    }
  };

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {getServiceIcon(currentService)}
          AI Service Control
        </CardTitle>
        <CardDescription>
          Connect ProcessGPT to your preferred AI service
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-2">
          {getServiceBadge("android_direct")}
          {getServiceBadge("openai")}
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <h4 className="font-semibold flex items-center gap-2">
              <Smartphone className="h-4 w-4" />
              Android Direct AI
            </h4>
            <p className="text-sm text-muted-foreground">
              Connect directly to your Qwen2.5-1.5B model in AI Edge Gallery
            </p>
            <Button 
              onClick={switchToAndroidDirect}
              disabled={isConnecting}
              variant={currentService === "android_direct" ? "default" : "outline"}
              className="w-full"
            >
              {isConnecting ? "Connecting..." : "Use Android Direct"}
            </Button>
          </div>
          
          <div className="space-y-2">
            <h4 className="font-semibold flex items-center gap-2">
              <Cloud className="h-4 w-4" />
              OpenAI Cloud
            </h4>
            <p className="text-sm text-muted-foreground">
              Use OpenAI GPT-4o for manufacturing analysis
            </p>
            <Button 
              onClick={switchToOpenAI}
              disabled={isConnecting}
              variant={currentService === "openai" ? "default" : "outline"}
              className="w-full"
            >
              {isConnecting ? "Connecting..." : "Use OpenAI"}
            </Button>
          </div>
        </div>

        {connectionStatus && (
          <div className="mt-4 p-3 border rounded-lg">
            <h5 className="font-medium mb-2">Connection Status</h5>
            {connectionStatus.success ? (
              <div className="text-green-600">
                <div className="flex items-center gap-2 mb-1">
                  <Wifi className="h-4 w-4" />
                  Connected to {connectionStatus.modelInfo?.model}
                </div>
                <div className="text-sm">
                  Device: {connectionStatus.modelInfo?.device} 
                  ({connectionStatus.modelInfo?.type})
                </div>
              </div>
            ) : (
              <div className="text-red-600">
                <div className="flex items-center gap-2 mb-1">
                  <WifiOff className="h-4 w-4" />
                  Connection Failed
                </div>
                <div className="text-sm">{connectionStatus.error}</div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}