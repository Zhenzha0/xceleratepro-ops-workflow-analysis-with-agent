import OpenAI from "openai";
import { storage } from '../storage';

const openai = new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY_ENV_VAR || "default_key"
});

export interface AnalysisCapability {
  name: string;
  description: string;
  dataRequired: string[];
  examples: string[];
}

export class IntelligentAnalyst {
  // Available analysis capabilities - AI learns what's possible
  private static readonly CAPABILITIES: AnalysisCapability[] = [
    {
      name: "anomaly_detection",
      description: "Detect unusual patterns in processing times, equipment behavior, or case flows using statistical analysis",
      dataRequired: ["activities", "processing_times", "equipment_usage"],
      examples: ["What's going wrong?", "Any unusual patterns?", "Problems in my process?"]
    },
    {
      name: "bottleneck_analysis", 
      description: "Identify slowest stations, queue times, and throughput constraints",
      dataRequired: ["activities", "wait_times", "equipment_utilization"],
      examples: ["Where are the delays?", "What's slowing things down?", "Capacity issues?"]
    },
    {
      name: "performance_metrics",
      description: "Calculate efficiency ratios, success rates, and key performance indicators",
      dataRequired: ["cases", "activities", "completion_status"],
      examples: ["How are we performing?", "Success rate?", "Overall efficiency?"]
    },
    {
      name: "trend_analysis",
      description: "Analyze patterns over time, seasonal effects, or temporal correlations",
      dataRequired: ["timestamps", "activities", "performance_data"],
      examples: ["Trends over time?", "Performance changing?", "Historical patterns?"]
    },
    {
      name: "case_comparison",
      description: "Compare different manufacturing cases to identify differences and similarities",
      dataRequired: ["case_activities", "case_metadata", "process_flows"],
      examples: ["Compare case A vs B", "Differences between workflows?", "Similar cases?"]
    },
    {
      name: "equipment_analysis",
      description: "Analyze machine utilization, maintenance patterns, and resource allocation",
      dataRequired: ["equipment_usage", "activities", "resource_assignments"],
      examples: ["How is equipment performing?", "Machine utilization?", "Resource issues?"]
    }
  ];

  /**
   * Intelligent query analysis - Let AI decide what analysis to perform
   * Instead of keyword matching, we describe capabilities and let GPT choose
   */
  static async intelligentAnalysis(query: string, filters?: any): Promise<{
    selectedCapabilities: string[];
    analysisResults: any;
    reasoning: string;
  }> {
    // Step 1: AI decides what analysis capabilities are needed
    const capabilitySelection = await this.selectRelevantCapabilities(query);
    
    // Step 2: Gather data for the selected capabilities
    const analysisData = await this.gatherAnalysisData(capabilitySelection.capabilities, filters);
    
    // Step 3: Perform the actual analysis
    const results = await this.executeAnalysis(query, capabilitySelection, analysisData);
    
    return {
      selectedCapabilities: capabilitySelection.capabilities,
      analysisResults: results,
      reasoning: capabilitySelection.reasoning
    };
  }

