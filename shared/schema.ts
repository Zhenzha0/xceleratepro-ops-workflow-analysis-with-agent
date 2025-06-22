import { pgTable, text, serial, integer, boolean, timestamp, jsonb, real, varchar } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const processEvents = pgTable("process_events", {
  id: serial("id").primaryKey(),
  caseId: varchar("case_id", { length: 50 }).notNull(),
  timestamp: timestamp("timestamp").notNull(),
  operationEndTime: timestamp("operation_end_time"),
  lifecycleTransition: varchar("lifecycle_transition", { length: 20 }).notNull(),
  lifecycleState: varchar("lifecycle_state", { length: 20 }).notNull(),
  eventId: integer("event_id").notNull(),
  identifierId: varchar("identifier_id", { length: 50 }),
  processModelId: varchar("process_model_id", { length: 50 }),
  activity: text("activity").notNull(),
  requestedServiceUrl: text("requested_service_url"),
  orgResource: varchar("org_resource", { length: 50 }),
  plannedOperationTime: varchar("planned_operation_time", { length: 50 }),
  parameters: text("parameters"),
  caseConceptName: varchar("case_concept_name", { length: 50 }),
  subProcessId: varchar("sub_process_id", { length: 100 }),
  currentTask: text("current_task"),
  responseStatusCode: integer("response_status_code"),
  completeServiceTime: varchar("complete_service_time", { length: 20 }),
  humanWorkstationGreenButtonPressed: boolean("human_workstation_green_button_pressed"),
  unsatisfiedConditionDescription: text("unsatisfied_condition_description"),
  processingTimeS: real("processing_time_s"),
  isAnomaly: boolean("is_anomaly").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const processActivities = pgTable("process_activities", {
  id: serial("id").primaryKey(),
  caseId: varchar("case_id", { length: 50 }).notNull(),
  activity: text("activity").notNull(),
  orgResource: varchar("org_resource", { length: 50 }),
  scheduledTime: timestamp("scheduled_time"),
  startTime: timestamp("start_time"),
  completeTime: timestamp("complete_time"),
  plannedDurationS: real("planned_duration_s"),
  actualDurationS: real("actual_duration_s"),
  status: varchar("status", { length: 20 }).notNull(),
  isAnomaly: boolean("is_anomaly").default(false),
  anomalyScore: real("anomaly_score"),
  failureDescription: text("failure_description"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const processCases = pgTable("process_cases", {
  id: serial("id").primaryKey(),
  caseId: varchar("case_id", { length: 50 }).notNull().unique(),
  processModelId: varchar("process_model_id", { length: 50 }),
  startTime: timestamp("start_time"),
  endTime: timestamp("end_time"),
  totalDurationS: real("total_duration_s"),
  status: varchar("status", { length: 20 }).notNull(),
  activityCount: integer("activity_count").default(0),
  failureCount: integer("failure_count").default(0),
  anomalyCount: integer("anomaly_count").default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

export const aiConversations = pgTable("ai_conversations", {
  id: serial("id").primaryKey(),
  sessionId: varchar("session_id", { length: 100 }).notNull(),
  query: text("query").notNull(),
  response: text("response").notNull(),
  queryType: varchar("query_type", { length: 50 }),
  contextData: jsonb("context_data"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const failureEmbeddings = pgTable("failure_embeddings", {
  id: serial("id").primaryKey(),
  failureDescription: text("failure_description").notNull(),
  embedding: jsonb("embedding").notNull(),
  caseId: varchar("case_id", { length: 50 }),
  activity: text("activity"),
  createdAt: timestamp("created_at").defaultNow(),
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
