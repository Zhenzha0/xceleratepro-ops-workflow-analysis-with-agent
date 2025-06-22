import { 
  processEvents, 
  processActivities, 
  processCases, 
  aiConversations, 
  failureEmbeddings,
  users,
  type User, 
  type InsertUser,
  type ProcessEvent,
  type InsertProcessEvent,
  type ProcessActivity,
  type InsertProcessActivity,
  type ProcessCase,
  type InsertProcessCase,
  type AiConversation,
  type InsertAiConversation,
  type FailureEmbedding,
  type InsertFailureEmbedding,
  type DashboardMetrics,
  type AnomalyAlert,
  type CaseComparison,
  type SemanticSearchResult
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, gte, lte, sql, like, or, isNotNull } from "drizzle-orm";

export interface IStorage {
  // User methods
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  // Process event methods
  createProcessEvent(event: InsertProcessEvent): Promise<ProcessEvent>;
  getProcessEvents(filters?: {
    caseId?: string;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
    resource?: string;
    status?: string;
  }): Promise<ProcessEvent[]>;
  
  // Process activity methods
  createProcessActivity(activity: InsertProcessActivity): Promise<ProcessActivity>;
  getProcessActivities(caseId?: string): Promise<ProcessActivity[]>;
  
  // Process case methods
  createProcessCase(processCase: InsertProcessCase): Promise<ProcessCase>;
  getProcessCases(filters?: {
    status?: string;
    limit?: number;
    startDate?: Date;
    endDate?: Date;
  }): Promise<ProcessCase[]>;
  getProcessCase(caseId: string): Promise<ProcessCase | undefined>;
  
  // AI conversation methods
  createAiConversation(conversation: InsertAiConversation): Promise<AiConversation>;
  getAiConversations(sessionId: string, limit?: number): Promise<AiConversation[]>;
  
  // Failure embedding methods
  createFailureEmbedding(embedding: InsertFailureEmbedding): Promise<FailureEmbedding>;
  searchFailureEmbeddings(query: string, limit?: number): Promise<SemanticSearchResult[]>;
  
  // Dashboard methods
  getDashboardMetrics(): Promise<DashboardMetrics>;
  getAnomalyAlerts(limit?: number): Promise<AnomalyAlert[]>;
  getCaseComparison(caseAId: string, caseBId: string): Promise<CaseComparison | null>;
  
  // Data import methods
  bulkInsertProcessEvents(events: InsertProcessEvent[]): Promise<void>;
  bulkInsertProcessActivities(activities: InsertProcessActivity[]): Promise<void>;
  bulkInsertProcessCases(cases: InsertProcessCase[]): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  async createProcessEvent(event: InsertProcessEvent): Promise<ProcessEvent> {
    const [created] = await db.insert(processEvents).values(event).returning();
    return created;
  }

  async getProcessEvents(filters?: {
    caseId?: string;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
    resource?: string;
    status?: string;
  }): Promise<ProcessEvent[]> {
    const conditions = [];
    if (filters?.caseId) {
      conditions.push(eq(processEvents.caseId, filters.caseId));
    }
    if (filters?.startDate) {
      conditions.push(gte(processEvents.timestamp, filters.startDate));
    }
    if (filters?.endDate) {
      conditions.push(lte(processEvents.timestamp, filters.endDate));
    }
    if (filters?.resource) {
      conditions.push(eq(processEvents.orgResource, filters.resource));
    }
    if (filters?.status) {
      conditions.push(eq(processEvents.lifecycleState, filters.status));
    }
    
    const baseQuery = db.select().from(processEvents);
    
    let finalQuery = baseQuery;
    if (conditions.length > 0) {
      finalQuery = baseQuery.where(and(...conditions));
    }
    
    finalQuery = finalQuery.orderBy(desc(processEvents.timestamp));
    
    if (filters?.limit) {
      finalQuery = finalQuery.limit(filters.limit);
    }
    
    return await finalQuery;
  }

  async createProcessActivity(activity: InsertProcessActivity): Promise<ProcessActivity> {
    const [created] = await db.insert(processActivities).values(activity).returning();
    return created;
  }