  /**
   * Let AI choose which analysis capabilities are relevant for the query
   */
  private static async selectRelevantCapabilities(query: string): Promise<{
    capabilities: string[];
    reasoning: string;
  }> {
    const prompt = `You are an intelligent manufacturing analyst. A user asked: "${query}"

Available analysis capabilities:
${this.CAPABILITIES.map(cap => `- ${cap.name}: ${cap.description}`).join('\n')}

Determine which capabilities are most relevant to answer this question. Consider:
1. What specific insights the user is seeking
2. What type of analysis would provide the best answer
3. Whether multiple capabilities should be combined

Respond with JSON:
{
  "capabilities": ["capability1", "capability2"],
  "reasoning": "Brief explanation of why these capabilities were selected"
}`;

    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
        temperature: 0.3
      });

      return JSON.parse(response.choices[0].message.content || '{"capabilities": ["performance_metrics"], "reasoning": "Default analysis"}');
    } catch (error) {
      console.error('Error in capability selection:', error);
      // Fallback to performance metrics if AI selection fails
      return {
        capabilities: ["performance_metrics"],
        reasoning: "Fallback to general performance analysis due to capability selection error"
      };
    }
  }

  /**
   * Gather relevant data based on selected capabilities
   */
  private static async gatherAnalysisData(capabilities: string[], filters?: any): Promise<any> {
    const data: any = { summary: {}, capabilities: capabilities };

    try {
      // Get base data
      let activities = await storage.getProcessActivities();
      let events = await storage.getProcessEvents();
      let cases = await storage.getProcessCases();

      // Apply filters if provided (reuse the existing filter logic)
      if (filters) {
        // Filter application logic here - simplified for brevity
        if (filters.equipment && filters.equipment !== 'all') {
          activities = activities.filter(a => a.orgResource === filters.equipment);
          events = events.filter(e => e.orgResource === filters.equipment);
        }
      }

      // Gather data specific to selected capabilities
      for (const capability of capabilities) {
        switch (capability) {
          case 'anomaly_detection':
            // Import and use anomaly detector
            const { AnomalyDetector } = await import('./anomaly-detector.js');
            const anomalies = [];
            for (const activity of activities.slice(0, 100)) { // Limit for performance
              const anomalyResult = AnomalyDetector.analyzeProcessingTimeAnomaly(activity, activities);
              if (anomalyResult.isAnomaly) {
                anomalies.push({
                  caseId: activity.caseId,
                  activity: activity.activity,
                  score: anomalyResult.score,
                  reason: anomalyResult.reason
                });
              }
            }
            data.anomalies = anomalies;
            break;

          case 'bottleneck_analysis':
            const bottleneckData = await storage.getBottleneckAnalysis();
            data.bottlenecks = bottleneckData;
            break;

          case 'performance_metrics':
            const metrics = await storage.getDashboardMetrics();
            data.metrics = metrics;
            break;

          case 'trend_analysis':
            // Group activities by time periods for trend analysis
            const timeGrouped = activities.reduce((acc, activity) => {
              const date = new Date(activity.startTime || activity.createdAt || new Date()).toISOString().split('T')[0];
              if (!acc[date]) acc[date] = [];
              acc[date].push(activity);
              return acc;
            }, {} as Record<string, any[]>);
            data.trends = timeGrouped;
            break;

          case 'equipment_analysis':
            // Group by equipment for utilization analysis
            const equipmentGroups = activities.reduce((acc, activity) => {
              const equipment = activity.orgResource || 'unknown';
              if (!acc[equipment]) acc[equipment] = [];
              acc[equipment].push(activity);
              return acc;
            }, {} as Record<string, any[]>);
            data.equipmentAnalysis = equipmentGroups;
            break;
        }
      }

      data.summary = {
        totalActivities: activities.length,
        totalCases: cases.length,
        dataScope: filters ? 'filtered' : 'full',
        appliedFilters: filters
      };

      return data;
    } catch (error) {
      console.error('Error gathering analysis data:', error);
      return { summary: { error: 'Failed to gather analysis data' } };
    }
  }

  /**
   * Execute the final analysis with AI interpretation
   */
  private static async executeAnalysis(query: string, capabilitySelection: any, analysisData: any): Promise<any> {
    const systemPrompt = `You are ProcessGPT, an intelligent manufacturing analyst. You have access to real manufacturing data and analysis results.

The user asked: "${query}"

You selected these analysis capabilities: ${capabilitySelection.capabilities.join(', ')}
Reasoning: ${capabilitySelection.reasoning}

Analysis data available:
${JSON.stringify(analysisData.summary, null, 2)}

Provide a comprehensive response that:
1. Directly answers the user's question
2. Uses the specific analysis results provided
3. Gives actionable insights
4. Explains what analysis methods were used

Respond in JSON format:
{
  "response": "Your detailed analysis with clear structure and sections",
  "keyFindings": ["finding1", "finding2", "finding3"],
  "suggestedActions": ["action1", "action2"],
  "methodsUsed": ["method1", "method2"],
  "dataTransparency": "Information about what data was analyzed"
}`;

    const userPrompt = `Analysis data: ${JSON.stringify(analysisData, null, 2)}`;

    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        response_format: { type: "json_object" },
        temperature: 0.7,
        max_tokens: 2000
      });

      return JSON.parse(response.choices[0].message.content || '{}');
    } catch (error) {
      console.error('Error in analysis execution:', error);
      return {
        response: "I apologize, but I encountered an error while analyzing your query. Please try rephrasing your question.",
        keyFindings: [],
        suggestedActions: [],
        methodsUsed: ["error_recovery"],
        dataTransparency: "Analysis failed due to processing error"
      };
    }
  }
}