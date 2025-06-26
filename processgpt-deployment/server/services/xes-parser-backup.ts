import * as fs from 'fs';
import * as path from 'path';
import csv from 'csv-parser';
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
  private static parseCSVRow(row: string): string[] {
    // Simple but effective approach: split by comma but rejoin the last column
    // since failure descriptions contain commas
    const parts = row.split(',');
    
    // We expect 21 columns total
    if (parts.length <= 21) {
      // Pad with empty strings if we have fewer columns
      while (parts.length < 21) {
        parts.push('');
      }
      return parts;
    }
    
    // If we have more than 21 parts, the extra commas are in the failure description
    // Take first 20 columns as-is, then join the rest as the failure description
    const result = parts.slice(0, 20);
    const failureDescription = parts.slice(20).join(',');
    result.push(failureDescription);
    
    return result;
  }

  private static parseTimeToSeconds(timeStr: string): number {
    if (!timeStr || timeStr.trim() === '') return 0;
    
    try {
      // Handle formats like "00:54.9" or "0 days 00:00:52"
      if (timeStr.includes('days')) {
        const parts = timeStr.split(' ');
        const days = parseInt(parts[0]) || 0;
        const timePart = parts[2];
        if (!timePart) return 0;
        const [hours, minutes, seconds] = timePart.split(':').map(part => parseFloat(part) || 0);
        return days * 24 * 3600 + hours * 3600 + minutes * 60 + seconds;
      } else {
        const timeParts = timeStr.split(':');
        if (timeParts.length < 2) return 0;
        const [minutes, seconds] = timeParts.map(part => parseFloat(part) || 0);
        return minutes * 60 + seconds;
      }
    } catch (error) {
      console.warn(`Failed to parse time string: ${timeStr}`);
      return 0;
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

    // Calculate IQR for each activity type (need at least 4 data points for meaningful IQR)
    const anomalyThresholds = new Map<string, { lower: number; upper: number; q1: number; q3: number; iqr: number }>();
    
    activityGroups.forEach((durations, activityType) => {
      if (durations.length >= 4) { // Need at least 4 data points for reliable IQR
        durations.sort((a, b) => a - b);
        const q1Index = Math.floor(durations.length * 0.25);
        const q3Index = Math.floor(durations.length * 0.75);
        const q1 = durations[q1Index];
        const q3 = durations[q3Index];
        const iqr = q3 - q1;
        
        // Only set thresholds if IQR is meaningful
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
            isAnomaly,
            anomalyScore: Math.min(anomalyScore, 5.0) // Cap at 5.0 for extreme outliers
          };
        }
      }
      
      // Return activity without anomaly flags if no threshold available
      return {
        ...activity,
        isAnomaly: false,
        anomalyScore: 0
      };
    });
  }

  static async parseCSV(csvPath: string): Promise<{
    events: InsertProcessEvent[];
    activities: InsertProcessActivity[];
    cases: InsertProcessCase[];
  }> {
    const events: InsertProcessEvent[] = [];
    const activityMap = new Map<string, Map<string, Partial<InsertProcessActivity>>>();
    const caseMap = new Map<string, Partial<InsertProcessCase>>();

    // Use proper CSV parser to handle complex failure descriptions
    const csvData: any[] = [];
    
    return new Promise((resolve, reject) => {
      fs.createReadStream(csvPath)
        .pipe(csv())
        .on('data', (eventData) => {

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
              eventId: eventData.event_id && !isNaN(parseInt(eventData.event_id)) ? parseInt(eventData.event_id) : 0,
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
              responseStatusCode: eventData.response_status_code && !isNaN(parseInt(eventData.response_status_code)) ? parseInt(eventData.response_status_code) : null,
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
        })
        .on('end', () => {
          try {
            // Convert activities map to array and calculate durations
            const activities: InsertProcessActivity[] = [];
            activityMap.forEach(caseActivities => {
              caseActivities.forEach(activity => {
                if (activity.startTime && activity.completeTime && !activity.actualDurationS) {
                  const duration = (activity.completeTime.getTime() - activity.startTime.getTime()) / 1000;
                  activity.actualDurationS = isNaN(duration) ? null : duration;
                }
                
                // Sanitize all numeric fields to prevent NaN values
                const sanitizedActivity = {
                  ...activity,
                  plannedDurationS: activity.plannedDurationS && !isNaN(activity.plannedDurationS) ? activity.plannedDurationS : null,
                  actualDurationS: activity.actualDurationS && !isNaN(activity.actualDurationS) ? activity.actualDurationS : null,
                  anomalyScore: activity.anomalyScore && !isNaN(activity.anomalyScore) ? activity.anomalyScore : null,
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
                const totalDuration = (caseInfo.endTime.getTime() - caseInfo.startTime.getTime()) / 1000;
                caseInfo.totalDurationS = isNaN(totalDuration) ? null : totalDuration;
              }
              
              // Sanitize all numeric fields for case data
              const sanitizedCase = {
                ...caseInfo,
                totalDurationS: caseInfo.totalDurationS && !isNaN(caseInfo.totalDurationS) ? caseInfo.totalDurationS : null,
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