  async getProcessActivities(caseId?: string): Promise<ProcessActivity[]> {
    if (caseId) {
      return await db.select().from(processActivities).where(eq(processActivities.caseId, caseId));
    }
    return await db.select().from(processActivities).orderBy(desc(processActivities.createdAt));
  }

  async createProcessCase(processCase: InsertProcessCase): Promise<ProcessCase> {
    const [created] = await db.insert(processCases).values(processCase).returning();
    return created;
  }

  async getProcessCases(filters?: {
    status?: string;
    limit?: number;
    startDate?: Date;
    endDate?: Date;
  }): Promise<ProcessCase[]> {
    let query = db.select().from(processCases);
    
    const conditions = [];
    if (filters?.status) {
      conditions.push(eq(processCases.status, filters.status));
    }
    if (filters?.startDate) {
      conditions.push(gte(processCases.startTime, filters.startDate));
    }
    if (filters?.endDate) {
      conditions.push(lte(processCases.endTime, filters.endDate));
    }
    
    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }
    
    query = query.orderBy(desc(processCases.createdAt));
    
    if (filters?.limit) {
      query = query.limit(filters.limit);
    }
    
    return await query;
  }

  async getProcessCase(caseId: string): Promise<ProcessCase | undefined> {
    const [processCase] = await db.select().from(processCases).where(eq(processCases.caseId, caseId));
    return processCase || undefined;
  }

  async createAiConversation(conversation: InsertAiConversation): Promise<AiConversation> {
    const [created] = await db.insert(aiConversations).values(conversation).returning();
    return created;
  }

  async getAiConversations(sessionId: string, limit = 50): Promise<AiConversation[]> {
    return await db.select()
      .from(aiConversations)
      .where(eq(aiConversations.sessionId, sessionId))
      .orderBy(desc(aiConversations.createdAt))
      .limit(limit);
  }

  async createFailureEmbedding(embedding: InsertFailureEmbedding): Promise<FailureEmbedding> {
    const [created] = await db.insert(failureEmbeddings).values(embedding).returning();
    return created;
  }

  async searchFailureEmbeddings(query: string, limit = 10): Promise<SemanticSearchResult[]> {
    // This is a simplified version - in production, you'd use vector similarity search
    const results = await db.select()
      .from(failureEmbeddings)
      .where(like(failureEmbeddings.failureDescription, `%${query}%`))
      .limit(limit);
    
    return results.map(result => ({
      id: result.id.toString(),
      description: result.failureDescription,
      caseId: result.caseId || '',
      activity: result.activity || '',
      similarity: 0.8 // Mock similarity score
    }));
  }

  async getDashboardMetrics(): Promise<DashboardMetrics> {
    const [activeCases] = await db.select({ count: sql<number>`count(*)` })
      .from(processCases)
      .where(eq(processCases.status, 'inProgress'));

    const [completedCases] = await db.select({ count: sql<number>`count(*)` })
      .from(processCases)
      .where(or(eq(processCases.status, 'success'), eq(processCases.status, 'completed')));

    const [failedCases] = await db.select({ count: sql<number>`count(*)` })
      .from(processCases)
      .where(or(eq(processCases.status, 'failed'), eq(processCases.status, 'error')));

    // Calculate average processing time by station (2 decimal places)
    const avgProcessingByStation = await db.select({
      station: processActivities.orgResource,
      avgTime: sql<number>`avg(actual_duration_s)`
    })
      .from(processActivities)
      .where(sql`actual_duration_s IS NOT NULL`)
      .groupBy(processActivities.orgResource)
      .orderBy(sql`avg(actual_duration_s) desc`)
      .limit(1);

    const [anomalies] = await db.select({ count: sql<number>`count(*)` })
      .from(processActivities)
      .where(eq(processActivities.isAnomaly, true));

    // Calculate bottlenecks - processing time and wait time
    const processingBottlenecks = await db.select({
      station: processActivities.orgResource,
      avgProcessingTime: sql<number>`avg(actual_duration_s)`
    })
      .from(processActivities)
      .where(sql`actual_duration_s IS NOT NULL AND org_resource IS NOT NULL`)
      .groupBy(processActivities.orgResource)
      .orderBy(sql`avg(actual_duration_s) desc`)
      .limit(5);

    // Calculate wait time bottlenecks (start_time - scheduled_time)
    const waitTimeBottlenecks = await db.select({
      station: processActivities.orgResource,
      avgWaitTime: sql<number>`avg(extract(epoch from start_time) - extract(epoch from scheduled_time))`
    })
      .from(processActivities)
      .where(sql`start_time IS NOT NULL AND scheduled_time IS NOT NULL AND org_resource IS NOT NULL`)
      .groupBy(processActivities.orgResource)
      .orderBy(sql`avg(extract(epoch from start_time) - extract(epoch from scheduled_time)) desc`)
      .limit(5);

    // Count actual bottlenecks (stations with significant delays)
    const significantProcessingBottlenecks = processingBottlenecks.filter(b => b.avgProcessingTime > 60).length; // > 1 minute
    const significantWaitBottlenecks = waitTimeBottlenecks.filter(w => w.avgWaitTime > 30).length; // > 30 seconds wait
    const totalBottlenecks = significantProcessingBottlenecks + significantWaitBottlenecks;

    const totalCases = activeCases.count + completedCases.count + failedCases.count;
    // Fix success rate calculation - should be completed cases / total cases
    const successRate = totalCases > 0 ? (completedCases.count / totalCases) * 100 : 0;

    return {
      avgProcessingTime: avgProcessingByStation.length > 0 
        ? Math.round((avgProcessingByStation[0].avgTime || 0) * 100) / 100 
        : 0,
      anomaliesDetected: anomalies.count,
      bottlenecksFound: totalBottlenecks,
      successRate: Math.round(successRate * 100) / 100,
      activeCases: activeCases.count,
      completedCases: completedCases.count,
      failedCases: failedCases.count,
    };
  }

  async getAnomalyAlerts(limit = 10): Promise<AnomalyAlert[]> {
    const anomalies = await db.select()
      .from(processActivities)
      .where(eq(processActivities.isAnomaly, true))
      .orderBy(desc(processActivities.startTime))
      .limit(limit);

    return anomalies.map(anomaly => ({
      id: anomaly.id.toString(),
      type: 'processing_time',
      title: 'Processing Time Anomaly Detected',
      description: `${anomaly.activity} operation exceeded expected time`,
      details: `Case ${anomaly.caseId} - Equipment: ${anomaly.orgResource}${anomaly.failureDescription ? ` - ${anomaly.failureDescription}` : ''}`,
      timestamp: anomaly.startTime || anomaly.completeTime || new Date(),
      severity: anomaly.anomalyScore && anomaly.anomalyScore > 2 ? 'high' : 'medium',
      caseId: anomaly.caseId,
      equipment: anomaly.orgResource || undefined,
    }));
  }

  async getCaseComparison(caseAId: string, caseBId: string): Promise<CaseComparison | null> {
    const caseA = await this.getProcessCase(caseAId);
    const caseB = await this.getProcessCase(caseBId);
    
    if (!caseA || !caseB) return null;
    
    const activitiesA = await this.getProcessActivities(caseAId);
    const activitiesB = await this.getProcessActivities(caseBId);
    
    return {
      caseA: { ...caseA, activities: activitiesA },
      caseB: { ...caseB, activities: activitiesB },
    };
  }

  async bulkInsertProcessEvents(events: InsertProcessEvent[]): Promise<void> {
    if (events.length === 0) return;
    
    // Insert in batches to avoid memory issues
    const batchSize = 1000;
    for (let i = 0; i < events.length; i += batchSize) {
      const batch = events.slice(i, i + batchSize);
      await db.insert(processEvents).values(batch);
    }
  }

  async bulkInsertProcessActivities(activities: InsertProcessActivity[]): Promise<void> {
    if (activities.length === 0) return;
    
    const batchSize = 1000;
    for (let i = 0; i < activities.length; i += batchSize) {
      const batch = activities.slice(i, i + batchSize);
      await db.insert(processActivities).values(batch);
    }
  }

  async bulkInsertProcessCases(cases: InsertProcessCase[]): Promise<void> {
    if (cases.length === 0) return;
    
    const batchSize = 1000;
    for (let i = 0; i < cases.length; i += batchSize) {
      const batch = cases.slice(i, i + batchSize);
      await db.insert(processCases).values(batch);
    }
  }
}

export const storage = new DatabaseStorage();
