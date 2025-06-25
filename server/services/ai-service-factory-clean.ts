import { AIAnalysisRequest, AIAnalysisResponse, AIAnalyst } from './ai-analyst';
import { Gemma2Service } from './gemma2-service';

/**
 * Factory to choose between Gemma 2B Local and OpenAI AI services
 */
export class AIServiceFactory {
  private static useGemma2 = process.env.USE_GEMMA2 === 'true';
  private static gemma2Service = new Gemma2Service();
  
  /**
   * Analyze query using the configured AI service
   */
  static async analyzeQuery(request: AIAnalysisRequest): Promise<AIAnalysisResponse> {
    try {
      // Check for Gemma 2B local model first
      if (this.useGemma2) {
        console.log('Using Gemma 2B local model for analysis...');
        return await this.gemma2Service.analyzeQuery(request);
      } else {
        // Default to OpenAI
        console.log('Using OpenAI for analysis...');
        const openAIService = new AIAnalyst();
        return await openAIService.analyzeQuery(request);
      }
    } catch (error) {
      console.error('AI service error:', error);
      
      // Fallback to OpenAI if Gemma 2B fails
      if (this.useGemma2) {
        console.log('Gemma 2B failed, falling back to OpenAI...');
        const openAIService = new AIAnalyst();
        return await openAIService.analyzeQuery(request);
      } else {
        throw error;
      }
    }
  }
  
  /**
   * Get current AI service status
   */
  static getStatus() {
    if (this.useGemma2) return { service: 'gemma2', name: 'Gemma 2B Local' };
    return { service: 'openai', name: 'OpenAI' };
  }
}