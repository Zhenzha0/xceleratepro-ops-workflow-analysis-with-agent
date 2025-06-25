import { AIAnalysisRequest, AIAnalysisResponse, AIAnalyst } from './ai-analyst';
import { LocalAIService } from './local-ai-service';
import { GeminiService } from './gemini-service';

/**
 * Factory to choose between OpenAI, Local AI, and Gemini based on configuration
 */
export class AIServiceFactory {
  private static useLocalAI = process.env.USE_LOCAL_AI === 'true';
  private static useGemini = process.env.USE_GEMINI === 'true';
  private static localAIService = new LocalAIService();
  
  /**
   * Analyze query using the configured AI service
   */
  static async analyzeQuery(request: AIAnalysisRequest): Promise<AIAnalysisResponse> {
    try {
      if (this.useGemini) {
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
      if (this.useGemini || this.useLocalAI) {
        console.log('Primary AI service failed, falling back to OpenAI...');
        return await AIAnalyst.analyzeQuery(request);
      } else {
        throw error;
      }
    }
  }
  
  /**
   * Switch to Gemini AI
   */
  static enableGemini() {
    this.useGemini = true;
    this.useLocalAI = false;
    console.log('Switched to Google Gemini model');
  }
  
  /**
   * Switch to local AI
   */
  static enableLocalAI() {
    this.useLocalAI = true;
    this.useGemini = false;
    console.log('Switched to local Gemma 2 model');
  }
  
  /**
   * Switch to OpenAI
   */
  static enableOpenAI() {
    this.useLocalAI = false;
    this.useGemini = false;
    console.log('Switched to OpenAI model');
  }
  
  /**
   * Get current AI service status
   */
  static getStatus() {
    let currentService = 'OpenAI GPT-4o';
    if (this.useGemini) {
      currentService = 'Google Gemini';
    } else if (this.useLocalAI) {
      currentService = 'Gemma 2 (Local)';
    }
    
    return {
      useLocalAI: this.useLocalAI,
      useGemini: this.useGemini,
      currentService
    };
  }
}