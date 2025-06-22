import * as fs from 'fs';
import * as path from 'path';
import { InsertProcessEvent, InsertProcessActivity, InsertProcessCase } from '@shared/schema';

export interface XESEvent {
  case_id: string;
  timestamp: string;
  operation_end_time?: string;
  'lifecycle:transition': string;
  'lifecycle:state': string;
  event_id: number;
  'identifier:id'?: string;
  process_model_id?: string;
  case?: string;
  activity: string;
  requested_service_url?: string;
  'org:resource'?: string;
  planned_operation_time?: string;
  parameters?: string;
  'case:concept:name'?: string;
  SubProcessID?: string;
  current_task?: string;
  response_status_code?: number;
  complete_service_time?: string;
  human_workstation_green_button_pressed?: boolean;
  unsatisfied_condition_description?: string;
}

export class XESParser {
  private static parseTimeToSeconds(timeStr: string): number {
    if (!timeStr) return 0;
    
    // Handle formats like "00:54.9" or "0 days 00:00:52"
    if (timeStr.includes('days')) {
      const parts = timeStr.split(' ');
      const days = parseInt(parts[0]);
      const timePart = parts[2];
      const [hours, minutes, seconds] = timePart.split(':').map(parseFloat);
      return days * 24 * 3600 + hours * 3600 + minutes * 60 + seconds;
    } else {
      const [minutes, seconds] = timeStr.split(':').map(parseFloat);
      return minutes * 60 + seconds;
    }
  }

  private static detectAnomalies(activities: InsertProcessActivity[]): InsertProcessActivity[] {
    // Group activities by type for statistical analysis
    const activityGroups = new Map<string, number[]>();
    
    activities.forEach(activity => {
      if (activity.actualDurationS) {
        if (!activityGroups.has(activity.activity)) {
          activityGroups.set(activity.activity, []);
        }
        activityGroups.get(activity.activity)!.push(activity.actualDurationS);
      }
    });

    // Calculate IQR for each activity type
    const anomalyThresholds = new Map<string, { lower: number; upper: number }>();
    
    activityGroups.forEach((durations, activityType) => {
      durations.sort((a, b) => a - b);
      const q1 = durations[Math.floor(durations.length * 0.25)];
      const q3 = durations[Math.floor(durations.length * 0.75)];
      const iqr = q3 - q1;
      
      anomalyThresholds.set(activityType, {
        lower: q1 - 1.5 * iqr,
        upper: q3 + 1.5 * iqr
      });
    });

    // Mark anomalies
    return activities.map(activity => {
      if (activity.actualDurationS) {
        const threshold = anomalyThresholds.get(activity.activity);
        if (threshold) {
          const isAnomaly = activity.actualDurationS < threshold.lower || 
                           activity.actualDurationS > threshold.upper;
          
          return {
            ...activity,
            isAnomaly,
            anomalyScore: isAnomaly ? 
              Math.abs(activity.actualDurationS - (threshold.upper + threshold.lower) / 2) / 
              (threshold.upper - threshold.lower) : 0
          };
        }
      }
      return activity;
    });
  }

