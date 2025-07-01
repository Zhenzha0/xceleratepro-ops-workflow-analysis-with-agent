import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, BookOpen, Brain, Cloud, Cpu, Database, Loader2, Sparkles, Zap } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useToast } from '../hooks/use-toast';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';

// MediaPipe imports for client-side AI
let FilesetResolver: any = null;
let LlmInference: any = null;

// Dynamically import MediaPipe (client-side only)
const loadMediaPipe = async () => {
  if (typeof window !== 'undefined' && !FilesetResolver) {
    try {
      const mediapipe = await import('@mediapipe/tasks-genai');
      FilesetResolver = mediapipe.FilesetResolver;
      LlmInference = mediapipe.LlmInference;
      return true;
    } catch (error) {
      console.error('Failed to load MediaPipe:', error);
      return false;
    }
  }
  return !!FilesetResolver;
};

interface AIServiceStatus {
  useLocalAI: boolean;
  currentService: string;
  localAIReady: boolean;
}

interface LocalAIService {
  llmInference: any;
  isReady: boolean;
}

interface RAGStatus {
  isInitialized: boolean;
  knowledgeBaseSize: number;
  stats: {
    totalPairs: number;
    categories: string[];
    avgResponseLength: number;
  };
}

export function AIServiceControls() {
  const [status, setStatus] = useState<AIServiceStatus>({
    useLocalAI: false,
    currentService: 'OpenAI GPT-4o',
    localAIReady: false
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [localAI, setLocalAI] = useState<LocalAIService | null>(null);
  const [initProgress, setInitProgress] = useState<string>('');
  const [ragStatus, setRAGStatus] = useState<RAGStatus | null>(null);
  const [ragLoading, setRAGLoading] = useState(false);
  const { toast } = useToast();

  // Initialize MediaPipe on client-side
  const initializeLocalAI = async (): Promise<boolean> => {
    try {
      setInitProgress('Loading MediaPipe WASM modules...');
      console.log('Starting MediaPipe initialization...');
      
      // Load MediaPipe library
      const loaded = await loadMediaPipe();
      if (!loaded) {
        throw new Error('Failed to load MediaPipe library');
      }
      console.log('MediaPipe library loaded successfully');

      setInitProgress('Initializing GenAI tasks...');
      
      // Initialize the FilesetResolver for GenAI tasks
      const genai = await FilesetResolver.forGenAiTasks(
        "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-genai@latest/wasm"
      );
      console.log('FilesetResolver initialized');

            setInitProgress('Checking browser compatibility...');
      
      // Check WebGPU support
      const nav = navigator as any;
      if (!nav.gpu) {
        throw new Error('WebGPU is not supported in this browser. Please use Chrome, Edge, or another WebGPU-compatible browser.');
      }

      try {
        const adapter = await nav.gpu.requestAdapter();
        if (!adapter) {
          throw new Error('Failed to get WebGPU adapter. Please ensure your browser supports WebGPU.');
        }
        console.log('WebGPU adapter obtained successfully');
      } catch (webgpuError) {
        console.error('WebGPU error:', webgpuError);
        throw new Error(`WebGPU initialization failed: ${webgpuError}`);
      }

      setInitProgress('Loading Gemma model...');
      
      // Try multiple model paths and formats (prioritize Gemma-3 1B-IT)
      const modelPaths = [
        `${window.location.origin}/models/gemma3-1b-it.task`,
        `${window.location.origin}/models/gemma3-1b-it-web.task`,
        `${window.location.origin}/models/gemma-3-1b-it.task`,
        `${window.location.origin}/models/gemma2b-it.task`,
        `${window.location.origin}/models/gemma-2b-it.task`,
        `${window.location.origin}/models/gemma-2b-it.bin`
      ];

      let modelPath = null;
      let llmInference = null;

      // Try each model path
      for (const path of modelPaths) {
        try {
          const modelName = path.split('/').pop();
          setInitProgress(`Trying model: ${modelName}...`);
          console.log('Attempting to load model from:', path);
          
          // Check if model file is accessible
          const response = await fetch(path, { method: 'HEAD' });
          console.log(`Model file ${modelName} accessibility:`, response.status, response.statusText);
          
          if (response.ok) {
            const fileSize = response.headers.get('content-length');
            console.log(`Model file ${modelName} size:`, fileSize);
            
            // Try to create LLM Inference instance
            llmInference = await LlmInference.createFromOptions(genai, {
              baseOptions: {
                modelAssetPath: path
              },
              maxTokens: 1000,
              topK: 40,
              temperature: 0.7,
              randomSeed: 101
            });
            
            modelPath = path;
            console.log('Successfully loaded model:', path);
            break;
          }
        } catch (error) {
          console.log(`Failed to load model ${path.split('/').pop()}:`, error);
          continue;
        }
      }

      if (!llmInference) {
        throw new Error('No compatible MediaPipe model found. Please ensure you have a compatible Gemma model (.task format) in the /models directory. Supported models: gemma3-1b-it.task, gemma2b-it.task, gemma-2b-it.task, gemma-2b-it.bin');
      }
      
      console.log('LLM Inference created successfully with model:', modelPath);

      setInitProgress('Local AI ready!');
      
      setLocalAI({
        llmInference,
        isReady: true
      });

      return true;
    } catch (error) {
      console.error('Local AI initialization failed:', error);
      setError(`Local AI initialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return false;
    }
  };

  // Fetch current status
  const fetchStatus = async () => {
    try {
      const response = await fetch('/api/ai/status');
      if (response.ok) {
        const data = await response.json();
        setStatus(data);
        setError(null);
      }
    } catch (error) {
      console.error('Failed to fetch AI status:', error);
    }
  };

  // Switch to local AI
  const switchToLocalAI = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/ai/switch-to-local', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setStatus({
            useLocalAI: true,
            currentService: 'Local AI Analysis Engine',
            localAIReady: true
          });
          toast({
            title: "🤖 Local AI Activated",
            description: "Now using offline local AI analysis engine",
          });
        } else {
          throw new Error(data.message || 'Failed to switch to local AI');
        }
      } else {
        throw new Error('Failed to switch to local AI');
      }
    } catch (error) {
      console.error('Error switching to local AI:', error);
      setError(error instanceof Error ? error.message : 'Failed to switch to local AI');
      toast({
        title: "❌ Failed to switch to Local AI",
        description: error instanceof Error ? error.message : 'Unknown error occurred',
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Switch to OpenAI
  const switchToOpenAI = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/ai/switch-to-openai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setStatus({
            useLocalAI: false,
            currentService: 'OpenAI GPT-4o',
            localAIReady: true
          });
          toast({
            title: "☁️ OpenAI Activated",
            description: "Now using OpenAI cloud-based analysis",
          });
        } else {
          throw new Error(data.message || 'Failed to switch to OpenAI');
        }
      } else {
        throw new Error('Failed to switch to OpenAI');
      }
    } catch (error) {
      console.error('Error switching to OpenAI:', error);
      setError(error instanceof Error ? error.message : 'Failed to switch to OpenAI');
      toast({
        title: "❌ Failed to switch to OpenAI",
        description: error instanceof Error ? error.message : 'Unknown error occurred',
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch RAG system status
  const fetchRAGStatus = async () => {
    try {
      const response = await fetch('/api/rag/status');
      if (response.ok) {
        const data = await response.json();
        setRAGStatus(data);
      }
    } catch (error) {
      console.error('Failed to fetch RAG status:', error);
    }
  };

  // Build RAG knowledge base
  const buildKnowledgeBase = async (forceRebuild: boolean = false) => {
    setRAGLoading(true);
    try {
      const response = await fetch('/api/rag/build-knowledge-base', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ forceRebuild })
      });

      const data = await response.json();
      
      if (response.ok && data.success) {
        toast({
          title: "🧠 Knowledge Base Built",
          description: `Successfully built RAG knowledge base with ${data.stats.totalPairs} Q&A pairs`,
        });
        await fetchRAGStatus();
      } else {
        throw new Error(data.message || 'Failed to build knowledge base');
      }
    } catch (error) {
      toast({
        title: "❌ Build Failed",
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: "destructive"
      });
    } finally {
      setRAGLoading(false);
    }
  };

  // Clear RAG knowledge base
  const clearKnowledgeBase = async () => {
    setRAGLoading(true);
    try {
      const response = await fetch('/api/rag/clear', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

      const data = await response.json();
      
      if (response.ok && data.success) {
        toast({
          title: "🗑️ Knowledge Base Cleared",
          description: "RAG knowledge base has been cleared",
        });
        await fetchRAGStatus();
      } else {
        throw new Error(data.message || 'Failed to clear knowledge base');
      }
    } catch (error) {
      toast({
        title: "❌ Clear Failed",
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: "destructive"
      });
    } finally {
      setRAGLoading(false);
    }
  };

  // Load status on component mount
  useEffect(() => {
    fetchStatus();
    fetchRAGStatus();
  }, []);

  // Expose local AI service globally for the chat to use
  useEffect(() => {
    if (localAI && localAI.isReady) {
      (window as any).localAIService = localAI;
    } else {
      (window as any).localAIService = null;
    }
  }, [localAI]);

  return (
    <div className="space-y-4 p-4 max-w-4xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5" />
            AI Service Configuration
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {status.useLocalAI ? (
                <Cpu className="h-5 w-5 text-blue-600" />
              ) : (
                <Cloud className="h-5 w-5 text-green-600" />
              )}
              <div>
                <p className="font-medium">{status.currentService}</p>
                <p className="text-sm text-muted-foreground">
                  {status.useLocalAI ? 'Offline Local Processing' : 'Cloud-based Processing'}
                </p>
              </div>
            </div>
            <Badge variant={status.localAIReady ? "default" : "secondary"}>
              {status.localAIReady ? "Ready" : "Not Ready"}
            </Badge>
          </div>

          <div className="flex gap-2">
            <Button
              onClick={switchToLocalAI}
              disabled={isLoading}
              variant={status.useLocalAI ? "default" : "outline"}
              className="flex-1"
            >
              {isLoading && status.useLocalAI ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Cpu className="h-4 w-4 mr-2" />
              )}
              Local AI
            </Button>
            <Button
              onClick={switchToOpenAI}
              disabled={isLoading}
              variant={!status.useLocalAI ? "default" : "outline"}
              className="flex-1"
            >
              {isLoading && !status.useLocalAI ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Cloud className="h-4 w-4 mr-2" />
              )}
              OpenAI
            </Button>
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {initProgress && (
            <Alert>
              <Loader2 className="h-4 w-4 animate-spin" />
              <AlertDescription>{initProgress}</AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* RAG Knowledge Base Management */}
      {status.useLocalAI && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              RAG Knowledge Base
              <Badge variant="outline" className="ml-2">
                Local AI Enhancement
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
              <div className="flex items-start gap-3">
                <BookOpen className="h-5 w-5 text-blue-600 mt-0.5" />
                <div>
                  <h4 className="font-medium text-blue-900">How RAG Works</h4>
                  <p className="text-sm text-blue-700 mt-1">
                    RAG (Retrieval-Augmented Generation) enhances your local AI by learning from OpenAI responses. 
                    First, build the knowledge base using OpenAI for your 25 key questions. Then local AI can generate 
                    better responses offline using these learned patterns.
                  </p>
                </div>
              </div>
            </div>

            {ragStatus && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-gray-50 p-3 rounded-lg">
                  <p className="text-sm text-gray-600">Knowledge Base Size</p>
                  <p className="font-semibold text-lg">{ragStatus.knowledgeBaseSize} Q&A pairs</p>
                </div>
                <div className="bg-gray-50 p-3 rounded-lg">
                  <p className="text-sm text-gray-600">Categories</p>
                  <p className="font-semibold text-lg">{ragStatus.stats?.categories?.length || 0}</p>
                </div>
                <div className="bg-gray-50 p-3 rounded-lg">
                  <p className="text-sm text-gray-600">Avg Response Length</p>
                  <p className="font-semibold text-lg">{ragStatus.stats?.avgResponseLength || 0} chars</p>
                </div>
              </div>
            )}

            <div className="space-y-3">
              <div className="flex gap-2">
                <Button
                  onClick={() => buildKnowledgeBase(false)}
                  disabled={ragLoading}
                  className="flex-1"
                  variant="default"
                >
                  {ragLoading ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Sparkles className="h-4 w-4 mr-2" />
                  )}
                                     {(ragStatus?.knowledgeBaseSize || 0) > 0 ? 'Update' : 'Build'} Knowledge Base
                </Button>
                <Button
                  onClick={() => buildKnowledgeBase(true)}
                  disabled={ragLoading}
                  variant="outline"
                >
                  {ragLoading ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Zap className="h-4 w-4 mr-2" />
                  )}
                  Force Rebuild
                </Button>
              </div>

                             {(ragStatus?.knowledgeBaseSize || 0) > 0 && (
                <Button
                  onClick={clearKnowledgeBase}
                  disabled={ragLoading}
                  variant="destructive"
                  className="w-full"
                >
                  Clear Knowledge Base
                </Button>
              )}
            </div>

            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <strong>Prerequisites:</strong> OpenAI API key is required to build the knowledge base. 
                The system will use OpenAI to generate high-quality responses for your 25 training questions, 
                then store them locally for offline use.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      )}
    </div>
  );
}