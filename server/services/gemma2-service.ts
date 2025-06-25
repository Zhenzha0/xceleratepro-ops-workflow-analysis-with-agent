import { AIAnalysisRequest, AIAnalysisResponse, AIAnalyst } from './ai-analyst';

/**
 * Gemma 2B Local AI Service - Google's edge AI model
 */
export class Gemma2Service extends AIAnalyst {
  private endpoint = 'http://localhost:8080';

  async analyzeQuery(request: AIAnalysisRequest): Promise<AIAnalysisResponse> {
    try {
      console.log('Gemma 2B Service: Processing query with Google AI Edge model');
      
      // Test connection first
      const healthResponse = await fetch(`${this.endpoint}/health`);
      if (!healthResponse.ok) {
        throw new Error('Gemma 2B server not responding - make sure server is running');
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
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      
      if (data.choices && data.choices[0] && data.choices[0].message) {
        return data.choices[0].message.content;
      }
      
      throw new Error('Invalid response format from Gemma 2B');
    } catch (error) {
      console.error('Gemma 2B API call failed:', error);
      throw new Error(`Gemma 2B generation failed: ${error.message}`);
    }
  }
}