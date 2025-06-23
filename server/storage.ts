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
  type SemanticSearchResult,
  type CaseClusterAnalysis,
  type CaseCluster,
  type TimelineActivity
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
  getBottleneckAnalysis(): Promise<any>;
  
  // Data import methods
  bulkInsertProcessEvents(events: InsertProcessEvent[]): Promise<void>;
  bulkInsertProcessActivities(activities: InsertProcessActivity[]): Promise<void>;
  bulkInsertProcessCases(cases: InsertProcessCase[]): Promise<void>;
  
  // Case clustering methods
  getCaseClusterAnalysis(params: {
    mode: string;
    maxClusters: number;
    start: number;
    n: number;
    startTime?: string;
    endTime?: string;
  }): Promise<CaseClusterAnalysis>;
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
    const [activeCases] = await db.select({ count: sql<number>`cast(count(*) as integer)` })
      .from(processCases)
      .where(eq(processCases.status, 'inProgress'));

    const [completedCases] = await db.select({ count: sql<number>`cast(count(*) as integer)` })
      .from(processCases)
      .where(eq(processCases.status, 'success'));

    const [failedCases] = await db.select({ count: sql<number>`cast(count(*) as integer)` })
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

    const [anomalies] = await db.select({ count: sql<number>`cast(count(*) as integer)` })
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
    // Based on the data analysis, stations with >50 seconds processing time are bottlenecks
    const significantProcessingBottlenecks = processingBottlenecks.filter(b => b.avgProcessingTime > 50).length; 
    const significantWaitBottlenecks = waitTimeBottlenecks.filter(w => w.avgWaitTime > 10).length; // > 10 seconds wait
    const totalBottlenecks = significantProcessingBottlenecks + significantWaitBottlenecks;

    // Ensure proper number conversion to fix string concatenation bug
    const activeCount = parseInt(String(activeCases.count));
    const completedCount = parseInt(String(completedCases.count)); 
    const failedCount = parseInt(String(failedCases.count));
    
    const totalCases = activeCount + completedCount + failedCount;
    // Calculate success rate - completed cases / total finished cases (completed + failed)
    const finishedCases = completedCount + failedCount;
    // Special case: if no failed cases, success rate is 100% for completed cases
    const successRate = finishedCases > 0 ? (completedCount / finishedCases) * 100 : (completedCount > 0 ? 100 : 0);

    return {
      avgProcessingTime: avgProcessingByStation.length > 0 
        ? Math.round((avgProcessingByStation[0].avgTime || 0) * 100) / 100 
        : 0,
      anomaliesDetected: Number(anomalies.count || 0),
      bottlenecksFound: totalBottlenecks,
      successRate: Math.round(successRate * 100) / 100,
      activeCases: activeCount,
      completedCases: completedCount,
      failedCases: failedCount,
    };
  }

  async getAnomalyAlerts(limit = 10): Promise<AnomalyAlert[]> {
    const anomalies = await db.select()
      .from(processActivities)
      .where(eq(processActivities.isAnomaly, true))
      .orderBy(desc(processActivities.startTime))
      .limit(limit);

    return anomalies.map(anomaly => {
      const processingTime = anomaly.actualDurationS || 0;
      const plannedTime = anomaly.plannedDurationS || 0;
      const deviation = processingTime - plannedTime;
      
      let details = `Processing time ${processingTime.toFixed(1)}s vs planned ${plannedTime.toFixed(1)}s (deviation: ${deviation > 0 ? '+' : ''}${deviation.toFixed(1)}s)`;
      details += `\nCase ${anomaly.caseId} - Equipment: ${anomaly.orgResource || 'Unknown'}`;
      
      if (anomaly.currentTask) {
        details += `\nCurrent task: ${anomaly.currentTask}`;
      }
      
      if (anomaly.failureDescription) {
        details += `\nFailure: ${anomaly.failureDescription}`;
      }

      return {
        id: anomaly.id.toString(),
        type: 'processing_time',
        title: 'Processing Time Anomaly Detected',
        description: `${anomaly.activity} operation exceeded expected time`,
        details,
        timestamp: anomaly.startTime || anomaly.completeTime || new Date(),
        severity: anomaly.anomalyScore && anomaly.anomalyScore > 2 ? 'high' : 'medium',
        caseId: anomaly.caseId,
        equipment: anomaly.orgResource || undefined,
      };
    });
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

  async getBottleneckAnalysis(): Promise<any> {
    // Get processing time bottlenecks with full activity names
    const processingBottlenecks = await db.select({
      station: sql<string>`COALESCE(activity, org_resource, 'Unknown Station')`,
      avgProcessingTime: sql<number>`avg(actual_duration_s)`
    })
      .from(processActivities)
      .where(sql`actual_duration_s IS NOT NULL AND (activity IS NOT NULL OR org_resource IS NOT NULL)`)
      .groupBy(sql`COALESCE(activity, org_resource, 'Unknown Station')`)
      .orderBy(sql`avg(actual_duration_s) desc`)
      .limit(5);

    // Get wait time bottlenecks with full activity names (start_time - scheduled_time)
    const waitTimeBottlenecks = await db.select({
      station: sql<string>`COALESCE(activity, org_resource, 'Unknown Station')`,
      avgWaitTime: sql<number>`avg(extract(epoch from start_time) - extract(epoch from scheduled_time))`
    })
      .from(processActivities)
      .where(sql`start_time IS NOT NULL AND scheduled_time IS NOT NULL AND (activity IS NOT NULL OR org_resource IS NOT NULL)`)
      .groupBy(sql`COALESCE(activity, org_resource, 'Unknown Station')`)
      .orderBy(sql`avg(extract(epoch from start_time) - extract(epoch from scheduled_time)) desc`)
      .limit(5);

    return {
      processingBottlenecks: processingBottlenecks.map(b => ({
        station: b.station,
        avgProcessingTime: Number(b.avgProcessingTime || 0),
        impact: (b.avgProcessingTime || 0) > 300 ? 'high' : (b.avgProcessingTime || 0) > 120 ? 'medium' : 'low'
      })),
      waitTimeBottlenecks: waitTimeBottlenecks.filter(w => Number(w.avgWaitTime || 0) > 0).map(w => ({
        station: w.station,
        avgWaitTime: Number(w.avgWaitTime || 0),
        impact: Number(w.avgWaitTime || 0) > 180 ? 'high' : Number(w.avgWaitTime || 0) > 60 ? 'medium' : 'low'
      }))
    };
  }

  async getCaseClusterAnalysis(params: {
    mode: string;
    maxClusters: number;
    start: number;
    n: number;
    startTime?: string;
    endTime?: string;
  }): Promise<CaseClusterAnalysis> {
    try {
      // Get all cases and activities
      const allCases = await db.select().from(processCases);
      const allActivities = await db.select().from(processActivities);

      // Apply filtering based on mode
      let filteredCases: typeof allCases = [];
      
      if (params.mode === 'dataset') {
        // Index-based filtering
        filteredCases = allCases
          .sort((a, b) => {
            const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
            const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
            return dateA - dateB;
          })
          .slice(params.start, params.start + params.n);
      } else if (params.mode === 'timerange' && params.startTime && params.endTime) {
        // Time-based filtering
        const startDate = new Date(params.startTime);
        const endDate = new Date(params.endTime);
        filteredCases = allCases.filter(c => {
          const caseDate = c.createdAt ? new Date(c.createdAt) : new Date();
          return caseDate >= startDate && caseDate <= endDate;
        });
      } else {
        filteredCases = allCases.slice(0, params.n);
      }

      const filteredCaseIds = filteredCases.map(c => c.caseId);
      const filteredActivities = allActivities.filter(a => filteredCaseIds.includes(a.caseId));

      // Group activities by case to build process signatures
      const caseActivitiesMap = filteredActivities.reduce((acc, activity) => {
        if (!acc[activity.caseId]) {
          acc[activity.caseId] = [];
        }
        acc[activity.caseId].push(activity);
        return acc;
      }, {} as Record<string, ProcessActivity[]>);

      // Create process signatures for each case
      const caseSignatures = Object.entries(caseActivitiesMap).map(([caseId, activities]) => {
        // Sort activities by start time to create process flow signature
        const sortedActivities = activities
          .filter(a => a.startTime) // Only include activities with timing data
          .sort((a, b) => new Date(a.startTime!).getTime() - new Date(b.startTime!).getTime());
        
        const signature = sortedActivities.map(a => a.activity).join(' -> ');
        
        return {
          caseId,
          signature,
          activities: sortedActivities
        };
      });

      // Group cases by their process signatures
      const signatureGroups = caseSignatures.reduce((acc, caseData) => {
        if (!acc[caseData.signature]) {
          acc[caseData.signature] = [];
        }
        acc[caseData.signature].push(caseData);
        return acc;
      }, {} as Record<string, typeof caseSignatures>);

      // Convert to clusters and sort by frequency
      const clusters: CaseCluster[] = Object.entries(signatureGroups)
        .map(([signature, cases], index) => {
          const allActivitiesInCluster = cases.flatMap(c => c.activities);
          
          // Calculate cluster metrics
          const avgProcessingTime = allActivitiesInCluster.length > 0
            ? allActivitiesInCluster.reduce((sum, a) => sum + (a.actualDurationS || 0), 0) / allActivitiesInCluster.length
            : 0;

          const anomalyCount = allActivitiesInCluster.filter(a => a.isAnomaly).length;
          
          // Calculate case durations (start to finish for each case)
          const caseDurations = cases.map(caseData => {
            const activities = caseData.activities;
            if (activities.length === 0) return 0;
            
            const startTime = new Date(activities[0].startTime!).getTime();
            const endTime = new Date(activities[activities.length - 1].completeTime || activities[activities.length - 1].startTime!).getTime();
            return (endTime - startTime) / 1000; // Convert to seconds
          });

          const avgDuration = caseDurations.length > 0
            ? caseDurations.reduce((sum, d) => sum + d, 0) / caseDurations.length
            : 0;

          const totalDuration = caseDurations.reduce((sum, d) => sum + d, 0);

          // Find bottleneck activity (highest average processing time)
          const activityProcessingTimes = allActivitiesInCluster.reduce((acc, activity) => {
            if (!acc[activity.activity]) {
              acc[activity.activity] = [];
            }
            acc[activity.activity].push(activity.actualDurationS || 0);
            return acc;
          }, {} as Record<string, number[]>);

          let bottleneckActivity = '';
          let bottleneckAvgTime = 0;
          
          Object.entries(activityProcessingTimes).forEach(([activity, times]) => {
            const avgTime = times.reduce((sum, t) => sum + t, 0) / times.length;
            if (avgTime > bottleneckAvgTime) {
              bottleneckAvgTime = avgTime;
              bottleneckActivity = activity;
            }
          });

          return {
            clusterId: index + 1,
            processSignature: signature,
            caseCount: cases.length,
            caseIds: cases.map(c => c.caseId),
            avgProcessingTime,
            avgDuration,
            totalDuration,
            anomalyCount,
            bottleneckActivity,
            bottleneckAvgTime,
            coverage: (cases.length / filteredCases.length) * 100,
            anomalyRate: allActivitiesInCluster.length > 0 
              ? (anomalyCount / allActivitiesInCluster.length) * 100 
              : 0
          };
        })
        .sort((a, b) => b.caseCount - a.caseCount) // Sort by frequency (most common first)
        .slice(0, params.maxClusters); // Limit to maxClusters

      // Create timeline data for visualization
      const timelineData: TimelineActivity[] = [];
      clusters.forEach((cluster, clusterIndex) => {
        cluster.caseIds.forEach(caseId => {
          const caseActivities = filteredActivities
            .filter(a => a.caseId === caseId && a.startTime)
            .sort((a, b) => new Date(a.startTime!).getTime() - new Date(b.startTime!).getTime());
          
          caseActivities.forEach(activity => {
            timelineData.push({
              caseId: activity.caseId,
              activity: activity.activity,
              timestamp: new Date(activity.startTime!),
              duration: activity.actualDurationS || 0,
              isAnomaly: activity.isAnomaly || false,
              clusterId: cluster.clusterId
            });
          });
        });
      });

      // Calculate overall metrics
      const totalPatterns = Object.keys(signatureGroups).length;
      const totalCoverage = (filteredCases.length / allCases.length) * 100;
      const totalAnomalies = filteredActivities.filter(a => a.isAnomaly).length;
      const totalAnomalyRate = filteredActivities.length > 0 
        ? (totalAnomalies / filteredActivities.length) * 100 
        : 0;

      return {
        totalCases: filteredCases.length,
        totalPatterns,
        coverage: totalCoverage,
        anomalyRate: totalAnomalyRate,
        clusters,
        timelineData: timelineData.slice(0, 1000) // Limit timeline data for performance
      };

    } catch (error) {
      console.error('Error in getCaseClusterAnalysis:', error);
      return {
        totalCases: 0,
        totalPatterns: 0,
        coverage: 0,
        anomalyRate: 0,
        clusters: [],
        timelineData: []
      };
    }
  }
}

export const storage = new DatabaseStorage();
