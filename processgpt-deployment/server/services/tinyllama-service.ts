import { AIAnalysisRequest, AIAnalysisResponse, AIAnalyst } from './ai-analyst';

/**
 * TinyLlama AI Service - connects to local TinyLlama server
 */
export class TinyLlamaService extends AIAnalyst {
  private endpoint = 'http://localhost:8080';

  async analyzeQuery(request: AIAnalysisRequest): Promise<AIAnalysisResponse> {
    try {
      console.log('TinyLlama Service: Processing query with local model');
      
      // Test connection first
      const healthResponse = await fetch(`${this.endpoint}/health`);
      if (!healthResponse.ok) {
        throw new Error('TinyLlama server not responding');
      }

      // Use the same intelligent analysis as other services
      return await this.processWithIntelligentAnalysis(request);
    } catch (error) {
      console.error('TinyLlama Service error:', error);
      throw new Error(`TinyLlama local model unavailable: ${error.message}`);
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
          model: 'tinyllama-chat',
          messages: messages,
          max_tokens: 300,
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
      
      throw new Error('Invalid response format from TinyLlama');
    } catch (error) {
      console.error('TinyLlama API call failed:', error);
      throw new Error(`TinyLlama generation failed: ${error.message}`);
    }
  }
}