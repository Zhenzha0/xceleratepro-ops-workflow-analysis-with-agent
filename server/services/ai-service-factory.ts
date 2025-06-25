import { AIAnalysisRequest, AIAnalysisResponse } from './ai-analyst';
import { Gemma2Service } from './gemma2-service';

/**
 * Factory to choose between Gemma 2B Local and OpenAI AI services
 */
export class AIServiceFactory {
  private static useGemma2 = false; // Default to OpenAI since Gemma 2B requires local connection
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
        // Default to ProcessGPT (original system)
        console.log('Using ProcessGPT for analysis...');
        const { AIAnalyst } = await import('./ai-analyst');
        return await AIAnalyst.analyzeQuery(request);
      }
    } catch (error) {
      console.error('AI service error:', error);
      
      // Fallback to OpenAI if Gemma 2B fails
      if (this.useGemma2) {
        console.log('Gemma 2B failed, falling back to ProcessGPT...');
        this.useGemma2 = false; // Switch to ProcessGPT permanently for this session
        const { AIAnalyst } = await import('./ai-analyst');
        return await AIAnalyst.analyzeQuery(request);
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