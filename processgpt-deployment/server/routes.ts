import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { db } from "./db";
import { processActivities, processEvents, processCases } from "@shared/schema";
import { XESParser } from "./services/xes-parser";
import { AnomalyDetector } from "./services/anomaly-detector";
import { AIAnalyst } from "./services/ai-analyst";
import { SemanticSearch } from "./services/semantic-search";
import { AIServiceFactory } from "./services/ai-service-factory";
import { AndroidEmulatorAIService } from "./services/android-emulator-ai-service";
import { z } from "zod";
import { sql } from "drizzle-orm";
import * as path from 'path';

// Validation schemas
const dashboardFiltersSchema = z.object({
  datasetSize: z.enum(['full', 'last_1000', 'last_500', 'custom']).optional(),
  timeRange: z.object({
    start: z.string().optional(),
    end: z.string().optional()
  }).optional(),
  equipment: z.string().optional(),
  status: z.enum(['all', 'success', 'failed', 'inProgress']).optional(),
  limit: z.number().min(1).max(10000).optional()
});

const aiQuerySchema = z.object({
  query: z.string().min(1).max(1000),
  sessionId: z.string().min(1),
  contextData: z.any().optional(),
  filters: z.any().optional()
});

const caseComparisonSchema = z.object({
  caseAId: z.string().min(1),
  caseBId: z.string().min(1)
});

const semanticSearchSchema = z.object({
  query: z.string().min(1).max(500),
  limit: z.number().min(1).max(50).optional(),
  equipment: z.string().optional(),
  caseId: z.string().optional()
});

