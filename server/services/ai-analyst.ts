import OpenAI from "openai";
import { ProcessEvent, ProcessActivity, ProcessCase, AnomalyAlert } from '@shared/schema';
import { storage } from '../storage';

const openai = new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY_ENV_VAR || "default_key"
});

export interface AIAnalysisRequest {
  query: string;
  sessionId: string;
  contextData?: any;
}

export interface AIAnalysisResponse {
  response: string;
  queryType: string;
  contextData?: any;
  suggestedActions?: string[];
  visualizationHint?: string;
}

export class AIAnalyst {
  // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
  private static readonly MODEL = "gpt-4o";

  static async analyzeQuery(request: AIAnalysisRequest): Promise<AIAnalysisResponse> {
    const { query, sessionId, contextData } = request;
    
    // Determine query type and gather relevant data based on the query
    const queryType = this.classifyQuery(query);
    const relevantData = await this.gatherRelevantData(query, queryType);
    
    const systemPrompt = this.buildSystemPrompt(queryType, relevantData);
    const userPrompt = this.buildUserPrompt(query, contextData);
    
    try {
      const response = await openai.chat.completions.create({
        model: this.MODEL,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        response_format: { type: "json_object" },
        temperature: 0.7,
        max_tokens: 1500
      });

      const aiResponse = JSON.parse(response.choices[0].message.content || '{}');
      
      // Store conversation
      await storage.createAiConversation({
        sessionId,
        query,
        response: aiResponse.response || 'Unable to process query',
        queryType,
        contextData: { 
          ...contextData, 
          dataUsed: relevantData?.summary,
          suggestedActions: aiResponse.suggestedActions 
        }
      });

      return {
        response: aiResponse.response || 'I apologize, but I encountered an issue processing your query.',
        queryType,
        contextData: aiResponse.contextData,
        suggestedActions: aiResponse.suggestedActions,
        visualizationHint: aiResponse.visualizationHint
      };
    } catch (error) {
      console.error('AI Analysis Error:', error);
      return {
        response: 'I apologize, but I encountered an error while analyzing your query. Please try rephrasing your question or contact support if the issue persists.',
        queryType: 'error',
        contextData: { error: error.message }
      };
    }
  }

  private static classifyQuery(query: string): string {
    const queryLower = query.toLowerCase();
    
    if (queryLower.includes('compare') && queryLower.includes('case')) {
      return 'case_comparison';
    } else if (queryLower.includes('anomal') || queryLower.includes('abnormal')) {
      return 'anomaly_analysis';
    } else if (queryLower.includes('bottleneck') || queryLower.includes('slow') || queryLower.includes('delay')) {
      return 'bottleneck_analysis';
    } else if (queryLower.includes('failure') || queryLower.includes('error') || queryLower.includes('fail')) {
      return 'failure_analysis';
    } else if (queryLower.includes('equipment') || queryLower.includes('machine') || queryLower.includes('resource')) {
      return 'equipment_analysis';
    } else if (queryLower.includes('time') || queryLower.includes('duration') || queryLower.includes('performance')) {
      return 'performance_analysis';
    } else if (queryLower.includes('trend') || queryLower.includes('pattern') || queryLower.includes('temporal')) {
      return 'trend_analysis';
    } else {
      return 'general_analysis';
    }
  }

  private static async gatherRelevantData(query: string, queryType: string): Promise<any> {
    const queryLower = query.toLowerCase();
    const data: any = { summary: {} };

    try {
      // Extract case IDs from query
      const caseIdMatches = query.match(/WF_\d+_\d+/g);
      
      if (queryType === 'case_comparison' && caseIdMatches && caseIdMatches.length >= 2) {
        const comparison = await storage.getCaseComparison(caseIdMatches[0], caseIdMatches[1]);
        data.caseComparison = comparison;
        data.summary.casesCompared = caseIdMatches;
      }

      if (queryType === 'anomaly_analysis') {
        const anomalies = await storage.getAnomalyAlerts(10);
        data.anomalies = anomalies;
        data.summary.anomalyCount = anomalies.length;
      }

      if (queryType === 'performance_analysis' || queryType === 'general_analysis') {
        const metrics = await storage.getDashboardMetrics();
        data.metrics = metrics;
        data.summary.metrics = metrics;
      }

      // Get recent activities for context
      const recentEvents = await storage.getProcessEvents({ limit: 50 });
      data.recentEvents = recentEvents.slice(0, 10); // Limit for prompt size
      data.summary.recentEventCount = recentEvents.length;

      // Extract specific equipment if mentioned
      const equipmentKeywords = ['hbw', 'vgr', 'oven', 'mill', 'sort'];
      const mentionedEquipment = equipmentKeywords.filter(eq => queryLower.includes(eq));
      if (mentionedEquipment.length > 0) {
        data.summary.equipmentFocus = mentionedEquipment;
      }

    } catch (error) {
      console.error('Error gathering relevant data:', error);
      data.summary.dataGatheringError = true;
    }

    return data;
  }

