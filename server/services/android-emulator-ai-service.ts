import { AIService } from './ai-service-factory';

export interface AndroidEmulatorConfig {
  host: string;
  model: string;
  port?: number;
}

export class AndroidEmulatorAIService implements AIService {
  private config: AndroidEmulatorConfig;

  constructor(config: AndroidEmulatorConfig) {
    this.config = {
      port: 8080,
      ...config
    };
  }

  async testConnection(): Promise<{ success: boolean; error?: string; modelInfo?: any }> {
    try {
      const response = await fetch(`${this.config.host}/api/health`, {
        method: 'GET',
        timeout: 5000
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
          model: data.model || this.config.model,
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

  async generateResponse(prompt: string, context?: any): Promise<string> {
    try {
      const response = await fetch(`${this.config.host}/api/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          prompt,
          context,
          model: this.config.model
        }),
        timeout: 30000
      });

      if (!response.ok) {
        throw new Error(`Android Emulator AI request failed: ${response.status}`);
      }

      const data = await response.json();
      return data.response || data.text || 'No response from Android Emulator AI';
    } catch (error: any) {
      throw new Error(`Android Emulator AI error: ${error.message}`);
    }
  }

  // ProcessGPT function calling simulation
  async callFunction(functionName: string, parameters: any): Promise<any> {
    const functionCallPrompt = `
Execute function: ${functionName}
Parameters: ${JSON.stringify(parameters, null, 2)}

Analyze this manufacturing data request and provide structured response for ProcessGPT visualization.
Return JSON format with analysis_type field for proper chart generation.
`;

    try {
      const response = await this.generateResponse(functionCallPrompt);
      
      // Parse structured response for function calling
      try {
        return JSON.parse(response);
      } catch {
        // Fallback for non-JSON responses
        return {
          analysis_type: functionName,
          result: response,
          visualization_data: this.extractVisualizationData(response)
        };
      }
    } catch (error: any) {
      throw new Error(`Function call failed: ${error.message}`);
    }
  }

  private extractVisualizationData(response: string): any {
    // Extract numerical data for charts from AI response
    const numberPattern = /(\d+(?:\.\d+)?)/g;
    const numbers = response.match(numberPattern) || [];
    
    return {
      values: numbers.slice(0, 10).map(n => parseFloat(n)),
      labels: ['Data Point 1', 'Data Point 2', 'Data Point 3'],
      type: 'extracted_from_response'
    };
  }

  getServiceName(): string {
    return 'Android Emulator AI (Google AI Edge)';
  }

  isAvailable(): boolean {
    return true; // Always available if configured
  }
}