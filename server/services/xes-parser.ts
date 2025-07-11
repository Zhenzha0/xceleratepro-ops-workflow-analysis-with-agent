import { InsertProcessActivity, InsertProcessCase, InsertProcessEvent } from '@shared/schema';
import csv from 'csv-parser';
import * as fs from 'fs';
import * as path from 'path';

export interface XESEvent {
  case_id: string;
  timestamp: string;
  operation_end_time?: string;
  'lifecycle:transition': string;
  'lifecycle:state': string;
  event_id: string;
  'identifier:id': string;
  process_model_id: string;
  case: string;
  activity: string;
  requested_service_url?: string;
  'org:resource': string;
  planned_operation_time?: string;
  parameters?: string;
  'case:concept:name': string;
  SubProcessID?: string;
  current_task?: string;
  response_status_code?: string;
  complete_service_time?: string;
  human_workstation_green_button_pressed?: boolean;
  unsatisfied_condition_description?: string;
}

export class XESParser {
  private static parseTimeToSeconds(timeStr: string): number {
    if (!timeStr || timeStr.trim() === '') return 0;
    
    // Handle formats like "0 days 00:00:52" or "00:52.3"
    const daysMatch = timeStr.match(/(\d+) days (\d+):(\d+):(\d+)/);
    if (daysMatch) {
      const [, days, hours, minutes, seconds] = daysMatch;
      return parseInt(days) * 86400 + parseInt(hours) * 3600 + parseInt(minutes) * 60 + parseInt(seconds);
    }
    
    // Handle MM:SS.s format
    const timeMatch = timeStr.match(/(\d+):(\d+)\.(\d+)/);
    if (timeMatch) {
      const [, minutes, seconds, fraction] = timeMatch;
      return parseInt(minutes) * 60 + parseInt(seconds) + parseFloat('0.' + fraction);
    }
    
    // Handle simple seconds
    const numericValue = parseFloat(timeStr);
    return isNaN(numericValue) ? 0 : numericValue;
  }

  private static detectAnomalies(activities: InsertProcessActivity[]): InsertProcessActivity[] {
    // Group activities by type for IQR-based anomaly detection
    const activityGroups = new Map<string, number[]>();
    const anomalyThresholds = new Map<string, any>();

    // Group activities by type and collect processing times
    activities.forEach(activity => {
      if (activity.actualDurationS && activity.actualDurationS > 0) {
        const activityType = activity.activity;
        if (!activityGroups.has(activityType)) {
          activityGroups.set(activityType, []);
        }
        activityGroups.get(activityType)!.push(activity.actualDurationS);
      }
    });

    // Calculate IQR thresholds for each activity type
    activityGroups.forEach((times, activityType) => {
      if (times.length >= 4) { // Need at least 4 data points for meaningful IQR
        times.sort((a, b) => a - b);
        const q1Index = Math.floor(times.length * 0.25);
        const q3Index = Math.floor(times.length * 0.75);
        const q1 = times[q1Index];
        const q3 = times[q3Index];
        const iqr = q3 - q1;
        
        if (iqr > 0) {
          anomalyThresholds.set(activityType, {
            q1,
            q3,
            iqr,
            lower: q1 - 1.5 * iqr,
            upper: q3 + 1.5 * iqr
          });
        }
      }
    });

    // Mark anomalies using activity-specific IQR thresholds
    return activities.map(activity => {
      if (activity.actualDurationS && activity.actualDurationS > 0) {
        const threshold = anomalyThresholds.get(activity.activity);
        if (threshold) {
          const isAnomaly = activity.actualDurationS < threshold.lower || 
                           activity.actualDurationS > threshold.upper;
          
          // Calculate anomaly score based on how far outside the IQR boundaries the value is
          let anomalyScore = 0;
          if (isAnomaly) {
            if (activity.actualDurationS < threshold.lower) {
              anomalyScore = Math.abs(activity.actualDurationS - threshold.lower) / threshold.iqr;
            } else if (activity.actualDurationS > threshold.upper) {
              anomalyScore = Math.abs(activity.actualDurationS - threshold.upper) / threshold.iqr;
            }
          }
          
          return {
            ...activity,
            isAnomaly: isAnomaly ? 1 : 0,
            anomalyScore: Math.min(anomalyScore, 5.0) // Cap at 5.0 for extreme outliers
          };
        }
      }
      
      // Return activity without anomaly flags if no threshold available
      return {
        ...activity,
        isAnomaly: 0,
        anomalyScore: null
      };
    });
  }

