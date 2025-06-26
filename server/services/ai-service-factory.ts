import { AIAnalysisRequest, AIAnalysisResponse } from './ai-analyst';
import { Gemma2Service } from './gemma2-service';
import { phi2MediaPipeService } from './phi2-mediapipe-service';

/**
 * Factory to choose between multiple AI services
 */
export class AIServiceFactory {
  private static useGemma2 = false; // Default to OpenAI since Gemma 2B requires local connection
  private static usePhi2MediaPipe = false; // Phi-2 MediaPipe integration
  private static gemma2Service = new Gemma2Service();
  
  /**
   * Analyze query using the configured AI service
   */
  static async analyzeQuery(request: AIAnalysisRequest): Promise<AIAnalysisResponse> {
    try {
      // Check for Phi-2 MediaPipe first
      if (this.usePhi2MediaPipe) {
        console.log('Using Phi-2 MediaPipe AI Edge for analysis...');
        return await phi2MediaPipeService.analyzeQuery(request);
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
      
      // Fallback chain: Phi-2 → Gemma 2B → ProcessGPT
      if (this.usePhi2MediaPipe) {
        console.log('Phi-2 MediaPipe failed, falling back to ProcessGPT...');
        this.usePhi2MediaPipe = false;
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