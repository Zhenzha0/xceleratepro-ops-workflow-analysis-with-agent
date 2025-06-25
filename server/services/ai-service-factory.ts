import { AIAnalysisRequest, AIAnalysisResponse, AIAnalyst } from './ai-analyst';
import { Gemma2Service } from './gemma2-service';

/**
 * Factory to choose between Gemma 2B Local and OpenAI AI services
 */
export class AIServiceFactory {
  private static useGemma2 = true; // Force use Gemma 2B since user switched to it
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
        const { IntelligentAnalyst } = await import('./intelligent-analyst');
        const openAIService = new IntelligentAnalyst();
        return await openAIService.analyzeQuery(request);
      }
    } catch (error) {
      console.error('AI service error:', error);
      
      // Fallback to OpenAI if Gemma 2B fails
      if (this.useGemma2) {
        console.log('Gemma 2B failed, falling back to OpenAI...');
        const { IntelligentAnalyst } = await import('./intelligent-analyst');
        const openAIService = new IntelligentAnalyst();
        return await openAIService.analyzeQuery(request);
      } else {
        throw error;
      }
    }
  }
  
  /**
   * Switch to Gemma 2B local model
   */
  static switchToGemma2() {
    this.useGemma2 = true;
    console.log('Switched to Gemma 2B local model');
  }
  
  /**
   * Switch to OpenAI
   */
  static switchToOpenAI() {
    this.useGemma2 = false;
    console.log('Switched to OpenAI');
  }
  
  /**
   * Get current AI service status
   */
  static getStatus() {
    if (this.useGemma2) return { service: 'gemma2', name: 'Gemma 2B Local' };
    return { service: 'openai', name: 'OpenAI' };
  }
}