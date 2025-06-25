import { AIAnalysisRequest, AIAnalysisResponse, AIAnalyst } from './ai-analyst';

/**
 * Gemma 2B Local AI Service - Google's edge AI model
 */
export class Gemma2Service extends AIAnalyst {
  private endpoint = 'http://localhost:8080';

  async analyzeQuery(request: AIAnalysisRequest): Promise<AIAnalysisResponse> {
    try {
      console.log('Gemma 2B Service: Processing query with local model');
      
      // Test connection first with timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      
      try {
        const healthResponse = await fetch(`${this.endpoint}/health`, {
          signal: controller.signal,
          method: 'GET'
        });
        clearTimeout(timeoutId);
        
        if (!healthResponse.ok) {
          throw new Error('Gemma 2B server responded with error');
        }
      } catch (fetchError) {
        clearTimeout(timeoutId);
        throw new Error('Cannot connect to Gemma 2B server - ensure server is running on localhost:8080');
      }

      // Use the same intelligent analysis as other services
      return await this.processWithIntelligentAnalysis(request);
    } catch (error) {
      console.error('Gemma 2B Service error:', error);
      throw new Error(`Gemma 2B local model unavailable: ${error.message}`);
    }
  }

  protected async callAI(messages: any[]): Promise<string> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);
      
      const response = await fetch(`${this.endpoint}/v1/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gemma-2b-it',
          messages: messages,
          max_tokens: 400,
          temperature: 0.7
        }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      
      if (data.choices && data.choices[0] && data.choices[0].message) {
        return data.choices[0].message.content;
      }
      
      throw new Error('Invalid response format from Gemma 2B');
    } catch (error) {
      if (error.name === 'AbortError') {
        throw new Error('Gemma 2B server timeout - check if server is responding');
      }
      console.error('Gemma 2B API call failed:', error);
      throw new Error(`Gemma 2B generation failed: ${error.message}`);
    }
  }
}