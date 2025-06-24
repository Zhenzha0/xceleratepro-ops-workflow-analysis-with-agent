import OpenAI from "openai";
import { ProcessEvent, ProcessActivity, ProcessCase, AnomalyAlert } from '@shared/schema';
import { storage } from '../storage';
import { AnomalyDetector } from './anomaly-detector';
import { SemanticSearch } from './semantic-search';
import { EnhancedFailureAnalyzer } from './failure-analyzer-enhanced';
import { TimingAnalyzer } from './timing-analyzer';
import { TrendAnalyzer } from './trend-analyzer';
import { CaseAnalyzer } from './case-analyzer';

const openai = new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY_ENV_VAR || "default_key"
});

export interface AIAnalysisRequest {
  query: string;
  sessionId: string;
  contextData?: any;
  filters?: {
    scopeType?: string;
    datasetSize?: string;
    datasetOrder?: string;
    customLimit?: number;
    activityRange?: { start: number; end: number };
    timeRange?: { start: string; end: string };
    equipment?: string;
    status?: string;
    caseIds?: string[];
  };
}

export interface AIAnalysisResponse {
  response: string;
  queryType: string;
  contextData?: any;
  suggestedActions?: string[];
  visualizationHint?: string;
  data?: any; // Structured data for visualizations
  analysis_type?: string; // Key field for automatic visualization detection
}

export class AIAnalyst {
  // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
  private static readonly MODEL = "gpt-4o";

  static async analyzeQuery(request: AIAnalysisRequest): Promise<AIAnalysisResponse> {
    const { query, sessionId, contextData, filters } = request;
    
    try {
      // Validate inputs
      if (!query || query.trim().length === 0) {
        return {
          response: 'Please provide a question about your manufacturing data.',
          queryType: 'error'
        };
      }

      // Determine query type and gather relevant data based on the query
      const queryType = this.classifyQuery(query);
      const relevantData = await this.gatherRelevantData(query, queryType, filters);
      
      const systemPrompt = this.buildSystemPrompt(queryType, relevantData);
      const userPrompt = this.buildUserPrompt(query, contextData);
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

      // Generate structured data for automatic visualizations
      const structuredData = await AIAnalyst.generateStructuredData(queryType, relevantData, query);
      
      return {
        response: aiResponse.response || 'I apologize, but I encountered an issue processing your query.',
        queryType,
        contextData: aiResponse.contextData,
        suggestedActions: aiResponse.suggestedActions,
        visualizationHint: aiResponse.visualizationHint,
        data: structuredData,
        analysis_type: queryType
      };
    } catch (error) {
      console.error('AI Analysis Error:', error);
      
      // Provide more helpful error messages based on error type
      let errorMessage = 'I apologize, but I encountered an error while processing your request. Please try again or rephrase your question.';
      
      if (error instanceof Error) {
        if (error.message.includes('API key')) {
          errorMessage = 'There seems to be an issue with the AI service configuration. Please contact support.';
        } else if (error.message.includes('rate limit')) {
          errorMessage = 'The AI service is temporarily busy. Please wait a moment and try again.';
        } else if (error.message.includes('timeout')) {
          errorMessage = 'The analysis is taking longer than expected. Please try a simpler question.';
        } else if (error.message.includes('JSON')) {
          errorMessage = 'I had trouble processing the analysis results. Please try rephrasing your question.';
        }
      }
      
      // Try to store the failed conversation
      try {
        await storage.createAiConversation({
          sessionId,
          query,
          response: errorMessage,
          queryType: 'error',
          contextData: { error: error instanceof Error ? error.message : 'Unknown error' }
        });
      } catch (dbError) {
        console.error('Error storing failed conversation:', dbError);
      }
      
      return {
        response: errorMessage,
        queryType: 'error',
        contextData: { error: error instanceof Error ? error.message : 'Unknown error' }
      };
    }
  }

