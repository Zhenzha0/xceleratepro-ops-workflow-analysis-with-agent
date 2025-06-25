import { AIAnalysisRequest, AIAnalysisResponse } from './ai-analyst';
import { storage } from '../storage';

/**
 * Android Emulator AI Service for ProcessGPT
 * Connects to Gemini Nano running in Android Emulator via local API
 * Provides true Google AI Edge functionality while keeping web app
 */
export class AndroidEmulatorAIService {
  private static emulatorHost = 'http://10.0.2.2:8080'; // Default Android emulator bridge
  private static model = 'gemini-nano';
  
  /**
   * Configure Android emulator AI service
   */
  static configure(host: string, model?: string) {
    this.emulatorHost = host;
    if (model) {
      this.model = model;
    }
  }
  
  /**
   * Test connection to Android emulator AI service
   */
  static async testConnection(): Promise<{ success: boolean; error?: string; modelInfo?: any }> {
    try {
      const response = await fetch(`${this.emulatorHost}/api/health`, {
        signal: AbortSignal.timeout(5000)
      });
      
      if (response.ok) {
        const data = await response.json();
        return {
          success: true,
          modelInfo: {
            model: this.model,
            status: data.status || 'connected',
            device: 'Android Emulator',
            type: 'Google AI Edge'
          }
        };
      }
      
      return { success: false, error: 'Android emulator AI service not responding' };
      
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Connection failed to Android emulator' 
      };
    }
  }
  
  /**
   * Analyze query using Android emulator Gemini Nano
   */
  static async analyzeQuery(request: AIAnalysisRequest): Promise<AIAnalysisResponse> {
    try {
      // Classify the query type using existing logic
      const queryType = this.classifyQuery(request.query);
      
      // Gather relevant data using existing database functions
      const relevantData = await this.gatherRelevantData(request.query, queryType, request.filters);
      
      // Build prompt for Gemini Nano
      const systemPrompt = this.buildSystemPrompt(queryType, relevantData);
      const fullPrompt = `${systemPrompt}\n\nUser Query: ${request.query}\n\nRespond with JSON:`;
      
      // Call Android emulator AI service
      const response = await this.callEmulatorAI(fullPrompt);
      
      // Parse response
      let result;
      try {
        result = JSON.parse(response);
      } catch {
        // If JSON parsing fails, create a structured response
        result = {
          response: response,
          queryType: queryType,
          suggestedActions: [],
          analysis_type: queryType
        };
      }
      
      // Generate structured data for visualization
      const structuredData = await this.generateStructuredData(
        result.analysis_type || queryType, 
        relevantData, 
        request.query
      );
      
      return {
        response: result.response || "I analyzed your query using Google AI Edge (Gemini Nano).",
        queryType: result.queryType || queryType,
        contextData: request.contextData,
        suggestedActions: result.suggestedActions || [],
        visualizationHint: result.visualizationHint,
        data: structuredData,
        analysis_type: result.analysis_type || queryType
      };
      
    } catch (error) {
      console.error('Android emulator AI service error:', error);
      throw new Error(`Android AI Edge analysis failed: ${error}`);
    }
  }
  
  /**
   * Call Android emulator AI service
   */
  private static async callEmulatorAI(prompt: string): Promise<string> {
    try {
      const response = await fetch(`${this.emulatorHost}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: this.model,
          prompt: prompt,
          temperature: 0.1,
          max_tokens: 2000
        }),
        signal: AbortSignal.timeout(30000)
      });
      
      if (response.ok) {
        const data = await response.json();
        return data.response || data.text || '';
      }
      
      throw new Error(`Android emulator AI service returned ${response.status}`);
      
    } catch (error) {
      throw new Error(`Android emulator AI call failed: ${error}`);
    }
  }
  
  /**
   * Classify query type (reuse existing logic)
   */
  private static classifyQuery(query: string): string {
    const lowerQuery = query.toLowerCase();
    
    // Failure analysis patterns
    if (lowerQuery.includes('cause') && (lowerQuery.includes('failure') || lowerQuery.includes('fail'))) {
      return 'failure_cause_analysis';
    }
    if (lowerQuery.includes('which') && lowerQuery.includes('activity') && (lowerQuery.includes('fail') || lowerQuery.includes('error'))) {
      return 'activity_failure_analysis';
    }
    
    // Temporal patterns
    if (lowerQuery.includes('hour') || lowerQuery.includes('time') || lowerQuery.includes('when')) {
      return 'temporal_pattern_analysis';
    }
    
    // Anomaly detection
    if (lowerQuery.includes('anomal') || lowerQuery.includes('unusual') || lowerQuery.includes('outlier')) {
      return 'anomaly_analysis';
    }
    
    // Bottleneck analysis
    if (lowerQuery.includes('bottleneck') || lowerQuery.includes('slowest') || lowerQuery.includes('delay')) {
      return 'bottleneck_analysis';
    }
    
    // General analysis
    return 'general_analysis';
  }
  
  /**
   * Gather relevant data using existing database functions
   */
  private static async gatherRelevantData(query: string, queryType: string, filters?: any): Promise<any> {
    try {
      switch (queryType) {
        case 'failure_cause_analysis':
        case 'activity_failure_analysis':
          return await this.analyzeActivityFailureRates(filters);
          
        case 'temporal_pattern_analysis':
          return await this.analyzeTemporalPatterns(filters);
          
        case 'anomaly_analysis':
          return await storage.getAnomalyAlerts(20);
          
        case 'bottleneck_analysis':
          return await storage.getBottleneckAnalysis();
          
        default:
          // Get general metrics
          const [metrics, cases, activities] = await Promise.all([
            storage.getDashboardMetrics(),
            storage.getProcessCases({ limit: 100 }),
            storage.getProcessActivities()
          ]);
          return { metrics, cases: cases.slice(0, 10), activities: activities.slice(0, 20) };
      }
    } catch (error) {
      console.error('Error gathering data:', error);
      return {};
    }
  }
  
  /**
   * Analyze activity failure rates (reuse existing logic)
   */
  private static async analyzeActivityFailureRates(filters?: any): Promise<any[]> {
    try {
      const events = await storage.getProcessEvents({
        limit: filters?.customLimit || 1000
      });
      
      // Group by activity and calculate failure rates
      const activityFailures = new Map();
      const activityTotals = new Map();
      
      for (const event of events) {
        const activity = event.activity || 'unknown';
        activityTotals.set(activity, (activityTotals.get(activity) || 0) + 1);
        
        if (event.lifecycleState === 'failure' || event.status === 'failed') {
          activityFailures.set(activity, (activityFailures.get(activity) || 0) + 1);
        }
      }
      
      // Calculate failure rates
      const failureRates = [];
      for (const [activity, total] of activityTotals.entries()) {
        const failures = activityFailures.get(activity) || 0;
        const rate = (failures / total) * 100;
        failureRates.push({
          activity,
          failures,
          total,
          failureRate: rate
        });
      }
      
      return failureRates.sort((a, b) => b.failureRate - a.failureRate);
      
    } catch (error) {
      console.error('Error analyzing failure rates:', error);
      return [];
    }
  }
  
  /**
   * Analyze temporal patterns (reuse existing logic)
   */
  private static async analyzeTemporalPatterns(filters?: any): Promise<any> {
    try {
      const events = await storage.getProcessEvents({
        limit: filters?.customLimit || 2000
      });
      
      const hourlyData = new Array(24).fill(0);
      const dailyData = new Map();
      
      for (const event of events) {
        if (event.timestamp) {
          const date = new Date(event.timestamp);
          const hour = date.getHours();
          const day = date.toISOString().split('T')[0];
          
          hourlyData[hour]++;
          dailyData.set(day, (dailyData.get(day) || 0) + 1);
        }
      }
      
      return {
        hourlyDistribution: hourlyData.map((count, hour) => ({ hour, count })),
        dailyDistribution: Array.from(dailyData.entries()).map(([day, count]) => ({ day, count })),
        totalEvents: events.length
      };
      
    } catch (error) {
      console.error('Error analyzing temporal patterns:', error);
      return { hourlyDistribution: [], dailyDistribution: [], totalEvents: 0 };
    }
  }
  
  /**
   * Build system prompt for Gemini Nano
   */
  private static buildSystemPrompt(queryType: string, relevantData: any): string {
    const basePrompt = `You are ProcessGPT running on Google AI Edge (Gemini Nano). You analyze real manufacturing data to provide insights about failures, bottlenecks, anomalies, and process optimization. This model runs locally on Android device for complete privacy.

IMPORTANT: You must respond with valid JSON in this exact format:
{
  "response": "Your detailed analysis here",
  "queryType": "${queryType}",
  "suggestedActions": ["action1", "action2"],
  "visualizationHint": "Chart type suggestion",
  "analysis_type": "${queryType}"
}

Available manufacturing data: ${JSON.stringify(relevantData).slice(0, 1500)}...

Provide specific, data-driven insights based on the actual manufacturing data provided. Include numbers, percentages, and concrete recommendations. Keep responses under 500 words.`;

    return basePrompt;
  }
  
  /**
   * Generate structured data for visualization
   */
  private static async generateStructuredData(analysisType: string, relevantData: any, query: string): Promise<any> {
    try {
      switch (analysisType) {
        case 'failure_cause_analysis':
          return {
            chartType: 'pie',
            data: relevantData.slice(0, 10).map((item: any) => ({
              name: item.activity || 'Unknown',
              value: item.failures || 0
            }))
          };
          
        case 'activity_failure_analysis':
          return {
            chartType: 'bar',
            data: relevantData.slice(0, 10).map((item: any) => ({
              name: item.activity || 'Unknown',
              value: item.failureRate || 0,
              count: item.failures || 0
            }))
          };
          
        case 'temporal_pattern_analysis':
          return {
            chartType: 'line',
            data: relevantData.hourlyDistribution || []
          };
          
        default:
          return null;
      }
    } catch (error) {
      console.error('Error generating structured data:', error);
      return null;
    }
  }
}