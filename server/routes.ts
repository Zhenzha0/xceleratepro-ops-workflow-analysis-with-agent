import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
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
      const sampleDataPath = path.join(process.cwd(), 'attached_assets', 'sample_data_1750608906974.csv');
      const { events, activities, cases } = await XESParser.parseCSV(sampleDataPath);
      
      console.log('Importing parsed data to database...');
      await storage.bulkInsertProcessEvents(events);
      await storage.bulkInsertProcessActivities(activities);
      
      for (const processCase of cases) {
        await storage.createProcessCase(processCase);
      }

      dataImported = true;
      console.log('Sample data import completed');
      
      res.json({ 
        success: true, 
        message: 'Sample data imported successfully',
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
        message: 'Failed to import sample data',
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

  app.post("/api/dashboard/filter", async (req, res) => {
    try {
      const filters = dashboardFiltersSchema.parse(req.body);
      
      const processEventsFilters: any = {};
      
      if (filters.timeRange?.start) {
        processEventsFilters.startDate = new Date(filters.timeRange.start);
      }
      if (filters.timeRange?.end) {
        processEventsFilters.endDate = new Date(filters.timeRange.end);
      }
      if (filters.equipment && filters.equipment !== 'all') {
        processEventsFilters.resource = filters.equipment;
      }
      if (filters.status && filters.status !== 'all') {
        processEventsFilters.status = filters.status;
      }
      
      // Set limit based on dataset size
      if (filters.datasetSize === 'last_1000') {
        processEventsFilters.limit = 1000;
      } else if (filters.datasetSize === 'last_500') {
        processEventsFilters.limit = 500;
      } else if (filters.limit) {
        processEventsFilters.limit = filters.limit;
      }

      const events = await storage.getProcessEvents(processEventsFilters);
      const cases = await storage.getProcessCases(processEventsFilters);
      
      res.json({
        events,
        cases,
        totalCount: events.length
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
