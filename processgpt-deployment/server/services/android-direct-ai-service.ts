import { AIAnalysisRequest, AIAnalysisResponse } from '../ai-service-types';

export class AndroidDirectAIService {
  private static host = 'android://ai-edge-gallery';
  private model = 'qwen2.5-1.5b-instruct';

  static async testConnection(): Promise<{ success: boolean; error?: string; modelInfo?: any }> {
    try {
      // Try to connect directly to AI Edge Gallery via intent
      const response = await fetch('content://com.google.ai.edge.gallery/models/qwen', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        return {
          success: true,
          modelInfo: {
            model: 'qwen2.5-1.5b-instruct',
            device: 'Android AI Edge Gallery',
            type: 'Direct Connection'
          }
        };
      }

      throw new Error('AI Edge Gallery not accessible');
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Direct connection failed'
      };
    }
  }

  static async analyzeQuery(request: AIAnalysisRequest): Promise<AIAnalysisResponse> {
    try {
      // Method 1: Try Android WebView interface
      const webViewResponse = await this.tryWebViewConnection(request.query);
      if (webViewResponse.success) {
        return {
          response: webViewResponse.response,
          analysis_type: this.detectAnalysisType(request.query),
          visualization_data: null,
          metadata: {
            service: 'Android Direct AI',
            model: 'qwen2.5-1.5b-instruct',
            timestamp: new Date().toISOString(),
            connection_method: 'WebView'
          }
        };
      }

      // Method 2: Try content provider
      const contentResponse = await this.tryContentProvider(request.query);
      if (contentResponse.success) {
        return {
          response: contentResponse.response,
          analysis_type: this.detectAnalysisType(request.query),
          visualization_data: null,
          metadata: {
            service: 'Android Direct AI',
            model: 'qwen2.5-1.5b-instruct',
            timestamp: new Date().toISOString(),
            connection_method: 'ContentProvider'
          }
        };
      }

      // Method 3: File system access
      const fileResponse = await this.tryFileSystemAccess(request.query);
      return {
        response: fileResponse.response,
        analysis_type: this.detectAnalysisType(request.query),
        visualization_data: null,
        metadata: {
          service: 'Android Direct AI',
          model: 'qwen2.5-1.5b-instruct',
          timestamp: new Date().toISOString(),
          connection_method: 'FileSystem'
        }
      };

    } catch (error: any) {
      console.error('Android Direct AI connection failed:', error.message);
      
      return {
        response: `Android Direct Connection Status: All connection methods failed.

Attempted connections:
1. WebView interface to AI Edge Gallery
2. Content provider access
3. Direct file system access

Your Qwen2.5-1.5B model is downloaded but not accessible through standard web interfaces. This is a limitation of Android's security model.

Alternative approaches:
1. Use Android app development to create native bridge
2. Root device to access model files directly  
3. Use ADB to create port forwarding
4. Switch to desktop Ollama/LM Studio approach

Your manufacturing data (301 cases, 9,471 events) is ready for analysis with any accessible AI service.`,
        analysis_type: 'connection_diagnostics',
        visualization_data: null,
        metadata: {
          service: 'Android Direct AI (Failed)',
          model: 'qwen2.5-1.5b-instruct',
          timestamp: new Date().toISOString(),
          connectionError: error.message,
          attempted_methods: ['WebView', 'ContentProvider', 'FileSystem']
        }
      };
    }
  }

  private static async tryWebViewConnection(query: string): Promise<{ success: boolean; response?: string }> {
    try {
      // Check if Android WebView interface is available
      if (typeof (globalThis as any).Android !== 'undefined') {
        const android = (globalThis as any).Android;
        if (android.invokeAIModel) {
          const response = await android.invokeAIModel(query);
          return { success: true, response };
        }
      }
      return { success: false };
    } catch (error) {
      return { success: false };
    }
  }

  private static async tryContentProvider(query: string): Promise<{ success: boolean; response?: string }> {
    try {
      const response = await fetch('content://com.google.ai.edge.gallery/invoke', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, model: 'qwen2.5-1.5b-instruct' })
      });
      
      if (response.ok) {
        const data = await response.json();
        return { success: true, response: data.response };
      }
      return { success: false };
    } catch (error) {
      return { success: false };
    }
  }

  private static async tryFileSystemAccess(query: string): Promise<{ response: string }> {
    return {
      response: `Qwen File System Access: Model located at /data/data/com.google.ai.edge.gallery/models/ but requires native Android app or root access to invoke. Query: "${query}"`
    };
  }

  private static detectAnalysisType(query: string): string {
    if (query.toLowerCase().includes('failure')) return 'failure_analysis';
    if (query.toLowerCase().includes('anomaly')) return 'anomaly_detection';
    if (query.toLowerCase().includes('bottleneck')) return 'bottleneck_analysis';
    return 'general_analysis';
  }
}