  static async parseXESFromCSV(csvPath: string): Promise<{
    events: InsertProcessEvent[];
    activities: InsertProcessActivity[];
    cases: InsertProcessCase[];
  }> {
    const events: InsertProcessEvent[] = [];
    const activityMap = new Map<string, Map<string, Partial<InsertProcessActivity>>>();
    const caseMap = new Map<string, Partial<InsertProcessCase>>();

    // Use proper CSV parser to handle complex failure descriptions
    return new Promise((resolve, reject) => {
      fs.createReadStream(csvPath)
        .pipe(csv())
        .on('data', (eventData: any) => {
          // Parse timestamps and convert to ISO strings for SQLite
          const timestamp = new Date(eventData.timestamp).toISOString();
          const operationEndTime = eventData.operation_end_time ? new Date(eventData.operation_end_time).toISOString() : null;
          
          // Calculate processing time if available
          let processingTimeS = 0;
          if (eventData.complete_service_time) {
            processingTimeS = this.parseTimeToSeconds(eventData.complete_service_time);
          }

          // Create process event with string timestamps for SQLite
          const processEvent: InsertProcessEvent = {
            caseId: eventData.case_id,
            timestamp,
            operationEndTime,
            lifecycleTransition: eventData['lifecycle:transition'],
            lifecycleState: eventData['lifecycle:state'],
            eventId: eventData.event_id && !isNaN(parseInt(eventData.event_id)) ? parseInt(eventData.event_id) : 0,
            identifierId: eventData['identifier:id'] || null,
            processModelId: eventData.process_model_id || null,
            activity: eventData.activity,
            requestedServiceUrl: eventData.requested_service_url || null,
            orgResource: eventData['org:resource'] || null,
            plannedOperationTime: eventData.planned_operation_time || null,
            parameters: eventData.parameters || null,
            caseConceptName: eventData['case:concept:name'] || null,
            subProcessId: eventData.SubProcessID || null,
            currentTask: eventData.current_task || null,
            responseStatusCode: eventData.response_status_code && !isNaN(parseInt(eventData.response_status_code)) ? parseInt(eventData.response_status_code) : null,
            completeServiceTime: eventData.complete_service_time || null,
            humanWorkstationGreenButtonPressed: eventData.human_workstation_green_button_pressed === '1' ? 1 : 0,
            unsatisfiedConditionDescription: eventData.unsatisfied_condition_description || null,
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
              orgResource: eventData['org:resource'] || null,
            });
          }

          const activity = activityMap.get(caseId)!.get(activityKey)!;
          
          // Map lifecycle events to activity timestamps (use ISO strings)
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
              if (processingTimeS > 0 && !isNaN(processingTimeS)) {
                activity.actualDurationS = processingTimeS;
              }
              if (eventData.unsatisfied_condition_description) {
                activity.failureDescription = eventData.unsatisfied_condition_description;
              }
              break;
          }

          // Calculate planned duration
          if (eventData.planned_operation_time) {
            const plannedDuration = this.parseTimeToSeconds(eventData.planned_operation_time);
            activity.plannedDurationS = isNaN(plannedDuration) ? null : plannedDuration;
          }

          // Track case-level information
          if (!caseMap.has(caseId)) {
            caseMap.set(caseId, {
              caseId,
              processModelId: eventData.process_model_id || null,
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
        })
        .on('end', () => {
          try {
            // Convert activities map to array and calculate durations
            const activities: InsertProcessActivity[] = [];
            activityMap.forEach(caseActivities => {
              caseActivities.forEach(activity => {
                if (activity.startTime && activity.completeTime && !activity.actualDurationS) {
                  const startMs = new Date(activity.startTime).getTime();
                  const completeMs = new Date(activity.completeTime).getTime();
                  const duration = (completeMs - startMs) / 1000;
                  activity.actualDurationS = isNaN(duration) ? null : duration;
                }
                
                // Sanitize all fields for SQLite
                const sanitizedActivity = {
                  caseId: activity.caseId || '',
                  activity: activity.activity || '',
                  orgResource: activity.orgResource || null,
                  scheduledTime: activity.scheduledTime || null,
                  startTime: activity.startTime || null,
                  completeTime: activity.completeTime || null,
                  plannedDurationS: activity.plannedDurationS && !isNaN(activity.plannedDurationS) ? activity.plannedDurationS : null,
                  actualDurationS: activity.actualDurationS && !isNaN(activity.actualDurationS) ? activity.actualDurationS : null,
                  status: activity.status || 'unknown',
                  isAnomaly: activity.isAnomaly ? 1 : 0,
                  anomalyScore: activity.anomalyScore && !isNaN(activity.anomalyScore) ? activity.anomalyScore : null,
                  failureDescription: activity.failureDescription || null,
                  currentTask: activity.currentTask || null,
                };
                
                activities.push(sanitizedActivity as InsertProcessActivity);
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
                const startMs = new Date(caseInfo.startTime).getTime();
                const endMs = new Date(caseInfo.endTime).getTime();
                const totalDuration = (endMs - startMs) / 1000;
                caseInfo.totalDurationS = isNaN(totalDuration) ? null : totalDuration;
              }
              
              // Sanitize all fields for SQLite
              const sanitizedCase = {
                caseId: caseInfo.caseId || '',
                processModelId: caseInfo.processModelId || null,
                startTime: caseInfo.startTime || null,
                endTime: caseInfo.endTime || null,
                totalDurationS: caseInfo.totalDurationS && !isNaN(caseInfo.totalDurationS) ? caseInfo.totalDurationS : null,
                status: caseInfo.status || 'unknown',
                activityCount: caseInfo.activityCount && !isNaN(caseInfo.activityCount) ? caseInfo.activityCount : 0,
                failureCount: caseInfo.failureCount && !isNaN(caseInfo.failureCount) ? caseInfo.failureCount : 0,
                anomalyCount: caseInfo.anomalyCount && !isNaN(caseInfo.anomalyCount) ? caseInfo.anomalyCount : 0,
              };
              
              cases.push(sanitizedCase as InsertProcessCase);
            });

            resolve({
              events,
              activities: activitiesWithAnomalies,
              cases,
            });
          } catch (error) {
            reject(error);
          }
        })
        .on('error', reject);
    });
  }

  static async importSampleData(): Promise<void> {
    const sampleDataPath = path.join(process.cwd(), 'attached_assets', 'sample_data_1750608906974.csv');
    
    if (!fs.existsSync(sampleDataPath)) {
      console.log('Sample data file not found, skipping import');
      return;
    }

    console.log('Parsing sample data...');
    const { events, activities, cases } = await this.parseXESFromCSV(sampleDataPath);
    
    // Import would be handled by the calling service
    console.log(`Parsed ${events.length} events, ${activities.length} activities, ${cases.length} cases`);
  }
}