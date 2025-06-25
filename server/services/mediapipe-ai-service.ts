import { AIAnalysisRequest, AIAnalysisResponse } from '../ai-service-types';

export class MediaPipeAIService {
  private static host = 'http://localhost:8080'; // Default MediaPipe inference server
  private static model = 'qwen2.5-1.5b-instruct';

  static configure(host: string, model: string) {
    this.host = host;
    this.model = model;
    console.log(`MediaPipe AI configured: ${host} with model ${model}`);
  }

  static async testConnection(): Promise<{ success: boolean; error?: string; modelInfo?: any }> {
    try {
      // Test MediaPipe LLM Inference API endpoint
      const response = await fetch(`${this.host}/v1/models`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        },
        signal: AbortSignal.timeout(5000)
      });

      if (response.ok) {
        const data = await response.json();
        return {
          success: true,
          modelInfo: {
            model: this.model,
            device: 'MediaPipe LLM Inference',
            type: 'Local On-Device',
            available_models: data.models || []
          }
        };
      }

      throw new Error(`MediaPipe server responded with status ${response.status}`);
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'MediaPipe connection failed'
      };
    }
  }

  static async analyzeQuery(request: AIAnalysisRequest): Promise<AIAnalysisResponse> {
    try {
      // MediaPipe LLM Inference API call
      const response = await this.generateWithMediaPipe(request.query);
      
      return {
        response: response.response,
        analysis_type: this.detectAnalysisType(request.query),
        visualization_data: null,
        metadata: {
          service: 'MediaPipe AI',
          model: this.model,
          timestamp: new Date().toISOString(),
          inference_engine: 'MediaPipe LLM'
        }
      };
    } catch (error: any) {
      console.error('MediaPipe AI analysis failed:', error.message);
      
      return {
        response: `MediaPipe LLM Connection Status: Connection failed.

Error: ${error.message}

Your Qwen2.5-1.5B model needs MediaPipe LLM Inference API running on port 8080.

Setup Instructions:
1. Install MediaPipe: pip install mediapipe
2. Set up LLM inference server with your Qwen model
3. Start server: python -m mediapipe.tasks.python.text.llm_inference.llm_inference_api --model_path=/path/to/qwen --port=8080
4. ProcessGPT will connect automatically

Manufacturing Analysis Available:
- Real failure pattern analysis from your 95 failure cases
- Temporal anomaly detection across 170 detected issues  
- Production bottleneck identification
- Equipment performance analysis
- Root cause diagnostics from failure descriptions

Try switching to OpenAI for immediate analysis while setting up MediaPipe.`,
        analysis_type: "connection_error",
        visualization_data: null,
        metadata: {
          service: 'MediaPipe AI',
          model: this.model,
          timestamp: new Date().toISOString(),
          status: 'connection_failed'
        }
      };
    }
  }

  private static async generateWithMediaPipe(prompt: string): Promise<{ response: string }> {
    const systemPrompt = `You are ProcessGPT, an expert manufacturing analyst. Analyze manufacturing process data to provide insights about failures, bottlenecks, and optimization opportunities.

Your capabilities include:
- Failure root cause analysis
- Manufacturing bottleneck identification  
- Temporal pattern analysis
- Equipment performance optimization
- Production workflow insights

Respond professionally with actionable manufacturing insights.`;

    const response = await fetch(`${this.host}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: this.model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: prompt }
        ],
        max_tokens: 2048,
        temperature: 0.7
      }),
      signal: AbortSignal.timeout(30000)
    });

    if (!response.ok) {
      throw new Error(`MediaPipe API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    
    if (!data.choices || !data.choices[0]?.message?.content) {
      throw new Error('Invalid response format from MediaPipe LLM');
    }

    return {
      response: data.choices[0].message.content
    };
  }

  private static detectAnalysisType(query: string): string {
    const lowerQuery = query.toLowerCase();
    
    if (lowerQuery.includes('failure') || lowerQuery.includes('error')) {
      return 'failure_analysis';
    } else if (lowerQuery.includes('bottleneck') || lowerQuery.includes('slow')) {
      return 'bottleneck_analysis';
    } else if (lowerQuery.includes('anomal') || lowerQuery.includes('unusual')) {
      return 'anomaly_detection';
    } else if (lowerQuery.includes('temporal') || lowerQuery.includes('time') || lowerQuery.includes('pattern')) {
      return 'temporal_analysis';
    } else if (lowerQuery.includes('activity') && lowerQuery.includes('fail')) {
      return 'activity_failure_analysis';
    }
    
    return 'general_analysis';
  }
}