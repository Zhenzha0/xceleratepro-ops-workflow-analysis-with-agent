import { FilesetResolver, LlmInference } from '@mediapipe/tasks-genai';

export interface LocalAIResponse {
  response: string;
  suggestedActions?: string[];
  visualizationData?: any;
}

export interface LocalAIConfig {
  modelPath: string;
  maxTokens?: number;
  temperature?: number;
  topK?: number;
  randomSeed?: number;
}

export class LocalAIService {
  private llmInference: LlmInference | null = null;
  private isInitialized = false;
  private config: LocalAIConfig;

  constructor(config: LocalAIConfig) {
    this.config = {
      maxTokens: 1000,
      temperature: 0.7,
      topK: 40,
      randomSeed: 101,
      ...config
    };
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      console.log('Initializing Local AI Service with MediaPipe...');
      
      // Initialize the FilesetResolver for GenAI tasks
      const genai = await FilesetResolver.forGenAiTasks(
        "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-genai@latest/wasm"
      );

      // Create LLM Inference instance
      this.llmInference = await LlmInference.createFromOptions(genai, {
        baseOptions: {
          modelAssetPath: this.config.modelPath
        },
        maxTokens: this.config.maxTokens,
        topK: this.config.topK,
        temperature: this.config.temperature,
        randomSeed: this.config.randomSeed
      });

      this.isInitialized = true;
      console.log('Local AI Service initialized successfully!');
    } catch (error) {
      console.error('Failed to initialize Local AI Service:', error);
      throw new Error(`Local AI initialization failed: ${error}`);
    }
  }

  async generateResponse(prompt: string): Promise<LocalAIResponse> {
    if (!this.isInitialized || !this.llmInference) {
      throw new Error('Local AI Service not initialized. Call initialize() first.');
    }

    try {
      console.log('Generating response with Local AI...');
      
      // Generate response using MediaPipe LLM
      const response = await this.llmInference.generateResponse(prompt);
      
      // Parse and structure the response
      const structuredResponse = this.parseAIResponse(response, prompt);
      
      console.log('Local AI response generated successfully');
      return structuredResponse;
    } catch (error) {
      console.error('Error generating Local AI response:', error);
      throw new Error(`Local AI generation failed: ${error}`);
    }
  }

  async generateStreamingResponse(
    prompt: string, 
    onPartialResult: (partial: string, done: boolean) => void
  ): Promise<void> {
    if (!this.isInitialized || !this.llmInference) {
      throw new Error('Local AI Service not initialized. Call initialize() first.');
    }

    try {
      console.log('Generating streaming response with Local AI...');
      
      // Generate streaming response
      this.llmInference.generateResponse(prompt, (partialResult, done) => {
        onPartialResult(partialResult, done);
      });
    } catch (error) {
      console.error('Error generating streaming Local AI response:', error);
      throw error;
    }
  }

  private parseAIResponse(response: string, originalPrompt: string): LocalAIResponse {
    // Enhanced parsing logic for process mining context
    const result: LocalAIResponse = {
      response: response.trim()
    };

    // Extract suggested actions if present
    const actionMatches = response.match(/(?:suggestions?|recommendations?|actions?):\s*([^.]+)/i);
    if (actionMatches) {
      result.suggestedActions = [actionMatches[1].trim()];
    }

    // Parse temporal analysis patterns
    if (originalPrompt.toLowerCase().includes('temporal') || 
        originalPrompt.toLowerCase().includes('time') ||
        originalPrompt.toLowerCase().includes('hour')) {
      result.visualizationData = this.extractTemporalData(response);
    }

    // Parse failure analysis patterns
    if (originalPrompt.toLowerCase().includes('failure') || 
        originalPrompt.toLowerCase().includes('error')) {
      result.visualizationData = this.extractFailureData(response);
    }

    return result;
  }

  private extractTemporalData(response: string): any {
    // Look for hour and count patterns in the response
    const hourMatches = response.match(/hour\s+(\d+).*?(\d+)\s+(?:failure|event|occurrence)/gi);
    
    if (hourMatches) {
      const temporalData = hourMatches.map(match => {
        const hourMatch = match.match(/hour\s+(\d+)/i);
        const countMatch = match.match(/(\d+)\s+(?:failure|event|occurrence)/i);
        
        return {
          hour: hourMatch ? parseInt(hourMatch[1]) : 0,
          count: countMatch ? parseInt(countMatch[1]) : 0
        };
      });

      return {
        type: 'temporal_failure_distribution',
        data: {
          hourlyData: temporalData
        }
      };
    }

    return null;
  }

  private extractFailureData(response: string): any {
    // Look for failure statistics in the response
    const percentageMatch = response.match(/(\d+(?:\.\d+)?)%.*?failure/i);
    const countMatch = response.match(/(\d+)\s+(?:total\s+)?failures?/i);

    if (percentageMatch || countMatch) {
      return {
        type: 'failure_analysis',
        data: {
          failurePercentage: percentageMatch ? parseFloat(percentageMatch[1]) : null,
          totalFailures: countMatch ? parseInt(countMatch[1]) : null
        }
      };
    }

    return null;
  }

  isReady(): boolean {
    return this.isInitialized && this.llmInference !== null;
  }

  async dispose(): Promise<void> {
    if (this.llmInference) {
      // MediaPipe LLM doesn't have explicit dispose method
      // Memory will be cleaned up by garbage collection
      this.llmInference = null;
    }
    this.isInitialized = false;
    console.log('Local AI Service disposed');
  }
}

// Factory function to create and initialize the service
export async function createLocalAIService(config?: Partial<LocalAIConfig>): Promise<LocalAIService> {
  const defaultConfig: LocalAIConfig = {
    modelPath: '/models/gemma2b-it.task', // Will be served from public directory
    maxTokens: 1000,
    temperature: 0.7,
    topK: 40,
    randomSeed: 101
  };

  const service = new LocalAIService({ ...defaultConfig, ...config });
  await service.initialize();
  return service;
}