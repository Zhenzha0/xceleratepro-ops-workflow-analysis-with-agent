/**
 * Gemma-2B-IT MediaPipe AI Edge integration for ProcessGPT
 * Provides local AI processing using Gemma-2B-IT model in .task format
 * Maintains all ProcessGPT analysis capabilities with complete data privacy
 */

import { AIAnalysisRequest, AIAnalysisResponse } from './ai-analyst';
import { FailureAnalyzer } from './failure-analyzer';
import { AnomalyDetector } from './anomaly-detector';
import { TimingAnalyzer } from './timing-analyzer';
import { TrendAnalyzer } from './trend-analyzer';
import { CaseAnalyzer } from './case-analyzer';

export class GemmaMediaPipeService {
  private mediapipeTask: any = null;
  private isInitialized: boolean = false;

  private async initializeMediaPipe() {
    try {
      // Initialize MediaPipe AI Edge with Gemma-2B-IT model (.task bundle)
      console.log('Initializing Gemma-2B-IT MediaPipe AI Edge...');
      
      // Import MediaPipe text generation (will be available when .task file is ready)
      const { TextGeneration } = await import('@mediapipe/tasks-genai');
      
      // Initialize with Gemma-2B-IT model (.task bundle contains .tflite + metadata)
      this.mediapipeTask = await TextGeneration.createFromOptions({
        baseOptions: {
          modelAssetPath: './models/gemma/gemma-2b-it.task'
        }
      });
      
      this.isInitialized = true;
      console.log('✓ Gemma-2B-IT MediaPipe AI Edge initialized successfully');
      
    } catch (error) {
      console.error('Failed to initialize Gemma-2B-IT MediaPipe:', error);
      throw new Error(`Gemma-2B-IT MediaPipe initialization failed: ${error}`);
    }
  }

  async analyzeQuery(request: AIAnalysisRequest): Promise<AIAnalysisResponse> {
    try {
      // Initialize MediaPipe if not already done
      if (!this.isInitialized) {
        await this.initializeMediaPipe();
      }

      // 1. Classify the query type
      const analysisType = this.classifyQuery(request.query);
      
      // 2. Execute appropriate analysis function (using real data)
      const analysisData = await this.executeAnalysis(analysisType, request.filters);
      
      // 3. Use Gemma-2B-IT to format the response
      const prompt = this.buildAnalysisPrompt(request.query, analysisType, analysisData);
      
      const result = await this.mediapipeTask.generate(prompt);
      
      return {
        response: result.text || 'Analysis completed',
        analysisType: analysisType,
        visualizationHint: this.getVisualizationHint(analysisType),
        data: analysisData
      };

    } catch (error) {
      console.error('Gemma-2B-IT analysis error:', error);
      throw new Error(`Local AI analysis failed: ${error}`);
    }
  }

  private classifyQuery(query: string): string {
    const lowerQuery = query.toLowerCase();
    
    // Classification logic for ProcessGPT queries
    if (lowerQuery.includes('failure') && (lowerQuery.includes('cause') || lowerQuery.includes('why'))) {
      return 'failure_cause_analysis';
    }
    if (lowerQuery.includes('failure') && lowerQuery.includes('activit')) {
      return 'activity_failure_analysis';
    }
    if (lowerQuery.includes('anomal')) {
      return 'anomaly_analysis';
    }
    if (lowerQuery.includes('bottleneck') || lowerQuery.includes('slow')) {
      return 'bottleneck_analysis';
    }
    if (lowerQuery.includes('time') || lowerQuery.includes('duration')) {
      return 'timing_analysis';
    }
    if (lowerQuery.includes('trend') || lowerQuery.includes('pattern')) {
      return 'temporal_pattern_analysis';
    }
    if (lowerQuery.includes('case') && lowerQuery.includes('compar')) {
      return 'case_comparison';
    }
    
    return 'general_analysis';
  }

  private async executeAnalysis(analysisType: string, filters: any) {
    // Execute real database analysis functions
    switch (analysisType) {
      case 'failure_cause_analysis':
        return await FailureAnalyzer.analyzeFailureCauses(filters);
      
      case 'activity_failure_analysis':
        return await FailureAnalyzer.analyzeActivityFailures(filters);
      
      case 'anomaly_analysis':
        return await AnomalyDetector.detectAnomalies(filters);
      
      case 'bottleneck_analysis':
        return await TimingAnalyzer.analyzeBottlenecks(filters);
      
      case 'timing_analysis':
        return await TimingAnalyzer.analyzeProcessingTimes(filters);
      
      case 'temporal_pattern_analysis':
        return await TrendAnalyzer.analyzeTemporalPatterns(filters);
      
      case 'case_comparison':
        return await CaseAnalyzer.analyzeCaseDetails(filters);
      
      default:
        return await FailureAnalyzer.getOverviewStatistics(filters);
    }
  }

  private buildAnalysisPrompt(query: string, analysisType: string, data: any): string {
    return `You are ProcessGPT, an expert manufacturing process analyst. 

User Question: ${query}

Analysis Type: ${analysisType}

Real Data Results: ${JSON.stringify(data, null, 2)}

Instructions:
1. Analyze the real manufacturing data provided
2. Answer the user's specific question using only the actual data
3. Provide specific numbers and statistics from the data
4. Explain what the data means for manufacturing operations
5. Keep response concise and actionable
6. Focus on practical manufacturing insights

Response:`;
  }

  private getVisualizationHint(analysisType: string): string {
    const hints = {
      'failure_cause_analysis': 'pie_chart',
      'activity_failure_analysis': 'bar_chart',
      'anomaly_analysis': 'time_series',
      'bottleneck_analysis': 'bar_chart',
      'timing_analysis': 'histogram',
      'temporal_pattern_analysis': 'time_series',
      'case_comparison': 'comparison_chart'
    };
    
    return hints[analysisType] || 'bar_chart';
  }

  getModelInfo(): string {
    return 'Gemma-2B-IT (Google) - Local MediaPipe Integration';
  }

  async testConnection(): Promise<boolean> {
    try {
      if (!this.isInitialized) {
        await this.initializeMediaPipe();
      }
      
      // Test simple inference
      const testResult = await this.mediapipeTask.generate('Hello, test connection.');
      return testResult && testResult.text && testResult.text.length > 0;
      
    } catch (error) {
      console.error('Gemma-2B-IT connection test failed:', error);
      return false;
    }
  }
}

// Export singleton instance
export const gemmaMediaPipeService = new GemmaMediaPipeService();