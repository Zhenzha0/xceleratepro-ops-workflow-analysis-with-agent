import { AIAnalysisRequest, AIAnalysisResponse, AIAnalyst } from './ai-analyst';
import { LocalAIService } from './local-ai-service';

/**
 * Factory to choose between OpenAI and Local AI based on configuration
 */
export class AIServiceFactory {
  private static useLocalAI = process.env.USE_LOCAL_AI === 'true';
  private static localAIService = new LocalAIService();
  
  /**
   * Analyze query using the configured AI service
   */
  static async analyzeQuery(request: AIAnalysisRequest): Promise<AIAnalysisResponse> {
    try {
      if (this.useLocalAI) {
        console.log('Using local Gemma 2 model for analysis...');
        return await this.localAIService.analyzeQuery(request);
      } else {
        console.log('Using OpenAI for analysis...');
        return await AIAnalyst.analyzeQuery(request);
      }
    } catch (error) {
      console.error('AI service error:', error);
      
      // Fallback to the other service if one fails
      if (this.useLocalAI) {
        console.log('Local AI failed, falling back to OpenAI...');
        return await AIAnalyst.analyzeQuery(request);
      } else {
        console.log('OpenAI failed, falling back to local AI...');
        return await this.localAIService.analyzeQuery(request);
      }
    }
  }
  
  /**
   * Switch to local AI
   */
  static enableLocalAI() {
    this.useLocalAI = true;
    console.log('Switched to local Gemma 2 model');
  }
  
  /**
   * Switch to OpenAI
   */
  static enableOpenAI() {
    this.useLocalAI = false;
    console.log('Switched to OpenAI model');
  }
  
  /**
   * Get current AI service status
   */
  static getStatus() {
    return {
      useLocalAI: this.useLocalAI,
      currentService: this.useLocalAI ? 'Local Gemma 2' : 'OpenAI GPT-4o'
    };
  }
}