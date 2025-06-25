import { GoogleGenAI } from "@google/genai";
import { AIAnalysisRequest, AIAnalysisResponse } from './ai-analyst';
import { storage } from '../storage';

/**
 * Gemini AI Service for ProcessGPT
 * Provides all ProcessGPT analysis capabilities using Google Gemini models
 */
export class GeminiService {
  private static gemini: GoogleGenAI;
  
  static initialize() {
    if (!process.env.GEMINI_API_KEY) {
      throw new Error('GEMINI_API_KEY is required for Gemini service');
    }
    this.gemini = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  }
  
  /**
   * Analyze query using Gemini with all ProcessGPT capabilities
   */
  static async analyzeQuery(request: AIAnalysisRequest): Promise<AIAnalysisResponse> {
    if (!this.gemini) {
      this.initialize();
    }
    
    try {
      // Classify the query type
      const queryType = this.classifyQuery(request.query);
      
      // Gather relevant data using existing database functions
      const relevantData = await this.gatherRelevantData(request.query, queryType, request.filters);
      
      // Build system prompt for Gemini
      const systemPrompt = this.buildSystemPrompt(queryType, relevantData);
      const userPrompt = this.buildUserPrompt(request.query, request.contextData);
      
      // Call Gemini API
      const response = await this.gemini.models.generateContent({
        model: "gemini-2.5-flash",
        config: {
          systemInstruction: systemPrompt,
          responseMimeType: "application/json",
          responseSchema: {
            type: "object",
            properties: {
              response: { type: "string" },
              queryType: { type: "string" },
              suggestedActions: {
                type: "array",
                items: { type: "string" }
              },
              visualizationHint: { type: "string" },
              analysis_type: { type: "string" }
            },
            required: ["response", "queryType"]
          }
        },
        contents: userPrompt
      });
      
      const result = JSON.parse(response.text || '{}');
      
      // Generate structured data for visualization
      const structuredData = await this.generateStructuredData(
        result.analysis_type || queryType, 
        relevantData, 
        request.query
      );
      
      return {
        response: result.response || "I apologize, but I couldn't analyze your query properly.",
        queryType: result.queryType || queryType,
        contextData: request.contextData,
        suggestedActions: result.suggestedActions || [],
        visualizationHint: result.visualizationHint,
        data: structuredData,
        analysis_type: result.analysis_type || queryType
      };
      
    } catch (error) {
      console.error('Gemini service error:', error);
      throw new Error(`Gemini AI analysis failed: ${error}`);
    }
  }
  
  /**
   * Classify query type (same logic as existing ProcessGPT)
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
   * Analyze activity failure rates
   */
  private static async analyzeActivityFailureRates(filters?: any): Promise<any[]> {
    try {
      const events = await storage.getProcessEvents({
        limit: filters?.customLimit || 1000,
        status: 'failure'
      });
      
      // Group by activity and calculate failure rates
      const activityFailures = new Map();
      const activityTotals = new Map();
      
      for (const event of events) {
        const activity = event.activity || 'unknown';
        activityFailures.set(activity, (activityFailures.get(activity) || 0) + 1);
      }
      
      // Get total counts for each activity
      const allEvents = await storage.getProcessEvents({ limit: 5000 });
      for (const event of allEvents) {
        const activity = event.activity || 'unknown';
        activityTotals.set(activity, (activityTotals.get(activity) || 0) + 1);
      }
      
      // Calculate failure rates
      const failureRates = [];
      for (const [activity, failures] of activityFailures.entries()) {
        const total = activityTotals.get(activity) || failures;
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
   * Analyze temporal patterns
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
   * Build system prompt for Gemini
   */
  private static buildSystemPrompt(queryType: string, relevantData: any): string {
    const basePrompt = `You are ProcessGPT, an intelligent manufacturing process analyst. You analyze real manufacturing data to provide insights about failures, bottlenecks, anomalies, and process optimization.

IMPORTANT: You must respond with valid JSON in this exact format:
{
  "response": "Your detailed analysis here",
  "queryType": "${queryType}",
  "suggestedActions": ["action1", "action2"],
  "visualizationHint": "Chart type suggestion",
  "analysis_type": "${queryType}"
}

Available data: ${JSON.stringify(relevantData).slice(0, 2000)}...

Provide specific, data-driven insights based on the actual manufacturing data provided. Include numbers, percentages, and concrete recommendations.`;

    return basePrompt;
  }
  
  /**
   * Build user prompt
   */
  private static buildUserPrompt(query: string, contextData?: any): string {
    let prompt = `Manufacturing Query: ${query}`;
    
    if (contextData) {
      prompt += `\n\nAdditional Context: ${JSON.stringify(contextData)}`;
    }
    
    return prompt;
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