export async function registerRoutes(app: Express): Promise<Server> {
  // Initialize data import on startup
  let dataImported = false;

  // Data Import and Management Routes
  app.post("/api/import-sample-data", async (req, res) => {
    try {
      console.log('Clearing existing data and importing your sample_data.csv...');
      
      // Clear existing data to avoid duplicates
      await db.delete(processActivities);
      await db.delete(processEvents);  
      await db.delete(processCases);
      console.log('Existing data cleared');
      
      const sampleDataPath = path.join(process.cwd(), 'attached_assets', 'sample_data_1750608906974.csv');
      const { events, activities, cases } = await XESParser.parseXESFromCSV(sampleDataPath);
      
      console.log(`Parsed ${events.length} events, ${activities.length} activities, ${cases.length} cases from your manufacturing data`);

      // Bulk insert all data in correct order
      if (cases.length > 0) {
        await storage.bulkInsertProcessCases(cases);
        console.log(`✓ Inserted ${cases.length} process cases`);
      }
      
      if (events.length > 0) {
        await storage.bulkInsertProcessEvents(events);
        console.log(`✓ Inserted ${events.length} process events`);
      }
      
      if (activities.length > 0) {
        await storage.bulkInsertProcessActivities(activities);
        console.log(`✓ Inserted ${activities.length} process activities`);
      }

      dataImported = true;
      console.log('✓ Your manufacturing data import completed successfully');
      
      res.json({ 
        success: true, 
        message: `Successfully imported your manufacturing data: ${cases.length} cases, ${events.length} events, ${activities.length} activities`,
        counts: {
          events: events.length,
          activities: activities.length,
          cases: cases.length
        }
      });
    } catch (error) {
      console.error('Import error:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Failed to import your sample data',
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // Process Activities Route - supports case-specific filtering
  app.get("/api/process/activities", async (req, res) => {
    try {
      const caseId = req.query.caseId as string;
      let activities;
      
      if (caseId) {
        // Get activities for specific case
        activities = await storage.getProcessActivities(caseId);
        
        // Mark only the officially detected anomalous activities for highlighting
        activities = activities.map(activity => ({
          ...activity,
          // Only use the isAnomaly flag from our anomaly detection system
          isAnomaly: activity.isAnomaly === true
        }));
      } else {
        // Get all activities (existing behavior)
        activities = await storage.getProcessActivities();
      }
      
      res.json(activities);
    } catch (error) {
      console.error('Error fetching process activities:', error);
      res.status(500).json({ message: 'Failed to fetch process activities' });
    }
  });

  // Dashboard Data Routes
  app.get("/api/dashboard/metrics", async (req, res) => {
    try {
      const metrics = await storage.getDashboardMetrics();
      res.json(metrics);
    } catch (error) {
      console.error('Error fetching dashboard metrics:', error);
      res.status(500).json({ message: 'Failed to fetch dashboard metrics' });
    }
  });

  app.get("/api/dashboard/anomalies", async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 10;
      const anomalies = await storage.getAnomalyAlerts(limit);
      res.json(anomalies);
    } catch (error) {
      console.error('Error fetching anomalies:', error);
      res.status(500).json({ message: 'Failed to fetch anomalies' });
    }
  });

  app.get("/api/bottlenecks", async (req, res) => {
    try {
      const bottlenecks = await storage.getBottleneckAnalysis();
      res.json(bottlenecks);
    } catch (error) {
      console.error('Error fetching bottleneck analysis:', error);
      res.status(500).json({ message: 'Failed to fetch bottleneck analysis' });
    }
  });

  // Comprehensive Data Scoping API - applies to all analysis including anomaly detection
  app.post("/api/dashboard/filter", async (req, res) => {
    try {
      const filters = req.body;
      
      // Build filter criteria for data scoping
      let scopedActivities = await storage.getProcessActivities();
      
      // Primary Data Scope Layer
      if (filters.scopeType === 'dataset' && filters.datasetSize !== 'full') {
        if (filters.datasetSize === 'range') {
          // Activity range filtering
          const start = Math.max(1, filters.activityRange?.start || 1);
          const end = Math.min(scopedActivities.length, filters.activityRange?.end || 100);
          
          // Sort by timestamp to get activities in chronological order
          scopedActivities = scopedActivities
            .sort((a, b) => {
              const dateA = a.startTime || a.createdAt || new Date(0);
              const dateB = b.startTime || b.createdAt || new Date(0);
              return new Date(dateA).getTime() - new Date(dateB).getTime();
            })
            .slice(start - 1, end); // Convert to 0-based indexing
        } else {
          // Fixed size filtering
          let limit = 1000;
          if (filters.datasetSize === '500') limit = 500;
          else if (filters.datasetSize === '1000') limit = 1000;
          
          // Apply ordering (first or last activities)
          if (filters.datasetOrder === 'last') {
            scopedActivities = scopedActivities
              .sort((a, b) => {
                const dateA = a.startTime || a.createdAt || new Date(0);
                const dateB = b.startTime || b.createdAt || new Date(0);
                return new Date(dateB).getTime() - new Date(dateA).getTime();
              })
              .slice(0, limit);
          } else {
            scopedActivities = scopedActivities
              .sort((a, b) => {
                const dateA = a.startTime || a.createdAt || new Date(0);
                const dateB = b.startTime || b.createdAt || new Date(0);
                return new Date(dateA).getTime() - new Date(dateB).getTime();
              })
              .slice(0, limit);
          }
        }
      } else if (filters.scopeType === 'timerange') {
        // Time-based filtering
        if (filters.timeRange?.start || filters.timeRange?.end) {
          scopedActivities = scopedActivities.filter(activity => {
            const activityDate = activity.startTime || activity.createdAt;
            if (!activityDate) return true;
            
            const startDate = filters.timeRange.start ? new Date(filters.timeRange.start) : null;
            const endDate = filters.timeRange.end ? new Date(filters.timeRange.end) : null;
            
            if (startDate && new Date(activityDate) < startDate) return false;
            if (endDate && new Date(activityDate) > endDate) return false;
            return true;
          });
        }
      }
      
      // Secondary Filter Layer - applied to scoped data
      if (filters.equipment && filters.equipment !== 'all') {
        scopedActivities = scopedActivities.filter(activity => 
          activity.orgResource === filters.equipment
        );
      }
      
      if (filters.caseIds && filters.caseIds.length > 0) {
        scopedActivities = scopedActivities.filter(activity => 
          filters.caseIds.includes(activity.caseId)
        );
      }
      
      if (filters.status && filters.status !== 'all') {
        scopedActivities = scopedActivities.filter(activity => {
          if (filters.status === 'success') return activity.status === 'completed';
          if (filters.status === 'failed') return activity.status === 'failed';
          if (filters.status === 'inProgress') return activity.status === 'in_progress';
          return true;
        });
      }

      // Get unique case IDs from scoped activities
      const scopedCaseIds = Array.from(new Set(scopedActivities.map(a => a.caseId)));
      
      // Get events and cases for the scoped data
      const allEvents = await storage.getProcessEvents();
      const allCases = await storage.getProcessCases();
      
      const scopedEvents = allEvents.filter(event => 
        scopedCaseIds.includes(event.caseId)
      );
      const scopedCases = allCases.filter(processCase => 
        scopedCaseIds.includes(processCase.caseId)
      );

      // Run anomaly detection on scoped data only
      const AnomalyDetector = (await import('./services/anomaly-detector.js')).AnomalyDetector;
      const scopedAnomalies = [];
      
      // Detect anomalies in the scoped activities and mark them
      for (const activity of scopedActivities) {
        // Processing time anomalies
        const processingAnomaly = AnomalyDetector.analyzeProcessingTimeAnomaly(
          activity,
          scopedActivities
        );
        
        // Mark activity as anomalous and set anomaly score
        activity.isAnomaly = processingAnomaly.isAnomaly;
        activity.anomalyScore = processingAnomaly.score;
        
        if (processingAnomaly.isAnomaly) {
          scopedAnomalies.push({
            id: `${activity.id}_processing`,
            type: 'processing_time',
            title: 'Processing Time Anomaly',
            description: `Unusual processing time detected for ${activity.activity}`,
            details: processingAnomaly.reason,
            timestamp: new Date(activity.startTime || activity.createdAt || new Date()),
            severity: processingAnomaly.score > 0.8 ? 'high' : 'medium',
            caseId: activity.caseId,
            equipment: activity.orgResource
          });
        }
      }
      
      // Calculate bottlenecks for scoped data
      const processingTimeBottlenecks = [];
      const waitTimeBottlenecks = [];
      
      // Group activities by station to calculate bottlenecks
      const stationGroups = scopedActivities.reduce((groups, activity) => {
        const station = activity.orgResource || 'Unknown';
        if (!groups[station]) {
          groups[station] = [];
        }
        groups[station].push(activity);
        return groups;
      }, {} as Record<string, typeof scopedActivities>);
      
      // Calculate processing time bottlenecks
      for (const [station, activities] of Object.entries(stationGroups)) {
        const avgProcessingTime = activities.reduce((sum, a) => sum + (a.actualDurationS || 0), 0) / activities.length;
        if (avgProcessingTime > 120) { // Threshold for bottleneck detection
          processingTimeBottlenecks.push({
            station,
            avgProcessingTime,
            impact: avgProcessingTime > 300 ? 'high' : avgProcessingTime > 120 ? 'medium' : 'low'
          });
        }
      }
      
      // Calculate wait time bottlenecks (simplified - using planned vs actual time difference)
      for (const [station, activities] of Object.entries(stationGroups)) {
        const avgWaitTime = activities.reduce((sum, a) => {
          const planned = a.plannedDurationS || 0;
          const actual = a.actualDurationS || 0;
          return sum + Math.max(0, actual - planned);
        }, 0) / activities.length;
        
        if (avgWaitTime > 60) { // Threshold for wait time bottleneck
          waitTimeBottlenecks.push({
            station,
            avgWaitTime,
            impact: avgWaitTime > 180 ? 'high' : avgWaitTime > 60 ? 'medium' : 'low'
          });
        }
      }
      
      const totalBottlenecks = processingTimeBottlenecks.length + waitTimeBottlenecks.length;

      // Calculate metrics for scoped data
      const scopedMetrics = {
        avgProcessingTime: scopedActivities.length > 0 
          ? scopedActivities.reduce((sum, a) => sum + (a.actualDurationS || 0), 0) / scopedActivities.length 
          : 0,
        anomaliesDetected: scopedAnomalies.length,
        bottlenecksFound: totalBottlenecks,
        successRate: scopedActivities.length > 0 
          ? (scopedActivities.filter(a => a.status === 'success').length / scopedActivities.length) * 100 
          : 0,
        activeCases: scopedCases.filter(c => c.status === 'inProgress').length,
        completedCases: scopedCases.filter(c => c.status === 'success').length,
        failedCases: scopedCases.filter(c => c.status === 'failed').length
      };
      
      res.json({
        events: scopedEvents,
        activities: scopedActivities,
        cases: scopedCases,
        anomalies: scopedAnomalies,
        metrics: scopedMetrics,
        totalCount: scopedActivities.length,
        scopeInfo: {
          originalCount: (await storage.getProcessActivities()).length,
          scopedCount: scopedActivities.length,
          filterType: filters.scopeType,
          appliedFilters: filters
        }
      });
    } catch (error) {
      console.error('Error filtering dashboard data:', error);
      res.status(500).json({ message: 'Failed to filter dashboard data' });
    }
  });

  // Process Analysis Routes
  app.get("/api/process/cases", async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 50;
      const status = req.query.status as string;
      
      const cases = await storage.getProcessCases({ 
        status: status !== 'all' ? status : undefined,
        limit 
      });
      res.json(cases);
    } catch (error) {
      console.error('Error fetching process cases:', error);
      res.status(500).json({ message: 'Failed to fetch process cases' });
    }
  });

  app.get("/api/process/case/:caseId", async (req, res) => {
    try {
      const { caseId } = req.params;
      const processCase = await storage.getProcessCase(caseId);
      
      if (!processCase) {
        return res.status(404).json({ message: 'Case not found' });
      }
      
      const activities = await storage.getProcessActivities(caseId);
      const events = await storage.getProcessEvents({ caseId });
      
      res.json({
        case: processCase,
        activities,
        events
      });
    } catch (error) {
      console.error('Error fetching process case:', error);
      res.status(500).json({ message: 'Failed to fetch process case' });
    }
  });

  app.post("/api/process/compare", async (req, res) => {
    try {
      const { caseAId, caseBId } = caseComparisonSchema.parse(req.body);
      const comparison = await storage.getCaseComparison(caseAId, caseBId);
      
      if (!comparison) {
        return res.status(404).json({ message: 'One or both cases not found' });
      }
      
      res.json(comparison);
    } catch (error) {
      console.error('Error comparing cases:', error);
      res.status(500).json({ message: 'Failed to compare cases' });
    }
  });

  // AI Analysis Routes
  app.post("/api/ai/analyze", async (req, res) => {
    try {
      const request = aiQuerySchema.parse(req.body);
      // Use AI service factory to choose between all available AI services
      const { AIServiceFactory } = await import('./services/ai-service-factory');
      const response = await AIServiceFactory.analyzeQuery(request);
      res.json(response);
    } catch (error) {
      console.error('Error in AI analysis:', error);
      res.status(500).json({ 
        message: 'Failed to process AI analysis',
        response: 'I apologize, but I encountered an error while processing your request. Please try again.',
        queryType: 'error'
      });
    }
  });

  // Switch to Phi-2 MediaPipe
  app.post('/api/ai/switch-to-phi2-mediapipe', async (req, res) => {
    try {
      const { AIServiceFactory } = await import('./services/ai-service-factory');
      AIServiceFactory.switchToPhi2MediaPipe();
      res.json({ success: true, message: 'Switched to Phi-2 MediaPipe AI Edge', service: 'phi2-mediapipe' });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // Intelligent Analysis Route - More versatile AI approach
  app.post("/api/ai/intelligent-analyze", async (req, res) => {
    try {
      const { query, sessionId, filters } = req.body;
      
      if (!query || query.trim().length === 0) {
        return res.status(400).json({ 
          error: 'Query is required' 
        });
      }

      const { IntelligentAnalyst } = await import('./services/intelligent-analyst.js');
      const result = await IntelligentAnalyst.intelligentAnalysis(query, filters);
      
      // Store conversation in database
      await storage.createAiConversation({
        sessionId: sessionId || 'default',
        query,
        response: result.analysisResults.response || 'Analysis completed',
        queryType: 'intelligent_analysis',
        contextData: {
          selectedCapabilities: result.selectedCapabilities,
          reasoning: result.reasoning,
          methodsUsed: result.analysisResults.methodsUsed
        }
      });

      res.json({
        response: result.analysisResults.response,
        queryType: 'intelligent_analysis',
        selectedCapabilities: result.selectedCapabilities,
        reasoning: result.reasoning,
        keyFindings: result.analysisResults.keyFindings,
        suggestedActions: result.analysisResults.suggestedActions,
        methodsUsed: result.analysisResults.methodsUsed,
        dataTransparency: result.analysisResults.dataTransparency
      });

    } catch (error) {
      console.error('Error in intelligent analysis:', error);
      res.status(500).json({ 
        message: 'Failed to process intelligent analysis',
        response: 'I apologize, but I encountered an error. Please try rephrasing your question.',
        queryType: 'error'
      });
    }
  });

  // Failure Analysis Route - Actual data analysis
  app.post("/api/ai/failure-analysis", async (req, res) => {
    try {
      const { query, sessionId, filters } = req.body;
      
      const { FailureAnalyzer } = await import('./services/failure-analyzer.js');
      
      // Detect if this is a failure-related query
      const queryLower = query.toLowerCase();
      const isFailureQuery = queryLower.includes('failure') || queryLower.includes('fail') || 
                            queryLower.includes('cause') || queryLower.includes('problem') ||
                            queryLower.includes('issue') || queryLower.includes('error');
      
      if (!isFailureQuery) {
        return res.status(400).json({ 
          error: 'This endpoint is for failure analysis queries only' 
        });
      }

      // Get actual failure analysis from real data
      const failureSummary = await FailureAnalyzer.getFailureSummary(filters);
      const failureData = await FailureAnalyzer.analyzeFailureCauses(filters);
      
      // Store conversation in database
      await storage.createAiConversation({
        sessionId: sessionId || 'default',
        query,
        response: failureSummary,
        queryType: 'failure_analysis',
        contextData: {
          totalFailures: failureData.totalFailures,
          failureRate: failureData.failureRate,
          topPatterns: failureData.commonPatterns.slice(0, 3).map(p => p.description)
        }
      });

      res.json({
        response: failureSummary,
        queryType: 'failure_analysis',
        data: failureData,
        methodsUsed: ['actual_failure_data_analysis', 'unsatisfied_condition_description_parsing'],
        dataTransparency: `Analyzed ${failureData.totalFailures} actual failure records from ${failureData.totalActivities} activities`
      });

    } catch (error) {
      console.error('Error in failure analysis:', error);
      res.status(500).json({ 
        message: 'Failed to process failure analysis',
        response: 'I apologize, but I encountered an error analyzing failure data.',
        queryType: 'error'
      });
    }
  });

  app.get("/api/ai/conversations/:sessionId", async (req, res) => {
    try {
      const { sessionId } = req.params;
      const limit = parseInt(req.query.limit as string) || 20;
      
      const conversations = await storage.getAiConversations(sessionId, limit);
      res.json(conversations);
    } catch (error) {
      console.error('Error fetching AI conversations:', error);
      res.status(500).json({ message: 'Failed to fetch conversations' });
    }
  });

  app.post("/api/ai/compare-cases", async (req, res) => {
    try {
      const { caseAId, caseBId } = caseComparisonSchema.parse(req.body);
      const report = await AIAnalyst.generateCaseComparisonReport(caseAId, caseBId);
      res.json({ report });
    } catch (error) {
      console.error('Error generating comparison report:', error);
      res.status(500).json({ message: 'Failed to generate comparison report' });
    }
  });

  // Gemma-2B-IT MediaPipe Local AI Routes
  app.post("/api/ai/switch-to-gemma-mediapipe", async (req, res) => {
    try {
      AIServiceFactory.enableGemmaMediaPipe();
      
      res.json({
        status: 'success',
        message: 'Switched to Gemma-2B-IT Local AI',
        service: 'Gemma-2B-IT MediaPipe (Local)',
        modelInfo: 'Gemma-2B-IT (Google) - Local MediaPipe Integration'
      });
    } catch (error: any) {
      res.status(500).json({
        status: 'error',
        error: error.message
      });
    }
  });

  // Test Gemma-2B-IT MediaPipe connection
  app.get("/api/ai/test-gemma-mediapipe", async (req, res) => {
    try {
      const isConnected = await AIServiceFactory.testGemmaMediaPipeConnection();
      
      res.json({
        connected: isConnected,
        service: 'gemma-mediapipe',
        model: 'Gemma-2B-IT (Google) - Local MediaPipe Integration'
      });
    } catch (error: any) {
      res.status(500).json({
        connected: false,
        error: error.message
      });
    }
  });

  // Android Emulator AI Routes
  app.post("/api/ai/switch-to-android-emulator", async (req, res) => {
    try {
      const { host, model } = req.body;
      AIServiceFactory.enableAndroidEmulatorAI(host, model);
      
      const connectionTest = await AndroidEmulatorAIService.testConnection();
      
      res.json({
        status: 'success',
        message: 'Switched to Android Emulator AI',
        service: 'Android Emulator AI (Google AI Edge)',
        modelInfo: connectionTest?.modelInfo,
        connectionTest
      });
    } catch (error: any) {
      res.status(500).json({
        status: 'error',
        error: error.message
      });
    }
  });

  app.get("/api/ai/status", async (req, res) => {
    try {
      const status = AIServiceFactory.getStatus();
      
      // Test Android Emulator connection if it's the active service
      let connectionTest = null;
      if (status.currentService?.includes('Android Emulator')) {
        connectionTest = await AndroidEmulatorAIService.testConnection();
      }
      
      res.json({
        ...status,
        connectionTest
      });
    } catch (error: any) {
      res.status(500).json({
        status: 'error',
        error: error.message
      });
    }
  });

  // Semantic Search Routes
  app.post("/api/search/semantic", async (req, res) => {
    try {
      const { query, limit, equipment, caseId } = semanticSearchSchema.parse(req.body);
      
      const context: any = {};
      if (equipment) context.equipment = equipment;
      if (caseId) context.caseId = caseId;
      
      const { results, contextualInsights } = await SemanticSearch.searchWithContext(
        query, 
        context, 
        limit || 10
      );
      
      res.json({
        results,
        contextualInsights,
        totalResults: results.length
      });
    } catch (error) {
      console.error('Error in semantic search:', error);
      res.status(500).json({ message: 'Failed to perform semantic search' });
    }
  });

  // Anomaly Detection Routes
  app.get("/api/anomalies/detect", async (req, res) => {
    try {
      const activities = await storage.getProcessActivities();
      
      if (activities.length < 100) {
        return res.json({
          bottlenecks: [],
          temporalPatterns: {
            hourlyFailureDistribution: {},
            dailyAnomalyCount: {},
            equipmentFailureFrequency: {}
          },
          message: 'Insufficient data for comprehensive anomaly detection'
        });
      }

      const bottlenecks = AnomalyDetector.identifyBottlenecks(activities);
      const temporalPatterns = AnomalyDetector.analyzeTemporalPatterns(activities);
      
      res.json({
        bottlenecks,
        temporalPatterns: {
          hourlyFailureDistribution: Object.fromEntries(temporalPatterns.hourlyFailureDistribution),
          dailyAnomalyCount: Object.fromEntries(temporalPatterns.dailyAnomalyCount),
          equipmentFailureFrequency: Object.fromEntries(temporalPatterns.equipmentFailureFrequency)
        }
      });
    } catch (error) {
      console.error('Error detecting anomalies:', error);
      res.status(500).json({ message: 'Failed to detect anomalies' });
    }
  });

  // Case Clustering Analysis Route
  app.get("/api/case-clustering", async (req, res) => {
    try {
      const { 
        mode = 'dataset', 
        maxClusters = 10, 
        start = 0, 
        n = 100,
        startTime,
        endTime 
      } = req.query;

      const clusters = await storage.getCaseClusterAnalysis({
        mode: mode as string,
        maxClusters: parseInt(maxClusters as string),
        start: parseInt(start as string),
        n: parseInt(n as string),
        startTime: startTime as string,
        endTime: endTime as string
      });

      res.json(clusters);
    } catch (error) {
      console.error("Case clustering error:", error);
      res.status(500).json({ error: "Failed to perform case clustering analysis" });
    }
  });

  // Health Check Route
  app.get("/api/health", async (req, res) => {
    try {
      const metrics = await storage.getDashboardMetrics();
      res.json({
        status: 'healthy',
        dataImported,
        metrics,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      res.status(500).json({
        status: 'unhealthy',
        error: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString()
      });
    }
  });

  // Force data refresh endpoint  
  app.post('/api/data/refresh', async (req, res) => {
    try {
      console.log('Clearing existing data and importing your sample_data.csv...');
      
      // Clear existing data
      await db.execute(sql`DELETE FROM process_activities`);
      await db.execute(sql`DELETE FROM process_events`); 
      await db.execute(sql`DELETE FROM process_cases`);
      console.log('Existing data cleared');
      
      // Re-import with improved anomaly detection
      const sampleDataPath = path.join(process.cwd(), 'attached_assets', 'sample_data_1750608906974.csv');
      const { events, activities, cases } = await XESParser.parseXESFromCSV(sampleDataPath);
      
      await storage.bulkInsertProcessCases(cases);
      await storage.bulkInsertProcessEvents(events);
      await storage.bulkInsertProcessActivities(activities);
      
      dataImported = true;
      console.log(`✓ Inserted ${cases.length} process cases`);
      console.log(`✓ Inserted ${events.length} process events`);
      console.log(`✓ Inserted ${activities.length} process activities`);
      console.log('✓ Your manufacturing data import completed successfully');
      
      res.json({ success: true, message: 'Data refreshed successfully' });
    } catch (error) {
      console.error('Data refresh failed:', error);
      res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
    }
  });

  // Auto-import sample data on startup if not already imported
  setTimeout(async () => {
    if (!dataImported) {
      try {
        console.log('Clearing existing data and importing your sample_data.csv...');
        
        // Clear existing data
        await db.execute(sql`DELETE FROM process_activities`);
        await db.execute(sql`DELETE FROM process_events`); 
        await db.execute(sql`DELETE FROM process_cases`);
        console.log('Existing data cleared');
        
        // Re-import with improved anomaly detection
        const sampleDataPath = path.join(process.cwd(), 'attached_assets', 'sample_data_1750608906974.csv');
        const { events, activities, cases } = await XESParser.parseXESFromCSV(sampleDataPath);
        
        await storage.bulkInsertProcessCases(cases);
        await storage.bulkInsertProcessEvents(events);
        await storage.bulkInsertProcessActivities(activities);
        
        dataImported = true;
        console.log(`✓ Inserted ${cases.length} process cases`);
        console.log(`✓ Inserted ${events.length} process events`);
        console.log(`✓ Inserted ${activities.length} process activities`);
        console.log('✓ Your manufacturing data import completed successfully');
      } catch (error) {
        console.error('Auto-import failed:', error);
      }
    }
  }, 2000);

  const httpServer = createServer(app);
  // AI Service Control Routes
  // Google AI Edge connection (uses your local edge model)
  app.post("/api/ai/switch-to-google-ai-edge", async (req, res) => {
    try {
      const { modelPath, host, port } = req.body;
      const edgeModelPath = modelPath || './models/gemma-2b-it';
      const edgeHost = host || 'http://localhost';
      const edgePort = port || 8080;
      
      const { AIServiceFactory } = await import('./services/ai-service-factory');
      const { GoogleAIEdgeService } = await import('./services/google-ai-edge-service');
      
      // Configure and test connection to your local edge model
      GoogleAIEdgeService.configure(edgeModelPath, edgeHost, edgePort);
      const connectionTest = await GoogleAIEdgeService.testConnection();
      
      AIServiceFactory.enableGoogleAIEdge(edgeModelPath, edgeHost, edgePort);
      
      // Set environment variables
      process.env.USE_GOOGLE_AI_EDGE = 'true';
      process.env.USE_EMULATOR_BRIDGE = 'false';
      process.env.USE_MEDIAPIPE_AI = 'false';
      process.env.USE_ANDROID_DIRECT_AI = 'false';
      process.env.USE_ANDROID_EMULATOR_AI = 'false';
      process.env.USE_TRUE_LOCAL_AI = 'false';
      process.env.USE_GEMINI = 'false';
      process.env.USE_LOCAL_AI = 'false';
      
      res.json({
        status: "success",
        message: "Switched to Google AI Edge",
        service: "Google AI Edge (Local Edge Model)",
        connectionTest,
        modelInfo: connectionTest.modelInfo,
        currentModel: edgeModelPath.split('/').pop() || 'gemma-2b-it',
        note: "Using your local Google AI Edge model for complete privacy"
      });
    } catch (error: any) {
      console.error('Google AI Edge switch error:', error);
      res.status(500).json({
        status: "error",
        message: error.message || "Failed to switch to Google AI Edge"
      });
    }
  });

  // Emulator Bridge AI connection (uses your actual AI Edge Gallery model)
  app.post("/api/ai/switch-to-emulator-bridge", async (req, res) => {
    try {
      const { host, port, model } = req.body;
      const emulatorHost = host || 'http://10.0.2.2';
      const emulatorPort = port || 8080;
      const emulatorModel = model || 'qwen2.5-1.5b-instruct';
      
      const { AIServiceFactory } = await import('./services/ai-service-factory');
      const { EmulatorBridgeService } = await import('./services/emulator-bridge-service');
      
      // Configure and test connection to your actual emulator model
      EmulatorBridgeService.configure(emulatorHost, emulatorPort, emulatorModel);
      const connectionTest = await EmulatorBridgeService.testConnection();
      
      AIServiceFactory.enableEmulatorBridge(emulatorHost, emulatorPort, emulatorModel);
      
      // Set environment variables
      process.env.USE_EMULATOR_BRIDGE = 'true';
      process.env.USE_MEDIAPIPE_AI = 'false';
      process.env.USE_ANDROID_DIRECT_AI = 'false';
      process.env.USE_ANDROID_EMULATOR_AI = 'false';
      process.env.USE_TRUE_LOCAL_AI = 'false';
      process.env.USE_GEMINI = 'false';
      process.env.USE_LOCAL_AI = 'false';
      
      res.json({
        status: "success",
        message: "Switched to Emulator Bridge",
        service: "Emulator Bridge (Your AI Edge Gallery Qwen Model)",
        connectionTest,
        modelInfo: connectionTest.modelInfo,
        currentModel: emulatorModel,
        note: "Attempting to use your actual Qwen model from AI Edge Gallery"
      });
    } catch (error: any) {
      console.error('Emulator Bridge switch error:', error);
      res.status(500).json({
        status: "error",
        message: error.message || "Failed to switch to Emulator Bridge"
      });
    }
  });

  // MediaPipe AI connection
  app.post("/api/ai/switch-to-mediapipe", async (req, res) => {
    try {
      const { host, model } = req.body;
      const mediapipeHost = host || 'http://localhost:8080';
      const mediapipeModel = model || 'qwen2.5-1.5b-instruct';
      
      const { AIServiceFactory } = await import('./services/ai-service-factory');
      const { MediaPipeAIService } = await import('./services/mediapipe-ai-service');
      
      // Configure and test connection
      MediaPipeAIService.configure(mediapipeHost, mediapipeModel);
      const connectionTest = await MediaPipeAIService.testConnection();
      
      if (!connectionTest.success) {
        return res.status(400).json({ 
          message: "Cannot connect to MediaPipe LLM Inference API", 
          error: connectionTest.error,
          suggestion: "Make sure MediaPipe LLM server is running on port 8080 with your Qwen model"
        });
      }
      
      AIServiceFactory.enableMediaPipeAI(mediapipeHost, mediapipeModel);
      
      // Set environment variables
      process.env.USE_MEDIAPIPE_AI = 'true';
      process.env.USE_ANDROID_DIRECT_AI = 'false';
      process.env.USE_ANDROID_EMULATOR_AI = 'false';
      process.env.USE_TRUE_LOCAL_AI = 'false';
      process.env.USE_GEMINI = 'false';
      process.env.USE_LOCAL_AI = 'false';
      
      res.json({
        status: "success",
        message: "Switched to MediaPipe LLM Inference",
        service: "MediaPipe AI (Local Qwen)",
        connectionTest,
        modelInfo: connectionTest.modelInfo,
        currentModel: mediapipeModel
      });
    } catch (error: any) {
      console.error('MediaPipe AI switch error:', error);
      res.status(500).json({
        status: "error",
        message: error.message || "Failed to switch to MediaPipe AI"
      });
    }
  });

  // Android Direct AI connection
  app.post("/api/ai/switch-to-android-direct", async (req, res) => {
    try {
      const { AndroidDirectAIService } = await import('./services/android-direct-ai-service');
      
      // Test connection to Android Direct AI
      const connectionTest = await AndroidDirectAIService.testConnection();
      
      // Set environment variable to indicate Android Direct AI usage
      process.env.USE_ANDROID_DIRECT_AI = 'true';
      process.env.USE_ANDROID_EMULATOR_AI = 'false';
      process.env.USE_TRUE_LOCAL_AI = 'false';
      process.env.USE_GEMINI = 'false';
      process.env.USE_LOCAL_AI = 'false';
      
      res.json({
        status: "success",
        message: "Switched to Android Direct AI",
        service: "Android Direct AI (AI Edge Gallery)",
        connectionTest
      });
    } catch (error: any) {
      console.error('Android Direct AI switch error:', error);
      res.status(500).json({
        status: "error",
        message: error.message || "Failed to switch to Android Direct AI"
      });
    }
  });

  // AI service switching endpoints
  app.post("/api/ai/switch-to-android-emulator", async (req, res) => {
    try {
      const { host, model } = req.body;
      const emulatorHost = host || 'http://10.0.2.2:8080';
      const emulatorModel = model || 'qwen2.5-1.5b-instruct';
      
      const { AIServiceFactory } = await import('./services/ai-service-factory');
      
      // Test connection first
      const { AndroidEmulatorAIService } = await import('./services/android-emulator-ai-service');
      AndroidEmulatorAIService.configure(emulatorHost, emulatorModel);
      const connectionTest = await AndroidEmulatorAIService.testConnection();
      
      if (!connectionTest.success) {
        return res.status(400).json({ 
          message: "Cannot connect to Android emulator AI service", 
          error: connectionTest.error,
          suggestion: "Make sure Android emulator with AI Edge Gallery is running"
        });
      }
      
      AIServiceFactory.enableAndroidEmulatorAI(emulatorHost, emulatorModel);
      
      process.env.USE_ANDROID_EMULATOR_AI = 'true';
      process.env.USE_TRUE_LOCAL_AI = 'false';
      process.env.USE_GEMINI = 'false';
      process.env.USE_LOCAL_AI = 'false';
      
      res.json({ 
        message: "Switched to Android Emulator AI (Google AI Edge)", 
        useAndroidEmulator: "true",
        modelInfo: connectionTest.modelInfo,
        currentModel: emulatorModel,
        status: "success" 
      });
    } catch (error) {
      res.status(500).json({ 
        message: "Failed to switch to Android Emulator AI", 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
    }
  });

  app.post("/api/ai/switch-to-true-local", async (req, res) => {
    try {
      const { host, model } = req.body;
      const localHost = host || 'http://localhost:11434';
      const localModel = model || 'llama3.1:8b';
      
      const { AIServiceFactory } = await import('./services/ai-service-factory');
      
      // Test connection first
      const { TrueLocalAIService } = await import('./services/true-local-ai-service');
      TrueLocalAIService.configure(localHost, localModel);
      const connectionTest = await TrueLocalAIService.testConnection();
      
      if (!connectionTest.success) {
        return res.status(400).json({ 
          message: "Cannot connect to local AI service", 
          error: connectionTest.error,
          suggestion: "Make sure Ollama is running on your computer"
        });
      }
      
      AIServiceFactory.enableTrueLocalAI(localHost, localModel);
      
      process.env.USE_TRUE_LOCAL_AI = 'true';
      process.env.USE_ANDROID_EMULATOR_AI = 'false';
      process.env.USE_GEMINI = 'false';
      process.env.USE_LOCAL_AI = 'false';
      
      res.json({ 
        message: "Switched to True Local AI service", 
        useTrueLocal: "true",
        availableModels: connectionTest.models,
        currentModel: localModel,
        status: "success" 
      });
    } catch (error) {
      res.status(500).json({ 
        message: "Failed to switch to True Local AI", 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
    }
  });

  app.post("/api/ai/switch-to-gemini", async (req, res) => {
    try {
      if (!process.env.GEMINI_API_KEY) {
        return res.status(400).json({ 
          message: "GEMINI_API_KEY is required", 
          error: "Please configure your Gemini API key" 
        });
      }
      
      const { AIServiceFactory } = await import('./services/ai-service-factory');
      AIServiceFactory.enableGemini();
      
      process.env.USE_GEMINI = 'true';
      process.env.USE_ANDROID_EMULATOR_AI = 'false';
      process.env.USE_TRUE_LOCAL_AI = 'false';
      process.env.USE_LOCAL_AI = 'false';
      
      res.json({ 
        message: "Switched to Google Gemini service", 
        useGemini: "true",
        status: "success" 
      });
    } catch (error) {
      res.status(500).json({ 
        message: "Failed to switch to Gemini", 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
    }
  });

  app.post("/api/ai/switch-to-local", async (req, res) => {
    try {
      const { ollamaHost } = req.body;
      if (!ollamaHost) {
        return res.status(400).json({ message: 'ollamaHost is required' });
      }
      
      const { AIServiceFactory } = await import('./services/ai-service-factory');
      AIServiceFactory.enableLocalAI();
      
      process.env.USE_LOCAL_AI = 'true';
      process.env.USE_ANDROID_EMULATOR_AI = 'false';
      process.env.USE_TRUE_LOCAL_AI = 'false';
      process.env.USE_GEMINI = 'false';
      process.env.OLLAMA_HOST = ollamaHost;
      
      // Test the connection
      try {
        const testResponse = await fetch(`${ollamaHost}/health`);
        if (!testResponse.ok) {
          throw new Error('Health check failed');
        }
      } catch (testError) {
        console.warn('Warning: Could not verify local AI connection:', testError.message);
      }
      
      res.json({ 
        message: 'Switched to local AI service',
        ollamaHost: process.env.OLLAMA_HOST,
        useLocalAI: process.env.USE_LOCAL_AI,
        status: 'success'
      });
    } catch (error) {
      console.error('Error switching to local AI:', error);
      res.status(500).json({ message: 'Failed to switch to local AI', error: error.message });
    }
  });

  app.post("/api/ai/switch-to-gemma2", async (req, res) => {
    try {
      process.env.USE_GEMMA2 = 'true';
      
      res.json({ 
        message: 'Switched to Gemma 2B local model',
        status: 'success'
      });
    } catch (error) {
      console.error('Error switching to Gemma 2B:', error);
      res.status(500).json({ message: 'Failed to switch to Gemma 2B', error: error });
    }
  });

  app.post("/api/ai/switch-to-openai", async (req, res) => {
    try {
      process.env.USE_GEMMA2 = 'false';
      
      res.json({ 
        message: 'Switched to OpenAI service',
        status: 'success'
      });
    } catch (error) {
      console.error('Error switching to OpenAI:', error);
      res.status(500).json({ message: 'Failed to switch to OpenAI', error: error.message });
    }
  });

  // Get current AI service status
  app.get("/api/ai/status", async (req, res) => {
    try {
      const { AIServiceFactory } = await import('./services/ai-service-factory');
      const status = AIServiceFactory.getStatus();
      
      const useLocalAI = process.env.USE_LOCAL_AI === 'true';
      const useGemini = process.env.USE_GEMINI === 'true';
      const useTrueLocal = process.env.USE_TRUE_LOCAL_AI === 'true';
      const useAndroidEmulator = process.env.USE_ANDROID_EMULATOR_AI === 'true';
      const ollamaHost = process.env.OLLAMA_HOST;
      
      let serviceStatus = 'openai';
      let connectionTest = null;
      
      if (useAndroidEmulator) {
        // Test Android emulator AI connection
        try {
          const testResult = await AIServiceFactory.testAndroidEmulatorConnection();
          connectionTest = testResult;
          serviceStatus = testResult.success ? 'android_emulator_connected' : 'android_emulator_disconnected';
        } catch (error) {
          connectionTest = { success: false, error: error.message };
          serviceStatus = 'android_emulator_error';
        }
      } else if (useTrueLocal) {
        // Test true local AI connection
        try {
          const testResult = await AIServiceFactory.testTrueLocalConnection();
          connectionTest = testResult;
          serviceStatus = testResult.success ? 'true_local_connected' : 'true_local_disconnected';
        } catch (error) {
          connectionTest = { success: false, error: error.message };
          serviceStatus = 'true_local_error';
        }
      } else if (useGemini) {
        serviceStatus = process.env.GEMINI_API_KEY ? 'gemini' : 'gemini_no_key';
      } else if (useLocalAI && ollamaHost) {
        try {
          const testResponse = await fetch(`${ollamaHost}/health`, { 
            signal: AbortSignal.timeout(5000) 
          });
          connectionTest = {
            success: testResponse.ok,
            status: testResponse.status,
            url: ollamaHost
          };
          serviceStatus = testResponse.ok ? 'connected' : 'disconnected';
        } catch (error) {
          connectionTest = {
            success: false,
            error: error.message,
            url: ollamaHost
          };
          serviceStatus = 'disconnected';
        }
      }
      
      res.json({
        useLocalAI,
        useGemini,
        useTrueLocal,
        useAndroidEmulator,
        ollamaHost,
        serviceStatus,
        connectionTest,
        currentService: status.currentService
      });
    } catch (error) {
      console.error('Error getting AI status:', error);
      res.status(500).json({ message: 'Failed to get AI status', error: error.message });
    }
  });

  // Start Android Bridge Server as alternative to Termux
  import('./android-bridge-server.js').then(({ AndroidBridgeServer }) => {
    const androidBridge = new AndroidBridgeServer();
    androidBridge.start();
  }).catch(console.error);

  return httpServer;
}