  private static classifyQuery(query: string): string {
    const queryLower = query.toLowerCase();
    
    console.log(`Classifying query: ${query}`);
    
    // 🔧 Failure Analysis & Diagnosis
    if (queryLower.includes('cause') || queryLower.includes('reason') || 
        (queryLower.includes('common') && queryLower.includes('failure'))) {
      console.log('→ Classified as: failure_cause_analysis');
      return 'failure_cause_analysis';
    }
    
    if (queryLower.includes('activity') && (queryLower.includes('fail') || queryLower.includes('highest'))) {
      console.log('→ Classified as: activity_failure_rate_analysis');
      return 'activity_failure_rate_analysis';
    }
    
    if (queryLower.includes('recurring') || queryLower.includes('pattern') && queryLower.includes('failure')) {
      return 'recurring_failure_analysis';
    }
    
    if (queryLower.includes('error') && queryLower.includes('activity')) {
      return 'activity_error_analysis';
    }
    
    // ⏱️ Delay & Timing Issues
    if (queryLower.includes('longest') && queryLower.includes('processing')) {
      return 'processing_time_analysis';
    }
    
    if (queryLower.includes('transition') && (queryLower.includes('time') || queryLower.includes('delay'))) {
      return 'transition_time_analysis';
    }
    
    if (queryLower.includes('wait') && queryLower.includes('time')) {
      return 'wait_time_analysis';
    }
    
    if (queryLower.includes('abnormal') && queryLower.includes('duration')) {
      return 'abnormal_duration_analysis';
    }
    
    if ((queryLower.includes('delay') || queryLower.includes('slow')) && 
        (queryLower.includes('time') || queryLower.includes('period') || queryLower.includes('shift'))) {
      return 'temporal_delay_analysis';
    }
    
    // 🔄 Anomaly Detection - HIGHEST PRIORITY
    if (queryLower.includes('anomaly') || queryLower.includes('anomalous') || queryLower.includes('unusual') || queryLower.includes('anomal')) {
      console.log('→ Classified as: anomaly_analysis');
      return 'anomaly_analysis';
    }
    
    // ⏰ Temporal Analysis - Time-based questions
    if (queryLower.includes('hour') && queryLower.includes('concentration')) {
      if (queryLower.includes('failure')) {
        console.log('→ Classified as: temporal_pattern_analysis (failures by hour)');
        return 'temporal_pattern_analysis';
      }
    }
    
    if (queryLower.includes('spike') && queryLower.includes('processing')) {
      return 'processing_spike_analysis';
    }
    
    // 📈 Trend & Pattern Mining
    if (queryLower.includes('trend') || queryLower.includes('changed') || queryLower.includes('over time')) {
      return 'trend_analysis';
    }
    
    if (queryLower.includes('improving') || queryLower.includes('deteriorating')) {
      return 'activity_trend_analysis';
    }
    
    if (queryLower.includes('emerging') || queryLower.includes('new') && queryLower.includes('failure')) {
      return 'emerging_failure_analysis';
    }
    
    // 🧩 Root Cause & Correlation
    if (queryLower.includes('correlation') || queryLower.includes('link') || queryLower.includes('relationship')) {
      return 'correlation_analysis';
    }
    
    if (queryLower.includes('upstream') || queryLower.includes('lead to')) {
      return 'upstream_failure_analysis';
    }
    
    // 🛠️ Maintenance & Recommendations
    if (queryLower.includes('maintenance') || queryLower.includes('repair')) {
      return 'maintenance_analysis';
    }
    
    if (queryLower.includes('reduce') && (queryLower.includes('failure') || queryLower.includes('downtime'))) {
      return 'improvement_analysis';
    }
    
    // 🎯 Targeted Case Queries
    if (queryLower.includes('case') && (queryLower.includes('id') || queryLower.includes('xyz'))) {
      return 'case_specific_analysis';
    }
    
    if (queryLower.includes('show') && queryLower.includes('case') && queryLower.includes('failure')) {
      return 'failure_search_analysis';
    }
    
    if (queryLower.includes('summary') && queryLower.includes('last') && queryLower.includes('case')) {
      return 'recent_case_summary';
    }
    
    // 🌊 Time-based patterns
    if (queryLower.includes('hour') || queryLower.includes('concentration') || queryLower.includes('when')) {
      return 'temporal_pattern_analysis';
    }
    
    // Standard classifications
    if (queryLower.includes('cluster') || queryLower.includes('similar')) {
      return 'clustering_analysis';
    }
    
    if (queryLower.includes('bottleneck')) {
      return 'bottleneck_analysis';
    }
    
    if (queryLower.includes('performance') || queryLower.includes('efficiency')) {
      return 'performance_analysis';
    }
    
    if (queryLower.includes('equipment') || queryLower.includes('machine') || queryLower.includes('station')) {
      return 'equipment_analysis';
    }
    
    // Fallback for failure queries
    if (queryLower.includes('failure') || queryLower.includes('error') || queryLower.includes('fail')) {
      
      // 1. ROOT CAUSE ANALYSIS: "what is the most common failures" -> analyze failure causes
      if (queryLower.includes('cause') || queryLower.includes('reason') || queryLower.includes('why') ||
          (queryLower.includes('what') && queryLower.includes('most') && queryLower.includes('common')) ||
          (queryLower.includes('what') && queryLower.includes('common') && queryLower.includes('failure'))) {
        console.log('→ Classified as: activity_failure_cause_analysis (root causes)');
        return 'activity_failure_cause_analysis';
      }
      
      // 2. ACTIVITY FAILURE RATE: "what activity has the highest failures" -> analyze which activities fail most
      if ((queryLower.includes('which') || queryLower.includes('what')) && 
          queryLower.includes('activit') && 
          (queryLower.includes('most') || queryLower.includes('highest') || queryLower.includes('fail')) &&
          !queryLower.includes('cause') && !queryLower.includes('reason')) {
        console.log('→ Classified as: activity_failure_rate_analysis (which activities fail)');
        return 'activity_failure_rate_analysis';
      }
      
      // 3. Case-level failure analysis
      if (queryLower.includes('case') && !queryLower.includes('activit')) {
        console.log('→ Classified as: case_failure_analysis');
        return 'case_failure_analysis';
      }
      
      // 4. Default failure analysis
      console.log('→ Classified as: failure_analysis (default)');
      return 'failure_analysis';
    } else if (queryLower.includes('search') || queryLower.includes('find') || queryLower.includes('similar')) {
      return 'semantic_search';
    } else if (queryLower.includes('equipment') || queryLower.includes('machine') || queryLower.includes('resource') ||
               queryLower.includes('station') || queryLower.includes('hbw') || queryLower.includes('vgr')) {
      return 'equipment_analysis';
    } else if (queryLower.includes('time') || queryLower.includes('duration') || queryLower.includes('performance') ||
               queryLower.includes('efficiency') || queryLower.includes('rate') || queryLower.includes('speed')) {
      return 'performance_analysis';
    } else if (queryLower.includes('trend') || queryLower.includes('temporal') || queryLower.includes('over time') ||
               queryLower.includes('timeline') || queryLower.includes('history')) {
      return 'trend_analysis';
    } else {
      return 'general_analysis';
    }
  }

