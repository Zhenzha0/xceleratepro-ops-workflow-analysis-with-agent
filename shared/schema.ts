import { relations } from "drizzle-orm";
import { integer, real, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = sqliteTable("users", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const processEvents = sqliteTable("process_events", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  caseId: text("case_id").notNull(),
  timestamp: text("timestamp").notNull(),
  operationEndTime: text("operation_end_time"),
  lifecycleTransition: text("lifecycle_transition").notNull(),
  lifecycleState: text("lifecycle_state").notNull(),
  eventId: integer("event_id").notNull(),
  identifierId: text("identifier_id"),
  processModelId: text("process_model_id"),
  activity: text("activity").notNull(),
  requestedServiceUrl: text("requested_service_url"),
  orgResource: text("org_resource"),
  plannedOperationTime: text("planned_operation_time"),
  parameters: text("parameters"),
  caseConceptName: text("case_concept_name"),
  subProcessId: text("sub_process_id"),
  currentTask: text("current_task"),
  responseStatusCode: integer("response_status_code"),
  completeServiceTime: text("complete_service_time"),
  humanWorkstationGreenButtonPressed: integer("human_workstation_green_button_pressed"),
  unsatisfiedConditionDescription: text("unsatisfied_condition_description"),
  processingTimeS: real("processing_time_s"),
  isAnomaly: integer("is_anomaly").default(0),
  createdAt: text("created_at").default("CURRENT_TIMESTAMP"),
});

export const processActivities = sqliteTable("process_activities", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  caseId: text("case_id").notNull(),
  activity: text("activity").notNull(),
  orgResource: text("org_resource"),
  scheduledTime: text("scheduled_time"),
  startTime: text("start_time"),
  completeTime: text("complete_time"),
  plannedDurationS: real("planned_duration_s"),
  actualDurationS: real("actual_duration_s"),
  status: text("status").notNull(),
  isAnomaly: integer("is_anomaly").default(0),
  anomalyScore: real("anomaly_score"),
  failureDescription: text("failure_description"),
  currentTask: text("current_task"),
  createdAt: text("created_at").default("CURRENT_TIMESTAMP"),
});

export const processCases = sqliteTable("process_cases", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  caseId: text("case_id").notNull().unique(),
  processModelId: text("process_model_id"),
  startTime: text("start_time"),
  endTime: text("end_time"),
  totalDurationS: real("total_duration_s"),
  status: text("status").notNull(),
  activityCount: integer("activity_count").default(0),
  failureCount: integer("failure_count").default(0),
  anomalyCount: integer("anomaly_count").default(0),
  createdAt: text("created_at").default("CURRENT_TIMESTAMP"),
});

export const aiConversations = sqliteTable("ai_conversations", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  sessionId: text("session_id").notNull(),
  query: text("query").notNull(),
  response: text("response").notNull(),
  queryType: text("query_type"),
  contextData: text("context_data"), // JSON as text for SQLite
  createdAt: text("created_at").default("CURRENT_TIMESTAMP"),
});

export const failureEmbeddings = sqliteTable("failure_embeddings", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  failureDescription: text("failure_description").notNull(),
  embedding: text("embedding").notNull(), // JSON as text for SQLite
  caseId: text("case_id"),
  activity: text("activity"),
  createdAt: text("created_at").default("CURRENT_TIMESTAMP"),
});

// Relations
export const processEventsRelations = relations(processEvents, ({ one }) => ({
  case: one(processCases, {
    fields: [processEvents.caseId],
    references: [processCases.caseId],
  }),
}));

export const processActivitiesRelations = relations(processActivities, ({ one }) => ({
  case: one(processCases, {
    fields: [processActivities.caseId],
    references: [processCases.caseId],
  }),
}));

export const processCasesRelations = relations(processCases, ({ many }) => ({
  events: many(processEvents),
  activities: many(processActivities),
}));

// Insert schemas
export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export const insertProcessEventSchema = createInsertSchema(processEvents).omit({
  id: true,
  createdAt: true,
});

export const insertProcessActivitySchema = createInsertSchema(processActivities).omit({
  id: true,
  createdAt: true,
});

export const insertProcessCaseSchema = createInsertSchema(processCases).omit({
  id: true,
  createdAt: true,
});

export const insertAiConversationSchema = createInsertSchema(aiConversations).omit({
  id: true,
  createdAt: true,
});

export const insertFailureEmbeddingSchema = createInsertSchema(failureEmbeddings).omit({
  id: true,
  createdAt: true,
});

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type ProcessEvent = typeof processEvents.$inferSelect;
export type InsertProcessEvent = z.infer<typeof insertProcessEventSchema>;

export type ProcessActivity = typeof processActivities.$inferSelect;
export type InsertProcessActivity = z.infer<typeof insertProcessActivitySchema>;

export type ProcessCase = typeof processCases.$inferSelect;
export type InsertProcessCase = z.infer<typeof insertProcessCaseSchema>;

export type AiConversation = typeof aiConversations.$inferSelect;
export type InsertAiConversation = z.infer<typeof insertAiConversationSchema>;

export type FailureEmbedding = typeof failureEmbeddings.$inferSelect;
export type InsertFailureEmbedding = z.infer<typeof insertFailureEmbeddingSchema>;

// Dashboard-specific types
export interface DashboardMetrics {
  avgProcessingTime: number;
  anomaliesDetected: number;
  bottlenecksFound: number;
  successRate: number;
  activeCases: number;
  completedCases: number;
  failedCases: number;
}

export interface AnomalyAlert {
  id: string;
  type: string;
  title: string;
  description: string;
  details: string;
  timestamp: Date;
  severity: 'high' | 'medium' | 'low';
  caseId?: string;
  equipment?: string;
}

export interface ProcessFlowNode {
  id: string;
  name: string;
  resource: string;
  avgTime: number;
  status: 'success' | 'warning' | 'error';
  position: { x: number; y: number };
}

export interface CaseComparison {
  caseA: ProcessCase & { activities: ProcessActivity[] };
  caseB: ProcessCase & { activities: ProcessActivity[] };
}

export interface SemanticSearchResult {
  id: string;
  description: string;
  caseId: string;
  activity: string;
  similarity: number;
}

export interface CaseCluster {
  clusterId: number;
  processSignature: string;
  caseCount: number;
  caseIds: string[];
  avgProcessingTime: number;
  avgDuration: number;
  totalDuration: number;
  anomalyCount: number;
  bottleneckActivity: string;
  bottleneckAvgTime: number;
  coverage: number;
  anomalyRate: number;
}

export interface CaseClusterAnalysis {
  totalCases: number;
  totalPatterns: number;
  coverage: number;
  anomalyRate: number;
  clusters: CaseCluster[];
  timelineData: TimelineActivity[];
}

export interface TimelineActivity {
  caseId: string;
  activity: string;
  timestamp: Date;
  duration: number;
  isAnomaly: boolean;
  clusterId: number;
} 