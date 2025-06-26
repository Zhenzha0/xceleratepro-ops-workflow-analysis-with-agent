import { AIAnalysisRequest, AIAnalysisResponse } from './ai-analyst';
import { EnhancedFailureAnalyzer } from './failure-analyzer-enhanced';
import { TimingAnalyzer } from './timing-analyzer';
import { TrendAnalyzer } from './trend-analyzer';
import { CaseAnalyzer } from './case-analyzer';

export class Phi2MediaPipeService {
  private mediapipeTask: any = null;
  private isInitialized = false;

  constructor() {
    this.initializeMediaPipe();
  }

  private async initializeMediaPipe() {
    try {
      // Initialize MediaPipe AI Edge with Phi-2 model (.task bundle)
      console.log('Initializing Phi-2 MediaPipe AI Edge...');
      
      // Import MediaPipe text generation
      const { TextGeneration } = await import('@mediapipe/tasks-genai');
      
      // Initialize with Phi-2 model (.task bundle contains .tflite + metadata)
      this.mediapipeTask = await TextGeneration.createFromOptions({
        baseOptions: {
          modelAssetPath: './models/phi2/phi-2-instruct-int4.task'
        }
      });
      
      this.isInitialized = true;
      console.log('✓ Phi-2 MediaPipe initialized successfully');
    } catch (error) {
      console.error('Failed to initialize Phi-2 MediaPipe:', error);
      this.isInitialized = false;
    }
  }

  async analyzeQuery(request: AIAnalysisRequest): Promise<AIAnalysisResponse> {
    if (!this.isInitialized) {
      throw new Error('Phi-2 MediaPipe not initialized');
    }

    try {
      // Step 1: Use Phi-2 for query classification
      const classification = await this.classifyQuery(request.query);
      
      // Step 2: Execute database analysis (same as existing ProcessGPT)
      const analysisResult = await this.executeAnalysis(classification, request);
      
      // Step 3: Use Phi-2 for response formatting
      const formattedResponse = await this.formatResponse(analysisResult, request.query);
      
      return {
        response: formattedResponse.response,
        analysis_type: classification.type,
        data: analysisResult.data,
        visualizations: analysisResult.visualizations
      };
    } catch (error) {
      console.error('Phi-2 analysis error:', error);
      throw error;
    }
  }

  private async classifyQuery(query: string): Promise<{ type: string; params: any }> {
    // Use Phi-2 for query classification with structured prompts
    const classificationPrompt = `
Analyze this manufacturing query and classify it:
Query: "${query}"

Respond with JSON format:
{
  "type": "failure_analysis|timing_analysis|trend_analysis|case_analysis|anomaly_detection|bottleneck_analysis",
  "confidence": 0.0-1.0,
  "params": {}
}

Focus on these patterns:
- "failure", "fails", "broken" → failure_analysis
- "time", "duration", "delay", "bottleneck" → timing_analysis
- "trend", "pattern", "over time" → trend_analysis
- "case", "specific", "individual" → case_analysis
- "anomaly", "unusual", "abnormal" → anomaly_detection
`;

    // Call Phi-2 via MediaPipe for classification
    const result = await this.callPhi2(classificationPrompt);
    
    try {
      return JSON.parse(result);
    } catch (error) {
      // Fallback classification based on keywords
      return this.fallbackClassification(query);
    }
  }

  private async executeAnalysis(classification: any, request: AIAnalysisRequest): Promise<any> {
    // Use existing ProcessGPT analysis functions (unchanged)
    switch (classification.type) {
      case 'failure_analysis':
        return await EnhancedFailureAnalyzer.analyzeFailureCauses(request.filters);
      
      case 'timing_analysis':
        return await TimingAnalyzer.analyzeProcessingTimes(request.filters);
      
      case 'trend_analysis':
        return await TrendAnalyzer.analyzeTemporalPatterns(request.filters);
      
      case 'case_analysis':
        return await CaseAnalyzer.analyzeCaseDetails(request.filters);
      
      default:
        return await EnhancedFailureAnalyzer.analyzeFailureCauses(request.filters);
    }
  }

  private async formatResponse(analysisResult: any, originalQuery: string): Promise<{ response: string }> {
    // Use Phi-2 for response formatting in ProcessGPT style
    const formattingPrompt = `
You are ProcessGPT, an intelligent manufacturing analyst. Format this analysis into an executive summary.

Original Question: "${originalQuery}"
Analysis Data: ${JSON.stringify(analysisResult, null, 2)}

Provide a comprehensive response in this format:
1. Executive Summary (2-3 sentences)
2. Key Findings (bullet points)
3. Analysis Details (specific numbers and percentages)
4. Recommendations (actionable insights)

Use professional manufacturing language and include specific metrics from the data.
`;

    const formattedResponse = await this.callPhi2(formattingPrompt);
    return { response: formattedResponse };
  }

  private async callPhi2(prompt: string): Promise<string> {
    if (!this.isInitialized) {
      throw new Error('Phi-2 not initialized');
    }

    // MediaPipe AI Edge inference call
    // This is a placeholder - actual implementation depends on MediaPipe SDK
    try {
      // Simulated Phi-2 call via MediaPipe
      // In reality, this would use the MediaPipe Task API
      console.log('Calling Phi-2 via MediaPipe...');
      
      // For now, return a structured response
      // This will be replaced with actual MediaPipe Task inference
      return "Phi-2 response placeholder - to be implemented with MediaPipe Task API";
      
    } catch (error: any) {
      console.error('Phi-2 MediaPipe call failed:', error);
      throw error;
    }
  }

  private fallbackClassification(query: string): { type: string; params: any } {
    const lowerQuery = query.toLowerCase();
    
    if (lowerQuery.includes('fail') || lowerQuery.includes('error')) {
      return { type: 'failure_analysis', params: {} };
    }
    if (lowerQuery.includes('time') || lowerQuery.includes('duration')) {
      return { type: 'timing_analysis', params: {} };
    }
    if (lowerQuery.includes('trend') || lowerQuery.includes('pattern')) {
      return { type: 'trend_analysis', params: {} };
    }
    if (lowerQuery.includes('case') || lowerQuery.includes('specific')) {
      return { type: 'case_analysis', params: {} };
    }
    
    return { type: 'failure_analysis', params: {} };
  }

  async testConnection(): Promise<{ status: string; model: string; version: string }> {
    try {
      if (!this.isInitialized) {
        return { status: 'error', model: 'phi-2', version: 'not_initialized' };
      }
      
      const testResponse = await this.callPhi2('Test prompt: Respond with "OK"');
      
      return {
        status: 'connected',
        model: 'phi-2-mediapipe',
        version: 'ai-edge-bundle'
      };
    } catch (error) {
      return {
        status: 'error',
        model: 'phi-2',
        version: (error as Error).message
      };
    }
  }
}

export const phi2MediaPipeService = new Phi2MediaPipeService();