  private static async gatherRelevantData(query: string, queryType: string, filters?: any): Promise<any> {
    const queryLower = query.toLowerCase();
    const data: any = { summary: {}, filters: filters };

    try {
      // When filters are applied, use the filtered dataset
      let scopedActivities = [];
      let scopedEvents = [];
      let scopedCases = [];
      
      if (filters && ((filters.scopeType === 'dataset' && filters.datasetSize === 'range') || 
          (filters.equipment && filters.equipment !== 'all') || 
          (filters.status && filters.status !== 'all') ||
          (filters.caseIds && Array.isArray(filters.caseIds) && filters.caseIds.length > 0))) {
        
        // Get filtered data based on applied filters
        let activities = await storage.getProcessActivities();
        let events = await storage.getProcessEvents();
        let cases = await storage.getProcessCases();
        
        // Apply dataset scope filters
        if (filters.scopeType === 'dataset' && filters.datasetSize === 'range') {
          const start = filters.activityRange?.start || 1;
          const end = filters.activityRange?.end || 100;
          activities = activities.slice(start - 1, end);
          const scopedCaseIds = Array.from(new Set(activities.map(a => a.caseId)));
          events = events.filter(e => scopedCaseIds.includes(e.caseId));
          cases = cases.filter(c => scopedCaseIds.includes(c.caseId));
        }
        
        // Apply equipment filter
        if (filters?.equipment && filters.equipment !== 'all') {
          activities = activities.filter(a => a.orgResource === filters.equipment);
          events = events.filter(e => e.orgResource === filters.equipment);
        }
        
        // Apply status filter
        if (filters?.status && filters.status !== 'all') {
          activities = activities.filter(a => a.status === filters.status);
        }
        
        // Apply case ID filter
        if (filters?.caseIds && Array.isArray(filters.caseIds) && filters.caseIds.length > 0) {
          activities = activities.filter(a => filters.caseIds.includes(a.caseId));
          events = events.filter(e => filters.caseIds.includes(e.caseId));
          cases = cases.filter(c => filters.caseIds.includes(c.caseId));
        }
        
        scopedActivities = activities;
        scopedEvents = events;
        scopedCases = cases;
        
        data.summary.dataScope = 'filtered';
        data.summary.totalActivities = scopedActivities.length;
        data.summary.totalCases = scopedCases.length;
        data.summary.appliedFilters = filters;
      } else {
        // Use full dataset when no filters applied
        scopedActivities = await storage.getProcessActivities();
        scopedEvents = await storage.getProcessEvents();
        scopedCases = await storage.getProcessCases();
        
        data.summary.dataScope = 'full';
        data.summary.totalActivities = scopedActivities.length;
        data.summary.totalCases = scopedCases.length;
      }

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
          n: scopedActivities.length
        });
        data.clustering = clusteringData;
        data.summary.clustersFound = clusteringData.clusters.length;
        data.summary.totalPatterns = clusteringData.totalPatterns;
      }

      // Use enhanced failure analysis for failure cause queries
      if (queryLower.includes('failure') || queryLower.includes('fail') || 
          queryLower.includes('cause') || queryLower.includes('problem') ||
          queryLower.includes('issue') || queryLower.includes('error')) {
        
        // Enhanced logic to distinguish between different types of failure analysis
        if (queryType === 'failure_cause_analysis') {
          // Get failure causes from unsatisfied_condition_description
          console.log('Getting failure causes from unsatisfied_condition_description');
          try {
            const failureCauses = await EnhancedFailureAnalyzer.categorizeFailureCauses();
            data.failureCauses = failureCauses;
            data.summary.analysisType = 'failure_causes';
            data.totalFailures = failureCauses.reduce((sum: number, cause: any) => sum + cause.count, 0);
          } catch (error) {
            console.error('Error getting failure causes:', error);
            // Fallback: Get failures and analyze descriptions manually
            const failures = await storage.getProcessEvents({
              status: 'failure',
              limit: 1000
            });
            
            // Extract failure causes from descriptions
            const causeMap = new Map<string, number>();
            failures.forEach(failure => {
              const desc = failure.unsatisfiedConditionDescription?.toLowerCase() || '';
              if (desc.includes('sensor')) causeMap.set('Sensor Failures', (causeMap.get('Sensor Failures') || 0) + 1);
              else if (desc.includes('inventory') || desc.includes('stock')) causeMap.set('Inventory Issues', (causeMap.get('Inventory Issues') || 0) + 1);
              else if (desc.includes('network') || desc.includes('connection')) causeMap.set('Network Issues', (causeMap.get('Network Issues') || 0) + 1);
              else if (desc.includes('rfid') || desc.includes('nfc')) causeMap.set('RFID/NFC Issues', (causeMap.get('RFID/NFC Issues') || 0) + 1);
              else causeMap.set('Other Technical Issues', (causeMap.get('Other Technical Issues') || 0) + 1);
            });
            
            const failureCauses = Array.from(causeMap.entries()).map(([cause, count]) => ({
              cause,
              count,
              percentage: (count / failures.length * 100).toFixed(1)
            }));
            
            data.failureCauses = failureCauses;
            data.totalFailures = failures.length;
            data.sampleFailures = failures.slice(0, 10);
            data.summary.analysisType = 'failure_causes_fallback';
          }
        }
        
        if (queryType === 'activity_failure_rate_analysis') {
          // Analyze which activities have the highest failure rates
          const activityFailureRates = await this.analyzeActivityFailureRates(filters);
          data.activityFailureRates = activityFailureRates;
          data.summary.analysisType = 'activity_failure_rates';
          data.summary.topFailingActivities = activityFailureRates.slice(0, 3).map(a => ({
            activity: a.activity,
            failureRate: a.failureRate,
            totalFailures: a.totalFailures
          }));
        } else if (queryType === 'activity_failure_cause_analysis') {
          // Use enhanced analyzer for activity-level root cause analysis
          const { EnhancedFailureAnalyzer } = await import('./failure-analyzer-enhanced.js');
          const failureAnalysis = await EnhancedFailureAnalyzer.analyzeFailureCauses(filters);
          const failureSummary = await EnhancedFailureAnalyzer.getFailureSummary(filters);
          
          data.actualFailures = failureAnalysis;
          data.failureSummary = failureSummary;
          data.summary.actualFailureCount = failureAnalysis.totalFailures;
          data.summary.failureRate = failureAnalysis.failureRate;
          data.summary.topFailureTypes = failureAnalysis.commonPatterns.slice(0, 3).map(p => p.description);
          data.summary.analysisLevel = 'activity_causes';
        } else {
          // Use standard analyzer for general failure analysis
          const { FailureAnalyzer } = await import('./failure-analyzer.js');
          const failureAnalysis = await FailureAnalyzer.analyzeFailureCauses(filters);
          const failureSummary = await FailureAnalyzer.getFailureSummary(filters);
          
          data.actualFailures = failureAnalysis;
          data.failureSummary = failureSummary;
          data.summary.actualFailureCount = failureAnalysis.totalFailures;
          data.summary.failureRate = failureAnalysis.failureRate;
          data.summary.topFailureTypes = failureAnalysis.commonPatterns.slice(0, 3).map(p => p.description);
          data.summary.analysisLevel = 'general';
        }
      }

      // Enhanced anomaly detection with temporal analysis
      if (queryType === 'anomaly_analysis' || queryLower.includes('anomal') || queryLower.includes('unusual') || queryLower.includes('deviation')) {
        const { AnomalyDetector } = await import('./anomaly-detector.js');
        const anomalies = [];
        
        // Analyze temporal patterns for anomalies
        const anomalyHourMap = new Map<number, number>();
        
        for (const activity of scopedActivities.slice(0, 1000)) { // Analyze more for temporal patterns
          const anomalyResult = AnomalyDetector.analyzeProcessingTimeAnomaly(activity, scopedActivities);
          if (anomalyResult.isAnomaly) {
            const hour = new Date(activity.createdAt).getHours();
            anomalyHourMap.set(hour, (anomalyHourMap.get(hour) || 0) + 1);
            
            anomalies.push({
              caseId: activity.caseId,
              activity: activity.activity,
              score: anomalyResult.score,
              reason: anomalyResult.reason,
              equipment: activity.orgResource,
              hour: hour,
              timestamp: activity.createdAt
            });
          }
        }
        
        // Convert hour map to array for analysis
        const hourlyAnomalies = Array.from({length: 24}, (_, hour) => ({
          hour,
          count: anomalyHourMap.get(hour) || 0
        }));
        
        data.anomalies = anomalies;
        data.hourlyAnomalies = hourlyAnomalies;
        data.summary.anomaliesFound = anomalies.length;
        data.summary.peakAnomalyHour = hourlyAnomalies.reduce((peak, current) => 
          current.count > peak.count ? current : peak, {hour: 0, count: 0});
      }

      // Get performance metrics for scoped data
      data.metrics = {
        avgProcessingTime: scopedActivities.length > 0 
          ? scopedActivities.reduce((sum, a) => sum + (a.actualDurationS || 0), 0) / scopedActivities.length 
          : 0,
        successRate: scopedActivities.length > 0 
          ? (scopedActivities.filter(a => a.status === 'success').length / scopedActivities.length) * 100 
          : 0,
        totalActivities: scopedActivities.length,
        totalCases: scopedCases.length,
        activeCases: scopedCases.filter(c => c.status === 'inProgress').length,
        completedCases: scopedCases.filter(c => c.status === 'success').length,
        failedCases: scopedCases.filter(c => c.status === 'failed').length
      };

      if (queryType === 'anomaly_analysis') {
        const anomalies = await storage.getAnomalyAlerts(15);
        const activities = await storage.getProcessActivities();
        
        // Filter activities based on applied filters
        let filteredActivities = activities;
        if (filters?.caseIds && Array.isArray(filters.caseIds) && filters.caseIds.length > 0) {
          filteredActivities = activities.filter(a => filters.caseIds.includes(a.caseId));
        }
        if (filters?.equipment && filters.equipment !== 'all') {
          filteredActivities = filteredActivities.filter(a => a.orgResource === filters.equipment);
        }
        
        // Use our anomaly detector for deeper analysis on filtered data
        const { AnomalyDetector } = await import('./anomaly-detector.js');
        const recentActivities = filteredActivities.slice(0, 50);
        const anomalyAnalysis = recentActivities.map(activity => {
          const timeAnomaly = AnomalyDetector.analyzeProcessingTimeAnomaly(
            activity,
            filteredActivities.filter(a => a.activity === activity.activity)
          );
          return { activity, anomaly: timeAnomaly };
        }).filter(result => result.anomaly.isAnomaly);

        data.anomalies = anomalies;
        data.detailedAnomalies = anomalyAnalysis;
        data.summary.anomalyCount = anomalies.length;
        data.summary.detectedAnomalies = anomalyAnalysis.length;
        data.summary.filteredDataSize = filteredActivities.length;
      }

      if (queryType === 'semantic_search') {
        // Use semantic search for failure analysis
        const searchResults = await SemanticSearch.searchWithContext(
          query,
          { caseId: caseIdMatches && caseIdMatches.length > 0 ? caseIdMatches[0] : undefined }
        );
        data.semanticResults = searchResults;
        data.summary.similarFailures = Array.isArray(searchResults) ? searchResults.length : searchResults.results?.length || 0;
      }

      if (queryType === 'bottleneck_analysis') {
        const bottleneckData = await storage.getBottleneckAnalysis();
        
        // Use our anomaly detector for bottleneck identification
        const { AnomalyDetector } = await import('./anomaly-detector.js');
        const bottlenecks = AnomalyDetector.identifyBottlenecks(scopedActivities);
        
        data.bottlenecks = bottleneckData;
        data.detailedBottlenecks = bottlenecks;
        data.summary.bottleneckStations = Array.isArray(bottlenecks) ? bottlenecks.length : 0;
      }

      if (queryType === 'performance_analysis' || queryType === 'general_analysis') {
        const metrics = await storage.getDashboardMetrics();
        data.metrics = metrics;
        data.summary.metrics = metrics;
      }

      // Get recent activities for context using scoped data
      data.recentEvents = scopedEvents.slice(0, 10); // Limit for prompt size
      data.summary.recentEventCount = scopedEvents.length;

      // Extract specific equipment if mentioned
      const equipmentKeywords = ['hbw', 'vgr', 'oven', 'mill', 'sort'];
      const mentionedEquipment = equipmentKeywords.filter(eq => queryLower.includes(eq));
      if (mentionedEquipment.length > 0) {
        data.summary.equipmentFocus = mentionedEquipment;
      }

    } catch (error) {
      console.error('Error gathering relevant data:', String(error));
      data.summary.dataGatheringError = true;
      data.summary.errorMessage = 'Failed to gather some data, but analysis will continue with available information.';
    }

    return data;
  }

  /**
   * Analyze which activities have the highest failure rates
   */
  private static async analyzeActivityFailureRates(filters?: any): Promise<any[]> {
    try {
      let events = await storage.getProcessEvents();
      
      // Apply filters if provided
      if (filters) {
        if (filters.equipment && filters.equipment !== 'all') {
          events = events.filter(e => e.orgResource === filters.equipment);
        }
        if (filters.caseIds && Array.isArray(filters.caseIds) && filters.caseIds.length > 0) {
          events = events.filter(e => filters.caseIds.includes(e.caseId));
        }
      }

      // Group events by activity
      const activityGroups: Record<string, {
        total: number;
        failures: number;
        equipment: Set<string>;
        cases: Set<string>;
      }> = {};

      events.forEach(event => {
        const key = event.activity;
        
        if (!activityGroups[key]) {
          activityGroups[key] = {
            total: 0,
            failures: 0,
            equipment: new Set(),
            cases: new Set()
          };
        }
        
        activityGroups[key].total++;
        if (event.lifecycleState === 'failure') {
          activityGroups[key].failures++;
        }
        if (event.orgResource) {
          activityGroups[key].equipment.add(event.orgResource);
        }
        activityGroups[key].cases.add(event.caseId);
      });

      // Calculate failure rates and sort by failure rate
      const activityFailureRates = Object.entries(activityGroups)
        .map(([activity, data]) => ({
          activity,
          totalExecutions: data.total,
          totalFailures: data.failures,
          failureRate: data.total > 0 ? (data.failures / data.total) * 100 : 0,
          affectedEquipment: Array.from(data.equipment),
          affectedCases: Array.from(data.cases)
        }))
        .filter(item => item.totalFailures > 0) // Only include activities that have failures
        .sort((a, b) => b.failureRate - a.failureRate);

      return activityFailureRates;
    } catch (error) {
      console.error('Error analyzing activity failure rates:', error);
      return [];
    }
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

Query classification: ${queryType}

IMPORTANT: You must respond with valid JSON in this exact format:
{
  "response": "Your detailed analysis with structured sections including Executive Summary, Key Performance Metrics, Critical Issues, Data Quality Assessment, Visual Analysis, and Recommendations",
  "suggestedActions": ["action1", "action2", "action3"],
  "visualizationHint": "suggestion for relevant charts or visualizations"
}

Make your response comprehensive and well-structured with clear sections. Always include specific numbers and insights from the provided data.`;

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
      const bottleneckCount = Array.isArray(relevantData.detailedBottlenecks) ? relevantData.detailedBottlenecks.length : 0;
      contextualPrompt += `

BOTTLENECK ANALYSIS:
- Identified bottlenecks: ${bottleneckCount}
- Analysis includes processing time and wait time evaluation
- Resource utilization patterns analyzed`;
    }

    // Add data scope transparency
    const dataScope = relevantData?.summary?.dataScope || 'unknown';
    const totalActivities = relevantData?.summary?.totalActivities || 0;
    const totalCases = relevantData?.summary?.totalCases || 0;
    const appliedFilters = relevantData?.summary?.appliedFilters;
    
    // Add activity failure rate analysis context
    if (queryType === 'activity_failure_rate_analysis' && relevantData.activityFailureRates) {
      contextualPrompt += `

ACTIVITY FAILURE RATE ANALYSIS:
- Analysis type: Which activities have the highest failure rates
- Activities with failures: ${relevantData.activityFailureRates.length}

TOP FAILING ACTIVITIES (by failure rate):
${relevantData.activityFailureRates.slice(0, 10).map((item: any, i: number) => 
  `${i + 1}. ${item.activity}: ${item.failureRate.toFixed(2)}% failure rate (${item.totalFailures}/${item.totalExecutions} executions)`
).join('\n') || 'No activity failure rates found'}

CRITICAL: This analyzes WHICH ACTIVITIES fail most often, not what causes failures. 
Focus on activity names and their failure statistics, not root causes.`;
    }

    // Add failure cause analysis context
    if (queryType === 'failure_cause_analysis' && relevantData.failureCauses) {
      contextualPrompt += `

FAILURE ROOT CAUSE ANALYSIS:
- Total failures analyzed: ${relevantData.totalFailures}
- Analysis type: ROOT CAUSES from failure descriptions (NOT which activities fail)

TECHNICAL ROOT CAUSES:
${relevantData.failureCauses?.map((cause: any, i: number) => 
  `${i + 1}. ${cause.cause}: ${cause.count} failures (${cause.percentage}%)`
).join('\n') || 'No root cause patterns found'}

CRITICAL: This analyzes WHAT CAUSES failures (sensor issues, inventory problems), NOT which activities fail most. 
Focus on technical root causes from unsatisfied_condition_description field.

Example response: "The most common failure cause is sensor failures accounting for 40% of all failures (38 cases)..."`;
    }

    if (queryType === 'case_failure_analysis' && relevantData.actualFailures) {
      contextualPrompt += `

CASE-LEVEL FAILURE ANALYSIS:
- Cases with failures: ${relevantData.actualFailures.totalFailures}
- Case failure rate: ${relevantData.actualFailures.failureRate?.toFixed(2)}%
- Analysis level: CASE-LEVEL (each case counted once)

CASE FAILURE PATTERNS:
${relevantData.actualFailures.commonPatterns?.map((p: any, i: number) => 
  `${i + 1}. ${p.description}: affects ${p.affectedCases?.length || 0} cases`
).join('\n') || 'No case patterns found'}

CRITICAL: This analyzes failure patterns at the CASE level, not activity level.`;
    }

    contextualPrompt += `

DATA ANALYSIS SCOPE:
- Dataset: ${dataScope} (${totalActivities} activities, ${totalCases} cases)
${appliedFilters ? `- Applied filters: ${JSON.stringify(appliedFilters, null, 2)}` : '- No filters applied (full dataset)'}

IMPORTANT DISTINCTIONS:
- ACTIVITY FAILURE RATE: Which activities have highest failure percentages (hbw/unload: 15% failure rate)
- ACTIVITY FAILURE CAUSES: What technical issues cause activities to fail (sensor failures, inventory issues)
- CASE-LEVEL: Counts cases that experience failures (pattern analysis)

REQUIRED RESPONSE FORMAT:
Structure your analysis using these exact markdown sections:

## Executive Summary
Brief overview of key findings from the ${dataScope} dataset analysis

## Key Performance Metrics
• Total activities analyzed: ${totalActivities}
• Total cases analyzed: ${totalCases}
• [Include actual calculated metrics from the data]

## Critical Issues Identified
• [List specific issues with case IDs and equipment details]

## Data Quality Assessment
• Data completeness: [assessment based on actual data]
• Analysis confidence: [high/medium/low with reasoning]
• Scope limitations: [any constraints from filtering]

## Visual Analysis
• [Key patterns observed in the filtered/full dataset]

## Recommendations
• [Specific actionable steps with priorities]

Instructions:
1. Use the advanced analysis results from the ${dataScope} dataset
2. Reference specific case IDs, equipment, and calculated metrics
3. Show transparency about what data subset was analyzed
4. Format response as JSON with:
   - response: Your structured analysis (string with markdown)
   - suggestedActions: Array of recommended actions (array of strings)
   - visualizationHint: Suggest relevant charts (string)

Manufacturing context:
- HBW = High Bay Warehouse, VGR = Robot, OV = Oven, MM = Mill, SM = Sort
- Activities: scheduled → start → complete lifecycle

Be precise, data-driven, and transparent about analysis scope.`;
    
    return contextualPrompt;
  }

  private static buildUserPrompt(query: string, contextData?: any): string {
    const queryLower = query.toLowerCase();
    
    // Build context-aware prompts based on question type
    let specificGuidance = '';
    if (queryLower.includes('failure') || queryLower.includes('error') || queryLower.includes('problem')) {
      specificGuidance = 'Focus on failure analysis, root cause identification, and preventive measures.';
    } else if (queryLower.includes('performance') || queryLower.includes('efficiency')) {
      specificGuidance = 'Emphasize performance metrics, efficiency ratios, and optimization opportunities.';
    } else if (queryLower.includes('bottleneck') || queryLower.includes('slow') || queryLower.includes('delay')) {
      specificGuidance = 'Identify bottlenecks, queue times, and throughput constraints.';
    } else if (queryLower.includes('equipment') || queryLower.includes('machine') || queryLower.includes('station')) {
      specificGuidance = 'Focus on equipment utilization, maintenance patterns, and resource allocation.';
    } else if (queryLower.includes('trend') || queryLower.includes('pattern') || queryLower.includes('over time')) {
      specificGuidance = 'Analyze temporal patterns, trends, and cyclical behaviors.';
    } else if (queryLower.includes('compare') || queryLower.includes('difference')) {
      specificGuidance = 'Provide comparative analysis with specific differences and similarities.';
    } else if (queryLower.includes('most') || queryLower.includes('common') || queryLower.includes('frequent')) {
      specificGuidance = 'Identify the most frequent patterns, common issues, or typical behaviors in the data.';
    } else if (queryLower.includes('what') || queryLower.includes('how') || queryLower.includes('why')) {
      specificGuidance = 'Provide explanatory analysis with clear reasoning and data support.';
    } else {
      specificGuidance = 'Provide comprehensive analysis covering all relevant aspects of the manufacturing process.';
    }

    let prompt = `Analyze this manufacturing process query: "${query}"

${specificGuidance}

Use the provided data context to give specific, data-driven insights with actual numbers and case references.`;
    
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

  /**
   * Generate structured data for automatic visualization creation
   */
  static async generateStructuredData(analysisType: string, relevantData: any, query: string): Promise<any> {
    try {
      console.log(`Generating structured data for analysis type: ${analysisType}`);
      
      if (analysisType === 'failure_cause_analysis') {
        // Get actual failure cause data from Enhanced Failure Analyzer
        const { EnhancedFailureAnalyzer } = await import('./failure-analyzer-enhanced');
        const failureCauses = await EnhancedFailureAnalyzer.analyzeFailureCauses();
        
        return {
          analysis_type: "failure_analysis",
          failure_categories: failureCauses.map(cause => ({
            cause: cause.category,
            count: cause.count,
            percentage: cause.percentage,
            examples: cause.examples.slice(0, 3)
          }))
        };
      }
      
      if (analysisType === 'activity_failure_rate_analysis') {
        // Get actual activity failure rates
        const { EnhancedFailureAnalyzer } = await import('./failure-analyzer-enhanced');
        const activityRates = await EnhancedFailureAnalyzer.analyzeActivityFailureRates();
        
        return {
          analysis_type: "activity_failure_analysis", 
          activities_with_most_failures: activityRates.map(rate => ({
            activity: rate.activity,
            failure_rate: rate.failureRate,
            failed_count: rate.failedCount,
            total_count: rate.totalCount,
            failure_percentage: parseFloat(rate.failureRate.replace('%', ''))
          }))
        };
      }
      
      if (analysisType === 'temporal_pattern_analysis' || (query.includes('hour') && query.includes('failure'))) {
        // Get temporal failure data from relevant data
        const { TrendAnalyzer } = await import('./trend-analyzer');
        const temporalData = await TrendAnalyzer.analyzeTemporalPatterns(relevantData);
        
        return {
          analysis_type: "temporal_analysis",
          temporal_analysis: {
            hour_failure_distribution: temporalData.hourly_failures || []
          }
        };
      }
      
      if (analysisType === 'anomaly_analysis' || (query.includes('hour') && query.includes('anomal'))) {
        // Get temporal anomaly data
        const { TrendAnalyzer } = await import('./trend-analyzer');
        const temporalData = await TrendAnalyzer.analyzeTemporalPatterns(relevantData);
        
        return {
          analysis_type: "anomaly_detection", 
          activities_with_most_anomalies: temporalData.hourly_anomalies || []
        };
      }
      
      if (analysisType === 'bottleneck_analysis') {
        // Get bottleneck data
        const { storage } = await import('../storage');
        const bottleneckData = await storage.getBottleneckAnalysis();
        
        return {
          analysis_type: "bottleneck_analysis",
          bottleneck_activities: bottleneckData.bottlenecks || []
        };
      }
      
      // Default: return null for non-visual analysis types
      return null;
      
    } catch (error) {
      console.error('Error generating structured data:', error);
      return null;
    }
  }
}
