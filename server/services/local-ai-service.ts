import { AIAnalysisRequest, AIAnalysisResponse } from './ai-analyst';

export class LocalAIService {
  private modelEndpoint: string;
  
  constructor(endpoint = 'http://localhost:11434') {
    this.modelEndpoint = endpoint;
  }

  /**
   * Analyze query using local Gemma 2 model with function calling simulation
   */
  async analyzeQuery(request: AIAnalysisRequest): Promise<AIAnalysisResponse> {
    try {
      // Step 1: Classify the query using local model
      const classification = await this.classifyQuery(request.query);
      
      // Step 2: Gather relevant data using existing functions
      const relevantData = await this.gatherRelevantData(
        request.query, 
        classification, 
        request.filters
      );
      
      // Step 3: Generate analysis using local model
      const analysis = await this.generateAnalysis(
        request.query,
        classification,
        relevantData,
        request.contextData
      );
      
      // Step 4: Generate structured data for visualizations
      const structuredData = await this.generateStructuredData(
        classification,
        relevantData,
        request.query
      );
      
      return {
        response: analysis,
        queryType: classification,
        contextData: request.contextData,
        suggestedActions: await this.generateSuggestedActions(classification, relevantData),
        visualizationHint: this.generateVisualizationHint(classification),
        data: structuredData,
        analysis_type: classification
      };
      
    } catch (error) {
      console.error('Local AI analysis error:', error);
      throw new Error(`Local AI analysis failed: ${error.message}`);
    }
  }

  /**
   * Classify query using local Gemma 2 model
   */
  private async classifyQuery(query: string): Promise<string> {
    const prompt = `
You are a manufacturing process analysis expert. Classify this query into one of these categories:

Categories:
- failure_analysis: Questions about what fails, failure rates, failure causes
- activity_failure_analysis: Questions about which activities fail most
- temporal_pattern_analysis: Questions about time patterns, hourly/daily trends
- anomaly_analysis: Questions about anomalies, outliers, unusual behavior
- bottleneck_analysis: Questions about delays, slow processes, bottlenecks
- case_analysis: Questions about specific cases or case comparisons

Query: "${query}"

Respond with ONLY the category name, no explanation.
`;

    const response = await this.callLocalModel(prompt);
    return response.trim().toLowerCase();
  }

  /**
   * Generate analysis using local model with manufacturing context
   */
  private async generateAnalysis(
    query: string,
    queryType: string,
    relevantData: any,
    contextData?: any
  ): Promise<string> {
    const systemPrompt = this.buildSystemPrompt(queryType, relevantData);
    const userPrompt = this.buildUserPrompt(query, contextData);
    
    const fullPrompt = `${systemPrompt}\n\n${userPrompt}`;
    
    return await this.callLocalModel(fullPrompt);
  }

