import OpenAI from "openai";
import { ProcessEvent, ProcessActivity, ProcessCase, AnomalyAlert } from '@shared/schema';
import { storage } from '../storage';
import { AnomalyDetector } from './anomaly-detector';
import { SemanticSearch } from './semantic-search';

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
    } else if (queryLower.includes('cluster') || queryLower.includes('group') || queryLower.includes('similar')) {
      return 'clustering_analysis';
    } else if (queryLower.includes('anomal') || queryLower.includes('abnormal')) {
      return 'anomaly_analysis';
    } else if (queryLower.includes('bottleneck') || queryLower.includes('slow') || queryLower.includes('delay')) {
      return 'bottleneck_analysis';
    } else if (queryLower.includes('failure') || queryLower.includes('error') || queryLower.includes('fail')) {
      return 'semantic_search';
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

      if (queryType === 'clustering_analysis') {
        const clusteringData = await storage.getCaseClusterAnalysis({
          mode: 'advanced',
          maxClusters: 10,
          start: 0,
          n: 100
        });
        data.clustering = clusteringData;
        data.summary.clustersFound = clusteringData.clusters.length;
        data.summary.totalPatterns = clusteringData.totalPatterns;
      }

      if (queryType === 'anomaly_analysis') {
        const anomalies = await storage.getAnomalyAlerts(15);
        const activities = await storage.getProcessActivities();
        
        // Use our anomaly detector for deeper analysis
        const recentActivities = activities.slice(0, 50);
        const anomalyAnalysis = recentActivities.map(activity => {
          const timeAnomaly = AnomalyDetector.analyzeProcessingTimeAnomaly(
            activity,
            activities.filter(a => a.activity === activity.activity)
          );
          return { activity, anomaly: timeAnomaly };
        }).filter(result => result.anomaly.isAnomaly);

        data.anomalies = anomalies;
        data.detailedAnomalies = anomalyAnalysis;
        data.summary.anomalyCount = anomalies.length;
        data.summary.detectedAnomalies = anomalyAnalysis.length;
      }

      if (queryType === 'semantic_search') {
        // Use semantic search for failure analysis
        const searchResults = await SemanticSearch.searchWithContext(
          query,
          { caseId: caseIdMatches?.[0] }
        );
        data.semanticResults = searchResults;
        data.summary.similarFailures = Array.isArray(searchResults) ? searchResults.length : searchResults.results?.length || 0;
      }

      if (queryType === 'bottleneck_analysis') {
        const bottleneckData = await storage.getBottleneckAnalysis();
        const activities = await storage.getProcessActivities();
        
        // Use our anomaly detector for bottleneck identification
        const bottlenecks = AnomalyDetector.identifyBottlenecks(activities);
        
        data.bottlenecks = bottleneckData;
        data.detailedBottlenecks = bottlenecks;
        data.summary.bottleneckStations = 0;
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
      console.error('Error gathering relevant data:', String(error));
      data.summary.dataGatheringError = true;
    }

    return data;
  }

  private static buildSystemPrompt(queryType: string, relevantData: any): string {
    let contextualPrompt = `You are ProcessGPT, an intelligent manufacturing analyst specializing in process mining and workflow optimization. You have access to real manufacturing data and powerful analysis tools.

Your advanced capabilities include:
- Real-time anomaly detection using IQR and statistical analysis
- Semantic similarity search for failure pattern matching
- Multi-dimensional case clustering for workflow pattern discovery
- Bottleneck identification with processing time analysis
- Equipment performance monitoring (HBW, VGR, Oven, Mill, Sort stations)
- Case-by-case comparison with detailed activity mapping

Current analysis context:
${JSON.stringify(relevantData.summary, null, 2)}

Query classification: ${queryType}`;

    // Add specialized context based on analysis type
    if (queryType === 'clustering_analysis' && relevantData.clustering) {
      contextualPrompt += `

CLUSTERING ANALYSIS DATA:
- Found ${relevantData.clustering.clusters.length} distinct workflow patterns
- Coverage: ${(relevantData.clustering.coverage * 100).toFixed(1)}%
- Anomaly rate: ${(relevantData.clustering.anomalyRate * 100).toFixed(1)}%
- Top patterns: ${relevantData.clustering.clusters.slice(0, 3).map((c: any) => c.processSignature).join(', ')}`;
    }

    if (queryType === 'anomaly_analysis' && relevantData.detailedAnomalies) {
      contextualPrompt += `

ANOMALY DETECTION RESULTS:
- Statistical anomalies detected: ${relevantData.detailedAnomalies.length}
- Analysis method: IQR-based time deviation detection
- Alert threshold: Activities exceeding normal processing time ranges`;
    }

    if (queryType === 'semantic_search' && relevantData.semanticResults) {
      contextualPrompt += `

SEMANTIC SEARCH RESULTS:
- Similar failure patterns found: ${relevantData.semanticResults.length}
- Using AI embedding similarity matching
- Context-aware failure description analysis`;
    }

    if (queryType === 'bottleneck_analysis' && relevantData.detailedBottlenecks) {
      contextualPrompt += `

BOTTLENECK ANALYSIS:
- Identified bottlenecks: ${relevantData.detailedBottlenecks.activities.length}
- Analysis includes processing time and wait time evaluation
- Resource utilization patterns analyzed`;
    }

    contextualPrompt += `

Instructions:
1. Provide data-driven insights using the advanced analysis results
2. Reference specific case IDs, equipment, and calculated metrics
3. Explain patterns found through clustering, anomaly detection, or semantic analysis
4. Offer actionable recommendations based on statistical findings
5. Format response as JSON with these fields:
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
    
    return contextualPrompt;
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
