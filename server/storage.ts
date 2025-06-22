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
import { eq, desc, and, gte, lte, sql, like, or } from "drizzle-orm";

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
      .where(eq(processCases.status, 'success'));

    const [failedCases] = await db.select({ count: sql<number>`count(*)` })
      .from(processCases)
      .where(eq(processCases.status, 'failed'));

    const [avgTime] = await db.select({ avg: sql<number>`avg(total_duration_s)` })
      .from(processCases)
      .where(eq(processCases.status, 'success'));

    const [anomalies] = await db.select({ count: sql<number>`count(*)` })
      .from(processActivities)
      .where(eq(processActivities.isAnomaly, true));

    const totalCases = activeCases.count + completedCases.count + failedCases.count;
    const successRate = totalCases > 0 ? (completedCases.count / totalCases) * 100 : 0;

    return {
      avgProcessingTime: avgTime.avg ? Math.round(avgTime.avg / 60) : 0, // Convert to minutes
      anomaliesDetected: anomalies.count,
      bottlenecksFound: 5, // This would be calculated based on analysis
      successRate: Math.round(successRate * 10) / 10,
      activeCases: activeCases.count,
      completedCases: completedCases.count,
      failedCases: failedCases.count,
    };
  }

  async getAnomalyAlerts(limit = 10): Promise<AnomalyAlert[]> {
    const anomalies = await db.select()
      .from(processActivities)
      .where(eq(processActivities.isAnomaly, true))
      .orderBy(desc(processActivities.createdAt))
      .limit(limit);

    return anomalies.map(anomaly => ({
      id: anomaly.id.toString(),
      type: 'processing_time',
      title: 'Processing Time Anomaly Detected',
      description: `${anomaly.activity} operation exceeded expected time`,
      details: `Case ${anomaly.caseId} - Equipment: ${anomaly.orgResource}`,
      timestamp: anomaly.createdAt || new Date(),
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
}

export const storage = new DatabaseStorage();