  /**
   * Call local Ollama/Gemma 2 model
   */
  private async callLocalModel(prompt: string): Promise<string> {
    try {
      const response = await fetch(`${this.modelEndpoint}/api/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gemma2:9b',
          prompt: prompt,
          stream: false,
          options: {
            temperature: 0.1,
            top_p: 0.9,
            max_tokens: 2048
          }
        }),
      });

      if (!response.ok) {
        throw new Error(`Local model request failed: ${response.statusText}`);
      }

      const data = await response.json();
      return data.response || '';
      
    } catch (error) {
      console.error('Local model call failed:', error);
      throw new Error(`Failed to call local model: ${error.message}`);
    }
  }

  /**
   * Gather relevant data using existing analysis functions
   */
  private async gatherRelevantData(query: string, queryType: string, filters?: any): Promise<any> {
    // Import existing analyzers
    const { EnhancedFailureAnalyzer } = await import('./failure-analyzer-enhanced');
    const { TimingAnalyzer } = await import('./timing-analyzer');
    const { TrendAnalyzer } = await import('./trend-analyzer');
    const { storage } = await import('../storage');

    try {
      switch (queryType) {
        case 'failure_analysis':
          const failures = await storage.getProcessEvents({ status: 'failure' });
          return await EnhancedFailureAnalyzer.categorizeFailureCauses(failures);

        case 'activity_failure_analysis':
          const activities = await storage.getProcessActivities();
          return await this.analyzeActivityFailureRates(activities);

        case 'temporal_pattern_analysis':
          return await this.generateTemporalData();

        case 'anomaly_analysis':
          const anomalies = await storage.getAnomalyAlerts(100);
          return { anomalies, count: anomalies.length };

        case 'bottleneck_analysis':
          return await storage.getBottleneckAnalysis();

        case 'case_analysis':
          const cases = await storage.getProcessCases({ limit: 50 });
          return { cases, totalCases: cases.length };

        default:
          return {};
      }
    } catch (error) {
      console.error(`Error gathering data for ${queryType}:`, error);
      return {};
    }
  }

  /**
   * Generate temporal data using direct SQL (reuse existing logic)
   */
  private async generateTemporalData(): Promise<any> {
    const { db } = await import('../db');
    const { sql } = await import('drizzle-orm');
    
    try {
      const hourlyResults = await db.execute(sql`
        SELECT 
          EXTRACT(HOUR FROM timestamp) as hour,
          COUNT(*) as count
        FROM process_events 
        WHERE lifecycle_state = 'failure' 
        GROUP BY EXTRACT(HOUR FROM timestamp) 
        ORDER BY hour
      `);
      
      const hourlyFailures = Array.from({length: 24}, (_, hour) => ({ hour, count: 0 }));
      
      if (hourlyResults.rows && Array.isArray(hourlyResults.rows)) {
        hourlyResults.rows.forEach((row: any) => {
          const hour = parseInt(row.hour);
          if (hour >= 0 && hour < 24) {
            hourlyFailures[hour].count = parseInt(row.count);
          }
        });
      }
      
      const totalFailures = hourlyFailures.reduce((sum, item) => sum + item.count, 0);
      
      return {
        analysis_type: "temporal_analysis",
        temporal_analysis: {
          hour_failure_distribution: hourlyFailures,
          daily_failure_distribution: [],
          date_range: null,
          total_failures: totalFailures,
          analysis_period: 'Manufacturing dataset analysis'
        }
      };
    } catch (error) {
      console.error('Temporal data generation error:', error);
      return {};
    }
  }

  /**
   * Analyze activity failure rates
   */
  private async analyzeActivityFailureRates(activities: any[]): Promise<any> {
    // Group activities by name and calculate failure rates
    const activityStats = new Map();
    
    activities.forEach(activity => {
      const key = activity.activity;
      if (!activityStats.has(key)) {
        activityStats.set(key, { total: 0, failures: 0, name: key });
      }
      
      const stats = activityStats.get(key);
      stats.total++;
      if (activity.status === 'failure' || activity.lifecycle_state === 'failure') {
        stats.failures++;
      }
    });
    
    const activityFailureRates = Array.from(activityStats.values())
      .map(stats => ({
        activity_name: stats.name,
        failure_count: stats.failures,
        total_count: stats.total,
        failure_rate: ((stats.failures / stats.total) * 100).toFixed(2)
      }))
      .sort((a, b) => parseFloat(b.failure_rate) - parseFloat(a.failure_rate));
    
    return { activities_with_most_failures: activityFailureRates };
  }

  /**
   * Generate structured data for visualizations
   */
  private async generateStructuredData(analysisType: string, relevantData: any, query: string): Promise<any> {
    // Return the relevant data in the expected format for frontend visualization
    switch (analysisType) {
      case 'temporal_pattern_analysis':
        return await this.generateTemporalData();
      
      case 'activity_failure_analysis':
        return {
          analysis_type: "activity_failure_analysis",
          activities_with_most_failures: relevantData.activities_with_most_failures || []
        };
      
      case 'failure_analysis':
        return {
          analysis_type: "failure_analysis",
          failure_categories: relevantData.categories || []
        };
      
      default:
        return { analysis_type: analysisType, data: relevantData };
    }
  }

  /**
   * Generate suggested actions based on analysis
   */
  private async generateSuggestedActions(queryType: string, relevantData: any): Promise<string[]> {
    const actionPrompt = `
Based on this ${queryType} analysis of manufacturing data, suggest 3 specific actionable recommendations:

Data: ${JSON.stringify(relevantData, null, 2)}

Provide ONLY a JSON array of 3 action strings, no explanation.
Example: ["Action 1", "Action 2", "Action 3"]
`;

    try {
      const response = await this.callLocalModel(actionPrompt);
      const parsed = JSON.parse(response.trim());
      return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
      // Fallback suggestions
      return [
        "Review and optimize identified problem areas",
        "Implement monitoring for detected patterns",
        "Schedule maintenance for critical components"
      ];
    }
  }

  /**
   * Generate visualization hint
   */
  private generateVisualizationHint(queryType: string): string {
    const hints = {
      'temporal_pattern_analysis': 'Time series chart showing failure distribution by hour',
      'activity_failure_analysis': 'Bar chart showing failure rates by activity',
      'failure_analysis': 'Pie chart showing failure categories',
      'anomaly_analysis': 'Scatter plot showing anomaly distribution',
      'bottleneck_analysis': 'Flow diagram highlighting bottlenecks',
      'case_analysis': 'Comparison chart between cases'
    };
    
    return hints[queryType] || 'Chart visualization based on analysis results';
  }

  /**
   * Build system prompt for manufacturing analysis
   */
  private buildSystemPrompt(queryType: string, relevantData: any): string {
    return `You are ProcessGPT, an intelligent manufacturing analyst specializing in ${queryType} for industrial process mining.

You have access to real manufacturing data and should provide detailed, actionable insights based on the following data:

${JSON.stringify(relevantData, null, 2)}

Format your response as a comprehensive manufacturing analysis report with:
1. Executive Summary
2. Key Performance Metrics  
3. Critical Issues Identified
4. Data Quality Assessment
5. Visual Analysis (if applicable)
6. Recommendations

Focus on practical insights that help optimize manufacturing processes, reduce failures, and improve efficiency.`;
  }

  /**
   * Build user prompt
   */
  private buildUserPrompt(query: string, contextData?: any): string {
    let prompt = `User Query: "${query}"`;
    
    if (contextData) {
      prompt += `\n\nAdditional Context: ${JSON.stringify(contextData, null, 2)}`;
    }
    
    return prompt;
  }
}

// Export singleton instance
export const localAI = new LocalAIService();