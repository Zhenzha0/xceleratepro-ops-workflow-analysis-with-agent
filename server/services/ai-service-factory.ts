import { AIAnalysisRequest, AIAnalysisResponse, AIAnalyst } from './ai-analyst';
import { Gemma2Service } from './gemma2-service';

/**
 * Factory to choose between OpenAI, Local AI, Gemini, True Local AI, and Android Emulator AI based on configuration
 */
export class AIServiceFactory {
  private static useGemma2 = process.env.USE_GEMMA2 === 'true';
  private static gemma2Service = new Gemma2Service();
  
  /**
   * Analyze query using the configured AI service
   */
  static async analyzeQuery(request: AIAnalysisRequest): Promise<AIAnalysisResponse> {
    try {
      // Check for TinyLlama first (your downloaded local model)
      if (this.useTinyLlama) {
        const tinyLlamaService = new TinyLlamaService();
        return await tinyLlamaService.analyzeQuery(request);
      }
      
      // Check for Google AI Edge
      if (process.env.USE_GOOGLE_AI_EDGE === 'true' || this.useGoogleAIEdge) {
        console.log('Using Google AI Edge (your local edge model) for analysis...');
        return await GoogleAIEdgeService.analyzeQuery(request);
      } else if (process.env.USE_EMULATOR_BRIDGE === 'true' || this.useEmulatorBridge) {
        console.log('Using Emulator Bridge (your AI Edge Gallery Qwen model) for analysis...');
        return await EmulatorBridgeService.analyzeQuery(request);
      } else if (process.env.USE_MEDIAPIPE_AI === 'true' || this.useMediaPipe) {
        console.log('Using MediaPipe LLM Inference for analysis...');
        return await MediaPipeAIService.analyzeQuery(request);
      } else if (process.env.USE_ANDROID_DIRECT_AI === 'true' || this.useAndroidDirect) {
        console.log('Using Android Direct AI (AI Edge Gallery) for analysis...');
        return await AndroidDirectAIService.analyzeQuery(request);
      } else if (this.useAndroidEmulator) {
        console.log('Using Android Emulator AI (Google AI Edge) for analysis...');
        return await AndroidEmulatorAIService.analyzeQuery(request);
      } else if (this.useTrueLocal) {
        console.log('Using True Local AI (Ollama/LM Studio) for analysis...');
        return await TrueLocalAIService.analyzeQuery(request);
      } else if (this.useGemini) {
        console.log('Using Google Gemini for analysis...');
        return await GeminiService.analyzeQuery(request);
      } else if (this.useLocalAI) {
        console.log('Using local Gemma 2 model for analysis...');
        return await this.localAIService.analyzeQuery(request);
      } else {
        console.log('Using OpenAI for analysis...');
        return await AIAnalyst.analyzeQuery(request);
      }
    } catch (error) {
      console.error('AI service error:', error);
      
      // Fallback to OpenAI if other services fail
      if (this.useMediaPipe || this.useAndroidDirect || this.useAndroidEmulator || this.useTrueLocal || this.useGemini || this.useLocalAI) {
        console.log('Primary AI service failed, falling back to OpenAI...');
        return await AIAnalyst.analyzeQuery(request);
      } else {
        throw error;
      }
    }
  }
  
  /**
   * Switch to Android Emulator AI (Google AI Edge)
   */
  static enableAndroidEmulatorAI(host?: string, model?: string) {
    this.useAndroidEmulator = true;
    this.useTrueLocal = false;
    this.useGemini = false;
    this.useLocalAI = false;
    
    if (host || model) {
      AndroidEmulatorAIService.configure(host || 'http://10.0.2.2:8080', model);
    }
    
    console.log('Switched to Android Emulator AI (Google AI Edge)');
  }
  
  /**
   * Switch to True Local AI (Ollama/LM Studio)
   */
  static enableTrueLocalAI(host?: string, model?: string) {
    this.useTrueLocal = true;
    this.useAndroidEmulator = false;
    this.useGemini = false;
    this.useLocalAI = false;
    
    if (host || model) {
      TrueLocalAIService.configure(host || 'http://localhost:11434', model);
    }
    
    console.log('Switched to True Local AI model');
  }
  
