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
  humanWorkstationGreenButtonPressed: integer("human_workstation_green_button_pressed", { mode: 'boolean' }),
  unsatisfiedConditionDescription: text("unsatisfied_condition_description"),
  processingTimeS: real("processing_time_s"),
  isAnomaly: integer("is_anomaly", { mode: 'boolean' }).default(0),
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
  isAnomaly: integer("is_anomaly", { mode: 'boolean' }).default(0),
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

// Simplified exports for compatibility
export type User = typeof users.$inferSelect;
export type ProcessEvent = typeof processEvents.$inferSelect;
export type ProcessActivity = typeof processActivities.$inferSelect;
export type ProcessCase = typeof processCases.$inferSelect;

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

export type InsertUser = z.infer<typeof insertUserSchema>;
export type InsertProcessEvent = z.infer<typeof insertProcessEventSchema>;
export type InsertProcessActivity = z.infer<typeof insertProcessActivitySchema>;
export type InsertProcessCase = z.infer<typeof insertProcessCaseSchema>; 