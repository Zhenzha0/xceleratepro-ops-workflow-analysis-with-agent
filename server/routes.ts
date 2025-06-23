import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { db } from "./db";
import { processActivities, processEvents, processCases } from "@shared/schema";
import { XESParser } from "./services/xes-parser";
import { AnomalyDetector } from "./services/anomaly-detector";
import { AIAnalyst } from "./services/ai-analyst";
import { SemanticSearch } from "./services/semantic-search";
import { z } from "zod";
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
  contextData: z.any().optional()
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
      const { events, activities, cases } = await XESParser.parseCSV(sampleDataPath);
      
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
      
      // Detect anomalies in the scoped activities
      for (const activity of scopedActivities) {
        // Processing time anomalies
        const processingAnomaly = AnomalyDetector.analyzeProcessingTimeAnomaly(
          activity,
          scopedActivities
        );
        
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
      const response = await AIAnalyst.analyzeQuery(request);
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

  // Auto-import sample data on startup if not already imported
  setTimeout(async () => {
    if (!dataImported) {
      try {
        console.log('Auto-importing sample data on startup...');
        const sampleDataPath = path.join(process.cwd(), 'attached_assets', 'sample_data_1750608906974.csv');
        const { events, activities, cases } = await XESParser.parseCSV(sampleDataPath);
        
        await storage.bulkInsertProcessEvents(events.slice(0, 1000)); // Limit for startup
        await storage.bulkInsertProcessActivities(activities.slice(0, 500));
        
        for (const processCase of cases.slice(0, 100)) {
          await storage.createProcessCase(processCase);
        }
        
        dataImported = true;
        console.log('Auto-import completed');
      } catch (error) {
        console.error('Auto-import failed:', error);
      }
    }
  }, 2000);

  const httpServer = createServer(app);
  return httpServer;
}
