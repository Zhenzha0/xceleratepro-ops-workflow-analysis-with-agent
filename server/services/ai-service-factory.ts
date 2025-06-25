import { AIAnalysisRequest, AIAnalysisResponse, AIAnalyst } from './ai-analyst';
import { LocalAIService } from './local-ai-service';
import { GeminiService } from './gemini-service';
import { TrueLocalAIService } from './true-local-ai-service';

/**
 * Factory to choose between OpenAI, Local AI, Gemini, and True Local AI based on configuration
 */
export class AIServiceFactory {
  private static useLocalAI = process.env.USE_LOCAL_AI === 'true';
  private static useGemini = process.env.USE_GEMINI === 'true';
  private static useTrueLocal = process.env.USE_TRUE_LOCAL_AI === 'true';
  private static localAIService = new LocalAIService();
  
  /**
   * Analyze query using the configured AI service
   */
  static async analyzeQuery(request: AIAnalysisRequest): Promise<AIAnalysisResponse> {
    try {
      if (this.useTrueLocal) {
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
      if (this.useTrueLocal || this.useGemini || this.useLocalAI) {
        console.log('Primary AI service failed, falling back to OpenAI...');
        return await AIAnalyst.analyzeQuery(request);
      } else {
        throw error;
      }
    }
  }
  
  /**
   * Switch to True Local AI (Ollama/LM Studio)
   */
  static enableTrueLocalAI(host?: string, model?: string) {
    this.useTrueLocal = true;
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
    this.useTrueLocal = false;
    this.useLocalAI = false;
    console.log('Switched to Google Gemini model');
  }
  
  /**
   * Switch to local AI
   */
  static enableLocalAI() {
    this.useLocalAI = true;
    this.useTrueLocal = false;
    this.useGemini = false;
    console.log('Switched to local Gemma 2 model');
  }
  
  /**
   * Switch to OpenAI
   */
  static enableOpenAI() {
    this.useLocalAI = false;
    this.useTrueLocal = false;
    this.useGemini = false;
    console.log('Switched to OpenAI model');
  }
  
  /**
   * Get current AI service status
   */
  static getStatus() {
    let currentService = 'OpenAI GPT-4o';
    if (this.useTrueLocal) {
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
      currentService
    };
  }
  
  /**
   * Test true local AI connection
   */
  static async testTrueLocalConnection() {
    return await TrueLocalAIService.testConnection();
  }
}