  static async parseCSV(csvPath: string): Promise<{
    events: InsertProcessEvent[];
    activities: InsertProcessActivity[];
    cases: InsertProcessCase[];
  }> {
    const csvContent = await fs.promises.readFile(csvPath, 'utf-8');
    const lines = csvContent.split('\n');
    const headers = lines[0].split(',');
    
    const events: InsertProcessEvent[] = [];
    const activityMap = new Map<string, Map<string, Partial<InsertProcessActivity>>>();
    const caseMap = new Map<string, Partial<InsertProcessCase>>();

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      
      const values = line.split(',');
      const eventData: any = {};
      
      headers.forEach((header, index) => {
        eventData[header] = values[index] || null;
      });

      // Parse timestamps
      const timestamp = new Date(eventData.timestamp);
      const operationEndTime = eventData.operation_end_time ? new Date(eventData.operation_end_time) : null;
      
      // Calculate processing time if available
      let processingTimeS = 0;
      if (eventData.complete_service_time) {
        processingTimeS = this.parseTimeToSeconds(eventData.complete_service_time);
      }

      // Create process event
      const processEvent: InsertProcessEvent = {
        caseId: eventData.case_id,
        timestamp,
        operationEndTime,
        lifecycleTransition: eventData['lifecycle:transition'],
        lifecycleState: eventData['lifecycle:state'],
        eventId: parseInt(eventData.event_id) || 0,
        identifierId: eventData['identifier:id'],
        processModelId: eventData.process_model_id,
        activity: eventData.activity,
        requestedServiceUrl: eventData.requested_service_url,
        orgResource: eventData['org:resource'],
        plannedOperationTime: eventData.planned_operation_time,
        parameters: eventData.parameters,
        caseConceptName: eventData['case:concept:name'],
        subProcessId: eventData.SubProcessID,
        currentTask: eventData.current_task,
        responseStatusCode: eventData.response_status_code ? parseInt(eventData.response_status_code) : null,
        completeServiceTime: eventData.complete_service_time,
        humanWorkstationGreenButtonPressed: eventData.human_workstation_green_button_pressed === '1',
        unsatisfiedConditionDescription: eventData.unsatisfied_condition_description,
        processingTimeS: processingTimeS > 0 ? processingTimeS : null,
      };

      events.push(processEvent);

      // Build activities by merging lifecycle events
      const caseId = eventData.case_id;
      const activityKey = `${caseId}_${eventData.activity}_${eventData.event_id}`;
      
      if (!activityMap.has(caseId)) {
        activityMap.set(caseId, new Map());
      }
      
      if (!activityMap.get(caseId)!.has(activityKey)) {
        activityMap.get(caseId)!.set(activityKey, {
          caseId,
          activity: eventData.activity,
          orgResource: eventData['org:resource'],
        });
      }

      const activity = activityMap.get(caseId)!.get(activityKey)!;
      
      // Map lifecycle events to activity timestamps
      switch (eventData['lifecycle:transition']) {
        case 'scheduled':
          activity.scheduledTime = timestamp;
          break;
        case 'start':
          activity.startTime = timestamp;
          break;
        case 'complete':
          activity.completeTime = timestamp;
          activity.status = eventData['lifecycle:state'];
          if (processingTimeS > 0) {
            activity.actualDurationS = processingTimeS;
          }
          if (eventData.unsatisfied_condition_description) {
            activity.failureDescription = eventData.unsatisfied_condition_description;
          }
          break;
      }

      // Calculate planned duration
      if (eventData.planned_operation_time) {
        activity.plannedDurationS = this.parseTimeToSeconds(eventData.planned_operation_time);
      }

      // Track case-level information
      if (!caseMap.has(caseId)) {
        caseMap.set(caseId, {
          caseId,
          processModelId: eventData.process_model_id,
          startTime: timestamp,
          status: 'inProgress',
          activityCount: 0,
          failureCount: 0,
          anomalyCount: 0,
        });
      }

      const caseInfo = caseMap.get(caseId)!;
      if (eventData['lifecycle:transition'] === 'complete') {
        caseInfo.endTime = timestamp;
        if (eventData['lifecycle:state'] === 'success') {
          caseInfo.status = 'success';
        } else if (eventData['lifecycle:state'] === 'failed') {
          caseInfo.status = 'failed';
          caseInfo.failureCount = (caseInfo.failureCount || 0) + 1;
        }
      }
    }

    // Convert activities map to array and calculate durations
    const activities: InsertProcessActivity[] = [];
    activityMap.forEach(caseActivities => {
      caseActivities.forEach(activity => {
        if (activity.startTime && activity.completeTime && !activity.actualDurationS) {
          activity.actualDurationS = (activity.completeTime.getTime() - activity.startTime.getTime()) / 1000;
        }
        activities.push(activity as InsertProcessActivity);
      });
    });

    // Detect anomalies
    const activitiesWithAnomalies = this.detectAnomalies(activities);

    // Update case information with final statistics
    const cases: InsertProcessCase[] = [];
    caseMap.forEach(caseInfo => {
      const caseActivities = activitiesWithAnomalies.filter(a => a.caseId === caseInfo.caseId);
      caseInfo.activityCount = caseActivities.length;
      caseInfo.anomalyCount = caseActivities.filter(a => a.isAnomaly).length;
      
      if (caseInfo.startTime && caseInfo.endTime) {
        caseInfo.totalDurationS = (caseInfo.endTime.getTime() - caseInfo.startTime.getTime()) / 1000;
      }
      
      cases.push(caseInfo as InsertProcessCase);
    });

    return {
      events,
      activities: activitiesWithAnomalies,
      cases,
    };
  }

  static async importSampleData(): Promise<void> {
    const sampleDataPath = path.join(process.cwd(), 'attached_assets', 'sample_data_1750608906974.csv');
    
    if (!fs.existsSync(sampleDataPath)) {
      console.log('Sample data file not found, skipping import');
      return;
    }

    console.log('Parsing sample data...');
    const { events, activities, cases } = await this.parseCSV(sampleDataPath);
    
    // Import would be handled by the calling service
    console.log(`Parsed ${events.length} events, ${activities.length} activities, ${cases.length} cases`);
  }
}
