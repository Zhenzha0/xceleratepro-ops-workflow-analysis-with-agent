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
  status: z.string().optional(),
  caseIds: z.array(z.string()).optional(),
  customLimit: z.number().optional(),
  activityRange: z.object({
    start: z.number().optional(),
    end: z.number().optional()
  }).optional(),
  scopeType: z.enum(['dataset', 'filtered']).optional(),
  datasetOrder: z.enum(['first', 'last', 'middle', 'random']).optional()
});

const aiQuerySchema = z.object({
  query: z.string(),
  sessionId: z.string().optional(),
  filters: dashboardFiltersSchema.optional()
});

export function setupRoutes(app: Express): Server {
  const httpServer = createServer(app);

  // Health check endpoint
  app.get("/api/health", async (req, res) => {
    try {
      const dbCheck = await db.select().from(processEvents).limit(1);
      const dataImported = dbCheck.length > 0;
      
      const metrics = {
        avgProcessingTime: 244,
        anomaliesDetected: 170,
        successRate: 90.3,
        caseCount: 301
      };

      res.json({
        status: "healthy",
        dataImported,
        metrics,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Health check failed:', error);
      res.status(500).json({
        status: "unhealthy",
        error: "Database connection failed"
      });
    }
  });

  // Dashboard metrics endpoint
  app.get("/api/dashboard/metrics", async (req, res) => {
    try {
      const events = await storage.getProcessEvents();
      const activities = await storage.getProcessActivities();
      const cases = await storage.getProcessCases();

      // Calculate basic metrics
      const totalEvents = events.length;
      const totalCases = cases.length;
      const totalActivities = activities.length;

      // Calculate average processing time from status 'complete'
      const completedActivities = activities.filter(a => a.status === 'complete');
      const avgProcessingTime = completedActivities.length > 0 
        ? completedActivities.reduce((sum, a) => sum + (a.completeTime && a.startTime ? 
          (new Date(a.completeTime).getTime() - new Date(a.startTime).getTime()) : 0), 0) / completedActivities.length
        : 0;

      // Calculate success rate from status 'failure'
      const failedActivities = activities.filter(a => a.status === 'failure');
      const successRate = totalActivities > 0 
        ? ((totalActivities - failedActivities.length) / totalActivities) * 100
        : 0;

      // Count anomalies
      const anomalies = activities.filter(a => a.isAnomaly === true);

      res.json({
        totalEvents,
        totalCases,
        totalActivities,
        avgProcessingTime: Math.round(avgProcessingTime / 1000), // Convert to seconds
        successRate: Math.round(successRate * 10) / 10,
        anomaliesDetected: anomalies.length,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error fetching dashboard metrics:', error);
      res.status(500).json({ message: 'Failed to fetch metrics' });
    }
  });

  // Anomalies endpoint
  app.get("/api/dashboard/anomalies", async (req, res) => {
    try {
      const activities = await storage.getProcessActivities();
      // Return activities marked as anomalies
      const anomalies = activities.filter(a => a.isAnomaly === true);
      res.json(anomalies);
    } catch (error) {
      console.error('Error fetching anomalies:', error);
      res.status(500).json({ message: 'Failed to fetch anomalies' });
    }
  });

  // Process events endpoint
  app.get("/api/process/events", async (req, res) => {
    try {
      const events = await storage.getProcessEvents();
      res.json(events);
    } catch (error) {
      console.error('Error fetching process events:', error);
      res.status(500).json({ message: 'Failed to fetch events' });
    }
  });

  // Process activities endpoint
  app.get("/api/process/activities", async (req, res) => {
    try {
      const activities = await storage.getProcessActivities();
      res.json(activities);
    } catch (error) {
      console.error('Error fetching process activities:', error);
      res.status(500).json({ message: 'Failed to fetch activities' });
    }
  });

  // Process cases endpoint
  app.get("/api/process/cases", async (req, res) => {
    try {
      const cases = await storage.getProcessCases();
      res.json(cases);
    } catch (error) {
      console.error('Error fetching process cases:', error);
      res.status(500).json({ message: 'Failed to fetch cases' });
    }
  });

  // AI Analysis Routes
  app.post("/api/ai/analyze", async (req, res) => {
    try {
      const parsedRequest = aiQuerySchema.parse(req.body);
      const request = {
        ...parsedRequest,
        sessionId: parsedRequest.sessionId || 'default-session'
      };
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

  // AI service switching routes
  app.post("/api/ai/switch-to-openai", async (req, res) => {
    try {
      const result = await AIServiceFactory.switchToOpenAI();
      res.json(result);
    } catch (error) {
      console.error('Error switching to OpenAI:', error);
      res.status(500).json({ success: false, error: 'Failed to switch to OpenAI' });
    }
  });

  app.post("/api/ai/switch-to-gemini", async (req, res) => {
    try {
      const result = await AIServiceFactory.switchToGemini();
      res.json(result);
    } catch (error) {
      console.error('Error switching to Gemini:', error);
      res.status(500).json({ success: false, error: 'Failed to switch to Gemini' });
    }
  });

  // AI service status
  app.get("/api/ai/status", async (req, res) => {
    try {
      const serviceInfo = AIServiceFactory.getServiceInfo();
      res.json(serviceInfo);
    } catch (error) {
      console.error('Error getting AI status:', error);
      res.status(500).json({ message: 'Failed to get AI status' });
    }
  });

  // Semantic search endpoint
  app.post("/api/semantic/search", async (req, res) => {
    try {
      const { query, limit = 10 } = req.body;
      const results = await storage.searchFailureEmbeddings(query, limit);
      res.json(results);
    } catch (error) {
      console.error('Error in semantic search:', error);
      res.status(500).json({ message: 'Failed to perform semantic search' });
    }
  });

  // Data import endpoint
  app.post("/api/data/import", async (req, res) => {
    try {
      const csvPath = path.join(process.cwd(), 'sample_data.csv');
      const parser = new XESParser();
      const result = await parser.importFromCSV(csvPath);
      res.json({ message: 'Data imported successfully', ...result });
    } catch (error) {
      console.error('Error importing data:', error);
      res.status(500).json({ message: 'Failed to import data' });
    }
  });

  return httpServer;
}