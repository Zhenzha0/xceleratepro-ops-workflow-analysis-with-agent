import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CheckCircle, XCircle, Smartphone, Cpu, WifiOff } from 'lucide-react';

interface AndroidEmulatorAIControlProps {
  onStatusChange?: (status: any) => void;
}

export function AndroidEmulatorAIControl({ onStatusChange }: AndroidEmulatorAIControlProps) {
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<any>(null);
  const [emulatorHost, setEmulatorHost] = useState('http://10.0.2.2:8080');
  const [modelName, setModelName] = useState('gemini-nano');
  const [error, setError] = useState<string | null>(null);

  // Test connection to Android emulator
  const testConnection = async () => {
    setIsConnecting(true);
    setError(null);
    
    try {
      const response = await fetch('/api/health');
      const data = await response.json();
      
      if (data.useAndroidEmulator && data.connectionTest) {
        setConnectionStatus(data.connectionTest);
        onStatusChange?.(data);
      } else {
        setConnectionStatus(null);
      }
    } catch (err) {
      setError('Failed to check connection status');
    } finally {
      setIsConnecting(false);
    }
  };

  // Switch to Android Emulator AI
  const switchToAndroidEmulator = async () => {
    setIsConnecting(true);
    setError(null);
    
    try {
      const response = await fetch('/api/ai/switch-to-android-emulator', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          host: emulatorHost,
          model: modelName
        })
      });
      
      const data = await response.json();
      
      if (data.status === 'success') {
        setConnectionStatus({
          success: true,
          modelInfo: data.modelInfo
        });
        onStatusChange?.(data);
      } else {
        setError(data.error || 'Failed to connect to Android emulator');
      }
    } catch (err) {
      setError('Network error connecting to Android emulator');
    } finally {
      setIsConnecting(false);
    }
  };

  useEffect(() => {
    testConnection();
  }, []);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Smartphone className="h-5 w-5" />
          Android Emulator AI (Google AI Edge)
        </CardTitle>
        <CardDescription>
          Use Gemini Nano running locally in Android emulator for complete offline AI
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Connection Status */}
        {connectionStatus ? (
          <Alert>
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>
              <div className="flex items-center justify-between">
                <span>Connected to Android Emulator AI</span>
                <Badge variant="secondary">
                  {connectionStatus.modelInfo?.model || 'Gemini Nano'}
                </Badge>
              </div>
              <div className="mt-2 text-sm text-muted-foreground">
                Device: {connectionStatus.modelInfo?.device || 'Android Emulator'} | 
                Type: {connectionStatus.modelInfo?.type || 'Google AI Edge'}
              </div>
            </AlertDescription>
          </Alert>
        ) : (
          <Alert>
            <XCircle className="h-4 w-4" />
            <AlertDescription>
              Android emulator AI not connected. Make sure:
              <ul className="mt-2 ml-4 list-disc text-sm space-y-1">
                <li>Android Studio emulator is running</li>
                <li>AI Edge Gallery app is installed</li>
                <li>Gemini Nano model is downloaded</li>
                <li>Bridge service is running on port 8080</li>
              </ul>
            </AlertDescription>
          </Alert>
        )}

        {/* Configuration */}
        <div className="space-y-4">
          <div>
            <Label htmlFor="emulator-host">Emulator Host</Label>
            <Input
              id="emulator-host"
              value={emulatorHost}
              onChange={(e) => setEmulatorHost(e.target.value)}
              placeholder="http://10.0.2.2:8080"
            />
            <p className="text-sm text-muted-foreground mt-1">
              Default Android emulator network address
            </p>
          </div>
          
          <div>
            <Label htmlFor="model-name">Model</Label>
            <Input
              id="model-name"
              value={modelName}
              onChange={(e) => setModelName(e.target.value)}
              placeholder="gemini-nano"
            />
            <p className="text-sm text-muted-foreground mt-1">
              AI model running in Android emulator
            </p>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <Alert variant="destructive">
            <XCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Action Buttons */}
        <div className="flex gap-2">
          <Button
            onClick={switchToAndroidEmulator}
            disabled={isConnecting}
            className="flex-1"
          >
            {isConnecting ? (
              <>
                <Cpu className="mr-2 h-4 w-4 animate-spin" />
                Connecting...
              </>
            ) : (
              <>
                <Smartphone className="mr-2 h-4 w-4" />
                Use Android Emulator AI
              </>
            )}
          </Button>
          
          <Button
            onClick={testConnection}
            variant="outline"
            disabled={isConnecting}
          >
            Test Connection
          </Button>
        </div>

        {/* Benefits */}
        <div className="border-t pt-4">
          <h4 className="font-medium mb-2">Benefits</h4>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="flex items-center gap-2">
              <WifiOff className="h-4 w-4 text-green-600" />
              <span>Complete Offline</span>
            </div>
            <div className="flex items-center gap-2">
              <Smartphone className="h-4 w-4 text-blue-600" />
              <span>Google AI Edge</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <span>Data Privacy</span>
            </div>
            <div className="flex items-center gap-2">
              <Cpu className="h-4 w-4 text-purple-600" />
              <span>Local Inference</span>
            </div>
          </div>
        </div>

        {/* Setup Guide Link */}
        <div className="border-t pt-4">
          <p className="text-sm text-muted-foreground">
            Need help setting up? See the{' '}
            <a 
              href="/android-emulator-setup-guide.md" 
              className="text-blue-600 hover:underline"
              target="_blank"
            >
              Android Emulator Setup Guide
            </a>
          </p>
        </div>
      </CardContent>
    </Card>
  );
}