  /**
   * Switch to Gemini AI
   */
  static enableGemini() {
    this.useGemini = true;
    this.useAndroidEmulator = false;
    this.useTrueLocal = false;
    this.useLocalAI = false;
    console.log('Switched to Google Gemini model');
  }
  
  /**
   * Switch to local AI
   */
  static enableLocalAI() {
    this.useLocalAI = true;
    this.useAndroidEmulator = false;
    this.useTrueLocal = false;
    this.useGemini = false;
    console.log('Switched to local Gemma 2 model');
  }
  
  /**
   * Switch to Google AI Edge (uses your local edge model)
   */
  static enableGoogleAIEdge(modelPath?: string, host?: string, port?: number) {
    this.useGoogleAIEdge = true;
    this.useEmulatorBridge = false;
    this.useMediaPipe = false;
    this.useAndroidDirect = false;
    this.useLocalAI = false;
    this.useAndroidEmulator = false;
    this.useTrueLocal = false;
    this.useGemini = false;
    
    if (modelPath && host && port) {
      GoogleAIEdgeService.configure(modelPath, host, port);
    }
    console.log('Switched to Google AI Edge (local edge model)');
  }

  /**
   * Switch to Emulator Bridge (uses your actual AI Edge Gallery model)
   */
  static enableEmulatorBridge(host?: string, port?: number, model?: string) {
    this.useEmulatorBridge = true;
    this.useMediaPipe = false;
    this.useAndroidDirect = false;
    this.useLocalAI = false;
    this.useAndroidEmulator = false;
    this.useTrueLocal = false;
    this.useGemini = false;
    
    if (host && port && model) {
      EmulatorBridgeService.configure(host, port, model);
    }
    console.log('Switched to Emulator Bridge (AI Edge Gallery Qwen model)');
  }

  /**
   * Switch to MediaPipe AI
   */
  static enableMediaPipeAI(host?: string, model?: string) {
    this.useMediaPipe = true;
    this.useEmulatorBridge = false;
    this.useAndroidDirect = false;
    this.useLocalAI = false;
    this.useAndroidEmulator = false;
    this.useTrueLocal = false;
    this.useGemini = false;
    
    if (host && model) {
      MediaPipeAIService.configure(host, model);
    }
    console.log('Switched to MediaPipe LLM Inference');
  }

  /**
   * Switch to Android Direct AI
   */
  static enableAndroidDirectAI() {
    this.useAndroidDirect = true;
    this.useMediaPipe = false;
    this.useLocalAI = false;
    this.useAndroidEmulator = false;
    this.useTrueLocal = false;
    this.useGemini = false;
    console.log('Switched to Android Direct AI model');
  }
  
  /**
   * Switch to OpenAI
   */
  static enableOpenAI() {
    this.useMediaPipe = false;
    this.useAndroidDirect = false;
    this.useLocalAI = false;
    this.useAndroidEmulator = false;
    this.useTrueLocal = false;
    this.useGemini = false;
    console.log('Switched to OpenAI model');
  }
  
  /**
   * Get current AI service status
   */
  static getStatus() {
    let currentService = 'OpenAI GPT-4o';
    if (this.useAndroidEmulator) {
      currentService = 'Android Emulator AI (Google AI Edge)';
    } else if (this.useTrueLocal) {
      currentService = 'True Local AI (Ollama/LM Studio)';
    } else if (this.useGemini) {
      currentService = 'Google Gemini';
    } else if (this.useLocalAI) {
      currentService = 'Gemma 2 (Local)';
    }
    
    return {
      useLocalAI: this.useLocalAI,
      useGemini: this.useGemini,
      useTrueLocal: this.useTrueLocal,
      useAndroidEmulator: this.useAndroidEmulator,
      currentService
    };
  }
  
  /**
   * Test true local AI connection
   */
  static async testTrueLocalConnection() {
    return await TrueLocalAIService.testConnection();
  }
  
  /**
   * Test Android emulator AI connection
   */
  static async testAndroidEmulatorConnection() {
    return await AndroidEmulatorAIService.testConnection();
  }
}