  private static buildSystemPrompt(queryType: string, relevantData: any): string {
    return `You are an AI Process Mining Analyst specializing in manufacturing workflow analysis. You have access to real manufacturing process data from an IoT-enriched smart factory.

Your expertise includes:
- Manufacturing process mining and workflow analysis
- Anomaly detection in production lines
- Equipment performance analysis (High Bay Warehouse, VGR Robot, Oven, Milling Machine, Sorting Machine)
- Case-by-case comparison and bottleneck identification
- Failure pattern analysis and root cause investigation

Current data context:
${JSON.stringify(relevantData.summary, null, 2)}

Query type: ${queryType}

Instructions:
1. Provide accurate, data-driven analysis based on the provided manufacturing data
2. Use specific case IDs, equipment names, and metrics when available
3. Offer actionable insights and recommendations
4. Format your response as JSON with these fields:
   - response: Your detailed analysis (string)
   - suggestedActions: Array of recommended actions (array of strings)
   - visualizationHint: Suggest relevant charts or visualizations (string)
   - contextData: Any additional structured data for the frontend (object)

5. For manufacturing context:
   - HBW = High Bay Warehouse (storage/retrieval)
   - VGR = Robot for transport/manipulation  
   - OV = Oven for heating/processing
   - MM = Milling Machine for precision machining
   - SM = Sorting Machine for quality control
   - Activities follow: scheduled → start → complete lifecycle

Be precise, professional, and focus on manufacturing process optimization insights.`;
  }

  private static buildUserPrompt(query: string, contextData?: any): string {
    let prompt = `Analyze this manufacturing process query: "${query}"`;
    
    if (contextData) {
      prompt += `\n\nAdditional context: ${JSON.stringify(contextData, null, 2)}`;
    }
    
    prompt += '\n\nPlease provide your analysis in JSON format as specified in the system instructions.';
    
    return prompt;
  }

  static async generateCaseComparisonReport(caseAId: string, caseBId: string): Promise<string> {
    const comparison = await storage.getCaseComparison(caseAId, caseBId);
    
    if (!comparison) {
      return `Unable to find both cases for comparison. Please verify that cases ${caseAId} and ${caseBId} exist in the system.`;
    }

    const prompt = `Generate a detailed comparison report for manufacturing cases ${caseAId} and ${caseBId}. 

Case A Data: ${JSON.stringify(comparison.caseA, null, 2)}
Case B Data: ${JSON.stringify(comparison.caseB, null, 2)}

Focus on:
1. Processing time differences by station
2. Bottlenecks and delays
3. Success/failure patterns
4. Equipment performance variations
5. Recommendations for optimization

Provide a comprehensive manufacturing process analysis report.`;

    try {
      const response = await openai.chat.completions.create({
        model: this.MODEL,
        messages: [
          { 
            role: "system", 
            content: "You are a manufacturing process analyst. Generate detailed, technical case comparison reports." 
          },
          { role: "user", content: prompt }
        ],
        temperature: 0.3,
        max_tokens: 2000
      });

      return response.choices[0].message.content || 'Unable to generate comparison report.';
    } catch (error) {
      console.error('Error generating comparison report:', error);
      return 'Error generating comparison report. Please try again later.';
    }
  }

  static async analyzeFailurePatterns(failures: ProcessActivity[]): Promise<{
    patterns: string[];
    recommendations: string[];
    riskAssessment: string;
  }> {
    if (failures.length === 0) {
      return {
        patterns: ['No failure data available for analysis'],
        recommendations: ['Continue monitoring for failure patterns'],
        riskAssessment: 'Unable to assess risk without failure data'
      };
    }

    const failureData = failures.map(f => ({
      activity: f.activity,
      resource: f.orgResource,
      duration: f.actualDurationS,
      description: f.failureDescription,
      timestamp: f.createdAt
    }));

    const prompt = `Analyze these manufacturing failure patterns:

${JSON.stringify(failureData, null, 2)}

Identify:
1. Common failure patterns and root causes
2. Equipment-specific vulnerabilities  
3. Temporal patterns (time-based failures)
4. Recommended preventive actions
5. Risk assessment for production continuity

Respond in JSON format with: patterns (array), recommendations (array), riskAssessment (string).`;

    try {
      const response = await openai.chat.completions.create({
        model: this.MODEL,
        messages: [
          { 
            role: "system", 
            content: "You are a manufacturing reliability engineer. Analyze failure patterns and provide actionable insights." 
          },
          { role: "user", content: prompt }
        ],
        response_format: { type: "json_object" },
        temperature: 0.3,
        max_tokens: 1500
      });

      const analysis = JSON.parse(response.choices[0].message.content || '{}');
      return {
        patterns: analysis.patterns || ['Unable to identify patterns'],
        recommendations: analysis.recommendations || ['Continue monitoring'],
        riskAssessment: analysis.riskAssessment || 'Risk assessment unavailable'
      };
    } catch (error) {
      console.error('Error analyzing failure patterns:', error);
      return {
        patterns: ['Error analyzing failure patterns'],
        recommendations: ['Review failure data manually'],
        riskAssessment: 'Unable to assess risk due to analysis error'
      };
    }
  }
}
