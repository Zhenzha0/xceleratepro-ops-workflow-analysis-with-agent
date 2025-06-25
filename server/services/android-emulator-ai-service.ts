import { AIAnalysisRequest, AIAnalysisResponse } from './ai-analyst';

export class AndroidEmulatorAIService {
  private static host = 'http://10.0.2.2:8080';
  private static model = 'gemma-3n-e2b-it-int4';

  static configure(host?: string, model?: string) {
    if (host) this.host = host;
    if (model) this.model = model;
  }

  static async testConnection(): Promise<{ success: boolean; error?: string; modelInfo?: any }> {
    try {
      const response = await fetch(`${this.host}/api/health`, {
        method: 'GET',
        signal: AbortSignal.timeout(5000)
      });

      if (!response.ok) {
        return {
          success: false,
          error: `HTTP ${response.status}: ${response.statusText}`
        };
      }

      const data = await response.json();
      return {
        success: true,
        modelInfo: {
          model: data.model || this.model,
          device: data.device || 'Android Emulator',
          type: 'Google AI Edge'
        }
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Connection failed'
      };
    }
  }

  static async analyzeQuery(request: AIAnalysisRequest): Promise<AIAnalysisResponse> {
    try {
      const prompt = `Manufacturing Process Analysis Query: ${request.query}

Context: ${JSON.stringify(request.context || {}, null, 2)}

Analyze this manufacturing data request and provide structured response. Focus on real data analysis for:
- Process failures and root causes
- Activity performance and bottlenecks  
- Anomaly detection and patterns
- Equipment efficiency metrics
- Manufacturing workflow optimization

Return analysis with specific insights about the manufacturing process.`;

      const response = await fetch(`${this.host}/api/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          prompt,
          model: this.model
        }),
        signal: AbortSignal.timeout(30000)
      });

      if (!response.ok) {
        throw new Error(`Android Emulator AI request failed: ${response.status}`);
      }

      const data = await response.json();
      const aiResponse = data.response || data.text || 'No response from Android Emulator AI';
      
      return {
        response: aiResponse,
        analysis_type: this.detectAnalysisType(request.query),
        visualization_data: this.extractVisualizationData(aiResponse),
        metadata: {
          service: 'Android Emulator AI',
          model: this.model,
          timestamp: new Date().toISOString()
        }
      };
    } catch (error: any) {
      throw new Error(`Android Emulator AI error: ${error.message}`);
    }
  }

  private static detectAnalysisType(query: string): string {
    const queryLower = query.toLowerCase();
    
    if (queryLower.includes('failure') || queryLower.includes('fail')) {
      return 'failure_analysis';
    } else if (queryLower.includes('anomaly') || queryLower.includes('unusual')) {
      return 'anomaly_analysis';
    } else if (queryLower.includes('bottleneck') || queryLower.includes('slow')) {
      return 'bottleneck_analysis';
    } else if (queryLower.includes('time') || queryLower.includes('duration')) {
      return 'temporal_analysis';
    } else if (queryLower.includes('activity') || queryLower.includes('step')) {
      return 'activity_analysis';
    }
    
    return 'general_analysis';
  }

  private static extractVisualizationData(response: string): any {
    // Extract numerical data for charts from AI response
    const numberPattern = /(\d+(?:\.\d+)?)/g;
    const numbers = response.match(numberPattern) || [];
    
    return {
      values: numbers.slice(0, 10).map(n => parseFloat(n)),
      labels: ['Manufacturing Data Point 1', 'Manufacturing Data Point 2', 'Manufacturing Data Point 3'],
      type: 'android_emulator_analysis'
    };
  }

  static getServiceName(): string {
    return 'Android Emulator AI (Google AI Edge)';
  }

  static getStatus() {
    return {
      service: 'Android Emulator AI',
      model: this.model,
      host: this.host,
      type: 'Google AI Edge'
    };
  }
}