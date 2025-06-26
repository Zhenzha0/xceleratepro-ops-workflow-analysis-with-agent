import { IntelligentAnalyst } from './intelligent-analyst';
import { GeminiService } from './gemini-service';

export class AIServiceFactory {
  private static currentService: 'openai' | 'gemini' = 'openai';
  private static intelligentAnalyst = new IntelligentAnalyst();
  private static geminiService = new GeminiService();
  private static gemma2Service = new Gemma2Service();
  
  /**
   * Analyze query using the configured AI service
   */
  static async analyzeQuery(request: AIAnalysisRequest): Promise<AIAnalysisResponse> {
    try {
      // Check for Gemma-2B-IT MediaPipe first
      if (this.useGemmaMediaPipe) {
        console.log('Using Gemma-2B-IT MediaPipe AI Edge for analysis...');
        return await gemmaMediaPipeService.analyzeQuery(request);
      }
      // Check for Gemma 2B local model
      else if (this.useGemma2) {
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
      
      // Fallback chain: Gemma-2B-IT MediaPipe → Gemma 2B → ProcessGPT
      if (this.useGemmaMediaPipe) {
        console.log('Gemma-2B-IT MediaPipe failed, falling back to ProcessGPT...');
        this.useGemmaMediaPipe = false;
        const { AIAnalyst } = await import('./ai-analyst');
        return await AIAnalyst.analyzeQuery(request);
      } else if (this.useGemma2) {
        console.log('Gemma 2B failed, falling back to ProcessGPT...');
        this.useGemma2 = false;
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
   * Switch to Phi-2 MediaPipe
   */
  static switchToPhi2MediaPipe() {
    this.usePhi2MediaPipe = true;
    this.useGemma2 = false;
    console.log('Switched to Phi-2 MediaPipe AI Edge');
  }
  
  /**
   * Switch to OpenAI
   */
  static switchToOpenAI() {
    this.useGemma2 = false;
    this.usePhi2MediaPipe = false;
    console.log('Switched to OpenAI');
  }
  
  /**
   * Get current AI service status
   */
  static getStatus() {
    if (this.usePhi2MediaPipe) return { service: 'phi2-mediapipe', name: 'Phi-2 MediaPipe AI Edge' };
    if (this.useGemma2) return { service: 'gemma2', name: 'Gemma 2B Local' };
    return { service: 'openai', name: 'OpenAI' };
  }
  
  /**
   * Test connection to current AI service
   */
  static async testConnection() {
    try {
      if (this.usePhi2MediaPipe) {
        return await phi2MediaPipeService.testConnection();
      } else if (this.useGemma2) {
        return await this.gemma2Service.testConnection();
      } else {
        return { status: 'connected', model: 'openai', version: 'gpt-4o' };
      }
    } catch (error: any) {
      return { status: 'error', model: 'unknown', version: error.message };
    }
  }
}